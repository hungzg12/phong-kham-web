import {businessPermissions} from '../src/business-permissions.js';
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {adminFixture} from './admin-fixture.mjs';
import {querySql,transactAdmin} from '../server/admin-store.mjs';
import {hashPassword} from '../server/admin-domain.mjs';
import {createAdminMiddleware} from '../server/admin-api.mjs';
import {createApiMiddleware} from '../server/api-router.mjs';
import {receivePatient} from '../server/clinic-flow.mjs';
let fixture,server,base,own,other;const sessions={};
const actors=['receptionist','doctor','nurse','technician','pharmacist','cashier','patient'];
const get=(path,role,options={})=>fetch(base+path,{...options,headers:{...(role?{cookie:sessions[role].cookie}:{}),...options.headers}});
const post=(path,role,data,headers={})=>get(path,role,{method:'POST',headers:{'content-type':'application/json','x-csrf-token':sessions[role].csrf,...headers},body:JSON.stringify(data)});
async function login(role){const response=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:role==='admin'?'qaadmin':'qa_test_'+role,password:fixture.password})});assert.equal(response.status,200);const body=await response.json();sessions[role]={cookie:response.headers.get('set-cookie').split(';')[0],csrf:body.csrf};}
before(async()=>{
 fixture=await adminFixture();
 await querySql(`INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('NOI',N'Nội tổng quát','KHAM_BENH'),('TIM',N'Tim mạch','KHAM_BENH');
 INSERT dbo.BuongKham(maBuong,maKhoa,tenBuong) VALUES('QA_TEST_OWN','NOI',N'QA_TEST_OWN'),('QA_TEST_OTHER','TIM',N'QA_TEST_OTHER');
 INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('QA_TEST_REC',N'QA_TEST_REC','NOI',N'Tiếp tân','QUAN_TRI'),('QA_TEST_DOC',N'QA_TEST_DOC','NOI',N'Bác sĩ','BAC_SI'),('QA_TEST_DOC2',N'QA_TEST_DOC2','TIM',N'Bác sĩ','BAC_SI'),('QA_TEST_NURSE',N'QA_TEST_NURSE','NOI',N'Điều dưỡng','DIEU_DUONG'),('QA_TEST_TECH',N'QA_TEST_TECH','NOI',N'Kỹ thuật viên','KY_THUAT_VIEN'),('QA_TEST_PHARM',N'QA_TEST_PHARM','NOI',N'Dược sĩ','DUOC_SI'),('QA_TEST_CASH',N'QA_TEST_CASH','NOI',N'Thu ngân','THU_NGAN');
 INSERT dbo.PhanCongKham(maPhanCong,maBuong,maBacSi,ngayKham,caKham) VALUES('QA_TEST_1','QA_TEST_OWN','QA_TEST_DOC',CONVERT(date,SYSDATETIME()),'SANG'),('QA_TEST_2','QA_TEST_OWN','QA_TEST_DOC',CONVERT(date,SYSDATETIME()),'CHIEU'),('QA_TEST_3','QA_TEST_OTHER','QA_TEST_DOC2',CONVERT(date,SYSDATETIME()),'SANG'),('QA_TEST_4','QA_TEST_OTHER','QA_TEST_DOC2',CONVERT(date,SYSDATETIME()),'CHIEU');
 INSERT dbo.BenhNhan(maBenhNhan,hoTen,ngaySinh,gioiTinh,soDienThoai) VALUES('QA_TEST_PAT_A',N'QA_TEST_PAT_A','1990-01-01',N'Nam','0900000901'),('QA_TEST_PAT_B',N'QA_TEST_PAT_B','1991-01-01',N'Nữ','0900000902');
 INSERT dbo.HangHoaYTe(maHang,tenHang,loaiHang,donViCoSo) VALUES('QA_TEST_DRUG',N'QA_TEST_DRUG','THUOC',N'Viên');
 INSERT dbo.Thuoc(maHang,hoatChat,hamLuong,duongDung,dangBaoChe) VALUES('QA_TEST_DRUG',N'QA_TEST',N'QA_TEST',N'Uống',N'QA_TEST');SELECT 'ok';`);
 own=await receivePatient({patientId:'QA_TEST_PAT_A',dept:'Nội tổng quát'});other=await receivePatient({patientId:'QA_TEST_PAT_B',dept:'Tim mạch'});
 const passwordHash=await hashPassword(fixture.password);const staff={receptionist:'QA_TEST_REC',doctor:'QA_TEST_DOC',nurse:'QA_TEST_NURSE',technician:'QA_TEST_TECH',pharmacist:'QA_TEST_PHARM',cashier:'QA_TEST_CASH'};
 await transactAdmin(data=>{for(const role of actors){const existing=data.roles.find(r=>r.id===role);if(existing)existing.permissions=[...businessPermissions];if(!data.roles.some(r=>r.id===role))data.roles.push({id:role,name:role,permissions:[...businessPermissions],active:true,version:1});data.accounts.push({id:'QA_TEST_'+role,username:'qa_test_'+role,name:'QA_TEST_'+role,email:'qa@example.test',roleId:role,staffId:staff[role]||'',patientId:role==='patient'?'QA_TEST_PAT_A':'',active:true,version:1,authVersion:1,passwordHash});}});
 const admin=createAdminMiddleware(),api=createApiMiddleware();server=http.createServer((req,res)=>admin(req,res,()=>api(req,res,()=>{res.writeHead(404);res.end('{}')})));await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
 for(const role of ['admin',...actors])await login(role);
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(fixture)await fixture.close();});

 test('equipment API keeps existing admin-only permissions and rejects forged identities and CSRF',async()=>{
  assert.equal((await get('/api/equipment')).status,401);
  for(const role of actors)assert.equal((await get('/api/equipment',role)).status,403);
  const draft={action:'saveEquipment',name:'QA_TEST HTTP device',serial:'QA_TEST_HTTP_SERIAL',department:'Nội tổng quát',nextService:'2027-01-01',requestId:randomUUID()};
  assert.equal((await post('/api/equipment/action','admin',draft,{'x-csrf-token':'invalid'})).status,403);
  assert.equal((await post('/api/equipment/action','nurse',draft)).status,403);
  assert.equal((await post('/api/equipment/action','admin',{...draft,senderId:'QA_TEST_OTHER'})).status,400);
  const response=await post('/api/equipment/action','admin',draft);assert.equal(response.status,200,await response.clone().text());
  const saved=await response.json();const retry=await post('/api/equipment/action','admin',draft);assert.equal((await retry.json()).id,saved.id);
  assert.ok((await (await get('/api/equipment','admin')).json()).equipment.some(e=>e.id===saved.id));
 });

