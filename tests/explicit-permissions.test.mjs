import http from 'node:http';
import {createAdminMiddleware} from '../server/admin-api.mjs';
import {createApiMiddleware} from '../server/api-router.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {businessPermissions,requestGrant,checkRequestGrant,pageGranted} from '../src/business-permissions.js';
import {validate,ensureLastAdmin,initialState} from '../server/admin-domain.mjs';
import {adminFixture} from './admin-fixture.mjs';
import {loadState,transactAdmin} from '../server/admin-store.mjs';
import {randomUUID} from 'node:crypto';
test('closed permission registry denies unknown action, missing view, spoofed grants and role-only access',()=>{
 for(const permission of businessPermissions){assert.equal(checkRequestGrant([], '/api/pharmacy/action','POST',{action:'dispense',permissions:[permission],role:'admin'}),false);}
 assert.equal(requestGrant('/api/labs/action','POST',{action:'publish'}),'biz.labs:publish');
 assert.equal(checkRequestGrant(['biz.labs:publish'],'/api/labs/action','POST',{action:'publish'}),false);
 assert.equal(checkRequestGrant(['biz.labs:view','biz.labs:accept'],'/api/labs/action','POST',{action:'publish'}),false);
 assert.equal(checkRequestGrant(['biz.labs:view','biz.labs:publish'],'/api/labs/action','POST',{action:'publish'}),true);
 assert.equal(checkRequestGrant(businessPermissions,'/api/pharmacy/action','POST',{action:'unknown'}),false);
 assert.equal(pageGranted('clinical',[]),false);assert.equal(pageGranted('clinical',['biz.labs:view']),true);
 assert.throws(()=>validate('roles',{name:'QA_TEST',workspaceRole:'doctor',description:'',permissions:['biz.exam:save'],active:true}),{status:400});
});
test('SQL grants persist; same live session is denied immediately after revocation, without admin business bypass',async()=>{
 const f=await adminFixture();const admin=createAdminMiddleware(),api=createApiMiddleware();const server=http.createServer((req,res)=>admin(req,res,()=>api(req,res,()=>{res.writeHead(404);res.end('{}');})));await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;try{
 const r=await fetch(url+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'qaadmin',password:f.password})});
 const identity=await r.json(),cookie=r.headers.get('set-cookie').split(';')[0];
 const call=(path,options={})=>fetch(url+path,{...options,headers:{cookie,'content-type':'application/json','x-csrf-token':identity.csrf,...options.headers}});
 await transactAdmin(d=>{d.roles.find(r=>r.id==='admin').permissions=d.roles.find(r=>r.id==='admin').permissions.filter(p=>!p.startsWith('biz.'));});
 assert.equal((await call('/api/appointments')).status,403);
 await transactAdmin(d=>{d.roles.find(r=>r.id==='admin').permissions.push('biz.appointments:view');});
 assert.equal((await call('/api/appointments')).status,200);
 assert.equal((await call('/api/appointments',{method:'POST',body:JSON.stringify({role:'admin',permissions:businessPermissions})})).status,403);
 const state=await loadState(),role=state.data.roles.find(r=>r.id==='admin');
 const save=await call('/api/admin/roles/admin',{method:'PUT',headers:{'Idempotency-Key':randomUUID()},body:JSON.stringify({...role,permissions:role.permissions.filter(p=>p!=='biz.appointments:view')})});
 assert.equal(save.status,200,await save.clone().text());
 assert.equal((await call('/api/appointments')).status,403);
 const restored=await(await call('/api/workspace/session')).json();assert.ok(!restored.permissions.includes('biz.appointments:view'));
 assert.equal((await call('/api/admin/roles/admin',{method:'PUT',headers:{'Idempotency-Key':randomUUID()},body:JSON.stringify({...role,permissions:[]})})).status,409);
 assert.throws(()=>ensureLastAdmin({roles:[{id:'admin',active:true,permissions:[]}],accounts:[{active:true,roleId:'admin'}]}),{status:409});
 }finally{await new Promise(r=>server.close(r));await f.close();}
});

test('new roles and initialized admin do not inherit business grants from specialty',async()=>{
 const created=validate('roles',{name:'QA_TEST Điều dưỡng',workspaceRole:'nurse',description:'',permissions:[],active:true});assert.deepEqual(created.permissions,[]);
 const state=await initialState({username:'qa_test_init',name:'QA_TEST',email:'qa@example.test',password:'QA_TEST_password_12345'});
 assert.ok(state.roles.every(r=>r.permissions.every(p=>!p.startsWith('biz.'))));
 ensureLastAdmin(state);
});
