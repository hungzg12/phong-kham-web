import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAdminMiddleware} from '../server/admin-api.mjs';
import {createApiMiddleware} from '../server/api-router.mjs';
import {querySql} from '../server/admin-store.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const saved=JSON.parse(await fs.readFile(path.join(root,'.data/QA_TEST_workspace_session.json'),'utf8'));
if(!/^MediCareQA_Admin_[a-f0-9]{16}$/.test(saved.database))throw Error('QA database required');
process.env.MEDICARE_SQL_CONNECTION='Server=.\\SQLEXPRESS;Integrated Security=True;TrustServerCertificate=True;Connect Timeout=5;Database='+saved.database;
process.env.NODE_ENV='production';delete process.env.MEDICARE_ALLOW_HTTP;delete process.env.MEDICARE_PUBLIC_ORIGIN;
await querySql("SELECT 'ok'");
const dist=path.join(root,'dist'),admin=createAdminMiddleware(),api=createApiMiddleware();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
 const pathname=new URL(req.url,'http://localhost').pathname;
 // Explicit public demo sharing requested by the owner. Only disposable QA accounts.
 if(pathname==='/__qa/login-accounts'&&req.method==='GET'){
  fs.readFile(path.join(root,'.data/medicare-8-passwords.csv'),'utf8').then(csv=>{
   const accounts=csv.trim().split(/\r?\n/).slice(1).map(line=>{
    const cells=(line.match(/"(?:[^"]|"")*"/g)||[]).map(v=>v.slice(1,-1).replaceAll('""','"'));
    if(cells.length!==4||!cells[2].startsWith('qa_test_'))throw Error('Invalid QA account file');
    return {label:cells[0],username:cells[2],password:cells[3]};
   });
   res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({accounts}));
  }).catch(()=>{res.writeHead(404);res.end('{}');});return;
 }
 if(pathname.startsWith('/api/'))return admin(req,res,()=>api(req,res,()=>{res.writeHead(404);res.end('Not found');}));
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 if(pathname.startsWith('/.')||pathname.startsWith('/__')||pathname.startsWith('/src/')||pathname.startsWith('/scripts/')||pathname.startsWith('/server/')){res.writeHead(404);res.end();return;}
 let requested;try{requested=decodeURIComponent(pathname);}catch{res.writeHead(400);res.end();return;}
 const file=path.resolve(dist,'.'+(requested==='/'?'/index.html':requested));
 if(!file.startsWith(dist+path.sep)){res.writeHead(404);res.end();return;}
 fs.readFile(file).then(bytes=>{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':path.extname(file)==='.html'?'no-store':'public, max-age=3600'});res.end(req.method==='HEAD'?undefined:bytes);}).catch(()=>{res.writeHead(404);res.end('Not found');});
});
server.listen(5188,'127.0.0.1',()=>console.log('Demo share listening on 127.0.0.1:5188 (authentication required)'));
