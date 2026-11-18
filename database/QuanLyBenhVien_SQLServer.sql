-- SQL Server 2019/2022. Chạy toàn bộ file bằng SSMS.
USE master;
GO
IF DB_ID(N'QuanLyBenhVien') IS NULL
    EXEC(N'CREATE DATABASE [QuanLyBenhVien];');
GO
USE [QuanLyBenhVien];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
IF DB_NAME() <> N'QuanLyBenhVien'
    THROW 50001, N'Không thể mở database QuanLyBenhVien.', 1;
IF EXISTS (SELECT 1 FROM sys.tables WHERE is_ms_shipped = 0)
    THROW 50002, N'Database đã có bảng. Dừng để giữ dữ liệu.', 1;

BEGIN TRY
    BEGIN TRANSACTION;
    EXEC sys.sp_executesql N'-- 1. Bảng Khoa
-- Ghi chú: maTruongKhoa là khóa ngoại trỏ NhanVien, sẽ được bổ sung qua ALTER TABLE
CREATE TABLE dbo.Khoa (
    maKhoa VARCHAR(20) NOT NULL PRIMARY KEY,
    tenKhoa NVARCHAR(100) NOT NULL,
    loaiKhoa VARCHAR(30) NOT NULL CHECK (loaiKhoa IN (''KHAM_BENH'', ''LAM_SANG'', ''CAN_LAM_SANG'', ''DUOC'', ''HANH_CHINH'')),
    maTruongKhoa VARCHAR(20) NULL,
    viTri NVARCHAR(100) NULL,
    dangHoatDong BIT NOT NULL DEFAULT 1
);';
    EXEC sys.sp_executesql N'-- 2. Bảng BenhNhan
CREATE TABLE dbo.BenhNhan (
    maBenhNhan VARCHAR(20) NOT NULL PRIMARY KEY,
    hoTen NVARCHAR(100) NOT NULL,
    ngaySinh DATE NULL,
    gioiTinh NVARCHAR(10) NOT NULL DEFAULT N''Chưa rõ'' CHECK (gioiTinh IN (N''Nam'', N''Nữ'', N''Khác'', N''Chưa rõ'')),
    soDinhDanh VARCHAR(12) NULL,
    soBHYT VARCHAR(15) NULL,
    soDienThoai VARCHAR(20) NULL,
    diaChi NVARCHAR(255) NULL,
    tienSuBenh NVARCHAR(MAX) NULL,
    trangThaiDiUng VARCHAR(20) NOT NULL DEFAULT ''CHUA_KHAI_THAC'' CHECK (trangThaiDiUng IN (''CHUA_KHAI_THAC'', ''KHONG_GHI_NHAN'', ''CO_DI_UNG'')),
    diUngThuoc NVARCHAR(MAX) NULL,
    trangThaiXacMinh VARCHAR(20) NOT NULL DEFAULT ''CHUA_XAC_MINH'' CHECK (trangThaiXacMinh IN (''CHUA_XAC_MINH'', ''DA_XAC_MINH'')),
    ngayTiepNhanDauTien DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT CK_BenhNhan_DiUng CHECK (trangThaiDiUng != ''CO_DI_UNG'' OR diUngThuoc IS NOT NULL)
);';
    EXEC sys.sp_executesql N'-- 3. Bảng VaiTro
CREATE TABLE dbo.VaiTro (
    maVaiTro VARCHAR(20) NOT NULL PRIMARY KEY,
    tenVaiTro NVARCHAR(100) NOT NULL,
    moTa NVARCHAR(255) NULL,
    dangHoatDong BIT NOT NULL DEFAULT 1
);';
    EXEC sys.sp_executesql N'-- 4. Bảng Quyen
CREATE TABLE dbo.Quyen (
    maQuyen VARCHAR(50) NOT NULL PRIMARY KEY,
    tenQuyen NVARCHAR(100) NOT NULL,
    taiNguyen VARCHAR(50) NOT NULL,
    hanhDong VARCHAR(30) NOT NULL,
    moTa NVARCHAR(255) NULL
);';
    EXEC sys.sp_executesql N'-- 5. Bảng HangHoaYTe
CREATE TABLE dbo.HangHoaYTe (
    maHang VARCHAR(20) NOT NULL PRIMARY KEY,
    tenHang NVARCHAR(150) NOT NULL,
    donViCoSo NVARCHAR(30) NOT NULL,
    loaiHang VARCHAR(20) NOT NULL CHECK (loaiHang IN (''THUOC'', ''VAT_TU'')),
    donGiaNhapBinhQuan DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (donGiaNhapBinhQuan >= 0),
    donGiaXuatCoSo DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (donGiaXuatCoSo >= 0),
    giaBHYT DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (giaBHYT >= 0),
    dangKinhDoanh BIT NOT NULL DEFAULT 1,
    CONSTRAINT UQ_HangHoa_Loai UNIQUE (maHang, loaiHang)
);';
    EXEC sys.sp_executesql N'-- 6. Bảng NhanVien
CREATE TABLE dbo.NhanVien (
    maNhanVien VARCHAR(20) NOT NULL PRIMARY KEY,
    hoTen NVARCHAR(100) NOT NULL,
    maKhoa VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    chucDanh NVARCHAR(100) NOT NULL,
    chuyenMon VARCHAR(30) NOT NULL CHECK (chuyenMon IN (''BAC_SI'', ''DIEU_DUONG'', ''DUOC_SI'', ''KY_THUAT_VIEN'', ''THU_NGAN'', ''QUAN_TRI'', ''KY_SU'')),
    soChungChiHanhNghe VARCHAR(50) NULL,
    soDienThoai VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    dangLamViec BIT NOT NULL DEFAULT 1
);';
    EXEC sys.sp_executesql N'-- 7. Bảng BuongKham
CREATE TABLE dbo.BuongKham (
    maBuong VARCHAR(20) NOT NULL PRIMARY KEY,
    maKhoa VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    tenBuong NVARCHAR(100) NOT NULL,
    viTri NVARCHAR(100) NULL,
    gioiHanLuotMoiNgay INT NOT NULL DEFAULT 50 CHECK (gioiHanLuotMoiNgay > 0),
    dangHoatDong BIT NOT NULL DEFAULT 1
);';
    EXEC sys.sp_executesql N'-- 8. Bảng BuongBenh
CREATE TABLE dbo.BuongBenh (
    maBuongBenh VARCHAR(20) NOT NULL PRIMARY KEY,
    maKhoa VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    tenBuong NVARCHAR(100) NOT NULL,
    loaiBuong VARCHAR(30) NOT NULL DEFAULT ''TIEU_CHUAN'' CHECK (loaiBuong IN (''TIEU_CHUAN'', ''DICH_VU'', ''CACH_LY'', ''HOI_SUC'')),
    soGiuongToiDa INT NOT NULL DEFAULT 4 CHECK (soGiuongToiDa > 0),
    viTri NVARCHAR(100) NULL,
    dangHoatDong BIT NOT NULL DEFAULT 1
);';
    EXEC sys.sp_executesql N'-- 9. Bảng KhoDuoc
CREATE TABLE dbo.KhoDuoc (
    maKho VARCHAR(20) NOT NULL PRIMARY KEY,
    tenKho NVARCHAR(100) NOT NULL,
    maKhoa VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    loaiKho VARCHAR(30) NOT NULL CHECK (loaiKho IN (''KHO_TONG'', ''KHO_LE_NGOAI_TRU'', ''KHO_NOI_TRU'', ''TU_TRUC_KHOA'')),
    viTri NVARCHAR(100) NULL,
    maKiemKeDangMo VARCHAR(20) NULL,
    dangKiemKe AS (CASE WHEN maKiemKeDangMo IS NOT NULL THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END),
    dangHoatDong BIT NOT NULL DEFAULT 1
);';
    EXEC sys.sp_executesql N'-- 10. Bảng ThietBiYTe
CREATE TABLE dbo.ThietBiYTe (
    maThietBi VARCHAR(20) NOT NULL PRIMARY KEY,
    tenThietBi NVARCHAR(150) NOT NULL,
    maKhoaQuanLy VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    hangSanXuat NVARCHAR(100) NULL,
    nuocSanXuat NVARCHAR(100) NULL,
    namSanXuat INT NULL,
    ngayDuaVaoSuDung DATE NOT NULL,
    soSerial VARCHAR(50) NULL,
    trangThai VARCHAR(30) NOT NULL DEFAULT ''HOAT_DONG'' CHECK (trangThai IN (''HOAT_DONG'', ''BAO_HONG'', ''DANG_BAO_TRI'', ''NGUNG_SU_DUNG'', ''THANH_LY'')),
    dangHoatDong BIT NOT NULL DEFAULT 1
);';
    EXEC sys.sp_executesql N'-- 11. Bảng TaiKhoan
CREATE TABLE dbo.TaiKhoan (
    maTaiKhoan VARCHAR(20) NOT NULL PRIMARY KEY,
    tenDangNhap VARCHAR(50) NOT NULL UNIQUE,
    matKhauHash VARCHAR(255) NOT NULL,
    loaiChuThe VARCHAR(20) NOT NULL CHECK (loaiChuThe IN (''NHAN_VIEN'', ''NGUOI_BENH'')),
    maNhanVien VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    maBenhNhan VARCHAR(20) NULL REFERENCES dbo.BenhNhan(maBenhNhan),
    trangThai VARCHAR(20) NOT NULL DEFAULT ''HOAT_DONG'' CHECK (trangThai IN (''HOAT_DONG'', ''KHOA_TAM_THOI'', ''VO_HIEU_HOA'')),
    ngayTao DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    lanDangNhapCuoi DATETIME2(0) NULL,
    CONSTRAINT CK_TaiKhoan_XOR CHECK ((maNhanVien IS NOT NULL AND maBenhNhan IS NULL) OR (maNhanVien IS NULL AND maBenhNhan IS NOT NULL))
);';
    EXEC sys.sp_executesql N'-- 12. Bảng VaiTroQuyen
