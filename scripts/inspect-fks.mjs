import { querySql } from '../server/admin-store.mjs';

async function main() {
  const sql = `
    SELECT 
      t.name AS tableName,
      fk.name AS fkName,
      COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS colName,
      OBJECT_NAME(fkc.referenced_object_id) AS refTable,
      COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS refCol
    FROM sys.foreign_keys fk
    JOIN sys.tables t ON fk.parent_object_id = t.object_id
    JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    WHERE t.name IN ('DonThuoc', 'ChiTietDonThuoc', 'ToDieuTri', 'YLenh', 'LanThucHienYLenh', 'PhieuKho', 'ChiTietPhieuKho', 'SoKho', 'BaoCaoVienPhi', 'QuyetToan', 'ChiTietQuyetToan', 'GiaoDichThanhToan', 'LichHen', 'BenhAnDienTu')
    ORDER BY t.name, fk.name
  `;
  const res = await querySql(sql, {}, { rows: true });
  console.log(res);
}

main().catch(console.error);
