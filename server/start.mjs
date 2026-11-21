import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAdminMiddleware } from './admin-api.mjs';
import { querySql,loadState } from './admin-store.mjs';

const root=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const middleware=createAdminMiddleware();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
export function createProductionServer() {
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
  if(req.url.split('?')[0]==='/api/health') {
   try{await querySql("SELECT 'ok'");const ready=!!await loadState();res.writeHead(ready?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({status:ready?'ok':'setup-required',database:'SQL Server',scope:'administration'}));}
   catch{res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({status:'unavailable'}));}return;
  }
  await middleware(req,res,()=>{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname.startsWith('/api/')){res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'API nghiệp vụ cũ chưa được bật trong máy chủ quản trị production.'}));return;}
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
   let decoded;try{decoded=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
   const target=path.resolve(root,'.'+decoded);
   if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
   let file=target;try{if(!fs.statSync(file).isFile())file=path.join(root,'admin.html');}catch{file=path.join(root,'admin.html');}
   if(path.extname(file)==='.html')file=path.join(root,'admin.html');
   if(!fs.existsSync(file)){res.writeHead(503);res.end('Run npm run build first');return;}
   // Production entry always opens authenticated administration. Legacy demo is
   // available exclusively through Vite dev, never through this server.
   if(path.basename(file)==='admin.html') {
    const html=fs.readFileSync(file,'utf8');
    res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"});res.end(req.method==='HEAD'?undefined:html);return;
   }
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':url.pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache'});
   if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  });
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const port=Number(process.env.PORT||5180),host=process.env.HOST||'127.0.0.1';
 createProductionServer().listen(port,host,()=>console.log(`MediCare administration: http://${host}:${port}`));
}
