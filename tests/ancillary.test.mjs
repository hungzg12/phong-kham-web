import test,{before,after} from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import {adminFixture} from './admin-fixture.mjs';
import {querySql} from '../server/admin-store.mjs';
import {receivePatient,listVisits} from '../server/clinic-flow.mjs';
import {ancillaryState,saveVitals,createLab,labAction,performCare,listBeds,bedAction} from '../server/ancillary.mjs';
import {createApiMiddleware} from '../server/api-router.mjs';
let fixture,visit,lab;
before(async()=>{
 fixture=await adminFixture();
 await querySql(`INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('NOI',N'Nội tổng quát','KHAM_BENH');
 INSERT dbo.BuongKham(maBuong,maKhoa,tenBuong) VALUES('QA_TEST_ROOM','NOI',N'QA_TEST');
 INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('QA_TEST_DOC',N'QA_TEST_DOC','NOI',N'Bác sĩ','BAC_SI'),('QA_TEST_NURSE',N'QA_TEST_NURSE','NOI',N'Điều dưỡng','DIEU_DUONG'),('QA_TEST_TECH',N'QA_TEST_TECH','NOI',N'Kỹ thuật viên','KY_THUAT_VIEN');
 INSERT dbo.DichVuKyThuat(maDichVu,tenDichVu,maKhoaThucHien,loaiDichVu,loaiKetQua,donGia) VALUES('QA_TEST_LAB',N'QA_TEST_LAB','NOI','XET_NGHIEM','XET_NGHIEM',1000),('QA_TEST_IMAGE',N'QA_TEST_IMAGE','NOI','CDHA','MO_TA',2000);SELECT 'ok';`);
 visit=await receivePatient({name:'QA_TEST_ANCILLARY',phone:'0900000701',birth:'1990-01-01',gender:'Nam',dept:'Nội tổng quát'});
});
after(async()=>{if(fixture)await fixture.close();});
const vital=()=>({role:'nurse',staffId:'QA_TEST_NURSE',patient:visit.patientId,episodeId:visit.visitId,time:'2026-11-21T09:00',pressure:'120/80',pulse:80,temperature:36.5,spo2:98,height:165,weight:60});
test('nurse vitals persist with correct visit, BMI and staff; invalid or wrong role rejected',async()=>{
 const row=await saveVitals(vital());assert.equal(row.patient,visit.patientId);assert.equal(Number(row.pulse),80);assert.ok(row.bmi>22);
 await assert.rejects(saveVitals({...vital(),role:'doctor'}),e=>e.status===403);
 await assert.rejects(saveVitals({...vital(),staffId:'QA_TEST_TECH'}),e=>e.status===403);
 await assert.rejects(saveVitals({...vital(),patient:'QA_TEST_WRONG'}),e=>e.status===409);
 await assert.rejects(saveVitals({...vital(),spo2:120}),e=>e.status===400);
 const updated=await saveVitals({...vital(),id:row.id,pulse:88});assert.equal(Number(updated.pulse),88);
 assert.equal(Number((await listVisits({history:true,id:visit.visitId}))[0].note.vitals.pulse),88);
});
test('doctor creates real lab order and cannot duplicate same service',async()=>{
 const body={role:'doctor',staffId:'QA_TEST_DOC',patient:visit.patientId,episodeId:visit.visitId,diagnosis:'QA_TEST_DIAGNOSIS',services:['QA_TEST_LAB']};
 const rows=await createLab(body);lab=rows[0];assert.equal(lab.status,'Chờ tiếp nhận');assert.equal(lab.resultRevision,0);
 await assert.rejects(createLab(body),e=>e.status===409);await assert.rejects(createLab({...body,role:'technician'}),e=>e.status===403);
});
test('technician accept/save/publish survives reads; stale and invalid transitions rejected',async()=>{
 const base={id:lab.id,role:'technician',staffId:'QA_TEST_TECH'};
 await assert.rejects(labAction({...base,action:'publish',revision:0}),e=>e.status===409);
 let row=await labAction({...base,action:'accept',revision:0});assert.equal(row.status,'Đang thực hiện');
 await assert.rejects(labAction({...base,action:'accept',revision:0}),e=>e.status===409);
 await assert.rejects(labAction({...base,action:'save',revision:row.resultRevision,rows:[],conclusion:''}),e=>e.status===400);
 row=await labAction({...base,action:'save',revision:row.resultRevision,rows:[{name:'QA_TEST_Glucose',value:'5.2',unit:'mmol/L',reference:'QA_TEST_REF'}],conclusion:'QA_TEST_KET_LUAN',critical:'Có'});assert.equal(row.status,'Chờ duyệt');assert.equal(row.resultRows[0].value,'5.2');
 assert.equal((await ancillaryState()).labs.find(l=>l.id===lab.id).conclusion,'QA_TEST_KET_LUAN');
 row=await labAction({...base,action:'publish',revision:row.resultRevision});assert.equal(row.status,'Đã phát hành');assert.ok(row.releasedAt);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.ChiSoXetNghiem')),1);
 await assert.rejects(labAction({...base,action:'save',revision:row.resultRevision,rows:[{name:'QA_TEST',value:'9',unit:'',reference:''}],conclusion:'QA_TEST',critical:'Không'}),e=>e.status===409);
 await assert.rejects(labAction({...base,role:'nurse',action:'accept',revision:0}),e=>e.status===403);
});
test('imaging result uses description subtype and updates a draft before publication',async()=>{
 const rows=await createLab({role:'doctor',staffId:'QA_TEST_DOC',patient:visit.patientId,episodeId:visit.visitId,diagnosis:'QA_TEST',services:['QA_TEST_IMAGE']});
 let row=rows.find(r=>r.service==='QA_TEST_IMAGE');const base={id:row.id,role:'technician',staffId:'QA_TEST_TECH'};
 row=await labAction({...base,action:'accept',revision:row.resultRevision});
 for(const value of ['QA_TEST_IMAGE_1','QA_TEST_IMAGE_2'])row=await labAction({...base,action:'save',revision:row.resultRevision,rows:[{name:'QA_TEST',value,unit:'',reference:''}],conclusion:value,critical:'Không'});
 assert.equal(await querySql('SELECT ketLuan FROM dbo.KetQuaMoTa'),'QA_TEST_IMAGE_2');
 row=await labAction({...base,action:'publish',revision:row.resultRevision});assert.equal(row.status,'Đã phát hành');
});
test('nurse confirms five rights for a real care order exactly once',async()=>{
 await querySql(`INSERT dbo.DotDieuTri(maDotDieuTri,maBenhNhan,maKhoaDieuTri,lyDoNhapVien,chanDoanVaoVien,maBacSiDieuTriChinh) VALUES('QA_TEST_ADMISSION',@patient,'NOI',N'QA_TEST',N'QA_TEST','QA_TEST_DOC');
 INSERT dbo.ToDieuTri(maTo,maDotDieuTri,soThuTuTo,ngayDieuTri,dienBienBenh,maBacSi) VALUES('QA_TEST_SHEET','QA_TEST_ADMISSION',1,CONVERT(date,SYSDATETIME()),N'QA_TEST','QA_TEST_DOC');
 INSERT dbo.YLenh(maYLenh,maTo,loaiYLenh,noiDungYLenh,thoiDiemBatDau,maBacSiRaYLenh) VALUES('QA_TEST_CARE','QA_TEST_SHEET','CHAM_SOC',N'QA_TEST_CHAM_SOC',SYSDATETIME(),'QA_TEST_DOC');SELECT 'ok';`,{patient:visit.patientId});
 const body={id:'QA_TEST_CARE',revision:0,role:'nurse',staffId:'QA_TEST_NURSE',patientCheck:visit.patientId,check_patient:true,check_medicine:true,check_dose:true,check_route:true,check_time:true,note:'QA_TEST_DONE'};
 await assert.rejects(performCare({...body,check_dose:false}),e=>e.status===400);
 await assert.rejects(performCare({...body,patientCheck:'QA_TEST_WRONG'}),e=>e.status===409);
 const results=await Promise.allSettled([performCare(body),performCare(body)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await ancillaryState()).rounds.find(r=>r.id===body.id).status,'Đã thực hiện');assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.LanThucHienYLenh')),1);
});

