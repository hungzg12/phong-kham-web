/* BAN DIEU CHINH THEO 6 CHUYEN KHOA MEDICARE
CẢNH BÁO: File đầy đủ này kế thừa thao tác DROP DATABASE từ file gốc.
Chỉ dùng tạo lại database demo. Để giữ dữ liệu hiện có, dùng ClinicCare_HIS_BoSung_6ChuyenKhoa.sql.
Giữ nguyên 55 bảng, thêm dữ liệu khoa, bác sĩ, phòng khám và quyền theo khoa.
Các thủ tục, view và dữ liệu nghiệp vụ gốc chưa được sửa trong lần thay đổi danh mục này.
*/
/*
========================================================================================
BỘ MÃ KỊCH BẢN CƠ SỞ DỮ LIỆU TOÀN DIỆN (FULL T-SQL SCRIPT: DDL + DML + PROCEDURES + VIEWS)
HỆ THỐNG THÔNG TIN QUẢN LÝ BỆNH VIỆN - CLINICCARE HIS (55 BẢNG CSDL)
----------------------------------------------------------------------------------------
TRƯỜNG ĐẠI HỌC THỦ DẦU MỘT - VIỆN CÔNG NGHỆ SỐ
Học phần: Thực hành Phân tích và Thiết kế Hướng đối tượng (OOAD) - Bài thực hành Lab 10
Giảng viên học phần: ThS. Lê Thị Thuỳ Trang
Sinh viên thực hiện: Nhóm 1
  1. Nguyễn Bình Dương  - MSSV: 2424802010319  - Lớp: D24CNTT05
  2. Nguyễn Văn Hưng    - MSSV: 2424802010356  - Lớp: D24CNTT05
Hệ quản trị CSDL: Microsoft SQL Server 2019 / 2022
Thời điểm tạo: 14/11/2026 (UTC+7)
----------------------------------------------------------------------------------------
HƯỚNG DẪN THỰC THI (CHỈ CẦN 1 FILE DUY NHẤT):
  - Mở file này bằng SQL Server Management Studio (SSMS) hoặc Azure Data Studio.
  - Kết nối tới SQL Server instance của bạn (ví dụ: localhost, .\SQLEXPRESS, .\MSSQLVESE).
  - Nhấn Execute (hoặc phím F5) để chạy toàn bộ kịch bản từ trên xuống dưới.
  
CẤU TRÚC KỊCH BẢN:
  PHẦN 1: DDL - Tạo Database ClinicCare_HIS, 55 bảng vật lý, 158 khóa ngoại, Check XOR và 14 Filtered Unique Index.
  PHẦN 2: DML - Nạp dữ liệu mẫu 55 bảng với ca bệnh lâm sàng xuyên suốt (Nguyễn Bình Dương - Viêm phổi thùy cấp).
  PHẦN 3: STORED PROCEDURES & VIEWS - Cài đặt 3 thủ tục xử lý giao dịch ACID và 3 Views báo cáo quản lý.
  PHẦN 4: DEMO KIỂM THỬ - Câu lệnh EXEC và SELECT mẫu để kiểm tra nhanh kết quả hoạt động.
========================================================================================
*/

USE master;
GO

/*
========================================================================================
PHẦN 1: DDL - TẠO CƠ SỞ DỮ LIỆU VÀ 55 BẢNG VẬT LÝ (PHYSICAL SCHEMA)
========================================================================================
*/
USE master;
GO

IF EXISTS (SELECT * FROM sys.databases WHERE name = 'ClinicCare_HIS')
BEGIN
    ALTER DATABASE ClinicCare_HIS SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ClinicCare_HIS;
END
GO

CREATE DATABASE ClinicCare_HIS;
GO

USE ClinicCare_HIS;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO

-- =====================================================================================
-- PHẦN 1: KHỞI TẠO CÁC BẢNG NỀN TẢNG (LEVEL 0 - KHÔNG CÓ PHỤ THUỘC NGOẠI)
-- =====================================================================================

-- 1. Bảng Khoa (Phân hệ 4)
-- Ghi chú: maTruongKhoa là khóa ngoại trỏ NhanVien, sẽ được bổ sung qua ALTER TABLE
IF OBJECT_ID('dbo.Khoa', 'U') IS NOT NULL DROP TABLE dbo.Khoa;
CREATE TABLE dbo.Khoa (
    maKhoa VARCHAR(20) NOT NULL PRIMARY KEY,
    tenKhoa NVARCHAR(100) NOT NULL,
    loaiKhoa VARCHAR(30) NOT NULL CHECK (loaiKhoa IN ('KHAM_BENH', 'LAM_SANG', 'CAN_LAM_SANG', 'DUOC', 'HANH_CHINH')),
    maTruongKhoa VARCHAR(20) NULL,
    viTri NVARCHAR(100) NULL,
    dangHoatDong BIT NOT NULL DEFAULT 1
);
GO

-- 2. Bảng BenhNhan (Phân hệ 1)
IF OBJECT_ID('dbo.BenhNhan', 'U') IS NOT NULL DROP TABLE dbo.BenhNhan;
CREATE TABLE dbo.BenhNhan (
    maBenhNhan VARCHAR(20) NOT NULL PRIMARY KEY,
    hoTen NVARCHAR(100) NOT NULL,
    ngaySinh DATE NULL,
    gioiTinh NVARCHAR(10) NOT NULL DEFAULT N'Chưa rõ' CHECK (gioiTinh IN (N'Nam', N'Nữ', N'Khác', N'Chưa rõ')),
    soDinhDanh VARCHAR(12) NULL,
    soBHYT VARCHAR(15) NULL,
    soDienThoai VARCHAR(20) NULL,
    diaChi NVARCHAR(255) NULL,
    tienSuBenh NVARCHAR(MAX) NULL,
    trangThaiDiUng VARCHAR(20) NOT NULL DEFAULT 'CHUA_KHAI_THAC' CHECK (trangThaiDiUng IN ('CHUA_KHAI_THAC', 'KHONG_GHI_NHAN', 'CO_DI_UNG')),
    diUngThuoc NVARCHAR(MAX) NULL,
    trangThaiXacMinh VARCHAR(20) NOT NULL DEFAULT 'CHUA_XAC_MINH' CHECK (trangThaiXacMinh IN ('CHUA_XAC_MINH', 'DA_XAC_MINH')),
    ngayTiepNhanDauTien DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT CK_BenhNhan_DiUng CHECK (trangThaiDiUng != 'CO_DI_UNG' OR diUngThuoc IS NOT NULL)
);
GO

-- 3. Bảng VaiTro (Phân hệ 4)
IF OBJECT_ID('dbo.VaiTro', 'U') IS NOT NULL DROP TABLE dbo.VaiTro;
CREATE TABLE dbo.VaiTro (
    maVaiTro VARCHAR(20) NOT NULL PRIMARY KEY,
    tenVaiTro NVARCHAR(100) NOT NULL,
    moTa NVARCHAR(255) NULL,
    dangHoatDong BIT NOT NULL DEFAULT 1
);
GO

-- 4. Bảng Quyen (Phân hệ 4)
IF OBJECT_ID('dbo.Quyen', 'U') IS NOT NULL DROP TABLE dbo.Quyen;
CREATE TABLE dbo.Quyen (
    maQuyen VARCHAR(50) NOT NULL PRIMARY KEY,
    tenQuyen NVARCHAR(100) NOT NULL,
    taiNguyen VARCHAR(50) NOT NULL,
    hanhDong VARCHAR(30) NOT NULL,
    moTa NVARCHAR(255) NULL
);
GO

-- 5. Bảng HangHoaYTe (Phân hệ 3 - Bảng cha Table-Per-Type)
IF OBJECT_ID('dbo.HangHoaYTe', 'U') IS NOT NULL DROP TABLE dbo.HangHoaYTe;
CREATE TABLE dbo.HangHoaYTe (
    maHang VARCHAR(20) NOT NULL PRIMARY KEY,
    tenHang NVARCHAR(150) NOT NULL,
    donViCoSo NVARCHAR(30) NOT NULL,
    loaiHang VARCHAR(20) NOT NULL CHECK (loaiHang IN ('THUOC', 'VAT_TU')),
    donGiaNhapBinhQuan DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (donGiaNhapBinhQuan >= 0),
    donGiaXuatCoSo DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (donGiaXuatCoSo >= 0),
    giaBHYT DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (giaBHYT >= 0),
    dangKinhDoanh BIT NOT NULL DEFAULT 1,
    CONSTRAINT UQ_HangHoa_Loai UNIQUE (maHang, loaiHang)
);
GO

-- =====================================================================================
-- PHẦN 2: CÁC THỰC THỂ QUẢN TRỊ, NHÂN SỰ VÀ DANH MỤC CƠ BẢN (LEVEL 1)
-- =====================================================================================

-- 6. Bảng NhanVien (Phân hệ 4)
IF OBJECT_ID('dbo.NhanVien', 'U') IS NOT NULL DROP TABLE dbo.NhanVien;
CREATE TABLE dbo.NhanVien (
    maNhanVien VARCHAR(20) NOT NULL PRIMARY KEY,
    hoTen NVARCHAR(100) NOT NULL,
    maKhoa VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    chucDanh NVARCHAR(100) NOT NULL,
    chuyenMon VARCHAR(30) NOT NULL CHECK (chuyenMon IN ('BAC_SI', 'DIEU_DUONG', 'DUOC_SI', 'KY_THUAT_VIEN', 'THU_NGAN', 'QUAN_TRI', 'KY_SU')),
    soChungChiHanhNghe VARCHAR(50) NULL,
    soDienThoai VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    dangLamViec BIT NOT NULL DEFAULT 1
);
GO

-- 7. Bảng BuongKham (Phân hệ 1)
IF OBJECT_ID('dbo.BuongKham', 'U') IS NOT NULL DROP TABLE dbo.BuongKham;
CREATE TABLE dbo.BuongKham (
    maBuong VARCHAR(20) NOT NULL PRIMARY KEY,
    maKhoa VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    tenBuong NVARCHAR(100) NOT NULL,
    viTri NVARCHAR(100) NULL,
    gioiHanLuotMoiNgay INT NOT NULL DEFAULT 50 CHECK (gioiHanLuotMoiNgay > 0),
    dangHoatDong BIT NOT NULL DEFAULT 1
);
GO

-- 8. Bảng BuongBenh (Phân hệ 2)
IF OBJECT_ID('dbo.BuongBenh', 'U') IS NOT NULL DROP TABLE dbo.BuongBenh;
CREATE TABLE dbo.BuongBenh (
    maBuongBenh VARCHAR(20) NOT NULL PRIMARY KEY,
    maKhoa VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    tenBuong NVARCHAR(100) NOT NULL,
    loaiBuong VARCHAR(30) NOT NULL DEFAULT 'TIEU_CHUAN' CHECK (loaiBuong IN ('TIEU_CHUAN', 'DICH_VU', 'CACH_LY', 'HOI_SUC')),
    soGiuongToiDa INT NOT NULL DEFAULT 4 CHECK (soGiuongToiDa > 0),
    viTri NVARCHAR(100) NULL,
    dangHoatDong BIT NOT NULL DEFAULT 1
);
GO

-- 9. Bảng KhoDuoc (Phân hệ 3)
IF OBJECT_ID('dbo.KhoDuoc', 'U') IS NOT NULL DROP TABLE dbo.KhoDuoc;
CREATE TABLE dbo.KhoDuoc (
    maKho VARCHAR(20) NOT NULL PRIMARY KEY,
    tenKho NVARCHAR(100) NOT NULL,
    maKhoa VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    loaiKho VARCHAR(30) NOT NULL CHECK (loaiKho IN ('KHO_TONG', 'KHO_LE_NGOAI_TRU', 'KHO_NOI_TRU', 'TU_TRUC_KHOA')),
    viTri NVARCHAR(100) NULL,
    maKiemKeDangMo VARCHAR(20) NULL,
    dangKiemKe AS (CASE WHEN maKiemKeDangMo IS NOT NULL THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END),
    dangHoatDong BIT NOT NULL DEFAULT 1
);
GO

-- 10. Bảng ThietBiYTe (Phân hệ 4)
IF OBJECT_ID('dbo.ThietBiYTe', 'U') IS NOT NULL DROP TABLE dbo.ThietBiYTe;
CREATE TABLE dbo.ThietBiYTe (
    maThietBi VARCHAR(20) NOT NULL PRIMARY KEY,
    tenThietBi NVARCHAR(150) NOT NULL,
    maKhoaQuanLy VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    hangSanXuat NVARCHAR(100) NULL,
    nuocSanXuat NVARCHAR(100) NULL,
    namSanXuat INT NULL,
    ngayDuaVaoSuDung DATE NOT NULL,
    soSerial VARCHAR(50) NULL,
    trangThai VARCHAR(30) NOT NULL DEFAULT 'HOAT_DONG' CHECK (trangThai IN ('HOAT_DONG', 'BAO_HONG', 'DANG_BAO_TRI', 'NGUNG_SU_DUNG', 'THANH_LY')),
    dangHoatDong BIT NOT NULL DEFAULT 1
);
GO

-- 11. Bảng TaiKhoan (Phân hệ 4)
IF OBJECT_ID('dbo.TaiKhoan', 'U') IS NOT NULL DROP TABLE dbo.TaiKhoan;
CREATE TABLE dbo.TaiKhoan (
    maTaiKhoan VARCHAR(20) NOT NULL PRIMARY KEY,
    tenDangNhap VARCHAR(50) NOT NULL UNIQUE,
    matKhauHash VARCHAR(255) NOT NULL,
    loaiChuThe VARCHAR(20) NOT NULL CHECK (loaiChuThe IN ('NHAN_VIEN', 'NGUOI_BENH')),
    maNhanVien VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    maBenhNhan VARCHAR(20) NULL REFERENCES dbo.BenhNhan(maBenhNhan),
    trangThai VARCHAR(20) NOT NULL DEFAULT 'HOAT_DONG' CHECK (trangThai IN ('HOAT_DONG', 'KHOA_TAM_THOI', 'VO_HIEU_HOA')),
    ngayTao DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    lanDangNhapCuoi DATETIME2(0) NULL,
    CONSTRAINT CK_TaiKhoan_XOR CHECK ((maNhanVien IS NOT NULL AND maBenhNhan IS NULL) OR (maNhanVien IS NULL AND maBenhNhan IS NOT NULL))
);
GO

-- 12. Bảng VaiTroQuyen (Phân hệ 4 - Quan hệ N:N)
IF OBJECT_ID('dbo.VaiTroQuyen', 'U') IS NOT NULL DROP TABLE dbo.VaiTroQuyen;
CREATE TABLE dbo.VaiTroQuyen (
    maCapQuyen VARCHAR(20) NOT NULL PRIMARY KEY,
    maVaiTro VARCHAR(20) NOT NULL REFERENCES dbo.VaiTro(maVaiTro),
    maQuyen VARCHAR(50) NOT NULL REFERENCES dbo.Quyen(maQuyen),
    ngayCap DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    trangThai VARCHAR(20) NOT NULL DEFAULT 'HIEU_LUC' CHECK (trangThai IN ('HIEU_LUC', 'DA_THU_HOI')),
    maNguoiCap VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    maNguoiThuHoi VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    CONSTRAINT UQ_VaiTroQuyen UNIQUE (maVaiTro, maQuyen)
);
GO

-- 13. Bảng TaiKhoanVaiTro (Phân hệ 4 - Quan hệ N:N)
IF OBJECT_ID('dbo.TaiKhoanVaiTro', 'U') IS NOT NULL DROP TABLE dbo.TaiKhoanVaiTro;
CREATE TABLE dbo.TaiKhoanVaiTro (
    maGanVaiTro VARCHAR(20) NOT NULL PRIMARY KEY,
    maTaiKhoan VARCHAR(20) NOT NULL REFERENCES dbo.TaiKhoan(maTaiKhoan),
    maVaiTro VARCHAR(20) NOT NULL REFERENCES dbo.VaiTro(maVaiTro),
    maKhoaPhamVi VARCHAR(20) NULL REFERENCES dbo.Khoa(maKhoa),
    ngayHieuLuc DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    ngayHetHan DATETIME2(0) NULL,
    trangThai VARCHAR(20) NOT NULL DEFAULT 'HIEU_LUC' CHECK (trangThai IN ('HIEU_LUC', 'DA_THU_HOI', 'HET_HAN')),
    maNguoiCap VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    maNguoiThuHoi VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    CONSTRAINT CK_TaiKhoanVaiTro_Han CHECK (ngayHetHan IS NULL OR ngayHetHan >= ngayHieuLuc)
);
GO

-- 14. Bảng Thuoc (Phân hệ 3 - Bảng con TPT)
IF OBJECT_ID('dbo.Thuoc', 'U') IS NOT NULL DROP TABLE dbo.Thuoc;
CREATE TABLE dbo.Thuoc (
    maHang VARCHAR(20) NOT NULL PRIMARY KEY,
    loaiHang VARCHAR(20) NOT NULL DEFAULT 'THUOC' CHECK (loaiHang = 'THUOC'),
    hoatChat NVARCHAR(150) NOT NULL,
    hamLuong NVARCHAR(100) NOT NULL,
    duongDung NVARCHAR(100) NOT NULL,
    dangBaoChe NVARCHAR(100) NOT NULL,
    nhomDoc NVARCHAR(100) NULL,
    CONSTRAINT FK_Thuoc_Cha FOREIGN KEY (maHang, loaiHang) REFERENCES dbo.HangHoaYTe(maHang, loaiHang)
);
GO

-- 15. Bảng VatTuYTe (Phân hệ 3 - Bảng con TPT)
IF OBJECT_ID('dbo.VatTuYTe', 'U') IS NOT NULL DROP TABLE dbo.VatTuYTe;
CREATE TABLE dbo.VatTuYTe (
    maHang VARCHAR(20) NOT NULL PRIMARY KEY,
    loaiHang VARCHAR(20) NOT NULL DEFAULT 'VAT_TU' CHECK (loaiHang = 'VAT_TU'),
    quyCach NVARCHAR(100) NOT NULL,
    vatLieu NVARCHAR(100) NULL,
    voTrung BIT NOT NULL DEFAULT 1,
    taiSuDung BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_VatTuYTe_Cha FOREIGN KEY (maHang, loaiHang) REFERENCES dbo.HangHoaYTe(maHang, loaiHang)
);
GO

-- 16. Bảng LoHang (Phân hệ 3)
IF OBJECT_ID('dbo.LoHang', 'U') IS NOT NULL DROP TABLE dbo.LoHang;
CREATE TABLE dbo.LoHang (
    maLoHang VARCHAR(20) NOT NULL PRIMARY KEY,
    maHang VARCHAR(20) NOT NULL REFERENCES dbo.HangHoaYTe(maHang),
    soLoNhaSanXuat VARCHAR(50) NOT NULL,
    ngaySanXuat DATE NOT NULL,
    hanSuDung DATE NOT NULL,
    nhaCungCap NVARCHAR(150) NULL,
    nhaSanXuat NVARCHAR(150) NULL,
    donGiaNhap DECIMAL(18,2) NOT NULL CHECK (donGiaNhap >= 0),
    CONSTRAINT CK_LoHang_HanDung CHECK (hanSuDung >= ngaySanXuat)
);
GO

-- 17. Bảng QuyDoiDonVi (Phân hệ 3)
IF OBJECT_ID('dbo.QuyDoiDonVi', 'U') IS NOT NULL DROP TABLE dbo.QuyDoiDonVi;
CREATE TABLE dbo.QuyDoiDonVi (
    maQuyDoi VARCHAR(20) NOT NULL PRIMARY KEY,
    maHang VARCHAR(20) NOT NULL REFERENCES dbo.HangHoaYTe(maHang),
    tenDonViQuyDoi NVARCHAR(30) NOT NULL,
    heSoQuyDoi DECIMAL(28,8) NOT NULL CHECK (heSoQuyDoi > 0),
    tuNgay DATETIME2(0) NOT NULL,
    denNgay DATETIME2(0) NULL,
    maNguoiDuyet VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    CONSTRAINT CK_QuyDoi_ThoiGian CHECK (denNgay IS NULL OR denNgay >= tuNgay)
);
GO

-- 18. Bảng DichVuKyThuat (Phân hệ 1)
IF OBJECT_ID('dbo.DichVuKyThuat', 'U') IS NOT NULL DROP TABLE dbo.DichVuKyThuat;
CREATE TABLE dbo.DichVuKyThuat (
    maDichVu VARCHAR(20) NOT NULL PRIMARY KEY,
    tenDichVu NVARCHAR(150) NOT NULL,
    maKhoaThucHien VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    loaiDichVu VARCHAR(30) NOT NULL CHECK (loaiDichVu IN ('XET_NGHIEM', 'CDHA', 'THU_THUAT', 'PHAU_THUAT')),
    loaiKetQua VARCHAR(20) NOT NULL CHECK (loaiKetQua IN ('XET_NGHIEM', 'MO_TA')),
    donGia DECIMAL(18,2) NOT NULL CHECK (donGia >= 0),
    giaBHYT DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (giaBHYT >= 0),
    thoiGianTrungBinhPhut INT NOT NULL DEFAULT 30 CHECK (thoiGianTrungBinhPhut > 0),
    dangHoatDong BIT NOT NULL DEFAULT 1
);
GO

-- 19. Bảng BoDemSoThuTuKham (Phân hệ 1 - Bảng kỹ thuật)
IF OBJECT_ID('dbo.BoDemSoThuTuKham', 'U') IS NOT NULL DROP TABLE dbo.BoDemSoThuTuKham;
CREATE TABLE dbo.BoDemSoThuTuKham (
    maBuong VARCHAR(20) NOT NULL REFERENCES dbo.BuongKham(maBuong),
    ngayCapSo DATE NOT NULL,
    soCuoi INT NOT NULL DEFAULT 0 CHECK (soCuoi >= 0),
    PRIMARY KEY (maBuong, ngayCapSo)
);
GO

-- 20. Bảng GiuongBenh (Phân hệ 2)
IF OBJECT_ID('dbo.GiuongBenh', 'U') IS NOT NULL DROP TABLE dbo.GiuongBenh;
CREATE TABLE dbo.GiuongBenh (
    maGiuong VARCHAR(20) NOT NULL PRIMARY KEY,
    maBuongBenh VARCHAR(20) NOT NULL REFERENCES dbo.BuongBenh(maBuongBenh),
    soHieuGiuong VARCHAR(20) NOT NULL,
    loaiGiuong VARCHAR(30) NOT NULL DEFAULT 'THUONG' CHECK (loaiGiuong IN ('THUONG', 'CAP_CUU', 'HOI_SUC_VIP')),
    donGiaNgay DECIMAL(18,2) NOT NULL CHECK (donGiaNgay >= 0),
    trangThaiHienTai VARCHAR(30) NOT NULL DEFAULT 'TRONG' CHECK (trangThaiHienTai IN ('TRONG', 'DANG_SU_DUNG', 'DANG_VE_SINH', 'BAO_TRI', 'KHOA')),
    dangHoatDong BIT NOT NULL DEFAULT 1,
    CONSTRAINT UQ_Giuong_BuongSo UNIQUE (maBuongBenh, soHieuGiuong)
);
GO

