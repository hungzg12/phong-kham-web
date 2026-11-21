-- ==============================================================
-- SEED DATA: BUỒNG BỆNH & GIƯỜNG BỆNH NỘI TRÚ
-- Cơ sở dữ liệu: QuanLyBenhVien
-- ==============================================================
USE QuanLyBenhVien;
GO

SET NOCOUNT ON;

-- 1. Seed BuongBenh
MERGE INTO dbo.BuongBenh AS target
USING (VALUES
    ('B_NOI_301', 'NOI', N'Buồng 301 - Nội tổng quát', 'TIEU_CHUAN', 4, N'Tầng 3 - Khu Nhà A', 1),
    ('B_NOI_VIP302', 'NOI', N'Buồng 302 - Dịch vụ VIP', 'DICH_VU', 2, N'Tầng 3 - Khu Nhà A', 1),
    ('B_TIM_401', 'TIM', N'Buồng 401 - Hồi sức tim mạch', 'HOI_SUC', 2, N'Tầng 4 - Khu Nhà A', 1)
) AS source (maBuongBenh, maKhoa, tenBuong, loaiBuong, soGiuongToiDa, viTri, dangHoatDong)
ON target.maBuongBenh = source.maBuongBenh
WHEN MATCHED THEN
    UPDATE SET 
        maKhoa = source.maKhoa,
        tenBuong = source.tenBuong,
        loaiBuong = source.loaiBuong,
        soGiuongToiDa = source.soGiuongToiDa,
        viTri = source.viTri,
        dangHoatDong = source.dangHoatDong
WHEN NOT MATCHED THEN
    INSERT (maBuongBenh, maKhoa, tenBuong, loaiBuong, soGiuongToiDa, viTri, dangHoatDong)
    VALUES (source.maBuongBenh, source.maKhoa, source.tenBuong, source.loaiBuong, source.soGiuongToiDa, source.viTri, source.dangHoatDong);

-- 2. Seed GiuongBenh
MERGE INTO dbo.GiuongBenh AS target
USING (VALUES
    ('G_NOI_301_01', 'B_NOI_301', '301-01', 'THUONG', 250000, 'TRONG', 1),
    ('G_NOI_301_02', 'B_NOI_301', '301-02', 'THUONG', 250000, 'TRONG', 1),
    ('G_NOI_301_03', 'B_NOI_301', '301-03', 'THUONG', 250000, 'TRONG', 1),
    ('G_NOI_301_04', 'B_NOI_301', '301-04', 'THUONG', 250000, 'TRONG', 1),
    ('G_NOI_302_01', 'B_NOI_VIP302', 'VIP-01', 'HOI_SUC_VIP', 650000, 'TRONG', 1),
    ('G_NOI_302_02', 'B_NOI_VIP302', 'VIP-02', 'HOI_SUC_VIP', 650000, 'TRONG', 1),
    ('G_TIM_401_01', 'B_TIM_401', 'CC-01', 'CAP_CUU', 450000, 'TRONG', 1),
    ('G_TIM_401_02', 'B_TIM_401', 'CC-02', 'CAP_CUU', 450000, 'TRONG', 1)
) AS source (maGiuong, maBuongBenh, soHieuGiuong, loaiGiuong, donGiaNgay, trangThaiHienTai, dangHoatDong)
ON target.maGiuong = source.maGiuong
WHEN MATCHED THEN
    UPDATE SET 
        maBuongBenh = source.maBuongBenh,
        soHieuGiuong = source.soHieuGiuong,
        loaiGiuong = source.loaiGiuong,
        donGiaNgay = source.donGiaNgay,
        dangHoatDong = source.dangHoatDong
WHEN NOT MATCHED THEN
    INSERT (maGiuong, maBuongBenh, soHieuGiuong, loaiGiuong, donGiaNgay, trangThaiHienTai, dangHoatDong)
    VALUES (source.maGiuong, source.maBuongBenh, source.soHieuGiuong, source.loaiGiuong, source.donGiaNgay, source.trangThaiHienTai, source.dangHoatDong);

PRINT N'Đã khởi tạo thành công buồng bệnh và giường bệnh nội trú!';