CREATE TABLE dbo.VaiTroQuyen (
    maCapQuyen VARCHAR(20) NOT NULL PRIMARY KEY,
    maVaiTro VARCHAR(20) NOT NULL REFERENCES dbo.VaiTro(maVaiTro),
    maQuyen VARCHAR(50) NOT NULL REFERENCES dbo.Quyen(maQuyen),
    ngayCap DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    trangThai VARCHAR(20) NOT NULL DEFAULT ''HIEU_LUC'' CHECK (trangThai IN (''HIEU_LUC'', ''DA_THU_HOI'')),
    maNguoiCap VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    maNguoiThuHoi VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    CONSTRAINT UQ_VaiTroQuyen UNIQUE (maVaiTro, maQuyen)
);';
    EXEC sys.sp_executesql N'-- 13. Bảng TaiKhoanVaiTro
CREATE TABLE dbo.TaiKhoanVaiTro (
    maGanVaiTro VARCHAR(20) NOT NULL PRIMARY KEY,
    maTaiKhoan VARCHAR(20) NOT NULL REFERENCES dbo.TaiKhoan(maTaiKhoan),
    maVaiTro VARCHAR(20) NOT NULL REFERENCES dbo.VaiTro(maVaiTro),
    maKhoaPhamVi VARCHAR(20) NULL REFERENCES dbo.Khoa(maKhoa),
    maBuongKham VARCHAR(20) NULL REFERENCES dbo.BuongKham(maBuong),
    phamViDuLieu VARCHAR(20) NOT NULL DEFAULT ''THEO_KHOA'' CHECK (phamViDuLieu IN (''TOAN_VIEN'', ''THEO_KHOA'', ''THEO_BUONG'', ''CA_NHAN'')),
    duocPheDuyetYLenh BIT NOT NULL DEFAULT 0,
    duocKySo BIT NOT NULL DEFAULT 0,
    phamViPhanHe VARCHAR(20) NOT NULL DEFAULT ''CA_HAI'' CHECK (phamViPhanHe IN (''NGOAI_TRU'', ''NOI_TRU'', ''CA_HAI'')),
    ngayHieuLuc DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    ngayHetHan DATETIME2(0) NULL,
    trangThai VARCHAR(20) NOT NULL DEFAULT ''HIEU_LUC'' CHECK (trangThai IN (''HIEU_LUC'', ''DA_THU_HOI'', ''HET_HAN'')),
    maNguoiCap VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    maNguoiThuHoi VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    CONSTRAINT CK_TaiKhoanVaiTro_Han CHECK (ngayHetHan IS NULL OR ngayHetHan >= ngayHieuLuc)
);';
    EXEC sys.sp_executesql N'-- 14. Bảng Thuoc
CREATE TABLE dbo.Thuoc (
    maHang VARCHAR(20) NOT NULL PRIMARY KEY,
    loaiHang VARCHAR(20) NOT NULL DEFAULT ''THUOC'' CHECK (loaiHang = ''THUOC''),
    hoatChat NVARCHAR(150) NOT NULL,
    hamLuong NVARCHAR(100) NOT NULL,
    duongDung NVARCHAR(100) NOT NULL,
    dangBaoChe NVARCHAR(100) NOT NULL,
    nhomDoc NVARCHAR(100) NULL,
    CONSTRAINT FK_Thuoc_Cha FOREIGN KEY (maHang, loaiHang) REFERENCES dbo.HangHoaYTe(maHang, loaiHang)
);';
    EXEC sys.sp_executesql N'-- 15. Bảng VatTuYTe
CREATE TABLE dbo.VatTuYTe (
    maHang VARCHAR(20) NOT NULL PRIMARY KEY,
    loaiHang VARCHAR(20) NOT NULL DEFAULT ''VAT_TU'' CHECK (loaiHang = ''VAT_TU''),
    quyCach NVARCHAR(100) NOT NULL,
    vatLieu NVARCHAR(100) NULL,
    voTrung BIT NOT NULL DEFAULT 1,
    taiSuDung BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_VatTuYTe_Cha FOREIGN KEY (maHang, loaiHang) REFERENCES dbo.HangHoaYTe(maHang, loaiHang)
);';
    EXEC sys.sp_executesql N'-- 16. Bảng LoHang
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
);';
    EXEC sys.sp_executesql N'-- 17. Bảng QuyDoiDonVi
CREATE TABLE dbo.QuyDoiDonVi (
    maQuyDoi VARCHAR(20) NOT NULL PRIMARY KEY,
    maHang VARCHAR(20) NOT NULL REFERENCES dbo.HangHoaYTe(maHang),
    tenDonViQuyDoi NVARCHAR(30) NOT NULL,
    heSoQuyDoi DECIMAL(28,8) NOT NULL CHECK (heSoQuyDoi > 0),
    tuNgay DATETIME2(0) NOT NULL,
    denNgay DATETIME2(0) NULL,
    maNguoiDuyet VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    CONSTRAINT CK_QuyDoi_ThoiGian CHECK (denNgay IS NULL OR denNgay >= tuNgay)
);';
    EXEC sys.sp_executesql N'-- 18. Bảng DichVuKyThuat
CREATE TABLE dbo.DichVuKyThuat (
    maDichVu VARCHAR(20) NOT NULL PRIMARY KEY,
    tenDichVu NVARCHAR(150) NOT NULL,
    maKhoaThucHien VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    loaiDichVu VARCHAR(30) NOT NULL CHECK (loaiDichVu IN (''XET_NGHIEM'', ''CDHA'', ''THU_THUAT'', ''PHAU_THUAT'')),
    loaiKetQua VARCHAR(20) NOT NULL CHECK (loaiKetQua IN (''XET_NGHIEM'', ''MO_TA'')),
    donGia DECIMAL(18,2) NOT NULL CHECK (donGia >= 0),
    giaBHYT DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (giaBHYT >= 0),
    thoiGianTrungBinhPhut INT NOT NULL DEFAULT 30 CHECK (thoiGianTrungBinhPhut > 0),
    dangHoatDong BIT NOT NULL DEFAULT 1
);';
    EXEC sys.sp_executesql N'-- 19. Bảng BoDemSoThuTuKham
CREATE TABLE dbo.BoDemSoThuTuKham (
    maBuong VARCHAR(20) NOT NULL REFERENCES dbo.BuongKham(maBuong),
    ngayCapSo DATE NOT NULL,
    soThuTuHienTai INT NOT NULL DEFAULT 0 CHECK (soThuTuHienTai >= 0),
    PRIMARY KEY (maBuong, ngayCapSo)
);';
    EXEC sys.sp_executesql N'-- 20. Bảng GiuongBenh
CREATE TABLE dbo.GiuongBenh (
    maGiuong VARCHAR(20) NOT NULL PRIMARY KEY,
    maBuongBenh VARCHAR(20) NOT NULL REFERENCES dbo.BuongBenh(maBuongBenh),
    soHieuGiuong VARCHAR(20) NOT NULL,
    loaiGiuong VARCHAR(30) NOT NULL DEFAULT ''THUONG'' CHECK (loaiGiuong IN (''THUONG'', ''CAP_CUU'', ''HOI_SUC_VIP'')),
    donGiaNgay DECIMAL(18,2) NOT NULL CHECK (donGiaNgay >= 0),
    trangThaiHienTai VARCHAR(30) NOT NULL DEFAULT ''TRONG'' CHECK (trangThaiHienTai IN (''TRONG'', ''DANG_SU_DUNG'', ''DANG_VE_SINH'', ''BAO_TRI'', ''KHOA'')),
    dangHoatDong BIT NOT NULL DEFAULT 1,
    CONSTRAINT UQ_Giuong_BuongSo UNIQUE (maBuongBenh, soHieuGiuong)
);';
    EXEC sys.sp_executesql N'-- 21. Bảng PhieuBaoHong
CREATE TABLE dbo.PhieuBaoHong (
    maBaoHong VARCHAR(20) NOT NULL PRIMARY KEY,
    maThietBi VARCHAR(20) NOT NULL REFERENCES dbo.ThietBiYTe(maThietBi),
    thoiDiemBao DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maNguoiBao VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    moTaSuCo NVARCHAR(MAX) NOT NULL,
    mucDoUuTien VARCHAR(20) NOT NULL DEFAULT ''THUONG'' CHECK (mucDoUuTien IN (''THAP'', ''THUONG'', ''CAO'', ''KHAN_CAP'')),
    trangThai VARCHAR(30) NOT NULL DEFAULT ''CHO_TIEP_NHAN'' CHECK (trangThai IN (''CHO_TIEP_NHAN'', ''DA_TIEP_NHAN'', ''DANG_SUA_CHUA'', ''DA_KHAC_PHUC'', ''KHONG_THE_SUA'')),
    maNguoiTiepNhan VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemTiepNhan DATETIME2(0) NULL
);';
    EXEC sys.sp_executesql N'-- 22. Bảng BienBanBaoTri
