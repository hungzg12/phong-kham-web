import React, { useState } from 'react';
import { Stethoscope, Activity, Heart, Eye, Sparkles, Baby, Bone, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import MedicalSuggestInput from './MedicalSuggestInput';

/**
 * 6 Specialty Clinical Exam Modules
 * Extends the Base Clinical Desk with deep, field-specific medical examination findings.
 */

export const SPECIALTY_CONFIGS = {
  'PK-NOI': {
    code: 'PK-NOI',
    dept: 'Nội tổng quát',
    icon: Stethoscope,
    color: '#0f766e',
    bgColor: '#f0fdfa',
    borderColor: '#99f6e4',
    title: 'Khám chuyên khoa Nội tổng quát & Bệnh lý chuyển hóa'
  },
  'PK-TIM': {
    code: 'PK-TIM',
    dept: 'Tim mạch',
    icon: Heart,
    color: '#e11d48',
    bgColor: '#fff1f2',
    borderColor: '#fecdd3',
    title: 'Khám chuyên khoa Tim mạch & Tuần hoàn'
  },
  'PK-TMH': {
    code: 'PK-TMH',
    dept: 'Tai Mũi Họng',
    icon: Eye,
    color: '#0284c7',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd',
    title: 'Khám chuyên khoa Tai Mũi Họng & Thanh quản'
  },
  'PK-DA': {
    code: 'PK-DA',
    dept: 'Da liễu',
    icon: Sparkles,
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    title: 'Khám chuyên khoa Da liễu & Thẩm mỹ'
  },
  'PK-SAN': {
    code: 'PK-SAN',
    dept: 'Sản phụ khoa',
    icon: Baby,
    color: '#db2777',
    bgColor: '#fdf2f8',
    borderColor: '#fbcfe8',
    title: 'Khám chuyên khoa Sản phụ khoa & Thai kỳ'
  },
  'PK-CXK': {
    code: 'PK-CXK',
    dept: 'Cơ xương khớp',
    icon: Bone,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    title: 'Khám chuyên khoa Cơ xương khớp & Cột sống'
  }
};

export function getSpecialtyCode(roomCode, departmentName) {
  if (roomCode && SPECIALTY_CONFIGS[roomCode]) return roomCode;
  const match = Object.values(SPECIALTY_CONFIGS).find(c => c.dept.toLowerCase() === (departmentName || '').toLowerCase());
  return match?.code || 'PK-NOI';
}

export default function SpecialtyExamModule({ roomCode, department, specialtyData = {}, onChange, disabled = false }) {
  const code = getSpecialtyCode(roomCode, department);
  const cfg = SPECIALTY_CONFIGS[code] || SPECIALTY_CONFIGS['PK-NOI'];
  const Icon = cfg.icon;
  const hasData = Object.values(specialtyData).some(v => Boolean(v && v !== 'NYHA_0' && v !== 'CCS_0'));
  const [open, setOpen] = useState(true);

  const update = (field, val) => {
    if (disabled) return;
    onChange({
      ...specialtyData,
      [field]: val
    });
  };

  return (
    <div className="his-specialty-exam-card" style={{
      marginTop: '12px',
      marginBottom: '12px',
      border: `1px solid ${cfg.borderColor}`,
      borderRadius: '8px',
      background: '#ffffff',
      overflow: 'hidden'
    }}>
      {/* Specialty Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: cfg.bgColor,
        borderBottom: open ? `1px solid ${cfg.borderColor}` : 'none',
        cursor: 'pointer'
      }} onClick={() => setOpen(v => !v)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '5px',
            background: cfg.color,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={15} />
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{cfg.title}</span>
            <small style={{ color: '#64748b', fontSize: '11px', marginLeft: '8px' }}>
              Phòng: <b>{cfg.dept}</b> ({cfg.code})
            </small>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" className="text-button" style={{ fontSize: '11.5px', color: cfg.color, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {open ? 'Thu gọn' : 'Mở rộng khám chuyên khoa'}
          </button>
        </div>
      </div>

      {open && <div style={{ padding: '14px 16px' }}>
        {/* 1. NỘI TỔNG QUÁT */}
        {code === 'PK-NOI' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <label className="his-label">
              Khám Tuần hoàn & Hô hấp
              <MedicalSuggestInput
                type="specialtyCardioResp"
                multiline
                rows={2}
                disabled={disabled}
                value={specialtyData.cardioResp || ''}
                onChange={val => update('cardioResp', val)}
                placeholder="Tim đều, T1 T2 rõ, không âm thổi bệnh lý. Phổi thông khí đều 2 bên, không rale..."
              />
            </label>

            <label className="his-label">
              Khám Tiêu hóa & Bụng
              <MedicalSuggestInput
                type="specialtyGI"
                multiline
                rows={2}
                disabled={disabled}
                value={specialtyData.giExam || ''}
                onChange={val => update('giExam', val)}
                placeholder="Bụng mềm, không chướng, gan lách không sờ chạm, không có điểm đau khu trú..."
              />
            </label>

            <label className="his-label">
              Khám Thận - Tiết niệu & Thần kinh
              <MedicalSuggestInput
                type="specialtyRenalNeuro"
                multiline
                rows={2}
                disabled={disabled}
                value={specialtyData.renalNeuro || ''}
                onChange={val => update('renalNeuro', val)}
                placeholder="Chạm thận âm tính, bập bềnh thận âm tính. Cổ mềm, không dấu thần kinh khu trú..."
              />
            </label>

            <label className="his-label">
              Đánh giá Bệnh lý chuyển hóa & Bệnh nền kết hợp
              <MedicalSuggestInput
                type="specialtyMetabolic"
                multiline
                rows={2}
                disabled={disabled}
                value={specialtyData.metabolicNotes || ''}
                onChange={val => update('metabolicNotes', val)}
                placeholder="Đánh giá kiểm soát đường huyết, huyết áp, lipid máu và nguy cơ tim mạch..."
              />
            </label>
          </div>
        )}

        {/* 2. TIM MẠCH */}
        {code === 'PK-TIM' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            <datalist id="tim-heart-sounds">
              <option value="T1, T2 đều rõ, không âm thổi bệnh lý, không tiếng tim thứ 3 (T3/T4)" />
              <option value="T1, T2 rõ, âm thổi tâm thu 2/6 ở mỏm tim lan nách" />
              <option value="Tim loạn nhịp hoàn toàn, T1 thay đổi cường độ (Nghi rung nhĩ)" />
              <option value="Âm thổi tâm thu 3/6 ở liên sườn 2 bờ phải xương ức (Hẹp van ĐMC)" />
            </datalist>
            <datalist id="tim-ecg-notes">
              <option value="Nhịp xoang đều 75 bpm, không biến đổi đoạn ST-T. EF ước tính > 55%" />
              <option value="Nhịp nhanh xoang 105 bpm, không thiếu máu cơ tim cấp" />
              <option value="Rung nhĩ đáp ứng thất trung bình 85 bpm, không có sóng f lớn" />
              <option value="Dày thất trái theo tiêu chuẩn Sokolow-Lyon (Sv1 + Rv5 > 35mm)" />
            </datalist>

            <label className="his-label" style={{ gridColumn: 'span 2' }}>
              Phân độ Suy tim theo NYHA
              <select
                className="his-select"
                disabled={disabled}
                value={specialtyData.nyhaClass || 'NYHA_0'}
                onChange={e => update('nyhaClass', e.target.value)}
              >
                <option value="NYHA_0">Không có dấu hiệu suy tim lâm sàng</option>
                <option value="NYHA_1">NYHA I: Không hạn chế vận động thể lực thông thường</option>
                <option value="NYHA_2">NYHA II: Hạn chế nhẹ vận động thể lực, khỏe khi nghỉ ngơi</option>
                <option value="NYHA_3">NYHA III: Hạn chế nhiều vận động thể lực, khó thở khi gắng sức nhẹ</option>
                <option value="NYHA_4">NYHA IV: Triệu chứng cơ năng xuất hiện ngay cả khi nghỉ ngơi</option>
              </select>
            </label>

            <label className="his-label" style={{ gridColumn: 'span 2' }}>
              Phân loại Đau thắt ngực (CCS)
              <select
                className="his-select"
                disabled={disabled}
                value={specialtyData.ccsClass || 'CCS_0'}
                onChange={e => update('ccsClass', e.target.value)}
              >
                <option value="CCS_0">Không có cơn đau thắt ngực</option>
                <option value="CCS_1">CCS 1: Đau thắt ngực chỉ xảy ra khi hoạt động thể lực rất nặng</option>
                <option value="CCS_2">CCS 2: Hạn chế nhẹ hoạt động thông thường (đi nhanh, lên dốc)</option>
                <option value="CCS_3">CCS 3: Hạn chế rõ rệt hoạt động thể lực bình thường</option>
                <option value="CCS_4">CCS 4: Đau thắt ngực khi vận động nhẹ hoặc ngay khi nghỉ</option>
              </select>
            </label>

            <label className="his-label" style={{ gridColumn: 'span 2' }}>
              Khám Tiếng tim & Âm thổi bệnh lý
              <MedicalSuggestInput
                type="specialtyHeartSounds"
                disabled={disabled}
                value={specialtyData.heartSounds || ''}
                onChange={val => update('heartSounds', val)}
                placeholder="T1, T2 đều rõ / Âm thổi tâm thu 3/6 ở mỏm / Không rung miu..."
              />
            </label>

            <label className="his-label">
              Tĩnh mạch cổ nổi (Tư thế 45°)
              <select
                className="his-select"
                disabled={disabled}
                value={specialtyData.jvd || 'NEGATIVE'}
                onChange={e => update('jvd', e.target.value)}
              >
                <option value="NEGATIVE">Âm tính (-)</option>
                <option value="POSITIVE">Dương tính (+)</option>
              </select>
            </label>

            <label className="his-label">
              Dấu hiệu Phù ngoại vi 2 chi dưới
              <select
                className="his-select"
                disabled={disabled}
                value={specialtyData.edema || 'NONE'}
                onChange={e => update('edema', e.target.value)}
              >
                <option value="NONE">Không phù</option>
                <option value="MILD">Phù nhẹ mắt cá chân (1+)</option>
                <option value="MODERATE">Phù rõ đến giữa cẳng chân (2+)</option>
                <option value="SEVERE">Phù to toàn bộ 2 chi dưới (3+)</option>
              </select>
            </label>

            <label className="his-label" style={{ gridColumn: 'span 4' }}>
              Ghi chú Điện tâm đồ (ECG) & Siêu âm tim tại chỗ
              <MedicalSuggestInput
                type="specialtyEcg"
                disabled={disabled}
                value={specialtyData.ecgNotes || ''}
                onChange={val => update('ecgNotes', val)}
                placeholder="Nhịp xoang 75 bpm, không biến đổi đoạn ST-T. EF ước tính > 55%..."
              />
            </label>
          </div>
        )}

        {/* 3. TAI MŨI HỌNG */}
        {code === 'PK-TMH' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <label className="his-label">
              Khám Tai & Màng nhĩ (Phải / Trái)
              <MedicalSuggestInput
                type="specialtyEar"
                multiline
                rows={3}
                disabled={disabled}
                value={specialtyData.earExam || ''}
                onChange={val => update('earExam', val)}
                placeholder="Ống tai ngoài thông thoáng. Màng nhĩ sáng, nón sáng rõ, không thủng, không ứ mủ..."
              />
            </label>

            <label className="his-label">
              Khám Mũi & Xoang
              <MedicalSuggestInput
                type="specialtyNose"
                multiline
                rows={3}
                disabled={disabled}
                value={specialtyData.noseExam || ''}
                onChange={val => update('noseExam', val)}
                placeholder="Cuốn mũi hồng, không phì đại. Vách ngăn thẳng. Khe giữa sạch, không polyp..."
              />
            </label>

            <label className="his-label">
              Khám Họng & Thanh quản
              <MedicalSuggestInput
                type="specialtyThroat"
                multiline
                rows={3}
                disabled={disabled}
                value={specialtyData.throatExam || ''}
                onChange={val => update('throatExam', val)}
                placeholder="Niêm mạc họng hồng. Amidan độ I-II, không hốc mủ. Dây thanh khép kín khi phát âm..."
              />
            </label>

            <label className="his-label" style={{ gridColumn: 'span 3' }}>
              Kích thước Amidan & Dấu hiệu viêm mủ
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <select
                  className="his-select"
                  disabled={disabled}
                  style={{ width: '240px' }}
                  value={specialtyData.tonsilGrade || 'GRADE_1'}
                  onChange={e => update('tonsilGrade', e.target.value)}
                >
                  <option value="GRADE_0">Đã cắt Amidan</option>
                  <option value="GRADE_1">Amidan Độ I: &lt; 25% khẩu kính</option>
                  <option value="GRADE_2">Amidan Độ II: 25% - 50% khẩu kính</option>
                  <option value="GRADE_3">Amidan Độ III: 50% - 75% khẩu kính</option>
                  <option value="GRADE_4">Amidan Độ IV: &gt; 75% chạm nhau</option>
                </select>
                <input
                  type="text"
                  disabled={disabled}
                  className="his-input"
                  style={{ flex: 1 }}
                  value={specialtyData.tmhNotes || ''}
                  onChange={e => update('tmhNotes', e.target.value)}
                  placeholder="Ghi chú hạch góc hàm, phản xạ nuốt, kết quả nội soi soi TMH..."
                />
              </div>
            </label>
          </div>
        )}

        {/* 4. DA LIỄU */}
        {code === 'PK-DA' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <datalist id="da-primary-lesions">
              <option value="Dát đỏ hình tròn, sẩn phù mề đay rải rác, ngứa nhiều" />
              <option value="Mụn nước nhỏ li ti mọc thành chùm trên nền dát đỏ, rát buốt" />
              <option value="Mảng đỏ bong vảy trắng bạc, dấu cạo vỏ hành (+)" />
              <option value="Sẩn sừng nang lông, da khô ráp dày sừng vùng duỗi" />
            </datalist>
            <datalist id="da-distribution">
              <option value="Đối xứng hai bên cẳng tay và cẳng chân" />
              <option value="Vùng nếp gấp khuỷu tay, khoeo chân và vùng cổ" />
              <option value="Vùng da hở phơi bày ánh sáng mặt trời" />
              <option value="Dọc theo đường đi tiết đoạn thần kinh một bên cơ thể" />
            </datalist>

            <label className="his-label" style={{ gridColumn: 'span 2' }}>
              Tổn thương da cơ bản & Tính chất
              <MedicalSuggestInput
                type="specialtySkin"
                disabled={disabled}
                value={specialtyData.primaryLesions || ''}
                onChange={val => update('primaryLesions', val)}
                placeholder="Dát đỏ hình tròn, sẩn phù, mụn nước nhỏ li ti, có vảy da mỏng..."
              />
            </label>

            <label className="his-label">
              Phân loại tuýp da Fitzpatrick
              <select
                className="his-select"
                disabled={disabled}
                value={specialtyData.fitzpatrick || 'TYPE_3'}
                onChange={e => update('fitzpatrick', e.target.value)}
              >
                <option value="TYPE_1">Type I: Rất trắng, luôn cháy nắng</option>
                <option value="TYPE_2">Type II: Trắng, dễ cháy nắng</option>
                <option value="TYPE_3">Type III: Trung bình, cháy nắng nhẹ (Phổ biến VN)</option>
                <option value="TYPE_4">Type IV: Da ngăm, dễ rám nắng (Phổ biến VN)</option>
                <option value="TYPE_5">Type V: Da nâu sẫm</option>
                <option value="TYPE_6">Type VI: Da đen sẫm</option>
              </select>
            </label>

            <label className="his-label" style={{ gridColumn: 'span 2' }}>
              Vị trí & Phân bố tổn thương
              <MedicalSuggestInput
                type="specialtySkin"
                disabled={disabled}
                value={specialtyData.lesionDistribution || ''}
                onChange={val => update('lesionDistribution', val)}
                placeholder="Đối xứng hai bên cẳng tay, vùng nếp gấp khuỷu, vùng phơi bày ánh sáng..."
              />
            </label>

            <label className="his-label">
              Mức độ ngứa / Châm chích (VAS 0 - 10)
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="range"
                  min="0"
                  max="10"
                  disabled={disabled}
                  value={specialtyData.itchScore ?? 3}
                  onChange={e => update('itchScore', Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span className="badge amber" style={{ minWidth: '45px', textAlign: 'center' }}>
                  {specialtyData.itchScore ?? 3} / 10
                </span>
              </div>
            </label>

            <label className="his-label" style={{ gridColumn: 'span 3' }}>
              Dấu hiệu da chuyên khoa (Nikolsky, Darier, Koebner) & Ghi chú
              <input
                type="text"
                disabled={disabled}
                className="his-input"
                value={specialtyData.dermSpecialNotes || ''}
                onChange={e => update('dermSpecialNotes', e.target.value)}
                placeholder="Dấu Nikolsky (-), Dấu cạo vỏ hành (+), không có tổn thương niêm mạc miệng..."
              />
            </label>
          </div>
        )}

        {/* 5. SẢN PHỤ KHOA */}
        {code === 'PK-SAN' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            <label className="his-label">
              Tiền sử PARA (Sinh - Sớm - Sảy - Sống)
              <input
                type="text"
                disabled={disabled}
                className="his-input"
                value={specialtyData.para || '0000'}
                onChange={e => update('para', e.target.value)}
                placeholder="Ví dụ: 1001"
              />
            </label>

            <label className="his-label">
              Ngày kinh cuối (KCC)
              <input
                type="date"
                disabled={disabled}
                className="his-input"
                value={specialtyData.lmp || ''}
                onChange={e => update('lmp', e.target.value)}
              />
            </label>

            <label className="his-label">
              Tuổi thai ước tính (Tuần + Ngày)
              <input
                type="text"
                disabled={disabled}
                className="his-input"
                value={specialtyData.gestationalAge || ''}
                onChange={e => update('gestationalAge', e.target.value)}
                placeholder="Ví dụ: 12 tuần 3 ngày"
              />
            </label>

            <label className="his-label">
              Tim thai (lần/phút)
              <input
                type="number"
                disabled={disabled}
                min="60"
                max="200"
                className="his-input"
                value={specialtyData.fetalHeartRate || ''}
                onChange={e => update('fetalHeartRate', e.target.value ? Number(e.target.value) : '')}
                placeholder="140 bpm (đều)"
              />
            </label>

            <datalist id="san-cervix-presets">
              <option value="Âm đạo không viêm, CTC trơn láng, đóng kín, không chảy máu" />
              <option value="CTC lộ tuyến độ I, tiết dịch nhầy trong, không đau" />
              <option value="Âm đạo nhiều huyết trắng dạng vón cục, CTC viêm đỏ nhẹ" />
            </datalist>
            <datalist id="san-uterus-presets">
              <option value="Tử cung tư thế trung gian, kích thước bình thường, hai phần phụ mềm không đau" />
              <option value="Tử cung ngả trước, kích thước tương đương tuổi thai, hai phần phụ mềm" />
            </datalist>

            <label className="his-label" style={{ gridColumn: 'span 2' }}>
              Khám Mỏ vịt & Cổ tử cung (CTC)
              <MedicalSuggestInput
                type="specialtyCervix"
                disabled={disabled}
                value={specialtyData.cervixExam || ''}
                onChange={val => update('cervixExam', val)}
                placeholder="Âm đạo không viêm, CTC trơn láng, đóng kín, không chảy máu..."
              />
            </label>

            <label className="his-label" style={{ gridColumn: 'span 2' }}>
              Khám Tử cung & 2 Phần phụ (Bimanual Exam)
              <MedicalSuggestInput
                type="specialtyCervix"
                disabled={disabled}
                value={specialtyData.uterusExam || ''}
                onChange={val => update('uterusExam', val)}
                placeholder="Tử cung tư thế trung gian, di động tốt. Hai phần phụ mềm, không đau..."
              />
            </label>
          </div>
        )}

        {/* 6. CƠ XƯƠNG KHỚP */}
        {code === 'PK-CXK' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <label className="his-label">
              Thang điểm đau khớp VAS (0 - 10)
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="range"
                  min="0"
                  max="10"
                  disabled={disabled}
                  value={specialtyData.vasScore ?? 4}
                  onChange={e => update('vasScore', Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span className="badge danger" style={{ minWidth: '45px', textAlign: 'center' }}>
                  {specialtyData.vasScore ?? 4} / 10
                </span>
              </div>
            </label>

            <label className="his-label">
              Cứng khớp buổi sáng (phút)
              <input
                type="number"
                disabled={disabled}
                min="0"
                max="300"
                className="his-input"
                value={specialtyData.morningStiffness || 15}
                onChange={e => update('morningStiffness', Number(e.target.value))}
              />
            </label>

            <label className="his-label">
              Dấu hiệu Lạo xạo khớp / Bập bềnh bánh chè
              <select
                className="his-select"
                disabled={disabled}
                value={specialtyData.patellarTap || 'NEGATIVE'}
                onChange={e => update('patellarTap', e.target.value)}
              >
                <option value="NEGATIVE">Bập bềnh bánh chè (-)</option>
                <option value="POSITIVE">Bập bềnh bánh chè (+) Có tràn dịch</option>
              </select>
            </label>

            <label className="his-label" style={{ gridColumn: 'span 2' }}>
              Khám Tầm vận động (ROM) & Vị trí khớp viêm đau
              <MedicalSuggestInput
                type="specialtyJoint"
                multiline
                rows={2}
                disabled={disabled}
                value={specialtyData.jointExam || ''}
                onChange={val => update('jointExam', val)}
                placeholder="Khớp gối 2 bên: Gập 120 độ, duỗi 0 độ. Không sưng nóng đỏ, có lạo xạo nhẹ khi gập duỗi..."
              />
            </label>

            <label className="his-label">
              Nghiệm pháp Cột sống (Schober, Lasegue)
              <MedicalSuggestInput
                type="specialtySpine"
                multiline
                rows={2}
                disabled={disabled}
                value={specialtyData.spineExam || ''}
                onChange={val => update('spineExam', val)}
                placeholder="Schober test: 14/10 cm (Bình thường). Lasegue 2 bên: 80 độ âm tính..."
              />
            </label>
          </div>
        )}
      </div>}
    </div>
  );
}