test('nurse allocates existing admission, blocks duplicate beds, and cleans only unoccupied dirty beds',async()=>{
 await querySql(`INSERT dbo.BuongBenh(maBuongBenh,maKhoa,tenBuong,soGiuongToiDa) VALUES('QA_TEST_WARD','NOI',N'QA_TEST_WARD',3);
 INSERT dbo.GiuongBenh(maGiuong,maBuongBenh,soHieuGiuong,donGiaNgay,trangThaiHienTai) VALUES('QA_TEST_BED1','QA_TEST_WARD','01',1000,'TRONG'),('QA_TEST_BED2','QA_TEST_WARD','02',1000,'TRONG'),('QA_TEST_BED3','QA_TEST_WARD','03',1000,'DANG_VE_SINH');SELECT 'ok';`);
 const body={id:'QA_TEST_BED1',role:'nurse',staffId:'QA_TEST_NURSE',action:'assign',patientId:visit.patientId};
 let row=await bedAction(body);assert.equal(row.patientId,visit.patientId);assert.equal(row.statusRaw,'DANG_SU_DUNG');
 await assert.rejects(bedAction({...body,id:'QA_TEST_BED2'}),e=>e.status===409);
 await assert.rejects(bedAction({...body,action:'clean'}),e=>e.status===409);
 row=await bedAction({...body,id:'QA_TEST_BED3',action:'clean'});assert.equal(row.statusRaw,'TRONG');
 assert.equal((await listBeds()).find(b=>b.id==='QA_TEST_BED1').admissionId,'QA_TEST_ADMISSION');
});

