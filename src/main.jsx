import WorkspaceSession from './WorkspaceSession';
import NursingBed from './NursingBed';
import ReceptionForm from './ReceptionForm';
import React, {useState,useEffect,lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {Activity, LayoutDashboard, Users, Stethoscope, BedDouble, Pill, Wallet, CalendarDays, Search, Plus, ArrowUpRight, ArrowRight, Bell, X, ChevronLeft, ChevronRight, Check, Clock3, MoreHorizontal, Download, Menu, HeartPulse, FileText, ShieldCheck, LogOut, Building2} from 'lucide-react';
import './styles.css';
import Business from './Business';
import Auth from './Auth';
import Appointments from './Appointments';
import './polish.css';
import './sidebar.css';
import {extraTitles,today} from './business-data';
import ActorHome,{ActorPicker} from './Actors';
import {actorRoles} from './roles';
import './motion.css';
import Profile,{AccountMenu,ProfileAvatar,useProfile} from './Profile';
import Notifications from './Notifications';
import InpatientAdmissionModal from './InpatientAdmissionModal';
import InpatientBedMap from './InpatientBedMap';
import './inpatient-bedmap.css';
import ClinicalDesk from './ClinicalDesk';
import LabDesk from './LabDesk';
import Home from './Home';
import SecureAdmin from './SecureAdmin';

import {departments} from './fixtures';
import {useWorkspace,dischargeAdmission} from './workspace';
import History,{VisitExam,PatientHistory} from './History';
import {WorkspaceBootstrap,AppBoundary,ScreenSkeleton} from './Experience';
const Dashboard=lazy(()=>import('./Dashboard'));
const Inventory=lazy(()=>import('./Inventory'));
const nav=[['TỔNG QUAN',[['overview','Tổng quan',LayoutDashboard],['appointments','Lịch hẹn',CalendarDays]]],['KHÁM & ĐIỀU TRỊ',[['patients','Tiếp đón & bệnh nhân',Users],['history','Lịch sử khám & điều trị',FileText],['examination','Khám bệnh',Stethoscope],['clinical',extraTitles.clinical,Activity],['inpatient','Buồng giường nội trú',BedDouble],['care',extraTitles.care,HeartPulse]]],['DƯỢC & TÀI CHÍNH',[['pharmacy','Dược & vật tư',Pill],['warehouse',extraTitles.warehouse,Building2],['finance',extraTitles.finance,Wallet]]],['HỒ SƠ & QUẢN TRỊ',[['archive',extraTitles.archive,FileText],['devices',extraTitles.devices,Activity],['admin',extraTitles.admin,ShieldCheck],['portal',extraTitles.portal,Users]]]];
const titles=Object.fromEntries(nav.flatMap(([,items])=>items.map(([key,title])=>[key,title])));
titles.profile='Thông tin cá nhân';
function useStored(key,initial){const [value,setValue]=useState(()=>{try{return JSON.parse(localStorage.getItem(key))??initial}catch{return initial}});return [value,next=>setValue(old=>{const updated=typeof next==='function'?next(old):next;localStorage.setItem(key,JSON.stringify(updated));return updated})]}
const initials=name=>name.split(' ').slice(-2).map(v=>v[0]).join('');
function Badge({children}){return <span className={'badge '+({'Chờ khám':'amber','Đang khám':'teal','Chờ kết quả':'violet','Hoàn tất':'gray','Đã thanh toán':'teal','Chờ thanh toán':'amber'}[children]||'gray')}>{children}</span>}
function DischargeConfirmation({bed,actor,onClose,notify}){const [error,setError]=useState('');return <><h2>Xác nhận ra viện</h2><p className="confirm-warning">Hoàn tất đợt điều trị, kết thúc lịch sử sử dụng giường và chuyển giường sang chờ khử khuẩn. Thông tin điều trị vẫn được giữ để tra cứu.</p>{error&&<p role="alert" className="form-error">{error}</p>}<button className="primary full" onClick={()=>{try{dischargeAdmission(bed.admissionId,actor);onClose();notify('Đã hoàn tất đợt điều trị và giải phóng giường')}catch(e){setError(e.message)}}}>Xác nhận hoàn tất ra viện</button></>}
function App({session,onLogout,initialPage}){
 const [role]=useState(session.role);
 const actor=actorRoles[role];
 const defaultPageForRole = initialPage && initialPage !== 'overview' ? initialPage : (actor?.defaultPage || 'overview');
 const personalProfile=useProfile(role);
 const [requestedTab,setRequestedTab]=useState('');
 const [activeOperation,setActiveOperation]=useState('');
 const [clinicalContext,setClinicalContext]=useState(null);
 const [selectedDate,setSelectedDate]=useState(today);
 const [collapsed,setCollapsed]=useStored('medicare-sidebar-collapsed',false);
 const [sidebar,setSidebar]=useState(false);
 const [appointmentRequest,setAppointmentRequest]=useState(0);
 const [page,setPage]=useState(defaultPageForRole),[patients,setPatients]=useWorkspace('patients'),[stock,setStock]=useWorkspace('stock'),[beds,setBeds]=useWorkspace('beds'),[notes]=useWorkspace('notes'),[appointments,setAppointments]=useWorkspace('appointments');
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('Tất cả'),[dept,setDept]=useState('Tất cả chuyên khoa'),[modal,setModal]=useState(null),[toast,setToast]=useState(''),[offset,setOffset]=useState(0);

 useEffect(()=>{
   fetch('/api/inpatient/beds')
     .then(r=>r.ok?r.json():[])
     .then(data=>{
       if(Array.isArray(data)&&data.length){
         setBeds(data.map(b=>({
           id:b.id,
           bedNumber:b.bedNumber,
           roomName:b.roomName,
           patient:b.patientId,
           patientName:b.patientName,
           admissionId:b.admissionId,
           cleaning:b.statusRaw==='DANG_VE_SINH',
           status:b.status,
           dailyRate:b.dailyRate
         })));
       }
     })
     .catch(()=>{});
 },[page]);
 const notify=text=>{setToast(text);setTimeout(()=>setToast(''),3500)};
 function navigate(key,tab='',context=null){if(key!=='profile'&&!actor.pages.includes(key))return;setClinicalContext(context);setActiveOperation('');setRequestedTab(tab);setPage(key);setAppointmentRequest(0);setQuery('');setFilter('Tất cả');setDept('Tất cả chuyên khoa');setOffset(0);setSidebar(false);}
 const visibleNav=nav.map(([label,items])=>[label,items.filter(([key])=>actor.pages.includes(key))]).filter(([,items])=>items.length);
 const filtered=patients.filter(p=>role!=='doctor'||p.doctor.includes(actor.person)).filter(p=>(p.name+' '+p.id+' '+p.phone).toLowerCase().includes(query.toLowerCase())&&(filter==='Tất cả'?p.status!=='Đã hủy':p.status===filter)&&(dept==='Tất cả chuyên khoa'||p.dept===dept));
 function updatePatient(id,status){setPatients(list=>list.map(p=>p.id===id?{...p,status}:p));notify('Đã cập nhật trạng thái bệnh nhân')}
 function exportData(){const csv='\uFEFF'+[['Mã bệnh nhân','Họ tên','Giới tính','Ngày sinh','Chuyên khoa','Trạng thái'],...filtered.map(p=>[p.id,p.name,p.gender,p.birth,p.dept,p.status])].map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='danh-sach-benh-nhan.csv';a.click();URL.revokeObjectURL(a.href)}
 const patientTable=(compact=false)=><><div className="table-scroll"><table><thead><tr><th>BỆNH NHÂN</th><th>CHUYÊN KHOA</th><th>BÁC SĨ PHỤ TRÁCH</th><th>GIỜ KHÁM</th><th>TRẠNG THÁI</th><th></th></tr></thead><tbody>{filtered.slice(offset,offset+(compact?5:8)).map(p=><tr key={p.id}><td><button className="patient-cell" onClick={()=>setModal({type:'detail',patient:p})}><span className={'avatar '+p.color}>{initials(p.name)}</span><span><b>{p.name}</b><small>{p.id} <span>•</span> {p.gender}, {new Date().getFullYear()-Number(p.birth.slice(0,4))} tuổi</small></span></button></td><td>{p.dept}</td><td>{p.doctor}</td><td><span className="time"><Clock3 size={13}/>{p.time}</span></td><td><Badge>{p.status}</Badge></td><td><button className="icon-button" aria-label={'Xem '+p.name} onClick={()=>setModal({type:page==='examination'?'exam':'detail',patient:p})}><MoreHorizontal size={19}/></button></td></tr>)}</tbody></table>{!filtered.length&&<div className="empty">Không tìm thấy bệnh nhân phù hợp.</div>}</div><div className="table-footer"><span>Hiển thị {filtered.length?offset+1:0}–{Math.min(offset+(compact?5:8),filtered.length)} trong {filtered.length} bệnh nhân</span><div>{compact?<button className="text-button" onClick={()=>navigate('patients')}>Xem tất cả bệnh nhân <ArrowRight size={14}/></button>:<><button className="icon-button" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-8))} aria-label="Trang trước"><ChevronLeft size={16}/></button><button className="page-number">{Math.floor(offset/8)+1}</button><button className="icon-button" disabled={offset+8>=filtered.length} onClick={()=>setOffset(offset+8)} aria-label="Trang sau"><ChevronRight size={16}/></button></>}</div></div></>;
 return <div className={collapsed?'app sidebar-collapsed':'app'}>{sidebar&&<button className="sidebar-backdrop" aria-label="Đóng menu" onClick={()=>setSidebar(false)}/>}<aside id="main-sidebar" className={sidebar?'sidebar open':'sidebar'}><a href="#" className="brand" onClick={e=>{e.preventDefault();navigate(actor?.defaultPage||'overview')}}><span className="brand-mark"><Plus size={27} strokeWidth={4}/></span><span>MediCare<small>HOSPITAL MANAGEMENT</small></span></a><div className="hospital"><Building2 size={19}/><div><b>Bệnh viện Đa khoa</b><small>Hệ thống quản lý bệnh viện</small></div><ShieldCheck size={15}/></div><nav>{visibleNav.map(([label,items])=><div className="nav-group" key={label}><p>{label}</p>{items.map(([key,title,Icon])=><button key={key} aria-label={title} title={title} className={page===key?'nav-item active':'nav-item'} onClick={()=>navigate(key)}><Icon size={19}/><span>{title}</span>{key==='appointments'&&<em>{appointments.filter(a=>a.status!=='Đã hủy').length}</em>}</button>)}</div>)}</nav><div className="profile"><button className="avatar-trigger" aria-label="Xem hồ sơ cá nhân" title="Thông tin cá nhân" onClick={()=>navigate('profile')}><ProfileAvatar profile={personalProfile} className="profile-avatar"/></button><button className="profile-link" onClick={()=>navigate('profile')}><b>{personalProfile.displayName}</b><small>{actor.name}</small></button><button className="icon-button" aria-label="Đăng xuất" onClick={onLogout}><LogOut size={17}/></button></div></aside>
 <div className="workspace"><header className="topbar"><div className="breadcrumb"><button className="desktop-menu icon-button" aria-label={collapsed?'Mở rộng menu':'Thu gọn menu'} title={collapsed?'Mở rộng menu':'Thu gọn menu'} aria-expanded={!collapsed} aria-controls="main-sidebar" onClick={()=>setCollapsed(value=>!value)}>{collapsed?<ChevronRight size={19}/>:<ChevronLeft size={19}/>}</button><button className="mobile-menu icon-button" aria-expanded={sidebar} aria-controls="main-sidebar" onClick={()=>setSidebar(!sidebar)} aria-label="Mở menu"><Menu/></button><a href="#trang-chu" aria-label="Về trang chủ bệnh viện">Trang chủ</a><span>Không gian làm việc</span><ChevronRight size={14}/><b>{titles[page]}</b></div><div className="top-actions"><span className="live-dot"/> <span>Hệ thống hoạt động tốt</span><i/><Notifications key={role} role={role} navigate={navigate}/><span className="actor-switch">{actor.name} · {session.person}</span><AccountMenu role={role} onProfile={()=>navigate('profile')} onLogout={onLogout}/></div></header>
 <main>
 {!(['examination','clinical','inpatient'].includes(page) || (page==='care' && requestedTab==='')) && (
  <div className="page-heading">
   <div>
    <h1 style={{margin:0,fontSize:22}}>{page==='overview'?actor.home:titles[page]}</h1>
   </div>
   <div className="heading-actions">
    <label className="date heading-date" title="Chọn ngày làm việc">
     <CalendarDays size={16}/>
     <span>{new Intl.DateTimeFormat('vi-VN',{day:'numeric',month:'long',year:'numeric'}).format(new Date(selectedDate+'T12:00:00'))}</span>
     <input aria-label="Ngày làm việc" type="date" required value={selectedDate} onClick={e=>{try{e.currentTarget.showPicker?.()}catch{}}} onChange={e=>{if(e.target.value&&e.target.validity.valid)setSelectedDate(e.target.value)}}/>
    </label>
    {((page==='appointments' && ['admin','receptionist','patient'].includes(role)) || (['patients','overview'].includes(page) && ['admin','receptionist'].includes(role))) && (
     <button className="primary" onClick={()=>page==='appointments'?setAppointmentRequest(v=>v+1):setModal({type:'register'})}>
      <Plus size={17}/>{page==='appointments'?'Đặt lịch hẹn':'Tiếp đón bệnh nhân'}
     </button>
    )}
   </div>
  </div>
 )}
 {page==='care'&&<div className="integrated-operation-tabs" role="tablist" aria-label={'Chức năng '+titles[page]}><button role="tab" aria-selected={!requestedTab} onClick={()=>setRequestedTab('')}>Tờ điều trị theo đợt & Y lệnh</button><button role="tab" aria-selected={requestedTab==='rounds'} onClick={()=>setRequestedTab('rounds')}>Danh sách thực hiện y lệnh tại giường</button></div>}
 <Suspense fallback={<ScreenSkeleton/>}>
 <>
 {page==='overview'&&role!=='admin'&&<ActorHome role={role} patients={patients} beds={beds} stock={stock} appointments={appointments} navigate={navigate}/>} 
 {page==='overview'&&role==='admin'&&<Dashboard navigate={navigate} date={selectedDate} setDate={setSelectedDate}>
 <section className="panel patients-panel"><div className="panel-heading"><div><h2>Bệnh nhân gần đây <span className="count">{patients.filter(p=>p.status!=='Đã hủy').length}</span></h2><p>Cập nhật tình trạng tiếp đón và khám bệnh trong ngày</p></div><button className="secondary" onClick={exportData}><Download size={15}/> Xuất danh sách</button></div><div className="table-tools"><div className="tabs">{['Tất cả','Chờ khám','Đang khám','Hoàn tất','Đã hủy'].map(s=><button className={filter===s?'selected':''} key={s} onClick={()=>{setFilter(s);setOffset(0)}}>{s}{s==='Chờ khám'&&<span>{patients.filter(p=>p.status===s).length}</span>}{s==='Đã hủy'&&<span>{patients.filter(p=>p.status==='Đã hủy').length}</span>}</button>)}</div><label className="search"><Search size={16}/><input aria-label="Tìm bệnh nhân" placeholder="Tìm tên, mã bệnh nhân..." value={query} onChange={e=>{setQuery(e.target.value);setOffset(0)}}/></label></div>{patientTable(true)}</section></Dashboard>}
 {['patients','records'].includes(page)&&<section className="panel"><div className="panel-heading"><div><h2>{page==='records'?'Hồ sơ bệnh án điện tử':page==='examination'?'Danh sách khám bệnh':'Danh sách bệnh nhân'} <span className="count">{patients.filter(p=>p.status!=='Đã hủy').length}</span></h2><p>{page==='examination'?'Chọn bệnh nhân để ghi nhận khám, chỉ định và hướng xử trí':'Thông tin tiếp đón và trạng thái điều trị'}</p></div><button className="secondary" onClick={exportData}><Download size={16}/>Xuất CSV</button></div><div className="table-tools"><label className="search"><Search size={16}/><input aria-label="Tìm bệnh nhân" placeholder="Họ tên, mã hoặc số điện thoại" value={query} onChange={e=>{setQuery(e.target.value);setOffset(0)}}/></label><select aria-label="Lọc chuyên khoa" value={dept} onChange={e=>{setDept(e.target.value);setOffset(0)}}><option>Tất cả chuyên khoa</option>{departments.map(d=><option key={d}>{d}</option>)}</select><select aria-label="Lọc trạng thái" value={filter} onChange={e=>{setFilter(e.target.value);setOffset(0)}}>{['Tất cả','Chờ khám','Đang khám','Chờ kết quả','Hoàn tất','Đã hủy'].map(s=><option key={s}>{s}</option>)}</select></div>{patientTable()}</section>}
 {page==='examination'&&<ClinicalDesk role={role} notify={notify} navigate={navigate}/>}
 {page==='care'&&requestedTab===''&&<ClinicalDesk inpatient role={role} notify={notify} navigate={navigate}/>}
 {page==='clinical'&&<LabDesk role={role} notify={notify} clinicalContext={clinicalContext}/>}
 {page==='inpatient'&&<InpatientBedMap beds={beds} setBeds={setBeds} patients={patients} role={role} actor={actor} onSelectBed={b=>setModal({type:role==='doctor'?'bedRead':'bed',bed:b})} notify={notify}/>}
 {page==='pharmacy'&&<Inventory role={role} notify={notify}/>}
 {page==='profile'&&<Profile key={role} role={role} notify={notify}/>} 
 {page==='history'&&<History role={role} patientId={actor.patientId} navigate={navigate} notify={notify}/>}
 {page==='appointments'&&<Appointments appointments={appointments} setAppointments={setAppointments} patients={patients} setPatients={setPatients} notify={notify} request={appointmentRequest}/>}

 {page==='admin'&&role==='admin'&&<SecureAdmin embedded/>}
 {extraTitles[page]&&page!=='admin'&&!(page==='care'&&requestedTab==='')&&page!=='clinical'&&<Business key={role+page+requestedTab} clinicalContext={clinicalContext} role={role} requestedTab={requestedTab} page={page} patients={patients} stock={stock} setStock={setStock} beds={beds} setBeds={setBeds} notes={notes} appointments={appointments} setAppointments={setAppointments} notify={notify}/>}
 </>
 </Suspense>
 <footer><span>© 2026 MediCare Hospital Information System</span><span><ShieldCheck size={13}/> Hệ thống Quản trị Bệnh viện</span></footer></main></div>
 {toast&&<div className="toast" role="status"><Check size={18}/>{toast}</div>}
 {modal&&<div className="modal-backdrop" onClick={()=>setModal(null)}><section className={`modal ${['register','editPatient','routePatient','exam','detail','bed','bedRead'].includes(modal.type)?'his-large-modal wide-modal':''}`} role="dialog" aria-modal="true" aria-label="Thông tin nghiệp vụ" onClick={e=>e.stopPropagation()}><button className="close icon-button" aria-label="Đóng" onClick={()=>setModal(null)}><X size={21}/></button>
 {modal.type==='register'&&<ReceptionForm mode="register" patient={modal.patient} onDone={message=>{setModal(null);notify(message)}}/>}
 {modal.type==='detail'&&<><span className={'avatar large '+modal.patient.color}>{initials(modal.patient.name)}</span><h2>{modal.patient.name}</h2><p>{modal.patient.id} · {modal.patient.gender} · Sinh ngày {new Date(modal.patient.birth).toLocaleDateString('vi-VN')}</p><div className="detail-list"><div><span>Điện thoại</span><b>{modal.patient.phone}</b></div><div><span>BHYT</span><b>{modal.patient.insurance||'Không có'}</b></div><div><span>Chuyên khoa</span><b>{modal.patient.dept}</b></div><div><span>Bác sĩ</span><b>{modal.patient.doctor}</b></div><div><span>Trạng thái</span><Badge>{patients.find(p=>p.id===modal.patient.id).status}</Badge></div></div>{['admin','doctor'].includes(role)&&notes[modal.patient.id]&&<div className="clinical-note"><h3>Ghi nhận khám gần nhất</h3><p>Triệu chứng: {notes[modal.patient.id].symptoms}</p><p>Chẩn đoán: {notes[modal.patient.id].diagnosis}</p><p>Chỉ định: {notes[modal.patient.id].orders||'Không có'}</p><p>Hướng xử trí: {notes[modal.patient.id].outcome}</p></div>}<PatientHistory patientId={modal.patient.id} clinical={['admin','doctor'].includes(role)}/><button className="primary full" style={{display:['admin','doctor'].includes(role)?undefined:'none'}} onClick={()=>setModal({...modal,type:'exam'})}><Stethoscope size={17}/>Mở phiếu khám</button><div className="dialog-actions" style={{display:['admin','receptionist'].includes(role)?undefined:'none'}}><button className="secondary" onClick={()=>setModal({...modal,type:'editPatient'})}>Sửa thông tin</button><button className="secondary" onClick={()=>setModal({...modal,type:'routePatient'})}>Điều chuyển / hủy lượt</button></div></>}
 {modal.type==='exam'&&<VisitExam patient={modal.patient} role={role} onClose={()=>setModal(null)} notify={notify}/>}
 {['bed','bedRead'].includes(modal.type)&&<InpatientAdmissionModal bed={modal.bed} role={role} actor={actor} patients={patients} onClose={()=>setModal(null)} onSuccess={({bedId,patientId,admissionId,cleaning,status})=>{setBeds(list=>list.map(b=>b.id===bedId?{...b,patient:cleaning?null:(patientId||b.patient),patientName:cleaning?null:(patients.find(p=>p.id===patientId)?.name||b.patientName),admissionId:cleaning?null:(admissionId||b.admissionId),cleaning:cleaning??false,status:status||(cleaning?'Chờ khử khuẩn':'Đang sử dụng')}:b));}} notify={notify} navigate={navigate}/>}
 {modal.type==='appointment'&&<><h2>Đặt lịch hẹn khám</h2><p>Ghi nhận lịch hẹn mới cho bệnh nhân.</p><form onSubmit={e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));setAppointments(list=>[...list,{...f,id:Date.now(),status:'Đã xác nhận'}]);setModal(null);notify('Đã tạo lịch hẹn')}}><label>Họ tên<input name="name" required/></label><label>Số điện thoại<input type="tel" name="phone" pattern="[0-9]{10,11}" required/></label><label>Chuyên khoa<select name="dept">{departments.map(d=><option key={d}>{d}</option>)}</select></label><label>Ngày giờ khám<input type="datetime-local" name="date" min={today+'T00:00'} required/></label><button className="primary full">Xác nhận lịch hẹn</button></form></>}
 {modal.type==='help'&&<><h2>Hướng dẫn sử dụng</h2><div className="help-content"><p><b>1. Tiếp đón:</b> Tạo bệnh nhân mới, chọn chuyên khoa và lưu lượt khám.</p><p><b>2. Khám bệnh:</b> Mở bệnh nhân, ghi triệu chứng, chẩn đoán và hướng xử trí.</p><p><b>3. Nội trú:</b> Chọn giường trống để tiếp nhận; khi xuất viện, xác nhận khử khuẩn để tái sử dụng.</p><p><b>4. Viện phí:</b> Xem chi phí khám/điều trị và xác nhận thu viện phí.</p><p>Hệ thống Quản lý Bệnh viện MediCare kết nối trực tiếp Microsoft SQL Server (QuanLyBenhVien · 65 bảng). Dữ liệu được bảo toàn tính toàn vẹn và giao dịch theo chuẩn y tế.</p></div></>}
 {modal.type==='notifications'&&<><h2>Thông báo vận hành</h2><div className="help-content"><p><b>Kho dược:</b> {stock.filter(s=>s.qty<100).length?stock.filter(s=>s.qty<100).map(s=>s.name).join(', ')+' đang có mức tồn thấp.':'Không có mặt hàng tồn thấp.'}</p><p><b>Buồng giường:</b> Có {beds.filter(b=>b.cleaning).length} giường chờ xác nhận khử khuẩn.</p><p><b>Tiếp đón:</b> {patients.filter(p=>p.status==='Chờ khám').length} bệnh nhân đang chờ khám.</p></div></>}
 {modal.type==='editPatient'&&<ReceptionForm mode="edit" patient={modal.patient} onDone={message=>{setModal(null);notify(message)}}/>}
 {modal.type==='routePatient'&&<ReceptionForm mode="route" patient={modal.patient} onDone={message=>{setModal(null);notify(message)}}/>}
 {modal.type==='confirmDischarge'&&<DischargeConfirmation bed={modal.bed} actor={actor.person} onClose={()=>setModal(null)} notify={notify}/>} 
 {modal.type==='patientnotifications'&&<><h2>Thông báo của tôi</h2><p>Kết quả khám, đơn thuốc và lịch hẹn của bạn được cập nhật trong cổng người bệnh.</p><button className="primary full" onClick={()=>{setModal(null);navigate('portal')}}>Mở hồ sơ của tôi</button></>}
 </section></div>}
 </div>
}
function Root(){const [route,setRoute]=useState(()=>location.hash.slice(1)||'trang-chu');const management=route==='management'||route==='administration';const pages=['trang-chu','gioi-thieu','chuyen-khoa','bac-si','dat-lich'];const page=pages.includes(route)?route:'trang-chu';useEffect(()=>{const update=()=>setRoute(location.hash.slice(1)||'trang-chu');window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update)},[]);useEffect(()=>{const titles={'trang-chu':'Chăm sóc sức khỏe gia đình','gioi-thieu':'Về MediCare','chuyen-khoa':'Chuyên khoa','bac-si':'Đội ngũ bác sĩ','dat-lich':'Đặt lịch khám'};document.title='MediCare · '+(management?'Quản lý bệnh viện':titles[page]);window.scrollTo(0,0)},[route]);return window.__MEDICARE_ADMIN_ONLY__?<SecureAdmin/>:management?<WorkspaceSession><App initialPage={route==='administration'?'admin':'overview'}/></WorkspaceSession>:<Home page={page} onManagement={()=>{location.hash='management'}}/>}
createRoot(document.getElementById('root')).render(<AppBoundary><Root/></AppBoundary>);
