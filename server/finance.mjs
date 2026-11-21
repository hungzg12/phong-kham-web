import {randomUUID,createHash} from 'node:crypto';
import {querySql} from './admin-store.mjs';
const uid=p=>p+randomUUID().replaceAll('-','').slice(0,16);
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const txt=(v,max=500)=>typeof v==='string'&&v.trim().length<=max?v.trim():'';
function money(v,zero=true){const n=Number(v);if(v==null||v===''||!Number.isSafeInteger(n)||n<(zero?0:1)||n>1e12)fail(400,'Số tiền phải là số nguyên đồng hợp lệ.');return n;}
const episodeSql=`
 DECLARE @visit varchar(20),@admission varchar(20),@patient varchar(20);
 SELECT @visit=maLuotKham,@patient=maBenhNhan FROM dbo.LuotKham WHERE maLuotKham=@episode;
 IF @visit IS NULL SELECT @admission=maDotDieuTri,@patient=maBenhNhan FROM dbo.DotDieuTri WHERE maDotDieuTri=@episode;
 IF @patient IS NULL OR @patient<>@patientId THROW 51000,'F_PATIENT',1;
`;
const advanceSql=`
 SELECT @advance=ISNULL(SUM(CASE WHEN loaiGiaoDich='TAM_UNG' THEN soTien ELSE -soTien END),0) FROM dbo.GiaoDichThanhToan
 WHERE COALESCE(maLuotKham,maDotDieuTri)=@episode AND trangThai='THANH_CONG' AND loaiGiaoDich IN('TAM_UNG','HOAN_UNG');
`;
const shiftSql=`
 SELECT @shift=maBaoCao FROM dbo.BaoCaoVienPhi WHERE maThuNgan=@staff AND trangThai='DANG_MO';
 IF @shift IS NULL THROW 51000,'F_SHIFT',1;
`;
const shiftTotals=`UPDATE dbo.BaoCaoVienPhi SET tongTienThuTrongCa=ISNULL((SELECT SUM(soTien) FROM dbo.GiaoDichThanhToan WHERE maCaTruc=@shift AND trangThai='THANH_CONG' AND loaiGiaoDich NOT IN('HOAN_UNG','HOAN_VIEN_PHI')),0),
 tongTienHoanTrongCa=ISNULL((SELECT SUM(soTien) FROM dbo.GiaoDichThanhToan WHERE maCaTruc=@shift AND trangThai='THANH_CONG' AND loaiGiaoDich IN('HOAN_UNG','HOAN_VIEN_PHI')),0) WHERE maBaoCao=@shift;`;

