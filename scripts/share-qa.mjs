import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {querySql} from '../server/admin-store.mjs';
import {createAdminMiddleware} from '../server/admin-api.mjs';
import {createApiMiddleware} from '../server/api-router.mjs';
const project=fileURLToPath(new URL('../',import.meta.url));
const saved=JSON.parse(fs.readFileSync(path.join(project,'.data/QA_TEST_workspace_session.json'),'utf8'));
if(!/^MediCareQA_Admin_[a-f0-9]{16}$/.test(saved.database))throw new Error('Only an isolated QA database may be shared');
const base=process.env.MEDICARE_TEST_SQL_BASE||'Server=.\\SQLEXPRESS;Integrated Security=True;TrustServerCertificate=True;Connect Timeout=5';
if(/Database\s*=|Initial Catalog\s*=/i.test(base))throw new Error('QA base connection must not select a database');
process.env.MEDICARE_SQL_CONNECTION=base+';Database='+saved.database;
process.env.NODE_ENV='production';delete process.env.MEDICARE_ALLOW_HTTP;delete process.env.MEDICARE_PUBLIC_ORIGIN;
await querySql("SELECT 'ok'");
const root=path.resolve(project,'dist'),admin=createAdminMiddleware(),api=createApiMiddleware();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Cache-Control','no-store');
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/__qa/')||url.pathname.startsWith('/.')){res.writeHead(404);res.end();return;}
  await admin(req,res,()=>api(req,res,()=>{
   if(!['GET','HEAD'].includes(req.method)||url.pathname.startsWith('/api/')){res.writeHead(404);res.end();return;}
   let decoded;try{decoded=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
   const file=decoded==='/'||decoded==='/index.html'?path.join(root,'index.html'):path.resolve(root,'.'+decoded);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  }));
 }catch{if(!res.headersSent)res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Dịch vụ tạm thời không khả dụng.'}));}
}).listen(52797,'127.0.0.1',()=>console.log('SHARE_QA_READY http://127.0.0.1:52797'));
