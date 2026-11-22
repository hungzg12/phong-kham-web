import {randomUUID} from 'node:crypto';
import {querySql} from './admin-store.mjs';

const codes={'Nội tổng quát':'NOI','Tim mạch':'TIM','Tai Mũi Họng':'TMH','Da liễu':'DA','Sản phụ khoa':'SAN','Cơ xương khớp':'CXK'};
const uid=p=>p+randomUUID().replaceAll('-','').slice(0,16).toUpperCase();
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const dayValid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const text=(value,max=500)=>typeof value==='string'&&value.trim().length<=max?value.trim():'';

async function transaction(body,parameters){
 try{
  return JSON.parse(await querySql(`SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
 BEGIN TRAN; DECLARE @result nvarchar(max),@lock int;
 EXEC @lock=sys.sp_getapplock @Resource=N'MediCareBooking',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
 IF @lock<0 THROW 51000,'FLOW_BUSY',1;
 ${body}
 COMMIT; SELECT @result;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH`,parameters));
 }catch(error){
  const messages={FLOW_MISSING:[404,'Không tìm thấy bệnh nhân hoặc lượt khám.'],FLOW_ROOM:[409,'Chuyên khoa chưa có phòng khám hoạt động.'],FLOW_LOCKED:[409,'Lượt khám đã khóa hoặc đã kết thúc, không thể thay đổi.'],FLOW_STALE:[409,'Hồ sơ đã được cập nhật ở phiên khác. Tải lại trước khi lưu.'],FLOW_DOCTOR:[403,'Bác sĩ không thuộc phân công của lượt khám này.'],FLOW_IDENTITY:[409,'Thông tin định danh đã thuộc hồ sơ khác.']};
  for(const [key,[status,message]]of Object.entries(messages))if(error.message.includes(key))fail(status,message);
  throw error;
 }
}

function demographics(data){
 for(const [key,max]of Object.entries({name:100,phone:20,cccd:12,insurance:15,address:255,allergy:500,history:1000}))if(data[key]!=null&&(typeof data[key]!=='string'||data[key].length>max))fail(400,'Thông tin hành chính vượt giới hạn.');
 const values={name:text(data.name,100),phone:text(data.phone,20),birth:data.birth,gender:data.gender,cccd:text(data.cccd,12),insurance:text(data.insurance,15),address:text(data.address,255),allergy:text(data.allergy,500),history:text(data.history,1000)};
 if(!values.name||!dayValid(values.birth)||!/^[0-9]{10,11}$/.test(values.phone)||!['Nam','Nữ','Khác'].includes(values.gender)||(data.cccd&&!/^[0-9]{12}$/.test(data.cccd)))fail(400,'Kiểm tra họ tên, ngày sinh, số điện thoại và số định danh.');
 if(values.birth>new Date().toISOString().slice(0,10))fail(400,'Ngày sinh không được ở tương lai.');
 return values;
}

