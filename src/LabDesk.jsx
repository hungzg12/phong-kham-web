import React, { useState } from 'react';
import { Search, Plus, Trash2, Printer, Check, Sparkles, Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock, User, Building2, Stethoscope, FileText, Camera } from 'lucide-react';
import { useWorkspace, transact } from './workspace';
import { actorRoles, canAction } from './roles';
import { hisApi } from './api';

export const LAB_ROOMS = [
  { id: 'ALL', name: 'Tất cả phòng CLS toàn viện', dept: 'Toàn viện' },
  { id: 'P_XQ_01', name: 'Phòng X-Quang Kỹ thuật số', dept: 'Khoa CĐHA', match: s => s.includes('quang') || s.includes('xray') || s.includes('x-quang') },
  { id: 'P_SA_01', name: 'Phòng Siêu âm Tổng quát & Doppler', dept: 'Khoa CĐHA', match: s => s.includes('siêu âm') || s.includes('sieu_am') },
  { id: 'P_XN_HH', name: 'Phòng Xét nghiệm Huyết học & Truyền máu', dept: 'Khoa Xét nghiệm', match: s => s.includes('máu') || s.includes('công thức') || s.includes('huyết học') },
  { id: 'P_XN_SH', name: 'Phòng Xét nghiệm Sinh hóa & Miễn dịch', dept: 'Khoa Xét nghiệm', match: s => s.includes('đường') || s.includes('glucose') || s.includes('men gan') || s.includes('ast') || s.includes('alt') || s.includes('creatinin') || s.includes('ure') || s.includes('lipid') || s.includes('mỡ') },
  { id: 'P_TDCN_01', name: 'Phòng Điện tim & Thăm dò chức năng', dept: 'Khoa CĐHA', match: s => s.includes('điện tim') || s.includes('ecg') },
  { id: 'P_NS_01', name: 'Phòng Nội soi Tiêu hóa & TMH', dept: 'Khoa CĐHA', match: s => s.includes('nội soi') || s.includes('tai mũi họng') }
];

