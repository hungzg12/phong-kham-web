import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {adminFixture} from './admin-fixture.mjs';
import {querySql} from '../server/admin-store.mjs';
import {createApiMiddleware} from '../server/api-router.mjs';

let fixture,server,url;
const sample={name:'QA_TEST_LICH_HEN',phone:'0900000001',birth:'1990-01-01',gender:'Nam',dept:'Nội tổng quát',day:'2026-11-22',time:'08:30'};
async function request(method,path,body) {
 const response=await fetch(url+path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 return {status:response.status,data:await response.json()};
}
async function create(patch={}) {const r=await request('POST','/api/appointments',{...sample,...patch});assert.equal(r.status,201,JSON.stringify(r));return r.data;}
before(async()=>{
 fixture=await adminFixture();
 await querySql(`INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('NOI',N'Nội tổng quát','KHAM_BENH');
 INSERT dbo.BuongKham(maBuong,maKhoa,tenBuong) VALUES('QA_TEST_ROOM','NOI',N'QA_TEST_Phòng'); SELECT 'ok';`);
 const middleware=createApiMiddleware({trustedTest:true});
 server=http.createServer((req,res)=>middleware(req,res,()=>{res.writeHead(404,{'Content-Type':'application/json'});res.end('{}');}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));if(fixture)await fixture.close();});

test('create returns canonical status, real patient identity and round-trips through SQL',async()=>{
 const a=await create();assert.equal(a.status,'Đã xác nhận');assert.equal(a.statusRaw,'DA_DAT');assert.ok(a.patientId);assert.equal(a.dept,'Nội tổng quát');
 const listed=(await request('GET','/api/appointments')).data.find(x=>x.id===a.id);assert.deepEqual(listed,a);
 assert.equal(await querySql('SELECT trangThai FROM dbo.LichHen WHERE maHen=@id',{id:a.id}),'DA_DAT');
});
test('parallel duplicate bookings: one saved, one 409, no extra patient',async()=>{
 const body={...sample,phone:'0900000002'};
 const rows=await Promise.all([request('POST','/api/appointments',body),request('POST','/api/appointments',body)]);
 assert.deepEqual(rows.map(x=>x.status).sort(),[201,409]);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.BenhNhan WHERE soDienThoai=@phone',{phone:body.phone})),1);
});
test('update persists identity, time and status across independent GET',async()=>{
 const a=await create({phone:'0900000003'});
 const r=await request('PUT','/api/appointments',{...sample,id:a.id,phone:'0900000003',name:'QA_TEST_DA_SUA',time:'09:00'});assert.equal(r.status,200,JSON.stringify(r));
 const saved=(await request('GET','/api/appointments')).data.find(x=>x.id===a.id);
 assert.equal(saved.name,'QA_TEST_DA_SUA');assert.equal(saved.time,'09:00');assert.equal(saved.patientId,a.patientId);assert.equal(saved.status,'Đã xác nhận');
});
test('cancel requires reason and persists status and reason in one SQL transaction',async()=>{
 const a=await create({phone:'0900000004'});
 assert.equal((await request('PATCH','/api/appointments',{id:a.id,reason:'   '})).status,400);
 assert.equal((await request('PATCH','/api/appointments',{id:a.id,reason:'QA_TEST_HUY'})).status,200);
 const saved=(await request('GET','/api/appointments')).data.find(x=>x.id===a.id);assert.equal(saved.status,'Đã hủy');assert.equal(saved.cancelReason,'QA_TEST_HUY');
 assert.equal((await request('POST','/api/visits',{appointmentId:a.id})).status,409);
});
test('check-in is atomic, reuses linked patient, repeat/concurrent calls return same visit',async()=>{
 const a=await create({phone:'0900000005'});
 const responses=await Promise.all([request('POST','/api/visits',{appointmentId:a.id}),request('POST','/api/visits',{appointmentId:a.id})]);
 for(const r of responses)assert.equal(r.status,200,JSON.stringify(r));assert.equal(responses[0].data.visitId,responses[1].data.visitId);
 assert.equal(responses[0].data.patientId,a.patientId);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.LuotKham WHERE maHen=@id',{id:a.id})),1);
 assert.equal((await request('GET','/api/appointments')).data.find(x=>x.id===a.id).status,'Đã tiếp đón');
 assert.equal((await request('PATCH','/api/appointments',{id:a.id,reason:'QA_TEST'})).status,409);
 assert.equal((await request('PUT','/api/appointments',{...sample,id:a.id,phone:'0900000005'})).status,409);
});
test('wrong patient cannot check in another appointment and creates no visit',async()=>{
 const a=await create({phone:'0900000006'});
 const r=await request('POST','/api/visits',{appointmentId:a.id,patientId:'QA_TEST_OTHER'});assert.equal(r.status,409);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.LuotKham WHERE maHen=@id',{id:a.id})),0);
});
test('same identity on different times keeps one patient and separate visit IDs',async()=>{
 const a=await create({phone:'0900000007',time:'09:00'}),b=await create({phone:'0900000007',time:'09:30'});
 assert.equal(a.patientId,b.patientId);
 const va=await request('POST','/api/visits',{appointmentId:a.id}),vb=await request('POST','/api/visits',{appointmentId:b.id});
 assert.equal(va.status,200);assert.equal(vb.status,200);assert.notEqual(va.data.visitId,vb.data.visitId);
 assert.notEqual(va.data.queueNumber,vb.data.queueNumber);
});
test('invalid payload and unknown IDs never produce a success record',async()=>{
 const count=Number(await querySql('SELECT COUNT(*) FROM dbo.LichHen'));
 for(const patch of [{phone:'bad'},{name:' '},{time:'09:15'},{day:'2026-02-30'},{dept:'QA_TEST_UNKNOWN'}])assert.equal((await request('POST','/api/appointments',{...sample,...patch})).status,400);
 assert.equal((await request('PUT','/api/appointments',{...sample,id:'QA_TEST_MISSING'})).status,404);
 assert.equal((await request('PUT','/api/appointments',sample)).status,400);
 assert.equal((await request('PATCH','/api/appointments',null)).status,400);
 assert.equal((await request('PATCH','/api/appointments',{id:'QA_TEST_MISSING',reason:'QA_TEST'})).status,404);
 assert.equal((await request('POST','/api/visits',{appointmentId:'QA_TEST_MISSING'})).status,404);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.LichHen')),count);
});

test('queue uses actual doctor assignment and never assigns every patient to the demo doctor',async()=>{
 const unassigned=(await request('GET','/api/queue')).data;
 assert.ok(unassigned.length>0);assert.ok(unassigned.every(v=>v.doctor==='Chưa phân công'));
 await querySql(`INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('TIM',N'Tim mạch','KHAM_BENH');
 INSERT dbo.BuongKham(maBuong,maKhoa,tenBuong) VALUES('QA_TEST_OTHER_ROOM','TIM',N'QA_TEST_Phòng khác');
 INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('NV001',N'Trần Minh Anh','NOI',N'QA_TEST_Bác sĩ','BAC_SI'),('QA_TEST_DOC',N'QA_TEST_Bác sĩ khác','TIM',N'QA_TEST_Bác sĩ','BAC_SI');
 INSERT dbo.PhanCongKham(maPhanCong,maBuong,maBacSi,ngayKham,caKham) VALUES
 ('QA_TEST_A','QA_TEST_ROOM','NV001',CONVERT(date,SYSDATETIME()),CASE WHEN DATEPART(HOUR,SYSDATETIME())<12 THEN 'SANG' ELSE 'CHIEU' END),
 ('QA_TEST_B','QA_TEST_OTHER_ROOM','QA_TEST_DOC',CONVERT(date,SYSDATETIME()),CASE WHEN DATEPART(HOUR,SYSDATETIME())<12 THEN 'SANG' ELSE 'CHIEU' END); SELECT 'ok';`);
 const other=await create({phone:'0900000010',dept:'Tim mạch'});const visit=await request('POST','/api/visits',{appointmentId:other.id});assert.equal(visit.status,200);
 const assigned=(await request('GET','/api/queue')).data;
 assert.equal(assigned.find(v=>v.id===visit.data.visitId).doctor,'QA_TEST_Bác sĩ khác');
 assert.ok(assigned.filter(v=>v.roomCode==='QA_TEST_ROOM').every(v=>v.doctor==='Trần Minh Anh'));
});

test('eight test accounts: real admin API permissions and logout session revocation',async()=>{
 async function adminRequest(path,method='GET',body,identity){
  const response=await fetch(fixture.url+path,{method,headers:{...(body?{'Content-Type':'application/json','Idempotency-Key':randomUUID()}:{}),...(identity?{Cookie:identity.cookie,'X-CSRF-Token':identity.csrf}:{})},body:body?JSON.stringify(body):undefined});
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
 }
 const login=await adminRequest('/api/auth/login','POST',{username:'qaadmin',password:fixture.password});assert.equal(login.status,200);const admin={cookie:login.cookie,csrf:login.data.csrf};
 // Technician is configured with the existing role-management API in this test DB;
 // it is not silently added to the working database or treated as a built-in role.
 const technician=await adminRequest('/api/admin/roles','POST',{name:'QA_TEST_Kỹ thuật viên CLS',description:'QA_TEST',permissions:[],active:true},admin);assert.equal(technician.status,201,JSON.stringify(technician));
 for(const role of ['admin','receptionist','doctor','nurse','technician','pharmacist','cashier','patient']){
  const roleId=role==='technician'?technician.data.id:role;const username='qa_test_'+role;const password='QA_TEST_Password!12345';
  const created=await adminRequest('/api/admin/accounts','POST',{username,name:'QA_TEST_'+role,email:username+'@example.test',roleId,staffId:'',active:true,password},admin);assert.equal(created.status,201,JSON.stringify(created));
  const auth=await adminRequest('/api/auth/login','POST',{username,password});assert.equal(auth.status,200);const identity={cookie:auth.cookie,csrf:auth.data.csrf};
  assert.equal((await adminRequest('/api/auth/me','GET',undefined,identity)).data.user.roleId,roleId);
  assert.equal((await adminRequest('/api/admin/accounts','GET',undefined,identity)).status,role==='admin'?200:403,role);
  assert.equal((await adminRequest('/api/auth/logout','POST',{},identity)).status,200);
  assert.equal((await adminRequest('/api/auth/me','GET',undefined,identity)).status,401,role+' stale cookie');
 }
});

test('appointments, cancellation reason and check-in survive independent HTTP server restart',async()=>{
 const before=(await request('GET','/api/appointments')).data;
 assert.ok(before.some(a=>a.status==='Đã hủy'&&a.cancelReason==='QA_TEST_HUY'));
 assert.ok(before.some(a=>a.status==='Đã tiếp đón'));
 await new Promise(resolve=>server.close(resolve));
 const middleware=createApiMiddleware({trustedTest:true});
 server=http.createServer((req,res)=>middleware(req,res,()=>{res.writeHead(404,{'Content-Type':'application/json'});res.end('{}');}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${server.address().port}`;
 assert.deepEqual((await request('GET','/api/appointments')).data,before);
});
