import { querySql } from '../server/admin-store.mjs';

async function checkCurrentIds() {
  const patients = await querySql('SELECT maBenhNhan, hoTen, soDinhDanh, soBHYT FROM dbo.BenhNhan ORDER BY maBenhNhan', {}, { rows: true });
  const visits = await querySql('SELECT maLuotKham, maBenhNhan, maBuong, trangThai, thoiDiemDangKy FROM dbo.LuotKham ORDER BY maLuotKham', {}, { rows: true });
  const admissions = await querySql('SELECT maDotDieuTri, maBenhNhan, maKhoaDieuTri, trangThai, thoiDiemNhapVien, maBacSiDieuTriChinh FROM dbo.DotDieuTri ORDER BY maDotDieuTri', {}, { rows: true });
  const staff = await querySql('SELECT maNhanVien, hoTen, chucDanh, chuyenMon, maKhoa FROM dbo.NhanVien ORDER BY maNhanVien', {}, { rows: true });
  const warehouses = await querySql('SELECT maKho, tenKho, loaiKho FROM dbo.KhoDuoc ORDER BY maKho', {}, { rows: true });
  const medicines = await querySql('SELECT maHang, tenHang, donViCoSo, donGiaXuatCoSo FROM dbo.HangHoaYTe ORDER BY maHang', {}, { rows: true });
  const lots = await querySql('SELECT maLoTon, maLoHang, maKho, soLuongTon, soLuongKhaDung FROM dbo.LoTonKho ORDER BY maLoTon', {}, { rows: true });

  console.log('=== PATIENTS ===', JSON.stringify(patients));
  console.log('=== VISITS ===', JSON.stringify(visits));
  console.log('=== ADMISSIONS ===', JSON.stringify(admissions));
  console.log('=== STAFF ===', JSON.stringify(staff));
  console.log('=== WAREHOUSES ===', JSON.stringify(warehouses));
  console.log('=== MEDICINES ===', JSON.stringify(medicines));
  console.log('=== LOTS ===', JSON.stringify(lots));
}

checkCurrentIds().catch(console.error);
