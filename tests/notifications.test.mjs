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
import {ensureNotifications,processNotifications,notificationList,notificationAction} from '../server/notifications.mjs';
import {createLab,labAction} from '../server/ancillary.mjs';
import {receivePatient} from '../server/clinic-flow.mjs';
let f,server,url,visit;const sessions={};
const roles={doc1:'doctor',doc2:'doctor',nurse1:'nurse',nurse2:'nurse',pat1:'patient',pat2:'patient'};
const identity=name=>({userId:'QA_TEST_'+name,role:roles[name]});
async function login(name){const r=await fetch(url+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'qa_test_'+name,password:f.password})});assert.equal(r.status,200);const b=await r.json();sessions[name]={cookie:r.headers.get('set-cookie').split(';')[0],csrf:b.csrf};}
const request=(name,body,path='/api/notifications')=>fetch(url+path,{method:body?'POST':'GET',headers:{cookie:sessions[name]?.cookie||'','content-type':'application/json','x-csrf-token':sessions[name]?.csrf||''},...(body?{body:JSON.stringify(body)}:{})});
before(async()=>{f=await adminFixture();await ensureNotifications();await querySql(`INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('NOI',N'Nội tổng quát','KHAM_BENH');
 INSERT dbo.BuongKham(maBuong,maKhoa,tenBuong) VALUES('QA_TEST_ROOM','NOI',N'QA_TEST room');
 INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('QA_TEST_doc1',N'QA_TEST doctor1','NOI',N'Bác sĩ','BAC_SI'),('QA_TEST_doc2',N'QA_TEST doctor2','NOI',N'Bác sĩ','BAC_SI'),('QA_TEST_nurse1',N'QA_TEST nurse1','NOI',N'Điều dưỡng','DIEU_DUONG'),('QA_TEST_nurse2',N'QA_TEST nurse2','NOI',N'Điều dưỡng','DIEU_DUONG');
 INSERT dbo.PhanCongKham(maPhanCong,maBuong,maBacSi,ngayKham,caKham) VALUES('QA_TEST_AM','QA_TEST_ROOM','QA_TEST_doc1',CAST(SYSDATETIME() AS date),'SANG'),('QA_TEST_PM','QA_TEST_ROOM','QA_TEST_doc1',CAST(SYSDATETIME() AS date),'CHIEU');
 INSERT dbo.BenhNhan(maBenhNhan,hoTen,ngaySinh,gioiTinh,soDienThoai) VALUES('QA_TEST_pat1',N'QA_TEST patient1','1990-01-01',N'Nam','0900012345'),('QA_TEST_pat2',N'QA_TEST patient2','1990-01-01',N'Nam','0900012346');SELECT 'ok';`);
 const passwordHash=await hashPassword(f.password);await transactAdmin(d=>{for(const [name,role] of Object.entries(roles)){const existing=d.roles.find(r=>r.id===role);if(existing)existing.permissions=[...businessPermissions];if(!d.roles.some(r=>r.id===role))d.roles.push({id:role,name:role,permissions:[...businessPermissions],active:true});d.accounts.push({id:'QA_TEST_'+name,username:'qa_test_'+name,name:'QA_TEST '+name,email:name+'@example.test',roleId:role,staffId:role==='patient'?'':'QA_TEST_'+name,patientId:role==='patient'?'QA_TEST_'+name:'',active:true,version:1,authVersion:1,passwordHash});}});
 const admin=createAdminMiddleware(),api=createApiMiddleware();server=http.createServer((req,res)=>admin(req,res,()=>api(req,res,()=>{res.writeHead(404);res.end('{}')})));await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port;for(const name of Object.keys(roles))await login(name);
});
after(async()=>{await new Promise(r=>server.close(r));await f.close();});
test('N01 reception event reaches only assigned doctor; replay and concurrent workers are idempotent',async()=>{
 visit=await receivePatient({patientId:'QA_TEST_pat1',dept:'Nội tổng quát'});await Promise.all([processNotifications(),processNotifications()]);
 const a=await notificationList(identity('doc1')),b=await notificationList(identity('doc2'));assert.equal(a.items.filter(i=>i.recordId===visit.visitId).length,1);assert.equal(b.items.length,0);await processNotifications();assert.equal((await notificationList(identity('doc1'))).items.length,a.items.length);
});
test('N02 patient ownership, ID guessing, spoofed identities and foreign read acknowledgements are denied',async()=>{
 const body={action:'remind',requestId:randomUUID(),title:'QA_TEST reminder',text:'QA_TEST',severity:'important',dueAt:'2020-01-01T00:00:00Z'};
 assert.equal((await request('pat1',body)).status,200);assert.equal((await request('pat1',body)).status,200);await processNotifications();const data=await(await request('pat1')).json();assert.equal(data.items.length,1);const id=data.items[0].id;
 assert.equal((await(await request('pat2')).json()).items.length,0);assert.equal((await request('pat2',null,'/api/notifications?id='+id)).status,404);assert.equal((await request('pat2',{action:'read',id})).status,404);
 for(const key of ['senderId','recipientId','role','userId','owner'])assert.equal((await request('pat1',{action:'read',id,[key]:'QA_TEST_pat2'})).status,400);
 assert.equal((await request('pat1',{action:'read',id})).status,200);await login('pat1');const restored=await(await request('pat1')).json();assert.ok(restored.items[0].readAt);assert.equal(restored.unread,0);assert.equal(restored.reminders.length,1);
});
test('N03 rollback creates neither committed outbox event nor notification',async()=>{
 await querySql(`BEGIN TRAN;INSERT dbo.LichHen(maHen,maBenhNhan,maKhoa,maBuong,ngayHen,gioHenDuKien) VALUES('QA_TEST_ROLLBACK','QA_TEST_pat1','NOI','QA_TEST_ROOM','2090-01-01','08:00');ROLLBACK;SELECT 'ok';`);await processNotifications();assert.equal(Number(await querySql("SELECT COUNT(*) FROM dbo.MediCareNotificationOutbox WHERE target='QA_TEST_ROLLBACK'")),0);
});
test('N04 appointment notification belongs to linked patient only and survives independent SQL reload',async()=>{
 await querySql(`INSERT dbo.LichHen(maHen,maBenhNhan,maKhoa,maBuong,ngayHen,gioHenDuKien) VALUES('QA_TEST_APPT','QA_TEST_pat1','NOI','QA_TEST_ROOM','2090-01-01','08:00');SELECT 'ok';`);await processNotifications();assert.ok((await notificationList(identity('pat1'))).items.some(i=>i.recordId==='QA_TEST_APPT'));assert.ok(!(await notificationList(identity('pat2'))).items.some(i=>i.recordId==='QA_TEST_APPT'));
 await querySql("UPDATE dbo.LichHen SET trangThai='DA_HUY' WHERE maHen='QA_TEST_APPT';SELECT 'ok';");await processNotifications();assert.equal((await notificationList(identity('pat1'))).items.filter(i=>i.recordId==='QA_TEST_APPT').length,2);
});
test('N05 missing nursing assignment never broadcasts; unresolved delivery records reason and retries',async()=>{
 await querySql(`INSERT dbo.DotDieuTri(maDotDieuTri,maBenhNhan,maKhoaDieuTri,lyDoNhapVien,chanDoanVaoVien,maBacSiDieuTriChinh) VALUES('QA_TEST_ADMIT','QA_TEST_pat1','NOI',N'QA_TEST',N'QA_TEST','QA_TEST_doc1');
 INSERT dbo.ToDieuTri(maTo,maDotDieuTri,soThuTuTo,ngayDieuTri,dienBienBenh,maBacSi) VALUES('QA_TEST_SHEET','QA_TEST_ADMIT',1,CAST(SYSDATETIME() AS date),N'QA_TEST','QA_TEST_doc1');
 INSERT dbo.YLenh(maYLenh,maTo,loaiYLenh,noiDungYLenh,thoiDiemBatDau,maBacSiRaYLenh) VALUES('QA_TEST_CARE','QA_TEST_SHEET','CHAM_SOC',N'QA_TEST',SYSDATETIME(),'QA_TEST_doc1');SELECT 'ok';`);await processNotifications();for(const n of ['nurse1','nurse2'])assert.equal((await notificationList(identity(n))).items.length,0);
 const state=JSON.parse(await querySql("SELECT (SELECT state,attempts,reason FROM dbo.MediCareNotificationOutbox WHERE target='QA_TEST_CARE' FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)"));assert.equal(state.state,'UNDELIVERED');assert.ok(state.reason);await querySql("UPDATE dbo.MediCareNotificationOutbox SET nextAttempt=SYSUTCDATETIME() WHERE target='QA_TEST_CARE';SELECT 'ok';");await processNotifications();assert.equal(Number(await querySql("SELECT attempts FROM dbo.MediCareNotificationOutbox WHERE target='QA_TEST_CARE'")),state.attempts+1);
});
test('N06 server schedules due reminder without an open UI, cancellation and per-account readAll are isolated',async()=>{
 await notificationAction(identity('nurse1'),{action:'remind',requestId:randomUUID(),title:'QA_TEST due',text:'QA_TEST',severity:'urgent',dueAt:'2020-01-01T00:00:00Z'});await processNotifications();const n=(await notificationList(identity('nurse1'))).items;assert.equal(n.length,1);await notificationAction(identity('nurse2'),{action:'readAll'});assert.equal((await notificationList(identity('nurse1'))).unread,1);
 const reminder=(await notificationList(identity('nurse1'))).reminders[0];await assert.rejects(notificationAction(identity('nurse2'),{action:'cancelReminder',id:reminder.id}),e=>e.status===404);
});
test('N07 logged-out session cannot access notifications; CSRF failure cannot mutate state',async()=>{
 assert.equal((await fetch(url+'/api/notifications')).status,401);const r=await fetch(url+'/api/notifications',{method:'POST',headers:{cookie:sessions.doc1.cookie,'content-type':'application/json','x-csrf-token':'invalid'},body:JSON.stringify({action:'readAll'})});assert.equal(r.status,403);
});

