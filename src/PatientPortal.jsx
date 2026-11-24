import React,{useEffect,useState} from 'react';
import {hisApi} from './api';
import {clinics,today} from './business-data';
import {parseBhytCard} from './bhyt-utils';
import MedicalSuggestInput from './MedicalSuggestInput';
const currency=n=>Number(n||0).toLocaleString('vi-VN')+' ₫';
const tabs=[['summary','Tổng quan'],['results','Kết quả khám'],['medicine','Đơn thuốc'],['appointments','Lịch hẹn'],['bills','Viện phí']];
export function PatientPortalView({data,tab='summary',onTab=()=>{},onCreate=()=>{},onCancel=()=>{}}){
 const p=data.patient;
 const bh=parseBhytCard(p.insurance);
 return <section className="panel portal-panel"><div className="panel-heading"><div><h2>Cổng thông tin người bệnh</h2><p>Thông tin từ hồ sơ liên kết của bạn · Dữ liệu SQL Server</p></div></div><div className="portal-welcome"><div><span>HỒ SƠ CÁ NHÂN</span><h2>Xin chào, {p.name}</h2><p>{p.id} · {p.gender} · {p.birth} · {p.phone}</p></div></div>
 <div className="business-tabs portal-tabs">{tabs.map(([key,label])=><button key={key} className={tab===key?'selected':''} onClick={()=>onTab(key)}>{label}</button>)}</div>
 <div className="portal-content">
 {tab==='summary'&&<><h3>Lịch sử khám và điều trị · {data.history.length} hồ sơ</h3>{data.history.map(v=><div className="episode-mini" key={v.id}><b>{v.id}</b> · {v.date} · {v.department}<br/>{v.status}</div>)}{!data.history.length&&<p>Chưa có lượt khám được ghi nhận.</p>}
 <h3>Thông tin thẻ Bảo hiểm Y tế & Chế độ KCB</h3>
 {bh.hasInsurance ? (
   <div style={{background:'linear-gradient(135deg, #065f46 0%, #047857 50%, #0f766e 100%)',borderRadius:'10px',padding:'16px 20px',color:'#ffffff',marginTop:'10px',boxShadow:'0 4px 12px rgba(6,95,70,0.15)',maxWidth:'540px'}}>
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
   <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'14px 18px',color:'#475569',fontSize:'12.5px',marginTop:'10px',maxWidth:'540px'}}>
     <b style={{color:'#0f172a'}}>Hình thức KCB: Viện phí (Tự chi trả 100%)</b>
     <p style={{margin:'4px 0 0',fontSize:'11.5px',color:'#64748b'}}>Chưa ghi nhận mã thẻ BHYT liên kết. Quý khách vui lòng xuất trình thẻ BHYT hoặc mã VssID tại quầy Tiếp đón để cập nhật chế độ quyền lợi theo Luật BHYT.</p>
   </div>
 )}
 <p style={{marginTop:'12px',fontSize:'12px',color:'#64748b'}}>Địa chỉ thường trú: <b>{p.address}</b></p>
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
