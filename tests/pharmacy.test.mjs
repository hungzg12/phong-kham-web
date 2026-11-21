import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
import {adminFixture} from './admin-fixture.mjs';
import {querySql} from '../server/admin-store.mjs';
import {receivePatient} from '../server/clinic-flow.mjs';
import {pharmacyAction,pharmacyState} from '../server/pharmacy.mjs';
import {createApiMiddleware} from '../server/api-router.mjs';
let fixture,visit,rx;
const body=(action,data={},role='pharmacist')=>({action,role,staffId:role==='doctor'?'QA_TEST_DOC':'QA_TEST_PHARM',requestId:randomUUID(),...data});
const act=(action,data={},role)=>pharmacyAction(body(action,data,role));
const count=async table=>Number(await querySql(`SELECT COUNT(*) FROM dbo.${table}`));
const draft=(lines=[{medicine:'QA_TEST_DRUG',quantity:3,dose:'QA_TEST_DOSE',route:'Uống',frequency:'QA_TEST_FREQ',days:2}])=>({patient:visit.patientId,episodeId:visit.visitId,diagnosis:'QA_TEST_DIAG',advice:'QA_TEST_ADVICE',lines});
const movement=(extra={})=>({kind:'Nhập kho',medicine:'QA_TEST_DRUG',warehouse:'QA_TEST_STORE',quantity:5,price:100,lot:'QA_TEST_NEW',expiry:'2092-01-01',reason:'QA_TEST_IMPORT',...extra});
before(async()=>{
 fixture=await adminFixture();
 await querySql(`INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('NOI',N'Nội tổng quát','KHAM_BENH');
 INSERT dbo.BuongKham(maBuong,maKhoa,tenBuong) VALUES('QA_TEST_ROOM','NOI',N'QA_TEST_ROOM');
 INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('QA_TEST_DOC',N'QA_TEST_DOC','NOI',N'Bác sĩ','BAC_SI'),('QA_TEST_PHARM',N'QA_TEST_PHARM','NOI',N'Dược sĩ','DUOC_SI'),('QA_TEST_NURSE',N'QA_TEST_NURSE','NOI',N'Điều dưỡng','DIEU_DUONG');
 INSERT dbo.PhanCongKham(maPhanCong,maBuong,maBacSi,ngayKham,caKham) VALUES('QA_TEST_AM','QA_TEST_ROOM','QA_TEST_DOC',CONVERT(date,SYSDATETIME()),'SANG'),('QA_TEST_PM','QA_TEST_ROOM','QA_TEST_DOC',CONVERT(date,SYSDATETIME()),'CHIEU');
 INSERT dbo.HangHoaYTe(maHang,tenHang,loaiHang,donViCoSo,donGiaXuatCoSo) VALUES('QA_TEST_DRUG',N'QA_TEST_DRUG','THUOC',N'Viên',500),('QA_TEST_SHORT',N'QA_TEST_SHORT','THUOC',N'Viên',500);
 INSERT dbo.Thuoc(maHang,hoatChat,hamLuong,duongDung,dangBaoChe) VALUES('QA_TEST_DRUG',N'QA_TEST',N'QA_TEST',N'Uống',N'QA_TEST'),('QA_TEST_SHORT',N'QA_TEST',N'QA_TEST',N'Uống',N'QA_TEST');
 INSERT dbo.KhoDuoc(maKho,tenKho,maKhoa,loaiKho) VALUES('QA_TEST_STORE',N'QA_TEST_STORE','NOI','KHO_TONG'),('QA_TEST_DEST',N'QA_TEST_DEST','NOI','KHO_NOI_TRU');
 INSERT dbo.LoHang(maLoHang,maHang,soLoNhaSanXuat,ngaySanXuat,hanSuDung,soLuongNhap,donGiaNhap) VALUES('QA_TEST_L1','QA_TEST_DRUG','QA_TEST_LOT1','2020-01-01','2090-01-01',2,100),('QA_TEST_L2','QA_TEST_DRUG','QA_TEST_LOT2','2020-01-01','2091-01-01',10,100),('QA_TEST_OLD','QA_TEST_DRUG','QA_TEST_OLD','2020-01-01','2020-02-01',10,100),('QA_TEST_LOCK','QA_TEST_DRUG','QA_TEST_LOCK','2020-01-01','2089-01-01',10,100);
 INSERT dbo.LoTonKho(maLoTon,maKho,maLoHang,soLuongTon,soLuongKhaDung,trangThaiKhoa) VALUES('QA_TEST_S1','QA_TEST_STORE','QA_TEST_L1',2,2,0),('QA_TEST_S2','QA_TEST_STORE','QA_TEST_L2',10,10,0),('QA_TEST_OLD','QA_TEST_STORE','QA_TEST_OLD',10,10,0),('QA_TEST_LOCK','QA_TEST_STORE','QA_TEST_LOCK',10,10,1);SELECT 'ok';`);
 visit=await receivePatient({name:'QA_TEST_PHARM_PAT',phone:'0900000801',birth:'1990-01-01',gender:'Nam',dept:'Nội tổng quát'});
});
after(async()=>{if(fixture)await fixture.close();});