-- 21. Bảng PhieuBaoHong (Phân hệ 4)
IF OBJECT_ID('dbo.PhieuBaoHong', 'U') IS NOT NULL DROP TABLE dbo.PhieuBaoHong;
CREATE TABLE dbo.PhieuBaoHong (
    maBaoHong VARCHAR(20) NOT NULL PRIMARY KEY,
    maThietBi VARCHAR(20) NOT NULL REFERENCES dbo.ThietBiYTe(maThietBi),
    thoiDiemBao DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maNguoiBao VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    moTaSuCo NVARCHAR(MAX) NOT NULL,
    mucDoUuTien VARCHAR(20) NOT NULL DEFAULT 'THUONG' CHECK (mucDoUuTien IN ('THAP', 'THUONG', 'CAO', 'KHAN_CAP')),
    trangThai VARCHAR(30) NOT NULL DEFAULT 'CHO_TIEP_NHAN' CHECK (trangThai IN ('CHO_TIEP_NHAN', 'DA_TIEP_NHAN', 'DANG_SUA_CHUA', 'DA_KHAC_PHUC', 'KHONG_THE_SUA')),
    maNguoiTiepNhan VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemTiepNhan DATETIME2(0) NULL
);
GO

-- 22. Bảng BienBanBaoTri (Phân hệ 4)
IF OBJECT_ID('dbo.BienBanBaoTri', 'U') IS NOT NULL DROP TABLE dbo.BienBanBaoTri;
CREATE TABLE dbo.BienBanBaoTri (
    maBaoTri VARCHAR(20) NOT NULL PRIMARY KEY,
    maThietBi VARCHAR(20) NOT NULL REFERENCES dbo.ThietBiYTe(maThietBi),
    maBaoHong VARCHAR(20) NULL REFERENCES dbo.PhieuBaoHong(maBaoHong),
    loaiBaoTri VARCHAR(30) NOT NULL CHECK (loaiBaoTri IN ('DINH_KY', 'SUA_CHUA_SU_CO', 'HIEU_CHUAN_KIEM_DINH')),
    thoiDiemBatDau DATETIME2(0) NOT NULL,
    thoiDiemKetThuc DATETIME2(0) NULL,
    maKySuThucHien VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    donViBaoTriNgoai NVARCHAR(150) NULL,
    noiDungThucHien NVARCHAR(MAX) NOT NULL,
    ketQuaBaoTri VARCHAR(30) NOT NULL DEFAULT 'HOAN_TAT' CHECK (ketQuaBaoTri IN ('HOAN_TAT', 'CHUA_DAT', 'CHO_LINH_KIEN')),
    chiPhiSuaChua DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (chiPhiSuaChua >= 0),
    maNguoiNghiemThu VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemNghiemThu DATETIME2(0) NULL,
    danhGiaNghiemThu NVARCHAR(500) NULL,
    CONSTRAINT CK_BaoTri_ThoiGian CHECK (thoiDiemKetThuc IS NULL OR thoiDiemKetThuc >= thoiDiemBatDau)
);
GO

-- 23. Bảng BaoCaoVienPhi (Phân hệ 4)
IF OBJECT_ID('dbo.BaoCaoVienPhi', 'U') IS NOT NULL DROP TABLE dbo.BaoCaoVienPhi;
CREATE TABLE dbo.BaoCaoVienPhi (
    maBaoCao VARCHAR(20) NOT NULL PRIMARY KEY,
    maCaTruc VARCHAR(30) NOT NULL UNIQUE,
    quayThuTien NVARCHAR(50) NOT NULL,
    maThuNgan VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemMoCa DATETIME2(0) NOT NULL,
    thoiDiemDongCa DATETIME2(0) NULL,
    tienDauCa DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tienDauCa >= 0),
    tongTienThuTrongCa DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tongTienThuTrongCa >= 0),
    tongTienHoanTrongCa DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tongTienHoanTrongCa >= 0),
    tienThucDem DECIMAL(18,2) NULL CHECK (tienThucDem IS NULL OR tienThucDem >= 0),
    chenhLech AS (tienThucDem - (tienDauCa + tongTienThuTrongCa - tongTienHoanTrongCa)),
    trangThai VARCHAR(20) NOT NULL DEFAULT 'DANG_MO' CHECK (trangThai IN ('DANG_MO', 'DA_DONG', 'DA_DOI_SOAT', 'DA_KHOA')),
    maNguoiDoiSoat VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    ghiChu NVARCHAR(500) NULL
);
GO

-- 24. Bảng NhatKyThayDoi (Phân hệ 1 - Bảng kỹ thuật kiểm toán)
IF OBJECT_ID('dbo.NhatKyThayDoi', 'U') IS NOT NULL DROP TABLE dbo.NhatKyThayDoi;
CREATE TABLE dbo.NhatKyThayDoi (
    maNhatKy BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    loaiDoiTuong VARCHAR(50) NOT NULL,
    maDoiTuong VARCHAR(100) NOT NULL,
    hanhDong VARCHAR(40) NOT NULL,
    loaiTacNhan VARCHAR(20) NOT NULL CHECK (loaiTacNhan IN ('NHAN_VIEN', 'NGUOI_BENH', 'DICH_VU')),
    maTaiKhoan VARCHAR(20) NULL REFERENCES dbo.TaiKhoan(maTaiKhoan),
    maNguoiThucHien VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    maDichVuNguon VARCHAR(50) NULL,
    maTuongQuan VARCHAR(100) NULL,
    ketQua VARCHAR(20) NOT NULL CHECK (ketQua IN ('THANH_CONG', 'THAT_BAI')),
    thoiDiem DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    lyDo NVARCHAR(500) NULL,
    duLieuTruoc NVARCHAR(MAX) NULL,
    duLieuSau NVARCHAR(MAX) NULL
);
GO

-- =====================================================================================
-- PHẦN 3: LỊCH HẸN, TIẾP NHẬN, KHÁM BỆNH VÀ NỘI TRÚ (LEVEL 2)
-- =====================================================================================

-- 25. Bảng LichHen (Phân hệ 4)
IF OBJECT_ID('dbo.LichHen', 'U') IS NOT NULL DROP TABLE dbo.LichHen;
CREATE TABLE dbo.LichHen (
    maHen VARCHAR(20) NOT NULL PRIMARY KEY,
    maBenhNhan VARCHAR(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
    maKhoa VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    maBuong VARCHAR(20) NOT NULL REFERENCES dbo.BuongKham(maBuong),
    maBacSiDuKien VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    ngayHen DATE NOT NULL,
    gioHenDuKien TIME(0) NOT NULL,
    maQRCheckIn VARCHAR(100) NULL UNIQUE,
    soTienTraTruoc DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (soTienTraTruoc >= 0),
    trangThai VARCHAR(30) NOT NULL DEFAULT 'DA_DAT' CHECK (trangThai IN ('DA_DAT', 'DA_CHECK_IN', 'HOAN_TAT', 'DA_HUY', 'QUA_HEN')),
    thoiDiemDat DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maNguoiXacNhan VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien)
);
GO

-- 26. Bảng LuotKham (Phân hệ 1)
IF OBJECT_ID('dbo.LuotKham', 'U') IS NOT NULL DROP TABLE dbo.LuotKham;
CREATE TABLE dbo.LuotKham (
    examID VARCHAR(20) NOT NULL PRIMARY KEY,
    maBenhNhan VARCHAR(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
    maBuong VARCHAR(20) NOT NULL REFERENCES dbo.BuongKham(maBuong),
    maHen VARCHAR(20) NULL REFERENCES dbo.LichHen(maHen),
    thoiDiemDangKy DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    thoiDiemCapSo DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    ngayKham AS CAST(thoiDiemCapSo AS DATE) PERSISTED,
    soThuTu INT NOT NULL CHECK (soThuTu > 0),
    lyDoKham NVARCHAR(255) NOT NULL,
    trangThai VARCHAR(30) NOT NULL DEFAULT 'CHO_KHAM' CHECK (trangThai IN ('CHO_KHAM', 'DANG_KHAM', 'CHO_KET_QUA_CLS', 'HOAN_TAT_KHAM', 'DA_HUY')),
    thoiDiemKetThuc DATETIME2(0) NULL,
    CONSTRAINT CK_LuotKham_ThoiDiem CHECK (thoiDiemKetThuc IS NULL OR thoiDiemKetThuc >= thoiDiemDangKy)
);
GO

-- 27. Bảng DotDieuTri (Phân hệ 2)
IF OBJECT_ID('dbo.DotDieuTri', 'U') IS NOT NULL DROP TABLE dbo.DotDieuTri;
CREATE TABLE dbo.DotDieuTri (
    admissionID VARCHAR(20) NOT NULL PRIMARY KEY,
    maBenhNhan VARCHAR(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
    examID VARCHAR(20) NULL REFERENCES dbo.LuotKham(examID),
    maKhoaDieuTri VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    thoiDiemNhapVien DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    lyDoNhapVien NVARCHAR(500) NOT NULL,
    chanDoanVaoVien NVARCHAR(500) NOT NULL,
    maICDVaoVien VARCHAR(20) NULL,
    maBacSiDieuTriChinh VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    soToCuoi INT NOT NULL DEFAULT 0 CHECK (soToCuoi >= 0),
    trangThai VARCHAR(30) NOT NULL DEFAULT 'DANG_DIEU_TRI' CHECK (trangThai IN ('DANG_DIEU_TRI', 'CHO_XUAT_VIEN', 'DA_XUAT_VIEN', 'CHUYEN_VIEN', 'TU_VONG', 'BO_VIEN', 'DA_HUY')),
    thoiDiemRaVien DATETIME2(0) NULL,
    chanDoanRaVien NVARCHAR(500) NULL,
    maICDRaVien VARCHAR(20) NULL,
    ketQuaDieuTri VARCHAR(30) NULL CHECK (ketQuaDieuTri IS NULL OR ketQuaDieuTri IN ('KHOI', 'DO_GIAM', 'KHONG_THAY_DOI', 'NANG_HON', 'TU_VONG')),
    loiDanRaVien NVARCHAR(500) NULL,
    tienTamUngHienTai DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tienTamUngHienTai >= 0),
    tongChiPhiHienTai DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tongChiPhiHienTai >= 0),
    ghiChu NVARCHAR(500) NULL,
    thoiDiemDongDot DATETIME2(0) NULL,
    CONSTRAINT CK_DotDieuTri_ThoiDiem CHECK (thoiDiemRaVien IS NULL OR thoiDiemRaVien >= thoiDiemNhapVien)
);
GO

-- 28. Bảng LoTonKho (Phân hệ 3)
IF OBJECT_ID('dbo.LoTonKho', 'U') IS NOT NULL DROP TABLE dbo.LoTonKho;
CREATE TABLE dbo.LoTonKho (
    maLoTon VARCHAR(20) NOT NULL PRIMARY KEY,
    maKho VARCHAR(20) NOT NULL REFERENCES dbo.KhoDuoc(maKho),
    maLoHang VARCHAR(20) NOT NULL REFERENCES dbo.LoHang(maLoHang),
    soLuongTon DECIMAL(18,4) NOT NULL DEFAULT 0 CHECK (soLuongTon >= 0),
    soLuongKhaDung DECIMAL(18,4) NOT NULL DEFAULT 0 CHECK (soLuongKhaDung >= 0),
    viTriDayKe NVARCHAR(50) NULL,
    trangThaiKhoa BIT NOT NULL DEFAULT 0,
    CONSTRAINT CK_LoTon_KhaDung CHECK (soLuongKhaDung <= soLuongTon)
);
GO

-- 29. Bảng KiemKeKho (Phân hệ 3)
IF OBJECT_ID('dbo.KiemKeKho', 'U') IS NOT NULL DROP TABLE dbo.KiemKeKho;
CREATE TABLE dbo.KiemKeKho (
    maKyKiemKe VARCHAR(20) NOT NULL PRIMARY KEY,
    maKho VARCHAR(20) NOT NULL REFERENCES dbo.KhoDuoc(maKho),
    thoiDiemBatDau DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    thoiDiemKetThuc DATETIME2(0) NULL,
    maNguoiLap VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    trangThai VARCHAR(30) NOT NULL DEFAULT 'DANG_KIEM_KE' CHECK (trangThai IN ('DANG_KIEM_KE', 'DA_HOAN_TAT', 'DA_CAN_BANG', 'DA_HUY')),
    maNguoiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDuyet DATETIME2(0) NULL,
    ghiChu NVARCHAR(500) NULL
);
GO

-- 30. Bảng ChiTietKiemKe (Phân hệ 3)
IF OBJECT_ID('dbo.ChiTietKiemKe', 'U') IS NOT NULL DROP TABLE dbo.ChiTietKiemKe;
CREATE TABLE dbo.ChiTietKiemKe (
    maKyKiemKe VARCHAR(20) NOT NULL REFERENCES dbo.KiemKeKho(maKyKiemKe),
    maLoTon VARCHAR(20) NOT NULL REFERENCES dbo.LoTonKho(maLoTon),
    tonLyThuyet DECIMAL(18,4) NOT NULL CHECK (tonLyThuyet >= 0),
    tonThucTe DECIMAL(18,4) NULL CHECK (tonThucTe IS NULL OR tonThucTe >= 0),
    chenhLech AS (tonThucTe - tonLyThuyet),
    lyDoChenhLech NVARCHAR(255) NULL,
    PRIMARY KEY (maKyKiemKe, maLoTon)
);
GO

-- =====================================================================================
-- PHẦN 4: HỒ SƠ LÂM SÀNG, CHỈ ĐỊNH CLS, GIƯỜNG VÀ ĐƠN THUỐC (LEVEL 3)
-- =====================================================================================

-- 31. Bảng PhieuSinhHieu (Phân hệ 1)
IF OBJECT_ID('dbo.PhieuSinhHieu', 'U') IS NOT NULL DROP TABLE dbo.PhieuSinhHieu;
CREATE TABLE dbo.PhieuSinhHieu (
    maPhieu VARCHAR(20) NOT NULL PRIMARY KEY,
    examID VARCHAR(20) NOT NULL REFERENCES dbo.LuotKham(examID),
    maNhanVien VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDo DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    mach INT NULL CHECK (mach IS NULL OR mach BETWEEN 30 AND 250),
    nhietDo DECIMAL(4,1) NULL CHECK (nhietDo IS NULL OR nhietDo BETWEEN 30.0 AND 45.0),
    huyetApTamThu INT NULL CHECK (huyetApTamThu IS NULL OR huyetApTamThu BETWEEN 40 AND 300),
    huyetApTamTruong INT NULL CHECK (huyetApTamTruong IS NULL OR huyetApTamTruong BETWEEN 20 AND 200),
    nhipTho INT NULL CHECK (nhipTho IS NULL OR nhipTho BETWEEN 8 AND 60),
    spo2 DECIMAL(4,1) NULL CHECK (spo2 IS NULL OR spo2 BETWEEN 50.0 AND 100.0),
    chieuCao DECIMAL(5,1) NULL CHECK (chieuCao IS NULL OR chieuCao BETWEEN 20.0 AND 250.0),
    canNang DECIMAL(5,1) NULL CHECK (canNang IS NULL OR canNang BETWEEN 0.5 AND 300.0),
    bmi AS (CASE WHEN chieuCao > 0 AND canNang > 0 THEN ROUND(canNang / POWER(chieuCao / 100.0, 2), 2) ELSE NULL END),
    ghiChu NVARCHAR(255) NULL,
    lyDoKhongDoDu NVARCHAR(255) NULL
);
GO

-- 32. Bảng HoSoKham (Phân hệ 1)
IF OBJECT_ID('dbo.HoSoKham', 'U') IS NOT NULL DROP TABLE dbo.HoSoKham;
CREATE TABLE dbo.HoSoKham (
    maHoSoKham VARCHAR(20) NOT NULL PRIMARY KEY,
    examID VARCHAR(20) NOT NULL UNIQUE REFERENCES dbo.LuotKham(examID),
    maBacSi VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    benhSu NVARCHAR(MAX) NULL,
    tienSuBanThan NVARCHAR(MAX) NULL,
    tienSuGiaDinh NVARCHAR(MAX) NULL,
    khamToanThan NVARCHAR(MAX) NULL,
    khamBoPhan NVARCHAR(MAX) NULL,
    chanDoanSoBo NVARCHAR(500) NULL,
    maICDSoBo VARCHAR(20) NULL,
    chanDoanXacDinh NVARCHAR(500) NULL,
    maICDXacDinh VARCHAR(20) NULL,
    huongDieuTri NVARCHAR(500) NULL,
    loiDanBacSi NVARCHAR(500) NULL,
    thoiDiemHoanTat DATETIME2(0) NULL,
    trangThai VARCHAR(20) NOT NULL DEFAULT 'DANG_KHAM' CHECK (trangThai IN ('DANG_KHAM', 'HOAN_TAT', 'DA_KHOA'))
);
GO

-- 33. Bảng ChiDinhCLS (Phân hệ 1)
IF OBJECT_ID('dbo.ChiDinhCLS', 'U') IS NOT NULL DROP TABLE dbo.ChiDinhCLS;
CREATE TABLE dbo.ChiDinhCLS (
    orderID VARCHAR(20) NOT NULL PRIMARY KEY,
    examID VARCHAR(20) NULL REFERENCES dbo.LuotKham(examID),
    admissionID VARCHAR(20) NULL REFERENCES dbo.DotDieuTri(admissionID),
    maBacSiChiDinh VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemChiDinh DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    chanDoanLamSang NVARCHAR(500) NOT NULL,
    loaiUuTien VARCHAR(20) NOT NULL DEFAULT 'THUONG' CHECK (loaiUuTien IN ('THUONG', 'CAP_CUU')),
    trangThai VARCHAR(30) NOT NULL DEFAULT 'CHO_THUC_HIEN' CHECK (trangThai IN ('CHO_THUC_HIEN', 'DANG_THUC_HIEN', 'HOAN_TAT', 'DA_HUY')),
    ghiChu NVARCHAR(255) NULL,
    CONSTRAINT CK_ChiDinhCLS_XOR CHECK ((examID IS NOT NULL AND admissionID IS NULL) OR (examID IS NULL AND admissionID IS NOT NULL))
);
GO

-- 34. Bảng ChiTietChiDinh (Phân hệ 1)
IF OBJECT_ID('dbo.ChiTietChiDinh', 'U') IS NOT NULL DROP TABLE dbo.ChiTietChiDinh;
CREATE TABLE dbo.ChiTietChiDinh (
    maChiTiet VARCHAR(20) NOT NULL PRIMARY KEY,
    orderID VARCHAR(20) NOT NULL REFERENCES dbo.ChiDinhCLS(orderID),
    maDichVu VARCHAR(20) NOT NULL REFERENCES dbo.DichVuKyThuat(maDichVu),
    maHang VARCHAR(20) NULL REFERENCES dbo.HangHoaYTe(maHang),
    soLuong DECIMAL(18,2) NOT NULL DEFAULT 1.0 CHECK (soLuong > 0),
    donGiaApDung DECIMAL(18,2) NOT NULL CHECK (donGiaApDung >= 0),
    thanhTien AS (soLuong * donGiaApDung) PERSISTED,
    trangThai VARCHAR(30) NOT NULL DEFAULT 'CHO_THUC_HIEN' CHECK (trangThai IN ('CHO_THUC_HIEN', 'DANG_THUC_HIEN', 'CO_KET_QUA', 'DA_HUY'))
);
GO

-- 35. Bảng KetQuaCLS (Phân hệ 1 - Bảng cha TPT)
IF OBJECT_ID('dbo.KetQuaCLS', 'U') IS NOT NULL DROP TABLE dbo.KetQuaCLS;
CREATE TABLE dbo.KetQuaCLS (
    maKetQua VARCHAR(20) NOT NULL PRIMARY KEY,
    maChiTiet VARCHAR(20) NOT NULL REFERENCES dbo.ChiTietChiDinh(maChiTiet),
    loaiKetQua VARCHAR(20) NOT NULL CHECK (loaiKetQua IN ('XET_NGHIEM', 'MO_TA')),
    lanThucHien INT NOT NULL DEFAULT 1 CHECK (lanThucHien >= 1),
    phienBan INT NOT NULL DEFAULT 1 CHECK (phienBan >= 1),
    laBanHienHanh BIT NOT NULL DEFAULT 1,
    maKetQuaTruoc VARCHAR(20) NULL REFERENCES dbo.KetQuaCLS(maKetQua),
    thoiDiemCoKetQua DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maKyThuatVien VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    maBacSiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDuyet DATETIME2(0) NULL,
    trangThai VARCHAR(20) NOT NULL DEFAULT 'CHO_DUYET' CHECK (trangThai IN ('CHO_DUYET', 'DA_DUYET', 'HUY_KET_QUA')),
    ghiChuChuyenMon NVARCHAR(500) NULL,
    thietBiThucHien VARCHAR(20) NULL,
    CONSTRAINT UQ_KetQuaCLS_Loai UNIQUE (maKetQua, loaiKetQua)
);
GO

-- 36. Bảng KetQuaXetNghiem (Phân hệ 1 - Bảng con TPT)
IF OBJECT_ID('dbo.KetQuaXetNghiem', 'U') IS NOT NULL DROP TABLE dbo.KetQuaXetNghiem;
CREATE TABLE dbo.KetQuaXetNghiem (
    maKetQua VARCHAR(20) NOT NULL PRIMARY KEY,
    loaiKetQua VARCHAR(20) NOT NULL DEFAULT 'XET_NGHIEM' CHECK (loaiKetQua = 'XET_NGHIEM'),
    theTichMau NVARCHAR(50) NULL,
    chatLuongMau NVARCHAR(100) NULL,
    thoiDiemLayMau DATETIME2(0) NULL,
    nguoiLayMau VARCHAR(20) NULL,
    thoiDiemNhanMau DATETIME2(0) NULL,
    coCanhBaoNguyKich BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_KetQuaXetNghiem_Cha FOREIGN KEY (maKetQua, loaiKetQua) REFERENCES dbo.KetQuaCLS(maKetQua, loaiKetQua)
);
GO

