-- ============================================================================
-- SCRIPT ĐỒNG BỘ CSDL QuanLyBenhVien TRÊN SQL SERVER (.\MSSQLVESE)
-- Bổ sung bảng DotNhapHang, các cột Lô thuốc, 5 View và nạp dữ liệu mẫu
-- ============================================================================
USE [QuanLyBenhVien];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT N'--> BƯỚC 1: BỔ SUNG CỘT CHO BẢNG Thuoc...';
IF COL_LENGTH('dbo.Thuoc', 'nhomDieuTri') IS NULL
BEGIN
    ALTER TABLE dbo.Thuoc ADD nhomDieuTri NVARCHAR(100) NULL;
    PRINT N'   + Đã thêm cột nhomDieuTri vào dbo.Thuoc';
END
ELSE
    PRINT N'   = Cột nhomDieuTri đã tồn tại trong dbo.Thuoc';
GO

PRINT N'--> BƯỚC 2: TẠO BẢNG DotNhapHang...';
IF OBJECT_ID('dbo.DotNhapHang', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.DotNhapHang (
        maDotNhap VARCHAR(50) NOT NULL PRIMARY KEY,
        tenDotNhap NVARCHAR(200) NOT NULL,
        hangSanXuat NVARCHAR(150) NOT NULL,
        nhaCungCap NVARCHAR(150) NULL,
        soHoaDon VARCHAR(50) NULL,
        ngayNhapKho DATE NOT NULL,
        maKhoNhap VARCHAR(20) NULL REFERENCES dbo.KhoDuoc(maKho),
        nguoiGiaoHang NVARCHAR(100) NULL,
        nguoiNhanHang NVARCHAR(100) NULL,
        ghiChu NVARCHAR(500) NULL
    );
    PRINT N'   + Đã tạo bảng dbo.DotNhapHang thành công';
END
ELSE
    PRINT N'   = Bảng dbo.DotNhapHang đã tồn tại';
GO

PRINT N'--> BƯỚC 3: BỔ SUNG CÁC CỘT VÀO BẢNG LoHang...';
IF COL_LENGTH('dbo.LoHang', 'maDotNhap') IS NULL
BEGIN
    ALTER TABLE dbo.LoHang ADD maDotNhap VARCHAR(50) NULL REFERENCES dbo.DotNhapHang(maDotNhap);
    PRINT N'   + Đã thêm cột maDotNhap (FK) vào dbo.LoHang';
END;

IF COL_LENGTH('dbo.LoHang', 'soLuongNhap') IS NULL
BEGIN
    ALTER TABLE dbo.LoHang ADD soLuongNhap DECIMAL(18,4) NOT NULL CONSTRAINT DF_LoHang_soLuongNhap DEFAULT 0;
    PRINT N'   + Đã thêm cột soLuongNhap vào dbo.LoHang';
END;

IF COL_LENGTH('dbo.LoHang', 'hangSanXuat') IS NULL
BEGIN
    ALTER TABLE dbo.LoHang ADD hangSanXuat NVARCHAR(150) NULL;
    PRINT N'   + Đã thêm cột hangSanXuat vào dbo.LoHang';
END;

IF COL_LENGTH('dbo.LoHang', 'nuocSanXuat') IS NULL
BEGIN
    ALTER TABLE dbo.LoHang ADD nuocSanXuat NVARCHAR(100) NULL;
    PRINT N'   + Đã thêm cột nuocSanXuat vào dbo.LoHang';
END;

IF COL_LENGTH('dbo.LoHang', 'soDangKy') IS NULL
BEGIN
    ALTER TABLE dbo.LoHang ADD soDangKy VARCHAR(50) NULL;
    PRINT N'   + Đã thêm cột soDangKy vào dbo.LoHang';
END;

IF COL_LENGTH('dbo.LoHang', 'quyCachDongGoi') IS NULL
BEGIN
    ALTER TABLE dbo.LoHang ADD quyCachDongGoi NVARCHAR(100) NULL;
    PRINT N'   + Đã thêm cột quyCachDongGoi vào dbo.LoHang';
END;
GO

PRINT N'--> BƯỚC 4: TẠO HOẶC CẬP NHẬT 5 VIEW QUẢN LÝ LÔ THUỐC & FEFO...';
GO

-- 1. View Chi tiết Lô thuốc theo từng kho
CREATE OR ALTER VIEW dbo.vw_QuanLyLoThuoc_ChiTiet
AS
SELECT 
    lh.maLoHang,
    lh.soLoNhaSanXuat,
    h.maHang,
    h.tenHang,
    h.loaiHang,
    t.hoatChat,
    t.hamLuong,
    t.dangBaoChe,
    t.duongDung,
    t.nhomDieuTri,
    t.nhomDoc,
    ISNULL(lh.hangSanXuat, lh.nhaSanXuat) AS hangSanXuat,
    lh.nhaSanXuat,
    lh.nuocSanXuat,
    lh.nhaCungCap,
    lh.soDangKy,
    lh.quyCachDongGoi,
    lh.ngaySanXuat,
    lh.hanSuDung,
    DATEDIFF(day, CAST(SYSDATETIME() AS DATE), lh.hanSuDung) AS soNgayConHan,
    CASE 
        WHEN lh.hanSuDung < CAST(SYSDATETIME() AS DATE) THEN N'ĐÃ HẾT HẠN'
        WHEN DATEDIFF(day, CAST(SYSDATETIME() AS DATE), lh.hanSuDung) <= 30 THEN N'CẬN DATE (<= 30 NGÀY)'
        WHEN DATEDIFF(day, CAST(SYSDATETIME() AS DATE), lh.hanSuDung) <= 90 THEN N'CẬN DATE (<= 90 NGÀY)'
        ELSE N'CÒN HẠN SỬ DỤNG'
    END AS trangThaiHanDung,
    kd.maKho,
    kd.tenKho,
    kd.loaiKho,
    ltk.viTriDayKe,
    ISNULL(ltk.soLuongTon, 0) AS soLuongTon,
    ISNULL(ltk.soLuongKhaDung, 0) AS soLuongKhaDung,
    h.donViCoSo,
    lh.donGiaNhap,
    h.donGiaXuatCoSo,
    h.giaBHYT,
    CAST(ISNULL(ltk.soLuongTon, 0) * lh.donGiaNhap AS DECIMAL(18,2)) AS thanhTienTon,
    ISNULL(ltk.trangThaiKhoa, 0) AS trangThaiKhoa
FROM dbo.LoHang lh
INNER JOIN dbo.HangHoaYTe h ON lh.maHang = h.maHang
LEFT JOIN dbo.Thuoc t ON h.maHang = t.maHang
LEFT JOIN dbo.LoTonKho ltk ON lh.maLoHang = ltk.maLoHang
LEFT JOIN dbo.KhoDuoc kd ON ltk.maKho = kd.maKho;
GO

-- 2. View Tổng hợp Lô thuốc toàn viện
CREATE OR ALTER VIEW dbo.vw_TongHopLoThuoc_ToanVien
AS
SELECT 
    lh.maLoHang,
    lh.soLoNhaSanXuat,
    h.maHang,
    h.tenHang,
    h.loaiHang,
    t.hoatChat,
    t.hamLuong,
    t.dangBaoChe,
    t.nhomDieuTri,
    ISNULL(lh.hangSanXuat, lh.nhaSanXuat) AS hangSanXuat,
    lh.nhaSanXuat,
    lh.nuocSanXuat,
    lh.nhaCungCap,
    lh.soDangKy,
    lh.ngaySanXuat,
    lh.hanSuDung,
    DATEDIFF(day, CAST(SYSDATETIME() AS DATE), lh.hanSuDung) AS soNgayConHan,
    CASE 
        WHEN lh.hanSuDung < CAST(SYSDATETIME() AS DATE) THEN N'ĐÃ HẾT HẠN'
        WHEN DATEDIFF(day, CAST(SYSDATETIME() AS DATE), lh.hanSuDung) <= 30 THEN N'CẬN DATE (<= 30 NGÀY)'
        WHEN DATEDIFF(day, CAST(SYSDATETIME() AS DATE), lh.hanSuDung) <= 90 THEN N'CẬN DATE (<= 90 NGÀY)'
        ELSE N'CÒN HẠN SỬ DỤNG'
    END AS trangThaiHanDung,
    COUNT(DISTINCT ltk.maKho) AS soKhoDangLuuTru,
    SUM(ISNULL(ltk.soLuongTon, 0)) AS tongSoLuongTon,
    SUM(ISNULL(ltk.soLuongKhaDung, 0)) AS tongSoLuongKhaDung,
    h.donViCoSo,
    lh.donGiaNhap,
    CAST(SUM(ISNULL(ltk.soLuongTon, 0)) * lh.donGiaNhap AS DECIMAL(18,2)) AS tongGiaTriTonKho
FROM dbo.LoHang lh
INNER JOIN dbo.HangHoaYTe h ON lh.maHang = h.maHang
LEFT JOIN dbo.Thuoc t ON h.maHang = t.maHang
LEFT JOIN dbo.LoTonKho ltk ON lh.maLoHang = ltk.maLoHang
GROUP BY 
    lh.maLoHang, lh.soLoNhaSanXuat, h.maHang, h.tenHang, h.loaiHang,
    t.hoatChat, t.hamLuong, t.dangBaoChe, t.nhomDieuTri,
    lh.hangSanXuat, lh.nhaSanXuat, lh.nuocSanXuat, lh.nhaCungCap, lh.soDangKy,
    lh.ngaySanXuat, lh.hanSuDung, h.donViCoSo, lh.donGiaNhap;
GO

-- 3. View Chi tiết từng loại thuốc bên trong mỗi Lô Hàng / Đợt Nhập từ Hãng
CREATE OR ALTER VIEW dbo.vw_ChiTietLoHangNhap_TheoTungLoaiThuoc
AS
SELECT 
    ISNULL(dn.maDotNhap, N'LE_' + lh.maLoHang) AS maDotNhap,
    ISNULL(dn.tenDotNhap, N'Lô hàng lẻ') AS tenDotNhap,
    ISNULL(dn.hangSanXuat, ISNULL(lh.hangSanXuat, lh.nhaSanXuat)) AS hangSanXuat,
    ISNULL(dn.nhaCungCap, lh.nhaCungCap) AS nhaCungCap,
    ISNULL(dn.soHoaDon, N'HD-CHUA-RO') AS soHoaDon,
    ISNULL(dn.ngayNhapKho, lh.ngaySanXuat) AS ngayNhapKho,
    lh.maLoHang,
    lh.soLoNhaSanXuat,
    h.maHang,
    h.tenHang,
    h.loaiHang,
    t.nhomDieuTri,
    t.hoatChat,
    t.hamLuong,
    t.dangBaoChe,
    lh.nuocSanXuat,
    lh.soDangKy,
    lh.quyCachDongGoi,
    lh.ngaySanXuat,
    lh.hanSuDung,
    DATEDIFF(day, CAST(SYSDATETIME() AS DATE), lh.hanSuDung) AS soNgayConHan,
    CASE 
        WHEN lh.hanSuDung < CAST(SYSDATETIME() AS DATE) THEN N'ĐÃ HẾT HẠN'
        WHEN DATEDIFF(day, CAST(SYSDATETIME() AS DATE), lh.hanSuDung) <= 30 THEN N'CẬN DATE (<= 30 NGÀY)'
        WHEN DATEDIFF(day, CAST(SYSDATETIME() AS DATE), lh.hanSuDung) <= 90 THEN N'CẬN DATE (<= 90 NGÀY)'
        ELSE N'CÒN HẠN SỬ DỤNG'
    END AS trangThaiHanDung,
    lh.soLuongNhap,
    h.donViCoSo,
    lh.donGiaNhap,
    CAST(lh.soLuongNhap * lh.donGiaNhap AS DECIMAL(18,2)) AS thanhTienNhap,
    ISNULL(ton.tongSoLuongTon, 0) AS tongSoLuongTonHienTai,
    ISNULL(ton.tongSoLuongKhaDung, 0) AS tongSoLuongKhaDungHienTai,
    CAST(CASE WHEN lh.soLuongNhap >= ISNULL(ton.tongSoLuongTon, 0) 
              THEN lh.soLuongNhap - ISNULL(ton.tongSoLuongTon, 0) 
              ELSE 0 END AS DECIMAL(18,4)) AS soLuongDaXuatDung
FROM dbo.LoHang lh
LEFT JOIN dbo.DotNhapHang dn ON lh.maDotNhap = dn.maDotNhap
INNER JOIN dbo.HangHoaYTe h ON lh.maHang = h.maHang
LEFT JOIN dbo.Thuoc t ON h.maHang = t.maHang
LEFT JOIN (
    SELECT maLoHang, 
           SUM(soLuongTon) AS tongSoLuongTon, 
           SUM(soLuongKhaDung) AS tongSoLuongKhaDung
    FROM dbo.LoTonKho
    GROUP BY maLoHang
) ton ON lh.maLoHang = ton.maLoHang;
GO

-- 4. View Tổng hợp Lô hàng nhập từ Hãng
CREATE OR ALTER VIEW dbo.vw_TongHopLoHangNhap_TheoHang
AS
SELECT 
    dn.maDotNhap,
    dn.tenDotNhap,
    dn.hangSanXuat,
    dn.nhaCungCap,
    dn.soHoaDon,
    dn.ngayNhapKho,
    COUNT(DISTINCT lh.maHang) AS soLoaiThuocTrongLo,
    COUNT(DISTINCT lh.maLoHang) AS soLoSanXuat,
    SUM(lh.soLuongNhap) AS tongSoLuongThuocTrongLo,
    CAST(SUM(lh.soLuongNhap * lh.donGiaNhap) AS DECIMAL(18,2)) AS tongGiaTriLoHang,
    SUM(ISNULL(ton.tongSoLuongTon, 0)) AS tongSoLuongTonHienTai,
    SUM(CASE WHEN lh.hanSuDung <= DATEADD(day, 90, CAST(SYSDATETIME() AS DATE)) THEN 1 ELSE 0 END) AS soLoaiThuocCanDate,
    STRING_AGG(CONCAT(h.tenHang, ' (', CAST(CAST(lh.soLuongNhap AS BIGINT) AS NVARCHAR(20)), ' ', h.donViCoSo, ')'), N'; ') AS chiTietCacLoaiThuoc
FROM dbo.DotNhapHang dn
INNER JOIN dbo.LoHang lh ON dn.maDotNhap = lh.maDotNhap
INNER JOIN dbo.HangHoaYTe h ON lh.maHang = h.maHang
LEFT JOIN (
    SELECT maLoHang, SUM(soLuongTon) AS tongSoLuongTon
    FROM dbo.LoTonKho
    GROUP BY maLoHang
) ton ON lh.maLoHang = ton.maLoHang
GROUP BY 
    dn.maDotNhap, dn.tenDotNhap, dn.hangSanXuat, dn.nhaCungCap, dn.soHoaDon, dn.ngayNhapKho;
GO

-- 5. View Thống kê Thuốc theo từng Hãng sản xuất trên toàn viện
CREATE OR ALTER VIEW dbo.vw_ThongKeThuoc_TheoHangSanXuat
AS
SELECT 
    ISNULL(lh.hangSanXuat, lh.nhaSanXuat) AS hangSanXuat,
    lh.nuocSanXuat,
    COUNT(DISTINCT lh.maHang) AS soLoaiThuocCungUng,
    COUNT(DISTINCT lh.maLoHang) AS tongSoLoHang,
    SUM(ISNULL(ltk.soLuongTon, 0)) AS tongSoLuongTonKho,
    CAST(SUM(ISNULL(ltk.soLuongTon, 0) * lh.donGiaNhap) AS DECIMAL(18,2)) AS tongGiaTriTonKho,
    SUM(CASE WHEN lh.hanSuDung <= DATEADD(day, 90, CAST(SYSDATETIME() AS DATE)) AND ISNULL(ltk.soLuongTon,0) > 0 THEN 1 ELSE 0 END) AS soLoCanDate
FROM dbo.LoHang lh
LEFT JOIN dbo.LoTonKho ltk ON lh.maLoHang = ltk.maLoHang
GROUP BY 
    ISNULL(lh.hangSanXuat, lh.nhaSanXuat), lh.nuocSanXuat;
GO

PRINT N'--> BƯỚC 5: HOÀN TẤT ĐỒNG BỘ CẤU TRÚC VÀ VIEW!';
GO
