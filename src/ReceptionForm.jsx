import React, { useState, useEffect } from 'react';
import { hisApi } from './api';
import { clinics, today } from './business-data';
import { syncWithSqlServer, useWorkspace } from './workspace';
import { HeartPulse, Search, AlertTriangle, IdCard, Shield, Stethoscope, Check, X, UserCheck, Printer } from 'lucide-react';
import { parseBhytCard } from './bhyt-utils';
import MedicalSuggestInput from './MedicalSuggestInput';

const CLINIC_ROOMS = [
  { code: 'PK-NOI', name: 'Phòng khám 101 - Nội tổng quát', dept: 'Nội tổng quát', doctor: 'BS.CKI Trần Minh Anh' },
  { code: 'PK-TIM', name: 'Phòng khám 102 - Tim mạch can thiệp', dept: 'Tim mạch', doctor: 'ThS.BS Nguyễn Văn An' },
  { code: 'PK-TMH', name: 'Phòng khám 103 - Tai Mũi Họng', dept: 'Tai Mũi Họng', doctor: 'BS.CKII Lê Thị Mai' },
  { code: 'PK-DA',  name: 'Phòng khám 104 - Da liễu & Thẩm mỹ', dept: 'Da liễu', doctor: 'BS Đỗ Hoàng Long' },
  { code: 'PK-SAN', name: 'Phòng khám 105 - Sản phụ khoa', dept: 'Sản phụ khoa', doctor: 'BS.CKI Phạm Quỳnh Hoa' },
  { code: 'PK-CXK', name: 'Phòng khám 106 - Cơ xương khớp', dept: 'Cơ xương khớp', doctor: 'ThS.BS Đặng Quốc Tuấn' },
];

const DEPT_PREFIX = {
  'Nội tổng quát': 'NOI',
  'Tim mạch': 'TIM',
  'Tai Mũi Họng': 'TMH',
  'Da liễu': 'DA',
  'Sản phụ khoa': 'SAN',
  'Cơ xương khớp': 'CXK'
};

