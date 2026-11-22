import {careStockSql} from './care-stock.mjs';
import {randomUUID} from 'node:crypto';
import {querySql} from './admin-store.mjs';
const uid=p=>p+randomUUID().replaceAll('-','').slice(0,16);
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const string=(v,max=500)=>typeof v==='string'&&v.trim().length<=max?v.trim():'';
async function run(sql,params){try{return JSON.parse(await querySql(`SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY BEGIN TRAN;
 DECLARE @result nvarchar(max),@lock int;
 EXEC @lock=sys.sp_getapplock @Resource=N'MediCareAncillary',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
 IF @lock<0 THROW 51000,'A_BUSY',1;
 ${sql} COMMIT;SELECT @result;END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH`,params));}
 catch(e){for(const [key,status,message]of [['A_MISSING',404,'Không tìm thấy hồ sơ liên kết.'],['A_STALE',409,'Phiếu đã thay đổi. Tải lại trước khi xử lý.'],['A_STATE',409,'Trạng thái hiện tại không cho phép thao tác.'],['A_STAFF',403,'Nhân viên không có chuyên môn phù hợp hoặc đã ngừng làm việc.'],['A_PATIENT',409,'Người bệnh không khớp hồ sơ.'],['A_DUPLICATE',409,'Dịch vụ đã được chỉ định trong hồ sơ.']])if(e.message.includes(key))fail(status,message);throw e;}}

