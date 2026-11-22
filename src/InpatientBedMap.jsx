import React, { useState } from 'react';
import { BedDouble, Search, CheckCircle2, AlertTriangle, User, Stethoscope, Sparkles, Filter, Building2, RefreshCw, UserPlus, Clock } from 'lucide-react';
import { hisApi } from './api';
import { useWorkspace } from './workspace';

const DEPARTMENTS = [
  'Tất cả khoa phòng',
  'Khoa Nội tổng quát',
  'Khoa Tim mạch',
  'Khoa Cấp cứu & Hồi sức tích cực (ICU)',
  'Khoa Ngoại tổng hợp',
  'Khoa Sản phụ khoa',
  'Khoa Nhi'
];

export default function InpatientBedMap({ beds, setBeds, patients, role, actor, onSelectBed, notify }) {
  const [admissions] = useWorkspace('admissions');
  const [selectedDept, setSelectedDept] = useState('Tất cả khoa phòng');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  const waitingAdmissions = (admissions || []).filter(a =>
    a.status === 'Chờ xếp buồng' ||
    (!beds.some(b => b.admissionId === a.id || b.patient === a.patientId) && a.status === 'Đang điều trị' && !a.dischargedAt)
  );

  const totalBeds = beds.length;
  const occupiedBeds = beds.filter(b => b.patient).length;
  const availableBeds = beds.filter(b => !b.patient && !b.cleaning).length;
  const cleaningBeds = beds.filter(b => b.cleaning).length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const filteredBeds = beds.filter(b => {
    // Dept filter
    if (selectedDept !== 'Tất cả khoa phòng') {
      const bDept = b.departmentName || b.roomName || '';
      if (!bDept.toLowerCase().includes(selectedDept.toLowerCase().replace('khoa ', ''))) {
        // match partial
        if (selectedDept.includes('Nội') && !bDept.includes('Nội') && bDept !== 'Tầng 2 · Khu A') return false;
      }
    }
    // Status filter
    if (selectedStatus === 'OCCUPIED' && !b.patient) return false;
    if (selectedStatus === 'AVAILABLE' && (b.patient || b.cleaning)) return false;
    if (selectedStatus === 'CLEANING' && !b.cleaning) return false;
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const pName = (patients.find(p => p.id === b.patient)?.name || b.patientName || '').toLowerCase();
      const rName = (b.roomName || '').toLowerCase();
      const bNum = String(b.bedNumber || b.id).toLowerCase();
      if (!pName.includes(q) && !rName.includes(q) && !bNum.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="inpatient-bedmap">
      {/* Header & Department Switcher */}
      <div className="bedmap-header" style={{ marginBottom: '14px', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            Sơ đồ buồng giường nội trú
          </h2>
        </div>
        <div className="bedmap-header-actions">
          <div className="dept-select-wrap">
            <Building2 size={16} />
            <select
              aria-label="Chọn khoa điều trị"
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
            >
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="bedmap-kpis">
        <div className="bed-kpi-card total">
          <div className="kpi-icon"><BedDouble size={22} /></div>
          <div>
            <span className="kpi-label">Tổng số giường</span>
            <b className="kpi-value">{totalBeds} <small>giường</small></b>
          </div>
        </div>
        <div className="bed-kpi-card occupied">
          <div className="kpi-icon"><User size={22} /></div>
          <div>
            <span className="kpi-label">Đang điều trị ({occupancyRate}%)</span>
            <b className="kpi-value text-blue">{occupiedBeds} <small>người bệnh</small></b>
          </div>
        </div>
        <div className="bed-kpi-card available">
          <div className="kpi-icon"><CheckCircle2 size={22} /></div>
          <div>
            <span className="kpi-label">Giường trống sẵn sàng</span>
            <b className="kpi-value text-teal">{availableBeds} <small>sẵn sàng</small></b>
          </div>
        </div>
        <div className="bed-kpi-card cleaning">
          <div className="kpi-icon"><AlertTriangle size={22} /></div>
          <div>
            <span className="kpi-label">Chờ khử khuẩn</span>
            <b className="kpi-value text-amber">{cleaningBeds} <small>cần xử lý</small></b>
          </div>
        </div>
      </div>

      {/* Admission Queue for Nurse */}
      {waitingAdmissions.length > 0 && (
        <div className="inpatient-admission-queue" style={{
          background: '#ffffff',
          border: '1px solid #ccfbf1',
          borderTop: '3px solid #0f766e',
          borderRadius: '8px',
          padding: '14px 16px',
          marginBottom: '18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} style={{ color: '#0f766e' }} />
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f766e' }}>
                Hàng đợi tiếp nhận nội trú · Chờ xếp buồng ({waitingAdmissions.length} người bệnh)
              </h3>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Chỉ định từ Bàn khám Ngoại trú
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '10px' }}>
            {waitingAdmissions.map(adm => {
              const pat = patients.find(p => p.id === adm.patientId) || { name: 'Người bệnh', id: adm.patientId };
              const firstAvailableBed = beds.find(b => !b.patient && !b.cleaning);
              return (
                <div key={adm.id} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <b style={{ fontSize: '13px', color: '#0f172a' }}>{pat.name}</b>
                      <span style={{ fontSize: '11px', background: '#f0fdfa', color: '#0f766e', border: '1px solid #ccfbf1', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                        {adm.department || 'Nội trú'}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                      Mã: {adm.patientId} · BS chỉ định: {adm.doctor || 'Bác sĩ'}
                    </p>
                    {adm.reason && (
                      <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#334155' }}>
                        Lý do: {adm.reason}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: '3px', verticalAlign: '-1px' }} />
                      {adm.time || 'Hôm nay'}
                    </span>
                    <button
                      type="button"
                      className="primary"
                      style={{ fontSize: '12px', padding: '5px 12px', height: 'auto', background: '#0f766e', borderColor: '#0f766e' }}
                      onClick={() => {
                        if (firstAvailableBed) {
                          onSelectBed(firstAvailableBed, adm.patientId);
                        } else {
                          notify('Hiện không còn giường trống nào sẵn sàng. Vui lòng giải phóng hoặc khử khuẩn giường trước.');
                        }
                      }}
                    >
                      Xếp vào giường trống
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Bar & Search */}
      <div className="bedmap-toolbar">
        <div className="bedmap-filter-tabs">
          <button
            type="button"
            className={selectedStatus === 'ALL' ? 'active' : ''}
            onClick={() => setSelectedStatus('ALL')}
          >
            Tất cả ({totalBeds})
          </button>
          <button
            type="button"
            className={selectedStatus === 'OCCUPIED' ? 'active' : ''}
            onClick={() => setSelectedStatus('OCCUPIED')}
          >
            <span className="dot dot-blue" /> Đang sử dụng ({occupiedBeds})
          </button>
          <button
            type="button"
            className={selectedStatus === 'AVAILABLE' ? 'active' : ''}
            onClick={() => setSelectedStatus('AVAILABLE')}
          >
            <span className="dot dot-green" /> Sẵn sàng ({availableBeds})
          </button>
          <button
            type="button"
            className={selectedStatus === 'CLEANING' ? 'active' : ''}
            onClick={() => setSelectedStatus('CLEANING')}
          >
            <span className="dot dot-amber" /> Chờ khử khuẩn ({cleaningBeds})
          </button>
        </div>

        <div className="bedmap-search">
          <Search size={15} />
          <input
            placeholder="Tìm theo số giường, tên buồng hoặc họ tên bệnh nhân..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Bed Cards Grid */}
      <div className="bedmap-grid">
        {filteredBeds.map(b => {
          const isOccupied = !!b.patient;
          const isCleaning = !!b.cleaning;
          const isAvailable = !isOccupied && !isCleaning;
          const patientObj = patients.find(p => p.id === b.patient);
          const patientName = patientObj?.name || b.patientName || 'Chưa xác định';
          const bedNum = b.bedNumber || b.id;
          const roomTitle = b.roomName || 'Buồng bệnh';
          const dailyRate = b.dailyRate ? new Intl.NumberFormat('vi-VN').format(b.dailyRate) + ' đ/ngày' : 'Theo quy định';

          return (
            <div
              key={b.id}
              className={`bed-card ${isOccupied ? 'occupied' : isCleaning ? 'cleaning' : 'available'}`}
              onClick={() => onSelectBed(b)}
            >
              <div className="bed-card-head">
                <span className="bed-room-tag">{roomTitle}</span>
                <span className={`bed-status-pill ${isOccupied ? 'pill-blue' : isCleaning ? 'pill-amber' : 'pill-green'}`}>
                  {isOccupied ? 'Đang điều trị' : isCleaning ? 'Chờ khử khuẩn' : 'Sẵn sàng'}
                </span>
              </div>

              <div className="bed-card-body">
                <div className="bed-identity">
                  <div className="bed-icon-badge">
                    <BedDouble size={20} />
                  </div>
                  <div>
                    <h4 className="bed-num">Giường {bedNum}</h4>
                    <span className="bed-price">{dailyRate}</span>
                  </div>
                </div>

                {isOccupied && (
                  <div className="bed-patient-info">
                    <b className="patient-name">{patientName}</b>
                    <div className="patient-meta">
                      {b.admissionId && <span>Đợt: {b.admissionId}</span>}
                      {patientObj?.gender && <span>{patientObj.gender}</span>}
                    </div>
                  </div>
                )}

                {isCleaning && (
                  <div className="bed-cleaning-notice">
                    <AlertTriangle size={15} />
                    <span>Chờ khử khuẩn buồng</span>
                  </div>
                )}

                {isAvailable && (
                  <div className="bed-available-notice">
                    <CheckCircle2 size={15} />
                    <span>Giường trống · Khả dụng</span>
                  </div>
                )}
              </div>

              <div className="bed-card-footer">
                <span className="bed-action-hint">
                  {isOccupied
                    ? 'Xem hồ sơ / Ra viện'
                    : isCleaning
                    ? 'Xác nhận đã khử khuẩn'
                    : 'Tiếp nhận người bệnh'}
                </span>
              </div>
            </div>
          );
        })}

        {!filteredBeds.length && (
          <div className="bedmap-empty">
            <BedDouble size={48} strokeWidth={1.5} />
            <h3>Không tìm thấy giường bệnh phù hợp</h3>
            <p>Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.</p>
          </div>
        )}
      </div>
    </div>
  );
}
