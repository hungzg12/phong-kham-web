import { normalizeLifecycle } from "./lifecycle.ts";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { hashPassword,verifyPassword } from "./crypto.ts";
import type { State,User,Status,AppData,Shift } from "./types.ts";
export class DomainError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status;}}
const fail=(message:string,status=400):never=>{throw new DomainError(message,status);};
const id=()=>randomUUID();
const text=z.string().trim().min(1,"Vui lòng điền đầy đủ thông tin.").max(1000);
const short=text.max(120);const optional=z.string().trim().max(3000).default("");
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ.").refine(v=>{const d=new Date(v+"T00:00:00Z");return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;},"Ngày không hợp lệ.");
const clock=z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/,"Giờ không hợp lệ.");
export const publicUser=(u:User)=>{const {passwordHash:_,version:__,...safe}=u;return safe;};
function requireRole(u:User,...roles:User["role"][]){if(!roles.includes(u.role))fail("Bạn không có quyền thực hiện thao tác này.",403);}
function need<T>(v:T|undefined,message="Không tìm thấy dữ liệu."):T{if(!v)fail(message,404);return v as T;}
function notice(s:State,patientId:string,message:string){for(const u of s.users.filter(u=>u.patientId===patientId))s.notifications.unshift({id:id(),userId:u.id,text:message,createdAt:new Date().toISOString(),read:false});}
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh"}).format(new Date());
function appointmentAccess(s:State,u:User,appointmentId:string){const a=need(s.appointments.find(a=>a.id===appointmentId));if(u.role==="patient"&&a.patientId!==u.patientId)fail("Bạn không được truy cập lịch hẹn này.",403);if(u.role==="doctor"){const v=s.visits.find(v=>v.appointmentId===a.id);if(v?.doctorId!==u.doctorId&&s.shifts.find(x=>x.id===a.shiftId)?.doctorId!==u.doctorId)fail("Lịch khám không thuộc phân công của bạn.",403);}return a;}
export function countReserved(s:State,shiftId:string,exclude?:string){return s.appointments.filter(a=>a.id!==exclude&&a.shiftId===shiftId&&!["cancelled","rejected"].includes(a.status)).length;}
function checkSlot(s:State,shiftId:string,time:string,patientId:string,exclude?:string){
 const sh=need(s.shifts.find(x=>x.id===shiftId));const doc=need(s.doctors.find(d=>d.id===sh.doctorId));if(!sh.active||!doc.active||!s.specialties.find(x=>x.id===doc.specialtyId)?.active)fail("Ca hoặc bác sĩ không còn tiếp nhận.");
 if(sh.date<today())fail("Không thể đặt lịch cho ngày đã qua.");if(time<sh.start||time>=sh.end)fail("Giờ hẹn phải nằm trong ca khám.");
 if(countReserved(s,shiftId,exclude)>=sh.capacity)fail("Ca khám đã đủ số lượng tiếp nhận.",409);
 if(s.appointments.some(a=>a.id!==exclude&&a.patientId===patientId&&!["cancelled","rejected"].includes(a.status)&&a.time===time&&s.shifts.find(x=>x.id===a.shiftId)?.date===sh.date))fail("Bệnh nhân đã có lịch vào thời điểm này.",409);
 return sh;
}
function isOpenAppointment(s:State,a:State["appointments"][number]){return ["pending","confirmed"].includes(a.status)||(a.status==="received"&&s.visits.some(v=>v.appointmentId===a.id&&v.status!=="completed"));}
function patientForUser(s:State,u:User,patientId:string){if(u.role==="patient"&&u.patientId!==patientId)fail("Bạn chỉ được thao tác với hồ sơ của mình.",403);return need(s.patients.find(p=>p.id===patientId));}
function visitForDoctor(s:State,u:User,visitId:string){requireRole(u,"doctor");const v=need(s.visits.find(v=>v.id===visitId));if(v.doctorId!==u.doctorId)fail("Lượt khám không thuộc phân công của bạn.",403);return v;}
export function ensureReminders(s:State,now=new Date(),hours=24){
 let changed=false;const cutoff=now.getTime()+Math.min(168,Math.max(1,hours))*3600000;
 for(const a of s.appointments){
  if(a.status!=="confirmed")continue;
  const sh=s.shifts.find(sh=>sh.id===a.shiftId);if(!sh)continue;
  const when=new Date(`${sh.date}T${a.time}:00+07:00`).getTime();
  if(when<now.getTime()||when>cutoff)continue;
  const doc=s.doctors.find(d=>d.id===sh.doctorId);
  for(const user of s.users.filter(u=>u.patientId===a.patientId&&u.active)){
   const key=`reminder:${user.id}:${a.id}:${sh.date}:${a.time}`;
   if(s.notifications.some(n=>n.id===key))continue;
   s.notifications.push({id:key,userId:user.id,text:`Nhắc lịch khám ${a.id}: ${a.time} ngày ${sh.date.split("-").reverse().join("/")} với bác sĩ ${doc?.name??"được phân công"}. Vui lòng đến trước giờ hẹn 15 phút.`,createdAt:now.toISOString(),read:false});changed=true;
  }
 }
 return changed;
}
export function filteredState(s:State,u:User):Omit<AppData,"storage"|"demo">{
 normalizeLifecycle(s);
 const ownAppointments=s.appointments.filter(a=>u.role==="patient"?a.patientId===u.patientId:u.role==="doctor"?(s.shifts.find(sh=>sh.id===a.shiftId)?.doctorId===u.doctorId||s.visits.some(v=>v.appointmentId===a.id&&v.doctorId===u.doctorId)):true);
 const assignedPatients=new Set(ownAppointments.filter(a=>!["cancelled","rejected"].includes(a.status)).map(a=>a.patientId));
 const allRelevantVisits=s.visits.filter(v=>{const a=s.appointments.find(a=>a.id===v.appointmentId);return a&&assignedPatients.has(a.patientId);});
 const visibleVisits=u.role==="doctor"?allRelevantVisits:u.role==="patient"?s.visits.filter(v=>ownAppointments.some(a=>a.id===v.appointmentId)):s.visits;
 const records=(u.role==="admin"||u.role==="reception")?[]:s.records.filter(r=>visibleVisits.some(v=>v.id===r.visitId)&&(!!r.publishedAt||(u.role==="doctor"&&s.visits.find(v=>v.id===r.visitId)?.doctorId===u.doctorId)));
 const patients=s.patients.filter(p=>u.role==="patient"?p.id===u.patientId:u.role==="doctor"?assignedPatients.has(p.id):true).map(p=>(u.role==="reception"||u.role==="admin")?{...p,history:"",allergies:""}:p);
 // History needs appointment identities for older published encounters of assigned patients.
 const appointments=u.role==="doctor"?s.appointments.filter(a=>assignedPatients.has(a.patientId)):ownAppointments;
 return {me:publicUser(u),users:u.role==="admin"?s.users.map(publicUser):[publicUser(u)],patients,doctors:s.doctors,specialties:s.specialties,shifts:s.shifts.map(sh=>({...sh,reserved:countReserved(s,sh.id)})),appointments,visits:visibleVisits,records:[...records].sort((a,b)=>(b.publishedAt??"9999").localeCompare(a.publishedAt??"9999")),medicines:s.medicines,notifications:s.notifications.filter(n=>n.userId===u.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))};
}
export function execute(s:State,u:User,raw:unknown){
 normalizeLifecycle(s);
 const base=z.object({action:text}).passthrough().parse(raw);const action=base.action;
 switch(action){
 case "book":{
  requireRole(u,"patient","reception");const b=z.object({patientId:short,shiftId:short,time:clock,reason:text.max(500),requestId:short,sourceRecordId:optional}).parse(base);patientForUser(s,u,b.patientId);
  const duplicate=s.appointments.find(a=>a.requestId===b.requestId);if(duplicate){if(duplicate.patientId!==b.patientId)fail("Mã yêu cầu đã được sử dụng.",409);return {message:"Lịch hẹn đã được ghi nhận.",id:duplicate.id};}
  checkSlot(s,b.shiftId,b.time,b.patientId);
  if(b.sourceRecordId){const r=need(s.records.find(r=>r.id===b.sourceRecordId&&r.publishedAt));const v=need(s.visits.find(v=>v.id===r.visitId));const original=need(s.appointments.find(a=>a.id===v.appointmentId));if(original.patientId!==b.patientId)fail("Đề nghị tái khám không thuộc bệnh nhân.",403);}
  const a={id:"LH"+id().slice(0,8).toUpperCase(),...b,status:"pending" as const,createdAt:new Date().toISOString()};s.appointments.unshift(a);notice(s,b.patientId,`Đã nhận yêu cầu đặt lịch ${a.id}. Phòng khám sẽ xác nhận lịch sớm nhất.`);return {message:"Đặt lịch thành công. Đang chờ xác nhận.",id:a.id};
 }
 case "reschedule":{
  requireRole(u,"patient","reception");const b=z.object({id:short,shiftId:short,time:clock}).parse(base);const a=appointmentAccess(s,u,b.id);if(!["pending","confirmed"].includes(a.status))fail("Chỉ được đổi lịch trước khi tiếp nhận.");checkSlot(s,b.shiftId,b.time,a.patientId,a.id);a.shiftId=b.shiftId;a.time=b.time;a.status="pending";notice(s,a.patientId,`Lịch ${a.id} đã được đổi và đang chờ xác nhận lại.`);return {message:"Đã đổi lịch hẹn."};
 }
 case "cancel":case "confirm":case "reject":{
  requireRole(u,...(action==="cancel"?["patient","reception"] as const:["reception"] as const));const b=z.object({id:short,reason:optional}).parse(base);const a=appointmentAccess(s,u,b.id);
  if(action==="cancel"&&a.status==="cancelled")return {message:"Lịch hẹn đã được hủy."};
  if(action==="confirm"&&a.status==="confirmed")return {message:"Lịch hẹn đã được xác nhận."};
  if(action==="cancel"?!["pending","confirmed"].includes(a.status):a.status!=="pending")fail("Trạng thái lịch hẹn không cho phép thao tác này.",409);
  a.status=action==="cancel"?"cancelled":action==="confirm"?"confirmed":"rejected";a.cancelReason=b.reason;notice(s,a.patientId,`Lịch ${a.id}: ${action==="confirm"?"đã được xác nhận":action==="cancel"?"đã hủy":"không được chấp nhận"}.${b.reason?" "+b.reason:""}`);return {message:"Đã cập nhật lịch hẹn."};
 }
 case "checkin":{
  requireRole(u,"reception");const b=z.object({id:short}).parse(base);const a=appointmentAccess(s,u,b.id);const existing=s.visits.find(v=>v.appointmentId===a.id);if(existing)return {message:`Bệnh nhân đã được tiếp nhận, số thứ tự ${existing.queue}.`};
  if(a.status!=="confirmed")fail("Cần xác nhận lịch trước khi tiếp nhận.");const sh=need(s.shifts.find(sh=>sh.id===a.shiftId));if(sh.date!==today())fail("Chỉ tiếp nhận lịch hẹn trong ngày khám.");
  const queue=Math.max(0,...s.visits.filter(v=>s.appointments.find(a=>a.id===v.appointmentId)?.shiftId===sh.id).map(v=>v.queue))+1;s.visits.push({id:id(),appointmentId:a.id,doctorId:sh.doctorId,queue,status:"waiting"});a.status="received";return {message:`Đã tiếp nhận bệnh nhân. Số thứ tự ${queue}.`};
 }
 case "assign":{
  requireRole(u,"reception");const b=z.object({visitId:short,shiftId:short,time:clock}).parse(base);const v=need(s.visits.find(v=>v.id===b.visitId));if(v.status!=="waiting")fail("Chỉ điều phối lượt đang chờ khám.");const a=need(s.appointments.find(a=>a.id===v.appointmentId));const sh=checkSlot(s,b.shiftId,b.time,a.patientId,a.id);if(sh.date!==today())fail("Chỉ chuyển lượt sang ca trong ngày.");a.shiftId=sh.id;a.time=b.time;v.doctorId=sh.doctorId;v.queue=Math.max(0,...s.visits.filter(other=>other.id!==v.id&&s.appointments.find(a=>a.id===other.appointmentId)?.shiftId===sh.id).map(other=>other.queue))+1;notice(s,a.patientId,`Lượt khám của bạn đã được điều phối lại vào ${b.time}.`);return {message:"Đã điều phối lượt khám."};
 }
 case "startExam":{
  const b=z.object({visitId:short}).parse(base);const v=visitForDoctor(s,u,b.visitId);if(v.status==="completed")fail("Lượt khám đã hoàn tất.");if(need(s.appointments.find(a=>a.id===v.appointmentId)).status!=="received")fail("Lịch hẹn chưa được tiếp nhận.");v.status="examining";
  if(!s.records.some(r=>r.visitId===v.id))s.records.push({id:id(),visitId:v.id,symptoms:"",findings:"",diagnosis:"",treatment:"",followupDate:"",followupNotes:"",rx:[],publishedAt:null});return {message:"Đã bắt đầu lượt khám."};
 }
 case "saveExam":case "finishExam":{
  const b=z.object({visitId:short,symptoms:optional,findings:optional,diagnosis:optional,treatment:optional,followupDate:z.union([date,z.literal("")]).default(""),followupNotes:optional,rx:z.array(z.object({medicineId:short,dose:text.max(100),times:z.number().int().min(1).max(24),days:z.number().int().min(1).max(365),quantity:z.number().int().min(1).max(10000),instructions:optional})).max(30).default([])}).parse(base);
  const v=visitForDoctor(s,u,b.visitId);const r=need(s.records.find(r=>r.visitId===v.id));if(action==="finishExam"&&v.status==="completed"&&r.publishedAt)return {message:"Lượt khám đã hoàn tất và kết quả đã được công bố.",id:r.id};if(v.status!=="examining")fail("Chỉ sửa phiếu khi đang khám.",409);if(r.publishedAt)fail("Phiếu đã công bố không được sửa trực tiếp.");
  if(action==="finishExam"&&(!b.symptoms||!b.findings||!b.diagnosis||!b.treatment))fail("Vui lòng nhập triệu chứng, kết quả thăm khám, chẩn đoán và hướng điều trị.");
  if(b.followupDate&&b.followupDate<today())fail("Ngày tái khám không được nằm trong quá khứ.");
  if(action==="finishExam"&&b.rx.some(line=>!line.instructions.trim()))fail("Mỗi thuốc cần có hướng dẫn sử dụng trước khi hoàn tất khám.");
  const rx=b.rx.map(line=>{const m=need(s.medicines.find(m=>m.id===line.medicineId&&m.active),"Thuốc không còn được sử dụng.");return {...line,name:m.name,unit:m.unit};});
  Object.assign(r,{symptoms:b.symptoms,findings:b.findings,diagnosis:b.diagnosis,treatment:b.treatment,followupDate:b.followupDate,followupNotes:b.followupNotes,rx});
  if(action==="finishExam"){r.publishedAt=new Date().toISOString();v.status="completed";const a=need(s.appointments.find(a=>a.id===v.appointmentId));notice(s,a.patientId,"Kết quả khám và đơn thuốc của bạn đã được bác sĩ công bố. Bạn có thể xem trong mục Hồ sơ sức khỏe.");}
  return {message:action==="finishExam"?"Đã hoàn tất khám và công bố kết quả.":"Đã lưu phiếu khám nháp."};
 }
 case "savePatient":{
  requireRole(u,"reception","patient");const b=z.object({id:optional,name:short,birth:date,gender:z.enum(["Nam","Nữ","Khác"]),phone:z.string().regex(/^[+\d\s-]{9,16}$/,"Số điện thoại không hợp lệ."),address:optional}).parse(base);if(b.birth>today())fail("Ngày sinh không được nằm trong tương lai.");
  if(u.role==="patient"&&b.id!==u.patientId)fail("Bạn chỉ được sửa thông tin cá nhân.",403);
  if(b.id){const p=patientForUser(s,u,b.id);Object.assign(p,{name:b.name,birth:b.birth,gender:b.gender,phone:b.phone,address:b.address});for(const account of s.users.filter(x=>x.patientId===p.id))account.name=p.name;}
  else s.patients.unshift({id:id(),name:b.name,birth:b.birth,gender:b.gender,phone:b.phone,address:b.address,history:"Chưa ghi nhận",allergies:"Chưa ghi nhận",createdAt:new Date().toISOString()});return {message:"Đã lưu thông tin bệnh nhân."};
 }
 case "updateContact":{
  requireRole(u,"doctor");const b=z.object({phone:z.string().regex(/^[+\d\s-]{9,16}$/),email:z.string().email()}).parse(base);need(s.doctors.find(d=>d.id===u.doctorId)).phone=b.phone;u.email=b.email;return {message:"Đã cập nhật thông tin liên hệ."};
 }
 case "readNotifications":{s.notifications.filter(n=>n.userId===u.id).forEach(n=>n.read=true);return {message:"Đã đánh dấu thông báo đã đọc."};}
 case "changePassword":{const b=z.object({currentPassword:text,password:z.string().min(8).max(128)}).parse(base);if(!verifyPassword(b.currentPassword,u.passwordHash))fail("Mật khẩu hiện tại không đúng.");u.passwordHash=hashPassword(b.password);u.version++;return {message:"Đã đổi mật khẩu. Vui lòng đăng nhập lại.",logout:true};}
 case "saveSpecialty":{
  requireRole(u,"admin");const b=z.object({id:optional,name:short,active:z.boolean()}).parse(base);if(s.specialties.some(x=>x.name.toLocaleLowerCase()===b.name.toLocaleLowerCase()&&x.id!==b.id))fail("Tên chuyên khoa đã tồn tại.");if(b.id){const sp=need(s.specialties.find(x=>x.id===b.id));if(!b.active&&s.shifts.some(sh=>s.doctors.find(d=>d.id===sh.doctorId)?.specialtyId===sp.id&&sh.date>=today()&&s.appointments.some(a=>a.shiftId===sh.id&&isOpenAppointment(s,a))))fail("Cần xử lý các lịch khám đang hoạt động trước khi ngừng chuyên khoa.");Object.assign(sp,{name:b.name,active:b.active});}else s.specialties.push({id:id(),name:b.name,active:b.active});return {message:"Đã lưu chuyên khoa."};
 }
 case "saveDoctor":{
  requireRole(u,"admin");const b=z.object({id:optional,name:short,specialtyId:short,title:short,phone:optional,bio:optional,active:z.boolean()}).parse(base);need(s.specialties.find(x=>x.id===b.specialtyId&&x.active),"Chuyên khoa không hoạt động.");if(b.id){const d=need(s.doctors.find(d=>d.id===b.id));if(!b.active&&s.appointments.some(a=>s.shifts.find(sh=>sh.id===a.shiftId)?.doctorId===d.id&&isOpenAppointment(s,a)))fail("Cần xử lý lịch khám đang hoạt động trước khi ngừng bác sĩ.");Object.assign(d,b);for(const account of s.users.filter(x=>x.doctorId===d.id))account.name=d.name;}
  else s.doctors.push({...b,id:id(),initials:b.name.split(" ").slice(-2).map(x=>x[0]).join(""),color:"mint"});return {message:"Đã lưu hồ sơ bác sĩ."};
 }
 case "saveShift":{
  requireRole(u,"admin");const b=z.object({id:optional,doctorId:short,date,start:clock,end:clock,capacity:z.number().int().min(1).max(100),active:z.boolean()}).parse(base);if(b.start>=b.end)fail("Giờ kết thúc phải sau giờ bắt đầu.");need(s.doctors.find(d=>d.id===b.doctorId&&d.active),"Bác sĩ không hoạt động.");if(b.date<today())fail("Không thể thiết lập ca cho ngày đã qua.");
  if(b.active&&s.shifts.some(sh=>sh.id!==b.id&&sh.active&&sh.doctorId===b.doctorId&&sh.date===b.date&&b.start<sh.end&&b.end>sh.start))fail("Ca làm việc bị trùng với ca hiện có.",409);
  const existing=b.id?s.shifts.find(sh=>sh.id===b.id):undefined;if(b.id&&!existing)fail("Không tìm thấy ca khám.",404);
  if(existing){const active=s.appointments.filter(a=>a.shiftId===existing.id&&!["cancelled","rejected"].includes(a.status));if(active.length&&(!b.active||existing.doctorId!==b.doctorId||existing.date!==b.date||active.some(a=>a.time<b.start||a.time>=b.end)||b.capacity<active.length))fail("Thay đổi ảnh hưởng lịch đã đặt. Hãy xử lý các lịch trước.");Object.assign(existing,b);}else s.shifts.push({...b,id:id()});return {message:"Đã lưu ca làm việc."};
 }
 case "saveMedicine":{
  requireRole(u,"admin");const b=z.object({id:optional,name:short,unit:short,description:optional,active:z.boolean()}).parse(base);if(b.id)Object.assign(need(s.medicines.find(m=>m.id===b.id)),b);else s.medicines.push({...b,id:id()});return {message:"Đã lưu danh mục thuốc."};
 }
 case "saveUser":{
  requireRole(u,"admin");const b=z.object({id:optional,username:z.string().trim().regex(/^[a-zA-Z0-9_.-]{3,40}$/, "Tên đăng nhập gồm 3–40 chữ, số hoặc dấu . _ -"),name:short,email:z.string().email(),role:z.enum(["patient","doctor","reception","admin"]),active:z.boolean(),patientId:optional,doctorId:optional,password:z.string().max(128).default("")}).parse(base);
  if(s.users.some(x=>x.username.toLowerCase()===b.username.toLowerCase()&&x.id!==b.id))fail("Tên đăng nhập đã tồn tại.",409);
  if(b.id===u.id&&(!b.active||b.role!=="admin"))fail("Không thể tự khóa hoặc gỡ quyền quản trị của tài khoản đang dùng.");
  if(b.role==="patient")need(s.patients.find(p=>p.id===b.patientId),"Hãy chọn hồ sơ bệnh nhân.");if(b.role==="doctor")need(s.doctors.find(d=>d.id===b.doctorId),"Hãy chọn bác sĩ.");
  if(s.users.some(x=>x.id!==b.id&&((b.role==="patient"&&x.patientId===b.patientId)||(b.role==="doctor"&&x.doctorId===b.doctorId))))fail("Hồ sơ này đã liên kết với một tài khoản khác.");
  const {password,...data}=b;const user=b.id?need(s.users.find(x=>x.id===b.id)):undefined;
  if(password&&password.length<8)fail("Mật khẩu cần ít nhất 8 ký tự.");if(!user&&!password)fail("Cần nhập mật khẩu cho tài khoản mới.");
  if(user){const version=user.version+1;Object.assign(user,data,{version,patientId:b.role==="patient"?b.patientId:undefined,doctorId:b.role==="doctor"?b.doctorId:undefined});if(password)user.passwordHash=hashPassword(password);}
  else s.users.push({...data,id:id(),version:1,passwordHash:hashPassword(password),patientId:b.role==="patient"?b.patientId:undefined,doctorId:b.role==="doctor"?b.doctorId:undefined});
  return {message:"Đã lưu tài khoản và phân quyền.",...(b.id===u.id?{logout:true}:{})};
 }
 default:fail("Thao tác không được hỗ trợ.");
 }
}
