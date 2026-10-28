import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
export function hashPassword(value:string){const salt=randomBytes(16).toString("hex"); return salt+":"+scryptSync(value,salt,64).toString("hex");}
export function verifyPassword(value:string,hash:string){try{const [salt,key]=hash.split(":");const expected=Buffer.from(key,"hex");return expected.length===64&&timingSafeEqual(scryptSync(value,salt,64),expected);}catch{return false;}}
