-- =========================================================================
-- KỊCH BẢN TẠO BẢNG & NẠP DỮ LIỆU DANH MỤC ICD-10 CHUẨN BỘ Y TẾ VIỆT NAM
-- Cơ sở dữ liệu: QuanLyBenhVien
-- =========================================================================

USE QuanLyBenhVien;
GO

-- 1. Tạo bảng DanhMucICD10 nếu chưa tồn tại
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'DanhMucICD10')
BEGIN
    CREATE TABLE dbo.DanhMucICD10 (
        maICD VARCHAR(20) NOT NULL PRIMARY KEY,
        tenBenh NVARCHAR(350) NOT NULL,
        tenTiengAnh NVARCHAR(350) NULL,
        maChuong VARCHAR(10) NULL,
        tenChuong NVARCHAR(250) NULL,
        thuongGap BIT DEFAULT 0,
        trangThai BIT DEFAULT 1,
        ngayCapNhat DATETIME2 DEFAULT SYSDATETIME()
    );

    CREATE NONCLUSTERED INDEX IX_DanhMucICD10_Search 
    ON dbo.DanhMucICD10 (maICD, thuongGap) 
    INCLUDE (tenBenh, tenChuong);

    PRINT N'Đã tạo bảng dbo.DanhMucICD10 thành công.';
END
GO

-- 2. Bulk Merge nạp dữ liệu chuẩn
BEGIN TRANSACTION;

MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A00' AS maICD, N'Bệnh tả' AS tenBenh, 'Cholera' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 0 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A00.0' AS maICD, N'Bệnh tả do Vibrio cholerae 01, biovar cholerae' AS tenBenh, 'Cholera due to Vibrio cholerae 01, biovar cholerae' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 0 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A00.1' AS maICD, N'Bệnh tả do Vibrio cholerae 01, biovar eltor' AS tenBenh, 'Cholera due to Vibrio cholerae 01, biovar eltor' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 0 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A01.0' AS maICD, N'Bệnh sốt thương hàn' AS tenBenh, 'Typhoid fever' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A02.0' AS maICD, N'Viêm ruột do Salmonella' AS tenBenh, 'Salmonella enteritis' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A04.9' AS maICD, N'Nhiễm trùng đường ruột do vi khuẩn, không đặc hiệu' AS tenBenh, 'Bacterial intestinal infection, unspecified' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A06.0' AS maICD, N'Lỵ amip ruột cấp tính' AS tenBenh, 'Acute amoebic dysentery' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A09' AS maICD, N'Tiêu chảy và viêm dạ dày-ruột nghi do nhiễm khuẩn' AS tenBenh, 'Infectious gastroenteritis and colitis, unspecified' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A15.0' AS maICD, N'Lao phổi, xác định bằng soi kính hiển vi tìm AFB' AS tenBenh, 'Tuberculosis of lung, confirmed by sputum microscopy' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A16.2' AS maICD, N'Lao phổi, không chẩn đoán vi khuẩn hay mô học' AS tenBenh, 'Tuberculosis of lung, without mention of bacteriological or histological confirmation' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A37.9' AS maICD, N'Bệnh ho gà, không xác định' AS tenBenh, 'Whooping cough, unspecified' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 0 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A41.9' AS maICD, N'Nhiễm trùng huyết, không xác định' AS tenBenh, 'Sepsis, unspecified' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A49.9' AS maICD, N'Nhiễm vi khuẩn, vị trí không xác định' AS tenBenh, 'Bacterial infection, unspecified' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A90' AS maICD, N'Sốt Dengue (Sốt xuất huyết Dengue cổ điển)' AS tenBenh, 'Dengue fever [classical dengue]' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'A91' AS maICD, N'Sốt xuất huyết Dengue có dấu hiệu cảnh báo/nặng' AS tenBenh, 'Dengue haemorrhagic fever' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'B01.9' AS maICD, N'Bệnh thủy đậu không biến chứng' AS tenBenh, 'Varicella without complication' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'B02.9' AS maICD, N'Bệnh Zona không biến chứng' AS tenBenh, 'Zoster without complication' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'B05.9' AS maICD, N'Bệnh sởi không biến chứng' AS tenBenh, 'Measles without complication' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'B08.4' AS maICD, N'Viêm miệng mụn nước do enterovirus kèm phát ban (Tay-Chân-Miệng)' AS tenBenh, 'Enteroviral vesicular stomatitis with exanthem [Hand, foot and mouth disease]' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'B18.1' AS maICD, N'Viêm gan virus B mạn tính không có tác nhân delta' AS tenBenh, 'Chronic viral hepatitis B without delta-agent' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'B18.2' AS maICD, N'Viêm gan virus C mạn tính' AS tenBenh, 'Chronic viral hepatitis C' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'B20' AS maICD, N'Bệnh do virus gây suy giảm miễn dịch ở người [HIV]' AS tenBenh, 'Human immunodeficiency virus [HIV] disease' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 0 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'B26.9' AS maICD, N'Bệnh quai bị không biến chứng' AS tenBenh, 'Mumps without complication' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'B34.9' AS maICD, N'Nhiễm virus, vị trí không xác định (Sốt virus)' AS tenBenh, 'Viral infection, unspecified' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'B35.9' AS maICD, N'Nấm da, không xác định' AS tenBenh, 'Dermatophytosis, unspecified' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'B37.0' AS maICD, N'Viêm miệng do nấm Candida (Tưa miệng)' AS tenBenh, 'Candidal stomatitis' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'B82.0' AS maICD, N'Nhiễm giun đường ruột, không xác định' AS tenBenh, 'Intestinal helminthiasis, unspecified' AS tenTiengAnh, 'I' AS maChuong, N'Một số bệnh nhiễm trùng và ký sinh trùng' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'C16.9' AS maICD, N'U ác của dạ dày, không xác định (Ung thư dạ dày)' AS tenBenh, 'Malignant neoplasm of stomach, unspecified' AS tenTiengAnh, 'II' AS maChuong, N'Khối u' AS tenChuong, 0 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'C18.9' AS maICD, N'U ác của đại tràng, không xác định (Ung thư đại tràng)' AS tenBenh, 'Malignant neoplasm of colon, unspecified' AS tenTiengAnh, 'II' AS maChuong, N'Khối u' AS tenChuong, 0 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'C22.0' AS maICD, N'Ung thư biểu mô tế bào gan (HCC)' AS tenBenh, 'Liver cell carcinoma' AS tenTiengAnh, 'II' AS maChuong, N'Khối u' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'C34.9' AS maICD, N'U ác của phế quản và phổi, không xác định (Ung thư phổi)' AS tenBenh, 'Malignant neoplasm of bronchus or lung, unspecified' AS tenTiengAnh, 'II' AS maChuong, N'Khối u' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'C50.9' AS maICD, N'U ác của vú, không xác định (Ung thư vú)' AS tenBenh, 'Malignant neoplasm of breast, unspecified' AS tenTiengAnh, 'II' AS maChuong, N'Khối u' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'C53.9' AS maICD, N'U ác của cổ tử cung, không xác định (Ung thư cổ tử cung)' AS tenBenh, 'Malignant neoplasm of cervix uteri, unspecified' AS tenTiengAnh, 'II' AS maChuong, N'Khối u' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'C73' AS maICD, N'U ác của tuyến giáp (Ung thư tuyến giáp)' AS tenBenh, 'Malignant neoplasm of thyroid gland' AS tenTiengAnh, 'II' AS maChuong, N'Khối u' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'D12.6' AS maICD, N'U lành của đại tràng (Polyp đại tràng)' AS tenBenh, 'Benign neoplasm of colon' AS tenTiengAnh, 'II' AS maChuong, N'Khối u' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'D17.9' AS maICD, N'U mỡ lành tính, vị trí không xác định (U mỡ Lipoma)' AS tenBenh, 'Benign lipomatous neoplasm, unspecified' AS tenTiengAnh, 'II' AS maChuong, N'Khối u' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'D24' AS maICD, N'U lành của vú (U xơ tuyến vú)' AS tenBenh, 'Benign neoplasm of breast' AS tenTiengAnh, 'II' AS maChuong, N'Khối u' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'D25.9' AS maICD, N'U xơ tử cung, không xác định' AS tenBenh, 'Leiomyoma of uterus, unspecified' AS tenTiengAnh, 'II' AS maChuong, N'Khối u' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'D50.9' AS maICD, N'Thiếu máu do thiếu sắt, không xác định' AS tenBenh, 'Iron deficiency anaemia, unspecified' AS tenTiengAnh, 'III' AS maChuong, N'Bệnh của máu và cơ quan tạo máu' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'D56.9' AS maICD, N'Bệnh Thalassemia, không xác định' AS tenBenh, 'Thalassaemia, unspecified' AS tenTiengAnh, 'III' AS maChuong, N'Bệnh của máu và cơ quan tạo máu' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'D64.9' AS maICD, N'Thiếu máu, không xác định' AS tenBenh, 'Anaemia, unspecified' AS tenTiengAnh, 'III' AS maChuong, N'Bệnh của máu và cơ quan tạo máu' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'D69.6' AS maICD, N'Giảm tiểu cầu, không xác định' AS tenBenh, 'Thrombocytopenia, unspecified' AS tenTiengAnh, 'III' AS maChuong, N'Bệnh của máu và cơ quan tạo máu' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'E03.9' AS maICD, N'Suy giáp, không xác định' AS tenBenh, 'Hypothyroidism, unspecified' AS tenTiengAnh, 'IV' AS maChuong, N'Bệnh nội tiết, dinh dưỡng và chuyển hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'E04.1' AS maICD, N'Bướu giáp đơn nhân không độc' AS tenBenh, 'Nontoxic single thyroid nodule' AS tenTiengAnh, 'IV' AS maChuong, N'Bệnh nội tiết, dinh dưỡng và chuyển hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'E04.2' AS maICD, N'Bướu giáp đa nhân không độc' AS tenBenh, 'Nontoxic multinodular goitre' AS tenTiengAnh, 'IV' AS maChuong, N'Bệnh nội tiết, dinh dưỡng và chuyển hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'E05.0' AS maICD, N'Nhiễm độc giáp kèm bướu giáp lan tỏa (Basedow)' AS tenBenh, 'Thyrotoxicosis with diffuse goitre' AS tenTiengAnh, 'IV' AS maChuong, N'Bệnh nội tiết, dinh dưỡng và chuyển hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'E10.9' AS maICD, N'Đái tháo đường phụ thuộc insulin (Type 1), không biến chứng' AS tenBenh, 'Type 1 diabetes mellitus without complications' AS tenTiengAnh, 'IV' AS maChuong, N'Bệnh nội tiết, dinh dưỡng và chuyển hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'E11.9' AS maICD, N'Đái tháo đường không phụ thuộc insulin (Type 2), không biến chứng' AS tenBenh, 'Type 2 diabetes mellitus without complications' AS tenTiengAnh, 'IV' AS maChuong, N'Bệnh nội tiết, dinh dưỡng và chuyển hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'E11.4' AS maICD, N'Đái tháo đường type 2 có biến chứng thần kinh' AS tenBenh, 'Type 2 diabetes mellitus with neurological complications' AS tenTiengAnh, 'IV' AS maChuong, N'Bệnh nội tiết, dinh dưỡng và chuyển hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'E14.9' AS maICD, N'Bệnh đái tháo đường không xác định' AS tenBenh, 'Unspecified diabetes mellitus without complications' AS tenTiengAnh, 'IV' AS maChuong, N'Bệnh nội tiết, dinh dưỡng và chuyển hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'E66.9' AS maICD, N'Béo phì, không xác định' AS tenBenh, 'Obesity, unspecified' AS tenTiengAnh, 'IV' AS maChuong, N'Bệnh nội tiết, dinh dưỡng và chuyển hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'E78.0' AS maICD, N'Tăng cholesterol máu thuần túy' AS tenBenh, 'Pure hypercholesterolaemia' AS tenTiengAnh, 'IV' AS maChuong, N'Bệnh nội tiết, dinh dưỡng và chuyển hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'E78.1' AS maICD, N'Tăng triglycerid máu thuần túy' AS tenBenh, 'Pure hyperglyceridaemia' AS tenTiengAnh, 'IV' AS maChuong, N'Bệnh nội tiết, dinh dưỡng và chuyển hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'E78.2' AS maICD, N'Tăng lipid máu hỗn hợp (Rối loạn chuyển hóa lipid máu)' AS tenBenh, 'Mixed hyperlipidaemia' AS tenTiengAnh, 'IV' AS maChuong, N'Bệnh nội tiết, dinh dưỡng và chuyển hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'E79.0' AS maICD, N'Tăng acid uric máu không có dấu hiệu viêm khớp (Tăng acid uric máu)' AS tenBenh, 'Hyperuricaemia without signs of inflammatory arthritis' AS tenTiengAnh, 'IV' AS maChuong, N'Bệnh nội tiết, dinh dưỡng và chuyển hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'F32.9' AS maICD, N'Giai đoạn trầm cảm, không xác định' AS tenBenh, 'Depressive episode, unspecified' AS tenTiengAnh, 'V' AS maChuong, N'Rối loạn tâm thần và hành vi' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'F41.1' AS maICD, N'Rối loạn lo âu lan tỏa' AS tenBenh, 'Generalized anxiety disorder' AS tenTiengAnh, 'V' AS maChuong, N'Rối loạn tâm thần và hành vi' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'F41.9' AS maICD, N'Rối loạn lo âu, không xác định' AS tenBenh, 'Anxiety disorder, unspecified' AS tenTiengAnh, 'V' AS maChuong, N'Rối loạn tâm thần và hành vi' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'F45.0' AS maICD, N'Rối loạn cơ thể hóa (Rối loạn dạng cơ thể)' AS tenBenh, 'Somatization disorder' AS tenTiengAnh, 'V' AS maChuong, N'Rối loạn tâm thần và hành vi' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'F51.0' AS maICD, N'Mất ngủ không thực tổn' AS tenBenh, 'Nonorganic insomnia' AS tenTiengAnh, 'V' AS maChuong, N'Rối loạn tâm thần và hành vi' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'G40.9' AS maICD, N'Bệnh động kinh, không xác định' AS tenBenh, 'Epilepsy, unspecified' AS tenTiengAnh, 'VI' AS maChuong, N'Bệnh hệ thần kinh' AS tenChuong, 0 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'G43.9' AS maICD, N'Đau nửa đầu (Migraine), không xác định' AS tenBenh, 'Migraine, unspecified' AS tenTiengAnh, 'VI' AS maChuong, N'Bệnh hệ thần kinh' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'G44.2' AS maICD, N'Đau đầu do căng thẳng' AS tenBenh, 'Tension-type headache' AS tenTiengAnh, 'VI' AS maChuong, N'Bệnh hệ thần kinh' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'G45.9' AS maICD, N'Cơn thiếu máu não cục bộ thoáng qua (TIA)' AS tenBenh, 'Transient cerebral ischaemic attack, unspecified' AS tenTiengAnh, 'VI' AS maChuong, N'Bệnh hệ thần kinh' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'G47.0' AS maICD, N'Rối loạn bắt đầu và duy trì giấc ngủ [Mất ngủ]' AS tenBenh, 'Disorders of initiating and maintaining sleep [insomnias]' AS tenTiengAnh, 'VI' AS maChuong, N'Bệnh hệ thần kinh' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'G51.0' AS maICD, N'Liệt Bell (Liệt dây thần kinh số VII ngoại biên)' AS tenBenh, 'Bell palsy' AS tenTiengAnh, 'VI' AS maChuong, N'Bệnh hệ thần kinh' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'G56.0' AS maICD, N'Hội chứng ống cổ tay' AS tenBenh, 'Carpal tunnel syndrome' AS tenTiengAnh, 'VI' AS maChuong, N'Bệnh hệ thần kinh' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H00.0' AS maICD, N'Lẹo và các viêm sâu khác của mi mắt' AS tenBenh, 'Hordeolum and other deep inflammation of eyelid' AS tenTiengAnh, 'VII' AS maChuong, N'Bệnh của mắt và phần phụ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H10.9' AS maICD, N'Viêm kết mạc, không xác định (Đau mắt đỏ)' AS tenBenh, 'Conjunctivitis, unspecified' AS tenTiengAnh, 'VII' AS maChuong, N'Bệnh của mắt và phần phụ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H16.0' AS maICD, N'Loét giác mạc' AS tenBenh, 'Corneal ulcer' AS tenTiengAnh, 'VII' AS maChuong, N'Bệnh của mắt và phần phụ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H25.9' AS maICD, N'Đục thủy tinh thể tuổi già, không xác định' AS tenBenh, 'Senile cataract, unspecified' AS tenTiengAnh, 'VII' AS maChuong, N'Bệnh của mắt và phần phụ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H40.9' AS maICD, N'Glaucoma, không xác định (Tăng nhãn áp / Thiên đầu thống)' AS tenBenh, 'Glaucoma, unspecified' AS tenTiengAnh, 'VII' AS maChuong, N'Bệnh của mắt và phần phụ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H52.1' AS maICD, N'Cận thị' AS tenBenh, 'Myopia' AS tenTiengAnh, 'VII' AS maChuong, N'Bệnh của mắt và phần phụ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H52.2' AS maICD, N'Loạn thị' AS tenBenh, 'Astigmatism' AS tenTiengAnh, 'VII' AS maChuong, N'Bệnh của mắt và phần phụ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H60.9' AS maICD, N'Viêm tai ngoài, không xác định' AS tenBenh, 'Otitis externa, unspecified' AS tenTiengAnh, 'VIII' AS maChuong, N'Bệnh của tai và xương chũm' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H65.9' AS maICD, N'Viêm tai giữa không nung mủ, không xác định' AS tenBenh, 'Nonsuppurative otitis media, unspecified' AS tenTiengAnh, 'VIII' AS maChuong, N'Bệnh của tai và xương chũm' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H66.9' AS maICD, N'Viêm tai giữa có nung mủ, không xác định' AS tenBenh, 'Otitis media, unspecified' AS tenTiengAnh, 'VIII' AS maChuong, N'Bệnh của tai và xương chũm' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H81.0' AS maICD, N'Bệnh Meniere (Chóng mặt Meniere)' AS tenBenh, 'Meniere disease' AS tenTiengAnh, 'VIII' AS maChuong, N'Bệnh của tai và xương chũm' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H81.1' AS maICD, N'Chóng mặt kịch phát lành tính theo tư thế (BPPV)' AS tenBenh, 'Benign paroxysmal vertigo' AS tenTiengAnh, 'VIII' AS maChuong, N'Bệnh của tai và xương chũm' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H81.9' AS maICD, N'Rối loạn chức năng tiền đình, không xác định (Hội chứng tiền đình)' AS tenBenh, 'Disorder of vestibular function, unspecified' AS tenTiengAnh, 'VIII' AS maChuong, N'Bệnh của tai và xương chũm' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H91.9' AS maICD, N'Giảm thính lực, không xác định' AS tenBenh, 'Hearing loss, unspecified' AS tenTiengAnh, 'VIII' AS maChuong, N'Bệnh của tai và xương chũm' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'H93.1' AS maICD, N'Ù tai' AS tenBenh, 'Tinnitus' AS tenTiengAnh, 'VIII' AS maChuong, N'Bệnh của tai và xương chũm' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I10' AS maICD, N'Bệnh tăng huyết áp vô căn (nguyên phát)' AS tenBenh, 'Essential (primary) hypertension' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I11.9' AS maICD, N'Bệnh tim do tăng huyết áp không có suy tim' AS tenBenh, 'Hypertensive heart disease without heart failure' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I15.9' AS maICD, N'Tăng huyết áp thứ phát, không xác định' AS tenBenh, 'Secondary hypertension, unspecified' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I20.9' AS maICD, N'Cơn đau thắt ngực, không xác định' AS tenBenh, 'Angina pectoris, unspecified' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I21.9' AS maICD, N'Nhồi máu cơ tim cấp, không xác định' AS tenBenh, 'Acute myocardial infarction, unspecified' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I25.1' AS maICD, N'Bệnh tim xơ vữa (Bệnh động mạch vành mạn tính)' AS tenBenh, 'Atherosclerotic heart disease' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I25.9' AS maICD, N'Bệnh tim thiếu máu cục bộ mạn tính, không xác định' AS tenBenh, 'Chronic ischaemic heart disease, unspecified' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I47.1' AS maICD, N'Nhịp nhanh trên thất' AS tenBenh, 'Supraventricular tachycardia' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I48' AS maICD, N'Rung nhĩ và cuồng nhĩ' AS tenBenh, 'Atrial fibrillation and flutter' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I49.9' AS maICD, N'Loạn nhịp tim, không xác định' AS tenBenh, 'Cardiac arrhythmia, unspecified' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I50.9' AS maICD, N'Suy tim, không xác định' AS tenBenh, 'Heart failure, unspecified' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I63.9' AS maICD, N'Nhồi máu não, không xác định (Đột quỵ thiếu máu não cục bộ)' AS tenBenh, 'Cerebral infarction, unspecified' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I64' AS maICD, N'Đột quỵ, không xác định xuất huyết hay nhồi máu' AS tenBenh, 'Stroke, not specified as haemorrhage or infarction' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I67.8' AS maICD, N'Bệnh mạch máu não đặc hiệu khác (Thiểu năng tuần hoàn não)' AS tenBenh, 'Other specified cerebrovascular diseases' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I67.9' AS maICD, N'Bệnh mạch máu não, không xác định' AS tenBenh, 'Cerebrovascular disease, unspecified' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I83.9' AS maICD, N'Giãn tĩnh mạch chi dưới không kèm loét hoặc viêm' AS tenBenh, 'Varicose veins of lower extremities without ulcer or inflammation' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I84.9' AS maICD, N'Bệnh trĩ không xác định không biến chứng' AS tenBenh, 'Unspecified haemorrhoids without complication' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'I95.9' AS maICD, N'Hạ huyết áp, không xác định' AS tenBenh, 'Hypotension, unspecified' AS tenTiengAnh, 'IX' AS maChuong, N'Bệnh hệ tuần hoàn' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J00' AS maICD, N'Viêm mũi họng cấp [Cảm lạnh thông thường]' AS tenBenh, 'Acute nasopharyngitis [common cold]' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J01.9' AS maICD, N'Viêm xoang cấp, không xác định' AS tenBenh, 'Acute sinusitis, unspecified' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J02.9' AS maICD, N'Viêm họng cấp, không xác định' AS tenBenh, 'Acute pharyngitis, unspecified' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J03.9' AS maICD, N'Viêm amidan cấp, không xác định' AS tenBenh, 'Acute tonsillitis, unspecified' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J04.0' AS maICD, N'Viêm thanh quản cấp' AS tenBenh, 'Acute laryngitis' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J06.9' AS maICD, N'Nhiễm trùng đường hô hấp trên cấp tính, không xác định' AS tenBenh, 'Acute upper respiratory infection, unspecified' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J11.1' AS maICD, N'Cúm không xác định vi rút kèm biểu hiện hô hấp khác' AS tenBenh, 'Influenza with other respiratory manifestations, virus not identified' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J18.0' AS maICD, N'Phế quản phế viêm, không xác định' AS tenBenh, 'Bronchopneumonia, unspecified' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J18.9' AS maICD, N'Viêm phổi, không xác định' AS tenBenh, 'Pneumonia, unspecified' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J20.9' AS maICD, N'Viêm phế quản cấp, không xác định' AS tenBenh, 'Acute bronchitis, unspecified' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J30.4' AS maICD, N'Viêm mũi dị ứng, không xác định' AS tenBenh, 'Allergic rhinitis, unspecified' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J31.0' AS maICD, N'Viêm mũi mạn tính' AS tenBenh, 'Chronic rhinitis' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J32.9' AS maICD, N'Viêm xoang mạn tính, không xác định' AS tenBenh, 'Chronic sinusitis, unspecified' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J35.0' AS maICD, N'Viêm amidan mạn tính' AS tenBenh, 'Chronic tonsillitis' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J40' AS maICD, N'Viêm phế quản không đặc hiệu là cấp hay mạn tính' AS tenBenh, 'Bronchitis, not specified as acute or chronic' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J44.9' AS maICD, N'Bệnh phổi tắc nghẽn mạn tính, không xác định (COPD)' AS tenBenh, 'Chronic obstructive pulmonary disease, unspecified' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'J45.9' AS maICD, N'Hen phế quản, không xác định (Hen suyễn)' AS tenBenh, 'Asthma, unspecified' AS tenTiengAnh, 'X' AS maChuong, N'Bệnh hệ hô hấp' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K02.9' AS maICD, N'Sâu răng, không xác định' AS tenBenh, 'Dental caries, unspecified' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K05.1' AS maICD, N'Viêm lợi mạn tính' AS tenBenh, 'Chronic gingivitis' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K05.3' AS maICD, N'Viêm quanh răng mạn tính (Viêm nha chu)' AS tenBenh, 'Chronic periodontitis' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K12.0' AS maICD, N'Loét áp tơ tái phát ở miệng (Nhiệt miệng)' AS tenBenh, 'Recurrent oral aphthae' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K21.0' AS maICD, N'Bệnh trào ngược dạ dày-thực quản có viêm thực quản' AS tenBenh, 'Gastro-oesophageal reflux disease with oesophagitis' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K21.9' AS maICD, N'Bệnh trào ngược dạ dày-thực quản không có viêm thực quản (GERD)' AS tenBenh, 'Gastro-oesophageal reflux disease without oesophagitis' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K25.9' AS maICD, N'Loét dạ dày, không đặc hiệu là cấp hay mạn, không xuất huyết hay thủng' AS tenBenh, 'Gastric ulcer, unspecified as acute or chronic, without haemorrhage or perforation' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K26.9' AS maICD, N'Loét tá tràng, không đặc hiệu là cấp hay mạn, không xuất huyết hay thủng' AS tenBenh, 'Duodenal ulcer, unspecified as acute or chronic, without haemorrhage or perforation' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K29.1' AS maICD, N'Viêm dạ dày cấp tính khác' AS tenBenh, 'Other acute gastritis' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K29.5' AS maICD, N'Viêm dạ dày mạn tính, không xác định' AS tenBenh, 'Chronic gastritis, unspecified' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K29.7' AS maICD, N'Viêm dạ dày, không xác định (Đau dạ dày)' AS tenBenh, 'Gastritis, unspecified' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K30' AS maICD, N'Chứng khó tiêu (Đầy bụng khó tiêu)' AS tenBenh, 'Dyspepsia' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K35.8' AS maICD, N'Viêm ruột thừa cấp khác và không xác định' AS tenBenh, 'Other and unspecified acute appendicitis' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K58.9' AS maICD, N'Hội chứng ruột kích thích không kèm tiêu chảy (IBS / Viêm đại tràng co thắt)' AS tenBenh, 'Irritable bowel syndrome without diarrhoea' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K59.0' AS maICD, N'Táo bón' AS tenBenh, 'Constipation' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K70.3' AS maICD, N'Xơ gan do rượu' AS tenBenh, 'Alcoholic cirrhosis of liver' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K74.6' AS maICD, N'Xơ gan khác và không xác định' AS tenBenh, 'Other and unspecified cirrhosis of liver' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K76.0' AS maICD, N'Gan nhiễm mỡ, không phân loại ở nơi khác' AS tenBenh, 'Fatty (change of) liver, not elsewhere classified' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K80.2' AS maICD, N'Sỏi túi mật không kèm viêm túi mật' AS tenBenh, 'Calculus of gallbladder without cholecystitis' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'K85.9' AS maICD, N'Viêm tụy cấp, không xác định' AS tenBenh, 'Acute pancreatitis, unspecified' AS tenTiengAnh, 'XI' AS maChuong, N'Bệnh hệ tiêu hoá' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'L02.9' AS maICD, N'Áp xe da, nhọt và nhọt cụm, vị trí không xác định' AS tenBenh, 'Cutaneous abscess, furuncle and carbuncle, unspecified' AS tenTiengAnh, 'XII' AS maChuong, N'Bệnh của da và mô dưới da' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'L03.9' AS maICD, N'Viêm mô tế bào, không xác định' AS tenBenh, 'Cellulitis, unspecified' AS tenTiengAnh, 'XII' AS maChuong, N'Bệnh của da và mô dưới da' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'L20.9' AS maICD, N'Viêm da cơ địa, không xác định (Chàm Eczema)' AS tenBenh, 'Atopic dermatitis, unspecified' AS tenTiengAnh, 'XII' AS maChuong, N'Bệnh của da và mô dưới da' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'L23.9' AS maICD, N'Viêm da tiếp xúc dị ứng, không xác định nguyên nhân' AS tenBenh, 'Allergic contact dermatitis, unspecified cause' AS tenTiengAnh, 'XII' AS maChuong, N'Bệnh của da và mô dưới da' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'L29.9' AS maICD, N'Ngứa, không xác định' AS tenBenh, 'Pruritus, unspecified' AS tenTiengAnh, 'XII' AS maChuong, N'Bệnh của da và mô dưới da' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'L30.9' AS maICD, N'Viêm da, không xác định' AS tenBenh, 'Dermatitis, unspecified' AS tenTiengAnh, 'XII' AS maChuong, N'Bệnh của da và mô dưới da' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'L40.0' AS maICD, N'Bệnh vảy nến thể mảng' AS tenBenh, 'Psoriasis vulgaris' AS tenTiengAnh, 'XII' AS maChuong, N'Bệnh của da và mô dưới da' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'L50.0' AS maICD, N'Mày đay dị ứng' AS tenBenh, 'Allergic urticaria' AS tenTiengAnh, 'XII' AS maChuong, N'Bệnh của da và mô dưới da' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'L50.9' AS maICD, N'Mày đay, không xác định (Nổi mề đay)' AS tenBenh, 'Urticaria, unspecified' AS tenTiengAnh, 'XII' AS maChuong, N'Bệnh của da và mô dưới da' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'L70.0' AS maICD, N'Mụn trứng cá thông thường' AS tenBenh, 'Acne vulgaris' AS tenTiengAnh, 'XII' AS maChuong, N'Bệnh của da và mô dưới da' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'M06.9' AS maICD, N'Viêm khớp dạng thấp, không xác định' AS tenBenh, 'Rheumatoid arthritis, unspecified' AS tenTiengAnh, 'XIII' AS maChuong, N'Bệnh hệ cơ-xương-khớp và mô liên kết' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'M10.9' AS maICD, N'Bệnh gút, không xác định (Gout)' AS tenBenh, 'Gout, unspecified' AS tenTiengAnh, 'XIII' AS maChuong, N'Bệnh hệ cơ-xương-khớp và mô liên kết' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'M17.9' AS maICD, N'Thoái hóa khớp gối, không xác định' AS tenBenh, 'Gonarthrosis, unspecified' AS tenTiengAnh, 'XIII' AS maChuong, N'Bệnh hệ cơ-xương-khớp và mô liên kết' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'M19.9' AS maICD, N'Thoái hóa khớp, không xác định' AS tenBenh, 'Arthrosis, unspecified' AS tenTiengAnh, 'XIII' AS maChuong, N'Bệnh hệ cơ-xương-khớp và mô liên kết' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'M25.5' AS maICD, N'Đau khớp' AS tenBenh, 'Pain in joint' AS tenTiengAnh, 'XIII' AS maChuong, N'Bệnh hệ cơ-xương-khớp và mô liên kết' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'M47.9' AS maICD, N'Thoái hóa cột sống, không xác định' AS tenBenh, 'Spondylosis, unspecified' AS tenTiengAnh, 'XIII' AS maChuong, N'Bệnh hệ cơ-xương-khớp và mô liên kết' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'M50.9' AS maICD, N'Bệnh đĩa đệm cột sống cổ, không xác định (Thoát vị đĩa đệm cổ)' AS tenBenh, 'Cervical disc disorder, unspecified' AS tenTiengAnh, 'XIII' AS maChuong, N'Bệnh hệ cơ-xương-khớp và mô liên kết' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'M51.2' AS maICD, N'Thoát vị đĩa đệm cột sống thắt lưng khác' AS tenBenh, 'Other specified intervertebral disc displacement' AS tenTiengAnh, 'XIII' AS maChuong, N'Bệnh hệ cơ-xương-khớp và mô liên kết' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'M54.2' AS maICD, N'Đau cổ (Hội chứng đau vai gáy)' AS tenBenh, 'Cervicalgia' AS tenTiengAnh, 'XIII' AS maChuong, N'Bệnh hệ cơ-xương-khớp và mô liên kết' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'M54.3' AS maICD, N'Đau thần kinh tọa' AS tenBenh, 'Sciatica' AS tenTiengAnh, 'XIII' AS maChuong, N'Bệnh hệ cơ-xương-khớp và mô liên kết' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'M54.5' AS maICD, N'Đau thắt lưng (Đau lưng dưới)' AS tenBenh, 'Low back pain' AS tenTiengAnh, 'XIII' AS maChuong, N'Bệnh hệ cơ-xương-khớp và mô liên kết' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'M79.1' AS maICD, N'Đau cơ (Myalgia)' AS tenBenh, 'Myalgia' AS tenTiengAnh, 'XIII' AS maChuong, N'Bệnh hệ cơ-xương-khớp và mô liên kết' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'M81.9' AS maICD, N'Loãng xương, không xác định' AS tenBenh, 'Osteoporosis, unspecified' AS tenTiengAnh, 'XIII' AS maChuong, N'Bệnh hệ cơ-xương-khớp và mô liên kết' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'N18.9' AS maICD, N'Bệnh thận mạn tính, không xác định (Suy thận mạn)' AS tenBenh, 'Chronic kidney disease, unspecified' AS tenTiengAnh, 'XIV' AS maChuong, N'Bệnh hệ sinh dục-tiết niệu' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'N20.0' AS maICD, N'Sỏi thận' AS tenBenh, 'Calculus of kidney' AS tenTiengAnh, 'XIV' AS maChuong, N'Bệnh hệ sinh dục-tiết niệu' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'N20.1' AS maICD, N'Sỏi niệu quản' AS tenBenh, 'Calculus of ureter' AS tenTiengAnh, 'XIV' AS maChuong, N'Bệnh hệ sinh dục-tiết niệu' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'N30.0' AS maICD, N'Viêm bàng quang cấp' AS tenBenh, 'Acute cystitis' AS tenTiengAnh, 'XIV' AS maChuong, N'Bệnh hệ sinh dục-tiết niệu' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'N39.0' AS maICD, N'Nhiễm trùng đường tiết niệu, vị trí không xác định (UTI)' AS tenBenh, 'Urinary tract infection, site not specified' AS tenTiengAnh, 'XIV' AS maChuong, N'Bệnh hệ sinh dục-tiết niệu' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'N40' AS maICD, N'Tăng sinh lành tính tuyến tiền liệt (Phì đại tiền liệt tuyến)' AS tenBenh, 'Hyperplasia of prostate' AS tenTiengAnh, 'XIV' AS maChuong, N'Bệnh hệ sinh dục-tiết niệu' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'N72' AS maICD, N'Bệnh viêm cổ tử cung' AS tenBenh, 'Inflammatory disease of cervix uteri' AS tenTiengAnh, 'XIV' AS maChuong, N'Bệnh hệ sinh dục-tiết niệu' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'N76.0' AS maICD, N'Viêm âm đạo cấp (Viêm phụ khoa)' AS tenBenh, 'Acute vaginitis' AS tenTiengAnh, 'XIV' AS maChuong, N'Bệnh hệ sinh dục-tiết niệu' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'N92.0' AS maICD, N'Kinh nguyệt quá nhiều và thường xuyên với chu kỳ đều (Rong kinh)' AS tenBenh, 'Excessive and frequent menstruation with regular cycle' AS tenTiengAnh, 'XIV' AS maChuong, N'Bệnh hệ sinh dục-tiết niệu' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'N94.6' AS maICD, N'Đau bụng kinh, không xác định' AS tenBenh, 'Dysmenorrhoea, unspecified' AS tenTiengAnh, 'XIV' AS maChuong, N'Bệnh hệ sinh dục-tiết niệu' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'O00.9' AS maICD, N'Chửa ngoài tử cung, không xác định' AS tenBenh, 'Ectopic pregnancy, unspecified' AS tenTiengAnh, 'XV' AS maChuong, N'Thai nghén, sinh đẻ và thời kỳ sau đẻ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'O20.0' AS maICD, N'Dọa sẩy thai' AS tenBenh, 'Threatened abortion' AS tenTiengAnh, 'XV' AS maChuong, N'Thai nghén, sinh đẻ và thời kỳ sau đẻ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'O24.4' AS maICD, N'Đái tháo đường xuất hiện trong thời kỳ thai nghén (Đái tháo đường thai kỳ)' AS tenBenh, 'Diabetes mellitus arising in pregnancy' AS tenTiengAnh, 'XV' AS maChuong, N'Thai nghén, sinh đẻ và thời kỳ sau đẻ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'O80.0' AS maICD, N'Đẻ thường ngôi chỏm' AS tenBenh, 'Spontaneous vertex delivery' AS tenTiengAnh, 'XV' AS maChuong, N'Thai nghén, sinh đẻ và thời kỳ sau đẻ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'R00.0' AS maICD, N'Nhịp tim nhanh, không xác định (Hồi hộp, tim đập nhanh)' AS tenBenh, 'Tachycardia, unspecified' AS tenTiengAnh, 'XVIII' AS maChuong, N'Triệu chứng, dấu hiệu và kết quả bất thường' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'R05' AS maICD, N'Ho' AS tenBenh, 'Cough' AS tenTiengAnh, 'XVIII' AS maChuong, N'Triệu chứng, dấu hiệu và kết quả bất thường' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'R06.0' AS maICD, N'Khó thở' AS tenBenh, 'Dyspnoea' AS tenTiengAnh, 'XVIII' AS maChuong, N'Triệu chứng, dấu hiệu và kết quả bất thường' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'R07.4' AS maICD, N'Đau ngực, không xác định' AS tenBenh, 'Chest pain, unspecified' AS tenTiengAnh, 'XVIII' AS maChuong, N'Triệu chứng, dấu hiệu và kết quả bất thường' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'R10.4' AS maICD, N'Đau bụng khác và không xác định' AS tenBenh, 'Other and unspecified abdominal pain' AS tenTiengAnh, 'XVIII' AS maChuong, N'Triệu chứng, dấu hiệu và kết quả bất thường' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'R11' AS maICD, N'Buồn nôn và nôn' AS tenBenh, 'Nausea and vomiting' AS tenTiengAnh, 'XVIII' AS maChuong, N'Triệu chứng, dấu hiệu và kết quả bất thường' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'R42' AS maICD, N'Chóng mặt và hoa mắt' AS tenBenh, 'Dizziness and giddiness' AS tenTiengAnh, 'XVIII' AS maChuong, N'Triệu chứng, dấu hiệu và kết quả bất thường' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'R50.9' AS maICD, N'Sốt, không xác định' AS tenBenh, 'Fever, unspecified' AS tenTiengAnh, 'XVIII' AS maChuong, N'Triệu chứng, dấu hiệu và kết quả bất thường' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'R51' AS maICD, N'Đau đầu (Nhức đầu)' AS tenBenh, 'Headache' AS tenTiengAnh, 'XVIII' AS maChuong, N'Triệu chứng, dấu hiệu và kết quả bất thường' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'R53' AS maICD, N'Khó ở và mệt mỏi (Suy nhược cơ thể)' AS tenBenh, 'Malaise and fatigue' AS tenTiengAnh, 'XVIII' AS maChuong, N'Triệu chứng, dấu hiệu và kết quả bất thường' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'S00.9' AS maICD, N'Chấn thương nông ở đầu, phần không xác định' AS tenBenh, 'Superficial injury of head, part unspecified' AS tenTiengAnh, 'XIX' AS maChuong, N'Vết thương, ngộ độc và hậu quả khác' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'S06.0' AS maICD, N'Chấn động não (Chấn thương sọ não nhẹ)' AS tenBenh, 'Concussion' AS tenTiengAnh, 'XIX' AS maChuong, N'Vết thương, ngộ độc và hậu quả khác' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'S52.5' AS maICD, N'Gãy đầu dưới xương quay' AS tenBenh, 'Fracture of lower end of radius' AS tenTiengAnh, 'XIX' AS maChuong, N'Vết thương, ngộ độc và hậu quả khác' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'S60.9' AS maICD, N'Chấn thương nông của cổ tay và bàn tay, không xác định' AS tenBenh, 'Superficial injury of wrist and hand, unspecified' AS tenTiengAnh, 'XIX' AS maChuong, N'Vết thương, ngộ độc và hậu quả khác' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'S83.6' AS maICD, N'Bong gân và căng cơ các phần khác và không xác định của khớp gối' AS tenBenh, 'Sprain and strain of other and unspecified parts of knee' AS tenTiengAnh, 'XIX' AS maChuong, N'Vết thương, ngộ độc và hậu quả khác' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'S93.4' AS maICD, N'Bong gân và căng cơ khớp cổ chân (Bong gân mắt cá chân)' AS tenBenh, 'Sprain and strain of ankle' AS tenTiengAnh, 'XIX' AS maChuong, N'Vết thương, ngộ độc và hậu quả khác' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'T14.0' AS maICD, N'Vết thương nông ở vùng cơ thể không xác định (Xây xát da)' AS tenBenh, 'Superficial injury of unspecified body region' AS tenTiengAnh, 'XIX' AS maChuong, N'Vết thương, ngộ độc và hậu quả khác' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'T14.1' AS maICD, N'Vết thương hở ở vùng cơ thể không xác định (Vết rách da chảy máu)' AS tenBenh, 'Open wound of unspecified body region' AS tenTiengAnh, 'XIX' AS maChuong, N'Vết thương, ngộ độc và hậu quả khác' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'T78.4' AS maICD, N'Dị ứng, không xác định' AS tenBenh, 'Allergy, unspecified' AS tenTiengAnh, 'XIX' AS maChuong, N'Vết thương, ngộ độc và hậu quả khác' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'Z00.0' AS maICD, N'Khám kiểm tra sức khỏe tổng quát (Khám sức khỏe định kỳ)' AS tenBenh, 'General medical examination' AS tenTiengAnh, 'XXI' AS maChuong, N'Yếu tố ảnh hưởng đến tình trạng sức khoẻ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'Z01.0' AS maICD, N'Khám mắt và thị lực' AS tenBenh, 'Examination of eyes and vision' AS tenTiengAnh, 'XXI' AS maChuong, N'Yếu tố ảnh hưởng đến tình trạng sức khoẻ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'Z01.1' AS maICD, N'Khám tai và thính lực' AS tenBenh, 'Examination of ears and hearing' AS tenTiengAnh, 'XXI' AS maChuong, N'Yếu tố ảnh hưởng đến tình trạng sức khoẻ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'Z01.2' AS maICD, N'Khám răng' AS tenBenh, 'Dental examination' AS tenTiengAnh, 'XXI' AS maChuong, N'Yếu tố ảnh hưởng đến tình trạng sức khoẻ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'Z02.1' AS maICD, N'Khám sức khỏe trước khi tuyển dụng lao động' AS tenBenh, 'Pre-employment examination' AS tenTiengAnh, 'XXI' AS maChuong, N'Yếu tố ảnh hưởng đến tình trạng sức khoẻ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'Z02.5' AS maICD, N'Khám sức khỏe để cấp giấy phép lái xe' AS tenBenh, 'Examination for participation in sport / driver license' AS tenTiengAnh, 'XXI' AS maChuong, N'Yếu tố ảnh hưởng đến tình trạng sức khoẻ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'Z23' AS maICD, N'Cần tiêm chủng phòng một bệnh đơn thuần do virus (Tiêm chủng vắc xin)' AS tenBenh, 'Need for immunization against single viral diseases' AS tenTiengAnh, 'XXI' AS maChuong, N'Yếu tố ảnh hưởng đến tình trạng sức khoẻ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'Z34.9' AS maICD, N'Giám sát thai nghén bình thường, không xác định (Khám thai định kỳ)' AS tenBenh, 'Supervision of normal pregnancy, unspecified' AS tenTiengAnh, 'XXI' AS maChuong, N'Yếu tố ảnh hưởng đến tình trạng sức khoẻ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);
MERGE dbo.DanhMucICD10 AS target
USING (SELECT 'Z76.0' AS maICD, N'Cấp lại đơn thuốc (Tái kê đơn)' AS tenBenh, 'Issue of repeat prescription' AS tenTiengAnh, 'XXI' AS maChuong, N'Yếu tố ảnh hưởng đến tình trạng sức khoẻ' AS tenChuong, 1 AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, target.tenTiengAnh = source.tenTiengAnh, target.maChuong = source.maChuong, target.tenChuong = source.tenChuong, target.thuongGap = source.thuongGap, target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1);

COMMIT TRANSACTION;
PRINT N'Đã nạp thành công 202 mã bệnh ICD-10 vào CSDL QuanLyBenhVien.';
GO

SELECT COUNT(*) AS TongSoMaICD10 FROM dbo.DanhMucICD10;
GO