CREATE TABLE dbo.BienBanBaoTri (
    maBaoTri VARCHAR(20) NOT NULL PRIMARY KEY,
    maThietBi VARCHAR(20) NOT NULL REFERENCES dbo.ThietBiYTe(maThietBi),
    maBaoHong VARCHAR(20) NULL REFERENCES dbo.PhieuBaoHong(maBaoHong),
    loaiBaoTri VARCHAR(30) NOT NULL CHECK (loaiBaoTri IN (''DINH_KY'', ''SUA_CHUA_SU_CO'', ''HIEU_CHUAN_KIEM_DINH'')),
    thoiDiemBatDau DATETIME2(0) NOT NULL,
    thoiDiemKetThuc DATETIME2(0) NULL,
    maKySuThucHien VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    donViBaoTriNgoai NVARCHAR(150) NULL,
    noiDungThucHien NVARCHAR(MAX) NOT NULL,
    ketQuaBaoTri VARCHAR(30) NOT NULL DEFAULT ''HOAN_TAT'' CHECK (ketQuaBaoTri IN (''HOAN_TAT'', ''CHUA_DAT'', ''CHO_LINH_KIEN'')),
    chiPhiSuaChua DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (chiPhiSuaChua >= 0),
    maNguoiNghiemThu VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemNghiemThu DATETIME2(0) NULL,
    danhGiaNghiemThu NVARCHAR(500) NULL,
    CONSTRAINT CK_BaoTri_ThoiGian CHECK (thoiDiemKetThuc IS NULL OR thoiDiemKetThuc >= thoiDiemBatDau)
);';
    EXEC sys.sp_executesql N'-- 23. Bảng BaoCaoVienPhi
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
    trangThai VARCHAR(20) NOT NULL DEFAULT ''DANG_MO'' CHECK (trangThai IN (''DANG_MO'', ''DA_DONG'', ''DA_DOI_SOAT'', ''DA_KHOA'')),
    maNguoiDoiSoat VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    ghiChu NVARCHAR(500) NULL
);';
    EXEC sys.sp_executesql N'-- 24. Bảng NhatKyThayDoi
CREATE TABLE dbo.NhatKyThayDoi (
    maNhatKy BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    loaiDoiTuong VARCHAR(50) NOT NULL,
    maDoiTuong VARCHAR(100) NOT NULL,
    hanhDong VARCHAR(40) NOT NULL,
    loaiTacNhan VARCHAR(20) NOT NULL CHECK (loaiTacNhan IN (''NHAN_VIEN'', ''NGUOI_BENH'', ''DICH_VU'')),
    maTaiKhoan VARCHAR(20) NULL REFERENCES dbo.TaiKhoan(maTaiKhoan),
    maNguoiThucHien VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    maDichVuNguon VARCHAR(50) NULL,
    maTuongQuan VARCHAR(100) NULL,
    ketQua VARCHAR(20) NOT NULL CHECK (ketQua IN (''THANH_CONG'', ''THAT_BAI'')),
    thoiDiem DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    lyDo NVARCHAR(500) NULL,
    duLieuTruoc NVARCHAR(MAX) NULL,
    duLieuSau NVARCHAR(MAX) NULL
);';
    EXEC sys.sp_executesql N'-- 25. Bảng LichHen
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
    trangThai VARCHAR(30) NOT NULL DEFAULT ''DA_DAT'' CHECK (trangThai IN (''DA_DAT'', ''DA_CHECK_IN'', ''HOAN_TAT'', ''DA_HUY'', ''QUA_HEN'')),
    thoiDiemDat DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maNguoiXacNhan VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien)
);';
    EXEC sys.sp_executesql N'-- 26. Bảng LuotKham
CREATE TABLE dbo.LuotKham (
    maLuotKham VARCHAR(20) NOT NULL PRIMARY KEY,
    maBenhNhan VARCHAR(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
    maBuong VARCHAR(20) NOT NULL REFERENCES dbo.BuongKham(maBuong),
    maHen VARCHAR(20) NULL REFERENCES dbo.LichHen(maHen),
    thoiDiemDangKy DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    thoiDiemCapSo DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    ngayKham AS CAST(thoiDiemCapSo AS DATE) PERSISTED,
    soThuTu INT NOT NULL CHECK (soThuTu > 0),
    lyDoKham NVARCHAR(255) NOT NULL,
    trangThai VARCHAR(30) NOT NULL DEFAULT ''CHO_KHAM'' CHECK (trangThai IN (''CHO_KHAM'', ''DANG_KHAM'', ''CHO_KET_QUA_CLS'', ''HOAN_TAT_KHAM'', ''DA_HUY'')),
    thoiDiemKetThuc DATETIME2(0) NULL,
    CONSTRAINT CK_LuotKham_ThoiDiem CHECK (thoiDiemKetThuc IS NULL OR thoiDiemKetThuc >= thoiDiemDangKy)
);';
    EXEC sys.sp_executesql N'-- 27. Bảng DotDieuTri
CREATE TABLE dbo.DotDieuTri (
    maDotDieuTri VARCHAR(20) NOT NULL PRIMARY KEY,
    maBenhNhan VARCHAR(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
    maLuotKham VARCHAR(20) NULL REFERENCES dbo.LuotKham(maLuotKham),
    maKhoaDieuTri VARCHAR(20) NOT NULL REFERENCES dbo.Khoa(maKhoa),
    thoiDiemNhapVien DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    lyDoNhapVien NVARCHAR(500) NOT NULL,
    chanDoanVaoVien NVARCHAR(500) NOT NULL,
    maICDVaoVien VARCHAR(20) NULL,
    maBacSiDieuTriChinh VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    soThuTuToDieuTri INT NOT NULL DEFAULT 0 CHECK (soThuTuToDieuTri >= 0),
    trangThai VARCHAR(30) NOT NULL DEFAULT ''DANG_DIEU_TRI'' CHECK (trangThai IN (''DANG_DIEU_TRI'', ''CHO_XUAT_VIEN'', ''DA_XUAT_VIEN'', ''CHUYEN_VIEN'', ''TU_VONG'', ''BO_VIEN'', ''DA_HUY'')),
    thoiDiemRaVien DATETIME2(0) NULL,
    chanDoanRaVien NVARCHAR(500) NULL,
    maICDRaVien VARCHAR(20) NULL,
    ketQuaDieuTri VARCHAR(30) NULL CHECK (ketQuaDieuTri IS NULL OR ketQuaDieuTri IN (''KHOI'', ''DO_GIAM'', ''KHONG_THAY_DOI'', ''NANG_HON'', ''TU_VONG'')),
    loiDanRaVien NVARCHAR(500) NULL,
    tienTamUngHienTai DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tienTamUngHienTai >= 0),
    tongChiPhiHienTai DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tongChiPhiHienTai >= 0),
    ghiChu NVARCHAR(500) NULL,
    thoiDiemDongDot DATETIME2(0) NULL,
    CONSTRAINT CK_DotDieuTri_ThoiDiem CHECK (thoiDiemRaVien IS NULL OR thoiDiemRaVien >= thoiDiemNhapVien)
);';
    EXEC sys.sp_executesql N'-- 28. Bảng LoTonKho
CREATE TABLE dbo.LoTonKho (
    maLoTon VARCHAR(20) NOT NULL PRIMARY KEY,
    maKho VARCHAR(20) NOT NULL REFERENCES dbo.KhoDuoc(maKho),
    maLoHang VARCHAR(20) NOT NULL REFERENCES dbo.LoHang(maLoHang),
    soLuongTon DECIMAL(18,4) NOT NULL DEFAULT 0 CHECK (soLuongTon >= 0),
    soLuongKhaDung DECIMAL(18,4) NOT NULL DEFAULT 0 CHECK (soLuongKhaDung >= 0),
    viTriDayKe NVARCHAR(50) NULL,
    trangThaiKhoa BIT NOT NULL DEFAULT 0,
    CONSTRAINT CK_LoTon_KhaDung CHECK (soLuongKhaDung <= soLuongTon)
);';
    EXEC sys.sp_executesql N'-- 29. Bảng KiemKeKho
CREATE TABLE dbo.KiemKeKho (
    maKyKiemKe VARCHAR(20) NOT NULL PRIMARY KEY,
    maKho VARCHAR(20) NOT NULL REFERENCES dbo.KhoDuoc(maKho),
    thoiDiemBatDau DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    thoiDiemKetThuc DATETIME2(0) NULL,
    maNguoiLap VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    trangThai VARCHAR(30) NOT NULL DEFAULT ''DANG_KIEM_KE'' CHECK (trangThai IN (''DANG_KIEM_KE'', ''DA_HOAN_TAT'', ''DA_CAN_BANG'', ''DA_HUY'')),
    maNguoiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDuyet DATETIME2(0) NULL,
    ghiChu NVARCHAR(500) NULL
);';
    EXEC sys.sp_executesql N'-- 30. Bảng ChiTietKiemKe
CREATE TABLE dbo.ChiTietKiemKe (
    maKyKiemKe VARCHAR(20) NOT NULL REFERENCES dbo.KiemKeKho(maKyKiemKe),
    maLoTon VARCHAR(20) NOT NULL REFERENCES dbo.LoTonKho(maLoTon),
    tonLyThuyet DECIMAL(18,4) NOT NULL CHECK (tonLyThuyet >= 0),
    tonThucTe DECIMAL(18,4) NULL CHECK (tonThucTe IS NULL OR tonThucTe >= 0),
    chenhLech AS (tonThucTe - tonLyThuyet),
    lyDoChenhLech NVARCHAR(255) NULL,
    PRIMARY KEY (maKyKiemKe, maLoTon)
);';
    EXEC sys.sp_executesql N'-- 31. Bảng PhieuSinhHieu