test('medication care uses FEFO, splits lots, writes balanced ledger and cannot deduct twice',async()=>{
 await querySql(`INSERT dbo.HangHoaYTe(maHang,tenHang,loaiHang,donViCoSo) VALUES('QA_TEST_DRUG',N'QA_TEST_DRUG','THUOC',N'Viên');
 INSERT dbo.KhoDuoc(maKho,tenKho,maKhoa,loaiKho) VALUES('QA_TEST_STORE',N'QA_TEST_STORE','NOI','KHO_NOI_TRU');
 INSERT dbo.LoHang(maLoHang,maHang,soLoNhaSanXuat,ngaySanXuat,hanSuDung,soLuongNhap,donGiaNhap) VALUES('QA_TEST_LOT1','QA_TEST_DRUG','QA_TEST_1','2020-01-01','2090-01-01',2,100),('QA_TEST_LOT2','QA_TEST_DRUG','QA_TEST_2','2020-01-01','2091-01-01',4,110),('QA_TEST_EXPIRED','QA_TEST_DRUG','QA_TEST_OLD','2020-01-01','2020-02-01',10,100);
 INSERT dbo.LoTonKho(maLoTon,maKho,maLoHang,soLuongTon,soLuongKhaDung) VALUES('QA_TEST_STOCK1','QA_TEST_STORE','QA_TEST_LOT1',2,2),('QA_TEST_STOCK2','QA_TEST_STORE','QA_TEST_LOT2',4,4),('QA_TEST_OLD','QA_TEST_STORE','QA_TEST_EXPIRED',10,10);
 INSERT dbo.YLenh(maYLenh,maTo,loaiYLenh,noiDungYLenh,maHang,coTieuHaoKho,soLuongKeHoach,donViKeHoach,thoiDiemBatDau,maBacSiRaYLenh) VALUES('QA_TEST_MED','QA_TEST_SHEET','THUOC',N'QA_TEST_MED','QA_TEST_DRUG',1,3,N'Viên',SYSDATETIME(),'QA_TEST_DOC');SELECT 'ok';`);
 const body={id:'QA_TEST_MED',revision:0,role:'nurse',staffId:'QA_TEST_NURSE',patientCheck:visit.patientId,check_patient:true,check_medicine:true,check_dose:true,check_route:true,check_time:true,warehouse:'QA_TEST_STORE'};
 assert.equal((await performCare(body)).status,'Đã thực hiện');
 const balances=JSON.parse(await querySql("SELECT (SELECT maLoTon id,soLuongTon qty FROM dbo.LoTonKho ORDER BY maLoTon FOR JSON PATH)"));
 assert.equal(Number(balances.find(l=>l.id==='QA_TEST_STOCK1').qty),0);assert.equal(Number(balances.find(l=>l.id==='QA_TEST_STOCK2').qty),3);assert.equal(Number(balances.find(l=>l.id==='QA_TEST_OLD').qty),10);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.SoKho')),2);
 assert.equal(Number(await querySql("SELECT COUNT(*) FROM dbo.LanThucHienYLenh WHERE maYLenh='QA_TEST_MED' AND trangThaiKho='DA_HACH_TOAN'")),1);
 await assert.rejects(performCare(body),e=>e.status===409);
 assert.equal(Number(await querySql("SELECT SUM(soLuongTon) FROM dbo.LoTonKho WHERE maKho='QA_TEST_STORE'")),13);
});

