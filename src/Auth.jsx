import React,{useEffect,useState} from 'react';
import {Plus,ShieldCheck,ArrowRight,HeartPulse} from 'lucide-react';
import './auth.css';
import {actorRoles,actorIds} from './roles';

export default function Auth({onLogin,initialRole='admin',externalError='',onRegister}){
 const [error,setError]=useState(''),[saving,setSaving]=useState(false),[registering,setRegistering]=useState(false),[registered,setRegistered]=useState(false);
 const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[qaAccounts,setQaAccounts]=useState([]);

 useEffect(()=>{

  let active=true;

  fetch('/__qa/login-accounts',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
    if(active){
      if(Array.isArray(data?.accounts)&&data.accounts.length){
        setQaAccounts(data.accounts);
      } else {
        setQaAccounts([]);
      }
    }
  }).catch(()=>{
    if(active)setQaAccounts([]);
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
   {registering?<PatientRegistration onRegister={onRegister} onBack={()=>setRegistering(false)} onDone={name=>{setUsername(name);setPassword('');setRegistered(true);setRegistering(false);setError('')}}/>:<>
   <span className="auth-tag">MEDICARE WORKSPACE</span><h2>Chào mừng trở lại</h2><p>Bệnh nhân có thể tự đăng ký. Tài khoản nhân viên do quản trị viên cấp.</p>
   {registered&&<p className="auth-success" role="status">Đăng ký thành công. Bạn có thể đăng nhập bằng tài khoản vừa tạo.</p>}
   <form onSubmit={async e=>{e.preventDefault();if(saving)return;const values=Object.fromEntries(new FormData(e.currentTarget));setSaving(true);setError('');try{await onLogin(values)}catch(e){setError(e.message)}finally{setSaving(false)}}}>
   <label>Tên đăng nhập<input name="username" autoComplete="username" required maxLength={50} value={username} onChange={e=>setUsername(e.target.value)} placeholder="admin, tieptan, bacsi..."/></label>
   <label>Mật khẩu<input name="password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder="123"/></label>
   {(error||externalError)&&<p role="alert" className="form-error">{error||externalError}</p>}
   <button className="primary full" disabled={saving} style={{marginTop:22}}>{saving?'Đang đăng nhập…':'Đăng nhập'} <ArrowRight size={17}/></button></form>
   {onRegister&&<button type="button" className="secondary full auth-register-link" disabled={saving} onClick={()=>{setRegistering(true);setRegistered(false);setError('')}}>Chưa có tài khoản? Đăng ký bệnh nhân</button>}
   <div className="auth-footer"><ShieldCheck size={15}/>Phiên đăng nhập được kiểm tra tại máy chủ</div>
   {!!qaAccounts.length&&<QaAccountList accounts={qaAccounts} disabled={saving} onSelect={a=>{setUsername(a.username);setPassword(a.password);setError('')}}/>}
   </>}
  </div></section>
 </div>;
}

export function QaAccountList({accounts,onSelect,disabled=false}){
 const names={'Quản trị viên':'Nguyễn Hoàng Anh','Tiếp tân':'Nguyễn Thu Trang','Bác sĩ':'Trần Minh Anh','Điều dưỡng':'Hoàng Thị Lan','Kỹ thuật viên CLS':'Đỗ Văn Tuấn','Dược sĩ':'Vũ Đức Thắng','Thu ngân':'Đặng Thu Thảo','Bệnh nhân':'Lê Thị Thu Hương'};
 return <section className="qa-login-accounts" aria-label="Tài khoản theo vai trò"><h3>Chọn tài khoản đăng nhập</h3><p>Tài khoản minh họa · Chọn người dùng để tự điền thông tin đăng nhập.</p>{accounts.map(a=><button type="button" key={a.username} disabled={disabled} onClick={()=>onSelect(a)}><strong>{names[a.label]||a.label} · {a.label}</strong><span>{a.username}</span><code>{a.password}</code><small>Điền vào biểu mẫu →</small></button>)}</section>;
}

function PatientRegistration({onRegister,onBack,onDone}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <><span className="auth-tag">MEDICARE</span><h2>Đăng ký bệnh nhân</h2><p>Tạo tài khoản để đặt lịch và theo dõi hồ sơ của bạn. Hồ sơ khám cũ cần được cơ sở xác minh trước khi liên kết.</p><form onSubmit={async e=>{e.preventDefault();if(busy)return;const values=Object.fromEntries(new FormData(e.currentTarget));if(values.password!==values.confirmPassword){setError('Mật khẩu xác nhận chưa khớp.');return;}setBusy(true);setError('');try{await onRegister(values);onDone(values.username.trim().toLowerCase());}catch(e){setError(e.message);}finally{setBusy(false);}}}>
 <label>Họ và tên<input name="name" autoComplete="name" required maxLength={100}/></label>
 <div className="auth-registration-row"><label>Ngày sinh<input name="birth" type="date" required max={new Date().toISOString().slice(0,10)}/></label><label>Giới tính<select name="gender" required><option value="">Chọn giới tính</option><option>Nam</option><option>Nữ</option><option>Khác</option></select></label></div>
 <label>Số điện thoại<input name="phone" type="tel" autoComplete="tel" pattern="0[0-9]{9}" maxLength={10} title="10 chữ số, bắt đầu bằng 0" required/></label>
 <label>Email<input name="email" type="email" autoComplete="email" required maxLength={100}/></label>
 <label>Tên đăng nhập<input name="username" autoComplete="username" pattern="[a-zA-Z0-9._-]{3,50}" minLength={3} maxLength={50} title="3–50 chữ không dấu, số hoặc . _ -" required/></label>
 <label>Mật khẩu<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/><small>Từ 12 đến 128 ký tự.</small></label>
 <label>Nhập lại mật khẩu<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label>
 {error&&<p role="alert" className="form-error">{error}</p>}<button className="primary full" disabled={busy}>{busy?'Đang đăng ký…':'Tạo tài khoản bệnh nhân'}</button><button type="button" className="secondary full" disabled={busy} onClick={onBack}>Quay lại đăng nhập</button></form></>;
}
