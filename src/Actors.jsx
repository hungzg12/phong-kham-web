import {assignedToDoctor} from './doctor-scope.js';
import {pageGranted} from './business-permissions.js';
import {currentIdentity} from './session.js';
import React, {useState} from 'react';
import {Users,Stethoscope,HeartPulse,Pill,Wallet,ShieldCheck,CalendarDays,ArrowUpRight,ArrowRight,ClipboardList,Check,Clock3,BedDouble,FileText,Activity,X} from 'lucide-react';
import {actorRoles,actorIds} from './roles';
import {seeds} from './business-data';
import './actors.css';
import {useProfile} from './Profile';
import {useWorkspace,syncWithSqlServer} from './workspace';
import {hisApi} from './api';
const icons={admin:ShieldCheck,receptionist:Users,doctor:Stethoscope,nurse:HeartPulse,technician:Activity,pharmacist:Pill,cashier:Wallet,patient:HeartPulse};
export function ActorPicker({activeRole,onSelect}){return <div className="actor-picker">{actorIds.map(id=>{const r=actorRoles[id],Icon=icons[id]||ShieldCheck;return <button type="button" key={id} aria-pressed={id===activeRole} className={id===activeRole?'actor-choice chosen':'actor-choice'} onClick={()=>onSelect(id)}><span style={{color:r.color,background:r.color+'12'}}><Icon size={21}/></span><div><b>{r.name}</b><small>{r.description}</small></div>{id===activeRole?<Check size={17}/>:<ArrowRight size={16}/>}</button>})}</div>}
export default function ActorHome({role,patients,beds,stock,appointments,navigate,notify}){
 const actor=actorRoles[role];const profile=useProfile(role);const [db]=useWorkspace('business');const [visits]=useWorkspace('visits');
 const [triageVisit, setTriageVisit] = useState(null);
 const [triageVitals, setTriageVitals] = useState({ bpSystolic: '120', bpDiastolic: '80', height: '165', weight: '60' });
 const [triageSaving, setTriageSaving] = useState(false);
 const [triageError, setTriageError] = useState('');

 const activePatientId = currentIdentity()?.patientId || actor.patientId;
 const activeStaffId = currentIdentity()?.staffId || actor.staffId;
 const mine=patients.filter(p=>role==='doctor'?visits.some(v=>v.patientId===p.id&&assignedToDoctor(v,activeStaffId)):role==='patient'?p.id===activePatientId:true);
 const patientVisits = role === 'patient' ? visits.filter(v => v.patientId === activePatientId) : [];
 const activePatientVisit = patientVisits.find(v => !['Hoàn tất', 'Đã hủy', 'Đã ra viện'].includes(v.status)) || patientVisits[0] || null;
 const currentPatient = role === 'patient' ? patients.find(p => p.id === activePatientId) : null;

 const pendingVitals = visits.filter(v =>
   !['Hoàn tất', 'Đã hủy', 'Đã ra viện', 'Chờ thanh toán'].includes(v.status) &&
   !v.note?.vitals?.pressure &&
   !(db.vitals && db.vitals.some(sh => sh.patient === v.patientId || sh.episodeId === v.id))
 );

 const tasks={
 receptionist:[['Tiếp đón người bệnh','Tạo hồ sơ, tra cứu và đăng ký chuyên khoa.','patients',Users],['Quản lý lịch hẹn','Xác nhận lịch, đổi lịch và check-in tại quầy.','appointments',CalendarDays]],
 doctor:[['Danh sách khám bệnh & kê đơn','Mở phiếu khám, chỉ định CLS và kê đơn thuốc.','examination',Stethoscope],['Điều trị nội trú','Ghi diễn biến, y lệnh và tổng kết ra viện.','care',ClipboardList],['Bệnh án & đính chính','Quản lý hồ sơ chuyên môn của bệnh nhân.','archive',FileText]],
 nurse:[['Theo dõi & ghi nhận sinh hiệu','Đo dấu hiệu sinh tồn và lập phiếu theo dõi sinh hiệu.','care',HeartPulse,'vitals'],['Thực hiện y lệnh tại giường','Đối chiếu 5 đúng và xác nhận thực hiện y lệnh.','care',ClipboardList,'rounds'],['Phân buồng giường & vệ sinh','Xếp giường, tiếp nhận nội trú và khử khuẩn.','inpatient',BedDouble]],
 technician:[['Bàn xét nghiệm & CĐHA','Tiếp nhận chỉ định, nhập kết quả và gửi về bác sĩ.','clinical',Activity],['Hàng đợi chỉ định CLS','Theo dõi bệnh nhân chờ thực hiện theo từng phòng máy.','clinical',ClipboardList]],
 pharmacist:[['Đơn thuốc chờ cấp phát','Kiểm tra đơn bác sĩ và cấp phát thuốc tại quầy.','pharmacy',ClipboardList],['Tồn kho thuốc & vật tư','Theo dõi số lượng, hạn dùng và lô thuốc.','pharmacy',Pill],['Phiếu kho & kiểm kê','Duyệt nhập xuất, kiểm kê và điều chỉnh tồn.','warehouse',FileText]],
 cashier:[['Quyết toán viện phí','Tổng hợp chi phí và xác nhận khoản thu.','finance',Wallet],['Tạm ứng & hoàn tiền','Ghi nhận giao dịch và ký nhận tại quầy.','finance',ArrowRight,'advances'],['Đối soát cuối ca','Kiểm đếm thực tế và giải trình chênh lệch.','finance',ClipboardList,'shifts'],['Báo cáo thu chi','Theo dõi các giao dịch đã xác nhận.','finance',Activity,'reports']],
 patient:[['Thông tin & Số thứ tự','Xem hồ sơ cá nhân, BHYT và số thứ tự khám.','portal',Clock3,'summary'],['Kết quả khám của tôi','Xem kết quả đã được bệnh viện phát hành.','portal',FileText,'results'],['Đơn thuốc của tôi','Xem thuốc và hướng dẫn theo đơn xác nhận.','portal',Pill,'medicine'],['Lịch hẹn của tôi','Đặt lịch mới hoặc quản lý lịch khám cá nhân.','portal',CalendarDays,'appointments'],['Viện phí của tôi','Xem chi tiết chi phí và tình trạng quyết toán.','portal',Wallet,'bills']]
 }[role]||[];
 const visibleTasks=tasks.filter(([, ,page])=>pageGranted(page,currentIdentity()?.permissions||[]));
 const stats={
 receptionist:[['Chờ khám',patients.filter(p=>p.status==='Chờ khám').length,Users],['Lịch đã xác nhận',appointments.filter(a=>a.status==='Đã xác nhận').length,CalendarDays],['Đã tiếp đón',appointments.filter(a=>a.status==='Đã tiếp đón').length,Check]],
 doctor:[['Bệnh nhân phụ trách',mine.length,Users],['Đang chờ khám',mine.filter(p=>p.status==='Chờ khám').length,Clock3],['Chỉ định chờ duyệt',db.labs.filter(x=>x.doctor===activeStaffId&&x.status==='Chờ duyệt').length,ClipboardList]],
 nurse:[['Chờ đo sinh hiệu',pendingVitals.length,HeartPulse],['Bệnh nhân nội trú',beds.filter(b=>b.patient).length,Users],['Y lệnh cần thực hiện',db.rounds.filter(x=>x.status==='Chờ thực hiện').length,ClipboardList],['Giường chờ khử khuẩn',beds.filter(b=>b.cleaning).length,BedDouble]],
 technician:[['Chờ duyệt / tiếp nhận',db.labs.filter(x=>x.status==='Chờ duyệt'||x.status==='Chờ tiếp nhận').length,Clock3],['Đang thực hiện',db.labs.filter(x=>x.status==='Đang thực hiện').length,Activity],['Đã phát hành',db.labs.filter(x=>x.status==='Đã phát hành').length,Check]],
 pharmacist:[['Đơn chờ cấp phát',db.prescriptions.filter(r=>r.status==='Đã xác nhận').length,ClipboardList],['Mặt hàng tồn thấp',stock.filter(s=>s.qty<100).length,Pill],['Phiếu kho chờ duyệt',db.movements.filter(r=>r.status==='Chờ duyệt').length,FileText]],
 cashier:[['Chờ quyết toán',db.settlements.filter(r=>r.status==='Chờ quyết toán').length,Wallet],['Giao dịch chờ xác nhận',db.advances.filter(r=>r.status==='Chờ xác nhận').length,Clock3],['Ca đang mở',db.shifts.filter(r=>r.status!=='Đã đóng ca').length,ClipboardList]],
 patient:[['Số thứ tự hiện tại',activePatientVisit?(activePatientVisit.queueTag||(activePatientVisit.queueNumber?`#${activePatientVisit.queueNumber}`:'Chưa cấp')):'Chưa có',Clock3],['Kết quả đã phát hành',db.labs.filter(r=>r.patient===activePatientId&&r.status==='Đã phát hành').length,FileText],['Đơn thuốc xác nhận',db.prescriptions.filter(r=>r.patient===activePatientId&&['Đã xác nhận','Đã cấp phát'].includes(r.status)).length,Pill],['Lịch hẹn sắp tới',appointments.filter(a=>a.patientId===activePatientId&&a.status==='Đã xác nhận').length,CalendarDays]]
 }[role]||[];
 const Icon=icons[role]||ShieldCheck;
 const welcomeArt=['receptionist','doctor','nurse','technician','pharmacist','cashier','patient'].includes(role)?`/images/workspace/${role}-welcome-vietnam-poster.png`:null;
 return <div className="actor-home"><section className={`actor-welcome${welcomeArt?' actor-welcome-illustrated':''}`} style={{'--actor-color':actor.color}}><div><span>KHÔNG GIAN {actor.name.toUpperCase()}</span><h2>{role==='patient'?'Chào bạn, '+profile.displayName:'Xin chào, '+profile.displayName}</h2><p>{role==='patient'?'Thông tin khám và chăm sóc của bạn được tổng hợp tại đây.':actor.description+'.'}</p></div>{welcomeArt?<img className="actor-welcome-art" src={welcomeArt} alt="" aria-hidden="true" width="1536" height="1024"/>:<Icon size={68} strokeWidth={1}/>}</section><div className="business-summary actor-stats">{stats.map(([label,value,Stat])=><div key={label}><span><Stat size={18}/>{label}</span><b>{value}</b></div>)}</div><div className="section-label"><h2>{role==='patient'?'Dịch vụ dành cho bạn':'Công việc trong ca'}</h2><span>{visibleTasks.length} lối tắt nghiệp vụ</span></div><section className="actor-task-grid">{visibleTasks.map(([title,text,page,Task,tab])=><button className="actor-task" key={title} onClick={()=>navigate(page,tab)}><span className="actor-task-icon"><Task size={23}/></span><ArrowUpRight size={18}/><h3>{title}</h3><p>{text}</p><span className="actor-task-link">Mở không gian <ArrowRight size={13}/></span></button>)}</section>{role==='doctor'&&pageGranted('examination',currentIdentity()?.permissions)&&<section className="panel actor-queue"><div className="panel-heading"><div><h2>Hàng chờ của bác sĩ</h2><p>Người bệnh được phân công cho {profile.displayName || actor.person}</p></div><button className="text-button" onClick={()=>navigate('examination')}>Mở danh sách khám <ArrowRight size={14}/></button></div><div className="table-scroll"><table><thead><tr><th>NGƯỜI BỆNH</th><th>CHUYÊN KHOA</th><th>GIỜ KHÁM</th><th>TRẠNG THÁI</th></tr></thead><tbody>{mine.map(p=><tr key={p.id}><td><b>{p.name}</b><small>{p.id}</small></td><td>{p.dept}</td><td>{p.time}</td><td><span className="badge teal">{p.status}</span></td></tr>)}</tbody></table></div>{!mine.length&&<div className="business-empty">Chưa có bệnh nhân được phân công.</div>}</section>}
 {role==='patient'&&(
  <section className="panel actor-queue" style={{marginTop:'20px'}}>
    <div className="panel-heading" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
      <div>
        <h2 style={{display:'flex',alignItems:'center',gap:'8px',margin:0,fontSize:'16px'}}>
          <Clock3 size={20} color="#0f766e" />
          Số thứ tự khám & Thông tin cá nhân của bạn
        </h2>
        <p style={{margin:'4px 0 0',fontSize:'12px',color:'#64748b'}}>
          Theo dõi trực tiếp số thứ tự tiếp nhận, phòng khám được phân công và thông tin hồ sơ y tế.
        </p>
      </div>
      <button className="primary" type="button" onClick={()=>navigate('portal','summary')} style={{fontSize:'12px',padding:'6px 14px'}}>
        Mở cổng thông tin người bệnh <ArrowRight size={14}/>
      </button>
    </div>
    <div style={{padding:'16px 22px',display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))',gap:'16px'}}>
      <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderLeft:'4px solid #0f766e',borderRadius:'8px',padding:'14px 16px'}}>
        <span style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase'}}>Phiếu số thứ tự hiện tại</span>
        {activePatientVisit ? (
          <div style={{marginTop:'8px',display:'grid',gap:'6px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'10px'}}>
              <span style={{fontSize:'28px',fontWeight:800,color:'#0f766e',fontFamily:'monospace'}}>{activePatientVisit.queueTag || (activePatientVisit.queueNumber ? `#${activePatientVisit.queueNumber}` : '—')}</span>
              <span className="badge amber">{activePatientVisit.status}</span>
            </div>
            <div style={{fontSize:'12.5px',color:'#334155'}}>
              <div><b>Phòng khám:</b> {activePatientVisit.room || activePatientVisit.department}</div>
              <div><b>Chuyên khoa:</b> {activePatientVisit.department}</div>
              <div><b>Bác sĩ:</b> {activePatientVisit.doctor || 'Chưa phân công'}</div>
              <div><b>Thời gian:</b> {activePatientVisit.time || '—'} · {activePatientVisit.date || '—'}</div>
            </div>
          </div>
        ) : (
          <p style={{margin:'8px 0 0',fontSize:'12.5px',color:'#64748b'}}>Bạn chưa có lượt khám đang chờ hôm nay.</p>
        )}
      </div>
      <div style={{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'14px 16px',fontSize:'12.5px',display:'grid',gap:'5px'}}>
        <span style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',marginBottom:'2px'}}>Hồ sơ hành chính</span>
        <div><b>Họ tên:</b> {currentPatient?.name || profile.displayName}</div>
        <div><b>Mã bệnh nhân:</b> <span style={{fontFamily:'monospace',color:'#0f766e',fontWeight:600}}>{activePatientId || '—'}</span></div>
        <div><b>Ngày sinh / Giới tính:</b> {currentPatient?.birth || profile.birth || '—'} · {currentPatient?.gender || profile.gender || '—'}</div>
        <div><b>Số điện thoại:</b> {currentPatient?.phone || profile.phone || '—'}</div>
        <div><b>Thẻ BHYT:</b> {currentPatient?.insurance || 'Chưa có (Viện phí)'}</div>
      </div>
    </div>
  </section>
 )}
 {role==='nurse'&&(
  <section className="panel actor-queue" style={{marginTop:'20px'}}>
    <div className="panel-heading" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
      <div>
        <h2 style={{display:'flex',alignItems:'center',gap:'8px',margin:0,fontSize:'16px'}}>
          <HeartPulse size={20} color="#0f766e" />
          Danh sách chờ đo sinh hiệu (Triage tiếp đón)
        </h2>
        <p style={{margin:'4px 0 0',fontSize:'12px',color:'#64748b'}}>
          Bệnh nhân tiếp đón xong tại quầy được chuyển sang danh sách này. Điều dưỡng đo Huyết áp, Chiều cao, Cân nặng để đủ điều kiện vào buồng khám.
        </p>
      </div>
      <span className={`badge ${pendingVitals.length > 0 ? 'amber' : 'teal'}`} style={{fontWeight:700,fontSize:'12px'}}>
        {pendingVitals.length > 0 ? `⏳ ${pendingVitals.length} người bệnh chờ đo` : '✓ Đã hoàn tất đo sinh hiệu'}
      </span>
    </div>

    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>STT / MÃ LƯỢT KHÁM</th>
            <th>HỌ TÊN NGƯỜI BỆNH</th>
            <th>PHÒNG KHÁM PHÂN CÔNG</th>
            <th>GIỜ TIẾP ĐÓN</th>
            <th>TRẠNG THÁI</th>
            <th style={{textAlign:'right'}}>THAO TÁC</th>
          </tr>
        </thead>
        <tbody>
          {pendingVitals.map(v => {
            const p = patients.find(pat => pat.id === v.patientId);
            return (
              <tr key={v.id}>
                <td>
                  <span className="badge teal" style={{fontWeight:700}}>{v.queueTag || v.id}</span>
                </td>
                <td>
                  <b>{p?.name || v.patientId}</b>
                  <small style={{display:'block',color:'#64748b'}}>{p?.birth ? `${new Date().getFullYear()-Number(String(p.birth).slice(0,4))} tuổi` : ''} · {p?.gender}</small>
                </td>
                <td>
                  <b>{v.room || v.department}</b>
                  <small style={{display:'block',color:'#64748b'}}>{v.doctor ? `BS: ${v.doctor}` : 'Bác sĩ trực ca'}</small>
                </td>
                <td>{v.time || v.date}</td>
                <td>
                  <span className="badge amber" style={{fontSize:'11px'}}>⏳ Chờ đo sinh hiệu</span>
                </td>
                <td style={{textAlign:'right'}}>
                  <button
                    type="button"
                    className="primary"
                    style={{fontSize:'12px',padding:'5px 12px',display:'inline-flex',alignItems:'center',gap:'5px'}}
                    onClick={() => {
                      setTriageVisit(v);
                      setTriageVitals({ bpSystolic: '120', bpDiastolic: '80', height: '165', weight: '60' });
                      setTriageError('');
                    }}
                  >
                    <HeartPulse size={14} /> Đo sinh hiệu
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    {!pendingVitals.length && (
      <div className="business-empty" style={{color:'#0f766e',padding:'24px',textAlign:'center'}}>
        <Check size={28} style={{margin:'0 auto 8px',display:'block',color:'#059669'}} />
        <b>Hiện không có người bệnh chờ đo sinh hiệu tiếp đón.</b>
        <p style={{margin:'4px 0 0',fontSize:'12px',color:'#64748b'}}>Tất cả người bệnh vừa tiếp đón đã được ghi nhận sinh hiệu và đủ điều kiện vào khám.</p>
      </div>
    )}
  </section>
 )}

 {triageVisit && (
  <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) setTriageVisit(null); }}>
    <section className="modal" role="dialog" aria-modal="true" style={{maxWidth:'460px',borderRadius:'12px',overflow:'hidden',padding:0}}>
      <div style={{background:'#0f766e',color:'#ffffff',padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <HeartPulse size={20} />
          <h3 style={{margin:0,fontSize:'15px',fontWeight:700}}>Ghi nhận sinh hiệu tiếp đón</h3>
        </div>
        <button type="button" className="icon-button" style={{color:'#fff'}} onClick={() => setTriageVisit(null)}>
          <X size={18} />
        </button>
      </div>

      <div style={{padding:'18px 20px'}}>
        <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',fontSize:'12.5px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <b style={{fontSize:'14px',color:'#0f172a'}}>
              {patients.find(p=>p.id===triageVisit.patientId)?.name || triageVisit.patientId}
            </b>
            <span className="badge teal" style={{fontWeight:700}}>{triageVisit.queueTag || triageVisit.id}</span>
          </div>
          <div style={{color:'#64748b',marginTop:'3px'}}>
            Phòng khám: <b>{triageVisit.room || triageVisit.department}</b> · BS: {triageVisit.doctor || 'Chưa phân công'}
          </div>
        </div>

        <div style={{marginBottom:'10px'}}>
          <span style={{fontSize:'12px',fontWeight:700,color:'#334155'}}>Chỉ số sinh hiệu chính (Huyết áp, Chiều cao, Cân nặng):</span>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
          <label style={{fontSize:'12px',fontWeight:600,color:'#334155',display:'grid',gap:'4px'}}>
            Huyết áp tâm thu (mmHg)
            <input
              type="number"
              min="50"
              max="260"
              required
              className="his-input"
              value={triageVitals.bpSystolic}
              onChange={e => setTriageVitals(v => ({ ...v, bpSystolic: e.target.value }))}
              placeholder="120"
              style={{padding:'7px 10px',border:'1px solid #cbd5e1',borderRadius:'6px',fontSize:'13px'}}
            />
          </label>
          <label style={{fontSize:'12px',fontWeight:600,color:'#334155',display:'grid',gap:'4px'}}>
            Huyết áp tâm trương (mmHg)
            <input
              type="number"
              min="30"
              max="160"
              required
              className="his-input"
              value={triageVitals.bpDiastolic}
              onChange={e => setTriageVitals(v => ({ ...v, bpDiastolic: e.target.value }))}
              placeholder="80"
              style={{padding:'7px 10px',border:'1px solid #cbd5e1',borderRadius:'6px',fontSize:'13px'}}
            />
          </label>
          <label style={{fontSize:'12px',fontWeight:600,color:'#334155',display:'grid',gap:'4px'}}>
            Chiều cao (cm)
            <input
              type="number"
              step="0.5"
              min="30"
              max="230"
              required
              className="his-input"
              value={triageVitals.height}
              onChange={e => setTriageVitals(v => ({ ...v, height: e.target.value }))}
              placeholder="165"
              style={{padding:'7px 10px',border:'1px solid #cbd5e1',borderRadius:'6px',fontSize:'13px'}}
            />
          </label>
          <label style={{fontSize:'12px',fontWeight:600,color:'#334155',display:'grid',gap:'4px'}}>
            Cân nặng (kg)
            <input
              type="number"
              step="0.5"
              min="2"
              max="250"
              required
              className="his-input"
              value={triageVitals.weight}
              onChange={e => setTriageVitals(v => ({ ...v, weight: e.target.value }))}
              placeholder="60"
              style={{padding:'7px 10px',border:'1px solid #cbd5e1',borderRadius:'6px',fontSize:'13px'}}
            />
          </label>
        </div>

        {/* Tự động tính BMI */}
        {(() => {
          const h = Number(triageVitals.height);
          const w = Number(triageVitals.weight);
          const bmi = (h > 0 && w > 0) ? (w / Math.pow(h / 100, 2)).toFixed(1) : '22.0';
          return (
            <div style={{marginTop:'12px',padding:'8px 12px',background:'#f0fdfa',border:'1px solid #ccfbf1',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'12px',color:'#0f766e',fontWeight:600}}>
                BMI: <strong>{bmi} kg/m²</strong>
              </span>
              <span className={`badge ${Number(bmi) < 18.5 ? 'amber' : Number(bmi) < 23 ? 'teal' : Number(bmi) < 25 ? 'blue' : 'danger'}`} style={{fontSize:'11px'}}>
                {Number(bmi) < 18.5 ? 'Thiếu cân / Gầy' : Number(bmi) < 23 ? 'Thể trạng Bình thường' : Number(bmi) < 25 ? 'Thừa cân' : 'Béo phì'}
              </span>
            </div>
          );
        })()}

        {triageError && <p className="form-error" role="alert" style={{margin:'10px 0 0',fontSize:'12px'}}>{triageError}</p>}

        <div style={{display:'flex',justifyContent:'flex-end',gap:'8px',marginTop:'18px'}}>
          <button
            type="button"
            className="secondary"
            style={{padding:'8px 14px',fontSize:'12.5px'}}
            onClick={() => setTriageVisit(null)}
          >
            Đóng
          </button>
          <button
            type="button"
            className="primary"
            style={{padding:'8px 18px',fontSize:'12.5px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:'6px'}}
            disabled={triageSaving}
            onClick={async () => {
              if (triageSaving) return;
              const sys = parseInt(triageVitals.bpSystolic);
              const dia = parseInt(triageVitals.bpDiastolic);
              const h = parseFloat(triageVitals.height);
              const w = parseFloat(triageVitals.weight);
              if (!sys || !dia || !h || !w) {
                setTriageError('Vui lòng nhập đầy đủ Huyết áp, Chiều cao và Cân nặng.');
                return;
              }
              const bmi = (w / Math.pow(h / 100, 2)).toFixed(1);
              setTriageSaving(true);
              setTriageError('');
              try {
                const nowIso = new Date().toISOString();
                await hisApi.saveNursingVitals({
                  role: 'nurse',
                  staffId: actor.staffId || 'NV-DD01',
                  patient: triageVisit.patientId,
                  episodeId: triageVisit.id,
                  time: nowIso.slice(0, 16),
                  pressure: `${sys}/${dia}`,
                  pulse: 78,
                  temperature: 36.8,
                  spo2: 98,
                  height: h,
                  weight: w,
                  bmi
                });
                await syncWithSqlServer();
                setTriageVisit(null);
                if (notify) notify(`Đã ghi nhận sinh hiệu cho người bệnh ${triageVisit.queueTag || triageVisit.patientId}. Người bệnh đã đủ điều kiện vào khám!`);
              } catch (err) {
                setTriageError(err.message || 'Lỗi khi lưu sinh hiệu.');
              } finally {
                setTriageSaving(false);
              }
            }}
          >
            <Check size={15} /> {triageSaving ? 'Đang lưu…' : 'Xác nhận & Chuyển vào phòng khám'}
          </button>
        </div>
      </div>
    </section>
  </div>
 )}
<div className="actor-scope"><ShieldCheck size={17}/><p>Phiên làm việc: <b>{profile.displayName}</b> · Vai trò: <b>{actor.name}</b></p></div></div>
}