test('anonymous requests cannot read clinical, pharmacy, finance, legacy APIs or spoof session fields',async()=>{
 for(const route of ['/api/patients','/api/queue','/api/ancillary','/api/finance','/api/pharmacy/state','/api/portal','/api/inpatient/beds','/api/workspace/session','/api/billing/statement','/api/clinical/orders'])assert.equal((await get(route)).status,401,route);
 assert.equal((await get('/api/health')).status,200);
});
test('all eight roles restore their identity from SQL session and enforce read API matrix',async()=>{
 const allowed={admin:['/api/appointments','/api/finance','/api/pharmacy/state'],receptionist:['/api/appointments'],doctor:['/api/queue','/api/pharmacy/state'],nurse:['/api/queue','/api/inpatient/beds','/api/pharmacy/state'],technician:['/api/ancillary'],pharmacist:['/api/pharmacy/state'],cashier:['/api/finance'],patient:['/api/portal','/api/appointments']};
 for(const role of ['admin',...actors]){
  let r=await get('/api/workspace/session?role=admin&staffId=QA_TEST_DOC2',role);assert.equal(r.status,200);const who=await r.json();assert.equal(who.role,role);if(role==='patient')assert.equal(who.patientId,'QA_TEST_PAT_A');
  for(const path of ['/api/appointments','/api/finance','/api/portal','/api/pharmacy/state']){r=await get(path,role);const expected=allowed[role].includes(path)?200:403;assert.equal(r.status,expected,role+' '+path);}
  for(const path of allowed[role])assert.equal((await get(path,role)).status,200,role+' '+path);
 }
});
test('every role including admin needs explicit grants; removal affects the existing cookie immediately',async()=>{
 const paths={admin:'/api/appointments',receptionist:'/api/appointments',doctor:'/api/queue',nurse:'/api/inpatient/beds',technician:'/api/ancillary',pharmacist:'/api/pharmacy/state',cashier:'/api/finance',patient:'/api/portal'};
 for(const role of ['admin',...actors]){
  let old=[];await transactAdmin(d=>{const r=d.roles.find(r=>r.id===role);old=[...r.permissions];r.permissions=[];});
  assert.equal((await get(paths[role],role)).status,403,role+' must not inherit access');
  const who=await(await get('/api/workspace/session',role)).json();assert.deepEqual(who.permissions,[]);
  await transactAdmin(d=>{d.roles.find(r=>r.id===role).permissions=old;});
  assert.equal((await get(paths[role],role)).status,200,role+' explicit grants restored');
 }
});