test('N08 delivery failure persists RETRY and recovers without duplication',async()=>{
 const id=randomUUID();await querySql("INSERT dbo.MediCareNotificationOutbox(id,source,target,payload) VALUES(@id,'LuotKham','QA_TEST_RETRY',N'[]');SELECT 'ok';",{id});
 // Inject a delivery-only SQL failure in this isolated database, then recover.
 await querySql("UPDATE dbo.MediCareNotificationOutbox SET source='LichHen',payload=N'{\"maBenhNhan\":\"QA_TEST_pat2\"}' WHERE id=@id;EXEC(N'CREATE TRIGGER dbo.QA_TEST_NotifyFailure ON dbo.MediCareNotification AFTER INSERT AS BEGIN IF EXISTS(SELECT 1 FROM inserted WHERE recordId=''QA_TEST_RETRY'') THROW 51000, ''QA_TEST delivery unavailable'',1; END;');SELECT 'ok';",{id});await processNotifications();
 assert.equal(await querySql('SELECT state FROM dbo.MediCareNotificationOutbox WHERE id=@id',{id}),'RETRY');
 await querySql("DROP TRIGGER dbo.QA_TEST_NotifyFailure;UPDATE dbo.MediCareNotificationOutbox SET nextAttempt=SYSUTCDATETIME() WHERE id=@id;SELECT 'ok';",{id});await processNotifications();await processNotifications();
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.MediCareNotification WHERE eventId=@id',{id})),1);assert.ok((await notificationList(identity('pat2'))).items.some(i=>i.recordId==='QA_TEST_RETRY'));
});
test('N09 administrator has no implicit access to another account notifications',async()=>{
 const all=await notificationList({userId:'QA_TEST_admin',role:'admin'});assert.equal(all.items.length,0);const other=(await notificationList(identity('pat1'))).items[0];await assert.rejects(notificationList({userId:'QA_TEST_admin',role:'admin'},other.id),e=>e.status===404);
});

