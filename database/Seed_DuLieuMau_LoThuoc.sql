-- ============================================================================
-- SCRIPT NẠP DỮ LIỆU MẪU: QUẢN LÝ LÔ HÀNG NHẬP, ĐA LOẠI THUỐC, HÃNG DƯỢC & FEFO
-- Chạy trên database: [QuanLyBenhVien]
-- ============================================================================
USE [QuanLyBenhVien];
GO

SET NOCOUNT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    -- 1. Nạp Khoa Dược
    IF NOT EXISTS (SELECT 1 FROM dbo.Khoa WHERE maKhoa = 'KHOA_DUOC')
    BEGIN
        INSERT INTO dbo.Khoa (maKhoa, tenKhoa, loaiKhoa, viTri, dangHoatDong)
        VALUES ('KHOA_DUOC', N'Khoa Dược Bệnh Viện', 'DUOC', N'Tầng 1 - Tòa nhà A', 1);
    END;

    -- 2. Nạp Danh mục Kho Dược
    IF NOT EXISTS (SELECT 1 FROM dbo.KhoDuoc WHERE maKho = 'KHO_TONG')
    BEGIN
        INSERT INTO dbo.KhoDuoc (maKho, tenKho, maKhoa, loaiKho, viTri, dangHoatDong)
        VALUES 
        ('KHO_TONG', N'Kho Dược Tổng Toàn Viện', 'KHOA_DUOC', 'KHO_TONG', N'Tầng hầm B1', 1),
        ('KHO_NGOAI_TRU', N'Nhà Thuốc Khám Ngoại Trú', 'KHOA_DUOC', 'KHO_LE_NGOAI_TRU', N'Tầng 1 - Cổng chính', 1),
        ('TU_TRUC_CAP_CUU', N'Tủ Trực Cấp Cứu 24/7', 'KHOA_DUOC', 'TU_TRUC_KHOA', N'Khoa Cấp Cứu', 1);
    END;

    -- 3. Nạp Danh mục Hàng hóa y tế (Thuốc & Vật tư)
    IF NOT EXISTS (SELECT 1 FROM dbo.HangHoaYTe WHERE maHang = 'TH_PARA500')
    BEGIN
        INSERT INTO dbo.HangHoaYTe (maHang, tenHang, donViCoSo, loaiHang, donGiaNhapBinhQuan, donGiaXuatCoSo, giaBHYT, dangKinhDoanh)
        VALUES
        ('TH_PARA500', N'Panadol Extra 500mg/65mg', N'Viên', 'THUOC', 1200.00, 1500.00, 1100.00, 1),
        ('TH_AUG1G', N'Augmentin 1g (Amoxicillin/Clavulanate)', N'Viên', 'THUOC', 18500.00, 22000.00, 17000.00, 1),
        ('TH_ZINNAT500', N'Zinnat 500mg (Cefuroxim axetil)', N'Viên', 'THUOC', 24000.00, 28000.00, 22500.00, 1),
        ('TH_NEXIUM40', N'Nexium 40mg (Esomeprazole)', N'Viên', 'THUOC', 21500.00, 25000.00, 20000.00, 1),
        ('VT_GAC_VOTRUNG', N'Gạc phẫu thuật vô trùng 10x10cm', N'Miếng', 'VAT_TU', 3500.00, 4500.00, 3200.00, 1);

        -- Chi tiết Thuốc
        INSERT INTO dbo.Thuoc (maHang, loaiHang, hoatChat, hamLuong, duongDung, dangBaoChe, nhomDieuTri, nhomDoc)
        VALUES
        ('TH_PARA500', 'THUOC', N'Paracetamol + Caffeine', N'500mg + 65mg', N'Đường uống', N'Viên nén bao phim', N'Giảm đau, hạ sốt', N'Thuốc thông thường'),
        ('TH_AUG1G', 'THUOC', N'Amoxicillin + Acid clavulanic', N'875mg + 125mg', N'Đường uống', N'Viên nén bao phim', N'Kháng sinh Penicillin', N'Thuốc kê đơn'),
        ('TH_ZINNAT500', 'THUOC', N'Cefuroxim axetil', N'500mg', N'Đường uống', N'Viên nén bao phim', N'Kháng sinh Cephalosporin', N'Thuốc kê đơn'),
        ('TH_NEXIUM40', 'THUOC', N'Esomeprazole magnesium trihydrate', N'40mg', N'Đường uống', N'Viên kháng dịch dạ dày', N'Ức chế bơm proton (PPI)', N'Thuốc kê đơn');

        -- Chi tiết Vật tư y tế
        INSERT INTO dbo.VatTuYTe (maHang, loaiHang, quyCach, vatLieu, voTrung, taiSuDung)
        VALUES
        ('VT_GAC_VOTRUNG', 'VAT_TU', N'Gói 5 miếng', N'Cotton 100%', 1, 0);
    END;

    -- 4. Nạp các ĐỢT NHẬP HÀNG / LÔ HÀNG TỔNG GIAO TỪ HÃNG (Shipment / Purchase Consignment)
    -- Mỗi đợt nhập của hãng chứa NHIỀU LOẠI THUỐC KHÁC NHAU:
    IF NOT EXISTS (SELECT 1 FROM dbo.DotNhapHang WHERE maDotNhap = 'DOT_GSK_2026_01')
    BEGIN
        INSERT INTO dbo.DotNhapHang (maDotNhap, tenDotNhap, hangSanXuat, nhaCungCap, soHoaDon, ngayNhapKho, maKhoNhap, nguoiGiaoHang, nguoiNhanHang, ghiChu)
        VALUES
        ('DOT_GSK_2026_01', N'Lô Hàng Dược Phẩm GSK Quý 1/2026', N'GSK (GlaxoSmithKline)', N'Zuellig Pharma Việt Nam', 'HD-GSK-202601', '2026-02-10', 'KHO_TONG', N'Nguyễn Văn Vận Chuyển', N'Dược sĩ Trưởng', N'Kiện hàng GSK gồm 3 loại thuốc: Panadol, Augmentin, Zinnat'),
        ('DOT_AZ_2026_01', N'Lô Hàng Tiêu Hóa AstraZeneca Quý 1/2026', N'AstraZeneca', N'Công ty Cổ phần Dược Liệu TW2', 'HD-AZ-88912', '2026-02-15', 'KHO_TONG', N'Trần Giao Vận', N'Dược sĩ Trưởng', N'Kiện hàng AstraZeneca gồm Nexium kháng acid'),
        ('DOT_MRF_2026_01', N'Lô Hàng Vật Tư Merufa Tháng 2/2026', N'Merufa', N'Công ty CP Y Tế Merufa', 'HD-MRF-5541', '2026-02-18', 'KHO_TONG', N'Lê Giao Nhận', N'Thủ kho Vật tư', N'Kiện hàng vật tư tiêu hao gạc vô trùng');
    END;

    -- 5. Nạp CHI TIẾT TỪNG LOẠI THUỐC BÊN TRONG LÔ HÀNG / ĐỢT NHẬP (LoHang)
    -- Cùng 1 đợt nhập DOT_GSK_2026_01 từ hãng GSK, có 3 loại thuốc với số lượng, số lô SX, hạn dùng riêng:
    IF NOT EXISTS (SELECT 1 FROM dbo.LoHang WHERE maLoHang = 'LO_PARA_2026_01')
    BEGIN
        INSERT INTO dbo.LoHang (maLoHang, maDotNhap, maHang, soLoNhaSanXuat, ngaySanXuat, hanSuDung, soLuongNhap, nhaCungCap, nhaSanXuat, hangSanXuat, nuocSanXuat, soDangKy, quyCachDongGoi, donGiaNhap)
        VALUES
        -- Loại 1 trong Lô GSK: Panadol Extra - Nhập 5.000 viên - Còn hạn dài
        ('LO_PARA_2026_01', 'DOT_GSK_2026_01', 'TH_PARA500', 'GSK-26018', '2025-10-01', '2028-09-30', 5000.0000, N'Zuellig Pharma Việt Nam', N'GlaxoSmithKline Dung Quất', N'GSK (GlaxoSmithKline)', N'Việt Nam', 'VD-21345-19', N'Hộp 15 vỉ x 12 viên', 1200.00),

        -- Loại 2 trong Lô GSK: Augmentin 1g - Nhập 1.000 viên - Cận date còn 60 ngày
        ('LO_AUG_2026_CD', 'DOT_GSK_2026_01', 'TH_AUG1G', 'AUG-FR-991', '2024-02-01', DATEADD(day, 60, CAST(SYSDATETIME() AS DATE)), 1000.0000, N'Zuellig Pharma Việt Nam', N'Glaxo Wellcome Production', N'GSK (GlaxoSmithKline)', N'Pháp', 'VN-18972-15', N'Hộp 2 vỉ x 7 viên', 18500.00),

        -- Loại 3 trong Lô GSK: Zinnat 500mg - Nhập 800 viên - Cận date gấp 25 ngày
        ('LO_ZIN_2026_HOT', 'DOT_GSK_2026_01', 'TH_ZINNAT500', 'ZIN-UK-552', '2024-01-15', DATEADD(day, 25, CAST(SYSDATETIME() AS DATE)), 800.0000, N'Zuellig Pharma Việt Nam', N'Glaxo Operations UK Limited', N'GSK (GlaxoSmithKline)', N'Vương quốc Anh', 'VN-20114-16', N'Hộp 1 vỉ x 10 viên', 24000.00),

        -- Lô của hãng AstraZeneca: Nexium 40mg - Nhập 3.000 viên
        ('LO_NEX_2026_OK', 'DOT_AZ_2026_01', 'TH_NEXIUM40', 'AZ-SW-8821', '2025-06-01', DATEADD(day, 450, CAST(SYSDATETIME() AS DATE)), 3000.0000, N'Công ty Cổ phần Dược Liệu TW2', N'AstraZeneca AB', N'AstraZeneca', N'Thụy Điển', 'VN-17552-13', N'Hộp 4 vỉ x 7 viên', 21500.00),

        -- Lô của hãng Merufa: Gạc vô trùng - Nhập 2.000 miếng
        ('LO_GAC_2026', 'DOT_MRF_2026_01', 'VT_GAC_VOTRUNG', 'MRF-2026-A', '2026-01-01', '2029-01-01', 2000.0000, N'Công ty CP Y Tế Merufa', N'Nhà máy Merufa TP.HCM', N'Merufa', N'Việt Nam', '0123/BYT-TB-CT', N'Thùng 100 gói', 3500.00),

        -- Lô lẻ cũ tồn từ trước: Panadol ĐÃ HẾT HẠN
        ('LO_PARA_HET_HAN', NULL, 'TH_PARA500', 'GSK-OLD-001', '2023-01-01', '2025-12-31', 500.0000, N'Công ty Dược phẩm TW3', N'GSK Dung Quất', N'GSK (GlaxoSmithKline)', N'Việt Nam', 'VD-21345-19', N'Hộp 15 vỉ x 12 viên', 1100.00);
    END;

    -- 6. Nạp Phân bổ Tồn kho thực tế tại các Kho Dược (LoTonKho)
    IF NOT EXISTS (SELECT 1 FROM dbo.LoTonKho WHERE maLoTon = 'LTK_001')
    BEGIN
        INSERT INTO dbo.LoTonKho (maLoTon, maKho, maLoHang, soLuongTon, soLuongKhaDung, viTriDayKe, trangThaiKhoa)
        VALUES
        -- Panadol: Kho Tổng giữ 3.600 viên, Kho Ngoại Trú giữ 1.200 viên, Tủ Trực cấp cứu giữ 200 viên (Đã xuất dùng 0 viên)
        ('LTK_001', 'KHO_TONG', 'LO_PARA_2026_01', 3600.0000, 3600.0000, N'Dãy A - Kệ 01 - Tầng 2', 0),
        ('LTK_002', 'KHO_NGOAI_TRU', 'LO_PARA_2026_01', 1200.0000, 1200.0000, N'Tủ lẻ 03 - Ngăn 1', 0),
        ('LTK_003', 'TU_TRUC_CAP_CUU', 'LO_PARA_2026_01', 200.0000, 200.0000, N'Hộp thuốc khẩn', 0),

        -- Augmentin (Lô cận date 60 ngày): Nhập 1.000 viên, hiện còn tồn 450 viên ở Kho ngoại trú (Đã kê đơn xuất 550 viên)
        ('LTK_004', 'KHO_NGOAI_TRU', 'LO_AUG_2026_CD', 450.0000, 450.0000, N'Kệ kháng sinh K1', 0),

        -- Zinnat (Lô cận date 25 ngày): Nhập 800 viên, hiện còn tồn 180 viên ở Kho ngoại trú (Đã kê đơn xuất 620 viên)
        ('LTK_005', 'KHO_NGOAI_TRU', 'LO_ZIN_2026_HOT', 180.0000, 180.0000, N'Kệ FEFO Cận Date', 0),

        -- Nexium: Nhập 3.000 viên, hiện tồn 2.500 viên ở Kho Tổng (Đã chuyển phát 500 viên)
        ('LTK_006', 'KHO_TONG', 'LO_NEX_2026_OK', 2500.0000, 2500.0000, N'Dãy B - Kệ 04', 0),

        -- Lô Panadol hết hạn: Còn 350 viên trong Kho Tổng (ĐÃ BỊ KHÓA)
        ('LTK_007', 'KHO_TONG', 'LO_PARA_HET_HAN', 350.0000, 0.0000, N'Khu vực thuốc chờ hủy', 1),

        -- Gạc vô trùng: Nhập 2.000 miếng, còn tồn 1.000 miếng ở Kho Tổng
        ('LTK_008', 'KHO_TONG', 'LO_GAC_2026', 1000.0000, 1000.0000, N'Kho vật tư tiêu hao', 0);
    END;

    COMMIT TRANSACTION;
    PRINT N'Nạp dữ liệu mẫu Đợt nhập - Lô hàng - Thuốc thành công!';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    PRINT N'Lỗi khi nạp dữ liệu: ' + ERROR_MESSAGE();
    THROW;
