import React, { useState, useEffect } from 'react';
import { Printer, X, Download, ShieldCheck, FileText, CheckCircle2, Save, Edit3, AlertCircle } from 'lucide-react';
import { parseBhytCard, isBhytEligibleItem } from './bhyt-utils';
import './medical-paper-forms.css';

const currency = n => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n) || 0);

/**
 * 1. MẪU GIẤY CHUYỂN CƠ SỞ KCB BẢO HIỂM Y TẾ (MẪU SỐ 06)
 * Ban hành kèm theo Nghị định số 75/2023/NĐ-CP & Thông tư 01/2025/TT-BYT của Bộ Y tế
 */
export function ReferralPaperForm({ row, patient, doctorStaff, compact = false, onChange = () => {} }) {
  const bh = parseBhytCard(patient?.insurance || row.insurance);
  const now = new Date();
  const todayStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  const age = (patient?.birth || row.birth) ? (now.getFullYear() - Number(String(patient?.birth || row.birth).slice(0, 4))) : '—';

  return (
    <div className={`paper-sheet ${compact ? 'paper-sheet-compact' : ''}`}>
      {/* Quốc hiệu & Cơ sở y tế */}
      <div className="paper-header">
        <div className="paper-header-left">
          <span>SỞ Y TẾ TP. HỒ CHÍ MINH</span>
          <strong>BỆNH VIỆN ĐA KHOA MEDICARE</strong>
          <span>Mã CSKCB: <b>79-012</b></span>
          <div className="paper-doc-id">
            Số vào sổ: <input className="paper-input paper-input-inline" style={{ width: 130, fontWeight: 700 }} value={row.soVaoSo || `${row.id || '01'}/GCT-MC`} onChange={e => onChange('soVaoSo', e.target.value)} title="Số vào sổ chuyển tuyến" />
          </div>
        </div>
        <div className="paper-header-right">
          <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
          <span>Độc lập - Tự do - Hạnh phúc</span>
          <div className="paper-motto-line" />
          <div className="paper-doc-id">Mẫu số 06 (NĐ 75/2023/NĐ-CP & TT 01/2025/TT-BYT)</div>
        </div>
      </div>

      {/* Tiêu đề văn bản */}
      <div className="paper-title">
        <h1>GIẤY CHUYỂN CƠ SỞ KHÁM BỆNH, CHỮA BỆNH BẢO HIỂM Y TẾ</h1>
        <p className="paper-sub-law">
          (Căn cứ Luật Bảo hiểm y tế và Thông tư số 01/2025/TT-BYT của Bộ Y tế)
        </p>
      </div>

      <div className="paper-recipient" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <b>Kính gửi:</b>
        <input
          className="paper-input"
          style={{ width: '65%', fontWeight: 700, textAlign: 'center' }}
          value={row.destination || 'Bệnh viện Chợ Rẫy TP. Hồ Chí Minh (Tuyến Trung ương)'}
          onChange={e => onChange('destination', e.target.value)}
          placeholder="Tên cơ sở tiếp nhận khám bệnh, chữa bệnh..."
        />
      </div>

      {/* Phần I: Thông tin người bệnh - Cấu trúc Grid chuẩn chống xô lệch */}
      <div className="paper-section-title">I. THÔNG TIN HÀNH CHÍNH NGƯỜI BỆNH:</div>
      <div className="paper-grid-admin-3col">
        <div className="paper-field-cell">
          <span className="paper-label">- Họ và tên người bệnh:</span>
          <input
            className="paper-input"
            style={{ fontWeight: 700 }}
            value={row.patientName || patient?.name || 'NGUYỄN VĂN MINH'}
            onChange={e => onChange('patientName', e.target.value)}
          />
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">Giới tính:</span>
          <input
            className="paper-input"
            style={{ textAlign: 'center' }}
            value={row.gender || patient?.gender || 'Nam'}
            onChange={e => onChange('gender', e.target.value)}
          />
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">Tuổi:</span>
          <span className="paper-value" style={{ textAlign: 'center' }}>{age}</span>
        </div>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Địa chỉ nơi cư trú:</span>
        <input
          className="paper-input"
          value={row.address || patient?.address || 'Quận 1, TP. Hồ Chí Minh'}
          onChange={e => onChange('address', e.target.value)}
        />
      </div>

      <div className="paper-grid-admin-2col">
        <div className="paper-field-cell">
          <span className="paper-label">- Số CCCD / Định danh cá nhân:</span>
          <input
            className="paper-input"
            value={row.cccd || patient?.cccd || '079090123456'}
            onChange={e => onChange('cccd', e.target.value)}
          />
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">Số điện thoại:</span>
          <input
            className="paper-input"
            value={row.phone || patient?.phone || '0901234567'}
            onChange={e => onChange('phone', e.target.value)}
          />
        </div>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Mã số thẻ BHYT:</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <input
            className="paper-input"
            style={{ width: 180, fontWeight: 700, letterSpacing: 1 }}
            value={bh.code || row.insurance || 'GD4790987654321'}
            onChange={e => onChange('insurance', e.target.value)}
          />
          <span style={{ fontSize: 13, color: '#334155', whiteSpace: 'nowrap' }}>
            (Mức hưởng: <b>{bh.rate}%</b> chi phí KCB BHYT)
          </span>
        </div>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Khám bệnh / Vào điều trị từ:</span>
        <input
          className="paper-input"
          value={row.treatmentPeriod || '08:00 ngày 21/11/2026 đến 11:30 ngày 23/11/2026'}
          onChange={e => onChange('treatmentPeriod', e.target.value)}
        />
      </div>

      {/* Phần II: Tóm tắt bệnh án - Dòng chấm liên tục chống đứt đoạn */}
      <div className="paper-section-title" style={{ marginTop: 12 }}>II. TÓM TẮT BỆNH ÁN VÀ QUÁ TRÌNH ĐIỀU TRỊ:</div>
      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>1. Dấu hiệu lâm sàng:</span>
        <textarea
          className="paper-textarea-leader"
          rows={2}
          value={row.symptoms || row.note || 'Bệnh nhân đau ngực trái từng cơn lan lên vai, khó thở khi gắng sức độ II-III theo NYHA.'}
          onChange={e => onChange('symptoms', e.target.value)}
          placeholder="Mô tả triệu chứng lâm sàng lúc tiếp nhận..."
        />
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>2. Kết quả cận lâm sàng chính:</span>
        <textarea
          className="paper-textarea-leader"
          rows={2}
          value={row.labSummary || 'ECG: ST chênh xuống 1.5mm ở V4-V6. Troponin I tăng nhẹ (0.08 ng/mL). Siêu âm tim: Giảm động thành dưới thất trái, EF = 52%.'}
          onChange={e => onChange('labSummary', e.target.value)}
          placeholder="Tóm tắt kết quả xét nghiệm, chẩn đoán hình ảnh..."
        />
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>3. Chẩn đoán chuyển tuyến:</span>
        <input
          className="paper-input"
          style={{ fontWeight: 700 }}
          value={row.diagnosis || 'I20.0 - Hội chứng mạch vành cấp - Cơn đau thắt ngực không ổn định'}
          onChange={e => onChange('diagnosis', e.target.value)}
          placeholder="Mã ICD-10 và tên chẩn đoán xác định..."
        />
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>4. Phương pháp / thuốc đã dùng:</span>
        <textarea
          className="paper-textarea-leader"
          rows={2}
          value={row.treatment || 'Aspirin 81mg x 01 viên, Clopidogrel 75mg x 01 viên, Nitroglycerin ngậm dưới lưỡi, thở oxy kính 2L/phút.'}
          onChange={e => onChange('treatment', e.target.value)}
          placeholder="Thuốc, dịch truyền và can thiệp đã xử trí..."
        />
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>5. Tình trạng lúc chuyển tuyến:</span>
        <input
          className="paper-input"
          value={row.condition || 'Tri giác tỉnh táo, tiếp xúc tốt. Mạch: 82 l/p, HA: 135/85 mmHg, SpO2: 97% có thở oxy. Giảm đau ngực.'}
          onChange={e => onChange('condition', e.target.value)}
          placeholder="Dấu hiệu sinh tồn và tri giác người bệnh khi bàn giao chuyển viện..."
        />
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>6. Lý do chuyển tuyến:</span>
        <textarea
          className="paper-textarea-leader"
          rows={2}
          value={row.reason || '1. Vượt quá năng lực chuyên môn kỹ thuật can thiệp tim mạch của bệnh viện; cần chụp và can thiệp mạch vành khẩn.'}
          onChange={e => onChange('reason', e.target.value)}
          placeholder="1: Vượt quá khả năng chuyên môn / 2: Theo nguyện vọng người bệnh..."
        />
      </div>

      <div className="paper-row">
        <span className="paper-label">7. Hướng điều trị tiếp theo:</span>
        <input
          className="paper-input"
          value={row.plan || 'Tiếp tục can thiệp tim mạch chuyên sâu theo phác đồ tuyến Trung ương.'}
          onChange={e => onChange('plan', e.target.value)}
          placeholder="Kế hoạch điều trị dự kiến tại cơ sở tiếp nhận..."
        />
      </div>

      <div className="paper-row">
        <span className="paper-label">8. Phương tiện vận chuyển:</span>
        <input
          className="paper-input"
          value={row.transport || 'Xe cứu thương chuyên dụng của bệnh viện (có Bác sĩ và Điều dưỡng đi cùng hỗ trợ cấp cứu)'}
          onChange={e => onChange('transport', e.target.value)}
        />
      </div>

      <div className="paper-row">
        <span className="paper-label">9. Họ tên người hộ tống:</span>
        <input
          className="paper-input"
          value={row.escort || 'BS.CKI Trần Minh Anh & ĐD. Nguyễn Thị Mai'}
          onChange={e => onChange('escort', e.target.value)}
        />
      </div>

      {/* Phần ký duyệt - Cố định trang in A4 */}
      <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: 14, fontSize: 12.5 }}>
        TP. Hồ Chí Minh, {todayStr}
      </div>

      <div className="paper-sign-block">
        <div className="paper-sign-col">
          <span className="sign-title">BÁC SĨ CHỈ ĐỊNH</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên và CCHN)</span>
          <input
            className="paper-input"
            style={{ textAlign: 'center', fontWeight: 700, marginTop: 40 }}
            value={row.doctor || doctorStaff?.name || 'BS.CKI Trần Minh Anh'}
            onChange={e => onChange('doctor', e.target.value)}
          />
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">TRƯỞNG PHÒNG KHTH</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên)</span>
          <span className="sign-name">BS.CKII Lê Thị Mai</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">GIÁM ĐỐC BỆNH VIỆN</span>
          <span className="sign-hint">(Ký, đóng dấu cơ sở KCB)</span>
          <span className="sign-name">
            PGS.TS.BS Đặng Quốc Tuấn
            <span className="paper-badge-stamp">ĐÃ DUYỆT BHYT</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. MẪU BIÊN BẢN HỘI CHẨN CHUYÊN MÔN
 * Ban hành theo Quy chế bệnh viện QĐ 1895/1997/QĐ-BYT & QĐ 4069/2001/QĐ-BYT của Bộ Y tế
 */
