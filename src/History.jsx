import {hisApi} from './api';
import React,{useState,useEffect} from 'react';
import {Plus,Search,FileText,Stethoscope,BedDouble,X,Check,HeartPulse,Activity,Shield,AlertTriangle,Printer,Clock,User,Pill,Building2,ChevronRight,CheckCircle2} from 'lucide-react';
import {useWorkspace,getWorkspace,createVisit,saveVisitNote,syncWithSqlServer,transact,id,audit,episodeOptions,syncLatestPatient} from './workspace';
import {today,clinics} from './business-data';
import {actorRoles} from './roles';
import Icd10Search from './Icd10Search';
import { parseBhytCard } from './bhyt-utils';
import MedicalPaperFormViewer from './MedicalPaperForms';
import MedicalSuggestInput from './MedicalSuggestInput';

export function EpisodeField({patientId,value,onChange,inpatientOnly=false}){
  const [visits]=useWorkspace('visits'),[admissions]=useWorkspace('admissions');
  const choices=episodeOptions({visits,admissions},patientId).filter(v=>!inpatientOnly||admissions.some(a=>a.id===v.id));
  const signature=choices.map(v=>v.id).join('|');
  useEffect(()=>{
    if(!choices.some(v=>v.id===value))onChange(choices.find(v=>['Đang điều trị','Chờ khám','Đang khám','Chờ kết quả'].includes(v.status))?.id||choices[0]?.id||'');
  },[patientId,value,signature]);
  return <label className="episode-select">Lượt khám / đợt điều trị *
    <select name="episodeId" required value={value||''} onChange={e=>onChange(e.target.value)} className="his-select">
      <option value="">{patientId?'Chọn hồ sơ liên kết':'Chọn bệnh nhân trước'}</option>
      {choices.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}
    </select>
    {patientId&&!choices.length&&<small className="form-hint">{inpatientOnly?'Người bệnh chưa có đợt nội trú. Tiếp nhận nội trú trước khi lập chứng từ.':'Người bệnh chưa có lượt khám. Tiếp tân cần tạo lượt khám mới.'}</small>}
  </label>;
}

export function PatientHistory({patientId,clinical=false}){
  const [visits]=useWorkspace('visits'),[admissions]=useWorkspace('admissions'),[patients]=useWorkspace('patients');
  const pt = patients.find(p => p.id === patientId);
  const bh = parseBhytCard(pt?.insurance);
  const items=[...visits.filter(v=>v.patientId===patientId),...admissions.filter(a=>a.patientId===patientId)].sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
  return <div className="inline-history">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
      <h3 style={{margin:0}}>Lịch sử khám và điều trị · {items.length} hồ sơ</h3>
      {bh.hasInsurance ? (
        <span className={`badge ${bh.benefitBadgeClass}`} style={{fontSize:'10px'}}>
          {bh.benefitBadge} · {bh.code}
        </span>
      ) : (
        <span className="badge gray" style={{fontSize:'10px'}}>Viện phí 100%</span>
      )}
    </div>
    {items.map(v=><div className="episode-mini" key={v.id}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <b>{v.id}</b>
        <span className="badge teal" style={{fontSize:'9.5px'}}>{v.status}</span>
      </div>
      <div style={{fontSize:'12px',color:'#475569',marginTop:'2px'}}>
        <span>{v.date}</span> · <span>{v.department}</span> {v.doctor ? `· ${v.doctor}` : ''}
      </div>
      {clinical&&v.note?.diagnosis&&<p style={{margin:'4px 0 0',color:'#0f766e',fontWeight:600}}>Chẩn đoán: {v.note.diagnosis}</p>}
    </div>)}
    {!items.length&&<p className="form-hint">Chưa có lượt khám hoặc đợt điều trị.</p>}
  </div>;
}

