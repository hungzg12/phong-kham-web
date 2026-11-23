import React, { useState, useEffect } from 'react';
import { BedDouble, User, AlertTriangle, ShieldCheck, Stethoscope, Clock, CreditCard, CheckCircle2, X, FileText, ChevronRight } from 'lucide-react';
import { hisApi } from './api';
import { getWorkspace } from './workspace';
import Icd10Search from './Icd10Search';
import { parseBhytCard } from './bhyt-utils';
import MedicalSuggestInput from './MedicalSuggestInput';

const DEFAULT_DOCTORS = [
  { id: 'NV-BS01', name: 'BS. Trần Minh Anh (Nội tổng quát)' },
  { id: 'NV-BS02', name: 'BS. Nguyễn Văn Hùng (Trưởng khoa Tim mạch)' },
  { id: 'NV-BS03', name: 'BS. Lê Thị Mai (Bác sĩ CKI)' }
];

const COMMON_DIAGNOSES = [
  'Viêm phổi thùy cấp - Theo dõi biến chứng suy hô hấp',
  'Viêm phế quản cấp bội nhiễm vi khuẩn',
  'Cơn tăng huyết áp kịch phát trên nền tăng huyết áp vô căn',
  'Viêm dạ dày ruột cấp mất nước độ I',
  'Đợt cấp bệnh phổi tắc nghẽn mạn tính (COPD)'
];