test('N10 published CLS notifies only ordering doctor and linked patient; drafts do not notify patients',async()=>{
 await querySql(`INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('QA_TEST_tech',N'QA_TEST tech','NOI',N'Kỹ thuật viên','KY_THUAT_VIEN');INSERT dbo.DichVuKyThuat(maDichVu,tenDichVu,maKhoaThucHien,loaiDichVu,loaiKetQua,donGia) VALUES('QA_TEST_LAB',N'QA_TEST lab','NOI','XET_NGHIEM','XET_NGHIEM',1000);SELECT 'ok';`);
 const [lab]=await createLab({role:'doctor',staffId:'QA_TEST_doc1',patient:'QA_TEST_pat1',episodeId:visit.visitId,diagnosis:'QA_TEST',services:['QA_TEST_LAB']});const base={id:lab.id,role:'technician',staffId:'QA_TEST_tech'};let r=await labAction({...base,action:'accept',revision:0});r=await labAction({...base,action:'save',revision:r.resultRevision,rows:[{name:'QA_TEST',value:'5',unit:'QA_TEST',reference:'QA_TEST'}],conclusion:'QA_TEST',critical:'Không'});await processNotifications();assert.ok(!(await notificationList(identity('pat1'))).items.some(i=>i.kind==='KetQuaCLS'));
 await labAction({...base,action:'publish',revision:r.resultRevision});await processNotifications();assert.equal((await notificationList(identity('doc1'))).items.filter(i=>i.kind==='KetQuaCLS').length,1);assert.equal((await notificationList(identity('doc2'))).items.filter(i=>i.kind==='KetQuaCLS').length,0);assert.equal((await notificationList(identity('pat1'))).items.filter(i=>i.kind==='KetQuaCLS').length,1);assert.equal((await notificationList(identity('pat2'))).items.filter(i=>i.kind==='KetQuaCLS').length,0);
});
test('N11 pending finance and low stock resolve recorded staff, not peers with same role',async()=>{
 await querySql(`INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('QA_TEST_cash1',N'QA_TEST cash1','NOI',N'Thu ngân','THU_NGAN'),('QA_TEST_cash2',N'QA_TEST cash2','NOI',N'Thu ngân','THU_NGAN'),('QA_TEST_pharm1',N'QA_TEST pharm1','NOI',N'Dược sĩ','DUOC_SI');
 INSERT dbo.GiaoDichThanhToan(maGiaoDich,maBenhNhan,loaiGiaoDich,phuongThuc,soTien,trangThai,maNhanVienXacNhan) VALUES('QA_TEST_DUE','QA_TEST_pat1','TAM_UNG','TIEN_MAT',1000,'CHO_THANH_TOAN','QA_TEST_cash1');
 INSERT dbo.KhoDuoc(maKho,tenKho,maKhoa,loaiKho) VALUES('QA_TEST_STORE',N'QA_TEST store','NOI','KHO_TONG');
 INSERT dbo.HangHoaYTe(maHang,tenHang,loaiHang,donViCoSo) VALUES('QA_TEST_DRUG',N'QA_TEST drug','THUOC',N'Viên');
 INSERT dbo.LoHang(maLoHang,maHang,soLoNhaSanXuat,ngaySanXuat,hanSuDung,soLuongNhap,donGiaNhap) VALUES('QA_TEST_BATCH','QA_TEST_DRUG','QA_TEST_BATCH','2020-01-01','2095-01-01',20,100);
 INSERT dbo.LoTonKho(maLoTon,maKho,maLoHang,soLuongTon,soLuongKhaDung) VALUES('QA_TEST_STOCK','QA_TEST_STORE','QA_TEST_BATCH',20,20);
 INSERT dbo.NhatKyThayDoi(loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,ketQua,duLieuSau) VALUES('PharmacyDraft','QA_TEST_STORE','LUU','DICH_VU','THANH_CONG',N'{"manager":"QA_TEST_pharm1"}');SELECT 'ok';`);
 await transactAdmin(d=>{for(const [name,role] of [['cash1','cashier'],['cash2','cashier'],['pharm1','pharmacist']]){if(!d.roles.some(r=>r.id===role))d.roles.push({id:role,name:role,active:true,permissions:[]});d.accounts.push({id:'QA_TEST_'+name,username:'qa_test_'+name,roleId:role,staffId:'QA_TEST_'+name,active:true});}});await processNotifications();assert.ok((await notificationList({userId:'QA_TEST_cash1'})).items.some(i=>i.recordId==='QA_TEST_DUE'));assert.equal((await notificationList({userId:'QA_TEST_cash2'})).items.length,0);assert.ok((await notificationList({userId:'QA_TEST_pharm1'})).items.some(i=>i.recordId==='QA_TEST_STOCK'));
});

test('N12 future and cancelled reminders do not fire; logout revokes old cookie',async()=>{
 const b={action:'remind',requestId:randomUUID(),title:'QA_TEST future',text:'QA_TEST',severity:'normal',dueAt:'2099-01-01T00:00:00Z'};await notificationAction(identity('doc2'),b);await processNotifications();assert.equal((await notificationList(identity('doc2'))).items.length,0);await notificationAction(identity('doc2'),{action:'cancelReminder',id:b.requestId});await querySql('UPDATE dbo.MediCareReminder SET dueAt=CONVERT(datetimeoffset,@date) WHERE id=@id;SELECT 1;',{id:b.requestId,date:'2020-01-01T00:00:00Z'});await processNotifications();assert.equal((await notificationList(identity('doc2'))).items.length,0);
 const r=await fetch(url+'/api/auth/logout',{method:'POST',headers:{cookie:sessions.doc2.cookie,'x-csrf-token':sessions.doc2.csrf,'content-type':'application/json'},body:'{}'});assert.equal(r.status,200);assert.equal((await request('doc2')).status,401);await login('doc2');assert.equal((await(await request('doc2')).json()).items.length,0);
});
