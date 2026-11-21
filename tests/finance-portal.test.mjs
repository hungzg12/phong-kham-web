import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
import {adminFixture} from './admin-fixture.mjs';
import {querySql} from '../server/admin-store.mjs';
import {receivePatient} from '../server/clinic-flow.mjs';
import {financeAction,financeState} from '../server/finance.mjs';
import {portalState,portalAppointment} from '../server/patient-portal.mjs';
import {createApiMiddleware} from '../server/api-router.mjs';
let fixture,v1,v2,other,shift;
const body=(action,data={})=>({action,role:'cashier',staffId:'QA_TEST_CASH',requestId:randomUUID(),...data});
async function act(action,data={}){return financeAction(body(action,data));}
async function advance(episode,amount,kind='Tạm ứng'){
 const a=await act('saveAdvance',{patient:'BN0001',episodeId:episode,amount,kind,reason:'QA_TEST_ADVANCE'});
 await act('confirmAdvance',{id:a.id,signedBy:'QA_TEST_SIGNER'});return a;
}
async function settlement(episode,gross,insurance=0){return act('createSettlement',{patient:'BN0001',episodeId:episode,insurance,lines:[{description:'QA_TEST_COST',quantity:1,price:gross}]});}
before(async()=>{
 fixture=await adminFixture();
 await querySql(`INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('NOI',N'Nội tổng quát','KHAM_BENH');
 INSERT dbo.BuongKham(maBuong,maKhoa,tenBuong) VALUES('QA_TEST_ROOM','NOI',N'QA_TEST_ROOM');
 INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('QA_TEST_CASH',N'QA_TEST_CASH','NOI',N'Thu ngân','THU_NGAN'),('QA_TEST_DOC',N'QA_TEST_DOC','NOI',N'Bác sĩ','BAC_SI');
 INSERT dbo.BenhNhan(maBenhNhan,hoTen,ngaySinh,gioiTinh,soDienThoai) VALUES('BN0001',N'QA_TEST_MINE','1990-01-01',N'Nữ','0900000801'),('QA_TEST_OTHER',N'QA_TEST_OTHER','1991-01-01',N'Nam','0900000801');SELECT 'ok';`);
 v1=await receivePatient({patientId:'BN0001',dept:'Nội tổng quát'});v2=await receivePatient({patientId:'BN0001',dept:'Nội tổng quát'});other=await receivePatient({patientId:'QA_TEST_OTHER',dept:'Nội tổng quát'});
});
after(async()=>{if(fixture)await fixture.close();});
test('cashier requires real active staff and an open shift for confirmation',async()=>{
 await assert.rejects(financeAction(body('openShift',{name:'QA_TEST_SHIFT',opening:100,role:'patient'})),e=>e.status===403);
 await assert.rejects(financeAction(body('openShift',{name:'QA_TEST_SHIFT',opening:100,staffId:'QA_TEST_DOC'})),e=>e.status===403);
 const a=await act('saveAdvance',{patient:'BN0001',episodeId:v1.visitId,amount:1000,kind:'Tạm ứng',reason:'QA_TEST'});
 await assert.rejects(act('confirmAdvance',{id:a.id,signedBy:'QA_TEST'}),e=>e.status===409);
 await act('cancelAdvance',{id:a.id,reason:'QA_TEST_CANCEL'});
 shift=await act('openShift',{name:'QA_TEST_SHIFT',opening:100});
 await assert.rejects(act('openShift',{name:'QA_TEST_DUPLICATE',opening:0}),e=>e.status===409);
});
test('advance creates a draft, idempotent retries confirm once and refund cannot exceed balance',async()=>{
 const request=body('saveAdvance',{patient:'BN0001',episodeId:v1.visitId,amount:10000,kind:'Tạm ứng',reason:'QA_TEST'});
 const [a,b]=await Promise.all([financeAction(request),financeAction(request)]);assert.equal(a.id,b.id);
 await assert.rejects(financeAction({...request,amount:11000}),e=>e.status===409);
 const confirm=body('confirmAdvance',{id:a.id,signedBy:'QA_TEST_SIGNER'});await financeAction(confirm);await financeAction(confirm);
 assert.equal((await financeState()).advances.find(x=>x.id===a.id).status,'Đã xác nhận');
 await assert.rejects(act('confirmAdvance',{id:a.id,signedBy:'QA_TEST'}),e=>e.status===409);
 const refund=await act('saveAdvance',{patient:'BN0001',episodeId:v1.visitId,amount:11000,kind:'Hoàn tiền',reason:'QA_TEST_REFUND'});
 await assert.rejects(act('confirmAdvance',{id:refund.id,signedBy:'QA_TEST'}),e=>e.status===409);
 await act('cancelAdvance',{id:refund.id,reason:'QA_TEST_CANCEL'});
});
test('settlement uses server totals, bill details and episode-specific advances',async()=>{
 const q=await settlement(v1.visitId,15000,1000);let row=(await financeState()).settlements.find(x=>x.id===q.id);
 assert.equal(Number(row.gross),15000);assert.equal(row.advance,10000);assert.equal(row.balance,4000);
 await assert.rejects(settlement(v1.visitId,100),e=>e.status===409);
 await assert.rejects(act('settle',{id:q.id,signedBy:'QA_TEST',expectedBalance:0}),e=>e.status===409);
 const same=body('settle',{id:q.id,signedBy:'QA_TEST_SIGNER',expectedBalance:4000});const [a,b]=await Promise.all([financeAction(same),financeAction(same)]);assert.equal(a.id,b.id);
 row=(await financeState()).settlements.find(x=>x.id===q.id);assert.equal(row.status,'Đã thanh toán');assert.equal(row.received,4000);assert.equal(row.lines[0].description,'QA_TEST_COST');
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.GiaoDichThanhToan WHERE maQuyetToan=@id',{id:q.id})),1);
 await assert.rejects(advance(v1.visitId,100),e=>e.status===409);
 const second=await settlement(v2.visitId,2000);row=(await financeState()).settlements.find(x=>x.id===second.id);assert.equal(row.advance,0);assert.equal(row.balance,2000);
});
test('refund and exact-balance settlement use the actual remaining advance without zero-money transactions',async()=>{
 for(const [deposit,cost,status]of [[10000,6000,'Đã hoàn tiền'],[5000,5000,'Đã thanh toán']]){
  const visit=await receivePatient({patientId:'BN0001',dept:'Nội tổng quát'});await advance(visit.visitId,deposit);const q=await settlement(visit.visitId,cost);
  await act('settle',{id:q.id,signedBy:'QA_TEST',expectedBalance:cost-deposit});const row=(await financeState()).settlements.find(x=>x.id===q.id);assert.equal(row.status,status);assert.equal(row.refund,Math.max(0,deposit-cost));
  const count=Number(await querySql('SELECT COUNT(*) FROM dbo.GiaoDichThanhToan WHERE maQuyetToan=@id',{id:q.id}));assert.equal(count,cost===deposit?0:1);
 }
});
test('shift close reconciles only confirmed transactions and requires a variance explanation',async()=>{
 let row=(await financeState()).shifts.find(x=>x.id===shift.id);assert.equal(Number(row.expected),25100);
 await assert.rejects(act('closeShift',{id:shift.id,counted:25000,reason:''}),e=>e.status===400);
 await act('closeShift',{id:shift.id,counted:25000,reason:'QA_TEST_VARIANCE'});row=(await financeState()).shifts.find(x=>x.id===shift.id);assert.equal(row.status,'Đã đóng ca');assert.equal(Number(row.difference),-100);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.ChiTietDoiSoatCa WHERE maBaoCao=@id',{id:shift.id})),5);
 await assert.rejects(act('closeShift',{id:shift.id,counted:25000,reason:'QA_TEST'}),e=>e.status===409);
});
test('money validation and wrong patient reject without inserting a bill',async()=>{
 const before=Number(await querySql('SELECT COUNT(*) FROM dbo.QuyetToan'));
 await assert.rejects(act('saveAdvance',{patient:'BN0001',episodeId:other.visitId,amount:10,kind:'Tạm ứng',reason:'QA_TEST'}),e=>e.status===409);
 for(const amount of [-1,NaN,1.5])await assert.rejects(act('saveAdvance',{patient:'BN0001',episodeId:v2.visitId,amount,kind:'Tạm ứng',reason:'QA_TEST'}),e=>e.status===400);
 await assert.rejects(act('createSettlement',{patient:'BN0001',episodeId:v2.visitId,insurance:200,lines:[{description:'QA_TEST',price:100,quantity:1}]}),e=>e.status===400);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.QuyetToan')),before);
});
test('patient can create and cancel own appointment; same-phone other patient is excluded',async()=>{
 const a=await portalAppointment({action:'create',dept:'Nội tổng quát',day:'2026-12-01',time:'08:30',patientId:'QA_TEST_OTHER'});assert.equal(a.patientId,'BN0001');
 await querySql("INSERT dbo.LichHen(maHen,maBenhNhan,maKhoa,maBuong,ngayHen,gioHenDuKien) VALUES('QA_TEST_OTHER_APPT','QA_TEST_OTHER','NOI','QA_TEST_ROOM','2026-12-01','09:00');SELECT 'ok';");
 await assert.rejects(portalAppointment({action:'cancel',id:'QA_TEST_OTHER_APPT',reason:'QA_TEST'}),e=>e.status===404);
 await assert.rejects(portalAppointment({action:'cancel',id:a.id,reason:' '}),e=>e.status===400);
 await portalAppointment({action:'cancel',id:a.id,reason:'QA_TEST_CANCEL'});
 const state=await portalState();assert.equal(state.patient.id,'BN0001');assert.ok(!state.appointments.some(a=>a.id==='QA_TEST_OTHER_APPT'));assert.equal(state.appointments.find(x=>x.id===a.id).cancelReason,'QA_TEST_CANCEL');
 assert.ok(!state.history.some(v=>v.id===other.visitId));assert.ok(state.settlements.every(q=>q.patient==='BN0001'));
});
test('portal hides drafts and other patient results, publishes only completed exam and confirmed prescriptions',async()=>{
 await querySql(`INSERT dbo.HoSoKham(maHoSoKham,maLuotKham,maBacSi,benhSu,chanDoanXacDinh,trangThai) VALUES('QA_TEST_DRAFT',@v2,'QA_TEST_DOC',N'QA_TEST_DRAFT',N'QA_TEST_SECRET','DANG_KHAM'),('QA_TEST_EXAM',@v1,'QA_TEST_DOC',N'QA_TEST',N'QA_TEST_PUBLISHED','DA_KHOA'),('QA_TEST_OTHER_EXAM',@other,'QA_TEST_DOC',N'QA_TEST_OTHER',N'QA_TEST_OTHER_SECRET','DA_KHOA');
 UPDATE dbo.LuotKham SET trangThai='HOAN_TAT_KHAM' WHERE maLuotKham IN(@v1,@other);
 INSERT dbo.DonThuoc(maDon,maLuotKham,loaiDon,maBacSiKe,chanDoan,loiDan,thoiDiemDuyet) VALUES('QA_TEST_RX',@v1,'NGOAI_TRU','QA_TEST_DOC',N'QA_TEST_RX',N'QA_TEST_ADVICE',SYSDATETIME()),('QA_TEST_DRAFT_RX',@v2,'NGOAI_TRU','QA_TEST_DOC',N'QA_TEST_HIDDEN_RX',N'QA_TEST',NULL);
 SELECT 'ok';`,{v1:v1.visitId,v2:v2.visitId,other:other.visitId});
 const state=await portalState();const json=JSON.stringify(state);assert.equal(state.results.length,1);assert.equal(state.results[0].diagnosis,'QA_TEST_PUBLISHED');assert.equal(state.prescriptions.length,1);
 assert.ok(!json.includes('QA_TEST_SECRET'));assert.ok(!json.includes('QA_TEST_OTHER_SECRET'));assert.ok(!json.includes('QA_TEST_HIDDEN_RX'));
});
test('HTTP exposes scoped portal and finance state, rejects invalid role and survives new server',async()=>{
 async function start(){const api=createApiMiddleware({trustedTest:true});const s=http.createServer((req,res)=>api(req,res,()=>{res.writeHead(404);res.end('{}')}));await new Promise(r=>s.listen(0,'127.0.0.1',r));return s;}
 let server=await start();try{
  let response=await fetch(`http://127.0.0.1:${server.address().port}/api/portal?patientId=QA_TEST_OTHER`);const portal=await response.json();assert.equal(portal.patient.id,'BN0001');
  response=await fetch(`http://127.0.0.1:${server.address().port}/api/finance/action`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body('openShift',{role:'patient',name:'QA_TEST',opening:0}))});assert.equal(response.status,403);
  const before=await financeState();await new Promise(r=>server.close(r));server=await start();response=await fetch(`http://127.0.0.1:${server.address().port}/api/finance`);assert.deepEqual(await response.json(),before);
 }finally{await new Promise(r=>server.close(r));}
});
