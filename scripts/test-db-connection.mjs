import sql from 'mssql';

const configs = [
  // 1. Windows Auth on local instance MSSQLVESE
  {
    server: '127.0.0.1',
    database: 'QuanLyBenhVien',
    options: {
      trustServerCertificate: true,
      trustedConnection: true,
    }
  },
  // 2. Named instance with trusted connection
  {
    server: 'localhost\\MSSQLVESE',
    database: 'QuanLyBenhVien',
    options: {
      trustServerCertificate: true,
      trustedConnection: true,
    }
  }
];

async function test() {
  for (const cfg of configs) {
    try {
      console.log('Testing connection to:', cfg.server);
      const pool = await sql.connect(cfg);
      const result = await pool.request().query('SELECT @@SERVERNAME AS srv, DB_NAME() AS db, COUNT(*) AS count_tables FROM INFORMATION_SCHEMA.TABLES');
      console.log('SUCCESS!', result.recordset);
      await pool.close();
      return;
    } catch (err) {
      console.log('Failed for config:', cfg.server, err.message);
    }
  }
}

test();
