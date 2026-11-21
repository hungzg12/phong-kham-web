import {loadState,querySql} from './admin-store.mjs';
import {authorize,fail} from './admin-domain.mjs';
import {listVisits} from './clinic-flow.mjs';
import {ancillaryState,listBeds} from './ancillary.mjs';
import {pharmacyState} from './pharmacy.mjs';
import {financeState} from './finance.mjs';
import {portalState} from './patient-portal.mjs';
import {listAppointments} from './appointments.mjs';

const specialties={receptionist:'QUAN_TRI',doctor:'BAC_SI',nurse:'DIEU_DUONG',technician:'KY_THUAT_VIEN',pharmacist:'DUOC_SI',cashier:'THU_NGAN'};
const roles=new Set([...Object.keys(specialties),'patient','admin']);
const rows=async(sql,p={})=>JSON.parse(await querySql(`SELECT (${sql} FOR JSON PATH)`,p)||'[]');
export async function workspaceIdentity(req){
 let token='';try{token=decodeURIComponent((req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('medicare_admin_session='))?.slice('medicare_admin_session='.length)||'');}catch{}
 const state=await loadState();if(!state)fail(503,'Chưa cấu hình tài khoản. Liên hệ quản trị viên.');
 const {user,role,session}=authorize(state.data,token);
 const actor=role.id==='admin'?'admin':role.workspaceRole||role.id;
 if(!roles.has(actor)||actor==='none')fail(403,'Tài khoản chưa được gán vai trò nghiệp vụ.');
 if(actor==='admin')return {role:'admin',userId:user.id,person:user.name,csrf:session.csrf};
 if(actor==='patient'){
  if(user.staffId||!user.patientId)fail(403,'Tài khoản bệnh nhân chưa liên kết đúng hồ sơ.');
  const patient=(await rows('SELECT maBenhNhan id,hoTen name FROM dbo.BenhNhan WHERE maBenhNhan=@id',{id:user.patientId}))[0];
  if(!patient)fail(403,'Hồ sơ bệnh nhân liên kết không còn tồn tại.');
  return {role:actor,userId:user.id,person:patient.name,patientId:patient.id,csrf:session.csrf};
 }
 const staff=(await rows('SELECT maNhanVien id,hoTen name FROM dbo.NhanVien WHERE maNhanVien=@id AND chuyenMon=@specialty AND dangLamViec=1',{id:user.staffId||'',specialty:specialties[actor]}))[0];
 if(!staff||user.patientId)fail(403,'Tài khoản chưa liên kết với nhân viên đang hoạt động đúng chuyên môn.');
 return {role:actor,userId:user.id,person:staff.name,staffId:staff.id,csrf:session.csrf};
}
const readRoles={
 '/api/patients':['admin','receptionist','doctor','nurse','technician','pharmacist','cashier','patient'],
 '/api/queue':['admin','receptionist','doctor','nurse','patient'],
 '/api/ancillary':['admin','receptionist','doctor','nurse','technician','pharmacist','cashier'],
 '/api/pharmacy/state':['admin','doctor','nurse','pharmacist'],
 '/api/finance':['admin','cashier'],
 '/api/portal':['patient'],
 '/api/appointments':['admin','receptionist','patient'],
 '/api/inpatient/beds':['admin','doctor','nurse'],
 '/api/clinical/visit':['admin','doctor','nurse'],
 '/api/clinical/doctors':['admin','receptionist','doctor','nurse'],
 '/api/icd10':['admin','doctor'], '/api/icd10/template':['admin','doctor'],
 '/api/medicines':['admin','doctor','pharmacist'], '/api/services':['admin','doctor','technician','cashier'],
 '/api/pharmacy/batches':['admin','pharmacist'], '/api/clinical/prescriptions':['admin','doctor','pharmacist'],
};
const writeRoles={
 '/api/appointments':['admin','receptionist'], '/api/patients':['admin','receptionist'], '/api/visits':['admin','receptionist'],
 '/api/clinical/exam':['admin','doctor'], '/api/nursing/vitals':['admin','nurse'], '/api/nursing/perform':['admin','nurse'], '/api/nursing/bed':['admin','nurse'],
 '/api/inpatient/admit':['admin','doctor','nurse'], '/api/inpatient/discharge':['admin','doctor','nurse'], '/api/inpatient/clean':['admin','nurse'],
 '/api/labs/orders':['admin','doctor'], '/api/labs/action':['admin','technician'], '/api/pharmacy/action':['admin','doctor','pharmacist'],
 '/api/finance/action':['admin','cashier'], '/api/portal/appointments':['patient'],
};

