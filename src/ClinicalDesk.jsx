/**
 * ====================================================================================
 * PHÂN HỆ: BÀN KHÁM BÁC SĨ & ĐIỀU TRỊ NGOẠI TRÚ (CLINICAL DESK)
 * TỆP: src/ClinicalDesk.jsx
 * 
 * CHỨC NĂNG CHÍNH:
 *   1. Quản lý hàng đợi khám bệnh: Lọc bệnh nhân theo chuyên khoa, trạng thái (Chờ khám, Đang khám, Chờ kết quả, Đã có kết quả).
 *   2. Gọi số thứ tự vào phòng khám: Hỗ trợ loa phát âm thanh (Text-to-Speech) gọi tên và STT bệnh nhân.
 *   3. Ghi nhận sinh hiệu: Huyết áp (mmHg), Mạch (l/p), Nhiệt độ (°C), SpO2 (%), Chiều cao, Cân nặng, tính tự động BMI.
 *   4. Chẩn đoán bệnh: Tra cứu nhanh mã bệnh ICD-10 (Bệnh chính & Bệnh kèm theo).
 *   5. Chỉ định Cận lâm sàng (CLS): Xét nghiệm huyết học, sinh hóa, X-quang, Siêu âm, ECG, Nội soi.
 *   6. Kê đơn thuốc ngoại trú: Gợi ý liều dùng theo mẫu (Sáng - Chiều sau ăn), tính số lượng tự động theo số ngày.
 *   7. Kết luận điều trị: Cấp toa về điều trị ngoại trú, Hẹn khám lại, Chuyển tuyến trên, Chỉ định nhập viện nội trú.
 * 
 * BẢNG CƠ SỞ DỮ LIỆU SQL SERVER LIÊN QUAN:
 *   - dbo.HoSoKham         : Bệnh án chi tiết (lyDoKham, quaTrinhBenhLy, chanDoanChinh, huongDieuTri, ketLuan).
 *   - dbo.ChiDinhCLS       : Phiếu chỉ định CLS tổng thể.
 *   - dbo.ChiTietChiDinh   : Chi tiết từng dịch vụ kỹ thuật được chỉ định.
 *   - dbo.DonThuoc         : Đơn thuốc tổng thể được bác sĩ ký.
 *   - dbo.ChiTietDonThuoc  : Từng loại thuốc, số lượng, cách dùng, liều lượng, số ngày.
 *   - dbo.PhieuSinhHieu    : Dấu hiệu sinh tồn đo được.
 * 
 * HƯỚNG DẪN SỬA NHANH KHI CÔ GIÁO HỎI KHI BẢO VỆ:
 *   - "Thêm mẫu liều dùng / tần suất uống thuốc ở đâu?": Sửa mảng RX_DOSES và RX_FREQ_PRESETS (dòng 40-50).
 *   - "Thứ tự ưu tiên gọi khám ở đâu?": Xem hàm sort() tại dòng 80-90 (Ưu tiên: Đã có kết quả -> Đang khám -> Chờ khám).
 *   - "Quy định cảnh báo thuốc BHYT ở đâu?": Kiểm tra hàm isBhytEligibleItem() được gọi khi bác sĩ thêm thuốc.
 * ====================================================================================
 */

import {assignedToDoctor} from './doctor-scope.js';
import {granted} from './session.js';
import React,{useState,useEffect,useRef} from 'react';
import {Search,Stethoscope,Activity,Save,Plus,Printer,LockKeyhole,ArrowRight,ArrowLeft,X,Check,FileText,Trash2,BookOpen,Sparkles,Shield,Volume2,Play,RotateCcw,UserX,Send,CheckCircle2,ChevronDown,ChevronUp,ArrowRightLeft,Building2,BedDouble} from 'lucide-react';
import {useWorkspace,getWorkspace,transact,id,audit,syncLatestPatient,syncWithSqlServer} from './workspace';
import {hisApi} from './api';
import {actorRoles} from './roles';
import {today,clinics} from './business-data';
import {PatientHistory} from './History';
import {clinicalTransaction,saveDeskNote,reopenDeskNote,addDeskServices,saveDeskPrescription,addDeskOrder} from './clinical-desk-store';
import { parseBhytCard, calculateBhytCostBreakdown } from './bhyt-utils';
import SpecialtyExamModule from './SpecialtyExamModules';
import MedicalPaperFormViewer from './MedicalPaperForms';
import MedicalSuggestInput from './MedicalSuggestInput';
import './clinical-desk.css';

const money=n=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n||0);
const RX_DOSES = ['1 viên', '2 viên', '1/2 viên', '1 gói', '1 ống', '5 ml', '10 ml'];
const RX_FREQ_PRESETS = [
  { label: 'Sáng 1 - Tối 1', freq: 'Ngày 2 lần (Sáng - Tối sau ăn)', morning: '1', noon: '', evening: '1', night: '', perDay: 2 },
  { label: 'Sáng 1 - Trưa 1 - Tối 1', freq: 'Ngày 3 lần (Sáng - Trưa - Tối)', morning: '1', noon: '1', evening: '1', night: '', perDay: 3 },
  { label: 'Sáng 1v', freq: 'Ngày 1 lần (Uống buổi sáng)', morning: '1', noon: '', evening: '', night: '', perDay: 1 },
  { label: 'Tối 1v', freq: 'Ngày 1 lần (Trước khi ngủ)', morning: '', noon: '', evening: '', night: '1', perDay: 1 },
  { label: 'Khi sốt ≥ 38.5°C', freq: 'Khi sốt ≥ 38.5°C (Cách 4-6h)', morning: '', noon: '', evening: '', night: '', perDay: 0 }
];

export const DEPT_PREFIX = {
  'Nội tổng quát': 'NOI',
  'Tim mạch': 'TIM',
  'Tai Mũi Họng': 'TMH',
  'Da liễu': 'DA',
  'Sản phụ khoa': 'SAN',
  'Cơ xương khớp': 'CXK'
};

export function getQueueLabel(v, departmentFilter = '') {
  if (!v) return '—';
  if (v.queueTag) {
    if (departmentFilter && departmentFilter === v.department) {
      return `#${v.queueNumber || v.queueTag.split('-')[1] || '01'}`;
    }
    return v.queueTag;
  }
  const prefix = DEPT_PREFIX[v.department] || (v.roomCode || '').replace(/^PK-|^B-/, '') || 'PK';
  const num = String(v.queueNumber || 1).padStart(2, '0');
  if (departmentFilter && departmentFilter === v.department) {
    return `#${v.queueNumber || num}`;
  }
  return `${prefix}-${num}`;
}

