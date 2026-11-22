import { querySql } from '../server/admin-store.mjs';

async function seedEnterpriseData() {
  console.log('--- BẮT ĐẦU SEED DỮ LIỆU LIÊN THÔNG TOÀN DIỆN VÀO SQL SERVER ---');

  const sql = `
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  BEGIN TRY
  BEGIN TRAN;

  -- 1. ĐƠN THUỐC (dbo.DonThuoc & dbo.ChiTietDonThuoc)
  DELETE FROM dbo.ChiTietQuyetToan;
  DELETE FROM dbo.GiaoDichThanhToan;
  DELETE FROM dbo.QuyetToan;
  DELETE FROM dbo.BaoCaoVienPhi;
  DELETE FROM dbo.SoKho;
  DELETE FROM dbo.ChiTietPhieuKho;
  DELETE FROM dbo.PhieuKho;
  DELETE FROM dbo.LanThucHienYLenh;
  DELETE FROM dbo.YLenh;
  DELETE FROM dbo.ToDieuTri;
  DELETE FROM dbo.ChiTietDonThuoc;
  DELETE FROM dbo.DonThuoc;
  DELETE FROM dbo.LichHen;
  DELETE FROM dbo.BenhAnDienTu;

  -- Đơn 1: Lê Thị Thu Hương (LK-261122-001) - Đã duyệt, Đã cấp phát (DA_CAP_DU)
  INSERT INTO dbo.DonThuoc (maDon, maLuotKham, loaiDon, thoiDiemKe, maBacSiKe, chanDoan, trangThaiCapPhat, loiDan, maNguoiDuyet, thoiDiemDuyet)
  VALUES ('DT-261122-001', 'LK-261122-001', 'NGOAI_TRU', '2026-11-22T08:30:00', 'NV-BS01', N'J18.9 - Viêm phổi không đặc hiệu', 'DA_CAP_DU', N'Uống thuốc sau ăn no, kiêng nước lạnh, tái khám sau 5 ngày', 'NV-BS01', '2026-11-22T08:35:00');

  INSERT INTO dbo.ChiTietDonThuoc (maChiTietDon, maDon, maHang, soLuongKe, donViKe, cachDung, soNgayDung, sang, chieu, donGiaKe, soLuongDaCap, trangThai)
  VALUES 
  ('CTDT-261122-001', 'DT-261122-001', 'TH_AUG1G', 14.0, N'Viên', N'Uống 1 viên x 2 lần/ngày sau ăn', 7, N'1', N'1', 22000.0, 14.0, 'DA_CAP_DU'),
  ('CTDT-261122-002', 'DT-261122-001', 'TH_PARA500', 10.0, N'Viên', N'Uống 1 viên khi sốt trên 38.5 độ', 5, N'1', N'1', 1500.0, 10.0, 'DA_CAP_DU');

  -- Đơn 2: Nguyễn Văn Minh (LK-261122-002) - Đã duyệt, Chờ cấp phát (CHUA_CAP)
  INSERT INTO dbo.DonThuoc (maDon, maLuotKham, loaiDon, thoiDiemKe, maBacSiKe, chanDoan, trangThaiCapPhat, loiDan, maNguoiDuyet, thoiDiemDuyet)
  VALUES ('DT-261122-002', 'LK-261122-002', 'NGOAI_TRU', '2026-11-22T08:45:00', 'NV-BS01', N'E11.9 - Đái tháo đường type 2 không có biến chứng', 'CHUA_CAP', N'Uống trước bữa ăn sáng 30 phút, kiêng đồ ngọt tinh bột', 'NV-BS01', '2026-11-22T08:50:00');

  INSERT INTO dbo.ChiTietDonThuoc (maChiTietDon, maDon, maHang, soLuongKe, donViKe, cachDung, soNgayDung, sang, chieu, donGiaKe, soLuongDaCap, trangThai)
  VALUES 
  ('CTDT-261122-003', 'DT-261122-002', 'TH_NEXIUM40', 14.0, N'Viên', N'Uống 1 viên trước ăn sáng', 14, N'1', NULL, 25000.0, 0.0, 'CHUA_CAP'),
  ('CTDT-261122-004', 'DT-261122-002', 'TH_PARA500', 10.0, N'Viên', N'Uống 1 viên khi đau đầu', 5, N'1', NULL, 1500.0, 0.0, 'CHUA_CAP');

  -- Đơn 3: Phạm Quốc Hưng (LK-261122-004) - Chờ cấp phát (CHUA_CAP)
  INSERT INTO dbo.DonThuoc (maDon, maLuotKham, loaiDon, thoiDiemKe, maBacSiKe, chanDoan, trangThaiCapPhat, loiDan, maNguoiDuyet, thoiDiemDuyet)
  VALUES ('DT-261122-003', 'LK-261122-004', 'NGOAI_TRU', '2026-11-22T09:15:00', 'NV-BS02', N'I10 - Tăng huyết áp vô căn (nguyên phát)', 'CHUA_CAP', N'Đo huyết áp hằng ngày, hạn chế ăn mặn', 'NV-BS02', '2026-11-22T09:20:00');

  INSERT INTO dbo.ChiTietDonThuoc (maChiTietDon, maDon, maHang, soLuongKe, donViKe, cachDung, soNgayDung, sang, chieu, donGiaKe, soLuongDaCap, trangThai)
  VALUES 
  ('CTDT-261122-005', 'DT-261122-003', 'TH_BERBERIN', 20.0, N'Viên', N'Uống 2 viên x 2 lần/ngày sau ăn', 5, N'2', N'2', 1200.0, 0.0, 'CHUA_CAP'),
  ('CTDT-261122-006', 'DT-261122-003', 'TH_PARA500', 10.0, N'Viên', N'Uống 1 viên khi sốt', 5, N'1', N'1', 1500.0, 0.0, 'CHUA_CAP');

  -- Đơn 4: Đỗ Tuấn Anh (LK-261122-005) - Đã cấp phát (DA_CAP_DU)
  INSERT INTO dbo.DonThuoc (maDon, maLuotKham, loaiDon, thoiDiemKe, maBacSiKe, chanDoan, trangThaiCapPhat, loiDan, maNguoiDuyet, thoiDiemDuyet)
  VALUES ('DT-261122-004', 'LK-261122-005', 'NGOAI_TRU', '2026-11-22T09:40:00', 'NV-BS03', N'J02.9 - Viêm họng cấp không đặc hiệu', 'DA_CAP_DU', N'Súc miệng nước muối, uống nhiều nước ấm', 'NV-BS03', '2026-11-22T09:45:00');

  INSERT INTO dbo.ChiTietDonThuoc (maChiTietDon, maDon, maHang, soLuongKe, donViKe, cachDung, soNgayDung, sang, chieu, donGiaKe, soLuongDaCap, trangThai)
  VALUES 
  ('CTDT-261122-007', 'DT-261122-004', 'TH_ZINNAT500', 10.0, N'Viên', N'Uống 1 viên x 2 lần/ngày sau ăn', 5, N'1', N'1', 28000.0, 10.0, 'DA_CAP_DU'),
  ('CTDT-261122-008', 'DT-261122-004', 'TH_PARA500', 10.0, N'Viên', N'Uống 1 viên khi đau họng, sốt', 5, N'1', N'1', 1500.0, 10.0, 'DA_CAP_DU');


  -- 2. TỜ ĐIỀU TRỊ & Y LỆNH NỘI TRÚ (dbo.ToDieuTri, dbo.YLenh, dbo.LanThucHienYLenh)
  INSERT INTO dbo.ToDieuTri (maTo, maDotDieuTri, soThuTuTo, ngayDieuTri, thoiDiemGhi, dienBienBenh, yLenhChung, cheDoDinhDuong, cheDoChamSoc, maBacSi, trangThai, maBacSiDuyet, thoiDiemDuyet)
  VALUES 
  ('TO-261122-01', 'BA-261121-EA9A', 1, '2026-11-22', '2026-11-22T07:30:00', 
   N'Bệnh nhân tỉnh, tiếp xúc tốt, giảm khó thở, phổi ran ẩm 2 đáy rải rác, ho có đờm trắng đục. Huyết áp 120/80 mmHg, mạch 82 lần/phút, SpO2 97%.',
   N'Dùng kháng sinh uống theo phác đồ, khí dung giãn phế quản, theo dõi sinh hiệu 8h/lần.',
   N'Cơm bệnh lý viêm phổi, kiêng đồ chua cay lạnh', N'Chăm sóc cấp 2', 'NV-BS01', 'DA_DUYET', 'NV-BS01', '2026-11-22T07:45:00');

  INSERT INTO dbo.YLenh (maYLenh, maTo, loaiYLenh, noiDungYLenh, maHang, coTieuHaoKho, soLuongKeHoach, donViKeHoach, duongDung, tanSuatDung, thoiDiemBatDau, trangThai, maBacSiRaYLenh)
  VALUES 
  ('YL-261122-01', 'TO-261122-01', 'THUOC', N'Augmentin 1g (Amoxicillin + Clavulanic)', 'TH_AUG1G', 1, 2.0, N'Viên', N'Uống', N'2 lần/ngày (Sáng 8h, Tối 20h) sau ăn', '2026-11-22T08:00:00', 'DA_HOAN_TAT', 'NV-BS01'),
  ('YL-261122-02', 'TO-261122-01', 'CHAM_SOC', N'Đo sinh hiệu (Mạch, Nhiệt, Huyết áp, SpO2) 8h/lần', NULL, 0, NULL, N'Lần', N'Tại giường', N'8 giờ/lần', '2026-11-22T08:00:00', 'DANG_THUC_HIEN', 'NV-BS01');

  INSERT INTO dbo.LanThucHienYLenh (maLan, maYLenh, lanThu, thoiDiemKeHoach, thoiDiemThucHien, thoiDiemGhiNhan, maNhanVienThucHien, ketQuaThucHien, maLoTon, maKhoTieuHao, soLuongThucDung, donViThucDung, trangThaiLamSang, trangThaiKho, ghiChu)
  VALUES 
  ('LT-261122-01', 'YL-261122-01', 1, '2026-11-22T08:00:00', '2026-11-22T08:15:00', '2026-11-22T08:20:00', 'NV-DD01', N'Đã cho người bệnh uống 1 viên Augmentin 1g sau ăn sáng.', 'LTK_004', 'KHO_NGOAI_TRU', 1.0, N'Viên', 'DA_THUC_HIEN', 'KHONG_AP_DUNG', N'Đối chiếu 5 đúng: Đạt 5/5. Bệnh nhân dung nạp tốt');


  -- 3. SỔ KHO, PHIẾU KHO & DI CHUYỂN KHO (dbo.PhieuKho, dbo.ChiTietPhieuKho, dbo.SoKho)
  -- Phiếu nhập kho từ Nhà cung cấp
  INSERT INTO dbo.PhieuKho (maPhieu, loaiPhieu, maKhoDich, thoiDiemLap, maNguoiLap, trangThai, ghiChu)
  VALUES ('PK-NHAP-261101', 'NHAP_KHO', 'KHO_TONG', '2026-11-01T08:00:00', 'NV-DS01', 'DA_NHAP', N'Nhập kho lô hàng đầu tháng từ Tổng công ty Dược');

  INSERT INTO dbo.ChiTietPhieuKho (maChiTietKho, maPhieu, maLoTon, soLuong, donViXuat, soLuongCoSo, donGiaVatLy, soLuongDaHoan)
  VALUES ('CTPK-001', 'PK-NHAP-261101', 'LTK_001', 5000.0, N'Viên', 5000.0, 1000.0, 0.0);

  INSERT INTO dbo.SoKho (maSoKho, maChiTietKho, maLoTon, thoiDiemGhiSo, soLuongTruoc, bienDong, soLuongSau, ghiChu)
  VALUES ('SK-001', 'CTPK-001', 'LTK_001', '2026-11-01T08:30:00', 0.0, 5000.0, 5000.0, N'Ghi sổ nhập kho từ nhà cung cấp');

  -- Phiếu điều chuyển từ Kho Tổng -> Nhà Thuốc Ngoại Trú
  INSERT INTO dbo.PhieuKho (maPhieu, loaiPhieu, maKhoNguon, maKhoDich, thoiDiemLap, maNguoiLap, trangThai, ghiChu)
  VALUES ('PK-CHUYEN-261120', 'CHUYEN_KHO', 'KHO_TONG', 'KHO_NGOAI_TRU', '2026-11-20T14:00:00', 'NV-DS01', 'DA_XUAT', N'Cấp phát cơ số tuần cho Nhà thuốc Ngoại trú');

  INSERT INTO dbo.ChiTietPhieuKho (maChiTietKho, maPhieu, maLoTon, soLuong, donViXuat, soLuongCoSo, donGiaVatLy, soLuongDaHoan)
  VALUES ('CTPK-002', 'PK-CHUYEN-261120', 'LTK_002', 1200.0, N'Viên', 1200.0, 1000.0, 0.0);

  INSERT INTO dbo.SoKho (maSoKho, maChiTietKho, maLoTon, thoiDiemGhiSo, soLuongTruoc, bienDong, soLuongSau, ghiChu)
  VALUES 
  ('SK-002', 'CTPK-002', 'LTK_001', '2026-11-20T14:15:00', 5000.0, -1200.0, 3800.0, N'Xuất chuyển sang Nhà thuốc Ngoại trú'),
  ('SK-003', 'CTPK-002', 'LTK_002', '2026-11-20T14:30:00', 0.0, 1200.0, 1200.0, N'Nhập nhận từ Kho Dược Tổng');

  -- Phiếu xuất cấp phát đơn thuốc DT-261122-001
  INSERT INTO dbo.PhieuKho (maPhieu, loaiPhieu, maKhoNguon, thoiDiemLap, maNguoiLap, trangThai, ghiChu)
  VALUES ('PK-XUAT-261122-01', 'XUAT_DON', 'KHO_NGOAI_TRU', '2026-11-22T08:50:00', 'NV-DS01', 'DA_XUAT', N'Xuất cấp phát đơn thuốc ngoại trú DT-261122-001');

  INSERT INTO dbo.ChiTietPhieuKho (maChiTietKho, maPhieu, maLoTon, maChiTietDonNguon, soLuong, donViXuat, soLuongCoSo, donGiaVatLy, soLuongDaHoan)
  VALUES ('CTPK-003', 'PK-XUAT-261122-01', 'LTK_002', 'CTDT-261122-002', 10.0, N'Viên', 10.0, 1500.0, 0.0);

  INSERT INTO dbo.SoKho (maSoKho, maChiTietKho, maLoTon, thoiDiemGhiSo, soLuongTruoc, bienDong, soLuongSau, ghiChu)
  VALUES ('SK-004', 'CTPK-003', 'LTK_002', '2026-11-22T08:55:00', 1200.0, -10.0, 1190.0, N'Xuất cấp đơn thuốc bệnh nhân Lê Thị Thu Hương');


  -- 4. CA THU NGÂN, TẠM ỨNG & QUYẾT TOÁN VIỆN PHÍ (dbo.BaoCaoVienPhi, dbo.GiaoDichThanhToan, dbo.QuyetToan, dbo.ChiTietQuyetToan)
  -- Ca thu ngân của CN. Đặng Thu Thảo
  INSERT INTO dbo.BaoCaoVienPhi (maBaoCao, maCaTruc, quayThuTien, maThuNgan, thoiDiemMoCa, tienDauCa, tongTienThuTrongCa, tongTienHoanTrongCa, trangThai)
  VALUES ('CA-261122-01', 'CA_SANG_261122', N'Quầy 01 - Sảnh chính', 'NV-TC01', '2026-11-22T07:00:00', 2000000.0, 1074000.0, 0.0, 'DANG_MO');

  -- Tạm ứng nội trú cho Lê Thị Thu Hương
  INSERT INTO dbo.GiaoDichThanhToan (maGiaoDich, maBenhNhan, maDotDieuTri, loaiGiaoDich, phuongThuc, soTien, thoiDiemGiaoDich, trangThai, maNhanVienXacNhan, maCaTruc, ghiChu)
  VALUES ('GD-TU-261122-01', 'BN-240101-001', 'BA-261121-EA9A', 'TAM_UNG', 'CHUYEN_KHOAN', 1000000.0, '2026-11-22T08:00:00', 'THANH_CONG', 'NV-TC01', 'CA-261122-01', N'Tạm ứng viện phí nhập viện nội trú');

  -- Quyết toán đợt khám ngoại trú cho Đỗ Tuấn Anh (LK-261122-005)
  INSERT INTO dbo.QuyetToan (maQuyetToan, maLuotKham, phienBan, laBanHienHanh, thoiDiemChot, tongChiPhi, tienBHYTChiTra, tongMienGiam, trangThai, maNguoiChot)
  VALUES ('QT-261122-01', 'LK-261122-005', 1, 1, '2026-11-22T10:00:00', 370000.0, 296000.0, 0.0, 'DA_QUYET_TOAN', 'NV-TC01');

  INSERT INTO dbo.ChiTietQuyetToan (maDongQuyetToan, maQuyetToan, loaiChiPhi, maLuotKhamNguon, soLuong, donGia, thanhTien, tienBHYT, tienBenhNhanTra, tyLeBHYT)
  VALUES 
  ('CTQT-001', 'QT-261122-01', 'KHAM_BENH', 'LK-261122-005', 1.0, 75000.0, 75000.0, 60000.0, 15000.0, 80.0),
  ('CTQT-002', 'QT-261122-01', 'THUOC', 'LK-261122-005', 10.0, 28000.0, 280000.0, 224000.0, 56000.0, 80.0),
  ('CTQT-003', 'QT-261122-01', 'THUOC', 'LK-261122-005', 10.0, 1500.0, 15000.0, 12000.0, 3000.0, 80.0);

  INSERT INTO dbo.GiaoDichThanhToan (maGiaoDich, maBenhNhan, maLuotKham, maQuyetToan, loaiGiaoDich, phuongThuc, soTien, thoiDiemGiaoDich, trangThai, maNhanVienXacNhan, maCaTruc, ghiChu)
  VALUES ('GD-TT-261122-01', 'BN-240101-006', 'LK-261122-005', 'QT-261122-01', 'THANH_TOAN_TOAN_BO', 'TIEN_MAT', 74000.0, '2026-11-22T10:05:00', 'THANH_CONG', 'NV-TC01', 'CA-261122-01', N'Thanh toán phần đồng chi trả viện phí ngoại trú');

  -- Quyết toán chờ thanh toán cho Nguyễn Văn Minh (LK-261122-002)
  INSERT INTO dbo.QuyetToan (maQuyetToan, maLuotKham, phienBan, laBanHienHanh, thoiDiemChot, tongChiPhi, tienBHYTChiTra, tongMienGiam, trangThai, maNguoiChot)
  VALUES ('QT-261122-02', 'LK-261122-002', 1, 1, '2026-11-22T09:00:00', 495000.0, 396000.0, 0.0, 'CHUA_THANH_TOAN', 'NV-TC01');

  INSERT INTO dbo.ChiTietQuyetToan (maDongQuyetToan, maQuyetToan, loaiChiPhi, maLuotKhamNguon, soLuong, donGia, thanhTien, tienBHYT, tienBenhNhanTra, tyLeBHYT)
  VALUES 
  ('CTQT-004', 'QT-261122-02', 'KHAM_BENH', 'LK-261122-002', 1.0, 80000.0, 80000.0, 64000.0, 16000.0, 80.0),
  ('CTQT-005', 'QT-261122-02', 'CAN_LAM_SANG', 'LK-261122-002', 1.0, 50000.0, 50000.0, 40000.0, 10000.0, 80.0),
  ('CTQT-006', 'QT-261122-02', 'THUOC', 'LK-261122-002', 14.0, 25000.0, 350000.0, 280000.0, 70000.0, 80.0),
  ('CTQT-007', 'QT-261122-02', 'THUOC', 'LK-261122-002', 10.0, 1500.0, 15000.0, 12000.0, 3000.0, 80.0);


  -- 5. LỊCH HẸN KHÁM TÁI KHÁM & ĐẶT TRƯỚC (dbo.LichHen)
  INSERT INTO dbo.LichHen (maHen, maBenhNhan, maKhoa, maBuong, maBacSiDuKien, ngayHen, gioHenDuKien, maQRCheckIn, soTienTraTruoc, trangThai, thoiDiemDat, maNguoiXacNhan)
  VALUES 
  ('LH-261125-01', 'BN-240101-001', 'NOI', 'PK-NOI', 'NV-BS01', '2026-11-25', '09:00:00', 'QR-LH-261125-01', 0.0, 'DA_DAT', '2026-11-22T08:35:00', 'NV-QT01'),
  ('LH-261126-02', 'BN-240101-002', 'NOI', 'PK-NOI', 'NV-BS01', '2026-11-26', '08:30:00', 'QR-LH-261126-02', 0.0, 'DA_DAT', '2026-11-22T09:00:00', 'NV-QT01'),
  ('LH-261127-03', 'BN-240101-004', 'TIM', 'PK-TIM', 'NV-BS02', '2026-11-27', '10:00:00', 'QR-LH-261127-03', 0.0, 'DA_DAT', '2026-11-22T09:30:00', 'NV-QT01');


  -- 6. BỆNH ÁN ĐIỆN TỬ (dbo.BenhAnDienTu)
  INSERT INTO dbo.BenhAnDienTu (maBenhAn, maBenhNhan, maDotDieuTri, loaiBenhAn, ngayTao, maBacSiLap, trangThai)
  VALUES ('BA-DT-261122-01', 'BN-240101-001', 'BA-261121-EA9A', 'NOI_TRU', '2026-11-22T08:00:00', 'NV-BS01', 'DANG_LAP');

  COMMIT;
  SELECT N'SUCCESS';
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
  END CATCH
  `;

  const result = await querySql(sql);
  console.log('KẾT QUẢ SEED CSDL:', result);
}

seedEnterpriseData().catch(console.error);
