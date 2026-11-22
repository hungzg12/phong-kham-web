import { querySql } from '../server/admin-store.mjs';

async function main() {
  const sql = `
    UPDATE dbo.ChiDinhCLS SET loaiUuTien = 'THUONG' WHERE loaiUuTien = 'CAP_CUU';
    UPDATE dbo.KhoDuoc 
    SET tenKho = N'Tủ Trực Dược Khoa Nội 24/7', viTri = N'Phòng trực Khoa Nội tổng quát'
    WHERE maKho = 'TU_TRUC_CAP_CUU';
    SELECT maKho, tenKho, viTri FROM dbo.KhoDuoc;
  `;
  const r = await querySql(sql, {}, { rows: true });
  console.log('KhoDuoc after update:', r);
}

main().catch(console.error);