CREATE TABLE dbo.PhieuSinhHieu (
    maPhieu VARCHAR(20) NOT NULL PRIMARY KEY,
    maLuotKham VARCHAR(20) NOT NULL REFERENCES dbo.LuotKham(maLuotKham),
    maNhanVien VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDo DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    mach INT NULL CHECK (mach IS NULL OR mach > 0),
    nhietDo DECIMAL(4,1) NULL CHECK (nhietDo IS NULL OR nhietDo > 0),
    huyetApTamThu INT NULL CHECK (huyetApTamThu IS NULL OR huyetApTamThu > 0),
    huyetApTamTruong INT NULL CHECK (huyetApTamTruong IS NULL OR huyetApTamTruong > 0),
    nhipTho INT NULL CHECK (nhipTho IS NULL OR nhipTho > 0),
    spo2 DECIMAL(4,1) NULL CHECK (spo2 IS NULL OR (spo2 > 0 AND spo2 <= 100.0)),
    chieuCao DECIMAL(5,1) NULL CHECK (chieuCao IS NULL OR chieuCao > 0),
    canNang DECIMAL(5,1) NULL CHECK (canNang IS NULL OR canNang > 0),
    bmi AS (CASE WHEN chieuCao > 0 AND canNang > 0 THEN ROUND(canNang / POWER(chieuCao / 100.0, 2), 2) ELSE NULL END),
    ghiChu NVARCHAR(255) NULL,
    lyDoKhongDoDu NVARCHAR(255) NULL
);';
    EXEC sys.sp_executesql N'-- 32. Bảng HoSoKham
CREATE TABLE dbo.HoSoKham (
    maHoSoKham VARCHAR(20) NOT NULL PRIMARY KEY,
    maLuotKham VARCHAR(20) NOT NULL UNIQUE REFERENCES dbo.LuotKham(maLuotKham),
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
    trangThai VARCHAR(20) NOT NULL DEFAULT ''DANG_KHAM'' CHECK (trangThai IN (''DANG_KHAM'', ''HOAN_TAT'', ''DA_KHOA''))
);';
    EXEC sys.sp_executesql N'-- 33. Bảng ChiDinhCLS
CREATE TABLE dbo.ChiDinhCLS (
    maChiDinh VARCHAR(20) NOT NULL PRIMARY KEY,
    maLuotKham VARCHAR(20) NULL REFERENCES dbo.LuotKham(maLuotKham),
    maDotDieuTri VARCHAR(20) NULL REFERENCES dbo.DotDieuTri(maDotDieuTri),
    maBacSiChiDinh VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemChiDinh DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    chanDoanLamSang NVARCHAR(500) NOT NULL,
    loaiUuTien VARCHAR(20) NOT NULL DEFAULT ''THUONG'' CHECK (loaiUuTien IN (''THUONG'', ''CAP_CUU'')),
    trangThai VARCHAR(30) NOT NULL DEFAULT ''CHO_THUC_HIEN'' CHECK (trangThai IN (''CHO_THUC_HIEN'', ''DANG_THUC_HIEN'', ''HOAN_TAT'', ''DA_HUY'')),
    ghiChu NVARCHAR(255) NULL,
    CONSTRAINT CK_ChiDinhCLS_XOR CHECK ((maLuotKham IS NOT NULL AND maDotDieuTri IS NULL) OR (maLuotKham IS NULL AND maDotDieuTri IS NOT NULL))
);';
    EXEC sys.sp_executesql N'-- 34. Bảng ChiTietChiDinh
CREATE TABLE dbo.ChiTietChiDinh (
    maChiTiet VARCHAR(20) NOT NULL PRIMARY KEY,
    maChiDinh VARCHAR(20) NOT NULL REFERENCES dbo.ChiDinhCLS(maChiDinh),
    maDichVu VARCHAR(20) NOT NULL REFERENCES dbo.DichVuKyThuat(maDichVu),
    maHang VARCHAR(20) NULL REFERENCES dbo.HangHoaYTe(maHang),
    soLuong DECIMAL(18,2) NOT NULL DEFAULT 1.0 CHECK (soLuong > 0),
    donGiaApDung DECIMAL(18,2) NOT NULL CHECK (donGiaApDung >= 0),
    thanhTien AS (soLuong * donGiaApDung) PERSISTED,
    trangThai VARCHAR(30) NOT NULL DEFAULT ''CHO_THUC_HIEN'' CHECK (trangThai IN (''CHO_THUC_HIEN'', ''DANG_THUC_HIEN'', ''CO_KET_QUA'', ''DA_HUY''))
);';
    EXEC sys.sp_executesql N'-- 35. Bảng KetQuaCLS
CREATE TABLE dbo.KetQuaCLS (
    maKetQua VARCHAR(20) NOT NULL PRIMARY KEY,
    maChiTiet VARCHAR(20) NOT NULL REFERENCES dbo.ChiTietChiDinh(maChiTiet),
    loaiKetQua VARCHAR(20) NOT NULL CHECK (loaiKetQua IN (''XET_NGHIEM'', ''MO_TA'')),
    lanThucHien INT NOT NULL DEFAULT 1 CHECK (lanThucHien >= 1),
    phienBan INT NOT NULL DEFAULT 1 CHECK (phienBan >= 1),
    laBanHienHanh BIT NOT NULL DEFAULT 1,
    maKetQuaTruoc VARCHAR(20) NULL REFERENCES dbo.KetQuaCLS(maKetQua),
    thoiDiemCoKetQua DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maKyThuatVien VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    maBacSiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDuyet DATETIME2(0) NULL,
    trangThai VARCHAR(20) NOT NULL DEFAULT ''CHO_DUYET'' CHECK (trangThai IN (''CHO_DUYET'', ''DA_DUYET'', ''HUY_KET_QUA'')),
    ghiChuChuyenMon NVARCHAR(500) NULL,
    thietBiThucHien VARCHAR(20) NULL,
    CONSTRAINT UQ_KetQuaCLS_Loai UNIQUE (maKetQua, loaiKetQua)
);';
    EXEC sys.sp_executesql N'-- 36. Bảng KetQuaXetNghiem
CREATE TABLE dbo.KetQuaXetNghiem (
    maKetQua VARCHAR(20) NOT NULL PRIMARY KEY,
    loaiKetQua VARCHAR(20) NOT NULL DEFAULT ''XET_NGHIEM'' CHECK (loaiKetQua = ''XET_NGHIEM''),
    theTichMau NVARCHAR(50) NULL,
    chatLuongMau NVARCHAR(100) NULL,
    thoiDiemLayMau DATETIME2(0) NULL,
    nguoiLayMau VARCHAR(20) NULL,
    thoiDiemNhanMau DATETIME2(0) NULL,
    coCanhBaoNguyKich BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_KetQuaXetNghiem_Cha FOREIGN KEY (maKetQua, loaiKetQua) REFERENCES dbo.KetQuaCLS(maKetQua, loaiKetQua)
);';
    EXEC sys.sp_executesql N'-- 37. Bảng KetQuaMoTa
CREATE TABLE dbo.KetQuaMoTa (
    maKetQua VARCHAR(20) NOT NULL PRIMARY KEY,
    loaiKetQua VARCHAR(20) NOT NULL DEFAULT ''MO_TA'' CHECK (loaiKetQua = ''MO_TA''),
    vungKhaoSat NVARCHAR(150) NOT NULL,
    kyThuatChup NVARCHAR(150) NULL,
    moTaHinhAnh NVARCHAR(MAX) NOT NULL,
    ketLuan NVARCHAR(MAX) NOT NULL,
    deNghi NVARCHAR(500) NULL,
    duongDanAnhPACS NVARCHAR(500) NULL,
    soLuongAnh INT NOT NULL DEFAULT 0 CHECK (soLuongAnh >= 0),
    CONSTRAINT FK_KetQuaMoTa_Cha FOREIGN KEY (maKetQua, loaiKetQua) REFERENCES dbo.KetQuaCLS(maKetQua, loaiKetQua)
);';
    EXEC sys.sp_executesql N'-- 38. Bảng ChiSoXetNghiem
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
    mucDoCanhBao VARCHAR(20) NOT NULL DEFAULT ''BINH_THUONG'' CHECK (mucDoCanhBao IN (''BINH_THUONG'', ''THAP'', ''CAO'', ''NGUY_KICH'')),
    coCanhBao AS (CASE WHEN mucDoCanhBao = ''BINH_THUONG'' THEN CAST(0 AS BIT) ELSE CAST(1 AS BIT) END)
);';
    EXEC sys.sp_executesql N'-- 39. Bảng PhanGiuong
CREATE TABLE dbo.PhanGiuong (
    maPhanGiuong VARCHAR(20) NOT NULL PRIMARY KEY,
    maDotDieuTri VARCHAR(20) NOT NULL REFERENCES dbo.DotDieuTri(maDotDieuTri),
    maGiuong VARCHAR(20) NOT NULL REFERENCES dbo.GiuongBenh(maGiuong),
    tuThoiDiem DATETIME2(0) NOT NULL,
    denThoiDiem DATETIME2(0) NULL,
    donGiaApDung DECIMAL(18,2) NOT NULL CHECK (donGiaApDung >= 0),
    trangThai VARCHAR(30) NOT NULL DEFAULT ''DANG_SU_DUNG'' CHECK (trangThai IN (''DANG_SU_DUNG'', ''DA_KET_THUC'', ''DA_HUY'')),
    maNhanVienXep VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    lyDoKetThuc NVARCHAR(255) NULL,
    ghiChu NVARCHAR(255) NULL,
    CONSTRAINT CK_PhanGiuong_ThoiGian CHECK (denThoiDiem IS NULL OR denThoiDiem >= tuThoiDiem)
);';
    EXEC sys.sp_executesql N'-- 40. Bảng ToDieuTri
