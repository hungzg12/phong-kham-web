import { querySql } from '../server/admin-store.mjs';

async function main() {
  const r = await querySql("SELECT maBenhNhan, hoTen, soDienThoai FROM dbo.BenhNhan", {}, { rows: true });
  console.log('All Patients:', r);
}

main().catch(console.error);
