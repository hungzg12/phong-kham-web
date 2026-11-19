-- ==============================================================
-- SEED DATA: KHOA CẬN LÂM SÀNG & DANH MỤC DỊCH VỤ KỸ THUẬT
-- Cơ sở dữ liệu: QuanLyBenhVien
-- ==============================================================
USE QuanLyBenhVien;
GO

SET NOCOUNT ON;

-- 1. Ensure Clinical Departments exist
IF NOT EXISTS (SELECT 1 FROM dbo.Khoa WHERE maKhoa = 'KHOA_XN')
BEGIN
    INSERT INTO dbo.Khoa (maKhoa, tenKhoa, loaiKhoa, dangHoatDong, viTri)
    VALUES ('KHOA_XN', N'Khoa Xét nghiệm Y học', 'CAN_LAM_SANG', 1, N'Tầng 2 - Khu B');
END

IF NOT EXISTS (SELECT 1 FROM dbo.Khoa WHERE maKhoa = 'KHOA_CDHA')
BEGIN
    INSERT INTO dbo.Khoa (maKhoa, tenKhoa, loaiKhoa, dangHoatDong, viTri)
    VALUES ('KHOA_CDHA', N'Khoa Chẩn đoán Hình ảnh & Thăm dò chức năng', 'CAN_LAM_SANG', 1, N'Tầng 1 - Khu B');
END

-- 2. Seed Standard Technical Services (DichVuKyThuat)
MERGE INTO dbo.DichVuKyThuat AS target
USING (VALUES
    ('DV_CONG_THUC_MAU', N'Tổng phân tích tế bào máu ngoại vi (24 thông số)', 'KHOA_XN', 'XET_NGHIEM', 'XET_NGHIEM', 110000, 90000, 30, 1),
    ('DV_DUONG_HUYET', N'Định lượng Glucose máu mao mạch/tĩnh mạch', 'KHOA_XN', 'XET_NGHIEM', 'XET_NGHIEM', 45000, 38000, 20, 1),
    ('DV_MEN_GAN_GOT_GPT', N'Đo hoạt độ AST (GOT) và ALT (GPT)', 'KHOA_XN', 'XET_NGHIEM', 'XET_NGHIEM', 85000, 65000, 30, 1),
    ('DV_URE_CREATININ', N'Định lượng Ure & Creatinin huyết thanh', 'KHOA_XN', 'XET_NGHIEM', 'XET_NGHIEM', 90000, 70000, 30, 1),
    ('DV_LIPID_MAU', N'Bộ mỡ máu toàn phần (Cholesterol, Triglycerid, HDL, LDL)', 'KHOA_XN', 'XET_NGHIEM', 'XET_NGHIEM', 160000, 120000, 45, 1),
    ('DV_XQUANG_TIM_PHOI', N'Chụp X-quang tim phổi thẳng số hóa (1 tư thế)', 'KHOA_CDHA', 'CDHA', 'MO_TA', 150000, 110000, 20, 1),
    ('DV_SIEU_AM_BUNG', N'Siêu âm ổ bụng tổng quát (màu 3D/4D)', 'KHOA_CDHA', 'CDHA', 'MO_TA', 180000, 135000, 25, 1),
    ('DV_DIEN_TIM_ECG', N'Ghi điện tim (Điện tâm đồ thông thường 12 chuyển đạo)', 'KHOA_CDHA', 'CDHA', 'MO_TA', 65000, 50000, 15, 1),
    ('DV_NOI_SOI_TMH', N'Nội soi Tai Mũi Họng ống mềm', 'TMH', 'THU_THUAT', 'MO_TA', 220000, 175000, 20, 1)
) AS source (maDichVu, tenDichVu, maKhoaThucHien, loaiDichVu, loaiKetQua, donGia, giaBHYT, thoiGianTrungBinhPhut, dangHoatDong)
ON target.maDichVu = source.maDichVu
WHEN MATCHED THEN
    UPDATE SET 
        tenDichVu = source.tenDichVu,
        maKhoaThucHien = source.maKhoaThucHien,
        loaiDichVu = source.loaiDichVu,
        loaiKetQua = source.loaiKetQua,
        donGia = source.donGia,
        giaBHYT = source.giaBHYT,
        thoiGianTrungBinhPhut = source.thoiGianTrungBinhPhut,
        dangHoatDong = source.dangHoatDong
WHEN NOT MATCHED THEN
    INSERT (maDichVu, tenDichVu, maKhoaThucHien, loaiDichVu, loaiKetQua, donGia, giaBHYT, thoiGianTrungBinhPhut, dangHoatDong)
    VALUES (source.maDichVu, source.tenDichVu, source.maKhoaThucHien, source.loaiDichVu, source.loaiKetQua, source.donGia, source.giaBHYT, source.thoiGianTrungBinhPhut, source.dangHoatDong);

PRINT N'Đã khởi tạo thành công danh mục Dịch vụ kỹ thuật chuẩn!';
