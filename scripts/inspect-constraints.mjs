import { querySql } from '../server/admin-store.mjs';

async function inspectConstraints() {
  const query = `
    SELECT 
      tc.TABLE_NAME, 
      tc.CONSTRAINT_NAME, 
      tc.CONSTRAINT_TYPE, 
      cc.CHECK_CLAUSE
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    LEFT JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc 
      ON cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
    WHERE tc.TABLE_NAME IN (
      'DonThuoc', 'ChiTietDonThuoc', 'ToDieuTri', 'YLenh', 'LanThucHienYLenh',
      'PhieuKho', 'ChiTietPhieuKho', 'SoKho', 'BaoCaoVienPhi', 'QuyetToan',
      'GiaoDichThanhToan', 'LichHen', 'BenhAnDienTu'
    )
    ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_TYPE
  `;
  const result = await querySql(query, {}, { rows: true });
  console.log(JSON.stringify(result, null, 2));
}

inspectConstraints().catch(console.error);
