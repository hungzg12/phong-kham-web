import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';

let fixture,bundle;
before(async()=>{
 await fs.mkdir('.data',{recursive:true});bundle=path.resolve('.data/QA_TEST_render_'+randomUUID()+'.mjs');
 await build({stdin:{contents:`
 import ActorHome from './src/Actors.jsx';
 import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
 import {ReferralPaperForm,ConsultationPaperForm,DischargePaperForm,MedicalBillPaperForm,PrescriptionPaperForm,MedicalRecordSummaryPaperForm} from './src/MedicalPaperForms.jsx';
 import {PatientPortalView} from './src/PatientPortal.jsx';import Auth from './src/Auth.jsx';import Inventory from './src/Inventory.jsx';import ClinicalDesk from './src/ClinicalDesk.jsx';import LabDesk from './src/LabDesk.jsx';import Business from './src/Business.jsx';import History from './src/History.jsx';import Appointments from './src/Appointments.jsx';
 import {initializeWorkspace,transact,getWorkspace} from './src/workspace.js';
 export function seed(){initializeWorkspace();transact(d=>{
 d.patients=[{id:'BN0001',name:'QA_TEST_MINE',phone:'0900000201',doctor:'Trần Minh Anh',dept:'Nội tổng quát'}, {id:'QA_TEST_OTHER',name:'QA_TEST_OTHER_NAME',phone:'0900000202',doctor:'QA_TEST_OTHER_DOCTOR',dept:'Tim mạch'}];
 d.visits=[{id:'QA_TEST_VISIT_1',patientId:'BN0001',date:'2026-11-21',time:'08:30',department:'Nội tổng quát',doctor:'Trần Minh Anh',doctorStaffId:'NV-BS01',status:'Chờ khám'}, {id:'QA_TEST_VISIT_2',patientId:'BN0001',date:'2026-11-21',time:'09:00',department:'Nội tổng quát',doctor:'Trần Minh Anh',doctorStaffId:'NV-BS01',status:'Chờ khám'}, {id:'QA_TEST_OTHER_VISIT',patientId:'QA_TEST_OTHER',date:'2026-11-21',time:'09:00',department:'Tim mạch',doctor:'QA_TEST_OTHER_DOCTOR',doctorStaffId:'QA_TEST_OTHER_DOC',status:'Chờ khám'}];
 d.business.labs=[{id:'QA_TEST_LAB',patient:'BN0001',episodeId:'QA_TEST_VISIT_1',service:'QA_TEST_SERVICE',doctor:'NV001',status:'Chờ tiếp nhận'}];
 d.business.prescriptions=[{id:'QA_TEST_RX',patient:'BN0001',episodeId:'QA_TEST_VISIT_1',doctor:'NV001',status:'Đã xác nhận',lines:[],diagnosis:'QA_TEST_DIAGNOSIS',advice:'QA_TEST_ADVICE'}];
 d.business.rounds=[{id:'QA_TEST_ORDER',patient:'BN0001',episodeId:'QA_TEST_VISIT_1',doctor:'NV001',kind:'Chăm sóc',progress:'QA_TEST',scheduled:'2026-11-21T08:30',status:'Chờ thực hiện'}];
 d.appointments=[{id:'QA_TEST_APPT_1',patientId:'BN0001',name:'QA_TEST_MINE',phone:'0900000201',dept:'Nội tổng quát',date:'2026-11-21T08:30',status:'Đã xác nhận'},{id:'QA_TEST_APPT_2',name:'QA_TEST_CHECKED',date:'2026-11-21T09:00',status:'Đã tiếp đón'},{id:'QA_TEST_APPT_3',name:'QA_TEST_CANCELLED',date:'2026-11-21T09:30',status:'Đã hủy'}];
 });}
 export function render(kind,role,tab){const d=getWorkspace();const shared={role,notify:()=>{},navigate:()=>{}};
 const node=kind==='home'?React.createElement(ActorHome,{...shared,patients:d.patients,beds:d.beds,stock:d.stock,appointments:d.appointments}):kind==='auth'?React.createElement(Auth,{onLogin:()=>{}}):kind==='inventory'?React.createElement(Inventory,shared):kind==='portal'&&role==='patient'?React.createElement(PatientPortalView,{data:{patient:d.patients.find(p=>p.id==='BN0001'),history:d.visits.filter(v=>v.patientId==='BN0001'),results:[],labs:[],prescriptions:[],appointments:[],settlements:[],advances:[]},tab:tab||'summary'}):kind==='appointments'?React.createElement(Appointments,{...shared,appointments:d.appointments,setAppointments:()=>{},patients:d.patients}):kind==='desk'?React.createElement(ClinicalDesk,shared):kind==='lab'?React.createElement(LabDesk,shared):kind==='history'?React.createElement(History,{...shared,patientId:role==='patient'?'BN0001':undefined}):React.createElement(Business,{...shared,page:kind,requestedTab:tab,patients:d.patients,stock:d.stock,beds:d.beds,notes:d.notes,appointments:d.appointments,setStock:()=>{},setBeds:()=>{},setAppointments:()=>{}});
 return renderToStaticMarkup(node);}
 export function renderPaper(kind,row={},patient={}){const Form={referral:ReferralPaperForm,consultation:ConsultationPaperForm,discharge:DischargePaperForm,bill:MedicalBillPaperForm,rx:PrescriptionPaperForm,summary:MedicalRecordSummaryPaperForm}[kind];return renderToStaticMarkup(React.createElement(Form,{row,patient}));}
 export function renderHistoryScope(patientId){return renderToStaticMarkup(React.createElement(History,{role:'patient',patientId,notify:()=>{},navigate:()=>{}}));}
 export function seedRecordedHistory(){transact(d=>{d.visits[1].note={vitals:{pressure:'130/85',pulse:91,temperature:37.2,spo2:97,height:170,weight:90},diagnosis:'QA_TEST_SAVED_DIAGNOSIS',icd:'QA_TEST_ICD',examination:'QA_TEST_SAVED_EXAM',advice:'QA_TEST_SAVED_ADVICE'};});}
 export function setLabStatus(status){transact(d=>{d.business.labs[0].status=status;d.business.labs[0].result='QA_TEST_RESULT';d.business.labs[0].conclusion='QA_TEST_CONCLUSION';});}
 `,resolveDir:process.cwd(),loader:'jsx'},bundle:true,platform:'node',format:'esm',outfile:bundle,packages:'external',loader:{'.css':'empty'},plugins:[{name:'snapshot-only-store-hook',setup(b){
 b.onLoad({filter:/[/\\]src[/\\]workspace\.js$/},async({path:p})=>{
 let source=await fs.readFile(p,'utf8');source=source.replace("import {useSyncExternalStore} from 'react';","const useSyncExternalStore = (_subscribe,snapshot) => snapshot();");
 return {contents:source,loader:'js'};
 });
 }}]});
 // Static component rendering only; it does not emulate browser events or SQL persistence.
 const priorFetch=global.fetch;global.fetch=async()=>({ok:true,json:async()=>[]});
 try {fixture=await import(pathToFileURL(bundle).href);fixture.seed();await new Promise(resolve=>setImmediate(resolve));fixture.seed();} finally {global.fetch=priorFetch;}
});
after(async()=>{if(bundle)await fs.unlink(bundle);});

