import fs from 'node:fs/promises';
import {querySql} from '../server/admin-store.mjs';
const saved=JSON.parse(await fs.readFile(new URL('../.data/QA_TEST_workspace_session.json',import.meta.url),'utf8'));
if(!/^MediCareQA_Admin_[a-f0-9]{16}$/.test(saved.database))throw Error('Requires isolated QA database');
process.env.MEDICARE_SQL_CONNECTION='Server=.\\SQLEXPRESS;Integrated Security=True;TrustServerCertificate=True;Connect Timeout=5;Database='+saved.database;
const items=[
 ['QA_DEMO_CBC','[Mẫu QA] Tổng phân tích tế bào máu','XET_NGHIEM','XET_NGHIEM'],
 ['QA_DEMO_GLU','[Mẫu QA] Glucose máu','XET_NGHIEM','XET_NGHIEM'],
 ['QA_DEMO_CRE','[Mẫu QA] Creatinin máu','XET_NGHIEM','XET_NGHIEM'],
 ['QA_DEMO_URINE','[Mẫu QA] Tổng phân tích nước tiểu','XET_NGHIEM','XET_NGHIEM'],
 ['QA_DEMO_US','[Mẫu QA] Siêu âm ổ bụng','CDHA','MO_TA'],
 ['QA_DEMO_XR','[Mẫu QA] X-quang ngực','CDHA','MO_TA'],
 ['QA_DEMO_DRESS','[Mẫu QA] Thay băng','THU_THUAT','MO_TA']
].map(([id,name,kind,result])=>({id,name,kind,result}));
console.log(await querySql(`SET XACT_ABORT ON; BEGIN TRAN;
IF DB_NAME()<>@database THROW 51000,'Wrong database',1;
DECLARE @dept varchar(30)=(SELECT TOP 1 maKhoa FROM dbo.Khoa WHERE dangHoatDong=1 ORDER BY maKhoa);
IF @dept IS NULL THROW 51000,'No active department',1;
INSERT dbo.DichVuKyThuat(maDichVu,tenDichVu,maKhoaThucHien,loaiDichVu,loaiKetQua,donGia)
SELECT j.id,j.name,@dept,j.kind,j.result,10000 FROM OPENJSON(@items) WITH(id varchar(30),name nvarchar(255),kind varchar(30),result varchar(30)) j
WHERE NOT EXISTS(SELECT 1 FROM dbo.DichVuKyThuat d WHERE d.maDichVu=j.id);
COMMIT;
SELECT maDichVu id,tenDichVu name,loaiDichVu kind,donGia price FROM dbo.DichVuKyThuat WHERE maDichVu LIKE 'QA_DEMO_%' FOR JSON PATH;`,{database:saved.database,items:JSON.stringify(items)}));
