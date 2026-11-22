import { querySql } from '../server/admin-store.mjs';

async function inspectColumns() {
  const tables = [
    'DonThuoc', 'ChiTietDonThuoc', 
    'ToDieuTri', 'YLenh', 'LanThucHienYLenh', 
    'PhieuKho', 'ChiTietPhieuKho', 'SoKho',
    'BaoCaoVienPhi', 'QuyetToan', 'ChiTietQuyetToan', 'GiaoDichThanhToan',
    'LichHen', 'BenhAnDienTu'
  ];
  
  for (const table of tables) {
    const cols = await querySql(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName
      ORDER BY ORDINAL_POSITION
    `, { tableName: table }, { rows: true });
    console.log(`=== TABLE: dbo.${table} ===`);
    console.log(JSON.stringify(cols, null, 2));
  }
}

inspectColumns().catch(console.error);