// A closed list: unknown and legacy endpoints never bypass the session boundary.
export async function protectWorkspaceRequest(req){
 const url=new URL(req.url,'http://localhost'),path=url.pathname;
 if(path==='/api/health')return {public:true};
 const identity=await workspaceIdentity(req);
 if(path==='/api/workspace/session'&&req.method==='GET')return {identity,answer:identity};
 const read=req.method==='GET';
 if(!(read?readRoles:writeRoles)[path]?.includes(identity.role))fail(403,'Vai trò không được truy cập API hoặc phương thức này.');
 if(!read){
  if(!['POST','PUT','PATCH'].includes(req.method))fail(405,'Phương thức không được hỗ trợ.');
  if(req.headers['x-csrf-token']!==identity.csrf)fail(403,'Phiên biểu mẫu không hợp lệ. Tải lại trang.');
  if(req.headers.origin){let origin;try{origin=new URL(req.headers.origin);}catch{fail(403,'Nguồn yêu cầu không hợp lệ.');}if(origin.host!==req.headers.host||!['http:','https:'].includes(origin.protocol))fail(403,'Nguồn yêu cầu không được phép.');}
  if(!req.headers['content-type']?.startsWith('application/json'))fail(415,'Yêu cầu phải dùng application/json.');
  let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>65536)fail(413,'Dữ liệu quá dài.');}
  let data;try{data=JSON.parse(raw);}catch{fail(400,'JSON không hợp lệ.');}
  if(!data||Array.isArray(data)||typeof data!=='object')fail(400,'Dữ liệu không hợp lệ.');
  // Ignore spoofed identity fields; domain rules still validate role-specific actions.
  data={...data,role:identity.role,staffId:identity.staffId||(identity.role==='admin'?'NV-KTV01':undefined),doctorStaffId:identity.staffId};
  if(path==='/api/nursing/perform')data.nurse=identity.staffId;
  if(path==='/api/portal/appointments')data.patientId=identity.patientId;
  if(identity.role==='doctor'){
   const scope=await doctorScope(identity.staffId);
   let episode=data.episodeId||data.visitId;
   if(path==='/api/pharmacy/action'&&data.action==='approvePrescription')episode=(await pharmacyState()).prescriptions.find(r=>r.id===data.id)?.episodeId;
   if(!scope.episodes.has(episode))fail(403,'Hồ sơ không thuộc phân công của bác sĩ.');
  }
  const trusted=Buffer.from(JSON.stringify(data));req[Symbol.asyncIterator]=async function*(){yield trusted;};
  return {identity};
 }
 const scope=identity.role==='doctor'?await doctorScope(identity.staffId):null;
 const inScope=row=>!scope||scope.episodes.has(row.episodeId||row.id);
 if(path==='/api/portal')return {identity,answer:await portalState(identity.patientId)};
 if(path==='/api/finance')return {identity,answer:await financeState()};
 if(path==='/api/appointments')return {identity,answer:(await listAppointments()).filter(a=>identity.role!=='patient'||a.patientId===identity.patientId)};
 if(path==='/api/queue'){
  let data=await listVisits({history:url.searchParams.get('history')==='1'});
  if(scope)data=data.filter(v=>scope.episodes.has(v.id));
  if(identity.role==='patient')data=data.filter(v=>v.patientId===identity.patientId).map(({note,history,symptoms,diagnosis,examination,plan,advice,icd,...summary})=>summary);
  if(identity.role==='receptionist')data=data.map(({note,history,symptoms,diagnosis,examination,plan,advice,icd,...summary})=>summary);
  return {identity,answer:data};
 }
 if(path==='/api/patients'){
  const q=(url.searchParams.get('q')||'').toLowerCase();
  let data=await rows('SELECT maBenhNhan id,hoTen name,CONVERT(char(10),ngaySinh,23) birth,gioiTinh gender,soDienThoai phone,soBHYT insurance,diaChi address,soDinhDanh cccd,diUngThuoc allergy,trangThaiDiUng allergyStatus FROM dbo.BenhNhan');
  if(scope)data=data.filter(p=>scope.patients.has(p.id));
  if(identity.role==='patient')data=data.filter(p=>p.id===identity.patientId);
  return {identity,answer:data.filter(p=>JSON.stringify(p).toLowerCase().includes(q))};
 }
 if(path==='/api/ancillary'){
  const a=await ancillaryState();
  if(identity.role==='admin')return {identity,answer:a};
  a.staff=a.staff.filter(s=>s.id===identity.staffId||s.specialty==='BAC_SI');
  a.vitals=['doctor','nurse'].includes(identity.role)?a.vitals.filter(inScope):[];
  a.labs=['doctor','technician'].includes(identity.role)?a.labs.filter(inScope):[];
  a.rounds=['doctor','nurse'].includes(identity.role)?a.rounds.filter(inScope):[];
  a.admissions=['doctor','nurse'].includes(identity.role)?a.admissions.filter(r=>!scope||scope.episodes.has(r.id)):[];
  if(identity.role!=='pharmacist'){a.warehouses=[];a.inventory=[];}
  return {identity,answer:a};
 }
 if(['/api/pharmacy/state','/api/medicines','/api/pharmacy/batches','/api/clinical/prescriptions'].includes(path)){
  const p=await pharmacyState();
  if(scope)p.prescriptions=p.prescriptions.filter(inScope);
  if(identity.role==='pharmacist')p.prescriptions=p.prescriptions.filter(r=>r.status!=='Nháp');
  if(path==='/api/medicines')return {identity,answer:p.stock.filter(s=>s.kind==='THUOC').map(s=>({...s,stockQty:s.qty}))};
  if(path==='/api/clinical/prescriptions'){
   const id=url.searchParams.get('visitId');if(scope&&!scope.episodes.has(id))fail(403,'Hồ sơ không thuộc phân công của bác sĩ.');
   return {identity,answer:p.prescriptions.filter(r=>r.episodeId===id)};
  }
  if(path==='/api/pharmacy/batches')return {identity,answer:p.inventory.map(l=>({maLoTon:l.id,maLoHang:l.id,maHang:l.medicineId,maKho:l.warehouseId,tenKho:p.warehouses.find(w=>w.id===l.warehouseId)?.name,soLoNhaSanXuat:l.lot,hanSuDung:l.expiry,soLuongTon:l.physicalQty,soLuongKhaDung:l.qty,trangThaiKhoa:l.locked}))};
  if(['doctor','nurse'].includes(identity.role)){p.movements=[];p.counts=[];p.ledger=[];}
  if(identity.role==='nurse')p.prescriptions=[];
  return {identity,answer:p};
 }
 if(path==='/api/services')return {identity,answer:(await ancillaryState()).services};
 if(path==='/api/inpatient/beds')return {identity,answer:(await listBeds()).filter(b=>!scope||!b.admissionId||scope.episodes.has(b.admissionId))};
 if(path==='/api/clinical/visit'){
  const id=url.searchParams.get('id');if(scope&&!scope.episodes.has(id))fail(403,'Hồ sơ không thuộc phân công của bác sĩ.');
 }
 return {identity};
}
async function doctorScope(staff){
 const visits=(await listVisits({history:true})).filter(v=>v.doctorStaffId===staff);
 const admissions=await rows('SELECT maDotDieuTri id,maBenhNhan patientId FROM dbo.DotDieuTri WHERE maBacSiDieuTriChinh=@staff',{staff});
 return {episodes:new Set([...visits,...admissions].map(v=>v.id)),patients:new Set([...visits,...admissions].map(v=>v.patientId))};
}