export async function financeState(){
 const advances=JSON.parse(await querySql(`SELECT (SELECT g.maGiaoDich id,g.maBenhNhan patient,COALESCE(g.maLuotKham,g.maDotDieuTri) episodeId,g.soTien amount,
 CASE g.loaiGiaoDich WHEN 'HOAN_UNG' THEN N'Hoàn tiền' ELSE N'Tạm ứng' END kind,
 CASE g.trangThai WHEN 'CHO_THANH_TOAN' THEN N'Chờ xác nhận' WHEN 'THANH_CONG' THEN N'Đã xác nhận' ELSE N'Đã hủy' END status,g.ghiChu reason,
 CONVERT(char(10),g.thoiDiemGiaoDich,23) date,CONVERT(char(10),g.thoiDiemGiaoDich,23) confirmedDate,g.maGiaoDich receipt,
 JSON_VALUE(a.duLieuSau,'$.signedBy') signedBy FROM dbo.GiaoDichThanhToan g OUTER APPLY(SELECT TOP 1 duLieuSau FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='Finance' AND maDoiTuong=g.maGiaoDich ORDER BY maNhatKy DESC) a
 WHERE g.loaiGiaoDich IN('TAM_UNG','HOAN_UNG') FOR JSON PATH)`)||'[]');
 const settlements=JSON.parse(await querySql(`SELECT (SELECT q.maQuyetToan id,COALESCE(l.maBenhNhan,d.maBenhNhan) patient,COALESCE(q.maLuotKham,q.maDotDieuTri) episodeId,
 q.tongChiPhi gross,q.tienBHYTChiTra insurance,q.trangThai rawStatus,CONVERT(char(10),q.thoiDiemChot,23) date,
 JSON_QUERY(a.duLieuSau,'$.lines') lines,JSON_VALUE(a.duLieuSau,'$.advance') savedAdvance,JSON_VALUE(a.duLieuSau,'$.balance') savedBalance,JSON_VALUE(a.duLieuSau,'$.signedBy') signedBy,
 q.maQuyetToan receipt FROM dbo.QuyetToan q LEFT JOIN dbo.LuotKham l ON l.maLuotKham=q.maLuotKham LEFT JOIN dbo.DotDieuTri d ON d.maDotDieuTri=q.maDotDieuTri
 OUTER APPLY(SELECT TOP 1 duLieuSau FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='Finance' AND maDoiTuong=q.maQuyetToan ORDER BY maNhatKy DESC) a
 WHERE q.laBanHienHanh=1 AND q.trangThai<>'DA_HUY' FOR JSON PATH)`)||'[]');
 for(const row of settlements){
  const net=advances.filter(a=>a.episodeId===row.episodeId&&a.status==='Đã xác nhận').reduce((sum,a)=>sum+(a.kind==='Hoàn tiền'?-1:1)*Number(a.amount),0);
  row.advance=row.rawStatus==='DA_QUYET_TOAN'?Number(row.savedAdvance||0):net;
  row.balance=Number(row.gross)-Number(row.insurance)-row.advance;
  row.status=row.rawStatus==='DA_QUYET_TOAN'?(row.balance<0?'Đã hoàn tiền':'Đã thanh toán'):'Chờ quyết toán';
  row.lines||=[];row.received=row.rawStatus==='DA_QUYET_TOAN'?Math.max(0,row.balance):0;row.refund=row.rawStatus==='DA_QUYET_TOAN'?Math.max(0,-row.balance):0;row.settledDate=row.date;
 }
 const shifts=JSON.parse(await querySql(`SELECT (SELECT c.maBaoCao id,c.quayThuTien name,c.maThuNgan cashier,c.tienDauCa opening,c.tienThucDem counted,
 c.tienDauCa+c.tongTienThuTrongCa-c.tongTienHoanTrongCa expected,c.tongTienThuTrongCa-c.tongTienHoanTrongCa cash,c.chenhLech difference,c.ghiChu reason,
 CASE c.trangThai WHEN 'DANG_MO' THEN N'Chờ đối soát' ELSE N'Đã đóng ca' END status,
 JSON_QUERY((SELECT g.maGiaoDich FROM dbo.GiaoDichThanhToan g WHERE g.maCaTruc=c.maBaoCao AND g.trangThai='THANH_CONG' FOR JSON PATH)) transactions
 FROM dbo.BaoCaoVienPhi c FOR JSON PATH)`)||'[]');
 for(const row of shifts)row.transactionIds=(row.transactions||[]).map(g=>g.maGiaoDich);
 return {advances,settlements,shifts};
}

