import { querySql } from '../server/admin-store.mjs';

async function checkTables() {
  const query = `
    SELECT t.name AS TableName, SUM(p.rows) AS RowCounts
    FROM sys.tables t
    INNER JOIN sys.partitions p ON t.object_id = p.object_id
    WHERE p.index_id IN (0,1) AND t.name NOT LIKE 'sys%'
    GROUP BY t.name
    ORDER BY SUM(p.rows) DESC, t.name ASC
  `;
  const result = await querySql(query, {}, { rows: true });
  console.log(JSON.stringify(result, null, 2));
}

checkTables().catch(console.error);
