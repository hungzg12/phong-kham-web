import { querySql } from './admin-store.mjs';
import { fail, validate } from './admin-domain.mjs';

export const catalogs = {
 departments:{table:'Khoa',id:'maKhoa',fields:{name:'tenKhoa',kind:'loaiKhoa',location:'viTri',active:'dangHoatDong'}},
 rooms:{table:'BuongKham',id:'maBuong',fields:{name:'tenBuong',departmentId:'maKhoa',capacity:'gioiHanLuotMoiNgay',location:'viTri',active:'dangHoatDong'}},
 wards:{table:'BuongBenh',id:'maBuongBenh',fields:{name:'tenBuong',departmentId:'maKhoa',kind:'loaiBuong',capacity:'soGiuongToiDa',location:'viTri',active:'dangHoatDong'}},
 beds:{table:'GiuongBenh',id:'maGiuong',fields:{name:'soHieuGiuong',wardId:'maBuongBenh',kind:'loaiGiuong',price:'donGiaNgay',status:'trangThaiHienTai',active:'dangHoatDong'}},
 staff:{table:'NhanVien',id:'maNhanVien',fields:{name:'hoTen',departmentId:'maKhoa',title:'chucDanh',specialty:'chuyenMon',certificate:'soChungChiHanhNghe',phone:'soDienThoai',email:'email',active:'dangLamViec'}},
 services:{table:'DichVuKyThuat',id:'maDichVu',fields:{name:'tenDichVu',departmentId:'maKhoaThucHien',kind:'loaiDichVu',resultType:'loaiKetQua',price:'donGia',insurancePrice:'giaBHYT',duration:'thoiGianTrungBinhPhut',active:'dangHoatDong'}}
};
export const catalogMigration = Object.values(catalogs).map(c => `IF OBJECT_ID('dbo.${c.table}','U') IS NOT NULL AND COL_LENGTH('dbo.${c.table}','medicareVersion') IS NULL ALTER TABLE dbo.${c.table} ADD medicareVersion rowversion;`).join('\n') + `
IF OBJECT_ID('dbo.MediCareServicePriceHistory','U') IS NULL
 CREATE TABLE dbo.MediCareServicePriceHistory(id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),serviceId varchar(20) NOT NULL,price decimal(18,2) NOT NULL,insurancePrice decimal(18,2) NOT NULL,effectiveAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),actor nvarchar(100) NOT NULL);
`;
const projection = c => `[${c.id}] AS id,${Object.entries(c.fields).map(([key,col])=>`[${col}] AS [${key}]`).join(',')},CONVERT(varchar(18),CONVERT(varbinary(8),medicareVersion),1) AS version`;
export async function catalogRows(resource) {
  const c=catalogs[resource];
  return JSON.parse(await querySql(`SELECT (SELECT ${projection(c)} FROM dbo.[${c.table}] ORDER BY [${c.id}] FOR JSON PATH)` )||'[]');
}
export async function catalogRow(resource,id) {
  const c=catalogs[resource];
  return JSON.parse(await querySql(`SELECT (SELECT ${projection(c)} FROM dbo.[${c.table}] WHERE [${c.id}]=@id FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)`,{id})||'null');
}