export async function ancillaryState(){
 const raw=await querySql(`SELECT (
 SELECT JSON_QUERY((SELECT maNhanVien id,hoTen name,chucDanh title,chuyenMon specialty,maKhoa departmentId,N'Đang hoạt động' status FROM dbo.NhanVien WHERE dangLamViec=1 FOR JSON PATH)) staff,
 JSON_QUERY((SELECT v.maPhieu id,l.maBenhNhan patient,COALESCE(JSON_VALUE(a.duLieuSau,'$.episodeId'),v.maLuotKham) episodeId,CONVERT(varchar(19),v.thoiDiemDo,126) time,v.mach pulse,v.nhietDo temperature,v.spo2,v.chieuCao height,v.canNang weight,v.bmi,CONCAT(v.huyetApTamThu,'/',v.huyetApTamTruong) pressure,N'Đã ghi nhận' status FROM dbo.PhieuSinhHieu v JOIN dbo.LuotKham l ON l.maLuotKham=v.maLuotKham OUTER APPLY(SELECT TOP 1 duLieuSau FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='SinhHieu' AND maDoiTuong=v.maPhieu ORDER BY maNhatKy DESC) a FOR JSON PATH)) vitals,
 JSON_QUERY((SELECT ct.maChiTiet id,COALESCE(c.maLuotKham,c.maDotDieuTri) episodeId,COALESCE(l.maBenhNhan,dt.maBenhNhan) patient,c.maBacSiChiDinh doctor,ct.maDichVu service,c.chanDoanLamSang diagnosis,
 CASE c.loaiUuTien WHEN 'CAP_CUU' THEN N'Khẩn cấp' ELSE N'Thường quy' END priority,
 CASE WHEN ct.trangThai='DA_HUY' THEN N'Đã hủy' WHEN k.trangThai='DA_DUYET' THEN N'Đã phát hành' WHEN k.maKetQua IS NOT NULL THEN N'Chờ duyệt' WHEN ct.trangThai='DANG_THUC_HIEN' THEN N'Đang thực hiện' ELSE N'Chờ tiếp nhận' END status,
 ISNULL(a.maNhatKy,0) resultRevision,
 COALESCE(JSON_QUERY(a.duLieuSau,'$.rows'), JSON_QUERY((SELECT cs.tenChiSo name, cs.giaTriDo value, cs.donViDo unit, cs.khoangThamChieu reference FROM dbo.ChiSoXetNghiem cs WHERE cs.maKetQua=k.maKetQua FOR JSON PATH))) resultRows,
 COALESCE(JSON_VALUE(a.duLieuSau,'$.result'), km.moTaHinhAnh) result,
 COALESCE(JSON_VALUE(a.duLieuSau,'$.conclusion'), k.ghiChuChuyenMon, km.ketLuan) conclusion,
 COALESCE(JSON_VALUE(a.duLieuSau,'$.critical'), CASE WHEN kx.coCanhBaoNguyKich=1 THEN N'Có' ELSE N'Không' END) critical,
 CONVERT(varchar(19),k.thoiDiemDuyet,126) releasedAt,CASE WHEN k.trangThai='DA_DUYET' THEN n.hoTen ELSE NULL END reviewer,CONVERT(char(10),c.thoiDiemChiDinh,23) date
 FROM dbo.ChiTietChiDinh ct JOIN dbo.ChiDinhCLS c ON c.maChiDinh=ct.maChiDinh LEFT JOIN dbo.LuotKham l ON l.maLuotKham=c.maLuotKham LEFT JOIN dbo.DotDieuTri dt ON dt.maDotDieuTri=c.maDotDieuTri
 OUTER APPLY(SELECT TOP 1 * FROM dbo.KetQuaCLS WHERE maChiTiet=ct.maChiTiet AND laBanHienHanh=1 ORDER BY phienBan DESC) k
 LEFT JOIN dbo.KetQuaXetNghiem kx ON kx.maKetQua=k.maKetQua
 LEFT JOIN dbo.KetQuaMoTa km ON km.maKetQua=k.maKetQua
 LEFT JOIN dbo.NhanVien n ON n.maNhanVien=k.maKyThuatVien
 OUTER APPLY(SELECT TOP 1 maNhatKy,duLieuSau FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='CLS' AND maDoiTuong=ct.maChiTiet ORDER BY maNhatKy DESC) a
 FOR JSON PATH)) labs
 FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)`);
 const result=JSON.parse(raw);
 for(const key of ['staff','vitals','labs'])if(!Array.isArray(result[key]))result[key]=[];
 for(const l of result.labs)if(typeof l.resultRows==='string'){try{l.resultRows=JSON.parse(l.resultRows);}catch{l.resultRows=null;}}
 result.services=JSON.parse(await querySql(`SELECT (SELECT maDichVu id,tenDichVu name,CASE loaiDichVu WHEN 'XET_NGHIEM' THEN N'Xét nghiệm' WHEN 'CDHA' THEN N'Chẩn đoán hình ảnh' ELSE N'Thủ thuật' END kind,donGia price,N'Đang hoạt động' status FROM dbo.DichVuKyThuat WHERE dangHoatDong=1 FOR JSON PATH)`)||'[]');
 result.warehouses=JSON.parse(await querySql("SELECT (SELECT maKho id,tenKho name,N'Đang hoạt động' status FROM dbo.KhoDuoc WHERE dangHoatDong=1 FOR JSON PATH)")||'[]');
 result.inventory=JSON.parse(await querySql(`SELECT (SELECT t.maLoTon id,t.maKho warehouseId,h.maHang medicineId,h.soLoNhaSanXuat lot,CONVERT(char(10),h.hanSuDung,23) expiry,t.soLuongKhaDung qty,t.soLuongTon physicalQty,t.trangThaiKhoa locked FROM dbo.LoTonKho t JOIN dbo.LoHang h ON h.maLoHang=t.maLoHang FOR JSON PATH)`)||'[]');
 result.rounds=JSON.parse(await querySql(`SELECT (SELECT y.maYLenh id,t.maDotDieuTri episodeId,dt.maBenhNhan patient,y.maBacSiRaYLenh doctor,t.maTo sheetId,t.dienBienBenh progress,
 CASE y.loaiYLenh WHEN 'THUOC' THEN N'Dùng thuốc' ELSE N'Chăm sóc' END kind,y.noiDungYLenh dose,y.maHang medicine,y.soLuongKeHoach quantity,y.coTieuHaoKho stockRequired,
 CONVERT(varchar(19),y.thoiDiemBatDau,126) scheduled,CASE WHEN y.trangThai='DA_HOAN_TAT' THEN N'Đã thực hiện' WHEN y.trangThai='DA_HUY' THEN N'Đã hủy' ELSE N'Chờ thực hiện' END status,
 ISNULL(a.maNhatKy,0) revision FROM dbo.YLenh y JOIN dbo.ToDieuTri t ON t.maTo=y.maTo JOIN dbo.DotDieuTri dt ON dt.maDotDieuTri=t.maDotDieuTri
 OUTER APPLY(SELECT TOP 1 maNhatKy FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='YLenh' AND maDoiTuong=y.maYLenh ORDER BY maNhatKy DESC) a FOR JSON PATH)`)||'[]');
 result.admissions=JSON.parse(await querySql(`SELECT (SELECT d.maDotDieuTri id,d.maBenhNhan patientId,k.tenKhoa department,n.hoTen doctor,CONVERT(char(10),d.thoiDiemNhapVien,23) date,LEFT(CONVERT(char(8),d.thoiDiemNhapVien,108),5) time,
 CASE WHEN d.trangThai IN('DANG_DIEU_TRI','CHO_XUAT_VIEN') THEN N'Đang điều trị' ELSE N'Đã ra viện' END status,d.lyDoNhapVien reason
 FROM dbo.DotDieuTri d JOIN dbo.Khoa k ON k.maKhoa=d.maKhoaDieuTri JOIN dbo.NhanVien n ON n.maNhanVien=d.maBacSiDieuTriChinh FOR JSON PATH)`)||'[]');
 return result;
}