export async function receivePatient(data){
 if(!data||!codes[data.dept])fail(400,'Chọn chuyên khoa hợp lệ.');
 const patientId=text(data.patientId,20)||null;
 const values=patientId?{name:'',phone:'',birth:null,gender:'Nam',cccd:'',insurance:'',address:'',allergy:text(data.allergy,500),history:text(data.history,1000)}:demographics(data);
 return transaction(`
 DECLARE @patient varchar(20)=@patientId,@room varchar(20),@number int,@day date=CONVERT(date,SYSDATETIME());
 SELECT TOP 1 @room=maBuong FROM dbo.BuongKham WHERE maKhoa=@dept AND dangHoatDong=1 ORDER BY maBuong;
 IF @room IS NULL THROW 51000,'FLOW_ROOM',1;
 IF @patient IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.BenhNhan WHERE maBenhNhan=@patient) THROW 51000,'FLOW_MISSING',1;
 IF @patient IS NULL AND @cccd<>''
  SELECT @patient=maBenhNhan FROM dbo.BenhNhan WHERE soDinhDanh=@cccd;
 IF @patientId IS NULL AND @patient IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.BenhNhan WHERE maBenhNhan=@patient AND hoTen=@name AND ngaySinh=CONVERT(date,@birth)) THROW 51000,'FLOW_IDENTITY',1;
 IF @patient IS NULL
  SELECT TOP 1 @patient=maBenhNhan FROM dbo.BenhNhan WHERE soDienThoai=@phone AND hoTen=@name AND ngaySinh=CONVERT(date,@birth) ORDER BY maBenhNhan;
 IF @patient IS NULL
 BEGIN
  SET @patient=@newPatient;
  INSERT dbo.BenhNhan(maBenhNhan,hoTen,ngaySinh,gioiTinh,soDienThoai,soDinhDanh,soBHYT,diaChi,diUngThuoc,tienSuBenh,trangThaiDiUng)
  VALUES(@patient,@name,CONVERT(date,@birth),@gender,@phone,NULLIF(@cccd,''),NULLIF(@insurance,''),NULLIF(@address,''),NULLIF(@allergy,''),NULLIF(@history,''),CASE WHEN @allergy<>'' THEN 'CO_DI_UNG' ELSE 'CHUA_KHAI_THAC' END);
 END
 MERGE dbo.BoDemSoThuTuKham WITH(HOLDLOCK) AS target USING(SELECT @room AS maBuong,@day AS ngayCapSo) AS source
 ON target.maBuong=source.maBuong AND target.ngayCapSo=source.ngayCapSo
 WHEN MATCHED THEN UPDATE SET soThuTuHienTai=target.soThuTuHienTai+1
 WHEN NOT MATCHED THEN INSERT(maBuong,ngayCapSo,soThuTuHienTai) VALUES(@room,@day,1);
 SELECT @number=soThuTuHienTai FROM dbo.BoDemSoThuTuKham WHERE maBuong=@room AND ngayCapSo=@day;
 INSERT dbo.LuotKham(maLuotKham,maBenhNhan,maBuong,soThuTu,lyDoKham) VALUES(@visitId,@patient,@room,@number,@reason);
 SET @result=(SELECT @visitId AS visitId,@patient AS patientId,@number AS queueNumber,tenBuong AS roomName,N'Chờ khám' AS status FROM dbo.BuongKham WHERE maBuong=@room FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 `,{...values,patientId,dept:codes[data.dept],newPatient:uid('BN-'),visitId:uid('LK-'),reason:text(data.reason,255)||'Tiếp đón khám mới'});
}

export async function updatePatient(data){
 if(!data?.id||typeof data.id!=='string'||data.id.length>20)fail(400,'Thiếu mã bệnh nhân.');
 const values=demographics(data);
 return transaction(`
 IF NOT EXISTS(SELECT 1 FROM dbo.BenhNhan WHERE maBenhNhan=@id) THROW 51000,'FLOW_MISSING',1;
 IF @cccd<>'' AND EXISTS(SELECT 1 FROM dbo.BenhNhan WHERE soDinhDanh=@cccd AND maBenhNhan<>@id) THROW 51000,'FLOW_IDENTITY',1;
 UPDATE dbo.BenhNhan SET hoTen=@name,ngaySinh=CONVERT(date,@birth),gioiTinh=@gender,soDienThoai=@phone,soDinhDanh=NULLIF(@cccd,''),soBHYT=NULLIF(@insurance,''),diaChi=@address,diUngThuoc=NULLIF(@allergy,''),tienSuBenh=NULLIF(@history,''),trangThaiDiUng=CASE WHEN @allergy<>'' THEN 'CO_DI_UNG' ELSE trangThaiDiUng END WHERE maBenhNhan=@id;
 SET @result=(SELECT @id AS id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 `,{...values,id:data.id});
}

