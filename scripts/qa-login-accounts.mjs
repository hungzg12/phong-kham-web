import fs from 'node:fs/promises';

// Explicitly requested display of disposable QA credentials, never a production API.
export function qaLoginAccounts(){
 return async(req,res,next)=>{
  if(req.url.split('?')[0]!=='/__qa/login-accounts')return next();
  const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  if(req.method!=='GET'||req.headers.host!=='127.0.0.1:52796'||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||req.headers.origin&&req.headers.origin!=='http://127.0.0.1:52796')return reply(404,{});
  try{
   const meta=JSON.parse(await fs.readFile(new URL('../.data/QA_TEST_workspace_session.json',import.meta.url),'utf8'));
   if(!/^MediCareQA_Admin_[a-f0-9]{16}$/.test(meta.database)||!(process.env.MEDICARE_SQL_CONNECTION||'').includes('Database='+meta.database))return reply(404,{});
   const csv=await fs.readFile(new URL('../.data/medicare-8-passwords.csv',import.meta.url),'utf8');
   const accounts=csv.trim().split(/\r?\n/).slice(1).map(line=>{
    const cells=(line.match(/"(?:[^"]|"")*"/g)||[]).map(v=>v.slice(1,-1).replaceAll('""','"'));
    if(cells.length!==4||cells[1]!=='http://127.0.0.1:52796/#management'||!cells[2].startsWith('qa_test_'))throw new Error('Invalid QA export');
    return {label:cells[0],username:cells[2],password:cells[3]};
   });
   return reply(200,{accounts});
  }catch{return reply(404,{});}
 };
}
