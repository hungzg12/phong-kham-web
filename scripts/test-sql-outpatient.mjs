import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import {hashPassword} from './auth-api.mjs';
import {chromium} from 'playwright';

assert.match(process.env.MEDICARE_SQL_CONNECTION??'',/Database=MediCareQA_[0-9a-f]{32};/i,'Use an isolated QA database');
const base='http://127.0.0.1:5198';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5198','--strictPort'],{stdio:'ignore',windowsHide:true});
async function api(path,body,token=''){
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:token},body:body&&JSON.stringify(body)});
  return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')};
}
const password = randomBytes(32).toString('base64url');
async function provision(username) {
  const child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/sql-auth.ps1']);
  child.stdin.end(JSON.stringify({action:'provision',username,passwordHash:await hashPassword(password)}));
  const [code]=await once(child,'close');
  assert.equal(code,0);
}
async function login(username) {
  const result=await api('/api/auth/login',{username,password});
  assert.equal(result.status,200,JSON.stringify(result));
  assert.match(result.cookie,/HttpOnly; SameSite=Strict/);
  assert(!('passwordHash' in result.body));
  return result.cookie.split(';')[0];
}
try{
  let ready=false;
  for(let i=0;i<35;i++){
    try{if((await fetch(base)).ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  assert(ready);
  assert.equal((await api('/api/auth/login',{username:'qa-reception',password})).status,401);
  await provision('qa-reception');
  await provision('qa-doctor');
  assert.equal((await api('/api/auth/login',{username:'qa-doctor',password:'wrong'})).status,401);
  assert.equal((await api('/api/appointments')).status,401);
  const reception=await login('qa-reception');
  const doctor=await login('qa-doctor');
  assert.equal((await api('/api/auth/session',undefined,reception)).body.role,'receptionist');
  assert.equal((await api('/api/appointments',undefined,doctor)).status,403);
  const extraSession=await login('qa-doctor');
  assert.equal((await api('/api/auth/logout',{},extraSession)).status,200);
  assert.equal((await api('/api/auth/session',undefined,extraSession)).status,401);
  const browser=await chromium.launch({channel:'msedge'});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.goto(base+'/#management');
    await page.getByLabel('Tên đăng nhập').fill('qa-reception');
    await page.getByLabel('Mật khẩu').fill('wrong');
    await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Tên đăng nhập hoặc mật khẩu không đúng.'}).waitFor();
    await page.getByLabel('Mật khẩu').fill(password);
    await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
    await page.getByRole('heading',{name:'Quầy tiếp đón'}).waitFor();
    await page.reload();
    await page.getByRole('heading',{name:'Quầy tiếp đón'}).waitFor();
    await page.getByRole('button',{name:'Đăng xuất'}).click();
    await page.getByRole('heading',{name:'Đăng nhập',exact:true}).waitFor();
  } finally { await browser.close(); }
  console.log('PASS đăng nhập SQL: tài khoản khóa, mật khẩu sai, phiên, phân quyền và đăng xuất trên giao diện.');
  assert.deepEqual((await api('/api/appointments',undefined,reception)).body,[]);
  const booking={name:'MediCare kiểm thử',phone:'0900000001',dept:'Tim mạch',birth:'1990-01-01',day:process.env.MEDICARE_QA_DAY,time:'08:30',gender:'Nam'};
  const created=await api('/api/appointments',booking);
  assert.equal(created.status,201,JSON.stringify(created));
  assert.equal((await api('/api/appointments',booking)).status,409);
  const tomorrow=new Date(booking.day+'T12:00:00Z');
  tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
  const future=await api('/api/appointments',{...booking,day:tomorrow.toISOString().slice(0,10)});
  assert.equal(future.status,201,JSON.stringify(future));
  const invalidDay=await api('/api/outpatient/check-in',{id:future.body.id,reason:'Kiểm thử sai ngày'},reception);
  assert.equal(invalidDay.status,409,JSON.stringify(invalidDay));
  const schedule=(await api('/api/appointments',undefined,reception)).body;
  assert.equal(schedule.find(a=>a.id===future.body.id).canCheckIn,false);
  assert.equal(schedule.find(a=>a.id===created.body.id).possibleDuplicate,true);
  const checkIn={id:created.body.id,reason:'Kiểm thử bàn giao ngoại trú'};
  assert.equal((await api('/api/outpatient/check-in',checkIn,doctor)).status,403);
  const results=await Promise.all([api('/api/outpatient/check-in',checkIn,reception),api('/api/outpatient/check-in',checkIn,reception)]);
  assert(results.every(r=>r.status===200),JSON.stringify(results));
  assert.deepEqual(results[0].body,results[1].body);
  const {visitId,queueNumber}=results[0].body;
  assert.equal(queueNumber,1);
  const again=(await api('/api/appointments',undefined,reception)).body;
  assert.equal(again.length,2);
  const checked=again.find(a=>a.id===created.body.id);
  assert.equal(checked.visitId,visitId);
  assert.equal(checked.status,'DA_CHECK_IN');
  const exam='/api/outpatient/exam';
  assert.equal((await api(exam,{action:'list'},reception)).status,403);
  const queue=await api(exam,{action:'list'},doctor);
  assert.equal(queue.status,200);
  assert.equal(queue.body.find(v=>v.id===visitId)?.patientName,booking.name);
  const start=await api(exam,{action:'start',visit:visitId},doctor);
  assert.equal(start.status,200,JSON.stringify(start));
  const finish=await api(exam,{action:'finish',visit:visitId,history:'Dữ liệu tổng hợp',conclusion:'Hoàn tất kiểm thử'},doctor);
  assert.equal(finish.status,200,JSON.stringify(finish));
  const retry=await api(exam,{action:'finish',visit:visitId,conclusion:'Không ghi đè'},doctor);
  assert.equal(retry.status,409,JSON.stringify(retry));
  const fresh=(await api(exam,{action:'list'},doctor)).body.find(v=>v.id===visitId);
  assert.equal(fresh.status,'HOAN_TAT_KHAM');
  assert.equal(fresh.conclusion,'Hoàn tất kiểm thử');
  console.log('PASS SQL: đặt lịch, chống đặt trùng, tiếp đón đồng thời, phân quyền, bàn giao và kết luận lưu bền.');
}finally{
  if(server.exitCode===null){const done=once(server,'exit');server.kill();await done;}
}
