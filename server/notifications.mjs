import {querySql,loadState} from './admin-store.mjs';
import {notificationMigration} from './notification-migration.mjs';
import {listVisits} from './clinic-flow.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const rows=async(sql,p={})=>JSON.parse(await querySql(`SELECT (${sql} FOR JSON PATH)`,p)||'[]');
const ready=new Map();
export async function ensureNotifications(){
 const db=process.env.MEDICARE_SQL_CONNECTION||'default';
 if(!ready.has(db))ready.set(db,querySql(notificationMigration).catch(e=>{ready.delete(db);throw e;}));
 await ready.get(db);
}
const titles={LuotKham:'Lượt khám cần xử lý',DotDieuTri:'Đợt điều trị được phân công',ChiTietChiDinh:'Chỉ định CLS cần xử lý',KetQuaCLS:'Kết quả CLS đã công bố',YLenh:'Y lệnh cần thực hiện',DonThuoc:'Đơn thuốc đã duyệt',GiaoDichThanhToan:'Khoản thu cần xử lý',LichHen:'Lịch hẹn được cập nhật',LoTonKho:'Cảnh báo tồn kho / hạn dùng',Equipment:'Thiết bị báo hỏng',Reminder:'Nhắc việc cá nhân'};
// No inferred department-wide broadcast. Only recorded assignments can select
// recipients; unresolved sources stay in the outbox and retry after assignment.
async function resolve(event,data){
 const p=JSON.parse(event.payload),id=event.target;
 let staff=[],patients=[],role='',page='',tab='',episodeId='',recordId=id,reason='',severity='important';
 const one=async sql=>(await rows(sql,{id}))[0];
 switch(event.source){
 case 'LuotKham':{const v=(await listVisits({history:true})).find(v=>v.id===id);if(!v||v.status==='Đã hủy')return {skip:true};staff=[v.doctorStaffId];role='doctor';page='examination';episodeId=id;break;}
 case 'DotDieuTri':staff=[p.maBacSiDieuTriChinh];role='doctor';page='care';episodeId=id;break;
 case 'ChiTietChiDinh':{if(p.trangThai==='DA_HUY')return {skip:true};const r=await one(`SELECT TOP 1 k.maKyThuatVien staff,COALESCE(c.maLuotKham,c.maDotDieuTri) episode FROM dbo.ChiTietChiDinh ct JOIN dbo.ChiDinhCLS c ON c.maChiDinh=ct.maChiDinh LEFT JOIN dbo.KetQuaCLS k ON k.maChiTiet=ct.maChiTiet AND k.laBanHienHanh=1 WHERE ct.maChiTiet=@id`);staff=[r?.staff];episodeId=r?.episode;role='technician';page='clinical';reason='Chưa có kỹ thuật viên được giao; chưa có hàng đợi khoa giới hạn quyền trong bản hiện tại.';break;}
 case 'KetQuaCLS':{if(p.trangThai!=='DA_DUYET')return {skip:true};const r=await one(`SELECT k.maChiTiet recordId,c.maBacSiChiDinh staff,COALESCE(c.maLuotKham,c.maDotDieuTri) episode,COALESCE(l.maBenhNhan,d.maBenhNhan) patient FROM dbo.KetQuaCLS k JOIN dbo.ChiTietChiDinh ct ON ct.maChiTiet=k.maChiTiet JOIN dbo.ChiDinhCLS c ON c.maChiDinh=ct.maChiDinh LEFT JOIN dbo.LuotKham l ON l.maLuotKham=c.maLuotKham LEFT JOIN dbo.DotDieuTri d ON d.maDotDieuTri=c.maDotDieuTri WHERE k.maKetQua=@id AND k.trangThai='DA_DUYET' AND k.laBanHienHanh=1`);if(!r)return {skip:true};staff=[r?.staff];patients=[r?.patient];recordId=r?.recordId;role='doctor';episodeId=r?.episode;page='clinical';break;}
 case 'YLenh':if(!['CHO_THUC_HIEN','DANG_THUC_HIEN'].includes(p.trangThai))return {skip:true};role='nurse';page='care';tab='rounds';reason='Chưa có phân công điều dưỡng theo đợt nội trú trong schema hiện tại.';break;
 case 'DonThuoc':if(!p.thoiDiemDuyet||p.trangThaiCapPhat==='DA_HUY')return {skip:true};role='pharmacist';page='pharmacy';reason='Đơn đã duyệt chưa có dược sĩ phụ trách được lưu; không gửi toàn bộ dược sĩ.';break;
 case 'GiaoDichThanhToan':if(p.trangThai!=='CHO_THANH_TOAN')return {skip:true};staff=[p.maNhanVienXacNhan];role='cashier';page='finance';break;
 case 'LichHen':staff=[p.maNguoiXacNhan];patients=[p.maBenhNhan];role='receptionist';page='appointments';break;
 case 'LoTonKho':{const r=await one(`SELECT h.hanSuDung expiry,t.soLuongKhaDung qty,JSON_VALUE(a.duLieuSau,'$.manager') manager FROM dbo.LoTonKho t JOIN dbo.LoHang h ON h.maLoHang=t.maLoHang OUTER APPLY(SELECT TOP 1 duLieuSau FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='PharmacyDraft' AND maDoiTuong=t.maKho ORDER BY maNhatKy DESC) a WHERE t.maLoTon=@id`);if(!r||Number(r.qty)<=0)return {skip:true};const days=(Date.parse(r.expiry)-Date.now())/86400000;if(Number(r.qty)>=100&&days>30)return {skip:true};staff=[r.manager];role='pharmacist';page='pharmacy';reason='Kho chưa có người phụ trách liên kết tài khoản dược sĩ.';severity=days<0?'urgent':'important';break;}
 case 'Equipment':reason='Thiết bị chỉ có khoa sử dụng, chưa có nhân viên phụ trách thiết bị được lưu.';page='devices';break;
 case 'Reminder':{const r=await one('SELECT owner,title,content,severity FROM dbo.MediCareReminder WHERE id=TRY_CONVERT(uniqueidentifier,@id) AND cancelled=0');if(!r)return {skip:true};if(!data.accounts.some(a=>a.id===r.owner&&a.active&&data.roles.some(role=>role.id===a.roleId&&role.active)))return {recipients:[],reason:'Tài khoản nhắc việc không còn hoạt động.'};return {recipients:[{id:r.owner,page:'',tab:'',episodeId:''}],title:r.title,content:r.content,severity:r.severity};}
 default:return {skip:true};
 }
 const activeRoles=data.roles.filter(r=>r.active),active=data.accounts.filter(a=>a.active&&activeRoles.some(r=>r.id===a.roleId));
 const workforce=await rows('SELECT maNhanVien id,chuyenMon specialty FROM dbo.NhanVien WHERE dangLamViec=1');
 const specialties={doctor:'BAC_SI',nurse:'DIEU_DUONG',technician:'KY_THUAT_VIEN',pharmacist:'DUOC_SI',cashier:'THU_NGAN',receptionist:'QUAN_TRI'};
 const recipients=active.filter(a=>{
  const r=activeRoles.find(r=>r.id===a.roleId),actor=r.id==='admin'?'admin':r.workspaceRole||r.id;
  return (actor===role&&staff.filter(Boolean).includes(a.staffId)&&workforce.some(s=>s.id===a.staffId&&s.specialty===specialties[role]))||(actor==='patient'&&patients.filter(Boolean).includes(a.patientId)&&!a.staffId);
 }).map(a=>({id:a.id,page:a.patientId?'portal':page,tab,episodeId}));
 return {recipients,title:titles[event.source],content:'Có cập nhật nghiệp vụ. Mở hồ sơ được cấp quyền để xem chi tiết.',severity,recordId,reason:reason||'Chưa có tài khoản hoạt động liên kết đúng phân công.'};
}
export async function processNotifications(){
 await ensureNotifications();
 // SQL lock serializes delivery across local server, shared server and retries.
 await querySql(`SET XACT_ABORT ON;BEGIN TRAN;DECLARE @l int;EXEC @l=sys.sp_getapplock @Resource='MediCareReminderDue',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
 IF @l<0 THROW 51000,'Notification scheduling busy',1;
 INSERT dbo.MediCareNotificationOutbox(id,source,target,payload) SELECT id,'Reminder',CONVERT(varchar(100),id),N'{}' FROM dbo.MediCareReminder r WITH(UPDLOCK,HOLDLOCK) WHERE cancelled=0 AND eventId IS NULL AND dueAt<=SYSDATETIMEOFFSET();
 UPDATE dbo.MediCareReminder SET eventId=id WHERE cancelled=0 AND eventId IS NULL AND dueAt<=SYSDATETIMEOFFSET();
 INSERT dbo.MediCareNotificationOutbox(source,target,payload,eventKey)
 SELECT 'LoTonKho',t.maLoTon,(SELECT t.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER),CONCAT('expiry:',t.maLoTon,':',CONVERT(char(10),SYSUTCDATETIME(),23))
 FROM dbo.LoTonKho t JOIN dbo.LoHang h ON h.maLoHang=t.maLoHang
 WHERE t.soLuongKhaDung>0 AND h.hanSuDung<=DATEADD(day,30,CAST(SYSUTCDATETIME() AS date))
 AND NOT EXISTS(SELECT 1 FROM dbo.MediCareNotificationOutbox WHERE source='LoTonKho' AND target=t.maLoTon AND createdAt>=CAST(SYSUTCDATETIME() AS date))
 AND NOT EXISTS(SELECT 1 FROM dbo.MediCareNotificationOutbox WITH(UPDLOCK,HOLDLOCK) WHERE eventKey=CONCAT('expiry:',t.maLoTon,':',CONVERT(char(10),SYSUTCDATETIME(),23)));
 COMMIT;SELECT 'ok';`);
 const events=await rows("SELECT TOP 50 id,source,target,payload FROM dbo.MediCareNotificationOutbox WHERE state IN('PENDING','UNDELIVERED','RETRY') AND nextAttempt<=SYSUTCDATETIME() ORDER BY createdAt,id");
 if(!events.length)return;
 const state=await loadState();if(!state)return;
 for(const e of events){try{
  const r=await resolve(e,state.data),recipients=r.recipients||[];
  await querySql(`SET XACT_ABORT ON;BEGIN TRAN;DECLARE @l int;EXEC @l=sys.sp_getapplock @Resource='MediCareNotificationDelivery',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @l<0 THROW 51000,'Notification delivery busy',1;
  IF EXISTS(SELECT 1 FROM dbo.MediCareNotificationOutbox WITH(UPDLOCK,HOLDLOCK) WHERE id=@event AND state NOT IN('DELIVERED','IGNORED')) BEGIN
   INSERT dbo.MediCareNotification(eventId,recipient,kind,title,content,severity,page,tab,episodeId,recordId)
   SELECT @event,j.id,@kind,@title,@content,@severity,j.page,j.tab,j.episodeId,@record FROM OPENJSON(@recipients) WITH(id nvarchar(100),page varchar(40),tab varchar(40),episodeId varchar(20)) j
   WHERE NOT EXISTS(SELECT 1 FROM dbo.MediCareNotification n WHERE n.eventId=@event AND n.recipient=j.id);
   UPDATE dbo.MediCareNotificationOutbox SET state=@state,attempts=attempts+1,reason=@reason,nextAttempt=DATEADD(second,60,SYSUTCDATETIME()) WHERE id=@event;
   INSERT dbo.MediCareAdminAudit(id,actor,action,entity,target,changes) VALUES(NEWID(),'system','notification-delivery','notifications',@event,@audit);
  END;COMMIT;SELECT 'ok';`,{event:e.id,kind:e.source,title:r.title||titles[e.source]||'Thông báo',content:r.content||'',severity:r.severity||'normal',record:r.recordId||e.target,recipients:JSON.stringify(recipients),state:r.skip?'IGNORED':recipients.length?'DELIVERED':'UNDELIVERED',reason:recipients.length?null:r.reason||null,audit:JSON.stringify({count:recipients.length,reason:r.reason||null})});
 }catch(error){await querySql("UPDATE dbo.MediCareNotificationOutbox SET state='RETRY',attempts=attempts+1,reason=@reason,nextAttempt=DATEADD(second,60,SYSUTCDATETIME()) WHERE id=@id AND state<>'DELIVERED';SELECT 'ok';",{id:e.id,reason:String(error.message).slice(0,500)});}}
}
export async function notificationList(identity,id=null){
 await ensureNotifications();
 const items=await rows(`SELECT CONVERT(varchar(36),n.id) id,n.kind,n.title,n.content text,n.severity,CONVERT(varchar(33),n.createdAt,126)+'Z' createdAt,CONVERT(varchar(33),n.readAt,126) readAt,n.page,n.tab,n.episodeId,n.recordId FROM dbo.MediCareNotification n WHERE recipient=@user ORDER BY createdAt DESC,id`,{user:identity.userId});
 const reminders=await rows(`SELECT CONVERT(varchar(36),id) id,title,content text,CONVERT(varchar(40),dueAt,127) dueAt,severity,eventId FROM dbo.MediCareReminder WHERE owner=@user AND cancelled=0 ORDER BY dueAt`,{user:identity.userId});
 if(id){const item=items.find(i=>i.id===id);if(!item)fail(404,'Không tìm thấy thông báo của tài khoản này.');return item;}
 return {items,reminders,unread:items.filter(i=>!i.readAt).length};
}
export async function notificationAction(identity,input){
 await ensureNotifications();
 for(const key of ['senderId','recipientId','userId','owner','role','staffId'])if(Object.hasOwn(input,key))fail(400,'Không được chỉ định danh tính hoặc người nhận. Máy chủ lấy từ phiên đăng nhập.');
 const {action}=input,p={user:identity.userId,id:input.id||null};let sql;
 if(action==='remind'){
  if(typeof input.title!=='string'||!input.title.trim()||input.title.length>120||typeof input.text!=='string'||input.text.length>1000||!['normal','important','urgent'].includes(input.severity)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(input.dueAt||'')||!Number.isFinite(Date.parse(input.dueAt)))fail(400,'Tiêu đề, nội dung, mức độ hoặc thời gian không hợp lệ.');
  if(!/^[a-f0-9-]{36}$/i.test(input.requestId||'')||!/^.{8}-.{4}-4.{3}-[89ab].{3}-.{12}$/i.test(input.requestId))fail(400,'Mã yêu cầu nhắc việc không hợp lệ.');
  p.id=input.requestId;Object.assign(p,{title:input.title.trim(),text:input.text,due:input.dueAt,severity:input.severity});
  sql=`IF EXISTS(SELECT 1 FROM dbo.MediCareReminder WITH(UPDLOCK,HOLDLOCK) WHERE id=@id) BEGIN
   IF NOT EXISTS(SELECT 1 FROM dbo.MediCareReminder WHERE id=@id AND owner=@user AND title=@title AND content=@text AND dueAt=CONVERT(datetimeoffset,@due) AND severity=@severity) THROW 51000,'N_CONFLICT',1;
  END ELSE INSERT dbo.MediCareReminder(id,owner,title,content,dueAt,severity) VALUES(@id,@user,@title,@text,CONVERT(datetimeoffset,@due),@severity);`;
 }else if(action==='read')sql=`UPDATE dbo.MediCareNotification SET readAt=COALESCE(readAt,SYSUTCDATETIME()) WHERE id=TRY_CONVERT(uniqueidentifier,@id) AND recipient=@user;IF @@ROWCOUNT=0 THROW 51000,'N_NOT_FOUND',1;`;
 else if(action==='readAll')sql='UPDATE dbo.MediCareNotification SET readAt=SYSUTCDATETIME() WHERE recipient=@user AND readAt IS NULL;';
 else if(action==='cancelReminder')sql=`UPDATE dbo.MediCareReminder SET cancelled=1 WHERE id=TRY_CONVERT(uniqueidentifier,@id) AND owner=@user;IF @@ROWCOUNT=0 THROW 51000,'N_NOT_FOUND',1;`;
 else fail(400,'Thao tác thông báo không hợp lệ.');
 try{await querySql(`SET XACT_ABORT ON;BEGIN TRAN;${sql} INSERT dbo.MediCareAdminAudit(id,actor,action,entity,target,changes) VALUES(NEWID(),@user,@action,'notifications',COALESCE(@id,@user),N'{}');COMMIT;SELECT 'ok';`,{...p,action});}catch(e){if(e.message.includes('N_CONFLICT'))fail(409,'Mã yêu cầu đã dùng với nội dung khác.');if(e.message.includes('N_NOT_FOUND'))fail(404,'Không tìm thấy thông báo của tài khoản này.');throw e;}
 return {id:p.id,ok:true};
}
