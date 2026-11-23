import React from 'react';
import { Printer, X, Download, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { parseBhytCard } from './bhyt-utils';
import './medical-paper-forms.css';

const currency = n => n == null || n === '' || !Number.isFinite(Number(n)) ? 'Chưa ghi nhận' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));

/**
 * 1. MẪU GIẤY CHUYỂN CƠ SỞ KCB BẢO HIỂM Y TẾ (MẪU SỐ 06)
 * Ban hành kèm theo Nghị định số 75/2023/NĐ-CP & Thông tư 01/2025/TT-BYT của Bộ Y tế
 */
export function ReferralPaperForm({ row, patient, doctorStaff }) {
  const bh = parseBhytCard(patient?.insurance);
  const now = new Date();
  const todayStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  const age = patient?.birth ? (now.getFullYear() - Number(String(patient.birth).slice(0, 4))) : '—';

  return (
    <div className="paper-sheet">
      {/* Quốc hiệu & Cơ sở y tế */}
      <div className="paper-header">
        <div className="paper-header-left">
          <span>SỞ Y TẾ TP. HỒ CHÍ MINH</span>
          <strong>BỆNH VIỆN ĐA KHOA MEDICARE</strong>
          <span>Mã CSKCB: <b>79-012</b></span>
          <div className="paper-doc-id">Số: <b>{row.id}</b>/GCT-MC</div>
        </div>
        <div className="paper-header-right">
          <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
          <span>Độc lập - Tự do - Hạnh phúc</span>
          <div className="paper-motto-line" />
          <div className="paper-doc-id">Mẫu số 06 (NĐ 75/2023/NĐ-CP)</div>
        </div>
      </div>

      {/* Tiêu đề văn bản */}
      <div className="paper-title">
        <h1>GIẤY CHUYỂN CƠ SỞ KHÁM BỆNH, CHỮA BỆNH BẢO HIỂM Y TẾ</h1>
        <p className="paper-sub-law">
          (Căn cứ Luật Bảo hiểm y tế và Thông tư số 01/2025/TT-BYT của Bộ Y tế)
        </p>
      </div>

      <div className="paper-recipient">
        <b>Kính gửi:</b> <u>{row.destination || 'Chưa ghi nhận'}</u>
      </div>

      {/* Phần I: Thông tin người bệnh */}
      <div className="paper-section-title">I. THÔNG TIN HÀNH CHÍNH NGƯỜI BỆNH:</div>
      <div className="paper-row">
        <span className="paper-label">- Họ và tên người bệnh:</span>
        <span className="paper-value"><b>{patient?.name || row.patientName || 'Chưa ghi nhận'}</b></span>
        <span className="paper-label" style={{ marginLeft: 20 }}>Nam/Nữ:</span>
        <span className="paper-value" style={{ maxWidth: 80 }}>{patient?.gender || 'Chưa ghi nhận'}</span>
        <span className="paper-label" style={{ marginLeft: 20 }}>Tuổi:</span>
        <span className="paper-value" style={{ maxWidth: 60 }}>{age}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Địa chỉ nơi cư trú:</span>
        <span className="paper-value">{patient?.address || 'Chưa ghi nhận'}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Số CCCD / Định danh cá nhân:</span>
        <span className="paper-value" style={{ maxWidth: 200 }}>{patient?.cccd || 'Chưa ghi nhận'}</span>
        <span className="paper-label" style={{ marginLeft: 16 }}>Số điện thoại:</span>
        <span className="paper-value">{patient?.phone || 'Chưa ghi nhận'}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Mã số thẻ BHYT:</span>
        <span className="paper-value">
          <code style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>{bh.code || 'CHƯA CÓ THẺ BHYT'}</code>
          {bh.hasInsurance && (
            <span style={{ marginLeft: 12 }}>
              (Mức hưởng: <b>{bh.rate}%</b> chi phí danh mục KCB BHYT)
            </span>
          )}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Khám bệnh / Vào điều trị từ:</span>
        <span className="paper-value">{row.admittedAt || row.admissionDate || 'Chưa ghi nhận'} → {row.dischargedAt || row.dischargeDate || 'Chưa ghi nhận'}</span>
      </div>

      {/* Phần II: Tóm tắt bệnh án */}
      <div className="paper-section-title" style={{ marginTop: 14 }}>II. TÓM TẮT BỆNH ÁN VÀ QUÁ TRÌNH ĐIỀU TRỊ:</div>
      <div className="paper-row">
        <span className="paper-label">1. Dấu hiệu lâm sàng:</span>
        <span className="paper-value">{row.symptoms || row.note || 'Chưa ghi nhận'}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">2. Kết quả cận lâm sàng chính:</span>
        <span className="paper-value">
          {row.labSummary || 'Chưa ghi nhận'}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">3. Chẩn đoán chuyển tuyến:</span>
        <span className="paper-value">
          <b>{row.diagnosis || 'Chưa ghi nhận'}</b>
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">4. Phương pháp / thuốc đã dùng:</span>
        <span className="paper-value">
          {row.treatment || 'Chưa ghi nhận'}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">5. Tình trạng lúc chuyển tuyến:</span>
        <span className="paper-value">
          {row.condition || 'Chưa ghi nhận'}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">6. Lý do chuyển tuyến:</span>
        <span className="paper-value">
          {row.reason || 'Chưa ghi nhận'}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">7. Phương tiện vận chuyển:</span>
        <span className="paper-value">{row.transport || 'Chưa ghi nhận'}</span>
      </div>

      {/* Phần ký duyệt */}
      <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: 18, fontSize: 12.5 }}>
        TP. Hồ Chí Minh, {todayStr}
      </div>

      <div className="paper-sign-block">
        <div className="paper-sign-col">
          <span className="sign-title">BÁC SĨ CHỈ ĐỊNH</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên và CCHN)</span>
          <span className="sign-name">{doctorStaff?.name || row.doctor || 'Chưa ghi nhận'}</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">TRƯỞNG PHÒNG KHTH</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên)</span>
          <span className="sign-name">Chưa ghi nhận</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">GIÁM ĐỐC BỆNH VIỆN</span>
          <span className="sign-hint">(Ký, đóng dấu cơ sở KCB)</span>
          <span className="sign-name">
            Chưa ghi nhận
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
export function ConsultationPaperForm({ row, patient, doctorStaff }) {
  const now = new Date();
  const todayStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;

  return (
    <div className="paper-sheet">
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
      <div className="paper-row">
        <span className="paper-label">- Thời gian hội chẩn:</span>
        <span className="paper-value">Hồi 09 giờ 30 phút, {todayStr}</span>
      </div>
      <div className="paper-row">
        <span className="paper-label">- Địa điểm:</span>
        <span className="paper-value">Phòng giao ban chuyên môn Bệnh viện Đa khoa MediCare</span>
      </div>

      {/* Thành phần tham gia */}
      <div className="paper-section-title">I. THÀNH PHẦN HỘI CHẨN:</div>
      <div className="paper-row">
        <span className="paper-label">1. Chủ tọa:</span>
        <span className="paper-value"><b>{row.chairperson || doctorStaff?.name || row.doctor || 'Chưa ghi nhận'}</b> (Phó Giám đốc chuyên môn / Trưởng khoa)</span>
      </div>
      <div className="paper-row">
        <span className="paper-label">2. Thư ký:</span>
        <span className="paper-value"><b>{row.secretary || 'Chưa ghi nhận'}</b> (Bác sĩ điều trị)</span>
      </div>
      <div className="paper-row">
        <span className="paper-label">3. Thành viên tham gia:</span>
        <span className="paper-value">{row.participants || 'Chưa ghi nhận'}</span>
      </div>

      {/* Thông tin bệnh nhân */}
      <div className="paper-section-title" style={{ marginTop: 14 }}>II. THÔNG TIN NGƯỜI BỆNH:</div>
      <div className="paper-row">
        <span className="paper-label">- Họ và tên:</span>
        <span className="paper-value"><b>{patient?.name || row.patientName || 'Chưa ghi nhận'}</b></span>
        <span className="paper-label" style={{ marginLeft: 16 }}>Mã BN:</span>
        <span className="paper-value" style={{ maxWidth: 120 }}>{patient?.id || row.patient}</span>
        <span className="paper-label" style={{ marginLeft: 16 }}>Mã lượt/đợt:</span>
        <span className="paper-value" style={{ maxWidth: 140 }}>{row.episodeId || 'Chưa ghi nhận'}</span>
      </div>

      {/* Diễn biến & Thảo luận */}
      <div className="paper-section-title" style={{ marginTop: 14 }}>III. NỘI DUNG HỘI CHẨN:</div>
      <div className="paper-row">
        <span className="paper-label">1. Tóm tắt bệnh cảnh & CLS:</span>
        <span className="paper-value">
          {row.progress || 'Chưa ghi nhận'}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">2. Ý kiến thảo luận:</span>
        <span className="paper-value">
          {row.discussion || 'Chưa ghi nhận'}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">3. Chẩn đoán xác định:</span>
        <span className="paper-value">
          <b>{row.diagnosis || row.conclusion || 'Chưa ghi nhận'}</b>
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">4. Phác đồ thống nhất:</span>
        <span className="paper-value">
          {row.plan || 'Chưa ghi nhận'}
        </span>
      </div>

      {/* Chữ ký */}
      <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: 20, fontSize: 12.5 }}>
        Biên bản thông qua lúc 10h15 cùng ngày.
      </div>

      <div className="paper-sign-block">
        <div className="paper-sign-col">
          <span className="sign-title">THƯ KÝ BIÊN BẢN</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên)</span>
          <span className="sign-name">{row.secretary || 'Chưa ghi nhận'}</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">BÁC SĨ ĐIỀU TRỊ CHÍNH</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên)</span>
          <span className="sign-name">{doctorStaff?.name || row.doctor || 'Chưa ghi nhận'}</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">CHỦ TỌA HỘI CHẨN</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên)</span>
          <span className="sign-name">{row.chairperson || 'Chưa ghi nhận'}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 3. MẪU GIẤY RA VIỆN (PHỤ LỤC 3)
 * Ban hành kèm theo Thông tư số 18/2022/TT-BYT sửa đổi bổ sung TT 56/2017/TT-BYT của Bộ Y tế
 */
