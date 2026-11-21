import React,{useState} from 'react';
import {hisApi} from './api';
import {clinics,today} from './business-data';
import {syncWithSqlServer,useWorkspace} from './workspace';

export default function ReceptionForm({mode='register',patient,onDone}){
 const [patients]=useWorkspace('patients'),[visits]=useWorkspace('visits');
 const [selected,setSelected]=useState(patient?.id||''),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const person=mode==='register'?patients.find(p=>p.id===selected):patient;
 const ownVisits=visits.filter(v=>v.patientId===person?.id&&!v.locked&&!['Đã hủy','Hoàn tất'].includes(v.status)).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
 async function submit(e){
  e.preventDefault();if(saving)return;
  const data=Object.fromEntries(new FormData(e.currentTarget));setError('');setSaving(true);
  try{
   let result,message;
   if(mode==='route'){
    result=await hisApi.changeVisit(data);message=data.action==='cancel'?'Đã hủy lượt khám':'Đã điều chuyển lượt khám';
   }else if(mode==='edit'){
    result=await hisApi.updatePatient({...data,id:patient.id});message='Đã lưu thông tin bệnh nhân';
   }else{
    result=await hisApi.createVisit({...data,patientId:selected||undefined});message='Đã tiếp đón! STT '+result.queueNumber+' tại '+result.roomName;
   }
   await syncWithSqlServer();onDone(message,result);
  }catch(e){setError(e.message);}finally{setSaving(false);}
 }
 return <><h2>{mode==='route'?'Điều chuyển / hủy lượt khám':mode==='edit'?'Cập nhật bệnh nhân':'Tiếp đón bệnh nhân'}</h2>
 <p>{mode==='register'?'Chọn hồ sơ đã có hoặc nhập người bệnh mới để đăng ký khám.':person?.name+' · '+person?.id}</p>
 {mode==='register'&&<label>Hồ sơ người bệnh<select aria-label="Chọn hồ sơ tiếp đón" value={selected} onChange={e=>{setSelected(e.target.value);setError('')}} disabled={saving}><option value="">Tạo hồ sơ mới</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}</select></label>}
 <form key={selected||'new'} onSubmit={submit}>
 {mode==='route'?<>
  <label>Lượt khám<select name="visitId" required>{ownVisits.map(v=><option key={v.id} value={v.id}>{v.id} · {v.date} · {v.department}</option>)}</select></label>
  <label>Thao tác<select name="action"><option value="transfer">Điều chuyển chuyên khoa</option><option value="cancel">Hủy lượt khám</option></select></label>
  <label>Chuyên khoa<select name="dept" defaultValue={person?.dept}>{clinics.map(d=><option key={d}>{d}</option>)}</select></label>
  <label>Lý do<textarea name="reason" required maxLength={500}/></label>
  {!ownVisits.length&&<p role="alert">Không có lượt khám đang mở để thay đổi.</p>}
 </>:<>
  <label>Họ và tên<input name="name" required maxLength={100} defaultValue={person?.name} readOnly={mode==='register'&&!!selected}/></label>
  <div className="form-row"><label>Ngày sinh<input name="birth" type="date" required={mode==='edit'||!selected} max={today} defaultValue={person?.birth} readOnly={mode==='register'&&!!selected}/></label><label>Giới tính<select name="gender" defaultValue={person?.gender||'Nam'} disabled={mode==='register'&&!!selected}><option>Nam</option><option>Nữ</option><option>Khác</option></select></label></div>
  <div className="form-row"><label>Số điện thoại<input name="phone" type="tel" pattern={mode==='register'&&selected?undefined:'[0-9]{10,11}'} required={mode==='edit'||!selected} defaultValue={person?.phone} readOnly={mode==='register'&&!!selected}/></label><label>Số CCCD / VNeID<input name="cccd" pattern={mode==='register'&&selected?undefined:'[0-9]{12}'} maxLength={12} defaultValue={person?.cccd} readOnly={mode==='register'&&!!selected}/></label></div>
  <label>Số thẻ BHYT<input name="insurance" maxLength={15} defaultValue={person?.insurance} readOnly={mode==='register'&&!!selected}/></label>
  <label>Địa chỉ<input name="address" maxLength={255} defaultValue={person?.address} readOnly={mode==='register'&&!!selected}/></label>
  {mode==='register'&&<><label>Chuyên khoa<select name="dept" defaultValue={person?.dept}>{clinics.map(d=><option key={d}>{d}</option>)}</select></label><label>Lý do khám<textarea name="reason" maxLength={255} defaultValue="Tiếp đón khám mới"/></label></>}
 </>}
 {error&&<p className="form-error" role="alert">{error}</p>}
 <button type="submit" className="primary full" disabled={saving||mode==='route'&&!ownVisits.length}>{saving?'Đang lưu…':mode==='register'?'Đăng ký khám & cấp số thứ tự':mode==='edit'?'Lưu thông tin':'Xác nhận thay đổi'}</button>
 </form></>;
}