export async function listBeds(){
 return JSON.parse(await querySql(`SELECT (SELECT g.maGiuong id,g.soHieuGiuong bedNumber,b.tenBuong roomName,k.tenKhoa departmentName,g.donGiaNgay dailyRate,g.trangThaiHienTai statusRaw,
 CASE g.trangThaiHienTai WHEN 'TRONG' THEN N'Sẵn sàng' WHEN 'DANG_SU_DUNG' THEN N'Đang sử dụng' WHEN 'DANG_VE_SINH' THEN N'Chờ khử khuẩn' ELSE N'Không sẵn sàng' END status,
 p.maDotDieuTri admissionId,d.maBenhNhan patientId,n.hoTen patientName FROM dbo.GiuongBenh g JOIN dbo.BuongBenh b ON b.maBuongBenh=g.maBuongBenh JOIN dbo.Khoa k ON k.maKhoa=b.maKhoa
 LEFT JOIN dbo.PhanGiuong p ON p.maGiuong=g.maGiuong AND p.trangThai='DANG_SU_DUNG' AND p.denThoiDiem IS NULL LEFT JOIN dbo.DotDieuTri d ON d.maDotDieuTri=p.maDotDieuTri LEFT JOIN dbo.BenhNhan n ON n.maBenhNhan=d.maBenhNhan WHERE g.dangHoatDong=1 FOR JSON PATH)`)||'[]');
}