const visitSelect=`SELECT l.maLuotKham AS id,l.maBenhNhan AS patientId,k.tenKhoa AS department,r.tenBuong AS room,r.maBuong AS roomCode,
 l.soThuTu AS queueNumber,l.lyDoKham AS reason,CONVERT(char(10),l.ngayKham,23) AS date,LEFT(CONVERT(char(8),l.thoiDiemCapSo,108),5) AS time,CONVERT(varchar(23),l.thoiDiemCapSo,126) AS createdAt,
 ISNULL(assigned.hoTen,N'Chưa phân công') AS doctor,assigned.maNhanVien AS doctorStaffId,l.trangThai AS statusRaw,
 CASE l.trangThai WHEN 'CHO_KHAM' THEN N'Chờ khám' WHEN 'DANG_KHAM' THEN N'Đang khám' WHEN 'CHO_KET_QUA_CLS' THEN N'Chờ kết quả' WHEN 'HOAN_TAT_KHAM' THEN N'Hoàn tất' WHEN 'DA_HUY' THEN N'Đã hủy' ELSE l.trangThai END AS status,
 CAST(CASE WHEN h.trangThai IN('DA_KHOA','HOAN_TAT') THEN 1 ELSE 0 END AS bit) AS locked,
 ISNULL(latest.maNhatKy,0) AS revision,JSON_QUERY(latest.duLieuSau,'$.note') AS note,
 h.benhSu AS symptoms,h.tienSuBanThan AS history,h.khamToanThan AS examination,h.chanDoanXacDinh AS diagnosis,h.maICDXacDinh AS icd,h.huongDieuTri AS [plan],h.loiDanBacSi AS advice,
 vital.mach AS pulse,vital.nhietDo AS temperature,vital.spo2,vital.chieuCao AS height,vital.canNang AS weight,vital.huyetApTamThu AS bpSystolic,vital.huyetApTamTruong AS bpDiastolic
 FROM dbo.LuotKham l JOIN dbo.BuongKham r ON r.maBuong=l.maBuong JOIN dbo.Khoa k ON k.maKhoa=r.maKhoa
 LEFT JOIN dbo.HoSoKham h ON h.maLuotKham=l.maLuotKham
 OUTER APPLY(SELECT TOP 1 * FROM dbo.PhieuSinhHieu WHERE maLuotKham=l.maLuotKham ORDER BY thoiDiemDo DESC,maPhieu DESC) vital
 OUTER APPLY(SELECT TOP 1 n.hoTen,n.maNhanVien FROM dbo.PhanCongKham pc JOIN dbo.NhanVien n ON n.maNhanVien=pc.maBacSi
 WHERE pc.maBuong=l.maBuong AND pc.ngayKham=l.ngayKham AND pc.caKham=CASE WHEN DATEPART(HOUR,l.thoiDiemCapSo)<12 THEN 'SANG' ELSE 'CHIEU' END
 AND pc.trangThai IN('DA_PHAN_CONG','DANG_TRUC','HOAN_TAT') ORDER BY pc.maPhanCong) assigned
 OUTER APPLY(SELECT TOP 1 maNhatKy,duLieuSau FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='HoSoKham' AND maDoiTuong=l.maLuotKham AND ISJSON(duLieuSau)=1 ORDER BY maNhatKy DESC) latest`;

export async function listVisits({history=false,id=null}={}){
 const rows=JSON.parse(await querySql(`SELECT (${visitSelect} WHERE (@id IS NULL OR l.maLuotKham=@id) AND (@history='1' OR l.ngayKham=CONVERT(date,SYSDATETIME())) ORDER BY l.thoiDiemCapSo,l.maLuotKham FOR JSON PATH)`,{id,history:history?'1':'0'})||'[]');
 return rows.map(row=>{
  const fallback=row.symptoms||row.diagnosis||row.pulse?{symptoms:row.symptoms||'',history:row.history||'',examination:row.examination||'',diagnosis:row.diagnosis||'',icd:row.icd||'',plan:row.plan||'',advice:row.advice||'',vitals:{}}:null;
  const note=row.note||fallback;
  return {...row,note:note?{...note,vitals:row.locked?note.vitals:{...note.vitals,...Object.fromEntries(['pulse','temperature','spo2','height','weight'].filter(k=>row[k]!=null).map(k=>[k,row[k]])),...(row.bpSystolic?{pressure:row.bpSystolic+'/'+row.bpDiastolic}:{})}}:null};
 });
}

