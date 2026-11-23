import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Save, Printer, AlertTriangle, CheckCircle, ShieldCheck, User, Calendar, MapPin, Building2, Stethoscope, Clock, Activity, Check, X, Info } from 'lucide-react';
import { parseBhytCard } from './bhyt-utils';
import MedicalSuggestInput from './MedicalSuggestInput';

const HOSPITALS = [
  { name: 'Bệnh viện Chợ Rẫy TP. Hồ Chí Minh', code: '79-015', level: 'Tuyến 1 (Tuyến Trung ương)' },
  { name: 'Bệnh viện Đại học Y Dược TP. Hồ Chí Minh', code: '79-026', level: 'Tuyến 1 (Tuyến Trung ương)' },
  { name: 'Bệnh viện Thống Nhất', code: '79-018', level: 'Tuyến 1 (Tuyến Trung ương)' },
  { name: 'Bệnh viện Bạch Mai Hà Nội', code: '01-001', level: 'Tuyến 1 (Tuyến Trung ương)' },
  { name: 'Bệnh viện Hữu nghị Việt Đức', code: '01-002', level: 'Tuyến 1 (Tuyến Trung ương)' },
  { name: 'Bệnh viện Nhân dân 115', code: '79-020', level: 'Tuyến 2 (Tuyến Tỉnh / TP)' },
  { name: 'Bệnh viện Ung Bướu TP. Hồ Chí Minh', code: '79-014', level: 'Tuyến 2 (Tuyến Tỉnh / TP)' },
  { name: 'Bệnh viện Nhi Đồng 1', code: '79-011', level: 'Tuyến 2 (Tuyến Tỉnh / TP)' },
  { name: 'Bệnh viện Từ Dũ', code: '79-008', level: 'Tuyến 2 (Tuyến Tỉnh / TP)' },
  { name: 'Bệnh viện Chấn thương Chỉnh hình', code: '79-022', level: 'Tuyến 2 (Tuyến Tỉnh / TP)' }
];

const COMMON_ICD = [
  { code: 'I20.0', name: 'Cơn đau thắt ngực không ổn định (Hội chứng vành cấp)' },
  { code: 'I21.9', name: 'Nhồi máu cơ tim cấp không đặc hiệu' },
  { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)' },
  { code: 'E11.9', name: 'Đái tháo đường type 2 không có biến chứng' },
  { code: 'J44.9', name: 'Bệnh phổi tắc nghẽn mạn tính (COPD)' },
  { code: 'K29.0', name: 'Viêm dạ dày xuất huyết cấp' },
  { code: 'K21.0', name: 'Bệnh trào ngược dạ dày - thực quản có viêm thực quản' },
  { code: 'M17.9', name: 'Thoái hóa khớp gối không đặc hiệu' },
  { code: 'N18.9', name: 'Bệnh thận mạn không đặc hiệu' }
];