export default function InpatientAdmissionModal({
  bed,
  role,
  actor,
  patients = [],
  initialPatientId = '',
  onClose,
  onSuccess,
  notify,
  navigate
}) {
  const pId = bed?.patient || initialPatientId || '';
  const waitingAdm = (getWorkspace().admissions || []).find(a => a.patientId === pId);
  const [selectedPatientId, setSelectedPatientId] = useState(pId);
  const [doctor, setDoctor] = useState(waitingAdm?.doctor || 'NV-BS01');
  const [diagnosis, setDiagnosis] = useState(waitingAdm?.diagnosis || 'Viêm phổi thùy cấp - Theo dõi biến chứng suy hô hấp');
  const [icdCode, setIcdCode] = useState('J18.1');
  const [reason, setReason] = useState(waitingAdm?.reason || 'Sốt cao 39°C liên tục 3 ngày, khó thở tăng dần khi gắng sức, ho đờm đục, đáp ứng kém với điều trị ngoại trú');
  const [admissionTime, setAdmissionTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [advanceAmount, setAdvanceAmount] = useState(2000000);
  const [paymentMethod, setPaymentMethod] = useState('TIEN_MAT');
  const [note, setNote] = useState('Bệnh nhân nằm buồng theo dõi hô hấp, kiểm tra sinh hiệu mỗi 4 giờ');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [doctorsList, setDoctorsList] = useState(DEFAULT_DOCTORS);

  // Load doctors from SQL Server if available
  useEffect(() => {
    hisApi.getDoctors()
      .then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setDoctorsList(res.map(d => ({ id: d.id, name: d.name })));
        }
      })
      .catch(() => {});
  }, []);

  const selectedPatient = patients.find(p => p.id === selectedPatientId || p.maBenhNhan === selectedPatientId);

  // Handle Admission Submit
  async function handleAdmit(e) {
    e.preventDefault();
    if (!selectedPatientId) {
      setError('Vui lòng chọn người bệnh tiếp nhận.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        patientId: selectedPatientId,
        bedId: bed.id,
        doctor,
        diagnosis,
        icdCode,
        reason,
        admissionTime,
        advanceAmount: Number(advanceAmount) || 0,
        paymentMethod,
        staffId: actor?.staffId || 'NV-DD01',
        note
      };

      const data = await hisApi.admitInpatient(payload);
      if (data.error) {
        throw new Error(data.error);
      }

      notify(`Đã tiếp nhận nội trú và xếp giường ${bed.bedNumber || bed.id} cho bệnh nhân ${selectedPatient?.name || selectedPatientId}!`);
      if (onSuccess) onSuccess({ bedId: bed.id, patientId: selectedPatientId, admissionId: data.admissionId });
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể ghi nhận dữ liệu vào CSDL.');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Discharge Submit
  async function handleDischarge() {
    setSubmitting(true);
    setError('');
    try {
      const data = await hisApi.dischargeInpatient({
        admissionId: bed.admissionId,
        bedId: bed.id,
        treatmentResult: 'KHOI',
        advice: 'Bệnh nhân điều trị ổn định, ra viện dùng thuốc theo đơn và tái khám sau 7 ngày'
      });
      if (data.error) throw new Error(data.error);
      notify(`Đã xác nhận hoàn tất ra viện và chuyển giường ${bed.bedNumber || bed.id} sang chờ khử khuẩn.`);
      if (onSuccess) onSuccess({ bedId: bed.id, status: 'DANG_VE_SINH', cleaning: true });
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể hoàn tất ra viện.');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Disinfection Confirmation
  async function handleConfirmClean() {
    setSubmitting(true);
    setError('');
    try {
      const data = await hisApi.cleanBed(bed.id);
      if (data.error) throw new Error(data.error);
      notify(`Giường ${bed.bedNumber || bed.id} đã hoàn tất khử khuẩn và sẵn sàng tiếp nhận người bệnh mới.`);
      if (onSuccess) onSuccess({ bedId: bed.id, status: 'TRONG', cleaning: false });
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể cập nhật trạng thái khử khuẩn.');
    } finally {
      setSubmitting(false);
    }
  }

  // CASE 1: BED IS CLEANING
  if (bed.cleaning) {
    return (
      <div className="his-form-container">
        <div className="his-header-card">
          <div className="his-header-title">
            <span className="badge amber">CHỜ KHỬ KHUẨN</span>
            <h2>Quy trình Kiểm soát Nhiễm khuẩn Buồng Giường</h2>
            <p>{bed.roomName || 'Buồng 301 - Nội tổng quát'} · Giường {bed.bedNumber || bed.id} · Khoa {bed.departmentName || 'Nội tổng quát'}</p>
          </div>
        </div>

        <div className="his-card warning-card">
          <AlertTriangle size={24} className="text-amber" />
          <div>
            <b>Giường bệnh đang trong quy trình vệ sinh và khử khuẩn sau xuất viện</b>
            <p>Theo quy chuẩn kiểm soát nhiễm khuẩn bệnh viện (LAB 9 - Sơ đồ 1.2.3), điều dưỡng phụ trách phải kiểm tra thay ga, khử khuẩn bề mặt giường và dụng cụ y tế trước khi tiếp nhận bệnh nhân mới.</p>
          </div>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}

        <div className="his-modal-actions">
          <button type="button" className="secondary" onClick={onClose} disabled={submitting}>Đóng</button>
          <button type="button" className="primary" onClick={handleConfirmClean} disabled={submitting}>
            <CheckCircle2 size={16} />
            {submitting ? 'Đang cập nhật CSDL...' : 'Xác nhận đã khử khuẩn & Sẵn sàng đón bệnh nhân (SQL Server)'}
          </button>
        </div>
      </div>
    );
  }

  // CASE 2: BED IS OCCUPIED
  if (bed.patient) {
    const pt = selectedPatient || patients.find(p => p.id === bed.patient);
    return (
      <div className="his-form-container">
        <div className="his-header-card">
          <div className="his-header-title">
            <span className="badge teal">ĐANG SỬ DỤNG</span>
            <h2>Hồ sơ Người bệnh Đang Điều trị Nội trú</h2>
            <p>{bed.roomName || 'Buồng 301 - Nội tổng quát'} · Giường {bed.bedNumber || bed.id} · Đơn giá {(bed.dailyRate || 250000).toLocaleString('vi-VN')} ₫ / ngày</p>
          </div>
        </div>

        <div className="his-card">
          <div className="his-card-title">
            <User size={18} />
            <h3>Thông tin Hành chính & Đợt điều trị</h3>
          </div>
          <div className="his-grid-3">
            <div>
              <span className="his-label">Họ và tên người bệnh</span>
              <b className="his-val text-large">{bed.patientName || pt?.name || 'Chưa cập nhật'}</b>
            </div>
            <div>
              <span className="his-label">Mã bệnh nhân / Đợt điều trị</span>
              <b className="his-val">{bed.patient} · {bed.admissionId || 'Đang mở'}</b>
            </div>
            <div>
              <span className="his-label">Chế độ KCB & BHYT</span>
              <b className="his-val">
                {(() => {
                  const bh = parseBhytCard(pt?.insurance || pt?.soBHYT);
                  return bh.hasInsurance ? `${bh.code} (${bh.benefitBadge} · ${bh.groupName})` : 'Viện phí (Khám tự chi trả)';
                })()}
              </b>
            </div>
          </div>
          {pt?.allergies && (
            <div className="allergy-alert-box">
              <AlertTriangle size={16} />
              <span>CẢNH BÁO DỊ ỨNG: {pt.allergies}</span>
            </div>
          )}
        </div>

        <div className="his-card">
          <div className="his-card-title">
            <Stethoscope size={18} />
            <h3>Nghiệp vụ Chuyên môn & Tờ điều trị hàng ngày</h3>
          </div>
          <p className="his-card-desc">Bác sĩ ra Y lệnh thuốc, dịch truyền và chế độ chăm sóc trong Tờ điều trị hàng ngày. Điều dưỡng thực hiện y lệnh tại giường và trừ kho tủ trực theo chuẩn FEFO.</p>
          <div className="his-action-row">
            <button type="button" className="secondary" onClick={() => { onClose(); if (navigate) navigate('care'); }}>
              <FileText size={16} /> Mở Bàn điều trị & Y lệnh hàng ngày
            </button>
            <button type="button" className="secondary" onClick={() => { onClose(); if (navigate) navigate('finance'); }}>
              <CreditCard size={16} /> Bảng kê viện phí & Tạm ứng Mẫu 01/BV
            </button>
          </div>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}

        <div className="his-modal-actions">
          <button type="button" className="secondary" onClick={onClose} disabled={submitting}>Đóng</button>
          <button type="button" className="primary" onClick={handleDischarge} disabled={submitting}>
            {submitting ? 'Đang duyệt xuất viện...' : 'Xác nhận Bác sĩ Duyệt Xuất viện & Chuyển khử khuẩn'}
          </button>
        </div>
      </div>
    );
  }

  // CASE 3: ADMIT INPATIENT (EMPTY BED)
  return (
    <form className="his-form-container" onSubmit={handleAdmit}>
      {/* HEADER CARD */}
      <div className="his-header-card">
        <div className="his-header-title">
          <div className="his-pill-group">
            <span className="badge teal">TIẾP NHẬN NỘI TRÚ</span>
            <span className="badge gray">QUY CHUẨN BỘ Y TẾ</span>
            <span className="badge green">KHOA ĐIỀU TRỊ</span>
          </div>
          <h2>Phiếu Tiếp nhận Nội trú & Xếp buồng giường</h2>
          <p>Quy trình tiếp nhận nội trú, quản lý buồng bệnh và phân bổ y lệnh theo đợt điều trị</p>
        </div>
        <div className="his-header-specs">
          <div><span>Vị trí:</span> <b>{bed.roomName || 'Buồng 301 - Nội tổng quát'}</b></div>
          <div><span>Số giường:</span> <b className="highlight-tag">G{bed.bedNumber || bed.id}</b></div>
          <div><span>Đơn giá ngày giường:</span> <b className="text-teal">{(bed.dailyRate || 250000).toLocaleString('vi-VN')} ₫</b></div>
        </div>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      {/* CARD 1: THÔNG TIN NGƯỜI BỆNH TIẾP NHẬN */}
      <div className="his-card">
        <div className="his-card-title">
          <User size={18} />
          <h3>Khối 1: Thông tin Người bệnh tiếp nhận</h3>
        </div>
        <div className="his-form-grid">
          <label className="his-field col-span-2">
            <span>Chọn người bệnh có chỉ định nhập viện <small className="required-star">*</small></span>
            <select
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value)}
              required
              className="his-select-large"
            >
              <option value="">-- Chọn bệnh nhân từ danh sách chờ nhập viện --</option>
              {patients.map(p => (
                <option key={p.id || p.maBenhNhan} value={p.id || p.maBenhNhan}>
                  {p.name || p.hoTen} · {p.id || p.maBenhNhan} · {p.gender || p.gioiTinh} ({p.phone || p.soDienThoai})
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedPatient ? (
          <div className="his-patient-preview">
            <div className="his-grid-4">
              <div>
                <span className="his-label">Họ và tên</span>
                <b>{selectedPatient.name || selectedPatient.hoTen}</b>
              </div>
              <div>
                <span className="his-label">Mã định danh / CCCD</span>
                <b>{selectedPatient.cccd || selectedPatient.soDinhDanh || 'Chưa cập nhật'}</b>
              </div>
              <div>
                <span className="his-label">Chế độ KCB & BHYT</span>
                <b className="text-teal">
                  {(() => {
                    const bh = parseBhytCard(selectedPatient.insurance || selectedPatient.soBHYT);
                    return bh.hasInsurance ? `${bh.code} (${bh.benefitBadge} · ${bh.groupName})` : 'Viện phí (Khám tự chi trả 100%)';
                  })()}
                </b>
              </div>
              <div>
                <span className="his-label">Điện thoại liên hệ</span>
                <b>{selectedPatient.phone || selectedPatient.soDienThoai || 'Chưa cập nhật'}</b>
              </div>
            </div>

            {/* DỊ ỨNG THUỐC ALERT */}
            {(selectedPatient.trangThaiDiUng === 'CO_DI_UNG' || selectedPatient.allergies || selectedPatient.diUngThuoc) ? (
              <div className="allergy-alert-box">
                <AlertTriangle size={18} className="text-red" />
                <div>
                  <b className="text-red">CẢNH BÁO NGUY HIỂM: NGƯỜI BỆNH CÓ TIỀN SỬ DỊ ỨNG THUỐC!</b>
                  <p>{selectedPatient.diUngThuoc || selectedPatient.allergies || 'Dị ứng thuốc cần thận trọng khi ra y lệnh.'}</p>
                </div>
              </div>
            ) : (
              <div className="allergy-safe-box">
                <CheckCircle2 size={16} className="text-green" />
                <span>Không ghi nhận tiền sử dị ứng thuốc (Trạng thái: KHONG_GHI_NHAN)</span>
              </div>
            )}
          </div>
        ) : (
          <p className="his-hint-text">Vui lòng chọn người bệnh để tự động đối chiếu thông tin hành chính, số thẻ BHYT và cảnh báo dị ứng.</p>
        )}
      </div>

      {/* CARD 2: THÔNG TIN CHUYÊN MÔN VÀO VIỆN */}
      <div className="his-card">
        <div className="his-card-title">
          <Stethoscope size={18} />
          <h3>Khối 2: Thiết lập Đợt điều trị & Chuyên môn vào viện</h3>
        </div>
        <div className="his-form-grid">
          <label className="his-field">
            <span>Bác sĩ điều trị chính <small className="required-star">*</small></span>
            <select value={doctor} onChange={e => setDoctor(e.target.value)} required>
              {doctorsList.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
              ))}
            </select>
          </label>

          <div className="his-field">
            <span style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 500, color: '#334155' }}>
              Mã bệnh ICD-10 vào viện (Tra cứu CSDL) <small className="required-star">*</small>
            </span>
            <Icd10Search
              valueCode={icdCode}
              valueName=""
              onChange={({ code, name }) => {
                setIcdCode(code);
                if (name && !diagnosis) setDiagnosis(`${name} - Điều trị nội trú`);
              }}
            />
          </div>

          <label className="his-field col-span-2">
            <span>Chẩn đoán lâm sàng vào viện <small className="required-star">*</small></span>
            <input
              type="text"
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              required
              placeholder="Nhập chẩn đoán lâm sàng đầy đủ..."
            />
            <div className="quick-presets">
              <small>Gợi ý nhanh:</small>
              {COMMON_DIAGNOSES.slice(0, 3).map((d, idx) => (
                <button type="button" key={idx} className="preset-pill" onClick={() => setDiagnosis(d)}>
                  {d.split(' - ')[0]}
                </button>
              ))}
            </div>
          </label>

          <label className="his-field col-span-2">
            <span>Lý do nhập viện <small className="required-star">*</small></span>
            <MedicalSuggestInput
              type="admission"
              multiline
              rows={2}
              value={reason}
              onChange={val => setReason(val)}
              required
              placeholder="Mô tả triệu chứng lâm sàng cấp tính và lý do cần nhập viện theo dõi..."
            />
          </label>

          <label className="his-field">
            <span>Thời điểm tiếp nhận</span>
            <input
              type="datetime-local"
              value={admissionTime}
              onChange={e => setAdmissionTime(e.target.value)}
              required
            />
          </label>
        </div>
      </div>

      {/* CARD 3: PHÂN GIƯỜNG & TẠM ỨNG VIỆN PHÍ */}
      <div className="his-card">
        <div className="his-card-title">
          <CreditCard size={18} />
          <h3>Khối 3: Phân buồng giường & Tạm ứng viện phí ban đầu</h3>
        </div>
        <div className="his-form-grid">
          <label className="his-field">
            <span>Số tiền tạm ứng nội trú</span>
            <input
              type="number"
              min="0"
              step="100000"
              value={advanceAmount}
              onChange={e => setAdvanceAmount(Number(e.target.value))}
            />
            <div className="quick-presets">
              <button type="button" className="preset-pill" onClick={() => setAdvanceAmount(1000000)}>1.000.000 đ</button>
              <button type="button" className="preset-pill" onClick={() => setAdvanceAmount(2000000)}>2.000.000 đ</button>
              <button type="button" className="preset-pill" onClick={() => setAdvanceAmount(5000000)}>5.000.000 đ</button>
              <button type="button" className="preset-pill" onClick={() => setAdvanceAmount(0)}>0 đ (Miễn tạm ứng)</button>
            </div>
          </label>

          <label className="his-field">
            <span>Hình thức thanh toán tạm ứng (phuongThuc)</span>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="TIEN_MAT">Tiền mặt tại quầy thu ngân</option>
              <option value="CHUYEN_KHOAN">Chuyển khoản ngân hàng</option>
              <option value="VIETQR">Quét mã VietQR động</option>
              <option value="THE_POS">Thẻ ngân hàng (POS)</option>
            </select>
          </label>

          <label className="his-field col-span-2">
            <span>Dặn dò chăm sóc & Ghi chú buồng bệnh (ghiChu)</span>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ghi chú vị trí nằm, chế độ theo dõi hoặc lưu ý hộ lý..."
            />
          </label>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="his-modal-actions">
        <button type="button" className="secondary" onClick={onClose} disabled={submitting}>
          Hủy bỏ
        </button>
        <button type="submit" className="primary" disabled={submitting || !selectedPatientId}>
          <CheckCircle2 size={16} />
          {submitting ? 'Đang ghi nhận vào SQL Server...' : 'Xác nhận Tiếp nhận & Xếp giường (SQL Server)'}
        </button>
      </div>
    </form>
  );
}
