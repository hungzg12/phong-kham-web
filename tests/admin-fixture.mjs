import {businessPermissions} from '../src/business-permissions.js';
import {transactAdmin} from '../server/admin-store.mjs';
import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { querySql } from '../server/admin-store.mjs';
import { initializeAdmin } from '../scripts/admin-init.mjs';
import { createProductionServer } from '../server/start.mjs';

export async function adminFixture() {
 const database='MediCareQA_Admin_'+randomBytes(8).toString('hex');
 if(!/^MediCareQA_Admin_[a-f0-9]{16}$/.test(database))throw new Error('Unsafe test database');
 const base=process.env.MEDICARE_TEST_SQL_BASE||'Server=.\\SQLEXPRESS;Integrated Security=True;TrustServerCertificate=True;Connect Timeout=5';
 if(/Database\s*=|Initial Catalog\s*=/i.test(base))throw new Error('MEDICARE_TEST_SQL_BASE must not select a database');
 process.env.MEDICARE_SQL_CONNECTION=base+';Database=master';
 await querySql(`CREATE DATABASE [${database}]; SELECT 'ok';`);
 process.env.MEDICARE_SQL_CONNECTION=base+';Database='+database;
 let schema=await fs.readFile(new URL('../database/QuanLyBenhVien_SQLServer.sql',import.meta.url),'utf8');
 schema=schema.replace(/^\uFEFF/,'').replaceAll('QuanLyBenhVien',database);
 for(const batch of schema.split(/^\s*GO\s*$/mi))if(batch.trim())await querySql(batch);
 const password='Qa!'+randomBytes(18).toString('hex');
 process.env.ADMIN_USERNAME='qaadmin';process.env.ADMIN_NAME='QA Administrator';process.env.ADMIN_EMAIL='qa@example.test';process.env.ADMIN_PASSWORD=password;
 await initializeAdmin();
 await transactAdmin(data=>{data.roles.find(r=>r.id==='admin').permissions.push(...businessPermissions);});
 const server=createProductionServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}`;
 console.log(`TEST DATABASE ${database} (retained for evidence; no existing database modified)`);
 return {database,password,url,server,close:()=>new Promise(resolve=>server.close(resolve))};
}
