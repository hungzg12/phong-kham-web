import {randomUUID,createHash} from 'node:crypto';
import {querySql} from './admin-store.mjs';
const uid=p=>p+randomUUID().replaceAll('-','').slice(0,16);
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const text=(v,max=500)=>typeof v==='string'&&v.trim().length<=max?v.trim():'';
const number=(v,min=0)=>{const n=Number(v);if(v==null||v===''||!Number.isSafeInteger(n)||n<min||n>1e9)fail(400,'Số lượng hoặc đơn giá không hợp lệ.');return n;};
const json=async(sql,p={})=>JSON.parse(await querySql(`SELECT (${sql} FOR JSON PATH)`,p)||'[]');
export async function pharmacyState(){
 const prescriptions=await json(`SELECT d.maDon id,COALESCE(l.maBenhNhan,a.maBenhNhan) patient,COALESCE(d.maLuotKham,d.maDotDieuTri) episodeId,d.maBacSiKe doctor,d.chanDoan diagnosis,d.loiDan advice,
 CASE WHEN d.trangThaiCapPhat='DA_HUY' THEN N'Đã hủy' WHEN d.trangThaiCapPhat='DA_CAP_DU' THEN N'Đã cấp phát' WHEN d.thoiDiemDuyet IS NULL THEN N'Nháp' ELSE N'Đã xác nhận' END status,
 CONVERT(char(10),d.thoiDiemKe,23) date,
 JSON_QUERY((SELECT c.maChiTietDon id,c.maHang medicine,c.soLuongKe quantity,c.soLuongDaCap dispensed,c.donViKe unit,c.cachDung dose,c.soNgayDung days,c.donGiaKe price,(c.soLuongKe-c.soLuongDaCap)*ISNULL(q.heSoQuyDoi,1) baseQuantity FROM dbo.ChiTietDonThuoc c LEFT JOIN dbo.QuyDoiDonVi q ON q.maQuyDoi=c.maQuyDoiApDung WHERE c.maDon=d.maDon AND c.trangThai<>'DA_HUY' FOR JSON PATH)) lines,
 JSON_QUERY((SELECT k.maChiTietKho sourceLine,t.maLoTon lotId,h.maHang medicineId,t.maKho warehouseId,h.soLoNhaSanXuat lot,CONVERT(char(10),h.hanSuDung,23) expiry,k.soLuongCoSo quantity,k.soLuongDaHoan returned FROM dbo.ChiTietPhieuKho k JOIN dbo.LoTonKho t ON t.maLoTon=k.maLoTon JOIN dbo.LoHang h ON h.maLoHang=t.maLoHang WHERE k.maChiTietDonNguon IN(SELECT maChiTietDon FROM dbo.ChiTietDonThuoc WHERE maDon=d.maDon) FOR JSON PATH)) allocations
 FROM dbo.DonThuoc d LEFT JOIN dbo.LuotKham l ON l.maLuotKham=d.maLuotKham LEFT JOIN dbo.DotDieuTri a ON a.maDotDieuTri=d.maDotDieuTri`);
 const warehouses=await json(`SELECT k.maKho id,k.tenKho name,k.viTri location,CASE k.loaiKho WHEN 'KHO_TONG' THEN N'Kho tổng' WHEN 'KHO_LE_NGOAI_TRU' THEN N'Kho lẻ ngoại trú' WHEN 'KHO_NOI_TRU' THEN N'Kho nội trú' ELSE N'Tủ trực khoa' END kind,CASE k.dangHoatDong WHEN 1 THEN N'Đang hoạt động' ELSE N'Tạm ngưng' END status,k.maKiemKeDangMo countId,JSON_VALUE(a.duLieuSau,'$.manager') manager FROM dbo.KhoDuoc k OUTER APPLY(SELECT TOP 1 duLieuSau FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='PharmacyDraft' AND maDoiTuong=k.maKho ORDER BY maNhatKy DESC) a`);
 const optionalColumns=await json("SELECT name FROM sys.columns WHERE object_id=OBJECT_ID('dbo.LoHang') AND name IN('hangSanXuat','nuocSanXuat')");
 const hasColumn=name=>optionalColumns.some(c=>c.name===name);
 const inventory=await json(`SELECT t.maLoTon id,t.maKho warehouseId,h.maHang medicineId,h.soLoNhaSanXuat lot,CONVERT(char(10),h.hanSuDung,23) expiry,t.soLuongKhaDung qty,t.soLuongTon physicalQty,t.trangThaiKhoa locked,t.viTriDayKe shelfLocation,${hasColumn('hangSanXuat')?'h.hangSanXuat':'NULL'} manufacturer,${hasColumn('nuocSanXuat')?'h.nuocSanXuat':'NULL'} country,h.donGiaNhap unitPrice,r.hoatChat activeIngredient FROM dbo.LoTonKho t JOIN dbo.LoHang h ON h.maLoHang=t.maLoHang LEFT JOIN dbo.Thuoc r ON r.maHang=h.maHang`);
 const stock=await json(`SELECT h.maHang id,h.tenHang name,h.loaiHang kind,h.donViCoSo unit,h.donGiaXuatCoSo price,h.giaBHYT insurancePrice,ISNULL(SUM(CASE WHEN t.trangThaiKhoa=0 AND b.hanSuDung>=CONVERT(date,SYSDATETIME()) AND k.dangHoatDong=1 AND k.maKiemKeDangMo IS NULL THEN t.soLuongKhaDung ELSE 0 END),0) qty FROM dbo.HangHoaYTe h LEFT JOIN dbo.LoHang b ON b.maHang=h.maHang LEFT JOIN dbo.LoTonKho t ON t.maLoHang=b.maLoHang LEFT JOIN dbo.KhoDuoc k ON k.maKho=t.maKho WHERE h.dangKinhDoanh=1 GROUP BY h.maHang,h.tenHang,h.loaiHang,h.donViCoSo,h.donGiaXuatCoSo,h.giaBHYT`);
 const ledger=await json(`SELECT TOP 100 s.maSoKho id,CONVERT(varchar(19),s.thoiDiemGhiSo,126) time,h.maHang medicineId,t.maKho warehouseId,h.soLoNhaSanXuat lot,s.bienDong delta,c.maPhieu event FROM dbo.SoKho s JOIN dbo.ChiTietPhieuKho c ON c.maChiTietKho=s.maChiTietKho JOIN dbo.LoTonKho t ON t.maLoTon=s.maLoTon JOIN dbo.LoHang h ON h.maLoHang=t.maLoHang ORDER BY s.thoiDiemGhiSo DESC,s.maSoKho DESC`);
 const movements=await json(`SELECT p.maPhieu id,JSON_VALUE(a.duLieuSau,'$.kind') kind,JSON_VALUE(a.duLieuSau,'$.medicine') medicine,JSON_VALUE(a.duLieuSau,'$.quantity') quantity,JSON_VALUE(a.duLieuSau,'$.price') price,COALESCE(p.maKhoNguon,p.maKhoDich) warehouse,p.maKhoDich destination,JSON_VALUE(a.duLieuSau,'$.lot') lot,JSON_VALUE(a.duLieuSau,'$.expiry') expiry,p.ghiChu reason,CASE WHEN p.trangThai='DA_HUY' THEN N'Đã hủy' WHEN p.trangThai IN('DA_XUAT','DA_NHAP') THEN N'Đã ghi sổ' ELSE N'Chờ duyệt' END status FROM dbo.PhieuKho p CROSS APPLY(SELECT TOP 1 duLieuSau FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='PharmacyDraft' AND maDoiTuong=p.maPhieu ORDER BY maNhatKy DESC) a`);
 const counts=await json(`SELECT k.maKyKiemKe id,k.maKho warehouse,c.maLoTon lotId,h.maHang medicine,c.tonLyThuyet expected,c.tonThucTe actual,c.chenhLech difference,k.ghiChu reason,CASE WHEN k.trangThai='DA_CAN_BANG' THEN N'Đã điều chỉnh' WHEN k.trangThai='DA_HUY' THEN N'Đã hủy' ELSE N'Chờ phê duyệt' END status FROM dbo.KiemKeKho k JOIN dbo.ChiTietKiemKe c ON c.maKyKiemKe=k.maKyKiemKe JOIN dbo.LoTonKho t ON t.maLoTon=c.maLoTon JOIN dbo.LoHang h ON h.maLoHang=t.maLoHang`);
 const units=await json(`SELECT maHang medicine,tenDonViQuyDoi unit,heSoQuyDoi factor FROM dbo.QuyDoiDonVi WHERE tuNgay<=SYSDATETIME() AND (denNgay IS NULL OR denNgay>=SYSDATETIME())`);
 for(const item of stock)item.units=units.filter(u=>u.medicine===item.id);
 return {prescriptions,warehouses,inventory,stock,ledger,movements,counts};
}

