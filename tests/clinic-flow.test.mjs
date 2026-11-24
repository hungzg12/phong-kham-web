import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {adminFixture} from './admin-fixture.mjs';
import {querySql} from '../server/admin-store.mjs';
import {createApiMiddleware} from '../server/api-router.mjs';

let fixture,server,url;
function open(){const api=createApiMiddleware({trustedTest:true});server=http.createServer((req,res)=>api(req,res,()=>{res.writeHead(404);res.end('{}')}));return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>{url=`http://127.0.0.1:${server.address().port}`;resolve();}));}
async function call(path,method='GET',body){const r=await fetch(url+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const person={name:'QA_TEST_TIEP_TAN',birth:'1990-01-01',phone:'0900000301',gender:'Nữ',insurance:'QA_TEST_BHYT',address:'QA_TEST_ADDRESS',dept:'Nội tổng quát',reason:'QA_TEST_KHAM'};
const note={symptoms:'QA_TEST_TRIỆU_CHỨNG',history:'QA_TEST_TIỀN_SỬ',examination:'QA_TEST_KHÁM',diagnosis:'QA_TEST_CHẨN_ĐOÁN',icd:'Z00',plan:'QA_TEST_KẾ_HOẠCH',advice:'QA_TEST_LỜI_DẶN',outcome:'Điều trị ngoại trú',vitals:{pulse:'80',pressure:'120/80',temperature:'36.5',spo2:'98',weight:'60',height:'165'}};
async function receive(patch={}){const r=await call('/api/visits','POST',{...person,...patch});assert.equal(r.status,201,JSON.stringify(r));return r.data;}
async function detail(id){const r=await call('/api/clinical/visit?id='+id);assert.equal(r.status,200,JSON.stringify(r));return r.data;}
before(async()=>{
 fixture=await adminFixture();
 await querySql(`INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('NOI',N'Nội tổng quát','KHAM_BENH'),('TIM',N'Tim mạch','KHAM_BENH');
 INSERT dbo.BuongKham(maBuong,maKhoa,tenBuong) VALUES('QA_TEST_NOI','NOI',N'QA_TEST_Nội'),('QA_TEST_TIM','TIM',N'QA_TEST_Tim');
 INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('QA_TEST_DOC',N'Trần Minh Anh','NOI',N'QA_TEST_Bác sĩ','BAC_SI'),('QA_TEST_DOC2',N'QA_TEST_Bác sĩ khác','TIM',N'QA_TEST_Bác sĩ','BAC_SI');
 INSERT dbo.PhanCongKham(maPhanCong,maBuong,maBacSi,ngayKham,caKham) VALUES
 ('QA_TEST_N1','QA_TEST_NOI','QA_TEST_DOC',CONVERT(date,SYSDATETIME()),'SANG'),('QA_TEST_N2','QA_TEST_NOI','QA_TEST_DOC',CONVERT(date,SYSDATETIME()),'CHIEU'),
 ('QA_TEST_T1','QA_TEST_TIM','QA_TEST_DOC2',CONVERT(date,SYSDATETIME()),'SANG'),('QA_TEST_T2','QA_TEST_TIM','QA_TEST_DOC2',CONVERT(date,SYSDATETIME()),'CHIEU');SELECT 'ok';`);
 await open();
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(fixture)await fixture.close();});

test('reception creates patient and queue atomically, selects an existing patient without duplication',async()=>{
 const a=await receive(),b=await receive({patientId:a.patientId});assert.equal(a.patientId,b.patientId);assert.notEqual(a.visitId,b.visitId);assert.notEqual(a.queueNumber,b.queueNumber);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.BenhNhan WHERE maBenhNhan=@id',{id:a.patientId})),1);
 const queue=(await call('/api/queue?history=1')).data;assert.equal(queue.find(v=>v.id===a.visitId).doctorStaffId,'QA_TEST_DOC');
});
test('invalid or unavailable reception does not leave a ghost patient or visit',async()=>{
 const before=Number(await querySql('SELECT COUNT(*) FROM dbo.BenhNhan'));
 assert.equal((await call('/api/visits','POST',{...person,name:'QA_TEST_BAD',phone:'bad'})).status,400);
 assert.equal((await call('/api/visits','POST',{...person,dept:'Da liễu'})).status,409);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.BenhNhan')),before);
});
test('reception edits demographics and routes or cancels the exact selected visit',async()=>{
 const a=await receive({phone:'0900000302'}),b=await receive({patientId:a.patientId});
 assert.equal((await call('/api/patients','PUT',{...person,id:a.patientId,name:'QA_TEST_SỬA',phone:'0900000302'})).status,200);
 assert.equal(await querySql('SELECT hoTen FROM dbo.BenhNhan WHERE maBenhNhan=@id',{id:a.patientId}),'QA_TEST_SỬA');
 assert.equal((await call('/api/visits','PATCH',{visitId:a.visitId,action:'transfer',dept:'Tim mạch',reason:'QA_TEST_ĐỔI_KHOA'})).status,200);
 assert.equal((await detail(a.visitId)).doctorStaffId,'QA_TEST_DOC2');assert.equal((await detail(b.visitId)).department,'Nội tổng quát');
 assert.equal((await call('/api/visits','PATCH',{visitId:b.visitId,action:'cancel',reason:'QA_TEST_HỦY'})).status,200);assert.equal((await detail(b.visitId)).status,'Đã hủy');
});
test('doctor draft and vitals save together in SQL and hydrate on queue reload',async()=>{
 const a=await receive({phone:'0900000303'});
 const r=await call('/api/clinical/exam','POST',{visitId:a.visitId,note:{...note,reason:'QA_TEST_REASON',comorbidities:'QA_TEST_COMORB'},revision:0,doctorStaffId:'QA_TEST_DOC'});assert.equal(r.status,200,JSON.stringify(r));assert.ok(r.data.revision>0);assert.equal(r.data.locked,false);
 assert.equal(r.data.note.reason,'QA_TEST_REASON');assert.equal(r.data.note.comorbidities,'QA_TEST_COMORB');
 assert.equal(r.data.note.diagnosis,note.diagnosis);assert.equal(r.data.status,'Đang khám');
 const refreshed=(await call('/api/queue?history=1')).data.find(v=>v.id===a.visitId);assert.deepEqual(refreshed.note,r.data.note);
 assert.equal(await querySql('SELECT chanDoanXacDinh FROM dbo.HoSoKham WHERE maLuotKham=@id',{id:a.visitId}),note.diagnosis);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.PhieuSinhHieu WHERE maLuotKham=@id',{id:a.visitId})),1);
});
test('save rejects wrong doctor, stale revision, invalid vitals, and incomplete completion without partial writes',async()=>{
 const a=await receive({phone:'0900000304'});
 assert.equal((await call('/api/clinical/exam','POST',{visitId:a.visitId,note,revision:0,doctorStaffId:'QA_TEST_DOC2'})).status,403);
 assert.equal((await call('/api/clinical/exam','POST',{visitId:a.visitId,note:{...note,vitals:{spo2:120}},revision:0})).status,400);
 assert.equal((await call('/api/clinical/exam','POST',{visitId:a.visitId,note:{symptoms:'QA_TEST'},revision:0,lock:true})).status,400);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.HoSoKham WHERE maLuotKham=@id',{id:a.visitId})),0);
 const saved=await call('/api/clinical/exam','POST',{visitId:a.visitId,note,revision:0});assert.equal(saved.status,200);
 assert.equal((await call('/api/clinical/exam','POST',{visitId:a.visitId,note:{...note,diagnosis:'QA_TEST_STALE'},revision:0})).status,409);
 assert.equal((await detail(a.visitId)).note.diagnosis,note.diagnosis);
});
test('complete locks the visit; correction requires reason and persists across restart',async()=>{
 const a=await receive({phone:'0900000305'});const saved=await call('/api/clinical/exam','POST',{visitId:a.visitId,note,revision:0,lock:true});assert.equal(saved.status,200,JSON.stringify(saved));assert.equal(saved.data.locked,true);assert.equal(saved.data.status,'Hoàn tất');
 assert.equal((await call('/api/clinical/exam','POST',{visitId:a.visitId,note,revision:saved.data.revision})).status,409);
 assert.equal((await call('/api/visits','PATCH',{visitId:a.visitId,action:'cancel',reason:'QA_TEST'})).status,409);
 assert.equal((await call('/api/clinical/exam','POST',{visitId:a.visitId,note,revision:saved.data.revision,reopen:true})).status,400);
 const reopened=await call('/api/clinical/exam','POST',{visitId:a.visitId,note,revision:saved.data.revision,reopen:true,reason:'QA_TEST_ĐÍNH_CHÍNH'});assert.equal(reopened.status,200);assert.equal(reopened.data.locked,false);
 await new Promise(r=>server.close(r));await open();assert.deepEqual((await detail(a.visitId)).note,reopened.data.note);assert.equal((await detail(a.visitId)).revision,reopened.data.revision);
});

test('doctor identity and ICD lookup use the configured SQL database without inventing duty assignments',async()=>{
 await querySql("INSERT dbo.DanhMucICD10(maICD,tenBenh) VALUES('QA_TEST_Z00',N'QA_TEST_CHAN_DOAN'); SELECT 'ok';");
 const before=Number(await querySql('SELECT COUNT(*) FROM dbo.PhanCongKham'));
 const doctors=await call('/api/clinical/doctors');assert.equal(doctors.status,200);assert.ok(doctors.data.some(d=>d.id==='QA_TEST_DOC'));assert.deepEqual(Object.keys(doctors.data[0]).sort(),['id','name']);
 const icd=await call('/api/icd10?q=QA_TEST_Z00');assert.equal(icd.status,200);assert.equal(icd.data[0].tenBenh,'QA_TEST_CHAN_DOAN');
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.PhanCongKham')),before);
});

test('reception prefers a room with an actual duty over an alphabetically earlier unassigned room',async()=>{
 await querySql("INSERT dbo.BuongKham(maBuong,maKhoa,tenBuong) VALUES('QA_TEST_A_NO_DUTY','NOI',N'QA_TEST no duty');SELECT 'ok';");
 const r=await receive({phone:'0900000399',reason:'QA_TEST_DUTY_ROOM'});
 assert.equal(r.doctorStaffId,'QA_TEST_DOC');
 assert.notEqual(await querySql('SELECT maBuong FROM dbo.LuotKham WHERE maLuotKham=@id',{id:r.visitId}),'QA_TEST_A_NO_DUTY');
});

test('reception and transfer resolve real department names and custom IDs instead of hard-coded TIM',async()=>{
 await querySql("UPDATE dbo.Khoa SET tenKhoa=N'QA_TEST_OLD_TIM' WHERE maKhoa='TIM'; INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('TIM_12',N'tim Mạch','KHAM_BENH'); INSERT dbo.BuongKham(maBuong,maKhoa,tenBuong) VALUES('QA_TEST_TIM12','TIM_12',N'QA_TEST Tim mạch 12'); SELECT 'ok';");
 const result=await receive({name:'QA_TEST_CUSTOM_CODE',phone:'0900000398',dept:'Tim mạch'});
 assert.equal(await querySql('SELECT maBuong FROM dbo.LuotKham WHERE maLuotKham=@id',{id:result.visitId}),'QA_TEST_TIM12');
 const other=await receive({patientId:result.patientId,dept:'TIM_12'});
 assert.equal(await querySql('SELECT maBuong FROM dbo.LuotKham WHERE maLuotKham=@id',{id:other.visitId}),'QA_TEST_TIM12');
 assert.equal((await call('/api/visits','PATCH',{visitId:other.visitId,action:'transfer',dept:'Nội tổng quát',reason:'QA_TEST_TRANSFER_BACK'})).status,200);
 assert.equal((await call('/api/visits','PATCH',{visitId:other.visitId,action:'transfer',dept:'Tim mạch',reason:'QA_TEST_TRANSFER_CUSTOM'})).status,200);
 assert.equal(await querySql('SELECT maBuong FROM dbo.LuotKham WHERE maLuotKham=@id',{id:other.visitId}),'QA_TEST_TIM12');
});