// These guards run in the SAME transaction as the write. SQL locks also protect
// against concurrent legacy clinical requests that do not use the admin API.
function guards(resource,creating) {
  const sql=[];
  if(['staff','rooms','wards','services'].includes(resource)) sql.push(`IF NOT EXISTS(SELECT 1 FROM dbo.Khoa WITH(UPDLOCK,HOLDLOCK) WHERE maKhoa=JSON_VALUE(@record,'$.departmentId') AND dangHoatDong=1) THROW 51001,'ADMIN_REFERENCE',1;`);
  if(resource==='beds') sql.push(`
    IF NOT EXISTS(SELECT 1 FROM dbo.BuongBenh WITH(UPDLOCK,HOLDLOCK) WHERE maBuongBenh=JSON_VALUE(@record,'$.wardId') AND dangHoatDong=1) THROW 51001,'ADMIN_REFERENCE',1;
    IF EXISTS(SELECT 1 FROM dbo.GiuongBenh WITH(UPDLOCK,HOLDLOCK) WHERE maBuongBenh=JSON_VALUE(@record,'$.wardId') AND soHieuGiuong=JSON_VALUE(@record,'$.name') AND maGiuong<>@recordId) THROW 51002,'ADMIN_DUPLICATE',1;
    IF JSON_VALUE(@record,'$.active')='true' AND
     (SELECT COUNT(*) FROM dbo.GiuongBenh WITH(UPDLOCK,HOLDLOCK) WHERE maBuongBenh=JSON_VALUE(@record,'$.wardId') AND dangHoatDong=1 AND maGiuong<>@recordId) >=
     (SELECT soGiuongToiDa FROM dbo.BuongBenh WHERE maBuongBenh=JSON_VALUE(@record,'$.wardId')) THROW 51003,'ADMIN_CAPACITY',1;`);
  if(creating) return sql.join('\n');
  if(resource==='beds') sql.push(`IF EXISTS(SELECT 1 FROM dbo.PhanGiuong WITH(UPDLOCK,HOLDLOCK) WHERE maGiuong=@recordId AND denThoiDiem IS NULL AND trangThai='DANG_SU_DUNG') OR EXISTS(SELECT 1 FROM dbo.GiuongBenh WITH(UPDLOCK,HOLDLOCK) WHERE maGiuong=@recordId AND trangThaiHienTai IN('DANG_SU_DUNG','DANG_VE_SINH')) THROW 51004,'ADMIN_IN_USE',1;`);
  if(resource==='wards') sql.push(`IF TRY_CONVERT(int,JSON_VALUE(@record,'$.capacity')) < (SELECT COUNT(*) FROM dbo.GiuongBenh WITH(UPDLOCK,HOLDLOCK) WHERE maBuongBenh=@recordId AND dangHoatDong=1) THROW 51003,'ADMIN_CAPACITY',1;`);
  const inactive="JSON_VALUE(@record,'$.active')='false'";
  if(resource==='departments') sql.push(`IF ${inactive} AND (
   EXISTS(SELECT 1 FROM dbo.NhanVien WITH(UPDLOCK,HOLDLOCK) WHERE maKhoa=@recordId AND dangLamViec=1) OR
   EXISTS(SELECT 1 FROM dbo.BuongKham WITH(UPDLOCK,HOLDLOCK) WHERE maKhoa=@recordId AND dangHoatDong=1) OR
   EXISTS(SELECT 1 FROM dbo.BuongBenh WITH(UPDLOCK,HOLDLOCK) WHERE maKhoa=@recordId AND dangHoatDong=1) OR
   EXISTS(SELECT 1 FROM dbo.DichVuKyThuat WITH(UPDLOCK,HOLDLOCK) WHERE maKhoaThucHien=@recordId AND dangHoatDong=1) OR
   EXISTS(SELECT 1 FROM dbo.DotDieuTri WITH(UPDLOCK,HOLDLOCK) WHERE maKhoaDieuTri=@recordId AND trangThai IN('DANG_DIEU_TRI','CHO_XUAT_VIEN'))
   ) THROW 51004,'ADMIN_IN_USE',1;`);
  if(resource==='rooms') sql.push(`IF ${inactive} AND (
    EXISTS(SELECT 1 FROM dbo.LichHen WITH(UPDLOCK,HOLDLOCK) WHERE maBuong=@recordId AND trangThai IN('DA_DAT','DA_CHECK_IN')) OR
    EXISTS(SELECT 1 FROM dbo.LuotKham WITH(UPDLOCK,HOLDLOCK) WHERE maBuong=@recordId AND trangThai IN('CHO_KHAM','DANG_KHAM','CHO_KET_QUA_CLS'))
    ) THROW 51004,'ADMIN_IN_USE',1;`);
  if(resource==='wards') sql.push(`IF ${inactive} AND EXISTS(SELECT 1 FROM dbo.GiuongBenh WITH(UPDLOCK,HOLDLOCK) WHERE maBuongBenh=@recordId AND dangHoatDong=1) THROW 51004,'ADMIN_IN_USE',1;`);
  if(resource==='staff') sql.push(`IF ${inactive} AND (
    EXISTS(SELECT 1 FROM dbo.DotDieuTri WITH(UPDLOCK,HOLDLOCK) WHERE maBacSiDieuTriChinh=@recordId AND trangThai IN('DANG_DIEU_TRI','CHO_XUAT_VIEN')) OR
    EXISTS(SELECT 1 FROM dbo.LichHen WITH(UPDLOCK,HOLDLOCK) WHERE maBacSiDuKien=@recordId AND trangThai IN('DA_DAT','DA_CHECK_IN')) OR
    EXISTS(SELECT 1 FROM dbo.Khoa WITH(UPDLOCK,HOLDLOCK) WHERE maTruongKhoa=@recordId AND dangHoatDong=1)
    ) THROW 51004,'ADMIN_IN_USE',1;`);
  if(resource==='services') sql.push(`IF ${inactive} AND EXISTS(SELECT 1 FROM dbo.ChiTietChiDinh ct WITH(UPDLOCK,HOLDLOCK) JOIN dbo.ChiDinhCLS cd WITH(UPDLOCK,HOLDLOCK) ON cd.maChiDinh=ct.maChiDinh WHERE ct.maDichVu=@recordId AND cd.trangThai NOT IN('DA_HUY','HOAN_TAT','DA_TRA_KET_QUA')) THROW 51004,'ADMIN_IN_USE',1;`);
  return sql.join('\n');
}
export function catalogEffect(resource,input,previous,actor) {
  const creating=!previous,c=catalogs[resource],record=validate(resource,input,{create:creating});
  const id=previous?.id||record.id;
  if(!creating&&input.version!==previous.version) fail(409,'Bản ghi đã thay đổi. Tải lại trước khi lưu.');
  const columns=Object.entries(c.fields);
  const valueFor=key=>`JSON_VALUE(@record,'$.${key}')`;
  const typed=(key,col)=> key==='active'?`CASE WHEN ${valueFor(key)}='true' THEN 1 ELSE 0 END`:valueFor(key);
  let sql=guards(resource,creating);
  if(creating) sql+=`IF EXISTS(SELECT 1 FROM dbo.[${c.table}] WITH(UPDLOCK,HOLDLOCK) WHERE [${c.id}]=@recordId) THROW 51002,'ADMIN_DUPLICATE',1;
   INSERT dbo.[${c.table}]([${c.id}],${columns.map(([,col])=>`[${col}]`).join(',')}) VALUES(@recordId,${columns.map(([key,col])=>typed(key,col)).join(',')});`;
  else sql+=`UPDATE dbo.[${c.table}] SET ${columns.map(([key,col])=>`[${col}]=${typed(key,col)}`).join(',')} WHERE [${c.id}]=@recordId AND medicareVersion=CONVERT(binary(8),@expectedVersion,1);
    IF @@ROWCOUNT=0 THROW 51005,'ADMIN_STALE',1;`;
  if(resource==='services'&&(creating||record.price!==previous.price||record.insurancePrice!==previous.insurancePrice)) {
    sql+=`INSERT dbo.MediCareServicePriceHistory(serviceId,price,insurancePrice,actor) VALUES(@recordId,JSON_VALUE(@record,'$.price'),JSON_VALUE(@record,'$.insurancePrice'),@actorName);`;
  }
  return {record:{...record,id},sql,parameters:{recordId:id,record:JSON.stringify(record),expectedVersion:previous?.version||'',actorName:actor}};
}