export async function bedAction(data){
 if(!data||!['admin','nurse'].includes(data.role))fail(403,'Chỉ điều dưỡng được xếp giường hoặc xác nhận vệ sinh.');
 if(!string(data.id,20)||!string(data.staffId,20)||!['assign','clean'].includes(data.action))fail(400,'Thao tác buồng giường không hợp lệ.');
 await run(`
 DECLARE @state varchar(30),@admission varchar(20),@department varchar(20),@price decimal(18,2);
 IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE maNhanVien=@staff AND chuyenMon='DIEU_DUONG' AND dangLamViec=1) THROW 51000,'A_STAFF',1;
 SELECT @state=g.trangThaiHienTai,@department=b.maKhoa,@price=g.donGiaNgay FROM dbo.GiuongBenh g JOIN dbo.BuongBenh b ON b.maBuongBenh=g.maBuongBenh WHERE g.maGiuong=@id AND g.dangHoatDong=1;
 IF @state IS NULL THROW 51000,'A_MISSING',1;
 IF EXISTS(SELECT 1 FROM dbo.PhanGiuong WHERE maGiuong=@id AND trangThai='DANG_SU_DUNG' AND denThoiDiem IS NULL) THROW 51000,'A_STATE',1;
 IF @action='clean'
 BEGIN
  IF @state<>'DANG_VE_SINH' THROW 51000,'A_STATE',1;
  UPDATE dbo.GiuongBenh SET trangThaiHienTai='TRONG' WHERE maGiuong=@id;
 END
 ELSE
 BEGIN
  IF @state<>'TRONG' THROW 51000,'A_STATE',1;
  SELECT @admission=maDotDieuTri FROM dbo.DotDieuTri WHERE maBenhNhan=@patient AND maKhoaDieuTri=@department AND trangThai='DANG_DIEU_TRI';
  IF @admission IS NULL THROW 51000,'A_MISSING',1;
  IF EXISTS(SELECT 1 FROM dbo.PhanGiuong WHERE maDotDieuTri=@admission AND trangThai='DANG_SU_DUNG' AND denThoiDiem IS NULL) THROW 51000,'A_STATE',1;
  INSERT dbo.PhanGiuong(maPhanGiuong,maDotDieuTri,maGiuong,tuThoiDiem,donGiaApDung,maNhanVienXep) VALUES(@allocation,@admission,@id,SYSDATETIME(),@price,@staff);
  UPDATE dbo.GiuongBenh SET trangThaiHienTai='DANG_SU_DUNG' WHERE maGiuong=@id;
 END
 INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,maNguoiThucHien,ketQua) VALUES('Giuong',@id,@action,'NHAN_VIEN',@staff,'THANH_CONG');SET @result=N'{}';
 `,{id:data.id,staff:data.staffId,action:data.action,patient:data.patientId||null,allocation:uid('PG-')});
 return (await listBeds()).find(b=>b.id===data.id);
}

export async function performCare(data){
 if(!data||!['admin','nurse'].includes(data.role))fail(403,'Chỉ điều dưỡng được xác nhận thực hiện y lệnh.');
 if(!string(data.id,20)||!string(data.staffId,20)||!Number.isSafeInteger(data.revision)||['patient','medicine','dose','route','time'].some(k=>data['check_'+k]!==true))fail(400,'Xác nhận đủ 5 đúng trước khi thực hiện.');
 await run(`
 DECLARE @patient varchar(20),@state varchar(30),@stock bit,@rev bigint=0,@admissionState varchar(30);
 IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE maNhanVien=@staff AND chuyenMon='DIEU_DUONG' AND dangLamViec=1) THROW 51000,'A_STAFF',1;
 SELECT @patient=d.maBenhNhan,@state=y.trangThai,@stock=y.coTieuHaoKho,@admissionState=d.trangThai FROM dbo.YLenh y JOIN dbo.ToDieuTri t ON t.maTo=y.maTo JOIN dbo.DotDieuTri d ON d.maDotDieuTri=t.maDotDieuTri WHERE y.maYLenh=@id;
 IF @patient IS NULL THROW 51000,'A_MISSING',1;
 IF @patient<>@patientCheck THROW 51000,'A_PATIENT',1;
 SELECT @rev=ISNULL(MAX(maNhatKy),0) FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='YLenh' AND maDoiTuong=@id;
 IF @rev<>CONVERT(bigint,@revision) THROW 51000,'A_STALE',1;
 IF @state NOT IN('CHO_THUC_HIEN','DANG_THUC_HIEN') OR @admissionState NOT IN('DANG_DIEU_TRI','CHO_XUAT_VIEN') THROW 51000,'A_STATE',1;

 INSERT dbo.LanThucHienYLenh(maLan,maYLenh,lanThu,thoiDiemKeHoach,thoiDiemThucHien,maNhanVienThucHien,ketQuaThucHien)
 SELECT @execution,@id,ISNULL((SELECT MAX(lanThu) FROM dbo.LanThucHienYLenh WHERE maYLenh=@id),0)+1,thoiDiemBatDau,SYSDATETIME(),@staff,@note FROM dbo.YLenh WHERE maYLenh=@id;
 ${careStockSql}
 UPDATE dbo.YLenh SET trangThai='DA_HOAN_TAT',thoiDiemKetThuc=SYSDATETIME() WHERE maYLenh=@id;
 INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,maNguoiThucHien,ketQua,duLieuSau) VALUES('YLenh',@id,'THUC_HIEN','NHAN_VIEN',@staff,'THANH_CONG',@checks);
 SET @result=N'{}';`,{id:data.id,staff:data.staffId,patientCheck:data.patientCheck,revision:data.revision,execution:uid('TH-'),voucher:uid('XK-'),warehouse:data.warehouse||null,note:string(data.note),checks:JSON.stringify(Object.fromEntries(['patient','medicine','dose','route','time'].map(k=>[k,data['check_'+k]])))}).catch(e=>{if(e.message.includes('A_UNIT'))fail(409,'Đơn vị kế hoạch chưa khớp đơn vị cơ sở. Cần xác minh quy đổi trước khi xuất thuốc.');if(e.message.includes('A_STOCK'))fail(409,'Kho không khả dụng hoặc thiếu lô còn hạn. Chưa thực hiện y lệnh và chưa trừ tồn.');throw e;});
 return (await ancillaryState()).rounds.find(r=>r.id===data.id);
}

