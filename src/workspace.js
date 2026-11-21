import {currentIdentity} from './session.js';
import {useSyncExternalStore} from 'react';
import {initialPatients,initialStock} from './fixtures.js';
import {seeds,today} from './business-data.js';
import {hisApi} from './api.js';
import {actorRoles} from './roles.js';

export const DATA_KEY='medicare-sqlserver-live';
let state=null,issue=null,workspaceEpoch=0;
export function resetWorkspaceMemory(){workspaceEpoch++;state=null;issue=null;}

const subscribers=new Set();
const alertSubscribers=new Set();

export const id=prefix=>prefix+'-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
const copy=value=>structuredClone(value);

export function reportIssue(message){issue=message;alertSubscribers.forEach(fn=>fn())}
export function clearIssue(){issue=null;alertSubscribers.forEach(fn=>fn())}
export function useStorageIssue(){return useSyncExternalStore(fn=>{alertSubscribers.add(fn);return()=>alertSubscribers.delete(fn)},()=>issue)}

function visitFor(patient,index,note){
  return {
    id:'LK-'+String(index+1).padStart(5,'0'),
    patientId:patient.id,
    kind:'Ngoại trú',
    date:today,
    time:patient.time||'08:00',
    department:patient.dept||'Nội tổng quát',
    doctor:patient.doctor||'BS. Trần Minh Anh',
    status:patient.status||'Chờ khám',
    note:note||null,
    createdAt:today+'T'+(patient.time||'08:00'),
    migrated:true
  };
}

export function initializeWorkspace(){
  if(state) return state;

  // Preserve existing browser data during SQL synchronization.

  const patients=copy(initialPatients);
  const stock=copy(initialStock);
  const notes={};
  const beds=Array.from({length:8},(_,i)=>({
    id:`G_NOI_301_0${i+1}`,
    bedNumber:`301-0${i+1}`,
    roomName:'Buồng 301 - Nội tổng quát',
    department:'Nội tổng quát',
    dailyRate:250000,
    patient:null,
    admissionId:null,
    cleaning:false,
    status:'Sẵn sàng'
  }));

  const visits=patients.map((p,i)=>visitFor(p,i,notes[p.id]));
  const admissions=[];
  const business=copy(seeds);
  const inventory=[];

  state={
    version:5,
    source:'SQL Server (QuanLyBenhVien)',
    profiles:{},
    patients,
    stock,
    notes,
    beds,
    visits,
    admissions,
    inventory,
    business,
    ledger:[],
    appointments:[],
    paid:[],
    migratedAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };

  // Asynchronously synchronize with Microsoft SQL Server
  syncWithSqlServer();

  return state;
}

