import { before,after,test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { adminFixture } from './admin-fixture.mjs';
import { querySql,loadState } from '../server/admin-store.mjs';
import { createProductionServer } from '../server/start.mjs';
import { permissions } from '../src/admin-schema.js';
import { backupDatabase,restoreToNewDatabase } from '../scripts/admin-backup.mjs';
let fixture,admin,second,dept,room,ward,bed,staff,service,limited;
async function request(path,{method='GET',body,identity=admin,key=randomUUID(),headers={}}={}) {
 const response=await fetch(fixture.url+path,{method,headers:{...(body?{'Content-Type':'application/json','Idempotency-Key':key}:{}),...(identity?{Cookie:identity.cookie,'X-CSRF-Token':identity.csrf}:{}),...headers},body:body?JSON.stringify(body):undefined});
 const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}
 return {status:response.status,data,response};
}
async function login(username,password) {const r=await request('/api/auth/login',{method:'POST',identity:null,body:{username,password}});assert.equal(r.status,200,JSON.stringify(r.data));return {...r.data,cookie:r.response.headers.get('set-cookie').split(';')[0]};}
async function list(resource){const r=await request('/api/admin/'+resource+'?size=100');assert.equal(r.status,200,JSON.stringify(r.data));return r.data.rows;}
async function create(resource,body){const r=await request('/api/admin/'+resource,{method:'POST',body});assert.equal(r.status,201,JSON.stringify(r.data));return (await list(resource)).find(x=>x.id===r.data.id);}
async function update(resource,row,patch={}){return request('/api/admin/'+resource+'/'+row.id,{method:'PUT',body:{...row,...patch}});}
before(async()=>{fixture=await adminFixture();admin=await login('qaadmin',fixture.password);});
after(async()=>{if(fixture)await fixture.close();});