CREATE TABLE dbo.ToDieuTri (
    maTo VARCHAR(20) NOT NULL PRIMARY KEY,
    maDotDieuTri VARCHAR(20) NOT NULL REFERENCES dbo.DotDieuTri(maDotDieuTri),
    soThuTuTo INT NOT NULL CHECK (soThuTuTo > 0),
    ngayDieuTri DATE NOT NULL,
    thoiDiemGhi DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    dienBienBenh NVARCHAR(MAX) NOT NULL,
    yLenhChung NVARCHAR(MAX) NULL,
    cheDoDinhDuong NVARCHAR(255) NULL,
    cheDoChamSoc NVARCHAR(255) NULL,
    maBacSi VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    trangThai VARCHAR(20) NOT NULL DEFAULT ''CHO_DUYET'' CHECK (trangThai IN (''CHO_DUYET'', ''DA_DUYET'', ''DA_KHOA'')),
    maBacSiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDuyet DATETIME2(0) NULL,
    CONSTRAINT UQ_ToDieuTri_SoTo UNIQUE (maDotDieuTri, soThuTuTo)
);';
    EXEC sys.sp_executesql N'-- 41. Bảng DonThuoc
CREATE TABLE dbo.DonThuoc (
    maDon VARCHAR(20) NOT NULL PRIMARY KEY,
    maLuotKham VARCHAR(20) NULL REFERENCES dbo.LuotKham(maLuotKham),
    maDotDieuTri VARCHAR(20) NULL REFERENCES dbo.DotDieuTri(maDotDieuTri),
    loaiDon VARCHAR(30) NOT NULL CHECK (loaiDon IN (''NGOAI_TRU'', ''NOI_TRU'', ''RA_VIEN'')),
    thoiDiemKe DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maBacSiKe VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    chanDoan NVARCHAR(500) NOT NULL,
    trangThaiCapPhat VARCHAR(30) NOT NULL DEFAULT ''CHUA_CAP'' CHECK (trangThaiCapPhat IN (''CHUA_CAP'', ''CAP_MOT_PHAN'', ''DA_CAP_DU'', ''DA_HUY'')),
    loiDan NVARCHAR(500) NULL,
    maNguoiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDuyet DATETIME2(0) NULL,
    CONSTRAINT CK_DonThuoc_XOR CHECK ((maLuotKham IS NOT NULL AND maDotDieuTri IS NULL) OR (maLuotKham IS NULL AND maDotDieuTri IS NOT NULL))
);';
    EXEC sys.sp_executesql N'-- 42. Bảng ChiTietDonThuoc
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
    trangThai VARCHAR(30) NOT NULL DEFAULT ''CHUA_CAP'' CHECK (trangThai IN (''CHUA_CAP'', ''CAP_MOT_PHAN'', ''DA_CAP_DU'', ''DA_HUY''))
);';
    EXEC sys.sp_executesql N'-- 43. Bảng YLenh
CREATE TABLE dbo.YLenh (
    maYLenh VARCHAR(20) NOT NULL PRIMARY KEY,
    maTo VARCHAR(20) NOT NULL REFERENCES dbo.ToDieuTri(maTo),
    loaiYLenh VARCHAR(30) NOT NULL CHECK (loaiYLenh IN (''THUOC'', ''VAT_TU'', ''DICH_TRUYEN'', ''CHAM_SOC'', ''DINH_DUONG'', ''KHAC'')),
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
    trangThai VARCHAR(30) NOT NULL DEFAULT ''DANG_THUC_HIEN'' CHECK (trangThai IN (''CHO_THUC_HIEN'', ''DANG_THUC_HIEN'', ''DA_HOAN_TAT'', ''TAM_NGUNG'', ''DA_HUY'')),
    lyDoNgungHuy NVARCHAR(255) NULL,
    maBacSiRaYLenh VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    CONSTRAINT CK_YLenh_TieuHao CHECK (coTieuHaoKho = 0 OR (maHang IS NOT NULL AND soLuongKeHoach IS NOT NULL))
);';
    EXEC sys.sp_executesql N'-- 44. Bảng BienBanHoiChan
CREATE TABLE dbo.BienBanHoiChan (
    maBienBan VARCHAR(20) NOT NULL PRIMARY KEY,
    maDotDieuTri VARCHAR(20) NOT NULL REFERENCES dbo.DotDieuTri(maDotDieuTri),
    thoiDiemHoiChan DATETIME2(0) NOT NULL,
    diaDiem NVARCHAR(200) NOT NULL,
    hinhThucHoiChan VARCHAR(30) NOT NULL DEFAULT ''KHOA'' CHECK (hinhThucHoiChan IN (''KHOA'', ''LIEN_KHOA'', ''TOAN_VIEN'', ''LIEN_VIEN'')),
    lyDoHoiChan NVARCHAR(500) NOT NULL,
    maChuToa VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    maThuKy VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    tomTatDienBien NVARCHAR(MAX) NOT NULL,
    chanDoanThongNhat NVARCHAR(500) NOT NULL,
    huongDieuTriThongNhat NVARCHAR(MAX) NOT NULL,
    trangThai VARCHAR(20) NOT NULL DEFAULT ''CHO_DUYET'' CHECK (trangThai IN (''DANG_SOAN'', ''CHO_DUYET'', ''DA_DUYET'', ''DA_KHOA'')),
    maNguoiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDuyet DATETIME2(0) NULL
);';
    EXEC sys.sp_executesql N'-- 45. Bảng LanThucHienYLenh
-- Ghi chú: maPhieuXuatKho và maYeuCauDinhChinhNguon sẽ được thêm FK qua ALTER TABLE
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
    trangThaiLamSang VARCHAR(30) NOT NULL DEFAULT ''DA_THUC_HIEN'' CHECK (trangThaiLamSang IN (''CHO_THUC_HIEN'', ''DA_THUC_HIEN'', ''KHONG_THUC_HIEN_DUOC'', ''BENH_NHAN_TU_CHOI'')),
    trangThaiKho VARCHAR(30) NOT NULL DEFAULT ''KHONG_AP_DUNG'' CHECK (trangThaiKho IN (''KHONG_AP_DUNG'', ''CHO_XU_LY_KHO'', ''DA_HACH_TOAN'', ''LOI_HACH_TOAN'')),
    daTruTonKho AS (CASE WHEN trangThaiKho = ''DA_HACH_TOAN'' THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END),
    maYeuCauDinhChinhNguon VARCHAR(20) NULL,
    ghiChu NVARCHAR(255) NULL,
    CONSTRAINT UQ_LanThucHien_Cu UNIQUE (maYLenh, lanThu)
);';
    EXEC sys.sp_executesql N'-- 46. Bảng PhieuKho
CREATE TABLE dbo.PhieuKho (
    maPhieu VARCHAR(20) NOT NULL PRIMARY KEY,
    loaiPhieu VARCHAR(30) NOT NULL CHECK (loaiPhieu IN (''NHAP_KHO'', ''XUAT_DON'', ''XUAT_TIEU_HAO_NOI_TRU'', ''CHUYEN_KHO'', ''HOAN_TRA'', ''XUAT_HUY'', ''XU_LY_KIEM_KE'')),
    maKhoNguon VARCHAR(20) NULL REFERENCES dbo.KhoDuoc(maKho),
    maKhoDich VARCHAR(20) NULL REFERENCES dbo.KhoDuoc(maKho),
    maLuotKham VARCHAR(20) NULL REFERENCES dbo.LuotKham(maLuotKham),
    maDotDieuTri VARCHAR(20) NULL REFERENCES dbo.DotDieuTri(maDotDieuTri),
    maLanNguon VARCHAR(20) NULL REFERENCES dbo.LanThucHienYLenh(maLan),
    maKiemKeNguon VARCHAR(20) NULL REFERENCES dbo.KiemKeKho(maKyKiemKe),
    maPhieuGoc VARCHAR(20) NULL REFERENCES dbo.PhieuKho(maPhieu),
    thoiDiemLap DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maNguoiLap VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    trangThai VARCHAR(30) NOT NULL DEFAULT ''CHO_DUYET'' CHECK (trangThai IN (''DANG_LAP'', ''CHO_DUYET'', ''DA_XUAT'', ''DA_NHAP'', ''DA_HUY'')),
    maNguoiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDuyet DATETIME2(0) NULL,
    ghiChu NVARCHAR(500) NULL
);';
    EXEC sys.sp_executesql N'-- 47. Bảng ChiTietPhieuKho
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
);';
    EXEC sys.sp_executesql N'-- 48. Bảng QuyetToan

-- 48. Bảng SoKho
CREATE TABLE dbo.SoKho (
    maSoKho VARCHAR(20) NOT NULL PRIMARY KEY,
    maChiTietKho VARCHAR(20) NOT NULL REFERENCES dbo.ChiTietPhieuKho(maChiTietKho),
    maLoTon VARCHAR(20) NOT NULL REFERENCES dbo.LoTonKho(maLoTon),
    soLuongTruoc DECIMAL(18,4) NOT NULL CHECK (soLuongTruoc >= 0),
    bienDong DECIMAL(18,4) NOT NULL CHECK (bienDong <> 0),
    soLuongSau DECIMAL(18,4) NOT NULL CHECK (soLuongSau >= 0),
    thoiDiemGhiSo DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    ghiChu NVARCHAR(255) NULL,
    CONSTRAINT CK_SoKho_CanDoi CHECK (soLuongSau = soLuongTruoc + bienDong)
);

CREATE TABLE dbo.QuyetToan (
    maQuyetToan VARCHAR(20) NOT NULL PRIMARY KEY,
    maLuotKham VARCHAR(20) NULL REFERENCES dbo.LuotKham(maLuotKham),
    maDotDieuTri VARCHAR(20) NULL REFERENCES dbo.DotDieuTri(maDotDieuTri),
    phienBan INT NOT NULL DEFAULT 1 CHECK (phienBan >= 1),
    laBanHienHanh BIT NOT NULL DEFAULT 1,
    maQuyetToanTruoc VARCHAR(20) NULL REFERENCES dbo.QuyetToan(maQuyetToan),
    thoiDiemChot DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    tongChiPhi DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tongChiPhi >= 0),
    tienBHYTChiTra DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tienBHYTChiTra >= 0),
    tongMienGiam DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tongMienGiam >= 0),
    nguoiBenhPhaiTra AS (tongChiPhi - tienBHYTChiTra - tongMienGiam),
    trangThai VARCHAR(30) NOT NULL DEFAULT ''CHUA_THANH_TOAN'' CHECK (trangThai IN (''CHUA_THANH_TOAN'', ''DA_QUYET_TOAN'', ''DA_DIEU_CHINH'', ''DA_HUY'')),
    maNguoiChot VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    ghiChu NVARCHAR(500) NULL,
    CONSTRAINT CK_QuyetToan_XOR CHECK ((maLuotKham IS NOT NULL AND maDotDieuTri IS NULL) OR (maLuotKham IS NULL AND maDotDieuTri IS NOT NULL))
);';
    EXEC sys.sp_executesql N'-- 49. Bảng ChiTietQuyetToan