export function ConsultationPaperForm({ row, patient, doctorStaff, compact = false, onChange = () => {} }) {
  const now = new Date();
  const todayStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;

  return (
    <div className={`paper-sheet ${compact ? 'paper-sheet-compact' : ''}`}>
      <div className="paper-header">
        <div className="paper-header-left">
          <span>SỞ Y TẾ TP. HỒ CHÍ MINH</span>
          <strong>BỆNH VIỆN ĐA KHOA MEDICARE</strong>
          <span>Khoa: <b>Khám bệnh - Hồi sức tích cực</b></span>
          <div className="paper-doc-id">Mã biên bản: <b>{row.id}</b></div>
        </div>
        <div className="paper-header-right">
          <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
          <span>Độc lập - Tự do - Hạnh phúc</span>
          <div className="paper-motto-line" />
          <div className="paper-doc-id">Biểu mẫu lưu trữ bệnh án nội/ngoại trú</div>
        </div>
      </div>

      <div className="paper-title">
        <h1>BIÊN BẢN HỘI CHẨN CHUYÊN MÔN</h1>
        <p className="paper-sub-law">(V/v: Thống nhất chẩn đoán và phác đồ điều trị ca bệnh khó/phức tạp)</p>
      </div>

      {/* Thông tin cuộc hội chẩn */}
      <div className="paper-grid-admin-half">
        <div className="paper-field-cell">
          <span className="paper-label">- Thời gian:</span>
          <span className="paper-value">Hồi 09 giờ 30 phút, {todayStr}</span>
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">Địa điểm:</span>
          <input
            className="paper-input"
            value={row.location || 'Phòng Giao ban Chuyên môn - Bệnh viện MediCare'}
            onChange={e => onChange('location', e.target.value)}
          />
        </div>
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>- Lý do hội chẩn:</span>
        <textarea
          className="paper-textarea-leader"
          rows={2}
          value={row.reason || 'Bệnh nhân có nhiều bệnh nền phối hợp, diễn biến lâm sàng không thuyên giảm sau 48h điều trị.'}
          onChange={e => onChange('reason', e.target.value)}
        />
      </div>

      {/* Thành phần tham dự */}
      <div className="paper-section-title">I. THÀNH PHẦN HỘI CHẨN:</div>
      <div className="paper-grid-admin-half">
        <div className="paper-field-cell">
          <span className="paper-label">1. Chủ tọa:</span>
          <input
            className="paper-input"
            style={{ fontWeight: 700 }}
            value={row.leader || 'BS.CKII Phạm Hoàng Long - Giám đốc chuyên môn'}
            onChange={e => onChange('leader', e.target.value)}
          />
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">2. Thư ký:</span>
          <input
            className="paper-input"
            value={row.secretary || 'BS.CKI Trần Minh Anh - Bác sĩ điều trị'}
            onChange={e => onChange('secretary', e.target.value)}
          />
        </div>
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>3. Thành viên tham gia:</span>
        <textarea
          className="paper-textarea-leader"
          rows={2}
          value={row.participants || 'BS.CKI Hoàng Văn Thịnh (Nội Tim mạch), BS.CKI Lê Thị Ngọc Mai (Hồi sức cấp cứu), DS.CKI Nguyễn Thị Hoa (Dược lâm sàng)'}
          onChange={e => onChange('participants', e.target.value)}
        />
      </div>

      {/* Tóm tắt diễn biến */}
      <div className="paper-section-title">II. TÓM TẮT DIỄN BIẾN BỆNH & QUÁ TRÌNH ĐIỀU TRỊ:</div>
      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <textarea
          className="paper-textarea-leader"
          rows={3}
          value={row.summary || 'Bệnh nhân nam 64 tuổi, chẩn đoán ban đầu Hội chứng vành cấp kèm Đái tháo đường type 2. Đã dùng thuốc giảm đau ngực, hạ áp, kháng kết tập tiểu cầu kép nhưng còn đau ngực tái phát khi nghỉ ngơi, men tim Troponin T tiếp tục tăng.'}
          onChange={e => onChange('summary', e.target.value)}
        />
      </div>

      {/* Kết luận & Phác đồ */}
      <div className="paper-section-title">III. KẾT LUẬN VÀ PHÁC ĐỒ THỐNG NHẤT:</div>
      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>1. Chẩn đoán thống nhất:</span>
        <textarea
          className="paper-textarea-leader"
          rows={2}
          style={{ fontWeight: 700 }}
          value={row.conclusion || 'Nhồi máu cơ tim cấp không ST chênh lên nguy cơ rất cao (Grace score 155) / Đái tháo đường type 2 - Tăng huyết áp độ 2.'}
          onChange={e => onChange('conclusion', e.target.value)}
        />
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>2. Hướng điều trị thống nhất:</span>
        <textarea
          className="paper-textarea-leader"
          rows={3}
          value={row.plan || '1. Chuyển cấp cứu tuyến trên (BV Chợ Rẫy) để chụp và can thiệp mạch vành qua da khẩn cấp trong vòng 2 giờ. 2. Tiếp tục duy trì Enoxaparin 1mg/kg TDD mỗi 12h, kiểm soát huyết áp và đường huyết tích cực. 3. Đội cấp cứu ngoại viện 115 hộ tống trực tiếp.'}
          onChange={e => onChange('plan', e.target.value)}
        />
      </div>

      {/* Ký tên */}
      <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: 14, fontSize: 12.5 }}>
        Biên bản thông qua lúc 10h15 cùng ngày.
      </div>

      <div className="paper-sign-block">
        <div className="paper-sign-col">
          <span className="sign-title">THƯ KÝ BIÊN BẢN</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên)</span>
          <span className="sign-name">{row.secretary || 'BS.CKI Trần Minh Anh'}</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">BÁC SĨ ĐIỀU TRỊ</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên)</span>
          <span className="sign-name">{doctorStaff?.name || 'BS.CKI Trần Minh Anh'}</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">CHỦ TỌA HỘI CHẨN</span>
          <span className="sign-hint">(Ký, ghi rõ học hàm, học vị)</span>
          <span className="sign-name">{row.leader || 'BS.CKII Phạm Hoàng Long'}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 3. MẪU GIẤY RA VIỆN (PHỤ LỤC 3)
 * Ban hành kèm theo Thông tư số 18/2022/TT-BYT sửa đổi TT 56/2017/TT-BYT của Bộ Y tế
 */
