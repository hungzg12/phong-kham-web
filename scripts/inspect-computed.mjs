import { querySql } from '../server/admin-store.mjs';

async function main() {
  const sql = `
    SELECT 
      t.name AS tableName, 
      c.name AS columnName,
      cc.definition
    FROM sys.computed_columns cc
    JOIN sys.tables t ON cc.object_id = t.object_id
    JOIN sys.columns c ON cc.object_id = c.object_id AND cc.column_id = c.column_id
    ORDER BY t.name, c.name
  `;
  const res = await querySql(sql, {}, { rows: true });
  console.log('COMPUTED COLUMNS:', res);
}

main().catch(console.error);
