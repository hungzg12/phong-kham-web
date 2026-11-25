import React,{useEffect,useState} from 'react';
import {Stethoscope,Clock,User,Activity,Phone,MapPin,IdCard,AlertTriangle,CalendarDays} from 'lucide-react';
import {hisApi} from './api';
import {clinics,today} from './business-data';
import {parseBhytCard} from './bhyt-utils';
import MedicalSuggestInput from './MedicalSuggestInput';
const currency=n=>Number(n||0).toLocaleString('vi-VN')+' ₫';
const tabs=[['summary','Tổng quan'],['results','Kết quả khám'],['medicine','Đơn thuốc'],['appointments','Lịch hẹn'],['bills','Viện phí']];
function nextStepGuide(v){
 if(!v)return '';
 if(v.status==='Chờ khám'&&!v.hasVitals)return 'Quý khách vui lòng qua Bàn Điều dưỡng để đo sinh hiệu (Huyết áp, Chiều cao, Cân nặng) trước khi vào phòng khám.';
 if(v.status==='Chờ khám'&&v.hasVitals)return 'Đã hoàn tất đo sinh hiệu. Quý khách vui lòng ngồi chờ tại khu vực phòng khám, màn hình sẽ gọi số thứ tự của bạn.';
 if(v.status==='Đang khám')return 'Đã tới lượt khám! Mời quý khách vào phòng khám gặp bác sĩ.';
 if(v.status==='Chờ kết quả')return 'Quý khách vui lòng di chuyển đến phòng Cận lâm sàng (Xét nghiệm / CĐHA) theo chỉ định của bác sĩ.';
 if(v.status==='Đã có kết quả')return 'Đã có kết quả cận lâm sàng. Vui lòng quay lại phòng khám ban đầu để bác sĩ đọc kết quả và kê đơn.';
 if(v.status==='Chờ thanh toán')return 'Đã hoàn tất khám. Quý khách vui lòng đến quầy Thu ngân để thanh toán và nhận thuốc.';
 return 'Theo dõi trạng thái lượt khám tại cổng thông tin người bệnh.';
}
export function PatientPortalView({data,tab='summary',onTab=()=>{},onCreate=()=>{},onCancel=()=>{}}){
 const p=data.patient||{};
 const bh=parseBhytCard(p.insurance);
 const history=Array.isArray(data.history)?data.history:[];
 const activeVisits=history.filter(v=>!['Hoàn tất','Đã hủy','Đã ra viện'].includes(v.status));
 return <section className="panel portal-panel"><div className="panel-heading"><div><h2>Cổng thông tin người bệnh</h2><p>Thông tin cá nhân, số thứ tự khám và hồ sơ y tế trực tiếp từ hệ thống bệnh viện</p></div></div><div className="portal-welcome"><div><span>HỒ SƠ CÁ NHÂN · {p.id||'—'}</span><h2>Xin chào, {p.name||'Người bệnh'}</h2><p>{p.gender||'—'} · Sinh ngày {p.birth||'Chưa cập nhật'} · SĐT: {p.phone||'Chưa cập nhật'}</p></div></div>
 <div className="business-tabs portal-tabs">{tabs.map(([key,label])=><button key={key} className={tab===key?'selected':''} onClick={()=>onTab(key)}>{label}</button>)}</div>
 <div className="portal-content">
 {tab==='summary'&&<>
  {/* PHIẾU SỐ THỨ TỰ KHÁM HIỆN TẠI */}
  <div style={{marginBottom:'20px'}}>
   <h3 style={{display:'flex',alignItems:'center',gap:'7px',margin:'0 0 10px',fontSize:'14px',color:'#0f172a'}}>
    <Clock size={16} color="#0f766e"/> Số thứ tự khám bệnh hiện tại (STT)
   </h3>
   {activeVisits.length > 0 ? (
    <div style={{display:'grid',gap:'12px'}}>
     {activeVisits.map(v => (
      <div key={v.id} style={{background:'#ffffff',border:'1px solid #cbd5e1',borderTop:'3px solid #0f766e',borderRadius:'10px',padding:'16px 18px',display:'grid',gridTemplateColumns:'minmax(150px, 190px) 1fr',gap:'18px',alignItems:'center',boxShadow:'0 2px 6px rgba(15,23,42,0.04)'}}>
       <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'12px 10px',textAlign:'center'}}>
        <span style={{fontSize:'10.5px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.8px'}}>Số thứ tự</span>
        <div style={{fontSize:'32px',fontWeight:800,color:'#0f766e',fontFamily:'monospace',letterSpacing:'1.5px',margin:'4px 0',lineHeight:1.1}}>
         {v.queueTag || (v.queueNumber ? `#${v.queueNumber}` : '—')}
        </div>
        <div style={{display:'inline-flex',alignItems:'center',gap:'4px',background:'#ecfdf5',color:'#065f46',border:'1px solid #a7f3d0',padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:600}}>
         <Stethoscope size={12}/> {v.room || v.department}
        </div>
       </div>
       <div style={{display:'grid',gap:'6px',fontSize:'12.5px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
         <b style={{fontSize:'14px',color:'#0f172a'}}>{v.department} · {v.room || v.department}</b>
         <span className={`badge ${v.status==='Đang khám'?'teal':v.status==='Chờ khám'?'amber':'violet'}`} style={{fontWeight:700}}>
          {v.status==='Chờ khám'&&!v.hasVitals?'⏳ Chờ đo sinh hiệu':v.status==='Chờ khám'&&v.hasVitals?'✓ Chờ gọi vào khám':v.status}
         </span>
        </div>
        <div style={{color:'#475569',display:'flex',flexWrap:'wrap',gap:'14px'}}>
         <span><b>Bác sĩ:</b> <span style={{color:'#0f766e',fontWeight:600}}>{v.doctor||'Chưa phân công'}</span></span>
         <span><b>Giờ cấp số:</b> {v.time||'—'} ({v.date||'—'})</span>
         <span><b>Mã lượt:</b> <span style={{fontFamily:'monospace'}}>{v.id}</span></span>
        </div>
        {v.reason && <div style={{color:'#475569'}}><b>Lý do khám:</b> {v.reason}</div>}
        {v.hasVitals && v.vitals && (
         <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'6px',padding:'6px 10px',fontSize:'12px',color:'#166534',display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
          <Activity size={13}/> <b>Sinh hiệu đã đo:</b>
          <span>HA: <b>{v.vitals.pressure}</b> mmHg</span> ·
          <span>Cao: <b>{v.vitals.height || '—'}</b> cm</span> ·
          <span>Nặng: <b>{v.vitals.weight || '—'}</b> kg</span>
          {v.vitals.bmi && <> · <span>BMI: <b>{v.vitals.bmi}</b> kg/m²</span></>}
         </div>
        )}
        <div style={{background:'#f8fafc',borderLeft:'3px solid #0f766e',padding:'6px 10px',borderRadius:'4px',fontSize:'12px',color:'#334155',marginTop:'2px'}}>
         📋 {nextStepGuide(v)}
        </div>
       </div>
      </div>
     ))}
    </div>
   ) : (
    <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'14px 16px',color:'#475569',fontSize:'12.5px'}}>
     Hiện bạn chưa có số thứ tự khám đang chờ hôm nay. Bạn có thể chuyển sang tab <b>Lịch hẹn</b> để đặt lịch khám hoặc đăng ký tiếp nhận tại quầy.
    </div>
   )}
  </div>

  {/* THÔNG TIN HÀNH CHÍNH & THẺ BHYT */}
  <h3 style={{display:'flex',alignItems:'center',gap:'7px',margin:'0 0 10px',fontSize:'14px',color:'#0f172a'}}>
   <User size={16} color="#0f766e"/> Thông tin cá nhân & Hồ sơ bệnh nhân
  </h3>
  <div style={{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'14px 18px',display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:'10px 18px',fontSize:'12.5px',marginBottom:'16px'}}>
   <div><span style={{color:'#64748b',display:'block',fontSize:'11px'}}>Họ và tên</span><b style={{color:'#0f172a'}}>{p.name||'—'}</b></div>
   <div><span style={{color:'#64748b',display:'block',fontSize:'11px'}}>Mã bệnh nhân (MBN)</span><b style={{fontFamily:'monospace',color:'#0f766e'}}>{p.id||'—'}</b></div>
   <div><span style={{color:'#64748b',display:'block',fontSize:'11px'}}>Ngày sinh / Giới tính</span><b>{p.birth||'—'} · {p.gender||'—'}</b></div>
   <div><span style={{color:'#64748b',display:'block',fontSize:'11px'}}>Số điện thoại</span><b>{p.phone||'Chưa cập nhật'}</b></div>
   <div><span style={{color:'#64748b',display:'block',fontSize:'11px'}}>CCCD / Định danh</span><b style={{fontFamily:'monospace'}}>{p.cccd||'Chưa cập nhật'}</b></div>
   <div><span style={{color:'#64748b',display:'block',fontSize:'11px'}}>Địa chỉ thường trú</span><b>{p.address||'Chưa cập nhật'}</b></div>
   <div style={{gridColumn:'1 / -1'}}><span style={{color:'#64748b',display:'block',fontSize:'11px'}}>Tiền sử dị ứng thuốc / thức ăn</span><b style={{color:p.allergy?'#b45309':'#334155'}}>{p.allergy||'Chưa ghi nhận dị ứng'}</b></div>
  </div>

  <h3>Thông tin thẻ Bảo hiểm Y tế & Chế độ KCB</h3>
  {bh.hasInsurance ? (
    <div style={{background:'linear-gradient(135deg, #065f46 0%, #047857 50%, #0f766e 100%)',borderRadius:'10px',padding:'16px 20px',color:'#ffffff',marginTop:'10px',boxShadow:'0 4px 12px rgba(6,95,70,0.15)',maxWidth:'540px',marginBottom:'18px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.25)',paddingBottom:'8px',marginBottom:'10px'}}>
        <span style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.5px',textTransform:'uppercase'}}>Bảo hiểm Y tế Việt Nam</span>
        <span style={{fontSize:'11px',background:'rgba(255,255,255,0.2)',padding:'2px 8px',borderRadius:'4px',fontWeight:600}}>Thẻ BHYT điện tử</span>
      </div>
      <div style={{fontSize:'17px',fontWeight:700,letterSpacing:'2px',fontFamily:'monospace',marginBottom:'10px',color:'#ecfdf5'}}>
        {bh.code}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',fontSize:'12px'}}>
        <div><span style={{opacity:0.8}}>Họ và tên:</span> <b>{p.name}</b></div>
        <div><span style={{opacity:0.8}}>Mức hưởng:</span> <b>BHYT chi trả {bh.rate}%</b></div>
        <div><span style={{opacity:0.8}}>Đối tượng:</span> <b>{bh.groupName} ({bh.groupCode})</b></div>
        <div><span style={{opacity:0.8}}>Cùng chi trả:</span> <b>{bh.copayRate}%</b></div>
        <div><span style={{opacity:0.8}}>Nơi ĐK KCB ban đầu:</span> <b>Bệnh viện Đa khoa</b></div>
        <div><span style={{opacity:0.8}}>Khu vực cấp thẻ:</span> <b>{bh.provinceName || 'TP. Hồ Chí Minh'}</b></div>
      </div>
    </div>
  ) : (
    <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'14px 18px',color:'#475569',fontSize:'12.5px',marginTop:'10px',maxWidth:'540px',marginBottom:'18px'}}>
      <b style={{color:'#0f172a'}}>Hình thức KCB: Viện phí (Tự chi trả 100%)</b>
      <p style={{margin:'4px 0 0',fontSize:'11.5px',color:'#64748b'}}>Chưa ghi nhận mã thẻ BHYT liên kết. Quý khách vui lòng xuất trình thẻ BHYT hoặc mã VssID tại quầy Tiếp đón để cập nhật chế độ quyền lợi theo Luật BHYT.</p>
    </div>
  )}

  <h3>Lịch sử lượt khám & số thứ tự · {history.length} lượt</h3>
  {history.length ? (
   <div className="table-scroll" style={{marginTop:'8px'}}>
    <table>
     <thead>
      <tr>
       <th>STT</th>
       <th>NGÀY / GIỜ</th>
       <th>CHUYÊN KHOA & PHÒNG</th>
       <th>BÁC SĨ</th>
       <th>TRẠNG THÁI</th>
      </tr>
     </thead>
     <tbody>
      {history.map(v=><tr key={v.id}>
       <td><span className="badge teal" style={{fontFamily:'monospace',fontWeight:700}}>{v.queueTag||(v.queueNumber?`#${v.queueNumber}`:'—')}</span></td>
       <td><b>{v.date}</b><small>{v.time||'—'} · {v.id}</small></td>
       <td><b>{v.department}</b><small>{v.room||v.department}</small></td>
       <td>{v.doctor||'Chưa phân công'}</td>
       <td><span className="badge gray">{v.status}</span></td>
      </tr>)}
     </tbody>
    </table>
   </div>
  ) : <p>Chưa có lượt khám được ghi nhận.</p>}
 </>}
 {tab==='results'&&<>{data.results.map(r=><article key={r.id} className="portal-record"><h3>Kết quả khám · {r.id}</h3><p>{r.date} · {r.diagnosis}</p><p>Hướng xử trí: {r.outcome}</p><p>Lời dặn: {r.advice||'—'}</p></article>)}{data.labs.map(r=><article key={r.id} className="portal-record"><h3>{r.service} · {r.id}</h3><p>{r.result}</p><p>Kết luận: {r.conclusion}</p><small>Đã phát hành · {r.releasedAt}</small></article>)}{!data.results.length&&!data.labs.length&&<p>Chưa có kết quả được phát hành.</p>}</>}
 {tab==='medicine'&&<>{data.prescriptions.map(r=><article key={r.id} className="portal-record"><h3>Đơn {r.id}</h3><p>{r.diagnosis} · {r.status}</p>{(r.lines||[]).map((l,i)=><p key={i}>{l.name} · {l.quantity} {l.unit} · {l.dose} · {l.days} ngày</p>)}<p>Lời dặn: {r.advice}</p></article>)}{!data.prescriptions.length&&<p>Chưa có đơn thuốc được xác nhận.</p>}</>}
 {tab==='appointments'&&<>{data.appointments.map(a=><article key={a.id} className="portal-record"><h3>{a.dept} · {a.id}</h3><p>{a.day} · {a.time} · {a.status}</p>{a.cancelReason&&<p>Lý do hủy: {a.cancelReason}</p>}{a.status==='Đã xác nhận'&&<button className="secondary" onClick={()=>onCancel(a)}>Hủy lịch hẹn</button>}</article>)}{!data.appointments.length&&<p>Chưa có lịch hẹn.</p>}<button className="primary" onClick={onCreate}>Đặt lịch mới</button></>}
 {tab==='bills'&&<>{data.settlements.map(q=><article key={q.id} className="portal-record"><h3>Quyết toán {q.id}</h3><p>Hồ sơ: {q.episodeId} · {q.status}</p>{q.lines.map((l,i)=><p key={i}>{l.description} · {l.quantity} × {currency(l.price)}</p>)}<p>Tổng: {currency(q.gross)} · BHYT: {currency(q.insurance)}</p><p>Tạm ứng: {currency(q.advance)} · {q.balance<0?'Hoàn lại':'Cần thu'}: {currency(Math.abs(q.balance))}</p><p>Mã chứng từ: {q.receipt}</p></article>)}<h3>Tạm ứng & hoàn tiền</h3>{data.advances.map(a=><p key={a.id}>{a.id} · {a.episodeId} · {a.kind}: {currency(a.amount)} · {a.status}</p>)}{!data.settlements.length&&!data.advances.length&&<p>Chưa có chứng từ viện phí.</p>}</>}
 </div></section>;
}