export async function saveVitals(data){
 if(!data||!['admin','nurse'].includes(data.role))fail(403,'Chỉ điều dưỡng được ghi sinh hiệu tại bàn chăm sóc.');
 if(!string(data.episodeId,20)||!string(data.patient,20)||!string(data.staffId,20))fail(400,'Chọn hồ sơ, người bệnh và nhân viên thực hiện.');
 const values={};for(const k of ['pulse','temperature','spo2','height','weight']){const n=Number(data[k]);const max=k==='spo2'?100:k==='temperature'?45:k==='height'?250:k==='pulse'?300:9999.9;if(!Number.isFinite(n)||n<=0||n>max||(k==='pulse'&&!Number.isInteger(n)))fail(400,'Sinh hiệu không hợp lệ.');values[k]=n;}
 if(!/^\d{1,3}\/\d{1,3}$/.test(data.pressure||''))fail(400,'Huyết áp phải có dạng tâm thu/tâm trương.');
 const [sys,dia]=data.pressure.split('/').map(Number);if(!sys||!dia)fail(400,'Huyết áp không hợp lệ.');
 const time=new Date(data.time);if(!data.time||!Number.isFinite(time.getTime()))fail(400,'Thời điểm đo không hợp lệ.');
 const id=data.id||uid('SH-');
 await run(`
 DECLARE @sourceEpisode varchar(20)=@visit;
 IF EXISTS(SELECT 1 FROM dbo.DotDieuTri WHERE maDotDieuTri=@visit AND maBenhNhan=@patient AND trangThai IN('DANG_DIEU_TRI','CHO_XUAT_VIEN'))
 SELECT @visit=maLuotKham FROM dbo.DotDieuTri WHERE maDotDieuTri=@visit;
 IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE maNhanVien=@staff AND chuyenMon='DIEU_DUONG' AND dangLamViec=1) THROW 51000,'A_STAFF',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.LuotKham WHERE maLuotKham=@visit AND maBenhNhan=@patient) THROW 51000,'A_PATIENT',1;
 IF @sourceEpisode=@visit AND EXISTS(SELECT 1 FROM dbo.LuotKham WHERE maLuotKham=@visit AND trangThai IN('DA_HUY','HOAN_TAT_KHAM')) THROW 51000,'A_STATE',1;
 IF @editing='1' AND NOT EXISTS(SELECT 1 FROM dbo.PhieuSinhHieu WHERE maPhieu=@id AND maLuotKham=@visit AND maNhanVien=@staff) THROW 51000,'A_STATE',1;
 IF @editing='1' UPDATE dbo.PhieuSinhHieu SET thoiDiemDo=CONVERT(datetime2,@time),mach=CONVERT(int,@pulse),nhietDo=CONVERT(decimal(4,1),@temperature),huyetApTamThu=CONVERT(int,@sys),huyetApTamTruong=CONVERT(int,@dia),spo2=CONVERT(decimal(4,1),@spo2),chieuCao=CONVERT(decimal(5,1),@height),canNang=CONVERT(decimal(5,1),@weight) WHERE maPhieu=@id;
 ELSE INSERT dbo.PhieuSinhHieu(maPhieu,maLuotKham,maNhanVien,thoiDiemDo,mach,nhietDo,huyetApTamThu,huyetApTamTruong,spo2,chieuCao,canNang)
 VALUES(@id,@visit,@staff,CONVERT(datetime2,@time),CONVERT(int,@pulse),CONVERT(decimal(4,1),@temperature),CONVERT(int,@sys),CONVERT(int,@dia),CONVERT(decimal(4,1),@spo2),CONVERT(decimal(5,1),@height),CONVERT(decimal(5,1),@weight));
 INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,maNguoiThucHien,ketQua,duLieuSau) VALUES('SinhHieu',@id,'LUU','NHAN_VIEN',@staff,'THANH_CONG',@snapshot);SET @result=N'{}';`,{...values,id,visit:data.episodeId,patient:data.patient,staff:data.staffId,sys,dia,time:data.time.length===16?data.time+':00':data.time,editing:data.id?'1':'0',snapshot:JSON.stringify({episodeId:data.episodeId})});
 return (await ancillaryState()).vitals.find(v=>v.id===id);
}

