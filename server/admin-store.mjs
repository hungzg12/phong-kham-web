import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

for (const file of ['.env', '.env.local']) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}
const script = fileURLToPath(new URL('../scripts/admin-sql.ps1', import.meta.url));
let worker=null,sequence=0;
function sqlWorker(){
  if(worker)return worker;
  const child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script,'-Persistent'],{windowsHide:true});
  const current={child,pending:new Map(),buffer:'',idle:null};worker=current;
  const failed=()=>{if(worker===current)worker=null;for(const task of current.pending.values()){clearTimeout(task.timeout);task.reject(new Error('SQL worker unavailable'));}current.pending.clear();};
  child.on('error',failed);child.on('close',failed);child.stdin.on('error',failed);
  child.stderr.resume();child.stdout.setEncoding('utf8').on('data',chunk=>{
    current.buffer+=chunk;
    for(let end;(end=current.buffer.indexOf('\n'))>=0;){
      const line=current.buffer.slice(0,end);current.buffer=current.buffer.slice(end+1);
      let result;try{result=JSON.parse(line);}catch{continue;}
      const task=current.pending.get(result.id);if(!task)continue;clearTimeout(task.timeout);current.pending.delete(result.id);
      if(result.error)task.reject(new Error(result.error));else task.resolve(result.result||'');
      if(!current.pending.size)current.idle=setTimeout(()=>{if(worker===current)worker=null;child.stdin.end();},1500);
    }
  });
  return current;
}
export function querySql(query, parameters = {}, {rows=false}={}) {
  return new Promise((resolve, reject) => {
    const current=sqlWorker(),id=++sequence;clearTimeout(current.idle);
    const timeout=setTimeout(()=>{current.pending.delete(id);reject(new Error('SQL operation timed out'));current.child.kill();},60000);
    current.pending.set(id,{resolve,reject,timeout});
    current.child.stdin.write(JSON.stringify({id,query,parameters,rows,connection:process.env.MEDICARE_SQL_CONNECTION||''}).replace(/[^\x00-\x7f]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))+'\n');
  });
}

// One versioned management aggregate. CAS serializes cross-process invariants,
// including the last administrator. Never falls back to a browser/memory store.
export const migration = `
SET XACT_ABORT ON;
BEGIN TRAN;
DECLARE @lock int;
EXEC @lock = sys.sp_getapplock @Resource='medicare-admin-migration', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000;
IF @lock < 0 THROW 51000, 'Migration lock unavailable', 1;
IF OBJECT_ID('dbo.MediCareAdminState','U') IS NULL
BEGIN
 CREATE TABLE dbo.MediCareAdminState (
  id int NOT NULL PRIMARY KEY CHECK(id=1), revision bigint NOT NULL,
  body nvarchar(max) NOT NULL CHECK(ISJSON(body)=1), updatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
 );
END;
IF OBJECT_ID('dbo.MediCareAdminAudit','U') IS NULL
BEGIN
 CREATE TABLE dbo.MediCareAdminAudit (
  id uniqueidentifier NOT NULL PRIMARY KEY, time datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
  actor nvarchar(100) NOT NULL, action nvarchar(100) NOT NULL, entity nvarchar(40) NOT NULL,
  target nvarchar(100) NOT NULL, changes nvarchar(max) NOT NULL CHECK(ISJSON(changes)=1)
 );
END;
COMMIT; SELECT 'ok';`;

export async function loadState() {
  const raw = await querySql("SELECT (SELECT revision, body FROM dbo.MediCareAdminState WHERE id=1 FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)");
  if (!raw) return null;
  const row = JSON.parse(raw);
  return { revision: Number(row.revision), data: JSON.parse(row.body) };
}

export async function insertState(data) {
  return querySql(`SET XACT_ABORT ON; SET TRANSACTION ISOLATION LEVEL SERIALIZABLE; BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM dbo.MediCareAdminState WITH(UPDLOCK,HOLDLOCK) WHERE id=1)
    INSERT dbo.MediCareAdminState(id,revision,body) VALUES(1,1,@body);
  COMMIT; SELECT 'ok';`, { body: JSON.stringify(data) });
}

export async function transactAdmin(fn) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const state = await loadState();
    if (!state) throw Object.assign(new Error('Chưa khởi tạo quản trị. Chạy npm run admin:init.'), { status: 503 });
    const events = [];
    const effects = [];
    const result = await fn(state.data, event => events.push(event), effect => effects.push(effect));
    const effectParameters = Object.assign({}, ...effects.map(e => e.parameters));
    const saved = await querySql(`SET XACT_ABORT ON; BEGIN TRAN;
      UPDATE dbo.MediCareAdminState SET body=@body, revision=revision+1,updatedAt=SYSUTCDATETIME() WHERE id=1 AND revision=TRY_CONVERT(bigint,@revision);
      IF @@ROWCOUNT=0 BEGIN ROLLBACK; SELECT 'conflict'; RETURN; END;
      ${effects.map(e => e.sql).join('\n')}
      INSERT dbo.MediCareAdminAudit(id,actor,action,entity,target,changes)
      SELECT id,actor,action,entity,target,changes FROM OPENJSON(@events)
      WITH(id uniqueidentifier,actor nvarchar(100),action nvarchar(100),entity nvarchar(40),target nvarchar(100),changes nvarchar(max) AS JSON);
      COMMIT; SELECT 'ok';`, { ...effectParameters, body: JSON.stringify(state.data), revision: String(state.revision), events: JSON.stringify(events) });
    if (saved === 'ok') return result;
  }
  throw Object.assign(new Error('Dữ liệu đang được cập nhật. Vui lòng thử lại.'), { status: 409 });
}
