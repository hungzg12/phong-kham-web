/* Truy vấn kiểm tra sau cài đặt. Không thêm/sửa/xóa dữ liệu. */
USE MediCare_HIS;
GO
SELECT DB_NAME() AS CoSoDuLieu,COUNT(*) AS SoBang FROM sys.tables WHERE schema_id=SCHEMA_ID(N'dbo');
SELECT type_desc,COUNT(*) AS SoLuong FROM sys.objects WHERE schema_id=SCHEMA_ID(N'dbo') AND type IN('U','P','V','FN') GROUP BY type_desc;
SELECT maChuyenKhoa,tenChuyenKhoa,maKhoa FROM dbo.ChuyenKhoa ORDER BY maChuyenKhoa;
SELECT maModule,tenModule,laMoPhong FROM dbo.ModuleNghiepVu ORDER BY maModule;
SELECT t.tenDangNhap,t.trangThai,n.hoTen,v.tenVaiTro,g.maKhoa,g.phamVi FROM dbo.TaiKhoan t LEFT JOIN dbo.NhanVien n ON n.maNhanVien=t.maNhanVien LEFT JOIN dbo.TaiKhoanVaiTro g ON g.maTaiKhoan=t.maTaiKhoan LEFT JOIN dbo.VaiTro v ON v.maVaiTro=g.maVaiTro ORDER BY t.tenDangNhap;
-- Tất cả tài khoản mẫu phải khóa; truy vấn dưới đây dự kiến trả 0 dòng.
SELECT maTaiKhoan,tenDangNhap FROM dbo.TaiKhoan WHERE trangThai='HOAT_DONG' AND matKhauHash IS NULL;
-- Các truy vấn sau dự kiến trả 0 dòng khi dữ liệu hợp lệ.
SELECT maHoSoDieuTri,COUNT(*) AS Trung FROM dbo.QuyetToan WHERE hienHanh=1 GROUP BY maHoSoDieuTri HAVING COUNT(*)>1;
SELECT maGiuongBenh,COUNT(*) AS Trung FROM dbo.PhanGiuong WHERE denLucUtc IS NULL GROUP BY maGiuongBenh HAVING COUNT(*)>1;
SELECT maTonKho FROM dbo.TonKho WHERE soLuongTon<0 OR soLuongGiuCho<0 OR soLuongGiuCho>soLuongTon;
SELECT q.maQuyetToan,q.tongChiPhi,SUM(c.thanhTienChot) AS TongChiTiet FROM dbo.QuyetToan q LEFT JOIN dbo.ChiTietQuyetToan c ON c.maQuyetToan=q.maQuyetToan GROUP BY q.maQuyetToan,q.tongChiPhi HAVING q.tongChiPhi<>ISNULL(SUM(c.thanhTienChot),0);
SELECT * FROM dbo.vw_HoSoBanKham ORDER BY ngayKham,soThuTu;
SELECT * FROM dbo.vw_VienPhiTheoHoSo;
SELECT * FROM dbo.vw_TonKhoFEFO ORDER BY maKhoDuoc,hanSuDung;
SELECT * FROM dbo.vw_KetQuaCLSTheoHoSo;
DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS;
GO
