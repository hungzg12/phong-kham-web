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
