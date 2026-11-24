import {resolveDepartment} from './department-catalog.mjs';
import { randomUUID } from 'node:crypto';
import { querySql } from './admin-store.mjs';

const departments = {'Nội tổng quát':'NOI','Tim mạch':'TIM','Tai Mũi Họng':'TMH','Da liễu':'DA','Sản phụ khoa':'SAN','Cơ xương khớp':'CXK'};
const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
const uid = prefix => prefix + randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase();
const dateValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;

export function validateAppointment(data) {
  if (!data || typeof data !== 'object') fail(400, 'Thông tin lịch hẹn không hợp lệ.');
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  if (!name || name.length > 100 || !/^[0-9]{10,11}$/.test(phone) || !dateValid(data.birth) || !dateValid(data.day) || !/^(0[89]|10|1[3-6]):(00|30)$/.test(data.time) || !['Nam','Nữ','Khác'].includes(data.gender) || !departments[data.dept]) {
    fail(400, 'Vui lòng kiểm tra họ tên, điện thoại, ngày sinh, chuyên khoa và giờ hẹn (khung giờ 30 phút).');
  }
  return {name,phone,birth:data.birth,gender:data.gender,day:data.day,time:data.time,deptCode:departments[data.dept]};
}

const appointmentSelect = `SELECT h.maHen AS id, h.maBenhNhan AS patientId, b.hoTen AS name,
 ISNULL(b.soDienThoai,'') AS phone, CONVERT(char(10),b.ngaySinh,23) AS birth, b.gioiTinh AS gender,
 k.tenKhoa AS dept, k.tenKhoa AS department, r.tenBuong AS room,
 CONVERT(char(10),h.ngayHen,23) AS day, LEFT(CONVERT(char(8),h.gioHenDuKien,108),5) AS time,
 h.trangThai AS statusRaw, CASE h.trangThai WHEN 'DA_DAT' THEN N'Đã xác nhận'
 WHEN 'DA_CHECK_IN' THEN N'Đã tiếp đón' WHEN 'DA_HUY' THEN N'Đã hủy'
 WHEN 'HOAN_TAT' THEN N'Hoàn tất' WHEN 'QUA_HEN' THEN N'Quá hẹn' ELSE h.trangThai END AS status,
 (SELECT TOP 1 n.lyDo FROM dbo.NhatKyThayDoi n WHERE n.loaiDoiTuong='LichHen' AND n.maDoiTuong=h.maHen AND n.hanhDong='HUY_LICH' ORDER BY n.maNhatKy DESC) AS cancelReason
 FROM dbo.LichHen h JOIN dbo.BenhNhan b ON b.maBenhNhan=h.maBenhNhan
 JOIN dbo.Khoa k ON k.maKhoa=h.maKhoa JOIN dbo.BuongKham r ON r.maBuong=h.maBuong`;

export async function listAppointments() {
  // FOR JSON used as a result set is split into ~2033-character rows by SQL
  // Server. Return one nvarchar(max) scalar because querySql uses ExecuteScalar.
  return JSON.parse(await querySql(`SELECT (${appointmentSelect} ORDER BY h.ngayHen DESC,h.gioHenDuKien DESC,h.maHen FOR JSON PATH)`) || '[]');
}

async function transaction(sql, parameters) {
  try {
    const result = await querySql(`SET NOCOUNT ON; SET XACT_ABORT ON;
BEGIN TRY
 BEGIN TRAN;
 DECLARE @lock int, @result nvarchar(max);
 EXEC @lock=sys.sp_getapplock @Resource=N'MediCareBooking',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
 IF @lock<0 THROW 51000,'APPT_BUSY',1;
 ${sql}
 COMMIT;
 SELECT @result;
END TRY
BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK;
 THROW;
END CATCH`, parameters);
    return JSON.parse(result);
  } catch (error) {
    if (/APPT_MISSING/.test(error.message)) fail(404,'Không tìm thấy lịch hẹn.');
    if (/APPT_DUPLICATE/.test(error.message)) fail(409,'Bệnh nhân đã có lịch hẹn vào thời điểm này.');
    if (/APPT_STATE/.test(error.message)) fail(409,'Trạng thái lịch hẹn đã thay đổi. Tải lại danh sách trước khi xử lý.');
    if (/APPT_PATIENT/.test(error.message)) fail(409,'Người bệnh không khớp với lịch hẹn.');
    if (/APPT_ROOM/.test(error.message)) fail(409,'Chuyên khoa chưa có phòng khám hoạt động.');
    throw error;
  }
}