export function DischargePaperForm({ row, patient, doctorStaff, compact = false, onChange = () => {} }) {
  const bh = parseBhytCard(patient?.insurance || row.insurance);
  const now = new Date();
  const todayStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  const age = (patient?.birth || row.birth) ? (now.getFullYear() - Number(String(patient?.birth || row.birth).slice(0, 4))) : '—';

  return (
    <div className={`paper-sheet ${compact ? 'paper-sheet-compact' : ''}`}>
      <div className="paper-header">
        <div className="paper-header-left">
          <span>SỞ Y TẾ TP. HỒ CHÍ MINH</span>
          <strong>BỆNH VIỆN ĐA KHOA MEDICARE</strong>
          <span>Mã CSKCB: <b>79-012</b></span>
          <div className="paper-doc-id">
            Số lưu trữ: <input className="paper-input paper-input-inline" style={{ width: 120, fontWeight: 700 }} value={row.soLuuTru || `RV-${row.id || '2026/01'}`} onChange={e => onChange('soLuuTru', e.target.value)} />
          </div>
        </div>
        <div className="paper-header-right">
          <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
          <span>Độc lập - Tự do - Hạnh phúc</span>
          <div className="paper-motto-line" />
          <div className="paper-doc-id">Phụ lục 3 (Thông tư số 18/2022/TT-BYT)</div>
        </div>
      </div>

      <div className="paper-title">
        <h1>GIẤY RA VIỆN</h1>
      </div>

      <div className="paper-grid-admin-3col">
        <div className="paper-field-cell">
          <span className="paper-label">- Họ và tên người bệnh:</span>
          <input
            className="paper-input"
            style={{ fontWeight: 700 }}
            value={row.patientName || patient?.name || 'NGUYỄN VĂN MINH'}
            onChange={e => onChange('patientName', e.target.value)}
          />
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">Nam/Nữ:</span>
          <input
            className="paper-input"
            style={{ textAlign: 'center' }}
            value={row.gender || patient?.gender || 'Nam'}
            onChange={e => onChange('gender', e.target.value)}
          />
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">Tuổi:</span>
          <span className="paper-value" style={{ textAlign: 'center' }}>{age}</span>
        </div>
      </div>

      <div className="paper-grid-admin-2col">
        <div className="paper-field-cell">
          <span className="paper-label">- Dân tộc:</span>
          <span className="paper-value">Kinh</span>
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">Nghề nghiệp:</span>
          <span className="paper-value">Cán bộ hưu trí</span>
        </div>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Mã số BHXH / Thẻ BHYT:</span>
        <input
          className="paper-input"
          style={{ width: 200, fontWeight: 700 }}
          value={bh.code || row.insurance || 'GD4790987654321'}
          onChange={e => onChange('insurance', e.target.value)}
        />
      </div>

      <div className="paper-row">
        <span className="paper-label">- Địa chỉ cư trú:</span>
        <input
          className="paper-input"
          value={row.address || patient?.address || 'Quận 1, TP. Hồ Chí Minh'}
          onChange={e => onChange('address', e.target.value)}
        />
      </div>

      <div className="paper-grid-admin-half">
        <div className="paper-field-cell">
          <span className="paper-label">- Vào viện lúc:</span>
          <span className="paper-value">08 giờ 00 phút, ngày 18 tháng 11 năm 2026</span>
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">Ra viện lúc:</span>
          <span className="paper-value">10 giờ 30 phút, {todayStr}</span>
        </div>
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>- Chẩn đoán ra viện:</span>
        <textarea
          className="paper-textarea-leader"
          rows={2}
          style={{ fontWeight: 700 }}
          value={row.diagnosis || 'E11.9 - Đái tháo đường type 2 không có biến chứng toan ceton - Tăng huyết áp độ 1 (I10)'}
          onChange={e => onChange('diagnosis', e.target.value)}
          placeholder="Chẩn đoán xác định khi kết thúc đợt điều trị..."
        />
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>- Phương pháp điều trị:</span>
        <textarea
          className="paper-textarea-leader"
          rows={2}
          value={row.treatment || 'Điều trị nội khoa: Điều chỉnh liều Insulin kết hợp thuốc uống, truyền dịch cân bằng điện giải, chăm sóc dinh dưỡng lâm sàng.'}
          onChange={e => onChange('treatment', e.target.value)}
        />
      </div>

      <div className="paper-row">
        <span className="paper-label">- Kết quả điều trị:</span>
        <input
          className="paper-input"
          style={{ fontWeight: 600 }}
          value={row.outcome || 'Đỡ / giảm (Đường huyết ổn định, hết triệu chứng)'}
          onChange={e => onChange('outcome', e.target.value)}
        />
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>- Ghi chú / Lời dặn của thầy thuốc:</span>
        <textarea
          className="paper-textarea-leader"
          rows={2}
          value={row.advice || 'Dùng thuốc đều đặn theo đơn ngoại trú, đo đường huyết mao mạch tại nhà 2 lần/ngày, kiêng đồ ngọt tinh bột, tái khám sau 1 tuần.'}
          onChange={e => onChange('advice', e.target.value)}
        />
      </div>

      <div className="paper-row">
        <span className="paper-label">- Số ngày nghỉ việc hưởng BHXH:</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="paper-input paper-input-inline"
            style={{ width: 60, fontWeight: 700, textAlign: 'center' }}
            type="number"
            value={row.daysOff || row.soNgayNghiBHXH || 7}
            onChange={e => onChange('daysOff', e.target.value)}
          />
          <span>ngày (Từ ngày ra viện đến hết ngày nghỉ chỉ định)</span>
        </div>
      </div>

      <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: 18, fontSize: 12.5 }}>
        TP. Hồ Chí Minh, {todayStr}
      </div>

      <div className="paper-sign-block">
        <div className="paper-sign-col">
          <span className="sign-title">NGƯỜI HÀNH NGHỀ KHÁM CHỮA BỆNH</span>
          <span className="sign-hint">(Bác sĩ điều trị ký, ghi rõ họ tên)</span>
          <input
            className="paper-input"
            style={{ textAlign: 'center', fontWeight: 700, marginTop: 40 }}
            value={row.doctor || doctorStaff?.name || 'BS.CKI Trần Minh Anh'}
            onChange={e => onChange('doctor', e.target.value)}
          />
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">THỦ TRƯỞNG ĐƠN VỊ</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên và đóng dấu)</span>
          <span className="sign-name">
            PGS.TS.BS Đặng Quốc Tuấn
            <span className="paper-badge-stamp">BỆNH VIỆN MEDICARE</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 4. MẪU BẢNG KÊ CHI PHÍ KHÁM BỆNH, CHỮA BỆNH (MẪU SỐ 01/BV)
 * Chuẩn định dạng dữ liệu đầu ra theo Quyết định số 130/QĐ-BYT & QĐ 6556/QĐ-BYT của Bộ Y tế
 */
