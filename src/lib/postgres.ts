import { readFile } from "node:fs/promises";import path from "node:path";import type { PoolClient } from "pg";import type {State} from "./types.ts";import { seedState } from "./seed.ts";
type Row=Record<string,unknown>;
const specs:{key:keyof State;table:string;columns:Record<string,string>}[]=[
 {key:"patients",table:"clinic_patients",columns:{}},{key:"specialties",table:"clinic_specialties",columns:{}},{key:"doctors",table:"clinic_doctors",columns:{specialty_id:"specialtyId"}},
 {key:"users",table:"clinic_users",columns:{username:"username",role:"role",patient_id:"patientId",doctor_id:"doctorId"}},
 {key:"shifts",table:"clinic_shifts",columns:{doctor_id:"doctorId",day:"date",capacity:"capacity"}},
 {key:"appointments",table:"clinic_appointments",columns:{patient_id:"patientId",shift_id:"shiftId",status:"status",request_id:"requestId"}},
 {key:"visits",table:"clinic_visits",columns:{appointment_id:"appointmentId",doctor_id:"doctorId"}},
 {key:"medicines",table:"clinic_medicines",columns:{}},{key:"records",table:"clinic_records",columns:{visit_id:"visitId"}},
 {key:"notifications",table:"clinic_notifications",columns:{user_id:"userId"}}
];
export async function initialize(client:PoolClient){
 await client.query("SELECT pg_advisory_xact_lock(78241392)");
 await client.query(await readFile(path.join(process.cwd(),"database","schema.sql"),"utf8"));
 const migrated=await client.query("SELECT value FROM clinic_meta WHERE key='migration_002'");
 if(!migrated.rows.length)await client.query(await readFile(path.join(process.cwd(),"database","migrations","002_separate_appointment_visit.sql"),"utf8"));
 const init=await client.query("SELECT value FROM clinic_meta WHERE key='initialized'");
 if(!init.rows.length){await writeState(client,seedState());await client.query("INSERT INTO clinic_meta(key,value) VALUES('initialized','1')");}
}

export async function readState(client:PoolClient):Promise<State>{const state={} as Record<keyof State,unknown[]>;for(const spec of specs)state[spec.key]=(await client.query(`SELECT data FROM ${spec.table} ORDER BY id`)).rows.map(r=>r.data);const lines=(await client.query("SELECT record_id,data FROM clinic_prescription_lines ORDER BY record_id,line_no")).rows;for(const r of state.records as State["records"])r.rx=lines.filter(l=>l.record_id===r.id).map(l=>l.data);return state as unknown as State;}
export async function writeState(client:PoolClient,state:State){for(const spec of specs){const fields=["id",...Object.keys(spec.columns),"data"];const sql=`INSERT INTO ${spec.table}(${fields.join(",")}) VALUES (${fields.map((_,i)=>"$"+(i+1)).join(",")}) ON CONFLICT(id) DO UPDATE SET ${fields.slice(1).map(c=>`${c}=EXCLUDED.${c}`).join(",")}`;for(const record of state[spec.key]){const row=record as unknown as Row;const payload=spec.key==="records"?{...row,rx:undefined}:row;await client.query(sql,[row.id,...Object.values(spec.columns).map(key=>row[key]||null),JSON.stringify(payload)]);}}
 for(const record of state.records){await client.query("DELETE FROM clinic_prescription_lines WHERE record_id=$1",[record.id]);for(const [index,line] of record.rx.entries())await client.query("INSERT INTO clinic_prescription_lines(record_id,line_no,medicine_id,data) VALUES($1,$2,$3,$4)",[record.id,index,line.medicineId,JSON.stringify(line)]);}
}
