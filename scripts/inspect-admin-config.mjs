import { querySql } from '../server/admin-store.mjs';

const parse = async (query) => {
  const raw = await querySql(query, {}, {rows: true});
  try {
    return JSON.parse(raw);
  } catch (e) {
    return raw;
  }
};

async function main() {
  console.log('=== 1. TAI KHOAN ===');
  const tk = await parse("SELECT * FROM dbo.TaiKhoan");
  console.log('TaiKhoan (' + tk.length + '):', tk);

  console.log('=== 1.1 NHAN VIEN ===');
  const nv = await parse("SELECT * FROM dbo.NhanVien");
  console.log('NhanVien (' + nv.length + '):', nv);

  console.log('=== 2. KHOA & PHONG KHAM ===');
  const khoa = await parse("SELECT * FROM dbo.Khoa");
  console.log('Khoa (' + khoa.length + '):', khoa);
  const buongKham = await parse("SELECT * FROM dbo.BuongKham");
  console.log('BuongKham (' + buongKham.length + '):', buongKham);

  console.log('=== 3. BUONG BENH & GIUONG BENH ===');
  const buongBenh = await parse("SELECT * FROM dbo.BuongBenh");
  console.log('BuongBenh (' + buongBenh.length + '):', buongBenh);
  const giuong = await parse("SELECT * FROM dbo.GiuongBenh");
  console.log('GiuongBenh (' + giuong.length + '):', giuong);

  console.log('=== 4. DICH VU KY THUAT ===');
  const dv = await parse("SELECT * FROM dbo.DichVuKyThuat");
  console.log('DichVuKyThuat (' + dv.length + '):', dv);

  console.log('=== 5. HANG HOA Y TE (THUOC) ===');
  const thuoc = await parse("SELECT * FROM dbo.HangHoaYTe");
  console.log('HangHoaYTe (' + thuoc.length + '):', thuoc);

  console.log('=== 6. KHO DUOC ===');
  const kho = await parse("SELECT * FROM dbo.KhoDuoc");
  console.log('KhoDuoc (' + kho.length + '):', kho);

  console.log('=== 7. THIET BI Y TE ===');
  try {
    const tb = await parse("SELECT * FROM dbo.MediCareEquipment");
    console.log('MediCareEquipment (' + tb.length + '):', tb);
  } catch(e) {
    console.log('MediCareEquipment error:', e.message);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