CREATE TABLE dbo.ChiTietQuyetToan (
    maDongQuyetToan VARCHAR(20) NOT NULL PRIMARY KEY,
    maQuyetToan VARCHAR(20) NOT NULL REFERENCES dbo.QuyetToan(maQuyetToan),
    loaiChiPhi VARCHAR(30) NOT NULL CHECK (loaiChiPhi IN (''KHAM_BENH'', ''CAN_LAM_SANG'', ''THUOC'', ''VAT_TU'', ''GIUONG_BENH'', ''THU_THUAT_PHAU_THUAT'', ''KHAC'')),
    maLuotKhamNguon VARCHAR(20) NULL REFERENCES dbo.LuotKham(maLuotKham),
    maChiTietCLS VARCHAR(20) NULL REFERENCES dbo.ChiTietChiDinh(maChiTiet),
    maChiTietKho VARCHAR(20) NULL REFERENCES dbo.ChiTietPhieuKho(maChiTietKho),
    maPhanGiuong VARCHAR(20) NULL REFERENCES dbo.PhanGiuong(maPhanGiuong),
    soLuong DECIMAL(18,4) NOT NULL CHECK (soLuong > 0),
    donGia DECIMAL(18,2) NOT NULL CHECK (donGia >= 0),
    thanhTien DECIMAL(18,2) NOT NULL CHECK (thanhTien >= 0),
    tienBHYT DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (tienBHYT >= 0),
    tienBenhNhanTra DECIMAL(18,2) NOT NULL CHECK (tienBenhNhanTra >= 0),
    tyLeBHYT DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (tyLeBHYT BETWEEN 0 AND 100)
);';
    EXEC sys.sp_executesql N'-- 50. Bảng GiaoDichThanhToan