test('doctor desk contains both own visits but never another doctor patient',()=>{
 const html=fixture.render('desk','doctor');assert.match(html,/QA_TEST_VISIT_1/);assert.match(html,/QA_TEST_VISIT_2/);assert.doesNotMatch(html,/QA_TEST_OTHER_VISIT|QA_TEST_OTHER_NAME/);
});
test('patient portal renders scoped API payload without a patient switcher',()=>{
 const html=fixture.render('portal','patient');assert.match(html,/QA_TEST_MINE/);assert.doesNotMatch(html,/QA_TEST_OTHER_NAME/);assert.doesNotMatch(html,/Chọn người bệnh/);
});
test('patient history contains own two episodes, excludes other patient',()=>{
 const html=fixture.render('history','patient');assert.match(html,/QA_TEST_VISIT_1/);assert.match(html,/QA_TEST_VISIT_2/);assert.doesNotMatch(html,/QA_TEST_OTHER_VISIT|QA_TEST_OTHER_NAME/);
});
test('technician can receive a lab order; doctor, nurse and pharmacist cannot receive it',()=>{
 assert.match(fixture.render('lab','technician'),/Tiếp nhận/);
 for(const role of ['doctor','nurse','pharmacist'])assert.doesNotMatch(fixture.render('lab',role),/Tiếp nhận người bệnh vào phòng máy|Tiếp nhận phiếu/);
});
test('pharmacist sees dispensing action, doctor does not',()=>{
 assert.match(fixture.render('inventory','pharmacist'),/Cấp phát/);
 assert.doesNotMatch(fixture.render('desk','doctor'),/Cấp phát \(FEFO\)/);
});
test('nurse sees five-rights confirmation, doctor does not',()=>{
 assert.match(fixture.render('care','nurse','rounds'),/Xác nhận 5 đúng/);
 assert.doesNotMatch(fixture.render('care','doctor','rounds'),/Xác nhận 5 đúng/);
});