test('real SQL health, unauthorized access, production legacy API isolation',async()=>{
 assert.equal((await request('/api/health')).status,200);
 assert.equal((await request('/api/admin/accounts',{identity:null})).status,401);
 assert.equal((await request('/api/patients')).status,404);
 const html=await request('/#management');assert.match(html.data,/assets\/admin-/);assert.ok(!html.data.includes('assets/site-'));
});
test('login rejects incorrect password and untrusted Origin; write requires CSRF',async()=>{
 assert.equal((await request('/api/auth/login',{method:'POST',identity:null,body:{username:'qaadmin',password:'wrong'}})).status,401);
 assert.equal((await request('/api/auth/login',{method:'POST',identity:null,body:{username:'qaadmin',password:fixture.password},headers:{Origin:'https://attacker.example'}})).status,403);
 assert.equal((await request('/api/admin/roles',{method:'POST',body:{},headers:{'X-CSRF-Token':'wrong'}})).status,403);
});
test('last active administrator cannot be locked or demoted',async()=>{
 const row=(await list('accounts'))[0];assert.equal((await update('accounts',row,{active:false})).status,409);
 assert.equal((await update('accounts',row,{roleId:'doctor'})).status,409);
 const role=(await list('roles')).find(r=>r.id==='admin');assert.equal((await update('roles',role,{permissions:[]})).status,409);
});
test('catalog create, duplicate code, invalid number, invalid reference',async()=>{
 dept=await create('departments',{id:'QA_DEP',name:'Khoa kiểm thử',kind:'KHAM_BENH',location:'QA',active:true});
 assert.equal((await request('/api/admin/departments',{method:'POST',body:{...dept}})).status,409);
 assert.equal((await request('/api/admin/rooms',{method:'POST',body:{id:'BAD',name:'Bad',departmentId:'MISSING',capacity:10,location:'',active:true}})).status,409);
 assert.equal((await request('/api/admin/rooms',{method:'POST',body:{id:'BAD',name:'Bad',departmentId:dept.id,capacity:-1,location:'',active:true}})).status,400);
 room=await create('rooms',{id:'QA_ROOM',name:'Phòng QA',departmentId:dept.id,capacity:10,location:'QA',active:true});
 ward=await create('wards',{id:'QA_WARD',name:'Buồng QA',departmentId:dept.id,capacity:1,kind:'TIEU_CHUAN',location:'QA',active:true});
 staff=await create('staff',{id:'QA_STAFF',name:'Nhân viên QA',departmentId:dept.id,title:'Bác sĩ',specialty:'BAC_SI',certificate:'QA',phone:'0901234567',email:'staff@example.test',active:true});
 service=await create('services',{id:'QA_SERVICE',name:'Dịch vụ QA',departmentId:dept.id,kind:'XET_NGHIEM',resultType:'XET_NGHIEM',price:100000,insurancePrice:0,duration:30,active:true});
 bed=await create('beds',{id:'QA_BED',name:'01',wardId:ward.id,kind:'THUONG',price:100000,status:'TRONG',active:true});
 assert.equal((await request('/api/admin/beds',{method:'POST',body:{...bed,id:'QA_BED2',name:'02'}})).status,409);
});
test('SQL changes visible in original tables, round trip, read-only clinical history stays intact',async()=>{
 assert.equal(await querySql('SELECT tenKhoa FROM dbo.Khoa WHERE maKhoa=@id',{id:dept.id}),dept.name);
 const result=await update('services',service,{price:125000});assert.equal(result.status,200,JSON.stringify(result.data));
 service=(await list('services'))[0];assert.equal(Number(await querySql('SELECT donGia FROM dbo.DichVuKyThuat WHERE maDichVu=@id',{id:service.id})),125000);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.MediCareServicePriceHistory WHERE serviceId=@id',{id:service.id})),2);
});
test('optimistic concurrency: exactly one of two simultaneous catalog updates succeeds',async()=>{
 const results=await Promise.all([update('rooms',room,{capacity:11}),update('rooms',room,{capacity:12})]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);room=(await list('rooms'))[0];
});
test('idempotent create never duplicates and reused key with different data is rejected',async()=>{
 const key=randomUUID(),body={id:'QA_DEP2',name:'Khoa QA 2',kind:'HANH_CHINH',location:'QA',active:true};
 const results=await Promise.all([request('/api/admin/departments',{method:'POST',body,key}),request('/api/admin/departments',{method:'POST',body,key})]);assert.deepEqual(results.map(r=>r.status),[201,201]);
 assert.equal((await list('departments')).filter(d=>d.id==='QA_DEP2').length,1);
 assert.equal((await request('/api/admin/departments',{method:'POST',body:{...body,name:'Different'},key})).status,409);
});
test('deactivation guards linked catalogs; no DELETE API',async()=>{
 assert.equal((await update('departments',dept,{active:false})).status,409);
 assert.equal((await update('wards',ward,{active:false})).status,409);
 assert.equal((await request('/api/admin/departments/'+dept.id,{method:'DELETE'})).status,405);
});
test('settings persist, reject invalid times, publish facility information',async()=>{
 let r=await request('/api/admin/settings');assert.equal(r.status,200);
 assert.equal((await request('/api/admin/settings/facility',{method:'PUT',body:{...r.data,open:'17:00',close:'08:00'}})).status,400);
 assert.equal((await request('/api/admin/settings/facility',{method:'PUT',body:{...r.data,name:'Cơ sở QA'}})).status,200);
 assert.equal((await request('/api/facility',{identity:null})).data.name,'Cơ sở QA');
});
test('accounts validate duplicates, links and strong password; secrets never returned',async()=>{
 second=await create('accounts',{username:'admin2',name:'Admin QA 2',email:'admin2@example.test',roleId:'admin',staffId:staff.id,active:true,password:fixture.password});
 assert.equal('passwordHash' in second,false);
 assert.equal((await request('/api/admin/accounts',{method:'POST',body:{...second,password:fixture.password}})).status,409);
 assert.equal((await request('/api/admin/accounts',{method:'POST',body:{...second,username:'weakpass',password:'123'}})).status,400);
 assert.equal((await update('staff',staff,{active:false})).status,409);
});
test('roles and direct API authorization, pagination, search, CSV permission',async()=>{
 const role=await create('roles',{name:'Chỉ xem khoa',description:'QA',permissions:['departments:view'],active:true});
 limited=await create('accounts',{username:'limited',name:'Limited QA',email:'limited@example.test',roleId:role.id,staffId:'',active:true,password:fixture.password});
 const identity=await login('limited',fixture.password);
 assert.equal((await request('/api/admin/departments',{identity})).status,200);
 for(const endpoint of['accounts','roles','audit','dashboard','settings','staff'])assert.equal((await request('/api/admin/'+endpoint,{identity})).status,403);
 assert.equal((await request('/api/admin/departments',{identity,method:'POST',body:dept})).status,403);
 assert.equal((await request('/api/admin/departments?format=csv',{identity})).status,403);
 const page=await request('/api/admin/departments?size=1&page=2&q=QA');assert.equal(page.data.rows.length,1);assert.equal(page.data.total,2);
 assert.equal((await request('/api/admin/departments?size=-1')).status,400);
 assert.match((await request('/api/admin/departments?format=csv')).data,/QA_DEP/);
 const updated=await update('roles',role,{permissions:[]});assert.equal(updated.status,200);
 assert.equal((await request('/api/admin/departments',{identity})).status,401);
});
test('locking account revokes old session, reset password invalidates session and old password',async()=>{
 let identity=await login('limited',fixture.password);
 assert.equal((await update('accounts',limited,{active:false})).status,200);
 assert.equal((await request('/api/auth/me',{identity})).status,401);
 limited=(await list('accounts')).find(a=>a.id===limited.id);assert.equal((await update('accounts',limited,{active:true})).status,200);
 limited=(await list('accounts')).find(a=>a.id===limited.id);identity=await login('limited',fixture.password);
 assert.equal((await request(`/api/admin/accounts/${limited.id}/reset-password`,{method:'POST',body:{password:'New!Password_12345',version:limited.version}})).status,200);
 assert.equal((await request('/api/auth/me',{identity})).status,401);
 assert.equal((await request('/api/auth/login',{method:'POST',body:{username:'limited',password:fixture.password},identity:null})).status,401);
 await login('limited','New!Password_12345');
});
test('dashboard date validation, no fabricated statistics, audit cannot be edited or leak secrets',async()=>{
 const summary=await request('/api/admin/dashboard?from=2026-11-01&to=2026-11-30');assert.equal(summary.status,200,JSON.stringify(summary.data));assert.equal(summary.data.visits,0);assert.equal(summary.data.beds,1);
 assert.equal((await request('/api/admin/dashboard?from=2026-02-30')).status,400);
 const audit=await request('/api/admin/audit?from=2020-01-01&to=2099-12-31&size=100');assert.equal(audit.status,200);assert.ok(audit.data.total>10);
 const text=JSON.stringify(audit.data);assert.ok(!text.includes('passwordHash'));assert.ok(!text.includes(fixture.password));
 assert.equal((await request('/api/admin/audit',{method:'POST',body:{}})).status,405);
});
test('data survives independent HTTP server restart, SQL failure returns safe 503',async()=>{
 await fixture.close();fixture.server=createProductionServer();await new Promise(resolve=>fixture.server.listen(0,'127.0.0.1',resolve));fixture.url=`http://127.0.0.1:${fixture.server.address().port}`;fixture.close=()=>new Promise(resolve=>fixture.server.close(resolve));
 assert.equal((await request('/api/admin/settings')).data.name,'Cơ sở QA');
 const original=process.env.MEDICARE_SQL_CONNECTION;process.env.MEDICARE_SQL_CONNECTION='Server=127.0.0.1,1;Database=Missing;Integrated Security=True;Connect Timeout=1';
 try{const result=await request('/api/admin/accounts');assert.equal(result.status,503);assert.ok(!JSON.stringify(result.data).includes('Server='));}finally{process.env.MEDICARE_SQL_CONNECTION=original;}
 assert.ok((await loadState()).data.accounts.length>=3);
});

