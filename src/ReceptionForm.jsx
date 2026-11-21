import React, { useState, useEffect } from 'react';
import { hisApi } from './api';
import { clinics, today } from './business-data';
import { syncWithSqlServer, useWorkspace } from './workspace';
import { HeartPulse, Search, AlertTriangle, IdCard, Shield, Stethoscope, Check } from 'lucide-react';

const ETHNICITIES = ['Kinh', 'Tày', 'Thái', 'Mường', 'H\'Mông', 'Dao', 'Khmer', 'Nùng', 'Hoa', 'Khác'];
const CLINIC_ROOMS = [
  { code: 'PK-NOI', name: 'Phòng khám 101 - Nội tổng quát', dept: 'Nội tổng quát', doctor: 'BS.CKI Trần Minh Anh' },
  { code: 'PK-TIM', name: 'Phòng khám 102 - Tim mạch can thiệp', dept: 'Tim mạch', doctor: 'ThS.BS Nguyễn Văn An' },
  { code: 'PK-TMH', name: 'Phòng khám 103 - Tai Mũi Họng', dept: 'Tai Mũi Họng', doctor: 'BS.CKII Lê Thị Mai' },
  { code: 'PK-DA',  name: 'Phòng khám 104 - Da liễu & Thẩm mỹ', dept: 'Da liễu', doctor: 'BS Đỗ Hoàng Long' },
  { code: 'PK-SAN', name: 'Phòng khám 105 - Sản phụ khoa', dept: 'Sản phụ khoa', doctor: 'BS.CKI Phạm Quỳnh Hoa' },
  { code: 'PK-CXK', name: 'Phòng khám 106 - Cơ xương khớp', dept: 'Cơ xương khớp', doctor: 'ThS.BS Đặng Quốc Tuấn' },
];