export default function StatutoryPaperBusinessForm({
  tab,
  initialRow,
  patients = [],
  staff = [],
  onSave,
  onSaveAndViewPaper,
  onClose
}) {
  const [selectedPatientId, setSelectedPatientId] = useState(initialRow?.patient || patients[0]?.id || '');
  const patient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);
  const bhyt = useMemo(() => parseBhytCard(patient?.insurance || initialRow?.insurance), [patient, initialRow]);

  const [values, setValues] = useState(() => ({
    id: initialRow?.id || '',
    patient: initialRow?.patient || patients[0]?.id || '',
    // Referrals
    soVaoSo: initialRow?.soVaoSo || `${initialRow?.id || '01'}/2026/GCT`,
    destination: initialRow?.destination || HOSPITALS[0].name,
    destinationCode: initialRow?.destinationCode || HOSPITALS[0].code,
    level: initialRow?.level || HOSPITALS[0].level,
    reason: initialRow?.reason || '1. Vượt quá năng lực chuyên môn kỹ thuật can thiệp tim mạch của bệnh viện; cần can thiệp tuyến trên.',
    symptoms: initialRow?.symptoms || initialRow?.note || 'Bệnh nhân đau ngực trái từng cơn lan lên vai, khó thở khi gắng sức độ II-III theo NYHA.',
    labSummary: initialRow?.labSummary || 'ECG: ST chênh xuống 1.5mm ở V4-V6. Troponin I tăng nhẹ (0.08 ng/mL). Siêu âm tim: EF = 52%.',
    diagnosis: initialRow?.diagnosis || 'I20.0 - Cơn đau thắt ngực không ổn định (Hội chứng vành cấp)',
    icd: initialRow?.icd || 'I20.0',
    treatment: initialRow?.treatment || 'Aspirin 81mg x 01 viên, Clopidogrel 75mg x 01 viên, Nitroglycerin ngậm dưới lưỡi, thở oxy 2L/p.',
    condition: initialRow?.condition || 'Tri giác tỉnh táo, tiếp xúc tốt. Mạch: 82 l/p, HA: 135/85 mmHg, SpO2: 97% có thở oxy.',
    plan: initialRow?.plan || 'Tiếp tục can thiệp tim mạch chuyên sâu theo phác đồ tuyến Trung ương.',
    transport: initialRow?.transport || 'Xe cứu thương chuyên dụng của bệnh viện (có Bác sĩ và Điều dưỡng đi cùng hỗ trợ cấp cứu)',
    escort: initialRow?.escort || 'BS.CKI Trần Minh Anh & ĐD. Nguyễn Thị Mai',
    doctor: initialRow?.doctor || 'BS.CKI Trần Minh Anh',

    // Discharges
    soLuuTru: initialRow?.soLuuTru || `RV-2026/${initialRow?.id || '001'}`,
    admissionDiagnosis: initialRow?.admissionDiagnosis || 'Đái tháo đường type 2 - Tăng huyết áp',
    outcome: initialRow?.outcome || 'Đỡ / giảm',
    daysOff: initialRow?.daysOff || initialRow?.soNgayNghiBHXH || 7,
    leaveFrom: initialRow?.leaveFrom || new Date().toISOString().slice(0, 10),
    leaveTo: initialRow?.leaveTo || new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
    advice: initialRow?.advice || initialRow?.loiDanBacSi || 'Dùng thuốc đều đặn theo đơn ngoại trú, đo đường huyết mao mạch 2 lần/ngày, kiêng ngọt tinh bột, tái khám sau 7 ngày.',

    // Consultations
    location: initialRow?.location || 'Phòng Giao ban Chuyên môn - Bệnh viện Đa khoa MediCare',
    formType: initialRow?.formType || 'LIEN_KHOA',
    leader: initialRow?.leader || 'BS.CKII Phạm Hoàng Long',
    secretary: initialRow?.secretary || 'BS.CKI Trần Minh Anh',
    participants: initialRow?.participants || 'BS.CKI Hoàng Văn Thịnh (Nội Tim mạch), BS.CKI Lê Thị Ngọc Mai (Hồi sức cấp cứu), DS.CKI Nguyễn Thị Hoa (Dược lâm sàng)',
    summary: initialRow?.summary || 'Bệnh nhân nam 64 tuổi, chẩn đoán ban đầu Hội chứng vành cấp kèm Đái tháo đường type 2. Đã dùng thuốc giảm đau ngực, hạ áp, kháng kết tập tiểu cầu kép nhưng còn đau ngực tái phát khi nghỉ ngơi.',
    conclusion: initialRow?.conclusion || 'Nhồi máu cơ tim cấp không ST chênh lên nguy cơ rất cao (Grace score 155) / Đái tháo đường type 2 - Tăng huyết áp độ 2.',

    // Summaries / Archives
    pathology: initialRow?.pathology || initialRow?.quaTrinhBenhLy || 'Bệnh khởi phát 3 ngày trước khi vào viện với triệu chứng đau tức thượng vị lan ra sau lưng, buồn nôn, ợ chua.',
    treatmentPeriod: initialRow?.treatmentPeriod || '08:00 ngày 21/11/2026 đến 11:30 ngày 23/11/2026'
  }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Handle patient change
  const handlePatientSelect = (pId) => {
    setSelectedPatientId(pId);
    setValues(prev => ({ ...prev, patient: pId }));
  };

  const handleChange = (field, val) => {
    setValues(prev => ({ ...prev, [field]: val }));
  };

  // Calculate total characters for text budget meter (Chống dư chữ và tràn trang)
  const totalNarrativeLength = useMemo(() => {
    if (tab === 'referrals') {
      return (values.symptoms || '').length + (values.labSummary || '').length + (values.treatment || '').length + (values.condition || '').length + (values.reason || '').length + (values.plan || '').length;
    }
    if (tab === 'discharges') {
      return (values.treatment || '').length + (values.advice || '').length + (values.diagnosis || '').length;
    }
    if (tab === 'consultations') {
      return (values.reason || '').length + (values.summary || '').length + (values.conclusion || '').length + (values.plan || '').length + (values.participants || '').length;
    }
    return (values.pathology || '').length + (values.labSummary || '').length + (values.treatment || '').length + (values.advice || '').length;
  }, [tab, values]);

  // Page budget threshold: Ideal A4 page capacity is ~500 chars for combined narrative fields
  const budgetStatus = useMemo(() => {
    if (totalNarrativeLength <= 450) {
      return { status: 'optimal', text: 'Vừa vặn 1 trang A4 chuẩn Bộ Y tế', color: '#166534', bg: '#dcfce7', icon: CheckCircle };
    }
    if (totalNarrativeLength <= 750) {
      return { status: 'warning', text: 'Nội dung khá dài · Giấy in sẽ tự động bật chế độ Thu gọn (Compact) để không tách chữ ký', color: '#854d0e', bg: '#fef9c3', icon: AlertTriangle };
    }
    return { status: 'danger', text: 'Nội dung quá dài · Nguy cơ tràn sang trang 2! Nên cô đọng tóm tắt bệnh án', color: '#991b1b', bg: '#fee2e2', icon: AlertTriangle };
  }, [totalNarrativeLength]);

  const handleSubmit = async (andView = false) => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...values,
        patient: selectedPatientId,
        patientName: patient?.name || values.patientName,
        gender: patient?.gender || values.gender,
        birth: patient?.birth || values.birth,
        phone: patient?.phone || values.phone,
        cccd: patient?.cccd || values.cccd,
        insurance: patient?.insurance || values.insurance,
        address: patient?.address || values.address
      };

      // Call API to persist to SQL Server
      const res = await fetch('/api/paper-forms/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab, data: payload })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Lỗi lưu thông tin nghiệp vụ vào SQL Server');
      }

      if (andView && onSaveAndViewPaper) {
        onSaveAndViewPaper(payload);
      } else if (onSave) {
        onSave(payload);
      }
    } catch (err) {
      setError(err.message || 'Không thể lưu hồ sơ nghiệp vụ');
    } finally {
      setSaving(false);
    }
  };

  let title = 'Lập Biểu Mẫu Nghiệp Vụ Y Tế';
  let lawRef = 'Quy chuẩn Bộ Y tế';
  if (tab === 'referrals') {
    title = 'Lập Phiếu Chuyển Tuyến KCB BHYT';
    lawRef = 'Mẫu số 06 (Nghị định số 75/2023/NĐ-CP & Thông tư 01/2025/TT-BYT)';
  } else if (tab === 'discharges') {
    title = 'Lập Giấy Ra Viện BHYT';
    lawRef = 'Phụ lục 3 (Thông tư số 18/2022/TT-BYT sửa đổi TT 56/2017/TT-BYT)';
  } else if (tab === 'consultations') {
    title = 'Lập Biên Bản Hội Chẩn Chuyên Môn';
    lawRef = 'Quyết định 1895/1997/QĐ-BYT & QĐ 4069/2001/QĐ-BYT Quy chế Bệnh viện';
  } else if (tab === 'archives') {
    title = 'Lập Bản Tóm Tắt Hồ Sơ Bệnh Án';
    lawRef = 'Phụ lục 4 (Thông tư số 18/2022/TT-BYT của Bộ Y tế)';
  }

  const BudgetIcon = budgetStatus.icon;

  return (
    <div className="statutory-business-modal" style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
      {/* Modal Top Header */}
      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={22} style={{ color: '#0f766e' }} />
              <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 700 }}>
                {title}
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
              {lawRef} · <b>Quy trình nghiệp vụ ở ngoài</b>: Nhập liệu chuẩn hóa -&gt; Lưu vào SQL Server -&gt; Ánh xạ 1:1 sang giấy in A4
            </p>
          </div>
          <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: 4, fontWeight: 600 }}>
            Mã chứng từ: {values.id || 'Tạo mới tự động'}
          </span>
        </div>

        {/* Page Budget Meter (Thước đo chống lệch và dư chữ tràn trang) */}
        <div style={{ marginTop: 12, padding: '8px 12px', background: budgetStatus.bg, border: `1px solid ${budgetStatus.color}33`, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BudgetIcon size={16} style={{ color: budgetStatus.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: budgetStatus.color }}>
              Thước đo trang in A4: {budgetStatus.text}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: budgetStatus.color }}>
            Tổng ký tự mô tả: <b>{totalNarrativeLength}</b> / 500 ký tự chuẩn
          </div>
        </div>
      </div>

      {/* Scrollable Form Body */}
      <div style={{ overflowY: 'auto', flex: 1, paddingRight: 6 }}>
        {/* KHỐI 1: CHỌN NGƯỜI BỆNH & TRÍCH XUẤT THÔNG TIN HÀNH CHÍNH TỰ ĐỘNG */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: '#1e293b', fontWeight: 700, fontSize: 13.5 }}>
            <User size={16} style={{ color: '#2563eb' }} /> I. THÔNG TIN HÀNH CHÍNH NGƯỜI BỆNH (Tự động liên thông hồ sơ)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) 2fr', gap: 14, alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Chọn Người bệnh / Hồ sơ:
              </label>
              <select
                className="his-select"
                style={{ width: '100%', fontWeight: 600 }}
                value={selectedPatientId}
                onChange={e => handlePatientSelect(e.target.value)}
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id}) · {p.gender} · {p.birth}
                  </option>
                ))}
              </select>
            </div>

            {patient && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                <div><span style={{ color: '#64748b' }}>Họ tên:</span> <b>{patient.name}</b></div>
                <div><span style={{ color: '#64748b' }}>Giới tính:</span> <b>{patient.gender}</b></div>
                <div><span style={{ color: '#64748b' }}>Ngày sinh:</span> <b>{patient.birth}</b></div>
                <div><span style={{ color: '#64748b' }}>CCCD:</span> <b>{patient.cccd || '079090123456'}</b></div>
                <div><span style={{ color: '#64748b' }}>SĐT:</span> <b>{patient.phone || '0901234567'}</b></div>
                <div><span style={{ color: '#64748b' }}>Thẻ BHYT:</span> <b style={{ color: '#047857' }}>{bhyt.code || patient.insurance || 'Chưa BHYT'}</b></div>
                {bhyt.hasInsurance && (
                  <div style={{ gridColumn: '1 / -1', color: '#065f46', background: '#ecfdf5', padding: '3px 8px', borderRadius: 4, fontSize: 11.5 }}>
                    Mức hưởng BHYT: <b>{bhyt.rate}%</b> ({bhyt.groupName}) · Nơi KCB ban đầu: <b>{bhyt.provinceName || 'TP. Hồ Chí Minh'}</b>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* KHỐI 2: FORM NGHIỆP VỤ THEO TỪNG LOẠI VĂN BẢN */}

        {/* 2.1: PHIẾU CHUYỂN TUYẾN (MẪU 06) */}
        {tab === 'referrals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Số vào sổ chuyển tuyến:
                </label>
                <input
                  className="his-input"
                  value={values.soVaoSo}
                  onChange={e => handleChange('soVaoSo', e.target.value)}
                  placeholder="01/2026/GCT"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Cơ sở KCB tiếp nhận (Tuyến trên):
                </label>
                <select
                  className="his-select"
                  value={values.destination}
                  onChange={e => {
                    const sel = HOSPITALS.find(h => h.name === e.target.value);
                    if (sel) {
                      setValues(v => ({ ...v, destination: sel.name, destinationCode: sel.code, level: sel.level }));
                    } else {
                      handleChange('destination', e.target.value);
                    }
                  }}
                >
                  {HOSPITALS.map(h => (
                    <option key={h.code} value={h.name}>{h.name} ({h.level})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Tuyến tiếp nhận:
                </label>
                <input
                  className="his-input"
                  value={values.level}
                  readOnly
                  style={{ background: '#f8fafc', color: '#475569' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Lý do chuyển tuyến (Theo Điều 14 Nghị định số 75/2023/NĐ-CP):
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, background: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="lyDoChuyenRadio"
                    checked={values.reason.includes('khoản 1') || values.reason.includes('Vượt')}
                    onChange={() => handleChange('reason', '1. Đủ điều kiện chuyển tuyến theo khoản 1 Điều 14 NĐ 75/2023/NĐ-CP (Vượt quá năng lực chuyên môn kỹ thuật hoặc cơ sở tiếp nhận có kỹ thuật phù hợp)')}
                  />
                  <span><b>Khoản 1:</b> Phù hợp quy định chuyển tuyến BHYT (Vượt quá năng lực chuyên môn kỹ thuật hoặc cơ sở tiếp nhận có kỹ thuật điều trị phù hợp)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="lyDoChuyenRadio"
                    checked={values.reason.includes('khoản 2') || values.reason.includes('nguyện vọng')}
                    onChange={() => handleChange('reason', '2. Theo nguyện vọng của người bệnh hoặc đại diện hợp pháp theo quy định tại khoản 2 Điều 14 NĐ 75/2023/NĐ-CP')}
                  />
                  <span><b>Khoản 2:</b> Theo nguyện vọng của người bệnh hoặc đại diện hợp pháp của người bệnh (đã giải thích quyền lợi BHYT)</span>
                </label>
                <textarea
                  className="his-textarea"
                  style={{ marginTop: 4, minHeight: 40 }}
                  rows={2}
                  value={values.reason}
                  onChange={e => handleChange('reason', e.target.value)}
                  placeholder="Ghi rõ lý do chuyển chuyên môn..."
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  1. Dấu hiệu lâm sàng lúc tiếp nhận:
                </label>
                <MedicalSuggestInput
                  type="symptoms"
                  multiline
                  rows={3}
                  value={values.symptoms}
                  onChange={val => handleChange('symptoms', val)}
                  placeholder="Mô tả triệu chứng lâm sàng..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  2. Tóm tắt kết quả cận lâm sàng chính:
                </label>
                <MedicalSuggestInput
                  type="labSummary"
                  multiline
                  rows={3}
                  value={values.labSummary}
                  onChange={val => handleChange('labSummary', val)}
                  placeholder="Kết quả xét nghiệm máu, ECG, X-quang, siêu âm..."
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                3. Chẩn đoán chuyển tuyến (Kèm mã ICD-10):
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  style={{ width: 140, fontSize: 12.5 }}
                  className="his-select"
                  value={values.icd}
                  onChange={e => {
                    const sel = COMMON_ICD.find(i => i.code === e.target.value);
                    if (sel) {
                      setValues(v => ({ ...v, icd: sel.code, diagnosis: `${sel.code} - ${sel.name}` }));
                    } else {
                      handleChange('icd', e.target.value);
                    }
                  }}
                >
                  <option value="">Chọn mã ICD...</option>
                  {COMMON_ICD.map(i => (
                    <option key={i.code} value={i.code}>{i.code}</option>
                  ))}
                </select>
                <MedicalSuggestInput
                  type="diagnosis"
                  style={{ flex: 1, fontWeight: 600 }}
                  value={values.diagnosis}
                  onChange={val => handleChange('diagnosis', val)}
                  placeholder="Tên chẩn đoán xác định..."
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  4. Phương pháp / thuốc đã dùng:
                </label>
                <MedicalSuggestInput
                  type="treatment"
                  multiline
                  rows={2}
                  value={values.treatment}
                  onChange={val => handleChange('treatment', val)}
                  placeholder="Thuốc, dịch truyền, can thiệp đã xử trí..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  5. Tình trạng lúc chuyển tuyến:
                </label>
                <MedicalSuggestInput
                  type="condition"
                  multiline
                  rows={2}
                  value={values.condition}
                  onChange={val => handleChange('condition', val)}
                  placeholder="Mạch, Huyết áp, SpO2, tri giác lúc bàn giao..."
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Phương tiện vận chuyển:
                </label>
                <select
                  className="his-select"
                  value={values.transport}
                  onChange={e => handleChange('transport', e.target.value)}
                >
                  <option value="Xe cứu thương chuyên dụng của bệnh viện (có Bác sĩ và Điều dưỡng đi cùng hỗ trợ cấp cứu)">Xe cứu thương chuyên dụng</option>
                  <option value="Xe cấp cứu ngoại viện 115">Xe cấp cứu 115</option>
                  <option value="Tự di chuyển (Người bệnh và thân nhân tự túc phương tiện)">Tự túc phương tiện</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Họ tên người hộ tống:
                </label>
                <input
                  className="his-input"
                  value={values.escort}
                  onChange={e => handleChange('escort', e.target.value)}
                  placeholder="Bác sĩ / Điều dưỡng hộ tống..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Bác sĩ chỉ định chuyển:
                </label>
                <select
                  className="his-select"
                  value={values.doctor}
                  onChange={e => handleChange('doctor', e.target.value)}
                >
                  {staff.filter(s => s.title === 'Bác sĩ').map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.department})</option>
                  ))}
                  <option value="BS.CKI Trần Minh Anh">BS.CKI Trần Minh Anh</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 2.2: GIẤY RA VIỆN (PHỤ LỤC 3) */}
        {tab === 'discharges' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Số lưu trữ hồ sơ:
                </label>
                <input
                  className="his-input"
                  value={values.soLuuTru}
                  onChange={e => handleChange('soLuuTru', e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Kết quả điều trị:
                </label>
                <select
                  className="his-select"
                  value={values.outcome}
                  onChange={e => handleChange('outcome', e.target.value)}
                >
                  <option value="Khỏi">Khỏi</option>
                  <option value="Đỡ / giảm">Đỡ / giảm</option>
                  <option value="Không thay đổi">Không thay đổi</option>
                  <option value="Nặng hơn">Nặng hơn</option>
                  <option value="Tử vong">Tử vong</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Số ngày nghỉ hưởng BHXH:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    style={{ width: 80 }}
                    className="his-input"
                    value={values.daysOff}
                    onChange={e => {
                      const days = Number(e.target.value) || 1;
                      const from = values.leaveFrom ? new Date(values.leaveFrom) : new Date();
                      const to = new Date(from.getTime() + (days - 1) * 86400000);
                      setValues(v => ({
                        ...v,
                        daysOff: days,
                        leaveTo: to.toISOString().slice(0, 10)
                      }));
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#64748b' }}>ngày</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Nghỉ từ ngày:
                </label>
                <input
                  type="date"
                  className="his-input"
                  value={values.leaveFrom}
                  onChange={e => handleChange('leaveFrom', e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Đến hết ngày:
                </label>
                <input
                  type="date"
                  className="his-input"
                  value={values.leaveTo}
                  onChange={e => handleChange('leaveTo', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Chẩn đoán ra viện (kèm mã ICD-10):
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  style={{ width: 140 }}
                  className="his-select"
                  value={values.icd}
                  onChange={e => {
                    const sel = COMMON_ICD.find(i => i.code === e.target.value);
                    if (sel) {
                      setValues(v => ({ ...v, icd: sel.code, diagnosis: `${sel.code} - ${sel.name}` }));
                    } else {
                      handleChange('icd', e.target.value);
                    }
                  }}
                >
                  <option value="">Mã ICD-10...</option>
                  {COMMON_ICD.map(i => (
                    <option key={i.code} value={i.code}>{i.code}</option>
                  ))}
                </select>
                <MedicalSuggestInput
                  type="diagnosis"
                  style={{ flex: 1, fontWeight: 600 }}
                  value={values.diagnosis}
                  onChange={val => handleChange('diagnosis', val)}
                  placeholder="Tên chẩn đoán ra viện..."
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Phương pháp điều trị:
              </label>
              <MedicalSuggestInput
                type="treatment"
                multiline
                rows={2}
                value={values.treatment}
                onChange={val => handleChange('treatment', val)}
                placeholder="Điều trị nội khoa, chế độ dinh dưỡng..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Lời dặn của thầy thuốc:
              </label>
              <MedicalSuggestInput
                type="advice"
                multiline
                rows={2}
                value={values.advice}
                onChange={val => handleChange('advice', val)}
                placeholder="Hướng dẫn dùng thuốc, chế độ ăn, hẹn tái khám..."
              />
            </div>
          </div>
        )}

        {/* 2.3: BIÊN BẢN HỘI CHẨN */}
        {tab === 'consultations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Địa điểm hội chẩn:
                </label>
                <MedicalSuggestInput
                  type="room"
                  value={values.location}
                  onChange={val => handleChange('location', val)}
                  placeholder="VD: Phòng giao ban khoa, Phòng hội chẩn..."
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Hình thức hội chẩn:
                </label>
                <select
                  className="his-select"
                  value={values.formType}
                  onChange={e => handleChange('formType', e.target.value)}
                >
                  <option value="LIEN_KHOA">Hội chẩn liên chuyên khoa</option>
                  <option value="TOAN_VIEN">Hội chẩn toàn viện</option>
                  <option value="TUYEN_TREN">Hội chẩn xin ý kiến tuyến trên (Telemedicine)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Chủ tọa:
                </label>
                <input
                  className="his-input"
                  value={values.leader}
                  onChange={e => handleChange('leader', e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Thư ký:
                </label>
                <input
                  className="his-input"
                  value={values.secretary}
                  onChange={e => handleChange('secretary', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Thành viên tham gia hội chẩn:
              </label>
              <textarea
                className="his-textarea"
                rows={2}
                value={values.participants}
                onChange={e => handleChange('participants', e.target.value)}
                placeholder="Danh sách bác sĩ các chuyên khoa tham dự..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Lý do hội chẩn:
              </label>
              <MedicalSuggestInput
                type="reason"
                multiline
                rows={2}
                value={values.reason}
                onChange={val => handleChange('reason', val)}
                placeholder="Ca bệnh khó, nhiều bệnh nền phức tạp..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Tóm tắt diễn biến bệnh & điều trị:
              </label>
              <MedicalSuggestInput
                type="symptoms"
                multiline
                rows={3}
                value={values.summary}
                onChange={val => handleChange('summary', val)}
                placeholder="Tóm tắt quá trình diễn biến bệnh và điều trị..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Kết luận & Chẩn đoán thống nhất:
                </label>
                <MedicalSuggestInput
                  type="advice"
                  multiline
                  rows={2}
                  style={{ fontWeight: 600 }}
                  value={values.conclusion}
                  onChange={val => handleChange('conclusion', val)}
                  placeholder="Chẩn đoán thống nhất của hội đồng..."
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Hướng điều trị thống nhất:
                </label>
                <MedicalSuggestInput
                  type="plan"
                  multiline
                  rows={2}
                  value={values.plan}
                  onChange={val => handleChange('plan', val)}
                  placeholder="Phác đồ can thiệp và điều trị tiếp theo..."
                />
              </div>
            </div>
          </div>
        )}

        {/* 2.4: TÓM TẮT BỆNH ÁN */}
        {tab === 'archives' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Quá trình bệnh lý & diễn biến lâm sàng:
              </label>
              <MedicalSuggestInput
                type="symptoms"
                multiline
                rows={3}
                value={values.pathology}
                onChange={val => handleChange('pathology', val)}
                placeholder="Quá trình bệnh lý và diễn biến lâm sàng..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Tóm tắt kết quả cận lâm sàng có giá trị:
              </label>
              <MedicalSuggestInput
                type="labSummary"
                multiline
                rows={3}
                value={values.labSummary}
                onChange={val => handleChange('labSummary', val)}
                placeholder="Tóm tắt kết quả cận lâm sàng chính..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Chẩn đoán xác định:
              </label>
              <MedicalSuggestInput
                type="diagnosis"
                style={{ fontWeight: 600 }}
                value={values.diagnosis}
                onChange={val => handleChange('diagnosis', val)}
                placeholder="Chẩn đoán xác định sau hội chẩn..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Phương pháp điều trị đã áp dụng:
              </label>
              <MedicalSuggestInput
                type="treatment"
                multiline
                rows={2}
                value={values.treatment}
                onChange={val => handleChange('treatment', val)}
                placeholder="Các phương pháp điều trị, phẫu thuật, thủ thuật..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Tình trạng người bệnh khi ra viện & Hướng điều trị tiếp theo:
              </label>
              <MedicalSuggestInput
                type="advice"
                multiline
                rows={2}
                value={values.advice}
                onChange={val => handleChange('advice', val)}
                placeholder="Tình trạng khi xuất viện, chế độ dùng thuốc và tái khám..."
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#991b1b', fontSize: 13 }}>
            <b>Lỗi:</b> {error}
          </div>
        )}
      </div>

      {/* Modal Actions Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
          <Info size={15} /> Dữ liệu được xác thực và ánh xạ 1:1 sang biểu mẫu in A4 tương ứng
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="secondary" type="button" onClick={onClose} disabled={saving}>
            <X size={15} /> Đóng
          </button>
          <button className="primary" type="button" onClick={() => handleSubmit(false)} disabled={saving} style={{ background: '#0284c7' }}>
            <Save size={15} /> {saving ? 'Đang lưu SQL...' : 'Lưu vào CSDL'}
          </button>
          <button className="primary" type="button" onClick={() => handleSubmit(true)} disabled={saving} style={{ background: '#059669' }}>
            <Printer size={15} /> {saving ? 'Đang lưu...' : 'Lưu & Mở mẫu in A4'}
          </button>
        </div>
      </div>
    </div>
  );
}