export async function syncWithSqlServer(){
  const epoch=workspaceEpoch;
  try{
    const [pRes,qRes,bRes,mRes,sRes,batchRes,aRes,doctorRes,ancillaryRes,financeRes,pharmacyRes]=await Promise.allSettled([
      hisApi.getPatients(),
      hisApi.getQueue('',true),
      hisApi.getBeds(),
      hisApi.getMedicines(),
      hisApi.getServices(),
      hisApi.getPharmacyBatches(),
      hisApi.getAppointments(),
      hisApi.getDoctors(),
      hisApi.getAncillary(),
      hisApi.getFinance(),
      hisApi.getPharmacyState()
    ]);

    if(!state||epoch!==workspaceEpoch) return;
    let hasChanges=false;
    if(financeRes.status==='fulfilled'){
      for(const key of ['advances','settlements','shifts'])if(Array.isArray(financeRes.value[key]))state.business[key]=financeRes.value[key];
      hasChanges=true;
    }
    if(ancillaryRes.status==='fulfilled'){
      const incoming=ancillaryRes.value;
      if(Array.isArray(incoming.labs))state.business.labs=incoming.labs;
      if(Array.isArray(incoming.vitals))state.business.vitals=incoming.vitals;
      if(Array.isArray(incoming.rounds))state.business.rounds=incoming.rounds;
      if(Array.isArray(incoming.admissions))state.admissions=incoming.admissions;
      if(Array.isArray(incoming.staff)){
        state.business.staff=incoming.staff;
        for(const [role,specialty]of [['nurse','DIEU_DUONG'],['technician','KY_THUAT_VIEN'],['cashier','THU_NGAN'],['pharmacist','DUOC_SI']]){
          const available=incoming.staff.filter(s=>s.specialty===specialty);
          const linked=available.find(s=>s.id===actorRoles[role].staffId)||available.find(s=>s.name===actorRoles[role].person)||(available.length===1?available[0]:null);
          if(linked&&!currentIdentity()){actorRoles[role].staffId=linked.id;actorRoles[role].person=linked.name;}
        }
      }
      hasChanges=true;
    }
    if(doctorRes.status==='fulfilled'&&Array.isArray(doctorRes.value)){
      const doctors=doctorRes.value;
      const linked=doctors.find(d=>d.id===actorRoles.doctor.staffId)||doctors.find(d=>d.name===actorRoles.doctor.person)||(doctors.length===1?doctors[0]:null);
      if(linked&&!currentIdentity()){actorRoles.doctor.staffId=linked.id;actorRoles.doctor.person=linked.name;hasChanges=true;}
    }

    // 1. Patients from SQL Server
    if(pRes.status==='fulfilled'&&Array.isArray(pRes.value)){
      const colors=['pink','blue','purple','orange','green'];
      const sqlPatients=pRes.value.map((p,idx)=>({
        id:p.id,
        name:p.name,
        birth:p.birth,
        gender:p.gender,
        phone:p.phone,
        cccd:p.cccd,
        insurance:p.insurance,
        address:p.address,
        dept:'Nội tổng quát',
        doctor:'Chưa phân công',
        time:'08:00',
        status:'Chờ khám',
        color:colors[idx%colors.length],
        allergy:p.allergy,
        allergyStatus:p.allergyStatus
      }));

      state.patients=sqlPatients;
      hasChanges=true;
    }

    // 2. Queue & Visits from SQL Server
    if(qRes.status==='fulfilled'&&Array.isArray(qRes.value)){
      const sqlVisits=qRes.value.map(q=>({
        id:q.id,
        patientId:q.patientId,
        kind:'Ngoại trú',
        date:q.date,
        time:q.time,
        department:q.department,
        doctor:q.doctor||'Chưa phân công',
        doctorStaffId:q.doctorStaffId,
        status:q.status,
        queueNumber:q.queueNumber,
        room:q.room,
        roomCode:q.roomCode,
        reason:q.reason,
        note:q.note||null,
        locked:!!q.locked,
        revision:q.revision||0,
        createdAt:q.createdAt||q.date+'T'+q.time
      }));

      state.visits=sqlVisits;
      state.notes={};
      for(const v of sqlVisits){
        const p=state.patients.find(x=>x.id===v.patientId);
        if(p){
          p.dept=v.department;
          p.doctor=v.doctor;
          p.status=v.status;
          p.time=v.time;
        }
      }
      hasChanges=true;
    }

    for(const patient of state.patients)syncLatestPatient(state,patient.id);

    // 3. Beds from SQL Server
    if(bRes.status==='fulfilled'&&Array.isArray(bRes.value)&&bRes.value.length){
      state.beds=bRes.value.map(b=>({
        id:b.id,
        bedNumber:b.bedNumber,
        roomName:b.roomName,
        department:b.departmentName,
        dailyRate:b.dailyRate,
        patient:b.patientId||null,
        admissionId:b.admissionId||null,
        cleaning:b.statusRaw==='DANG_VE_SINH',
        status:b.status
      }));
      hasChanges=true;
    }

    // 4. Medicines & Stock from SQL Server
    if(mRes.status==='fulfilled'&&Array.isArray(mRes.value)&&mRes.value.length){
      state.stock=mRes.value.map(m=>({
        id:m.id,
        name:m.name,
        type:m.kind==='VAT_TU'?'Vật tư y tế':'Thuốc',
        kind:m.kind,
        lot:'LO-SQL',
        expiry:'2028-12-31',
        qty:Number(m.stockQty??0),
        unit:m.unit,
        price:m.price,
        insurancePrice:m.insurancePrice
      }));
      hasChanges=true;
    }

    // 5. Technical Services from SQL Server
    if(sRes.status==='fulfilled'&&Array.isArray(sRes.value)&&sRes.value.length){
      state.business.services=sRes.value.map(s=>({
        id:s.id,
        name:s.name,
        kind:s.kind,
        price:s.price,
        insurancePrice:s.insurancePrice,
        status:'Đang hoạt động',
        categoryRaw:s.categoryRaw
      }));
      hasChanges=true;
    }

    // 6. Pharmacy Batches from SQL Server
    if(batchRes.status==='fulfilled'&&Array.isArray(batchRes.value)){
      state.inventory=batchRes.value.map(b=>({
        id:b.maLoHang+'_'+(b.maKho||'KHO')+'_'+b.soLoNhaSanXuat,
        medicineId:b.maHang||b.maLoHang,
        warehouseId:b.maKho||'KHO_NGOAI_TRU',
        lot:b.soLoNhaSanXuat,
        expiry:b.hanSuDung,
        qty:Number(b.soLuongKhaDung??b.soLuongTon??0),
        receivedAt:today
      }));
      hasChanges=true;
    }

    // 7. Appointments from SQL Server
    if(aRes.status==='fulfilled'&&Array.isArray(aRes.value)){
      state.appointments=aRes.value.map(a=>({
        id:a.id,
        name:a.name,
        birth:a.birth,
        gender:a.gender,
        phone:a.phone,
        patientId:a.patientId,
        dept:a.dept||a.department,
        date:a.date?(a.date+'T'+(a.time||'08:00')):(a.day+'T'+a.time),
        status:({DA_DAT:'Đã xác nhận',DA_CHECK_IN:'Đã tiếp đón',DA_HUY:'Đã hủy'}[a.status]||a.status||'Đã xác nhận'),
        cancelReason:a.cancelReason,
        reason:a.reason||''
      }));
      hasChanges=true;
    }

    if(pharmacyRes.status==='fulfilled'){
      const incoming=pharmacyRes.value;
      for(const key of ['prescriptions','warehouses','movements','counts'])if(Array.isArray(incoming[key]))state.business[key]=incoming[key];
      for(const key of ['inventory','ledger','stock'])if(Array.isArray(incoming[key]))state[key]=incoming[key];
      hasChanges=true;
    }
    if(hasChanges){
      if(ancillaryRes.status==='fulfilled'){
        for(const key of ['services','warehouses'])if(Array.isArray(ancillaryRes.value[key]))state.business[key]=ancillaryRes.value[key];
        if(!state.inventory?.length && Array.isArray(ancillaryRes.value.inventory))state.inventory=ancillaryRes.value.inventory;
      }
      state.updatedAt=new Date().toISOString();
      subscribers.forEach(fn=>fn());
    }
  }catch(err){
    console.warn('SQL Server background sync notice:', err);
  }
}

