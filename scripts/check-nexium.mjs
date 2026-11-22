import { querySql } from '../server/admin-store.mjs';

async function updateStock() {
  try {
    await querySql(`
      BEGIN TRANSACTION;
      -- Update KHO_TONG
      UPDATE dbo.LoTonKho
      SET soLuongTon = 2000.0000, soLuongKhaDung = 2000.0000
      WHERE maLoTon = 'LTK_006';

      -- Add KHO_NGOAI_TRU if not exists
      IF NOT EXISTS (SELECT 1 FROM dbo.LoTonKho WHERE maLoTon = 'LTK_009')
      BEGIN
        INSERT INTO dbo.LoTonKho (maLoTon, maKho, maLoHang, soLuongTon, soLuongKhaDung, viTriDayKe, trangThaiKhoa)
        VALUES ('LTK_009', 'KHO_NGOAI_TRU', 'LO_NEX_2026_OK', 500.0000, 500.0000, N'Tủ lẻ 02 - Ngăn tiêu hóa', 0);
      END
      ELSE
      BEGIN
        UPDATE dbo.LoTonKho
        SET soLuongTon = 500.0000, soLuongKhaDung = 500.0000
        WHERE maLoTon = 'LTK_009';
      END;

      COMMIT TRANSACTION;
    `);
    console.log('Successfully allocated 500 units of Nexium to KHO_NGOAI_TRU');
    const rows = await querySql(`
      SELECT ltk.maLoTon, ltk.maKho, k.tenKho, lh.maHang, ltk.soLuongTon, ltk.soLuongKhaDung
      FROM dbo.LoTonKho ltk
      JOIN dbo.KhoDuoc k ON k.maKho = ltk.maKho
      JOIN dbo.LoHang lh ON lh.maLoHang = ltk.maLoHang
      WHERE lh.maHang = 'TH_NEXIUM40'
      FOR JSON PATH
    `);
    console.log('Nexium in LoTonKho now:', rows);
  } catch (e) {
    console.error('Error updating stock:', e);
  }
}
updateStock();
