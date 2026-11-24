import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureLastAdmin} from '../server/admin-domain.mjs';
import {permissions} from '../src/admin-schema.js';

const state=()=>({roles:[{id:'admin',active:true,permissions:permissions.filter(p=>!p.startsWith('roster:'))}],accounts:[{id:'QA_TEST_ADMIN',roleId:'admin',active:true},{id:'QA_TEST_DOCTOR',roleId:'doctor',active:true}]});
test('legacy admin staff permissions satisfy equivalent roster rights when creating accounts',()=>{
 assert.doesNotThrow(()=>ensureLastAdmin(state()));
});
test('legacy compatibility still prevents removing administrative permissions or last admin',()=>{
 for(const permission of ['accounts:edit','roles:edit','roles:create']){
  const data=state();data.roles[0].permissions=data.roles[0].permissions.filter(p=>p!==permission);
  assert.throws(()=>ensureLastAdmin(data),{status:409});
 }
 const data=state();data.accounts[0].active=false;
 assert.throws(()=>ensureLastAdmin(data),{status:409});
 data.accounts[0].active=true;data.roles[0].active=false;
 assert.throws(()=>ensureLastAdmin(data),{status:409});
});