export function getWorkspace(){return initializeWorkspace()}

export function transact(fn){
  const next=copy(getWorkspace());
  fn(next);
  next.stock=next.stock.map(s=>({
    ...s,
    qty:next.inventory.filter(l=>l.medicineId===s.id).reduce((total,l)=>total+Number(l.qty),0)
  }));
  next.updatedAt=new Date().toISOString();
  // Do NOT write to localStorage - state lives in-memory and binds to SQL Server
  state=next;
  clearIssue();
  subscribers.forEach(fn=>fn());
  return next;
}

export function useWorkspace(key){
  const value=useSyncExternalStore(
    fn=>{
      subscribers.add(fn);
      return()=>subscribers.delete(fn);
    },
    ()=>getWorkspace()[key]
  );

  return [value,update=>transact(d=>{
    const old=d[key];
    d[key]=typeof update==='function'?update(old):update;
    if(key==='patients'){
      for(const patient of d.patients){
        const previous=old.find(p=>p.id===patient.id);
        if(!previous){
          d.visits.unshift({...visitFor(patient,0),id:id('LK'),migrated:false});
          continue;
        }
        if(['status','dept','doctor'].some(k=>patient[k]!==previous[k])){
          const visit=d.visits.filter(v=>v.patientId===patient.id).sort((a,b)=>(b.date+'T'+b.time).localeCompare(a.date+'T'+a.time))[0];
          if(visit){
            visit.status=patient.status;
            visit.department=patient.dept;
            visit.doctor=patient.doctor;
          }
        }
      }
    }
    if(key==='beds') syncBeds(d,old);
  })];
}

