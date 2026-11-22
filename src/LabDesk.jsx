import React, { useState } from 'react';
import { Search, Plus, Trash2, Printer, Check, Sparkles, Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock, User, Building2, Stethoscope, FileText, Camera } from 'lucide-react';
import { useWorkspace, transact } from './workspace';
import { actorRoles, canAction } from './roles';
import { hisApi } from './api';
import { parseBhytCard } from './bhyt-utils';

export const LAB_ROOMS = [
  { id: 'ALL', name: 'Tất cả phòng CLS toàn viện', dept: 'Toàn viện' },
  { id: 'P_XQ_01', name: 'Phòng X-Quang Kỹ thuật số', dept: 'Khoa CĐHA', match: (s='',k='',c='') => s.includes('quang') || s.includes('xray') || s.includes('x-quang') || c.includes('xq') },
  { id: 'P_CT_01', name: 'Phòng Cắt lớp vi tính (CT Scanner)', dept: 'Khoa CĐHA', match: (s='',k='',c='') => s.includes('ct') || s.includes('cắt lớp') || s.includes('scanner') || c.includes('ct') },
  { id: 'P_SA_01', name: 'Phòng Siêu âm Tổng quát & Doppler', dept: 'Khoa CĐHA', match: (s='',k='',c='') => s.includes('siêu âm') || s.includes('sieu_am') || c.includes('sa') },
  { id: 'P_XN_HH', name: 'Phòng Xét nghiệm Huyết học & Truyền máu', dept: 'Khoa Xét nghiệm', match: (s='',k='',c='') => s.includes('máu') || s.includes('công thức') || s.includes('huyết học') || c.includes('hh') },
  { id: 'P_XN_SH', name: 'Phòng Xét nghiệm Sinh hóa & Miễn dịch', dept: 'Khoa Xét nghiệm', match: (s='',k='',c='') => s.includes('đường') || s.includes('glucose') || s.includes('men gan') || s.includes('ast') || s.includes('alt') || s.includes('creatinin') || s.includes('ure') || s.includes('lipid') || s.includes('mỡ') || c.includes('sh') },
  { id: 'P_TDCN_01', name: 'Phòng Điện tim & Thăm dò chức năng', dept: 'Khoa CĐHA', match: (s='',k='',c='') => s.includes('điện tim') || s.includes('ecg') || s.includes('hô hấp') || s.includes('thông khí') },
  { id: 'P_NS_01', name: 'Phòng Nội soi Tiêu hóa & TMH', dept: 'Khoa CĐHA', match: (s='',k='',c='') => s.includes('nội soi') || s.includes('tai mũi họng') || c.includes('ns') }
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
  const [selectedGroupKey, setSelectedGroupKey] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [scoped, setScoped] = useState(true);

  const scope = scoped ? clinicalContext : null;
  const roomDef = LAB_ROOMS.find(r => r.id === selectedRoom);

  // 1. Filter rows by room and search criteria
  const allFilteredLabs = db.labs
    .filter(l => !scope || (l.patient === scope.patientId && l.episodeId === scope.episodeId))
    .filter(l => role !== 'doctor' || allowed.has(l.episodeId))
    .filter(l => {
      if (!roomDef || roomDef.id === 'ALL') return true;
      const sObj = db.services.find(s => s.id === l.service);
      const sName = (sObj?.name || l.service || '').toLowerCase();
      const sKind = (sObj?.kind || '').toLowerCase();
      const sId = (l.service || '').toLowerCase();
      return roomDef.match ? roomDef.match(sName, sKind, sId) : true;
    })
    .filter(l => (!status || l.status === status) && (l.id + ' ' + (patients.find(p => p.id === l.patient)?.name || '')).toLowerCase().includes(query.toLowerCase()));

  // 2. Group by Patient & Episode so EACH PATIENT APPEARS EXACTLY ONCE IN THE QUEUE
  const patientGroups = [];
  const patientGroupMap = new Map();

  for (const lab of allFilteredLabs) {
    const key = `${lab.patient}_${lab.episodeId}`;
    if (!patientGroupMap.has(key)) {
      const pObj = patients.find(p => p.id === lab.patient);
      const group = {
        key,
        patientId: lab.patient,
        patientName: pObj?.name || lab.patient,
        patientObj: pObj || { name: 'Người bệnh', id: lab.patient },
        episodeId: lab.episodeId,
        date: lab.date,
        doctor: lab.doctor,
        diagnosis: lab.diagnosis,
        services: [],
        counts: { wait: 0, inProgress: 0, done: 0, total: 0 }
      };
      patientGroupMap.set(key, group);
      patientGroups.push(group);
    }
    const g = patientGroupMap.get(key);
    g.services.push(lab);
    g.counts.total++;
    if (lab.status === 'Chờ tiếp nhận') g.counts.wait++;
    else if (lab.status === 'Đang thực hiện') g.counts.inProgress++;
    else if (lab.status === 'Đã phát hành') g.counts.done++;
  }

  // Active group & active service
  const activeGroup = patientGroups.find(g => g.key === selectedGroupKey) || patientGroups[0];
  const row = activeGroup?.services.find(s => s.id === selectedServiceId) || activeGroup?.services[0];
  const canWrite = canAction(role, 'labs', 'accept');

  // Identify active service details
  const currentService = db.services.find(s => s.id === row?.service);
  const serviceName = currentService?.name || row?.service || 'Dịch vụ CLS';
  const isImaging = currentService?.kind === 'Chẩn đoán hình ảnh' || serviceName.toLowerCase().includes('quang') || serviceName.toLowerCase().includes('siêu âm') || serviceName.toLowerCase().includes('điện tim') || serviceName.toLowerCase().includes('nội soi');
  const patientObj = activeGroup?.patientObj || { name: 'Người bệnh', id: row?.patient || 'BN-Chưa xác định' };

  async function action(kind, targetLabId) {
    const targetId = targetLabId || row?.id;
    const targetRow = activeGroup?.services.find(s => s.id === targetId) || row;
    if (saving || !targetRow) return;
    setError('');
    setSaving(true);
    try {
      const saved = await hisApi.labAction({
        id: targetRow.id,
        action: kind,
        role,
        staffId: actor.staffId || 'NV-KTV01',
        revision: kind === 'save' ? (editing?.baseRevision || 0) : (targetRow.resultRevision || 0),
        rows: editing?.rows,
        conclusion: editing?.conclusion,
        critical: editing?.critical
      });
      transact(d => {
        d.business.labs = d.business.labs.map(r => r.id === saved.id ? saved : r);
      });
      setEditing(null);
      if (kind === 'publish') {
        notify(`Đã ký duyệt & phát hành kết quả ${targetRow.id}! Kết quả đã gửi liên thông về Bàn khám Bác sĩ.`);
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

  async function batchAcceptServices() {
    if (!activeGroup || saving) return;
    const waiting = activeGroup.services.filter(s => s.status === 'Chờ tiếp nhận');
    if (!waiting.length) return;
    setSaving(true);
    setError('');
    try {
      for (const item of waiting) {
        const saved = await hisApi.labAction({
          id: item.id,
          action: 'accept',
          role,
          staffId: actor.staffId || 'NV-KTV01',
          revision: item.resultRevision || 0
        });
        transact(d => {
          d.business.labs = d.business.labs.map(r => r.id === saved.id ? saved : r);
        });
      }
      notify(`Đã tiếp nhận toàn bộ ${waiting.length} dịch vụ cho người bệnh ${patientObj.name}`);
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
            setSelectedGroupKey('');
            setSelectedServiceId('');
            setEditing(null);
          }}
          style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: 600, color: '#0f766e', minWidth: '320px', background: '#f8fafc' }}
        >
          {LAB_ROOMS.map(r => {
            const countInRoom = db.labs.filter(l => {
              if (r.id === 'ALL') return true;
              const sObj = db.services.find(s => s.id === l.service);
              const sName = (sObj?.name || l.service || '').toLowerCase();
              const sKind = (sObj?.kind || '').toLowerCase();
              const sId = (l.service || '').toLowerCase();
              return r.match ? r.match(sName, sKind, sId) : true;
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
            Chờ tiếp nhận: {allFilteredLabs.filter(r => r.status === 'Chờ tiếp nhận').length}
          </span>
          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
            Đang làm: {allFilteredLabs.filter(r => r.status === 'Đang thực hiện').length}
          </span>
          <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
            Đã có KQ: {allFilteredLabs.filter(r => r.status === 'Đã phát hành').length}
          </span>
        </div>
      </div>

      {/* 3. Main Split Desk Layout */}
      <div className="desk-layout" style={{ gridTemplateColumns: 'minmax(350px, 24vw) minmax(0, 1fr)', gap: '18px' }}>
        {/* Left Side: Patient Queue Grouped by Patient */}
        <aside className="desk-queue" style={{ maxHeight: '82vh' }}>
          <div className="desk-queue-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> Hàng đợi bệnh nhân ({patientGroups.length})
            </span>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
              {allFilteredLabs.length} chỉ định
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
            <option value="Đã phát hành">Đã phát hành (Đã gửi BS)</option>
          </select>

          <div className="desk-patient-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {patientGroups.map((g, idx) => {
              const p = g.patientObj;
              const isSelected = activeGroup?.key === g.key;
              const age = p?.birth ? `${new Date().getFullYear() - Number(String(p.birth).slice(0, 4))}T` : '';
              const gender = p?.gender === 'female' || p?.gender === 'Nữ' ? 'Nữ' : p?.gender === 'male' || p?.gender === 'Nam' ? 'Nam' : '';
              const demo = [age, gender].filter(Boolean).join('·');
              const doctorStaff = db.staff.find(st => st.id === g.doctor);
              const doctorShort = doctorStaff?.name?.replace(/^BS(\.CK[I|II])?\s*/, '') || g.doctor || '';

              // Consolidated status
              let statusLabel = 'Chờ TN';
              let statusClass = 'amber';
              if (g.counts.done === g.counts.total) {
                statusLabel = `Đã có KQ (${g.counts.done}/${g.counts.total})`;
                statusClass = 'teal';
              } else if (g.counts.inProgress > 0) {
                statusLabel = `Đang làm (${g.counts.inProgress + g.counts.done}/${g.counts.total})`;
                statusClass = 'blue';
              } else {
                statusLabel = `Chờ TN (${g.counts.wait})`;
                statusClass = 'amber';
              }

              // Service summary string
              const serviceNames = g.services.map(s => {
                const sObj = db.services.find(x => x.id === s.service);
                return sObj?.name || s.service;
              }).join(', ');

              return (
                <button
                  key={g.key}
                  aria-pressed={isSelected}
                  style={{
                    border: isSelected ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
                    borderLeft: isSelected ? '4px solid #0f766e' : '3px solid #cbd5e1',
                    background: isSelected ? '#f0fdfa' : '#ffffff',
                    padding: '8px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    textAlign: 'left',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    minHeight: '52px',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 1px 4px rgba(15,118,110,0.12)' : 'none'
                  }}
                  onClick={() => {
                    if (editing && !window.confirm('Bỏ kết quả chưa lưu để chuyển người bệnh?')) return;
                    setSelectedGroupKey(g.key);
                    setSelectedServiceId(g.services[0]?.id || '');
                    setEditing(null);
                    setError('');
                  }}
                  title={`${g.patientName} — ${g.counts.total} dịch vụ: ${serviceNames}`}
                >
                  {/* Line 1: STT + Full Patient Name + Demographics + Urgent Tag */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                      <span style={{ background: isSelected ? '#ccfbf1' : '#f1f5f9', color: isSelected ? '#0f766e' : '#475569', fontSize: '11px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <b style={{ fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {g.patientName}
                      </b>
                      {demo && <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>({demo})</span>}
                    </div>
                    {(() => {
                      const bh = parseBhytCard(g.patientObj?.insurance);
                      return bh.hasInsurance ? (
                        <span className={`badge ${bh.benefitBadgeClass}`} style={{ fontSize: '9.5px', padding: '1px 5px', fontWeight: 600, flexShrink: 0 }}>
                          {bh.benefitBadge}
                        </span>
                      ) : (
                        <span style={{ fontSize: '9.5px', padding: '1px 5px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '3px', flexShrink: 0 }}>
                          Viện phí
                        </span>
                      );
                    })()}
                  </div>

                  {/* Line 2: Service count & names summary + Episode ID + Consolidated Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', width: '100%', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    <span style={{ color: '#0f766e', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }} title={serviceNames}>
                      {g.counts.total} DV: {serviceNames}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ color: '#94a3b8', fontSize: '10px', whiteSpace: 'nowrap' }}>
                        {g.episodeId}
                      </span>
                      <span className={`badge ${statusClass}`} style={{ fontSize: '9.5px', padding: '1px 6px', whiteSpace: 'nowrap' }}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
            {!patientGroups.length && (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                Không có người bệnh chờ tại phòng này.
              </div>
            )}
          </div>
        </aside>

        {/* Right Side: Technician Workstation */}
        <div className="desk-workspace" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
          {activeGroup && row ? (
            <>
              {/* Card 1: Patient Details & Doctor's Clinical Order Info */}
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>
                        {patientObj.name}
                      </h3>
                      <span style={{ background: '#e2e8f0', color: '#334155', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        Mã BN: {patientObj.id}
                      </span>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        {patientObj.gender || 'Nam'} · {patientObj.birth ? new Date().getFullYear() - Number(patientObj.birth.slice(0, 4)) : '45'} tuổi
                      </span>
                      {(() => {
                        const bh = parseBhytCard(patientObj.insurance);
                        return bh.hasInsurance ? (
                          <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            BHYT: {bh.code} ({bh.summary} · {bh.groupName})
                          </span>
                        ) : (
                          <span style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            Đối tượng: Viện phí (Khám tự chi trả)
                          </span>
                        );
                      })()}
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#475569' }}>
                      Đợt/Lượt khám: <b>{activeGroup.episodeId}</b> · Thời điểm chỉ định: <b>{activeGroup.date || 'Hôm nay'}</b> · Mã phiếu: <b>{row.id}</b>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: row.status === 'Đã phát hành' ? '#dcfce7' : row.status === 'Đang thực hiện' ? '#e0f2fe' : '#fef3c7', color: row.status === 'Đã phát hành' ? '#166534' : row.status === 'Đang thực hiện' ? '#0369a1' : '#92400e' }}>
                      {row.status === 'Đã phát hành' ? '✓ ĐÃ PHÁT HÀNH (ĐÃ GỬI BÁC SĨ)' : row.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Clinical Context Box (Bác sĩ chỉ định & Chẩn đoán lâm sàng) */}
                <div style={{ marginTop: '12px', padding: '12px 16px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 24px', fontSize: '12.5px' }}>
                  <div style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#1e40af', fontWeight: 600 }}>Bác sĩ chỉ định:</span>{' '}
                    <b style={{ color: '#0f172a' }}>{db.staff.find(s => s.id === activeGroup.doctor)?.name || activeGroup.doctor}</b>{' '}
                    <span style={{ color: '#475569' }}>(Khoa Khám bệnh / Nội trú)</span>
                  </div>
                  <div style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#1e40af', fontWeight: 600 }}>Tổng số chỉ định:</span>{' '}
                    <b style={{ color: '#0f766e' }}>{activeGroup.services.length} dịch vụ kỹ thuật</b>
                  </div>
                  <div style={{ width: '100%', display: 'flex', gap: '6px', alignItems: 'baseline', marginTop: '2px' }}>
                    <span style={{ color: '#1e40af', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>Chẩn đoán sơ bộ:</span>{' '}
                    <span style={{ color: '#b91c1c', fontWeight: 700 }}>
                      {activeGroup.diagnosis || 'Theo dõi lâm sàng và chỉ định cận lâm sàng đánh giá'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Segmented Service Selector Tabs (Show all services ordered for this patient) */}
              <div style={{ display: 'flex', gap: '8px', padding: '10px 20px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Activity size={14} style={{ color: '#0f766e' }} /> Chọn dịch vụ:
                </span>
                {activeGroup.services.map((sItem, sIdx) => {
                  const serv = db.services.find(x => x.id === sItem.service);
                  const sName = serv?.name || sItem.service;
                  const isAct = row?.id === sItem.id;
                  const sBadge = sItem.status === 'Đã phát hành' ? '✓ Đã có KQ' : sItem.status === 'Đang thực hiện' ? 'Đang làm' : 'Chờ TN';
                  const sBadgeColor = sItem.status === 'Đã phát hành' ? '#166534' : sItem.status === 'Đang thực hiện' ? '#0369a1' : '#b45309';
                  const sBadgeBg = sItem.status === 'Đã phát hành' ? '#dcfce7' : sItem.status === 'Đang thực hiện' ? '#e0f2fe' : '#fef3c7';

                  return (
                    <button
                      key={sItem.id}
                      type="button"
                      onClick={() => {
                        if (editing && !window.confirm('Bỏ kết quả chưa lưu để chuyển dịch vụ?')) return;
                        setSelectedServiceId(sItem.id);
                        setEditing(null);
                        setError('');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: isAct ? 700 : 500,
                        border: isAct ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                        background: isAct ? '#f0fdfa' : '#ffffff',
                        color: isAct ? '#0f766e' : '#334155',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                        boxShadow: isAct ? '0 1px 3px rgba(15,118,110,0.1)' : 'none'
                      }}
                    >
                      <span>{sIdx + 1}. {sName}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: sBadgeColor, background: sBadgeBg, padding: '1px 5px', borderRadius: '4px' }}>
                        {sBadge}
                      </span>
                    </button>
                  );
                })}

                {canWrite && activeGroup.services.some(s => s.status === 'Chờ tiếp nhận') && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={batchAcceptServices}
                    disabled={saving}
                    style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '11.5px', fontWeight: 600, color: '#0f766e', borderColor: '#0f766e', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Tiếp nhận đồng thời tất cả các chỉ định đang chờ của bệnh nhân này"
                  >
                    <Check size={13} /> Tiếp nhận tất cả ({activeGroup.services.filter(s => s.status === 'Chờ tiếp nhận').length} DV)
                  </button>
                )}
              </div>

              {/* Card 2: Technician Result Entry or Result Presentation */}
              <div style={{ padding: '20px' }}>
                {/* Active Service Banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#ccfbf1', color: '#0f766e', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
                      Đang xử lý
                    </span>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                      {serviceName}
                    </h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>({row.id})</span>
                  </div>
                  {row.status !== 'Chờ tiếp nhận' && !editing && (
                    <button
                      type="button"
                      className="secondary"
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => window.print()}
                    >
                      <Printer size={13} /> In kết quả dịch vụ này
                    </button>
                  )}
                </div>

                {/* Stage A: When Waiting for Check-in */}
                {row.status === 'Chờ tiếp nhận' && !editing && (
                  <div style={{ padding: '28px', textAlign: 'center', background: '#fafaf9', borderRadius: '8px', border: '1.5px dashed #cbd5e1' }}>
                    <Activity size={32} style={{ color: '#0f766e', margin: '0 auto 8px' }} />
                    <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#1e293b' }}>
                      Chỉ định "{serviceName}" đang chờ tiếp nhận
                    </h3>
                    <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>
                      Bệnh nhân đang ở phòng chờ. Kỹ thuật viên tiếp nhận để bắt đầu thực hiện kỹ thuật và nhập kết quả.
                    </p>
                    {canWrite ? (
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="primary"
                          style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 600, background: '#0f766e', borderColor: '#0f766e', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          disabled={saving}
                          onClick={async () => {
                            await action('accept');
                            fillQuickTemplate();
                          }}
                        >
                          <Sparkles size={15} /> Tiếp nhận & Điền mẫu chuẩn ngay
                        </button>
                        <button
                          className="secondary"
                          style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500 }}
                          disabled={saving}
                          onClick={() => action('accept')}
                        >
                          Tiếp nhận vào phòng máy
                        </button>
                      </div>
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