END CATCH;
GO

-- ============================================================================
-- CÁC CÂU LỆNH TRUY VẤN DEMO BẢO VỆ ĐỒ ÁN / LAB:
-- ============================================================================

-- BÁO CÁO 1: Bệnh viện nhập 1 Lô hàng của Hãng, trong lô có bao nhiêu loại thuốc, tổng số lượng và tiền?
SELECT 
    maDotNhap AS [Mã Đợt Nhập/Lô Hãng],
    tenDotNhap AS [Tên Lô Hàng Nhập],
    hangSanXuat AS [Hãng Sản Xuất],
    soHoaDon AS [Số Hóa Đơn],
    ngayNhapKho AS [Ngày Nhập],
    soLoaiThuocTrongLo AS [Số Loại Thuốc Trong Lô],
    tongSoLuongThuocTrongLo AS [Tổng SL Thuốc Các Loại],
    tongGiaTriLoHang AS [Tổng Giá Trị Lô (VNĐ)],
    soLoaiThuocCanDate AS [Số Loại Cận Date],
    chiTietCacLoaiThuoc AS [Danh Sách Thuốc & Số Lượng]
FROM dbo.vw_TongHopLoHangNhap_TheoHang;
GO

-- BÁO CÁO 2: CHI TIẾT BÊN TRONG LÔ HÀNG NHẬP (Từng loại thuốc có bao nhiêu viên, số lô SX, hạn dùng riêng ra sao?)
SELECT 
    maDotNhap AS [Mã Đợt Nhập],
    hangSanXuat AS [Hãng Thuốc],
    soHoaDon AS [Số Hóa Đơn],
    tenHang AS [Tên Thuốc],
    nhomDieuTri AS [Nhóm Điều Trị],
    soLoNhaSanXuat AS [Số Lô SX Riêng],
    hanSuDung AS [Hạn Dùng],
    soNgayConHan AS [Số Ngày Còn],
    trangThaiHanDung AS [Tình Trạng Hạn (FEFO)],
    soLuongNhap AS [SL Nhập Ban Đầu],
    tongSoLuongTonHienTai AS [SL Còn Tồn Hiện Tại],
    soLuongDaXuatDung AS [SL Đã Xuất Dùng],
    donViCoSo AS [ĐVT],
    donGiaNhap AS [Đơn Giá Nhập],
    thanhTienNhap AS [Thành Tiền Nhập (VNĐ)]
FROM dbo.vw_ChiTietLoHangNhap_TheoTungLoaiThuoc
ORDER BY maDotNhap, hanSuDung ASC;
GO

-- BÁO CÁO 3: THỐNG KÊ TOÀN VIỆN THEO TỪNG HÃNG DƯỢC PHẨM
SELECT 
    hangSanXuat AS [Hãng Dược Phẩm],
    nuocSanXuat AS [Quốc Gia],
    soLoaiThuocCungUng AS [Số Loại Thuốc Cung Ứng],
    tongSoLoHang AS [Tổng Số Lô Đang Lưu],
    tongSoLuongTonKho AS [Tổng SL Tồn Toàn Viện],
    tongGiaTriTonKho AS [Tổng Trị Giá Tồn Kho (VNĐ)],
    soLoCanDate AS [Số Lô Cận Date (< 90 ngày)]
FROM dbo.vw_ThongKeThuoc_TheoHangSanXuat;
GO