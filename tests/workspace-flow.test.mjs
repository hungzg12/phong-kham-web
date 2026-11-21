import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {initializeWorkspace,syncWithSqlServer,getWorkspace,createVisit,saveVisitNote,resetWorkspaceMemory} from '../src/workspace.js';
import {actorRoles} from '../src/roles.js';
const originalFetch=global.fetch,originalDoctor={...actorRoles.doctor},requests=[];
const visits=[{id:'QA_TEST_DRAFT',patientId:'BN0001',date:'2026-11-20',time:'08:30',createdAt:'2026-11-20T08:30:00',department:'Nội tổng quát',doctor:'QA_TEST_ACTUAL_DOCTOR',doctorStaffId:'QA_TEST_DOC',status:'Đang khám',note:{symptoms:'QA_TEST_DRAFT',diagnosis:'QA_TEST_DRAFT'},locked:false,revision:4},{id:'QA_TEST_FINISHED',patientId:'QA_TEST_OTHER',date:'2026-11-21',time:'09:00',createdAt:'2026-11-21T09:00:00',department:'Nội tổng quát',doctor:'QA_TEST_ACTUAL_DOCTOR',doctorStaffId:'QA_TEST_DOC',status:'Hoàn tất',note:{symptoms:'QA_TEST',diagnosis:'QA_TEST_PUBLISHED'},locked:true,revision:5}];
before(async()=>{
 global.fetch=async(url,options={})=>{
  requests.push({url,method:options.method||'GET'});
  if(options.method&&options.method!=='GET')return {ok:false,status:503,statusText:'Unavailable',json:async()=>({error:'QA_TEST_SQL_UNAVAILABLE'})};
  const path=String(url).split('?')[0];
  const values={'/api/patients':[{id:'BN0001',name:'QA_TEST_MINE',birth:'1990-01-01',phone:'0900000601'},{id:'QA_TEST_OTHER',name:'QA_TEST_OTHER',birth:'1990-01-01',phone:'0900000602'}],'/api/queue':visits,'/api/clinical/doctors':[{id:'QA_TEST_DOC',name:'QA_TEST_ACTUAL_DOCTOR'}]};
  return {ok:true,json:async()=>structuredClone(values[path]||[])};
 };
 initializeWorkspace();await syncWithSqlServer();
});
after(()=>{global.fetch=originalFetch;Object.assign(actorRoles.doctor,originalDoctor);});
test('SQL hydration restores note/lock/revision/history and binds the actual sole doctor without creating a shift',()=>{
 const state=getWorkspace();assert.equal(state.visits[0].revision,4);assert.equal(state.visits[0].note.diagnosis,'QA_TEST_DRAFT');assert.equal(state.visits[1].locked,true);
 assert.equal(actorRoles.doctor.staffId,'QA_TEST_DOC');assert.equal(actorRoles.doctor.person,'QA_TEST_ACTUAL_DOCTOR');
 assert.equal(state.notes.BN0001,undefined);assert.equal(state.notes.QA_TEST_OTHER.diagnosis,'QA_TEST_PUBLISHED');
 assert.ok(requests.some(r=>r.url.includes('history=1')));assert.ok(requests.every(r=>r.method==='GET'));
});
test('failed reception and exam writes keep workspace data unchanged and propagate an error',async()=>{
 const snapshot=structuredClone(getWorkspace());
 await assert.rejects(createVisit({patientId:'BN0001',dept:'Nội tổng quát'}),/QA_TEST_SQL_UNAVAILABLE/);
 assert.deepEqual(getWorkspace(),snapshot);
 await assert.rejects(saveVisitNote('QA_TEST_DRAFT',{symptoms:'QA_TEST_CHANGED',diagnosis:'QA_TEST_CHANGED'}),/QA_TEST_SQL_UNAVAILABLE/);
 assert.deepEqual(getWorkspace(),snapshot);
});

test('late response from signed-out workspace cannot repopulate the next session memory',async()=>{
 const savedFetch=global.fetch;let release;global.fetch=async()=>({ok:true,json:()=>new Promise(resolve=>{release ||= [];release.push(resolve);})});
 const old=syncWithSqlServer();await new Promise(r=>setImmediate(r));resetWorkspaceMemory();global.fetch=async()=>({ok:true,json:async()=>[]});initializeWorkspace();await syncWithSqlServer();
 for(const resolve of release)resolve([{id:'QA_TEST_OLD_SESSION_SECRET',name:'QA_TEST_OLD_SESSION_SECRET'}]);await old;assert.ok(!JSON.stringify(getWorkspace()).includes('QA_TEST_OLD_SESSION_SECRET'));global.fetch=savedFetch;
});
