import { existsSync,readFileSync,writeFileSync,mkdirSync,readdirSync } from 'node:fs';
import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {randomBytes} from 'node:crypto';import pg from 'pg';
const run=promisify(execFile),root=process.cwd(),dir=path.join(root,'.data','postgres'),config=path.join(root,'.env.local');
const pgRoot=path.join(process.env.ProgramFiles||'C:/Program Files','PostgreSQL');
const version=existsSync(pgRoot)?readdirSync(pgRoot).sort().reverse().find(v=>existsSync(path.join(pgRoot,v,'bin','initdb.exe'))):null;
if(!version)throw new Error('Chưa tìm thấy PostgreSQL. Cài PostgreSQL hoặc cấu hình DATABASE_URL trong .env.local.');
const bin=path.join(pgRoot,version,'bin');mkdirSync(path.dirname(dir),{recursive:true});
if(process.argv.includes('--stop')){await run(path.join(bin,'pg_ctl.exe'),['-D',dir,'stop','-m','fast'],{windowsHide:true});console.log('Đã dừng PostgreSQL riêng của dự án.');process.exit(0);}
let env=existsSync(config)?readFileSync(config,'utf8'):'';
const configured=env.match(/^DATABASE_URL=(.+)$/m);
if(configured){const url=new URL(configured[1].trim());if(url.hostname!=='127.0.0.1'||url.port!=='55432'||!existsSync(path.join(dir,'PG_VERSION'))){console.log('Using configured PostgreSQL. Local cluster initialization skipped.');process.exit(0);}}

if(!existsSync(path.join(dir,'PG_VERSION'))){
 const password=randomBytes(24).toString('hex'),passwordFile=path.join(root,'.data','init-password.tmp');writeFileSync(passwordFile,password);
 try{await run(path.join(bin,'initdb.exe'),['-D',dir,'--username=antam',`--pwfile=${passwordFile}`,'--auth=scram-sha-256','--encoding=UTF8','--locale=C'],{windowsHide:true,timeout:60000});}finally{const {unlinkSync}=await import('node:fs');unlinkSync(passwordFile);}
 if(/DATABASE_URL=.+/m.test(env))throw new Error('Đã có DATABASE_URL riêng. Không ghi đè cấu hình hiện có.');
 env=env.replace(/^DATABASE_URL=.*$/m,'');env+=`\nDATABASE_URL=postgresql://antam:${password}@127.0.0.1:55432/antam_clinic\n`;
 if(!/^SESSION_SECRET=.{32,}/m.test(env))env+=`SESSION_SECRET=${randomBytes(48).toString('hex')}\n`;
 if(!/^DEMO_MODE=/m.test(env))env+='DEMO_MODE=true\n';writeFileSync(config,env);
}
try{await run(path.join(bin,'pg_ctl.exe'),['-D',dir,'status'],{windowsHide:true});}catch{await run(path.join(bin,'pg_ctl.exe'),['-D',dir,'-l',path.join(root,'.data','postgres.log'),'-o','-h 127.0.0.1 -p 55432','-w','-t','20','start'],{windowsHide:true,timeout:30000});}
const match=readFileSync(config,'utf8').match(/^DATABASE_URL=(.+)$/m);if(!match)throw new Error('Thiếu DATABASE_URL.');const url=new URL(match[1].trim());url.pathname='/postgres';const client=new pg.Client({connectionString:url.toString()});await client.connect();
try{if(!(await client.query('SELECT 1 FROM pg_database WHERE datname=$1',['antam_clinic'])).rows.length)await client.query('CREATE DATABASE antam_clinic');}finally{await client.end();}
console.log('PostgreSQL riêng của An Tâm đang chạy tại 127.0.0.1:55432. Cấu hình đã lưu trong .env.local (không đưa vào Git).');