// Uses the same application lock as nursing stock consumption, plus row locks.
// The existing demo role/staff fields are validated here, but are not session authentication.
export async function pharmacyAction(d){
 const doctor=['savePrescription','approvePrescription'].includes(d?.action);
 if(!d||!(doctor?['admin','doctor']:['admin','pharmacist']).includes(d.role))fail(403,'Vai trò không được thực hiện thao tác dược này.');
 if(!text(d.staffId,20)||!/^[-a-zA-Z0-9]{16,80}$/.test(d.requestId||''))fail(400,'Thiếu nhân viên hoặc mã thao tác.');
 const p={staff:d.staffId,specialty:doctor?'BAC_SI':'DUOC_SI',key:d.requestId,fingerprint:createHash('sha256').update(JSON.stringify(d)).digest('hex'),id:d.id||uid('DP-'),warehouse:d.warehouse||null,destination:d.destination||null,medicine:d.medicine||null,reason:text(d.reason),voucher:uid('PK-')};
 let sql='';
 const warehouse=`IF NOT EXISTS(SELECT 1 FROM dbo.KhoDuoc WITH(UPDLOCK,HOLDLOCK) WHERE maKho=@warehouse AND dangHoatDong=1 AND maKiemKeDangMo IS NULL) THROW 51000,'P_WAREHOUSE',1;`;
 const auditDraft=`INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,maNguoiThucHien,ketQua,duLieuSau) VALUES('PharmacyDraft',@id,'SAVE','NHAN_VIEN',@staff,'THANH_CONG',@payload);`;
 if(d.action==='savePrescription'){
  if(!text(d.diagnosis)||!Array.isArray(d.lines)||!d.lines.length||d.lines.length>50||new Set(d.lines.map(l=>l.medicine)).size!==d.lines.length)fail(400,'Nhập chẩn đoán và các thuốc khác nhau trong đơn.');
  p.lines=JSON.stringify(d.lines.map(l=>{if(!text(l.medicine,20)||!text(l.dose,100)||!text(l.route,50)||!text(l.frequency,100))fail(400,'Điền đủ thuốc, liều, đường dùng và tần suất.');return {...l,quantity:number(l.quantity,1),days:number(l.days,1),usage:[l.dose,l.route,l.frequency].join(' ')};}));
  if(JSON.parse(p.lines).some(l=>l.usage.length>255))fail(400,'Hướng dẫn dùng thuốc quá dài.');
  Object.assign(p,{patientId:d.patient||d.patientId||null,episode:d.episodeId||d.visitId,diagnosis:d.diagnosis.trim(),advice:text(d.advice)});
  sql=`DECLARE @visit varchar(20),@admission varchar(20),@patient varchar(20),@assigned varchar(20);
  SELECT @visit=maLuotKham,@patient=maBenhNhan FROM dbo.LuotKham WHERE maLuotKham=@episode AND trangThai<>'DA_HUY';
  IF @visit IS NOT NULL SELECT TOP 1 @assigned=pc.maBacSi FROM dbo.PhanCongKham pc JOIN dbo.LuotKham l ON l.maBuong=pc.maBuong AND l.ngayKham=pc.ngayKham WHERE l.maLuotKham=@visit AND pc.caKham=CASE WHEN DATEPART(HOUR,l.thoiDiemCapSo)<12 THEN 'SANG' ELSE 'CHIEU' END;
  ELSE SELECT @admission=maDotDieuTri,@patient=maBenhNhan,@assigned=maBacSiDieuTriChinh FROM dbo.DotDieuTri WHERE maDotDieuTri=@episode AND trangThai IN('DANG_DIEU_TRI','CHO_XUAT_VIEN');
  IF @patient IS NULL OR (@patientId IS NOT NULL AND @patient<>@patientId) THROW 51000,'P_PATIENT',1;
  IF @assigned IS NULL OR @assigned<>@staff THROW 51000,'P_ASSIGNED',1;
  IF @visit IS NOT NULL AND EXISTS(SELECT 1 FROM dbo.HoSoKham WHERE maLuotKham=@visit AND trangThai='DA_KHOA') THROW 51000,'P_STATE',1;
  INSERT dbo.DonThuoc(maDon,maLuotKham,maDotDieuTri,loaiDon,maBacSiKe,chanDoan,loiDan) VALUES(@id,@visit,@admission,CASE WHEN @visit IS NULL THEN 'NOI_TRU' ELSE 'NGOAI_TRU' END,@staff,@diagnosis,@advice);
  IF EXISTS(SELECT 1 FROM OPENJSON(@lines) j LEFT JOIN dbo.Thuoc t ON t.maHang=JSON_VALUE(j.value,'$.medicine') LEFT JOIN dbo.HangHoaYTe h ON h.maHang=t.maHang WHERE t.maHang IS NULL OR h.dangKinhDoanh<>1) THROW 51000,'P_MEDICINE',1;
  IF EXISTS(SELECT 1 FROM OPENJSON(@lines) j JOIN dbo.HangHoaYTe h ON h.maHang=JSON_VALUE(j.value,'$.medicine') WHERE NULLIF(JSON_VALUE(j.value,'$.unit'),'') IS NOT NULL AND JSON_VALUE(j.value,'$.unit')<>h.donViCoSo AND (SELECT COUNT(*) FROM dbo.QuyDoiDonVi q WHERE q.maHang=h.maHang AND q.tenDonViQuyDoi=JSON_VALUE(j.value,'$.unit') AND q.tuNgay<=SYSDATETIME() AND(q.denNgay IS NULL OR q.denNgay>=SYSDATETIME()))<>1) THROW 51000,'P_UNIT',1;
  INSERT dbo.ChiTietDonThuoc(maChiTietDon,maDon,maHang,soLuongKe,donViKe,maQuyDoiApDung,cachDung,soNgayDung,donGiaKe)
  SELECT 'CT-'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),16),@id,h.maHang,CONVERT(decimal(18,4),JSON_VALUE(j.value,'$.quantity')),COALESCE(NULLIF(JSON_VALUE(j.value,'$.unit'),''),h.donViCoSo),q.maQuyDoi,JSON_VALUE(j.value,'$.usage'),CONVERT(int,JSON_VALUE(j.value,'$.days')),h.donGiaXuatCoSo*ISNULL(q.heSoQuyDoi,1)
  FROM OPENJSON(@lines) j JOIN dbo.HangHoaYTe h ON h.maHang=JSON_VALUE(j.value,'$.medicine') OUTER APPLY(SELECT TOP 1 maQuyDoi,heSoQuyDoi FROM dbo.QuyDoiDonVi WHERE maHang=h.maHang AND tenDonViQuyDoi=JSON_VALUE(j.value,'$.unit') AND tenDonViQuyDoi<>h.donViCoSo AND tuNgay<=SYSDATETIME() AND (denNgay IS NULL OR denNgay>=SYSDATETIME())) q;`;
 }else if(d.action==='approvePrescription'){
  sql=`IF NOT EXISTS(SELECT 1 FROM dbo.DonThuoc WHERE maDon=@id AND maBacSiKe=@staff AND thoiDiemDuyet IS NULL AND trangThaiCapPhat='CHUA_CAP') THROW 51000,'P_STATE',1;
  UPDATE dbo.DonThuoc SET maNguoiDuyet=@staff,thoiDiemDuyet=SYSDATETIME() WHERE maDon=@id;`;
 }else if(d.action==='dispense'){
  sql=warehouse+`DECLARE @visit varchar(20),@admission varchar(20),@type varchar(30)=NULL;
  IF NOT EXISTS(SELECT 1 FROM dbo.DonThuoc WITH(UPDLOCK,HOLDLOCK) WHERE maDon=@id AND thoiDiemDuyet IS NOT NULL AND trangThaiCapPhat IN('CHUA_CAP','CAP_MOT_PHAN')) THROW 51000,'P_STATE',1;
  SELECT @visit=maLuotKham,@admission=maDotDieuTri FROM dbo.DonThuoc WHERE maDon=@id;
  IF EXISTS(SELECT 1 FROM dbo.ChiTietDonThuoc c JOIN dbo.DonThuoc d ON d.maDon=c.maDon JOIN dbo.HangHoaYTe h ON h.maHang=c.maHang LEFT JOIN dbo.QuyDoiDonVi q ON q.maQuyDoi=c.maQuyDoiApDung AND q.maHang=c.maHang AND q.tenDonViQuyDoi=c.donViKe AND q.tuNgay<=d.thoiDiemKe AND (q.denNgay IS NULL OR q.denNgay>=d.thoiDiemKe) WHERE c.maDon=@id AND c.trangThai<>'DA_HUY' AND (h.dangKinhDoanh<>1 OR (c.donViKe<>h.donViCoSo AND q.maQuyDoi IS NULL) OR (c.donViKe=h.donViCoSo AND c.maQuyDoiApDung IS NOT NULL))) THROW 51000,'P_UNIT',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.ChiTietDonThuoc WHERE maDon=@id AND trangThai<>'DA_HUY' AND soLuongKe>soLuongDaCap) THROW 51000,'P_STATE',1;
  IF EXISTS(SELECT 1 FROM dbo.ChiTietDonThuoc c LEFT JOIN dbo.QuyDoiDonVi q ON q.maQuyDoi=c.maQuyDoiApDung WHERE c.maDon=@id AND ROUND((c.soLuongKe-c.soLuongDaCap)*ISNULL(q.heSoQuyDoi,1),4)<>(c.soLuongKe-c.soLuongDaCap)*ISNULL(q.heSoQuyDoi,1)) THROW 51000,'P_UNIT',1;
  INSERT dbo.PhieuKho(maPhieu,loaiPhieu,maKhoNguon,maLuotKham,maDotDieuTri,maNguoiLap,trangThai,maNguoiDuyet,thoiDiemDuyet) VALUES(@voucher,'XUAT_DON',@warehouse,@visit,@admission,@staff,'DA_XUAT',@staff,SYSDATETIME());
  DECLARE @rxline varchar(20),@item varchar(20),@needed decimal(18,4),@unit nvarchar(30);
  DECLARE rx CURSOR LOCAL FAST_FORWARD FOR SELECT c.maChiTietDon,c.maHang,(c.soLuongKe-c.soLuongDaCap)*ISNULL(q.heSoQuyDoi,1),h.donViCoSo FROM dbo.ChiTietDonThuoc c JOIN dbo.HangHoaYTe h ON h.maHang=c.maHang LEFT JOIN dbo.QuyDoiDonVi q ON q.maQuyDoi=c.maQuyDoiApDung WHERE c.maDon=@id AND c.trangThai<>'DA_HUY' AND c.soLuongKe>c.soLuongDaCap;
  OPEN rx;FETCH NEXT FROM rx INTO @rxline,@item,@needed,@unit;
  WHILE @@FETCH_STATUS=0 BEGIN
   ${takeStockSql}
   UPDATE dbo.ChiTietDonThuoc SET soLuongDaCap=soLuongKe,trangThai='DA_CAP_DU' WHERE maChiTietDon=@rxline;
   FETCH NEXT FROM rx INTO @rxline,@item,@needed,@unit;
  END CLOSE rx;DEALLOCATE rx;
  UPDATE dbo.DonThuoc SET trangThaiCapPhat='DA_CAP_DU' WHERE maDon=@id;`;
 }else if(d.action==='saveWarehouse'){
  const types={'Kho tổng':'KHO_TONG','Kho lẻ ngoại trú':'KHO_LE_NGOAI_TRU','Kho nội trú':'KHO_NOI_TRU','Tủ trực khoa':'TU_TRUC_KHOA'};
  if(!text(d.name,100)||!types[d.kind]||!text(d.location,100)||!text(d.manager,20))fail(400,'Điền đủ tên, loại kho, người phụ trách và vị trí.');
  Object.assign(p,{name:d.name.trim(),type:types[d.kind],location:d.location.trim(),manager:d.manager,editing:d.id?'1':'0',payload:JSON.stringify(d)});
  sql=`DECLARE @department varchar(20);SELECT @department=maKhoa FROM dbo.NhanVien WHERE maNhanVien=@manager AND dangLamViec=1;
  IF @department IS NULL THROW 51000,'P_STAFF',1;
  IF @editing='1' BEGIN IF NOT EXISTS(SELECT 1 FROM dbo.KhoDuoc WHERE maKho=@id AND maKiemKeDangMo IS NULL) THROW 51000,'P_STATE',1;UPDATE dbo.KhoDuoc SET tenKho=@name,loaiKho=@type,viTri=@location,maKhoa=@department WHERE maKho=@id;END
  ELSE INSERT dbo.KhoDuoc(maKho,tenKho,maKhoa,loaiKho,viTri) VALUES(@id,@name,@department,@type,@location);
  ${auditDraft}`;
 }else if(d.action==='toggleWarehouse'){
  sql=`IF NOT EXISTS(SELECT 1 FROM dbo.KhoDuoc WHERE maKho=@id AND maKiemKeDangMo IS NULL) THROW 51000,'P_STATE',1;UPDATE dbo.KhoDuoc SET dangHoatDong=1-dangHoatDong WHERE maKho=@id;`;
 }else if(['saveMovement','createProduct'].includes(d.action)){
  const types={'Nhập kho':'NHAP_KHO','Hoàn trả':'HOAN_TRA','Xuất kho':'XUAT_HUY','Điều chuyển':'CHUYEN_KHO'};
  if(d.action==='createProduct'){
   p.medicine=d.productId;
   if(!text(d.productId,20)||!text(d.name,150)||!text(d.unit,30)||!['Thuốc','Vật tư y tế'].includes(d.productType))fail(400,'Thông tin mặt hàng không hợp lệ.');
   if(d.productType==='Thuốc'&&['ingredient','strength','route','form'].some(k=>!text(d[k],100)))fail(400,'Điền hoạt chất, hàm lượng, đường dùng và dạng bào chế.');
   Object.assign(p,{productName:d.name,unit:d.unit,ingredient:d.ingredient||null,strength:d.strength||null,route:d.route||null,form:d.form||null,productType:d.productType==='Thuốc'?'THUOC':'VAT_TU'});
  }
  if(!types[d.kind]||!p.reason)fail(400,'Chọn loại phiếu và nhập lý do.');
  Object.assign(p,{quantity:number(d.quantity,1),price:number(d.price),type:types[d.kind],payload:JSON.stringify({...d,medicine:p.medicine,quantity:number(d.quantity,1),price:number(d.price)})});
  if(['Nhập kho','Hoàn trả'].includes(d.kind)&&(!text(d.lot,50)||!/^\d{4}-\d{2}-\d{2}$/.test(d.expiry||'')))fail(400,'Nhập số lô và hạn dùng.');
  if(d.kind==='Điều chuyển'&&(!d.destination||d.destination===d.warehouse))fail(400,'Kho đích phải khác kho nguồn.');
  if(d.kind==='Hoàn trả'&&!text(d.sourceLine,20))fail(400,'Hoàn trả cần mã dòng cấp gốc.');
  p.sourceLine=d.sourceLine||null;
  sql=(d.action==='createProduct'?`IF EXISTS(SELECT 1 FROM dbo.HangHoaYTe WHERE maHang=@medicine) THROW 51000,'P_STATE',1;
  INSERT dbo.HangHoaYTe(maHang,tenHang,loaiHang,donViCoSo,donGiaXuatCoSo) VALUES(@medicine,@productName,@productType,@unit,@price);
  IF @productType='THUOC' INSERT dbo.Thuoc(maHang,hoatChat,hamLuong,duongDung,dangBaoChe) VALUES(@medicine,@ingredient,@strength,@route,@form);
  ELSE INSERT dbo.VatTuYTe(maHang,quyCach) VALUES(@medicine,@unit);`:'')+warehouse+`IF NOT EXISTS(SELECT 1 FROM dbo.HangHoaYTe WHERE maHang=@medicine AND dangKinhDoanh=1) THROW 51000,'P_MEDICINE',1;
  IF @type='HOAN_TRA' AND NOT EXISTS(SELECT 1 FROM dbo.ChiTietPhieuKho c JOIN dbo.PhieuKho p ON p.maPhieu=c.maPhieu JOIN dbo.LoTonKho t ON t.maLoTon=c.maLoTon JOIN dbo.LoHang h ON h.maLoHang=t.maLoHang WHERE c.maChiTietKho=@sourceLine AND p.loaiPhieu='XUAT_DON' AND p.trangThai='DA_XUAT' AND t.maKho=@warehouse AND h.maHang=@medicine AND c.soLuongCoSo-c.soLuongDaHoan>=CONVERT(decimal(18,4),@quantity)) THROW 51000,'P_RETURN',1;
  INSERT dbo.PhieuKho(maPhieu,loaiPhieu,maKhoNguon,maKhoDich,maPhieuGoc,maNguoiLap,ghiChu) VALUES(@id,@type,CASE WHEN @type IN('NHAP_KHO','HOAN_TRA') THEN NULL ELSE @warehouse END,CASE WHEN @type IN('NHAP_KHO','HOAN_TRA') THEN @warehouse WHEN @type='CHUYEN_KHO' THEN @destination END,(SELECT maPhieu FROM dbo.ChiTietPhieuKho WHERE maChiTietKho=@sourceLine),@staff,@reason);${auditDraft}`;
 }else if(d.action==='approveMovement'){
  sql=`DECLARE @payload nvarchar(max),@type varchar(30),@qty decimal(18,4),@cost decimal(18,2),@item varchar(20),@unit nvarchar(30),@lotName varchar(50),@expiry date;
  SELECT @type=loaiPhieu,@warehouse=COALESCE(maKhoNguon,maKhoDich),@destination=maKhoDich FROM dbo.PhieuKho WHERE maPhieu=@id AND trangThai='CHO_DUYET';
  IF @type IS NULL THROW 51000,'P_STATE',1;
  SELECT TOP 1 @payload=duLieuSau FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='PharmacyDraft' AND maDoiTuong=@id ORDER BY maNhatKy DESC;
  IF @payload IS NULL THROW 51000,'P_STATE',1;
  ${warehouse}
  SELECT @item=JSON_VALUE(@payload,'$.medicine'),@qty=JSON_VALUE(@payload,'$.quantity'),@cost=JSON_VALUE(@payload,'$.price'),@lotName=JSON_VALUE(@payload,'$.lot'),@expiry=TRY_CONVERT(date,JSON_VALUE(@payload,'$.expiry'));
  SELECT @unit=donViCoSo FROM dbo.HangHoaYTe WHERE maHang=@item AND dangKinhDoanh=1;
  IF @unit IS NULL THROW 51000,'P_MEDICINE',1;
  SET @voucher=@id;
  IF @type='HOAN_TRA' BEGIN
   DECLARE @original varchar(20)=JSON_VALUE(@payload,'$.sourceLine'),@returnLot varchar(20),@returnBalance decimal(18,4);
   SELECT @returnLot=t.maLoTon,@returnBalance=t.soLuongTon,@cost=h.donGiaNhap FROM dbo.ChiTietPhieuKho c WITH(UPDLOCK,HOLDLOCK) JOIN dbo.PhieuKho p ON p.maPhieu=c.maPhieu JOIN dbo.LoTonKho t WITH(UPDLOCK,HOLDLOCK) ON t.maLoTon=c.maLoTon JOIN dbo.LoHang h ON h.maLoHang=t.maLoHang
   WHERE c.maChiTietKho=@original AND p.loaiPhieu='XUAT_DON' AND p.trangThai='DA_XUAT' AND c.soLuongCoSo-c.soLuongDaHoan>=@qty AND t.maKho=@warehouse AND t.trangThaiKhoa=0 AND h.maHang=@item AND h.soLoNhaSanXuat=@lotName AND h.hanSuDung=@expiry AND h.hanSuDung>=CONVERT(date,SYSDATETIME());
   IF @returnLot IS NULL THROW 51000,'P_RETURN',1;
   UPDATE dbo.ChiTietPhieuKho SET soLuongDaHoan=soLuongDaHoan+@qty WHERE maChiTietKho=@original;
   UPDATE dbo.LoTonKho SET soLuongTon=soLuongTon+@qty,soLuongKhaDung=soLuongKhaDung+@qty WHERE maLoTon=@returnLot;
   INSERT dbo.ChiTietPhieuKho(maChiTietKho,maPhieu,maLoTon,maChiTietGoc,soLuong,donViXuat,soLuongCoSo,donGiaVatLy) VALUES(@newLine,@id,@returnLot,@original,@qty,@unit,@qty,@cost);
   INSERT dbo.SoKho(maSoKho,maChiTietKho,maLoTon,soLuongTruoc,bienDong,soLuongSau) VALUES(@newLedger,@newLine,@returnLot,@returnBalance,@qty,@returnBalance+@qty);
  END ELSE IF @type='NHAP_KHO' BEGIN
   IF @expiry IS NULL OR @expiry<CONVERT(date,SYSDATETIME()) THROW 51000,'P_EXPIRY',1;
   DECLARE @batch varchar(20),@target varchar(20),@before decimal(18,4);
   SELECT TOP 1 @batch=maLoHang FROM dbo.LoHang WHERE maHang=@item AND soLoNhaSanXuat=@lotName AND hanSuDung=@expiry AND donGiaNhap=@cost ORDER BY maLoHang;
   IF @batch IS NULL BEGIN SET @batch=@newBatch;INSERT dbo.LoHang(maLoHang,maHang,soLoNhaSanXuat,ngaySanXuat,hanSuDung,soLuongNhap,donGiaNhap) VALUES(@batch,@item,@lotName,CONVERT(date,SYSDATETIME()),@expiry,@qty,@cost);END
   SELECT TOP 1 @target=maLoTon FROM dbo.LoTonKho WITH(UPDLOCK,HOLDLOCK) WHERE maKho=@warehouse AND maLoHang=@batch;
   IF @target IS NULL BEGIN SET @target=@newStock;INSERT dbo.LoTonKho(maLoTon,maKho,maLoHang) VALUES(@target,@warehouse,@batch);END
   IF EXISTS(SELECT 1 FROM dbo.LoTonKho WHERE maLoTon=@target AND trangThaiKhoa=1) THROW 51000,'P_STOCK',1;
   SELECT @before=soLuongTon FROM dbo.LoTonKho WHERE maLoTon=@target;
   UPDATE dbo.LoTonKho SET soLuongTon=soLuongTon+@qty,soLuongKhaDung=soLuongKhaDung+@qty WHERE maLoTon=@target;
   INSERT dbo.ChiTietPhieuKho(maChiTietKho,maPhieu,maLoTon,soLuong,donViXuat,soLuongCoSo,donGiaVatLy) VALUES(@newLine,@id,@target,@qty,@unit,@qty,@cost);
   INSERT dbo.SoKho(maSoKho,maChiTietKho,maLoTon,soLuongTruoc,bienDong,soLuongSau) VALUES(@newLedger,@newLine,@target,@before,@qty,@before+@qty);
  END ELSE BEGIN
   IF @type='CHUYEN_KHO' AND (@destination=@warehouse OR NOT EXISTS(SELECT 1 FROM dbo.KhoDuoc WITH(UPDLOCK,HOLDLOCK) WHERE maKho=@destination AND dangHoatDong=1 AND maKiemKeDangMo IS NULL)) THROW 51000,'P_WAREHOUSE',1;
   DECLARE @rxline varchar(20)=NULL,@needed decimal(18,4)=@qty;
   ${takeStockSql}
  END
  UPDATE dbo.PhieuKho SET trangThai=CASE WHEN @type IN('NHAP_KHO','HOAN_TRA') THEN 'DA_NHAP' ELSE 'DA_XUAT' END,maNguoiDuyet=@staff,thoiDiemDuyet=SYSDATETIME() WHERE maPhieu=@id;`;
 }else if(d.action==='saveCount'){
  if(!p.reason||p.reason.length>255||!text(d.lotId,20))fail(400,'Chọn lô và nhập lý do tối đa 255 ký tự.');p.actual=number(d.actual);p.lot=d.lotId;
  sql=warehouse+`DECLARE @expected decimal(18,4);
  SELECT @expected=t.soLuongTon FROM dbo.LoTonKho t WITH(UPDLOCK,HOLDLOCK) JOIN dbo.LoHang h ON h.maLoHang=t.maLoHang WHERE t.maLoTon=@lot AND t.maKho=@warehouse AND h.maHang=@medicine AND t.soLuongTon=t.soLuongKhaDung AND t.trangThaiKhoa=0;
  IF @expected IS NULL THROW 51000,'P_STOCK',1;
  INSERT dbo.KiemKeKho(maKyKiemKe,maKho,maNguoiLap,ghiChu) VALUES(@id,@warehouse,@staff,@reason);
  INSERT dbo.ChiTietKiemKe(maKyKiemKe,maLoTon,tonLyThuyet,tonThucTe,lyDoChenhLech) VALUES(@id,@lot,@expected,CONVERT(decimal(18,4),@actual),@reason);
  UPDATE dbo.KhoDuoc SET maKiemKeDangMo=@id WHERE maKho=@warehouse;`;
 }else if(d.action==='approveCount'){
  sql=`DECLARE @lot varchar(20),@before decimal(18,4),@actual decimal(18,4),@unit nvarchar(30),@cost decimal(18,2),@delta decimal(18,4);
  SELECT @warehouse=k.maKho,@lot=c.maLoTon,@before=c.tonLyThuyet,@actual=c.tonThucTe,@unit=h.donViCoSo,@cost=b.donGiaNhap FROM dbo.KiemKeKho k JOIN dbo.ChiTietKiemKe c ON c.maKyKiemKe=k.maKyKiemKe JOIN dbo.LoTonKho t ON t.maLoTon=c.maLoTon JOIN dbo.LoHang b ON b.maLoHang=t.maLoHang JOIN dbo.HangHoaYTe h ON h.maHang=b.maHang WHERE k.maKyKiemKe=@id AND k.trangThai='DANG_KIEM_KE' AND t.soLuongTon=c.tonLyThuyet AND t.soLuongTon=t.soLuongKhaDung;
  IF @lot IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.KhoDuoc WHERE maKho=@warehouse AND maKiemKeDangMo=@id) THROW 51000,'P_STATE',1;
  SET @delta=@actual-@before;
  IF @delta<>0 BEGIN
   INSERT dbo.PhieuKho(maPhieu,loaiPhieu,maKhoNguon,maKhoDich,maKiemKeNguon,maNguoiLap,trangThai,maNguoiDuyet,thoiDiemDuyet) VALUES(@voucher,'XU_LY_KIEM_KE',CASE WHEN @delta<0 THEN @warehouse END,CASE WHEN @delta>0 THEN @warehouse END,@id,@staff,CASE WHEN @delta<0 THEN 'DA_XUAT' ELSE 'DA_NHAP' END,@staff,SYSDATETIME());
   INSERT dbo.ChiTietPhieuKho(maChiTietKho,maPhieu,maLoTon,soLuong,donViXuat,soLuongCoSo,donGiaVatLy) VALUES(@newLine,@voucher,@lot,ABS(@delta),@unit,ABS(@delta),@cost);
   INSERT dbo.SoKho(maSoKho,maChiTietKho,maLoTon,soLuongTruoc,bienDong,soLuongSau) VALUES(@newLedger,@newLine,@lot,@before,@delta,@actual);
  END
  UPDATE dbo.LoTonKho SET soLuongTon=@actual,soLuongKhaDung=@actual WHERE maLoTon=@lot;
  UPDATE dbo.KiemKeKho SET trangThai='DA_CAN_BANG',maNguoiDuyet=@staff,thoiDiemDuyet=SYSDATETIME(),thoiDiemKetThuc=SYSDATETIME() WHERE maKyKiemKe=@id;
  UPDATE dbo.KhoDuoc SET maKiemKeDangMo=NULL WHERE maKho=@warehouse;`;
 }else if(['cancelMovement','cancelCount'].includes(d.action)){
  if(!p.reason)fail(400,'Nhập lý do hủy hoặc từ chối.');
  sql=d.action==='cancelMovement'?`IF NOT EXISTS(SELECT 1 FROM dbo.PhieuKho WHERE maPhieu=@id AND trangThai='CHO_DUYET') THROW 51000,'P_STATE',1;UPDATE dbo.PhieuKho SET trangThai='DA_HUY',ghiChu=@reason WHERE maPhieu=@id;`:`IF NOT EXISTS(SELECT 1 FROM dbo.KiemKeKho WHERE maKyKiemKe=@id AND trangThai='DANG_KIEM_KE') THROW 51000,'P_STATE',1;UPDATE dbo.KiemKeKho SET trangThai='DA_HUY',ghiChu=@reason,thoiDiemKetThuc=SYSDATETIME() WHERE maKyKiemKe=@id;UPDATE dbo.KhoDuoc SET maKiemKeDangMo=NULL WHERE maKiemKeDangMo=@id;`;
 }else fail(400,'Thao tác dược chưa được hỗ trợ.');
 Object.assign(p,{patientId:p.patientId||null,newBatch:uid('LH-'),newStock:uid('LT-'),newLine:uid('CK-'),newLedger:uid('SK-'),action:d.action});
 try{return JSON.parse(await querySql(`SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY BEGIN TRAN;
 DECLARE @lock int,@previous nvarchar(max),@hash nvarchar(100),@result nvarchar(max);
 EXEC @lock=sys.sp_getapplock @Resource=N'MediCareAncillary',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
 IF @lock<0 THROW 51000,'P_BUSY',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE maNhanVien=@staff AND chuyenMon=@specialty AND dangLamViec=1) THROW 51000,'P_STAFF',1;
 SELECT TOP 1 @previous=duLieuSau,@hash=duLieuTruoc FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='Pharmacy' AND maTuongQuan=@key;
 IF @previous IS NOT NULL BEGIN IF @hash<>@fingerprint THROW 51000,'P_KEY',1;COMMIT;SELECT @previous;RETURN;END
 ${sql}
 SET @result=(SELECT @id id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,maNguoiThucHien,ketQua,maTuongQuan,duLieuTruoc,duLieuSau) VALUES('Pharmacy',@id,@action,'NHAN_VIEN',@staff,'THANH_CONG',@key,@fingerprint,@result);
 COMMIT;SELECT @result;END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH`,p));}
 catch(e){for(const [k,s,m]of [['P_STAFF',403,'Nhân viên không đúng chuyên môn hoặc đã ngừng làm việc.'],['P_ASSIGNED',403,'Bác sĩ không thuộc phân công hồ sơ.'],['P_PATIENT',409,'Hồ sơ không khớp bệnh nhân.'],['P_STATE',409,'Chứng từ đã xử lý hoặc không còn cho phép thao tác.'],['P_UNIT',409,'Đơn vị hoặc quy tắc quy đổi không hợp lệ, hết hiệu lực hay không biểu diễn chính xác được lượng tồn.'],['P_RETURN',409,'Dòng cấp gốc không khớp lô/kho hoặc số lượng hoàn vượt lượng đã cấp còn được trả.'],['P_MEDICINE',400,'Thuốc không tồn tại hoặc đã ngừng kinh doanh.'],['P_WAREHOUSE',409,'Kho không hoạt động hoặc đang kiểm kê.'],['P_STOCK',409,'Không đủ tồn khả dụng hoặc lô đang bị khóa.'],['P_EXPIRY',400,'Hạn dùng không hợp lệ hoặc đã hết hạn.'],['P_KEY',409,'Mã thao tác đã dùng cho nội dung khác.']])if(e.message.includes(k))fail(s,m);throw e;}
}

