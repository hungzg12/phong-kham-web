import { querySql } from '../server/admin-store.mjs';

async function seedCleanData() {
  console.log('--- STARTING CLINICAL DATA SEEDING INTO SQL SERVER (QuanLyBenhVien) ---');

  // Step 1: Clean old test records
  const cleanSql = `
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @bad TABLE (maBenhNhan varchar(50));
    INSERT INTO @bad
    SELECT maBenhNhan FROM dbo.BenhNhan
    WHERE hoTen LIKE '%TEST%' OR maBenhNhan LIKE '%TEST%' OR maBenhNhan IN ('BN-173C85AA04BA49F3', 'BN-A0E1F7437CA04DF3', 'BN-AB77DDC545FE4F6C');

    DECLARE @badLK TABLE (maLuotKham varchar(50));
    INSERT INTO @badLK
    SELECT maLuotKham FROM dbo.LuotKham WHERE maBenhNhan IN (SELECT maBenhNhan FROM @bad);

    -- 1. Pharmacy details referencing prescription details
    DELETE FROM dbo.SoKho WHERE maChiTietKho IN (
      SELECT maChiTietKho FROM dbo.ChiTietPhieuKho WHERE maChiTietDonNguon IN (
        SELECT maChiTietDon FROM dbo.ChiTietDonThuoc WHERE maDon IN (
          SELECT maDon FROM dbo.DonThuoc WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK)
        )
      ) OR maPhieu IN (SELECT maPhieu FROM dbo.PhieuKho WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK))
    );
    DELETE FROM dbo.ChiTietPhieuKho WHERE maChiTietDonNguon IN (
      SELECT maChiTietDon FROM dbo.ChiTietDonThuoc WHERE maDon IN (
        SELECT maDon FROM dbo.DonThuoc WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK)
      )
    ) OR maPhieu IN (SELECT maPhieu FROM dbo.PhieuKho WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK));
    DELETE FROM dbo.YLenh WHERE maChiTietDonNguon IN (
      SELECT maChiTietDon FROM dbo.ChiTietDonThuoc WHERE maDon IN (
        SELECT maDon FROM dbo.DonThuoc WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK)
      )
    );
    DELETE FROM dbo.ChiTietDonThuoc WHERE maDon IN (
      SELECT maDon FROM dbo.DonThuoc WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK)
    );
    DELETE FROM dbo.DonThuoc WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK);

    -- 2. Settlements & Payments
    DELETE FROM dbo.ChiTietQuyetToan WHERE maLuotKhamNguon IN (SELECT maLuotKham FROM @badLK);
    DELETE FROM dbo.ChiTietQuyetToan WHERE maChiTietCLS IN (
      SELECT ct.maChiTiet FROM dbo.ChiTietChiDinh ct
      JOIN dbo.ChiDinhCLS cd ON cd.maChiDinh = ct.maChiDinh
      WHERE cd.maLuotKham IN (SELECT maLuotKham FROM @badLK)
    );
    DELETE FROM dbo.QuyetToan WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK);
    DELETE FROM dbo.GiaoDichThanhToan WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK) OR maBenhNhan IN (SELECT maBenhNhan FROM @bad);

    -- 3. Diagnostic tests and orders
    DELETE FROM dbo.ChiSoXetNghiem WHERE maKetQua IN (
      SELECT maKetQua FROM dbo.KetQuaCLS WHERE maChiTiet IN (
        SELECT ct.maChiTiet FROM dbo.ChiTietChiDinh ct
        JOIN dbo.ChiDinhCLS cd ON cd.maChiDinh = ct.maChiDinh
        WHERE cd.maLuotKham IN (SELECT maLuotKham FROM @badLK)
      )
    );
    DELETE FROM dbo.KetQuaMoTa WHERE maKetQua IN (
      SELECT maKetQua FROM dbo.KetQuaCLS WHERE maChiTiet IN (
        SELECT ct.maChiTiet FROM dbo.ChiTietChiDinh ct
        JOIN dbo.ChiDinhCLS cd ON cd.maChiDinh = ct.maChiDinh
        WHERE cd.maLuotKham IN (SELECT maLuotKham FROM @badLK)
      )
    );
    DELETE FROM dbo.KetQuaXetNghiem WHERE maKetQua IN (
      SELECT maKetQua FROM dbo.KetQuaCLS WHERE maChiTiet IN (
        SELECT ct.maChiTiet FROM dbo.ChiTietChiDinh ct
        JOIN dbo.ChiDinhCLS cd ON cd.maChiDinh = ct.maChiDinh
        WHERE cd.maLuotKham IN (SELECT maLuotKham FROM @badLK)
      )
    );
    DELETE FROM dbo.KetQuaCLS WHERE maChiTiet IN (
      SELECT ct.maChiTiet FROM dbo.ChiTietChiDinh ct
      JOIN dbo.ChiDinhCLS cd ON cd.maChiDinh = ct.maChiDinh
      WHERE cd.maLuotKham IN (SELECT maLuotKham FROM @badLK)
    );
    DELETE FROM dbo.ChiTietChiDinh WHERE maChiDinh IN (
      SELECT maChiDinh FROM dbo.ChiDinhCLS WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK)
    );
    DELETE FROM dbo.ChiDinhCLS WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK);

    -- 4. Visits, vitals, exams, appointments
    DELETE FROM dbo.PhieuKho WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK);
    DELETE FROM dbo.BenhAnDienTu WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK) OR maBenhNhan IN (SELECT maBenhNhan FROM @bad);
    DELETE FROM dbo.DotDieuTri WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK) OR maBenhNhan IN (SELECT maBenhNhan FROM @bad);
    DELETE FROM dbo.LichHen WHERE maBenhNhan IN (SELECT maBenhNhan FROM @bad);
    DELETE FROM dbo.TaiKhoan WHERE maBenhNhan IN (SELECT maBenhNhan FROM @bad);
    DELETE FROM dbo.UyQuyenHoSo WHERE maBenhNhanChu IN (SELECT maBenhNhan FROM @bad);

    DELETE FROM dbo.PhieuSinhHieu WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK);
    DELETE FROM dbo.HoSoKham WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK);
    DELETE FROM dbo.LuotKham WHERE maLuotKham IN (SELECT maLuotKham FROM @badLK);
    DELETE FROM dbo.BenhNhan WHERE maBenhNhan IN (SELECT maBenhNhan FROM @bad);

    COMMIT;
  `;
  await querySql(cleanSql);
  console.log('✓ Cleaned up test patients and orphan records');

  // Step 2: Upsert 10 Realistic Vietnamese Patients
  const patientsSql = `
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @now datetime2 = SYSDATETIME();

    MERGE dbo.BenhNhan AS target
    USING (VALUES
      ('BN-240101-001', N'Lê Thị Thu Hương', '1974-05-12', N'Nữ', '0903123456', '079174001234', 'HT2790123456789', N'124 Nguyễn Trãi, Phường 3, Quận 5, TP. Hồ Chí Minh', N'Tăng huyết áp vô căn 5 năm', N'Penicillin', 'CO_DI_UNG'),
      ('BN-240101-002', N'Nguyễn Văn Minh', '1962-08-20', N'Nam', '0918765432', '079062005678', 'GD4790987654321', N'45 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', N'Đái tháo đường type 2 (8 năm), Rối loạn lipid máu', N'Không', 'KHONG_GHI_NHAN'),
      ('BN-240101-003', N'Trần Thị Mai Lan', '1988-11-04', N'Nữ', '0933221144', '079188009876', 'DN4790123456789', N'78 Hoàng Hoa Thám, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh', N'Viêm loét dạ dày - tá tràng mạn tính', N'Aspirin, NSAIDs', 'CO_DI_UNG'),
      ('BN-240101-004', N'Phạm Quốc Hưng', '1995-03-15', N'Nam', '0945678901', '079195004321', 'GD4790554433221', N'12 Phan Xích Long, Phường 2, Quận Phú Nhuận, TP. Hồ Chí Minh', N'Khỏe mạnh', N'Không', 'KHONG_GHI_NHAN'),
      ('BN-240101-005', N'Hoàng Thị Kim Oanh', '1955-12-30', N'Nữ', '0978112233', '079155008765', 'CC1790112233445', N'56 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh', N'Tăng huyết áp giai đoạn 2, Thiếu máu cơ tim mạn', N'Paracetamol', 'CO_DI_UNG'),
      ('BN-240101-006', N'Đỗ Tuấn Anh', '2012-06-18', N'Nam', '0908889900', '079212003456', 'TE1790667788990', N'89 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP. Hồ Chí Minh', N'Hen phế quản', N'Không', 'KHONG_GHI_NHAN'),
      ('BN-240101-007', N'Vũ Thanh Huyền', '1990-09-25', N'Nữ', '0912334455', '079190007890', 'DN4790778899112', N'34 CMT8, Phường 6, Quận 3, TP. Hồ Chí Minh', N'Đau nửa đầu Migraine', N'Không', 'KHONG_GHI_NHAN'),
      ('BN-240101-008', N'Đinh Trọng Nghĩa', '1978-02-14', N'Nam', '0989112244', '079078002345', NULL, N'15 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', N'Gút mạn tính', N'Không', 'KHONG_GHI_NHAN'),
      ('BN-240101-009', N'Bùi Ngọc Bích', '2001-07-08', N'Nữ', '0938556677', '079201009988', 'SV4790123456789', N'202 Lý Thường Kiệt, Phường 14, Quận 10, TP. Hồ Chí Minh', N'Viêm da cơ địa dị ứng', N'Hải sản', 'CO_DI_UNG'),
      ('BN-240101-010', N'Trịnh Đình Khang', '1983-10-10', N'Nam', '0909445566', '079083006655', 'DN4790334455667', N'67 Xô Viết Nghệ Tĩnh, Phường 21, Quận Bình Thạnh, TP. Hồ Chí Minh', N'Sỏi thận phải kích thước nhỏ', N'Không', 'KHONG_GHI_NHAN')
    ) AS source (maBenhNhan, hoTen, ngaySinh, gioiTinh, soDienThoai, soDinhDanh, soBHYT, diaChi, tienSuBenh, diUngThuoc, trangThaiDiUng)
    ON target.maBenhNhan = source.maBenhNhan
    WHEN MATCHED THEN
      UPDATE SET hoTen = source.hoTen, ngaySinh = source.ngaySinh, gioiTinh = source.gioiTinh, soDienThoai = source.soDienThoai, soDinhDanh = source.soDinhDanh, soBHYT = source.soBHYT, diaChi = source.diaChi, tienSuBenh = source.tienSuBenh, diUngThuoc = source.diUngThuoc, trangThaiDiUng = source.trangThaiDiUng
    WHEN NOT MATCHED THEN
      INSERT (maBenhNhan, hoTen, ngaySinh, gioiTinh, soDienThoai, soDinhDanh, soBHYT, diaChi, tienSuBenh, diUngThuoc, trangThaiDiUng, ngayTiepNhanDauTien)
      VALUES (source.maBenhNhan, source.hoTen, source.ngaySinh, source.gioiTinh, source.soDienThoai, source.soDinhDanh, source.soBHYT, source.diaChi, source.tienSuBenh, source.diUngThuoc, source.trangThaiDiUng, @now);

    COMMIT;
  `;
  await querySql(patientsSql);
  console.log('✓ Upserted 10 real Vietnamese patients into dbo.BenhNhan');

  // Step 3: Upsert Active Visits (LuotKham) for Today
  const visitsSql = `
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @today date = CAST(GETDATE() AS date);
    DECLARE @now datetime2 = SYSDATETIME();

    MERGE dbo.LuotKham AS target
    USING (VALUES
      ('LK-261122-001', 'BN-240101-001', 'PK-NOI', 1, N'Sốt cao 3 ngày, ho đờm vàng đục, tức ngực phải khi thở sâu', 'CHO_KET_QUA_CLS', DATEADD(minute, -90, @now)),
      ('LK-261122-002', 'BN-240101-002', 'PK-NOI', 2, N'Tái khám định kỳ Đái tháo đường, khát nhiều, mệt mỏi', 'DANG_KHAM', DATEADD(minute, -70, @now)),
      ('LK-261122-003', 'BN-240101-003', 'PK-NOI', 3, N'Đau rát vùng thượng vị sau ăn, ợ hơi, đầy chướng bụng', 'CHO_KHAM', DATEADD(minute, -50, @now)),
      ('LK-261122-004', 'BN-240101-004', 'PK-TIM', 1, N'Hồi hộp, đánh trống ngực, đau nhói ngực trái khi vận động', 'CHO_KET_QUA_CLS', DATEADD(minute, -40, @now)),
      ('LK-261122-005', 'BN-240101-006', 'PK-TMH', 1, N'Đau họng, nuốt rát, sốt nhẹ 38°C, ngạt mũi', 'CHO_KHAM', DATEADD(minute, -30, @now)),
      ('LK-261122-006', 'BN-240101-007', 'PK-NOI', 4, N'Khám sức khỏe tổng quát định kỳ', 'CHO_KHAM', DATEADD(minute, -20, @now)),
      ('LK-261122-007', 'BN-240101-008', 'PK-CXK', 1, N'Đau sưng nóng đỏ khớp ngón chân cái bên phải', 'CHO_KHAM', DATEADD(minute, -10, @now))
    ) AS source (maLuotKham, maBenhNhan, maBuong, soThuTu, lyDoKham, trangThai, thoiDiemDangKy)
    ON target.maLuotKham = source.maLuotKham
    WHEN MATCHED THEN
      UPDATE SET maBuong = source.maBuong, soThuTu = source.soThuTu, lyDoKham = source.lyDoKham, trangThai = source.trangThai
    WHEN NOT MATCHED THEN
      INSERT (maLuotKham, maBenhNhan, maBuong, soThuTu, lyDoKham, trangThai, thoiDiemDangKy, thoiDiemCapSo)
      VALUES (source.maLuotKham, source.maBenhNhan, source.maBuong, source.soThuTu, source.lyDoKham, source.trangThai, source.thoiDiemDangKy, source.thoiDiemDangKy);

    COMMIT;
  `;
  await querySql(visitsSql);
  console.log('✓ Upserted 7 realistic clinical visits into dbo.LuotKham');

  // Step 4: Upsert Clinical Notes (HoSoKham) with Real ICD-10
  const examSql = `
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @now datetime2 = SYSDATETIME();

    MERGE dbo.HoSoKham AS target
    USING (VALUES
      ('HSK-261122-001', 'LK-261122-001', 'NV-BS01',
       N'Bệnh khởi phát 3 ngày trước với sốt rét run từng cơn, nhiệt độ cao nhất 39°C. Kèm ho nhiều, đờm đặc màu vàng rỉ sắt, đau tức ngực phải tăng khi ho.',
       N'Tăng huyết áp 5 năm, duy trì Amlodipine 5mg/ngày. Dị ứng Penicillin.',
       N'Gia đình không ai mắc bệnh phổi mạn tính hay lao.',
       N'Bệnh nhân tỉnh, tiếp xúc tốt, môi khô, lưỡi bẩn. Da niêm hồng nhạt, không phù. Tuyến giáp không to, hạch ngoại vi không sờ chạm.',
       N'Lồng ngực cân đối, rung thanh tăng đáy phổi phải, gõ đục đáy phổi phải, nghe ran ẩm nhỏ hạt đáy phổi phải. Tim đều, T1 T2 rõ, không âm bệnh lý.',
       N'Theo dõi Viêm phổi thùy phải', 'J18.9',
       N'Viêm phổi thùy cấp đáy phổi phải / Tăng huyết áp độ 1', 'J18.9',
       N'Chỉ định X-quang phổi thẳng, Tổng phân tích tế bào máu ngoại vi, Glucose máu. Kháng sinh nhóm Quinolone hoặc Macrolide (tránh nhóm Penicillin do dị ứng).',
       N'Nghỉ ngơi tại giường, uống nhiều nước ấm, theo dõi nhịp thở. Tái khám ngay nếu khó thở tăng.',
       'DANG_KHAM')
    ) AS source (maHoSoKham, maLuotKham, maBacSi, benhSu, tienSuBanThan, tienSuGiaDinh, khamToanThan, khamBoPhan, chanDoanSoBo, maICDSoBo, chanDoanXacDinh, maICDXacDinh, huongDieuTri, loiDanBacSi, trangThai)
    ON target.maHoSoKham = source.maHoSoKham
    WHEN MATCHED THEN
      UPDATE SET maBacSi = source.maBacSi, benhSu = source.benhSu, tienSuBanThan = source.tienSuBanThan, khamToanThan = source.khamToanThan, khamBoPhan = source.khamBoPhan, chanDoanXacDinh = source.chanDoanXacDinh, maICDXacDinh = source.maICDXacDinh, huongDieuTri = source.huongDieuTri, loiDanBacSi = source.loiDanBacSi, trangThai = source.trangThai
    WHEN NOT MATCHED THEN
      INSERT (maHoSoKham, maLuotKham, maBacSi, benhSu, tienSuBanThan, tienSuGiaDinh, khamToanThan, khamBoPhan, chanDoanSoBo, maICDSoBo, chanDoanXacDinh, maICDXacDinh, huongDieuTri, loiDanBacSi, trangThai)
      VALUES (source.maHoSoKham, source.maLuotKham, source.maBacSi, source.benhSu, source.tienSuBanThan, source.tienSuGiaDinh, source.khamToanThan, source.khamBoPhan, source.chanDoanSoBo, source.maICDSoBo, source.chanDoanXacDinh, source.maICDXacDinh, source.huongDieuTri, source.loiDanBacSi, source.trangThai);

    COMMIT;
  `;
  await querySql(examSql);
  console.log('✓ Upserted detailed clinical exam note into dbo.HoSoKham');

  // Step 5: Upsert Vitals (PhieuSinhHieu)
  const vitalsSql = `
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @now datetime2 = SYSDATETIME();

    MERGE dbo.PhieuSinhHieu AS target
    USING (VALUES
      ('SH-261122-001', 'LK-261122-001', 'NV-DD01', 96, 38.8, 95, 158.0, 58.0, 130, 85, DATEADD(minute, -80, @now)),
      ('SH-261122-002', 'LK-261122-002', 'NV-DD01', 78, 36.6, 98, 165.0, 68.0, 125, 80, DATEADD(minute, -65, @now)),
      ('SH-261122-003', 'LK-261122-003', 'NV-DD01', 80, 36.8, 99, 155.0, 50.0, 110, 70, DATEADD(minute, -45, @now)),
      ('SH-261122-004', 'LK-261122-004', 'NV-DD01', 115, 37.0, 96, 172.0, 75.0, 145, 95, DATEADD(minute, -35, @now))
    ) AS source (maPhieu, maLuotKham, maNhanVien, mach, nhietDo, spo2, chieuCao, canNang, huyetApTamThu, huyetApTamTruong, thoiDiemDo)
    ON target.maPhieu = source.maPhieu
    WHEN MATCHED THEN
      UPDATE SET maNhanVien = source.maNhanVien, mach = source.mach, nhietDo = source.nhietDo, spo2 = source.spo2, chieuCao = source.chieuCao, canNang = source.canNang, huyetApTamThu = source.huyetApTamThu, huyetApTamTruong = source.huyetApTamTruong
    WHEN NOT MATCHED THEN
      INSERT (maPhieu, maLuotKham, maNhanVien, mach, nhietDo, spo2, chieuCao, canNang, huyetApTamThu, huyetApTamTruong, thoiDiemDo)
      VALUES (source.maPhieu, source.maLuotKham, source.maNhanVien, source.mach, source.nhietDo, source.spo2, source.chieuCao, source.canNang, source.huyetApTamThu, source.huyetApTamTruong, source.thoiDiemDo);

    COMMIT;
  `;
  await querySql(vitalsSql);
  console.log('✓ Upserted realistic clinical vitals into dbo.PhieuSinhHieu');

  // Step 6: Upsert Diagnostic Orders (ChiDinhCLS & ChiTietChiDinh)
  const labsSql = `
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @now datetime2 = SYSDATETIME();

    -- Clear today's lab records to reseed cleanly
    DELETE FROM dbo.ChiSoXetNghiem WHERE maKetQua IN (
      SELECT maKetQua FROM dbo.KetQuaCLS WHERE maChiTiet IN (
        SELECT ct.maChiTiet FROM dbo.ChiTietChiDinh ct
        JOIN dbo.ChiDinhCLS cd ON cd.maChiDinh = ct.maChiDinh
        WHERE cd.maLuotKham IN ('LK-261122-001', 'LK-261122-002', 'LK-261122-003', 'LK-261122-004')
      )
    );
    DELETE FROM dbo.KetQuaMoTa WHERE maKetQua IN (
      SELECT maKetQua FROM dbo.KetQuaCLS WHERE maChiTiet IN (
        SELECT ct.maChiTiet FROM dbo.ChiTietChiDinh ct
        JOIN dbo.ChiDinhCLS cd ON cd.maChiDinh = ct.maChiDinh
        WHERE cd.maLuotKham IN ('LK-261122-001', 'LK-261122-002', 'LK-261122-003', 'LK-261122-004')
      )
    );
    DELETE FROM dbo.KetQuaXetNghiem WHERE maKetQua IN (
      SELECT maKetQua FROM dbo.KetQuaCLS WHERE maChiTiet IN (
        SELECT ct.maChiTiet FROM dbo.ChiTietChiDinh ct
        JOIN dbo.ChiDinhCLS cd ON cd.maChiDinh = ct.maChiDinh
        WHERE cd.maLuotKham IN ('LK-261122-001', 'LK-261122-002', 'LK-261122-003', 'LK-261122-004')
      )
    );
    DELETE FROM dbo.KetQuaCLS WHERE maChiTiet IN (
      SELECT ct.maChiTiet FROM dbo.ChiTietChiDinh ct
      JOIN dbo.ChiDinhCLS cd ON cd.maChiDinh = ct.maChiDinh
      WHERE cd.maLuotKham IN ('LK-261122-001', 'LK-261122-002', 'LK-261122-003', 'LK-261122-004')
    );
    DELETE FROM dbo.ChiTietChiDinh WHERE maChiDinh IN (
      SELECT maChiDinh FROM dbo.ChiDinhCLS WHERE maLuotKham IN ('LK-261122-001', 'LK-261122-002', 'LK-261122-003', 'LK-261122-004')
    );
    DELETE FROM dbo.ChiDinhCLS WHERE maLuotKham IN ('LK-261122-001', 'LK-261122-002', 'LK-261122-003', 'LK-261122-004');

    -- Order 1: Patient 1 (Lê Thị Thu Hương) - 3 services (ĐÃ CÓ KẾT QUẢ)
    INSERT INTO dbo.ChiDinhCLS (maChiDinh, maLuotKham, maBacSiChiDinh, thoiDiemChiDinh, chanDoanLamSang, loaiUuTien, trangThai)
    VALUES ('CD-261122-001', 'LK-261122-001', 'NV-BS01', DATEADD(minute, -75, @now), N'Viêm phổi thùy cấp - Kiểm tra bạch cầu và dấu hiệu viêm', 'THUONG', 'HOAN_TAT');

    INSERT INTO dbo.ChiTietChiDinh (maChiTiet, maChiDinh, maDichVu, soLuong, donGiaApDung, trangThai)
    VALUES
      ('CT-261122-001-01', 'CD-261122-001', 'DV_CONG_THUC_MAU', 1, 110000, 'CO_KET_QUA'),
      ('CT-261122-001-02', 'CD-261122-001', 'DV_XQUANG_TIM_PHOI', 1, 150000, 'CO_KET_QUA'),
      ('CT-261122-001-03', 'CD-261122-001', 'DV_DUONG_HUYET', 1, 45000, 'CO_KET_QUA');

    -- Order 2: Patient 2 (Nguyễn Văn Minh) - 3 services (ĐANG THỰC HIỆN / CHỜ THỰC HIỆN)
    INSERT INTO dbo.ChiDinhCLS (maChiDinh, maLuotKham, maBacSiChiDinh, thoiDiemChiDinh, chanDoanLamSang, loaiUuTien, trangThai)
    VALUES ('CD-261122-002', 'LK-261122-002', 'NV-BS01', DATEADD(minute, -60, @now), N'Đái tháo đường type 2 - Theo dõi đường huyết và chức năng gan mật', 'THUONG', 'DANG_THUC_HIEN');

    INSERT INTO dbo.ChiTietChiDinh (maChiTiet, maChiDinh, maDichVu, soLuong, donGiaApDung, trangThai)
    VALUES
      ('CT-261122-002-01', 'CD-261122-002', 'DV_DUONG_HUYET', 1, 45000, 'DANG_THUC_HIEN'),
      ('CT-261122-002-02', 'CD-261122-002', 'DV_MEN_GAN_GOT_GPT', 1, 85000, 'CHO_THUC_HIEN'),
      ('CT-261122-002-03', 'CD-261122-002', 'DV_SIEU_AM_BUNG', 1, 180000, 'CHO_THUC_HIEN');

    -- Order 3: Patient 3 (Trần Thị Mai Lan) - 2 services (CHỜ THỰC HIỆN)
    INSERT INTO dbo.ChiDinhCLS (maChiDinh, maLuotKham, maBacSiChiDinh, thoiDiemChiDinh, chanDoanLamSang, loaiUuTien, trangThai)
    VALUES ('CD-261122-003', 'LK-261122-003', 'NV-BS01', DATEADD(minute, -40, @now), N'Viêm loét dạ dày tá tràng - Khảo sát tạng bụng và thiếu máu', 'THUONG', 'CHO_THUC_HIEN');

    INSERT INTO dbo.ChiTietChiDinh (maChiTiet, maChiDinh, maDichVu, soLuong, donGiaApDung, trangThai)
    VALUES
      ('CT-261122-003-01', 'CD-261122-003', 'DV_SIEU_AM_BUNG', 1, 180000, 'CHO_THUC_HIEN'),
      ('CT-261122-003-02', 'CD-261122-003', 'DV_CONG_THUC_MAU', 1, 110000, 'CHO_THUC_HIEN');

    -- Order 4: Patient 4 (Phạm Quốc Hưng) - CẤP CỨU KHẨN CẤP (1 ECG + 1 Men gan)
    INSERT INTO dbo.ChiDinhCLS (maChiDinh, maLuotKham, maBacSiChiDinh, thoiDiemChiDinh, chanDoanLamSang, loaiUuTien, trangThai)
    VALUES ('CD-261122-004', 'LK-261122-004', 'NV-BS02', DATEADD(minute, -25, @now), N'Cơn đau thắt ngực cấp - Loại trừ hội chứng vành cấp', 'CAP_CUU', 'CHO_THUC_HIEN');

    INSERT INTO dbo.ChiTietChiDinh (maChiTiet, maChiDinh, maDichVu, soLuong, donGiaApDung, trangThai)
    VALUES
      ('CT-261122-004-01', 'CD-261122-004', 'DV_DIEN_TIM_ECG', 1, 65000, 'CHO_THUC_HIEN'),
      ('CT-261122-004-02', 'CD-261122-004', 'DV_MEN_GAN_GOT_GPT', 1, 85000, 'CHO_THUC_HIEN');

    -- Insert Lab Results for Order 1 (Patient Lê Thị Thu Hương)
    -- CT-261122-001-01 (Máu)
    INSERT INTO dbo.KetQuaCLS (maKetQua, maChiTiet, loaiKetQua, lanThucHien, phienBan, laBanHienHanh, thoiDiemCoKetQua, maKyThuatVien, maBacSiDuyet, thoiDiemDuyet, trangThai, ghiChuChuyenMon)
    VALUES ('KQ-261122-001', 'CT-261122-001-01', 'XET_NGHIEM', 1, 1, 1, DATEADD(minute, -50, @now), 'NV-KTV01', 'NV-BS01', DATEADD(minute, -30, @now), 'DA_DUYET',
            N'Bạch cầu tăng cao (14.8 G/L) với ưu thế bạch cầu đa nhân trung tính (82.5%) — Phù hợp tình trạng nhiễm khuẩn cấp tính.');

    INSERT INTO dbo.KetQuaXetNghiem (maKetQua, loaiKetQua, theTichMau, chatLuongMau, thoiDiemLayMau, nguoiLayMau, thoiDiemNhanMau, coCanhBaoNguyKich)
    VALUES ('KQ-261122-001', 'XET_NGHIEM', N'2 ml máu EDTA', N'Đạt yêu cầu', DATEADD(minute, -65, @now), 'NV-DD01', DATEADD(minute, -60, @now), 0);

    INSERT INTO dbo.ChiSoXetNghiem (maChiSo, maKetQua, maLoaiChiSo, tenChiSo, giaTriDo, giaTriSo, donViDo, khoangThamChieu, giaTriMinThamChieu, giaTriMaxThamChieu, mucDoCanhBao)
    VALUES
      ('CS-001', 'KQ-261122-001', 'WBC', N'WBC (Bạch cầu)', N'14.8', 14.8, N'G/L', N'4.0 - 10.0', 4.0, 10.0, N'CAO'),
      ('CS-002', 'KQ-261122-001', 'NEU', N'NEU% (Đa nhân trung tính)', N'82.5', 82.5, N'%', N'40.0 - 74.0', 40.0, 74.0, N'CAO'),
      ('CS-003', 'KQ-261122-001', 'RBC', N'RBC (Hồng cầu)', N'4.65', 4.65, N'T/L', N'4.0 - 5.5', 4.0, 5.5, N'BINH_THUONG'),
      ('CS-004', 'KQ-261122-001', 'HGB', N'HGB (Huyết sắc tố)', N'138', 138, N'g/L', N'120 - 165', 120, 165, N'BINH_THUONG'),
      ('CS-005', 'KQ-261122-001', 'PLT', N'PLT (Tiểu cầu)', N'265', 265, N'G/L', N'150 - 450', 150, 450, N'BINH_THUONG');

    -- CT-261122-001-02 (X-quang phổi)
    INSERT INTO dbo.KetQuaCLS (maKetQua, maChiTiet, loaiKetQua, lanThucHien, phienBan, laBanHienHanh, thoiDiemCoKetQua, maKyThuatVien, maBacSiDuyet, thoiDiemDuyet, trangThai, ghiChuChuyenMon)
    VALUES ('KQ-261122-002', 'CT-261122-001-02', 'MO_TA', 1, 1, 1, DATEADD(minute, -45, @now), 'NV-KTV01', 'NV-BS01', DATEADD(minute, -25, @now), 'DA_DUYET',
            N'Hình ảnh thâm nhiễm phế nang đông đặc thùy dưới phổi phải — Phù hợp Viêm phổi thùy cấp.');

    INSERT INTO dbo.KetQuaMoTa (maKetQua, loaiKetQua, vungKhaoSat, kyThuatChup, moTaHinhAnh, ketLuan, deNghi)
    VALUES ('KQ-261122-002', 'MO_TA', N'Lồng ngực và nhu mô phổi', N'Chụp X-quang tim phổi thẳng thế đứng (PA)',
            N'Đám mờ không đồng nhất chiếm 1/3 dưới phế trường phải, có hình ảnh phế quản hơi. Góc sườn hoành 2 bên sáng nhọn. Bóng tim chỉ số tim/ngực < 0.5.',
            N'Hình ảnh đông đặc nhu mô thùy dưới phổi phải — Nghĩ nhiều đến Viêm phổi thùy cấp tính.',
            N'Chụp phim kiểm tra lại sau đợt điều trị kháng sinh 7-10 ngày.');

    -- CT-261122-001-03 (Glucose)
    INSERT INTO dbo.KetQuaCLS (maKetQua, maChiTiet, loaiKetQua, lanThucHien, phienBan, laBanHienHanh, thoiDiemCoKetQua, maKyThuatVien, maBacSiDuyet, thoiDiemDuyet, trangThai, ghiChuChuyenMon)
    VALUES ('KQ-261122-003', 'CT-261122-001-03', 'XET_NGHIEM', 1, 1, 1, DATEADD(minute, -40, @now), 'NV-KTV01', 'NV-BS01', DATEADD(minute, -20, @now), 'DA_DUYET',
            N'Đường huyết mao mạch 5.4 mmol/L trong giới hạn bình thường.');

    INSERT INTO dbo.KetQuaXetNghiem (maKetQua, loaiKetQua, theTichMau, chatLuongMau, thoiDiemLayMau, nguoiLayMau, thoiDiemNhanMau, coCanhBaoNguyKich)
    VALUES ('KQ-261122-003', 'XET_NGHIEM', N'1 giọt máu mao mạch', N'Đạt yêu cầu', DATEADD(minute, -55, @now), 'NV-DD01', DATEADD(minute, -50, @now), 0);

    INSERT INTO dbo.ChiSoXetNghiem (maChiSo, maKetQua, maLoaiChiSo, tenChiSo, giaTriDo, giaTriSo, donViDo, khoangThamChieu, giaTriMinThamChieu, giaTriMaxThamChieu, mucDoCanhBao)
    VALUES
      ('CS-006', 'KQ-261122-003', 'GLU', N'Glucose máu lúc đói', N'5.4', 5.4, N'mmol/L', N'3.9 - 6.4', 3.9, 6.4, N'BINH_THUONG');

    COMMIT;
  `;
  await querySql(labsSql);
  console.log('✓ Upserted realistic clinical diagnostic orders and published results');

  console.log('=== SEEDING COMPLETED SUCCESSFULLY ===');
}

seedCleanData().catch(e => {
  console.error('SEEDING FAILED:', e);
  process.exit(1);
});
