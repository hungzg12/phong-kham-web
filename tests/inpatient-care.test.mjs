import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {adminFixture} from './admin-fixture.mjs';
import {querySql} from '../server/admin-store.mjs';
import {financeAction,financeState} from '../server/finance.mjs';
import {inpatientCare,dischargeCase} from '../server/inpatient-care.mjs';
import {ancillaryState,performCare,bedAction} from '../server/ancillary.mjs';
import {createApiMiddleware} from '../server/api-router.mjs';
import http from 'node:http';
test('inpatient sheet and order persist, revisions and assigned doctor are enforced, nursing execution survives reload',async()=>{
 const f=await adminFixture();try{
 await querySql(`INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('QA_TEST_K',N'QA_TEST','LAM_SANG');
 INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('QA_TEST_DOC',N'QA_TEST','QA_TEST_K',N'QA_TEST','BAC_SI'),('QA_TEST_DOC2',N'QA_TEST','QA_TEST_K',N'QA_TEST','BAC_SI'),('QA_TEST_NURSE',N'QA_TEST','QA_TEST_K',N'QA_TEST','DIEU_DUONG');
 INSERT dbo.BenhNhan(maBenhNhan,hoTen,ngaySinh,gioiTinh,soDienThoai) VALUES('QA_TEST_PAT',N'QA_TEST','1990-01-01',N'Nam','0900009991');
 INSERT dbo.DotDieuTri(maDotDieuTri,maBenhNhan,maKhoaDieuTri,lyDoNhapVien,chanDoanVaoVien,maBacSiDieuTriChinh) VALUES('QA_TEST_ADM','QA_TEST_PAT','QA_TEST_K',N'QA_TEST',N'QA_TEST','QA_TEST_DOC');SELECT 'ok';`);
 const call=d=>inpatientCare({role:'doctor',staffId:'QA_TEST_DOC',episodeId:'QA_TEST_ADM',requestId:randomUUID(),...d});
 const draft={action:'sheet',note:{symptoms:'QA_TEST symptoms',diagnosis:'QA_TEST diagnosis',plan:'QA_TEST plan'},revision:0,requestId:randomUUID()};
 const sheet=await call(draft);assert.equal((await call(draft)).id,sheet.id);
 let row=(await ancillaryState()).careSheets.find(s=>s.id===sheet.id);assert.equal(row.note.diagnosis,'QA_TEST diagnosis');
 await assert.rejects(call({...draft,id:sheet.id,requestId:randomUUID()}),e=>e.status===409);
 await assert.rejects(call({...draft,id:sheet.id,staffId:'QA_TEST_DOC2',revision:row.revision,requestId:randomUUID()}),e=>e.status===403);
 await call({...draft,id:sheet.id,revision:row.revision,lock:true,requestId:randomUUID()});row=(await ancillaryState()).careSheets.find(s=>s.id===sheet.id);assert.equal(row.locked,true);
 await assert.rejects(call({action:'order',sheetId:sheet.id,order:{kind:'Chăm sóc',dose:'QA_TEST',scheduled:'2026-11-23T09:00'}}),e=>e.status===409);
 await call({action:'reopen',id:sheet.id,revision:row.revision,reason:'QA_TEST correction'});
 const request={action:'order',sheetId:sheet.id,order:{kind:'Chăm sóc',dose:'QA_TEST care',scheduled:'2026-11-23T15:00'},requestId:randomUUID()};
 const order=await call(request);assert.equal((await call(request)).id,order.id);
 assert.equal((await ancillaryState()).rounds.find(o=>o.id===order.id).scheduled,'2026-11-23T15:00:00');
 await performCare({id:order.id,revision:0,role:'nurse',staffId:'QA_TEST_NURSE',patientCheck:'QA_TEST_PAT',check_patient:true,check_medicine:true,check_dose:true,check_route:true,check_time:true,note:'QA_TEST_DONE'});
 assert.equal((await ancillaryState()).rounds.find(o=>o.id===order.id).status,'Đã thực hiện');
 }finally{await f.close();}
});