const takeStockSql=`
 DECLARE @lot varchar(20),@batchId varchar(20),@available decimal(18,4),@balance decimal(18,4),@take decimal(18,4),@price decimal(18,2),@line varchar(20),@targetLot varchar(20),@targetBalance decimal(18,4),@targetLine varchar(20);
 WHILE @needed>0 BEGIN
  SET @lot=NULL;
  SELECT TOP 1 @lot=t.maLoTon,@batchId=t.maLoHang,@available=t.soLuongKhaDung,@balance=t.soLuongTon,@price=h.donGiaNhap FROM dbo.LoTonKho t WITH(UPDLOCK,HOLDLOCK) JOIN dbo.LoHang h ON h.maLoHang=t.maLoHang WHERE t.maKho=@warehouse AND h.maHang=@item AND t.trangThaiKhoa=0 AND t.soLuongKhaDung>0 AND h.hanSuDung>=CONVERT(date,SYSDATETIME()) ORDER BY h.hanSuDung,t.maLoTon;
  IF @lot IS NULL THROW 51000,'P_STOCK',1;
  SET @take=CASE WHEN @needed<@available THEN @needed ELSE @available END;SET @line='CK-'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),16);
  UPDATE dbo.LoTonKho SET soLuongTon=soLuongTon-@take,soLuongKhaDung=soLuongKhaDung-@take WHERE maLoTon=@lot;
  INSERT dbo.ChiTietPhieuKho(maChiTietKho,maPhieu,maLoTon,maChiTietDonNguon,soLuong,donViXuat,soLuongCoSo,donGiaVatLy) VALUES(@line,@voucher,@lot,@rxline,@take,@unit,@take,@price);
  INSERT dbo.SoKho(maSoKho,maChiTietKho,maLoTon,soLuongTruoc,bienDong,soLuongSau) VALUES('SK-'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),16),@line,@lot,@balance,-@take,@balance-@take);
  IF @action='approveMovement' AND @type='CHUYEN_KHO' BEGIN
   SET @targetLot=NULL;
   SELECT TOP 1 @targetLot=maLoTon FROM dbo.LoTonKho WITH(UPDLOCK,HOLDLOCK) WHERE maKho=@destination AND maLoHang=@batchId;
   IF @targetLot IS NULL BEGIN SET @targetLot='LT-'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),16);INSERT dbo.LoTonKho(maLoTon,maKho,maLoHang) VALUES(@targetLot,@destination,@batchId);END
   IF EXISTS(SELECT 1 FROM dbo.LoTonKho WHERE maLoTon=@targetLot AND trangThaiKhoa=1) THROW 51000,'P_STOCK',1;
   SELECT @targetBalance=soLuongTon FROM dbo.LoTonKho WHERE maLoTon=@targetLot;
   UPDATE dbo.LoTonKho SET soLuongTon=soLuongTon+@take,soLuongKhaDung=soLuongKhaDung+@take WHERE maLoTon=@targetLot;
   SET @targetLine='CK-'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),16);
   INSERT dbo.ChiTietPhieuKho(maChiTietKho,maPhieu,maLoTon,maChiTietGoc,soLuong,donViXuat,soLuongCoSo,donGiaVatLy) VALUES(@targetLine,@voucher,@targetLot,@line,@take,@unit,@take,@price);
   INSERT dbo.SoKho(maSoKho,maChiTietKho,maLoTon,soLuongTruoc,bienDong,soLuongSau) VALUES('SK-'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),16),@targetLine,@targetLot,@targetBalance,@take,@targetBalance+@take);
  END
  SET @needed=@needed-@take;
 END
`;
