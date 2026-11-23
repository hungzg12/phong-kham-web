import { querySql } from '../server/admin-store.mjs';

export async function migratePaperFormsSchema() {
  const sql = `
  SET XACT_ABORT ON;
  BEGIN TRANSACTION;

  -- 1. Bảng Giấy Chuyển Tuyến (Mẫu số 06 - NĐ 75/2023/NĐ-CP & TT 01/2025/TT-BYT)
  IF OBJECT_ID('dbo.GiayChuyenTuyen', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.GiayChuyenTuyen (
      maGiayChuyenTuyen varchar(20) NOT NULL PRIMARY KEY,
      soVaoSo varchar(50) NOT NULL DEFAULT '01/2026/GCT',
      maBenhNhan varchar(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
      maLuotKham varchar(20) NULL REFERENCES dbo.LuotKham(maLuotKham),
      maDotDieuTri varchar(20) NULL REFERENCES dbo.DotDieuTri(maDotDieuTri),
      coSoTiepNhan nvarchar(255) NOT NULL,
      maCSKCBTiepNhan varchar(20) NULL DEFAULT '79-015',
      tuyenTiepNhan nvarchar(50) NOT NULL DEFAULT N'Tuyến trên (Tuyến tỉnh/thành phố)',
      thoiGianChuyen datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
      lyDoChuyen nvarchar(255) NOT NULL DEFAULT N'Vượt quá khả năng điều trị của cơ sở KCB',
      tomTatBenhSu nvarchar(max) NULL,
      tomTatCLS nvarchar(max) NULL,
      chanDoanChuyen nvarchar(500) NOT NULL,
      maICDChuyen varchar(20) NULL DEFAULT 'I20.0',
      phuongPhapDieuTri nvarchar(max) NULL,
      tinhTrangNguoiBenh nvarchar(500) NULL DEFAULT N'Người bệnh tỉnh táo, tiếp xúc tốt, dấu hiệu sinh tồn ổn định',
      huongDieuTriTiep nvarchar(500) NULL DEFAULT N'Tiếp tục can thiệp chuyên sâu theo phác đồ tuyến trên',
      phuongTienVanChuyen nvarchar(100) NOT NULL DEFAULT N'Xe cứu thương chuyển viện chuyên dụng',
      nguoiHoTong nvarchar(200) NULL DEFAULT N'BS.CKI Trần Minh Anh - Bác sĩ hồi sức',
      maBacSiDieuTri varchar(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
      maThuTruong varchar(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
      trangThai nvarchar(30) NOT NULL DEFAULT N'Đã phê duyệt',
      ngayTao datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
  END;

  -- 2. Bảng Giấy Ra Viện (Phụ lục 3 - TT 18/2022/TT-BYT sửa đổi TT 56/2017/TT-BYT)
  IF OBJECT_ID('dbo.GiayRaVien', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.GiayRaVien (
      maGiayRaVien varchar(20) NOT NULL PRIMARY KEY,
      soLuuTru varchar(50) NOT NULL DEFAULT 'RV-2026/001',
      maBenhNhan varchar(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
      maDotDieuTri varchar(20) NULL REFERENCES dbo.DotDieuTri(maDotDieuTri),
      maKhoaRaVien varchar(20) NULL,
      ngayVaoVien datetime2 NOT NULL DEFAULT DATEADD(day, -5, SYSUTCDATETIME()),
      ngayRaVien datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
      chanDoanVaoVien nvarchar(500) NULL,
      chanDoanRaVien nvarchar(500) NOT NULL,
      maICDRaVien varchar(20) NULL DEFAULT 'K29.0',
      phuongPhapDieuTri nvarchar(max) NULL DEFAULT N'Nội khoa kết hợp chế độ dinh dưỡng, PPI liều chuẩn',
      ketQuaDieuTri nvarchar(50) NOT NULL DEFAULT N'Đỡ / giảm',
      soNgayNghiBHXH int NOT NULL DEFAULT 7,
      tuNgayNghi date NULL,
      denNgayNghi date NULL,
      loiDanBacSi nvarchar(500) NULL DEFAULT N'Dùng thuốc theo đơn, tái khám sau 7 ngày hoặc khi có dấu hiệu bất thường',
      maBacSiDieuTri varchar(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
      maThuTruong varchar(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
      trangThai nvarchar(30) NOT NULL DEFAULT N'Đã hoàn tất',
      ngayTao datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
  END;

  -- 3. Cập nhật Bảng BienBanHoiChan (nếu thiếu cột thanhVienThamGia, maLuotKham)
  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.BienBanHoiChan') AND name = 'thanhVienThamGia')
  BEGIN
    ALTER TABLE dbo.BienBanHoiChan ADD thanhVienThamGia nvarchar(500) NULL;
  END;
  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.BienBanHoiChan') AND name = 'maLuotKham')
  BEGIN
    ALTER TABLE dbo.BienBanHoiChan ADD maLuotKham varchar(20) NULL;
  END;

  -- 4. Bảng Bản Tóm Tắt Hồ Sơ Bệnh Án (Phụ lục 4 - TT 18/2022/TT-BYT)
  IF OBJECT_ID('dbo.TomTatBenhAn', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.TomTatBenhAn (
      maTomTat varchar(20) NOT NULL PRIMARY KEY,
      maBenhNhan varchar(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
      maLuotKham varchar(20) NULL REFERENCES dbo.LuotKham(maLuotKham),
      maDotDieuTri varchar(20) NULL REFERENCES dbo.DotDieuTri(maDotDieuTri),
      quaTrinhBenhLy nvarchar(max) NULL DEFAULT N'Bệnh nhân xuất hiện triệu chứng đau tức thượng vị, ợ hơi, ợ chua kéo dài 2 tuần. Đã được khám và làm các xét nghiệm cận lâm sàng.',
      tomTatCLS nvarchar(max) NULL DEFAULT N'Nội soi thực quản - dạ dày: Niêm mạc hang vị phù nề, xung huyết rải rác. Test HP âm tính. Sinh hóa máu các chỉ số trong giới hạn bình thường.',
      chanDoan nvarchar(500) NOT NULL DEFAULT N'K29.0 - Viêm dạ dày cấp tính',
      maICD varchar(20) NULL DEFAULT 'K29.0',
      phuongPhapDieuTri nvarchar(max) NULL DEFAULT N'Điều trị nội khoa ngoại trú: Giảm tiết acid dạ dày (Esomeprazole 40mg), bảo vệ niêm mạc dạ dày.',
      tinhTrangRaVien nvarchar(500) NULL DEFAULT N'Bệnh nhân giảm đau thượng vị nhiều, không còn ợ chua, sinh hiệu ổn định, xuất viện điều trị ngoại trú.',
      ghiChuLoiDan nvarchar(500) NULL DEFAULT N'Ăn đúng giờ, tránh thức ăn cay nóng chua, không uống rượu bia thuốc lá. Tái khám sau 14 ngày.',
      maBacSi varchar(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
      maGiamDoc varchar(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
      trangThai nvarchar(30) NOT NULL DEFAULT N'Đã hoàn tất',
      ngayTao datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
  END;

  -- 5. Bảng Giấy Hẹn Khám Lại (Mẫu số 05 - Nghị định 75/2023/NĐ-CP & TT 01/2025/TT-BYT)
  IF OBJECT_ID('dbo.GiayHenKhamLai', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.GiayHenKhamLai (
      maGiayHen varchar(20) NOT NULL PRIMARY KEY,
      soVaoSo varchar(50) NOT NULL DEFAULT '01/2026/GHKL',
      maBenhNhan varchar(20) NOT NULL REFERENCES dbo.BenhNhan(maBenhNhan),
      maLuotKham varchar(20) NULL REFERENCES dbo.LuotKham(maLuotKham),
      maDotDieuTri varchar(20) NULL REFERENCES dbo.DotDieuTri(maDotDieuTri),
      ngayHenKham date NOT NULL,
      gioHenKham varchar(20) NULL DEFAULT '08:30',
      khoaPhongHen nvarchar(100) NOT NULL DEFAULT N'Phòng khám Nội tổng quát - Bệnh viện Đa khoa Medicare',
      lyDoHenKham nvarchar(500) NOT NULL DEFAULT N'Tái khám đánh giá đáp ứng phác đồ điều trị và xét nghiệm kiểm tra',
      chanDoanHienTai nvarchar(500) NOT NULL,
      maICD varchar(20) NULL DEFAULT 'I10',
      chiDinhCanLam nvarchar(500) NULL DEFAULT N'Xét nghiệm công thức máu, đường huyết đói, đo điện tâm đồ',
      loiDanBacSi nvarchar(500) NULL DEFAULT N'Nhịn ăn sáng trước khi lấy máu làm xét nghiệm. Mang theo đơn thuốc cũ và giấy hẹn.',
      maBacSiHen varchar(20) NULL REFERENCES dbo.NhanVien(maNhanVien),
      trangThai nvarchar(30) NOT NULL DEFAULT N'Đang có hiệu lực',
      ngayTao datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
  END;

  COMMIT TRANSACTION;
  SELECT 'MIGRATION_OK' AS result;
  `;

  return await querySql(sql);
}

// If executed directly
if (process.argv[1]?.endsWith('migrate-paper-forms.mjs')) {
  migratePaperFormsSchema()
    .then(r => console.log('Migration Result:', r))
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