test('admission API isolates QA database, rejects repeated occupancy and serializes simultaneous admissions',async()=>{
 const f=await adminFixture();let server;try{
 await querySql(`INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('QA_TEST_K',N'QA_TEST','LAM_SANG');
 INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('QA_TEST_DOC',N'QA_TEST','QA_TEST_K',N'QA_TEST','BAC_SI'),('QA_TEST_NURSE',N'QA_TEST','QA_TEST_K',N'QA_TEST','DIEU_DUONG');
 INSERT dbo.BenhNhan(maBenhNhan,hoTen,ngaySinh,gioiTinh,soDienThoai) VALUES('QA_TEST_PAT',N'QA_TEST','1990-01-01',N'Nam','0900009991'),('QA_TEST_PAT2',N'QA_TEST','1990-01-01',N'Nam','0900009992');
 INSERT dbo.BuongBenh(maBuongBenh,maKhoa,tenBuong,soGiuongToiDa) VALUES('QA_TEST_WARD','QA_TEST_K',N'QA_TEST',2);
 INSERT dbo.GiuongBenh(maGiuong,maBuongBenh,soHieuGiuong,donGiaNgay) VALUES('QA_TEST_BED','QA_TEST_WARD','QA_TEST_1',1000),('QA_TEST_BED2','QA_TEST_WARD','QA_TEST_2',1000);SELECT 'ok';`);
 const api=createApiMiddleware({trustedTest:true});server=http.createServer((req,res)=>api(req,res,()=>{res.writeHead(404);res.end();}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const send=d=>fetch(base+'/api/inpatient/admit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(d)});
 const payload={patientId:'QA_TEST_PAT',bedId:'QA_TEST_BED',doctor:'QA_TEST_DOC',staffId:'QA_TEST_NURSE',diagnosis:'QA_TEST',reason:'QA_TEST',requestId:randomUUID()};
 const response=await send(payload);assert.equal(response.status,201,await response.clone().text());const saved=await response.json();
 const retry=await send(payload);assert.equal(retry.status,201);assert.equal((await retry.json()).admissionId,saved.admissionId);
 const results=await Promise.all([send({...payload,patientId:'QA_TEST_PAT2',requestId:randomUUID()}),send({...payload,patientId:'QA_TEST_PAT2',bedId:'QA_TEST_BED2',requestId:randomUUID()})]);
 assert.equal(results.filter(r=>r.status===201).length,1);assert.equal(results.filter(r=>r.status===409).length,1);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.DotDieuTri')),2);
 assert.equal(Number(await querySql("SELECT COUNT(*) FROM (SELECT maGiuong FROM dbo.PhanGiuong WHERE trangThai='DANG_SU_DUNG' GROUP BY maGiuong HAVING COUNT(*)>1) x")),0);
 const allocation={action:'assign',id:'QA_TEST_BED',patientId:'QA_TEST_PAT',role:'nurse',staffId:'QA_TEST_NURSE'};
 await bedAction(allocation);await bedAction(allocation);
 assert.equal(Number(await querySql("SELECT COUNT(*) FROM dbo.PhanGiuong WHERE maGiuong='QA_TEST_BED' AND trangThai='DANG_SU_DUNG'")),1);
 await assert.rejects(bedAction({...allocation,patientId:'QA_TEST_PAT2'}),e=>e.status===409);
 await assert.rejects(dischargeCase({role:'nurse',staffId:'QA_TEST_NURSE',admissionId:saved.admissionId}),e=>e.status===403);

 const doctorCall=d=>inpatientCare({role:'doctor',staffId:'QA_TEST_DOC',episodeId:saved.admissionId,requestId:randomUUID(),...d});
 const sheet=await doctorCall({action:'sheet',note:{symptoms:'QA_TEST_INPATIENT_PROGRESS',diagnosis:'QA_TEST_DIAGNOSIS',plan:'QA_TEST_CARE'}});
 const order=await doctorCall({action:'order',sheetId:sheet.id,order:{kind:'Chăm sóc',dose:'QA_TEST_CARE',scheduled:'2026-11-23T15:00'}});
 const discharge={role:'doctor',staffId:'QA_TEST_DOC',admissionId:saved.admissionId};
 await assert.rejects(dischargeCase(discharge),e=>e.status===409);
 assert.equal(await querySql('SELECT trangThai FROM dbo.DotDieuTri WHERE maDotDieuTri=@id',{id:saved.admissionId}),'DANG_DIEU_TRI');
 await performCare({id:order.id,revision:0,role:'nurse',staffId:'QA_TEST_NURSE',patientCheck:'QA_TEST_PAT',check_patient:true,check_medicine:true,check_dose:true,check_route:true,check_time:true,note:'QA_TEST_DONE'});
 await querySql("INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('QA_TEST_CASH',N'QA_TEST_CASH','QA_TEST_K',N'QA_TEST','THU_NGAN');SELECT 'ok';");
 const cash=(action,data={})=>financeAction({action,role:'cashier',staffId:'QA_TEST_CASH',requestId:randomUUID(),...data});
 await cash('openShift',{name:'QA_TEST_INPATIENT_SHIFT',opening:0});
 const bill=await cash('createSettlement',{patient:'QA_TEST_PAT',episodeId:saved.admissionId,insurance:0,lines:[{description:'QA_TEST_INPATIENT_COST',quantity:1,price:1000}]});
 await assert.rejects(dischargeCase(discharge),e=>e.status===409);
 const due=(await financeState()).settlements.find(q=>q.id===bill.id);
 await cash('settle',{id:bill.id,signedBy:'QA_TEST_SIGNER',expectedBalance:due.balance});
 assert.equal((await financeState()).settlements.find(q=>q.id===bill.id).status,'Đã thanh toán');
 await dischargeCase({role:'doctor',staffId:'QA_TEST_DOC',admissionId:saved.admissionId,bedId:'QA_TEST_BED2'});
 await dischargeCase({role:'doctor',staffId:'QA_TEST_DOC',admissionId:saved.admissionId});
 assert.equal(await querySql('SELECT trangThai FROM dbo.DotDieuTri WHERE maDotDieuTri=@id',{id:saved.admissionId}),'DA_XUAT_VIEN');
 assert.equal(await querySql("SELECT trangThaiHienTai FROM dbo.GiuongBenh WHERE maGiuong='QA_TEST_BED'"),'DANG_VE_SINH');
 assert.equal(await querySql("SELECT trangThaiHienTai FROM dbo.GiuongBenh WHERE maGiuong='QA_TEST_BED2'"),'DANG_SU_DUNG');
 const clean={action:'clean',id:'QA_TEST_BED',role:'nurse',staffId:'QA_TEST_NURSE'};
 await bedAction(clean);
 assert.equal(await querySql("SELECT trangThaiHienTai FROM dbo.GiuongBenh WHERE maGiuong='QA_TEST_BED'"),'TRONG');
 await assert.rejects(bedAction(clean),e=>e.status===409);
 assert.equal(Number(await querySql("SELECT COUNT(*) FROM dbo.NhatKyThayDoi WHERE loaiDoiTuong='DotDieuTri' AND hanhDong='DISCHARGE' AND maDoiTuong=@id",{id:saved.admissionId})),1);

 }finally{if(server)await new Promise(r=>server.close(r));await f.close();}
});
