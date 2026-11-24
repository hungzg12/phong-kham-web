// Apply new queue states only to the explicitly saved, isolated QA database.
import fs from 'node:fs';
import {querySql} from '../server/admin-store.mjs';
const saved=JSON.parse(fs.readFileSync(new URL('../.data/QA_TEST_workspace_session.json',import.meta.url),'utf8'));
if(!/^MediCareQA_Admin_[a-f0-9]{16}$/.test(saved.database))throw new Error('Saved isolated QA database required');
process.env.MEDICARE_SQL_CONNECTION='Server=.\\SQLEXPRESS;Integrated Security=True;TrustServerCertificate=True;Database='+saved.database;
await querySql(`SET XACT_ABORT ON;BEGIN TRAN;
DECLARE @lock int;EXEC @lock=sys.sp_getapplock @Resource='MediCareVisitStatusMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
IF @lock<0 THROW 51000,'Migration lock unavailable',1;
DECLARE @constraints int,@name sysname;
SELECT @constraints=COUNT(*),@name=MAX(name) FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.LuotKham') AND definition LIKE '%trangThai%';
IF @constraints<>1 THROW 51000,'Review the visit status constraint before migration',1;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.LuotKham') AND definition LIKE '%TAM_HOAN%')
BEGIN
 IF EXISTS(SELECT 1 FROM dbo.LuotKham WHERE trangThai NOT IN('CHO_KHAM','DANG_KHAM','CHO_KET_QUA_CLS','DA_CO_KET_QUA','CHO_THANH_TOAN','CHO_PHAT_THUOC','CHO_NHAP_VIEN','TAM_HOAN','HOAN_TAT_KHAM','DA_HUY')) THROW 51000,'Existing visit states require review',1;
 DECLARE @ddl nvarchar(max)=N'ALTER TABLE dbo.LuotKham DROP CONSTRAINT '+QUOTENAME(@name);EXEC(@ddl);
 ALTER TABLE dbo.LuotKham WITH CHECK ADD CONSTRAINT CK_LuotKham_TrangThai CHECK(trangThai IN('CHO_KHAM','DANG_KHAM','CHO_KET_QUA_CLS','DA_CO_KET_QUA','CHO_THANH_TOAN','CHO_PHAT_THUOC','CHO_NHAP_VIEN','TAM_HOAN','HOAN_TAT_KHAM','DA_HUY'));
END;
COMMIT;SELECT 'QA visit states verified';`).then(console.log);