export async function financeAction(data){
 if(!data||!['admin','cashier'].includes(data.role))fail(403,'Chỉ thu ngân được thực hiện nghiệp vụ viện phí.');
 if(!txt(data.staffId,20)||!/^[-a-zA-Z0-9]{16,80}$/.test(data.requestId||''))fail(400,'Thiếu nhân viên hoặc mã thao tác.');
 const params={staff:data.staffId,key:data.requestId,fingerprint:createHash('sha256').update(JSON.stringify(data)).digest('hex'),id:data.id||uid('GD-'),transaction:uid('TT-'),episode:data.episodeId||null,patientId:data.patient||null,signedBy:txt(data.signedBy,100),reason:txt(data.reason),kind:data.kind||null};
 let sql='',event=data.action;
 switch(data.action){
 case 'openShift':{
  const opening=money(data.opening);if(!txt(data.name,50))fail(400,'Nhập tên ca trực.');params.id=uid('CA-');params.opening=opening;params.name=data.name.trim();
  sql=`IF EXISTS(SELECT 1 FROM dbo.BaoCaoVienPhi WHERE maThuNgan=@staff AND trangThai='DANG_MO') THROW 51000,'F_DUPLICATE',1;
  INSERT dbo.BaoCaoVienPhi(maBaoCao,maCaTruc,quayThuTien,maThuNgan,thoiDiemMoCa,tienDauCa) VALUES(@id,@id,@name,@staff,SYSDATETIME(),CONVERT(decimal(18,2),@opening));
  SET @result=(SELECT @id id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);`;break;
 }
 case 'saveAdvance':{
  params.amount=money(data.amount,false);if(!['Tạm ứng','Hoàn tiền'].includes(data.kind)||!txt(data.reason))fail(400,'Chọn loại giao dịch và nhập lý do.');params.type=data.kind==='Tạm ứng'?'TAM_UNG':'HOAN_UNG';params.editing=data.id?'1':'0';
  sql=episodeSql+`IF EXISTS(SELECT 1 FROM dbo.QuyetToan WHERE COALESCE(maLuotKham,maDotDieuTri)=@episode AND laBanHienHanh=1 AND trangThai='DA_QUYET_TOAN') THROW 51000,'F_STATE',1;
  IF @editing='1'
  BEGIN
   IF NOT EXISTS(SELECT 1 FROM dbo.GiaoDichThanhToan WHERE maGiaoDich=@id AND trangThai='CHO_THANH_TOAN' AND COALESCE(maLuotKham,maDotDieuTri)=@episode AND maBenhNhan=@patientId AND loaiGiaoDich IN('TAM_UNG','HOAN_UNG')) THROW 51000,'F_STATE',1;
   UPDATE dbo.GiaoDichThanhToan SET soTien=CONVERT(decimal(18,2),@amount),loaiGiaoDich=@type,ghiChu=@reason WHERE maGiaoDich=@id;
  END ELSE INSERT dbo.GiaoDichThanhToan(maGiaoDich,maBenhNhan,maLuotKham,maDotDieuTri,loaiGiaoDich,phuongThuc,soTien,trangThai,maNhanVienXacNhan,ghiChu)
  VALUES(@id,@patient,@visit,@admission,@type,'TIEN_MAT',CONVERT(decimal(18,2),@amount),'CHO_THANH_TOAN',@staff,@reason);
  SET @result=(SELECT @id id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);`;break;
 }
 case 'confirmAdvance':case 'cancelAdvance':{
  if(data.action==='confirmAdvance'&&!params.signedBy)fail(400,'Nhập tên người nộp/nhận tiền.');
  if(data.action==='cancelAdvance'&&!params.reason)fail(400,'Nhập lý do hủy.');
  sql=`DECLARE @amount decimal(18,2),@type varchar(30),@advance decimal(18,2)=0,@shift varchar(20);
  SELECT @episode=COALESCE(maLuotKham,maDotDieuTri),@amount=soTien,@type=loaiGiaoDich FROM dbo.GiaoDichThanhToan WHERE maGiaoDich=@id AND trangThai='CHO_THANH_TOAN' AND loaiGiaoDich IN('TAM_UNG','HOAN_UNG');
  IF @amount IS NULL THROW 51000,'F_STATE',1;
  IF EXISTS(SELECT 1 FROM dbo.QuyetToan WHERE COALESCE(maLuotKham,maDotDieuTri)=@episode AND laBanHienHanh=1 AND trangThai='DA_QUYET_TOAN') THROW 51000,'F_STATE',1;
  `+(data.action==='confirmAdvance'?shiftSql+advanceSql+`
  IF @type='HOAN_UNG' AND @amount>@advance THROW 51000,'F_OVER_REFUND',1;
  UPDATE dbo.GiaoDichThanhToan SET trangThai='THANH_CONG',maNhanVienXacNhan=@staff,maCaTruc=@shift,thoiDiemGiaoDich=SYSDATETIME() WHERE maGiaoDich=@id;${shiftTotals}
  `:`UPDATE dbo.GiaoDichThanhToan SET trangThai='THAT_BAI',ghiChu=@reason WHERE maGiaoDich=@id;`)+`
  SET @result=(SELECT @id id,@signedBy signedBy FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);`;break;
 }
 case 'createSettlement':{
  if(!Array.isArray(data.lines)||!data.lines.length||data.lines.length>100)fail(400,'Nhập ít nhất một khoản chi phí.');
  const lines=data.lines.map(line=>{if(!txt(line.description,500))fail(400,'Nhập nội dung chi phí.');return {description:line.description.trim(),quantity:money(line.quantity,false),price:money(line.price)};});
  const gross=lines.reduce((s,l)=>s+l.quantity*l.price,0);params.gross=money(gross);params.insurance=money(data.insurance);if(params.insurance>gross)fail(400,'BHYT không được vượt tổng chi phí.');params.lines=JSON.stringify(lines);params.id=uid('QT-');
  sql=episodeSql+`IF EXISTS(SELECT 1 FROM dbo.QuyetToan WHERE COALESCE(maLuotKham,maDotDieuTri)=@episode AND laBanHienHanh=1 AND trangThai<>'DA_HUY') THROW 51000,'F_DUPLICATE',1;
  INSERT dbo.QuyetToan(maQuyetToan,maLuotKham,maDotDieuTri,tongChiPhi,tienBHYTChiTra,maNguoiChot) VALUES(@id,@visit,@admission,CONVERT(decimal(18,2),@gross),CONVERT(decimal(18,2),@insurance),@staff);
  DECLARE @remainingInsurance decimal(18,2)=CONVERT(decimal(18,2),@insurance),@i int=0,@count int=(SELECT COUNT(*) FROM OPENJSON(@lines)),@q decimal(18,4),@p decimal(18,2),@cost decimal(18,2),@covered decimal(18,2);
  WHILE @i<@count BEGIN
   SELECT @q=JSON_VALUE(value,'$.quantity'),@p=JSON_VALUE(value,'$.price') FROM OPENJSON(@lines) WHERE [key]=CONVERT(varchar(10),@i);
   SET @cost=@q*@p;SET @covered=CASE WHEN @remainingInsurance>@cost THEN @cost ELSE @remainingInsurance END;
   INSERT dbo.ChiTietQuyetToan(maDongQuyetToan,maQuyetToan,loaiChiPhi,maLuotKhamNguon,soLuong,donGia,thanhTien,tienBHYT,tienBenhNhanTra)
   VALUES('DQ-'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),16),@id,'KHAC',@visit,@q,@p,@cost,@covered,@cost-@covered);
   SET @remainingInsurance=@remainingInsurance-@covered;SET @i=@i+1;
  END
  SET @result=(SELECT @id id,JSON_QUERY(@lines) lines FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);`;break;
 }
 case 'settle':{
  if(!params.signedBy)fail(400,'Nhập tên người nộp/nhận tiền.');params.expectedBalance=Number(data.expectedBalance);if(!Number.isSafeInteger(params.expectedBalance))fail(400,'Thiếu số dư đối chiếu.');
  sql=`DECLARE @gross decimal(18,2),@insurance decimal(18,2),@advance decimal(18,2)=0,@balance decimal(18,2),@shift varchar(20),@visit varchar(20),@admission varchar(20),@patient varchar(20),@lines nvarchar(max);
  SELECT @episode=COALESCE(q.maLuotKham,q.maDotDieuTri),@gross=q.tongChiPhi,@insurance=q.tienBHYTChiTra,@visit=q.maLuotKham,@admission=q.maDotDieuTri,@patient=COALESCE(l.maBenhNhan,d.maBenhNhan)
  FROM dbo.QuyetToan q LEFT JOIN dbo.LuotKham l ON l.maLuotKham=q.maLuotKham LEFT JOIN dbo.DotDieuTri d ON d.maDotDieuTri=q.maDotDieuTri WHERE q.maQuyetToan=@id AND q.trangThai='CHUA_THANH_TOAN' AND q.laBanHienHanh=1;
  IF @gross IS NULL THROW 51000,'F_STATE',1;
  ${shiftSql}${advanceSql}SET @balance=@gross-@insurance-@advance;
  IF @balance<>CONVERT(decimal(18,2),@expectedBalance) THROW 51000,'F_STALE',1;
  IF @balance<>0 INSERT dbo.GiaoDichThanhToan(maGiaoDich,maBenhNhan,maLuotKham,maDotDieuTri,maQuyetToan,loaiGiaoDich,phuongThuc,soTien,maNhanVienXacNhan,maCaTruc)
  VALUES(@transaction,@patient,@visit,@admission,@id,CASE WHEN @balance<0 THEN 'HOAN_VIEN_PHI' ELSE 'THU_THEM' END,'TIEN_MAT',ABS(@balance),@staff,@shift);
  UPDATE dbo.QuyetToan SET trangThai='DA_QUYET_TOAN',maNguoiChot=@staff,thoiDiemChot=SYSDATETIME() WHERE maQuyetToan=@id;
  ${shiftTotals}
  SELECT TOP 1 @lines=JSON_QUERY(duLieuSau,'$.lines') FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='Finance' AND maDoiTuong=@id ORDER BY maNhatKy DESC;
  SET @result=(SELECT @id id,@advance advance,@balance balance,@signedBy signedBy,JSON_QUERY(@lines) lines FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);`;break;
 }
 case 'closeShift':{
  params.counted=money(data.counted);
  sql=`DECLARE @shift varchar(20)=@id,@expected decimal(18,2);
  IF NOT EXISTS(SELECT 1 FROM dbo.BaoCaoVienPhi WHERE maBaoCao=@id AND maThuNgan=@staff AND trangThai='DANG_MO') THROW 51000,'F_STATE',1;
  ${shiftTotals}
  SELECT @expected=tienDauCa+tongTienThuTrongCa-tongTienHoanTrongCa FROM dbo.BaoCaoVienPhi WHERE maBaoCao=@id;
  IF @expected<>CONVERT(decimal(18,2),@counted) AND NULLIF(@reason,'') IS NULL THROW 51000,'F_REASON',1;
  UPDATE dbo.BaoCaoVienPhi SET tienThucDem=CONVERT(decimal(18,2),@counted),trangThai='DA_DONG',thoiDiemDongCa=SYSDATETIME(),maNguoiDoiSoat=@staff,ghiChu=@reason WHERE maBaoCao=@id;
  INSERT dbo.ChiTietDoiSoatCa(maBaoCao,maGiaoDich,loaiGiaoDichTrongCa,soTienGhiNhan)
  SELECT @id,maGiaoDich,CASE WHEN loaiGiaoDich IN('HOAN_UNG','HOAN_VIEN_PHI') THEN 'HOAN_TIEN' ELSE 'THU_TIEN' END,soTien FROM dbo.GiaoDichThanhToan WHERE maCaTruc=@id AND trangThai='THANH_CONG';
  SET @result=(SELECT @id id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);`;break;
 }
 default:fail(400,'Thao tác viện phí không hợp lệ.');
 }
 try{
  return JSON.parse(await querySql(`SET NOCOUNT ON;SET XACT_ABORT ON;BEGIN TRY BEGIN TRAN;
  DECLARE @lock int,@result nvarchar(max),@previous nvarchar(max),@priorFingerprint nvarchar(100);
  EXEC @lock=sys.sp_getapplock @Resource=N'MediCareFinance',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @lock<0 THROW 51000,'F_BUSY',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE maNhanVien=@staff AND chuyenMon='THU_NGAN' AND dangLamViec=1) THROW 51000,'F_STAFF',1;
  SELECT TOP 1 @previous=duLieuSau,@priorFingerprint=duLieuTruoc FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='Finance' AND maTuongQuan=@key;
  IF @previous IS NOT NULL BEGIN IF @priorFingerprint<>@fingerprint THROW 51000,'F_KEY',1;COMMIT;SELECT @previous;RETURN;END
  ${sql}
  INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,maNguoiThucHien,ketQua,maTuongQuan,duLieuTruoc,duLieuSau)
  VALUES('Finance',@id,@event,'NHAN_VIEN',@staff,'THANH_CONG',@key,@fingerprint,@result);
  COMMIT;SELECT @result;END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH`,{...params,event}));
 }catch(e){for(const [key,status,message]of [['F_STAFF',403,'Nhân viên thu ngân không hợp lệ hoặc đã ngừng làm việc.'],['F_PATIENT',409,'Lượt khám/đợt điều trị không thuộc người bệnh đã chọn.'],['F_SHIFT',409,'Mở ca thu ngân trước khi xác nhận giao dịch.'],['F_DUPLICATE',409,'Đã có ca đang mở hoặc quyết toán cho hồ sơ này.'],['F_STATE',409,'Chứng từ đã xử lý hoặc không còn cho phép thay đổi.'],['F_OVER_REFUND',409,'Số tiền hoàn vượt tạm ứng còn lại của hồ sơ.'],['F_STALE',409,'Số dư đã thay đổi. Tải lại bảng quyết toán để đối chiếu.'],['F_REASON',400,'Nhập giải trình chênh lệch trước khi đóng ca.'],['F_KEY',409,'Mã thao tác đã được dùng cho nội dung khác.']])if(e.message.includes(key))fail(status,message);throw e;}
}
