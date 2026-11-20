SET NOCOUNT ON;

PRINT '=== CHECK VIEW 1: vw_QuanLyLoThuoc_ChiTiet ===';
SELECT COUNT(*) AS TotalBatches, 
       SUM(CASE WHEN trangThaiHanDung = N'ĐÃ HẾT HẠN' THEN 1 ELSE 0 END) AS ExpiredBatches,
       SUM(CASE WHEN trangThaiHanDung LIKE N'CẬN DATE%' THEN 1 ELSE 0 END) AS NearExpiryBatches,
       SUM(soLuongTon) AS TotalStockUnits
FROM dbo.vw_QuanLyLoThuoc_ChiTiet;

PRINT '=== CHECK VIEW 2: vw_ThongKeThuoc_TheoHangSanXuat ===';
SELECT hangSanXuat, nuocSanXuat, tongSoLoHang, tongSoLuongTonKho, tongGiaTriTonKho
FROM dbo.vw_ThongKeThuoc_TheoHangSanXuat;

PRINT '=== CHECK VIEW 3: vw_TongHopLoThuoc_ToanVien ===';
SELECT TOP (5) maLoHang, tenHang, tongSoLuongTon, soKhoDangLuuTru, trangThaiHanDung
FROM dbo.vw_TongHopLoThuoc_ToanVien;

PRINT '=== CHECK VIEW 4: vw_ChiTietLoHangNhap_TheoTungLoaiThuoc ===';
SELECT TOP (5) maLoHang, tenHang, nhaCungCap, hanSuDung, trangThaiHanDung
FROM dbo.vw_ChiTietLoHangNhap_TheoTungLoaiThuoc;

PRINT '=== CHECK TABLE: dbo.LichHen & dbo.BenhNhan ===';
SELECT h.maHen, b.hoTen, k.tenKhoa, r.tenBuong, h.ngayHen, h.trangThai
FROM dbo.LichHen h
JOIN dbo.BenhNhan b ON h.maBenhNhan = b.maBenhNhan
JOIN dbo.Khoa k ON h.maKhoa = k.maKhoa
JOIN dbo.BuongKham r ON h.maBuong = r.maBuong;
