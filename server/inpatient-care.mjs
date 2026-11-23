import {randomUUID,createHash} from 'node:crypto';
import {querySql} from './admin-store.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const uid=p=>p+randomUUID().replaceAll('-','').slice(0,16);
export async function dischargeCase(data){
 if(!data.admissionId||!['admin','doctor'].includes(data.role))fail(403,'Chỉ bác sĩ được xác nhận ra viện.');
 try{return JSON.parse(await querySql(`SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY BEGIN TRAN;
  DECLARE @l int,@state varchar(30);EXEC @l=sys.sp_getapplock @Resource=N'MediCareAncillary',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @l<0 THROW 51000,'C_STATE',1;
  SELECT @state=trangThai FROM dbo.DotDieuTri WITH(UPDLOCK,HOLDLOCK) WHERE maDotDieuTri=@id;
  IF @state IS NULL THROW 51000,'C_STATE',1;
  IF @state<>'DA_XUAT_VIEN' BEGIN
   IF @state NOT IN('DANG_DIEU_TRI','CHO_XUAT_VIEN') THROW 51000,'C_STATE',1;
   IF EXISTS(SELECT 1 FROM dbo.YLenh y JOIN dbo.ToDieuTri t ON t.maTo=y.maTo WHERE t.maDotDieuTri=@id AND y.trangThai IN('CHO_THUC_HIEN','DANG_THUC_HIEN')) THROW 51000,'C_STATE',1;
   IF EXISTS(SELECT 1 FROM dbo.QuyetToan WHERE maDotDieuTri=@id AND laBanHienHanh=1 AND trangThai<>'DA_QUYET_TOAN') THROW 51000,'C_STATE',1;
   UPDATE g SET trangThaiHienTai='DANG_VE_SINH' FROM dbo.GiuongBenh g JOIN dbo.PhanGiuong p ON p.maGiuong=g.maGiuong WHERE p.maDotDieuTri=@id AND p.trangThai='DANG_SU_DUNG' AND p.denThoiDiem IS NULL;
   UPDATE dbo.PhanGiuong SET denThoiDiem=SYSDATETIME(),trangThai='DA_KET_THUC',lyDoKetThuc=N'Xác nhận ra viện' WHERE maDotDieuTri=@id AND trangThai='DANG_SU_DUNG';
   UPDATE dbo.DotDieuTri SET trangThai='DA_XUAT_VIEN',thoiDiemRaVien=SYSDATETIME(),thoiDiemDongDot=SYSDATETIME() WHERE maDotDieuTri=@id;
   INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,maNguoiThucHien,ketQua) VALUES('DotDieuTri',@id,'DISCHARGE','NHAN_VIEN',@staff,'THANH_CONG');
  END
  COMMIT;SELECT @id admissionId,'DANG_VE_SINH' bedStatus FOR JSON PATH,WITHOUT_ARRAY_WRAPPER;
  END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH`,{id:data.admissionId,staff:data.staffId}));}
 catch(e){if(e.message.includes('C_STATE'))fail(409,'Đợt điều trị không hợp lệ, còn y lệnh chưa xử lý hoặc chưa hoàn tất quyết toán.');throw e;}
}
export async function inpatientCare(data){
 if(!['admin','doctor'].includes(data.role))fail(403,'Chỉ bác sĩ phụ trách được lập tờ điều trị và y lệnh.');
 if(!data.episodeId||!data.staffId||!/^[-a-zA-Z0-9]{16,80}$/.test(data.requestId||''))fail(400,'Thiếu hồ sơ hoặc mã thao tác.');
 const p={staff:data.staffId,episode:data.episodeId,id:data.id||uid(data.action==='order'?'YL-':'TO-'),key:data.requestId,hash:createHash('sha256').update(JSON.stringify(data)).digest('hex'),action:data.action,revision:String(data.revision||0),note:JSON.stringify(data.note||{}),symptoms:data.note?.symptoms||'',plan:data.note?.plan||'',lock:data.lock?'1':'0',reason:data.reason||''};
 let sql='';
 if(data.action==='sheet'){
  const limits={pulse:[1,250],temperature:[30,45],spo2:[1,100],height:[20,250],weight:[1,500]};
  for(const [key,value] of Object.entries(data.note?.vitals||{})){if(value===''||value==null)continue;if(key==='pressure'){if(!/^\d{2,3}\/\d{2,3}$/.test(value))fail(400,'Huyết áp phải có dạng tâm thu/tâm trương.');}else if(limits[key]&&(!Number.isFinite(Number(value))||Number(value)<limits[key][0]||Number(value)>limits[key][1]))fail(400,'Chỉ số sinh hiệu ngoài giới hạn hợp lệ.');}

  if(!p.symptoms.trim()||p.symptoms.length>20000||p.plan.length>20000||(data.lock&&!data.note?.diagnosis?.trim()))fail(400,'Nhập diễn biến bệnh và chẩn đoán trước khi khóa tờ điều trị.');
  sql=`IF EXISTS(SELECT 1 FROM dbo.ToDieuTri WHERE maTo=@id AND (maDotDieuTri<>@episode OR trangThai='DA_KHOA')) THROW 51000,'C_STATE',1;
   DECLARE @actual bigint=ISNULL((SELECT MAX(maNhatKy) FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='CareSheet' AND maDoiTuong=@id),0);
   IF @actual<>TRY_CONVERT(bigint,@revision) THROW 51000,'C_STALE',1;
   IF EXISTS(SELECT 1 FROM dbo.ToDieuTri WHERE maTo=@id) UPDATE dbo.ToDieuTri SET dienBienBenh=@symptoms,yLenhChung=@plan,trangThai=CASE WHEN @lock='1' THEN 'DA_KHOA' ELSE 'CHO_DUYET' END WHERE maTo=@id;
   ELSE INSERT dbo.ToDieuTri(maTo,maDotDieuTri,soThuTuTo,ngayDieuTri,dienBienBenh,yLenhChung,maBacSi,trangThai) SELECT @id,@episode,ISNULL(MAX(soThuTuTo),0)+1,CAST(SYSDATETIME() AS date),@symptoms,@plan,@staff,CASE WHEN @lock='1' THEN 'DA_KHOA' ELSE 'CHO_DUYET' END FROM dbo.ToDieuTri WHERE maDotDieuTri=@episode;
   INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,maNguoiThucHien,ketQua,duLieuSau) VALUES('CareSheet',@id,'SAVE','NHAN_VIEN',@staff,'THANH_CONG',@note);`;
 }else if(data.action==='reopen'){
  if(!p.reason.trim()||p.reason.length>500)fail(400,'Nhập lý do đính chính tối đa 500 ký tự.');
  sql=`IF NOT EXISTS(SELECT 1 FROM dbo.ToDieuTri WHERE maTo=@id AND maDotDieuTri=@episode AND trangThai='DA_KHOA') THROW 51000,'C_STATE',1;
   IF ISNULL((SELECT MAX(maNhatKy) FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='CareSheet' AND maDoiTuong=@id),0)<>TRY_CONVERT(bigint,@revision) THROW 51000,'C_STALE',1;
   UPDATE dbo.ToDieuTri SET trangThai='CHO_DUYET' WHERE maTo=@id;
   DECLARE @old nvarchar(max)=(SELECT TOP 1 duLieuSau FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='CareSheet' AND maDoiTuong=@id ORDER BY maNhatKy DESC);
   INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,maNguoiThucHien,ketQua,lyDo,duLieuSau) VALUES('CareSheet',@id,'REOPEN','NHAN_VIEN',@staff,'THANH_CONG',@reason,COALESCE(@old,N'{}'));`;
 }else if(data.action==='order'){
  const kinds={'Chăm sóc':'CHAM_SOC','Dùng thuốc':'THUOC','Theo dõi sinh hiệu':'CHAM_SOC','Thủ thuật':'KHAC'};
  const o=data.order||{};if(!kinds[o.kind]||!o.dose?.trim()||o.dose.length>500||!Number.isFinite(Date.parse(o.scheduled||'')))fail(400,'Kiểm tra loại, thời gian và nội dung y lệnh.');
  if(o.kind==='Dùng thuốc'&&(!o.medicine||!Number.isFinite(Number(o.quantity))||Number(o.quantity)<=0))fail(400,'Chọn thuốc và số lượng hợp lệ.');
  Object.assign(p,{sheet:data.sheetId,kind:kinds[o.kind],content:o.dose,scheduled:o.scheduled.length===16?o.scheduled+':00':o.scheduled,medicine:o.kind==='Dùng thuốc'?o.medicine:null,quantity:o.kind==='Dùng thuốc'?String(o.quantity):null});
  sql=`IF NOT EXISTS(SELECT 1 FROM dbo.ToDieuTri WHERE maTo=@sheet AND maDotDieuTri=@episode AND trangThai<>'DA_KHOA') THROW 51000,'C_STATE',1;
   IF @medicine IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Thuoc t JOIN dbo.HangHoaYTe h ON h.maHang=t.maHang WHERE h.maHang=@medicine AND h.dangKinhDoanh=1) THROW 51000,'C_STATE',1;
   INSERT dbo.YLenh(maYLenh,maTo,loaiYLenh,noiDungYLenh,maHang,coTieuHaoKho,soLuongKeHoach,donViKeHoach,thoiDiemBatDau,maBacSiRaYLenh,trangThai)
   SELECT @id,@sheet,@kind,@content,@medicine,CASE WHEN @medicine IS NULL THEN 0 ELSE 1 END,TRY_CONVERT(decimal(18,4),@quantity),(SELECT donViCoSo FROM dbo.HangHoaYTe WHERE maHang=@medicine),CONVERT(datetime2,@scheduled,126),@staff,'CHO_THUC_HIEN';`;
 }else fail(400,'Thao tác điều trị không hợp lệ.');
 try{return JSON.parse(await querySql(`SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY BEGIN TRAN;
  DECLARE @l int,@previous nvarchar(max),@fingerprint nvarchar(max),@result nvarchar(max);
  EXEC @l=sys.sp_getapplock @Resource=N'MediCareAncillary',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @l<0 THROW 51000,'C_STATE',1;
  SELECT TOP 1 @previous=duLieuSau,@fingerprint=duLieuTruoc FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='CareAction' AND maTuongQuan=@key;
  IF @previous IS NOT NULL BEGIN IF @fingerprint<>@hash THROW 51000,'C_STALE',1;COMMIT;SELECT @previous;RETURN;END
  IF NOT EXISTS(SELECT 1 FROM dbo.DotDieuTri d JOIN dbo.NhanVien n ON n.maNhanVien=@staff WHERE d.maDotDieuTri=@episode AND d.maBacSiDieuTriChinh=@staff AND d.trangThai='DANG_DIEU_TRI' AND n.chuyenMon='BAC_SI' AND n.dangLamViec=1) THROW 51000,'C_SCOPE',1;
  ${sql}
  SET @result=(SELECT @id id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
  INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,maNguoiThucHien,ketQua,maTuongQuan,duLieuTruoc,duLieuSau) VALUES('CareAction',@id,@action,'NHAN_VIEN',@staff,'THANH_CONG',@key,@hash,@result);
  COMMIT;SELECT @result;END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH`,p));}
 catch(e){if(e.message.includes('C_SCOPE'))fail(403,'Đợt điều trị không thuộc bác sĩ phụ trách hoặc đã kết thúc.');if(/C_STATE|C_STALE/.test(e.message))fail(409,'Tờ điều trị đã thay đổi, bị khóa hoặc mã thao tác đã được sử dụng.');throw e;}
}