export async function saveAppointment(data, id = null, linkedPatient = null) {
  const values = validateAppointment(data);
  values.deptCode=await resolveDepartment(data.dept);
  if (id && (typeof id !== 'string' || id.length>20)) fail(400,'Mã lịch hẹn không hợp lệ.');
  return transaction(`
 DECLARE @patient varchar(20)=@linkedPatient, @room varchar(20);
 IF @linkedPatient IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.BenhNhan WHERE maBenhNhan=@linkedPatient AND hoTen=@name AND soDienThoai=@phone AND ngaySinh=CONVERT(date,@birth)) THROW 51000,'APPT_PATIENT',1;
 IF @editing='1'
 BEGIN
  SELECT @patient=maBenhNhan FROM dbo.LichHen WHERE maHen=@id;
  IF @patient IS NULL THROW 51000,'APPT_MISSING',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.LichHen WHERE maHen=@id AND trangThai='DA_DAT') THROW 51000,'APPT_STATE',1;
 END
 ELSE IF @patient IS NULL
  SELECT TOP 1 @patient=maBenhNhan FROM dbo.BenhNhan WHERE soDienThoai=@phone AND hoTen=@name AND ngaySinh=CONVERT(date,@birth) ORDER BY maBenhNhan;
 IF EXISTS(SELECT 1 FROM dbo.LichHen h JOIN dbo.BenhNhan b ON b.maBenhNhan=h.maBenhNhan
  WHERE (b.soDienThoai=@phone OR h.maBenhNhan=@patient) AND h.ngayHen=CONVERT(date,@day) AND h.gioHenDuKien=CONVERT(time,@time) AND h.trangThai<>'DA_HUY' AND h.maHen<>@id)
  THROW 51000,'APPT_DUPLICATE',1;
 SELECT TOP 1 @room=maBuong FROM dbo.BuongKham WHERE maKhoa=@deptCode AND dangHoatDong=1 ORDER BY maBuong;
 IF @room IS NULL THROW 51000,'APPT_ROOM',1;
 IF @patient IS NULL
 BEGIN
  SET @patient=@newPatient;
  INSERT dbo.BenhNhan(maBenhNhan,hoTen,ngaySinh,gioiTinh,soDienThoai) VALUES(@patient,@name,CONVERT(date,@birth),@gender,@phone);
 END
 ELSE IF @editing='1'
  UPDATE dbo.BenhNhan SET hoTen=@name,ngaySinh=CONVERT(date,@birth),gioiTinh=@gender,soDienThoai=@phone WHERE maBenhNhan=@patient;
 IF @editing='1'
  UPDATE dbo.LichHen SET maKhoa=@deptCode,maBuong=@room,ngayHen=CONVERT(date,@day),gioHenDuKien=CONVERT(time,@time) WHERE maHen=@id;
 ELSE
  INSERT dbo.LichHen(maHen,maBenhNhan,maKhoa,maBuong,ngayHen,gioHenDuKien,maQRCheckIn)
  VALUES(@id,@patient,@deptCode,@room,CONVERT(date,@day),CONVERT(time,@time),@id);
 SET @result=(${appointmentSelect} WHERE h.maHen=@id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 `, {...values,id:id || uid('LH-'),editing:id?'1':'0',newPatient:uid('BN-'),linkedPatient});
}

