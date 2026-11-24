import fs from 'node:fs/promises';
import XLSX from 'xlsx';
import {fileURLToPath} from 'node:url';
import {querySql} from '../server/admin-store.mjs';
const saved=JSON.parse(await fs.readFile(new URL('../.data/QA_TEST_workspace_session.json',import.meta.url),'utf8'));
if(!/^MediCareQA_Admin_[a-f0-9]{16}$/.test(saved.database))throw Error('Only QA database allowed');
process.env.MEDICARE_SQL_CONNECTION='Server=.\\SQLEXPRESS;Integrated Security=True;TrustServerCertificate=True;Connect Timeout=5;Database='+saved.database;
const wb=XLSX.readFile(fileURLToPath(new URL('../database/Danh_Muc_ICD10_Chuan_Bo_Y_Te.xlsx',import.meta.url)));
const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]).map(r=>({code:r['Mã ICD-10'],name:r['Tên bệnh (Tiếng Việt)'],english:r['Tên quốc tế (English)'],chapter:r['Mã chương'],chapterName:r['Tên chương bệnh'],common:r['Bệnh thường gặp (1=Có, 0=Không)']===1}));
if(rows.length!==202||new Set(rows.map(r=>r.code)).size!==rows.length)throw Error('Invalid dictionary');
console.log(await querySql(`SET XACT_ABORT ON;BEGIN TRAN;
IF DB_NAME()<>@database THROW 51000,'Wrong database',1;
INSERT dbo.DanhMucICD10(maICD,tenBenh,tenTiengAnh,maChuong,tenChuong,dangHoatDong)
SELECT j.code,j.name,j.english,j.chapter,j.chapterName,1 FROM OPENJSON(@rows) WITH(code varchar(20),name nvarchar(350),english nvarchar(350),chapter varchar(10),chapterName nvarchar(250),common bit) j
WHERE NOT EXISTS(SELECT 1 FROM dbo.DanhMucICD10 d WHERE d.maICD=j.code);
DECLARE @added int=@@ROWCOUNT;COMMIT;SELECT @added;`,{database:saved.database,rows:JSON.stringify(rows)}));
console.log(await querySql("SELECT maICD,tenBenh FROM dbo.DanhMucICD10 WHERE maICD='M25.5' AND dangHoatDong=1 FOR JSON PATH"));
console.log('active count',await querySql('SELECT COUNT(*) FROM dbo.DanhMucICD10 WHERE dangHoatDong=1'));
