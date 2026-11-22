import { querySql } from '../server/admin-store.mjs';

async function main() {
  console.log('Seeding doctors and duty roster...');
  const sql = `
  -- 1. Upsert full 6 doctors for 6 rooms
  IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE maNhanVien = 'NV-BS01')
    INSERT INTO dbo.NhanVien (maNhanVien, hoTen, maKhoa, chucDanh, chuyenMon, dangLamViec) VALUES ('NV-BS01', N'BS.CKI Trần Minh Anh', 'NOI', N'Bác sĩ CKI', 'BAC_SI', 1);
  ELSE
    UPDATE dbo.NhanVien SET hoTen = N'BS.CKI Trần Minh Anh', maKhoa = 'NOI', chucDanh = N'Bác sĩ CKI' WHERE maNhanVien = 'NV-BS01';

  IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE maNhanVien = 'NV-BS02')
    INSERT INTO dbo.NhanVien (maNhanVien, hoTen, maKhoa, chucDanh, chuyenMon, dangLamViec) VALUES ('NV-BS02', N'ThS.BS Nguyễn Văn An', 'TIM', N'ThS. Bác sĩ', 'BAC_SI', 1);
  ELSE
    UPDATE dbo.NhanVien SET hoTen = N'ThS.BS Nguyễn Văn An', maKhoa = 'TIM', chucDanh = N'ThS. Bác sĩ' WHERE maNhanVien = 'NV-BS02';

  IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE maNhanVien = 'NV-BS03')
    INSERT INTO dbo.NhanVien (maNhanVien, hoTen, maKhoa, chucDanh, chuyenMon, dangLamViec) VALUES ('NV-BS03', N'BS.CKII Lê Thị Mai', 'TMH', N'Bác sĩ CKII', 'BAC_SI', 1);
  ELSE
    UPDATE dbo.NhanVien SET hoTen = N'BS.CKII Lê Thị Mai', maKhoa = 'TMH', chucDanh = N'Bác sĩ CKII' WHERE maNhanVien = 'NV-BS03';

  IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE maNhanVien = 'NV-BS04')
    INSERT INTO dbo.NhanVien (maNhanVien, hoTen, maKhoa, chucDanh, chuyenMon, dangLamViec) VALUES ('NV-BS04', N'BS Đỗ Hoàng Long', 'DA', N'Bác sĩ Da liễu & Thẩm mỹ', 'BAC_SI', 1);
  ELSE
    UPDATE dbo.NhanVien SET hoTen = N'BS Đỗ Hoàng Long', maKhoa = 'DA', chucDanh = N'Bác sĩ Da liễu & Thẩm mỹ' WHERE maNhanVien = 'NV-BS04';

  IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE maNhanVien = 'NV-BS05')
    INSERT INTO dbo.NhanVien (maNhanVien, hoTen, maKhoa, chucDanh, chuyenMon, dangLamViec) VALUES ('NV-BS05', N'BS.CKI Phạm Quỳnh Hoa', 'SAN', N'Bác sĩ CKI Sản phụ khoa', 'BAC_SI', 1);
  ELSE
    UPDATE dbo.NhanVien SET hoTen = N'BS.CKI Phạm Quỳnh Hoa', maKhoa = 'SAN', chucDanh = N'Bác sĩ CKI Sản phụ khoa' WHERE maNhanVien = 'NV-BS05';

  IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE maNhanVien = 'NV-BS06')
    INSERT INTO dbo.NhanVien (maNhanVien, hoTen, maKhoa, chucDanh, chuyenMon, dangLamViec) VALUES ('NV-BS06', N'ThS.BS Đặng Quốc Tuấn', 'CXK', N'ThS. Bác sĩ Cơ xương khớp', 'BAC_SI', 1);
  ELSE
    UPDATE dbo.NhanVien SET hoTen = N'ThS.BS Đặng Quốc Tuấn', maKhoa = 'CXK', chucDanh = N'ThS. Bác sĩ Cơ xương khớp' WHERE maNhanVien = 'NV-BS06';

  -- 2. Seed dbo.PhanCongKham for all rooms
  DECLARE @today DATE = CAST(SYSDATETIME() AS DATE);
  DECLARE @d INT = -60;
  WHILE @d <= 60
  BEGIN
    DECLARE @curDate DATE = DATEADD(DAY, @d, @today);
    
    -- PK-NOI
    IF NOT EXISTS (SELECT 1 FROM dbo.PhanCongKham WHERE maBuong = 'PK-NOI' AND ngayKham = @curDate AND caKham = 'SANG')
      INSERT INTO dbo.PhanCongKham (maPhanCong, maBuong, maBacSi, ngayKham, caKham, trangThai, ghiChu)
      VALUES ('PC_NOI_S_' + CONVERT(VARCHAR(10), @curDate, 112), 'PK-NOI', 'NV-BS01', @curDate, 'SANG', 'DANG_TRUC', N'Trực sáng Nội tổng quát');
    IF NOT EXISTS (SELECT 1 FROM dbo.PhanCongKham WHERE maBuong = 'PK-NOI' AND ngayKham = @curDate AND caKham = 'CHIEU')
      INSERT INTO dbo.PhanCongKham (maPhanCong, maBuong, maBacSi, ngayKham, caKham, trangThai, ghiChu)
      VALUES ('PC_NOI_C_' + CONVERT(VARCHAR(10), @curDate, 112), 'PK-NOI', 'NV-BS01', @curDate, 'CHIEU', 'DANG_TRUC', N'Trực chiều Nội tổng quát');

    -- PK-TIM
    IF NOT EXISTS (SELECT 1 FROM dbo.PhanCongKham WHERE maBuong = 'PK-TIM' AND ngayKham = @curDate AND caKham = 'SANG')
      INSERT INTO dbo.PhanCongKham (maPhanCong, maBuong, maBacSi, ngayKham, caKham, trangThai, ghiChu)
      VALUES ('PC_TIM_S_' + CONVERT(VARCHAR(10), @curDate, 112), 'PK-TIM', 'NV-BS02', @curDate, 'SANG', 'DANG_TRUC', N'Trực sáng Tim mạch');
    IF NOT EXISTS (SELECT 1 FROM dbo.PhanCongKham WHERE maBuong = 'PK-TIM' AND ngayKham = @curDate AND caKham = 'CHIEU')
      INSERT INTO dbo.PhanCongKham (maPhanCong, maBuong, maBacSi, ngayKham, caKham, trangThai, ghiChu)
      VALUES ('PC_TIM_C_' + CONVERT(VARCHAR(10), @curDate, 112), 'PK-TIM', 'NV-BS02', @curDate, 'CHIEU', 'DANG_TRUC', N'Trực chiều Tim mạch');

    -- PK-TMH
    IF NOT EXISTS (SELECT 1 FROM dbo.PhanCongKham WHERE maBuong = 'PK-TMH' AND ngayKham = @curDate AND caKham = 'SANG')
      INSERT INTO dbo.PhanCongKham (maPhanCong, maBuong, maBacSi, ngayKham, caKham, trangThai, ghiChu)
      VALUES ('PC_TMH_S_' + CONVERT(VARCHAR(10), @curDate, 112), 'PK-TMH', 'NV-BS03', @curDate, 'SANG', 'DANG_TRUC', N'Trực sáng Tai Mũi Họng');
    IF NOT EXISTS (SELECT 1 FROM dbo.PhanCongKham WHERE maBuong = 'PK-TMH' AND ngayKham = @curDate AND caKham = 'CHIEU')
      INSERT INTO dbo.PhanCongKham (maPhanCong, maBuong, maBacSi, ngayKham, caKham, trangThai, ghiChu)
      VALUES ('PC_TMH_C_' + CONVERT(VARCHAR(10), @curDate, 112), 'PK-TMH', 'NV-BS03', @curDate, 'CHIEU', 'DANG_TRUC', N'Trực chiều Tai Mũi Họng');

    -- PK-DA
    IF NOT EXISTS (SELECT 1 FROM dbo.PhanCongKham WHERE maBuong = 'PK-DA' AND ngayKham = @curDate AND caKham = 'SANG')
      INSERT INTO dbo.PhanCongKham (maPhanCong, maBuong, maBacSi, ngayKham, caKham, trangThai, ghiChu)
      VALUES ('PC_DA_S_' + CONVERT(VARCHAR(10), @curDate, 112), 'PK-DA', 'NV-BS04', @curDate, 'SANG', 'DANG_TRUC', N'Trực sáng Da liễu');
    IF NOT EXISTS (SELECT 1 FROM dbo.PhanCongKham WHERE maBuong = 'PK-DA' AND ngayKham = @curDate AND caKham = 'CHIEU')
      INSERT INTO dbo.PhanCongKham (maPhanCong, maBuong, maBacSi, ngayKham, caKham, trangThai, ghiChu)
      VALUES ('PC_DA_C_' + CONVERT(VARCHAR(10), @curDate, 112), 'PK-DA', 'NV-BS04', @curDate, 'CHIEU', 'DANG_TRUC', N'Trực chiều Da liễu');

    -- PK-SAN
    IF NOT EXISTS (SELECT 1 FROM dbo.PhanCongKham WHERE maBuong = 'PK-SAN' AND ngayKham = @curDate AND caKham = 'SANG')
      INSERT INTO dbo.PhanCongKham (maPhanCong, maBuong, maBacSi, ngayKham, caKham, trangThai, ghiChu)
      VALUES ('PC_SAN_S_' + CONVERT(VARCHAR(10), @curDate, 112), 'PK-SAN', 'NV-BS05', @curDate, 'SANG', 'DANG_TRUC', N'Trực sáng Sản phụ khoa');
    IF NOT EXISTS (SELECT 1 FROM dbo.PhanCongKham WHERE maBuong = 'PK-SAN' AND ngayKham = @curDate AND caKham = 'CHIEU')
      INSERT INTO dbo.PhanCongKham (maPhanCong, maBuong, maBacSi, ngayKham, caKham, trangThai, ghiChu)
      VALUES ('PC_SAN_C_' + CONVERT(VARCHAR(10), @curDate, 112), 'PK-SAN', 'NV-BS05', @curDate, 'CHIEU', 'DANG_TRUC', N'Trực chiều Sản phụ khoa');

    -- PK-CXK
    IF NOT EXISTS (SELECT 1 FROM dbo.PhanCongKham WHERE maBuong = 'PK-CXK' AND ngayKham = @curDate AND caKham = 'SANG')
      INSERT INTO dbo.PhanCongKham (maPhanCong, maBuong, maBacSi, ngayKham, caKham, trangThai, ghiChu)
      VALUES ('PC_CXK_S_' + CONVERT(VARCHAR(10), @curDate, 112), 'PK-CXK', 'NV-BS06', @curDate, 'SANG', 'DANG_TRUC', N'Trực sáng Cơ xương khớp');
    IF NOT EXISTS (SELECT 1 FROM dbo.PhanCongKham WHERE maBuong = 'PK-CXK' AND ngayKham = @curDate AND caKham = 'CHIEU')
      INSERT INTO dbo.PhanCongKham (maPhanCong, maBuong, maBacSi, ngayKham, caKham, trangThai, ghiChu)
      VALUES ('PC_CXK_C_' + CONVERT(VARCHAR(10), @curDate, 112), 'PK-CXK', 'NV-BS06', @curDate, 'CHIEU', 'DANG_TRUC', N'Trực chiều Cơ xương khớp');

    SET @d = @d + 1;
  END;
  `;

  await querySql(sql);
  const count = await querySql('SELECT COUNT(*) AS total FROM dbo.PhanCongKham');
  console.log('✓ Successfully seeded! Total rows in dbo.PhanCongKham:', count);
}

main().catch(err => {
  console.error('Error seeding:', err);
  process.exit(1);
});