test('doctor saves SQL prescription only for assigned patient; roles, invalid and duplicate medicines rejected',async()=>{
 await assert.rejects(act('savePrescription',draft()),e=>e.status===403);
 await assert.rejects(act('savePrescription',{...draft(),staffId:'QA_TEST_PHARM'},'doctor'),e=>e.status===403);
 await assert.rejects(act('savePrescription',{...draft(),patient:'QA_TEST_OTHER'},'doctor'),e=>e.status===409);
 await assert.rejects(act('savePrescription',draft([draft().lines[0],draft().lines[0]]),'doctor'),e=>e.status===400);
 const b=body('savePrescription',draft(),'doctor');rx=await pharmacyAction(b);assert.equal((await pharmacyAction(b)).id,rx.id);
 let row=(await pharmacyState()).prescriptions.find(r=>r.id===rx.id);assert.equal(row.status,'Nháp');assert.equal(row.lines[0].quantity,3);assert.equal(row.patient,visit.patientId);
 assert.equal(await count('DonThuoc'),1);
});
test('pharmacist cannot approve a physician prescription; unapproved order cannot dispense',async()=>{
 await assert.rejects(act('approvePrescription',{id:rx.id}),e=>e.status===403);
 await assert.rejects(act('dispense',{id:rx.id,warehouse:'QA_TEST_STORE'}),e=>e.status===409);
 await act('approvePrescription',{id:rx.id},'doctor');assert.equal((await pharmacyState()).prescriptions[0].status,'Đã xác nhận');
});
test('dispensing splits FEFO lots, skips expired and locked stock, writes balanced SQL ledger, retries do not deduct twice',async()=>{
 const b=body('dispense',{id:rx.id,warehouse:'QA_TEST_STORE'});const results=await Promise.all([pharmacyAction(b),pharmacyAction(b)]);assert.equal(results[0].id,results[1].id);
 const state=await pharmacyState();const row=state.prescriptions.find(r=>r.id===rx.id);assert.equal(row.status,'Đã cấp phát');assert.equal(row.allocations.length,2);
 assert.equal(Number(state.inventory.find(l=>l.id==='QA_TEST_S1').qty),0);assert.equal(Number(state.inventory.find(l=>l.id==='QA_TEST_S2').qty),9);
 for(const id of ['QA_TEST_OLD','QA_TEST_LOCK'])assert.equal(Number(state.inventory.find(l=>l.id===id).qty),10);
 assert.equal(await count('SoKho'),2);assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.SoKho WHERE soLuongSau<>soLuongTruoc+bienDong')),0);
 await assert.rejects(act('dispense',{id:rx.id,warehouse:'QA_TEST_STORE'}),e=>e.status===409);
});
test('insufficient second medicine rolls back all first-line stock, voucher and ledger changes',async()=>{
 const created=await act('savePrescription',draft([draft().lines[0],{...draft().lines[0],medicine:'QA_TEST_SHORT'}]),'doctor');await act('approvePrescription',{id:created.id},'doctor');
 const before=await pharmacyState();const vouchers=await count('PhieuKho');
 await assert.rejects(act('dispense',{id:created.id,warehouse:'QA_TEST_STORE'}),e=>e.status===409);
 const after=await pharmacyState();assert.deepEqual(after.inventory,before.inventory);assert.equal(await count('PhieuKho'),vouchers);assert.deepEqual(after.ledger,before.ledger);assert.equal(after.prescriptions.find(r=>r.id===created.id).status,'Đã xác nhận');
});
test('import draft does not change stock until approved; persists and rejects replay with changed key contents',async()=>{
 const b=body('saveMovement',movement());const m=await pharmacyAction(b);const before=await pharmacyState();assert.equal(before.movements.find(r=>r.id===m.id).status,'Chờ duyệt');assert.ok(!before.inventory.some(l=>l.lot==='QA_TEST_NEW'));
 await assert.rejects(pharmacyAction({...b,quantity:6}),e=>e.status===409);
 const approve=body('approveMovement',{id:m.id});await Promise.all([pharmacyAction(approve),pharmacyAction(approve)]);
 const state=await pharmacyState();assert.equal(state.movements.find(r=>r.id===m.id).status,'Đã ghi sổ');assert.equal(Number(state.inventory.find(l=>l.lot==='QA_TEST_NEW').qty),5);
 await assert.rejects(act('approveMovement',{id:m.id}),e=>e.status===409);
});
test('transfer conserves physical stock and creates both warehouse ledger entries with original lot identity',async()=>{
 const before=await pharmacyState();const total=before.inventory.reduce((s,l)=>s+Number(l.physicalQty),0);const m=await act('saveMovement',movement({kind:'Điều chuyển',quantity:2,destination:'QA_TEST_DEST'}));await act('approveMovement',{id:m.id});
 const state=await pharmacyState();assert.equal(state.inventory.reduce((s,l)=>s+Number(l.physicalQty),0),total);assert.equal(Number(state.inventory.find(l=>l.warehouseId==='QA_TEST_DEST').qty),2);
 assert.equal(state.ledger.filter(l=>l.event===m.id).reduce((s,l)=>s+Number(l.delta),0),0);
});
test('count locks warehouse against dispensing/import; adjustment writes SQL balance and unlocks once',async()=>{
 const c=await act('saveCount',{warehouse:'QA_TEST_STORE',medicine:'QA_TEST_DRUG',lotId:'QA_TEST_S2',actual:6,reason:'QA_TEST_COUNT'});
 await assert.rejects(act('saveMovement',movement()),e=>e.status===409);
 await assert.rejects(act('dispense',{id:rx.id,warehouse:'QA_TEST_STORE'}),e=>e.status===409);
 await act('approveCount',{id:c.id});const state=await pharmacyState();assert.equal(state.counts.find(x=>x.id===c.id).status,'Đã điều chỉnh');assert.equal(Number(state.inventory.find(l=>l.id==='QA_TEST_S2').qty),6);assert.ok(!state.warehouses.find(w=>w.id==='QA_TEST_STORE').countId);
 await assert.rejects(act('approveCount',{id:c.id}),e=>e.status===409);
});
test('cancel count releases lock without changing stock; cancel movement and expired import do not change stock',async()=>{
 const before=(await pharmacyState()).inventory;const c=await act('saveCount',{warehouse:'QA_TEST_STORE',medicine:'QA_TEST_DRUG',lotId:'QA_TEST_S2',actual:4,reason:'QA_TEST'});await act('cancelCount',{id:c.id,reason:'QA_TEST_CANCEL'});assert.deepEqual((await pharmacyState()).inventory,before);
 const m=await act('saveMovement',movement({expiry:'2020-01-01'}));await assert.rejects(act('approveMovement',{id:m.id}),e=>e.status===400);await act('cancelMovement',{id:m.id,reason:'QA_TEST_CANCEL'});assert.deepEqual((await pharmacyState()).inventory,before);
});
test('create product requires actual medical details and persists stock only on import approval; warehouse settings survive readback',async()=>{
 const values=movement({productId:'QA_TEST_NEW_DRUG',name:'QA_TEST_NEW_DRUG',unit:'Viên',productType:'Thuốc'});await assert.rejects(act('createProduct',values),e=>e.status===400);
 const m=await act('createProduct',{...values,ingredient:'QA_TEST',strength:'QA_TEST',route:'Uống',form:'QA_TEST'});await act('approveMovement',{id:m.id});assert.ok((await pharmacyState()).stock.some(s=>s.id==='QA_TEST_NEW_DRUG'));
 const w=await act('saveWarehouse',{name:'QA_TEST_WAREHOUSE',kind:'Kho tổng',location:'QA_TEST',manager:'QA_TEST_PHARM'});let row=(await pharmacyState()).warehouses.find(s=>s.id===w.id);assert.equal(row.manager,'QA_TEST_PHARM');await act('toggleWarehouse',{id:w.id});row=(await pharmacyState()).warehouses.find(s=>s.id===w.id);assert.equal(row.status,'Tạm ngưng');
});
test('HTTP pharmacy API loads SQL state and blocks old unsafe write routes',async()=>{
 const api=createApiMiddleware({trustedTest:true}),server=http.createServer((req,res)=>api(req,res,()=>{res.writeHead(404);res.end('{}')}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const base=`http://127.0.0.1:${server.address().port}`;let res=await fetch(base+'/api/pharmacy/state');assert.equal(res.status,200);assert.deepEqual(await res.json(),await pharmacyState());for(const route of ['/api/prescriptions','/api/prescriptions/dispense','/api/pharmacy/import','/api/pharmacy/transfer','/api/pharmacy/product']){res=await fetch(base+route,{method:'POST',body:'{}'});assert.equal(res.status,410);}}finally{await new Promise(r=>server.close(r));}
});

test('different prescriptions compete for stock without overselling; incompatible units and inactive staff cannot dispense',async()=>{
 const lines=[{...draft().lines[0],quantity:8}];const a=await act('savePrescription',draft(lines),'doctor'),b=await act('savePrescription',draft(lines),'doctor');
 for(const row of [a,b])await act('approvePrescription',{id:row.id},'doctor');
 await assert.rejects(act('dispense',{id:a.id,warehouse:'QA_TEST_STORE',staffId:'QA_TEST_NURSE'}),e=>e.status===403);
 await querySql("UPDATE dbo.ChiTietDonThuoc SET donViKe=N'QA_TEST_BOX' WHERE maDon=@id;SELECT 'ok';",{id:a.id});
 await assert.rejects(act('dispense',{id:a.id,warehouse:'QA_TEST_STORE'}),e=>e.status===409);
 await querySql("UPDATE dbo.ChiTietDonThuoc SET donViKe=N'Viên' WHERE maDon=@id;SELECT 'ok';",{id:a.id});
 const results=await Promise.allSettled([act('dispense',{id:a.id,warehouse:'QA_TEST_STORE'}),act('dispense',{id:b.id,warehouse:'QA_TEST_STORE'})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.LoTonKho WHERE soLuongTon<0 OR soLuongKhaDung<0')),0);
});

test('approved conversion applies the actual base quantity and rejects unknown or expired units',async()=>{
 await querySql(`INSERT dbo.HangHoaYTe(maHang,tenHang,loaiHang,donViCoSo,donGiaXuatCoSo) VALUES('QA_TEST_UNIT',N'QA_TEST_UNIT','THUOC',N'Viên',500);
 INSERT dbo.Thuoc(maHang,hoatChat,hamLuong,duongDung,dangBaoChe) VALUES('QA_TEST_UNIT',N'QA_TEST',N'QA_TEST',N'Uống',N'QA_TEST');
 INSERT dbo.QuyDoiDonVi(maQuyDoi,maHang,tenDonViQuyDoi,heSoQuyDoi,tuNgay,denNgay,maNguoiDuyet) VALUES('QA_TEST_BOX','QA_TEST_UNIT',N'Hộp',3,'2020-01-01',NULL,'QA_TEST_PHARM'),('QA_TEST_PAST','QA_TEST_UNIT',N'QA_TEST_OLD',10,'2020-01-01','2021-01-01','QA_TEST_PHARM');
 INSERT dbo.LoHang(maLoHang,maHang,soLoNhaSanXuat,ngaySanXuat,hanSuDung,soLuongNhap,donGiaNhap) VALUES('QA_TEST_ULOT','QA_TEST_UNIT','QA_TEST_UNIT','2020-01-01','2095-01-01',10,100);
 INSERT dbo.LoTonKho(maLoTon,maKho,maLoHang,soLuongTon,soLuongKhaDung) VALUES('QA_TEST_USTOCK','QA_TEST_STORE','QA_TEST_ULOT',10,10);SELECT 'ok';`);
 for(const unit of ['QA_TEST_UNKNOWN','QA_TEST_OLD'])await assert.rejects(act('savePrescription',draft([{...draft().lines[0],medicine:'QA_TEST_UNIT',quantity:2,unit}]),'doctor'),e=>e.status===409);
 const r=await act('savePrescription',draft([{...draft().lines[0],medicine:'QA_TEST_UNIT',quantity:2,unit:'Hộp'}]),'doctor');
 let state=await pharmacyState(),row=state.prescriptions.find(x=>x.id===r.id);assert.equal(row.lines[0].baseQuantity,6);assert.equal(row.lines[0].price,1500);
 await act('approvePrescription',{id:r.id},'doctor');await act('dispense',{id:r.id,warehouse:'QA_TEST_STORE'});
 state=await pharmacyState();row=state.prescriptions.find(x=>x.id===r.id);assert.equal(row.lines[0].dispensed,2);assert.equal(row.allocations[0].quantity,6);assert.equal(Number(state.inventory.find(x=>x.id==='QA_TEST_USTOCK').qty),4);
});

test('returns require original dispensing line; concurrent returns never exceed issued quantity and preserve lot ledger',async()=>{
 const state=await pharmacyState(),r=state.prescriptions.find(x=>x.lines.some(l=>l.medicine==='QA_TEST_UNIT')),line=r.allocations[0];
 const values=movement({kind:'Hoàn trả',medicine:'QA_TEST_UNIT',warehouse:'QA_TEST_STORE',sourceLine:line.sourceLine,lot:line.lot,expiry:line.expiry,quantity:2});
 await assert.rejects(act('saveMovement',{...values,sourceLine:undefined}),e=>e.status===400);
 await assert.rejects(act('saveMovement',{...values,quantity:7}),e=>e.status===409);
 const m=await act('saveMovement',values);const b=body('approveMovement',{id:m.id});await Promise.all([pharmacyAction(b),pharmacyAction(b)]);
 assert.equal(Number((await pharmacyState()).inventory.find(x=>x.id==='QA_TEST_USTOCK').qty),6);
 const a=await act('saveMovement',{...values,quantity:3}),c=await act('saveMovement',{...values,quantity:3});
 const results=await Promise.allSettled([act('approveMovement',{id:a.id}),act('approveMovement',{id:c.id})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
 assert.equal(Number(await querySql('SELECT soLuongDaHoan FROM dbo.ChiTietPhieuKho WHERE maChiTietKho=@id',{id:line.sourceLine})),5);
 assert.equal(Number((await pharmacyState()).inventory.find(x=>x.id==='QA_TEST_USTOCK').qty),9);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.SoKho WHERE soLuongSau<>soLuongTruoc+bienDong')),0);
});
