import test from 'node:test';
import assert from 'node:assert/strict';
import {adminFixture} from './admin-fixture.mjs';
import {querySql,loadState} from '../server/admin-store.mjs';
import {registerPatient} from '../server/patient-registration.mjs';
import {verifyPassword} from '../server/admin-domain.mjs';
import {workspaceIdentity} from '../server/workspace-access.mjs';

test('patient self registration creates a fresh linked record atomically and cannot claim roles or existing records',async()=>{
 const f=await adminFixture();try{
 await querySql(`INSERT dbo.BenhNhan(maBenhNhan,hoTen,ngaySinh,gioiTinh,soDienThoai) VALUES('QA_TEST_EXISTING',N'QA_TEST Existing','1990-01-01',N'Nam','0900000901');SELECT 'ok';`);
 const draft={username:'qa_test_register',name:'QA_TEST Đăng ký',email:'qa_test@example.test',phone:'0900000901',birth:'1990-01-01',gender:'Nam',password:'QA_TEST_Password_123',confirmPassword:'QA_TEST_Password_123'};
 const post=(data,headers={})=>fetch(f.url+'/api/auth/register',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(data)});
 const response=await post(draft);assert.equal(response.status,201,await response.clone().text());assert.deepEqual(await response.json(),{ok:true});
 let state=await loadState();const account=state.data.accounts.find(a=>a.username===draft.username);
 assert.equal(account.roleId,'patient');assert.equal(account.staffId,'');assert.notEqual(account.patientId,'QA_TEST_EXISTING');
 assert.equal(await verifyPassword(draft.password,account.passwordHash),true);assert.notEqual(account.passwordHash,draft.password);
 assert.equal(await querySql('SELECT hoTen FROM dbo.BenhNhan WHERE maBenhNhan=@id',{id:account.patientId}),draft.name);
 const login=await fetch(f.url+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:draft.username,password:draft.password})});assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];const identity=await workspaceIdentity({headers:{cookie}});
 assert.equal(identity.role,'patient');assert.equal(identity.patientId,account.patientId);
 assert.equal((await post(draft)).status,409);
 for(const extra of [{roleId:'admin'},{patientId:'QA_TEST_EXISTING'},{staffId:'QA_TEST_DOC'}])await assert.rejects(registerPatient({...draft,username:'qa_test_spoof',...extra}),e=>e.status===400);
 for(const invalid of [{password:'short',confirmPassword:'short'},{confirmPassword:'wrong'},{birth:'2999-01-01'},{phone:'abc'},{birth:'2026-02-30'}])await assert.rejects(registerPatient({...draft,username:'qa_test_invalid',...invalid}),e=>e.status===400);
 assert.equal((await post({...draft,username:'qa_test_origin'},{origin:'https://other.example.test'})).status,403);
 const pair=await Promise.all([post({...draft,username:'qa_test_parallel'}),post({...draft,username:'qa_test_parallel'})]);assert.deepEqual(pair.map(r=>r.status).sort(),[201,409]);
 state=await loadState();assert.equal(state.data.accounts.filter(a=>a.username==='qa_test_parallel').length,1);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.BenhNhan')),3);
 const audit=await querySql("SELECT changes FROM dbo.MediCareAdminAudit WHERE action='register' AND target=@id",{id:account.id});assert.ok(!audit.includes(draft.password));
 // Registration must not leave an account behind if the patient INSERT fails.
 await querySql(`CREATE OR ALTER TRIGGER dbo.QA_TEST_BlockRegistration ON dbo.BenhNhan AFTER INSERT AS BEGIN THROW 51000,'QA_TEST patient write unavailable',1; END;`);
 await assert.rejects(registerPatient({...draft,username:'qa_test_rollback'}),/QA_TEST patient write unavailable/);
 assert.equal((await loadState()).data.accounts.some(a=>a.username==='qa_test_rollback'),false);
 assert.equal(Number(await querySql('SELECT COUNT(*) FROM dbo.BenhNhan')),3);
 }finally{await f.close();}
});