export async function createLab(data){
 if(!data||!['admin','doctor'].includes(data.role))fail(403,'Chỉ bác sĩ được lập chỉ định CLS.');
 if(!string(data.episodeId,20)||!string(data.patient,20)||!string(data.staffId,20)||!string(data.diagnosis)||!Array.isArray(data.services)||!data.services.length||data.services.length>30||new Set(data.services).size!==data.services.length)fail(400,'Điền chẩn đoán và chọn dịch vụ.');
 await run(`
 DECLARE @visitId varchar(20),@admissionId varchar(20);
 IF EXISTS(SELECT 1 FROM dbo.DotDieuTri WHERE maDotDieuTri=@visit AND maBenhNhan=@patient AND trangThai IN('DANG_DIEU_TRI','CHO_XUAT_VIEN')) SET @admissionId=@visit;
 ELSE IF EXISTS(SELECT 1 FROM dbo.LuotKham WHERE maLuotKham=@visit AND maBenhNhan=@patient) SET @visitId=@visit;
 IF @admissionId IS NULL AND @visitId IS NULL THROW 51000,'A_PATIENT',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE maNhanVien=@staff AND chuyenMon='BAC_SI' AND dangLamViec=1) THROW 51000,'A_STAFF',1;
 IF @visitId IS NOT NULL AND (EXISTS(SELECT 1 FROM dbo.HoSoKham WHERE maLuotKham=@visitId AND trangThai<>'DANG_KHAM') OR EXISTS(SELECT 1 FROM dbo.LuotKham WHERE maLuotKham=@visitId AND trangThai IN('DA_HUY','HOAN_TAT_KHAM'))) THROW 51000,'A_STATE',1;
 IF EXISTS(SELECT 1 FROM OPENJSON(@services) s WHERE NOT EXISTS(SELECT 1 FROM dbo.DichVuKyThuat WHERE maDichVu=s.value AND dangHoatDong=1)) THROW 51000,'A_MISSING',1;
 IF EXISTS(SELECT 1 FROM dbo.ChiTietChiDinh ct JOIN dbo.ChiDinhCLS c ON c.maChiDinh=ct.maChiDinh JOIN OPENJSON(@services) s ON s.value=ct.maDichVu WHERE (c.maLuotKham=@visitId OR c.maDotDieuTri=@admissionId) AND ct.trangThai<>'DA_HUY') THROW 51000,'A_DUPLICATE',1;
 INSERT dbo.ChiDinhCLS(maChiDinh,maLuotKham,maDotDieuTri,maBacSiChiDinh,chanDoanLamSang,loaiUuTien) VALUES(@id,@visitId,@admissionId,@staff,@diagnosis,@priority);
 INSERT dbo.ChiTietChiDinh(maChiTiet,maChiDinh,maDichVu,donGiaApDung)
 SELECT 'CT-'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),16),@id,d.maDichVu,d.donGia FROM dbo.DichVuKyThuat d JOIN OPENJSON(@services) s ON s.value=d.maDichVu;
 SET @result=N'{}';`,{id:uid('CD-'),visit:data.episodeId,patient:data.patient,staff:data.staffId,diagnosis:data.diagnosis,priority:data.priority==='Khẩn cấp'?'CAP_CUU':'THUONG',services:JSON.stringify(data.services)});
 return (await ancillaryState()).labs.filter(l=>l.episodeId===data.episodeId);
}

