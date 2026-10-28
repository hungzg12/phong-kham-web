import { NextResponse } from "next/server";
import { transact } from "@/lib/store";
export const dynamic="force-dynamic";
export async function GET(){try{await transact(()=>true,false);return NextResponse.json({service:"antam-clinic",status:"ok"},{headers:{"Cache-Control":"no-store"}});}catch{return NextResponse.json({service:"antam-clinic",status:"unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});}}