test('doctor list, detail, prescriptions and writes are limited to assigned episodes despite spoofing',async()=>{
 let r=await get('/api/queue?history=1','doctor'),queue=await r.json();assert.ok(queue.some(v=>v.id===own.visitId));assert.ok(!queue.some(v=>v.id===other.visitId));
 r=await get('/api/patients','doctor');const p=await r.json();assert.deepEqual(p.map(x=>x.id),['QA_TEST_PAT_A']);
 assert.equal((await get('/api/clinical/visit?id='+other.visitId,'doctor')).status,403);
 const payload={action:'savePrescription',role:'admin',staffId:'QA_TEST_DOC2',patient:'QA_TEST_PAT_A',episodeId:own.visitId,diagnosis:'QA_TEST',lines:[{medicine:'QA_TEST_DRUG',quantity:1,dose:'QA_TEST',route:'Uống',frequency:'QA_TEST',days:1}],requestId:randomUUID()};
 r=await post('/api/pharmacy/action','doctor',payload);assert.equal(r.status,200);const result=await r.json();assert.equal(await querySql('SELECT maBacSiKe FROM dbo.DonThuoc WHERE maDon=@id',{id:result.id}),'QA_TEST_DOC');
 assert.equal((await post('/api/pharmacy/action','doctor',{...payload,episodeId:other.visitId,patient:'QA_TEST_PAT_B',requestId:randomUUID()})).status,403);
});
test('patient is bound to actual linked ID rather than BN0001, body, query or phone',async()=>{
 let r=await get('/api/portal?patientId=QA_TEST_PAT_B','patient');let data=await r.json();assert.equal(data.patient.id,'QA_TEST_PAT_A');assert.ok(data.history.every(v=>v.id===own.visitId));
 r=await get('/api/patients?patientId=QA_TEST_PAT_B','patient');data=await r.json();assert.deepEqual(data.map(p=>p.id),['QA_TEST_PAT_A']);
 r=await post('/api/portal/appointments','patient',{action:'create',patientId:'QA_TEST_PAT_B',role:'admin',dept:'Nội tổng quát',day:'2026-12-03',time:'08:30'});assert.equal(r.status,200);const appt=await r.json();assert.equal(appt.patientId,'QA_TEST_PAT_A');
 assert.equal((await post('/api/finance/action','patient',{role:'cashier',staffId:'QA_TEST_CASH',action:'openShift',requestId:randomUUID(),name:'QA_TEST',opening:0})).status,403);
});
test('CSRF, cross-origin, incompatible actions and unsupported legacy writes are rejected before database mutation',async()=>{
 const input={action:'openShift',role:'cashier',staffId:'QA_TEST_CASH',requestId:randomUUID(),name:'QA_TEST',opening:0};
 assert.equal((await post('/api/finance/action','cashier',input,{'x-csrf-token':'wrong'})).status,403);
 assert.equal((await post('/api/finance/action','cashier',input,{origin:'https://attacker.invalid'})).status,403);
 assert.equal((await post('/api/pharmacy/action','nurse',{action:'dispense',role:'pharmacist',staffId:'QA_TEST_PHARM'})).status,403);
 assert.equal((await post('/api/pharmacy/action','pharmacist',{action:'approvePrescription',role:'doctor',staffId:'QA_TEST_DOC',requestId:randomUUID(),id:'QA_TEST'})).status,403);
 assert.equal((await post('/api/labs/action','doctor',{role:'technician',staffId:'QA_TEST_TECH'})).status,403);
 assert.equal((await post('/api/inpatient/discharge','receptionist',{})).status,403);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.BaoCaoVienPhi')),0);
});
test('cashier staff identity comes from session, persists across reload and logout revokes cookie',async()=>{
 let r=await post('/api/finance/action','cashier',{action:'openShift',role:'admin',staffId:'QA_TEST_DOC',requestId:randomUUID(),name:'QA_TEST_SHIFT',opening:0});assert.equal(r.status,200);
 r=await get('/api/finance','cashier');const data=await r.json();assert.equal(data.shifts[0].cashier,'QA_TEST_CASH');
 r=await post('/api/auth/logout','cashier',{});assert.equal(r.status,200);assert.equal((await get('/api/finance','cashier')).status,401);
});
test('merged queue actions use saved permissions, assigned doctor and controlled transitions',async()=>{
 const patch=(role,data)=>get('/api/visits',role,{method:'PATCH',headers:{'content-type':'application/json','x-csrf-token':sessions[role].csrf},body:JSON.stringify(data)});
 assert.equal((await patch('doctor',{visitId:other.visitId,action:'call_next',role:'admin'})).status,403);
 assert.equal((await patch('doctor',{visitId:own.visitId,action:'call_next'})).status,200);
 assert.equal(await querySql('SELECT trangThai FROM dbo.LuotKham WHERE maLuotKham=@id',{id:own.visitId}),'DANG_KHAM');
 assert.equal((await patch('doctor',{visitId:own.visitId,action:'defer',reason:'QA_TEST absent'})).status,200);
 assert.equal(await querySql('SELECT trangThai FROM dbo.LuotKham WHERE maLuotKham=@id',{id:own.visitId}),'TAM_HOAN');
 assert.equal((await patch('doctor',{visitId:own.visitId,action:'restore'})).status,200);
 assert.equal((await patch('doctor',{visitId:own.visitId,action:'dispatch',status:'DA_CO_KET_QUA'})).status,403);
 assert.equal((await patch('technician',{visitId:own.visitId,action:'dispatch',status:'DA_CO_KET_QUA'})).status,403);
 let old;await transactAdmin(d=>{const r=d.roles.find(r=>r.id==='doctor');old=[...r.permissions];r.permissions=r.permissions.filter(p=>p!=='biz.exam:save');});
 assert.equal((await patch('doctor',{visitId:own.visitId,action:'call_next',permissions:['biz.exam:save']})).status,403);
 await transactAdmin(d=>{d.roles.find(r=>r.id==='doctor').permissions=old;});
});