export function MedicalBillPaperForm({ row, patient, cashierStaff, compact = false, onChange = () => {} }) {
  const bh = parseBhytCard(patient?.insurance || row.insurance);
  const now = new Date();
  const todayStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  const advance = Number(row.advance) || 0;

  const rawLines = row.lines && row.lines.length > 0 ? row.lines : [
    { name: 'Khám chuyên khoa Nội tổng quát', category: '1. Tiền khám bệnh', qty: 1, unit: 'Lượt', price: 150000, inBhyt: true, insuranceCovered: true },
    { name: 'Tổng phân tích tế bào máu ngoại vi (24 thông số)', category: '2. Xét nghiệm', qty: 1, unit: 'Lần', price: 110000, inBhyt: true, insuranceCovered: true },
    { name: 'Chụp X-quang ngực thẳng kỹ thuật số', category: '3. Chẩn đoán hình ảnh', qty: 1, unit: 'Lần', price: 150000, inBhyt: true, insuranceCovered: true },
    { name: 'Paracetamol 500mg (Viên nén)', category: '5. Thuốc & Dịch truyền', qty: 10, unit: 'Viên', price: 1200, inBhyt: true, insuranceCovered: true },
    { name: 'Panadol Extra 500mg/65mg (Chứa Caffeine)', category: '5. Thuốc & Dịch truyền', qty: 10, unit: 'Viên', price: 1500, inBhyt: false, insuranceCovered: false, nonBhytReason: 'Ngoài danh mục TT 20/2022/TT-BYT (chứa Caffeine)' }
  ];

  const processedLines = rawLines.map(l => {
    const qty = Number(l.qty || l.quantity || 1);
    const price = Number(l.price || 0);
    const lineTotal = qty * price;
    const eligibility = isBhytEligibleItem(l);
    const isEligible = eligibility.eligible && l.insuranceCovered !== false && l.inBhyt !== false && bh.hasInsurance;
    const lineRate = isEligible ? (l.bhytRate !== undefined ? Number(l.bhytRate) : bh.rate) : 0;
    const lineBHYT = isEligible ? Math.round((lineTotal * lineRate) / 100) : 0;
    const lineCopay = isEligible ? (lineTotal - lineBHYT) : 0;
    const lineOutOfPocket = !isEligible ? lineTotal : 0;
    const lineBN = lineCopay + lineOutOfPocket;

    return {
      ...l,
      name: l.name || l.description || l.medicine || '',
      category: l.category || 'Dịch vụ KCB',
      unit: l.unit || 'Lần',
      qty,
      price,
      lineTotal,
      isEligible,
      nonBhytReason: !eligibility.eligible ? eligibility.reason : (l.nonBhytReason || (!isEligible ? 'Ngoài phạm vi chi trả BHYT' : undefined)),
      lineRate,
      lineBHYT,
      lineCopay,
      lineOutOfPocket,
      lineBN
    };
  });

  const inBhytLines = processedLines.filter(l => l.isEligible);
  const outBhytLines = processedLines.filter(l => !l.isEligible);

  const gross = processedLines.reduce((s, l) => s + l.lineTotal, 0);
  const insuranceCovered = processedLines.reduce((s, l) => s + l.lineBHYT, 0);
  const copay = processedLines.reduce((s, l) => s + l.lineCopay, 0);
  const outOfPocket = processedLines.reduce((s, l) => s + l.lineOutOfPocket, 0);
  const totalPatientDue = copay + outOfPocket;
  const balance = totalPatientDue - advance;

  return (
    <div className={`paper-sheet ${compact ? 'paper-sheet-compact' : ''}`}>
      <div className="paper-header">
        <div className="paper-header-left">
          <span>SỞ Y TẾ TP. HỒ CHÍ MINH</span>
          <strong>BỆNH VIỆN ĐA KHOA MEDICARE</strong>
          <span>Mã CSKCB: <b>79-012</b></span>
          <div className="paper-doc-id">Số phiếu thanh toán: <b>{row.id}</b></div>
        </div>
        <div className="paper-header-right">
          <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
          <span>Độc lập - Tự do - Hạnh phúc</span>
          <div className="paper-motto-line" />
          <div className="paper-doc-id">Mẫu số 01/BV (QĐ 130/QĐ-BYT)</div>
        </div>
      </div>

      <div className="paper-title">
        <h1>BẢNG KÊ CHI PHÍ KHÁM BỆNH, CHỮA BỆNH NGOẠI TRÚ</h1>
        <p className="paper-sub-law">(Ban hành kèm theo Quyết định số 130/QĐ-BYT của Bộ trưởng Bộ Y tế)</p>
      </div>

      {/* Thông tin hành chính */}
      <div className="paper-grid-admin-2col">
        <div className="paper-field-cell">
          <span className="paper-label">- Họ tên người bệnh:</span>
          <span className="paper-value"><b>{patient?.name || row.patientName || 'NGUYỄN VĂN MINH'}</b></span>
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">Mã người bệnh:</span>
          <span className="paper-value">{patient?.id || row.patient || 'BN-240101-002'}</span>
        </div>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Thẻ BHYT số:</span>
        <span className="paper-value">
          <code style={{ fontSize: 13, fontWeight: 700 }}>{bh.code || 'CHƯA ĐĂNG KÝ BHYT'}</code>
          <span style={{ marginLeft: 12 }}>
            Mức hưởng: <b>{bh.rate}%</b> {bh.hasInsurance ? `(${bh.groupName})` : ''}
          </span>
        </span>
      </div>

      {/* Bảng chi tiết dịch vụ Mẫu 01/BV tách bạch Mục I và Mục II theo QĐ 130/QĐ-BYT */}
      <table className="paper-table">
        <thead>
          <tr>
            <th style={{ width: 36 }}>STT</th>
            <th>NỘI DUNG DỊCH VỤ / THUỐC</th>
            <th style={{ width: 55 }}>ĐVT</th>
            <th style={{ width: 40 }}>SL</th>
            <th style={{ width: 85 }}>ĐƠN GIÁ (đ)</th>
            <th style={{ width: 95 }}>THÀNH TIỀN (đ)</th>
            <th style={{ width: 95 }}>QUỸ BHYT (đ)</th>
            <th style={{ width: 95 }}>BN PHẢI TRẢ (đ)</th>
          </tr>
        </thead>
        <tbody>
          {/* MỤC I: CHI PHÍ TRONG PHẠM VI BHYT */}
          <tr style={{ background: '#f0fdf4', fontWeight: 700 }}>
            <td colSpan={8} style={{ padding: '6px 8px', color: '#166534', borderTop: '2px solid #86efac' }}>
              I. CHI PHÍ TRONG PHẠM VI QUỸ BHYT THANH TOÁN (Mức hưởng {bh.rate}%)
            </td>
          </tr>
          {inBhytLines.length === 0 ? (
            <tr><td colSpan={8} style={{ textAlign: 'center', fontStyle: 'italic', color: '#64748b' }}>Không có chi phí trong phạm vi BHYT</td></tr>
          ) : (
            inBhytLines.map((l, i) => (
              <tr key={'in_' + i}>
                <td className="text-center">{i + 1}</td>
                <td>
                  <b>{l.name}</b>
                  <div style={{ fontSize: 10.5, color: '#047857' }}>
                    {l.category} · <span style={{ color: '#15803d' }}>Trong danh mục BHYT</span>
                  </div>
                </td>
                <td className="text-center">{l.unit}</td>
                <td className="text-center">{l.qty}</td>
                <td className="text-right">{l.price.toLocaleString('vi-VN')}</td>
                <td className="text-right font-bold">{l.lineTotal.toLocaleString('vi-VN')}</td>
                <td className="text-right" style={{ color: '#065f46', fontWeight: 600 }}>{l.lineBHYT.toLocaleString('vi-VN')}</td>
                <td className="text-right" style={{ color: '#1e40af', fontWeight: 600 }}>{l.lineCopay.toLocaleString('vi-VN')}</td>
              </tr>
            ))
          )}

          {/* MỤC II: CHI PHÍ NGOÀI DANH MỤC BHYT */}
          <tr style={{ background: '#fffbeb', fontWeight: 700 }}>
            <td colSpan={8} style={{ padding: '6px 8px', color: '#92400e', borderTop: '2px solid #fde68a' }}>
              II. CHI PHÍ NGOÀI DANH MỤC BHYT THANH TOÁN (Người bệnh tự chi trả 100%)
            </td>
          </tr>
          {outBhytLines.length === 0 ? (
            <tr><td colSpan={8} style={{ textAlign: 'center', fontStyle: 'italic', color: '#64748b' }}>Không có chi phí ngoài danh mục BHYT</td></tr>
          ) : (
            outBhytLines.map((l, i) => (
              <tr key={'out_' + i} style={{ background: '#fffdf5' }}>
                <td className="text-center">{inBhytLines.length + i + 1}</td>
                <td>
                  <b>{l.name}</b>
                  <div style={{ fontSize: 10.5, color: '#b45309' }}>
                    {l.category} · <b>{l.nonBhytReason || 'Ngoài danh mục BHYT - Người bệnh tự chi trả'}</b>
                  </div>
                </td>
                <td className="text-center">{l.unit}</td>
                <td className="text-center">{l.qty}</td>
                <td className="text-right">{l.price.toLocaleString('vi-VN')}</td>
                <td className="text-right font-bold">{l.lineTotal.toLocaleString('vi-VN')}</td>
                <td className="text-right" style={{ color: '#94a3b8', fontWeight: 600 }}>0</td>
                <td className="text-right" style={{ color: '#b45309', fontWeight: 600 }}>{l.lineOutOfPocket.toLocaleString('vi-VN')}</td>
              </tr>
            ))
          )}

          {/* DÒNG TỔNG CỘNG */}
          <tr className="paper-total-row">
            <td colSpan={5} className="text-right" style={{ fontWeight: 700 }}>TỔNG CỘNG PHÁT SINH:</td>
            <td className="text-right" style={{ fontWeight: 700 }}>{currency(gross)}</td>
            <td className="text-right" style={{ color: '#065f46', fontWeight: 700 }}>{currency(insuranceCovered)}</td>
            <td className="text-right" style={{ color: '#1e40af', fontWeight: 700 }}>{currency(totalPatientDue)}</td>
          </tr>
        </tbody>
      </table>

      {/* Cân đối tạm ứng & Viện phí theo chuẩn QĐ 130/QĐ-BYT */}
      <div className="paper-row" style={{ marginTop: 10 }}>
        <span className="paper-label">1. Tổng chi phí đợt KCB:</span>
        <span className="paper-value"><b>{currency(gross)}</b></span>
        <span className="paper-label" style={{ marginLeft: 20 }}>2. Quỹ BHYT thanh toán:</span>
        <span className="paper-value" style={{ color: '#065f46' }}><b>{currency(insuranceCovered)}</b></span>
      </div>

      <div className="paper-row">
        <span className="paper-label">3. Người bệnh cùng chi trả BHYT:</span>
        <span className="paper-value" style={{ color: '#1e40af' }}><b>{currency(copay)}</b></span>
        <span className="paper-label" style={{ marginLeft: 20 }}>4. Chi phí ngoài danh mục BHYT (BN tự trả):</span>
        <span className="paper-value" style={{ color: '#b45309' }}><b>{currency(outOfPocket)}</b></span>
      </div>

      <div className="paper-row">
        <span className="paper-label">5. Tổng số tiền người bệnh phải nộp (3 + 4):</span>
        <span className="paper-value" style={{ color: '#1e40af', fontWeight: 700 }}><b>{currency(totalPatientDue)}</b></span>
        <span className="paper-label" style={{ marginLeft: 20 }}>6. Đã tạm ứng trước:</span>
        <span className="paper-value"><b>{currency(advance)}</b></span>
      </div>

      <div className="paper-row">
        <span className="paper-label" style={{ fontSize: 13.5 }}>
          {balance > 0 ? '7. Số tiền người bệnh PHẢI NỘP THÊM:' : balance < 0 ? '7. Số tiền bệnh viện HOÀN TRẢ NGƯỜI BỆNH:' : '7. Số tiền chênh lệch (Cân bằng):'}
        </span>
        <span className="paper-value" style={{ fontSize: 13.5, fontWeight: 700, color: balance > 0 ? '#b91c1c' : balance < 0 ? '#047857' : '#0284c7' }}>
          {currency(Math.abs(balance))}
        </span>
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start', marginTop: 6 }}>
        <span className="paper-label" style={{ marginTop: 4 }}>Ghi chú / Xác nhận:</span>
        <textarea
          className="paper-textarea"
          rows={1}
          value={row.note || 'Người bệnh đã kiểm tra bảng kê và đối chiếu đầy đủ các dịch vụ thực tế đã sử dụng.'}
          onChange={e => onChange('note', e.target.value)}
        />
      </div>

      <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: 14, fontSize: 12 }}>
        TP. Hồ Chí Minh, {todayStr}
      </div>

      <div className="paper-sign-block">
        <div className="paper-sign-col">
          <span className="sign-title">NGƯỜI BỆNH / ĐẠI DIỆN</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên)</span>
          <span className="sign-name">{patient?.name || row.patientName || 'Nguyễn Văn Minh'}</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">NGƯỜI LẬP BẢNG KÊ</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên)</span>
          <span className="sign-name">{cashierStaff?.name || row.cashier || 'Thu ngân MediCare'}</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">KẾ TOÁN VIỆN PHÍ</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên)</span>
          <span className="sign-name">CN. Phạm Thu Thủy</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">BÁC SĨ ĐIỀU TRỊ</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên)</span>
          <span className="sign-name">BS.CKI Trần Minh Anh</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 5. MẪU ĐƠN THUỐC NGOẠI TRÚ
 * Ban hành theo Thông tư số 04/2022/TT-BYT sửa đổi TT 52/2017/TT-BYT của Bộ Y tế
 */