test('linked active appointments, occupied beds and old billed prices are protected',async()=>{
 await querySql(`SET XACT_ABORT ON; BEGIN TRAN;
 INSERT dbo.BenhNhan(maBenhNhan,hoTen) VALUES('QA_PATIENT',N'Người bệnh giả QA');
 INSERT dbo.LichHen(maHen,maBenhNhan,maKhoa,maBuong,maBacSiDuKien,ngayHen,gioHenDuKien) VALUES('QA_APPOINTMENT','QA_PATIENT','QA_DEP','QA_ROOM','QA_STAFF','2026-11-21','08:00');
 INSERT dbo.LuotKham(maLuotKham,maBenhNhan,maBuong,soThuTu,lyDoKham) VALUES('QA_VISIT','QA_PATIENT','QA_ROOM',1,N'Kiểm thử');
 INSERT dbo.DotDieuTri(maDotDieuTri,maBenhNhan,maKhoaDieuTri,lyDoNhapVien,chanDoanVaoVien,maBacSiDieuTriChinh) VALUES('QA_ADMISSION','QA_PATIENT','QA_DEP',N'Kiểm thử',N'Kiểm thử','QA_STAFF');
 INSERT dbo.PhanGiuong(maPhanGiuong,maDotDieuTri,maGiuong,tuThoiDiem,donGiaApDung,maNhanVienXep) VALUES('QA_ASSIGN','QA_ADMISSION','QA_BED',SYSUTCDATETIME(),100000,'QA_STAFF');
 UPDATE dbo.GiuongBenh SET trangThaiHienTai='DANG_SU_DUNG' WHERE maGiuong='QA_BED';
 INSERT dbo.ChiDinhCLS(maChiDinh,maLuotKham,maBacSiChiDinh,chanDoanLamSang) VALUES('QA_ORDER','QA_VISIT','QA_STAFF',N'Kiểm thử');
 INSERT dbo.ChiTietChiDinh(maChiTiet,maChiDinh,maDichVu,donGiaApDung) VALUES('QA_ORDER_ITEM','QA_ORDER','QA_SERVICE',125000);
 COMMIT; SELECT 'ok';`);
 room=(await list('rooms'))[0];bed=(await list('beds'))[0];service=(await list('services'))[0];
 assert.equal((await update('rooms',room,{active:false})).status,409);
 assert.equal((await update('beds',bed,{status:'TRONG',active:false})).status,409);
 assert.equal((await update('services',service,{active:false})).status,409);
 assert.equal((await update('services',service,{price:200000})).status,200);
 assert.equal(Number(await querySql("SELECT donGiaApDung FROM dbo.ChiTietChiDinh WHERE maChiTiet='QA_ORDER_ITEM'")),125000);
 const stats=await request('/api/admin/dashboard?from=2026-11-01&to=2026-11-30');assert.equal(stats.data.occupied,1);
});
test('delegated account editor cannot reset an administrator password or escalate privileges',async()=>{
 const role=await create('roles',{name:'Account Editor QA',description:'QA',permissions:['accounts:view','accounts:edit','accounts:create'],active:true});
 await create('accounts',{username:'editorqa',name:'Editor QA',email:'editor@example.test',roleId:role.id,staffId:'',active:true,password:fixture.password});
 const identity=await login('editorqa',fixture.password),target=(await list('accounts')).find(r=>r.username==='qaadmin');
 assert.equal((await request(`/api/admin/accounts/${target.id}/reset-password`,{identity,method:'POST',body:{password:'Attack!Password123',version:target.version}})).status,403);
 const current=(await list('accounts')).find(a=>a.id===limited.id);
 assert.equal((await request(`/api/admin/accounts/${limited.id}`,{identity,method:'PUT',body:{...current,roleId:'admin'}})).status,403);
});
test('expired sessions cannot read data; invalid payloads and unknown APIs are rejected',async()=>{
 const identity=await login('admin2',fixture.password);
 // Expire sessions in this dedicated fixture only.
 const state=await loadState();state.data.sessions=state.data.sessions.map(s=>({...s,expires:0}));
 await querySql('UPDATE dbo.MediCareAdminState SET body=@body,revision=revision+1 WHERE id=1; SELECT 1',{body:JSON.stringify(state.data)});
 assert.equal((await request('/api/admin/accounts',{identity})).status,401);
 admin=await login('qaadmin',fixture.password);
 assert.equal((await request('/api/admin/nonexistent')).status,404);
 assert.equal((await request('/api/admin/accounts/not-found',{method:'PUT',body:{}})).status,404);
 const malformed=await fetch(fixture.url+'/api/admin/accounts',{method:'POST',headers:{Cookie:admin.cookie,'Content-Type':'application/json','X-CSRF-Token':admin.csrf},body:'{' });assert.equal(malformed.status,400);
});
test('COPY_ONLY backup, checksum verification and restore to a NEW database preserve state and audit',async()=>{
 const original=await querySql('SELECT body FROM dbo.MediCareAdminState WHERE id=1');
 const count=await querySql('SELECT COUNT(*) FROM dbo.MediCareAdminAudit');
 const backup=await backupDatabase();assert.equal(backup.database,fixture.database);
 const restored=await restoreToNewDatabase(backup.file);
 assert.equal(await querySql(`SELECT body FROM [${restored.target}].dbo.MediCareAdminState WHERE id=1`),original);
 assert.equal(await querySql(`SELECT COUNT(*) FROM [${restored.target}].dbo.MediCareAdminAudit`),count);
 await assert.rejects(()=>restoreToNewDatabase(backup.file,restored.target),/already exists/);
 await assert.rejects(()=>restoreToNewDatabase(backup.file,'QuanLyBenhVien'),/Restore target/);
 console.log('RESTORE VERIFIED '+restored.target);
});
test('legacy workspace startup preserves all pre-existing browser storage keys',async()=>{
 const previousFetch=globalThis.fetch,windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,'window'),storageDescriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const keys=['medicare-workspace-v3','medicare-workspace-v4','medicare-patients-v1','medicare-stock-v1'];const store=new Map(keys.map(key=>[key,'original-data']));
 Object.defineProperty(globalThis,'window',{configurable:true,value:{}});Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{removeItem:key=>store.delete(key),getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)}});
 globalThis.fetch=async()=>Response.json([]);
 try{const {initializeWorkspace,syncWithSqlServer}=await import('../src/workspace.js');initializeWorkspace();await syncWithSqlServer();for(const key of keys)assert.equal(store.get(key),'original-data');}
 finally{globalThis.fetch=previousFetch;if(windowDescriptor)Object.defineProperty(globalThis,'window',windowDescriptor);else delete globalThis.window;if(storageDescriptor)Object.defineProperty(globalThis,'localStorage',storageDescriptor);else delete globalThis.localStorage;}
});