export async function searchIcd(query=''){
 const q=text(query,100);
 return JSON.parse(await querySql(`SELECT (SELECT TOP(35) maICD,tenBenh,ISNULL(tenTiengAnh,'') AS tenTiengAnh,maChuong,tenChuong,trangThai
 FROM dbo.DanhMucICD10 WHERE trangThai=1 AND (maICD LIKE @q+'%' OR tenBenh LIKE N'%'+@q+'%' OR tenTiengAnh LIKE N'%'+@q+'%') ORDER BY thuongGap DESC, maICD ASC FOR JSON PATH)`,{q})||'[]');
}

export async function listDoctors(){
 return JSON.parse(await querySql("SELECT (SELECT maNhanVien AS id,hoTen AS name FROM dbo.NhanVien WHERE chuyenMon='BAC_SI' AND dangLamViec=1 ORDER BY maNhanVien FOR JSON PATH)")||'[]');
}

export async function changeVisit(data){
 if(!data?.visitId||!['transfer','cancel'].includes(data.action)||!text(data.reason)||data.action==='transfer'&&!codes[data.dept])fail(400,'Chọn lượt khám, thao tác và nhập lý do hợp lệ.');
 return transaction(`
 DECLARE @room varchar(20),@number int,@day date=CONVERT(date,SYSDATETIME());
 IF NOT EXISTS(SELECT 1 FROM dbo.LuotKham WHERE maLuotKham=@id) THROW 51000,'FLOW_MISSING',1;
 IF EXISTS(SELECT 1 FROM dbo.LuotKham WHERE maLuotKham=@id AND trangThai IN('DA_HUY','HOAN_TAT_KHAM')) OR EXISTS(SELECT 1 FROM dbo.HoSoKham WHERE maLuotKham=@id AND trangThai<>'DANG_KHAM') THROW 51000,'FLOW_LOCKED',1;
 IF @action='cancel' UPDATE dbo.LuotKham SET trangThai='DA_HUY' WHERE maLuotKham=@id;
 ELSE
 BEGIN
  SELECT TOP 1 @room=maBuong FROM dbo.BuongKham WHERE maKhoa=@dept AND dangHoatDong=1 ORDER BY maBuong;
  IF @room IS NULL THROW 51000,'FLOW_ROOM',1;
  SELECT @day=ngayKham FROM dbo.LuotKham WHERE maLuotKham=@id;
  MERGE dbo.BoDemSoThuTuKham WITH(HOLDLOCK) target USING(SELECT @room maBuong,@day ngayCapSo) source ON target.maBuong=source.maBuong AND target.ngayCapSo=source.ngayCapSo
  WHEN MATCHED THEN UPDATE SET soThuTuHienTai=target.soThuTuHienTai+1 WHEN NOT MATCHED THEN INSERT(maBuong,ngayCapSo,soThuTuHienTai) VALUES(@room,@day,1);
  SELECT @number=soThuTuHienTai FROM dbo.BoDemSoThuTuKham WHERE maBuong=@room AND ngayCapSo=@day;
  UPDATE dbo.LuotKham SET maBuong=@room,soThuTu=@number WHERE maLuotKham=@id;
 END
 INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,ketQua,lyDo) VALUES('LuotKham',@id,@action,'DICH_VU','THANH_CONG',@reason);
 SET @result=(SELECT @id AS visitId FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 `,{id:data.visitId,action:data.action,dept:codes[data.dept]||null,reason:text(data.reason)});
}

