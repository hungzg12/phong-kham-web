import { querySql } from '../server/admin-store.mjs';

async function main() {
  const tables = await querySql("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME FOR JSON PATH");
  console.log('Tables:', tables);
  const sampleLabs = await querySql("SELECT TOP 5 * FROM dbo.ChiTietChiDinh FOR JSON PATH");
  console.log('ChiTietChiDinh:', sampleLabs);
}
main();