export async function dashboard(from,to) {
  return JSON.parse(await querySql(`SELECT (SELECT
    (SELECT COUNT(*) FROM dbo.BenhNhan WHERE CAST(ngayTiepNhanDauTien AS date) BETWEEN @from AND @to) AS patients,
    (SELECT COUNT(*) FROM dbo.LuotKham WHERE ngayKham BETWEEN @from AND @to) AS visits,
    (SELECT COUNT(*) FROM dbo.LichHen WHERE ngayHen BETWEEN @from AND @to) AS appointments,
    (SELECT COALESCE(SUM(CASE WHEN loaiGiaoDich IN('HOAN_UNG','HOAN_VIEN_PHI') THEN -soTien ELSE soTien END),0) FROM dbo.GiaoDichThanhToan WHERE trangThai='THANH_CONG' AND CAST(thoiDiemGiaoDich AS date) BETWEEN @from AND @to) AS cashNet,
    (SELECT COUNT(*) FROM dbo.GiuongBenh WHERE dangHoatDong=1) AS beds,
    (SELECT COUNT(*) FROM dbo.GiuongBenh WHERE dangHoatDong=1 AND trangThaiHienTai='DANG_SU_DUNG') AS occupied,
    (SELECT COALESCE(SUM(soLuongTon),0) FROM dbo.LoTonKho) AS stock
    FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)`,{from,to}));
}
