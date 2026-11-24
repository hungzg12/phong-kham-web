// Explicit QA-only upgrade. Preserve old grants; never infer clinical rights from role names.
import fs from 'node:fs';
import {transactAdmin} from '../server/admin-store.mjs';
import {event} from '../server/admin-domain.mjs';
const saved=JSON.parse(fs.readFileSync(new URL('../.data/QA_TEST_workspace_session.json',import.meta.url),'utf8'));
if(!/^MediCareQA_Admin_[a-f0-9]{16}$/.test(saved.database))throw new Error('An isolated QA database is required');
process.env.MEDICARE_SQL_CONNECTION='Server=.\\SQLEXPRESS;Integrated Security=True;TrustServerCertificate=True;Database='+saved.database;
const key='explicit-permissions-v1';
const rollback=process.argv.includes('--rollback');
const result=await transactAdmin((data,log)=>{
 data.permissionMigrations??=[];
 const previous=data.permissionMigrations.find(m=>m.key===key);
 if(rollback){
  if(!previous||previous.rolledBack)return 'nothing to roll back';
  if(!previous.after)throw new Error('Legacy migration snapshot requires manual review before rollback');
  for(const role of data.roles){const after=previous.after.find(r=>r.id===role.id);if(!after||JSON.stringify(role.permissions)!==JSON.stringify(after.permissions))throw new Error('Permissions changed since migration; manual review required');}
  for(const before of previous.before){const role=data.roles.find(r=>r.id===before.id);if(role){role.permissions=before.permissions;role.version=(role.version||0)+1;}}
  previous.rolledBack=new Date().toISOString();log(event('system','permission-migration-rollback','roles',key,{}));return 'rolled back (requires corresponding code rollback)';
 }
 if(previous&&!previous.rolledBack)return 'already applied';
 const before=data.roles.map(r=>({id:r.id,permissions:[...r.permissions]}));
 for(const role of data.roles){
  const grants=new Set(role.permissions);
  // These are exactly the two server fallbacks removed by this change.
  for(const action of ['view','create','edit','deactivate','export'])if(grants.has('staff:'+action))grants.add('roster:'+action);
  if(role.id==='admin')for(const action of ['view','create','restore'])grants.add('backups:'+action);
  role.permissions=[...grants];role.version=(role.version||0)+1;
 }
 data.permissionMigrations=data.permissionMigrations.filter(m=>m.key!==key);
 data.permissionMigrations.push({key,at:new Date().toISOString(),before,after:data.roles.map(r=>({id:r.id,permissions:[...r.permissions]}))});
 log(event('system','permission-migration','roles',key,{mapping:'staff:* → roster:*; designated admin → existing backup capabilities; no business grants inferred'}));
 return 'applied';
});console.log('QA permission migration: '+result);