test('insufficient stock rolls back clinical execution, voucher, ledger and quantity',async()=>{
 await querySql(`INSERT dbo.YLenh(maYLenh,maTo,loaiYLenh,noiDungYLenh,maHang,coTieuHaoKho,soLuongKeHoach,donViKeHoach,thoiDiemBatDau,maBacSiRaYLenh) VALUES('QA_TEST_SHORT','QA_TEST_SHEET','THUOC',N'QA_TEST_SHORT','QA_TEST_DRUG',1,999,N'Viên',SYSDATETIME(),'QA_TEST_DOC');SELECT 'ok';`);
 await assert.rejects(performCare({id:'QA_TEST_SHORT',revision:0,role:'nurse',staffId:'QA_TEST_NURSE',patientCheck:visit.patientId,check_patient:true,check_medicine:true,check_dose:true,check_route:true,check_time:true,warehouse:'QA_TEST_STORE'}),e=>e.status===409);
 assert.equal(Number(await querySql("SELECT COUNT(*) FROM dbo.LanThucHienYLenh WHERE maYLenh='QA_TEST_SHORT'")),0);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.SoKho')),2);
});

test('inpatient vitals retain admission link and finalized results and care hydrate from SQL',async()=>{
 await querySql("UPDATE dbo.DotDieuTri SET maLuotKham=@visit WHERE maDotDieuTri='QA_TEST_ADMISSION';SELECT 'ok';",{visit:visit.visitId});
 const row=await saveVitals({...vital(),episodeId:'QA_TEST_ADMISSION',pulse:90});assert.equal(row.episodeId,'QA_TEST_ADMISSION');
 const state=await ancillaryState();assert.ok(state.labs.every(l=>l.status==='Đã phát hành'));assert.equal(state.rounds.find(r=>r.id==='QA_TEST_MED').status,'Đã thực hiện');
 assert.equal(state.admissions.find(a=>a.id==='QA_TEST_ADMISSION').patientId,visit.patientId);
 assert.equal((await listBeds()).find(b=>b.id==='QA_TEST_BED3').statusRaw,'TRONG');
});

test('HTTP read/write routes return durable state and validation errors without false success',async()=>{
 const api=createApiMiddleware({trustedTest:true});const server=http.createServer((req,res)=>api(req,res,()=>{res.writeHead(404);res.end('{}')}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
 try{
  let response=await fetch(url+'/api/ancillary');assert.equal(response.status,200);const state=await response.json();assert.ok(state.labs.some(l=>l.status==='Đã phát hành'));assert.ok(state.rounds.some(r=>r.id==='QA_TEST_MED'&&r.status==='Đã thực hiện'));
  response=await fetch(url+'/api/nursing/vitals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...vital(),pulse:91})});assert.equal(response.status,200);const saved=await response.json();assert.equal(Number(saved.pulse),91);
  response=await fetch(url+'/api/nursing/vitals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...vital(),role:'patient'})});assert.equal(response.status,403);
  response=await fetch(url+'/api/labs/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:lab.id,role:'technician',staffId:'QA_TEST_TECH',revision:0,action:'accept'})});assert.equal(response.status,409);
  response=await fetch(url+'/api/inpatient/beds');assert.equal(response.status,200);assert.equal((await response.json()).find(b=>b.id==='QA_TEST_BED3').statusRaw,'TRONG');
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('unverified unit conversion blocks medication without recording consumption',async()=>{
 await querySql("UPDATE dbo.YLenh SET donViKeHoach=N'Hộp',soLuongKeHoach=1 WHERE maYLenh='QA_TEST_SHORT';SELECT 'ok';");
 await assert.rejects(performCare({id:'QA_TEST_SHORT',revision:0,role:'nurse',staffId:'QA_TEST_NURSE',patientCheck:visit.patientId,check_patient:true,check_medicine:true,check_dose:true,check_route:true,check_time:true,warehouse:'QA_TEST_STORE'}),e=>e.status===409&&e.message.includes('Đơn vị'));
 assert.equal(Number(await querySql("SELECT COUNT(*) FROM dbo.LanThucHienYLenh WHERE maYLenh='QA_TEST_SHORT'")),0);
});
