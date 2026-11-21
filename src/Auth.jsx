import React,{useEffect,useState} from 'react';
import {Plus,ShieldCheck,ArrowRight,HeartPulse} from 'lucide-react';
import './auth.css';
import {actorRoles,actorIds} from './roles';

export default function Auth({onLogin,initialRole='admin',externalError=''}){
 const [error,setError]=useState(''),[saving,setSaving]=useState(false);
 const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[qaAccounts,setQaAccounts]=useState([]);

 useEffect(()=>{
  if(location.hostname!=='127.0.0.1'&&location.hostname!=='localhost')return;
  let active=true;
  const defaultAccounts=[
    { label: 'Quản trị viên (Admin)', username: 'admin', password: 'Admin@12345678' },
    { label: 'Bác sĩ khám (Doctor)', username: 'doctor_noitongquat', password: 'Doctor@12345678' },
    { label: 'Điều dưỡng (Nurse)', username: 'nurse_noitongquat', password: 'Nurse@12345678' },
    { label: 'Dược sĩ (Pharmacist)', username: 'pharmacist_main', password: 'Pharmacist@12345678' }
  ];
  fetch('/__qa/login-accounts',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
    if(active){
      if(Array.isArray(data?.accounts)&&data.accounts.length){
        setQaAccounts(data.accounts);
      } else {
        setQaAccounts(defaultAccounts);
      }
    }
  }).catch(()=>{
    if(active)setQaAccounts(defaultAccounts);
  });
  return()=>{active=false};
 },[]);

 const [role,setRole]=useState(initialRole);
 const actor=actorRoles[role];
 return <div className="auth-page">
  <section className="auth-story">
   <a className="brand" href="#"><span className="brand-mark"><Plus size={28} strokeWidth={4}/></span><span>MediCare<small>HOSPITAL MANAGEMENT</small></span></a>
   <div className="auth-story-content"><span className="auth-eyebrow">KHÔNG GIAN LÀM VIỆC SỐ</span><h1>Mỗi kết nối tốt hơn.<br/>Một hành trình<br/>chăm sóc trọn vẹn.</h1><p>Nền tảng kết nối tiếp đón, khám chữa bệnh và quản trị bệnh viện trong cùng một không gian.</p><div className="auth-illustration"><div className="auth-orbit"/><HeartPulse size={84} strokeWidth={1}/><div className="auth-pill"><ShieldCheck size={18}/><span>Đồng hành cùng đội ngũ y tế</span></div></div></div>
   <small>Đồ án phân tích thiết kế hệ thống quản lý bệnh viện · Lab 9</small>
  </section>
  <section className="auth-main"><div className="auth-form">
   <span className="auth-tag">MEDICARE WORKSPACE</span><h2>Chào mừng trở lại</h2><p>Đăng nhập bằng tài khoản do quản trị viên cấp. Vai trò được xác định từ tài khoản.</p>
   <form onSubmit={async e=>{e.preventDefault();if(saving)return;const values=Object.fromEntries(new FormData(e.currentTarget));setSaving(true);setError('');try{await onLogin(values)}catch(e){setError(e.message)}finally{setSaving(false)}}}>
   <label>Tên đăng nhập<input name="username" autoComplete="username" required maxLength={50} value={username} onChange={e=>setUsername(e.target.value)}/></label>
   <label>Mật khẩu<input name="password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   {(error||externalError)&&<p role="alert" className="form-error">{error||externalError}</p>}
   <button className="primary full" disabled={saving} style={{marginTop:22}}>{saving?'Đang đăng nhập…':'Đăng nhập'} <ArrowRight size={17}/></button></form>
   <div className="auth-footer"><ShieldCheck size={15}/>Phiên đăng nhập được kiểm tra tại máy chủ</div>
   {!!qaAccounts.length&&<QaAccountList accounts={qaAccounts} disabled={saving} onSelect={a=>{setUsername(a.username);setPassword(a.password);setError('')}}/>}
  </div></section>
 </div>;
}

export function QaAccountList({accounts,onSelect,disabled=false}){
 return <section className="qa-login-accounts" aria-label="Tài khoản tám tác nhân QA"><h3>Tài khoản từng tác nhân</h3><p>Bản QA · Chọn tác nhân để điền tên đăng nhập và mật khẩu.</p>{accounts.map(a=><button type="button" key={a.username} disabled={disabled} onClick={()=>onSelect(a)}><strong>{a.label}</strong><span>{a.username}</span><code>{a.password}</code><small>Điền vào biểu mẫu →</small></button>)}</section>;
}
