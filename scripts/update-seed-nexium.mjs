import fs from 'fs';

const p = 'phong-kham-web/database/Seed_DuLieuMau_LoThuoc.sql';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(
  "('LTK_006', 'KHO_TONG', 'LO_NEX_2026_OK', 2500.0000, 2500.0000, N'Dãy B - Kệ 04', 0),",
  "('LTK_006', 'KHO_TONG', 'LO_NEX_2026_OK', 2000.0000, 2000.0000, N'Dãy B - Kệ 04', 0),\n        ('LTK_009', 'KHO_NGOAI_TRU', 'LO_NEX_2026_OK', 500.0000, 500.0000, N'Tủ lẻ 02 - Ngăn tiêu hóa', 0),"
);
fs.writeFileSync(p, c, 'utf8');
console.log('Updated Seed_DuLieuMau_LoThuoc.sql');
