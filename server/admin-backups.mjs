import {randomUUID} from 'node:crypto';
import {backupDatabase,restoreToNewDatabase} from '../scripts/admin-backup.mjs';
import {loadState,transactAdmin} from './admin-store.mjs';
import {event,fail} from './admin-domain.mjs';
let chain=Promise.resolve();
export function backupOperation(action,input,actor){
 const run=chain.then(async()=>{
  if(!['backup','restore-new'].includes(action))fail(400,'Thao tác sao lưu không hợp lệ.');
  if(!/^[a-f0-9-]{36}$/i.test(input.requestId||''))fail(400,'Thiếu mã thao tác.');
  const fingerprint=JSON.stringify({action,id:input.id,target:input.target});
  const state=await loadState();
  const previous=(state.data.backupOperations||[]).find(r=>r.requestId===input.requestId);
  if(previous){if(previous.actor!==actor||previous.fingerprint!==fingerprint)fail(409,'Mã thao tác đã dùng với nội dung khác.');return previous.result;}
  await transactAdmin((data,log)=>log(event(actor,action+'-started','backups',input.id||input.requestId,{})));
  try{
   let result;
   if(action==='backup')result={id:randomUUID(),...await backupDatabase(),createdAt:new Date().toISOString(),createdBy:actor};
   else{
    const backup=(state.data.backups||[]).find(r=>r.id===input.id);
    if(!backup)fail(404,'Chỉ phục hồi bản sao lưu đã đăng ký trong hệ thống.');
    if(!/^MediCareRestore_[A-Za-z0-9_]{8,40}$/.test(input.target||''))fail(400,'Tên database mới phải có tiền tố MediCareRestore_ và 8–40 ký tự chữ/số/gạch dưới phía sau.');
    result={...await restoreToNewDatabase(backup.file,input.target),backupId:backup.id};
   }
   await transactAdmin((data,log)=>{if(action==='backup')(data.backups||=[]).push(result);(data.backupOperations||=[]).push({requestId:input.requestId,actor,fingerprint,result});log(event(actor,action,'backups',result.id||result.target,{result}));});
   return result;
  }catch(e){await transactAdmin((data,log)=>log(event(actor,action+'-failed','backups',input.id||input.requestId,{reason:'Thao tác SQL Server thất bại; xem log máy chủ.'})));throw e;}
 });
 chain=run.catch(()=>{});return run;
}
