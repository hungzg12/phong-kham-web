import {qaLoginAccounts} from './qa-login-accounts.mjs';
// Reopens the existing QA account database without recreating accounts/passwords.
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {querySql} from '../server/admin-store.mjs';
import {createAdminMiddleware} from '../server/admin-api.mjs';
import {createApiMiddleware} from '../server/api-router.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const saved=JSON.parse(await fs.readFile(new URL('../.data/QA_TEST_workspace_session.json',import.meta.url),'utf8'));
if(!/^MediCareQA_Admin_[a-f0-9]{16}$/.test(saved.database))throw new Error('Only the saved isolated QA database can be opened');
const base=process.env.MEDICARE_TEST_SQL_BASE||'Server=.\\SQLEXPRESS;Integrated Security=True;TrustServerCertificate=True;Connect Timeout=5';
if(/Database\s*=|Initial Catalog\s*=/i.test(base))throw new Error('The QA base connection must not select a database');
process.env.MEDICARE_SQL_CONNECTION=base+';Database='+saved.database;
await querySql("SELECT 'ok'");
const vite=await createServer({configFile:false,root,server:{host:'127.0.0.1',port:52796,strictPort:true},plugins:[{name:'saved-qa-accounts',configureServer(server){server.middlewares.use(qaLoginAccounts());server.middlewares.use(createAdminMiddleware());server.middlewares.use(createApiMiddleware());}}]});
await vite.listen();saved.pid=process.pid;await fs.writeFile(new URL('../.data/QA_TEST_workspace_session.json',import.meta.url),JSON.stringify(saved));console.log('Saved MediCare accounts: http://127.0.0.1:52796/#management');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await vite.close();process.exit(0);});
