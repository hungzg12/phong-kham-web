import { querySql, loadState } from '../server/admin-store.mjs';
import { receivePatient } from '../server/clinic-flow.mjs';

async function main() {
  const existing = JSON.parse(await querySql("SELECT maBenhNhan FROM dbo.BenhNhan WHERE maBenhNhan=@id FOR JSON PATH", { id: 'BN-240101-001' }) || '[]');
  if (!existing.length) {
    console.log('>>> Tạo hồ sơ bệnh nhân BN-240101-001 (Lê Thị Thu Hương) cho tài khoản benhnhan...');
    await querySql(`
      INSERT dbo.BenhNhan(maBenhNhan, hoTen, ngaySinh, gioiTinh, soDienThoai, soDinhDanh, soBHYT, diaChi, tienSuBenh, diUngThuoc, trangThaiDiUng)
      VALUES('BN-240101-001', N'Lê Thị Thu Hương', '1974-05-12', N'Nữ', '0903123456', '079174001234', 'HT2790123456789', N'124 Nguyễn Trãi, Phường 3, Quận 5, TP. Hồ Chí Minh', N'Tăng huyết áp vô căn', N'Penicillin', 'CO_DI_UNG');
      SELECT 'ok';
    `);
  } else {
    console.log('>>> Hồ sơ BN-240101-001 đã tồn tại.');
  }

  const visits = JSON.parse(await querySql("SELECT maLuotKham, soThuTu, trangThai FROM dbo.LuotKham WHERE maBenhNhan=@id FOR JSON PATH", { id: 'BN-240101-001' }) || '[]');
  if (!visits.length) {
    console.log('>>> Tạo lượt khám tiếp nhận mới cho BN-240101-001 để cấp số thứ tự...');
    const res = await receivePatient({
      patientId: 'BN-240101-001',
      dept: 'Nội tổng quát',
      reason: 'Khám kiểm tra sức khỏe định kỳ & theo dõi huyết áp'
    });
    console.log('>>> Đã cấp số thứ tự:', res.queueTag, 'Phòng:', res.roomName, 'Bác sĩ:', res.doctor);
  } else {
    console.log('>>> Đã có lượt khám:', visits);
  }

  const state = await loadState();
  const bn = state.data.accounts.find(a => a.username === 'benhnhan');
  console.log('>>> Tài khoản benhnhan:', bn?.username, 'patientId:', bn?.patientId, 'active:', bn?.active);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
