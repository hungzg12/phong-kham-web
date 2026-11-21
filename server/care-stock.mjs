// Included inside the same SQL transaction as the clinical execution.
export const careStockSql=`
 IF @stock=1
 BEGIN
  DECLARE @item varchar(20),@quantity decimal(18,4),@unit nvarchar(30),@plannedUnit nvarchar(30),@admission varchar(20),@remaining decimal(18,4),@lot varchar(20),@available decimal(18,4),@balance decimal(18,4),@take decimal(18,4),@price decimal(18,2),@line varchar(20);
  SELECT @item=y.maHang,@quantity=y.soLuongKeHoach,@unit=h.donViCoSo,@plannedUnit=y.donViKeHoach,@admission=t.maDotDieuTri FROM dbo.YLenh y JOIN dbo.ToDieuTri t ON t.maTo=y.maTo JOIN dbo.HangHoaYTe h ON h.maHang=y.maHang WHERE y.maYLenh=@id;
  IF @plannedUnit IS NULL OR @plannedUnit<>@unit THROW 51000,'A_UNIT',1;
  IF @quantity IS NULL OR @quantity<=0 OR NOT EXISTS(SELECT 1 FROM dbo.KhoDuoc WHERE maKho=@warehouse AND dangHoatDong=1 AND maKiemKeDangMo IS NULL) THROW 51000,'A_STOCK',1;
  IF (SELECT ISNULL(SUM(l.soLuongKhaDung),0) FROM dbo.LoTonKho l WITH(UPDLOCK,HOLDLOCK) JOIN dbo.LoHang h ON h.maLoHang=l.maLoHang WHERE l.maKho=@warehouse AND h.maHang=@item AND l.trangThaiKhoa=0 AND h.hanSuDung>=CONVERT(date,SYSDATETIME()))<@quantity THROW 51000,'A_STOCK',1;
  INSERT dbo.PhieuKho(maPhieu,loaiPhieu,maKhoNguon,maDotDieuTri,maLanNguon,maNguoiLap,trangThai,maNguoiDuyet,thoiDiemDuyet)
  VALUES(@voucher,'XUAT_TIEU_HAO_NOI_TRU',@warehouse,@admission,@execution,@staff,'DA_XUAT',@staff,SYSDATETIME());
  SET @remaining=@quantity;
  WHILE @remaining>0
  BEGIN
   SET @lot=NULL;
   SELECT TOP 1 @lot=l.maLoTon,@available=l.soLuongKhaDung,@balance=l.soLuongTon,@price=h.donGiaNhap FROM dbo.LoTonKho l WITH(UPDLOCK,HOLDLOCK) JOIN dbo.LoHang h ON h.maLoHang=l.maLoHang
   WHERE l.maKho=@warehouse AND h.maHang=@item AND l.trangThaiKhoa=0 AND l.soLuongKhaDung>0 AND h.hanSuDung>=CONVERT(date,SYSDATETIME()) ORDER BY h.hanSuDung,l.maLoTon;
   IF @lot IS NULL THROW 51000,'A_STOCK',1;
   SET @take=CASE WHEN @remaining<@available THEN @remaining ELSE @available END;
   SET @line='CK-'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),16);
   UPDATE dbo.LoTonKho SET soLuongTon=soLuongTon-@take,soLuongKhaDung=soLuongKhaDung-@take WHERE maLoTon=@lot;
   INSERT dbo.ChiTietPhieuKho(maChiTietKho,maPhieu,maLoTon,soLuong,donViXuat,soLuongCoSo,donGiaVatLy) VALUES(@line,@voucher,@lot,@take,@unit,@take,@price);
   INSERT dbo.SoKho(maSoKho,maChiTietKho,maLoTon,soLuongTruoc,bienDong,soLuongSau) VALUES('SK-'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),16),@line,@lot,@balance,-@take,@balance-@take);
   SET @remaining=@remaining-@take;
  END
  UPDATE dbo.LanThucHienYLenh SET maKhoTieuHao=@warehouse,soLuongThucDung=@quantity,donViThucDung=@unit,maPhieuXuatKho=@voucher,trangThaiKho='DA_HACH_TOAN' WHERE maLan=@execution;
 END
`;