export default function ClinicalDesk({role,notify,navigate,inpatient=false,clinicalContext}){
 const [globalIcd,setGlobalIcd]=useState(false);
 const [patients]=useWorkspace('patients'),[visits]=useWorkspace('visits'),[admissions]=useWorkspace('admissions'),[db]=useWorkspace('business');const actor=actorRoles[role];
 useEffect(()=>{syncWithSqlServer();},[]);
 const episodes=(inpatient?admissions:visits).filter(v=>role!=='doctor'||assignedToDoctor(v,actor.staffId)).filter(v=>!clinicalContext?.episodeId||v.id===clinicalContext.episodeId);
 const [selected,setSelected]=useState(''),[calledId,setCalledId]=useState(''),[query,setQuery]=useState(''),[status,setStatus]=useState(''),[department,setDepartment]=useState(''),[day,setDay]=useState('');const dirty=useRef(false);
 const filtered=episodes.filter(v=>(!status ? v.status!=='Đã hủy' : v.status===status)&&(!department||v.department===department)&&(!day||v.date===day)).filter(v=>(v.id+' '+patients.find(p=>p.id===v.patientId)?.name).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{
   const aPrio = a.status === 'Đã có kết quả' ? 1 : a.status === 'Đang khám' ? 2 : a.status === 'Chờ khám' ? 3 : a.status === 'Chờ kết quả' ? 4 : a.status === 'Tạm hoãn' ? 5 : 6;
   const bPrio = b.status === 'Đã có kết quả' ? 1 : b.status === 'Đang khám' ? 2 : b.status === 'Chờ khám' ? 3 : b.status === 'Chờ kết quả' ? 4 : b.status === 'Tạm hoãn' ? 5 : 6;
   if(aPrio !== bPrio) return aPrio - bPrio;
   if(department === '' && a.department !== b.department) return (a.department||'').localeCompare(b.department||'');
   const aNum = Number(a.queueNumber)||9999;
   const bNum = Number(b.queueNumber)||9999;
   if(aNum !== bNum) return aNum - bNum;
   return (b.date+b.time).localeCompare(a.date+a.time);
 });

 const current=filtered.find(v=>v.id===selected)||filtered[0];const patient=patients.find(p=>p.id===current?.patientId);
 const calledVisit = calledId ? episodes.find(v=>v.id===calledId) : null;
 const calledPatient = calledVisit ? patients.find(p=>p.id===calledVisit.patientId) : null;

 function pick(id){
   if(dirty.current&&!window.confirm('Có nội dung chưa lưu. Bạn muốn bỏ thay đổi để chuyển hồ sơ?'))return;
   dirty.current=false;
   setSelected(id);
   if(calledId===id) setCalledId('');
 }
 function filter(fn){if(dirty.current&&!window.confirm('Có nội dung chưa lưu. Bạn muốn đổi bộ lọc?'))return;dirty.current=false;fn();setSelected('')}

 async function callPatient(candidate, openRecord = false) {
   if (!candidate) return;
   try {
     await hisApi.callNextVisit(candidate.id);
     transact(d => {
       const v = d.visits.find(x => x.id === candidate.id);
       if (v && v.status === 'Chờ khám') v.status = 'Đang khám';
     });
     setCalledId(candidate.id);
     // QUAN TRỌNG: Gọi người bệnh vào cửa phòng KHÔNG tự ý đổi mẫu bệnh án đang khám của bác sĩ.
     // Chỉ chuyển mở hồ sơ khám nếu:
     // - Người dùng chỉ định mở khám (openRecord = true, ví dụ bấm nút Vào khám / bấm thẻ bệnh nhân)
     // - HOẶC hiện tại chưa có hồ sơ nào đang mở trên màn hình (!current)
     if (openRecord || !current) {
       setSelected(candidate.id);
     }
     const p = patients.find(pat => pat.id === candidate.patientId);
     const isPriority = candidate.status === 'Đã có kết quả';
     notify(`🔊 Đang gọi ${isPriority ? 'ƯU TIÊN (Đã có kết quả CLS)' : 'STT ' + getQueueLabel(candidate, department)}: Người bệnh ${p?.name || ''} vào phòng khám ${candidate.department || ''}!`);
   } catch {
     setCalledId(candidate.id);
     if (openRecord || !current) {
       setSelected(candidate.id);
     }
   }
 }

 async function handleCallNext() {
   // 1. Ưu tiên hàng đầu: Ca vừa có kết quả CLS quay lại (Đã có kết quả) mà chưa phải ca đang khám hoặc đang gọi
   const priorityLabReturn = filtered.find(v => v.id !== current?.id && v.id !== calledId && v.status === 'Đã có kết quả');
   if (priorityLabReturn) {
     await callPatient(priorityLabReturn, false);
     return;
   }

   // 2. Lấy danh sách các ca còn có thể khám tiếp trong hàng đợi hiện hành
   const activeCandidates = filtered.filter(v =>
     !['Hoàn tất', 'Đã hủy', 'Đã ra viện', 'Chờ thanh toán', 'Chờ kết quả'].includes(v.status)
   );

   if (!activeCandidates.length) {
     notify('Hàng đợi hiện không còn người bệnh nào khác để gọi tiếp.');
     return;
   }

   // 3. Mốc tham chiếu: người vừa được gọi trước đó (nếu có), hoặc người đang khám
   const refId = calledId || current?.id;
   const curIdx = activeCandidates.findIndex(v => v.id === refId);
   let nextCandidate = null;

   if (curIdx >= 0 && curIdx < activeCandidates.length - 1) {
     nextCandidate = activeCandidates[curIdx + 1];
     // Nếu nhảy trúng ca đang mở khám trên màn hình, nhảy tiếp thêm 1 nấc (nếu còn)
     if (nextCandidate.id === current?.id && curIdx + 2 < activeCandidates.length) {
       nextCandidate = activeCandidates[curIdx + 2];
     }
   } else {
     // Khi đã ở cuối danh sách, quay lại người đầu tiên khác ca đang khám
     nextCandidate = activeCandidates.find(v => v.id !== current?.id) || activeCandidates[0];
   }

   if (nextCandidate) {
     // Gọi người bệnh vào cửa phòng, giữ nguyên mẫu bệnh án đang khám của bác sĩ
     await callPatient(nextCandidate, false);
   } else {
     notify('Hàng đợi hiện không còn người bệnh nào khác để gọi tiếp.');
   }
 }

 function handleRecall() {
   const targetVisit = (calledId && episodes.find(v => v.id === calledId)) || current;
   if (!targetVisit) return;
   const targetPatient = patients.find(p => p.id === targetVisit.patientId);
   notify(`🔊 Gọi lại: Mời người bệnh STT ${getQueueLabel(targetVisit, department)} - ${targetPatient?.name || ''} vào phòng khám ${targetVisit?.department || ''}!`);
 }

 async function handleDefer() {
   // Ưu tiên tạm hoãn ca vừa gọi vào mà vắng mặt; nếu không có ca gọi riêng thì tạm hoãn ca đang khám
   const targetVisit = (calledId && calledId !== current?.id && episodes.find(v => v.id === calledId)) || current;
   if (!targetVisit) return;
   const targetPatient = patients.find(p => p.id === targetVisit.patientId);
   try {
     await hisApi.deferVisit(targetVisit.id);
     transact(d => {
       const v = d.visits.find(x => x.id === targetVisit.id);
       if (v) v.status = 'Tạm hoãn';
     });
     notify(`Đã chuyển người bệnh ${targetPatient?.name || targetVisit.id} sang danh sách Tạm hoãn (vắng mặt).`);
     if (targetVisit.id === calledId) {
       setCalledId('');
     } else if (targetVisit.id === current?.id) {
       const otherCandidates = filtered.filter(v => v.id !== current.id && !['Hoàn tất', 'Đã hủy', 'Đã ra viện', 'Chờ thanh toán'].includes(v.status));
       if (otherCandidates.length) {
         handleCallNext();
       } else {
         setSelected('');
       }
     }
   } catch (err) {
     notify(err.message || 'Không thể tạm hoãn.');
   }
 }

 async function handleRestore(visitId) {
   try {
     await hisApi.restoreVisit(visitId);
     transact(d => {
       const v = d.visits.find(x => x.id === visitId);
       if (v) v.status = 'Chờ khám';
     });
     notify('Đã khôi phục người bệnh vào hàng đợi chờ khám.');
   } catch (err) {
     notify(err.message || 'Không thể khôi phục.');
   }
 }

 async function handleRestoreAndCall(candidate) {
   try {
     await hisApi.restoreVisit(candidate.id);
     transact(d => {
       const v = d.visits.find(x => x.id === candidate.id);
       if (v) v.status = 'Chờ khám';
     });
     await callPatient(candidate, false);
   } catch (err) {
     notify(err.message || 'Không thể khôi phục và gọi.');
   }
 }

 return <div className="clinical-desk"><div className="desk-intro"><div><span className="eyebrow">{inpatient?'ĐIỀU TRỊ NỘI TRÚ':'KHÁM BỆNH NGOẠI TRÚ'}</span><h2 style={{margin:0,fontSize:18,fontWeight:700}}>{inpatient?'Bàn điều trị theo đợt':'Bàn làm việc bác sĩ'}</h2></div></div>
 {!inpatient && (
   <div className="queue-dispatch-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 16px', marginBottom: '14px', flexWrap: 'wrap', gap: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
     <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#0f766e', fontWeight: 700, fontSize: '13px' }}>
           <Stethoscope size={17} />
           <span>Đang khám:</span>
         </div>
         <span className="badge teal" style={{ fontSize: '13px', fontWeight: 700, padding: '3px 8px' }}>
           STT {getQueueLabel(current, department)}
         </span>
         <b style={{ fontSize: '14px', color: '#0f172a' }}>{patient?.name || 'Chưa chọn hồ sơ'}</b>
         {patient?.gender && <span style={{ fontSize: '12px', color: '#64748b' }}>({patient.gender})</span>}
         {current?.status && (
           <span className={`badge ${current.status==='Đã có kết quả'?'green':current.status==='Đang khám'?'teal':current.status==='Chờ khám'?'amber':'gray'}`} style={{ fontSize: '11px' }}>
             {current.status==='Đã có kết quả' ? '⚡ ĐÃ CÓ KQ CLS' : current.status}
           </span>
         )}
       </div>

       {/* Thông tin ca vừa gọi vào cửa (nếu khác ca đang khám trên màn hình) */}
       {calledVisit && calledVisit.id !== current?.id && (
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '6px', padding: '3px 10px', fontSize: '12px' }}>
           <Volume2 size={15} style={{ color: '#7c3aed' }} />
           <span style={{ color: '#6d28d9', fontWeight: 500 }}>Vừa gọi vào:</span>
           <b style={{ color: '#5b21b6' }}>STT {getQueueLabel(calledVisit, department)} - {calledPatient?.name}</b>
           <button
             type="button"
             style={{ fontSize: '11px', padding: '2px 8px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
             onClick={() => pick(calledVisit.id)}
             title="Chuyển sang mở hồ sơ bệnh nhân này để khám khi người bệnh đã bước vào bàn khám"
           >
             Vào khám <ArrowRight size={11} />
           </button>
         </div>
       )}
     </div>

     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
       <button
         type="button"
         className="primary"
         style={{ fontSize: '12.5px', padding: '6px 13px', display: 'flex', alignItems: 'center', gap: '6px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
         onClick={handleCallNext}
         title="Gọi ca kế tiếp (Tự động ưu tiên ca đã có kết quả xét nghiệm)"
       >
         <Play size={14} fill="currentColor" /> Gọi số tiếp theo
       </button>

       <button
         type="button"
         className="secondary"
         style={{ fontSize: '12.5px', padding: '6px 11px', display: 'flex', alignItems: 'center', gap: '5px' }}
         onClick={handleRecall}
         disabled={!current}
         title="Nhắc lại loa gọi người bệnh"
       >
         <RotateCcw size={14} /> Gọi lại
       </button>

       <button
         type="button"
         className="secondary"
         style={{ fontSize: '12.5px', padding: '6px 11px', display: 'flex', alignItems: 'center', gap: '5px', color: '#b45309' }}
         onClick={handleDefer}
         disabled={!current || current.status==='Tạm hoãn'}
         title="Bệnh nhân vắng mặt, tạm hoãn để gọi ca sau"
       >
         <UserX size={14} /> Vắng / Tạm hoãn
       </button>
     </div>

     <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b', borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' }}>
       <span>Hàng đợi: <b style={{ color: '#0f172a' }}>{filtered.filter(v => !['Hoàn tất', 'Đã hủy', 'Đã ra viện'].includes(v.status)).length}</b></span>
       <span style={{ color: '#16a34a' }}>⚡ Có KQ: <b>{episodes.filter(v => v.status === 'Đã có kết quả').length}</b></span>
       <span>Chờ khám: <b style={{ color: '#0284c7' }}>{episodes.filter(v => v.status === 'Chờ khám').length}</b></span>
       <span>Đang khám: <b style={{ color: '#0f766e' }}>{episodes.filter(v => v.status === 'Đang khám').length}</b></span>
       <span>Đang CLS: <b style={{ color: '#6366f1' }}>{episodes.filter(v => v.status === 'Chờ kết quả').length}</b></span>
       {episodes.filter(v => v.status === 'Tạm hoãn').length > 0 && (
         <span style={{ color: '#d97706' }}>Tạm hoãn: <b>{episodes.filter(v => v.status === 'Tạm hoãn').length}</b></span>
       )}
     </div>
   </div>
 )}
 <div className="desk-layout"><aside className="desk-queue"><div className="desk-queue-title"><Stethoscope size={17}/><b>{inpatient?'Đợt điều trị':'Hàng đợi lượt khám'}</b><span>{filtered.length}</span></div><label className="search"><Search size={15}/><input aria-label="Tìm hồ sơ bàn khám" placeholder="Tên hoặc mã hồ sơ…" value={query} onChange={e=>filter(()=>setQuery(e.target.value))}/></label><div className="desk-filters"><label>Ngày<input aria-label="Ngày hồ sơ" type="date" value={day} onChange={e=>filter(()=>setDay(e.target.value))}/></label><label>Khoa<select aria-label="Khoa bàn khám" value={department} onChange={e=>filter(()=>setDepartment(e.target.value))}><option value="">Tất cả khoa</option>{clinics.map(c=><option key={c}>{c}</option>)}</select></label><label>Trạng thái<select aria-label="Trạng thái bàn khám" value={status} onChange={e=>filter(()=>setStatus(e.target.value))}><option value="">Đang tiếp nhận (ẩn đã hủy)</option>{['Chờ khám','Đang khám','Chờ kết quả','Đã có kết quả','Tạm hoãn','Chờ thanh toán','Hoàn tất','Đã hủy'].map(s=><option key={s} value={s}>{s}</option>)}</select></label></div><div className="desk-patient-list">{filtered.map((v,i)=>{const p=patients.find(pat=>pat.id===v.patientId);const age=p?.birth?`${new Date().getFullYear()-Number(String(p.birth).slice(0,4))}T`:'';const gender=p?.gender==='female'||p?.gender==='Nữ'?'Nữ':p?.gender==='male'||p?.gender==='Nam'?'Nam':'';const demo=[age,gender].filter(Boolean).join('·');const isSelected=current?.id===v.id;const statusClass=v.status==='Đã có kết quả'?'green':v.status==='Đang khám'?'teal':v.status==='Chờ khám'?'amber':v.status==='Tạm hoãn'?'amber':'gray';const isBhyt=p?.insurance&&p?.insurance!=='Không có';return <button key={v.id} aria-pressed={isSelected} onClick={()=>pick(v.id)} title={`${p?.name||'Bệnh nhân'} - ${v.id} (${v.department})`}>
  {/* Line 1: STT + Full Patient Name + Demographics (Takes 100% width, NEVER truncate!) */}
  <div className="desk-pat-row-top" style={{display:'flex',alignItems:'center',gap:6,width:'100%',minWidth:0}}>
    <span className="desk-pat-stt" style={{fontSize:'11px',fontWeight:700,padding:'1px 6px',borderRadius:'4px',flexShrink:0,background:v.status==='Đã có kết quả'?'#bbf7d0':'#e2e8f0',color:v.status==='Đã có kết quả'?'#166534':'#334155'}}>{getQueueLabel(v, department)}</span>
    <b className="desk-pat-name" style={{fontSize:'13px',fontWeight:700,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',flex:1,minWidth:0}} title={p?.name||'Hồ sơ chưa có tên'}>{p?.name||'Hồ sơ chưa có tên'}</b>
    {demo&&<span className="desk-pat-demo" style={{fontSize:'11px',color:'#64748b',whiteSpace:'nowrap',flexShrink:0}}>({demo})</span>}
  </div>
  {/* Line 2: Department, Time & BHYT on left, Action Button on right */}
  <div className="desk-pat-row-bottom" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:6,width:'100%',fontSize:'11px',color:'#64748b',marginTop:'4px'}}>
    <div className="desk-pat-bottom-left" style={{display:'flex',alignItems:'center',gap:4,minWidth:0,flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
      <span style={{fontWeight:500}}>{v.department}</span><span>·</span><span>{v.time||v.date}</span><span>·</span>
      {isBhyt?<span style={{fontSize:'9px',background:'#ecfdf5',color:'#047857',border:'1px solid #a7f3d0',padding:'0 4px',borderRadius:'3px',fontWeight:600}}>BHYT</span>:<span style={{fontSize:'9px',background:'#f8fafc',color:'#64748b',border:'1px solid #e2e8f0',padding:'0 4px',borderRadius:'3px'}}>VP</span>}
      <span>·</span>
      {Boolean(v.note?.vitals?.pressure || (db.vitals && db.vitals.some(sh => sh.patient === v.patientId || sh.episodeId === v.id))) ? (
        <span style={{fontSize:'9px',background:'#f0fdf4',color:'#166534',border:'1px solid #bbf7d0',padding:'0 4px',borderRadius:'3px',fontWeight:600}} title="Đã có sinh hiệu">✓ SH</span>
      ) : (
        <span style={{fontSize:'9px',background:'#fffbeb',color:'#b45309',border:'1px solid #fde68a',padding:'0 4px',borderRadius:'3px',fontWeight:600}} title="Chờ điều dưỡng đo sinh hiệu">⏳ Chờ SH</span>
      )}
    </div>
    <div style={{display:'flex',alignItems:'center',gap:'4px',flexShrink:0}}>
      {v.status==='Tạm hoãn' ? (
        <span className="text-button" style={{fontSize:'10px',color:'#b45309',padding:'1px 6px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'3px',fontWeight:600}} onClick={(e)=>{e.stopPropagation();handleRestoreAndCall(v);}} title="Khôi phục và gọi vào khám ngay">
          ↺ Gọi lại
        </span>
      ) : isSelected ? (
        <span style={{fontSize:'10px',color:'#0f766e',fontWeight:700,background:'#ecfdf5',border:'1px solid #a7f3d0',padding:'1px 5px',borderRadius:'3px'}}>● Đang khám</span>
      ) : v.id === calledId ? (
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <span style={{fontSize:'9.5px',color:'#7c3aed',fontWeight:700,background:'#f5f3ff',border:'1px solid #ddd6fe',padding:'1px 5px',borderRadius:'3px'}}>🔊 Đã gọi</span>
          <span className="text-button" style={{fontSize:'10px',color:'#0f766e',padding:'1px 6px',background:'#ecfdf5',border:'1px solid #a7f3d0',borderRadius:'3px',fontWeight:600}} onClick={(e)=>{e.stopPropagation();pick(v.id);}} title="Mở hồ sơ bệnh nhân này để khám">
            Vào khám
          </span>
        </div>
      ) : !['Hoàn tất','Đã hủy','Đã ra viện','Chờ thanh toán'].includes(v.status) ? (
        <span className="text-button" style={{fontSize:'10px',color:'#0f766e',padding:'1px 6px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'3px',fontWeight:600}} onClick={(e)=>{e.stopPropagation();callPatient(v, false);}} title="Phát loa gọi người bệnh này vào cửa phòng (Không đổi mẫu bệnh án đang khám)">
          ▶ Gọi vào
        </span>
      ) : (
        <span className={`badge ${statusClass}`} style={{fontSize:'9.5px',padding:'1px 5px'}}>{v.status==='Đã có kết quả'?'⚡ Có KQ':v.status}</span>
      )}
    </div>
  </div>
</button>;})}{!filtered.length&&<p className="desk-empty">Không có hồ sơ phù hợp. Thử bỏ bộ lọc.</p>}</div></aside><section className="desk-workspace">{current&&patient?<EpisodeDesk key={current.id} episode={current} patient={patient} role={role} notify={notify} navigate={navigate} inpatient={inpatient} dirtyRef={dirty}/>:<div className="desk-empty"><FileText size={35}/><h3>Chọn hồ sơ để bắt đầu</h3><p>Tạo lượt khám hoặc tiếp nhận nội trú từ Lịch sử khám & điều trị.</p><button className="secondary" onClick={()=>navigate('history')}>Mở lịch sử hồ sơ</button></div>}</section></div></div>
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
 const [sheetId,setSheetId]=useState(()=>inpatient?(sheets[0]?.id||''):''),[newSheet,setNewSheet]=useState(false),[tab,setTab]=useState('exam'),[error,setError]=useState(''),[action,setAction]=useState(null),[actionError,setActionError]=useState('');
 const [hasClsOrder,setHasClsOrder]=useState(()=>Boolean(
  (db.labs||[]).some(l=>l.episodeId===episode.id) || ['Chờ kết quả', 'Đã có kết quả'].includes(episode.status)
 ));
 const record=inpatient?sheets.find(s=>s.id===sheetId):episode;
 const hasVitals=Boolean(
  record?.note?.vitals?.pressure ||
  (db.vitals && db.vitals.some(sh => sh.patient === patient.id || sh.episodeId === episode.id))
 );
 const [showExtraVitals, setShowExtraVitals] = useState(() => Boolean(
  record?.note?.vitals?.respiration || record?.note?.vitals?.height || record?.note?.vitals?.weight || record?.note?.vitals?.spo2
 ));
 const [showPrintMenu, setShowPrintMenu] = useState(false);
 const [showTransferMenu, setShowTransferMenu] = useState(false);
 const context={role,inpatient,episodeId:episode.id,patientId:patient.id,sheetId:inpatient?sheetId:null};
 const finishedVisit=!inpatient&&(!!record?.locked||['Hoàn tất','Chờ thanh toán','Đã thanh toán','Chờ phát thuốc','Chờ nhập viện','Đã ra viện','Đã hủy'].includes(episode.status));
 const writable=granted(inpatient?'biz.care:sheet':'biz.exam:save')&&['admin','doctor'].includes(role)&&!['Đã hủy','Đã ra viện'].includes(episode.status)&&!finishedVisit;
 const locked=!!record?.locked||finishedVisit,canWrite=['admin','doctor'].includes(role)&&!locked&&granted(tab==='services'?'biz.labs:order':tab==='rx'?'biz.prescriptions:save':tab==='orders'?'biz.care:order':inpatient?'biz.care:sheet':'biz.exam:save');
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
 const [lines,setLines]=useState([emptyLine()]),[advice,setAdvice]=useState('');
 const [order,setOrder]=useState({kind:'Chăm sóc',medicine:'',quantity:1,dose:'',scheduled:today+'T08:00'});
 const dirty=noteDirty||selectedServices.length>0||lines.some(l=>l.medicine||l.dose||l.frequency)||!!advice.trim()||!!order.dose.trim();
 const linked=key=>(db[key]||[]).filter(r=>r.episodeId===episode.id);
 const labs=linked('labs'),prescriptions=linked('prescriptions'),rounds=linked('rounds'),settlements=linked('settlements'),advances=linked('advances');
 const bed=beds.find(b=>b.admissionId===episode.id);
 useEffect(()=>{dirtyRef.current=dirty;return()=>{dirtyRef.current=false}},[dirty]);
 useEffect(()=>{const unload=e=>{if(dirty){e.preventDefault();e.returnValue=''}};const leave=e=>{if(!dirty||!e.target.closest('.sidebar nav button,.integrated-operation-tabs button,.breadcrumb a,.profile button'))return;if(!window.confirm('Có nội dung chưa lưu trong bàn khám. Bạn muốn rời màn hình?')){e.preventDefault();e.stopPropagation()}else{setDirty(false);dirtyRef.current=false}};window.addEventListener('beforeunload',unload);document.addEventListener('click',leave,true);return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',leave,true)}},[dirty]);
 function change(key,value){setNote(n=>({...n,[key]:value}));setDirty(true);setError('')}
 function handleSpecialtyChange(data){setNote(n=>({...n,specialty:data}));setDirty(true);setError('')}
 function fresh(nextSheet=sheetId){const e=(inpatient?getWorkspace().admissions:getWorkspace().visits).find(v=>v.id===episode.id);const r=inpatient?getWorkspace().business.careSheets?.find(s=>s.id===nextSheet):e;setNote({...r?.note,vitals:{...r?.note?.vitals}});setRevision(r?.revision||0);setDirty(false);setError('');setShowExtraVitals(Boolean(r?.note?.vitals?.respiration||r?.note?.vitals?.height||r?.note?.vitals?.weight||r?.note?.vitals?.spo2));setShowPrintMenu(false);setShowTransferMenu(false);}
 const [saving,setSaving]=useState(false);
 async function save(lock=false){
  if(saving)return;
  if(lock && !inpatient){
   if(!note.symptoms?.trim()){setTab('exam');setError('Chưa nhập Triệu chứng / bệnh sử trước khi kết thúc khám.');return;}
   if(!note.diagnosis?.trim()){setTab('exam');setError('Chưa nhập Chẩn đoán bệnh chính. Bác sĩ nhập trực tiếp, không bắt buộc mã ICD-10.');return;}
   const pendingLabs = labs.filter(l => l.status !== 'Đã phát hành' && l.status !== 'Đã hủy');
   if (pendingLabs.length > 0) {
    if (!window.confirm(`⚠️ Bệnh nhân đang có ${pendingLabs.length} chỉ định Cận lâm sàng CHƯA có kết quả phát hành.\n\n- Nếu cần chờ kết quả để chốt chẩn đoán: Vui lòng sang Tab 2 và bấm "Gửi chỉ định & Chuyển CLS".\n- Nếu vẫn muốn kết thúc đợt khám ngay lúc này: Nhấn OK để xác nhận khóa khám.`)) {
     return;
    }
   }
  }
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
    const targetMsg=saved.status==='Chờ thanh toán'
     ?'Đã kết thúc khám và chuyển BN sang Quầy Thu ngân (Chờ thanh toán)'
     :saved.status==='Chờ nhập viện'
     ?'Đã kết thúc khám và chuyển BN sang Khoa Điều trị (Chờ nhập viện)'
     :saved.status==='Chờ kết quả'
     ?'Đã chuyển BN sang phòng Cận lâm sàng (Chờ kết quả)'
     :'Đã hoàn tất và khóa phiếu khám';
    notify(lock?targetMsg:'Đã lưu nháp phiếu khám vào hệ thống');
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
 async function doAction(e){
    e.preventDefault();
    if(actionBusy)return;
    setActionBusy(true);
    setActionError('');
    const f=Object.fromEntries(new FormData(e.currentTarget));
    try{
      if(action==='reopen'){
        if(inpatient){
          await careCall({action:'reopen',id:sheetId,episodeId:episode.id,revision,reason:f.reason});
          await syncWithSqlServer();
        }else{
          const saved=await hisApi.saveExamNote({visitId:episode.id,note:record.note,revision,reopen:true,reason:f.reason,doctorStaffId:episode.doctorStaffId});
          transact(d=>{
            const index=d.visits.findIndex(v=>v.id===saved.id);
            if(index>=0)d.visits[index]={...d.visits[index],...saved};
            syncLatestPatient(d,patient.id);
          });
        }
        fresh();
      }else if(action==='appointment'){
        setAction(null);
        notify('Đã hẹn ngày khám lại cho người bệnh');
        setPrintDoc({type:'reexam',appointmentDate:f.date});
        return;
      }else if(action==='admit'){
        actionRequest.current ||= crypto.randomUUID();
        await hisApi.admitInpatient({requestId:actionRequest.current,patientId:patient.id,visitId:episode.id,department:f.department,bedId:f.bedId||null,doctor:episode.doctorStaffId||actor.staffId,diagnosis:note.diagnosis||record?.note?.diagnosis,icdCode:note.icd||null,reason:f.reason});
        await syncWithSqlServer();
      }else if(action==='transfer'){
        await hisApi.changeVisit({visitId:episode.id,action:'transfer',dept:f.department,reason:f.reason});
        await syncWithSqlServer();
        setAction(null);
        notify(`Đã điều chuyển người bệnh sang ${f.department} thành công`);
        return;
      }else if(action==='referral'){
        setAction(null);
        setPrintDoc({type:'referral',destination:f.destination,reason:f.reason});
        notify('Đang mở Giấy chuyển tuyến KCB BHYT (Mẫu số 06)');
        return;
      }else if(action==='defer'){
        await hisApi.changeVisit({visitId:episode.id,action:'defer',reason:f.reason||'Người bệnh tạm vắng'});
        await syncWithSqlServer();
        setAction(null);
        notify('Đã tạm hoãn lượt khám của người bệnh');
        return;
      }
      actionRequest.current=null;
      setAction(null);
      notify('Đã lưu thao tác trên hồ sơ');
    }catch(e){
      setActionError(e.message);
    }finally{
      setActionBusy(false);
    }
  }
 const services=allServices.filter(s=>(s.status==='Đang hoạt động'||s.categoryRaw)&&(!serviceGroup||s.kind===serviceGroup)&&(s.name+' '+s.id).toLowerCase().includes(serviceSearch.toLowerCase()));
 const charges=[...labs.filter(r=>r.status!=='Đã hủy').map(r=>({id:r.id,name:db.services.find(s=>s.id===r.service)?.name||r.service,amount:Number(r.price??db.services.find(s=>s.id===r.service)?.price)||0,status:r.status})),...linked('clinicalCharges').filter(r=>r.status!=='Đã hủy').map(r=>({id:r.id,name:db.services.find(s=>s.id===r.service)?.name||r.service,amount:r.price*r.quantity,status:r.status}))];
 return <><header className="desk-identity"><div><span className="desk-avatar">{patient.name.split(' ').slice(-2).map(s=>s[0]).join('')}</span><div><h3>{patient.name}</h3><p>{patient.id} · {patient.gender} · {patient.birth?.split('-').reverse().join('/')}</p></div></div><div className="desk-identity-grid"><span><small>{inpatient?'Mã đợt điều trị':'Mã lượt khám'}</small><b>{episode.id}</b></span><span><small>Khoa / bác sĩ</small><b>{episode.department} · {episode.doctor}</b></span><span><small>{inpatient?'Buồng giường':'Đối tượng'}</small><b>{inpatient?(bed?'Giường '+bed.id:'Chưa có giường'):patient.insurance?(() => { const bh = parseBhytCard(patient.insurance); return `BHYT ${bh.rate}% (${bh.code})`; })():'Viện phí'}</b></span><span><small>Trạng thái</small><b style={{color:episode.status==='Đã có kết quả'?'#16a34a':episode.status==='Chờ kết quả'?'#4f46e5':'inherit'}}>{episode.status==='Chờ kết quả'?'⏳ Đang làm CLS (Chờ KQ)':episode.status==='Đã có kết quả'?'⚡ Đã có KQ CLS':episode.status==='Chờ thanh toán'?'Đã xong khám (Chờ thu tiền)':episode.status}</b></span></div><div className="desk-safety"><ShieldNotice patient={patient} db={db}/></div></header>
 {inpatient&&<div className="desk-sheet-picker"><label>Tờ điều trị<select aria-label="Tờ điều trị đang xem" value={sheetId} onChange={e=>switchSheet(e.target.value)}><option value="">{newSheet?'Tờ mới chưa lưu':'Chưa chọn tờ điều trị'}</option>{sheets.map(s=><option key={s.id} value={s.id}>{s.date} · {s.id} · {s.locked?'Đã khóa':'Nháp'}</option>)}</select></label>{writable&&<div className="desk-sheet-picker-actions"><button type="button" className="his-btn-sheet-primary" onClick={()=>newTreatment(false)}><Plus size={14}/>Tờ mới</button><button type="button" className="his-btn-sheet-secondary" disabled={!record?.note} onClick={()=>newTreatment(true)}>Sao chép thành nháp</button></div>}</div>}
 <div className="desk-document-state"><span>{locked?<><LockKeyhole size={13}/>Đã hoàn tất & khóa hồ sơ · Phiên bản {revision}</>:dirty?'Có nội dung chưa lưu':record?.note?'Đã lưu · Phiên bản '+revision:'Chưa lưu phiếu'}</span>{locked&&inpatient&&writable&&<button className="text-button" onClick={()=>setAction('reopen')}>Mở đính chính có lý do</button>}{(locked||!writable)&&<span>Chế độ chỉ xem (Không chỉnh sửa)</span>}</div>
 <div className="desk-tabs" role="tablist" aria-label="Các phần hồ sơ">{[
   ['exam',inpatient?'1. Tờ điều trị & Diễn biến':'1. Khám & Chẩn đoán'],
   ['services','2. Cận lâm sàng (CLS)'],
   ['rx','3. Kê đơn thuốc'],
   ...(inpatient?[['orders','Y lệnh điều trị']]:[]),
   ['costs','4. Chi phí & Lịch sử']
 ].map(([key,title])=><button role="tab" disabled={true} style={{cursor:'default',opacity:1}} aria-selected={tab===key||(key==='exam'&&tab==='diagnosis')||(key==='services'&&tab==='results')||(key==='costs'&&tab==='history')} key={key}>{title}</button>)}</div>
 <div className="desk-tab-panel">
 {(tab==='exam'||tab==='diagnosis')&&<><div className="desk-section-heading"><h3>{inpatient?'Diễn biến & kế hoạch điều trị':'Khám lâm sàng & Chẩn đoán bệnh'}</h3></div><fieldset disabled={!canWrite} className="desk-fields"><div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'12px 14px',marginBottom:'14px'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
    <h4 style={{margin:0,fontSize:'13px',fontWeight:700,color:'#0f172a',display:'flex',alignItems:'center',gap:6}}>
      <Activity size={15} color="#0f766e"/>Chỉ số sinh hiệu (Huyết áp, Chiều cao, Cân nặng)
    </h4>
  </div>
  {!hasVitals && (
    <div style={{background:'#fffbeb',border:'1px solid #fde68a',color:'#92400e',borderRadius:'6px',padding:'6px 10px',fontSize:'12px',marginBottom:'10px',display:'flex',alignItems:'center',gap:'6px'}}>
      <span>⏳ <b>Lưu ý:</b> Bệnh nhân chưa đo sinh hiệu tại Bàn Điều dưỡng. Điều dưỡng cần đo Huyết áp, Chiều cao, Cân nặng trước khi khám.</span>
    </div>
  )}
  <div className="desk-vitals" style={{gridTemplateColumns:'repeat(4, 1fr)'}}>
    <label>
      Huyết áp (mmHg)
      <input
        type="text"
        placeholder="120/80"
        value={note.vitals?.pressure || ''}
        onChange={e => {
          setNote(n => ({ ...n, vitals: { ...n.vitals, pressure: e.target.value } }));
          setDirty(true);
        }}
      />
    </label>
    <label>
      Chiều cao (cm)
      <input
        type="number"
        step="0.5"
        placeholder="165"
        value={note.vitals?.height || ''}
        onChange={e => {
          setNote(n => ({ ...n, vitals: { ...n.vitals, height: e.target.value } }));
          setDirty(true);
        }}
      />
    </label>
    <label>
      Cân nặng (kg)
      <input
        type="number"
        step="0.5"
        placeholder="60"
        value={note.vitals?.weight || ''}
        onChange={e => {
          setNote(n => ({ ...n, vitals: { ...n.vitals, weight: e.target.value } }));
          setDirty(true);
        }}
      />
    </label>
    <label>
      BMI (kg/m²)
      <output style={{fontWeight:700,color:'#0f766e'}}>
        {Number(note.vitals?.height) > 0 && Number(note.vitals?.weight) > 0
          ? (Number(note.vitals.weight) / Math.pow(Number(note.vitals.height) / 100, 2)).toFixed(1)
          : '—'}
      </output>
    </label>
  </div>
</div><div className="desk-field-grid">{inpatient&&<label>Ngày điều trị<input type="date" value={note.date||today} onChange={e=>change('date',e.target.value)}/></label>}<label>Lý do khám / vào viện<MedicalSuggestInput type="reason" department={episode.department} value={note.reason||episode.reason||''} onChange={val=>change('reason',val)} placeholder="Nhập hoặc chọn lý do khám/vào viện..." disabled={!canWrite}/></label><label>Tiền sử / thuốc đang sử dụng<MedicalSuggestInput type="history" department={episode.department} value={note.history||''} onChange={val=>change('history',val)} placeholder="Nhập hoặc chọn tiền sử bệnh, thuốc đang dùng..." disabled={!canWrite}/></label></div><div className="desk-field-grid"><label>{inpatient?'Diễn biến bệnh':'Triệu chứng / bệnh sử'}<MedicalSuggestInput type="symptoms" department={episode.department} multiline rows={2} value={note.symptoms||''} onChange={val=>change('symptoms',val)} placeholder="Ghi nhận nội dung khám, diễn biến triệu chứng…" disabled={!canWrite}/></label><label>Khám toàn thân & Thể trạng<MedicalSuggestInput type="examination" department={episode.department} multiline rows={2} value={note.examination||''} onChange={val=>change('examination',val)} placeholder="Khám toàn thân & thể trạng chung..." disabled={!canWrite}/></label></div><SpecialtyExamModule roomCode={episode.roomCode} department={episode.department} specialtyData={note.specialty || {}} onChange={handleSpecialtyChange} disabled={!canWrite}/><div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderLeft:'4px solid #0f766e',borderRadius:'8px',padding:'14px 16px',marginTop:'14px',marginBottom:'8px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><h4 style={{margin:0,fontSize:'14px',fontWeight:700,color:'#0f172a',display:'flex',alignItems:'center',gap:6}}><Stethoscope size={16} color="#0f766e"/>Chẩn đoán bệnh & Hướng xử trí</h4></div><div className="desk-field-grid"><label>Chẩn đoán bệnh chính (ICD-10 / Bệnh án)<MedicalSuggestInput type="diagnosis" department={episode.department} multiline rows={2} value={note.diagnosis||''} onChange={val=>{change('diagnosis',val);const m=val.match(/^([A-Z][0-9]{2}(\.[0-9]+)?)/);if(m)change('icd',m[1]);}} placeholder="Gõ mã ICD-10 (I10, E11, J00...) hoặc tên bệnh để gợi ý tức thì..." disabled={!canWrite}/></label><label>Bệnh kèm theo / Biến chứng<MedicalSuggestInput type="comorbidities" department={episode.department} value={note.comorbidities||''} onChange={val=>change('comorbidities',val)} placeholder="Nhập bệnh kèm theo hoặc biến chứng nếu có..." disabled={!canWrite}/></label></div><div className="desk-field-grid" style={{marginTop:'10px'}}><label>Hướng xử trí<select value={note.outcome||(inpatient?'Tiếp tục điều trị nội trú':'Điều trị ngoại trú')} onChange={e=>change('outcome',e.target.value)}>{(inpatient?['Tiếp tục điều trị nội trú','Đề nghị hội chẩn','Đề nghị ra viện','Chuyển tuyến']:['Điều trị ngoại trú','Chỉ định nhập viện','Chuyển tuyến','Hẹn tái khám / Theo dõi']).map(s=><option key={s}>{s}</option>)}</select></label><label>Lời dặn của bác sĩ sau khám<MedicalSuggestInput type="advice" department={episode.department} value={note.advice||''} onChange={val=>change('advice',val)} placeholder="Chế độ dinh dưỡng, vận động, kiêng cữ và hẹn tái khám..." disabled={!canWrite}/></label></div>{inpatient&&<div style={{marginTop:'10px'}}><label>Kế hoạch chăm sóc & điều trị nội trú<MedicalSuggestInput type="plan" department={episode.department} multiline rows={2} value={note.plan||''} onChange={val=>change('plan',val)} placeholder="Kế hoạch chăm sóc và theo dõi điều trị nội trú..." disabled={!canWrite}/></label></div>}</div>
  <div style={{background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:'10px',padding:'12px 16px',marginTop:'16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
    <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',fontSize:'13.5px',fontWeight:700,color:'#0f172a',margin:0}}>
      <input
        type="checkbox"
        style={{width:'18px',height:'18px',cursor:'pointer',accentColor:'#0f766e'}}
        checked={hasClsOrder || selectedServices.length > 0}
        onChange={e => setHasClsOrder(e.target.checked)}
      />
      <span>Chỉ định Cận lâm sàng (Xét nghiệm / Chẩn đoán hình ảnh / Thăm dò chức năng)</span>
    </label>
    <div>
      {(hasClsOrder || selectedServices.length > 0) ? (
        <button
          type="button"
          className="primary"
          style={{padding:'9px 18px',fontSize:'13px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:'8px',background:'#0f766e',borderColor:'#0d9488'}}
          onClick={() => { setTab('services'); setError(''); }}
        >
          Chuyển sang chỉ định Cận lâm sàng (CLS) <ArrowRight size={16}/>
        </button>
      ) : (
        <button
          type="button"
          className="primary"
          style={{padding:'9px 18px',fontSize:'13px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:'8px',background:'#2563eb',borderColor:'#1d4ed8'}}
          onClick={() => { setTab('rx'); setError(''); }}
        >
          Chuyển sang Kê đơn thuốc <ArrowRight size={16}/>
        </button>
      )}
    </div>
  </div>
</fieldset></>}
 {(tab==='services'||tab==='results')&&<><div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'14px',marginBottom:'18px'}}><div className="desk-section-heading" style={{marginBottom:labs.length?'12px':'4px'}}><h3 style={{fontSize:'14px',fontWeight:700,color:'#0f172a',display:'flex',alignItems:'center',gap:6}}><CheckCircle2 size={16} color="#0f766e"/>Kết quả Cận lâm sàng đã có ({labs.length})</h3><button className="text-button" onClick={()=>navigate('clinical')} style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:'12px'}}>Mở Bàn làm việc CLS & CĐHA <ArrowRight size={13}/></button></div>{labs.map(l=><article className="desk-result" key={l.id} style={{margin:'8px 0',padding:'12px',background:'#fff'}}><div><h4>{db.services.find(s=>s.id===l.service)?.name||l.service}</h4><span className="badge gray">{l.status}</span></div><small>{l.id} · {l.episodeId}</small>{l.status==='Đã phát hành'?<><p>{l.result||'Chưa có nội dung kết quả'}</p><p><b>Kết luận:</b> {l.conclusion||'—'}</p>{l.critical==='Có'&&<span className="badge amber" style={{marginTop:4,display:'inline-block'}}>Chỉ số cần theo dõi</span>}</>:<p className="desk-muted">{['admin','doctor'].includes(role)&&l.result?'Bản nháp chưa phát hành: '+l.result:'Chưa có kết quả được phát hành.'}</p>}</article>)}{!labs.length&&<p className="desk-muted" style={{margin:'4px 0',fontSize:'12px'}}>Chưa có chỉ định cận lâm sàng nào cho hồ sơ này.</p>}</div><div className="desk-section-heading"><h3>Chỉ định cận lâm sàng mới</h3><span>{episode.id}</span></div><button className="secondary" disabled={!canWrite} onClick={()=>setAction('package')}>Chọn gói dịch vụ mẫu</button><div className="desk-service-layout"><div><label>Tìm dịch vụ<input placeholder="Tên hoặc mã dịch vụ" value={serviceSearch} onChange={e=>setServiceSearch(e.target.value)}/></label><select aria-label="Nhóm dịch vụ bàn khám" value={serviceGroup} onChange={e=>setServiceGroup(e.target.value)}><option value="">Tất cả nhóm</option>{[...new Set(allServices.map(s=>s.kind))].map(s=><option key={s}>{s}</option>)}</select><div className="desk-service-list">{services.map(s=><label key={s.id}><input type="checkbox" disabled={!canWrite} checked={selectedServices.includes(s.id)} onChange={e=>setSelectedServices(old=>e.target.checked?[...old,s.id]:old.filter(x=>x!==s.id))}/><span><b>{s.name}</b><small>{s.id} · {s.kind}</small></span><strong>{money(s.price)}</strong></label>)}</div></div><div className="desk-service-basket"><h4>Phiếu đang chọn · {selectedServices.length} dịch vụ</h4>{selectedServices.map(s=>allServices.find(x=>x.id===s)).filter(Boolean).map(s=><p key={s.id}><span>{s.name}</span><b>{money(s.price)}</b></p>)}{(()=>{const bh = parseBhytCard(patient.insurance);const totalGross = selectedServices.reduce((a,id)=>a+Number(allServices.find(s=>s.id===id)?.price||0),0);const bhytPay = bh.hasInsurance ? Math.round((totalGross * bh.rate) / 100) : 0;const ptPay = totalGross - bhytPay;return <><p><b>Tổng dự kiến:</b><b>{money(totalGross)}</b></p>{bh.hasInsurance ? (<><p style={{fontSize:'12px',color:'#047857'}}><span>Quỹ BHYT ({bh.rate}%):</span><b>{money(bhytPay)}</b></p><p style={{fontSize:'12px',color:'#1d4ed8'}}><span>BN cùng chi trả:</span><b>{money(ptPay)}</b></p></>) : (<p style={{fontSize:'12px',color:'#475569'}}><span>Chế độ:</span><b>Viện phí 100%</b></p>)}</>;})()}<label>Chẩn đoán sơ bộ / Lý do chỉ định *<textarea rows={2} maxLength={500} value={note.diagnosis||''} disabled={!canWrite} onChange={e=>change('diagnosis',e.target.value)} placeholder="Nhập chẩn đoán sơ bộ hoặc lý do chỉ định..."/></label><label>Ưu tiên<select value={priority} onChange={e=>setPriority(e.target.value)}><option>Thường quy</option><option>Khẩn cấp</option></select></label><p className="desk-muted">Đơn giá chuẩn kỹ thuật từ CSDL SQL Server.</p><div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'8px'}}><button className="secondary" disabled={!granted('biz.labs:order')||locked||!selectedServices.length||saving} onClick={async()=>{if(!note.diagnosis?.trim()){setError('Chưa có chẩn đoán sơ bộ hoặc lý do chỉ định. Vui lòng nhập trong phiếu đang chọn.');return;}setError('');setSaving(true);try{await hisApi.createLabOrders({episodeId:episode.id,patient:patient.id,role,staffId:actor.staffId,diagnosis:note.diagnosis,priority,services:selectedServices});await syncWithSqlServer();setSelectedServices([]);notify('Đã lưu chỉ định CLS trong SQL Server');}catch(e){setError(e.message)}finally{setSaving(false);}}}>Lưu chỉ định nháp</button><button className="primary" disabled={!granted('biz.labs:order')||locked||!selectedServices.length||saving} style={{display:'inline-flex',alignItems:'center',gap:6}} onClick={async()=>{if(!note.diagnosis?.trim()){setError('Chưa có chẩn đoán sơ bộ hoặc lý do chỉ định. Vui lòng nhập trong phiếu đang chọn.');return;}setError('');setSaving(true);try{await hisApi.createLabOrders({episodeId:episode.id,patient:patient.id,role,staffId:actor.staffId,diagnosis:note.diagnosis,priority,services:selectedServices});await hisApi.dispatchVisit(episode.id,'CHO_KET_QUA_CLS','Chỉ định CLS & Chuyển phòng xét nghiệm');await syncWithSqlServer();setSelectedServices([]);fresh();notify(`Đã chuyển bệnh nhân #${episode.queueNumber||episode.id} sang phòng Cận lâm sàng (Chờ kết quả)`);}catch(e){setError(e.message)}finally{setSaving(false);}}}><Send size={14}/>Gửi chỉ định & Chuyển CLS</button></div></div></div><RecordList rows={charges} columns={[['id','Mã phiếu'],['name','Dịch vụ'],['status','Trạng thái']]}/><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'18px',paddingTop:'14px',borderTop:'1px solid #e2e8f0',flexWrap:'wrap',gap:'10px'}}><button type="button" className="secondary" style={{padding:'9px 16px',fontSize:'13px',fontWeight:600,display:'inline-flex',alignItems:'center',gap:'6px'}} onClick={()=>{setTab('exam');setError('');}}><ArrowLeft size={15}/> Quay lại Khám & Chẩn đoán</button><button type="button" className="primary" style={{padding:'9px 18px',fontSize:'13px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:'6px',background:'#2563eb',borderColor:'#1d4ed8'}} onClick={()=>{setTab('rx');setError('');}}>Tiếp tục sang Kê đơn thuốc <ArrowRight size={15}/></button></div></>}
 {tab==='rx'&&(()=>{
  const bh = parseBhytCard(patient.insurance);
  const hasPendingLabs = labs.some(l => l.status !== 'Đã phát hành' && l.status !== 'Đã hủy');
  return <><div className="desk-section-heading"><h3>Kê đơn thuốc</h3><span>Kết nối CSDL & Kho FEFO</span></div>
  {hasPendingLabs && (
    <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:'8px',padding:'9px 13px',marginBottom:'12px',fontSize:'12px',color:'#1e40af',display:'flex',alignItems:'center',gap:6}}>
      <span>ℹ️ <b>Lưu ý lâm sàng:</b> Bệnh nhân đang có chỉ định Cận lâm sàng chưa có kết quả đầy đủ. Bác sĩ nên kiểm tra kết quả CLS trước khi chốt đơn thuốc xuất viện.</span>
    </div>
  )}
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
  </div><fieldset className="desk-fields" disabled={!canWrite}><datalist id="rx-dose-options">{RX_DOSES.map(d=><option key={d} value={d}/>)}</datalist><datalist id="rx-freq-options">{RX_FREQ_PRESETS.map(p=><option key={p.freq} value={p.freq}/>)}</datalist>{lines.map((line,i)=>{const med=availableMeds.find(s=>s.id===line.medicine);const stockQty=med?.stockQty!==undefined?med.stockQty:(stock.find(s=>s.id===line.medicine)?.quantity??null);const isZero=med&&stockQty!==null&&stockQty<=0;const isOver=med&&stockQty!==null&&stockQty>0&&Number(line.quantity)>stockQty;return <div className="desk-rx-line" key={i}><div className="desk-section-heading"><b>Thuốc {i+1}</b><button type="button" className="icon-button" aria-label={'Xóa dòng thuốc '+(i+1)} disabled={lines.length===1} onClick={()=>setLines(lines.filter((_,j)=>j!==i))}><Trash2 size={15}/></button></div><div className="desk-field-grid"><label>Thuốc<MedicineCombobox medicines={availableMeds} value={line.medicine} onChange={id=>setLines(lines.map((l,j)=>j===i?{...l,medicine:id,unit:''}:l))} disabled={!canWrite} index={i}/></label><label>Đơn vị kê<select aria-label={'Đơn vị thuốc '+(i+1)} value={line.unit||''} onChange={e=>setLines(lines.map((l,j)=>j===i?{...l,unit:e.target.value}:l))}><option value="">{med?.unit||'Đơn vị cơ sở'}</option>{(med?.units||[]).map(u=><option key={u.unit} value={u.unit}>{u.unit} · {u.factor} đơn vị cơ sở</option>)}</select></label>{[['quantity','Số lượng','number'],['dose','Liều dùng','text'],['frequency','Tần suất','text'],['days','Số ngày','number']].map(([key,label,type])=><label key={key}>{label}<input aria-label={label+' thuốc '+(i+1)} type={type} list={key==='dose'?'rx-dose-options':key==='frequency'?'rx-freq-options':undefined} min={type==='number'?1:undefined} placeholder={key==='dose'?'VD: 1 viên':key==='frequency'?'VD: Ngày 2 lần (Sáng-Tối)':undefined} value={line[key]} onChange={e=>{const val=e.target.value;setLines(lines.map((l,j)=>{if(j!==i)return l;const upd={...l,[key]:val};if(key==='days'){const d=Number(val)||0;const daily=(Number(upd.morning)||0)+(Number(upd.noon)||0)+(Number(upd.evening)||0)+(Number(upd.night)||0);if(d>0&&daily>0)upd.quantity=daily*d;}return upd;}));}}/></label>)}<label>Đường dùng<select value={line.route} onChange={e=>setLines(lines.map((l,j)=>j===i?{...l,route:e.target.value}:l))}>{['Uống','Tiêm','Truyền','Bôi','Khác'].map(r=><option key={r}>{r}</option>)}</select></label></div><div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'8px',marginBottom:'4px',alignItems:'center'}}><span style={{fontSize:'11px',color:'#64748b',fontWeight:600}}>Chọn nhanh cữ uống:</span>{RX_FREQ_PRESETS.map(preset=><button key={preset.label} type="button" onClick={()=>{const days=Number(line.days)||5;const totalQty=preset.perDay>0?preset.perDay*days:(Number(line.quantity)||1);setLines(lines.map((l,j)=>j===i?{...l,frequency:preset.freq,dose:l.dose||'1 viên',morning:preset.morning,noon:preset.noon,evening:preset.evening,night:preset.night,quantity:totalQty}:l));}} style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:'4px',padding:'2px 8px',fontSize:'11px',color:'#0f766e',fontWeight:600,cursor:'pointer'}}>{preset.label}</button>)}</div>{isZero&&<div style={{margin:'6px 0 0',padding:'3px 8px',background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',borderRadius:'4px',fontSize:'11.5px',display:'inline-flex',alignItems:'center',gap:'5px',fontWeight:500}}>⚠️ Hết hàng trong kho (Tồn: 0) — Cần chọn thuốc thay thế</div>}{isOver&&<div style={{margin:'6px 0 0',padding:'3px 8px',background:'#fffbeb',border:'1px solid #fde68a',color:'#b45309',borderRadius:'4px',fontSize:'11.5px',display:'inline-flex',alignItems:'center',gap:'5px',fontWeight:500}}>⚠️ Tồn kho khả dụng chỉ còn {stockQty} {line.unit||med.unit||'đơn vị'} — Số lượng kê vượt tồn</div>}<div className="desk-dose-times" style={{marginTop:10}}>{[['morning','Sáng'],['noon','Trưa'],['evening','Chiều'],['night','Tối']].map(([key,label])=><label key={key}>{label}<input value={line[key]} onChange={e=>{const val=e.target.value;setLines(lines.map((l,j)=>{if(j!==i)return l;const upd={...l,[key]:val};const days=Number(upd.days)||0;const daily=(Number(upd.morning)||0)+(Number(upd.noon)||0)+(Number(upd.evening)||0)+(Number(upd.night)||0);if(days>0&&daily>0)upd.quantity=daily*days;return upd;}));}}/></label>)}</div></div>;})}<button className="secondary" onClick={()=>setLines([...lines,emptyLine()])}><Plus size={14}/>Thêm thuốc</button><label>Lời dặn cho đơn thuốc<MedicalSuggestInput type="advice" multiline rows={2} value={advice} onChange={val=>setAdvice(val)} placeholder="Uống sau ăn no, uống nhiều nước, hẹn tái khám..." disabled={!canWrite}/></label><button className="primary" disabled={saving} onClick={async()=>{if(saving)return;const overLines=lines.filter(l=>{if(!l.medicine)return false;const m=availableMeds.find(s=>s.id===l.medicine);const q=m?.stockQty!==undefined?m.stockQty:(stock.find(s=>s.id===l.medicine)?.quantity??null);return q!==null&&Number(l.quantity)>q;});if(overLines.length>0){const overNames=overLines.map(l=>availableMeds.find(s=>s.id===l.medicine)?.name||l.medicine).join(', ');if(!window.confirm(`Cảnh báo tồn kho:\nThuốc [${overNames}] kê vượt quá tồn kho khả dụng hiện tại.\n\nBạn có muốn tiếp tục lưu đơn nháp này sang quầy Dược?`))return;}setSaving(true);setError('');const body={action:'savePrescription',role,staffId:actor.staffId,patient:patient.id,episodeId:episode.id,diagnosis:note.diagnosis,advice,lines};const signature=JSON.stringify(body);if(rxRequest.current?.signature!==signature)rxRequest.current={signature,key:crypto.randomUUID()};try{await hisApi.pharmacyAction({...body,requestId:rxRequest.current.key});rxRequest.current=null;await syncWithSqlServer();setLines([emptyLine()]);setAdvice('');notify('Đã lưu đơn nháp. Duyệt đơn để chuyển đến dược sĩ.');}catch(e){setError(e.message)}finally{setSaving(false)}}}>Lưu đơn thuốc</button></fieldset><h4 className="desk-subheading">Các đơn của hồ sơ</h4>{prescriptions.map(r=><article className="desk-result" key={r.id}><div><b>{r.id}</b><span className="badge gray">{r.status}</span></div><p>{r.diagnosis} · {r.advice}</p>{r.lines.map((l,i)=><p key={i}>{stock.find(s=>s.id===l.medicine)?.name||l.medicine} · {l.quantity} · {l.dose} · {l.frequency} · {l.days} ngày</p>)}{canWrite&&<button className="text-button" onClick={()=>{if(lines.some(l=>l.medicine)&&!window.confirm('Thay đơn đang soạn bằng bản sao?'))return;setLines(r.lines.map(l=>({...emptyLine(),...l})));setAdvice(r.advice||'');notify('Đã sao chép vào bản nháp, chưa lưu đơn mới')}}>Sao chép thành đơn nháp</button>}{granted('biz.prescriptions:approve')&&!locked&&r.status==='Nháp'&&<button className="primary" disabled={saving} onClick={async()=>{if(saving)return;setSaving(true);setError('');try{await hisApi.pharmacyAction({action:'approvePrescription',id:r.id,role,staffId:actor.staffId,requestId:'approve-'+r.id});await syncWithSqlServer();notify('Đã duyệt đơn thuốc và chuyển đến dược sĩ.');}catch(e){setError(e.message)}finally{setSaving(false)}}}>Duyệt đơn thuốc</button>}<button className="text-button" onClick={()=>navigate('pharmacy')}>Mở Quầy Dược & Cấp phát thuốc<ArrowRight size={13}/></button><button className="text-button" onClick={()=>setPrintDoc({type:'rx',prescription:r})} style={{display:'inline-flex',alignItems:'center',gap:4}}><Printer size={13}/>In đơn thuốc (Mẫu Bộ Y tế)</button></article>)}{!prescriptions.length&&<p className="desk-muted">Chưa có đơn thuốc.</p>}<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'18px',paddingTop:'14px',borderTop:'1px solid #e2e8f0',flexWrap:'wrap',gap:'10px'}}><button type="button" className="secondary" style={{padding:'9px 16px',fontSize:'13px',fontWeight:600,display:'inline-flex',alignItems:'center',gap:'6px'}} onClick={()=>{setTab(hasClsOrder||labs.length?'services':'exam');setError('');}}><ArrowLeft size={15}/> {hasClsOrder||labs.length?'Quay lại Cận lâm sàng':'Quay lại Khám lâm sàng'}</button><div style={{display:'flex',gap:'8px'}}><button type="button" className="secondary" style={{padding:'9px 14px',fontSize:'13px',fontWeight:600,display:'inline-flex',alignItems:'center',gap:'6px'}} onClick={()=>{setTab('costs');setError('');}}>Xem Chi phí & BHYT <ArrowRight size={15}/></button><button type="button" className="primary" style={{padding:'9px 18px',fontSize:'13px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:'6px',background:'#059669',borderColor:'#047857'}} onClick={()=>save(true)} disabled={locked||saving}><Check size={16}/> Lưu & Kết thúc lượt khám (F4)</button></div></div></>;})()}
 {tab==='orders'&&<><h3>Y lệnh của tờ điều trị</h3><p className="desk-muted">Mỗi dòng là một cữ dự kiến. Tạo nhiều dòng nếu có nhiều cữ; điều dưỡng thực hiện và ghi nhận qua danh sách y lệnh.</p><fieldset disabled={!canWrite||!sheetId} className="desk-fields"><div className="desk-field-grid"><label>Loại y lệnh<select value={order.kind} onChange={e=>setOrder({...order,kind:e.target.value})}>{['Chăm sóc','Dùng thuốc','Theo dõi sinh hiệu','Thủ thuật'].map(k=><option key={k}>{k}</option>)}</select></label><label>Thời gian dự kiến<input aria-label="Thời gian cữ y lệnh" type="datetime-local" value={order.scheduled} onChange={e=>setOrder({...order,scheduled:e.target.value})}/></label>{order.kind==='Dùng thuốc'&&<><label>Thuốc<select value={order.medicine} onChange={e=>setOrder({...order,medicine:e.target.value})}><option value="">Chọn thuốc</option>{stock.filter(s=>s.kind==='THUOC'||s.type==='Thuốc').map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>Số lượng<input type="number" min="1" value={order.quantity} onChange={e=>setOrder({...order,quantity:e.target.value})}/></label></>}</div><label>Nội dung / hướng dẫn<MedicalSuggestInput type="orders" value={order.dose} onChange={val=>setOrder({...order,dose:val})} placeholder="Nhập hướng dẫn hoặc chọn cữ y lệnh chuẩn..." disabled={!canWrite||!sheetId}/></label><button className="primary" onClick={async()=>{try{setError('');await careCall({action:'order',episodeId:episode.id,sheetId,order});await syncWithSqlServer();setOrder({...order,dose:''});notify('Đã lưu y lệnh');}catch(e){setError(e.message)}}}>Thêm cữ thực hiện</button></fieldset>{!sheetId&&<p className="desk-warning">Lưu tờ điều trị trước khi thêm y lệnh.</p>}<RecordList rows={rounds.filter(r=>r.sheetId===sheetId)} columns={[['id','Mã y lệnh'],['kind','Loại'],['scheduled','Dự kiến'],['dose','Hướng dẫn'],['status','Trạng thái']]}/><button className="secondary" onClick={()=>navigate('care','rounds')}>Mở danh sách thực hiện y lệnh</button></>}
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
    <div style={{marginTop:'24px',paddingTop:'16px',borderTop:'1px solid #e2e8f0'}}>
      <div className="desk-section-heading"><h3>Lịch sử khám & Hồ sơ bệnh án người bệnh</h3></div>
      <PatientHistory patientId={patient.id} clinical/>
      <h4 className="desk-subheading">Phiên bản phiếu đang xem</h4>
      {(record?.revisions||[]).map((r,i)=><article className="desk-result" key={i}><b>Phiên bản {r.revision} · {r.savedAt}</b><p>{r.diagnosis} · {r.symptoms}</p></article>)}
      {record?.corrections?.map((r,i)=><p key={i} className="desk-muted">Đính chính: {r.reason} · {r.time}</p>)}
    </div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'18px',paddingTop:'14px',borderTop:'1px solid #e2e8f0',flexWrap:'wrap',gap:'10px'}}><button type="button" className="secondary" style={{padding:'9px 16px',fontSize:'13px',fontWeight:600,display:'inline-flex',alignItems:'center',gap:'6px'}} onClick={()=>{setTab('rx');setError('');}}><ArrowLeft size={15}/> Quay lại Kê đơn thuốc</button><button type="button" className="primary" style={{padding:'9px 18px',fontSize:'13px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:'6px',background:'#059669',borderColor:'#047857'}} onClick={()=>save(true)} disabled={locked||saving}><Check size={16}/> Lưu & Kết thúc lượt khám (F4)</button></div>
  </>;
})()}
  {error&&<p role="alert" className="form-error">{error}</p>}</div>
  <footer className="desk-toolbar"><div style={{display:'flex',gap:'8px',alignItems:'center',position:'relative'}}><div className="desk-menu-container"><button type="button" className="secondary" onClick={()=>{setShowPrintMenu(v=>!v);setShowTransferMenu(false);}}><Printer size={15}/>In biểu mẫu y tế <ChevronDown size={14}/></button>{showPrintMenu&&<div className="desk-dropdown-menu"><button type="button" onClick={()=>{setPrintDoc({type:'summary'});setShowPrintMenu(false);}}><Printer size={14}/>In tóm tắt bệnh án</button><button type="button" onClick={()=>{setPrintDoc({type:'reexam'});setShowPrintMenu(false);}}><FileText size={14}/>Giấy hẹn khám lại (Mẫu 05)</button><button type="button" onClick={()=>{setPrintDoc({type:'referral'});setShowPrintMenu(false);}}><FileText size={14}/>Giấy chuyển tuyến (Mẫu 06)</button></div>}</div>{writable&&!inpatient&&<div className="desk-menu-container"><button type="button" className="secondary" onClick={()=>{setShowTransferMenu(v=>!v);setShowPrintMenu(false);}}><ArrowRightLeft size={15}/>Điều chuyển & Nhập viện <ChevronDown size={14}/></button>{showTransferMenu&&<div className="desk-dropdown-menu"><button type="button" disabled={locked} onClick={()=>{setAction('transfer');setShowTransferMenu(false);}}><Building2 size={14}/>Chuyển phòng khám chuyên khoa</button><button type="button" onClick={()=>{setAction('admit');setShowTransferMenu(false);}}><BedDouble size={14}/>Chỉ định tiếp nhận nội trú (Nhập viện)</button></div>}</div>}</div>{writable&&<div style={{display:'flex',gap:'8px',alignItems:'center'}}><button className="secondary" disabled={locked||saving} title="Phím tắt F2" onClick={()=>save(false)}><Save size={15}/>Lưu nháp (F2)</button><button className="primary" disabled={locked||saving} title="Phím tắt F4" onClick={()=>save(true)}><Check size={15}/>{inpatient?'Duyệt & khóa tờ (F4)':'Kết thúc & khóa khám (F4)'}</button></div>}</footer>
 {action&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setAction(null)}}><section className="modal" role="dialog" aria-modal="true" aria-label="Thao tác hồ sơ"><button className="close icon-button" aria-label="Đóng thao tác hồ sơ" onClick={()=>setAction(null)}><X size={19}/></button><h2>{{reopen:'Mở đính chính hồ sơ',appointment:'Hẹn tái khám & In Mẫu 05',admit:'Tiếp nhận nội trú',referral:'Lập giấy chuyển tuyến (Mẫu 06)',defer:'Hoãn khám',transfer:'Chuyển phòng khám',package:'Chọn gói dịch vụ mẫu'}[action]}</h2><p className="dialog-subtitle">{patient.name} · {episode.id}</p>{action==='package'?<><p className="desk-warning">Gói minh họa để chọn nhanh. Không phải khuyến cáo chỉ định; kiểm tra từng dịch vụ trước khi lưu.</p>{['Xét nghiệm','Chẩn đoán hình ảnh','Thủ thuật'].map(kind=><div className="desk-result" key={kind}><b>{kind}</b>{!db.services.some(s=>s.kind===kind&&s.status==='Đang hoạt động')&&<p className="desk-muted">Chưa có dịch vụ đang hoạt động trong nhóm này.</p>}{db.services.filter(s=>s.kind===kind&&s.status==='Đang hoạt động').map(s=><label key={s.id} className="desk-package-option"><input type="checkbox" checked={selectedServices.includes(s.id)} onChange={e=>setSelectedServices(old=>e.target.checked?[...old,s.id]:old.filter(id=>id!==s.id))}/>{s.name} · {money(s.price)}</label>)}</div>)}<button className="primary full" onClick={()=>setAction(null)}>Đưa lựa chọn vào phiếu đang soạn</button></>:<form onSubmit={doAction}>{action==='appointment'&&<label>Ngày giờ tái khám<input name="date" type="datetime-local" min={today+'T00:00'} required/></label>}{action==='admit'&&<><label>Khoa điều trị tiếp nhận<select name="department" defaultValue={episode.department}>{clinics.map(c=><option key={c}>{c}</option>)}</select></label><label>Buồng giường dự kiến (Khoa nội trú duyệt)<select name="bedId"><option value="">Chờ điều dưỡng xếp buồng (Vào hàng đợi nội trú)</option>{beds.filter(b=>!b.patient&&!b.cleaning).map(b=><option value={b.id} key={b.id}>{b.roomName ? `${b.roomName} · ` : ''}Giường {b.bedNumber || b.id}</option>)}</select></label></>}{action==='transfer'&&<><label>Chuyên khoa tiếp nhận<select name="department" required defaultValue=""><option value="">Chọn chuyên khoa khác</option>{clinics.filter(c=>c!==episode.department).map(c=><option key={c}>{c}</option>)}</select></label><label>Phòng tiếp nhận<MedicalSuggestInput type="room" name="room" required placeholder="VD: Phòng 101 - Khám Nội Tổng Quát..." /></label></>}{action==='referral'&&<label>Cơ sở tiếp nhận (Bệnh viện tuyến trên)<MedicalSuggestInput type="destination" name="destination" required placeholder="VD: Bệnh viện Chợ Rẫy, Bệnh viện Bạch Mai..." /></label>}{action==='defer'&&<label>Lý do tạm hoãn<MedicalSuggestInput type="cancel" name="reason" multiline rows={2} required maxLength={2000} placeholder="Ghi nhận lý do tạm hoãn khám..." /></label>}{!['defer'].includes(action)&&<label>Lý do / nội dung chuyên môn<MedicalSuggestInput type={action==='admit'?'admission':action==='referral'?'proposal':'cancel'} name="reason" multiline rows={3} required maxLength={2000} placeholder="Nhập hoặc chọn lý do chuyên môn..." /></label>}{actionError&&<p className="form-error" role="alert">{actionError}</p>}<button className="primary full" type="submit" disabled={actionBusy}>{actionBusy?'Đang lưu…':action==='referral'?'Xác nhận & Mở Giấy chuyển tuyến Mẫu 06':action==='appointment'?'Xác nhận & Mở Giấy hẹn Mẫu 05':'Xác nhận'}</button></form>}</section></div>}
 {printDoc&&<div className="modal-backdrop" onClick={()=>setPrintDoc(null)}><section className="modal his-large-modal wide-modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><button className="close icon-button" aria-label="Đóng biểu mẫu" onClick={()=>setPrintDoc(null)}><X size={21}/></button><MedicalPaperFormViewer tab={printDoc.type==='rx'?'prescriptions':printDoc.type==='reexam'?'reexaminations':printDoc.type==='referral'?'referrals':'archives'} row={printDoc.type==='rx'?{id:printDoc.prescription.id,diagnosis:printDoc.prescription.diagnosis,advice:printDoc.prescription.advice,lines:printDoc.prescription.lines}:printDoc.type==='reexam'?{id:`GHKL-${episode.id}`,episodeId:episode.id,appointmentDate:printDoc.appointmentDate||record?.note?.appointmentDate||new Date(Date.now()+7*86400000).toISOString().slice(0,10),appointmentTime:record?.note?.appointmentTime||'08:30',clinicRoom:record?.note?.clinicRoom||`Phòng khám ${episode.department||'Nội tổng quát'}`,diagnosis:record?.note?.diagnosis||episode.diagnosis||note.diagnosis||'Bệnh lý theo dõi ngoại trú',icd:record?.note?.icd||note.icd||'I10',reason:record?.note?.reexamReason||'Tái khám theo hẹn đánh giá đáp ứng phác đồ điều trị',testsNeeded:record?.note?.testsNeeded||'Kiểm tra sinh hiệu, đánh giá triệu chứng lâm sàng',advice:record?.note?.advice||note.advice||'Dùng thuốc đúng chỉ định, nhịn ăn sáng trước khi tái khám',doctor:episode.doctor||actor.person}:printDoc.type==='referral'?{id:`CT-${episode.id}`,episodeId:episode.id,destination:printDoc.destination||'Bệnh viện Chợ Rẫy (Tuyến trên)',diagnosis:record?.note?.diagnosis||episode.diagnosis||note.diagnosis||'Bệnh lý vượt tuyến kỹ thuật',icd:record?.note?.icd||note.icd||'I10',clinicalSummary:note.symptoms||record?.note?.symptoms||'Triệu chứng và diễn biến bệnh ghi nhận trong đợt khám',treatment:note.plan||record?.note?.plan||'Đã xử trí ban đầu theo phác đồ',reason:printDoc.reason||'Vượt quá khả năng chuyên môn kỹ thuật của cơ sở',transportation:'Xe cứu thương chuyên dụng',doctor:episode.doctor||actor.person}:{id:episode.id,episodeId:episode.id,diagnosis:record?.note?.diagnosis||episode.diagnosis||'Chưa ghi nhận',treatment:record?.note?.plan||'Chưa ghi nhận',outcome:record?.note?.outcome||'Chưa ghi nhận',advice:record?.note?.advice||'Chưa ghi nhận'}} patient={patient} doctorStaff={{name:episode.doctor||actor.person}} onClose={()=>setPrintDoc(null)}/></section></div>}
 </>
}
function MedicineCombobox({medicines,value,onChange,disabled,index}){
  const [query,setQuery]=React.useState('');
  const [open,setOpen]=React.useState(false);
  const ref=React.useRef(null);
  const inputRef=React.useRef(null);
  const selected=medicines.find(s=>s.id===value);
  const displayValue=open?query:(selected?`${selected.name} · ${selected.unit}`:'');
  const filtered=React.useMemo(()=>{
    if(!query)return medicines.slice(0,100);
    const q=query.toLowerCase();
    return medicines.filter(s=>(s.name+s.id).toLowerCase().includes(q)).slice(0,80);
  },[medicines,query]);
  React.useEffect(()=>{
    function handler(e){if(ref.current&&!ref.current.contains(e.target)){setOpen(false);setQuery('');}}
    document.addEventListener('mousedown',handler);
    return()=>document.removeEventListener('mousedown',handler);
  },[]);
  function handleInputChange(e){
    setQuery(e.target.value);
    setOpen(true);
    if(!e.target.value){onChange('');}
  }
  function handleFocus(){
    setOpen(true);
    setQuery('');
  }
  function handleSelect(med){
    onChange(med.id);
    setOpen(false);
    setQuery('');
  }
  function handleKeyDown(e){
    if(e.key==='Escape'){setOpen(false);setQuery('');}
  }
  return(
    <div ref={ref} style={{position:'relative'}} className="med-combobox-wrap">
      <input
        ref={inputRef}
        aria-label={'Thuốc '+(index+1)}
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="Nhập tên hoặc mã thuốc..."
        disabled={disabled}
        autoComplete="off"
        style={{width:'100%'}}
      />
      {open&&filtered.length>0&&(
        <ul className="med-combobox-list" role="listbox">
          {filtered.map(s=>(
            <li key={s.id} role="option" aria-selected={s.id===value}
              className={s.id===value?'med-combobox-item selected':'med-combobox-item'}
              onMouseDown={e=>{e.preventDefault();handleSelect(s);}}>
              <span className="med-name">{s.name} · {s.unit}</span>
              {s.stockQty!==undefined&&<span className={s.stockQty<=0?'med-stock zero':'med-stock'}>{s.stockQty<=0?'Hết hàng':`Tồn: ${s.stockQty}`}</span>}
            </li>
          ))}
        </ul>
      )}
      {open&&filtered.length===0&&query&&(
        <div className="med-combobox-empty">Không tìm thấy thuốc &quot;{query}&quot;</div>
      )}
    </div>
  );
}

function ShieldNotice({patient,db}){const alerts=(db.operations?.records||[]).filter(r=>r.module==='safety'&&r.patient===patient.id&&r.status==='Đã xác minh');return <>{alerts.length?<><b>Cảnh báo:</b> {alerts.map(a=>a.substance+' · '+a.reaction).join('; ')}</>:<><b>Dị ứng:</b> Chưa ghi nhận.</>}</>}
function RecordList({rows,columns}){return rows.length?<div className="table-scroll desk-records"><table><thead><tr>{columns.map(([key,label])=><th key={key}>{label}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}>{columns.map(([key])=><td key={key}>{r[key]||'—'}</td>)}</tr>)}</tbody></table></div>:<p className="desk-muted">Chưa có dữ liệu liên kết.</p>}