export async function saveExam(data){
 const note=data?.note||data;
 if(!data?.visitId||typeof data.visitId!=='string'||data.visitId.length>20||!note||!Number.isSafeInteger(data.revision)||data.revision<0)fail(400,'Thiếu mã lượt khám hoặc phiên bản hồ sơ.');
 const lock=data.lock===true,reopen=data.reopen===true;
 if(reopen&&!text(data.reason))fail(400,'Nhập lý do mở đính chính.');
 const fields={};for(const name of ['reason','symptoms','history','examination','diagnosis','icd','plan','advice','outcome','comorbidities','orders']){
  const max=['symptoms','history','examination'].includes(name)?10000:name==='icd'?20:name==='reason'?255:500;
  if(note[name]!=null&&(typeof note[name]!=='string'||note[name].length>max))fail(400,'Nội dung phiếu khám vượt giới hạn.');
  fields[name]=typeof note[name]==='string'?note[name].trim():'';
 }
 fields.outcome ||= 'Điều trị ngoại trú';
 if(lock&&(!fields.symptoms||!fields.diagnosis))fail(400,'Nhập triệu chứng và chẩn đoán trước khi hoàn tất.');
 const vitals=note.vitals||{},numbers={};
 if(typeof vitals!=='object'||Array.isArray(vitals))fail(400,'Sinh hiệu không hợp lệ.');
 for(const key of ['pulse','temperature','respiration','spo2','height','weight']){
  const value=vitals[key];numbers[key]=value==null||value===''?null:Number(value);
  const max=key==='spo2'?100:key==='temperature'?999.9:['height','weight'].includes(key)?9999.9:2147483647;
  if(numbers[key]!=null&&(!Number.isFinite(numbers[key])||numbers[key]<=0||numbers[key]>max||(['pulse','respiration'].includes(key)&&!Number.isInteger(numbers[key]))))fail(400,'Chỉ số sinh hiệu không hợp lệ.');
 }
 const pressure=String(vitals.pressure||'');if(pressure&&!/^\d{1,3}\/\d{1,3}$/.test(pressure))fail(400,'Huyết áp phải có dạng tâm thu/tâm trương.');
 const [bpSystolic,bpDiastolic]=pressure?pressure.split('/').map(Number):[null,null];
 if(pressure&&(!bpSystolic||!bpDiastolic))fail(400,'Huyết áp không hợp lệ.');
 const snapshot=JSON.stringify({note:{...fields,vitals,savedAt:new Date().toISOString()}});
 await transaction(`
 DECLARE @doctor varchar(20),@room varchar(20),@day date,@current bigint=0,@hour int;
 SELECT @room=maBuong,@day=ngayKham,@hour=DATEPART(HOUR,thoiDiemCapSo) FROM dbo.LuotKham WHERE maLuotKham=@id;
 IF @room IS NULL THROW 51000,'FLOW_MISSING',1;
 SELECT TOP 1 @doctor=maBacSi FROM dbo.PhanCongKham WHERE maBuong=@room AND ngayKham=@day AND caKham=CASE WHEN @hour<12 THEN 'SANG' ELSE 'CHIEU' END AND trangThai IN('DA_PHAN_CONG','DANG_TRUC','HOAN_TAT') ORDER BY maPhanCong;
 IF @doctor IS NOT NULL AND @doctorId IS NOT NULL AND @doctorId<>@doctor THROW 51000,'FLOW_DOCTOR',1;
 IF @doctor IS NULL AND @doctorId IS NOT NULL AND EXISTS(SELECT 1 FROM dbo.NhanVien WHERE maNhanVien=@doctorId AND chuyenMon='BAC_SI' AND dangLamViec=1)
  SET @doctor=@doctorId;
 IF @doctor IS NULL
  SELECT TOP 1 @doctor=n.maNhanVien FROM dbo.NhanVien n JOIN dbo.Khoa k ON k.maKhoa=n.maKhoa JOIN dbo.BuongKham b ON b.maKhoa=k.maKhoa WHERE b.maBuong=@room AND n.chuyenMon='BAC_SI' AND n.dangLamViec=1 ORDER BY n.maNhanVien;
 IF @doctor IS NULL OR (@doctorId IS NOT NULL AND @doctorId<>@doctor) THROW 51000,'FLOW_DOCTOR',1;
 SELECT @current=ISNULL(MAX(maNhatKy),0) FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='HoSoKham' AND maDoiTuong=@id AND ISJSON(duLieuSau)=1;
 IF @current<>CONVERT(bigint,@revision) THROW 51000,'FLOW_STALE',1;
 IF EXISTS(SELECT 1 FROM dbo.LuotKham WHERE maLuotKham=@id AND trangThai='DA_HUY') THROW 51000,'FLOW_LOCKED',1;
 IF @reopen='1'
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM dbo.HoSoKham WHERE maLuotKham=@id AND trangThai IN('HOAN_TAT','DA_KHOA')) THROW 51000,'FLOW_LOCKED',1;
  UPDATE dbo.HoSoKham SET trangThai='DANG_KHAM',thoiDiemHoanTat=NULL WHERE maLuotKham=@id;
  UPDATE dbo.LuotKham SET trangThai='DANG_KHAM',thoiDiemKetThuc=NULL WHERE maLuotKham=@id;
 END
 ELSE
 BEGIN
  IF EXISTS(SELECT 1 FROM dbo.HoSoKham WHERE maLuotKham=@id AND trangThai IN('HOAN_TAT','DA_KHOA')) THROW 51000,'FLOW_LOCKED',1;
  MERGE dbo.HoSoKham AS target USING(SELECT @id AS maLuotKham) AS source ON target.maLuotKham=source.maLuotKham
  WHEN MATCHED THEN UPDATE SET maBacSi=@doctor,benhSu=@symptoms,tienSuBanThan=@history,khamToanThan=@examination,chanDoanXacDinh=@diagnosis,maICDXacDinh=NULLIF(@icd,''),huongDieuTri=@plan,loiDanBacSi=@advice,trangThai=CASE WHEN @finish='1' THEN 'DA_KHOA' ELSE 'DANG_KHAM' END,thoiDiemHoanTat=CASE WHEN @finish='1' THEN SYSDATETIME() ELSE NULL END
  WHEN NOT MATCHED THEN INSERT(maHoSoKham,maLuotKham,maBacSi,benhSu,tienSuBanThan,khamToanThan,chanDoanXacDinh,maICDXacDinh,huongDieuTri,loiDanBacSi,trangThai,thoiDiemHoanTat)
  VALUES(@examId,@id,@doctor,@symptoms,@history,@examination,@diagnosis,NULLIF(@icd,''),@plan,@advice,CASE WHEN @finish='1' THEN 'DA_KHOA' ELSE 'DANG_KHAM' END,CASE WHEN @finish='1' THEN SYSDATETIME() ELSE NULL END);
  IF @hasVitals='1'
  BEGIN
   INSERT dbo.PhieuSinhHieu(maPhieu,maLuotKham,maNhanVien,mach,nhietDo,huyetApTamThu,huyetApTamTruong,nhipTho,spo2,chieuCao,canNang)
   VALUES(@vitalsId,@id,@doctor,TRY_CONVERT(int,@pulse),TRY_CONVERT(decimal(4,1),@temperature),TRY_CONVERT(int,@bpSystolic),TRY_CONVERT(int,@bpDiastolic),TRY_CONVERT(int,@respiration),TRY_CONVERT(decimal(4,1),@spo2),TRY_CONVERT(decimal(5,1),@height),TRY_CONVERT(decimal(5,1),@weight));
  END
  UPDATE dbo.LuotKham SET lyDoKham=CASE WHEN @chiefComplaint<>'' THEN @chiefComplaint ELSE lyDoKham END,trangThai=CASE WHEN @finish='1' THEN CASE WHEN @outcome=N'Chờ kết quả CLS' THEN 'CHO_KET_QUA_CLS' ELSE 'HOAN_TAT_KHAM' END ELSE 'DANG_KHAM' END,thoiDiemKetThuc=CASE WHEN @finish='1' AND @outcome<>N'Chờ kết quả CLS' THEN SYSDATETIME() ELSE NULL END WHERE maLuotKham=@id;
 END
 INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,maNguoiThucHien,ketQua,lyDo,duLieuSau)
 VALUES('HoSoKham',@id,CASE WHEN @reopen='1' THEN 'MO_DINH_CHINH' ELSE 'LUU_KHAM' END,'NHAN_VIEN',@doctor,'THANH_CONG',@reason,@snapshot);
 SET @result=N'{}';
 `,{...fields,...numbers,chiefComplaint:fields.reason,id:data.visitId,revision:data.revision,doctorId:data.doctorStaffId||null,finish:lock?'1':'0',reopen:reopen?'1':'0',reason:reopen?text(data.reason):null,snapshot,examId:uid('HS-'),vitalsId:uid('SH-'),bpSystolic,bpDiastolic,hasVitals:Object.values(numbers).some(v=>v!=null)||pressure?'1':'0'});
 return (await listVisits({history:true,id:data.visitId}))[0];
}
