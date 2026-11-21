import {hisApi} from './api';
import React,{useState,useEffect} from 'react';
import {Plus,Search,FileText,Stethoscope,BedDouble,X,Check,HeartPulse,Activity,Shield,AlertTriangle} from 'lucide-react';
import {useWorkspace,getWorkspace,createVisit,saveVisitNote,syncWithSqlServer,transact,id,audit,episodeOptions,syncLatestPatient} from './workspace';
import {today,clinics} from './business-data';
import {actorRoles} from './roles';

const COMMON_ICD10 = [
  { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)' },
  { code: 'E11', name: 'Đái tháo đường không phụ thuộc insulin (Type 2)' },
  { code: 'J00', name: 'Viêm mũi họng cấp tính (cảm thường)' },
  { code: 'J06.9', name: 'Nhiễm trùng đường hô hấp trên cấp tính' },
  { code: 'K21', name: 'Bệnh trào ngược dạ dày - thực quản (GERD)' },
  { code: 'K29.7', name: 'Viêm dạ dày, không xác định' },
  { code: 'M54.5', name: 'Đau thắt lưng (đau lưng vùng thấp)' },
  { code: 'M17', name: 'Thoái hóa khớp gối' },
  { code: 'R05', name: 'Ho kéo dài chưa rõ nguyên nhân' },
  { code: 'R50.9', name: 'Sốt, không xác định' },
  { code: 'J20', name: 'Viêm phế quản cấp' },
  { code: 'I20', name: 'Cơn đau thắt ngực (bệnh mạch vành)' }
];

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
  const [visits]=useWorkspace('visits'),[admissions]=useWorkspace('admissions');
  const items=[...visits.filter(v=>v.patientId===patientId),...admissions.filter(a=>a.patientId===patientId)].sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
  return <div className="inline-history">
    <h3>Lịch sử khám và điều trị · {items.length} hồ sơ</h3>
    {items.map(v=><div className="episode-mini" key={v.id}>
      <b>{v.id}</b> · {v.date} · {v.department}<br/>
      {v.status}{clinical&&v.note?.diagnosis&&<p>Chẩn đoán: {v.note.diagnosis}</p>}
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
              Người bệnh: <b>{patient.name}</b> · Mã BN: <b>{patient.id}</b> · {patient.gender}, {patient.birth} · BHYT: {patient.insurance || 'Không có'}
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

          {/* KHU 1: CHỈ SỐ SINH HIỆU (dbo.PhieuSinhHieu) */}
          <div className="his-form-section">
            <div className="his-section-header">
              <HeartPulse size={16} />
              <span>1. Dấu hiệu sinh tồn (Sinh hiệu) & Thể trạng (Lưu bảng dbo.PhieuSinhHieu)</span>
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

          {/* KHU 2: BỆNH SỬ & KHÁM LÂM SÀNG (dbo.HoSoKham) */}
          <div className="his-form-section">
            <div className="his-section-header">
              <FileText size={16} />
              <span>2. Quá trình bệnh lý, Tiền sử & Khám lâm sàng (Lưu bảng dbo.HoSoKham)</span>
            </div>

            <div className="his-grid-1">
              <label className="his-label">
                Lý do vào khám & Quá trình bệnh lý đợt này (dbo.HoSoKham.benhSu) *
                <textarea
                  required
                  rows={2}
                  value={symptoms}
                  onChange={e => setSymptoms(e.target.value)}
                  className="his-textarea"
                />
              </label>
            </div>

            <div className="his-grid-2">
              <label className="his-label">
                Tiền sử bản thân & gia đình (dbo.HoSoKham.tienSuBanThan)
                <textarea
                  rows={2}
                  value={historyNotes}
                  onChange={e => setHistoryNotes(e.target.value)}
                  className="his-textarea"
                />
              </label>

              <label className="his-label">
                Khám toàn thân & các cơ quan bộ phận (dbo.HoSoKham.khamToanThan)
                <textarea
                  rows={2}
                  value={physicalExam}
                  onChange={e => setPhysicalExam(e.target.value)}
                  className="his-textarea"
                />
              </label>
            </div>
          </div>

          {/* KHU 3: CHẨN ĐOÁN & TRA CỨU ICD-10 */}
          <div className="his-form-section">
            <div className="his-section-header">
              <Shield size={16} />
              <span>3. Chẩn đoán xác định & Mã hóa danh mục ICD-10 (Bộ Y tế)</span>
            </div>

            <div className="his-quick-icd">
              <span>Mã ICD-10 gợi ý nhanh:</span>
              <div className="his-icd-tags">
                {COMMON_ICD10.slice(0, 6).map(icd => (
                  <button
                    type="button"
                    key={icd.code}
                    className="his-icd-chip"
                    onClick={() => handleIcdSelect(icd.code, icd.name, true)}
                  >
                    <b>{icd.code}</b> {icd.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="his-grid-3">
              <label className="his-label">
                Mã bệnh chính ICD-10 (dbo.HoSoKham.maICDXacDinh) *
                <select
                  value={primaryIcd}
                  onChange={e => {
                    const item = COMMON_ICD10.find(x => x.code === e.target.value);
                    handleIcdSelect(e.target.value, item ? item.name : '', true);
                  }}
                  className="his-select"
                >
                  {COMMON_ICD10.map(x => (
                    <option key={x.code} value={x.code}>{x.code} - {x.name}</option>
                  ))}
                </select>
              </label>

              <label className="his-label">
                Mã bệnh kèm theo (ICD-10 phụ)
                <select
                  value={secondaryIcd}
                  onChange={e => {
                    const item = COMMON_ICD10.find(x => x.code === e.target.value);
                    handleIcdSelect(e.target.value, item ? item.name : '', false);
                  }}
                  className="his-select"
                >
                  <option value="">-- Không có bệnh kèm theo --</option>
                  {COMMON_ICD10.map(x => (
                    <option key={x.code} value={x.code}>{x.code} - {x.name}</option>
                  ))}
                </select>
              </label>

              <label className="his-label">
                Chẩn đoán mô tả đầy đủ (dbo.HoSoKham.chanDoanXacDinh) *
                <input
                  required
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  className="his-input"
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
                <input
                  value={orders}
                  onChange={e => setOrders(e.target.value)}
                  placeholder="Xét nghiệm máu, X-quang tim phổi, Siêu âm bụng tổng quát..."
                  className="his-input"
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
                Lời dặn dò chế độ điều trị & dinh dưỡng (dbo.HoSoKham.loiDanBacSi)
                <textarea
                  rows={2}
                  value={advice}
                  onChange={e => setAdvice(e.target.value)}
                  placeholder="Uống thuốc đúng giờ, ăn nhạt, kiêng mỡ động vật..."
                  className="his-textarea"
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
  const actor=actorRoles[role],[patient,setPatient]=useState(patientId||''),[kind,setKind]=useState('Tất cả'),[search,setSearch]=useState(''),[modal,setModal]=useState(null),[error,setError]=useState(''),[page,setPage]=useState(0);
  const clinical=['admin','doctor','patient'].includes(role);
  const combined=[...visits.map(v=>({...v,kind:'Ngoại trú'})),...admissions.map(a=>({...a,kind:'Nội trú'}))].filter(x=>(!patientId||x.patientId===patientId)&&(role!=='doctor'||x.doctor.includes(actor.person))&&(!patient||x.patientId===patient)&&(kind==='Tất cả'||x.kind===kind)).filter(x=>(x.id+' '+patients.find(p=>p.id===x.patientId)?.name+' '+x.department+' '+x.date).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>(b.date+'T'+b.time+b.id).localeCompare(a.date+'T'+a.time+a.id));
  
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
    <div className="history-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Lượt khám & đợt điều trị <span className="count">{combined.length}</span></h2>
            <p>Mỗi lần khám và đợt nội trú có mã hồ sơ riêng, giữ nguyên kết quả các lần trước.</p>
          </div>
          <div className="row-actions">
            {['admin','receptionist'].includes(role)&&<button className="primary" onClick={()=>open({type:'visit'})}><Plus size={15}/>Tạo lượt khám</button>}
            {['admin','nurse'].includes(role)&&<button className="secondary" onClick={()=>open({type:'admit'})}><BedDouble size={15}/>Tiếp nhận nội trú</button>}
          </div>
        </div>

        <div className="table-tools">
          <label className="search">
            <Search size={16}/>
            <input aria-label="Tìm lịch sử khám" placeholder="Tên, mã hồ sơ, ngày khám..." value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}}/>
          </label>
          {!patientId&&<select aria-label="Lọc người bệnh" value={patient} onChange={e=>{setPatient(e.target.value);setPage(0)}} className="his-select">
            <option value="">Tất cả người bệnh</option>
            {patients.filter(p=>role!=='doctor'||p.doctor.includes(actor.person)||combined.some(v=>v.patientId===p.id)).map(p=><option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}
          </select>}
          <select aria-label="Loại hồ sơ" value={kind} onChange={e=>{setKind(e.target.value);setPage(0)}} className="his-select">
            {['Tất cả','Ngoại trú','Nội trú'].map(k=><option key={k}>{k}</option>)}
          </select>
        </div>

        <div className="history-timeline">
          {combined.slice(page*8,page*8+8).map(v=>(
            <article className="episode-card" key={v.id}>
              <header>
                <div>
                  <h3>{patients.find(p=>p.id===v.patientId)?.name} · {v.kind}</h3>
                  <div className="episode-id">{v.id} · {v.date} {v.time}</div>
                </div>
                <span className={'badge '+(v.status==='Đã hủy'?'danger':v.status==='Hoàn tất'||v.status==='Đã ra viện'?'teal':'amber')}>{v.status}</span>
              </header>
              <p>{v.department} · {v.doctor}</p>
              {v.reason&&<p>Lý do tiếp nhận: {v.reason}</p>}
              {clinical&&v.note&&<div className="episode-note">
                <p><b>Chẩn đoán:</b> {v.note.diagnosis}</p>
                <p>Hướng xử trí: {v.note.outcome}</p>
              </div>}
              {v.dischargedAt&&<p>Ra viện: {new Date(v.dischargedAt).toLocaleString('vi-VN')}</p>}
              <div className="episode-actions">
                <button className="secondary" onClick={()=>open({type:'detail',row:v})}><FileText size={14}/>Chi tiết hồ sơ</button>
                {v.kind==='Ngoại trú'&&v.status!=='Đã hủy'&&['admin','doctor'].includes(role)&&<button className="secondary" onClick={()=>open({type:'exam',row:v})}><Stethoscope size={14}/>Mở phiếu khám</button>}
                {v.kind==='Ngoại trú'&&['admin','receptionist'].includes(role)&&v.status!=='Đã hủy'&&<button className="text-button" onClick={()=>open({type:'cancel',row:v})}>Hủy lượt</button>}
              </div>
            </article>
          ))}
          {!combined.length&&<div className="business-empty"><FileText size={34}/><h3>Chưa có hồ sơ phù hợp</h3><p>Tạo lượt khám mới hoặc thay đổi bộ lọc.</p></div>}
        </div>

        <div className="history-pagination">
          <span>{combined.length?page*8+1:0}–{Math.min(page*8+8,combined.length)} / {combined.length} hồ sơ</span>
          <div className="row-actions">
            <button className="secondary" disabled={page===0} onClick={()=>setPage(page-1)}>Trước</button>
            <button className="secondary" disabled={(page+1)*8>=combined.length} onClick={()=>setPage(page+1)}>Sau</button>
          </div>
        </div>
      </section>

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

            {modal.type==='exam' ? (
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
                      <label className="his-field-label">Lý do hủy *<textarea name="reason" required className="his-textarea"/></label>
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
                            <textarea name="reason" required placeholder="Chẩn đoán xác định, tình trạng nặng cần theo dõi..." className="his-textarea"/>
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