export function VisitExam({patient,onClose,notify,role='admin',visitId}){
  const [visits]=useWorkspace('visits');
  const actor=actorRoles[role];
  const available=visits.filter(v=>v.patientId===patient.id&&v.status!=='Đã hủy'&&(role!=='doctor'||v.doctor.includes(actor.person))).sort((a,b)=>(b.date+'T'+b.time).localeCompare(a.date+'T'+a.time));
  const [selected,setSelected]=useState(visitId||available[0]?.id||'');
  const current=available.find(v=>v.id===selected);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);

  // Vitals State - initialized from current note vitals or defaults
  const vitalsObj = current?.note?.vitals || {};
  const [pulse, setPulse] = useState(vitalsObj.pulse ?? current?.note?.pulse ?? 78);
  const [systolic, setSystolic] = useState(
    vitalsObj.pressure ? Number(vitalsObj.pressure.split('/')[0]) : (current?.note?.systolic ?? 120)
  );
  const [diastolic, setDiastolic] = useState(
    vitalsObj.pressure ? Number(vitalsObj.pressure.split('/')[1]) : (current?.note?.diastolic ?? 80)
  );
  const [temp, setTemp] = useState(vitalsObj.temperature ?? current?.note?.temp ?? 36.8);
  const [spo2, setSpo2] = useState(vitalsObj.spo2 ?? current?.note?.spo2 ?? 98);
  const [respiratory, setRespiratory] = useState(vitalsObj.respiration ?? current?.note?.respiratory ?? 18);
  const [weight, setWeight] = useState(vitalsObj.weight ?? current?.note?.weight ?? 62);
  const [height, setHeight] = useState(vitalsObj.height ?? current?.note?.height ?? 165);

  // Clinical Exam State - 1:1 mapped to dbo.HoSoKham
  const [symptoms, setSymptoms] = useState(current?.note?.symptoms || 'Bệnh nhân cảm thấy mệt mỏi, đau đầu nhẹ, ho khan từng cơn');
  const [historyNotes, setHistoryNotes] = useState(current?.note?.history || current?.note?.historyNotes || 'Tiền sử tăng huyết áp 3 năm, điều trị liên tục. Không dị ứng thuốc.');
  const [physicalExam, setPhysicalExam] = useState(current?.note?.examination || current?.note?.physicalExam || 'Tri giác tỉnh, tiếp xúc tốt. Da niêm hồng. Tim đều, T1 T2 rõ. Phổi không rale. Bụng mềm.');
  const [primaryIcd, setPrimaryIcd] = useState(current?.note?.icd || current?.note?.primaryIcd || 'I10');
  const [secondaryIcd, setSecondaryIcd] = useState(current?.note?.comorbidities || current?.note?.secondaryIcd || '');
  const [diagnosis, setDiagnosis] = useState(current?.note?.diagnosis || 'Tăng huyết áp vô căn (I10)');
  const [orders, setOrders] = useState(current?.note?.orders || 'Công thức máu (CBC), Điện giải đồ, Đo điện tim (ECG 12 cần)');
  const [outcome, setOutcome] = useState(current?.note?.outcome || 'Điều trị ngoại trú');
  const [advice, setAdvice] = useState(current?.note?.advice || 'Uống thuốc đúng giờ, ăn nhạt, kiêng mỡ động vật. Đo huyết áp mỗi sáng. Tái khám sau 7 ngày.');
  const [revisitDays, setRevisitDays] = useState(current?.note?.revisitDays || 7);

  // Auto calculate BMI
  const bmi = weight && height ? (weight / Math.pow(height / 100, 2)).toFixed(1) : 22.8;
  const bmiClassification = bmi < 18.5 ? 'Gầy' : bmi < 23 ? 'Bình thường' : bmi < 25 ? 'Tiền béo phì' : 'Béo phì';

  function handleIcdSelect(code, name, isPrimary = true) {
    if (isPrimary) {
      setPrimaryIcd(code);
      setDiagnosis(`${name} (${code})${secondaryIcd ? ` / Kèm theo: ${secondaryIcd}` : ''}`);
    } else {
      setSecondaryIcd(code);
      setDiagnosis(`${diagnosis.split(' / ')[0]} / Kèm theo: ${name} (${code})`);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setError('');

    if (!symptoms.trim()) {
      setError('Vui lòng nhập lý do khám & triệu chứng bệnh sử.');
      return;
    }
    if (!diagnosis.trim()) {
      setError('Vui lòng nhập chẩn đoán xác định.');
      return;
    }

    setSaving(true);
    try {
      const examData = {
        symptoms: symptoms.trim(),
        history: historyNotes.trim(),
        examination: physicalExam.trim(),
        diagnosis: diagnosis.trim(),
        icd: primaryIcd.trim(),
        comorbidities: secondaryIcd.trim(),
        plan: `Hướng xử trí: ${outcome}. Đơn thuốc / chỉ định: ${orders || 'Theo dõi'}. Hẹn tái khám: ${revisitDays} ngày.`,
        orders: orders.trim(),
        advice: advice.trim(),
        outcome: outcome,
        revisitDays: Number(revisitDays),
        vitals: {
          pulse: Number(pulse) || null,
          temperature: Number(temp) || null,
          pressure: `${systolic}/${diastolic}`,
          respiration: Number(respiratory) || null,
          spo2: Number(spo2) || null,
          height: Number(height) || null,
          weight: Number(weight) || null
        }
      };
      await saveVisitNote(selected, examData);
      await syncWithSqlServer();
      notify(`Đã lưu và ghi nhận phiếu khám bệnh thành công cho ${patient.name} (${selected})`);
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu phiếu khám.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="his-reception-container">
      {/* HEADER BANNER */}
      <div className="his-form-header">
        <div className="his-header-title">
          <Stethoscope size={24} className="his-header-icon" />
          <div>
            <h2>Phiếu khám bệnh lâm sàng chuyên khoa & Chẩn đoán ICD-10</h2>
            <p className="his-header-sub">
              Người bệnh: <b>{patient.name}</b> · Mã BN: <b>{patient.id}</b> · {patient.gender}, {patient.birth} · {(() => {
                const bh = parseBhytCard(patient.insurance);
                return bh.hasInsurance ? <span>BHYT: <b>{bh.code}</b> ({bh.benefitBadge} · {bh.groupName})</span> : <span>Chế độ: <b>Viện phí (Khám tự chi trả)</b></span>;
              })()}
            </p>
          </div>
        </div>
        <div className="his-mode-badge">
          <span className="badge teal">Khám Bệnh Ngoại Trú (HIS Viettel)</span>
        </div>
      </div>

      {available.length ? (
        <form onSubmit={handleSubmit} className="his-form-content">
          {/* LƯỢT KHÁM ACTIVE SELECTION */}
          <div className="his-form-section his-lookup-section">
            <div className="his-section-header">
              <Activity size={16} />
              <span>Lượt tiếp đón đang điều trị</span>
            </div>
            <div className="his-field-group">
              <label className="his-label">
                Lượt khám ghi nhận kết quả:
                <select
                  aria-label="Lượt khám đang ghi nhận"
                  value={selected}
                  onChange={e => { setSelected(e.target.value); setError(''); }}
                  className="his-select"
                >
                  {available.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.id} · Ngày: {v.date} {v.time} · Chuyên khoa: {v.department} · Trạng thái: {v.status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* KHU 1: CHỈ SỐ SINH HIỆU */}
          <div className="his-form-section">
            <div className="his-section-header">
              <HeartPulse size={16} />
              <span>1. Dấu hiệu sinh tồn (Sinh hiệu) & Thể trạng</span>
            </div>

            <div className="his-grid-4">
              <label className="his-label">
                Mạch (lần/phút) *
                <input
                  type="number"
                  required
                  min="30"
                  max="250"
                  value={pulse}
                  onChange={e => setPulse(Number(e.target.value))}
                  className="his-input"
                />
              </label>

              <label className="his-label">
                Huyết áp (mmHg) *
                <div className="his-flex-inputs">
                  <input
                    type="number"
                    required
                    min="50"
                    max="260"
                    placeholder="Tâm thu"
                    value={systolic}
                    onChange={e => setSystolic(Number(e.target.value))}
                    className="his-input"
                    title="Huyết áp tâm thu"
                  />
                  <span className="his-separator">/</span>
                  <input
                    type="number"
                    required
                    min="30"
                    max="150"
                    placeholder="Tâm trương"
                    value={diastolic}
                    onChange={e => setDiastolic(Number(e.target.value))}
                    className="his-input"
                    title="Huyết áp tâm trương"
                  />
                </div>
              </label>

              <label className="his-label">
                Nhiệt độ (°C) *
                <input
                  type="number"
                  step="0.1"
                  required
                  min="34"
                  max="43"
                  value={temp}
                  onChange={e => setTemp(Number(e.target.value))}
                  className="his-input"
                />
              </label>

              <label className="his-label">
                SpO2 (%) *
                <input
                  type="number"
                  required
                  min="70"
                  max="100"
                  value={spo2}
                  onChange={e => setSpo2(Number(e.target.value))}
                  className="his-input"
                />
              </label>

              <label className="his-label">
                Nhịp thở (lần/phút)
                <input
                  type="number"
                  min="10"
                  max="60"
                  value={respiratory}
                  onChange={e => setRespiratory(Number(e.target.value))}
                  className="his-input"
                />
              </label>

              <label className="his-label">
                Chiều cao (cm)
                <input
                  type="number"
                  step="0.5"
                  min="40"
                  max="220"
                  value={height}
                  onChange={e => setHeight(Number(e.target.value))}
                  className="his-input"
                />
              </label>

              <label className="his-label">
                Cân nặng (kg)
                <input
                  type="number"
                  step="0.5"
                  min="2"
                  max="200"
                  value={weight}
                  onChange={e => setWeight(Number(e.target.value))}
                  className="his-input"
                />
              </label>

              <div className="his-label">
                Chỉ số thể trạng BMI
                <div className="his-bmi-tag">
                  <strong>{bmi} kg/m²</strong>
                  <span className={`badge ${bmiClassification === 'Bình thường' ? 'teal' : 'amber'}`}>
                    {bmiClassification}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* KHU 2: BỆNH SỬ & KHÁM LÂM SÀNG */}
          <div className="his-form-section">
            <div className="his-section-header">
              <FileText size={16} />
              <span>2. Quá trình bệnh lý, Tiền sử & Khám lâm sàng</span>
            </div>

            <div className="his-grid-1">
              <label className="his-label">
                Lý do vào khám & Quá trình bệnh lý đợt này *
                <MedicalSuggestInput
                  type="symptoms"
                  multiline
                  rows={2}
                  value={symptoms}
                  onChange={val => setSymptoms(val)}
                  placeholder="Lý do vào khám và diễn biến bệnh..."
                />
              </label>
            </div>

            <div className="his-grid-2">
              <label className="his-label">
                Tiền sử bản thân & gia đình
                <MedicalSuggestInput
                  type="history"
                  multiline
                  rows={2}
                  value={historyNotes}
                  onChange={val => setHistoryNotes(val)}
                  placeholder="Tiền sử bệnh lý, dị ứng, thuốc đang dùng..."
                />
              </label>

              <label className="his-label">
                Khám toàn thân & các cơ quan bộ phận
                <MedicalSuggestInput
                  type="examination"
                  multiline
                  rows={2}
                  value={physicalExam}
                  onChange={val => setPhysicalExam(val)}
                  placeholder="Tri giác, da niêm, tim phổi, bụng..."
                />
              </label>
            </div>
          </div>

          {/* KHU 3: CHẨN ĐOÁN & TRA CỨU ICD-10 */}
          <div className="his-form-section">
            <div className="his-section-header">
              <Shield size={16} />
              <span>3. Chẩn đoán xác định & Tra cứu danh mục ICD-10 từ CSDL Bộ Y tế</span>
            </div>

            <div className="his-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <span className="his-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Bệnh chính (Mã ICD-10 CSDL) *
                </span>
                <Icd10Search
                  valueCode={primaryIcd}
                  valueName=""
                  onChange={({ code, name }) => {
                    if (code) {
                      handleIcdSelect(code, name, true);
                    } else {
                      setPrimaryIcd('');
                    }
                  }}
                />
              </div>

              <div>
                <span className="his-label" style={{ display: 'block', marginBottom: '6px' }}>
                  Bệnh kèm theo (ICD-10 phụ)
                </span>
                <Icd10Search
                  valueCode={secondaryIcd}
                  valueName=""
                  onChange={({ code, name }) => {
                    if (code) {
                      handleIcdSelect(code, name, false);
                    } else {
                      setSecondaryIcd('');
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <label className="his-label">
                Chẩn đoán lâm sàng mô tả đầy đủ *
                <MedicalSuggestInput
                  type="diagnosis"
                  required
                  value={diagnosis}
                  onChange={val => setDiagnosis(val)}
                  placeholder="Ví dụ: Tăng huyết áp vô căn (I10) / Kèm theo: Đái tháo đường typ 2 (E11)..."
                />
              </label>
            </div>
          </div>

          {/* KHU 4: CHỈ ĐỊNH CLS, HƯỚNG XỬ TRÍ & LỜI DẶN */}
          <div className="his-form-section">
            <div className="his-section-header">
              <AlertTriangle size={16} />
              <span>4. Chỉ định cận lâm sàng, Hướng xử trí & Lời dặn bác sĩ</span>
            </div>

            <div className="his-grid-2">
              <label className="his-label">
                Chỉ định Cận lâm sàng (CLS) đề xuất
                <MedicalSuggestInput
                  type="orders"
                  value={orders}
                  onChange={val => setOrders(val)}
                  placeholder="Xét nghiệm máu, X-quang tim phổi, Siêu âm bụng tổng quát..."
                />
              </label>

              <label className="his-label">
                Hướng xử trí kết luận *
                <select value={outcome} onChange={e => setOutcome(e.target.value)} className="his-select">
                  <option value="Điều trị ngoại trú">Kê đơn cho về điều trị ngoại trú</option>
                  <option value="Chờ kết quả CLS">Lưu chờ kết quả xét nghiệm / CĐHA</option>
                  <option value="Chỉ định nhập viện">Chỉ định nhập viện điều trị nội trú</option>
                  <option value="Chuyển tuyến">Lập phiếu chuyển viện tuyến trên</option>
                  <option value="Hẹn tái khám">Hẹn ngày tái khám chuyên khoa</option>
                </select>
              </label>

              <label className="his-label">
                Lời dặn dò chế độ điều trị & dinh dưỡng
                <MedicalSuggestInput
                  type="advice"
                  multiline
                  rows={2}
                  value={advice}
                  onChange={val => setAdvice(val)}
                  placeholder="Uống thuốc đúng giờ, ăn nhạt, kiêng mỡ động vật..."
                />
              </label>

              <label className="his-label">
                Số ngày hẹn tái khám chuyên khoa
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={revisitDays}
                  onChange={e => setRevisitDays(Number(e.target.value))}
                  className="his-input"
                />
              </label>
            </div>
          </div>

          {error && <p role="alert" className="form-error">{error}</p>}

          {/* ACTION BUTTONS */}
          <div className="his-bottom-actions">
            <button className="secondary" type="button" onClick={onClose}>
              Đóng
            </button>
            <button className="primary his-submit-button" type="submit" disabled={saving}>
              {saving ? 'Đang lưu CSDL...' : <><Check size={18} /> Lưu phiếu khám & Cập nhật CSDL (SQL Server)</>}
            </button>
          </div>
        </form>
      ) : (
        <div className="his-empty-state">
          <p>Người bệnh không có lượt khám nào đang hoạt động để ghi nhận.</p>
          <button className="secondary" onClick={onClose}>Đóng cửa sổ</button>
        </div>
      )}
    </div>
  );
}

export default function History({role='admin',patientId,navigate,notify}){
  const [patients]=useWorkspace('patients'),[visits]=useWorkspace('visits'),[admissions]=useWorkspace('admissions'),[beds]=useWorkspace('beds'),[db]=useWorkspace('business');
  const actor=actorRoles[role];
  const isPatientScoped = Boolean(patientId || role === 'patient');
  const effectivePatientId = patientId || (role === 'patient' ? (patients.find(p => p.id === 'BN0001')?.id || patients[0]?.id) : null);
  const [selectedPtId,setSelectedPtId]=useState(effectivePatientId||patients[0]?.id||'');
  const [selectedEpisodeId,setSelectedEpisodeId]=useState('');
  const [kindFilter,setKindFilter]=useState('Tất cả');
  const [search,setSearch]=useState('');
  const [modal,setModal]=useState(null);
  const [error,setError]=useState('');
  const clinical=['admin','doctor','patient'].includes(role);

  // Filter matched patients based on search, strictly scoped if patient role/prop
  const matchedPatients = isPatientScoped
    ? patients.filter(p => p.id === (effectivePatientId || selectedPtId))
    : patients.filter(p => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (p.name || '').toLowerCase().includes(q) ||
          (p.id || '').toLowerCase().includes(q) ||
          (p.phone || '').includes(q) ||
          (p.cccd || '').includes(q) ||
          (p.insurance || '').toLowerCase().includes(q);
      });

  const curPt = isPatientScoped
    ? (patients.find(p => p.id === (effectivePatientId || selectedPtId)) || patients[0])
    : (matchedPatients.find(p => p.id === selectedPtId) || matchedPatients[0] || patients[0]);
  const bh = parseBhytCard(curPt?.insurance);

  // Encounters of the currently viewed patient
  const ptEncounters = [
    ...visits.filter(v => v.patientId === curPt?.id).map(v => ({ ...v, kind: 'Ngoại trú' })),
    ...admissions.filter(a => a.patientId === curPt?.id).map(a => ({ ...a, kind: 'Nội trú' }))
  ]
    .filter(x => kindFilter === 'Tất cả' || x.kind === kindFilter)
    .sort((a, b) => (b.date + 'T' + (b.time || '00:00') + b.id).localeCompare(a.date + 'T' + (a.time || '00:00') + a.id));

  const activeEp = ptEncounters.find(e => e.id === selectedEpisodeId) || ptEncounters[0];

  // Ancillary orders and prescriptions for this encounter
  const activeLabs = activeEp ? db.labs.filter(l => l.episodeId === activeEp.id) : [];
  const activeRxs = activeEp ? db.prescriptions.filter(r => r.episodeId === activeEp.id) : [];
  const vitals = activeEp?.note?.vitals || {};

  function open(value){setError('');setModal(value)}

  async function save(e){
    e.preventDefault();
    try{
      const f=Object.fromEntries(new FormData(e.target));
      if(modal.type==='visit'){
        await createVisit(f);
      }else if(modal.type==='admit'){
        transact(d=>{
          if(d.admissions.some(a=>a.patientId===f.patientId&&a.status==='Đang điều trị'))throw new Error('Người bệnh đang có đợt điều trị chưa ra viện.');
          const bed=d.beds.find(b=>b.id===Number(f.bedId));
          if(!bed||bed.patient||bed.cleaning)throw new Error('Giường không còn sẵn sàng.');
          const admission={
            id:id('DTNT'),
            patientId:f.patientId,
            visitId:f.visitId||null,
            department:f.department,
            doctor:f.doctor,
            date:f.date,
            time:f.time,
            reason:f.reason,
            careLevel:f.careLevel||'Cấp 2',
            diet:f.diet||'Cơm bệnh lý',
            status:'Đang điều trị',
            createdAt:new Date().toISOString(),
            bedHistory:[{bedId:bed.id,from:f.date+'T'+f.time,to:null}]
          };
          d.admissions.unshift(admission);
          bed.patient=f.patientId;
          bed.admissionId=admission.id;
          audit(d,'Tiếp nhận nội trú '+admission.id,actor.person);
        });
      }else if(modal.type==='cancel'){
        const state=getWorkspace();
        const v=state.visits.find(x=>x.id===modal.row.id);
        if(!v||v.locked||v.status==='Đã hủy')throw new Error('Lượt khám không còn cho phép hủy.');
        if(state.business.settlements.some(r=>r.episodeId===v.id&&['Đã thanh toán','Đã hoàn tiền'].includes(r.status)))throw new Error('Lượt khám đã quyết toán, không thể hủy.');
        if(['labs','prescriptions'].some(tab=>state.business[tab].some(r=>r.episodeId===v.id&&!['Đã hủy','Đã từ chối'].includes(r.status))))throw new Error('Lượt khám còn chỉ định hoặc đơn thuốc.');
        await hisApi.changeVisit({visitId:v.id,action:'cancel',reason:f.reason});
        await syncWithSqlServer();
      }
      setModal(null);
      notify('Đã lưu thông tin lịch sử khám và điều trị');
    }catch(e){
      setError(e.message);
    }
  }

  return (
    <div className="his-emr-archive-container">
      {/* 1. Header Toolbar & Patient Quick Search */}
      <section className="panel" style={{ marginBottom: '14px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
              Bệnh án điện tử & Tra cứu Hồ sơ KCB (EMR Archive)
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Tra cứu lịch sử khám bệnh liên thông, theo dõi diễn biến bệnh án qua các năm và chi tiết cận lâm sàng/đơn thuốc.
            </p>
          </div>
          <div className="row-actions">
            {['admin','receptionist'].includes(role)&&<button className="primary" onClick={()=>open({type:'visit'})}><Plus size={15}/>Tạo lượt khám mới</button>}
            {['admin','nurse'].includes(role)&&<button className="secondary" onClick={()=>open({type:'admit'})}><BedDouble size={15}/>Tiếp nhận nội trú</button>}
          </div>
        </div>

        {/* Search & Select Patient Bar - scoped for clinicians/admin, hidden for patient */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isPatientScoped && (
            <>
              <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '260px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
                <input
                  aria-label="Tìm kiếm người bệnh tra cứu bệnh án"
                  placeholder="Nhập tên BN, mã BN (BN-...), số CCCD hoặc SĐT..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="his-input"
                  style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
                />
                {search.trim() && (
                  <div style={{ position: 'absolute', top: '44px', left: 0, right: 0, background: '#ffffff', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid #cbd5e1', zIndex: 9999, maxHeight: '280px', overflowY: 'auto', padding: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', padding: '4px 8px', fontWeight: 600 }}>
                      Tìm thấy {matchedPatients.length} người bệnh phù hợp:
                    </div>
                    {matchedPatients.slice(0, 6).map(p => {
                      const pBh = parseBhytCard(p.insurance);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPtId(p.id);
                            setSelectedEpisodeId('');
                            setSearch('');
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background 0.15s ease',
                            borderBottom: '1px solid #f1f5f9'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f0fdfa'}
                          onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                        >
                          <div>
                            <b style={{ fontSize: '13px', color: '#0f172a' }}>{p.name}</b>
                            <span style={{ fontSize: '11.5px', color: '#64748b', marginLeft: 8 }}>Mã: {p.id}</span>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>
                              SĐT: {p.phone || '—'} · CCCD: {p.cccd || '—'} {p.birth ? `· Sinh: ${p.birth}` : ''}
                            </div>
                          </div>
                          <div>
                            {pBh.hasInsurance ? (
                              <span className={`badge ${pBh.benefitBadgeClass}`} style={{ fontSize: '10px' }}>
                                BHYT {pBh.rate}%
                              </span>
                            ) : (
                              <span className="badge gray" style={{ fontSize: '10px' }}>Viện phí</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Chọn hồ sơ:</span>
                <select
                  aria-label="Chọn người bệnh xem bệnh án"
                  value={curPt?.id || ''}
                  onChange={e => {
                    setSelectedPtId(e.target.value);
                    setSelectedEpisodeId('');
                  }}
                  className="his-select"
                  style={{ minWidth: '260px', height: '38px', fontWeight: 600, color: '#0f766e' }}
                >
                  {matchedPatients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.id} ({p.gender}, {p.birth ? `${new Date().getFullYear() - Number(String(p.birth).slice(0, 4))}T` : ''}) {p.insurance ? '· BHYT' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: isPatientScoped ? '0' : 'auto' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Phân loại:</span>
            <select
              aria-label="Lọc loại hồ sơ"
              value={kindFilter}
              onChange={e => setKindFilter(e.target.value)}
              className="his-select"
              style={{ width: 'auto', height: '38px', fontSize: '12.5px' }}
            >
              <option value="Tất cả">Tất cả đợt KCB</option>
              <option value="Ngoại trú">Chỉ Ngoại trú</option>
              <option value="Nội trú">Chỉ Nội trú</option>
            </select>
          </div>
        </div>
      </section>

      {/* 2. Patient Master Identity Banner */}
      {curPt ? (
        <section className="panel" style={{ marginBottom: '14px', padding: '16px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#0f766e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px' }}>
                {curPt.name?.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <b style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>{curPt.name}</b>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Mã BN: <b>{curPt.id}</b> · {curPt.gender} · {curPt.birth} ({curPt.birth ? `${new Date().getFullYear() - Number(String(curPt.birth).slice(0, 4))} tuổi` : ''})
                </span>
              </div>
            </div>

            <div>
              <small style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Liên hệ & Định danh</small>
              <div style={{ fontSize: '12.5px', color: '#1e293b' }}>
                SĐT: <b>{curPt.phone || 'Chưa có'}</b>
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                CCCD: {curPt.cccd || 'Chưa cập nhật'}
              </div>
            </div>

            <div>
              <small style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Chế độ Bảo hiểm Y tế</small>
              {bh.hasInsurance ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={`badge ${bh.benefitBadgeClass}`} style={{ fontSize: '11px', fontWeight: 600 }}>
                    {bh.benefitBadge} · {bh.rate}%
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#047857', fontWeight: 700 }}>
                    {bh.code}
                  </span>
                </div>
              ) : (
                <span className="badge gray" style={{ fontSize: '11px' }}>Khám Viện phí 100%</span>
              )}
              <small style={{ display: 'block', color: '#64748b', fontSize: '10.5px' }}>
                {bh.hasInsurance ? `Cùng chi trả: ${bh.copayRate}%` : 'Tự túc viện phí'}
              </small>
            </div>

            <div>
              <small style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Cảnh báo y tế quan trọng</small>
              <div style={{ fontSize: '12px', color: curPt.allergy ? '#b91c1c' : '#047857', fontWeight: 600 }}>
                {curPt.allergy ? `⚠️ Dị ứng: ${curPt.allergy}` : '✓ Không có tiền sử dị ứng'}
              </div>
              <small style={{ color: '#64748b', fontSize: '11px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={curPt.history}>
                Bệnh nền: {curPt.history || 'Chưa ghi nhận'}
              </small>
            </div>
          </div>
        </section>
      ) : null}

      {/* 3. Split EMR Layout: Timeline on Left, Deep Medical Record on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 24vw) minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
        {/* LEFT PANE: ENCOUNTER TIMELINE */}
        <section className="panel" style={{ padding: '14px', maxHeight: '78vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> Lịch sử KCB ({ptEncounters.length} đợt)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ptEncounters.map((ep, idx) => {
              const isSelected = activeEp?.id === ep.id;
              const isDone = ['Hoàn tất', 'Đã ra viện', 'Đã kết thúc'].includes(ep.status);
              return (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => setSelectedEpisodeId(ep.id)}
                  style={{
                    border: isSelected ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
                    borderLeft: isSelected ? '4px solid #0f766e' : '3px solid #cbd5e1',
                    background: isSelected ? '#f0fdfa' : '#ffffff',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 1px 4px rgba(15,118,110,0.12)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: isSelected ? '#0f766e' : '#334155' }}>
                      {ep.id}
                    </span>
                    <span className={`badge ${ep.kind === 'Nội trú' ? 'purple' : 'teal'}`} style={{ fontSize: '9.5px', padding: '1px 5px' }}>
                      {ep.kind}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 600 }}>
                    {ep.department}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    <span>{ep.date} {ep.time ? `· ${ep.time}` : ''}</span>
                    <span className={`badge ${isDone ? 'teal' : ep.status === 'Đang điều trị' || ep.status === 'Đang khám' ? 'blue' : 'amber'}`} style={{ fontSize: '9.5px', padding: '1px 5px' }}>
                      {ep.status}
                    </span>
                  </div>

                  {ep.note?.diagnosis && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#0f766e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ep.note.diagnosis}>
                      🩺 {ep.note.diagnosis}
                    </div>
                  )}
                </button>
              );
            })}
            {!ptEncounters.length && (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
                Người bệnh chưa có lượt khám hoặc đợt điều trị nào.
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANE: COMPREHENSIVE EMR MEDICAL RECORD */}
        <section className="panel" style={{ padding: '20px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
          {activeEp ? (
            <div>
              {/* Record Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                      Hồ sơ Bệnh án: {activeEp.id}
                    </h3>
                    <span className={`badge ${activeEp.kind === 'Nội trú' ? 'purple' : 'teal'}`}>
                      {activeEp.kind}
                    </span>
                    <span className="badge gray">
                      {activeEp.status}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                    Chuyên khoa: <b>{activeEp.department}</b> · Buồng khám: <b>{activeEp.room || 'Phòng khám chuyên khoa'}</b> · Bác sĩ phụ trách: <b>{activeEp.doctor}</b>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="secondary" onClick={() => setModal({ type: 'printReexam', episode: activeEp })} title="In Giấy hẹn khám lại theo Mẫu số 05 (Nghị định 75/2023/NĐ-CP)">
                    <FileText size={15} /> Giấy hẹn khám lại (Mẫu 05)
                  </button>
                  <button className="secondary" onClick={() => setModal({ type: 'printSummary', episode: activeEp })} title="In tóm tắt bệnh án (Phụ lục 4 - Thông tư 18/2022/TT-BYT)">
                    <Printer size={15} /> Tóm tắt bệnh án
                  </button>
                  {activeEp.kind === 'Nội trú' && (
                    <button className="secondary" onClick={() => setModal({ type: 'printDischarge', episode: activeEp })} title="In Giấy ra viện (Phụ lục 3 - Thông tư 18/2022/TT-BYT)">
                      <FileText size={15} /> Giấy ra viện
                    </button>
                  )}
                  {clinical && activeEp.kind === 'Ngoại trú' && (
                    <button className="primary" onClick={() => open({ type: 'exam', row: activeEp })} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Stethoscope size={15} /> Mở phiếu khám
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 1: VITALS */}
              <div style={{ marginBottom: '18px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13.5px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HeartPulse size={16} style={{ color: '#0f766e' }} /> 1. Dấu hiệu sinh tồn & Thể trạng tại thời điểm khám
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <small style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Huyết áp</small>
                    <b style={{ fontSize: '13px', color: '#0f172a' }}>{vitals.pressure || (activeEp.bpSystolic ? `${activeEp.bpSystolic}/${activeEp.bpDiastolic}` : '120/80')} mmHg</b>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Mạch</small>
                    <b style={{ fontSize: '13px', color: '#0f172a' }}>{vitals.pulse || activeEp.pulse || 78} bpm</b>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Nhiệt độ</small>
                    <b style={{ fontSize: '13px', color: '#0f172a' }}>{vitals.temperature || activeEp.temperature || 36.8} °C</b>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>SpO2</small>
                    <b style={{ fontSize: '13px', color: '#0f172a' }}>{vitals.spo2 || activeEp.spo2 || 98} %</b>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Chiều cao / Cân nặng</small>
                    <b style={{ fontSize: '13px', color: '#0f172a' }}>{vitals.height || activeEp.height || 165}cm / {vitals.weight || activeEp.weight || 60}kg</b>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Chỉ số BMI</small>
                    <b style={{ fontSize: '13px', color: '#047857' }}>
                      {vitals.height && vitals.weight ? (Number(vitals.weight) / Math.pow(Number(vitals.height) / 100, 2)).toFixed(1) : '22.0'} (Bình thường)
                    </b>
                  </div>
                </div>
              </div>

              {/* SECTION 2: CLINICAL SOAP EXAMINATION */}
              <div style={{ marginBottom: '18px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13.5px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Stethoscope size={16} style={{ color: '#0f766e' }} /> 2. Diễn biến bệnh sử, Khám thực thể & Chẩn đoán ICD-10
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <small style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Triệu chứng cơ năng / Lý do vào khám</small>
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#1e293b', lineHeight: 1.5 }}>
                      {activeEp.note?.symptoms || activeEp.reason || 'Bệnh nhân đến khám kiểm tra sức khỏe theo định kỳ.'}
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <small style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Khám thực thể toàn thân & cơ quan</small>
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#1e293b', lineHeight: 1.5 }}>
                      {activeEp.note?.examination || 'Tri giác tỉnh táo, tiếp xúc tốt. Da niêm hồng. Tim đều, T1 T2 rõ. Phổi thông khí đều 2 bên, không rale. Bụng mềm, không chướng.'}
                    </p>
                  </div>

                  <div style={{ gridColumn: 'span 2', background: '#ecfdf5', padding: '12px 14px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                    <small style={{ color: '#047857', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Chẩn đoán xác định theo từ điển ICD-10</small>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge teal" style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>
                        {activeEp.note?.icd || activeEp.icd || 'I10'}
                      </span>
                      <b style={{ fontSize: '14px', color: '#065f46' }}>
                        {activeEp.note?.diagnosis || activeEp.diagnosis || 'Tăng huyết áp vô căn (nguyên phát)'}
                      </b>
                    </div>
                    {activeEp.note?.comorbidities && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#047857' }}>
                        <b>Bệnh kèm theo:</b> {activeEp.note.comorbidities}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: PARACLINICAL LAB & IMAGING ORDERS */}
              <div style={{ marginBottom: '18px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13.5px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={16} style={{ color: '#0f766e' }} /> 3. Kết quả Cận lâm sàng & Chẩn đoán hình ảnh ({activeLabs.length} chỉ định)
                </h4>
                {activeLabs.length > 0 ? (
                  <div className="table-scroll" style={{ border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <table style={{ margin: 0, fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>DỊCH VỤ KỸ THUẬT</th>
                          <th>TRẠNG THÁI</th>
                          <th>KẾT QUẢ ĐO / HÌNH ẢNH</th>
                          <th>KẾT LUẬN CHUYÊN MÔN</th>
                          <th>NGƯỜI KÝ DUYỆT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeLabs.map((l, i) => (
                          <tr key={i}>
                            <td>
                              <b>{db.services.find(s => s.id === l.service)?.name || l.service}</b>
                              <small style={{ display: 'block', color: '#64748b' }}>Mã phiếu: {l.id}</small>
                            </td>
                            <td>
                              <span className={`badge ${l.status === 'Đã phát hành' ? 'teal' : l.status === 'Đang thực hiện' ? 'blue' : 'amber'}`}>
                                {l.status}
                              </span>
                            </td>
                            <td>{l.result || (l.rows?.length ? l.rows.map(r => `${r.name}: ${r.value} ${r.unit}`).join(', ') : 'Chưa có kết quả')}</td>
                            <td style={{ color: '#0f766e', fontWeight: 600 }}>{l.conclusion || '—'}</td>
                            <td>{l.reviewer || 'KTV Trưởng'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#64748b' }}>
                    Đợt khám này không có chỉ định cận lâm sàng phát sinh.
                  </div>
                )}
              </div>

              {/* SECTION 4: PRESCRIBED MEDICINES */}
              <div style={{ marginBottom: '18px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13.5px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Pill size={16} style={{ color: '#0f766e' }} /> 4. Đơn thuốc & Cấp phát ngoại trú ({activeRxs.length} đơn thuốc)
                </h4>
                {activeRxs.length > 0 ? (
                  activeRxs.map((rx, rxIdx) => (
                    <div key={rxIdx} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
                      <div style={{ padding: '8px 12px', background: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span>Đơn thuốc mã: <b>{rx.id}</b> · Kê ngày: <b>{rx.date}</b></span>
                        <span className={`badge ${rx.status === 'Đã cấp phát' ? 'teal' : 'amber'}`}>
                          {rx.status}
                        </span>
                      </div>
                      <table style={{ margin: 0, fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th>TÊN THUỐC</th>
                            <th style={{ textAlign: 'center' }}>SỐ LƯỢNG</th>
                            <th>CÁCH DÙNG & TẦN SUẤT</th>
                            <th>SỐ NGÀY</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(rx.lines || []).map((l, lineIdx) => (
                            <tr key={lineIdx}>
                              <td><b>{db.stock?.find(s => s.id === l.medicine)?.name || l.medicine}</b></td>
                              <td style={{ textAlign: 'center' }}><b>{l.quantity}</b> {l.unit || 'Viên'}</td>
                              <td>{l.dose || 'Theo chỉ định'} · {l.route || 'Uống'}</td>
                              <td>{l.days || 7} ngày</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#64748b' }}>
                    Đợt khám này chưa kê đơn thuốc.
                  </div>
                )}
              </div>

              {/* SECTION 5: OUTCOME & ADVICE */}
              <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: '#047857' }}>
                  5. Hướng xử trí kết luận & Lời dặn Bác sĩ
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', fontSize: '12.5px' }}>
                  <div>
                    <small style={{ color: '#64748b', display: 'block' }}>Quyết định xử trí</small>
                    <b style={{ color: '#0f172a' }}>{activeEp.note?.outcome || 'Điều trị ngoại trú theo đơn'}</b>
                  </div>
                  <div>
                    <small style={{ color: '#64748b', display: 'block' }}>Lời dặn chế độ ăn & sinh hoạt</small>
                    <p style={{ margin: 0, color: '#334155' }}>
                      {activeEp.note?.advice || 'Uống thuốc đúng liều lượng, đúng giờ. Ăn uống điều độ, giảm muối và chất béo. Tái khám sau 7 ngày hoặc khi có dấu hiệu bất thường.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <FileText size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <h4>Chưa chọn hồ sơ đợt khám</h4>
              <p>Chọn một lượt khám từ dòng thời gian bên trái để xem đầy đủ hồ sơ bệnh án.</p>
            </div>
          )}
        </section>
      </div>

      {modal&&(
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <section
            className="modal business-modal wide-modal his-large-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Lịch sử khám và điều trị"
            onClick={e=>e.stopPropagation()}
          >
            <button className="close icon-button" aria-label="Đóng lịch sử" onClick={()=>setModal(null)}>
              <X size={20}/>
            </button>

            {modal.type === 'printReexam' ? (
              <MedicalPaperFormViewer
                tab="reexaminations"
                row={{
                  id: `GHKL-${modal.episode.id}`,
                  episodeId: modal.episode.id,
                  appointmentDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                  appointmentTime: '08:30',
                  clinicRoom: `Phòng khám ${modal.episode.department || 'Nội tổng quát'}`,
                  diagnosis: modal.episode.note?.diagnosis || modal.episode.diagnosis || 'Tăng huyết áp / Đái tháo đường',
                  icd: modal.episode.note?.icd || modal.episode.icd || 'I10',
                  reason: 'Tái khám đánh giá đáp ứng phác đồ điều trị sau 7 ngày',
                  testsNeeded: 'Kiểm tra sinh hiệu, xét nghiệm máu cơ bản theo dõi điều trị',
                  advice: modal.episode.note?.advice || 'Dùng thuốc đúng giờ, nhịn ăn sáng trước khi đến khám',
                  doctor: modal.episode.doctor || 'BS.CKI Trần Minh Anh'
                }}
                patient={curPt}
                doctorStaff={{ name: modal.episode.doctor || 'BS.CKI Trần Minh Anh' }}
                onClose={() => setModal(null)}
              />
            ) : modal.type === 'printDischarge' ? (
              <MedicalPaperFormViewer
                tab="discharges"
                row={{
                  id: `RV-${modal.episode.id}`,
                  episodeId: modal.episode.id,
                  diagnosis: modal.episode.note?.diagnosis || modal.episode.diagnosis || 'Đợt điều trị nội trú',
                  icd: modal.episode.note?.icd || modal.episode.icd || 'J18.1',
                  treatment: modal.episode.note?.plan || 'Điều trị nội trú kháng sinh, truyền dịch và chăm sóc',
                  outcome: 'Đỡ / giảm',
                  daysOff: 7,
                  advice: modal.episode.note?.advice || 'Nghỉ ngơi, dùng thuốc theo đơn và tái khám theo hẹn'
                }}
                patient={curPt}
                doctorStaff={{ name: modal.episode.doctor || 'BS.CKI Trần Minh Anh' }}
                onClose={() => setModal(null)}
              />
            ) : modal.type === 'printSummary' ? (
              <MedicalPaperFormViewer
                tab="archives"
                row={{
                  ...modal.episode,
                  id: modal.episode.id,
                  episodeId: modal.episode.id,
                  diagnosis: modal.episode.note?.diagnosis || modal.episode.diagnosis || 'Khám kiểm tra sức khỏe tổng quát',
                  treatment: modal.episode.note?.plan || 'Điều trị ngoại trú theo đơn chỉ định',
                  outcome: modal.episode.note?.outcome || modal.episode.status || 'Đỡ / Giảm',
                  advice: modal.episode.note?.advice || 'Tái khám theo hẹn'
                }}
                patient={curPt}
                doctorStaff={{ name: modal.episode.doctor || 'BS.CKI Trần Minh Anh' }}
                onClose={() => setModal(null)}
              />
            ) : modal.type==='exam' ? (
              <VisitExam
                patient={patients.find(p=>p.id===modal.row.patientId)}
                visitId={modal.row.id}
                role={role}
                onClose={()=>setModal(null)}
                notify={notify}
              />
            ) : modal.type==='detail' ? (
              <>
                <h2>Hồ sơ bệnh án {modal.row.id}</h2>
                <p className="dialog-subtitle">{modal.row.kind} · {modal.row.date} {modal.row.time} · {modal.row.department}</p>
                {clinical&&modal.row.note&&(
                  <div className="clinical-note">
                    <p><b>Triệu chứng:</b> {modal.row.note.symptoms}</p>
                    <p><b>Chẩn đoán ICD-10:</b> {modal.row.note.diagnosis}</p>
                    <p><b>Chỉ định:</b> {modal.row.note.orders||'Không có'}</p>
                    <p><b>Hướng xử trí:</b> {modal.row.note.outcome}</p>
                    {modal.row.note.advice&&<p><b>Lời dặn:</b> {modal.row.note.advice}</p>}
                  </div>
                )}
                {modal.row.bedHistory&&(
                  <>
                    <h3 style={{fontSize:13, marginTop: 15}}>Lịch sử buồng giường điều trị</h3>
                    {modal.row.bedHistory.map((h,i)=>(
                      <p className="form-hint" key={i}>
                        Giường {h.bedId}: {h.from.replace('T',' · ')} → {h.to?new Date(h.to).toLocaleString('vi-VN'):'Đang sử dụng'}
                      </p>
                    ))}
                  </>
                )}
                {clinical&&(
                  <>
                    <h3 style={{fontSize:13,marginTop:20}}>Chứng từ phát sinh của hồ sơ này</h3>
                    {['labs','prescriptions','rounds','archives','settlements'].flatMap(t=>db[t].filter(r=>r.episodeId===modal.row.id).map(r=>(
                      <div key={r.id} className="episode-summary">
                        <p className="form-hint">{r.id} · {r.status} {r.diagnosis?'· '+r.diagnosis:''}</p>
                      </div>
                    )))}
                    {!['labs','prescriptions','rounds','archives','settlements'].some(t=>db[t].some(r=>r.episodeId===modal.row.id))&&(
                      <p className="form-hint">Chưa có chứng từ liên kết.</p>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <h2>{modal.type==='visit'?'Tạo lượt khám mới':modal.type==='admit'?'Tiếp nhận đợt điều trị nội trú':'Xác nhận hủy lượt khám'}</h2>
                <p className="dialog-subtitle">{modal.type==='cancel'?modal.row.id:'Ghi nhận đầy đủ thông tin nhập viện và phân buồng giường theo chuẩn Viettel HIS.'}</p>
                <form onSubmit={save} className="his-form-body">
                  {modal.type==='cancel' ? (
                    <>
                      <div className="confirm-warning">Hủy lượt này sẽ loại lượt khỏi hàng đợi khám. Các thông tin đã ghi nhận vẫn được lưu nhật ký.</div>
                      <label className="his-field-label">Lý do hủy *<MedicalSuggestInput type="cancel" name="reason" required placeholder="Nhập hoặc chọn lý do hủy lượt chuẩn y tế..."/></label>
                    </>
                  ) : (
                    <>
                      <div className="form-row">
                        <label className="his-field-label">
                          Người bệnh *
                          <select name="patientId" required defaultValue={patient||''} className="his-select">
                            <option value="">Chọn người bệnh</option>
                            {patients.map(p=><option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}
                          </select>
                        </label>
                        <label className="his-field-label">
                          Khoa tiếp nhận *
                          <select name="department" required className="his-select">
                            {clinics.map(c=><option key={c}>{c}</option>)}
                          </select>
                        </label>
                      </div>

                      <div className="form-row form-row-3">
                        <label className="his-field-label">Ngày tiếp nhận *<input name="date" type="date" defaultValue={today} required className="his-input"/></label>
                        <label className="his-field-label">Giờ tiếp nhận *<input name="time" type="time" defaultValue="08:30" required className="his-input"/></label>
                        <label className="his-field-label">
                          Bác sĩ phụ trách *
                          <select name="doctor" required className="his-select">
                            {db.staff.filter(s=>s.title==='Bác sĩ'&&s.status==='Đang hoạt động').map(s=><option key={s.id} value={'BS. '+s.name}>{s.name}</option>)}
                          </select>
                        </label>
                      </div>

                      {modal.type==='admit'&&(
                        <>
                          <div className="form-row form-row-3">
                            <label className="his-field-label">
                              Giường bệnh nội trú khả dụng *
                              <select name="bedId" required className="his-select">
                                <option value="">Chọn giường</option>
                                {beds.filter(b=>!b.patient&&!b.cleaning).map(b=><option key={b.id} value={b.id}>Phòng {201+Math.floor((b.id-1)/3)} · Giường {b.id}</option>)}
                              </select>
                            </label>
                            <label className="his-field-label">
                              Cấp độ chăm sóc
                              <select name="careLevel" className="his-select">
                                <option>Cấp 1 - Chăm sóc toàn diện 24/24</option>
                                <option selected>Cấp 2 - Chăm sóc hỗ trợ</option>
                                <option>Cấp 3 - Tự phục vụ một phần</option>
                              </select>
                            </label>
                            <label className="his-field-label">
                              Chế độ dinh dưỡng
                              <select name="diet" className="his-select">
                                <option>Cơm bệnh lý thường</option>
                                <option>Chế độ kiêng muối (Tim mạch/Thận)</option>
                                <option>Chế độ đái tháo đường (ĐTĐ)</option>
                                <option>Cháo / Súp dinh dưỡng</option>
                              </select>
                            </label>
                          </div>
                          <label className="his-field-label">
                            Chẩn đoán và lý do nhập viện *
                            <MedicalSuggestInput type="admission" name="reason" multiline rows={2} required placeholder="Chẩn đoán xác định, tình trạng nặng cần theo dõi..."/>
                          </label>
                        </>
                      )}
                    </>
                  )}
                  {error&&<p className="form-error" role="alert">{error}</p>}
                  <button className="primary full his-submit-btn"><Check size={16}/>{modal.type==='cancel'?'Xác nhận hủy lượt':'Lưu hồ sơ mới'}</button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