export function PrescriptionPaperForm({ row, patient, doctorStaff, compact = false, onChange = () => {} }) {
  const bh = parseBhytCard(patient?.insurance || row.insurance);
  const now = new Date();
  const todayStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  const age = (patient?.birth || row.birth) ? (now.getFullYear() - Number(String(patient?.birth || row.birth).slice(0, 4))) : '—';

  const lines = row.lines || [
    { medicine: 'TH_NEXIUM40', name: 'Nexium 40mg (Esomeprazole)', quantity: 14, unit: 'Viên', dose: 'Uống 1 viên trước ăn sáng', days: 14 },
    { medicine: 'TH_PARA500', name: 'Panadol Extra 500mg/65mg (Paracetamol)', quantity: 10, unit: 'Viên', dose: 'Uống 1 viên khi đau đầu', days: 5 }
  ];

  return (
    <div className={`paper-sheet ${compact ? 'paper-sheet-compact' : ''}`}>
      <div className="paper-header">
        <div className="paper-header-left">
          <span>SỞ Y TẾ TP. HỒ CHÍ MINH</span>
          <strong>BỆNH VIỆN ĐA KHOA MEDICARE</strong>
          <span>Khoa Khám Bệnh - Phòng khám Đa khoa</span>
          <div className="paper-doc-id">Mã đơn thuốc (eRx): <b>{row.id}</b></div>
        </div>
        <div className="paper-header-right">
          <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
          <span>Độc lập - Tự do - Hạnh phúc</span>
          <div className="paper-motto-line" />
          <div className="paper-doc-id">Mẫu đơn thuốc (TT 04/2022/TT-BYT)</div>
        </div>
      </div>

      <div className="paper-title">
        <h1>ĐƠN THUỐC (NGOẠI TRÚ)</h1>
      </div>

      {/* Thông tin người bệnh */}
      <div className="paper-grid-admin-3col">
        <div className="paper-field-cell">
          <span className="paper-label">- Họ tên người bệnh:</span>
          <span className="paper-value"><b>{patient?.name || row.patientName || 'NGUYỄN VĂN MINH'}</b></span>
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">Giới tính:</span>
          <span className="paper-value" style={{ textAlign: 'center' }}>{patient?.gender || row.gender || 'Nam'}</span>
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">Tuổi:</span>
          <span className="paper-value" style={{ textAlign: 'center' }}>{age}</span>
        </div>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Địa chỉ nơi ở:</span>
        <span className="paper-value">{patient?.address || row.address || '45 Lê Lợi, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh'}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Mã số thẻ BHYT:</span>
        <span className="paper-value">
          <code style={{ fontSize: 13, fontWeight: 700 }}>{bh.code || 'CHƯA CÓ THẺ'}</code>
          {bh.hasInsurance && <span style={{ marginLeft: 10 }}>(Hưởng {bh.rate}%)</span>}
        </span>
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>- Chẩn đoán:</span>
        <input
          className="paper-input"
          style={{ fontWeight: 700 }}
          value={row.diagnosis || 'E11.9 - Đái tháo đường type 2 không có biến chứng'}
          onChange={e => onChange('diagnosis', e.target.value)}
          placeholder="Chẩn đoán xác định..."
        />
      </div>

      {/* Danh mục thuốc chỉ định */}
      <div className="paper-section-title" style={{ marginTop: 14 }}>THUỐC ĐIỀU TRỊ:</div>
      <ol style={{ paddingLeft: 20, margin: '8px 0 16px 0', fontSize: 13 }}>
        {lines.map((l, i) => (
          <li key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span><b>{l.name || l.medicine}</b></span>
              <span style={{ fontWeight: 700 }}>Số lượng: {l.quantity} {l.unit || 'Viên'}</span>
            </div>
            <div style={{ fontStyle: 'italic', color: '#334155', marginTop: 2 }}>
              Cách dùng: {l.dose || l.usage || 'Uống theo chỉ định của Bác sĩ'} {l.days ? `— Đợt dùng: ${l.days} ngày` : ''}
            </div>
          </li>
        ))}
      </ol>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>- Lời dặn của bác sĩ:</span>
        <textarea
          className="paper-textarea-leader"
          rows={2}
          value={row.advice || row.loiDan || 'Uống trước bữa ăn sáng 30 phút, kiêng đồ ngọt tinh bột, uống đủ nước.'}
          onChange={e => onChange('advice', e.target.value)}
        />
      </div>

      <div className="paper-row">
        <span className="paper-label">- Hẹn tái khám sau:</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            className="paper-input paper-input-inline"
            style={{ width: 60, fontWeight: 700, textAlign: 'center' }}
            type="number"
            value={row.followUp || 14}
            onChange={e => onChange('followUp', e.target.value)}
          />
          <span>ngày hoặc khám lại ngay khi có dấu hiệu bất thường.</span>
        </div>
      </div>

      {/* Chữ ký */}
      <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: 18, fontSize: 12.5 }}>
        TP. Hồ Chí Minh, {todayStr}
      </div>

      <div className="paper-sign-block">
        <div className="paper-sign-col">
          <span className="sign-title">NGƯỜI BỆNH / THÂN NHÂN</span>
          <span className="sign-hint">(Ký và ghi rõ họ tên)</span>
          <span className="sign-name">{patient?.name || row.patientName || 'Nguyễn Văn Minh'}</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">BÁC SĨ KÊ ĐƠN</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên và CCHN)</span>
          <input
            className="paper-input"
            style={{ textAlign: 'center', fontWeight: 700, marginTop: 40 }}
            value={row.doctor || doctorStaff?.name || 'BS.CKI Trần Minh Anh'}
            onChange={e => onChange('doctor', e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginTop: 18, fontSize: 11, fontStyle: 'italic', color: '#64748b', textAlign: 'center' }}>
        * Khám lại mang theo đơn này. Đơn thuốc có giá trị mua/nhận trong vòng 05 ngày kể từ ngày kê đơn.
      </div>
    </div>
  );
}

