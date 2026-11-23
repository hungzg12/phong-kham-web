import React,{useState,useEffect,useRef} from 'react';
import {Search,Stethoscope,Save,Plus,Printer,LockKeyhole,ArrowRight,X,Check,FileText,Trash2,BookOpen} from 'lucide-react';
import {useWorkspace,getWorkspace,transact,id,audit,syncLatestPatient,syncWithSqlServer} from './workspace';
import {hisApi} from './api';
import {actorRoles} from './roles';
import {today,clinics} from './business-data';
import {PatientHistory} from './History';
import {clinicalTransaction,saveDeskNote,reopenDeskNote,addDeskServices,saveDeskPrescription,addDeskOrder} from './clinical-desk-store';
import Icd10Search from './Icd10Search';
import Icd10ManagerModal from './Icd10ManagerModal';
import { parseBhytCard, calculateBhytCostBreakdown } from './bhyt-utils';
import SpecialtyExamModule from './SpecialtyExamModules';
import MedicalPaperFormViewer from './MedicalPaperForms';
import './clinical-desk.css';
const money=n=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n||0);
export default function ClinicalDesk({role,notify,navigate,inpatient=false,clinicalContext}){
 const [globalIcd,setGlobalIcd]=useState(false);
 const [patients]=useWorkspace('patients'),[visits]=useWorkspace('visits'),[admissions]=useWorkspace('admissions');const actor=actorRoles[role];
 const episodes=(inpatient?admissions:visits).filter(v=>role!=='doctor'||(v.doctor||'').includes(actor.person)).filter(v=>!clinicalContext?.episodeId||v.id===clinicalContext.episodeId);
 const [selected,setSelected]=useState(''),[query,setQuery]=useState(''),[status,setStatus]=useState(''),[department,setDepartment]=useState(''),[day,setDay]=useState('');const dirty=useRef(false);
 const filtered=episodes.filter(v=>(!status ? v.status!=='Đã hủy' : v.status===status)&&(!department||v.department===department)&&(!day||v.date===day)).filter(v=>(v.id+' '+patients.find(p=>p.id===v.patientId)?.name).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
 const current=filtered.find(v=>v.id===selected)||filtered[0];const patient=patients.find(p=>p.id===current?.patientId);
 function pick(id){if(dirty.current&&!window.confirm('Có nội dung chưa lưu. Bạn muốn bỏ thay đổi để chuyển hồ sơ?'))return;dirty.current=false;setSelected(id)}
 function filter(fn){if(dirty.current&&!window.confirm('Có nội dung chưa lưu. Bạn muốn đổi bộ lọc?'))return;dirty.current=false;fn();setSelected('')}
 return <div className="clinical-desk"><div className="desk-intro"><div><span className="eyebrow">{inpatient?'ĐIỀU TRỊ NỘI TRÚ':'KHÁM BỆNH NGOẠI TRÚ'}</span><h2 style={{margin:0,fontSize:18,fontWeight:700}}>{inpatient?'Bàn điều trị theo đợt':'Bàn làm việc bác sĩ'}</h2></div><div style={{display:'flex',gap:8,alignItems:'center'}}><button type="button" className="secondary" onClick={()=>setGlobalIcd(true)} style={{display:'inline-flex',alignItems:'center',gap:6}}><BookOpen size={15}/>Từ điển ICD-10 & Excel</button>{inpatient&&<button className="secondary" onClick={()=>navigate('care','rounds')}>Danh sách y lệnh & thực hiện<ArrowRight size={14}/></button>}</div></div><div className="desk-layout"><aside className="desk-queue"><div className="desk-queue-title"><Stethoscope size={17}/><b>{inpatient?'Đợt điều trị':'Hàng đợi lượt khám'}</b><span>{filtered.length}</span></div><label className="search"><Search size={15}/><input aria-label="Tìm hồ sơ bàn khám" placeholder="Tên hoặc mã hồ sơ…" value={query} onChange={e=>filter(()=>setQuery(e.target.value))}/></label><div className="desk-filters"><label>Ngày<input aria-label="Ngày hồ sơ" type="date" value={day} onChange={e=>filter(()=>setDay(e.target.value))}/></label><label>Khoa<select aria-label="Khoa bàn khám" value={department} onChange={e=>filter(()=>setDepartment(e.target.value))}><option value="">Tất cả khoa</option>{clinics.map(c=><option key={c}>{c}</option>)}</select></label><label>Trạng thái<select aria-label="Trạng thái bàn khám" value={status} onChange={e=>filter(()=>setStatus(e.target.value))}><option value="">Đang tiếp nhận (ẩn đã hủy)</option>{['Chờ khám','Đang khám','Chờ kết quả','Hoàn tất','Đã hủy'].map(s=><option key={s} value={s}>{s}</option>)}</select></label></div><div className="desk-patient-list">{filtered.map((v,i)=>{const p=patients.find(pat=>pat.id===v.patientId);const age=p?.birth?`${new Date().getFullYear()-Number(String(p.birth).slice(0,4))}T`:'';const gender=p?.gender==='female'||p?.gender==='Nữ'?'Nữ':p?.gender==='male'||p?.gender==='Nam'?'Nam':'';const demo=[age,gender].filter(Boolean).join('·');const isSelected=current?.id===v.id;const statusClass=v.status==='Đang khám'?'teal':v.status==='Chờ khám'?'amber':v.status==='Hoàn tất'?'green':'gray';const isBhyt=p?.insurance&&p?.insurance!=='Không có';return <button key={v.id} aria-pressed={isSelected} onClick={()=>pick(v.id)} title={`${p?.name||'Bệnh nhân'} - ${v.id} (${v.department})`}>
  {/* Line 1: STT + Patient Name + Demographics (Full Width, No Truncation) */}
  <div className="desk-pat-row-top" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:6,width:'100%'}}>
    <div className="desk-pat-top-left" style={{display:'flex',alignItems:'center',gap:6,minWidth:0,flex:1}}>
      <span className="desk-pat-stt" style={{fontSize:'11px',fontWeight:700,padding:'1px 5px',borderRadius:'4px',flexShrink:0}}>{String(i+1).padStart(2,'0')}</span>
      <b className="desk-pat-name" style={{fontSize:'13px',fontWeight:700,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p?.name||'Hồ sơ chưa có tên'}</b>
      {demo&&<span className="desk-pat-demo" style={{fontSize:'11px',color:'#64748b',whiteSpace:'nowrap',flexShrink:0}}>({demo})</span>}
    </div>
  </div>
  {/* Line 2: Department & Time on left, BHYT & Status badge on right */}
  <div className="desk-pat-row-bottom" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:6,width:'100%',fontSize:'11px',color:'#64748b',marginTop:'2px'}}>
    <div className="desk-pat-bottom-left" style={{display:'flex',alignItems:'center',gap:4,minWidth:0,flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
      <span>{v.department}</span><span>·</span><span>{v.time||v.date}</span><span>·</span>
      <span style={{fontFamily:'monospace',fontSize:'10px',color:'#94a3b8'}}>{v.id}</span>
    </div>
    <div style={{display:'flex',alignItems:'center',gap:'4px',flexShrink:0}}>
      {isBhyt?<span style={{fontSize:'9.5px',background:'#ecfdf5',color:'#047857',border:'1px solid #a7f3d0',padding:'1px 5px',borderRadius:'3px',fontWeight:600}}>BHYT</span>:<span style={{fontSize:'9.5px',background:'#f8fafc',color:'#64748b',border:'1px solid #e2e8f0',padding:'1px 5px',borderRadius:'3px'}}>Viện phí</span>}
      <span className={`badge ${statusClass}`} style={{fontSize:'10px',padding:'1px 6px',whiteSpace:'nowrap'}}>{v.status}</span>
    </div>
  </div>
</button>;})}{!filtered.length&&<p className="desk-empty">Không có hồ sơ phù hợp. Thử bỏ bộ lọc.</p>}</div></aside><section className="desk-workspace">{current&&patient?<EpisodeDesk key={current.id} episode={current} patient={patient} role={role} notify={notify} navigate={navigate} inpatient={inpatient} dirtyRef={dirty}/>:<div className="desk-empty"><FileText size={35}/><h3>Chọn hồ sơ để bắt đầu</h3><p>Tạo lượt khám hoặc tiếp nhận nội trú từ Lịch sử khám & điều trị.</p><button className="secondary" onClick={()=>navigate('history')}>Mở lịch sử hồ sơ</button></div>}</section></div>{globalIcd&&<Icd10ManagerModal onClose={()=>setGlobalIcd(false)} notify={notify}/>}</div>
}
function EpisodeDesk({episode,patient,role,notify,navigate,inpatient,dirtyRef}){
 const [printDoc,setPrintDoc]=useState(null);
 const [db]=useWorkspace('business'),[stock]=useWorkspace('stock'),[beds]=useWorkspace('beds');const actor=actorRoles[role];
 const [liveMedicines,setLiveMedicines]=useState([]);
 const [liveServices,setLiveServices]=useState([]);
 useEffect(()=>{
   hisApi.getPharmacyState()
     .then(data=>{setLiveMedicines((data.stock||[]).filter(m=>m.kind==='THUOC'))})
     .catch(()=>{});
   fetch('/api/services')
     .then(r=>r.ok?r.json():[])
     .then(data=>{if(Array.isArray(data)&&data.length)setLiveServices(data)})
     .catch(()=>{});
 },[]);
 const availableMeds=liveMedicines.length?liveMedicines:stock.filter(s=>s.kind==='THUOC'||s.type==='Thuốc');
 const allServices=liveServices.length?liveServices:db.services;
 const sheets=(db.careSheets||[]).filter(s=>s.episodeId===episode.id).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
 const [sheetId,setSheetId]=useState(()=>inpatient?(sheets[0]?.id||''):''),[newSheet,setNewSheet]=useState(false),[tab,setTab]=useState('exam'),[error,setError]=useState(''),[action,setAction]=useState(null),[actionError,setActionError]=useState(''),[showIcdManager,setShowIcdManager]=useState(false);
 const record=inpatient?sheets.find(s=>s.id===sheetId):episode;
 const context={role,inpatient,episodeId:episode.id,patientId:patient.id,sheetId:inpatient?sheetId:null};
 const writable=['admin','doctor'].includes(role)&&!['Đã hủy','Đã ra viện'].includes(episode.status);
 const locked=!!record?.locked,canWrite=writable&&!locked;
 const [note,setNote]=useState(()=>({...record?.note,vitals:{...record?.note?.vitals}})),[revision,setRevision]=useState(record?.revision||0),[noteDirty,setDirty]=useState(false);
 const [serviceSearch,setServiceSearch]=useState(''),[serviceGroup,setServiceGroup]=useState(''),[selectedServices,setSelectedServices]=useState([]),[priority,setPriority]=useState('Thường quy');
 const emptyLine=()=>({medicine:'',quantity:1,dose:'',route:'Uống',frequency:'',days:1,morning:'',noon:'',evening:'',night:''});
 const rxRequest=useRef(null),careRequest=useRef(null),actionRequest=useRef(null);
 const [actionBusy,setActionBusy]=useState(false);
 async function careCall(payload){
  const fingerprint=JSON.stringify(payload);
  if(careRequest.current?.fingerprint!==fingerprint)careRequest.current={fingerprint,key:crypto.randomUUID()};
  const result=await hisApi.inpatientCare({...payload,requestId:careRequest.current.key});
  careRequest.current=null;return result;
 }
 const [lines,setLines]=useState([emptyLine()]),[advice,setAdvice]=useState(''),[rxSearch,setRxSearch]=useState('');
 const [order,setOrder]=useState({kind:'Chăm sóc',medicine:'',quantity:1,dose:'',scheduled:today+'T08:00'});
 const dirty=noteDirty||selectedServices.length>0||lines.some(l=>l.medicine||l.dose||l.frequency)||!!advice.trim()||!!order.dose.trim();
 const linked=key=>(db[key]||[]).filter(r=>r.episodeId===episode.id);
 const labs=linked('labs'),prescriptions=linked('prescriptions'),rounds=linked('rounds'),settlements=linked('settlements'),advances=linked('advances');
 const bed=beds.find(b=>b.admissionId===episode.id);
 useEffect(()=>{dirtyRef.current=dirty;return()=>{dirtyRef.current=false}},[dirty]);
 useEffect(()=>{const unload=e=>{if(dirty){e.preventDefault();e.returnValue=''}};const leave=e=>{if(!dirty||!e.target.closest('.sidebar nav button,.integrated-operation-tabs button,.breadcrumb a,.profile button'))return;if(!window.confirm('Có nội dung chưa lưu trong bàn khám. Bạn muốn rời màn hình?')){e.preventDefault();e.stopPropagation()}else{setDirty(false);dirtyRef.current=false}};window.addEventListener('beforeunload',unload);document.addEventListener('click',leave,true);return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',leave,true)}},[dirty]);
 function change(key,value){setNote(n=>({...n,[key]:value}));setDirty(true);setError('')}
 function handleSpecialtyChange(data){setNote(n=>({...n,specialty:data}));setDirty(true);setError('')}
 function fresh(nextSheet=sheetId){const e=(inpatient?getWorkspace().admissions:getWorkspace().visits).find(v=>v.id===episode.id);const r=inpatient?getWorkspace().business.careSheets?.find(s=>s.id===nextSheet):e;setNote({...r?.note,vitals:{...r?.note?.vitals}});setRevision(r?.revision||0);setDirty(false);setError('')}
 const [saving,setSaving]=useState(false);
 async function save(lock=false){
  if(saving)return;
  setError('');setSaving(true);
  try{
   if(inpatient){
    const saved=await careCall({action:'sheet',id:sheetId||undefined,episodeId:episode.id,note,revision,lock});
    await syncWithSqlServer();setSheetId(saved.id);setNewSheet(false);fresh(saved.id);
    notify(lock?'Đã lưu và khóa tờ điều trị':'Đã lưu tờ điều trị');
   }else{
    const saved=await hisApi.saveExamNote({visitId:episode.id,note,revision,lock,doctorStaffId:episode.doctorStaffId});
    transact(d=>{const index=d.visits.findIndex(v=>v.id===saved.id);if(index>=0)d.visits[index]={...d.visits[index],...saved};syncLatestPatient(d,patient.id);});
    fresh();
    notify(lock?'Đã hoàn tất và khóa phiếu khám trong SQL Server':'Đã lưu nháp phiếu khám trong SQL Server');
   }
  }catch(e){setError(e.message);}
  finally{setSaving(false);}
 }
 useEffect(()=>{
  function shortcut(e){
   if(!canWrite || action) return;
   if(e.key==='F1'){
    e.preventDefault();
    notify('Chưa có trong bản hiện tại: chưa có màn hình hoặc thiết bị nhận cuộc gọi người bệnh.');
   }else if(e.key==='F2'){
    e.preventDefault();
    save(false);
   }else if(e.key==='F3'){
    e.preventDefault();
    setTab('diagnosis');
   }else if(e.key==='F4'){
    e.preventDefault();
    save(true);
   }
  }
  window.addEventListener('keydown',shortcut);
  return()=>window.removeEventListener('keydown',shortcut);
 },[note,revision,action,canWrite,sheetId]);
 function run(fn,message){setError('');try{fn();notify(message);return true}catch(e){setError(e.message);return false}}
 function switchSheet(value){if(dirty&&!window.confirm('Bỏ thay đổi chưa lưu để chuyển tờ điều trị?'))return;setSheetId(value);setNewSheet(!value);fresh(value)}
 function newTreatment(copy=false){if(dirty&&!window.confirm('Bỏ thay đổi chưa lưu để tạo tờ mới?'))return;setSheetId('');setNewSheet(true);setRevision(0);setNote(copy?{...note,date:today,savedAt:undefined,vitals:{}}:{date:today,vitals:{}});setDirty(copy);setTab('exam');setError('')}
 async function doAction(e){e.preventDefault();if(actionBusy)return;setActionBusy(true);setActionError('');const f=Object.fromEntries(new FormData(e.currentTarget));try{if(action==='reopen'){if(inpatient){await careCall({action:'reopen',id:sheetId,episodeId:episode.id,revision,reason:f.reason});await syncWithSqlServer();}else{const saved=await hisApi.saveExamNote({visitId:episode.id,note:record.note,revision,reopen:true,reason:f.reason,doctorStaffId:episode.doctorStaffId});transact(d=>{const index=d.visits.findIndex(v=>v.id===saved.id);if(index>=0)d.visits[index]={...d.visits[index],...saved};syncLatestPatient(d,patient.id);});}fresh()}else if(action==='appointment'){throw new Error('Chưa có trong bản hiện tại: hẹn tái khám được lưu từ bàn bác sĩ. Nhờ tiếp tân đặt lịch theo quy trình hiện có.');}else if(action==='admit'){actionRequest.current ||= crypto.randomUUID();await hisApi.admitInpatient({requestId:actionRequest.current,patientId:patient.id,visitId:episode.id,department:f.department,bedId:f.bedId||null,doctor:episode.doctorStaffId||actor.staffId,diagnosis:note.diagnosis||record?.note?.diagnosis,icdCode:note.icd||null,reason:f.reason});await syncWithSqlServer();}else if(['referral','transfer','defer'].includes(action)){throw new Error(action==='transfer'?'Chưa có trong bản hiện tại: điều chuyển do bác sĩ lưu tại máy chủ. Nhờ tiếp tân điều chuyển theo quy trình hiện có.':'Chưa có trong bản hiện tại: thao tác này chưa có API lưu từ bàn bác sĩ. Nội dung chưa được lưu.');}actionRequest.current=null;setAction(null);notify('Đã lưu thao tác trên hồ sơ')}catch(e){setActionError(e.message)}finally{setActionBusy(false)}}
 const services=allServices.filter(s=>(s.status==='Đang hoạt động'||s.categoryRaw)&&(!serviceGroup||s.kind===serviceGroup)&&(s.name+' '+s.id).toLowerCase().includes(serviceSearch.toLowerCase()));
 const charges=[...labs.filter(r=>r.status!=='Đã hủy').map(r=>({id:r.id,name:db.services.find(s=>s.id===r.service)?.name||r.service,amount:Number(r.price??db.services.find(s=>s.id===r.service)?.price)||0,status:r.status})),...linked('clinicalCharges').filter(r=>r.status!=='Đã hủy').map(r=>({id:r.id,name:db.services.find(s=>s.id===r.service)?.name||r.service,amount:r.price*r.quantity,status:r.status}))];
 return <><header className="desk-identity"><div><span className="desk-avatar">{patient.name.split(' ').slice(-2).map(s=>s[0]).join('')}</span><div><h3>{patient.name}</h3><p>{patient.id} · {patient.gender} · {patient.birth?.split('-').reverse().join('/')}</p></div></div><div className="desk-identity-grid"><span><small>{inpatient?'Mã đợt điều trị':'Mã lượt khám'}</small><b>{episode.id}</b></span><span><small>Khoa / bác sĩ</small><b>{episode.department} · {episode.doctor}</b></span><span><small>{inpatient?'Buồng giường':'Đối tượng'}</small><b>{inpatient?(bed?'Giường '+bed.id:'Chưa có giường'):patient.insurance?(() => { const bh = parseBhytCard(patient.insurance); return `BHYT ${bh.rate}% (${bh.code})`; })():'Viện phí'}</b></span><span><small>Trạng thái</small><b>{episode.status}</b></span></div><div className="desk-safety"><ShieldNotice patient={patient} db={db}/></div></header>
 {inpatient&&<div className="desk-sheet-picker"><label>Tờ điều trị<select aria-label="Tờ điều trị đang xem" value={sheetId} onChange={e=>switchSheet(e.target.value)}><option value="">{newSheet?'Tờ mới chưa lưu':'Chưa chọn tờ điều trị'}</option>{sheets.map(s=><option key={s.id} value={s.id}>{s.date} · {s.id} · {s.locked?'Đã khóa':'Nháp'}</option>)}</select></label>{writable&&<><button className="secondary" onClick={()=>newTreatment(false)}><Plus size={14}/>Tờ mới</button><button className="secondary" disabled={!record?.note} onClick={()=>newTreatment(true)}>Sao chép thành nháp</button></>}</div>}
 <div className="desk-document-state"><span>{locked?<><LockKeyhole size={13}/>Đã khóa · Phiên bản {revision}</>:dirty?'Có nội dung chưa lưu':record?.note?'Đã lưu · Phiên bản '+revision:'Chưa lưu phiếu'}</span>{locked&&writable&&<button className="text-button" onClick={()=>setAction('reopen')}>Mở đính chính có lý do</button>}{!writable&&<span>Chế độ chỉ xem</span>}</div>
 <div className="desk-tabs" role="tablist" aria-label="Các phần hồ sơ">{[['exam',inpatient?'Tờ điều trị':'Khám lâm sàng & Chuyên khoa'],['diagnosis','Chẩn đoán'],['services','Chỉ định dịch vụ'],['results','Kết quả CLS'],['rx','Đơn thuốc'],...(inpatient?[['orders','Y lệnh & cữ thực hiện']]:[]),['costs','Chi phí'],['history','Lịch sử']].map(([key,title])=><button role="tab" aria-selected={tab===key} key={key} onClick={()=>{setTab(key);setError('')}}>{title}</button>)}</div>
 <div className="desk-tab-panel">
 {tab==='exam'&&<><div className="desk-section-heading"><h3>{inpatient?'Diễn biến & kế hoạch điều trị':'Khám lâm sàng & Đặc thù Chuyên khoa'}</h3><span>Phiếu khám điện tử chuyên sâu</span></div><fieldset disabled={!canWrite} className="desk-fields"><div className="desk-field-grid">{inpatient&&<label>Ngày điều trị<input type="date" value={note.date||today} onChange={e=>change('date',e.target.value)}/></label>}<label>Lý do khám / vào viện<input value={note.reason||episode.reason||''} onChange={e=>change('reason',e.target.value)}/></label><label>Tiền sử / thuốc đang sử dụng<input value={note.history||''} onChange={e=>change('history',e.target.value)}/></label></div><label>{inpatient?'Diễn biến bệnh':'Triệu chứng / bệnh sử'}<textarea value={note.symptoms||''} onChange={e=>change('symptoms',e.target.value)} placeholder="Ghi nhận nội dung khám…"/></label><label>Khám toàn thân & Thể trạng chung<textarea value={note.examination||''} onChange={e=>change('examination',e.target.value)}/></label><SpecialtyExamModule roomCode={episode.roomCode} department={episode.department} specialtyData={note.specialty || {}} onChange={handleSpecialtyChange} disabled={!canWrite}/><h4>Chỉ số sinh tồn</h4><div className="desk-vitals">{[['pressure','Huyết áp (mmHg)','text'],['pulse','Mạch (lần/phút)','number'],['temperature','Nhiệt độ (°C)','number'],['respiration','Nhịp thở (lần/phút)','number'],['height','Chiều cao (cm)','number'],['weight','Cân nặng (kg)','number'],['spo2','SpO₂ (%)','number']].map(([key,label,type])=><label key={key}>{label}<input type={type} min={type==='number'?0:undefined} step="any" value={note.vitals?.[key]||''} onChange={e=>{setNote(n=>({...n,vitals:{...n.vitals,[key]:e.target.value}}));setDirty(true)}}/></label>)}<label>BMI<output>{Number(note.vitals?.height)>0&&Number(note.vitals?.weight)>0?(Number(note.vitals.weight)/(Number(note.vitals.height)/100)**2).toFixed(2):'—'}</output></label></div><label>Hướng điều trị / chăm sóc<textarea value={note.plan||''} onChange={e=>change('plan',e.target.value)}/></label><label>Hướng xử trí<select value={note.outcome||(inpatient?'Tiếp tục điều trị nội trú':'Điều trị ngoại trú')} onChange={e=>change('outcome',e.target.value)}>{(inpatient?['Tiếp tục điều trị nội trú','Đề nghị hội chẩn','Đề nghị ra viện','Chuyển tuyến']:['Điều trị ngoại trú','Chờ kết quả CLS','Chỉ định nhập viện','Chuyển tuyến']).map(s=><option key={s}>{s}</option>)}</select></label></fieldset></>}
 {tab==='diagnosis'&&<fieldset disabled={!canWrite} className="desk-fields"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><h3 style={{margin:0}}>Chẩn đoán theo mã bệnh ICD-10 (Bộ Y tế)</h3>{note.icd&&<span className="badge teal" style={{fontFamily:'monospace'}}>Mã ICD: {note.icd}</span>}</div><label>Chẩn đoán bệnh chính (Tra cứu mã ICD-10 từ CSDL)<Icd10Search valueCode={note.icd||''} valueName={note.diagnosis||''} onChange={({code,name})=>{change('icd',code);change('diagnosis',name);}} onOpenManager={()=>setShowIcdManager(true)} disabled={!canWrite}/></label><label>Bệnh kèm theo / Biến chứng (Mã hoặc tên bệnh phụ)<textarea value={note.comorbidities||''} onChange={e=>change('comorbidities',e.target.value)} placeholder="Nhập các mã bệnh kèm theo, ví dụ: E11.9 (Đái tháo đường type 2), K29.7 (Đau dạ dày)..."/></label><label>Lời dặn của bác sĩ sau khám<textarea value={note.advice||''} onChange={e=>change('advice',e.target.value)} placeholder="Chế độ dinh dưỡng, vận động, kiêng cữ và hẹn tái khám..."/></label>{showIcdManager&&<Icd10ManagerModal onClose={()=>setShowIcdManager(false)} notify={notify}/>}</fieldset>}
 {tab==='services'&&<><div className="desk-section-heading"><h3>Chỉ định theo lượt / đợt đang chọn</h3><span>{episode.id}</span></div><button className="secondary" disabled={!canWrite} onClick={()=>setAction('package')}>Chọn gói dịch vụ mẫu</button><div className="desk-service-layout"><div><label>Tìm dịch vụ<input placeholder="Tên hoặc mã dịch vụ" value={serviceSearch} onChange={e=>setServiceSearch(e.target.value)}/></label><select aria-label="Nhóm dịch vụ bàn khám" value={serviceGroup} onChange={e=>setServiceGroup(e.target.value)}><option value="">Tất cả nhóm</option>{[...new Set(allServices.map(s=>s.kind))].map(s=><option key={s}>{s}</option>)}</select><div className="desk-service-list">{services.map(s=><label key={s.id}><input type="checkbox" disabled={!canWrite} checked={selectedServices.includes(s.id)} onChange={e=>setSelectedServices(old=>e.target.checked?[...old,s.id]:old.filter(x=>x!==s.id))}/><span><b>{s.name}</b><small>{s.id} · {s.kind}</small></span><strong>{money(s.price)}</strong></label>)}</div></div><div className="desk-service-basket"><h4>Phiếu đang chọn · {selectedServices.length} dịch vụ</h4>{selectedServices.map(s=>allServices.find(x=>x.id===s)).filter(Boolean).map(s=><p key={s.id}><span>{s.name}</span><b>{money(s.price)}</b></p>)}{(()=>{
  const bh = parseBhytCard(patient.insurance);
  const totalGross = selectedServices.reduce((a,id)=>a+Number(allServices.find(s=>s.id===id)?.price||0),0);
  const bhytPay = bh.hasInsurance ? Math.round((totalGross * bh.rate) / 100) : 0;
  const ptPay = totalGross - bhytPay;
  return <>
    <p><b>Tổng dự kiến:</b><b>{money(totalGross)}</b></p>
    {bh.hasInsurance ? (
      <>
        <p style={{fontSize:'12px',color:'#047857'}}><span>Quỹ BHYT ({bh.rate}%):</span><b>{money(bhytPay)}</b></p>
        <p style={{fontSize:'12px',color:'#1d4ed8'}}><span>BN cùng chi trả:</span><b>{money(ptPay)}</b></p>
      </>
    ) : (
      <p style={{fontSize:'12px',color:'#475569'}}><span>Chế độ:</span><b>Viện phí 100%</b></p>
    )}
  </>;
})()}<label>Ưu tiên<select value={priority} onChange={e=>setPriority(e.target.value)}><option>Thường quy</option><option>Khẩn cấp</option></select></label><p className="desk-muted">Đơn giá chuẩn kỹ thuật từ CSDL SQL Server.</p><button className="primary" disabled={!canWrite||!selectedServices.length} onClick={async()=>{setError('');try{await hisApi.createLabOrders({episodeId:episode.id,patient:patient.id,role,staffId:actor.staffId,diagnosis:note.diagnosis,priority,services:selectedServices});await syncWithSqlServer();setSelectedServices([]);notify('Đã lưu chỉ định CLS trong SQL Server');}catch(e){setError(e.message)}}}>Lưu chỉ định</button></div></div><RecordList rows={charges} columns={[['id','Mã phiếu'],['name','Dịch vụ'],['status','Trạng thái']]}/></>}
 {tab==='results'&&<><div className="desk-section-heading"><h3>Kết quả cận lâm sàng của hồ sơ</h3><button className="text-button" onClick={()=>navigate('clinical')}>Mở Bàn làm việc CLS & CĐHA<ArrowRight size={13}/></button></div>{labs.map(l=><article className="desk-result" key={l.id}><div><h4>{db.services.find(s=>s.id===l.service)?.name||l.service}</h4><span className="badge gray">{l.status}</span></div><small>{l.id} · {l.episodeId}</small>{l.status==='Đã phát hành'?<><p>{l.result||'Chưa có nội dung kết quả'}</p><p><b>Kết luận:</b> {l.conclusion||'—'}</p>{l.critical==='Có'&&<p className="desk-warning">Có cảnh báo nguy kịch đã ghi nhận trong dữ liệu mẫu.</p>}</>:<p className="desk-muted">{['admin','doctor'].includes(role)&&l.result?'Bản nháp chưa phát hành: '+l.result:'Chưa có kết quả được phát hành.'}</p>}</article>)}{!labs.length&&<p className="desk-empty">Chưa có chỉ định cận lâm sàng cho hồ sơ này.</p>}</>}
 {tab==='rx'&&(()=>{
  const bh = parseBhytCard(patient.insurance);
  return <><div className="desk-section-heading"><h3>Kê đơn thuốc</h3><span>Kết nối CSDL & Kho FEFO</span></div>
  <div style={{background:bh.hasInsurance?'#f0fdf4':'#f8fafc',border:bh.hasInsurance?'1px solid #bbf7d0':'1px solid #e2e8f0',borderRadius:'8px',padding:'10px 14px',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
    <div>
      <b style={{fontSize:'12.5px',color:bh.hasInsurance?'#166534':'#334155'}}>
        {bh.hasInsurance ? `Đơn thuốc BHYT: ${bh.groupName} (${bh.groupCode}) · Thẻ: ${bh.code}` : 'Đơn thuốc Viện phí: Khám tự chi trả 100%'}
      </b>
      <p style={{margin:'2px 0 0',fontSize:'11.5px',color:bh.hasInsurance?'#15803d':'#64748b'}}>
        {bh.hasInsurance ? `Mức hưởng BHYT: Quỹ chi trả ${bh.rate}%, Người bệnh cùng chi trả ${bh.copayRate}% (Danh mục BHYT)` : 'Thuốc tính theo đơn giá niêm yết của Bệnh viện, thanh toán tại Quầy thu ngân.'}
      </p>
    </div>
    <span className={`badge ${bh.hasInsurance ? bh.benefitBadgeClass : 'gray'}`}>
      {bh.hasInsurance ? bh.benefitBadge : 'Viện phí 100%'}
    </span>
  </div><fieldset className="desk-fields" disabled={!canWrite}><label>Tìm thuốc trong danh mục<input value={rxSearch} onChange={e=>setRxSearch(e.target.value)} placeholder="Tên thuốc / mã thuốc"/></label>{lines.map((line,i)=>{const med=availableMeds.find(s=>s.id===line.medicine);const stockQty=med?.stockQty!==undefined?med.stockQty:(stock.find(s=>s.id===line.medicine)?.quantity??null);const isZero=med&&stockQty!==null&&stockQty<=0;const isOver=med&&stockQty!==null&&stockQty>0&&Number(line.quantity)>stockQty;return <div className="desk-rx-line" key={i}><div className="desk-section-heading"><b>Thuốc {i+1}</b><button type="button" className="icon-button" aria-label={'Xóa dòng thuốc '+(i+1)} disabled={lines.length===1} onClick={()=>setLines(lines.filter((_,j)=>j!==i))}><Trash2 size={15}/></button></div><div className="desk-field-grid"><label>Thuốc<select aria-label={'Thuốc '+(i+1)} value={line.medicine} onChange={e=>setLines(lines.map((l,j)=>j===i?{...l,medicine:e.target.value,unit:''}:l))}><option value="">Chọn thuốc</option>{availableMeds.filter(s=>!rxSearch||s.id===line.medicine||(s.name+s.id).toLowerCase().includes(rxSearch.toLowerCase())).map(s=><option key={s.id} value={s.id}>{s.name} · {s.unit}{s.stockQty!==undefined?` (Tồn: ${s.stockQty})`:''}</option>)}</select></label><label>Đơn vị kê<select aria-label={'Đơn vị thuốc '+(i+1)} value={line.unit||''} onChange={e=>setLines(lines.map((l,j)=>j===i?{...l,unit:e.target.value}:l))}><option value="">{med?.unit||'Đơn vị cơ sở'}</option>{(med?.units||[]).map(u=><option key={u.unit} value={u.unit}>{u.unit} · {u.factor} đơn vị cơ sở</option>)}</select></label>{[['quantity','Số lượng','number'],['dose','Liều dùng','text'],['frequency','Tần suất','text'],['days','Số ngày','number']].map(([key,label,type])=><label key={key}>{label}<input aria-label={label+' thuốc '+(i+1)} type={type} min={type==='number'?1:undefined} value={line[key]} onChange={e=>setLines(lines.map((l,j)=>j===i?{...l,[key]:e.target.value}:l))}/></label>)}<label>Đường dùng<select value={line.route} onChange={e=>setLines(lines.map((l,j)=>j===i?{...l,route:e.target.value}:l))}>{['Uống','Tiêm','Truyền','Bôi','Khác'].map(r=><option key={r}>{r}</option>)}</select></label></div>{isZero&&<div style={{margin:'6px 0 0',padding:'3px 8px',background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',borderRadius:'4px',fontSize:'11.5px',display:'inline-flex',alignItems:'center',gap:'5px',fontWeight:500}}>⚠️ Hết hàng trong kho (Tồn: 0) — Cần chọn thuốc thay thế</div>}{isOver&&<div style={{margin:'6px 0 0',padding:'3px 8px',background:'#fffbeb',border:'1px solid #fde68a',color:'#b45309',borderRadius:'4px',fontSize:'11.5px',display:'inline-flex',alignItems:'center',gap:'5px',fontWeight:500}}>⚠️ Tồn kho khả dụng chỉ còn {stockQty} {line.unit||med.unit||'đơn vị'} — Số lượng kê vượt tồn</div>}<div className="desk-dose-times" style={{marginTop:10}}>{[['morning','Sáng'],['noon','Trưa'],['evening','Chiều'],['night','Tối']].map(([key,label])=><label key={key}>{label}<input value={line[key]} onChange={e=>setLines(lines.map((l,j)=>j===i?{...l,[key]:e.target.value}:l))}/></label>)}</div></div>;})}<button className="secondary" onClick={()=>setLines([...lines,emptyLine()])}><Plus size={14}/>Thêm thuốc</button><label>Lời dặn cho đơn thuốc<textarea value={advice} onChange={e=>setAdvice(e.target.value)} placeholder="Uống sau ăn no, uống nhiều nước..."/></label><button className="primary" disabled={saving} onClick={async()=>{if(saving)return;const overLines=lines.filter(l=>{if(!l.medicine)return false;const m=availableMeds.find(s=>s.id===l.medicine);const q=m?.stockQty!==undefined?m.stockQty:(stock.find(s=>s.id===l.medicine)?.quantity??null);return q!==null&&Number(l.quantity)>q;});if(overLines.length>0){const overNames=overLines.map(l=>availableMeds.find(s=>s.id===l.medicine)?.name||l.medicine).join(', ');if(!window.confirm(`Cảnh báo tồn kho:\nThuốc [${overNames}] kê vượt quá tồn kho khả dụng hiện tại.\n\nBạn có muốn tiếp tục lưu đơn nháp này sang quầy Dược?`))return;}setSaving(true);setError('');const body={action:'savePrescription',role,staffId:actor.staffId,patient:patient.id,episodeId:episode.id,diagnosis:note.diagnosis,advice,lines};const signature=JSON.stringify(body);if(rxRequest.current?.signature!==signature)rxRequest.current={signature,key:crypto.randomUUID()};try{await hisApi.pharmacyAction({...body,requestId:rxRequest.current.key});rxRequest.current=null;await syncWithSqlServer();setLines([emptyLine()]);setAdvice('');notify('Đã lưu đơn nháp. Duyệt đơn để chuyển đến dược sĩ.');}catch(e){setError(e.message)}finally{setSaving(false)}}}>Lưu đơn thuốc</button></fieldset><h4 className="desk-subheading">Các đơn của hồ sơ</h4>{prescriptions.map(r=><article className="desk-result" key={r.id}><div><b>{r.id}</b><span className="badge gray">{r.status}</span></div><p>{r.diagnosis} · {r.advice}</p>{r.lines.map((l,i)=><p key={i}>{stock.find(s=>s.id===l.medicine)?.name||l.medicine} · {l.quantity} · {l.dose} · {l.frequency} · {l.days} ngày</p>)}{canWrite&&<button className="text-button" onClick={()=>{if(lines.some(l=>l.medicine)&&!window.confirm('Thay đơn đang soạn bằng bản sao?'))return;setLines(r.lines.map(l=>({...emptyLine(),...l})));setAdvice(r.advice||'');notify('Đã sao chép vào bản nháp, chưa lưu đơn mới')}}>Sao chép thành đơn nháp</button>}{canWrite&&r.status==='Nháp'&&<button className="primary" disabled={saving} onClick={async()=>{if(saving)return;setSaving(true);setError('');try{await hisApi.pharmacyAction({action:'approvePrescription',id:r.id,role,staffId:actor.staffId,requestId:'approve-'+r.id});await syncWithSqlServer();notify('Đã duyệt đơn thuốc và chuyển đến dược sĩ.');}catch(e){setError(e.message)}finally{setSaving(false)}}}>Duyệt đơn thuốc</button>}<button className="text-button" onClick={()=>setPrintDoc({type:'rx',prescription:r})}><Printer size={13}/>In đơn thuốc</button><button className="text-button" onClick={()=>navigate('pharmacy')}>Mở Quầy Dược & Cấp phát thuốc<ArrowRight size={13}/></button></article>)}{!prescriptions.length&&<p className="desk-muted">Chưa có đơn thuốc.</p>}</>;})()}
 {tab==='orders'&&<><h3>Y lệnh của tờ điều trị</h3><p className="desk-muted">Mỗi dòng là một cữ dự kiến. Tạo nhiều dòng nếu có nhiều cữ; điều dưỡng thực hiện và ghi nhận qua danh sách y lệnh.</p><fieldset disabled={!canWrite||!sheetId} className="desk-fields"><div className="desk-field-grid"><label>Loại y lệnh<select value={order.kind} onChange={e=>setOrder({...order,kind:e.target.value})}>{['Chăm sóc','Dùng thuốc','Theo dõi sinh hiệu','Thủ thuật'].map(k=><option key={k}>{k}</option>)}</select></label><label>Thời gian dự kiến<input aria-label="Thời gian cữ y lệnh" type="datetime-local" value={order.scheduled} onChange={e=>setOrder({...order,scheduled:e.target.value})}/></label>{order.kind==='Dùng thuốc'&&<><label>Thuốc<select value={order.medicine} onChange={e=>setOrder({...order,medicine:e.target.value})}><option value="">Chọn thuốc</option>{stock.filter(s=>s.kind==='THUOC'||s.type==='Thuốc').map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>Số lượng<input type="number" min="1" value={order.quantity} onChange={e=>setOrder({...order,quantity:e.target.value})}/></label></>}</div><label>Nội dung / hướng dẫn<input value={order.dose} onChange={e=>setOrder({...order,dose:e.target.value})}/></label><button className="primary" onClick={async()=>{try{setError('');await careCall({action:'order',episodeId:episode.id,sheetId,order});await syncWithSqlServer();setOrder({...order,dose:''});notify('Đã lưu y lệnh');}catch(e){setError(e.message)}}}>Thêm cữ thực hiện</button></fieldset>{!sheetId&&<p className="desk-warning">Lưu tờ điều trị trước khi thêm y lệnh.</p>}<RecordList rows={rounds.filter(r=>r.sheetId===sheetId)} columns={[['id','Mã y lệnh'],['kind','Loại'],['scheduled','Dự kiến'],['dose','Hướng dẫn'],['status','Trạng thái']]}/><button className="secondary" onClick={()=>navigate('care','rounds')}>Mở danh sách thực hiện y lệnh</button></>}
 {tab==='costs'&&(()=>{
  const bh = parseBhytCard(patient.insurance);
  const serviceItems = charges.map(c => ({
    id: c.id,
    name: c.name,
    type: 'Dịch vụ CLS / Khám',
    quantity: 1,
    unit: 'Lần',
    price: c.amount,
    inBhytList: (db.services.find(s=>s.id===c.service||s.name===c.name)?.insurancePrice > 0) || (db.services.find(s=>s.id===c.service||s.name===c.name)?.inBhyt !== false),
    status: c.status
  }));
  const rxItems = prescriptions.flatMap(rx => (rx.lines || []).map((line, idx) => {
    const m = availableMeds.find(s => s.id === line.medicine) || stock.find(s => s.id === line.medicine);
    const price = Number(m?.price || m?.cost || 2500);
    const qty = Number(line.quantity || 1);
    return {
      id: `${rx.id}-${idx + 1}`,
      name: m?.name || line.medicine,
      type: 'Thuốc điều trị',
      quantity: qty,
      unit: line.unit || m?.unit || 'Viên',
      price,
      inBhytList: (m?.insurancePrice !== undefined && m.insurancePrice > 0) || (m?.inBhyt !== false),
      status: rx.status
    };
  }));
  const allItems = [...serviceItems, ...rxItems];
  const breakdown = calculateBhytCostBreakdown(allItems, patient.insurance, true);
  const totalAdvance = advances.filter(a => a.status === 'Đã xác nhận').reduce((s, a) => s + (a.kind === 'Hoàn tiền' ? -1 : 1) * Number(a.amount), 0);
  const finalDue = breakdown.totalPatientDue - totalAdvance;
  return <>
    <div className="desk-section-heading"><h3>Bảng kê chi phí KCB & Quyền lợi Bảo hiểm Y tế</h3><span>Quy chuẩn Bộ Y tế & BHXH</span></div>
    <div style={{background:bh.hasInsurance?'#f0fdf4':'#f8fafc',border:bh.hasInsurance?'1px solid #bbf7d0':'1px solid #e2e8f0',borderRadius:'8px',padding:'12px 16px',marginBottom:'14px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
      <div>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'3px'}}>
          <b style={{fontSize:'13px',color:bh.hasInsurance?'#166534':'#334155'}}>{bh.hasInsurance?`Đối tượng BHYT: ${bh.groupName} (${bh.groupCode})`:'Đối tượng: Viện phí (Khám tự chi trả)'}</b>
          <span className={`badge ${bh.hasInsurance?bh.benefitBadgeClass:'gray'}`} style={{fontSize:'10px'}}>{bh.hasInsurance?bh.benefitBadge:'Viện phí 100%'}</span>
        </div>
        <p style={{margin:0,fontSize:'12px',color:bh.hasInsurance?'#15803d':'#64748b'}}>{bh.hasInsurance?`Mã thẻ: ${bh.code} · Tỉnh/TP cấp: ${bh.provinceName||'TP. Hồ Chí Minh'} · Tuyến: Đúng tuyến KCB`:'Người bệnh tự chi trả toàn bộ chi phí theo bảng giá niêm yết của Bệnh viện.'}</p>
      </div>
      <div style={{textAlign:'right'}}>
        <span style={{fontSize:'11px',color:'#64748b'}}>Tỷ lệ Quỹ BHYT chi trả:</span>
        <div style={{fontSize:'16px',fontWeight:700,color:bh.hasInsurance?'#059669':'#0f766e'}}>{bh.rate}%</div>
        {bh.hasInsurance&&<small style={{fontSize:'11px',color:'#64748b'}}>Cùng chi trả: {bh.copayRate}%</small>}
      </div>
    </div>
    <div className="desk-cost-summary" style={{gridTemplateColumns:'repeat(5, minmax(0, 1fr))',gap:'8px'}}>
      <article><span>1. Tổng chi phí KCB</span><b style={{color:'#0f172a'}}>{money(breakdown.gross)}</b></article>
      <article style={{background:'#ecfdf5',borderColor:'#a7f3d0'}}><span style={{color:'#047857'}}>2. Quỹ BHYT chi trả</span><b style={{color:'#047857'}}>{money(breakdown.totalBhytPaid)}</b></article>
      <article style={{background:'#eff6ff',borderColor:'#bfdbfe'}}><span style={{color:'#1d4ed8'}}>3. Người bệnh trả</span><b style={{color:'#1d4ed8'}}>{money(breakdown.totalPatientDue)}</b></article>
      <article><span>4. Tạm ứng đã nộp</span><b>{money(totalAdvance)}</b></article>
      <article style={{background:finalDue>0?'#fffbeb':'#f8fafc',borderColor:finalDue>0?'#fde68a':'#e2e8f0'}}><span style={{color:finalDue>0?'#b45309':'#475569'}}>{finalDue>=0?'5. Còn phải nộp':'5. Hoàn lại BN'}</span><b style={{color:finalDue>0?'#b45309':'#059669'}}>{money(Math.abs(finalDue))}</b></article>
    </div>
    <div className="table-scroll desk-records" style={{marginTop:'14px'}}>
      <table>
        <thead>
          <tr>
            <th>Khoản mục / Dịch vụ / Thuốc</th>
            <th>Phân loại</th>
            <th style={{textAlign:'center'}}>SL</th>
            <th style={{textAlign:'right'}}>Đơn giá (₫)</th>
            <th style={{textAlign:'right'}}>Thành tiền (₫)</th>
            <th style={{textAlign:'right'}}>BHYT trả (₫)</th>
            <th style={{textAlign:'right'}}>BN cùng trả (₫)</th>
            <th style={{textAlign:'center'}}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.itemized.map((item,idx)=>(
            <tr key={item.id||idx}>
              <td><b>{item.name}</b></td>
              <td><span style={{fontSize:'11px',color:'#64748b'}}>{item.type}</span></td>
              <td style={{textAlign:'center'}}>{item.quantity} {item.unit}</td>
              <td style={{textAlign:'right'}}>{money(item.price)}</td>
              <td style={{textAlign:'right',fontWeight:600}}>{money(item.itemGross)}</td>
              <td style={{textAlign:'right',color:'#047857',fontWeight:600}}>{money(item.bhytAmount)}</td>
              <td style={{textAlign:'right',color:'#1d4ed8',fontWeight:600}}>{money(item.patientAmount)}</td>
              <td style={{textAlign:'center'}}><span className="badge teal" style={{fontSize:'10px'}}>{item.status||'Hợp lệ'}</span></td>
            </tr>
          ))}
          {!breakdown.itemized.length&&(
            <tr><td colSpan={8} style={{textAlign:'center',padding:'18px',color:'#94a3b8'}}>Chưa có chỉ định dịch vụ hoặc đơn thuốc nào được lập cho hồ sơ này.</td></tr>
          )}
        </tbody>
      </table>
    </div>
    {settlements.map(s=><article className="desk-result" key={s.id} style={{marginTop:'10px'}}><b>Quyết toán viện phí: {s.id} · {s.status}</b><p>Tổng: {money(s.gross)} · BHYT: {money(s.insurance)} · Còn lại: {money(s.balance)}</p></article>)}
    {['admin','cashier'].includes(role)&&<button className="secondary" style={{marginTop:'10px'}} onClick={()=>navigate('finance','settlements',{patientId:patient.id,episodeId:episode.id})}>Mở quyết toán & thu tiền</button>}
  </>;
})()}
 {tab==='history'&&<><PatientHistory patientId={patient.id} clinical/><h4 className="desk-subheading">Phiên bản phiếu đang xem</h4>{(record?.revisions||[]).map((r,i)=><article className="desk-result" key={i}><b>Phiên bản {r.revision} · {r.savedAt}</b><p>{r.diagnosis} · {r.symptoms}</p></article>)}{record?.corrections?.map((r,i)=><p key={i} className="desk-muted">Đính chính: {r.reason} · {r.time}</p>)}</>}
 {error&&<p role="alert" className="form-error">{error}</p>}</div>
 <footer className="desk-toolbar"><div><button className="secondary" onClick={()=>setPrintDoc({type:'summary'})}><Printer size={15}/>In tóm tắt bệnh án</button>{writable&&!inpatient&&<><button className="secondary" disabled={locked} title="Chưa kết nối màn hình hoặc thiết bị gọi người bệnh" onClick={()=>notify('Chưa có trong bản hiện tại: chưa có nơi nhận cuộc gọi người bệnh.')}>Gọi người bệnh</button><button className="secondary" disabled={locked} onClick={()=>setAction('transfer')}>Chuyển phòng</button><button className="secondary" onClick={()=>setAction('appointment')}>Hẹn tái khám</button><button className="secondary" onClick={()=>setAction('admit')}>Nhập viện</button><button className="secondary" onClick={()=>setAction('referral')}>Chuyển tuyến</button><button className="secondary" disabled={locked} onClick={()=>setAction('defer')}>Hoãn khám</button></>}</div>{writable&&<div><button className="secondary" disabled={locked||saving} title="Phím tắt F2" onClick={()=>save(false)}><Save size={15}/>Lưu nháp (F2)</button><button className="primary" disabled={locked||saving} title="Phím tắt F4" onClick={()=>save(true)}><Check size={15}/>{inpatient?'Duyệt & khóa tờ (F4)':'Kết thúc & khóa khám (F4)'}</button></div>}</footer>
 {action&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setAction(null)}}><section className="modal" role="dialog" aria-modal="true" aria-label="Thao tác hồ sơ"><button className="close icon-button" aria-label="Đóng thao tác hồ sơ" onClick={()=>setAction(null)}><X size={19}/></button><h2>{{reopen:'Mở đính chính hồ sơ',appointment:'Hẹn tái khám',admit:'Tiếp nhận nội trú',referral:'Chuyển tuyến',defer:'Hoãn khám',transfer:'Chuyển phòng khám',package:'Chọn gói dịch vụ mẫu'}[action]}</h2><p className="dialog-subtitle">{patient.name} · {episode.id}</p>{['appointment','transfer','referral','defer'].includes(action)?<><p className="desk-warning" role="status">{action==='appointment'?'Hẹn tái khám từ bàn bác sĩ chưa được hỗ trợ. Nhờ tiếp tân tạo lịch hẹn trong màn hình Lịch hẹn hiện có.':action==='transfer'?'Điều chuyển từ bàn bác sĩ chưa được hỗ trợ. Nhờ tiếp tân dùng thao tác điều chuyển lượt khám hiện có.':action==='referral'?'Chưa có trong bản hiện tại: phiếu chuyển tuyến chưa có API lưu từ bàn bác sĩ.':'Chưa có trong bản hiện tại: hoãn khám chưa có quy trình lưu tại máy chủ.'}</p><button className="secondary" onClick={()=>setAction(null)}>Đóng</button></>:action==='package'?<><p className="desk-warning">Gói minh họa để chọn nhanh. Không phải khuyến cáo chỉ định; kiểm tra từng dịch vụ trước khi lưu.</p>{['Khám bệnh','Xét nghiệm','Chẩn đoán hình ảnh'].map(kind=><div className="desk-result" key={kind}><b>{kind}</b>{db.services.filter(s=>s.kind===kind&&s.status==='Đang hoạt động').map(s=><label key={s.id} className="desk-package-option"><input type="checkbox" checked={selectedServices.includes(s.id)} onChange={e=>setSelectedServices(old=>e.target.checked?[...old,s.id]:old.filter(id=>id!==s.id))}/>{s.name} · {money(s.price)}</label>)}</div>)}<button className="primary full" onClick={()=>setAction(null)}>Đưa lựa chọn vào phiếu đang soạn</button></>:<form onSubmit={doAction}>{action==='appointment'&&<label>Ngày giờ tái khám<input name="date" type="datetime-local" min={today+'T00:00'} required/></label>}{action==='admit'&&<><label>Khoa điều trị tiếp nhận<select name="department" defaultValue={episode.department}>{clinics.map(c=><option key={c}>{c}</option>)}</select></label><label>Buồng giường dự kiến (Khoa nội trú duyệt)<select name="bedId"><option value="">Chờ điều dưỡng xếp buồng (Vào hàng đợi nội trú)</option>{beds.filter(b=>!b.patient&&!b.cleaning).map(b=><option value={b.id} key={b.id}>{b.roomName ? `${b.roomName} · ` : ''}Giường {b.bedNumber || b.id}</option>)}</select></label></>}{action==='transfer'&&<><label>Chuyên khoa tiếp nhận<select name="department" required defaultValue=""><option value="">Chọn chuyên khoa khác</option>{clinics.filter(c=>c!==episode.department).map(c=><option key={c}>{c}</option>)}</select></label><label>Phòng tiếp nhận<input name="room" required/></label></>}{action==='referral'&&<label>Cơ sở tiếp nhận<input name="destination" required/></label>}<label>Lý do / nội dung<textarea name="reason" required maxLength={2000}/></label>{actionError&&<p className="form-error" role="alert">{actionError}</p>}<button className="primary full" type="submit" disabled={actionBusy}>{actionBusy?'Đang lưu…':'Xác nhận'}</button></form>}</section></div>}
 {printDoc&&<div className="modal-backdrop" onClick={()=>setPrintDoc(null)}><section className="modal his-large-modal wide-modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><button className="close icon-button" aria-label="Đóng biểu mẫu" onClick={()=>setPrintDoc(null)}><X size={21}/></button><MedicalPaperFormViewer tab={printDoc.type==='rx'?'prescriptions':'archives'} row={printDoc.type==='rx'?{id:printDoc.prescription.id,diagnosis:printDoc.prescription.diagnosis,advice:printDoc.prescription.advice,lines:printDoc.prescription.lines}:{id:episode.id,episodeId:episode.id,diagnosis:record?.note?.diagnosis||episode.diagnosis||'Chưa ghi nhận',treatment:record?.note?.plan||'Chưa ghi nhận',outcome:record?.note?.outcome||'Chưa ghi nhận',advice:record?.note?.advice||'Chưa ghi nhận'}} patient={patient} doctorStaff={{name:episode.doctor||actor.person}} onClose={()=>setPrintDoc(null)}/></section></div>}
 </>
}
function ShieldNotice({patient,db}){const alerts=(db.operations?.records||[]).filter(r=>r.module==='safety'&&r.patient===patient.id&&r.status==='Đã xác minh');return <>{alerts.length?<><b>Cảnh báo:</b> {alerts.map(a=>a.substance+' · '+a.reaction).join('; ')}</>:<><b>Dị ứng:</b> Chưa ghi nhận.</>}</>}
function RecordList({rows,columns}){return rows.length?<div className="table-scroll desk-records"><table><thead><tr>{columns.map(([key,label])=><th key={key}>{label}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}>{columns.map(([key])=><td key={key}>{r[key]||'—'}</td>)}</tr>)}</tbody></table></div>:<p className="desk-muted">Chưa có dữ liệu liên kết.</p>}