CREATE TABLE dbo.GiaoDichThanhToan (
    maGiaoDich VARCHAR(20) NOT NULL PRIMARY KEY,
    maBenhNhan VARCHAR(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
    maLuotKham VARCHAR(20) NULL REFERENCES dbo.LuotKham(maLuotKham),
    maDotDieuTri VARCHAR(20) NULL REFERENCES dbo.DotDieuTri(maDotDieuTri),
    maHen VARCHAR(20) NULL REFERENCES dbo.LichHen(maHen),
    maQuyetToan VARCHAR(20) NULL REFERENCES dbo.QuyetToan(maQuyetToan),
    loaiGiaoDich VARCHAR(30) NOT NULL CHECK (loaiGiaoDich IN (''TAM_UNG'', ''THANH_TOAN_DOT'', ''THANH_TOAN_TOAN_BO'', ''THU_THEM'', ''HOAN_UNG'', ''HOAN_VIEN_PHI'')),
    phuongThuc VARCHAR(30) NOT NULL CHECK (phuongThuc IN (''TIEN_MAT'', ''VIETQR'', ''CHUYEN_KHOAN'', ''THE_POS'', ''VI_DIEN_TU'')),
    soTien DECIMAL(18,2) NOT NULL CHECK (soTien > 0),
    thoiDiemGiaoDich DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    trangThai VARCHAR(30) NOT NULL DEFAULT ''THANH_CONG'' CHECK (trangThai IN (''CHO_THANH_TOAN'', ''THANH_CONG'', ''THAT_BAI'', ''DA_HOAN'')),
    maThamChieuNgoai VARCHAR(100) NULL,
    maGiaoDichGoc VARCHAR(20) NULL REFERENCES dbo.GiaoDichThanhToan(maGiaoDich),
    maNhanVienXacNhan VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    maCaTruc VARCHAR(20) NULL REFERENCES dbo.BaoCaoVienPhi(maBaoCao),
    ghiChu NVARCHAR(500) NULL
);';
    EXEC sys.sp_executesql N'-- 51. Bảng ChiTietDoiSoatCa
CREATE TABLE dbo.ChiTietDoiSoatCa (
    maBaoCao VARCHAR(20) NOT NULL REFERENCES dbo.BaoCaoVienPhi(maBaoCao),
    maGiaoDich VARCHAR(20) NOT NULL REFERENCES dbo.GiaoDichThanhToan(maGiaoDich),
    loaiGiaoDichTrongCa VARCHAR(20) NOT NULL CHECK (loaiGiaoDichTrongCa IN (''THU_TIEN'', ''HOAN_TIEN'')),
    soTienGhiNhan DECIMAL(18,2) NOT NULL CHECK (soTienGhiNhan > 0),
    thoiDiemLienKet DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    PRIMARY KEY (maBaoCao, maGiaoDich)
);';
    EXEC sys.sp_executesql N'-- 52. Bảng BenhAnDienTu
CREATE TABLE dbo.BenhAnDienTu (
    maBenhAn VARCHAR(20) NOT NULL PRIMARY KEY,
    maBenhNhan VARCHAR(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
    maLuotKham VARCHAR(20) NULL REFERENCES dbo.LuotKham(maLuotKham),
    maDotDieuTri VARCHAR(20) NULL REFERENCES dbo.DotDieuTri(maDotDieuTri),
    loaiBenhAn VARCHAR(30) NOT NULL CHECK (loaiBenhAn IN (''NGOAI_TRU'', ''NOI_TRU'')),
    ngayTao DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    maBacSiLap VARCHAR(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),
    trangThai VARCHAR(30) NOT NULL DEFAULT ''DANG_LAP'' CHECK (trangThai IN (''DANG_LAP'', ''DA_DONG_GOI'', ''DA_CONG_BO'', ''DA_KHOA_LUU_TRU'')),
    CONSTRAINT CK_BenhAn_XOR CHECK ((maLuotKham IS NOT NULL AND maDotDieuTri IS NULL) OR (maLuotKham IS NULL AND maDotDieuTri IS NOT NULL))
);';
    EXEC sys.sp_executesql N'-- 53. Bảng PhienBanBenhAn
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
    trangThaiCongBo VARCHAR(20) NOT NULL DEFAULT ''NOI_BO'' CHECK (trangThaiCongBo IN (''NOI_BO'', ''DA_CONG_BO'', ''DA_THU_HOI'')),
    thoiDiemCongBo DATETIME2(0) NULL,
    maNguoiCongBo VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    CONSTRAINT UQ_PhienBan_SoPhienBan UNIQUE (maBenhAn, soPhienBan)
);';
    EXEC sys.sp_executesql N'-- 54. Bảng UyQuyenHoSo
CREATE TABLE dbo.UyQuyenHoSo (
    maUyQuyen VARCHAR(20) NOT NULL PRIMARY KEY,
    maBenhNhanChu VARCHAR(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
    maTaiKhoanNhan VARCHAR(20) NOT NULL REFERENCES dbo.TaiKhoan(maTaiKhoan),
    maTaiKhoanCap VARCHAR(20) NOT NULL REFERENCES dbo.TaiKhoan(maTaiKhoan),
    maBenhAn VARCHAR(20) NULL REFERENCES dbo.BenhAnDienTu(maBenhAn),
    phamViUyQuyen VARCHAR(30) NOT NULL CHECK (phamViUyQuyen IN (''XEM_TAT_CA'', ''XEM_MOT_BENH_AN'', ''TAI_XUAT_HO_SO'')),
    ngayBatDau DATETIME2(0) NOT NULL,
    ngayHetHan DATETIME2(0) NOT NULL,
    trangThai VARCHAR(20) NOT NULL DEFAULT ''HIEU_LUC'' CHECK (trangThai IN (''HIEU_LUC'', ''DA_THU_HOI'', ''HET_HAN'')),
    maNguoiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    CONSTRAINT CK_UyQuyen_ThoiGian CHECK (ngayHetHan >= ngayBatDau)
);';
    EXEC sys.sp_executesql N'-- 55. Bảng YeuCauDinhChinh
CREATE TABLE dbo.YeuCauDinhChinh (
    maYeuCau VARCHAR(20) NOT NULL PRIMARY KEY,
    maBenhAn VARCHAR(20) NOT NULL REFERENCES dbo.BenhAnDienTu(maBenhAn),
    loaiDoiTuongDich VARCHAR(30) NOT NULL CHECK (loaiDoiTuongDich IN (''HO_SO_KHAM'', ''TO_DIEU_TRI'', ''BIEN_BAN_HOI_CHAN'', ''KET_QUA_CLS'', ''Y_LENH'', ''LAN_THUC_HIEN'')),
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
    trangThai VARCHAR(20) NOT NULL DEFAULT ''CHO_DUYET'' CHECK (trangThai IN (''CHO_DUYET'', ''DA_DUYET'', ''TU_CHOI'', ''DA_AP_DUNG'')),
    maNguoiDuyet VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemDuyet DATETIME2(0) NULL,
    yKienPheDuyet NVARCHAR(500) NULL,
    maNguoiApDung VARCHAR(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
    thoiDiemApDung DATETIME2(0) NULL,
    maKetQuaThayThe VARCHAR(20) NULL REFERENCES dbo.KetQuaCLS(maKetQua),
    tenTruongSua VARCHAR(50) NULL,
    giaTriCu NVARCHAR(MAX) NULL,
    giaTriMoi NVARCHAR(MAX) NULL,
    vanBanMinhChung NVARCHAR(255) NULL
);';
    EXEC sys.sp_executesql N'-- ====================================================================================
-- PHÂN HỆ QUẢN TRỊ BỆNH VIỆN VÀ KHÁM CHUYÊN KHOA BỔ SUNG (BẢNG 56 - 65)
-- ====================================================================================

-- 56. Bảng KhamSanPhuKhoa
CREATE TABLE dbo.KhamSanPhuKhoa (
    maHoSoKham                  VARCHAR(20)     NOT NULL,
    para                        VARCHAR(10)     NOT NULL,
    ngayKinhCuoi                DATE            NULL,
    tuoiThaiTuan                INT             NULL CHECK (tuoiThaiTuan IS NULL OR tuoiThaiTuan > 0),
    beCaoTuCung                 DECIMAL(5,1)    NULL CHECK (beCaoTuCung > 0),
    vongBung                    DECIMAL(5,1)    NULL CHECK (vongBung > 0),
    timThai                     INT             NULL CHECK (timThai IS NULL OR timThai > 0),
    conCoTuCung                 NVARCHAR(100)   NULL,
    coTuCung                    NVARCHAR(100)   NULL,
    tinhTrangOi                 NVARCHAR(50)    NULL,
    ngoiThai                    NVARCHAR(50)    NULL,
    CONSTRAINT PK_KhamSanPhuKhoa PRIMARY KEY (maHoSoKham),
    CONSTRAINT FK_KhamSanPhuKhoa_HoSo FOREIGN KEY (maHoSoKham) REFERENCES dbo.HoSoKham(maHoSoKham)
);';
    EXEC sys.sp_executesql N'-- 57. Bảng KhamNhiKhoa
CREATE TABLE dbo.KhamNhiKhoa (
    maHoSoKham                  VARCHAR(20)     NOT NULL,
    thangTuoi                   INT             NOT NULL CHECK (thangTuoi >= 0),
    canNangKg                   DECIMAL(5,2)    NOT NULL CHECK (canNangKg > 0),
    chieuCaoCm                  DECIMAL(5,1)    NOT NULL CHECK (chieuCaoCm > 0),
    zScoreTheTrang              VARCHAR(30)     NULL,
    chuViVongDau                DECIMAL(5,1)    NULL CHECK (chuViVongDau > 0),
    tamThanVanDong              NVARCHAR(255)   NULL,
    tienSuTiemChung             NVARCHAR(500)   NULL,
    CONSTRAINT PK_KhamNhiKhoa PRIMARY KEY (maHoSoKham),
    CONSTRAINT FK_KhamNhiKhoa_HoSo FOREIGN KEY (maHoSoKham) REFERENCES dbo.HoSoKham(maHoSoKham)
);';
    EXEC sys.sp_executesql N'-- 58. Bảng KhamChuyenKhoaMat
CREATE TABLE dbo.KhamChuyenKhoaMat (
    maHoSoKham                  VARCHAR(20)     NOT NULL,
    thiLucKhongKinhMatPhai      VARCHAR(20)     NOT NULL,
    thiLucKhongKinhMatTrai      VARCHAR(20)     NOT NULL,
    thiLucCoKinhMatPhai         VARCHAR(20)     NULL,
    thiLucCoKinhMatTrai         VARCHAR(20)     NULL,
    nhanApMatPhai               DECIMAL(4,1)    NULL CHECK (nhanApMatPhai IS NULL OR nhanApMatPhai >= 0),
    nhanApMatTrai               DECIMAL(4,1)    NULL CHECK (nhanApMatTrai IS NULL OR nhanApMatTrai >= 0),
    ketMacMat                   NVARCHAR(255)   NULL,
    giacMacMat                  NVARCHAR(255)   NULL,
    tienPhongMat                NVARCHAR(255)   NULL,
    theThuyTinh                 NVARCHAR(255)   NULL,
    dayMat                      NVARCHAR(500)   NULL,
    CONSTRAINT PK_KhamChuyenKhoaMat PRIMARY KEY (maHoSoKham),
    CONSTRAINT FK_KhamChuyenKhoaMat_HoSo FOREIGN KEY (maHoSoKham) REFERENCES dbo.HoSoKham(maHoSoKham)
);';
    EXEC sys.sp_executesql N'-- 59. Bảng KhamTaiMuiHong
CREATE TABLE dbo.KhamTaiMuiHong (
    maHoSoKham                  VARCHAR(20)     NOT NULL,
    taiPhai                     NVARCHAR(255)   NULL,
    taiTrai                     NVARCHAR(255)   NULL,
    muiTruoc                    NVARCHAR(255)   NULL,
    vachNganMui                 NVARCHAR(100)   NULL,
    hongAmidan                  NVARCHAR(255)   NULL,
    thanhQuan                   NVARCHAR(255)   NULL,
    CONSTRAINT PK_KhamTaiMuiHong PRIMARY KEY (maHoSoKham),
    CONSTRAINT FK_KhamTaiMuiHong_HoSo FOREIGN KEY (maHoSoKham) REFERENCES dbo.HoSoKham(maHoSoKham)
);';
    EXEC sys.sp_executesql N'-- 60. Bảng KhamRangHamMat
CREATE TABLE dbo.KhamRangHamMat (
    maHoSoKham                  VARCHAR(20)     NOT NULL,
    soDoCungRang                VARCHAR(200)    NULL,
    soRangSau                   INT             NOT NULL DEFAULT 0 CHECK (soRangSau >= 0),
    soRangMat                   INT             NOT NULL DEFAULT 0 CHECK (soRangMat >= 0),
    soRangDaTram                INT             NOT NULL DEFAULT 0 CHECK (soRangDaTram >= 0),
    tinhTrangKhopCan            NVARCHAR(100)   NULL,
    tinhTrangNhaChu             NVARCHAR(255)   NULL,
    niemMacMieng                NVARCHAR(255)   NULL,
    CONSTRAINT PK_KhamRangHamMat PRIMARY KEY (maHoSoKham),
    CONSTRAINT FK_KhamRangHamMat_HoSo FOREIGN KEY (maHoSoKham) REFERENCES dbo.HoSoKham(maHoSoKham)
);';
    EXEC sys.sp_executesql N'-- 61. Bảng KhamDaLieu
CREATE TABLE dbo.KhamDaLieu (
    maHoSoKham                  VARCHAR(20)     NOT NULL,
    viTriTonThuong              NVARCHAR(500)   NOT NULL,
    hinhThaiTonThuong           NVARCHAR(255)   NOT NULL,
    dienTichTonThuongPhanTram   DECIMAL(5,2)    NULL CHECK (dienTichTonThuongPhanTram >= 0 AND dienTichTonThuongPhanTram <= 100),
    trieuChungCoNang            NVARCHAR(255)   NULL,
    tinhTrangMongToc            NVARCHAR(255)   NULL,
    CONSTRAINT PK_KhamDaLieu PRIMARY KEY (maHoSoKham),
    CONSTRAINT FK_KhamDaLieu_HoSo FOREIGN KEY (maHoSoKham) REFERENCES dbo.HoSoKham(maHoSoKham)
);';
    EXEC sys.sp_executesql N'-- 62. Bảng PhanCongKham
CREATE TABLE dbo.PhanCongKham (
    maPhanCong                  VARCHAR(20)     NOT NULL,
    maBuong                     VARCHAR(20)     NOT NULL,
    maBacSi                     VARCHAR(20)     NOT NULL,
    maDieuDuong                 VARCHAR(20)     NULL,
    ngayKham                    DATE            NOT NULL,
    caKham                      VARCHAR(20)     NOT NULL CHECK (caKham IN (''SANG'', ''CHIEU'', ''TOI'', ''CAP_CUU_247'')),
    trangThai                   VARCHAR(20)     NOT NULL DEFAULT ''DA_PHAN_CONG'' CHECK (trangThai IN (''DA_PHAN_CONG'', ''DANG_TRUC'', ''HOAN_TAT'', ''VANG_MAT'')),
    ghiChu                      NVARCHAR(255)   NULL,
    CONSTRAINT PK_PhanCongKham PRIMARY KEY (maPhanCong),
    CONSTRAINT FK_PhanCongKham_Buong FOREIGN KEY (maBuong) REFERENCES dbo.BuongKham(maBuong),
    CONSTRAINT FK_PhanCongKham_BacSi FOREIGN KEY (maBacSi) REFERENCES dbo.NhanVien(maNhanVien),
    CONSTRAINT FK_PhanCongKham_DieuDuong FOREIGN KEY (maDieuDuong) REFERENCES dbo.NhanVien(maNhanVien)
);';
    EXEC sys.sp_executesql N'-- 63. Bảng ChiSoThamChieu
CREATE TABLE dbo.ChiSoThamChieu (
    maThamChieu                 VARCHAR(20)     NOT NULL,
    maDichVu                    VARCHAR(20)     NULL,
    tenChiSo                    NVARCHAR(100)   NOT NULL,
    donViDo                     VARCHAR(30)     NOT NULL,
    gioiTinhApDung              NVARCHAR(10)    NOT NULL DEFAULT ''TAT_CA'' CHECK (gioiTinhApDung IN (''NAM'', ''NU'', ''TAT_CA'')),
    tuoiToiThieuThang           INT             NOT NULL DEFAULT 0,
    tuoiToiDaThang              INT             NOT NULL DEFAULT 1440,
    giaTriMin                   DECIMAL(12,3)   NOT NULL,
    giaTriMax                   DECIMAL(12,3)   NOT NULL,
    canhBaoNguyHiemDuoi         DECIMAL(12,3)   NULL,
    canhBaoNguyHiemTren         DECIMAL(12,3)   NULL,
    CONSTRAINT PK_ChiSoThamChieu PRIMARY KEY (maThamChieu),
    CONSTRAINT FK_ChiSoThamChieu_DichVu FOREIGN KEY (maDichVu) REFERENCES dbo.DichVuKyThuat(maDichVu)
);';
    EXEC sys.sp_executesql N'-- 64. Bảng ThamSoHeThong
CREATE TABLE dbo.ThamSoHeThong (
    maThamSo                    VARCHAR(50)     NOT NULL,
    tenThamSo                   NVARCHAR(100)   NOT NULL,
    giaTri                      NVARCHAR(500)   NOT NULL,
    kieuDuLieu                  VARCHAR(20)     NOT NULL CHECK (kieuDuLieu IN (''INT'', ''DECIMAL'', ''BOOLEAN'', ''STRING'', ''JSON'')),
    nhomChucNang                VARCHAR(30)     NOT NULL CHECK (nhomChucNang IN (''TIEP_DON'', ''KHAM_BENH'', ''DUOC'', ''VIEN_PHI'', ''BENH_AN'', ''BAO_MAT'')),
    moTa                        NVARCHAR(500)   NULL,
    choPhepSua                  BIT             NOT NULL DEFAULT 1,
    ngayCapNhat                 DATETIME2(0)    NOT NULL DEFAULT SYSDATETIME(),
    maNguoiCapNhat              VARCHAR(20)     NULL,
    CONSTRAINT PK_ThamSoHeThong PRIMARY KEY (maThamSo),
    CONSTRAINT FK_ThamSoHeThong_Nguoi FOREIGN KEY (maNguoiCapNhat) REFERENCES dbo.NhanVien(maNhanVien)
);';
    EXEC sys.sp_executesql N'-- 65. Bảng YeuCauMoKhoaBenhAn
CREATE TABLE dbo.YeuCauMoKhoaBenhAn (
    maYeuCau                    VARCHAR(20)     NOT NULL,
    maBenhAn                    VARCHAR(20)     NOT NULL,
    maTaiKhoanYeuCau            VARCHAR(20)     NOT NULL,
    loaiQuyen                   VARCHAR(30)     NOT NULL CHECK (loaiQuyen IN (''MO_KHOA_CHINH_SUA'', ''TRUY_CAP_NGOAI_GIO'', ''XUAT_HO_SO_PHAP_LY'')),
    lyDoMoKhoa                  NVARCHAR(500)   NOT NULL,
    thoiDiemYeuCau              DATETIME2(0)    NOT NULL DEFAULT SYSDATETIME(),
    thoiHanGio                  INT             NOT NULL DEFAULT 24 CHECK (thoiHanGio > 0 AND thoiHanGio <= 72),
    maNguoiPheDuyet             VARCHAR(20)     NULL,
    thoiDiemDuyet               DATETIME2(0)    NULL,
    trangThai                   VARCHAR(20)     NOT NULL DEFAULT ''CHO_DUYET'' CHECK (trangThai IN (''CHO_DUYET'', ''DA_DUYET'', ''TU_CHOI'', ''DA_KHOA_LAI'')),
    ghiChuPheDuyet              NVARCHAR(500)   NULL,
    CONSTRAINT PK_YeuCauMoKhoaBenhAn PRIMARY KEY (maYeuCau),
    CONSTRAINT FK_YeuCauMoKhoa_BenhAn FOREIGN KEY (maBenhAn) REFERENCES dbo.BenhAnDienTu(maBenhAn),
    CONSTRAINT FK_YeuCauMoKhoa_TaiKhoan FOREIGN KEY (maTaiKhoanYeuCau) REFERENCES dbo.TaiKhoan(maTaiKhoan),
    CONSTRAINT FK_YeuCauMoKhoa_NguoiDuyet FOREIGN KEY (maNguoiPheDuyet) REFERENCES dbo.NhanVien(maNhanVien)
);';
    EXEC sys.sp_executesql N'-- Liên kết Khoa -> NhanVien (Trưởng khoa)
ALTER TABLE dbo.Khoa ADD CONSTRAINT FK_Khoa_NhanVien_TruongKhoa
FOREIGN KEY (maTruongKhoa) REFERENCES dbo.NhanVien(maNhanVien);';
    EXEC sys.sp_executesql N'-- Liên kết KhoDuoc -> KiemKeKho (Kỳ kiểm kê đang mở)
ALTER TABLE dbo.KhoDuoc ADD CONSTRAINT FK_KhoDuoc_KiemKeDangMo
FOREIGN KEY (maKiemKeDangMo) REFERENCES dbo.KiemKeKho(maKyKiemKe);';
    EXEC sys.sp_executesql N'-- Liên kết LanThucHienYLenh -> PhieuKho (Phiếu xuất kho tiêu hao)
ALTER TABLE dbo.LanThucHienYLenh ADD CONSTRAINT FK_LanThucHien_PhieuKho
FOREIGN KEY (maPhieuXuatKho) REFERENCES dbo.PhieuKho(maPhieu);';
    EXEC sys.sp_executesql N'-- Liên kết LanThucHienYLenh -> YeuCauDinhChinh (Yêu cầu đính chính nguồn)
ALTER TABLE dbo.LanThucHienYLenh ADD CONSTRAINT FK_LanThucHien_YeuCauDinhChinh
FOREIGN KEY (maYeuCauDinhChinhNguon) REFERENCES dbo.YeuCauDinhChinh(maYeuCau);';
    EXEC sys.sp_executesql N'-- 1. Bảng Duy
CREATE UNIQUE NONCLUSTERED INDEX UQ_BenhNhan_soDinhDanh
ON dbo.BenhNhan(soDinhDanh)
WHERE soDinhDanh IS NOT NULL;';
    EXEC sys.sp_executesql N'-- 2. Bảng Duy
CREATE UNIQUE NONCLUSTERED INDEX UQ_LuotKham_maHen
ON dbo.LuotKham(maHen)
WHERE maHen IS NOT NULL;';
    EXEC sys.sp_executesql N'-- 3. Bảng Duy
CREATE UNIQUE NONCLUSTERED INDEX UQ_LuotKham_XepHang
ON dbo.LuotKham(maBuong, ngayKham, soThuTu);';
    EXEC sys.sp_executesql N'-- 4. Bảng Một
CREATE UNIQUE NONCLUSTERED INDEX UQ_DotDieuTri_BenhNhanHienTai
ON dbo.DotDieuTri(maBenhNhan)
WHERE trangThai IN (''DANG_DIEU_TRI'', ''CHO_XUAT_VIEN'');';
    EXEC sys.sp_executesql N'-- 5. Bảng Một
CREATE UNIQUE NONCLUSTERED INDEX UQ_PhanGiuong_GiuongHienTai
ON dbo.PhanGiuong(maGiuong)
WHERE denThoiDiem IS NULL AND trangThai = ''DANG_SU_DUNG'';';
    EXEC sys.sp_executesql N'-- 6. Bảng Một
CREATE UNIQUE NONCLUSTERED INDEX UQ_PhanGiuong_BenhNhanHienTai
ON dbo.PhanGiuong(maDotDieuTri)
WHERE denThoiDiem IS NULL AND trangThai = ''DANG_SU_DUNG'';';
    EXEC sys.sp_executesql N'-- 7. Bảng Mỗi
CREATE UNIQUE NONCLUSTERED INDEX UQ_LoTonKho_Kho_LoHang
ON dbo.LoTonKho(maKho, maLoHang);';
    EXEC sys.sp_executesql N'-- 8. Bảng Tối
CREATE UNIQUE NONCLUSTERED INDEX UQ_QuyetToan_HienHanh_Exam
ON dbo.QuyetToan(maLuotKham)
WHERE maLuotKham IS NOT NULL AND laBanHienHanh = 1;';
    EXEC sys.sp_executesql N'-- 9. Bảng Tối
CREATE UNIQUE NONCLUSTERED INDEX UQ_QuyetToan_HienHanh_Admission
ON dbo.QuyetToan(maDotDieuTri)
WHERE maDotDieuTri IS NOT NULL AND laBanHienHanh = 1;';
    EXEC sys.sp_executesql N'-- 10. Bảng Tối
CREATE UNIQUE NONCLUSTERED INDEX UQ_BenhAn_Exam
ON dbo.BenhAnDienTu(maLuotKham)
WHERE maLuotKham IS NOT NULL;';
    EXEC sys.sp_executesql N'-- 11. Bảng Tối
CREATE UNIQUE NONCLUSTERED INDEX UQ_BenhAn_Admission
ON dbo.BenhAnDienTu(maDotDieuTri)
WHERE maDotDieuTri IS NOT NULL;';
    EXEC sys.sp_executesql N'-- 12. Bảng Tối
CREATE UNIQUE NONCLUSTERED INDEX UQ_PhienBanBenhAn_HienHanh
ON dbo.PhienBanBenhAn(maBenhAn)
WHERE laBanHienHanh = 1;';
    EXEC sys.sp_executesql N'-- 13. Bảng Mỗi
CREATE UNIQUE NONCLUSTERED INDEX UQ_TaiKhoan_NhanVien
ON dbo.TaiKhoan(maNhanVien)
WHERE maNhanVien IS NOT NULL;';
    EXEC sys.sp_executesql N'-- 14. Bảng Mỗi
CREATE UNIQUE NONCLUSTERED INDEX UQ_TaiKhoan_BenhNhan
ON dbo.TaiKhoan(maBenhNhan)
WHERE maBenhNhan IS NOT NULL;';
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT DB_NAME() AS TenDatabase, COUNT(*) AS SoBang
FROM sys.tables WHERE is_ms_shipped = 0;
GO