export function syncBeds(d,old){
  for(const bed of d.beds){
    const previous=old.find(x=>x.id===bed.id);
    if(bed.patient&&previous?.patient!==bed.patient){
      const existing=d.admissions.find(a=>a.patientId===bed.patient&&a.status==='Đang điều trị');
      if(existing){
        bed.admissionId=existing.id;
        existing.bedHistory.filter(x=>!x.to).forEach(x=>x.to=new Date().toISOString());
        existing.bedHistory.push({bedId:bed.id,from:new Date().toISOString(),to:null});
      }else{
        const p=d.patients.find(x=>x.id===bed.patient);
        const admission={
          id:id('DTNT'),
          patientId:bed.patient,
          visitId:d.visits.find(v=>v.patientId===bed.patient)?.id,
          date:today,
          time:'09:00',
          department:p?.dept||'Nội tổng quát',
          doctor:p?.doctor||'',
          status:'Đang điều trị',
          bedHistory:[{bedId:bed.id,from:new Date().toISOString(),to:null}],
          createdAt:new Date().toISOString()
        };
        d.admissions.unshift(admission);
        bed.admissionId=admission.id;
      }
    }
    if(!bed.patient&&previous?.patient){
      const a=d.admissions.find(x=>x.id===previous.admissionId);
      if(a&&!d.beds.some(b=>b.patient===previous.patient)){
        a.status='Đã ra viện';
        a.dischargedAt=new Date().toISOString();
        a.bedHistory.filter(x=>!x.to).forEach(x=>x.to=a.dischargedAt);
      }
      delete bed.admissionId;
    }
  }
}

export function episodeOptions(data,patientId){
  return [
    ...data.visits.filter(v=>v.patientId===patientId).map(v=>({...v,label:`${v.id} · ${v.date} ${v.time} · ${v.department} · Ngoại trú`})),
    ...data.admissions.filter(a=>a.patientId===patientId).map(a=>({...a,label:`${a.id} · ${a.date} · ${a.department} · Nội trú`}))
  ].sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
}

export function syncLatestPatient(d,patientId){
  const p=d.patients.find(x=>x.id===patientId);
  const latest=d.visits.filter(v=>v.patientId===patientId).sort((a,b)=>(b.date+'T'+b.time+b.createdAt).localeCompare(a.date+'T'+a.time+a.createdAt)||(Number(b.queueNumber)||0)-(Number(a.queueNumber)||0))[0];
  if(p&&latest){
    Object.assign(p,{dept:latest.department,doctor:latest.doctor,time:latest.time,status:latest.status});
    if(latest.note&&latest.locked) d.notes[patientId]=latest.note;else delete d.notes[patientId];
  }
}

export async function createVisit(values){
  if(!getWorkspace().patients.some(p=>p.id===values.patientId))throw new Error('Không tìm thấy bệnh nhân.');
  const result=await hisApi.createVisit({patientId:values.patientId,dept:values.department||values.dept||'Nội tổng quát',reason:values.reason||'Khám bệnh'});
  await syncWithSqlServer();
  return getWorkspace().visits.find(v=>v.id===result.visitId)||result;
}

export async function saveVisitNote(visitId,note){
  const current=getWorkspace().visits.find(v=>v.id===visitId);
  if(!current)throw new Error('Không tìm thấy lượt khám.');
  if(current.locked||current.status==='Đã hủy')throw new Error('Phiếu khám đã khóa hoặc đã hủy.');
  const saved=await hisApi.saveExamNote({visitId,note:{...current.note,...note},revision:current.revision||0,doctorStaffId:current.doctorStaffId,lock:true});
  transact(d=>{const index=d.visits.findIndex(v=>v.id===saved.id);if(index>=0)d.visits[index]={...d.visits[index],...saved};syncLatestPatient(d,current.patientId);});
  return saved;
}