/**
 * 6. MẪU BẢN TÓM TẮT HỒ SƠ BỆNH ÁN
 * Ban hành kèm theo Thông tư số 18/2022/TT-BYT của Bộ Y tế
 */
export function MedicalRecordSummaryPaperForm({ row, patient, doctorStaff, compact = false, onChange = () => {} }) {
  const bh = parseBhytCard(patient?.insurance || row.insurance);
  const now = new Date();
  const todayStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  const age = (patient?.birth || row.birth) ? (now.getFullYear() - Number(String(patient?.birth || row.birth).slice(0, 4))) : '—';

  return (
    <div className={`paper-sheet ${compact ? 'paper-sheet-compact' : ''}`}>
      <div className="paper-header">
        <div className="paper-header-left">
          <span>SỞ Y TẾ TP. HỒ CHÍ MINH</span>
          <strong>BỆNH VIỆN ĐA KHOA MEDICARE</strong>
          <span>Mã CSKCB: <b>79-012</b></span>
          <div className="paper-doc-id">Mã hồ sơ lưu trữ: <b>{row.id || 'HSBA-2026-001'}</b></div>
        </div>
        <div className="paper-header-right">
          <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
          <span>Độc lập - Tự do - Hạnh phúc</span>
          <div className="paper-motto-line" />
          <div className="paper-doc-id">Phụ lục 4 (Thông tư số 18/2022/TT-BYT)</div>
        </div>
      </div>

      <div className="paper-title">
        <h1>BẢN TÓM TẮT HỒ SƠ BỆNH ÁN</h1>
      </div>

      <div className="paper-grid-admin-3col">
        <div className="paper-field-cell">
          <span className="paper-label">- Họ và tên người bệnh:</span>
          <input
            className="paper-input"
            style={{ fontWeight: 700 }}
            value={row.patientName || patient?.name || 'NGUYỄN VĂN MINH'}
            onChange={e => onChange('patientName', e.target.value)}
          />
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">Nam/Nữ:</span>
          <input
            className="paper-input"
            style={{ textAlign: 'center' }}
            value={row.gender || patient?.gender || 'Nam'}
            onChange={e => onChange('gender', e.target.value)}
          />
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">Tuổi:</span>
          <span className="paper-value" style={{ textAlign: 'center' }}>{age}</span>
        </div>
      </div>

      <div className="paper-grid-admin-2col">
        <div className="paper-field-cell">
          <span className="paper-label">- Số định danh cá nhân / CCCD:</span>
          <input
            className="paper-input"
            value={row.cccd || patient?.cccd || '079090123456'}
            onChange={e => onChange('cccd', e.target.value)}
          />
        </div>
        <div className="paper-field-cell">
          <span className="paper-label">Mã số thẻ BHYT:</span>
          <input
            className="paper-input"
            style={{ fontWeight: 700 }}
            value={bh.code || row.insurance || 'GD4790987654321'}
            onChange={e => onChange('insurance', e.target.value)}
          />
        </div>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Địa chỉ cư trú:</span>
        <input
          className="paper-input"
          value={row.address || patient?.address || 'Quận 1, TP. Hồ Chí Minh'}
          onChange={e => onChange('address', e.target.value)}
        />
      </div>

      <div className="paper-section-title" style={{ marginTop: 12 }}>TÓM TẮT QUÁ TRÌNH KHÁM BỆNH VÀ ĐIỀU TRỊ:</div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>1. Quá trình bệnh lý và diễn biến:</span>
        <textarea
          className="paper-textarea-leader"
          rows={3}
          value={row.pathology || row.quaTrinhBenhLy || 'Bệnh nhân xuất hiện triệu chứng đau tức thượng vị, ợ hơi, ợ chua kéo dài 2 tuần. Đã được khám và làm các xét nghiệm cận lâm sàng.'}
          onChange={e => onChange('pathology', e.target.value)}
        />
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>2. Tóm tắt kết quả xét nghiệm CLS:</span>
        <textarea
          className="paper-textarea-leader"
          rows={3}
          value={row.labSummary || row.tomTatCLS || 'Nội soi thực quản - dạ dày: Niêm mạc hang vị phù nề, xung huyết rải rác. Test HP âm tính. Sinh hóa máu các chỉ số trong giới hạn bình thường.'}
          onChange={e => onChange('labSummary', e.target.value)}
        />
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>3. Chẩn đoán:</span>
        <input
          className="paper-input"
          style={{ fontWeight: 700 }}
          value={row.diagnosis || 'K29.0 - Viêm dạ dày cấp tính'}
          onChange={e => onChange('diagnosis', e.target.value)}
        />
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>4. Phương pháp điều trị:</span>
        <textarea
          className="paper-textarea-leader"
          rows={2}
          value={row.treatment || row.phuongPhapDieuTri || 'Điều trị nội khoa ngoại trú: Giảm tiết acid dạ dày (Esomeprazole 40mg), bảo vệ niêm mạc dạ dày.'}
          onChange={e => onChange('treatment', e.target.value)}
        />
      </div>

      <div className="paper-row">
        <span className="paper-label">5. Tình trạng người bệnh khi ra viện/kết thúc:</span>
        <input
          className="paper-input"
          value={row.outcome || row.tinhTrangRaVien || 'Bệnh nhân giảm đau thượng vị nhiều, không còn ợ chua, sinh hiệu ổn định, xuất viện điều trị ngoại trú.'}
          onChange={e => onChange('outcome', e.target.value)}
        />
      </div>

      <div className="paper-row" style={{ alignItems: 'flex-start' }}>
        <span className="paper-label" style={{ marginTop: 4 }}>6. Hướng điều trị tiếp theo và lời dặn:</span>
        <textarea
          className="paper-textarea-leader"
          rows={2}
          value={row.advice || row.ghiChuLoiDan || 'Ăn đúng giờ, tránh thức ăn cay nóng chua, không uống rượu bia thuốc lá. Tái khám sau 14 ngày.'}
          onChange={e => onChange('advice', e.target.value)}
        />
      </div>

      <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: 18, fontSize: 12.5 }}>
        TP. Hồ Chí Minh, {todayStr}
      </div>

      <div className="paper-sign-block">
        <div className="paper-sign-col">
          <span className="sign-title">BÁC SĨ ĐIỀU TRỊ</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên)</span>
          <input
            className="paper-input"
            style={{ textAlign: 'center', fontWeight: 700, marginTop: 40 }}
            value={row.doctor || doctorStaff?.name || 'BS.CKI Trần Minh Anh'}
            onChange={e => onChange('doctor', e.target.value)}
          />
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">GIÁM ĐỐC BỆNH VIỆN</span>
          <span className="sign-hint">(Ký, đóng dấu cơ sở KCB)</span>
          <span className="sign-name">
            PGS.TS.BS Đặng Quốc Tuấn
            <span className="paper-badge-stamp">BỆNH VIỆN MEDICARE</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 7. VIEWER TỔNG HỢP VỚI TOOLBAR LƯU DỮ LIỆU CSDL, CHỐNG TRÀN TRANG & IN ẤN
 */