export default function PatientPortal({requestedTab='',notify=()=>{}}){
 const [data,setData]=useState(null),[tab,setTab]=useState(tabs.some(([key])=>key===requestedTab)?requestedTab:'summary'),[error,setError]=useState(''),[loading,setLoading]=useState(true),[dialog,setDialog]=useState(null),[saving,setSaving]=useState(false),[formError,setFormError]=useState('');
 async function load(){setLoading(true);setError('');try{setData(await hisApi.getPortal())}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 useEffect(()=>{if(tabs.some(([key])=>key===requestedTab))setTab(requestedTab)},[requestedTab]);
 async function save(e){
  e.preventDefault();if(saving)return;const values=Object.fromEntries(new FormData(e.currentTarget));setSaving(true);setFormError('');
  try{await hisApi.portalAppointment(dialog.action==='cancel'?{action:'cancel',id:dialog.row.id,reason:values.reason}:{action:'create',dept:values.dept,day:values.date.slice(0,10),time:values.date.slice(11)});setDialog(null);await load();notify('Đã lưu lịch hẹn trong SQL Server');}catch(error){setFormError(error.message)}finally{setSaving(false)}
 }
 if(loading&&!data)return <p role="status">Đang tải hồ sơ của bạn…</p>;
 if(error)return <section className="panel"><h2>Cổng thông tin người bệnh</h2><p role="alert">{error}</p><button className="secondary" onClick={load}>Thử lại</button></section>;
 return <><PatientPortalView data={data} tab={tab} onTab={setTab} onCreate={()=>{setFormError('');setDialog({action:'create'})}} onCancel={row=>{setFormError('');setDialog({action:'cancel',row})}}/>
 {dialog&&<div className="modal-backdrop"><section className="modal" role="dialog" aria-label={dialog.action==='cancel'?'Hủy lịch hẹn':'Đặt lịch khám'}><button className="close icon-button" aria-label="Đóng lịch hẹn" disabled={saving} onClick={()=>setDialog(null)}>×</button><h2>{dialog.action==='cancel'?'Hủy lịch hẹn':'Đặt lịch khám'}</h2><p>{data.patient.name} · {data.patient.id}</p><form onSubmit={save}>{dialog.action==='cancel'?<label>Lý do hủy<MedicalSuggestInput type="cancel" name="reason" multiline rows={2} required maxLength={500} placeholder="Nhập hoặc chọn lý do hủy lịch hẹn..." /></label>:<><label>Chuyên khoa<select name="dept" required>{clinics.map(c=><option key={c}>{c}</option>)}</select></label><label>Ngày giờ khám<input type="datetime-local" name="date" min={today+'T00:00'} required/></label><p>Giờ hẹn theo các khung 30 phút mà hệ thống đang hỗ trợ.</p></>}{formError&&<p className="form-error" role="alert">{formError}</p>}<button className="primary full" disabled={saving}>{saving?'Đang lưu…':'Xác nhận'}</button></form></section></div>}</>;
}
