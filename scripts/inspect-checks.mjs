import { querySql } from '../server/admin-store.mjs';

async function main() {
  const sql = `
    SELECT t.name AS tableName, cc.name AS constraintName, cc.definition
    FROM sys.check_constraints cc
    JOIN sys.tables t ON cc.parent_object_id = t.object_id
    WHERE t.name IN ('ChiTietQuyetToan', 'QuyetToan', 'GiaoDichThanhToan', 'BaoCaoVienPhi', 'SoKho', 'ChiTietPhieuKho', 'PhieuKho', 'LanThucHienYLenh', 'YLenh', 'ToDieuTri', 'ChiTietDonThuoc', 'DonThuoc', 'LichHen', 'BenhAnDienTu')
    ORDER BY t.name
  `;
  const r = await querySql(sql, {}, { rows: true });
  console.log(r);
}

main().catch(console.error);
