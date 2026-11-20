import React,{useState} from 'react';
import {Plus,ShieldCheck,ArrowRight,HeartPulse} from 'lucide-react';
import './auth.css';
import {actorRoles,actorIds} from './roles';
export default function Auth({onLogin,initialRole='admin'}){
 const [role,setRole]=useState(initialRole);
 const actor=actorRoles[role];
 return <div className="auth-page">
  <section className="auth-story">
   <a className="brand" href="#"><span className="brand-mark"><Plus size={28} strokeWidth={4}/></span><span>MediCare<small>HOSPITAL MANAGEMENT</small></span></a>
   <div className="auth-story-content"><span className="auth-eyebrow">KHÔNG GIAN LÀM VIỆC SỐ</span><h1>Mỗi kết nối tốt hơn.<br/>Một hành trình<br/>chăm sóc trọn vẹn.</h1><p>Nền tảng kết nối tiếp đón, khám chữa bệnh và quản trị bệnh viện trong cùng một không gian.</p><div className="auth-illustration"><div className="auth-orbit"/><HeartPulse size={84} strokeWidth={1}/><div className="auth-pill"><ShieldCheck size={18}/><span>Đồng hành cùng đội ngũ y tế</span></div></div></div>
   <small>Đồ án phân tích thiết kế hệ thống quản lý bệnh viện · Lab 9</small>
  </section>
  <section className="auth-main"><div className="auth-form">
   <span className="auth-tag">MEDICARE WORKSPACE</span><h2>Chào mừng trở lại</h2><p>Chọn vai trò rồi đăng nhập ngay, không cần tài khoản hay mật khẩu.</p>
   <p className="auth-role-label">Bạn muốn vào với vai trò nào?</p>
   <div className="auth-role-tabs">{actorIds.map(id=><button type="button" key={id} aria-pressed={id===role} className={id===role?'selected':''} onClick={()=>setRole(id)}>{actorRoles[id].name}</button>)}</div>
   <div className="demo-account"><b>{actor.name}</b><p style={{fontFamily:'inherit'}}>{actor.person}</p><small>{actor.description}</small></div>
   <button className="primary full" style={{marginTop:22}} onClick={()=>onLogin(role)}>Đăng nhập <ArrowRight size={17}/></button>
   <div className="auth-footer"><ShieldCheck size={15}/>Phiên trải nghiệm · Dữ liệu mẫu trên trình duyệt</div>
  </div></section>
 </div>;
}