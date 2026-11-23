import { querySql } from '../server/admin-store.mjs';

export async function seedPaperFormsData() {
  const sql = `
  SET XACT_ABORT ON;
  BEGIN TRANSACTION;

  -- 1. Giấy chuyển tuyến (Mẫu số 06)
  IF NOT EXISTS (SELECT 1 FROM dbo.GiayChuyenTuyen WHERE maGiayChuyenTuyen = 'CT-261122-001')
  BEGIN
    INSERT INTO dbo.GiayChuyenTuyen (
      maGiayChuyenTuyen, soVaoSo, maBenhNhan, maLuotKham, coSoTiepNhan, maCSKCBTiepNhan,
      tuyenTiepNhan, thoiGianChuyen, lyDoChuyen, tomTatBenhSu, tomTatCLS, chanDoanChuyen,
      maICDChuyen, phuongPhapDieuTri, tinhTrangNguoiBenh, huongDieuTriTiep, phuongTienVanChuyen,
      nguoiHoTong, maBacSiDieuTri, maThuTruong, trangThai
    ) VALUES (
      'CT-261122-001', '01/2026/GCT', 'BN-240101-001', 'LK-261122-001', N'Bệnh viện Chợ Rẫy', '79-015',
      N'Tuyến trung ương', '2026-11-22T09:30:00', N'1. Vượt quá khả năng điều trị của cơ sở KCB',
      N'Bệnh nhân đau thắt ngực lan lên vai trái và hàm dưới khi gắng sức, kèm khó thở, vã mồ hôi.',
      N'ECG: ST chênh lên ở các chuyển đạo V1-V4. Men tim Troponin T tăng cao 0.85 ng/mL.',
      N'I20.0 - Hội chứng mạch vành cấp / Nghi nhồi máu cơ tim cấp', 'I20.0',
      N'Thở oxy qua kính 3L/phút, ngậm dưới lưỡi Nitroglycerin 0.5mg, Aspirin 300mg, Clopidogrel 300mg.',
      N'Người bệnh tỉnh, tiếp xúc được, còn đau tức ngực âm ỉ. Mạch: 92ck/p, HA: 130/85 mmHg, SpO2: 98%.',
      N'Chuyển viện khẩn cấp đến Trung tâm Tim mạch can thiệp - Bệnh viện Chợ Rẫy để chụp và can thiệp mạch vành qua da (PCI).',
      N'Xe cứu thương chuyển viện chuyên dụng (Cấp cứu 115)',
      N'BS.CKI Trần Minh Anh & Điều dưỡng Nguyễn Thị Mai',
      'NV-BS01', 'NV-BS02', N'Đã phê duyệt'
    );
  END;

  IF NOT EXISTS (SELECT 1 FROM dbo.GiayChuyenTuyen WHERE maGiayChuyenTuyen = 'CT-261122-002')
  BEGIN
    INSERT INTO dbo.GiayChuyenTuyen (
      maGiayChuyenTuyen, soVaoSo, maBenhNhan, maLuotKham, coSoTiepNhan, maCSKCBTiepNhan,
      tuyenTiepNhan, thoiGianChuyen, lyDoChuyen, tomTatBenhSu, tomTatCLS, chanDoanChuyen,
      maICDChuyen, phuongPhapDieuTri, tinhTrangNguoiBenh, huongDieuTriTiep, phuongTienVanChuyen,
      nguoiHoTong, maBacSiDieuTri, maThuTruong, trangThai
    ) VALUES (
      'CT-261122-002', '02/2026/GCT', 'BN-240101-002', 'LK-261122-002', N'Bệnh viện Đa khoa Thống Nhất', '79-020',
      N'Tuyến tỉnh/thành phố', '2026-11-22T10:15:00', N'1. Vượt quá khả năng điều trị của cơ sở KCB',
      N'Bệnh nhân đái tháo đường type 2 kiểm soát kém kèm biến chứng loét bàn chân độ 2 theo Wagner.',
      N'Đường huyết đói 14.2 mmol/L, HbA1c 9.8%. X-quang bàn chân chưa thấy tiêu xương.',
      N'E11.9 - Đái tháo đường type 2 có biến chứng mạch máu ngoại vi', 'E11.9',
      N'Kháng sinh toàn thân, cắt lọc mô hoại tử tại chỗ, kiểm soát đường huyết bằng Insulin gộp.',
      N'Tỉnh táo, sinh hiệu ổn định, vết loét còn rỉ dịch.',
      N'Điều trị nội trú chuyên sâu khoa Nội tiết.',
      N'Tự túc phương tiện (Người nhà đưa đi)',
      N'Người nhà bệnh nhân',
      'NV-BS01', 'NV-BS02', N'Đã phê duyệt'
    );
  END;

  -- 2. Giấy ra viện (Phụ lục 3)
  IF NOT EXISTS (SELECT 1 FROM dbo.GiayRaVien WHERE maGiayRaVien = 'RV-261122-001')
  BEGIN
    INSERT INTO dbo.GiayRaVien (
      maGiayRaVien, soLuuTru, maBenhNhan, maDotDieuTri, maKhoaRaVien, ngayVaoVien, ngayRaVien,
      chanDoanVaoVien, chanDoanRaVien, maICDRaVien, phuongPhapDieuTri, ketQuaDieuTri,
      soNgayNghiBHXH, tuNgayNghi, denNgayNghi, loiDanBacSi, maBacSiDieuTri, maThuTruong, trangThai
    ) VALUES (
      'RV-261122-001', 'RV-2026/088', 'BN-240101-001', 'BA-261121-EA9A', 'KHOA_NOI',
      '2026-11-18T08:00:00', '2026-11-23T10:00:00',
      N'E11.9 - Đái tháo đường type 2 kiểm soát kém',
      N'E11.9 - Đái tháo đường type 2 ổn định - Tăng huyết áp độ 1', 'E11.9',
      N'Điều chỉnh phác đồ Insulin phối hợp thuốc uống, truyền dịch cân bằng điện giải, chăm sóc dinh dưỡng lâm sàng.',
      N'Đỡ / giảm', 7, '2026-11-23', '2026-11-29',
      N'Uống thuốc đúng giờ theo đơn ngoại trú, đo đường huyết mao mạch tại nhà 2 lần/ngày, kiêng đồ ngọt tinh bột, tái khám sau 1 tuần.',
      'NV-BS01', 'NV-BS02', N'Đã hoàn tất'
    );
  END;

  -- 3. Biên bản hội chẩn (BienBanHoiChan)
  IF NOT EXISTS (SELECT 1 FROM dbo.BienBanHoiChan WHERE maBienBan = 'HC-261122-001')
  BEGIN
    INSERT INTO dbo.BienBanHoiChan (
      maBienBan, maDotDieuTri, maLuotKham, thoiDiemHoiChan, diaDiem, hinhThucHoiChan, lyDoHoiChan,
      maChuToa, maThuKy, thanhVienThamGia, tomTatDienBien, chanDoanThongNhat, huongDieuTriThongNhat,
      trangThai, maNguoiDuyet, thoiDiemDuyet
    ) VALUES (
      'HC-261122-001', 'BA-261121-EA9A', 'LK-261122-001', '2026-11-22T14:30:00',
      N'Phòng Giao ban Bệnh viện Đa khoa MediCare', 'LIEN_KHOA',
      N'Bệnh nhân đái tháo đường biến chứng loét bàn chân có nguy cơ nhiễm trùng lan rộng cần phác đồ kháng sinh phối hợp',
      'NV-BS01', 'NV-DD01',
      N'BS.CKII Phạm Hoàng Long (Chủ tọa), BS.CKI Trần Minh Anh (Thư ký/Điều trị), BS.CKI Hoàng Văn Thịnh (Mắt), BS.CKI Lê Thị Ngọc Mai (Da liễu)',
      N'Bệnh nhân nam 64 tuổi, tiền sử ĐTĐ type 2 10 năm. Nhập viện do loét ngón 1 bàn chân phải rỉ mủ. Đã điều trị Amoxicillin/Clavulanic 3 ngày đáp ứng chậm.',
      N'Loét bàn chân do ĐTĐ type 2 biến chứng thần kinh - ngoại vi (Wagner độ 2) / Viêm mô tế bào bàn chân',
      N'1. Đổi kháng sinh phối hợp Cefoperazone + Sulbactam tĩnh mạch kết hợp Metronidazole. 2. Cắt lọc mô hạt hoại tử vết loét nhẹ nhàng, rửa Povidine 10% hàng ngày. 3. Kiểm soát đường huyết mục tiêu 7-9 mmol/L bằng Insulin nền/nhanh.',
      'DA_DUYET', 'NV-BS02', '2026-11-22T16:00:00'
    );
  END;

  -- 4. Bản tóm tắt hồ sơ bệnh án (TomTatBenhAn)
  IF NOT EXISTS (SELECT 1 FROM dbo.TomTatBenhAn WHERE maTomTat = 'TTBA-261122-001')
  BEGIN
    INSERT INTO dbo.TomTatBenhAn (
      maTomTat, maBenhNhan, maLuotKham, maDotDieuTri, quaTrinhBenhLy, tomTatCLS,
      chanDoan, maICD, phuongPhapDieuTri, tinhTrangRaVien, ghiChuLoiDan,
      maBacSi, maGiamDoc, trangThai
    ) VALUES (
      'TTBA-261122-001', 'BN-240101-001', 'LK-261122-001', 'BA-261121-EA9A',
      N'Bệnh nhân nam 64 tuổi vào viện vì mệt mỏi, sụt cân, khát nhiều uống nhiều. Được tiếp nhận điều trị tại khoa Nội tổng quát từ 18/11/2026 đến 23/11/2026.',
      N'Đường huyết mao mạch vào viện: 16.5 mmol/L. HbA1c: 9.8%. Sinh hóa máu: Men gan AST/ALT trong giới hạn bình thường, Creatinine: 88 umol/L. Tổng phân tích nước tiểu: Glucose (+++), Ketone (-).',
      N'E11.9 - Đái tháo đường type 2 không có biến chứng toan ceton', 'E11.9',
      N'Điều chỉnh chế độ ăn kết hợp Insulin mixtard 30/70 tiêm dưới da, chuyển đổi ổn định sang phác đồ phối hợp Metformin và Gliclazide.',
      N'Bệnh nhân tỉnh táo, hết khát nhiều, ăn ngủ tốt. Đường huyết lúc ra viện đạt mục tiêu: 7.2 mmol/L. Sinh hiệu ổn định: Mạch 78 ck/p, HA 120/80 mmHg.',
      N'Dùng thuốc đều đặn theo đơn ngoại trú. Tuân thủ chế độ ăn giảm đường tinh bột, tăng rau xanh. Tái khám sau 14 ngày làm lại đường huyết đói.',
      'NV-BS01', 'NV-BS02', N'Đã hoàn tất'
    );
  END;

  COMMIT TRANSACTION;
  SELECT 'SEED_OK' AS result;
  `;

  return await querySql(sql);
}

if (process.argv[1]?.endsWith('seed-paper-forms-data.mjs')) {
  seedPaperFormsData()
    .then(r => console.log('Seed Result:', r))
    .catch(err => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