export default function LabDesk({ role = 'technician', notify, clinicalContext }) {
  const [db] = useWorkspace('business');
  const [patients] = useWorkspace('patients');
  const [visits] = useWorkspace('visits');
  const [admissions] = useWorkspace('admissions');
  const actor = actorRoles[role] || actorRoles.technician;

  const allowed = new Set([...visits, ...admissions].filter(e => role !== 'doctor' || (e.doctor || '').includes(actor.person)).map(e => e.id));
  const [selectedRoom, setSelectedRoom] = useState('ALL');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [scoped, setScoped] = useState(true);

  const scope = scoped ? clinicalContext : null;
  const roomDef = LAB_ROOMS.find(r => r.id === selectedRoom);

  // Filter rows by room and search criteria
  const rows = db.labs
    .filter(l => !scope || (l.patient === scope.patientId && l.episodeId === scope.episodeId))
    .filter(l => role !== 'doctor' || allowed.has(l.episodeId))
    .filter(l => {
      if (!roomDef || roomDef.id === 'ALL') return true;
      const sName = (db.services.find(s => s.id === l.service)?.name || l.service || '').toLowerCase();
      return roomDef.match ? roomDef.match(sName) : true;
    })
    .filter(l => (!status || l.status === status) && (l.id + ' ' + (patients.find(p => p.id === l.patient)?.name || '')).toLowerCase().includes(query.toLowerCase()));

  const row = rows.find(r => r.id === selected) || rows[0];
  const canWrite = canAction(role, 'labs', 'accept');

  // Identify service details
  const currentService = db.services.find(s => s.id === row?.service);
  const serviceName = currentService?.name || row?.service || 'Dịch vụ CLS';
  const isImaging = currentService?.kind === 'Chẩn đoán hình ảnh' || serviceName.toLowerCase().includes('quang') || serviceName.toLowerCase().includes('siêu âm') || serviceName.toLowerCase().includes('điện tim') || serviceName.toLowerCase().includes('nội soi');
  const patientObj = patients.find(p => p.id === row?.patient) || { name: 'Người bệnh', id: row?.patient || 'BN-Chưa xác định' };

  async function action(kind) {
    if (saving || !row) return;
    setError('');
    setSaving(true);
    try {
      const saved = await hisApi.labAction({
        id: row.id,
        action: kind,
        role,
        staffId: actor.staffId || 'NV005',
        revision: kind === 'save' ? (editing?.baseRevision || 0) : (row.resultRevision || 0),
        rows: editing?.rows,
        conclusion: editing?.conclusion,
        critical: editing?.critical
      });
      transact(d => {
        d.business.labs = d.business.labs.map(r => r.id === saved.id ? saved : r);
      });
      setEditing(null);
      if (kind === 'publish') {
        notify(`Đã ký duyệt & phát hành kết quả ${row.id}! Kết quả đã gửi liên thông về Bàn khám Bác sĩ.`);
      } else if (kind === 'accept') {
        notify(`Đã tiếp nhận bệnh nhân ${patientObj.name} vào phòng thực hiện CLS.`);
      } else {
        notify('Đã lưu bản nháp kết quả trong SQL Server.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function fillQuickTemplate() {
    const sName = serviceName.toLowerCase();
    if (sName.includes('quang')) {
      setEditing({
        baseRevision: row?.resultRevision || 0,
        technique: 'Chụp X-quang tim phổi thẳng số hóa thế sau - trước (PA)',
        surveyArea: 'Lồng ngực và nhu mô phổi 2 bên',
        findings: 'Hình ảnh đám mờ không đồng nhất thùy dưới phổi phải, phế quản hơi rõ, bờ tim phải bị xóa nhẹ. Trường phổi trái sáng đều. Rốn phổi 2 bên không phì đại hạch. Góc sườn hoành 2 bên sáng nhọn. Bóng tim trong giới hạn bình thường.',
        rows: [
          { name: 'Mô tả hình ảnh', value: 'Đám mờ thùy dưới phổi phải', unit: 'Thế PA', reference: 'Bình thường' },
          { name: 'Nhu mô phổi', value: 'Thâm nhiễm phế nang thùy dưới', unit: '', reference: 'Sáng đều' },
          { name: 'Bóng tim', value: 'Chỉ số tim/lồng ngực < 0.5', unit: '', reference: '< 0.5' }
        ],
        conclusion: 'Hình ảnh thâm nhiễm phế nang đông đặc thùy dưới phổi phải — Nghĩ nhiều đến Viêm phổi thùy cấp.',
        proposal: 'Đề nghị chụp phim kiểm tra lại sau đợt điều trị kháng sinh (7-10 ngày).',
        critical: 'Không'
      });
    } else if (sName.includes('siêu âm')) {
      setEditing({
        baseRevision: row?.resultRevision || 0,
        technique: 'Siêu âm Doppler màu ổ bụng tổng quát đa tần số',
        surveyArea: 'Các tạng ổ bụng: Gan, Mật, Tụy, Lách, Thận, Bàng quang',
        findings: 'Gan kích thước bình thường, nhu mô tăng hồi âm nhẹ lan tỏa dạng thoái hóa mỡ độ 1. Túi mật thành mỏng, lòng sạch không có sỏi. Tụy, lách, 2 thận cấu trúc bình thường, không giãn đài bể thận, không sỏi cản âm. Ổ bụng không có dịch tự do.',
        rows: [
          { name: 'Nhu mô Gan', value: 'Tăng hồi âm nhẹ lan tỏa (Gan nhiễm mỡ độ 1)', unit: 'Độ 1', reference: 'Đồng âm, bờ đều' },
          { name: 'Túi mật & Đường mật', value: 'Thành mỏng, không sỏi', unit: '', reference: 'Không sỏi' },
          { name: 'Hệ Tiết niệu', value: 'Hai thận cấu trúc bình thường, không ứ nước', unit: '', reference: 'Bình thường' }
        ],
        conclusion: 'Hình ảnh Gan thoái hóa mỡ nhẹ (Độ 1). Các cơ quan khác trong ổ bụng chưa phát hiện bất thường.',
        proposal: 'Điều chỉnh chế độ ăn giảm dầu mỡ, tái khám và siêu âm định kỳ mỗi 6 tháng.',
        critical: 'Không'
      });
    } else if (sName.includes('điện tim') || sName.includes('ecg')) {
      setEditing({
        baseRevision: row?.resultRevision || 0,
        technique: 'Ghi điện tâm đồ 12 chuyển đạo tiêu chuẩn',
        surveyArea: 'Chuyển đạo chi (D1, D2, D3, aVR, aVL, aVF) và Chuyển đạo trước tim (V1 đến V6)',
        findings: 'Nhịp xoang đều, tần số 78 chu kỳ/phút. Trục điện tim trung gian. Sóng P bình thường. Khoảng PR = 0.16s. Phức bộ QRS thanh mảnh, thời gian 0.08s. Không thấy sóng Q bệnh lý. Đoạn ST đẳng điện, không chênh lên hay chênh xuống. Sóng T dương ở D1, D2, V4-V6.',
        rows: [
          { name: 'Nhịp tim', value: 'Nhịp xoang đều', unit: 'lần/phút', reference: 'Xoang đều 60-100' },
          { name: 'Tần số', value: '78', unit: 'bpm', reference: '60 - 100' },
          { name: 'Đoạn ST - T', value: 'Đẳng điện, không biến đổi thiếu máu cục bộ', unit: '', reference: 'Đẳng điện' }
        ],
        conclusion: 'Điện tâm đồ trong giới hạn bình thường — Nhịp xoang đều 78 chu kỳ/phút.',
        proposal: 'Theo dõi triệu chứng lâm sàng, đo lại ECG nếu cơn đau ngực tái phát.',
        critical: 'Không'
      });
    } else if (sName.includes('máu') || sName.includes('công thức')) {
      setEditing({
        baseRevision: row?.resultRevision || 0,
        rows: [
          { name: 'WBC (Bạch cầu)', value: '14.8', unit: 'G/L', reference: '4.0 - 10.0' },
          { name: 'NEU% (Bạch cầu đa nhân trung tính)', value: '82.5', unit: '%', reference: '40.0 - 74.0' },
          { name: 'RBC (Hồng cầu)', value: '4.65', unit: 'T/L', reference: '4.0 - 5.5' },
          { name: 'HGB (Huyết sắc tố)', value: '138', unit: 'g/L', reference: '120 - 165' },
          { name: 'HCT (Dung tích hồng cầu)', value: '0.41', unit: 'L/L', reference: '0.35 - 0.48' },
          { name: 'PLT (Tiểu cầu)', value: '265', unit: 'G/L', reference: '150 - 450' }
        ],
        conclusion: 'Bạch cầu tăng cao (14.8 G/L) với ưu thế bạch cầu đa nhân trung tính (82.5%) — Phù hợp tình trạng nhiễm khuẩn cấp tính.',
        critical: 'Không'
      });
    } else if (sName.includes('men gan') || sName.includes('ast') || sName.includes('alt')) {
      setEditing({
        baseRevision: row?.resultRevision || 0,
        rows: [
          { name: 'AST (GOT)', value: '28.5', unit: 'U/L', reference: '<= 37' },
          { name: 'ALT (GPT)', value: '31.0', unit: 'U/L', reference: '<= 40' }
        ],
        conclusion: 'Hoạt độ men gan AST và ALT trong giới hạn bình thường. Chức năng tế bào gan được bảo tồn tốt.',
        critical: 'Không'
      });
    } else if (sName.includes('đường') || sName.includes('glucose')) {
      setEditing({
        baseRevision: row?.resultRevision || 0,
        rows: [
          { name: 'Glucose máu lúc đói', value: '5.4', unit: 'mmol/L', reference: '3.9 - 6.4' },
          { name: 'HbA1c', value: '5.6', unit: '%', reference: '4.0 - 6.0' }
        ],
        conclusion: 'Đường huyết lúc đói và chỉ số HbA1c nằm trong giới hạn bình thường.',
        critical: 'Không'
      });
    } else {
      setEditing({
        baseRevision: row?.resultRevision || 0,
        rows: [
          { name: 'Kết quả đo chuyên môn', value: 'Bình thường', unit: '', reference: 'Bình thường' }
        ],
        conclusion: 'Kết quả kỹ thuật không phát hiện bất thường bệnh lý.',
        critical: 'Không'
      });
    }
  }

  return (
    <section className="lab-desk">
      {/* 1. Header Banner & Context */}
      <div className="desk-intro" style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>
            Bàn làm việc Cận lâm sàng & Chẩn đoán hình ảnh
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="secondary" onClick={() => window.print()} title="In phiếu kết quả CLS">
            <Printer size={15} /> In kết quả
          </button>
        </div>
      </div>

      {scope && (
        <div className="doctor-access-help" style={{ marginBottom: '12px' }}>
          Đang xem chỉ định thuộc hồ sơ <b>{scope.episodeId}</b> của bệnh nhân {patientObj.name}
          <button className="secondary" style={{ marginLeft: '12px' }} onClick={() => setScoped(false)}>
            Xem tất cả phòng CLS
          </button>
        </div>
      )}

      {/* 2. Room Selector & Queue Toolbar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px', background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={18} style={{ color: '#0f766e' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Phòng máy trực:</span>
        </div>
        <select
          aria-label="Chọn phòng thực hiện CLS"
          value={selectedRoom}
          onChange={e => {
            setSelectedRoom(e.target.value);
            setSelected('');
            setEditing(null);
          }}
          style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: 600, color: '#0f766e', minWidth: '320px', background: '#f8fafc' }}
        >
          {LAB_ROOMS.map(r => {
            const countInRoom = db.labs.filter(l => {
              if (r.id === 'ALL') return true;
              const sName = (db.services.find(s => s.id === l.service)?.name || l.service || '').toLowerCase();
              return r.match ? r.match(sName) : true;
            }).length;
            return (
              <option key={r.id} value={r.id}>
                {r.name} ({r.dept}) — [{countInRoom} chỉ định]
              </option>
            );
          })}
        </select>

        {/* Quick status counters */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', fontSize: '12px' }}>
          <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
            Chờ tiếp nhận: {rows.filter(r => r.status === 'Chờ tiếp nhận').length}
          </span>
          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
            Đang làm: {rows.filter(r => r.status === 'Đang thực hiện').length}
          </span>
          <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
            Đã có KQ: {rows.filter(r => r.status === 'Đã phát hành').length}
          </span>
        </div>
      </div>

      {/* 3. Main Split Desk Layout */}
      <div className="desk-layout" style={{ gridTemplateColumns: '320px minmax(0, 1fr)' }}>
        {/* Left Side: Patient Queue by Room */}
        <aside className="desk-queue" style={{ maxHeight: '82vh' }}>
          <div className="desk-queue-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> Hàng đợi bệnh nhân ({rows.length})
            </span>
          </div>

          <label className="search" style={{ marginBottom: '8px' }}>
            <Search size={15} />
            <input
              aria-label="Tìm kiếm người bệnh hoặc phiếu chỉ định"
              placeholder="Tìm tên BN, mã BN, mã phiếu..."
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setEditing(null);
              }}
            />
          </label>

          <select
            aria-label="Lọc trạng thái thực hiện"
            value={status}
            onChange={e => {
              setStatus(e.target.value);
              setEditing(null);
            }}
            style={{ marginBottom: '12px' }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Chờ tiếp nhận">Chờ tiếp nhận</option>
            <option value="Đang thực hiện">Đang thực hiện</option>
            <option value="Chờ duyệt">Chờ duyệt</option>
            <option value="Đã phát hành">Đã phát hành (Đã gửi BS)</option>
          </select>

          <div className="desk-patient-list">
            {rows.map((l, idx) => {
              const p = patients.find(x => x.id === l.patient);
              const s = db.services.find(x => x.id === l.service);
              const isSelected = row?.id === l.id;
              const isUrgent = l.priority === 'Khẩn cấp' || l.priority === 'CAP_CUU';

              return (
                <button
                  key={l.id}
                  aria-pressed={isSelected}
                  style={{
                    borderLeft: isUrgent ? '4px solid #ef4444' : isSelected ? '4px solid #0f766e' : '1px solid #e2e8f0',
                    background: isSelected ? '#f0fdfa' : '#ffffff',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    textAlign: 'left',
                    borderRadius: '6px',
                    position: 'relative'
                  }}
                  onClick={() => {
                    if (editing && !window.confirm('Bỏ kết quả chưa lưu để chuyển phiếu?')) return;
                    setSelected(l.id);
                    setEditing(null);
                    setError('');
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: '13px', color: '#0f172a' }}>
                      {idx + 1}. {p?.name || l.patient}
                    </b>
                    {isUrgent && (
                      <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        CẤP CỨU
                      </span>
                    )}
                  </div>
                  <small style={{ color: '#0f766e', fontWeight: 600, fontSize: '11px' }}>
                    {s?.name || l.service}
                  </small>
                  <small style={{ color: '#64748b', fontSize: '11px' }}>
                    Phiếu: {l.id} · BS: {db.staff.find(st => st.id === l.doctor)?.name || l.doctor}
                  </small>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <small style={{ color: '#94a3b8', fontSize: '10px' }}>Hồ sơ: {l.episodeId}</small>
                    <span className={`badge ${l.status === 'Đã phát hành' ? 'teal' : l.status === 'Đang thực hiện' ? 'blue' : 'amber'}`} style={{ fontSize: '10px' }}>
                      {l.status}
                    </span>
                  </div>
                </button>
              );
            })}
            {!rows.length && (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                Không có bệnh nhân chờ tại phòng này.
              </div>
            )}
          </div>
        </aside>

        {/* Right Side: Technician Workstation */}
        <div className="desk-workspace" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
          {row ? (
            <>
              {/* Card 1: Patient Details & Doctor's Clinical Order Info */}
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>
                        {patientObj.name}
                      </h3>
                      <span style={{ background: '#e2e8f0', color: '#334155', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        Mã BN: {patientObj.id}
                      </span>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        {patientObj.gender || 'Nam'} · {patientObj.birth ? new Date().getFullYear() - Number(patientObj.birth.slice(0, 4)) : '45'} tuổi
                      </span>
                      {patientObj.insurance && (
                        <span style={{ background: '#dcfce7', color: '#166534', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          BHYT: {patientObj.insurance}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#475569' }}>
                      Mã phiếu CLS: <b>{row.id}</b> · Đợt/Lượt khám: <b>{row.episodeId}</b> · Thời điểm chỉ định: <b>{row.date || 'Hôm nay'}</b>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: row.status === 'Đã phát hành' ? '#dcfce7' : row.status === 'Đang thực hiện' ? '#e0f2fe' : '#fef3c7', color: row.status === 'Đã phát hành' ? '#166534' : row.status === 'Đang thực hiện' ? '#0369a1' : '#92400e' }}>
                      {row.status === 'Đã phát hành' ? '✓ ĐÃ PHÁT HÀNH (ĐÃ GỬI BÁC SĨ)' : row.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Clinical Context Box (Bác sĩ chỉ định & Chẩn đoán lâm sàng) */}
                <div style={{ marginTop: '12px', padding: '10px 14px', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#1e40af', fontWeight: 600 }}>Bác sĩ chỉ định:</span>{' '}
                    <b>{db.staff.find(s => s.id === row.doctor)?.name || row.doctor}</b> (Khoa Khám bệnh / Nội trú)
                  </div>
                  <div>
                    <span style={{ color: '#1e40af', fontWeight: 600 }}>Dịch vụ chỉ định:</span>{' '}
                    <b style={{ color: '#0f766e' }}>{serviceName}</b>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#1e40af', fontWeight: 600 }}>Chẩn đoán sơ bộ của Bác sĩ:</span>{' '}
                    <span style={{ color: '#b91c1c', fontWeight: 700 }}>
                      {row.diagnosis || 'Theo dõi lâm sàng và chỉ định cận lâm sàng đánh giá'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Technician Result Entry or Result Presentation */}
              <div style={{ padding: '20px' }}>
                {/* Stage A: When Waiting for Check-in */}
                {row.status === 'Chờ tiếp nhận' && !editing && (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#fafaf9', borderRadius: '8px', border: '1.5px dashed #cbd5e1' }}>
                    <Activity size={32} style={{ color: '#0f766e', margin: '0 auto 8px' }} />
                    <h3 style={{ margin: '0 0 14px', fontSize: '15px', color: '#1e293b' }}>
                      Bệnh nhân đang ở phòng chờ CLS
                    </h3>
                    {canWrite ? (
                      <button
                        className="primary"
                        style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 600 }}
                        disabled={saving}
                        onClick={() => action('accept')}
                      >
                        {saving ? 'Đang xử lý...' : 'Tiếp nhận người bệnh vào phòng máy'}
                      </button>
                    ) : (
                      <div style={{ fontStyle: 'italic', color: '#64748b', fontSize: '13px' }}>
                        Chờ Kỹ thuật viên tiếp nhận phòng máy.
                      </div>
                    )}
                  </div>
                )}

                {/* Stage B: Entering / Editing Results */}
                {editing ? (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                        {isImaging ? 'Biểu mẫu Kết quả Chẩn đoán Hình ảnh & Thăm dò chức năng' : 'Bảng nhập chỉ số Xét nghiệm Định lượng'}
                      </h3>
                      <button
                        type="button"
                        className="secondary"
                        style={{ color: '#0f766e', borderColor: '#0f766e', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={fillQuickTemplate}
                      >
                        <Sparkles size={14} /> Điền mẫu kết quả chuẩn nhanh
                      </button>
                    </div>

                    {/* Form for Diagnostic Imaging (X-Quang, Siêu âm, ECG, Nội soi) */}
                    {isImaging ? (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                            Vùng khảo sát
                            <input
                              value={editing.surveyArea || ''}
                              placeholder="VD: Lồng ngực và nhu mô phổi 2 bên"
                              onChange={e => setEditing({ ...editing, surveyArea: e.target.value })}
                              style={{ marginTop: '4px' }}
                            />
                          </label>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                            Kỹ thuật chụp / thực hiện
                            <input
                              value={editing.technique || ''}
                              placeholder="VD: Chụp X-quang tim phổi thẳng số hóa thế PA"
                              onChange={e => setEditing({ ...editing, technique: e.target.value })}
                              style={{ marginTop: '4px' }}
                            />
                          </label>
                        </div>

                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          Mô tả hình ảnh tổn thương chuyên môn *
                          <textarea
                            rows={4}
                            value={editing.findings || ''}
                            placeholder="Mô tả chi tiết tổn thương hình ảnh quan sát được..."
                            onChange={e => setEditing({ ...editing, findings: e.target.value })}
                            style={{ marginTop: '4px', width: '100%', fontFamily: 'inherit' }}
                          />
                        </label>

                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          Kết luận Chẩn đoán Hình ảnh (Chuyên môn) *
                          <textarea
                            rows={2}
                            value={editing.conclusion || ''}
                            placeholder="Ghi rõ kết luận chẩn đoán hình ảnh..."
                            onChange={e => setEditing({ ...editing, conclusion: e.target.value })}
                            style={{ marginTop: '4px', width: '100%', fontWeight: 600, color: '#0f766e', fontFamily: 'inherit' }}
                          />
                        </label>

                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          Đề nghị chuyên môn (nếu có)
                          <input
                            value={editing.proposal || ''}
                            placeholder="VD: Đề nghị chụp lại sau điều trị hoặc làm thêm CT-Scanner"
                            onChange={e => setEditing({ ...editing, proposal: e.target.value })}
                            style={{ marginTop: '4px' }}
                          />
                        </label>
                      </div>
                    ) : (
                      /* Form for Laboratory (Huyết học, Sinh hóa) */
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div className="table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>Tên chỉ số xét nghiệm</th>
                                <th>Trị số đo được</th>
                                <th>Đơn vị tính</th>
                                <th>Khoảng tham chiếu chuẩn</th>
                                <th style={{ width: '40px' }} />
                              </tr>
                            </thead>
                            <tbody>
                              {editing.rows?.map((r, i) => (
                                <tr key={i}>
                                  {['name', 'value', 'unit', 'reference'].map(k => (
                                    <td key={k}>
                                      <input
                                        aria-label={k + ' chỉ số ' + (i + 1)}
                                        value={r[k] || ''}
                                        onChange={e =>
                                          setEditing({
                                            ...editing,
                                            rows: editing.rows.map((a, j) => (j === i ? { ...a, [k]: e.target.value } : a))
                                          })
                                        }
                                      />
                                    </td>
                                  ))}
                                  <td>
                                    <button
                                      className="icon-button"
                                      disabled={editing.rows?.length === 1}
                                      aria-label={'Bỏ chỉ số ' + (i + 1)}
                                      onClick={() =>
                                        setEditing({
                                          ...editing,
                                          rows: editing.rows.filter((_, j) => j !== i)
                                        })
                                      }
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <button
                          type="button"
                          className="secondary"
                          style={{ alignSelf: 'flex-start' }}
                          onClick={() =>
                            setEditing({
                              ...editing,
                              rows: [...(editing.rows || []), { name: '', value: '', unit: '', reference: '' }]
                            })
                          }
                        >
                          <Plus size={14} /> Thêm chỉ số đo
                        </button>

                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          Kết luận Xét nghiệm chuyên môn *
                          <textarea
                            rows={2}
                            value={editing.conclusion || ''}
                            placeholder="Ghi nhận kết luận xét nghiệm của Bác sĩ / KTV..."
                            onChange={e => setEditing({ ...editing, conclusion: e.target.value })}
                            style={{ marginTop: '4px', width: '100%', fontFamily: 'inherit' }}
                          />
                        </label>

                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          Cảnh báo giá trị nguy kịch (Panic Value Alert)
                          <select
                            value={editing.critical || 'Không'}
                            onChange={e => setEditing({ ...editing, critical: e.target.value })}
                            style={{ marginTop: '4px', width: '200px' }}
                          >
                            <option value="Không">Không cảnh báo</option>
                            <option value="Có">Cảnh báo nguy kịch (Báo BS ngay)</option>
                          </select>
                        </label>
                      </div>
                    )}

                    {/* Actions when editing */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                      <button
                        className="primary"
                        disabled={saving}
                        onClick={() => action('save')}
                      >
                        {saving ? 'Đang lưu...' : 'Lưu kết quả nháp (Chờ duyệt)'}
                      </button>
                      <button
                        className="secondary"
                        onClick={() => setEditing(null)}
                      >
                        Bỏ thay đổi
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Stage C: Viewing Results or Published Report */
                  <div>
                    {row.status === 'Đã phát hành' ? (
                      <div style={{ padding: '8px 12px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '6px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#065f46', fontWeight: 600 }}>
                        <CheckCircle2 size={16} /> Phiếu kết quả đã ký duyệt & phát hành liên thông
                      </div>
                    ) : null}

                    {/* Display Results Table or Findings */}
                    {row.resultRows?.length ? (
                      <div className="table-scroll" style={{ marginBottom: '16px' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Tên chỉ số / Kỹ thuật</th>
                              <th>Kết quả đo được</th>
                              <th>Đơn vị tính</th>
                              <th>Khoảng tham chiếu chuẩn</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.resultRows.map((r, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 600 }}>{r.name}</td>
                                <td style={{ fontWeight: 700, color: '#0f766e' }}>{r.value}</td>
                                <td>{r.unit}</td>
                                <td style={{ color: '#64748b' }}>{r.reference}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', color: '#334155' }}>
                        {row.result ? <p style={{ margin: 0, lineHeight: 1.6 }}>{row.result}</p> : <p style={{ margin: 0, color: '#94a3b8' }}>Chưa có nội dung kết quả được nhập.</p>}
                      </div>
                    )}

                    {/* Conclusion & Reviewer Box */}
                    <div style={{ padding: '14px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                      <p style={{ margin: '0 0 6px' }}>
                        <b>Kết luận chuyên môn:</b>{' '}
                        <span style={{ color: '#0f766e', fontWeight: 600 }}>{row.conclusion || '—'}</span>
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        <b>Người ký duyệt:</b> {row.reviewer || 'KTV Trưởng / Bác sĩ CĐHA'} · Thời điểm phát hành: {row.releasedAt || 'Chưa duyệt'}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="desk-lab-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {canWrite && !saving && ['Đang thực hiện', 'Chờ duyệt'].includes(row.status) && (
                        <button
                          className="secondary"
                          onClick={() => {
                            setEditing({
                              baseRevision: row.resultRevision || 0,
                              rows: row.resultRows || [
                                {
                                  name: serviceName,
                                  value: row.result || '',
                                  unit: '',
                                  reference: ''
                                }
                              ],
                              conclusion: row.conclusion || '',
                              critical: row.critical || 'Không'
                            });
                          }}
                        >
                          Nhập / Chỉnh sửa kết quả chuyên môn
                        </button>
                      )}

                      {canWrite && !saving && row.status === 'Chờ duyệt' && (
                        <button
                          className="primary"
                          onClick={() => action('publish')}
                        >
                          <Check size={15} /> Ký duyệt & Phát hành kết quả (Gửi về Bác sĩ)
                        </button>
                      )}

                      {canWrite && !saving && row.status === 'Đang thực hiện' && (
                        <button
                          className="primary"
                          onClick={() => {
                            fillQuickTemplate();
                          }}
                        >
                          <Sparkles size={15} /> Nhập kết quả nhanh & Chuẩn bị duyệt
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <p className="form-error" role="alert" style={{ marginTop: '12px' }}>
                    {error}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="desk-empty" style={{ padding: '50px 20px', textAlign: 'center' }}>
              Chưa có chỉ định nào trong phòng này. Bác sĩ ra chỉ định từ Bàn khám hoặc Buồng bệnh nội trú để hệ thống tự động đẩy vào hàng đợi phòng máy.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
