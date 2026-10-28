import { normalizeLifecycle } from "./lifecycle.ts";
import { mkdir,readFile,writeFile,rename } from "node:fs/promises";
import path from "node:path";import { Pool } from "pg";import { seedState } from "./seed.ts";import { initialize,readState,writeState } from "./postgres.ts";import type { State } from "./types.ts";
const globals=globalThis as typeof globalThis & {clinicPool?:Pool;clinicQueue?:Promise<unknown>};
const folder=path.join(process.cwd(),".data");const file=path.join(folder,"clinic.json");
export const storageMode=()=>process.env.DATABASE_URL?"postgres" as const:"local" as const;
async function localRead(){try{return normalizeLifecycle(JSON.parse(await readFile(file,"utf8")) as State);}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;return seedState();}}
export async function transact<T>(fn:(s:State)=>T|Promise<T>,write:boolean|"if-changed"=true):Promise<T>{
 if(process.env.DATABASE_URL){
  const pool=globals.clinicPool??=new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});const client=await pool.connect();
  try{await client.query("BEGIN");await initialize(client);const s=await readState(client);const before=write==="if-changed"?JSON.stringify(s):"";const result=await fn(s);if(write===true||(write==="if-changed"&&before!==JSON.stringify(s)))await writeState(client,s);await client.query("COMMIT");return result;
  }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
 }
 if(process.env.NODE_ENV==="production")throw new Error("Cần cấu hình DATABASE_URL để chạy production.");
 const prior=globals.clinicQueue??Promise.resolve();const work=prior.catch(()=>{}).then(async()=>{await mkdir(folder,{recursive:true});const s=await localRead();const before=write==="if-changed"?JSON.stringify(s):"";const result=await fn(s);if(write===true||(write==="if-changed"&&before!==JSON.stringify(s))){const tmp=file+".tmp";await writeFile(tmp,JSON.stringify(s,null,2));await rename(tmp,file);}return result;});globals.clinicQueue=work;return work;
}