test('each of eight roles needs saved grants; live revocation and same-role doctor scope stay enforced',async()=>{
 const endpoints={admin:'/api/equipment',receptionist:'/api/appointments',doctor:'/api/queue',nurse:'/api/inpatient/beds',technician:'/api/ancillary',pharmacist:'/api/pharmacy/state',cashier:'/api/finance',patient:'/api/portal'};
 // The cashier logged out in the previous test; restore the session explicitly.
 await login('cashier');
 for(const [role,path] of Object.entries(endpoints)){
  let before;
  await transactAdmin(data=>{const row=data.roles.find(r=>r.id===role);before=[...row.permissions];row.permissions=row.permissions.filter(p=>!p.startsWith('biz.'));row.version=(row.version||0)+1;});
  assert.equal((await get(path,role)).status,403,role+' without grants');
  await transactAdmin(data=>{data.roles.find(r=>r.id===role).permissions=before;});
  assert.equal((await get(path,role)).status,200,role+' restored grants');
 }
 await transactAdmin(data=>{const original=data.accounts.find(a=>a.id==='QA_TEST_doctor');data.accounts.push({...original,id:'QA_TEST_doctor2',username:'qa_test_doctor2',staffId:'QA_TEST_DOC2'});});
 await login('doctor2');
 const first=await(await get('/api/workspace/session','doctor')).json(),second=await(await get('/api/workspace/session','doctor2')).json();assert.deepEqual(first.permissions,second.permissions);
 assert.equal((await get('/api/clinical/visit?id='+own.visitId,'doctor2')).status,403);
 assert.equal((await get('/api/clinical/visit?id='+other.visitId,'doctor')).status,403);
});

test('staff deactivation and changed account role revoke existing workspace access',async()=>{
 await querySql("UPDATE dbo.NhanVien SET dangLamViec=0 WHERE maNhanVien='QA_TEST_TECH';SELECT 'ok';");assert.equal((await get('/api/ancillary','technician')).status,403);
 await transactAdmin(data=>{const u=data.accounts.find(u=>u.id==='QA_TEST_nurse');u.active=false;u.authVersion++;});assert.equal((await get('/api/queue','nurse')).status,401);
});