export function audit(d,event,actor='Phiên làm việc'){
  d.business.audit=[{id:id('LOG'),time:new Date().toLocaleString('vi-VN'),actor,event},...(d.business.audit||[])].slice(0,300);
}

export function financialRows(db){
  return [
    ...db.settlements.filter(x=>['Đã thanh toán','Đã hoàn tiền'].includes(x.status)).map(x=>({
      id:x.id,date:x.settledDate||x.date,patient:x.patient,signed:(x.received||0)-(x.refund||0),kind:x.balance<0?'Hoàn quyết toán':'Thu quyết toán'
    })),
    ...db.advances.filter(x=>x.status==='Đã xác nhận').map(x=>({
      id:x.id,date:x.confirmedDate||x.date,patient:x.patient,signed:(x.kind==='Hoàn tiền'?-1:1)*Number(x.amount),kind:x.kind
    }))
  ];
}

export function planFEFO(inventory,requests,warehouseId,asOf=today){
  if(!warehouseId) throw new Error('Chọn kho xuất trước khi xác nhận.');
  const pool=copy(inventory),allocations=[];
  for(const request of requests){
    let remaining=Number(request.quantity);
    if(!Number.isInteger(remaining)||remaining<1) throw new Error('Số lượng xuất phải là số nguyên dương.');
    const available=pool.filter(l=>l.medicineId===request.medicine&&l.warehouseId===warehouseId&&!l.locked&&l.expiry>=asOf&&l.qty>0).sort((a,b)=>a.expiry.localeCompare(b.expiry)||(a.receivedAt||'').localeCompare(b.receivedAt||'')||a.id.localeCompare(b.id));
    for(const lot of available){
      const quantity=Math.min(remaining,lot.qty);
      if(quantity){
        allocations.push({lotId:lot.id,medicineId:lot.medicineId,warehouseId,lot:lot.lot,expiry:lot.expiry,quantity});
        remaining-=quantity;
        lot.qty-=quantity;
      }
      if(!remaining) break;
    }
    if(remaining) throw new Error('Không đủ tồn còn hạn trong kho đã chọn cho '+request.medicine+'. Còn thiếu '+remaining+'.');
  }
  return allocations;
}

function consume(d,allocations,event){
  for(const a of allocations){
    const lot=d.inventory.find(l=>l.id===a.lotId);
    if(!lot||lot.qty<a.quantity) throw new Error('Tồn kho đã thay đổi. Vui lòng kiểm tra lại.');
    lot.qty-=a.quantity;
    d.ledger.unshift({id:id('NK'),date:today,time:new Date().toISOString(),medicineId:a.medicineId,warehouseId:a.warehouseId,lot:a.lot,delta:-a.quantity,event});
  }
}

export function applyClinicalStock(tab,rowId,warehouse,actor,details={}){
  transact(d=>{
    const row=d.business[tab].find(x=>x.id===rowId);
    if(!row) throw new Error('Chứng từ không tồn tại.');
    const dispensing=tab==='prescriptions';
    if(dispensing ? !['Đã xác nhận','Chờ cấp phát'].includes(row.status) : row.status!=='Chờ thực hiện') throw new Error('Chứng từ đã được xử lý hoặc trạng thái đã thay đổi.');
    const requests=dispensing?row.lines:row.kind==='Dùng thuốc'?[{medicine:row.medicine,quantity:row.quantity}]:[];
    const allocations=requests.length?planFEFO(d.inventory,requests,warehouse):[];
    consume(d,allocations,row.id);
    Object.assign(row,details,{status:dispensing?'Đã cấp phát':'Đã thực hiện',allocations,warehouse,stockRecorded:allocations.length>0,reviewer:actor,updatedAt:new Date().toISOString()});
    audit(d,(dispensing?'Cấp phát thuốc ':'Thực hiện y lệnh ')+row.id,actor);
  });
}

