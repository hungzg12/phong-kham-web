import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {adminFixture} from './admin-fixture.mjs';
import {querySql,loadState} from '../server/admin-store.mjs';
import {receivePatient} from '../server/clinic-flow.mjs';
import {backupOperation} from '../server/admin-backups.mjs';

test('admin roster persists, validates references and concurrency, and reception uses the real assignment',async()=>{
 const f=await adminFixture();try{
 await querySql(`INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('NOI',N'Nội tổng quát','KHAM_BENH');
 INSERT dbo.BuongKham(maBuong,maKhoa,tenBuong) VALUES('QA_TEST_ROOM','NOI',N'QA_TEST_ROOM'),('QA_TEST_ROOM2','NOI',N'QA_TEST_ROOM2');
 INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('QA_TEST_DOC',N'QA_TEST_DOC','NOI',N'QA_TEST','BAC_SI'),('QA_TEST_NURSE',N'QA_TEST_NURSE','NOI',N'QA_TEST','DIEU_DUONG');
 INSERT dbo.BenhNhan(maBenhNhan,hoTen,ngaySinh,gioiTinh,soDienThoai) VALUES('QA_TEST_PAT',N'QA_TEST_PAT','1990-01-01',N'Nam','0900009991');SELECT 'ok';`);
 const login=await fetch(f.url+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'qaadmin',password:f.password})});const identity=await login.json(),cookie=login.headers.get('set-cookie').split(';')[0];
 const headers={cookie,'X-CSRF-Token':identity.csrf,'content-type':'application/json','Idempotency-Key':randomUUID()};
 const today=await querySql('SELECT CONVERT(char(10),SYSDATETIME(),23)');const shift=await querySql("SELECT CASE WHEN DATEPART(HOUR,SYSDATETIME())<12 THEN 'SANG' ELSE 'CHIEU' END");
 const payload={id:'QA_TEST_DUTY',roomId:'QA_TEST_ROOM',doctorId:'QA_TEST_DOC',nurseId:'QA_TEST_NURSE',date:today,shift,status:'DA_PHAN_CONG',note:'QA_TEST'};
 const send=(data,extra={})=>fetch(f.url+'/api/admin/roster',{method:'POST',headers:{...headers,...extra},body:JSON.stringify(data)});
 let r=await send(payload);assert.equal(r.status,201,await r.clone().text());
 r=await send(payload);assert.equal(r.status,201);
 const listed=await fetch(f.url+'/api/admin/roster',{headers:{cookie}});const state=await listed.json();assert.equal(state.rows.length,1);assert.equal(state.rows[0].doctorId,'QA_TEST_DOC');
 r=await send({...payload,id:'QA_TEST_BAD',doctorId:'QA_TEST_NURSE'},{'Idempotency-Key':randomUUID()});assert.ok([400,409].includes(r.status));
 r=await send({...payload,id:'QA_TEST_DUP',roomId:'QA_TEST_ROOM2'},{'Idempotency-Key':randomUUID()});assert.equal(r.status,409);
 r=await send({...payload,id:'QA_TEST_DATE',date:'2026-02-30'},{'Idempotency-Key':randomUUID()});assert.equal(r.status,400);
 r=await send({...payload,id:'QA_TEST_CSRF'},{'X-CSRF-Token':'invalid','Idempotency-Key':randomUUID()});assert.equal(r.status,403);
 const visit=await receivePatient({patientId:'QA_TEST_PAT',dept:'Nội tổng quát',reason:'QA_TEST_RECEPTION'});assert.equal(visit.doctorStaffId,'QA_TEST_DOC');
 const old=state.rows[0];r=await fetch(f.url+'/api/admin/roster/'+old.id,{method:'PUT',headers:{...headers,'Idempotency-Key':randomUUID()},body:JSON.stringify({...old,note:'QA_TEST_UPDATED'})});assert.equal(r.status,200,await r.clone().text());
 r=await fetch(f.url+'/api/admin/roster/'+old.id,{method:'PUT',headers:{...headers,'Idempotency-Key':randomUUID()},body:JSON.stringify({...old,note:'QA_TEST_STALE'})});assert.equal(r.status,409);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.PhanCongKham')),1);
 }finally{await f.close();}
});

test('backup endpoints require session and CSRF; restore rejects unknown backup and invalid operation without restoring',async()=>{
 const f=await adminFixture();try{
 assert.equal((await fetch(f.url+'/api/admin/backups')).status,401);
 const login=await fetch(f.url+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'qaadmin',password:f.password})});const identity=await login.json(),cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await fetch(f.url+'/api/admin/backups',{headers:{cookie}})).status,200);
 assert.equal((await fetch(f.url+'/api/admin/backups/backup',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({requestId:randomUUID()})})).status,403);
 const r=await fetch(f.url+'/api/admin/backups/restore-new',{method:'POST',headers:{cookie,'content-type':'application/json','X-CSRF-Token':identity.csrf},body:JSON.stringify({id:'QA_TEST_UNKNOWN',requestId:randomUUID(),target:'MediCareRestore_QA_TEST_01'})});assert.equal(r.status,404);
 await assert.rejects(backupOperation('drop',{requestId:randomUUID()},'QA_TEST_ADMIN'),e=>e.status===400);
 assert.equal((await loadState()).data.backups,undefined);
 }finally{await f.close();}
});