export default function MedicalPaperFormViewer({
  tab,
  row,
  patient,
  doctorStaff,
  cashierStaff,
  onSave,
  onOpenBusinessForm,
  onClose
}) {
  const [formData, setFormData] = useState(() => ({
    ...row,
    patientName: patient?.name || row?.patientName || '',
    gender: patient?.gender || row?.gender || 'Nam',
    birth: patient?.birth || row?.birth || '',
    phone: patient?.phone || row?.phone || '',
    cccd: patient?.cccd || row?.cccd || '',
    insurance: patient?.insurance || row?.insurance || '',
    address: patient?.address || row?.address || '',
    doctor: row?.doctor || doctorStaff?.name || 'BS.CKI Trần Minh Anh'
  }));

  // Detect long text to automatically prevent second-page overflow
  const narrativeLength = useMemo(() => {
    return (formData.symptoms || '').length +
      (formData.labSummary || '').length +
      (formData.treatment || '').length +
      (formData.condition || '').length +
      (formData.reason || '').length +
      (formData.plan || '').length +
      (formData.advice || '').length +
      (formData.summary || '').length +
      (formData.pathology || '').length;
  }, [formData]);

  const [compactMode, setCompactMode] = useState(() => narrativeLength > 480);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Hydrate persistent data from SQL Server if available
  useEffect(() => {
    if (!row?.id) return;
    fetch(`/api/paper-forms?type=${encodeURIComponent(tab)}&id=${encodeURIComponent(row.id)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          setFormData(prev => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});
  }, [tab, row?.id]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/paper-forms/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab, data: formData })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi lưu biểu mẫu vào SQL Server');
      }
      setSaveSuccess(true);
      onSave?.(formData);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      setSaveError(err.message || 'Lỗi kết nối CSDL');
    } finally {
      setSaving(false);
    }
  }

  function printDocument() {
    window.print();
  }

  let FormComponent = null;
  let formTitle = 'Biểu mẫu y tế';

  if (tab === 'referrals') {
    FormComponent = ReferralPaperForm;
    formTitle = 'Giấy chuyển tuyến BHYT (Mẫu 06 - NĐ 75/2023/NĐ-CP)';
  } else if (tab === 'consultations') {
    FormComponent = ConsultationPaperForm;
    formTitle = 'Biên bản hội chẩn chuyên môn (Quy chế Bộ Y tế)';
  } else if (tab === 'discharges') {
    FormComponent = DischargePaperForm;
    formTitle = 'Giấy ra viện (Phụ lục 3 - TT 18/2022/TT-BYT)';
  } else if (tab === 'settlements') {
    FormComponent = MedicalBillPaperForm;
    formTitle = 'Bảng kê chi phí KCB BHYT (Mẫu 01/BV - QĐ 130/QĐ-BYT)';
  } else if (tab === 'prescriptions') {
    FormComponent = PrescriptionPaperForm;
    formTitle = 'Đơn thuốc ngoại trú (Mẫu đơn thuốc - TT 04/2022/TT-BYT)';
  } else if (['archives', 'authorizations', 'summaries'].includes(tab)) {
    FormComponent = MedicalRecordSummaryPaperForm;
    formTitle = 'Bản tóm tắt hồ sơ bệnh án (Phụ lục 4 - TT 18/2022/TT-BYT)';
  } else {
    FormComponent = ReferralPaperForm;
    formTitle = 'Văn bản y tế';
  }

  return (
    <div className="medical-paper-viewer" style={{ padding: '4px' }}>
      {/* Thanh công cụ xem trước, điền và lưu dữ liệu */}
      <div className="paper-toolbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={22} style={{ color: '#0f766e', flexShrink: 0 }} />
          <div>
            <b style={{ color: '#0f172a', fontSize: 14 }}>{formTitle}</b>
            <div style={{ fontSize: 11.5, color: '#64748b' }}>
              Biểu mẫu y tế chuẩn Bộ Y tế · Liên thông CSDL SQL Server · Chống tràn trang A4
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Nút bật/tắt chế độ A4 Chuẩn vs A4 Thu gọn chống tràn trang */}
          <div className="paper-mode-toggle" title="Chế độ định dạng trang in A4">
            <button
              type="button"
              className={!compactMode ? 'active' : ''}
              onClick={() => setCompactMode(false)}
            >
              A4 Chuẩn
            </button>
            <button
              type="button"
              className={compactMode ? 'active' : ''}
              onClick={() => setCompactMode(true)}
            >
              A4 Thu gọn (Chống tràn)
            </button>
          </div>

          {onOpenBusinessForm && (
            <button
              className="secondary"
              onClick={onOpenBusinessForm}
              title="Mở form nhập liệu có cấu trúc nghiệp vụ ở ngoài"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0284c7', borderColor: '#7dd3fc', fontWeight: 600 }}
            >
              <Edit3 size={15} /> Sửa qua Form nghiệp vụ
            </button>
          )}

          <button
            className="paper-save-btn"
            onClick={handleSave}
            disabled={saving}
            title="Lưu các thông tin đã điền vào bảng CSDL SQL Server"
          >
            <Save size={15} /> {saving ? 'Đang lưu vào SQL...' : 'Lưu vào CSDL'}
          </button>
          <button
            className="primary"
            onClick={printDocument}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={15} /> In ra giấy A4 / Xuất PDF
          </button>
          {onClose && (
            <button
              className="secondary"
              onClick={onClose}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <X size={15} /> Đóng
            </button>
          )}
        </div>
      </div>

      {/* Thông báo chế độ hiển thị & chống tràn */}
      <div className="no-print" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div className="paper-edit-hint">
          <Edit3 size={15} />
          <span>
            <b>Đã ánh xạ 1:1 từ CSDL:</b> Bạn có thể click trực tiếp vào các dòng trên giấy để chỉnh sửa nhanh, hoặc bấm <b>"Sửa qua Form nghiệp vụ"</b> để dùng form có cấu trúc ở ngoài.
          </span>
        </div>
        {narrativeLength > 450 && (
          <div style={{ fontSize: 11.5, color: '#b45309', background: '#fef3c7', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Nội dung chi tiết ({narrativeLength} ký tự): Đã bật chế độ A4 Thu gọn để đảm bảo vừa khít 1 trang A4.</span>
          </div>
        )}
      </div>

      {/* Thông báo kết quả lưu */}
      {saveSuccess && (
        <div className="no-print" style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '8px 14px', borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <CheckCircle2 size={16} /> <b>Thành công:</b> Đã lưu dữ liệu biểu mẫu vào bảng CSDL SQL Server!
        </div>
      )}
      {saveError && (
        <div className="no-print" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '8px 14px', borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <AlertCircle size={16} /> <b>Lỗi:</b> {saveError}
        </div>
      )}

      {/* Trang giấy hiển thị nội dung mẫu chuẩn */}
      <FormComponent
        row={formData}
        patient={patient}
        doctorStaff={doctorStaff}
        cashierStaff={cashierStaff}
        compact={compactMode}
        onChange={handleChange}
      />
    </div>
  );
}
