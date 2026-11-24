import { querySql } from '../server/admin-store.mjs';

async function updateConstraint() {
  const sql = `
  DECLARE @cName sysname;
  SELECT @cName = name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.LuotKham') AND definition LIKE '%trangThai%';
  IF @cName IS NOT NULL
  BEGIN
    EXEC('ALTER TABLE dbo.LuotKham DROP CONSTRAINT ' + @cName);
  END
  ALTER TABLE dbo.LuotKham ADD CONSTRAINT CK_LuotKham_TrangThai 
  CHECK (trangThai IN ('CHO_KHAM', 'DANG_KHAM', 'CHO_KET_QUA_CLS', 'DA_CO_KET_QUA', 'CHO_THANH_TOAN', 'CHO_PHAT_THUOC', 'CHO_NHAP_VIEN', 'TAM_HOAN', 'HOAN_TAT_KHAM', 'DA_HUY'));
  `;
  await querySql(sql);
  console.log('CONSTRAINT UPDATED SUCCESSFULLY!');
  const res = await querySql("SELECT name, definition FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.LuotKham') FOR JSON PATH");
  console.log(res);
  process.exit(0);
}

updateConstraint().catch(err => {
  console.error(err);
  process.exit(1);
});