-- 37. Bảng KetQuaMoTa (Phân hệ 1 - Bảng con TPT)
IF OBJECT_ID('dbo.KetQuaMoTa', 'U') IS NOT NULL DROP TABLE dbo.KetQuaMoTa;
CREATE TABLE dbo.KetQuaMoTa (
    maKetQua VARCHAR(20) NOT NULL PRIMARY KEY,
    loaiKetQua VARCHAR(20) NOT NULL DEFAULT 'MO_TA' CHECK (loaiKetQua = 'MO_TA'),
    vungKhaoSat NVARCHAR(150) NOT NULL,
    kyThuatChup NVARCHAR(150) NULL,
    moTaHinhAnh NVARCHAR(MAX) NOT NULL,
    ketLuan NVARCHAR(MAX) NOT NULL,
    deNghi NVARCHAR(500) NULL,
    duongDanAnhPACS NVARCHAR(500) NULL,
    soLuongAnh INT NOT NULL DEFAULT 0 CHECK (soLuongAnh >= 0),
    CONSTRAINT FK_KetQuaMoTa_Cha FOREIGN KEY (maKetQua, loaiKetQua) REFERENCES dbo.KetQuaCLS(maKetQua, loaiKetQua)
);
GO

-- 38. Bảng ChiSoXetNghiem (Phân hệ 1)
IF OBJECT_ID('dbo.ChiSoXetNghiem', 'U') IS NOT NULL DROP TABLE dbo.ChiSoXetNghiem;
CREATE TABLE dbo.ChiSoXetNghiem (
    maChiSo VARCHAR(20) NOT NULL PRIMARY KEY,
    maKetQua VARCHAR(20) NOT NULL REFERENCES dbo.KetQuaXetNghiem(maKetQua),
    maLoaiChiSo VARCHAR(30) NOT NULL,
    tenChiSo NVARCHAR(100) NOT NULL,
    giaTriDo NVARCHAR(100) NOT NULL,
    giaTriSo DECIMAL(18,4) NULL,
    donViDo NVARCHAR(30) NULL,
    khoangThamChieu NVARCHAR(100) NULL,
    giaTriMinThamChieu DECIMAL(18,4) NULL,
    giaTriMaxThamChieu DECIMAL(18,4) NULL,
    mucDoCanhBao VARCHAR(20) NOT NULL DEFAULT 'BINH_THUONG' CHECK (mucDoCanhBao IN ('BINH_THUONG', 'THAP', 'CAO', 'NGUY_KICH')),
    coCanhBao AS (CASE WHEN mucDoCanhBao = 'BINH_THUONG' THEN CAST(0 AS BIT) ELSE CAST(1 AS BIT) END)
);
GO

-- 39. Bảng PhanGiuong (Phân hệ 2)
IF OBJECT_ID('dbo.PhanGiuong', 'U') IS NOT NULL DROP TABLE dbo.PhanGiuong;
CREATE TABLE dbo.PhanGiuong (
    maPhanGiuong VARCHAR(20) NOT NULL PRIMARY KEY,
    admissionID VARCHAR(20) NOT NULL REFERENCES dbo.DotDieuTri(admissionID),
    maGiuong VARCHAR(20) NOT NULL REFERENCES dbo.GiuongBenh(maGiuong),
    tuThoiDiem DATETIME2(0) NOT NULL,
    denThoiDiem DATETIME2(0) NULL,
    donGiaApDung DECIMAL(18,2) NOT NULL CHECK (donGiaApDung >= 0),
    trangThai VARCHAR(30) NOT NULL DEFAULT 'DANG_SU_DUNG' CHECK (trangThai IN ('DANG_SU_DUNG', 'DA_KET_THUC', 'DA_HUY')),
    maNhanVienXep VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    lyDoKetThuc NVARCHAR(255) NULL,
    ghiChu NVARCHAR(255) NULL,
    CONSTRAINT CK_PhanGiuong_ThoiGian CHECK (denThoiDiem IS NULL OR denThoiDiem >= tuThoiDiem)
);
GO

-- 40. Bảng ToDieuTri (Phân hệ 2)
IF OBJECT_ID('dbo.ToDieuTri', 'U') IS NOT NULL DROP TABLE dbo.ToDieuTri;
CREATE TABLE dbo.ToDieuTri (
    maTo VARCHAR(20) NOT NULL PRIMARY KEY,
    admissionID VARCHAR(20) NOT NULL REFERENCES dbo.DotDieuTri(admissionID),
    soThuTuTo INT NOT NULL CHECK (soThuTuTo > 0),
    ngayDieuTri DATE NOT NULL,
    thoiDiemGhi DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    dienBienBenh NVARCHAR(MAX) NOT NULL,
    yLenhChung NVARCHAR(MAX) NULL,
    cheDoDinhDuong NVARCHAR(255) NULL,
    cheDoChamSoc NVARCHAR(255) NULL,
    maBacSi VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    trangThai VARCHAR(20) NOT NULL DEFAULT 'CHO_DUYET' CHECK (trangThai IN ('CHO_DUYET', 'DA_DUYET', 'DA_KHOA')),
    maBacSiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDuyet DATETIME2(0) NULL,
    CONSTRAINT UQ_ToDieuTri_SoTo UNIQUE (admissionID, soThuTuTo)
);
GO

-- 41. Bảng DonThuoc (Phân hệ 3)
IF OBJECT_ID('dbo.DonThuoc', 'U') IS NOT NULL DROP TABLE dbo.DonThuoc;
CREATE TABLE dbo.DonThuoc (
    maDon VARCHAR(20) NOT NULL PRIMARY KEY,
    examID VARCHAR(20) NULL REFERENCES dbo.LuotKham(examID),
    admissionID VARCHAR(20) NULL REFERENCES dbo.DotDieuTri(admissionID),
    loaiDon VARCHAR(30) NOT NULL CHECK (loaiDon IN ('NGOAI_TRU', 'NOI_TRU', 'RA_VIEN')),
    thoiDiemKe DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maBacSiKe VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    chanDoan NVARCHAR(500) NOT NULL,
    trangThaiCapPhat VARCHAR(30) NOT NULL DEFAULT 'CHUA_CAP' CHECK (trangThaiCapPhat IN ('CHUA_CAP', 'CAP_MOT_PHAN', 'DA_CAP_DU', 'DA_HUY')),
    loiDan NVARCHAR(500) NULL,
    maNguoiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDuyet DATETIME2(0) NULL,
    CONSTRAINT CK_DonThuoc_XOR CHECK ((examID IS NOT NULL AND admissionID IS NULL) OR (examID IS NULL AND admissionID IS NOT NULL))
);
GO

-- 42. Bảng ChiTietDonThuoc (Phân hệ 3)
IF OBJECT_ID('dbo.ChiTietDonThuoc', 'U') IS NOT NULL DROP TABLE dbo.ChiTietDonThuoc;
CREATE TABLE dbo.ChiTietDonThuoc (
    maChiTietDon VARCHAR(20) NOT NULL PRIMARY KEY,
    maDon VARCHAR(20) NOT NULL REFERENCES dbo.DonThuoc(maDon),
    maHang VARCHAR(20) NOT NULL REFERENCES dbo.Thuoc(maHang),
    soLuongKe DECIMAL(18,4) NOT NULL CHECK (soLuongKe > 0),
    donViKe NVARCHAR(30) NOT NULL,
    maQuyDoiApDung VARCHAR(20) NULL REFERENCES dbo.QuyDoiDonVi(maQuyDoi),
    cachDung NVARCHAR(255) NOT NULL,
    soNgayDung INT NOT NULL DEFAULT 1 CHECK (soNgayDung > 0),
    sang NVARCHAR(20) NULL,
    trua NVARCHAR(20) NULL,
    chieu NVARCHAR(20) NULL,
    toi NVARCHAR(20) NULL,
    donGiaKe DECIMAL(18,2) NOT NULL CHECK (donGiaKe >= 0),
    soLuongDaCap DECIMAL(18,4) NOT NULL DEFAULT 0 CHECK (soLuongDaCap >= 0),
    trangThai VARCHAR(30) NOT NULL DEFAULT 'CHUA_CAP' CHECK (trangThai IN ('CHUA_CAP', 'CAP_MOT_PHAN', 'DA_CAP_DU', 'DA_HUY'))
);
GO

-- 43. Bảng YLenh (Phân hệ 2)
IF OBJECT_ID('dbo.YLenh', 'U') IS NOT NULL DROP TABLE dbo.YLenh;
CREATE TABLE dbo.YLenh (
    maYLenh VARCHAR(20) NOT NULL PRIMARY KEY,
    maTo VARCHAR(20) NOT NULL REFERENCES dbo.ToDieuTri(maTo),
    loaiYLenh VARCHAR(30) NOT NULL CHECK (loaiYLenh IN ('THUOC', 'VAT_TU', 'DICH_TRUYEN', 'CHAM_SOC', 'DINH_DUONG', 'KHAC')),
    noiDungYLenh NVARCHAR(500) NOT NULL,
    maHang VARCHAR(20) NULL REFERENCES dbo.HangHoaYTe(maHang),
    maChiTietDonNguon VARCHAR(20) NULL REFERENCES dbo.ChiTietDonThuoc(maChiTietDon),
    coTieuHaoKho BIT NOT NULL DEFAULT 0,
    soLuongKeHoach DECIMAL(18,4) NULL CHECK (soLuongKeHoach IS NULL OR soLuongKeHoach > 0),
    donViKeHoach NVARCHAR(30) NULL,
    duongDung NVARCHAR(100) NULL,
    tocDoTruyen NVARCHAR(100) NULL,
    tanSuatDung NVARCHAR(100) NULL,
    thoiDiemBatDau DATETIME2(0) NOT NULL,
    thoiDiemKetThuc DATETIME2(0) NULL,
    trangThai VARCHAR(30) NOT NULL DEFAULT 'DANG_THUC_HIEN' CHECK (trangThai IN ('CHO_THUC_HIEN', 'DANG_THUC_HIEN', 'DA_HOAN_TAT', 'TAM_NGUNG', 'DA_HUY')),
    lyDoNgungHuy NVARCHAR(255) NULL,
    maBacSiRaYLenh VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    CONSTRAINT CK_YLenh_TieuHao CHECK (coTieuHaoKho = 0 OR (maHang IS NOT NULL AND soLuongKeHoach IS NOT NULL))
);
GO

-- 44. Bảng BienBanHoiChan (Phân hệ 2)
IF OBJECT_ID('dbo.BienBanHoiChan', 'U') IS NOT NULL DROP TABLE dbo.BienBanHoiChan;
CREATE TABLE dbo.BienBanHoiChan (
    maBienBan VARCHAR(20) NOT NULL PRIMARY KEY,
    admissionID VARCHAR(20) NOT NULL REFERENCES dbo.DotDieuTri(admissionID),
    thoiDiemHoiChan DATETIME2(0) NOT NULL,
    diaDiem NVARCHAR(200) NOT NULL,
    hinhThucHoiChan VARCHAR(30) NOT NULL DEFAULT 'KHOA' CHECK (hinhThucHoiChan IN ('KHOA', 'LIEN_KHOA', 'TOAN_VIEN', 'LIEN_VIEN')),
    lyDoHoiChan NVARCHAR(500) NOT NULL,
    maChuToa VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    maThuKy VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    tomTatDienBien NVARCHAR(MAX) NOT NULL,
    chanDoanThongNhat NVARCHAR(500) NOT NULL,
    huongDieuTriThongNhat NVARCHAR(MAX) NOT NULL,
    trangThai VARCHAR(20) NOT NULL DEFAULT 'CHO_DUYET' CHECK (trangThai IN ('DANG_SOAN', 'CHO_DUYET', 'DA_DUYET', 'DA_KHOA')),
    maNguoiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDuyet DATETIME2(0) NULL
);
GO

-- =====================================================================================
-- PHẦN 5: THỰC HIỆN Y LỆNH, KHO DƯỢC, VIỆN PHÍ VÀ BỆNH ÁN ĐIỆN TỬ (LEVEL 4)
-- =====================================================================================

-- 45. Bảng LanThucHienYLenh (Phân hệ 2)
-- Ghi chú: maPhieuXuatKho và maYeuCauDinhChinhNguon sẽ được thêm FK qua ALTER TABLE
IF OBJECT_ID('dbo.LanThucHienYLenh', 'U') IS NOT NULL DROP TABLE dbo.LanThucHienYLenh;
CREATE TABLE dbo.LanThucHienYLenh (
    maLan VARCHAR(20) NOT NULL PRIMARY KEY,
    maYLenh VARCHAR(20) NOT NULL REFERENCES dbo.YLenh(maYLenh),
    lanThu INT NOT NULL DEFAULT 1 CHECK (lanThu >= 1),
    thoiDiemKeHoach DATETIME2(0) NOT NULL,
    thoiDiemThucHien DATETIME2(0) NULL,
    thoiDiemGhiNhan DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maNhanVienThucHien VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    ketQuaThucHien NVARCHAR(500) NULL,
    dienBienBatThuong NVARCHAR(500) NULL,
    maLoTon VARCHAR(20) NULL REFERENCES dbo.LoTonKho(maLoTon),
    maKhoTieuHao VARCHAR(20) NULL REFERENCES dbo.KhoDuoc(maKho),
    soLuongThucDung DECIMAL(18,4) NULL CHECK (soLuongThucDung IS NULL OR soLuongThucDung > 0),
    donViThucDung NVARCHAR(30) NULL,
    maQuyDoiApDung VARCHAR(20) NULL REFERENCES dbo.QuyDoiDonVi(maQuyDoi),
    maPhieuXuatKho VARCHAR(20) NULL,
    trangThaiLamSang VARCHAR(30) NOT NULL DEFAULT 'DA_THUC_HIEN' CHECK (trangThaiLamSang IN ('CHO_THUC_HIEN', 'DA_THUC_HIEN', 'KHONG_THUC_HIEN_DUOC', 'BENH_NHAN_TU_CHOI')),
    trangThaiKho VARCHAR(30) NOT NULL DEFAULT 'KHONG_AP_DUNG' CHECK (trangThaiKho IN ('KHONG_AP_DUNG', 'CHO_XU_LY_KHO', 'DA_HACH_TOAN', 'LOI_HACH_TOAN')),
    daTruTonKho AS (CASE WHEN trangThaiKho = 'DA_HACH_TOAN' THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END),
    maYeuCauDinhChinhNguon VARCHAR(20) NULL,
    ghiChu NVARCHAR(255) NULL,
    CONSTRAINT UQ_LanThucHien_Cu UNIQUE (maYLenh, lanThu)
);
GO

-- 46. Bảng PhieuKho (Phân hệ 3)
IF OBJECT_ID('dbo.PhieuKho', 'U') IS NOT NULL DROP TABLE dbo.PhieuKho;
CREATE TABLE dbo.PhieuKho (
    maPhieu VARCHAR(20) NOT NULL PRIMARY KEY,
    loaiPhieu VARCHAR(30) NOT NULL CHECK (loaiPhieu IN ('NHAP_KHO', 'XUAT_DON', 'XUAT_TIEU_HAO_NOI_TRU', 'CHUYEN_KHO', 'HOAN_TRA', 'XUAT_HUY', 'XU_LY_KIEM_KE')),
    maKhoNguon VARCHAR(20) NULL REFERENCES dbo.KhoDuoc(maKho),
    maKhoDich VARCHAR(20) NULL REFERENCES dbo.KhoDuoc(maKho),
    examID VARCHAR(20) NULL REFERENCES dbo.LuotKham(examID),
    admissionID VARCHAR(20) NULL REFERENCES dbo.DotDieuTri(admissionID),
    maLanNguon VARCHAR(20) NULL REFERENCES dbo.LanThucHienYLenh(maLan),
    maKiemKeNguon VARCHAR(20) NULL REFERENCES dbo.KiemKeKho(maKyKiemKe),
    maPhieuGoc VARCHAR(20) NULL REFERENCES dbo.PhieuKho(maPhieu),
    thoiDiemLap DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maNguoiLap VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    trangThai VARCHAR(30) NOT NULL DEFAULT 'CHO_DUYET' CHECK (trangThai IN ('DANG_LAP', 'CHO_DUYET', 'DA_XUAT', 'DA_NHAP', 'DA_HUY')),
    maNguoiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDuyet DATETIME2(0) NULL,
    ghiChu NVARCHAR(500) NULL
);
GO

-- 47. Bảng ChiTietPhieuKho (Phân hệ 3)
IF OBJECT_ID('dbo.ChiTietPhieuKho', 'U') IS NOT NULL DROP TABLE dbo.ChiTietPhieuKho;
CREATE TABLE dbo.ChiTietPhieuKho (
    maChiTietKho VARCHAR(20) NOT NULL PRIMARY KEY,
    maPhieu VARCHAR(20) NOT NULL REFERENCES dbo.PhieuKho(maPhieu),
    maLoTon VARCHAR(20) NOT NULL REFERENCES dbo.LoTonKho(maLoTon),
    maChiTietDonNguon VARCHAR(20) NULL REFERENCES dbo.ChiTietDonThuoc(maChiTietDon),
    maChiTietGoc VARCHAR(20) NULL REFERENCES dbo.ChiTietPhieuKho(maChiTietKho),
    soLuong DECIMAL(18,4) NOT NULL CHECK (soLuong > 0),
    donViXuat NVARCHAR(30) NOT NULL,
    maQuyDoiApDung VARCHAR(20) NULL REFERENCES dbo.QuyDoiDonVi(maQuyDoi),
    soLuongCoSo DECIMAL(18,4) NOT NULL CHECK (soLuongCoSo > 0),
    donGiaVatLy DECIMAL(18,2) NOT NULL CHECK (donGiaVatLy >= 0),
    thanhTien AS (soLuongCoSo * donGiaVatLy) PERSISTED,
    soLuongDaHoan DECIMAL(18,4) NOT NULL DEFAULT 0 CHECK (soLuongDaHoan >= 0)
);
GO

-- 48. Bảng QuyetToan (Phân hệ 3)
IF OBJECT_ID('dbo.QuyetToan', 'U') IS NOT NULL DROP TABLE dbo.QuyetToan;
CREATE TABLE dbo.QuyetToan (
    maQuyetToan VARCHAR(20) NOT NULL PRIMARY KEY,
    examID VARCHAR(20) NULL REFERENCES dbo.LuotKham(examID),
    admissionID VARCHAR(20) NULL REFERENCES dbo.DotDieuTri(admissionID),
    phienBan INT NOT NULL DEFAULT 1 CHECK (phienBan >= 1),
    laBanHienHanh BIT NOT NULL DEFAULT 1,
    maQuyetToanTruoc VARCHAR(20) NULL REFERENCES dbo.QuyetToan(maQuyetToan),
    thoiDiemChot DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    tongChiPhi DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tongChiPhi >= 0),
    tienBHYTChiTra DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tienBHYTChiTra >= 0),
    tongMienGiam DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tongMienGiam >= 0),
    nguoiBenhPhaiTra AS (tongChiPhi - tienBHYTChiTra - tongMienGiam),
    trangThai VARCHAR(30) NOT NULL DEFAULT 'CHUA_THANH_TOAN' CHECK (trangThai IN ('CHUA_THANH_TOAN', 'DA_QUYET_TOAN', 'DA_DIEU_CHINH', 'DA_HUY')),
    maNguoiChot VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    ghiChu NVARCHAR(500) NULL,
    CONSTRAINT CK_QuyetToan_XOR CHECK ((examID IS NOT NULL AND admissionID IS NULL) OR (examID IS NULL AND admissionID IS NOT NULL))
);
GO

-- 49. Bảng ChiTietQuyetToan (Phân hệ 3)
IF OBJECT_ID('dbo.ChiTietQuyetToan', 'U') IS NOT NULL DROP TABLE dbo.ChiTietQuyetToan;
CREATE TABLE dbo.ChiTietQuyetToan (
    maDongQuyetToan VARCHAR(20) NOT NULL PRIMARY KEY,
    maQuyetToan VARCHAR(20) NOT NULL REFERENCES dbo.QuyetToan(maQuyetToan),
    loaiChiPhi VARCHAR(30) NOT NULL CHECK (loaiChiPhi IN ('KHAM_BENH', 'CAN_LAM_SANG', 'THUOC', 'VAT_TU', 'GIUONG_BENH', 'THU_THUAT_PHAU_THUAT', 'KHAC')),
    maLuotKhamNguon VARCHAR(20) NULL REFERENCES dbo.LuotKham(examID),
    maChiTietCLS VARCHAR(20) NULL REFERENCES dbo.ChiTietChiDinh(maChiTiet),
    maChiTietKho VARCHAR(20) NULL REFERENCES dbo.ChiTietPhieuKho(maChiTietKho),
    maPhanGiuong VARCHAR(20) NULL REFERENCES dbo.PhanGiuong(maPhanGiuong),
    soLuong DECIMAL(18,4) NOT NULL CHECK (soLuong > 0),
    donGia DECIMAL(18,2) NOT NULL CHECK (donGia >= 0),
    thanhTien DECIMAL(18,2) NOT NULL CHECK (thanhTien >= 0),
    tienBHYT DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tienBHYT >= 0),
    tienBenhNhanTra DECIMAL(18,2) NOT NULL CHECK (tienBenhNhanTra >= 0),
    tyLeBHYT DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (tyLeBHYT BETWEEN 0 AND 100)
);
GO