export function DischargePaperForm({ row, patient, doctorStaff }) {
  const bh = parseBhytCard(patient?.insurance);
  const now = new Date();
  const todayStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  const age = patient?.birth ? (now.getFullYear() - Number(String(patient.birth).slice(0, 4))) : '—';

  return (
    <div className="paper-sheet">
      <div className="paper-header">
        <div className="paper-header-left">
          <span>SỞ Y TẾ TP. HỒ CHÍ MINH</span>
          <strong>BỆNH VIỆN ĐA KHOA MEDICARE</strong>
          <span>Khoa: <b>Nội tổng quát & Tim mạch</b></span>
          <div className="paper-doc-id">MS: <b>01/BV-01</b> · Số lưu: <b>{row.id}</b></div>
        </div>
        <div className="paper-header-right">
          <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
          <span>Độc lập - Tự do - Hạnh phúc</span>
          <div className="paper-motto-line" />
          <div className="paper-doc-id">Phụ lục 3 (Thông tư 18/2022/TT-BYT)</div>
        </div>
      </div>

      <div className="paper-title">
        <h1>GIẤY RA VIỆN</h1>
      </div>

      <div className="paper-row">
        <span className="paper-label">1. Họ và tên người bệnh:</span>
        <span className="paper-value"><b>{patient?.name || row.patientName || 'Chưa ghi nhận'}</b></span>
        <span className="paper-label" style={{ marginLeft: 20 }}>2. Giới tính:</span>
        <span className="paper-value" style={{ maxWidth: 80 }}>{patient?.gender || 'Chưa ghi nhận'}</span>
        <span className="paper-label" style={{ marginLeft: 20 }}>3. Tuổi:</span>
        <span className="paper-value" style={{ maxWidth: 60 }}>{age}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">4. Mã số BHXH / Số thẻ BHYT:</span>
        <span className="paper-value">
          <code style={{ fontSize: 13.5, fontWeight: 700 }}>{bh.code || 'CHƯA CÓ THẺ BHYT'}</code>
          {bh.hasInsurance && <span style={{ marginLeft: 10 }}>({bh.groupName} - Mức hưởng {bh.rate}%)</span>}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">5. Địa chỉ cư trú:</span>
        <span className="paper-value">{patient?.address || 'Chưa ghi nhận'}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">6. Vào viện lúc:</span>
        <span className="paper-value">{row.admittedAt || row.admissionDate || 'Chưa ghi nhận'}</span>
        <span className="paper-label" style={{ marginLeft: 16 }}>7. Ra viện lúc:</span>
        <span className="paper-value">10 giờ 30 phút, {todayStr}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">8. Chẩn đoán khi ra viện:</span>
        <span className="paper-value">
          <b>{row.diagnosis || 'Chưa ghi nhận'}</b>
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">9. Phương pháp điều trị:</span>
        <span className="paper-value">
          {row.summary || row.treatment || 'Chưa ghi nhận'}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">10. Kết quả điều trị:</span>
        <span className="paper-value"><b>{row.outcome || 'Chưa ghi nhận'}</b></span>
      </div>

      <div className="paper-row">
        <span className="paper-label">11. Ghi chú / Lời dặn của bác sĩ:</span>
        <span className="paper-value">
          {row.advice || 'Chưa ghi nhận'}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">12. Số ngày nghỉ việc hưởng BHXH (nếu có):</span>
        <span className="paper-value">{row.sickLeaveDays ? `${row.sickLeaveDays} ngày (Từ ngày xuất viện)` : '07 ngày (Theo quy định chế độ ốm đau BHXH)'}</span>
      </div>

      <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: 22, fontSize: 12.5 }}>
        TP. Hồ Chí Minh, {todayStr}
      </div>

      <div className="paper-sign-block">
        <div className="paper-sign-col">
          <span className="sign-title">NGƯỜI HÀNH NGHỀ KHÁM CHỮA BỆNH</span>
          <span className="sign-hint">(Bác sĩ điều trị ký, ghi rõ họ tên)</span>
          <span className="sign-name">{doctorStaff?.name || row.doctor || 'Chưa ghi nhận'}</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">THỦ TRƯỞNG ĐƠN VỊ</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên và đóng dấu)</span>
          <span className="sign-name">
            Chưa ghi nhận
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
export function MedicalBillPaperForm({ row, patient, cashierStaff }) {
  const bh = parseBhytCard(patient?.insurance);
  const now = new Date();
  const todayStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  const gross = row.gross == null ? null : Number(row.gross);
  const insuranceCovered = row.insurance == null ? null : Number(row.insurance);
  const copay = gross == null || insuranceCovered == null ? null : gross - insuranceCovered;
  const advance = row.advance == null ? null : Number(row.advance);
  const balance = copay == null || advance == null ? null : copay - advance;

  const lines = Array.isArray(row.lines) ? row.lines : [];

  return (
    <div className="paper-sheet">
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
          <div className="paper-doc-id">Mẫu số 01/BV (Quyết định 130/QĐ-BYT)</div>
        </div>
      </div>

      <div className="paper-title">
        <h1>BẢNG KÊ CHI PHÍ KHÁM BỆNH, CHỮA BỆNH NGOẠI TRÚ</h1>
        <p className="paper-sub-law">(Áp dụng cho người bệnh có và không có thẻ Bảo hiểm y tế)</p>
      </div>

      {/* Thông tin bệnh nhân */}
      <div className="paper-row">
        <span className="paper-label">Họ và tên người bệnh:</span>
        <span className="paper-value"><b>{patient?.name || row.patientName || 'Chưa ghi nhận'}</b></span>
        <span className="paper-label" style={{ marginLeft: 16 }}>Mã BN:</span>
        <span className="paper-value" style={{ maxWidth: 120 }}>{patient?.id || row.patient}</span>
        <span className="paper-label" style={{ marginLeft: 16 }}>Mã đợt/lượt:</span>
        <span className="paper-value" style={{ maxWidth: 140 }}>{row.episodeId || 'Chưa ghi nhận'}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">Số thẻ BHYT:</span>
        <span className="paper-value">
          <code style={{ fontSize: 13.5, fontWeight: 700 }}>{bh.code || 'KHÁM VIỆN PHÍ (KHÔNG THẺ)'}</code>
          {bh.hasInsurance && (
            <span style={{ marginLeft: 10 }}>
              (Nhóm <b>{bh.groupCode}</b> - Quỹ BHYT thanh toán: <b>{bh.rate}%</b> chi phí danh mục)
            </span>
          )}
        </span>
      </div>

      {/* Bảng kê chi phí */}
      <table className="paper-table">
        <thead>
          <tr>
            <th style={{ width: 35 }}>STT</th>
            <th>Nội dung chi phí / Dịch vụ kỹ thuật</th>
            <th style={{ width: 80 }}>Phân loại</th>
            <th style={{ width: 45 }}>ĐVT</th>
            <th style={{ width: 45 }}>SL</th>
            <th style={{ width: 85 }}>Đơn giá (₫)</th>
            <th style={{ width: 95 }}>Thành tiền (₫)</th>
            <th style={{ width: 70 }}>Tỷ lệ BHYT</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((item, idx) => {
            const quantity = item.quantity ?? item.qty;
            const amount = quantity == null || item.price == null ? null : Number(quantity) * Number(item.price);
            return (
              <tr key={idx}>
                <td className="text-center">{idx + 1}</td>
                <td><b>{item.name || item.description}</b></td>
                <td>{item.category || 'Chưa ghi nhận'}</td>
                <td className="text-center">{item.unit || 'Chưa ghi nhận'}</td>
                <td className="text-center">{quantity ?? 'Chưa ghi nhận'}</td>
                <td className="text-right">{currency(item.price)}</td>
                <td className="text-right"><b>{currency(amount)}</b></td>
                <td className="text-center">{bh.hasInsurance ? `${bh.rate}%` : '0%'}</td>
              </tr>
            );
          })}
          <tr className="paper-total-row">
            <td colSpan={6} style={{ textAlign: 'right' }}>1. TỔNG CHI PHÍ KHÁM CHỮA BỆNH:</td>
            <td className="text-right" style={{ color: '#0f766e', fontSize: 13.5 }}>{currency(gross)}</td>
            <td />
          </tr>
          <tr className="paper-total-row">
            <td colSpan={6} style={{ textAlign: 'right' }}>2. QUỸ BẢO HIỂM Y TẾ THANH TOÁN ({bh.rate}%):</td>
            <td className="text-right" style={{ color: '#15803d' }}>{currency(insuranceCovered)}</td>
            <td />
          </tr>
          <tr className="paper-total-row">
            <td colSpan={6} style={{ textAlign: 'right' }}>3. NGƯỜI BỆNH CÙNG CHI TRẢ:</td>
            <td className="text-right" style={{ color: '#b45309' }}>{currency(copay)}</td>
            <td />
          </tr>
          <tr className="paper-total-row">
            <td colSpan={6} style={{ textAlign: 'right' }}>4. TIỀN TẠM ỨNG ĐÃ THU:</td>
            <td className="text-right">{currency(advance)}</td>
            <td />
          </tr>
          <tr className="paper-total-row" style={{ fontSize: 14 }}>
            <td colSpan={6} style={{ textAlign: 'right' }}>
              {balance <= 0 ? '5. SỐ TIỀN HOÀN TRẢ NGƯỜI BỆNH:' : '5. SỐ TIỀN PHẢI THU THÊM:'}
            </td>
            <td className="text-right" style={{ color: balance <= 0 ? '#047857' : '#b91c1c' }}>
              {currency(Math.abs(balance))}
            </td>
            <td />
          </tr>
        </tbody>
      </table>

      {/* Chữ ký 3 bên */}
      <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: 12, fontSize: 12.5 }}>
        Biên lai thanh toán điện tử, ngày xuất: {todayStr}
      </div>

      <div className="paper-sign-block">
        <div className="paper-sign-col">
          <span className="sign-title">NGƯỜI BỆNH / THÂN NHÂN</span>
          <span className="sign-hint">(Ký và ghi rõ họ tên)</span>
          <span className="sign-name">{row.signedBy || patient?.name || 'Chưa ghi nhận'}</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">KẾ TOÁN VIỆN PHÍ</span>
          <span className="sign-hint">(Ký và ghi rõ họ tên)</span>
          <span className="sign-name">{cashierStaff?.name || 'Chưa ghi nhận'}</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">ĐẠI DIỆN BỆNH VIỆN</span>
          <span className="sign-hint">(Ký và đóng dấu thu ngân)</span>
          <span className="sign-name">
            Nguyễn Thu Trang
            <span className="paper-badge-stamp">ĐÃ THANH TOÁN</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 5. MẪU ĐƠN THUỐC NGOẠI TRÚ
 * Ban hành kèm theo Thông tư số 04/2022/TT-BYT sửa đổi bổ sung TT 52/2017/TT-BYT của Bộ Y tế
 */