export async function cancelAppointment(id, reason) {
  if (typeof id!=='string' || !id || id.length>20 || typeof reason!=='string' || !reason.trim() || reason.trim().length>500) fail(400,'Nhập mã lịch và lý do hủy (tối đa 500 ký tự).');
  return transaction(`
 IF NOT EXISTS(SELECT 1 FROM dbo.LichHen WHERE maHen=@id) THROW 51000,'APPT_MISSING',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.LichHen WHERE maHen=@id AND trangThai='DA_DAT') THROW 51000,'APPT_STATE',1;
 UPDATE dbo.LichHen SET trangThai='DA_HUY' WHERE maHen=@id;
 INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,ketQua,lyDo)
 VALUES('LichHen',@id,'HUY_LICH','DICH_VU','THANH_CONG',@reason);
 SET @result=(${appointmentSelect} WHERE h.maHen=@id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 `,{id,reason:reason.trim()});
}

export async function checkInAppointment({appointmentId,patientId}) {
  if (typeof appointmentId!=='string' || !appointmentId || appointmentId.length>20) fail(400,'Mã lịch hẹn không hợp lệ.');
  return transaction(`
 DECLARE @patient varchar(20),@room varchar(20),@state varchar(30),@visit varchar(20),@number int,@day date=CONVERT(date,SYSDATETIME());
 SELECT @patient=maBenhNhan,@room=maBuong,@state=trangThai FROM dbo.LichHen WHERE maHen=@id;
 IF @patient IS NULL THROW 51000,'APPT_MISSING',1;
 IF @patientId IS NOT NULL AND @patientId<>@patient THROW 51000,'APPT_PATIENT',1;
 SELECT @visit=maLuotKham FROM dbo.LuotKham WHERE maHen=@id;
 IF @visit IS NULL
 BEGIN
  IF @state<>'DA_DAT' THROW 51000,'APPT_STATE',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.BuongKham WHERE maBuong=@room AND dangHoatDong=1) THROW 51000,'APPT_ROOM',1;
  MERGE dbo.BoDemSoThuTuKham WITH (HOLDLOCK) AS target
  USING (SELECT @room AS maBuong,@day AS ngayCapSo) AS source
  ON target.maBuong=source.maBuong AND target.ngayCapSo=source.ngayCapSo
  WHEN MATCHED THEN UPDATE SET soThuTuHienTai=target.soThuTuHienTai+1
  WHEN NOT MATCHED THEN INSERT(maBuong,ngayCapSo,soThuTuHienTai) VALUES(@room,@day,1);
  SELECT @number=soThuTuHienTai FROM dbo.BoDemSoThuTuKham WHERE maBuong=@room AND ngayCapSo=@day;
  SET @visit=@newVisit;
  INSERT dbo.LuotKham(maLuotKham,maBenhNhan,maBuong,maHen,soThuTu,lyDoKham)
  VALUES(@visit,@patient,@room,@id,@number,N'Khám theo lịch hẹn '+@id);
  UPDATE dbo.LichHen SET trangThai='DA_CHECK_IN' WHERE maHen=@id;
 END
 SET @result=(SELECT l.maLuotKham AS visitId,l.maBenhNhan AS patientId,l.soThuTu AS queueNumber,r.tenBuong AS roomName,
 r.maBuong AS roomCode,k.tenKhoa AS department,CONVERT(char(10),l.ngayKham,23) AS date,
 LEFT(CONVERT(char(8),l.thoiDiemCapSo,108),5) AS time,N'Chờ khám' AS status
 FROM dbo.LuotKham l JOIN dbo.BuongKham r ON r.maBuong=l.maBuong JOIN dbo.Khoa k ON k.maKhoa=r.maKhoa
 WHERE l.maLuotKham=@visit FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 `,{id:appointmentId,patientId:patientId || null,newVisit:uid('LK-')});
}
