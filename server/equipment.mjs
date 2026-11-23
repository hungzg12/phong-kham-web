import {randomUUID,createHash} from 'node:crypto';
import {querySql} from './admin-store.mjs';
import {ensureNotifications} from './notifications.mjs';
import {equipmentMigration} from './equipment-migration.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const txt=(v,max)=>typeof v==='string'&&v.trim().length<=max?v.trim():'';
const ready=new Map();
async function ensureEquipment(){const db=process.env.MEDICARE_SQL_CONNECTION||'default';if(!ready.has(db))ready.set(db,querySql(equipmentMigration).catch(e=>{ready.delete(db);throw e;}));await ready.get(db);}
export async function equipmentState(){
 await ensureEquipment();
 const equipment=JSON.parse(await querySql(`SELECT (SELECT id,name,serial,department,CONVERT(char(10),nextService,23) nextService,status,revision,createdAt,updatedAt FROM dbo.MediCareEquipment FOR JSON PATH)`)||'[]');
 const incidents=JSON.parse(await querySql(`SELECT (SELECT id,device,reporter,severity,reason,status,maintenance,engineer,revision,createdAt,acceptedAt,updatedAt FROM dbo.MediCareEquipmentIncident FOR JSON PATH)`)||'[]');
 return {equipment,incidents};
}
export async function equipmentAction(identity,data){
 if(identity?.role!=='admin')fail(403,'Chỉ quản trị viên được quản lý thiết bị theo quyền hiện có.');
 if(data.id!=null&&(!/^[A-Za-z0-9_-]{1,20}$/.test(data.id)))fail(400,'Mã thiết bị hoặc phiếu không hợp lệ.');
 if(data.revision!=null&&(!Number.isSafeInteger(data.revision)||data.revision<0))fail(400,'Phiên bản dữ liệu không hợp lệ.');
 if(!identity.userId||!/^.{8}-.{4}-4.{3}-[89ab].{3}-.{12}$/i.test(data.requestId||''))fail(400,'Thiếu phiên hoặc mã yêu cầu hợp lệ.');
 for(const field of ['senderId','recipientId','role','staffId','userId'])if(Object.hasOwn(data,field))fail(400,'Danh tính thực hiện được lấy từ phiên đăng nhập.');
 const p={id:data.id||'TB-'+randomUUID().replaceAll('-','').slice(0,16),actor:identity.userId,key:data.requestId,
 fingerprint:createHash('sha256').update(JSON.stringify(data)).digest('hex'),revision:String(data.revision||0),action:data.action,audit:JSON.stringify(data)};
 let body='';
 if(data.action==='saveEquipment'){
  Object.assign(p,{name:txt(data.name,150),serial:txt(data.serial,100),department:txt(data.department,100),nextService:data.nextService});
  if(!p.name||!p.serial||!p.department||!/^\d{4}-\d{2}-\d{2}$/.test(p.nextService||'')||!Number.isFinite(Date.parse(p.nextService))||new Date(p.nextService).toISOString().slice(0,10)!==p.nextService)fail(400,'Kiểm tra tên, serial, khoa và ngày bảo trì.');
  body=`IF NOT EXISTS(SELECT 1 FROM dbo.Khoa WHERE tenKhoa=@department AND dangHoatDong=1) THROW 51000,'E_DEPT',1;
   IF EXISTS(SELECT 1 FROM dbo.MediCareEquipment WHERE serial=@serial AND id<>@id) THROW 51000,'E_SERIAL',1;
   IF EXISTS(SELECT 1 FROM dbo.MediCareEquipment WHERE id=@id) BEGIN
    IF NOT EXISTS(SELECT 1 FROM dbo.MediCareEquipment WHERE id=@id AND revision=TRY_CONVERT(int,@revision)) THROW 51000,'E_STALE',1;
    UPDATE dbo.MediCareEquipment SET name=@name,serial=@serial,department=@department,nextService=@nextService,revision=revision+1,updatedAt=SYSUTCDATETIME() WHERE id=@id;
   END ELSE BEGIN
    IF @revision<>'0' THROW 51000,'E_STALE',1;
    INSERT dbo.MediCareEquipment(id,name,serial,department,nextService,status) VALUES(@id,@name,@serial,@department,@nextService,N'Đang hoạt động');
   END`;
 }else if(data.action==='reportIncident'){
  if(data.id)fail(409,'Phiếu báo hỏng đã lưu không sửa trực tiếp. Dùng thao tác tiếp nhận hoặc nghiệm thu.');
  Object.assign(p,{device:txt(data.device,20),reporter:txt(data.reporter,20),severity:data.severity,reason:txt(data.reason,2000)});
  p.id='BH-'+randomUUID().replaceAll('-','').slice(0,16);
  if(!p.device||!p.reporter||!p.reason||!['Thông thường','Nghiêm trọng','Ngừng sử dụng ngay'].includes(p.severity))fail(400,'Điền thiết bị, người báo, mức độ và lý do.');
  body=`IF NOT EXISTS(SELECT 1 FROM dbo.MediCareEquipment WHERE id=@device) THROW 51000,'E_MISSING',1;
   IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE maNhanVien=@reporter AND dangLamViec=1) THROW 51000,'E_REPORTER',1;
   IF EXISTS(SELECT 1 FROM dbo.MediCareEquipmentIncident WHERE device=@device AND status<>N'Đã nghiệm thu') THROW 51000,'E_OPEN',1;
   INSERT dbo.MediCareEquipmentIncident(id,device,reporter,severity,reason,status) VALUES(@id,@device,@reporter,@severity,@reason,N'Chờ tiếp nhận');
   INSERT dbo.MediCareNotificationOutbox(source,target,payload,eventKey) VALUES('Equipment',@id,(SELECT @device device,@severity severity FOR JSON PATH,WITHOUT_ARRAY_WRAPPER),CONCAT('equipment:',@id));`;
 }else if(['toggleDevice','acceptIncident','maintain'].includes(data.action)){
  if(!data.id||!Number.isSafeInteger(data.revision)||data.revision<1)fail(400,'Thiếu thiết bị/phiếu hoặc phiên bản dữ liệu.');
  if(data.action==='toggleDevice')body=`IF NOT EXISTS(SELECT 1 FROM dbo.MediCareEquipment WHERE id=@id AND revision=TRY_CONVERT(int,@revision)) THROW 51000,'E_STALE',1;
   IF EXISTS(SELECT 1 FROM dbo.MediCareEquipmentIncident WHERE device=@id AND status=N'Đang bảo trì') THROW 51000,'E_STATE',1;
   UPDATE dbo.MediCareEquipment SET status=CASE WHEN status=N'Đang hoạt động' THEN N'Tạm ngưng' ELSE N'Đang hoạt động' END,revision=revision+1,updatedAt=SYSUTCDATETIME() WHERE id=@id;`;
  else {
   body=`IF NOT EXISTS(SELECT 1 FROM dbo.MediCareEquipmentIncident WHERE id=@id AND revision=TRY_CONVERT(int,@revision)) THROW 51000,'E_STALE',1;`;
   if(data.action==='acceptIncident')body+=`IF NOT EXISTS(SELECT 1 FROM dbo.MediCareEquipmentIncident WHERE id=@id AND status=N'Chờ tiếp nhận') THROW 51000,'E_STATE',1;
    UPDATE dbo.MediCareEquipmentIncident SET status=N'Đang bảo trì',revision=revision+1,updatedAt=SYSUTCDATETIME() WHERE id=@id;
    UPDATE e SET status=N'Ngừng sử dụng',revision=e.revision+1,updatedAt=SYSUTCDATETIME() FROM dbo.MediCareEquipment e JOIN dbo.MediCareEquipmentIncident i ON i.device=e.id WHERE i.id=@id;`;
   else{
    Object.assign(p,{maintenance:txt(data.maintenance,2000),engineer:txt(data.engineer,100)});
    if(!p.maintenance||!p.engineer)fail(400,'Nhập kết quả bảo trì và kỹ sư thực hiện.');
    body+=`IF NOT EXISTS(SELECT 1 FROM dbo.MediCareEquipmentIncident WHERE id=@id AND status=N'Đang bảo trì') THROW 51000,'E_STATE',1;
     UPDATE dbo.MediCareEquipmentIncident SET status=N'Đã nghiệm thu',maintenance=@maintenance,engineer=@engineer,acceptedAt=SYSUTCDATETIME(),revision=revision+1,updatedAt=SYSUTCDATETIME() WHERE id=@id;
     UPDATE e SET status=N'Đang hoạt động',revision=e.revision+1,updatedAt=SYSUTCDATETIME() FROM dbo.MediCareEquipment e JOIN dbo.MediCareEquipmentIncident i ON i.device=e.id WHERE i.id=@id;`;
   }
  }
 }else fail(400,'Thao tác thiết bị chưa được hỗ trợ.');
 await ensureEquipment();await ensureNotifications();
 try{return JSON.parse(await querySql(`SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY BEGIN TRAN;
  DECLARE @lock int,@result nvarchar(max);EXEC @lock=sys.sp_getapplock @Resource='MediCareEquipmentWrite',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @lock<0 THROW 51000,'E_BUSY',1;
  IF EXISTS(SELECT 1 FROM dbo.MediCareEquipmentRequest WHERE requestId=@key) BEGIN
   IF NOT EXISTS(SELECT 1 FROM dbo.MediCareEquipmentRequest WHERE requestId=@key AND actor=@actor AND fingerprint=@fingerprint) THROW 51000,'E_REPLAY',1;
   SELECT @result=result FROM dbo.MediCareEquipmentRequest WHERE requestId=@key;COMMIT;SELECT @result;RETURN;
  END
  ${body}
  SET @result=(SELECT @id id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
  INSERT dbo.MediCareAdminAudit(id,actor,action,entity,target,changes) VALUES(NEWID(),@actor,@action,'equipment',@id,@audit);
  INSERT dbo.MediCareEquipmentRequest(requestId,actor,fingerprint,result) VALUES(@key,@actor,@fingerprint,@result);
  COMMIT;SELECT @result;END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH`,p));}
 catch(e){for(const [key,message]of Object.entries({E_DEPT:'Khoa không tồn tại hoặc đã ngừng hoạt động.',E_SERIAL:'Số serial đã tồn tại.',E_STALE:'Dữ liệu đã thay đổi. Tải lại trước khi thao tác.',E_STATE:'Trạng thái hiện tại không cho phép thao tác.',E_MISSING:'Thiết bị không còn tồn tại.',E_REPORTER:'Người báo hỏng không còn hoạt động.',E_OPEN:'Thiết bị đang có phiếu sự cố chưa nghiệm thu.',E_REPLAY:'Mã yêu cầu đã được dùng với nội dung khác.',E_BUSY:'Đang có thao tác thiết bị khác. Vui lòng thử lại.'}))if(e.message.includes(key))fail(409,message);throw e;}
}