export function PrescriptionPaperForm({ row, patient, doctorStaff }) {
  const bh = parseBhytCard(patient?.insurance);
  const now = new Date();
  const todayStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  const age = patient?.birth ? (now.getFullYear() - Number(String(patient.birth).slice(0, 4))) : '—';

  const lines = Array.isArray(row.lines) ? row.lines : [];

  return (
    <div className="paper-sheet">
      <div className="paper-header">
        <div className="paper-header-left">
          <span>SỞ Y TẾ TP. HỒ CHÍ MINH</span>
          <strong>BỆNH VIỆN ĐA KHOA MEDICARE</strong>
          <span>Khoa Khám bệnh · Phòng khám chuyên khoa</span>
          <div className="paper-doc-id">Mã đơn thuốc điện tử: <b>{row.id || 'Chưa ghi nhận'}</b></div>
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

      <div className="paper-row">
        <span className="paper-label">Họ và tên người bệnh:</span>
        <span className="paper-value"><b>{patient?.name || row.patientName || 'Chưa ghi nhận'}</b></span>
        <span className="paper-label" style={{ marginLeft: 20 }}>Giới tính:</span>
        <span className="paper-value" style={{ maxWidth: 80 }}>{patient?.gender || 'Chưa ghi nhận'}</span>
        <span className="paper-label" style={{ marginLeft: 20 }}>Tuổi:</span>
        <span className="paper-value" style={{ maxWidth: 60 }}>{age}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">Mã số thẻ BHYT:</span>
        <span className="paper-value">
          <code style={{ fontSize: 13.5, fontWeight: 700 }}>{bh.code || 'KHÔNG THẺ (VIỆN PHÍ)'}</code>
          {bh.hasInsurance && <span style={{ marginLeft: 10 }}>({bh.groupName} - Mức hưởng {bh.rate}%)</span>}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">Địa chỉ nơi cư trú:</span>
        <span className="paper-value">{patient?.address || 'Chưa ghi nhận'}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">Chẩn đoán bệnh (Mã ICD-10):</span>
        <span className="paper-value">
          <b>{row.diagnosis || 'Chưa ghi nhận'}</b>
        </span>
      </div>

      {/* Danh mục thuốc */}
      <div className="paper-section-title" style={{ marginTop: 14 }}>CHỈ ĐỊNH DÙNG THUỐC:</div>
      <div style={{ marginTop: 8 }}>
        {lines.map((med, i) => (
          <div key={i} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px dashed #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {i + 1}. {med.medicine || med.name}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                Số lượng: {med.quantity} {med.unit || 'Chưa ghi nhận'}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: '#374151', marginTop: 3, paddingLeft: 16 }}>
              <span>Cách dùng: <i>{med.frequency || med.dose || 'Chưa ghi nhận'} · {med.route || 'Chưa ghi nhận'} · Liệu trình {med.days ?? 'Chưa ghi nhận'} ngày</i></span>
              {med.beforeFood && <span> · ({med.beforeFood})</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Lời dặn */}
      <div className="paper-section-title" style={{ marginTop: 12 }}>LỜI DẶN CỦA BÁC SĨ (CHẾ ĐỘ SINH HOẠT & DINH DƯỠNG):</div>
      <div style={{ fontSize: 13, background: '#f9fafb', padding: '10px 14px', borderRadius: 4, border: '1px solid #e5e7eb', fontStyle: 'italic' }}>
        {row.advice || 'Chưa ghi nhận'}
      </div>

      <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: 20, fontSize: 12.5 }}>
        TP. Hồ Chí Minh, {todayStr}
      </div>

      <div className="paper-sign-block">
        <div className="paper-sign-col">
          <span className="sign-title">BỆNH NHÂN / THÂN NHÂN</span>
          <span className="sign-hint">(Đã nhận đơn và hiểu rõ hướng dẫn dùng)</span>
          <span className="sign-name">{patient?.name || 'Chưa ghi nhận'}</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">BÁC SĨ KÊ ĐƠN</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên và CCHN)</span>
          <span className="sign-name">{doctorStaff?.name || row.doctor || 'Chưa ghi nhận'}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 6. MẪU BẢN TÓM TẮT HỒ SƠ BỆNH ÁN (PHỤ LỤC 4)
 * Ban hành kèm theo Thông tư số 18/2022/TT-BYT của Bộ Y tế
 */
export function MedicalRecordSummaryPaperForm({ row, patient, doctorStaff }) {
  const bh = parseBhytCard(patient?.insurance);
  const now = new Date();
  const todayStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  const age = patient?.birth ? (now.getFullYear() - Number(String(patient.birth).slice(0, 4))) : '—';

  return (
    <div className="paper-sheet">
      <div className="paper-header">
        <div className="paper-header-left">
          <span>SỞ Y TẾ TP. HỒ CHÍ MINH</span>
          <strong>BỆNH VIỆN ĐA KHOA MEDICARE</strong>
          <span>Phòng Kế hoạch tổng hợp & Lưu trữ EMR</span>
          <div className="paper-doc-id">Mã bệnh án: <b>{row.episodeId || row.id || 'Chưa ghi nhận'}</b></div>
        </div>
        <div className="paper-header-right">
          <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
          <span>Độc lập - Tự do - Hạnh phúc</span>
          <div className="paper-motto-line" />
          <div className="paper-doc-id">Phụ lục 4 (Thông tư 18/2022/TT-BYT)</div>
        </div>
      </div>

      <div className="paper-title">
        <h1>BẢN TÓM TẮT HỒ SƠ BỆNH ÁN</h1>
        <p className="paper-sub-law">(Trích sao lưu trữ phục vụ bảo hiểm xã hội, giám định và người bệnh)</p>
      </div>

      <div className="paper-section-title">I. PHẦN HÀNH CHÍNH:</div>
      <div className="paper-row">
        <span className="paper-label">- Họ và tên người bệnh:</span>
        <span className="paper-value"><b>{patient?.name || row.patientName || 'Chưa ghi nhận'}</b></span>
        <span className="paper-label" style={{ marginLeft: 20 }}>Nam/Nữ:</span>
        <span className="paper-value" style={{ maxWidth: 80 }}>{patient?.gender || 'Chưa ghi nhận'}</span>
        <span className="paper-label" style={{ marginLeft: 20 }}>Tuổi:</span>
        <span className="paper-value" style={{ maxWidth: 60 }}>{age}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Số thẻ BHYT:</span>
        <span className="paper-value">
          <code style={{ fontSize: 13.5, fontWeight: 700 }}>{bh.code || 'CHƯA CÓ THẺ'}</code>
          {bh.hasInsurance && <span style={{ marginLeft: 10 }}>({bh.groupName} - Mức hưởng {bh.rate}%)</span>}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Địa chỉ nơi cư trú:</span>
        <span className="paper-value">{patient?.address || 'Chưa ghi nhận'}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">- Thời gian điều trị:</span>
        <span className="paper-value">{row.admittedAt || row.admissionDate || 'Chưa ghi nhận'} → {row.dischargedAt || row.dischargeDate || 'Chưa ghi nhận'}</span>
      </div>

      <div className="paper-section-title" style={{ marginTop: 14 }}>II. TÓM TẮT QUÁ TRÌNH CHUYÊN MÔN:</div>
      <div className="paper-row">
        <span className="paper-label">1. Lý do vào viện:</span>
        <span className="paper-value">{row.reason || 'Chưa ghi nhận'}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">2. Tiền sử bệnh:</span>
        <span className="paper-value">{patient?.history || 'Chưa ghi nhận'}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">3. Tóm tắt kết quả CLS có giá trị:</span>
        <span className="paper-value">
          {row.labSummary || 'Chưa ghi nhận'}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">4. Chẩn đoán ra viện:</span>
        <span className="paper-value">
          <b>{row.diagnosis || 'Chưa ghi nhận'}</b>
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">5. Quá trình và phương pháp điều trị:</span>
        <span className="paper-value">
          {row.treatment || 'Chưa ghi nhận'}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">6. Tình trạng người bệnh khi ra viện:</span>
        <span className="paper-value">
          {row.outcome || 'Chưa ghi nhận'}
        </span>
      </div>

      <div className="paper-row">
        <span className="paper-label">7. Hướng điều trị tiếp theo:</span>
        <span className="paper-value">
          {row.advice || 'Chưa ghi nhận'}
        </span>
      </div>

      <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: 20, fontSize: 12.5 }}>
        TP. Hồ Chí Minh, {todayStr}
      </div>

      <div className="paper-sign-block">
        <div className="paper-sign-col">
          <span className="sign-title">BÁC SĨ ĐIỀU TRỊ</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên)</span>
          <span className="sign-name">{doctorStaff?.name || row.doctor || 'Chưa ghi nhận'}</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">TRƯỞNG PHÒNG KHTH</span>
          <span className="sign-hint">(Ký, ghi rõ họ tên)</span>
          <span className="sign-name">Chưa ghi nhận</span>
        </div>
        <div className="paper-sign-col">
          <span className="sign-title">GIÁM ĐỐC BỆNH VIỆN</span>
          <span className="sign-hint">(Ký và đóng dấu)</span>
          <span className="sign-name">
            Chưa ghi nhận
            <span className="paper-badge-stamp">TRÍCH SAO BỆNH ÁN</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 7. VIEWER TỔNG HỢP VỚI TOOLBAR IN ẤN & ĐIỀU HƯỚNG
 * Tự động chọn biểu mẫu pháp lý chuẩn dựa trên Tab nghiệp vụ
 */
export default function MedicalPaperFormViewer({ tab, row, patient, doctorStaff, cashierStaff, onClose }) {
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
  } else if (['archives', 'authorizations'].includes(tab)) {
    FormComponent = MedicalRecordSummaryPaperForm;
    formTitle = 'Bản tóm tắt hồ sơ bệnh án (Phụ lục 4 - TT 18/2022/TT-BYT)';
  } else {
    // Default fallback
    FormComponent = ReferralPaperForm;
    formTitle = 'Văn bản y tế';
  }

  return (
    <div className="medical-paper-viewer" style={{ padding: '4px' }}>
      {/* Thanh công cụ xem trước và in */}
      <div className="paper-toolbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={20} style={{ color: '#0f766e' }} />
          <div>
            <b style={{ color: '#0f172a', fontSize: 14 }}>{formTitle}</b>
            <div style={{ fontSize: 11.5, color: '#64748b' }}>
              Bản xem trước từ dữ liệu hồ sơ · Chưa xác minh tính phù hợp pháp lý của biểu mẫu
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="primary" onClick={printDocument} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Printer size={16} /> In ra giấy A4 / Xuất PDF
          </button>
          {onClose && (
            <button className="secondary" onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <X size={16} /> Đóng
            </button>
          )}
        </div>
      </div>

      <p className="no-print" style={{color:'#64748b',fontSize:12,marginBottom:12}}>Chỉ in sau khi đối chiếu đúng người bệnh, hồ sơ và nội dung đã lưu. Trường trống không được tự bổ sung dữ liệu mẫu.</p>
      <FormComponent
        row={row}
        patient={patient}
        doctorStaff={doctorStaff}
        cashierStaff={cashierStaff}
      />
    </div>
  );
}
