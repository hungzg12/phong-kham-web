import { querySql } from '../server/admin-store.mjs';
async function test() {
  const r = await querySql(`SELECT t.maLoTon, t.maKho, k.tenKho, t.viTriDayKe, h.soLoNhaSanXuat FROM dbo.LoTonKho t JOIN dbo.KhoDuoc k ON k.maKho = t.maKho JOIN dbo.LoHang h ON h.maLoHang = t.maLoHang FOR JSON PATH`);
  console.log('LoTonKho rows:', JSON.parse(r || '[]'));
}
test();
