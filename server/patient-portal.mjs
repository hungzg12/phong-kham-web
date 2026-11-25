import {querySql} from './admin-store.mjs';
import {listVisits} from './clinic-flow.mjs';
import {ancillaryState} from './ancillary.mjs';
import {financeState} from './finance.mjs';
import {listAppointments,saveAppointment,cancelAppointment} from './appointments.mjs';

// HTTP requests supply the linked patient ID from the SQL-backed session.
// The default below is retained only for isolated domain fixtures.
const demoPatientId='BN0001';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
async function patient(patientId){
 const rows=JSON.parse(await querySql(`SELECT (SELECT maBenhNhan id,hoTen name,CONVERT(char(10),ngaySinh,23) birth,gioiTinh gender,soDienThoai phone,soBHYT insurance,diaChi address,soDinhDanh cccd,diUngThuoc allergy FROM dbo.BenhNhan WHERE maBenhNhan=@id FOR JSON PATH)`,{id:patientId})||'[]');
 if(!rows[0])fail(404,'Chưa có hồ sơ bệnh nhân được liên kết.');return rows[0];
}
export async function portalState(patientId=demoPatientId){
 const person=await patient(patientId);
 const [visits,ancillary,finance,appointments]=await Promise.all([listVisits({history:true}),ancillaryState(),financeState(),listAppointments()]);
 const mine=visits.filter(v=>v.patientId===patientId);
 const prescriptions=JSON.parse(await querySql(`SELECT (SELECT p.maDon id,COALESCE(p.maLuotKham,p.maDotDieuTri) episodeId,p.chanDoan diagnosis,p.loiDan advice,
 CASE p.trangThaiCapPhat WHEN 'DA_CAP_DU' THEN N'Đã cấp phát' ELSE N'Đã xác nhận' END status,
 JSON_QUERY((SELECT h.tenHang name,c.soLuongKe quantity,c.cachDung dose,c.soNgayDung days,c.donViKe unit FROM dbo.ChiTietDonThuoc c JOIN dbo.HangHoaYTe h ON h.maHang=c.maHang WHERE c.maDon=p.maDon AND c.trangThai<>'DA_HUY' FOR JSON PATH)) lines
 FROM dbo.DonThuoc p LEFT JOIN dbo.LuotKham l ON l.maLuotKham=p.maLuotKham LEFT JOIN dbo.DotDieuTri d ON d.maDotDieuTri=p.maDotDieuTri
 WHERE COALESCE(l.maBenhNhan,d.maBenhNhan)=@id AND p.thoiDiemDuyet IS NOT NULL AND p.trangThaiCapPhat<>'DA_HUY' FOR JSON PATH)`,{id:patientId})||'[]');
 const history=mine.map(v=>{
  const vitalsObj=v.note?.vitals||(v.bpSystolic||v.height||v.weight?{pressure:v.bpSystolic?`${v.bpSystolic}/${v.bpDiastolic}`:'',height:v.height,weight:v.weight}:null);
  const hasVitals=Boolean(vitalsObj?.pressure);
  const bmi=vitalsObj?.height&&vitalsObj?.weight?(Number(vitalsObj.weight)/Math.pow(Number(vitalsObj.height)/100,2)).toFixed(1):null;
  return {
   id:v.id,date:v.date,time:v.time,department:v.department,room:v.room||v.department,roomCode:v.roomCode||'',
   doctor:v.doctor||'Chưa phân công',queueNumber:v.queueNumber,queueTag:v.queueTag||(v.queueNumber?`#${v.queueNumber}`:'—'),
   reason:v.reason||'',status:v.status,statusRaw:v.statusRaw,hasVitals,vitals:hasVitals?{...vitalsObj,bmi}:null
  };
 });
 return {patient:person,history,
 results:mine.filter(v=>v.locked&&v.status==='Hoàn tất'&&v.note).map(v=>({id:v.id,date:v.date,diagnosis:v.note.diagnosis,advice:v.note.advice,outcome:v.note.outcome})),
 labs:ancillary.labs.filter(l=>l.patient===patientId&&l.status==='Đã phát hành').map(l=>({id:l.id,service:ancillary.services.find(s=>s.id===l.service)?.name||l.service,result:l.result,resultRows:l.resultRows,conclusion:l.conclusion,releasedAt:l.releasedAt})),
 prescriptions,appointments:appointments.filter(a=>a.patientId===patientId),settlements:finance.settlements.filter(q=>q.patient===patientId),advances:finance.advances.filter(a=>a.patient===patientId)};
}
export async function portalAppointment(data,patientId=demoPatientId){
 const person=await patient(patientId);
 if(data?.action==='cancel'){
  const found=(await listAppointments()).find(a=>a.id===data.id&&a.patientId===patientId);
  if(!found)fail(404,'Không tìm thấy lịch hẹn của bạn.');return cancelAppointment(found.id,data.reason);
 }
 if(data?.action!=='create')fail(400,'Thao tác lịch hẹn không hợp lệ.');
 return saveAppointment({name:person.name,phone:person.phone,birth:person.birth,gender:person.gender,dept:data.dept,day:data.day,time:data.time},null,patientId);
}