export default function ReceptionForm({ mode = 'register', patient, onDone }) {
  const [patients] = useWorkspace('patients');
  const [visits] = useWorkspace('visits');
  const [selected, setSelected] = useState(patient?.id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const person = mode === 'register' ? patients.find(p => p.id === selected) : patient;
  const [fullName, setFullName] = useState(person?.name || '');
  const [birthDate, setBirthDate] = useState(person?.birth || '1990-01-01');
  const [gender, setGender] = useState(person?.gender || 'Nam');
  const [phone, setPhone] = useState(person?.phone || '');
  const [cccd, setCccd] = useState(person?.cccd || '');
  const [insuranceCard, setInsuranceCard] = useState(person?.insurance || '');
  const [patientType, setPatientType] = useState(person?.insurance ? 'BHYT' : 'VIEN_PHI');
  const [insuranceRate, setInsuranceRate] = useState(80);
  const [insuranceHospital, setInsuranceHospital] = useState('79-014 - BVĐK MediCare');
  const [insuranceValidFrom, setInsuranceValidFrom] = useState('2024-01-01');
  const [insuranceValidTo, setInsuranceValidTo] = useState('2028-12-31');
  const [referralType, setReferralType] = useState('Đúng tuyến');
  const [ethnicity, setEthnicity] = useState('Kinh');
  const [address, setAddress] = useState(person?.address || 'TP. Hồ Chí Minh');
  const [relativeContact, setRelativeContact] = useState('');
  const [priorityType, setPriorityType] = useState('Bình thường');
  const [selectedRoom, setSelectedRoom] = useState('PK-NOI');
  const [intakeReason, setIntakeReason] = useState('Khám kiểm tra sức khỏe ban đầu');
  const [allergyNote, setAllergyNote] = useState(person?.allergy || 'Chưa ghi nhận dị ứng thuốc');
  const [shiftSession, setShiftSession] = useState('Sáng (07:00 - 11:30)');

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
      setAllergyNote(person.allergy || 'Chưa ghi nhận dị ứng thuốc');
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
      setAllergyNote('Chưa ghi nhận dị ứng thuốc');
    }
  }, [selected, person]);

  // Calculate age automatically
  const calculatedAge = () => {
    if (!birthDate) return '';
    const birthYear = new Date(birthDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    return isNaN(age) ? '' : `${age} tuổi`;
  };

  // Auto-detect insurance rate from the 3rd character of the 15-digit BHYT card code
  function autoDetectInsuranceRate(cardCode) {
    if (!cardCode || cardCode.length < 3) return;
    const rateChar = cardCode.charAt(2);
    if (rateChar === '1' || rateChar === '2') {
      setInsuranceRate(100);
      setPriorityType('Ưu tiên BHYT 100%');
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
          allergy: allergyNote.trim()
        };
        result = await hisApi.updatePatient(payload);
        message = 'Đã lưu thông tin hành chính bệnh nhân';
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
          reason: `${intakeReason} (Ưu tiên: ${priorityType}, Tuyến: ${referralType})`,
          allergy: allergyNote.trim()
        };

        result = await hisApi.createVisit(payload);
        message = `Tiếp đón thành công! Cấp STT #${result.queueNumber} tại ${result.roomName || chosenRoom.name}`;
      }

      await syncWithSqlServer();
      onDone(message, result);
    } catch (err) {
      setError(err.message || 'Lỗi khi tiếp đón bệnh nhân');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="his-reception-container">
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
                ? 'Quy trình tiếp nhận bệnh nhân, kiểm tra quyền lợi BHYT và phân buồng khám theo chuẩn Viettel HIS'
                : `${person?.name || ''} · Mã BN: ${person?.id || ''}`}
            </p>
          </div>
        </div>
        {mode === 'register' && (
          <div className="his-mode-badge">
            <span className="badge teal">Tiếp đón Ngoại Trú (KCB 2026)</span>
          </div>
        )}
      </div>

      {mode === 'register' && (
        <div className="his-card his-search-card">
          <div className="his-card-header">
            <Search size={16} />
            <span>Tra cứu hồ sơ bệnh nhân cũ hoặc tạo mới</span>
          </div>
          <div className="his-card-body">
            <label className="his-field-label">
              Chọn hồ sơ bệnh nhân từ danh sách
              <select
                aria-label="Chọn hồ sơ tiếp đón"
                value={selected}
                onChange={e => { setSelected(e.target.value); setError(''); }}
                disabled={saving}
                className="his-select"
              >
                <option value="">+ Tạo hồ sơ bệnh nhân mới</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.id} · {p.birth || ''} · SĐT: {p.phone || 'Chưa có'} {p.insurance ? `· BHYT: ${p.insurance}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      <form key={selected || 'new'} onSubmit={submit} className="his-form-body">
        {mode === 'route' ? (
          <div className="his-card">
            <div className="his-card-header">
              <AlertTriangle size={16} />
              <span>Thông tin lượt khám cần điều chuyển / hủy</span>
            </div>
            <div className="his-card-body">
              <label className="his-field-label">
                Lượt khám đang mở *
                <select name="visitId" required className="his-select">
                  {ownVisits.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.id} · {v.date} {v.time} · Chuyên khoa: {v.department} · {v.status}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-row">
                <label className="his-field-label">
                  Thao tác thực hiện *
                  <select name="action" className="his-select">
                    <option value="transfer">Điều chuyển sang chuyên khoa khác</option>
                    <option value="cancel">Hủy lượt khám của bệnh nhân</option>
                  </select>
                </label>
                <label className="his-field-label">
                  Chuyên khoa tiếp nhận mới
                  <select name="dept" defaultValue={person?.dept} className="his-select">
                    {clinics.map(d => <option key={d}>{d}</option>)}
                  </select>
                </label>
              </div>
              <label className="his-field-label">
                Lý do điều chuyển hoặc hủy *
                <textarea name="reason" required maxLength={500} placeholder="Nhập chi tiết lý do chuyên môn..." className="his-textarea" />
              </label>
              {!ownVisits.length && (
                <p role="alert" className="form-error">Người bệnh không có lượt khám nào đang mở để điều chuyển hoặc hủy.</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* PHẦN 1: THÔNG TIN HÀNH CHÍNH & ĐỊNH DANH */}
            <div className="his-card">
              <div className="his-card-header">
                <IdCard size={16} />
                <span>1. Thông tin hành chính & Định danh cá nhân (Chuẩn Bộ Y tế)</span>
              </div>
              <div className="his-card-body">
                <div className="form-row form-row-3">
                  <label className="his-field-label">
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
                  <label className="his-field-label">
                    Ngày tháng năm sinh * {calculatedAge() && <span className="his-tag-age">{calculatedAge()}</span>}
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
                  <label className="his-field-label">
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
                </div>

                <div className="form-row form-row-3">
                  <label className="his-field-label">
                    Số CCCD / VNeID (12 số) *
                    <input
                      name="cccd"
                      maxLength={12}
                      pattern="[0-9]{12}"
                      value={cccd}
                      onChange={e => setCccd(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="079201000123"
                      className="his-input"
                    />
                  </label>
                  <label className="his-field-label">
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
                  <label className="his-field-label">
                    Dân tộc
                    <select
                      name="ethnicity"
                      value={ethnicity}
                      onChange={e => setEthnicity(e.target.value)}
                      className="his-select"
                    >
                      {ETHNICITIES.map(eth => <option key={eth} value={eth}>{eth}</option>)}
                    </select>
                  </label>
                </div>

                <div className="form-row">
                  <label className="his-field-label">
                    Địa chỉ cư trú thường trú / tạm trú *
                    <input
                      name="address"
                      required
                      maxLength={255}
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Số nhà, Đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố"
                      className="his-input"
                    />
                  </label>
                  <label className="his-field-label">
                    Người liên hệ khẩn cấp & SĐT người nhà
                    <input
                      name="relativeContact"
                      maxLength={150}
                      value={relativeContact}
                      onChange={e => setRelativeContact(e.target.value)}
                      placeholder="Họ tên người thân (Mối quan hệ) - SĐT"
                      className="his-input"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* PHẦN 2: THÔNG TIN BẢO HIỂM Y TẾ & QUYỀN LỢI */}
            <div className="his-card">
              <div className="his-card-header">
                <Shield size={16} />
                <span>2. Đối tượng khám & Quyền lợi Bảo hiểm Y tế (BHYT)</span>
              </div>
              <div className="his-card-body">
                <div className="form-row form-row-3">
                  <label className="his-field-label">
                    Loại đối tượng khám *
                    <select
                      value={patientType}
                      onChange={e => setPatientType(e.target.value)}
                      className="his-select his-highlight-select"
                    >
                      <option value="BHYT">BHYT - Khám chữa bệnh Bảo hiểm</option>
                      <option value="VIEN_PHI">Viện phí - Dịch vụ / Thu phí</option>
                    </select>
                  </label>

                  {patientType === 'BHYT' && (
                    <>
                      <label className="his-field-label">
                        Số thẻ BHYT (15 ký tự chuẩn QĐ 1666) *
                        <input
                          name="insurance"
                          maxLength={15}
                          value={insuranceCard}
                          onChange={e => handleInsuranceChange(e.target.value)}
                          placeholder="GD4790123456789"
                          className="his-input his-insurance-input"
                        />
                      </label>

                      <label className="his-field-label">
                        Mức hưởng BHYT
                        <div className="his-rate-box">
                          <span className={`badge ${insuranceRate === 100 ? 'teal' : insuranceRate === 95 ? 'blue' : 'amber'}`}>
                            Quỹ BHYT chi trả {insuranceRate}%
                          </span>
                          <small>Cùng chi trả: {100 - insuranceRate}%</small>
                        </div>
                      </label>
                    </>
                  )}
                </div>

                {patientType === 'BHYT' && (
                  <div className="form-row form-row-3">
                    <label className="his-field-label">
                      Nơi ĐKKCB ban đầu
                      <input
                        value={insuranceHospital}
                        onChange={e => setInsuranceHospital(e.target.value)}
                        className="his-input"
                      />
                    </label>
                    <label className="his-field-label">
                      Hạn thẻ từ ngày - Đến ngày
                      <div className="form-row">
                        <input
                          type="date"
                          value={insuranceValidFrom}
                          onChange={e => setInsuranceValidFrom(e.target.value)}
                          className="his-input"
                        />
                        <input
                          type="date"
                          value={insuranceValidTo}
                          onChange={e => setInsuranceValidTo(e.target.value)}
                          className="his-input"
                        />
                      </div>
                    </label>
                    <label className="his-field-label">
                      Tuyến KCB
                      <select
                        value={referralType}
                        onChange={e => setReferralType(e.target.value)}
                        className="his-select"
                      >
                        <option value="Đúng tuyến">Đúng tuyến KCB</option>
                        <option value="Có giấy chuyển tuyến">Có giấy chuyển tuyến</option>
                        <option value="Trái tuyến">Trái tuyến</option>
                        <option value="Cấp cứu">Cấp cứu (Hưởng đúng tuyến)</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* PHẦN 3: PHÂN LOẠI TIẾP ĐÓN & DIỆN ƯU TIÊN */}
            <div className="his-card">
              <div className="his-card-header">
                <AlertTriangle size={16} />
                <span>3. Phân loại tiếp đón & Diện ưu tiên (Triage)</span>
              </div>
              <div className="his-card-body">
                <div className="form-row form-row-3">
                  <label className="his-field-label">
                    Diện ưu tiên khám
                    <select
                      value={priorityType}
                      onChange={e => setPriorityType(e.target.value)}
                      className="his-select"
                    >
                      <option value="Bình thường">Bình thường (Xếp hàng chuẩn)</option>
                      <option value="Trẻ em < 6 tuổi">Trẻ em dưới 6 tuổi (Ưu tiên)</option>
                      <option value="Người già >= 75 tuổi">Người cao tuổi ≥ 75 tuổi (Ưu tiên)</option>
                      <option value="Phụ nữ mang thai">Phụ nữ mang thai (Ưu tiên)</option>
                      <option value="Người khuyết tật nặng">Người khuyết tật nặng (Ưu tiên)</option>
                      <option value="Cấp cứu ưu tiên 1">Cấp cứu loại 1 (Chuyển ngay)</option>
                    </select>
                  </label>

                  <label className="his-field-label">
                    Ca tiếp nhận
                    <select
                      value={shiftSession}
                      onChange={e => setShiftSession(e.target.value)}
                      className="his-select"
                    >
                      <option>Sáng (07:00 - 11:30)</option>
                      <option>Chiều (13:00 - 17:00)</option>
                      <option>Ngoài giờ / Trực đêm</option>
                    </select>
                  </label>

                  <label className="his-field-label">
                    Tiền sử dị ứng ban đầu
                    <input
                      value={allergyNote}
                      onChange={e => setAllergyNote(e.target.value)}
                      placeholder="Dị ứng kháng sinh, paracetamol..."
                      className="his-input"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* PHẦN 4: CHỈ ĐỊNH BUỒNG KHÁM CHUYÊN KHOA */}
            {mode === 'register' && (
              <div className="his-card">
                <div className="his-card-header">
                  <Stethoscope size={16} />
                  <span>4. Phân luồng buồng khám chuyên khoa & Bác sĩ tiếp nhận</span>
                </div>
                <div className="his-card-body">
                  <div className="form-row">
                    <label className="his-field-label">
                      Chọn Buồng khám chuyên khoa *
                      <select
                        value={selectedRoom}
                        onChange={e => setSelectedRoom(e.target.value)}
                        className="his-select his-room-select"
                      >
                        {CLINIC_ROOMS.map(room => (
                          <option key={room.code} value={room.code}>
                            {room.name} ({room.doctor})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="his-field-label">
                      Lý do vào khám / Triệu chứng ban đầu *
                      <input
                        value={intakeReason}
                        onChange={e => setIntakeReason(e.target.value)}
                        placeholder="Đau ngực, ho kéo dài, sốt, tái khám theo hẹn..."
                        className="his-input"
                        required
                      />
                    </label>
                  </div>

                  <div className="his-room-preview">
                    {(() => {
                      const room = CLINIC_ROOMS.find(r => r.code === selectedRoom) || CLINIC_ROOMS[0];
                      return (
                        <div className="his-preview-box">
                          <div>
                            <strong>{room.name}</strong>
                            <span>Bác sĩ phụ trách: {room.doctor}</span>
                          </div>
                          <span className="badge teal">STT dự kiến tự động cấp theo lượt</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="his-action-toolbar">
          <button
            type="submit"
            className="primary his-submit-btn"
            disabled={saving || (mode === 'route' && !ownVisits.length)}
          >
            {saving ? (
              'Đang xử lý...'
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
    </div>
  );
}