export default function ReceptionForm({ mode = 'register', patient, onDone }) {
  const [patients] = useWorkspace('patients');
  const [visits] = useWorkspace('visits');
  const [selected, setSelected] = useState(patient?.id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [issuedTicket, setIssuedTicket] = useState(null);

  const getNextQueueTag = (roomCode) => {
    const room = CLINIC_ROOMS.find(r => r.code === roomCode);
    const prefix = room?.dept ? (DEPT_PREFIX[room.dept] || roomCode.replace(/^PK-/, '')) : 'PK';
    const roomVisits = (visits || []).filter(v => v.department === room?.dept || v.roomCode === roomCode);
    const maxNum = roomVisits.reduce((m, v) => Math.max(m, Number(v.queueNumber) || 0), 0);
    return `${prefix}-${String(maxNum + 1).padStart(2, '0')}`;
  };

  // Form State - strictly mapped 1:1 to dbo.BenhNhan and dbo.LuotKham
  const person = mode === 'register' ? patients.find(p => p.id === selected) : patient;
  const [fullName, setFullName] = useState(person?.name || '');
  const [birthDate, setBirthDate] = useState(person?.birth || '1990-01-01');
  const [gender, setGender] = useState(person?.gender || 'Nam');
  const [phone, setPhone] = useState(person?.phone || '');
  const [cccd, setCccd] = useState(person?.cccd || '');
  const [insuranceCard, setInsuranceCard] = useState(person?.insurance || '');
  const [patientType, setPatientType] = useState(person?.insurance ? 'BHYT' : 'VIEN_PHI');
  const [insuranceRate, setInsuranceRate] = useState(80);
  const [address, setAddress] = useState(person?.address || 'TP. Hồ Chí Minh');
  const [patientHistory, setPatientHistory] = useState(person?.history || '');
  const [allergyNote, setAllergyNote] = useState(person?.allergy || '');
  const [selectedRoom, setSelectedRoom] = useState('PK-NOI');
  const [intakeReason, setIntakeReason] = useState('Khám kiểm tra sức khỏe tổng quát');

  // Sync state when selected patient changes
  useEffect(() => {
    if (person) {
      setFullName(person.name || '');
      setBirthDate(person.birth || '1990-01-01');
      setGender(person.gender || 'Nam');
      setPhone(person.phone || '');
      setCccd(person.cccd || '');
      setInsuranceCard(person.insurance || '');
      setPatientType(person.insurance ? 'BHYT' : 'VIEN_PHI');
      setAddress(person.address || 'TP. Hồ Chí Minh');
      setPatientHistory(person.history || '');
      setAllergyNote(person.allergy || '');
      if (person.insurance) {
        autoDetectInsuranceRate(person.insurance);
      }
    } else if (mode === 'register' && !selected) {
      setFullName('');
      setBirthDate('1990-01-01');
      setGender('Nam');
      setPhone('');
      setCccd('');
      setInsuranceCard('');
      setPatientType('BHYT');
      setAddress('TP. Hồ Chí Minh');
      setPatientHistory('');
      setAllergyNote('');
    }
  }, [selected, person]);

  // Calculate age automatically
  const calculatedAge = () => {
    if (!birthDate) return '';
    const birthYear = new Date(birthDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    return isNaN(age) || age < 0 ? '' : `${age} tuổi`;
  };

  // Auto-detect insurance rate from the 3rd character of the 15-digit BHYT card code
  function autoDetectInsuranceRate(cardCode) {
    if (!cardCode || cardCode.length < 3) return;
    const rateChar = cardCode.charAt(2);
    if (rateChar === '1' || rateChar === '2') {
      setInsuranceRate(100);
    } else if (rateChar === '3') {
      setInsuranceRate(95);
    } else {
      setInsuranceRate(80);
    }
  }

  const handleInsuranceChange = (val) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    setInsuranceCard(clean);
    autoDetectInsuranceRate(clean);
  };

  const ownVisits = visits
    .filter(v => v.patientId === person?.id && !v.locked && !['Đã hủy', 'Hoàn tất'].includes(v.status))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    setError('');

    // Validation
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên bệnh nhân.');
      return;
    }
    if (!phone.trim() || !/^[0-9]{10,11}$/.test(phone.trim())) {
      setError('Số điện thoại liên lạc phải gồm 10 hoặc 11 chữ số.');
      return;
    }
    if (cccd.trim() && !/^[0-9]{12}$/.test(cccd.trim())) {
      setError('Số định danh cá nhân / CCCD phải đúng 12 chữ số.');
      return;
    }
    if (patientType === 'BHYT' && (!insuranceCard.trim() || insuranceCard.trim().length < 10)) {
      setError('Vui lòng nhập mã thẻ BHYT hợp lệ (tối thiểu 10 ký tự, chuẩn 15 ký tự).');
      return;
    }

    setSaving(true);

    try {
      let result, message;
      if (mode === 'route') {
        const formData = Object.fromEntries(new FormData(e.currentTarget));
        result = await hisApi.changeVisit(formData);
        message = formData.action === 'cancel' ? 'Đã hủy lượt khám' : 'Đã điều chuyển lượt khám';
      } else if (mode === 'edit') {
        const payload = {
          id: patient.id,
          name: fullName.trim().toUpperCase(),
          birth: birthDate,
          gender,
          phone: phone.trim(),
          cccd: cccd.trim(),
          insurance: patientType === 'BHYT' ? insuranceCard.trim() : '',
          address: address.trim(),
          allergy: allergyNote.trim(),
          history: patientHistory.trim()
        };
        result = await hisApi.updatePatient(payload);
        message = `Đã cập nhật thông tin hành chính bệnh nhân ${fullName.trim().toUpperCase()}`;
      } else {
        // Register new visit
        const chosenRoom = CLINIC_ROOMS.find(r => r.code === selectedRoom) || CLINIC_ROOMS[0];
        const payload = {
          patientId: selected || undefined,
          name: fullName.trim().toUpperCase(),
          birth: birthDate,
          gender,
          phone: phone.trim(),
          cccd: cccd.trim(),
          insurance: patientType === 'BHYT' ? insuranceCard.trim() : '',
          address: address.trim(),
          dept: chosenRoom.dept,
          roomCode: chosenRoom.code,
          roomName: chosenRoom.name,
          doctor: chosenRoom.doctor,
          reason: intakeReason.trim(),
          allergy: allergyNote.trim(),
          history: patientHistory.trim()
        };

        result = await hisApi.createVisit(payload);
        message = `Tiếp đón thành công! Cấp STT ${result.queueTag || getNextQueueTag(selectedRoom)} tại ${result.roomName || chosenRoom.name}`;
        await syncWithSqlServer();
        setIssuedTicket({
          queueTag: result.queueTag || getNextQueueTag(selectedRoom),
          queueNumber: result.queueNumber,
          patientName: fullName.trim().toUpperCase(),
          age: calculatedAge(),
          gender,
          department: chosenRoom.dept,
          roomName: chosenRoom.name,
          doctor: chosenRoom.doctor,
          time: new Date().toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'}),
          message
        });
        return;
      }

      await syncWithSqlServer();
      onDone(message, result);
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu dữ liệu tiếp đón.');
    } finally {
      setSaving(false);
    }
  }

  const chosenRoom = CLINIC_ROOMS.find(r => r.code === selectedRoom) || CLINIC_ROOMS[0];

  return (
    <div className="his-reception-container">
      {/* HEADER BANNER */}
      <div className="his-form-header">
        <div className="his-header-title">
          <HeartPulse size={24} className="his-header-icon" />
          <div>
            <h2>
              {mode === 'route'
                ? 'Điều chuyển / Hủy lượt khám ngoại trú'
                : mode === 'edit'
                ? 'Cập nhật thông tin hành chính bệnh nhân'
                : 'Tiếp đón & Đăng ký khám bệnh ngoại trú'}
            </h2>
            <p className="his-header-sub">
              {mode === 'register'
                ? 'Tiếp nhận và phân luồng phòng khám ngoại trú'
                : `Bệnh nhân: ${person?.name || ''} · Mã BN: ${person?.id || ''}`}
            </p>
          </div>
        </div>
        <div className="his-mode-badge">
          <span className="badge teal">
            {mode === 'register' ? 'Tiếp đón Ngoại trú' : mode === 'edit' ? 'Hồ sơ hành chính' : 'Điều phối buồng'}
          </span>
        </div>
      </div>

      {/* QUICK PATIENT LOOKUP (REGISTER MODE) */}
      {mode === 'register' && (
        <div className="his-form-section his-lookup-section">
          <div className="his-section-header">
            <Search size={16} />
            <span>Tra cứu hồ sơ người bệnh</span>
          </div>
          <div className="his-field-group">
            <label className="his-label">
              Chọn người bệnh đã có hồ sơ hoặc đăng ký mới:
              <select
                aria-label="Chọn hồ sơ tiếp đón"
                value={selected}
                onChange={e => { setSelected(e.target.value); setError(''); }}
                disabled={saving}
                className="his-select"
              >
                <option value="">+ Tạo hồ sơ người bệnh mới (Đăng ký lần đầu)</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} · Mã: {p.id} · {p.gender}, {p.birth || ''} · SĐT: {p.phone || 'Chưa có'} {p.insurance ? `· BHYT: ${p.insurance}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      <form key={selected || 'new'} onSubmit={submit} className="his-form-content">
        {mode === 'route' ? (
          <div className="his-form-section">
            <div className="his-section-header">
              <AlertTriangle size={16} />
              <span>Thông tin lượt khám cần điều chuyển / hủy</span>
            </div>
            <div className="his-grid-2">
              <label className="his-label his-col-2">
                Lượt khám đang mở *
                <select name="visitId" required className="his-select">
                  {ownVisits.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.id} · {v.date} {v.time} · Chuyên khoa: {v.department} · Trạng thái: {v.status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="his-label">
                Thao tác thực hiện *
                <select name="action" className="his-select">
                  <option value="transfer">Điều chuyển sang chuyên khoa khác</option>
                  <option value="cancel">Hủy lượt khám của bệnh nhân</option>
                </select>
              </label>

              <label className="his-label">
                Chuyên khoa tiếp nhận mới
                <select name="dept" defaultValue={person?.dept} className="his-select">
                  {clinics.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>

              <label className="his-label his-col-2">
                Lý do điều chuyển hoặc hủy *
                <MedicalSuggestInput
                  type="cancel"
                  name="reason"
                  multiline
                  rows={2}
                  required
                  maxLength={255}
                  placeholder="Nhập chi tiết lý do chuyên môn điều chuyển buồng hoặc hủy tiếp đón..."
                />
              </label>
            </div>
            {!ownVisits.length && (
              <p role="alert" className="form-error">Người bệnh không có lượt khám nào đang mở để điều chuyển hoặc hủy.</p>
            )}
          </div>
        ) : (
          <>
            {/* PHẦN 1: THÔNG TIN HÀNH CHÍNH */}
            <div className="his-form-section">
              <div className="his-section-header">
                <IdCard size={16} />
                <span>1. Thông tin hành chính người bệnh</span>
              </div>

              <div className="his-grid-3">
                <label className="his-label">
                  Họ và tên bệnh nhân (IN HOA) *
                  <input
                    name="name"
                    required
                    maxLength={100}
                    value={fullName}
                    onChange={e => setFullName(e.target.value.toUpperCase())}
                    placeholder="NGUYỄN VĂN A"
                    className="his-input"
                  />
                </label>

                <label className="his-label">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Ngày tháng năm sinh *</span>
                    {calculatedAge() && <span className="his-age-badge" style={{ margin: 0 }}>{calculatedAge()}</span>}
                  </div>
                  <input
                    name="birth"
                    type="date"
                    required
                    max={today}
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="his-input"
                  />
                </label>

                <label className="his-label">
                  Giới tính *
                  <select
                    name="gender"
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="his-select"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </label>

                <label className="his-label">
                  Số CCCD / VNeID (12 số)
                  <input
                    name="cccd"
                    maxLength={12}
                    value={cccd}
                    onChange={e => setCccd(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="079201000123"
                    className="his-input"
                  />
                </label>

                <label className="his-label">
                  Số điện thoại liên lạc *
                  <input
                    name="phone"
                    type="tel"
                    required
                    maxLength={11}
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0901234567"
                    className="his-input"
                  />
                </label>

                <label className="his-label">
                  Địa chỉ thường trú / Tạm trú *
                  <MedicalSuggestInput
                    type="address"
                    required
                    maxLength={255}
                    value={address}
                    onChange={val => setAddress(val)}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP..."
                  />
                </label>

                <label className="his-label his-col-2">
                  Tiền sử bệnh lý bản thân
                  <MedicalSuggestInput
                    type="history"
                    value={patientHistory}
                    onChange={val => setPatientHistory(val)}
                    placeholder="Tăng huyết áp, đái tháo đường, hen suyễn, bệnh lý mạn tính..."
                  />
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'4px'}}>
                    {['Chưa ghi nhận tiền sử mạn tính', 'Tăng huyết áp vô căn', 'Đái tháo đường type 2', 'Hen phế quản'].map(tag => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => setPatientHistory(prev => prev ? `${prev}; ${tag}` : tag)}
                        style={{background:'#f8fafc',border:'1px solid #cbd5e1',borderRadius:'4px',padding:'2px 6px',fontSize:'10.5px',color:'#475569',cursor:'pointer'}}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </label>

                <label className="his-label">
                  Dị ứng thuốc & dị nguyên
                  <MedicalSuggestInput
                    type="allergy"
                    maxLength={255}
                    value={allergyNote}
                    onChange={val => setAllergyNote(val)}
                    placeholder="Penicillin, NSAIDs, Paracetamol..."
                  />
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'4px'}}>
                    {['Không ghi nhận dị ứng', 'Penicillin', 'Aspirin / NSAIDs', 'Paracetamol'].map(tag => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => setAllergyNote(tag)}
                        style={{background:'#f8fafc',border:'1px solid #cbd5e1',borderRadius:'4px',padding:'2px 6px',fontSize:'10.5px',color:'#b91c1c',cursor:'pointer'}}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </label>
              </div>
            </div>

            {/* PHẦN 2: ĐỐI TƯỢNG KHÁM & BHYT */}
            <div className="his-form-section">
              <div className="his-section-header">
                <Shield size={16} />
                <span>2. Chế độ khám & Quyền lợi Bảo hiểm Y tế (BHYT)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: patientType === 'BHYT' ? '1fr 1.25fr 1.55fr' : '1fr 2fr', gap: '12px', alignItems: 'end' }}>
                <label className="his-label">
                  Loại đối tượng khám *
                  <select
                    value={patientType}
                    onChange={e => setPatientType(e.target.value)}
                    className="his-select"
                  >
                    <option value="BHYT">BHYT (Có thẻ BHYT)</option>
                    <option value="VIEN_PHI">Viện phí (Khám tự chi trả 100%)</option>
                  </select>
                </label>

                {patientType === 'BHYT' ? (
                  <>
                    <label className="his-label">
                      Số thẻ BHYT (15 ký tự chuẩn Bộ Y tế) *
                      <input
                        name="insurance"
                        maxLength={15}
                        required
                        value={insuranceCard}
                        onChange={e => handleInsuranceChange(e.target.value)}
                        placeholder="GD4790123456789"
                        className="his-input his-insurance-input"
                      />
                    </label>

                    <div className="his-label">
                      Mức hưởng quyền lợi BHYT
                      <div className="his-benefit-tag" style={{ whiteSpace: 'nowrap' }}>
                        <span className={`badge ${insuranceRate === 100 ? 'teal' : insuranceRate === 95 ? 'blue' : 'amber'}`} style={{ whiteSpace: 'nowrap' }}>
                          Quỹ BHYT chi trả {insuranceRate}%
                        </span>
                        <small style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Cùng chi trả: {100 - insuranceRate}%</small>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="his-label">
                    Hình thức thanh toán
                    <div className="his-benefit-tag" style={{ whiteSpace: 'nowrap' }}>
                      <span className="badge gray" style={{ whiteSpace: 'nowrap' }}>Khám dịch vụ tự chi trả 100%</span>
                      <small style={{ whiteSpace: 'nowrap' }}>Thanh toán viện phí tại quầy thu ngân</small>
                    </div>
                  </div>
                )}
              </div>

              {patientType === 'BHYT' && insuranceCard.trim().length >= 3 && (() => {
                const bh = parseBhytCard(insuranceCard);
                return (
                  <div style={{ marginTop: '10px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '12px', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <b>Quy chuẩn BHYT:</b> Nhóm <b>{bh.groupCode}</b> ({bh.groupName}) {bh.provinceName ? `· Tỉnh/TP cấp: ${bh.provinceName}` : ''}
                    </div>
                    <div>
                      <b>Đúng tuyến:</b> Quỹ BHYT thanh toán <b>{bh.rate}%</b> chi phí danh mục (Người bệnh cùng chi trả {bh.copayRate}%)
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* PHẦN 3: BUỒNG KHÁM & LÝ DO KHÁM */}
            {mode === 'register' && (
              <div className="his-form-section">
                <div className="his-section-header">
                  <Stethoscope size={16} />
                  <span>3. Phân luồng buồng khám & Bác sĩ</span>
                </div>

                <div className="his-grid-2">
                  <label className="his-label">
                    Buồng khám chuyên khoa *
                    <select
                      value={selectedRoom}
                      onChange={e => setSelectedRoom(e.target.value)}
                      className="his-select"
                    >
                      {CLINIC_ROOMS.map(room => (
                        <option key={room.code} value={room.code}>
                          {room.dept} - {room.name} ({getNextQueueTag(room.code)})
                        </option>
                      ))}
                    </select>
                    <div style={{marginTop: '8px', padding: '8px 12px', background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span style={{fontSize: '12px', color: '#065f46', fontWeight: 600}}>⚡ STT tự động cấp tiếp theo:</span>
                        <span className="badge teal" style={{fontSize: '14px', fontWeight: 800, padding: '2px 8px', fontFamily: 'monospace'}}>
                          {getNextQueueTag(selectedRoom)}
                        </span>
                      </div>
                      <span style={{fontSize: '11.5px', color: '#047857'}}>
                        {chosenRoom.doctor}
                      </span>
                    </div>
                  </label>

                  <label className="his-label">
                    Lý do khám / Triệu chứng ban đầu *
                    <MedicalSuggestInput
                      type="reason"
                      value={intakeReason}
                      onChange={val => setIntakeReason(val)}
                      placeholder="Đau đầu, ho kéo dài, đau ngực, kiểm tra sức khỏe..."
                      required
                    />
                    <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'4px'}}>
                      {['Khám sức khỏe định kỳ', 'Tái khám theo hẹn', 'Sốt cao, mệt mỏi', 'Đau đầu, chóng mặt', 'Ho, đau rát họng', 'Đau ngực', 'Đau bụng'].map(tag => (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => setIntakeReason(tag)}
                          style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:'4px',padding:'2px 6px',fontSize:'10.5px',color:'#0f766e',cursor:'pointer'}}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </label>
                </div>

                {/* BUỒNG KHÁM PREVIEW CHUẨN VIETTEL HIS */}
                <div className="his-room-dock">
                  <div className="his-room-info">
                    <UserCheck size={18} className="his-room-icon" />
                    <div>
                      <strong>{chosenRoom.name}</strong>
                      <span>Bác sĩ được xác định theo phân công ca khi tiếp nhận.</span>
                    </div>
                  </div>
                  <div className="his-queue-badge">
                    <span className="badge teal" style={{ whiteSpace: 'nowrap' }}>Tự động cấp số thứ tự khám (STT)</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        {/* BOTTOM ACTION BAR */}
        <div className="his-bottom-actions">
          <button
            type="submit"
            className="primary his-submit-button"
            disabled={saving || (mode === 'route' && !ownVisits.length)}
          >
            {saving ? (
              'Đang lưu thông tin…'
            ) : mode === 'register' ? (
              <>
                <Check size={18} /> Đăng ký khám & Cấp số thứ tự (STT)
              </>
            ) : mode === 'edit' ? (
              <>
                <Check size={18} /> Lưu thông tin hành chính
              </>
            ) : (
              <>
                <Check size={18} /> Xác nhận thay đổi lượt khám
              </>
            )}
          </button>
        </div>
      </form>

      {/* POPUP PHIẾU KHÁM BỆNH & SỐ THỨ TỰ */}
      {issuedTicket && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div style={{background:'#ffffff',borderRadius:'14px',boxShadow:'0 20px 25px -5px rgba(0,0,0,0.2)',width:'100%',maxWidth:'440px',overflow:'hidden',border:'1px solid #cbd5e1',textAlign:'center'}}>
            <div style={{background:'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',color:'#ffffff',padding:'18px 20px'}}>
              <span style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'1px',fontWeight:700,opacity:0.9}}>Bệnh viện Đa khoa MediCare</span>
              <h3 style={{margin:'4px 0 0',fontSize:'16px',fontWeight:700}}>PHIẾU KHÁM BỆNH & SỐ THỨ TỰ</h3>
            </div>
            <div style={{padding:'24px 20px'}}>
              <span style={{fontSize:'12px',color:'#64748b',fontWeight:600,textTransform:'uppercase'}}>Số thứ tự khám bệnh (STT)</span>
              <div style={{fontSize:'48px',fontWeight:900,color:'#0f766e',letterSpacing:'2px',fontFamily:'monospace',margin:'6px 0 14px',background:'#f0fdfa',border:'2px dashed #99f6e4',borderRadius:'10px',padding:'10px'}}>
                {issuedTicket.queueTag}
              </div>
              <div style={{textAlign:'left',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'12px 14px',fontSize:'12.5px',display:'grid',gap:'6px',marginBottom:'18px'}}>
                <div><b>Họ tên người bệnh:</b> <span style={{color:'#0f172a',fontWeight:700}}>{issuedTicket.patientName}</span> {issuedTicket.age ? `(${issuedTicket.age}·${issuedTicket.gender})` : ''}</div>
                <div><b>Chuyên khoa:</b> <span>{issuedTicket.department}</span></div>
                <div><b>Phòng khám:</b> <b style={{color:'#0f766e'}}>{issuedTicket.roomName}</b></div>
                <div><b>Bác sĩ phụ trách:</b> <span>{issuedTicket.doctor}</span></div>
                <div><b>Thời điểm cấp số:</b> <span style={{color:'#64748b'}}>{issuedTicket.time}</span></div>
              </div>
              <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 18px',lineHeight:1.6}}>
                Quý khách vui lòng cầm phiếu này đến trước cửa <b>{issuedTicket.roomName}</b> và theo dõi âm thanh loa gọi số.
              </p>
              <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
                <button type="button" className="secondary" style={{padding:'8px 16px',fontSize:'13px'}} onClick={()=>{window.print();}}>
                  <Printer size={15}/> In phiếu STT
                </button>
                <button type="button" className="primary" style={{padding:'8px 20px',fontSize:'13px'}} onClick={()=>{onDone(issuedTicket.message);}}>
                  Hoàn tất tiếp đón
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
