import test from 'node:test';
import assert from 'node:assert/strict';
import {adminFixture} from './admin-fixture.mjs';
import {createProductionServer} from '../server/start.mjs';

test('built workspace serves the site, keeps admin entry, authenticates business APIs and hides QA helpers',async()=>{
 const fixture=await adminFixture();
 const server=createProductionServer({workspace:true});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const site=await fetch(base+'/');assert.equal(site.status,200);assert.match(await site.text(),/assets\/site-/);
  const admin=await fetch(base+'/admin.html');assert.match(await admin.text(),/assets\/admin-/);
  assert.equal((await fetch(base+'/api/queue')).status,401);
  assert.equal((await fetch(base+'/__qa/login-accounts')).status,404);
  const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'qaadmin',password:fixture.password})});
  assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];
  const response=await fetch(base+'/api/queue',{headers:{cookie}});assert.equal(response.status,200);assert.deepEqual(await response.json(),[]);
  assert.equal((await fetch(base+'/api/notifications',{headers:{cookie}})).status,200);
 }finally{await new Promise(r=>server.close(r));await fixture.close();}
});