export function approveInventoryRow(tab,rowId,actor){
  transact(d=>{
    const row=d.business[tab].find(x=>x.id===rowId);
    if(!row||!['Chờ duyệt','Chờ phê duyệt'].includes(row.status)) throw new Error('Chứng từ đã được xử lý.');
    if(tab==='counts'){
      const lot=d.inventory.find(l=>l.id===row.lotId&&l.warehouseId===row.warehouse&&l.medicineId===row.medicine);
      if(!lot) throw new Error('Không tìm thấy lô trong kho đã chọn.');
      if(lot.qty!==row.expected) throw new Error('Tồn lô đã thay đổi sau kiểm kê. Sửa biên bản để lấy số liệu mới.');
      const delta=Number(row.actual)-lot.qty;
      lot.qty=Number(row.actual);
      d.ledger.unshift({id:id('NK'),date:today,time:new Date().toISOString(),medicineId:lot.medicineId,warehouseId:lot.warehouseId,lot:lot.lot,delta,event:row.id});
      row.status='Đã điều chỉnh';
    }else{
      const quantity=Number(row.quantity);
      if(!Number.isInteger(quantity)||quantity<1) throw new Error('Số lượng phải là số nguyên dương.');
      if(['Xuất kho','Điều chuyển'].includes(row.kind)){
        if(row.kind==='Điều chuyển'&&(!row.destination||row.destination===row.warehouse)) throw new Error('Chọn kho đích khác kho nguồn.');
        row.allocations=planFEFO(d.inventory,[{medicine:row.medicine,quantity}],row.warehouse);
        consume(d,row.allocations,row.id);
        if(row.kind==='Điều chuyển') for(const a of row.allocations) addLot(d,{medicineId:row.medicine,warehouseId:row.destination,lot:a.lot,expiry:a.expiry,qty:a.quantity},row.id);
      }else{
        if(!row.lot||!row.expiry) throw new Error('Phiếu nhập / hoàn trả cần số lô và hạn dùng.');
        if(row.expiry<today) throw new Error('Không nhập lô đã hết hạn vào tồn khả dụng.');
        addLot(d,{medicineId:row.medicine,warehouseId:row.warehouse,lot:row.lot,expiry:row.expiry,qty:quantity},row.id);
      }
      row.status='Đã ghi sổ';
    }
    row.reviewer=actor;
    row.updatedAt=new Date().toISOString();
    audit(d,'Duyệt '+row.id,actor);
  });
}

export function addLot(d,lot,event){
  let existing=d.inventory.find(x=>x.medicineId===lot.medicineId&&x.warehouseId===lot.warehouseId&&x.lot===lot.lot);
  if(existing&&existing.expiry!==lot.expiry) throw new Error('Cùng mã hàng và số lô phải có cùng hạn dùng.');
  if(existing) existing.qty+=Number(lot.qty);
  else d.inventory.push({...lot,qty:Number(lot.qty),id:id('LOT'),receivedAt:today});
  d.ledger.unshift({id:id('NK'),date:today,time:new Date().toISOString(),medicineId:lot.medicineId,warehouseId:lot.warehouseId,lot:lot.lot,delta:Number(lot.qty),event});
}

export function dischargeAdmission(admissionId,actor,dischargeId){
  transact(d=>{
    const admission=d.admissions.find(a=>a.id===admissionId);
    if(!admission||admission.status!=='Đang điều trị') throw new Error('Đợt điều trị không còn hoạt động.');
    if(d.business.rounds.some(r=>r.episodeId===admissionId&&r.status==='Chờ thực hiện')) throw new Error('Đợt điều trị còn y lệnh chưa thực hiện. Hãy hoàn tất hoặc hủy trước khi ra viện.');
    admission.status='Đã ra viện';
    admission.dischargedAt=new Date().toISOString();
    admission.bedHistory.filter(h=>!h.to).forEach(h=>h.to=admission.dischargedAt);
    for(const bed of d.beds.filter(b=>b.admissionId===admissionId)){
      bed.patient=null;
      bed.cleaning=true;
      delete bed.admissionId;
    }
    if(dischargeId){
      const row=d.business.discharges.find(r=>r.id===dischargeId);
      if(row){
        row.status='Đã ra viện';
        row.reviewer=actor;
        admission.summary=row.summary;
      }
    }
    audit(d,'Hoàn tất đợt nội trú '+admissionId,actor);
  });

  // Call SQL Server API
  hisApi.dischargeInpatient({admissionId}).catch(err=>console.warn('SQL discharge notice:', err));
}