export async function labAction(data){
 if(!data||!['admin','technician'].includes(data.role))fail(403,'Chỉ kỹ thuật viên CLS được xử lý kết quả.');
 if(data.role==='admin'&&(!data.staffId||data.staffId==='admin'))data.staffId='NV-KTV01';
 if(!['accept','save','publish'].includes(data.action)||!Number.isSafeInteger(data.revision)||!string(data.id,20)||!string(data.staffId,20))fail(400,'Thao tác hoặc phiên bản phiếu không hợp lệ.');
 let snapshot=null;
 if(data.action==='save'){
  if(!Array.isArray(data.rows)||!data.rows.length||data.rows.length>100||data.rows.some(r=>!string(r.name,100)||!string(r.value,100)||typeof r.unit!=='string'||r.unit.length>30||typeof r.reference!=='string'||r.reference.length>100)||!string(data.conclusion)||!['Có','Không'].includes(data.critical))fail(400,'Nhập chỉ số, kết quả, đơn vị, kết luận hợp lệ.');
  snapshot=JSON.stringify({rows:data.rows,result:data.rows.map(r=>r.name+': '+r.value+' '+r.unit).join('; '),conclusion:data.conclusion,critical:data.critical});
 }
 await run(`
 DECLARE @state varchar(30),@header varchar(20),@resultId varchar(20),@resultState varchar(20),@kind varchar(20),@rev bigint=0;
 IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE maNhanVien=@staff AND chuyenMon='KY_THUAT_VIEN' AND dangLamViec=1) THROW 51000,'A_STAFF',1;
 SELECT @state=ct.trangThai,@header=ct.maChiDinh,@kind=d.loaiKetQua FROM dbo.ChiTietChiDinh ct JOIN dbo.DichVuKyThuat d ON d.maDichVu=ct.maDichVu WHERE ct.maChiTiet=@id;
 IF @state IS NULL THROW 51000,'A_MISSING',1;
 SELECT @rev=ISNULL(MAX(maNhatKy),0) FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='CLS' AND maDoiTuong=@id;
 IF @rev<>CONVERT(bigint,@revision) THROW 51000,'A_STALE',1;
 SELECT TOP 1 @resultId=maKetQua,@resultState=trangThai FROM dbo.KetQuaCLS WHERE maChiTiet=@id AND laBanHienHanh=1 ORDER BY phienBan DESC;
 IF @state='DA_HUY' OR @resultState='DA_DUYET' THROW 51000,'A_STATE',1;
 IF @action='accept'
 BEGIN
  IF @state<>'CHO_THUC_HIEN' THROW 51000,'A_STATE',1;
  UPDATE dbo.ChiTietChiDinh SET trangThai='DANG_THUC_HIEN' WHERE maChiTiet=@id;
  UPDATE dbo.ChiDinhCLS SET trangThai='DANG_THUC_HIEN' WHERE maChiDinh=@header;
 END
 IF @action='save'
 BEGIN
  IF @state<>'DANG_THUC_HIEN' THROW 51000,'A_STATE',1;
  IF @resultId IS NULL
  BEGIN SET @resultId=@newResult;
   INSERT dbo.KetQuaCLS(maKetQua,maChiTiet,loaiKetQua,maKyThuatVien) VALUES(@resultId,@id,@kind,@staff);
  END
  ELSE UPDATE dbo.KetQuaCLS SET phienBan=phienBan+1,maKyThuatVien=@staff WHERE maKetQua=@resultId;
  UPDATE dbo.KetQuaCLS SET ghiChuChuyenMon=JSON_VALUE(@snapshot,'$.conclusion') WHERE maKetQua=@resultId;
  IF @kind='XET_NGHIEM'
  BEGIN
   IF NOT EXISTS(SELECT 1 FROM dbo.KetQuaXetNghiem WHERE maKetQua=@resultId) INSERT dbo.KetQuaXetNghiem(maKetQua,coCanhBaoNguyKich) VALUES(@resultId,CASE WHEN JSON_VALUE(@snapshot,'$.critical')=N'Có' THEN 1 ELSE 0 END);
   UPDATE dbo.KetQuaXetNghiem SET coCanhBaoNguyKich=CASE WHEN JSON_VALUE(@snapshot,'$.critical')=N'Có' THEN 1 ELSE 0 END WHERE maKetQua=@resultId;
   DELETE dbo.ChiSoXetNghiem WHERE maKetQua=@resultId;
   INSERT dbo.ChiSoXetNghiem(maChiSo,maKetQua,maLoaiChiSo,tenChiSo,giaTriDo,donViDo,khoangThamChieu)
   SELECT 'CS-'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),16),@resultId,'NHAP_TAY',name,value,unit,reference FROM OPENJSON(@snapshot,'$.rows') WITH(name nvarchar(100),value nvarchar(100),unit nvarchar(30),reference nvarchar(100));
  END
  ELSE
  BEGIN
   IF NOT EXISTS(SELECT 1 FROM dbo.KetQuaMoTa WHERE maKetQua=@resultId) INSERT dbo.KetQuaMoTa(maKetQua,vungKhaoSat,moTaHinhAnh,ketLuan) VALUES(@resultId,N'Nhập tay',JSON_VALUE(@snapshot,'$.result'),JSON_VALUE(@snapshot,'$.conclusion'));
   ELSE UPDATE dbo.KetQuaMoTa SET moTaHinhAnh=JSON_VALUE(@snapshot,'$.result'),ketLuan=JSON_VALUE(@snapshot,'$.conclusion') WHERE maKetQua=@resultId;
  END
 END
 IF @action='publish'
 BEGIN
  IF @resultId IS NULL OR @resultState<>'CHO_DUYET' THROW 51000,'A_STATE',1;
  SELECT TOP 1 @snapshot=duLieuSau FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='CLS' AND maDoiTuong=@id AND ISJSON(duLieuSau)=1 ORDER BY maNhatKy DESC;
  IF @snapshot IS NULL THROW 51000,'A_STATE',1;
  UPDATE dbo.KetQuaCLS SET trangThai='DA_DUYET',thoiDiemDuyet=SYSDATETIME() WHERE maKetQua=@resultId;
  UPDATE dbo.ChiTietChiDinh SET trangThai='CO_KET_QUA' WHERE maChiTiet=@id;
  IF NOT EXISTS(SELECT 1 FROM dbo.ChiTietChiDinh WHERE maChiDinh=@header AND trangThai NOT IN('CO_KET_QUA','DA_HUY')) UPDATE dbo.ChiDinhCLS SET trangThai='HOAN_TAT' WHERE maChiDinh=@header;
 END
 INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,maNguoiThucHien,ketQua,duLieuSau)
 VALUES('CLS',@id,@action,'NHAN_VIEN',@staff,'THANH_CONG',@snapshot);SET @result=N'{}';`,{id:data.id,staff:data.staffId,revision:data.revision,action:data.action,snapshot,newResult:uid('KQ-')});
 return (await ancillaryState()).labs.find(l=>l.id===data.id);
}