-- 50. Bảng GiaoDichThanhToan (Phân hệ 3)
IF OBJECT_ID('dbo.GiaoDichThanhToan', 'U') IS NOT NULL DROP TABLE dbo.GiaoDichThanhToan;
CREATE TABLE dbo.GiaoDichThanhToan (
    maGiaoDich VARCHAR(20) NOT NULL PRIMARY KEY,
    maBenhNhan VARCHAR(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
    examID VARCHAR(20) NULL REFERENCES dbo.LuotKham(examID),
    admissionID VARCHAR(20) NULL REFERENCES dbo.DotDieuTri(admissionID),
    maHen VARCHAR(20) NULL REFERENCES dbo.LichHen(maHen),
    maQuyetToan VARCHAR(20) NULL REFERENCES dbo.QuyetToan(maQuyetToan),
    loaiGiaoDich VARCHAR(30) NOT NULL CHECK (loaiGiaoDich IN ('TAM_UNG', 'THANH_TOAN_DOT', 'THANH_TOAN_TOAN_BO', 'THU_THEM', 'HOAN_UNG', 'HOAN_VIEN_PHI')),
    phuongThuc VARCHAR(30) NOT NULL CHECK (phuongThuc IN ('TIEN_MAT', 'VIETQR', 'CHUYEN_KHOAN', 'THE_POS', 'VI_DIEN_TU')),
    soTien DECIMAL(18,2) NOT NULL CHECK (soTien > 0),
    thoiDiemGiaoDich DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    trangThai VARCHAR(30) NOT NULL DEFAULT 'THANH_CONG' CHECK (trangThai IN ('CHO_THANH_TOAN', 'THANH_CONG', 'THAT_BAI', 'DA_HOAN')),
    maThamChieuNgoai VARCHAR(100) NULL,
    maGiaoDichGoc VARCHAR(20) NULL REFERENCES dbo.GiaoDichThanhToan(maGiaoDich),
    maNhanVienXacNhan VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    maCaTruc VARCHAR(20) NULL REFERENCES dbo.BaoCaoVienPhi(maBaoCao),
    ghiChu NVARCHAR(500) NULL
);
GO

-- 51. Bảng ChiTietDoiSoatCa (Phân hệ 4)
IF OBJECT_ID('dbo.ChiTietDoiSoatCa', 'U') IS NOT NULL DROP TABLE dbo.ChiTietDoiSoatCa;
CREATE TABLE dbo.ChiTietDoiSoatCa (
    maBaoCao VARCHAR(20) NOT NULL REFERENCES dbo.BaoCaoVienPhi(maBaoCao),
    maGiaoDich VARCHAR(20) NOT NULL REFERENCES dbo.GiaoDichThanhToan(maGiaoDich),
    loaiGiaoDichTrongCa VARCHAR(20) NOT NULL CHECK (loaiGiaoDichTrongCa IN ('THU_TIEN', 'HOAN_TIEN')),
    soTienGhiNhan DECIMAL(18,2) NOT NULL CHECK (soTienGhiNhan > 0),
    thoiDiemLienKet DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    PRIMARY KEY (maBaoCao, maGiaoDich)
);
GO

-- 52. Bảng BenhAnDienTu (Phân hệ 4)
IF OBJECT_ID('dbo.BenhAnDienTu', 'U') IS NOT NULL DROP TABLE dbo.BenhAnDienTu;
CREATE TABLE dbo.BenhAnDienTu (
    maBenhAn VARCHAR(20) NOT NULL PRIMARY KEY,
    maBenhNhan VARCHAR(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
    examID VARCHAR(20) NULL REFERENCES dbo.LuotKham(examID),
    admissionID VARCHAR(20) NULL REFERENCES dbo.DotDieuTri(admissionID),
    loaiBenhAn VARCHAR(30) NOT NULL CHECK (loaiBenhAn IN ('NGOAI_TRU', 'NOI_TRU')),
    ngayTao DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maBacSiLap VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    trangThai VARCHAR(30) NOT NULL DEFAULT 'DANG_LAP' CHECK (trangThai IN ('DANG_LAP', 'DA_DONG_GOI', 'DA_CONG_BO', 'DA_KHOA_LUU_TRU')),
    CONSTRAINT CK_BenhAn_XOR CHECK ((examID IS NOT NULL AND admissionID IS NULL) OR (examID IS NULL AND admissionID IS NOT NULL))
);
GO

-- 53. Bảng PhienBanBenhAn (Phân hệ 4)
IF OBJECT_ID('dbo.PhienBanBenhAn', 'U') IS NOT NULL DROP TABLE dbo.PhienBanBenhAn;
CREATE TABLE dbo.PhienBanBenhAn (
    maPhienBan VARCHAR(20) NOT NULL PRIMARY KEY,
    maBenhAn VARCHAR(20) NOT NULL REFERENCES dbo.BenhAnDienTu(maBenhAn),
    soPhienBan INT NOT NULL DEFAULT 1 CHECK (soPhienBan >= 1),
    laBanHienHanh BIT NOT NULL DEFAULT 1,
    maPhienBanTruoc VARCHAR(20) NULL REFERENCES dbo.PhienBanBenhAn(maPhienBan),
    thoiDiemDongGoi DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maNguoiDongGoi VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    maBamNoiDung VARCHAR(128) NOT NULL,
    duongDanGoiTaiLieu NVARCHAR(500) NOT NULL,
    kichThuocByte BIGINT NOT NULL CHECK (kichThuocByte > 0),
    trangThaiCongBo VARCHAR(20) NOT NULL DEFAULT 'NOI_BO' CHECK (trangThaiCongBo IN ('NOI_BO', 'DA_CONG_BO', 'DA_THU_HOI')),
    thoiDiemCongBo DATETIME2(0) NULL,
    maNguoiCongBo VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    CONSTRAINT UQ_PhienBan_SoPhienBan UNIQUE (maBenhAn, soPhienBan)
);
GO

-- 54. Bảng UyQuyenHoSo (Phân hệ 4)
IF OBJECT_ID('dbo.UyQuyenHoSo', 'U') IS NOT NULL DROP TABLE dbo.UyQuyenHoSo;
CREATE TABLE dbo.UyQuyenHoSo (
    maUyQuyen VARCHAR(20) NOT NULL PRIMARY KEY,
    maBenhNhanChu VARCHAR(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
    maTaiKhoanNhan VARCHAR(20) NOT NULL REFERENCES dbo.TaiKhoan(maTaiKhoan),
    maTaiKhoanCap VARCHAR(20) NOT NULL REFERENCES dbo.TaiKhoan(maTaiKhoan),
    maBenhAn VARCHAR(20) NULL REFERENCES dbo.BenhAnDienTu(maBenhAn),
    phamViUyQuyen VARCHAR(30) NOT NULL CHECK (phamViUyQuyen IN ('XEM_TAT_CA', 'XEM_MOT_BENH_AN', 'TAI_XUAT_HO_SO')),
    ngayBatDau DATETIME2(0) NOT NULL,
    ngayHetHan DATETIME2(0) NOT NULL,
    trangThai VARCHAR(20) NOT NULL DEFAULT 'HIEU_LUC' CHECK (trangThai IN ('HIEU_LUC', 'DA_THU_HOI', 'HET_HAN')),
    maNguoiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    CONSTRAINT CK_UyQuyen_ThoiGian CHECK (ngayHetHan >= ngayBatDau)
);
GO

-- 55. Bảng YeuCauDinhChinh (Phân hệ 4)
IF OBJECT_ID('dbo.YeuCauDinhChinh', 'U') IS NOT NULL DROP TABLE dbo.YeuCauDinhChinh;
CREATE TABLE dbo.YeuCauDinhChinh (
    maYeuCau VARCHAR(20) NOT NULL PRIMARY KEY,
    maBenhAn VARCHAR(20) NOT NULL REFERENCES dbo.BenhAnDienTu(maBenhAn),
    loaiDoiTuongDich VARCHAR(30) NOT NULL CHECK (loaiDoiTuongDich IN ('HO_SO_KHAM', 'TO_DIEU_TRI', 'BIEN_BAN_HOI_CHAN', 'KET_QUA_CLS', 'Y_LENH', 'LAN_THUC_HIEN')),
    maHoSoKham VARCHAR(20) NULL REFERENCES dbo.HoSoKham(maHoSoKham),
    maTo VARCHAR(20) NULL REFERENCES dbo.ToDieuTri(maTo),
    maBienBan VARCHAR(20) NULL REFERENCES dbo.BienBanHoiChan(maBienBan),
    maKetQua VARCHAR(20) NULL REFERENCES dbo.KetQuaCLS(maKetQua),
    maYLenh VARCHAR(20) NULL REFERENCES dbo.YLenh(maYLenh),
    maLanCanBoSung VARCHAR(20) NULL REFERENCES dbo.LanThucHienYLenh(maLan),
    lyDoDinhChinh NVARCHAR(MAX) NOT NULL,
    noiDungDeNghi NVARCHAR(MAX) NOT NULL,
    thoiDiemDeNghi DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maNguoiDeNghi VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    trangThai VARCHAR(20) NOT NULL DEFAULT 'CHO_DUYET' CHECK (trangThai IN ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI', 'DA_AP_DUNG')),
    maNguoiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDuyet DATETIME2(0) NULL,
    yKienPheDuyet NVARCHAR(500) NULL,
    maNguoiApDung VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemApDung DATETIME2(0) NULL,
    maKetQuaThayThe VARCHAR(20) NULL REFERENCES dbo.KetQuaCLS(maKetQua)
);
GO

-- =====================================================================================
-- PHẦN 6: BỔ SUNG CÁC RÀNG BUỘC KHÓA NGOẠI VÒNG (CIRCULAR FOREIGN KEYS)
-- =====================================================================================

-- Liên kết Khoa -> NhanVien (Trưởng khoa)
ALTER TABLE dbo.Khoa ADD CONSTRAINT FK_Khoa_NhanVien_TruongKhoa
FOREIGN KEY (maTruongKhoa) REFERENCES dbo.NhanVien(maNhanVien);
GO

-- Liên kết KhoDuoc -> KiemKeKho (Kỳ kiểm kê đang mở)
ALTER TABLE dbo.KhoDuoc ADD CONSTRAINT FK_KhoDuoc_KiemKeDangMo
FOREIGN KEY (maKiemKeDangMo) REFERENCES dbo.KiemKeKho(maKyKiemKe);
GO

-- Liên kết LanThucHienYLenh -> PhieuKho (Phiếu xuất kho tiêu hao)
ALTER TABLE dbo.LanThucHienYLenh ADD CONSTRAINT FK_LanThucHien_PhieuKho
FOREIGN KEY (maPhieuXuatKho) REFERENCES dbo.PhieuKho(maPhieu);
GO

-- Liên kết LanThucHienYLenh -> YeuCauDinhChinh (Yêu cầu đính chính nguồn)
ALTER TABLE dbo.LanThucHienYLenh ADD CONSTRAINT FK_LanThucHien_YeuCauDinhChinh
FOREIGN KEY (maYeuCauDinhChinhNguon) REFERENCES dbo.YeuCauDinhChinh(maYeuCau);
GO

-- =====================================================================================
-- PHẦN 7: KHỞI TẠO 14 FILTERED UNIQUE INDEXES ĐẶC THÙ NGHIỆP VỤ Y TẾ
-- =====================================================================================

-- 1. Duy nhất số định danh công dân khi có nội dung
CREATE UNIQUE NONCLUSTERED INDEX UQ_BenhNhan_soDinhDanh
ON dbo.BenhNhan(soDinhDanh)
WHERE soDinhDanh IS NOT NULL;
GO

-- 2. Duy nhất lịch hẹn trên lượt khám
CREATE UNIQUE NONCLUSTERED INDEX UQ_LuotKham_maHen
ON dbo.LuotKham(maHen)
WHERE maHen IS NOT NULL;
GO

-- 3. Duy nhất số thứ tự xếp hàng trong buồng theo ngày
CREATE UNIQUE NONCLUSTERED INDEX UQ_LuotKham_XepHang
ON dbo.LuotKham(maBuong, ngayKham, soThuTu);
GO

-- 4. Một bệnh nhân chỉ có tối đa một đợt nội trú đang mở
CREATE UNIQUE NONCLUSTERED INDEX UQ_DotDieuTri_BenhNhanHienTai
ON dbo.DotDieuTri(maBenhNhan)
WHERE trangThai IN ('DANG_DIEU_TRI', 'CHO_XUAT_VIEN');
GO

-- 5. Một giường chỉ có tối đa một phân giường đang sử dụng
CREATE UNIQUE NONCLUSTERED INDEX UQ_PhanGiuong_GiuongHienTai
ON dbo.PhanGiuong(maGiuong)
WHERE denThoiDiem IS NULL AND trangThai = 'DANG_SU_DUNG';
GO

-- 6. Một đợt điều trị chỉ nằm một giường tại một thời điểm
CREATE UNIQUE NONCLUSTERED INDEX UQ_PhanGiuong_BenhNhanHienTai
ON dbo.PhanGiuong(admissionID)
WHERE denThoiDiem IS NULL AND trangThai = 'DANG_SU_DUNG';
GO

-- 7. Mỗi lô hàng chỉ có 1 dòng quản lý tồn trong một kho
CREATE UNIQUE NONCLUSTERED INDEX UQ_LoTonKho_Kho_LoHang
ON dbo.LoTonKho(maKho, maLoHang);
GO

-- 8. Tối đa một bản quyết toán hiện hành cho một lượt khám
CREATE UNIQUE NONCLUSTERED INDEX UQ_QuyetToan_HienHanh_Exam
ON dbo.QuyetToan(examID)
WHERE examID IS NOT NULL AND laBanHienHanh = 1;
GO

-- 9. Tối đa một bản quyết toán hiện hành cho một đợt điều trị
CREATE UNIQUE NONCLUSTERED INDEX UQ_QuyetToan_HienHanh_Admission
ON dbo.QuyetToan(admissionID)
WHERE admissionID IS NOT NULL AND laBanHienHanh = 1;
GO

-- 10. Tối đa một bệnh án điện tử cho một lượt khám ngoại trú
CREATE UNIQUE NONCLUSTERED INDEX UQ_BenhAn_Exam
ON dbo.BenhAnDienTu(examID)
WHERE examID IS NOT NULL;
GO

-- 11. Tối đa một bệnh án điện tử cho một đợt điều trị nội trú
CREATE UNIQUE NONCLUSTERED INDEX UQ_BenhAn_Admission
ON dbo.BenhAnDienTu(admissionID)
WHERE admissionID IS NOT NULL;
GO

-- 12. Tối đa một phiên bản đóng gói bệnh án hiện hành
CREATE UNIQUE NONCLUSTERED INDEX UQ_PhienBanBenhAn_HienHanh
ON dbo.PhienBanBenhAn(maBenhAn)
WHERE laBanHienHanh = 1;
GO

-- 13. Mỗi nhân viên chỉ sở hữu tối đa một tài khoản hệ thống
CREATE UNIQUE NONCLUSTERED INDEX UQ_TaiKhoan_NhanVien
ON dbo.TaiKhoan(maNhanVien)
WHERE maNhanVien IS NOT NULL;
GO

-- 14. Mỗi bệnh nhân chỉ sở hữu tối đa một tài khoản cổng thông tin
CREATE UNIQUE NONCLUSTERED INDEX UQ_TaiKhoan_BenhNhan
ON dbo.TaiKhoan(maBenhNhan)
WHERE maBenhNhan IS NOT NULL;
GO

-- =====================================================================================
-- PHẦN 8: KIỂM TRA TỔNG SỐ BẢNG ĐÃ TẠO THÀNH CÔNG
-- =====================================================================================
SELECT 
    COUNT(*) AS TongSoBangDaTao,
    CASE WHEN COUNT(*) = 55 THEN N'THÀNH CÔNG: ĐỦ 55 BẢNG CSDL LAB 10' ELSE N'CẢNH BÁO: CHƯA ĐỦ 55 BẢNG' END AS TrangThaiKiemTra
FROM sys.tables
WHERE schema_id = SCHEMA_ID('dbo');
GO


/*
========================================================================================
PHẦN 2: DML - NẠP DỮ LIỆU MẪU VÀ CA BỆNH LÂM SÀNG MẪU (55 BẢNG CSDL)
========================================================================================
*/
USE ClinicCare_HIS;
GO
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT N'>>> BẮT ĐẦU NẠP DỮ LIỆU MẪU CLINICCARE HIS...';
GO

-- =====================================================================================
-- PHẦN 1: NẠP DANH MỤC CƠ CẤU TỔ CHỨC VÀ NHÂN SỰ Y TẾ (PHÂN HỆ 4)
-- =====================================================================================
PRINT N'1. Nạp danh mục Khoa phòng và Nhân viên...';

-- 1.1. Danh mục Khoa phòng
INSERT INTO dbo.Khoa (maKhoa, tenKhoa, loaiKhoa, maTruongKhoa, viTri, dangHoatDong) VALUES
('KHOA01', N'Khoa Khám bệnh', 'KHAM_BENH', NULL, N'Tầng 1 - Tòa nhà A', 1),
('KHOA02', N'Khoa Cấp cứu', 'LAM_SANG', NULL, N'Tầng 1 - Tòa nhà B', 1),
('KHOA03', N'Khoa Nội tổng hợp', 'LAM_SANG', NULL, N'Tầng 3 - Tòa nhà B', 1),
('KHOA04', N'Khoa Cận lâm sàng & CĐHA', 'CAN_LAM_SANG', NULL, N'Tầng 2 - Tòa nhà A', 1),
('KHOA05', N'Khoa Dược', 'DUOC', NULL, N'Tầng 1 - Tòa nhà Dược', 1),
('KHOA06', N'Phòng Tài chính - Kế toán', 'HANH_CHINH', NULL, N'Tầng 2 - Tòa nhà C', 1),
('KHOA07', N'Phòng Quản trị hệ thống & CNTT', 'HANH_CHINH', NULL, N'Tầng 4 - Tòa nhà C', 1);
GO

-- 1.2. Danh mục Nhân viên y tế
INSERT INTO dbo.NhanVien (maNhanVien, hoTen, maKhoa, chucDanh, chuyenMon, soChungChiHanhNghe, soDienThoai, email, dangLamViec) VALUES
('NV001', N'BS.CKII Nguyễn Văn An', 'KHOA03', N'Trưởng khoa', 'BAC_SI', '001234/BD-CCHN', '0903111222', 'an.nv@cliniccare.vn', 1),
('NV002', N'ThS.BS Trần Thị Mai', 'KHOA01', N'Bác sĩ điều trị', 'BAC_SI', '005678/BD-CCHN', '0903333444', 'mai.tt@cliniccare.vn', 1),
('NV003', N'BS Lê Hoàng Long', 'KHOA04', N'Bác sĩ CĐHA', 'BAC_SI', '009101/BD-CCHN', '0903555666', 'long.lh@cliniccare.vn', 1),
('NV004', N'ĐD Phạm Thu Thảo', 'KHOA03', N'Điều dưỡng trưởng khoa', 'DIEU_DUONG', '008899/BD-CCHN', '0903777888', 'thao.pt@cliniccare.vn', 1),
('NV005', N'DS Đặng Minh Khôi', 'KHOA05', N'Dược sĩ phụ trách kho', 'DUOC_SI', '004455/BD-CCHN', '0903999000', 'khoi.dm@cliniccare.vn', 1),
('NV006', N'KTV Hoàng Quốc Bảo', 'KHOA04', N'Kỹ thuật viên xét nghiệm', 'KY_THUAT_VIEN', '002233/BD-CCHN', '0908123456', 'bao.hq@cliniccare.vn', 1),
('NV007', N'CN Vũ Bích Ngọc', 'KHOA06', N'Thu ngân viện phí', 'THU_NGAN', NULL, '0908654321', 'ngoc.vb@cliniccare.vn', 1),
('NV008', N'KS Trịnh Anh Tuấn', 'KHOA07', N'Kỹ sư trang thiết bị', 'KY_SU', NULL, '0908777111', 'tuan.ta@cliniccare.vn', 1),
('NV009', N'Admin Nguyễn Văn Hưng', 'KHOA07', N'Quản trị hệ thống', 'QUAN_TRI', NULL, '0908888222', 'hung.nv@cliniccare.vn', 1);
GO

-- Cập nhật trưởng khoa cho các khoa phòng
UPDATE dbo.Khoa SET maTruongKhoa = 'NV001' WHERE maKhoa = 'KHOA03';
UPDATE dbo.Khoa SET maTruongKhoa = 'NV002' WHERE maKhoa = 'KHOA01';
UPDATE dbo.Khoa SET maTruongKhoa = 'NV003' WHERE maKhoa = 'KHOA04';
UPDATE dbo.Khoa SET maTruongKhoa = 'NV005' WHERE maKhoa = 'KHOA05';
GO

-- =====================================================================================
-- PHẦN 2: NẠP VAI TRÒ, QUYỀN HẠN VÀ TÀI KHOẢN NGƯỜI DÙNG (RBAC - PHÂN HỆ 4)
-- =====================================================================================
PRINT N'2. Nạp Vai trò, Quyền hạn và Tài khoản...';

-- 2.1. Bảng VaiTro
INSERT INTO dbo.VaiTro (maVaiTro, tenVaiTro, moTa, dangHoatDong) VALUES
('VT_ADMIN', N'Quản trị viên hệ thống', N'Toàn quyền cấu hình danh mục và hệ thống', 1),
('VT_BACSI', N'Bác sĩ điều trị', N'Khám bệnh, chỉ định CLS, kê đơn, ra y lệnh', 1),
('VT_DIEUDUONG', N'Điều dưỡng lâm sàng', N'Đo sinh hiệu, thực hiện y lệnh, chăm sóc', 1),
('VT_DUOCSI', N'Dược sĩ quản lý kho', N'Cấp phát thuốc, quản lý kho dược, kiểm kê', 1),
('VT_THUNGAN', N'Thu ngân viện phí', N'Thu tạm ứng, thanh toán viện phí, quản lý ca', 1),
('VT_BENHNHAN', N'Người bệnh / Thân nhân', N'Xem bệnh án cá nhân, đặt lịch hẹn trực tuyến', 1);
GO

-- 2.2. Bảng Quyen
INSERT INTO dbo.Quyen (maQuyen, tenQuyen, taiNguyen, hanhDong, moTa) VALUES
('KHAM_BENH:DOC', N'Xem hồ sơ khám bệnh', 'KHAM_BENH', 'DOC', N'Quyền tra cứu thông tin khám bệnh'),
('KHAM_BENH:GHI', N'Ghi kết quả khám bệnh', 'KHAM_BENH', 'GHI', N'Khám và chẩn đoán bệnh nhân'),
('CLS:CHI_DINH', N'Chỉ định cận lâm sàng', 'CAN_LAM_SANG', 'GHI', N'Tạo phiếu chỉ định xét nghiệm/CĐHA'),
('CLS:DUYET_KQ', N'Duyệt kết quả CLS', 'CAN_LAM_SANG', 'DUYET', N'Xác nhận và ký duyệt kết quả CLS'),
('NOI_TRU:Y_LENH', N'Ra y lệnh điều trị', 'NOI_TRU', 'GHI', N'Kê y lệnh thuốc, dịch truyền, chăm sóc'),
('NOI_TRU:THUC_HIEN', N'Thực hiện y lệnh', 'NOI_TRU', 'THUC_HIEN', N'Ghi nhận tiêm truyền và trừ tủ trực'),
('DUOC:CAP_PHAT', N'Cấp phát kho dược', 'KHO_DUOC', 'XUAT_KHO', N'Duyệt và xuất kho thuốc/vật tư'),
('VIEN_PHI:THU_TIEN', N'Thu viện phí', 'VIEN_PHI', 'THU_TIEN', N'Lập biên lai thu tạm ứng/quyết toán'),
('BENH_AN:CONG_BO', N'Đóng gói công bố bệnh án', 'BENH_AN', 'CONG_BO', N'Khóa và công bố bệnh án điện tử'),
('HE_THONG:QUAN_TRI', N'Quản trị phân quyền', 'HE_THONG', 'QUAN_TRI', N'Cấu hình tài khoản, phân quyền RBAC');
GO

-- 2.3. Bảng VaiTroQuyen
INSERT INTO dbo.VaiTroQuyen (maCapQuyen, maVaiTro, maQuyen, ngayCap, trangThai, maNguoiCap, maNguoiThuHoi) VALUES
('VQ001', 'VT_ADMIN', 'HE_THONG:QUAN_TRI', '2026-01-01 00:00:00', 'HIEU_LUC', 'NV009', NULL),
('VQ002', 'VT_BACSI', 'KHAM_BENH:DOC', '2026-01-01 00:00:00', 'HIEU_LUC', 'NV009', NULL),
('VQ003', 'VT_BACSI', 'KHAM_BENH:GHI', '2026-01-01 00:00:00', 'HIEU_LUC', 'NV009', NULL),
('VQ004', 'VT_BACSI', 'CLS:CHI_DINH', '2026-01-01 00:00:00', 'HIEU_LUC', 'NV009', NULL),
('VQ005', 'VT_BACSI', 'NOI_TRU:Y_LENH', '2026-01-01 00:00:00', 'HIEU_LUC', 'NV009', NULL),
('VQ006', 'VT_BACSI', 'CLS:DUYET_KQ', '2026-01-01 00:00:00', 'HIEU_LUC', 'NV009', NULL),
('VQ007', 'VT_DIEUDUONG', 'NOI_TRU:THUC_HIEN', '2026-01-01 00:00:00', 'HIEU_LUC', 'NV009', NULL),
('VQ008', 'VT_DUOCSI', 'DUOC:CAP_PHAT', '2026-01-01 00:00:00', 'HIEU_LUC', 'NV009', NULL),
('VQ009', 'VT_THUNGAN', 'VIEN_PHI:THU_TIEN', '2026-01-01 00:00:00', 'HIEU_LUC', 'NV009', NULL);
GO

-- 2.4. Khởi tạo Bệnh nhân mẫu
INSERT INTO dbo.BenhNhan (maBenhNhan, hoTen, ngaySinh, gioiTinh, soDinhDanh, soBHYT, soDienThoai, diaChi, tienSuBenh, trangThaiDiUng, diUngThuoc, trangThaiXacMinh, ngayTiepNhanDauTien) VALUES
('BN2026110001', N'Nguyễn Bình Dương', '2004-05-15', N'Nam', '074204001234', 'DN4791234567890', '0912345678', N'Phường Phú Hòa, TP. Thủ Dầu Một, Bình Dương', N'Khỏe mạnh, không có tiền sử bệnh mạn tính', 'KHONG_GHI_NHAN', NULL, 'DA_XAC_MINH', '2026-11-14 07:30:00');
GO

-- 2.5. Bảng TaiKhoan (Áp dụng CHECK XOR: Nhân viên hoặc Bệnh nhân)
INSERT INTO dbo.TaiKhoan (maTaiKhoan, tenDangNhap, matKhauHash, loaiChuThe, maNhanVien, maBenhNhan, trangThai, ngayTao, lanDangNhapCuoi) VALUES
('TK001', 'bs_an', 'SHA256_HASHED_PASS_AN', 'NHAN_VIEN', 'NV001', NULL, 'HOAT_DONG', '2026-01-01 08:00:00', '2026-11-14 07:00:00'),
('TK002', 'bs_mai', 'SHA256_HASHED_PASS_MAI', 'NHAN_VIEN', 'NV002', NULL, 'HOAT_DONG', '2026-01-01 08:00:00', '2026-11-14 07:15:00'),
('TK003', 'dd_thao', 'SHA256_HASHED_PASS_THAO', 'NHAN_VIEN', 'NV004', NULL, 'HOAT_DONG', '2026-01-01 08:00:00', '2026-11-14 07:20:00'),
('TK004', 'ds_khoi', 'SHA256_HASHED_PASS_KHOI', 'NHAN_VIEN', 'NV005', NULL, 'HOAT_DONG', '2026-01-01 08:00:00', '2026-11-14 07:10:00'),
('TK005', 'tn_ngoc', 'SHA256_HASHED_PASS_NGOC', 'NHAN_VIEN', 'NV007', NULL, 'HOAT_DONG', '2026-01-01 08:00:00', '2026-11-14 07:05:00'),
('TK006', 'admin_hung', 'SHA256_HASHED_PASS_HUNG', 'NHAN_VIEN', 'NV009', NULL, 'HOAT_DONG', '2026-01-01 08:00:00', '2026-11-14 06:45:00'),
('TK007', 'bn_duong', 'SHA256_HASHED_PASS_DUONG', 'NGUOI_BENH', NULL, 'BN2026110001', 'HOAT_DONG', '2026-11-14 07:35:00', '2026-11-14 07:35:00');
GO

-- 2.6. Gán vai trò cho tài khoản (TaiKhoanVaiTro)
INSERT INTO dbo.TaiKhoanVaiTro (maGanVaiTro, maTaiKhoan, maVaiTro, maKhoaPhamVi, ngayHieuLuc, ngayHetHan, trangThai, maNguoiCap, maNguoiThuHoi) VALUES
('GVT001', 'TK001', 'VT_BACSI', 'KHOA03', '2026-01-01 00:00:00', NULL, 'HIEU_LUC', 'NV009', NULL),
('GVT002', 'TK002', 'VT_BACSI', 'KHOA01', '2026-01-01 00:00:00', NULL, 'HIEU_LUC', 'NV009', NULL),
('GVT003', 'TK003', 'VT_DIEUDUONG', 'KHOA03', '2026-01-01 00:00:00', NULL, 'HIEU_LUC', 'NV009', NULL),
('GVT004', 'TK004', 'VT_DUOCSI', 'KHOA05', '2026-01-01 00:00:00', NULL, 'HIEU_LUC', 'NV009', NULL),
('GVT005', 'TK005', 'VT_THUNGAN', 'KHOA06', '2026-01-01 00:00:00', NULL, 'HIEU_LUC', 'NV009', NULL),
('GVT006', 'TK006', 'VT_ADMIN', NULL, '2026-01-01 00:00:00', NULL, 'HIEU_LUC', 'NV009', NULL),
('GVT007', 'TK007', 'VT_BENHNHAN', NULL, '2026-11-14 07:35:00', NULL, 'HIEU_LUC', 'NV009', NULL);
GO

-- =====================================================================================
-- PHẦN 3: NẠP DANH MỤC CƠ SỞ VẬT CHẤT, DỊCH VỤ VÀ THIẾT BỊ Y TẾ
-- =====================================================================================
PRINT N'3. Nạp danh mục Phòng khám, Buồng giường, Thiết bị và Dịch vụ kỹ thuật...';

-- 3.1. Buồng khám ngoại trú
INSERT INTO dbo.BuongKham (maBuong, maKhoa, tenBuong, viTri, gioiHanLuotMoiNgay, dangHoatDong) VALUES
('PK101', 'KHOA01', N'Phòng khám Nội tổng quát 1', N'Phòng 101 - Tầng 1', 60, 1),
('PK102', 'KHOA01', N'Phòng khám Nội tổng quát 2', N'Phòng 102 - Tầng 1', 60, 1),
('PK103', 'KHOA01', N'Phòng khám Cấp cứu ban đầu', N'Phòng 103 - Tầng 1', 80, 1);
GO

-- 3.2. Buồng bệnh nội trú
INSERT INTO dbo.BuongBenh (maBuongBenh, maKhoa, tenBuong, loaiBuong, soGiuongToiDa, viTri, dangHoatDong) VALUES
('BB301', 'KHOA03', N'Buồng bệnh Nội tiêu chuẩn 301', 'TIEU_CHUAN', 4, N'Phòng 301 - Tầng 3 Tòa B', 1),
('BB302', 'KHOA03', N'Buồng bệnh Nội dịch vụ 302', 'DICH_VU', 2, N'Phòng 302 - Tầng 3 Tòa B', 1);
GO

-- 3.3. Giường bệnh nội trú
INSERT INTO dbo.GiuongBenh (maGiuong, maBuongBenh, soHieuGiuong, loaiGiuong, donGiaNgay, trangThaiHienTai, dangHoatDong) VALUES
('GB301-01', 'BB301', 'G01', 'THUONG', 250000.00, 'TRONG', 1),
('GB301-02', 'BB301', 'G02', 'THUONG', 250000.00, 'TRONG', 1),
('GB301-03', 'BB301', 'G03', 'THUONG', 250000.00, 'TRONG', 1),
('GB301-04', 'BB301', 'G04', 'THUONG', 250000.00, 'TRONG', 1),
('GB302-01', 'BB302', 'V01', 'HOI_SUC_VIP', 600000.00, 'TRONG', 1);
GO

-- 3.4. Dịch vụ kỹ thuật (Cận lâm sàng & Thăm dò chức năng)
INSERT INTO dbo.DichVuKyThuat (maDichVu, tenDichVu, maKhoaThucHien, loaiDichVu, loaiKetQua, donGia, giaBHYT, thoiGianTrungBinhPhut, dangHoatDong) VALUES
('DV001', N'Tổng phân tích tế bào máu ngoại vi (24 thông số)', 'KHOA04', 'XET_NGHIEM', 'XET_NGHIEM', 85000.00, 60000.00, 30, 1),
('DV002', N'Định lượng CRP (C-Reactive Protein) miễn dịch', 'KHOA04', 'XET_NGHIEM', 'XET_NGHIEM', 95000.00, 70000.00, 45, 1),
('DV003', N'Chụp X-quang ngực thẳng kỹ thuật số (CR/DR)', 'KHOA04', 'CDHA', 'MO_TA', 120000.00, 95000.00, 20, 1),
('DV004', N'Siêu âm ổ bụng tổng quát màu Doppler', 'KHOA04', 'CDHA', 'MO_TA', 180000.00, 140000.00, 25, 1);
GO

-- 3.5. Thiết bị y tế
INSERT INTO dbo.ThietBiYTe (maThietBi, tenThietBi, maKhoaQuanLy, hangSanXuat, nuocSanXuat, namSanXuat, ngayDuaVaoSuDung, soSerial, trangThai, dangHoatDong) VALUES
('TB001', N'Máy xét nghiệm huyết học Sysmex XN-550', 'KHOA04', N'Sysmex', N'Nhật Bản', 2023, '2024-01-15', 'SYXN550-9872', 'HOAT_DONG', 1),
('TB002', N'Hệ thống chụp X-quang kỹ thuật số DR Shimadzu', 'KHOA04', N'Shimadzu', N'Nhật Bản', 2022, '2023-05-20', 'SHMDR-44321', 'HOAT_DONG', 1);
GO

-- =====================================================================================
-- PHẦN 4: NẠP DANH MỤC DƯỢC, KHO DƯỢC, LÔ HÀNG VÀ TỒN KHO (PHÂN HỆ 3)
-- =====================================================================================
PRINT N'4. Nạp Kho Dược, Danh mục Thuốc/Vật tư và Tồn kho...';

-- 4.1. Kho dược
INSERT INTO dbo.KhoDuoc (maKho, tenKho, maKhoa, loaiKho, viTri, maKiemKeDangMo, dangHoatDong) VALUES
('KHO_TONG', N'Kho dược Trung tâm Bệnh viện', 'KHOA05', 'KHO_TONG', N'Tầng hầm Tòa nhà Dược', NULL, 1),
('KHO_TT_NOI', N'Tủ trực Cấp phát Khoa Nội', 'KHOA03', 'TU_TRUC_KHOA', N'Phòng Trực Điều dưỡng - Tầng 3', NULL, 1),
('KHO_LE_NT', N'Nhà thuốc Ngoại trú Bệnh viện', 'KHOA05', 'KHO_LE_NGOAI_TRU', N'Sảnh Tầng 1 Tòa A', NULL, 1);
GO

-- 4.2. Danh mục Hàng hóa y tế (Bảng cha HangHoaYTe)
INSERT INTO dbo.HangHoaYTe (maHang, tenHang, donViCoSo, loaiHang, donGiaNhapBinhQuan, donGiaXuatCoSo, giaBHYT, dangKinhDoanh) VALUES
('HH001', N'Paracetamol 500mg', N'Viên', 'THUOC', 350.00, 500.00, 450.00, 1),
('HH002', N'Augmentin 1g (Amoxicillin + Clavulanic)', N'Viên', 'THUOC', 12000.00, 15000.00, 13500.00, 1),
('HH003', N'Ceftriaxone 1g (Thuốc tiêm)', N'Lọ', 'THUOC', 25000.00, 32000.00, 28000.00, 1),
('HH004', N'Natri Clorid 0.9% 500ml (Dịch truyền)', N'Chai', 'THUOC', 12000.00, 16000.00, 14000.00, 1),
('HH005', N'Bơm kim tiêm vô trùng 5ml', N'Cái', 'VAT_TU', 1200.00, 2000.00, 1500.00, 1),
('HH006', N'Dây truyền dịch vô trùng có bầu đếm giọt', N'Bộ', 'VAT_TU', 5000.00, 8000.00, 6500.00, 1),
('HH007', N'Kim luồn tĩnh mạch 20G', N'Cái', 'VAT_TU', 8000.00, 12000.00, 9500.00, 1);
GO

-- 4.3. Bảng con Thuoc (TPT)
INSERT INTO dbo.Thuoc (maHang, loaiHang, hoatChat, hamLuong, duongDung, dangBaoChe, nhomDoc) VALUES
('HH001', 'THUOC', N'Paracetamol', N'500mg', N'Đường uống', N'Viên nén', NULL),
('HH002', 'THUOC', N'Amoxicillin + Acid Clavulanic', N'875mg/125mg', N'Đường uống', N'Viên nén bao phim', NULL),
('HH003', 'THUOC', N'Ceftriaxone Sodium', N'1g', N'Tiêm/Truyền tĩnh mạch', N'Bột pha tiêm', N'Kháng sinh nhóm Cephalosporin'),
('HH004', 'THUOC', N'Natri Clorid', N'0.9%', N'Truyền tĩnh mạch', N'Dung dịch tiêm truyền', NULL);
GO

-- 4.4. Bảng con VatTuYTe (TPT)
INSERT INTO dbo.VatTuYTe (maHang, loaiHang, quyCach, vatLieu, voTrung, taiSuDung) VALUES
('HH005', 'VAT_TU', N'Hộp 100 cái', N'Nhựa y tế PP, Piston cao su', 1, 0),
('HH006', 'VAT_TU', N'Túi 1 bộ kèm kim', N'Nhựa PVC y tế mềm', 1, 0),
('HH007', 'VAT_TU', N'Hộp 50 cái', N'Kim thép không gỉ, nắp FEP', 1, 0);
GO

-- 4.5. Lô hàng sản xuất
INSERT INTO dbo.LoHang (maLoHang, maHang, soLoNhaSanXuat, ngaySanXuat, hanSuDung, nhaCungCap, nhaSanXuat, donGiaNhap) VALUES
('LH202611001', 'HH001', 'PARA240801', '2024-08-01', '2027-08-01', N'Dược Hậu Giang (DHG Pharma)', N'DHG Pharma', 350.00),
('LH202611002', 'HH002', 'AUG240915', '2024-09-15', '2027-09-15', N'DKSH Việt Nam', N'GlaxoSmithKline (GSK)', 12000.00),
('LH202611003', 'HH003', 'CEF241010', '2024-10-10', '2027-10-10', N'Imexpharm Corp', N'Imexpharm', 25000.00),
('LH202611004', 'HH004', 'NACL241101', '2024-11-01', '2027-11-01', N'B.Braun Việt Nam', N'B.Braun', 12000.00),
('LH202611005', 'HH005', 'BOM240505', '2024-05-05', '2029-05-05', N'Thiết bị y tế MP', N'Vinahankook', 1200.00),
('LH202611006', 'HH006', 'DAY240606', '2024-06-06', '2029-06-06', N'Thiết bị y tế MP', N'B.Braun', 5000.00);
GO

-- 4.6. Lô tồn kho thực tế (LoTonKho)
INSERT INTO dbo.LoTonKho (maLoTon, maKho, maLoHang, soLuongTon, soLuongKhaDung, viTriDayKe, trangThaiKhoa) VALUES
('LTK001', 'KHO_TONG', 'LH202611001', 50000.0000, 50000.0000, N'Kệ A1-01', 0),
('LTK002', 'KHO_TONG', 'LH202611002', 10000.0000, 10000.0000, N'Kệ A1-02', 0),
('LTK003', 'KHO_TONG', 'LH202611003', 5000.0000, 5000.0000, N'Kệ B2-01', 0),
('LTK004', 'KHO_TT_NOI', 'LH202611003', 200.0000, 200.0000, N'Tủ trực ngăn 1 (Kháng sinh)', 0),
('LTK005', 'KHO_TT_NOI', 'LH202611004', 150.0000, 150.0000, N'Tủ trực ngăn 2 (Dịch truyền)', 0),
('LTK006', 'KHO_TT_NOI', 'LH202611005', 300.0000, 300.0000, N'Tủ vật tư ngăn 1', 0),
('LTK007', 'KHO_TT_NOI', 'LH202611006', 100.0000, 100.0000, N'Tủ vật tư ngăn 2', 0);
GO

-- 4.7. Quy đổi đơn vị (QuyDoiDonVi)
INSERT INTO dbo.QuyDoiDonVi (maQuyDoi, maHang, tenDonViQuyDoi, heSoQuyDoi, tuNgay, denNgay, maNguoiDuyet) VALUES
('QD001', 'HH001', N'Hộp 100 viên', 100.00000000, '2026-01-01 00:00:00', NULL, 'NV005'),
('QD002', 'HH002', N'Hộp 14 viên', 14.00000000, '2026-01-01 00:00:00', NULL, 'NV005');
GO

-- =====================================================================================
-- PHẦN 5: MÔ PHỎNG KỊCH BẢN CA BỆNH LÂM SÀNG MẪU XUYÊN SUỐT TOÀN DIỆN
-- Bệnh nhân: Nguyễn Bình Dương (BN2026110001) - Chẩn đoán: Viêm phổi thùy cấp
-- =====================================================================================
PRINT N'5. Bắt đầu mô phỏng Ca bệnh mẫu xuyên suốt các khâu...';

-- GIAI ĐOẠN 5.1: ĐẶT LỊCH HẸN TRỰC TUYẾN & TRẢ TRƯỚC TIỀN KHÁM
PRINT N'  -> 5.1. Bệnh nhân đặt lịch hẹn trực tuyến...';
INSERT INTO dbo.LichHen (maHen, maBenhNhan, maKhoa, maBuong, maBacSiDuKien, ngayHen, gioHenDuKien, maQRCheckIn, soTienTraTruoc, trangThai, thoiDiemDat, maNguoiXacNhan) VALUES
('LH2026111401', 'BN2026110001', 'KHOA01', 'PK101', 'NV002', '2026-11-14', '08:00:00', 'QR-BN2026110001-20261114-0800', 50000.00, 'DA_CHECK_IN', '2026-11-13 20:30:00', 'NV007');

-- Mở ca trực thu ngân để đối soát giao dịch
INSERT INTO dbo.BaoCaoVienPhi (maBaoCao, maCaTruc, quayThuTien, maThuNgan, thoiDiemMoCa, thoiDiemDongCa, tienDauCa, tongTienThuTrongCa, tongTienHoanTrongCa, tienThucDem, trangThai, maNguoiDoiSoat, ghiChu) VALUES
('BC2026111401', 'CA-QUAY1-20261114-SANG', N'Quầy Thu ngân 1 (Khu khám bệnh)', 'NV007', '2026-11-14 06:30:00', NULL, 1000000.00, 2050000.00, 1370000.00, NULL, 'DANG_MO', NULL, N'Ca trực sáng thu tiền viện phí');

-- Biên lai trả trước tiền khám qua VietQR
INSERT INTO dbo.GiaoDichThanhToan (maGiaoDich, maBenhNhan, examID, admissionID, maHen, maQuyetToan, loaiGiaoDich, phuongThuc, soTien, thoiDiemGiaoDich, trangThai, maThamChieuNgoai, maGiaoDichGoc, maNhanVienXacNhan, maCaTruc, ghiChu) VALUES
('GD20261114001', 'BN2026110001', NULL, NULL, 'LH2026111401', NULL, 'TAM_UNG', 'VIETQR', 50000.00, '2026-11-13 20:35:00', 'THANH_CONG', 'MBVCB.20261113.987654', NULL, 'NV007', 'BC2026111401', N'Thanh toán trả trước đặt lịch khám trực tuyến');
GO

-- GIAI ĐOẠN 5.2: TIẾP NHẬN CHECK-IN, CẤP SỐ KHÁM & ĐO SINH HIỆU
PRINT N'  -> 5.2. Tiếp nhận tại viện, cấp STT khám và đo sinh hiệu...';

-- Cập nhật bộ đếm STT
INSERT INTO dbo.BoDemSoThuTuKham (maBuong, ngayCapSo, soCuoi) VALUES
('PK101', '2026-11-14', 1);

-- Khởi tạo lượt khám ngoại trú
INSERT INTO dbo.LuotKham (examID, maBenhNhan, maBuong, maHen, thoiDiemDangKy, thoiDiemCapSo, soThuTu, lyDoKham, trangThai, thoiDiemKetThuc) VALUES
('EX20261114001', 'BN2026110001', 'PK101', 'LH2026111401', '2026-11-14 07:45:00', '2026-11-14 07:50:00', 1, N'Sốt cao liên tục 3 ngày, ho có đờm, đau ngực phải khi thở sâu', 'HOAN_TAT_KHAM', '2026-11-14 09:15:00');

-- Đo sinh hiệu (BMI được tính toán tự động qua Computed Column)
INSERT INTO dbo.PhieuSinhHieu (maPhieu, examID, maNhanVien, thoiDiemDo, mach, nhietDo, huyetApTamThu, huyetApTamTruong, nhipTho, spo2, chieuCao, canNang, ghiChu, lyDoKhongDoDu) VALUES
('SH20261114001', 'EX20261114001', 'NV004', '2026-11-14 07:55:00', 92, 38.6, 120, 80, 22, 96.0, 172.0, 65.0, N'Bệnh nhân sốt cao, thở hơi nhanh, môi khô', NULL);
GO

-- GIAI ĐOẠN 5.3: BÁC SĨ KHÁM LÂM SÀNG & RA CHỈ ĐỊNH CẬN LÂM SÀNG
PRINT N'  -> 5.3. Bác sĩ khám lâm sàng và chỉ định cận lâm sàng...';

-- Hồ sơ khám lâm sàng
INSERT INTO dbo.HoSoKham (maHoSoKham, examID, maBacSi, benhSu, tienSuBanThan, tienSuGiaDinh, khamToanThan, khamBoPhan, chanDoanSoBo, maICDSoBo, chanDoanXacDinh, maICDXacDinh, huongDieuTri, loiDanBacSi, thoiDiemHoanTat, trangThai) VALUES
('HSK20261114001', 'EX20261114001', 'NV002', N'Bệnh khởi phát 3 ngày trước với sốt rét run, ho đờm vàng đặc, đau tức ngực phải tăng khi ho', N'Không dị ứng thuốc, không hút thuốc lá', N'Gia đình không có tiền sử lao phổi', N'Bệnh nhân tỉnh, tiếp xúc tốt, da niêm hồng, thể trạng trung bình', N'Phổi phải nghe ran nổ đáy phổi, rì rào phế nang giảm nhẹ', N'Theo dõi Viêm phổi thùy phải cấp', 'J18.1', N'Viêm phổi thùy phải cấp tính mức độ trung bình', 'J18.1', N'Chỉ định CLS xét nghiệm máu và chụp X-quang, nhập viện điều trị nội trú', N'Nghỉ ngơi tại chỗ, uống nhiều nước, chuẩn bị nhập viện', '2026-11-14 09:10:00', 'HOAN_TAT');

-- Chỉ định Cận lâm sàng (Context: examID)
INSERT INTO dbo.ChiDinhCLS (orderID, examID, admissionID, maBacSiChiDinh, thoiDiemChiDinh, chanDoanLamSang, loaiUuTien, trangThai, ghiChu) VALUES
('CLS20261114001', 'EX20261114001', NULL, 'NV002', '2026-11-14 08:10:00', N'Viêm phổi thùy phải cấp - Đề nghị làm CLS cấp thiết', 'THUONG', 'HOAN_TAT', N'Làm ngay trong sáng');

-- 2 Chi tiết chỉ định: Huyết học và X-quang ngực
INSERT INTO dbo.ChiTietChiDinh (maChiTiet, orderID, maDichVu, maHang, soLuong, donGiaApDung, trangThai) VALUES
('CTCLS001', 'CLS20261114001', 'DV001', NULL, 1.00, 85000.00, 'CO_KET_QUA'),
('CTCLS002', 'CLS20261114001', 'DV003', NULL, 1.00, 120000.00, 'CO_KET_QUA');
GO

-- GIAI ĐOẠN 5.4: THỰC HIỆN CẬN LÂM SÀNG VÀ DUYỆT TRẢ KẾT QUẢ
PRINT N'  -> 5.4. Thực hiện xét nghiệm máu và chụp X-quang...';

-- Kết quả Xét nghiệm máu (Bảng cha KetQuaCLS)
INSERT INTO dbo.KetQuaCLS (maKetQua, maChiTiet, loaiKetQua, lanThucHien, phienBan, laBanHienHanh, maKetQuaTruoc, thoiDiemCoKetQua, maKyThuatVien, maBacSiDuyet, thoiDiemDuyet, trangThai, ghiChuChuyenMon, thietBiThucHien) VALUES
('KQ20261114001', 'CTCLS001', 'XET_NGHIEM', 1, 1, 1, NULL, '2026-11-14 08:40:00', 'NV006', 'NV003', '2026-11-14 08:45:00', 'DA_DUYET', N'Bạch cầu tăng cao, phản ánh tình trạng nhiễm trùng vi khuẩn cấp tính', 'TB001');

-- Bảng con KetQuaXetNghiem (TPT)
INSERT INTO dbo.KetQuaXetNghiem (maKetQua, loaiKetQua, theTichMau, chatLuongMau, thoiDiemLayMau, nguoiLayMau, thoiDiemNhanMau, coCanhBaoNguyKich) VALUES
('KQ20261114001', 'XET_NGHIEM', N'2.0 ml máu tĩnh mạch chống đông EDTA', N'Mẫu đạt tiêu chuẩn', '2026-11-14 08:15:00', 'NV004', '2026-11-14 08:20:00', 0);

-- Các chỉ số xét nghiệm chi tiết
INSERT INTO dbo.ChiSoXetNghiem (maChiSo, maKetQua, maLoaiChiSo, tenChiSo, giaTriDo, giaTriSo, donViDo, khoangThamChieu, giaTriMinThamChieu, giaTriMaxThamChieu, mucDoCanhBao) VALUES
('CS001', 'KQ20261114001', 'WBC', N'Số lượng bạch cầu (White Blood Cells)', '14.8', 14.8000, 'G/L', '4.0 - 10.0', 4.0000, 10.0000, 'CAO'),
('CS002', 'KQ20261114001', 'NEUT%', N'Tỷ lệ bạch cầu trung tính', '81.5', 81.5000, '%', '40.0 - 74.0', 40.0000, 74.0000, 'CAO'),
('CS003', 'KQ20261114001', 'RBC', N'Số lượng hồng cầu', '4.65', 4.6500, 'T/L', '4.2 - 5.8', 4.2000, 5.8000, 'BINH_THUONG'),
('CS004', 'KQ20261114001', 'PLT', N'Số lượng tiểu cầu', '245', 245.0000, 'G/L', '150 - 450', 150.0000, 450.0000, 'BINH_THUONG');

-- Kết quả X-quang lồng ngực (Bảng cha KetQuaCLS)
INSERT INTO dbo.KetQuaCLS (maKetQua, maChiTiet, loaiKetQua, lanThucHien, phienBan, laBanHienHanh, maKetQuaTruoc, thoiDiemCoKetQua, maKyThuatVien, maBacSiDuyet, thoiDiemDuyet, trangThai, ghiChuChuyenMon, thietBiThucHien) VALUES
('KQ20261114002', 'CTCLS002', 'MO_TA', 1, 1, 1, NULL, '2026-11-14 08:50:00', 'NV006', 'NV003', '2026-11-14 09:00:00', 'DA_DUYET', N'Hình ảnh tổn thương đông đặc nhu mô phổi thùy dưới phải điển hình', 'TB002');

-- Bảng con KetQuaMoTa (TPT)
INSERT INTO dbo.KetQuaMoTa (maKetQua, loaiKetQua, vungKhaoSat, kyThuatChup, moTaHinhAnh, ketLuan, deNghi, duongDanAnhPACS, soLuongAnh) VALUES
('KQ20261114002', 'MO_TA', N'Lồng ngực thẳng tư thế đứng (PA)', N'Chụp kỹ thuật số DR liều thấp', N'Đám mờ tương đối đồng nhất hình tam giác vùng thùy dưới phổi phải, bờ tim phải rõ, góc sườn hoành phải nhọn. Vòm hoành hai bên bình thường. Bóng tim không to.', N'Hình ảnh đông đặc nhu mô thùy dưới phổi phải - Phù hợp Viêm phổi thùy cấp', N'Kết hợp kháng sinh đồ và theo dõi đáp ứng lâm sàng', N'/pacs/images/2026/11/14/BN2026110001_CHEST_01.dcm', 2);
GO

-- GIAI ĐOẠN 5.5: NHẬP VIỆN NỘI TRÚ, NỘP TẠM ỨNG & PHÂN GIƯỜNG
PRINT N'  -> 5.5. Nhập viện nội trú, nộp tạm ứng và phân giường...';

-- Khởi tạo đợt điều trị nội trú
INSERT INTO dbo.DotDieuTri (admissionID, maBenhNhan, examID, maKhoaDieuTri, thoiDiemNhapVien, lyDoNhapVien, chanDoanVaoVien, maICDVaoVien, maBacSiDieuTriChinh, soToCuoi, trangThai, thoiDiemRaVien, chanDoanRaVien, maICDRaVien, ketQuaDieuTri, loiDanRaVien, tienTamUngHienTai, tongChiPhiHienTai, ghiChu, thoiDiemDongDot) VALUES
('AD20261114001', 'BN2026110001', 'EX20261114001', 'KHOA03', '2026-11-14 09:30:00', N'Viêm phổi thùy cấp sốt cao cần điều trị kháng sinh đường tĩnh mạch', N'Viêm phổi thùy phải cấp tính mức độ trung bình', 'J18.1', 'NV001', 1, 'DA_XUAT_VIEN', '2026-11-17 10:00:00', N'Viêm phổi thùy phải cấp điều trị ổn định', 'J18.1', 'KHOI', N'Uống thuốc kháng sinh ngoại trú theo đơn ra viện đủ liều, tái khám sau 5 ngày', 2000000.00, 2150000.00, N'Điều trị thành công không biến chứng', '2026-11-17 10:30:00');

-- Bệnh nhân đóng tiền tạm ứng nội trú: 2,000,000 VNĐ qua Chuyển khoản ngân hàng
INSERT INTO dbo.GiaoDichThanhToan (maGiaoDich, maBenhNhan, examID, admissionID, maHen, maQuyetToan, loaiGiaoDich, phuongThuc, soTien, thoiDiemGiaoDich, trangThai, maThamChieuNgoai, maGiaoDichGoc, maNhanVienXacNhan, maCaTruc, ghiChu) VALUES
('GD20261114002', 'BN2026110001', NULL, 'AD20261114001', NULL, NULL, 'TAM_UNG', 'CHUYEN_KHOAN', 2000000.00, '2026-11-14 09:35:00', 'THANH_CONG', 'VCB.20261114.112233', NULL, 'NV007', 'BC2026111401', N'Tạm ứng viện phí nhập viện nội trú khoa Nội tổng hợp');

-- Phân giường bệnh (Nằm 3 ngày tại giường GB301-01)
INSERT INTO dbo.PhanGiuong (maPhanGiuong, admissionID, maGiuong, tuThoiDiem, denThoiDiem, donGiaApDung, trangThai, maNhanVienXep, lyDoKetThuc, ghiChu) VALUES
('PG20261114001', 'AD20261114001', 'GB301-01', '2026-11-14 09:40:00', '2026-11-17 09:40:00', 250000.00, 'DA_KET_THUC', 'NV004', N'Bệnh nhân xuất viện', N'Nằm 3 ngày buồng tiêu chuẩn');
GO

-- GIAI ĐOẠN 5.6: TỜ ĐIỀU TRỊ, Y LỆNH & THỰC HIỆN Y LỆNH TRỪ TỒN KHO TỦ TRỰC
PRINT N'  -> 5.6. Lập tờ điều trị, ra y lệnh và thực hiện trừ kho tủ trực...';

-- Tờ điều trị số 1
INSERT INTO dbo.ToDieuTri (maTo, admissionID, soThuTuTo, ngayDieuTri, thoiDiemGhi, dienBienBenh, yLenhChung, cheDoDinhDuong, cheDoChamSoc, maBacSi, trangThai, maBacSiDuyet, thoiDiemDuyet) VALUES
('TO20261114001', 'AD20261114001', 1, '2026-11-14', '2026-11-14 10:00:00', N'Bệnh nhân tỉnh, còn sốt 38.5°C, mệt mỏi, ho khạc đờm vàng, đau ngực phải. Phổi ran nổ đáy phải.', N'Thực hiện y lệnh thuốc tiêm truyền đúng giờ, theo dõi sinh hiệu 4h/lần', N'Cơm mềm, giàu dinh dưỡng, uống nhiều nước ấm', N'Chăm sóc cấp 2, nghỉ ngơi tại giường', 'NV001', 'DA_DUYET', 'NV001', '2026-11-14 10:15:00');

-- Y lệnh 1: Kháng sinh Ceftriaxone tiêm tĩnh mạch
INSERT INTO dbo.YLenh (maYLenh, maTo, loaiYLenh, noiDungYLenh, maHang, maChiTietDonNguon, coTieuHaoKho, soLuongKeHoach, donViKeHoach, duongDung, tocDoTruyen, tanSuatDung, thoiDiemBatDau, thoiDiemKetThuc, trangThai, lyDoNgungHuy, maBacSiRaYLenh) VALUES
('YL20261114001', 'TO20261114001', 'THUOC', N'Ceftriaxone 1g tiêm tĩnh mạch chậm x 2 lọ/ngày, chia 2 lần (08h - 16h)', 'HH003', NULL, 1, 2.0000, N'Lọ', N'Tiêm tĩnh mạch', NULL, N'2 lần/ngày', '2026-11-14 10:00:00', '2026-11-17 10:00:00', 'DA_HOAN_TAT', NULL, 'NV001');

-- Y lệnh 2: Dịch truyền Natri Clorid 0.9%
INSERT INTO dbo.YLenh (maYLenh, maTo, loaiYLenh, noiDungYLenh, maHang, maChiTietDonNguon, coTieuHaoKho, soLuongKeHoach, donViKeHoach, duongDung, tocDoTruyen, tanSuatDung, thoiDiemBatDau, thoiDiemKetThuc, trangThai, lyDoNgungHuy, maBacSiRaYLenh) VALUES
('YL20261114002', 'TO20261114001', 'THUOC', N'Natri Clorid 0.9% 500ml truyền tĩnh mạch XXX giọt/phút', 'HH004', NULL, 1, 1.0000, N'Chai', N'Truyền tĩnh mạch', N'30 giọt/phút', N'1 lần/ngày', '2026-11-14 10:30:00', '2026-11-14 12:30:00', 'DA_HOAN_TAT', NULL, 'NV001');

-- Phiếu xuất kho tiêu hao nội trú tự động
INSERT INTO dbo.PhieuKho (maPhieu, loaiPhieu, maKhoNguon, maKhoDich, examID, admissionID, maLanNguon, maKiemKeNguon, maPhieuGoc, thoiDiemLap, maNguoiLap, trangThai, maNguoiDuyet, thoiDiemDuyet, ghiChu) VALUES
('PKHO2026111401', 'XUAT_TIEU_HAO_NOI_TRU', 'KHO_TT_NOI', NULL, NULL, 'AD20261114001', NULL, NULL, NULL, '2026-11-14 10:35:00', 'NV004', 'DA_XUAT', 'NV005', '2026-11-14 10:40:00', N'Xuất tiêu hao tủ trực thuốc tiêm cho bệnh nhân Nguyễn Bình Dương');

-- Dòng chi tiết phiếu xuất kho
INSERT INTO dbo.ChiTietPhieuKho (maChiTietKho, maPhieu, maLoTon, maChiTietDonNguon, maChiTietGoc, soLuong, donViXuat, maQuyDoiApDung, soLuongCoSo, donGiaVatLy, soLuongDaHoan) VALUES
('CTPK001', 'PKHO2026111401', 'LTK004', NULL, NULL, 1.0000, N'Lọ', NULL, 1.0000, 25000.00, 0.0000),
('CTPK002', 'PKHO2026111401', 'LTK005', NULL, NULL, 1.0000, N'Chai', NULL, 1.0000, 12000.00, 0.0000),
('CTPK003', 'PKHO2026111401', 'LTK006', NULL, NULL, 1.0000, N'Cái', NULL, 1.0000, 1200.00, 0.0000);

-- Trừ số lượng tồn kho tủ trực
UPDATE dbo.LoTonKho SET soLuongTon = soLuongTon - 1, soLuongKhaDung = soLuongKhaDung - 1 WHERE maLoTon = 'LTK004';
UPDATE dbo.LoTonKho SET soLuongTon = soLuongTon - 1, soLuongKhaDung = soLuongKhaDung - 1 WHERE maLoTon = 'LTK005';
UPDATE dbo.LoTonKho SET soLuongTon = soLuongTon - 1, soLuongKhaDung = soLuongKhaDung - 1 WHERE maLoTon = 'LTK006';

-- Lần thực hiện y lệnh cữ sáng của điều dưỡng
INSERT INTO dbo.LanThucHienYLenh (maLan, maYLenh, lanThu, thoiDiemKeHoach, thoiDiemThucHien, thoiDiemGhiNhan, maNhanVienThucHien, ketQuaThucHien, dienBienBatThuong, maLoTon, maKhoTieuHao, soLuongThucDung, donViThucDung, maQuyDoiApDung, maPhieuXuatKho, trangThaiLamSang, trangThaiKho, maYeuCauDinhChinhNguon, ghiChu) VALUES
('LAN20261114001', 'YL20261114001', 1, '2026-11-14 10:30:00', '2026-11-14 10:35:00', '2026-11-14 10:40:00', 'NV004', N'Đã tiêm tĩnh mạch chậm Ceftriaxone 1g, bệnh nhân êm, không sốc phản vệ', NULL, 'LTK004', 'KHO_TT_NOI', 1.0000, N'Lọ', NULL, 'PKHO2026111401', 'DA_THUC_HIEN', 'DA_HACH_TOAN', NULL, N'Đã trừ tồn kho tủ trực');

-- Cập nhật maLanNguon cho phiếu kho
UPDATE dbo.PhieuKho SET maLanNguon = 'LAN20261114001' WHERE maPhieu = 'PKHO2026111401';
GO

-- GIAI ĐOẠN 5.7: HỘI CHẨN KHOA VÀ KÊ ĐƠN THUỐC XUẤT VIỆN
PRINT N'  -> 5.7. Biên bản hội chẩn và kê đơn xuất viện...';

-- Biên bản hội chẩn khoa
INSERT INTO dbo.BienBanHoiChan (maBienBan, admissionID, thoiDiemHoiChan, diaDiem, hinhThucHoiChan, lyDoHoiChan, maChuToa, maThuKy, tomTatDienBien, chanDoanThongNhat, huongDieuTriThongNhat, trangThai, maNguoiDuyet, thoiDiemDuyet) VALUES
('BBHC2026111401', 'AD20261114001', '2026-11-16 14:00:00', N'Phòng Giao ban Khoa Nội', 'KHOA', N'Đánh giá đáp ứng điều trị viêm phổi và kế hoạch xuất viện', 'NV001', 'NV004', N'Sau 3 ngày kháng sinh Ceftriaxone, bệnh nhân hết sốt 48h, đỡ ho, phổi thông khí tốt, bạch cầu giảm về 7.2 G/L', N'Viêm phổi thùy phải cấp tính - Giai đoạn hồi phục tốt', N'Ngừng kháng sinh tiêm, chuyển sang kháng sinh uống Augmentin 1g trong 5 ngày và cho xuất viện', 'DA_DUYET', 'NV001', '2026-11-16 15:00:00');

-- Đơn thuốc xuất viện (Context: admissionID)
INSERT INTO dbo.DonThuoc (maDon, examID, admissionID, loaiDon, thoiDiemKe, maBacSiKe, chanDoan, trangThaiCapPhat, loiDan, maNguoiDuyet, thoiDiemDuyet) VALUES
('DT20261117001', NULL, 'AD20261114001', 'RA_VIEN', '2026-11-17 08:30:00', 'NV001', N'Viêm phổi thùy phải cấp ổn định', 'DA_CAP_DU', N'Uống thuốc sau ăn, tái khám sau 5 ngày hoặc khi có dấu hiệu bất thường', 'NV005', '2026-11-17 09:00:00');

-- Chi tiết đơn thuốc xuất viện
INSERT INTO dbo.ChiTietDonThuoc (maChiTietDon, maDon, maHang, soLuongKe, donViKe, maQuyDoiApDung, cachDung, soNgayDung, sang, trua, chieu, toi, donGiaKe, soLuongDaCap, trangThai) VALUES
('CTDT001', 'DT20261117001', 'HH002', 10.0000, N'Viên', NULL, N'Uống sáng 1 viên, chiều 1 viên sau ăn', 5, N'1 viên', NULL, N'1 viên', NULL, 15000.00, 10.0000, 'DA_CAP_DU');
GO

-- GIAI ĐOẠN 5.8: QUYẾT TOÁN VIỆN PHÍ & HOÀN TIỀN TẠM ỨNG
PRINT N'  -> 5.8. Lập bảng quyết toán viện phí và giao dịch hoàn ứng...';

-- Bảng Quyết toán chi phí đợt điều trị (Context: admissionID)
INSERT INTO dbo.QuyetToan (maQuyetToan, examID, admissionID, phienBan, laBanHienHanh, maQuyetToanTruoc, thoiDiemChot, tongChiPhi, tienBHYTChiTra, tongMienGiam, trangThai, maNguoiChot, ghiChu) VALUES
('QT20261117001', NULL, 'AD20261114001', 1, 1, NULL, '2026-11-17 09:15:00', 2150000.00, 1520000.00, 0.00, 'DA_QUYET_TOAN', 'NV007', N'Quy trình quyết toán viện phí xuất viện nội trú hoàn tất');

-- Dòng chi tiết quyết toán các khoản phí
INSERT INTO dbo.ChiTietQuyetToan (maDongQuyetToan, maQuyetToan, loaiChiPhi, maLuotKhamNguon, maChiTietCLS, maChiTietKho, maPhanGiuong, soLuong, donGia, thanhTien, tienBHYT, tienBenhNhanTra, tyLeBHYT) VALUES
('DQT001', 'QT20261117001', 'CAN_LAM_SANG', 'EX20261114001', 'CTCLS001', NULL, NULL, 1.0000, 85000.00, 85000.00, 60000.00, 25000.00, 70.59),
('DQT002', 'QT20261117001', 'CAN_LAM_SANG', 'EX20261114001', 'CTCLS002', NULL, NULL, 1.0000, 120000.00, 120000.00, 95000.00, 25000.00, 79.17),
('DQT003', 'QT20261117001', 'GIUONG_BENH', NULL, NULL, NULL, 'PG20261114001', 3.0000, 250000.00, 750000.00, 600000.00, 150000.00, 80.00),
('DQT004', 'QT20261117001', 'THUOC', NULL, NULL, 'CTPK001', NULL, 6.0000, 32000.00, 192000.00, 153600.00, 38400.00, 80.00),
('DQT005', 'QT20261117001', 'THUOC', NULL, NULL, 'CTPK002', NULL, 3.0000, 16000.00, 48000.00, 38400.00, 9600.00, 80.00),
('DQT006', 'QT20261117001', 'THUOC', NULL, NULL, NULL, NULL, 10.0000, 15000.00, 150000.00, 120000.00, 30000.00, 80.00),
('DQT007', 'QT20261117001', 'KHAM_BENH', 'EX20261114001', NULL, NULL, NULL, 1.0000, 50000.00, 50000.00, 40000.00, 10000.00, 80.00);

-- Tổng chi phí: 2.150.000đ; BHYT trả: 1.520.000đ; Bệnh nhân phải trả: 630.000đ.
-- Tạm ứng đã đóng: 2.000.000đ (nội trú).
-- Số tiền bệnh viện phải hoàn lại bệnh nhân: 2.000.000 - 630.000 = 1.370.000 VNĐ.
INSERT INTO dbo.GiaoDichThanhToan (maGiaoDich, maBenhNhan, examID, admissionID, maHen, maQuyetToan, loaiGiaoDich, phuongThuc, soTien, thoiDiemGiaoDich, trangThai, maThamChieuNgoai, maGiaoDichGoc, maNhanVienXacNhan, maCaTruc, ghiChu) VALUES
('GD20261117001', 'BN2026110001', NULL, 'AD20261114001', NULL, 'QT20261117001', 'HOAN_UNG', 'TIEN_MAT', 1370000.00, '2026-11-17 09:30:00', 'THANH_CONG', NULL, 'GD20261114002', 'NV007', 'BC2026111401', N'Hoàn trả tiền tạm ứng viện phí thừa bằng tiền mặt cho bệnh nhân');

-- Đối soát ca trực thu ngân
INSERT INTO dbo.ChiTietDoiSoatCa (maBaoCao, maGiaoDich, loaiGiaoDichTrongCa, soTienGhiNhan, thoiDiemLienKet) VALUES
('BC2026111401', 'GD20261114001', 'THU_TIEN', 50000.00, '2026-11-14 07:00:00'),
('BC2026111401', 'GD20261114002', 'THU_TIEN', 2000000.00, '2026-11-14 09:40:00'),
('BC2026111401', 'GD20261117001', 'HOAN_TIEN', 1370000.00, '2026-11-17 09:35:00');
GO

-- GIAI ĐOẠN 5.9: ĐÓNG GÓI HỒ SƠ BỆNH ÁN ĐIỆN TỬ & CÔNG BỐ
PRINT N'  -> 5.9. Đóng gói và công bố Bệnh án điện tử...';

-- Hồ sơ bệnh án điện tử (Context: admissionID)
INSERT INTO dbo.BenhAnDienTu (maBenhAn, maBenhNhan, examID, admissionID, loaiBenhAn, ngayTao, maBacSiLap, trangThai) VALUES
('BA20261114001', 'BN2026110001', NULL, 'AD20261114001', 'NOI_TRU', '2026-11-17 09:45:00', 'NV001', 'DA_CONG_BO');

-- Phiên bản đóng gói số 1 của bệnh án điện tử
INSERT INTO dbo.PhienBanBenhAn (maPhienBan, maBenhAn, soPhienBan, laBanHienHanh, maPhienBanTruoc, thoiDiemDongGoi, maNguoiDongGoi, maBamNoiDung, duongDanGoiTaiLieu, kichThuocByte, trangThaiCongBo, thoiDiemCongBo, maNguoiCongBo) VALUES
('PBBA2026111701', 'BA20261114001', 1, 1, NULL, '2026-11-17 09:50:00', 'NV001', 'SHA256:8f4a2b91c890de554312abfe6e5fec2d2241ddedd221b03877905b9553ff', N'/emr/archives/2026/11/BA20261114001_v1.zip', 5242880, 'DA_CONG_BO', '2026-11-17 10:00:00', 'NV001');

-- Ủy quyền cho người nhà xem hồ sơ qua Cổng thông tin người bệnh
INSERT INTO dbo.UyQuyenHoSo (maUyQuyen, maBenhNhanChu, maTaiKhoanNhan, maTaiKhoanCap, maBenhAn, phamViUyQuyen, ngayBatDau, ngayHetHan, trangThai, maNguoiDuyet) VALUES
('UQ20261117001', 'BN2026110001', 'TK007', 'TK007', 'BA20261114001', 'XEM_MOT_BENH_AN', '2026-11-17 10:00:00', '2027-11-17 10:00:00', 'HIEU_LUC', 'NV001');

-- Ghi nhật ký hệ thống kiểm toán (NhatKyThayDoi)
INSERT INTO dbo.NhatKyThayDoi (loaiDoiTuong, maDoiTuong, hanhDong, loaiTacNhan, maTaiKhoan, maNguoiThucHien, maDichVuNguon, maTuongQuan, ketQua, thoiDiem, lyDo, duLieuTruoc, duLieuSau) VALUES
('BenhAnDienTu', 'BA20261114001', 'CONG_BO', 'NHAN_VIEN', 'TK001', 'NV001', 'EMR_PUBLISH_SERVICE', 'SESSION_NV001_20261117', 'THANH_CONG', '2026-11-17 10:00:00', N'Bác sĩ trưởng khoa duyệt xuất viện và công bố bệnh án điện tử hoàn chỉnh', NULL, N'{"trangThai": "DA_CONG_BO", "soPhienBan": 1, "tongChiPhi": 2150000}');
GO

PRINT N'====================================================================================';
PRINT N'>>> HOÀN THÀNH NẠP DỮ LIỆU MẪU CLINICCARE HIS!';
PRINT N'====================================================================================';
GO


-- GIAI ĐOẠN 5.10: BỔ SUNG DỮ LIỆU ĐẶC THÙ CHO CÁC BẢNG QUY TRÌNH ĐẶC BIỆT
PRINT N'  -> 5.10. Nạp dữ liệu Kiểm kê kho, Bảo trì thiết bị và Đính chính bệnh án...';

-- 1. Kỳ kiểm kê kho định kỳ
INSERT INTO dbo.KiemKeKho (maKyKiemKe, maKho, thoiDiemBatDau, thoiDiemKetThuc, maNguoiLap, trangThai, maNguoiDuyet, thoiDiemDuyet, ghiChu) VALUES
('KK2026103101', 'KHO_TONG', '2026-10-31 08:00:00', '2026-10-31 17:00:00', 'NV005', 'DA_HOAN_TAT', 'NV001', '2026-10-31 17:30:00', N'Kiểm kê định kỳ cuối tháng 10/2026 tại Kho Dược Trung tâm');

INSERT INTO dbo.ChiTietKiemKe (maKyKiemKe, maLoTon, tonLyThuyet, tonThucTe, lyDoChenhLech) VALUES
('KK2026103101', 'LTK001', 50000.0000, 50000.0000, N'Khớp số liệu tồn sổ sách'),
('KK2026103101', 'LTK002', 10000.0000, 10000.0000, N'Khớp số liệu tồn sổ sách');

-- 2. Sự cố và bảo trì thiết bị y tế
INSERT INTO dbo.PhieuBaoHong (maBaoHong, maThietBi, thoiDiemBao, maNguoiBao, moTaSuCo, mucDoUuTien, trangThai, maNguoiTiepNhan, thoiDiemTiepNhan) VALUES
('BH2026110101', 'TB002', '2026-11-01 08:30:00', 'NV006', N'Bóng phát tia X-quang báo lỗi quá nhiệt E-44', 'CAO', 'DA_KHAC_PHUC', 'NV008', '2026-11-01 09:00:00');

INSERT INTO dbo.BienBanBaoTri (maBaoTri, maThietBi, maBaoHong, loaiBaoTri, thoiDiemBatDau, thoiDiemKetThuc, maKySuThucHien, donViBaoTriNgoai, noiDungThucHien, ketQuaBaoTri, chiPhiSuaChua, maNguoiNghiemThu, thoiDiemNghiemThu, danhGiaNghiemThu) VALUES
('BT2026110101', 'TB002', 'BH2026110101', 'SUA_CHUA_SU_CO', '2026-11-01 09:30:00', '2026-11-01 11:30:00', 'NV008', N'Shimadzu Việt Nam', N'Vệ sinh bộ phận tản nhiệt bóng phát tia, nạp lại khí làm mát và hiệu chuẩn điện áp', 'HOAN_TAT', 3500000.00, 'NV003', '2026-11-01 14:00:00', N'Thiết bị hoạt động ổn định, thông số kỹ thuật đạt chuẩn an toàn bức xạ');

-- 3. Yêu cầu đính chính bệnh án
INSERT INTO dbo.YeuCauDinhChinh (maYeuCau, maBenhAn, loaiDoiTuongDich, maHoSoKham, maTo, maBienBan, maKetQua, maYLenh, maLanCanBoSung, lyDoDinhChinh, noiDungDeNghi, thoiDiemDeNghi, maNguoiDeNghi, trangThai, maNguoiDuyet, thoiDiemDuyet, yKienPheDuyet, maNguoiApDung, thoiDiemApDung, maKetQuaThayThe) VALUES
('DC2026111701', 'BA20261114001', 'HO_SO_KHAM', 'HSK20261114001', NULL, NULL, NULL, NULL, NULL, N'Bổ sung ghi chú chi tiết triệu chứng đau ngực phải khi ho vào tiền sử khám ban đầu', N'Thêm mô tả: Đau ngực phải kiểu màng phổi, tăng lên khi hít sâu', '2026-11-17 11:00:00', 'NV002', 'DA_AP_DUNG', 'NV001', '2026-11-17 11:15:00', N'Đồng ý bổ sung phụ lục đính chính', 'NV002', '2026-11-17 11:20:00', NULL);
GO

-- =====================================================================================
-- PHẦN 6: TRUY VẤN MINH CHỨNG DỮ LIỆU ĐÃ NẠP THÀNH CÔNG VÀO CSDL
-- =====================================================================================

-- 6.1. Thống kê số lượng dòng của các bảng chính
SELECT 
    t.name AS TenBang,
    p.rows AS SoLuongDong
FROM sys.tables t
JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0, 1)
WHERE t.schema_id = SCHEMA_ID('dbo') AND p.rows > 0
ORDER BY p.rows DESC, t.name ASC;
GO

-- 6.2. Kiểm tra thông tin bệnh nhân và đợt điều trị mẫu
SELECT 
    bn.maBenhNhan,
    bn.hoTen,
    bn.gioiTinh,
    bn.soBHYT,
    lk.examID,
    lk.trangThai AS TrangThaiKham,
    sh.nhietDo,
    sh.bmi,
    dt.admissionID,
    dt.trangThai AS TrangThaiNoiTru,
    dt.thoiDiemNhapVien,
    dt.thoiDiemRaVien,
    pg.maGiuong,
    qt.tongChiPhi,
    qt.tienBHYTChiTra,
    qt.nguoiBenhPhaiTra,
    ba.maBenhAn,
    ba.trangThai AS TrangThaiBenhAn
FROM dbo.BenhNhan bn
JOIN dbo.LuotKham lk ON bn.maBenhNhan = lk.maBenhNhan
LEFT JOIN dbo.PhieuSinhHieu sh ON lk.examID = sh.examID
LEFT JOIN dbo.DotDieuTri dt ON lk.examID = dt.examID
LEFT JOIN dbo.PhanGiuong pg ON dt.admissionID = pg.admissionID
LEFT JOIN dbo.QuyetToan qt ON dt.admissionID = qt.admissionID
LEFT JOIN dbo.BenhAnDienTu ba ON dt.admissionID = ba.admissionID
WHERE bn.maBenhNhan = 'BN2026110001';
GO


/*
========================================================================================
PHẦN 3: STORED PROCEDURES VÀ VIEWS BÁO CÁO NGHIỆP VỤ
========================================================================================
*/
USE ClinicCare_HIS;
GO
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- =====================================================================================
-- PHẦN 1: STORED PROCEDURES NGHIỆP VỤ CỐT LÕI
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. THỦ TỤC TIẾP NHẬN BỆNH NHÂN VÀ CẤP SỐ THỨ TỰ KHÁM TỰ ĐỘNG
-- -------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.sp_TiepNhanVaCapSoKham', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_TiepNhanVaCapSoKham;
GO

CREATE PROCEDURE dbo.sp_TiepNhanVaCapSoKham
    @maBenhNhan VARCHAR(20),
    @maBuong VARCHAR(20),
    @maHen VARCHAR(20) = NULL,
    @lyDoKham NVARCHAR(255),
    @examID_Out VARCHAR(20) OUTPUT,
    @soThuTu_Out INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    DECLARE @ngayHienTai DATE = CAST(SYSDATETIME() AS DATE);
    DECLARE @thoiDiemHienTai DATETIME2(0) = SYSDATETIME();
    DECLARE @soCuoi INT = 0;
    DECLARE @newExamID VARCHAR(20);
    
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Kiểm tra bệnh nhân tồn tại
        IF NOT EXISTS (SELECT 1 FROM dbo.BenhNhan WHERE maBenhNhan = @maBenhNhan)
        BEGIN
            RAISERROR(N'Lỗi: Bệnh nhân không tồn tại trong hệ thống.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Kiểm tra buồng khám đang hoạt động
        IF NOT EXISTS (SELECT 1 FROM dbo.BuongKham WHERE maBuong = @maBuong AND dangHoatDong = 1)
        BEGIN
            RAISERROR(N'Lỗi: Buồng khám không hoạt động hoặc không tồn tại.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Kiểm tra lịch hẹn (nếu có)
        IF @maHen IS NOT NULL
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM dbo.LichHen WHERE maHen = @maHen AND maBenhNhan = @maBenhNhan AND trangThai = 'DA_DAT')
            BEGIN
                RAISERROR(N'Lỗi: Lịch hẹn không hợp lệ hoặc đã được check-in trước đó.', 16, 1);
                ROLLBACK TRANSACTION;
                RETURN;
            END
            -- Cập nhật trạng thái lịch hẹn sang DA_CHECK_IN
            UPDATE dbo.LichHen 
            SET trangThai = 'DA_CHECK_IN'
            WHERE maHen = @maHen;
        END

        -- Khóa độc quyền hàng bộ đếm số thứ tự theo Buồng và Ngày (UPDLOCK, HOLDLOCK)
        -- Chống race condition khi nhiều quầy tiếp nhận cùng lúc
        IF NOT EXISTS (SELECT 1 FROM dbo.BoDemSoThuTuKham WITH (UPDLOCK, HOLDLOCK) WHERE maBuong = @maBuong AND ngayCapSo = @ngayHienTai)
        BEGIN
            INSERT INTO dbo.BoDemSoThuTuKham (maBuong, ngayCapSo, soCuoi)
            VALUES (@maBuong, @ngayHienTai, 1);
            SET @soCuoi = 1;
        END
        ELSE
        BEGIN
            SELECT @soCuoi = soCuoi + 1
            FROM dbo.BoDemSoThuTuKham WITH (UPDLOCK, HOLDLOCK)
            WHERE maBuong = @maBuong AND ngayCapSo = @ngayHienTai;

            UPDATE dbo.BoDemSoThuTuKham
            SET soCuoi = @soCuoi
            WHERE maBuong = @maBuong AND ngayCapSo = @ngayHienTai;
        END

        -- Sinh mã lượt khám: EX + YYYYMMDD + 5 chữ số thứ tự tổng thể
        SET @newExamID = 'EX' + CONVERT(VARCHAR(8), @ngayHienTai, 112) + RIGHT('00000' + CAST(@soCuoi AS VARCHAR(5)), 5);

        -- Thêm lượt khám
        INSERT INTO dbo.LuotKham (
            examID, maBenhNhan, maBuong, maHen,
            thoiDiemDangKy, thoiDiemCapSo, soThuTu,
            lyDoKham, trangThai, thoiDiemKetThuc
        )
        VALUES (
            @newExamID, @maBenhNhan, @maBuong, @maHen,
            @thoiDiemHienTai, @thoiDiemHienTai, @soCuoi,
            @lyDoKham, 'CHO_KHAM', NULL
        );

        -- Ghi nhật ký kiểm toán hệ thống
        INSERT INTO dbo.NhatKyThayDoi (
            loaiDoiTuong, maDoiTuong, hanhDong, loaiTacNhan,
            maTaiKhoan, maNguoiThucHien, ketQua, thoiDiem, lyDo
        )
        VALUES (
            'LuotKham', @newExamID, 'THEM', 'NHAN_VIEN',
            NULL, NULL, 'THANH_CONG', @thoiDiemHienTai, N'Tiếp nhận bệnh nhân và cấp STT tự động'
        );

        SET @examID_Out = @newExamID;
        SET @soThuTu_Out = @soCuoi;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- -------------------------------------------------------------------------------------
-- 2. THỦ TỤC THỰC HIỆN Y LỆNH VÀ TRỪ KHO TỦ TRỰC AN TOÀN
-- -------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.sp_ThucHienYLenhVaTruKho', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_ThucHienYLenhVaTruKho;
GO

CREATE PROCEDURE dbo.sp_ThucHienYLenhVaTruKho
    @maYLenh VARCHAR(20),
    @maNhanVienThucHien VARCHAR(20),
    @soLuongThucDung DECIMAL(18,4),
    @maLoTon VARCHAR(20),
    @maKhoTieuHao VARCHAR(20),
    @ketQuaThucHien NVARCHAR(500),
    @maLan_Out VARCHAR(20) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    DECLARE @thoiDiemHienTai DATETIME2(0) = SYSDATETIME();
    DECLARE @maLanMoi VARCHAR(20);
    DECLARE @maPhieuMoi VARCHAR(20);
    DECLARE @lanThuTiepTheo INT = 1;
    DECLARE @coTieuHaoKho BIT;
    DECLARE @maHang VARCHAR(20);
    DECLARE @donGiaVatLy DECIMAL(18,2) = 0;
    DECLARE @soLuongKhaDung DECIMAL(18,4) = 0;

    BEGIN TRANSACTION;
    BEGIN TRY
        -- 1. Kiểm tra y lệnh tồn tại và đang thực hiện
        SELECT @coTieuHaoKho = coTieuHaoKho, @maHang = maHang
        FROM dbo.YLenh WITH (UPDLOCK, HOLDLOCK)
        WHERE maYLenh = @maYLenh AND trangThai IN ('DANG_THUC_HIEN', 'CHO_THUC_HIEN');

        IF @coTieuHaoKho IS NULL
        BEGIN
            RAISERROR(N'Lỗi: Y lệnh không tồn tại hoặc đã hoàn tất/ngừng/hủy.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- 2. Nếu y lệnh có tiêu hao kho, kiểm tra tồn kho tủ trực
        IF @coTieuHaoKho = 1
        BEGIN
            SELECT @soLuongKhaDung = soLuongKhaDung, @donGiaVatLy = lh.donGiaNhap
            FROM dbo.LoTonKho ltk WITH (UPDLOCK, HOLDLOCK)
            JOIN dbo.LoHang lh ON ltk.maLoHang = lh.maLoHang
            WHERE ltk.maLoTon = @maLoTon AND ltk.maKho = @maKhoTieuHao AND ltk.trangThaiKhoa = 0;

            IF @soLuongKhaDung IS NULL OR @soLuongKhaDung < @soLuongThucDung
            BEGIN
                RAISERROR(N'Lỗi: Lô hàng trong tủ trực không đủ số lượng khả dụng hoặc bị khóa.', 16, 1);
                ROLLBACK TRANSACTION;
                RETURN;
            END

            -- Trừ tồn kho tủ trực
            UPDATE dbo.LoTonKho
            SET soLuongTon = soLuongTon - @soLuongThucDung,
                soLuongKhaDung = soLuongKhaDung - @soLuongThucDung
            WHERE maLoTon = @maLoTon;
        END

        -- 3. Xác định lần thứ của cữ thực hiện
        SELECT @lanThuTiepTheo = ISNULL(MAX(lanThu), 0) + 1
        FROM dbo.LanThucHienYLenh
        WHERE maYLenh = @maYLenh;

        -- 4. Sinh mã lần thực hiện và mã phiếu xuất kho
        SET @maLanMoi = 'LAN' + CONVERT(VARCHAR(8), @thoiDiemHienTai, 112) + RIGHT('00000' + CAST(ABS(CHECKSUM(NEWID())) % 10000 AS VARCHAR(5)), 5);
        SET @maPhieuMoi = 'PKHO' + CONVERT(VARCHAR(8), @thoiDiemHienTai, 112) + RIGHT('0000' + CAST(ABS(CHECKSUM(NEWID())) % 1000 AS VARCHAR(4)), 4);

        -- 5. Tạo phiếu xuất kho tiêu hao nội trú (nếu có trừ kho)
        IF @coTieuHaoKho = 1
        BEGIN
            INSERT INTO dbo.PhieuKho (
                maPhieu, loaiPhieu, maKhoNguon, maKhoDich,
                examID, admissionID, maLanNguon, maKiemKeNguon,
                maPhieuGoc, thoiDiemLap, maNguoiLap, trangThai,
                maNguoiDuyet, thoiDiemDuyet, ghiChu
            )
            VALUES (
                @maPhieuMoi, 'XUAT_TIEU_HAO_NOI_TRU', @maKhoTieuHao, NULL,
                NULL, NULL, NULL, NULL,
                NULL, @thoiDiemHienTai, @maNhanVienThucHien, 'DA_XUAT',
                @maNhanVienThucHien, @thoiDiemHienTai, N'Tự động hạch toán xuất tiêu hao cữ tiêm truyền'
            );

            INSERT INTO dbo.ChiTietPhieuKho (
                maChiTietKho, maPhieu, maLoTon, maChiTietDonNguon,
                maChiTietGoc, soLuong, donViXuat, maQuyDoiApDung,
                soLuongCoSo, donGiaVatLy, soLuongDaHoan
            )
            VALUES (
                'CTPK' + RIGHT('000000' + CAST(ABS(CHECKSUM(NEWID())) % 100000 AS VARCHAR(6)), 6),
                @maPhieuMoi, @maLoTon, NULL,
                NULL, @soLuongThucDung, N'Liều', NULL,
                @soLuongThucDung, @donGiaVatLy, 0.0000
            );
        END

        -- 6. Ghi nhận lần thực hiện y lệnh lâm sàng
        INSERT INTO dbo.LanThucHienYLenh (
            maLan, maYLenh, lanThu, thoiDiemKeHoach,
            thoiDiemThucHien, thoiDiemGhiNhan, maNhanVienThucHien,
            ketQuaThucHien, dienBienBatThuong, maLoTon, maKhoTieuHao,
            soLuongThucDung, donViThucDung, maQuyDoiApDung, maPhieuXuatKho,
            trangThaiLamSang, trangThaiKho, ghiChu
        )
        VALUES (
            @maLanMoi, @maYLenh, @lanThuTiepTheo, @thoiDiemHienTai,
            @thoiDiemHienTai, @thoiDiemHienTai, @maNhanVienThucHien,
            @ketQuaThucHien, NULL, @maLoTon, @maKhoTieuHao,
            @soLuongThucDung, N'Liều', NULL, CASE WHEN @coTieuHaoKho = 1 THEN @maPhieuMoi ELSE NULL END,
            'DA_THUC_HIEN', CASE WHEN @coTieuHaoKho = 1 THEN 'DA_HACH_TOAN' ELSE 'KHONG_AP_DUNG' END,
            N'Thực hiện thành công'
        );

        -- Gắn liên kết maLanNguon vào PhieuKho
        IF @coTieuHaoKho = 1
        BEGIN
            UPDATE dbo.PhieuKho SET maLanNguon = @maLanMoi WHERE maPhieu = @maPhieuMoi;
        END

        SET @maLan_Out = @maLanMoi;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- -------------------------------------------------------------------------------------
-- 3. THỦ TỤC QUYẾT TOÁN VIỆN PHÍ, TÍNH BHYT VÀ CẤN TRỪ TẠM ỨNG
-- -------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.sp_QuyetToanVienPhi', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_QuyetToanVienPhi;
GO

CREATE PROCEDURE dbo.sp_QuyetToanVienPhi
    @admissionID VARCHAR(20),
    @maNhanVienChot VARCHAR(20),
    @maCaTruc VARCHAR(20),
    @maQuyetToan_Out VARCHAR(20) OUTPUT,
    @tongChiPhi_Out DECIMAL(18,2) OUTPUT,
    @tienBHYT_Out DECIMAL(18,2) OUTPUT,
    @benhNhanTra_Out DECIMAL(18,2) OUTPUT,
    @soTienChenhLech_Out DECIMAL(18,2) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    DECLARE @thoiDiemHienTai DATETIME2(0) = SYSDATETIME();
    DECLARE @maQTMoi VARCHAR(20);
    DECLARE @tongChiPhi DECIMAL(18,2) = 0;
    DECLARE @tienBHYT DECIMAL(18,2) = 0;
    DECLARE @benhNhanPhaiTra DECIMAL(18,2) = 0;
    DECLARE @tongTamUng DECIMAL(18,2) = 0;
    DECLARE @soTienChenhLech DECIMAL(18,2) = 0;
    DECLARE @maBenhNhan VARCHAR(20);

    BEGIN TRANSACTION;
    BEGIN TRY
        -- Lấy mã bệnh nhân từ đợt điều trị
        SELECT @maBenhNhan = maBenhNhan
        FROM dbo.DotDieuTri
        WHERE admissionID = @admissionID;

        IF @maBenhNhan IS NULL
        BEGIN
            RAISERROR(N'Lỗi: Đợt điều trị không tồn tại.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- Hủy cờ bản hiện hành cũ nếu có
        UPDATE dbo.QuyetToan
        SET laBanHienHanh = 0
        WHERE admissionID = @admissionID AND laBanHienHanh = 1;

        -- Sinh mã quyết toán mới
        SET @maQTMoi = 'QT' + CONVERT(VARCHAR(8), @thoiDiemHienTai, 112) + RIGHT('0000' + CAST(ABS(CHECKSUM(NEWID())) % 1000 AS VARCHAR(4)), 4);

        -- Tạo bản ghi quyết toán tạm
        INSERT INTO dbo.QuyetToan (
            maQuyetToan, examID, admissionID, phienBan,
            laBanHienHanh, maQuyetToanTruoc, thoiDiemChot,
            tongChiPhi, tienBHYTChiTra, tongMienGiam,
            trangThai, maNguoiChot, ghiChu
        )
        VALUES (
            @maQTMoi, NULL, @admissionID, 1,
            1, NULL, @thoiDiemHienTai,
            0, 0, 0,
            'DA_QUYET_TOAN', @maNhanVienChot, N'Quyết toán viện phí nội trú tự động'
        );

        -- Tổng hợp tiền phòng giường nằm
        INSERT INTO dbo.ChiTietQuyetToan (
            maDongQuyetToan, maQuyetToan, loaiChiPhi,
            maPhanGiuong, soLuong, donGia, thanhTien,
            tienBHYT, tienBenhNhanTra, tyLeBHYT
        )
        SELECT 
            'DQT_G_' + RIGHT('00000' + CAST(ROW_NUMBER() OVER(ORDER BY maPhanGiuong) AS VARCHAR(5)), 5),
            @maQTMoi, 'GIUONG_BENH',
            maPhanGiuong,
            CASE WHEN DATEDIFF(DAY, tuThoiDiem, ISNULL(denThoiDiem, @thoiDiemHienTai)) = 0 THEN 1 ELSE DATEDIFF(DAY, tuThoiDiem, ISNULL(denThoiDiem, @thoiDiemHienTai)) END,
            donGiaApDung,
            CASE WHEN DATEDIFF(DAY, tuThoiDiem, ISNULL(denThoiDiem, @thoiDiemHienTai)) = 0 THEN 1 ELSE DATEDIFF(DAY, tuThoiDiem, ISNULL(denThoiDiem, @thoiDiemHienTai)) END * donGiaApDung,
            CASE WHEN DATEDIFF(DAY, tuThoiDiem, ISNULL(denThoiDiem, @thoiDiemHienTai)) = 0 THEN 1 ELSE DATEDIFF(DAY, tuThoiDiem, ISNULL(denThoiDiem, @thoiDiemHienTai)) END * donGiaApDung * 0.8,
            CASE WHEN DATEDIFF(DAY, tuThoiDiem, ISNULL(denThoiDiem, @thoiDiemHienTai)) = 0 THEN 1 ELSE DATEDIFF(DAY, tuThoiDiem, ISNULL(denThoiDiem, @thoiDiemHienTai)) END * donGiaApDung * 0.2,
            80.00
        FROM dbo.PhanGiuong
        WHERE admissionID = @admissionID;

        -- Cập nhật tổng chi phí và BHYT từ các dòng chi tiết
        SELECT 
            @tongChiPhi = ISNULL(SUM(thanhTien), 0),
            @tienBHYT = ISNULL(SUM(tienBHYT), 0),
            @benhNhanPhaiTra = ISNULL(SUM(tienBenhNhanTra), 0)
        FROM dbo.ChiTietQuyetToan
        WHERE maQuyetToan = @maQTMoi;

        UPDATE dbo.QuyetToan
        SET tongChiPhi = @tongChiPhi,
            tienBHYTChiTra = @tienBHYT
        WHERE maQuyetToan = @maQTMoi;

        -- Tính tổng tạm ứng hợp lệ của đợt điều trị
        SELECT @tongTamUng = ISNULL(SUM(soTien), 0)
        FROM dbo.GiaoDichThanhToan
        WHERE admissionID = @admissionID AND loaiGiaoDich = 'TAM_UNG' AND trangThai = 'THANH_CONG';

        -- Số tiền chênh lệch = Bệnh nhân phải trả - Tạm ứng
        -- > 0: Phải thu thêm; < 0: Bệnh viện hoàn lại tiền thừa
        SET @soTienChenhLech = @benhNhanPhaiTra - @tongTamUng;

        SET @maQuyetToan_Out = @maQTMoi;
        SET @tongChiPhi_Out = @tongChiPhi;
        SET @tienBHYT_Out = @tienBHYT;
        SET @benhNhanTra_Out = @benhNhanPhaiTra;
        SET @soTienChenhLech_Out = @soTienChenhLech;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- =====================================================================================
-- PHẦN 2: VIEWS BÁO CÁO THỐNG KÊ QUẢN LÝ BỆNH VIỆN
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- VIEW 1: BẢNG KÊ CHI PHÍ KHÁM CHỮA BỆNH THEO TỪNG BỆNH NHÂN (CHUẨN BHYT)
-- -------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.vw_BangTongHopVienPhiBenhNhan', 'V') IS NOT NULL DROP VIEW dbo.vw_BangTongHopVienPhiBenhNhan;
GO

CREATE VIEW dbo.vw_BangTongHopVienPhiBenhNhan AS
SELECT 
    bn.maBenhNhan,
    bn.hoTen AS TenBenhNhan,
    bn.gioiTinh,
    bn.soBHYT,
    ISNULL(lk.examID, dt.admissionID) AS MaHoSoLienQuan,
    CASE WHEN dt.admissionID IS NOT NULL THEN N'Nội trú' ELSE N'Ngoại trú' END AS LoaiKhamChuaBenh,
    qt.maQuyetToan,
    qt.thoiDiemChot,
    qt.tongChiPhi,
    qt.tienBHYTChiTra,
    qt.tongMienGiam,
    qt.nguoiBenhPhaiTra,
    ISNULL(SUM(CASE WHEN gd.loaiGiaoDich = 'TAM_UNG' THEN gd.soTien ELSE 0 END), 0) AS TongTamUng,
    ISNULL(SUM(CASE WHEN gd.loaiGiaoDich IN ('THANH_TOAN_DOT', 'THANH_TOAN_TOAN_BO', 'THU_THEM') THEN gd.soTien ELSE 0 END), 0) AS TongDaThuThem,
    ISNULL(SUM(CASE WHEN gd.loaiGiaoDich IN ('HOAN_UNG', 'HOAN_VIEN_PHI') THEN gd.soTien ELSE 0 END), 0) AS TongDaHoan,
    qt.trangThai AS TrangThaiQuyetToan
FROM dbo.BenhNhan bn
LEFT JOIN dbo.LuotKham lk ON bn.maBenhNhan = lk.maBenhNhan
LEFT JOIN dbo.DotDieuTri dt ON bn.maBenhNhan = dt.maBenhNhan
JOIN dbo.QuyetToan qt ON (lk.examID = qt.examID OR dt.admissionID = qt.admissionID) AND qt.laBanHienHanh = 1
LEFT JOIN dbo.GiaoDichThanhToan gd ON (lk.examID = gd.examID OR dt.admissionID = gd.admissionID) AND gd.trangThai = 'THANH_CONG'
GROUP BY 
    bn.maBenhNhan, bn.hoTen, bn.gioiTinh, bn.soBHYT,
    lk.examID, dt.admissionID, qt.maQuyetToan, qt.thoiDiemChot,
    qt.tongChiPhi, qt.tienBHYTChiTra, qt.tongMienGiam, qt.nguoiBenhPhaiTra, qt.trangThai;
GO

-- -------------------------------------------------------------------------------------
-- VIEW 2: BÁO CÁO DOANH THU VÀ ĐỐI SOÁT THEO CA TRỰC THU NGÂN
-- -------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.vw_BaoCaoDoanhThuTheoCa', 'V') IS NOT NULL DROP VIEW dbo.vw_BaoCaoDoanhThuTheoCa;
GO

CREATE VIEW dbo.vw_BaoCaoDoanhThuTheoCa AS
SELECT 
    bc.maBaoCao,
    bc.maCaTruc,
    bc.quayThuTien,
    nv.hoTen AS TenThuNgan,
    bc.thoiDiemMoCa,
    bc.thoiDiemDongCa,
    bc.tienDauCa,
    bc.tongTienThuTrongCa,
    bc.tongTienHoanTrongCa,
    (bc.tienDauCa + bc.tongTienThuTrongCa - bc.tongTienHoanTrongCa) AS TienMatHeThongTinh,
    bc.tienThucDem,
    bc.chenhLech,
    bc.trangThai AS TrangThaiCa,
    COUNT(dtc.maGiaoDich) AS SoLuongGiaoDichTrongCa
FROM dbo.BaoCaoVienPhi bc
JOIN dbo.NhanVien nv ON bc.maThuNgan = nv.maNhanVien
LEFT JOIN dbo.ChiTietDoiSoatCa dtc ON bc.maBaoCao = dtc.maBaoCao
GROUP BY 
    bc.maBaoCao, bc.maCaTruc, bc.quayThuTien, nv.hoTen,
    bc.thoiDiemMoCa, bc.thoiDiemDongCa, bc.tienDauCa,
    bc.tongTienThuTrongCa, bc.tongTienHoanTrongCa, bc.tienThucDem,
    bc.chenhLech, bc.trangThai;
GO

-- -------------------------------------------------------------------------------------
-- VIEW 3: CẢNH BÁO TỒN KHO DƯỢC VÀ HẠN DÙNG THUỐC (FEFO SAFETY)
-- -------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.vw_TheoDoiTonKhoVaCanhBaoHetHan', 'V') IS NOT NULL DROP VIEW dbo.vw_TheoDoiTonKhoVaCanhBaoHetHan;
GO

CREATE VIEW dbo.vw_TheoDoiTonKhoVaCanhBaoHetHan AS
SELECT 
    kd.tenKho,
    hh.maHang,
    hh.tenHang,
    hh.donViCoSo,
    lh.soLoNhaSanXuat,
    lh.hanSuDung,
    DATEDIFF(DAY, CAST(SYSDATETIME() AS DATE), lh.hanSuDung) AS SoNgayConLai,
    ltk.soLuongTon,
    ltk.soLuongKhaDung,
    ltk.viTriDayKe,
    CASE 
        WHEN DATEDIFF(DAY, CAST(SYSDATETIME() AS DATE), lh.hanSuDung) <= 0 THEN N'ĐÃ HẾT HẠN - KHÓA XUẤT'
        WHEN DATEDIFF(DAY, CAST(SYSDATETIME() AS DATE), lh.hanSuDung) <= 90 THEN N'CẢNH BÁO: HẾT HẠN DƯỚI 3 THÁNG'
        WHEN DATEDIFF(DAY, CAST(SYSDATETIME() AS DATE), lh.hanSuDung) <= 180 THEN N'CẢNH BÁO: HẾT HẠN DƯỚI 6 THÁNG'
        ELSE N'HẠN DÙNG AN TOÀN'
    END AS MucDoCanhBaoHanDung,
    CASE 
        WHEN ltk.soLuongKhaDung <= 10 THEN N'CẢNH BÁO: SẮP HẾT HÀNG'
        ELSE N'TỒN KHO ĐỦ'
    END AS MucDoCanhBaoTonKho
FROM dbo.LoTonKho ltk
JOIN dbo.KhoDuoc kd ON ltk.maKho = kd.maKho
JOIN dbo.LoHang lh ON ltk.maLoHang = lh.maLoHang
JOIN dbo.HangHoaYTe hh ON lh.maHang = hh.maHang;
GO

PRINT N'====================================================================================';
PRINT N'>>> ĐÃ TẠO THÀNH CÔNG 3 STORED PROCEDURES VÀ 3 VIEWS BÁO CÁO NGHIỆP VỤ!';
PRINT N'====================================================================================';
GO


/*
CLINICCARE HIS - 6 CHUYEN KHOA KHOP GIAO DIEN MEDICARE
Nội tổng quát, Tim mạch, Tai Mũi Họng, Da liễu, Sản phụ khoa, Cơ xương khớp.
Chạy trên ClinicCare_HIS đã tạo bằng script gốc. Không xóa database.
Giữ KHOA01 (Khám bệnh), KHOA02 (Cấp cứu), KHOA04..07 phục vụ vận hành.
Đổi tên KHOA03 từ Nội tổng hợp thành Nội tổng quát, giữ nguyên khóa và lịch sử.
Nhân sự, tài khoản và vị trí bổ sung đều là dữ liệu demo.
Các tài khoản mới bị KHOA_TAM_THOI: backend phải cấp hash mật khẩu thật trước khi mở.
Không phải mã triển khai đăng nhập hoặc kiểm tra quyền API.
*/
USE ClinicCare_HIS;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO
BEGIN TRY
    BEGIN TRANSACTION;
    IF NOT EXISTS (SELECT 1 FROM dbo.Khoa WHERE maKhoa = 'KHOA03')
        THROW 51000, N'Chưa có KHOA03. Hãy chạy script tạo cơ sở dữ liệu trước.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE maNhanVien = 'NV009')
        THROW 51001, N'Chưa có quản trị viên mẫu NV009 để ghi nhận người cấp quyền.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.VaiTro WHERE maVaiTro = 'VT_BACSI')
        THROW 51002, N'Chưa có vai trò VT_BACSI.', 1;

    DECLARE @ChuyenKhoa TABLE (
        maKhoa VARCHAR(20) PRIMARY KEY,
        tenKhoa NVARCHAR(100),
        viTri NVARCHAR(100)
    );
    INSERT INTO @ChuyenKhoa VALUES
        ('KHOA03', N'Nội tổng quát', N'Tầng 3 - Tòa nhà B'),
        ('KHOA08', N'Tim mạch', N'Khu khám chuyên khoa - Phòng 201'),
        ('KHOA09', N'Tai Mũi Họng', N'Khu khám chuyên khoa - Phòng 202'),
        ('KHOA10', N'Da liễu', N'Khu khám chuyên khoa - Phòng 203'),
        ('KHOA11', N'Sản phụ khoa', N'Khu khám chuyên khoa - Phòng 204'),
        ('KHOA12', N'Cơ xương khớp', N'Khu khám chuyên khoa - Phòng 205');

    -- Không ghi đè mã khoa nếu mã đã được dùng cho khoa khác.
    IF EXISTS (
        SELECT 1 FROM @ChuyenKhoa c JOIN dbo.Khoa k ON k.maKhoa=c.maKhoa
        WHERE c.maKhoa <> 'KHOA03' AND k.tenKhoa <> c.tenKhoa
    ) THROW 51003, N'Mã KHOA08..KHOA12 đã được sử dụng cho khoa khác. Chưa thay đổi dữ liệu.', 1;

    UPDATE dbo.Khoa SET tenKhoa=N'Nội tổng quát' WHERE maKhoa='KHOA03';
    INSERT INTO dbo.Khoa (maKhoa,tenKhoa,loaiKhoa,maTruongKhoa,viTri,dangHoatDong)
    SELECT c.maKhoa,c.tenKhoa,'LAM_SANG',NULL,c.viTri,1
    FROM @ChuyenKhoa c WHERE NOT EXISTS(SELECT 1 FROM dbo.Khoa k WHERE k.maKhoa=c.maKhoa);

    DECLARE @BacSi TABLE (
        maNhanVien VARCHAR(20) PRIMARY KEY,
        hoTen NVARCHAR(100), maKhoa VARCHAR(20),
        maTaiKhoan VARCHAR(20), tenDangNhap VARCHAR(50),
        maGanVaiTro VARCHAR(20), maBuong VARCHAR(20)
    );
    INSERT INTO @BacSi VALUES
        ('NV010',N'Nguyễn Minh Tâm','KHOA03','TK010','bs_noitongquat','GVT010','PK_NTQ'),
        ('NV011',N'Trần Hoàng Anh','KHOA08','TK011','bs_timmach','GVT011','PK_TM'),
        ('NV012',N'Lê Thu Hà','KHOA09','TK012','bs_taimuihong','GVT012','PK_TMH'),
        ('NV013',N'Phạm Ngọc Lan','KHOA10','TK013','bs_dalieu','GVT013','PK_DL'),
        ('NV014',N'Võ Thị Mai','KHOA11','TK014','bs_sanphukhoa','GVT014','PK_SPK'),
        ('NV015',N'Đặng Quốc Huy','KHOA12','TK015','bs_coxuongkhop','GVT015','PK_CXK');

    IF EXISTS(SELECT 1 FROM @BacSi b JOIN dbo.NhanVien n ON n.maNhanVien=b.maNhanVien
              WHERE n.hoTen<>b.hoTen OR n.maKhoa<>b.maKhoa OR n.chuyenMon<>'BAC_SI')
        THROW 51004,N'Mã nhân viên NV010..NV015 bị trùng với hồ sơ khác.',1;
    IF EXISTS(SELECT 1 FROM @BacSi b JOIN dbo.TaiKhoan t
              ON t.maTaiKhoan=b.maTaiKhoan OR t.tenDangNhap=b.tenDangNhap OR t.maNhanVien=b.maNhanVien
              WHERE t.maTaiKhoan<>b.maTaiKhoan OR t.tenDangNhap<>b.tenDangNhap
                 OR ISNULL(t.maNhanVien,'')<>b.maNhanVien OR t.loaiChuThe<>'NHAN_VIEN')
        THROW 51005,N'Mã, tên đăng nhập hoặc liên kết bác sĩ bị trùng với tài khoản khác.',1;
    IF EXISTS(SELECT 1 FROM @BacSi b JOIN dbo.BuongKham p ON p.maBuong=b.maBuong WHERE p.maKhoa<>b.maKhoa)
        THROW 51006,N'Mã phòng khám đã thuộc khoa khác.',1;
    IF EXISTS(SELECT 1 FROM @BacSi b JOIN dbo.TaiKhoanVaiTro g ON g.maGanVaiTro=b.maGanVaiTro
              WHERE g.maTaiKhoan<>b.maTaiKhoan OR g.maVaiTro<>'VT_BACSI' OR ISNULL(g.maKhoaPhamVi,'')<>b.maKhoa)
        THROW 51007,N'Mã gán vai trò đã thuộc cấu hình khác.',1;

    INSERT INTO dbo.NhanVien (maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon,soChungChiHanhNghe,soDienThoai,email,dangLamViec)
    SELECT b.maNhanVien,b.hoTen,b.maKhoa,N'Bác sĩ chuyên khoa (demo)','BAC_SI',NULL,NULL,
           b.tenDangNhap+'@medicare.example',1
    FROM @BacSi b WHERE NOT EXISTS(SELECT 1 FROM dbo.NhanVien n WHERE n.maNhanVien=b.maNhanVien);

    INSERT INTO dbo.BuongKham (maBuong,maKhoa,tenBuong,viTri,gioiHanLuotMoiNgay,dangHoatDong)
    SELECT b.maBuong,b.maKhoa,N'Phòng khám '+c.tenKhoa,c.viTri,50,1
    FROM @BacSi b JOIN @ChuyenKhoa c ON c.maKhoa=b.maKhoa
    WHERE NOT EXISTS(SELECT 1 FROM dbo.BuongKham p WHERE p.maBuong=b.maBuong);

    -- Khóa tài khoản mới để chuỗi giữ chỗ không bị dùng như mật khẩu thật.
    INSERT INTO dbo.TaiKhoan (maTaiKhoan,tenDangNhap,matKhauHash,loaiChuThe,maNhanVien,maBenhNhan,trangThai,ngayTao)
    SELECT b.maTaiKhoan,b.tenDangNhap,'DEMO_DISABLED_REQUIRES_REAL_PASSWORD_HASH','NHAN_VIEN',b.maNhanVien,NULL,'KHOA_TAM_THOI',SYSDATETIME()
    FROM @BacSi b WHERE NOT EXISTS(SELECT 1 FROM dbo.TaiKhoan t WHERE t.maTaiKhoan=b.maTaiKhoan);

    -- Một tài khoản được gán nhiều khoa bằng nhiều dòng TaiKhoanVaiTro.
    -- Mỗi dòng dưới đây chỉ cấp vai trò Bác sĩ trong đúng khoa được chọn.
    INSERT INTO dbo.TaiKhoanVaiTro
        (maGanVaiTro,maTaiKhoan,maVaiTro,maKhoaPhamVi,ngayHieuLuc,ngayHetHan,trangThai,maNguoiCap,maNguoiThuHoi)
    SELECT b.maGanVaiTro,b.maTaiKhoan,'VT_BACSI',b.maKhoa,SYSDATETIME(),NULL,'HIEU_LUC','NV009',NULL
    FROM @BacSi b
    WHERE NOT EXISTS(SELECT 1 FROM dbo.TaiKhoanVaiTro g WHERE g.maGanVaiTro=b.maGanVaiTro)
      AND NOT EXISTS(SELECT 1 FROM dbo.TaiKhoanVaiTro g
                     WHERE g.maTaiKhoan=b.maTaiKhoan AND g.maVaiTro='VT_BACSI'
                       AND g.maKhoaPhamVi=b.maKhoa AND g.trangThai='HIEU_LUC');

    -- Kết quả đối chiếu 6 chuyên khoa, bác sĩ, phòng khám và phạm vi quyền.
    SELECT c.maKhoa,c.tenKhoa,b.hoTen AS BacSiMau,b.maBuong,
           b.tenDangNhap,t.trangThai AS TrangThaiTaiKhoan,g.maKhoaPhamVi
    FROM @ChuyenKhoa c
    JOIN @BacSi b ON b.maKhoa=c.maKhoa
    JOIN dbo.TaiKhoan t ON t.maTaiKhoan=b.maTaiKhoan
    JOIN dbo.TaiKhoanVaiTro g ON g.maTaiKhoan=t.maTaiKhoan
        AND g.maVaiTro='VT_BACSI' AND g.maKhoaPhamVi=c.maKhoa AND g.trangThai='HIEU_LUC'
    ORDER BY c.maKhoa;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
