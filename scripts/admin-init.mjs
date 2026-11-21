import { migration,querySql,loadState,insertState } from '../server/admin-store.mjs';
import { catalogMigration } from '../server/admin-catalogs.mjs';
import { initialState } from '../server/admin-domain.mjs';
export async function initializeAdmin() {
  const username=process.env.ADMIN_USERNAME||'admin',name=process.env.ADMIN_NAME||'Quản trị viên',email=process.env.ADMIN_EMAIL;
  if(!email||!process.env.ADMIN_PASSWORD)throw new Error('Cần ADMIN_EMAIL và ADMIN_PASSWORD (12–128 ký tự) trong môi trường hoặc .env.local.');
  // Validate credentials before any schema change. Never replace an existing account.
  const state=await initialState({username,name,email,password:process.env.ADMIN_PASSWORD});
  const tables=await querySql("SELECT COUNT(*) FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo') AND name IN('Khoa','NhanVien','BuongKham','BuongBenh','GiuongBenh','DichVuKyThuat')");
  if(Number(tables)!==6)throw new Error('Cần database theo QuanLyBenhVien_SQLServer.sql trước khi khởi tạo quản trị.');
  await querySql(migration);
  await querySql(catalogMigration+" SELECT 'ok';");
  if(!await loadState())await insertState(state);
  return {username};
}
if(process.argv[1]&&import.meta.url===new URL('file:///'+process.argv[1].replaceAll('\\','/')).href) {
  initializeAdmin().then(()=>console.log('Đã khởi tạo quản trị; tài khoản có sẵn được giữ nguyên.')).catch(()=>{console.error('Khởi tạo thất bại. Kiểm tra SQL Server, ADMIN_EMAIL và ADMIN_PASSWORD; không có mật khẩu mặc định.');process.exitCode=1;});
}