test('canonical appointment statuses render correct counters and restore check-in/edit/cancel controls',()=>{
 const html=fixture.render('appointments','receptionist');
 const summary=html.slice(0,html.indexOf('<section'));
 assert.equal((summary.match(/<b>2<\/b>/g)||[]).length,1);
 assert.equal((summary.match(/<b>1<\/b>/g)||[]).length,2);
 assert.match(html,/Check-in/);assert.match(html,/Đổi lịch/);assert.match(html,/Hủy lịch QA_TEST_MINE/);
 assert.doesNotMatch(html,/QA_TEST_CANCELLED/);
});

test('technician sees workflow controls for pending/review state, published results are read-only',()=>{
 fixture.setLabStatus('Chờ duyệt');let html=fixture.render('lab','technician');assert.match(html,/Ký duyệt &amp; Phát hành|Duyệt &amp; phát hành/);assert.match(html,/kết quả chuyên môn|kết quả nháp/);
 fixture.setLabStatus('Đã phát hành');html=fixture.render('lab','technician');assert.match(html,/QA_TEST_RESULT/);assert.doesNotMatch(html,/Nhập \/ Chỉnh sửa kết quả chuyên môn|>Tiếp nhận người bệnh/);
 assert.doesNotMatch(fixture.render('clinical','technician','labs'),/Tạo chỉ định CLS/);
});

test('nurse can record vitals/care but cannot create a physician order',()=>{
 assert.match(fixture.render('care','nurse','rounds'),/Xác nhận 5 đúng/);
 assert.doesNotMatch(fixture.render('care','nurse','rounds'),/Tạo tờ điều trị/);
});


test('pharmacist inventory renders SQL snapshot controls without merging another stock source',()=>{const html=fixture.render('inventory','pharmacist');assert.match(html,/Cấp phát ngoại trú|Tồn kho theo lô|Nhập hàng/);});

test('workspace login requires credentials and does not offer a demo actor switch',()=>{const html=fixture.render('auth','patient');assert.match(html,/name="username"/);assert.match(html,/type="password"/);assert.doesNotMatch(html,/không cần tài khoản|auth-role-tabs|demo-account/);});

test('missing clinical results never display invented measurements, diagnosis or instructions',()=>{
 const html=fixture.render('history','doctor');
 assert.doesNotMatch(html,/120\/80|78 bpm|36\.8|165cm|Tăng huyết áp vô căn|Tri giác tỉnh táo|Tái khám sau 7 ngày/);
 assert.match(html,/Chưa ghi nhận/);
});
test('patient history is read-only and missing linked patient never falls back to another record',()=>{
 assert.doesNotMatch(fixture.renderHistoryScope('BN0001'),/Mở phiếu khám/);
 const html=fixture.renderHistoryScope('QA_TEST_MISSING');
 assert.doesNotMatch(html,/QA_TEST_MINE|QA_TEST_VISIT_1|QA_TEST_OTHER_NAME/);
});
test('history preserves recorded clinical results and calculates BMI without declaring normal',()=>{
 fixture.seedRecordedHistory();const html=fixture.render('history','doctor');
 assert.match(html,/QA_TEST_SAVED_DIAGNOSIS/);assert.match(html,/130\/85/);assert.match(html,/31\.1/);assert.doesNotMatch(html,/31\.1[^<]*Bình thường/);
});

test('medical print forms never invent patient identities, clinical findings, medicines or bill lines',()=>{
 for(const kind of ['referral','consultation','discharge','bill','rx','summary']){
 const html=fixture.renderPaper(kind);assert.doesNotMatch(html,/NGUYỄN VĂN|LÊ THỊ THU HƯƠNG|079090123456|0901234567|Nexium|Panadol|Troponin|Ceftriaxone|Aspirin|Clopidogrel|PGS\.TS\.BS Đặng|475\.000/);
 assert.match(html,/Chưa ghi nhận/);
 }
});
test('bill print preserves actual zero totals and quantity field from finance API',()=>{
 const html=fixture.renderPaper('bill',{gross:0,insurance:0,advance:0,lines:[{description:'QA_TEST_LINE',quantity:3,price:100}]},{name:'QA_TEST_PERSON'});
 assert.match(html,/QA_TEST_LINE/);assert.match(html,/>3<\/td>/);assert.match(html,/300/);assert.doesNotMatch(html,/475\.000|NaN/);
});

test('doctor and all actor home screens render without an undefined task list',()=>{
 for(const role of ['doctor','receptionist','nurse','technician','pharmacist','cashier','patient'])assert.match(fixture.render('home',role),/Công việc trong ca|Dịch vụ dành cho bạn/);
});
