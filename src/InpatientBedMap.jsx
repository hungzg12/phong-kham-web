import React, { useState } from 'react';
import { BedDouble, Search, CheckCircle2, AlertTriangle, User, Stethoscope, Sparkles, Filter, Building2, RefreshCw, UserPlus, Clock } from 'lucide-react';
import { hisApi } from './api';
import { useWorkspace } from './workspace';


export default function InpatientBedMap({ beds, setBeds, patients, role, actor, onSelectBed, notify }) {
  const [admissions] = useWorkspace('admissions');
  const departments=['Tất cả khoa phòng',...new Set(beds.map(b=>b.departmentName||b.department).filter(Boolean))];
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
    if (selectedDept !== 'Tất cả khoa phòng' && (b.departmentName || b.department) !== selectedDept) return false;
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
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {waitingAdmissions.map((adm, idx) => {
              const pat = patients.find(p => p.id === adm.patientId) || { name: 'Người bệnh', id: adm.patientId };
              const age = pat?.birth ? `${new Date().getFullYear() - Number(String(pat.birth).slice(0, 4))}T` : '';
              const gender = pat?.gender === 'female' || pat?.gender === 'Nữ' ? 'Nữ' : pat?.gender === 'male' || pat?.gender === 'Nam' ? 'Nam' : '';
              const demo = [age, gender].filter(Boolean).join(' · ');
              const firstAvailableBed = beds.find(b => !b.patient && !b.cleaning && (b.departmentName || b.department) === adm.department);
              return (
                <div
                  key={adm.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #0f766e',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px' }}>
                    <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', flexShrink: 0 }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <b style={{ fontSize: '13px', color: '#0f172a' }}>{pat.name}</b>
                        {demo && <span style={{ fontSize: '11px', color: '#64748b' }}>({demo})</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        Mã: {adm.patientId} · Đợt: {adm.id}
                      </div>
                    </div>
                  </div>

                  <div style={{ minWidth: '180px' }}>
                    <span style={{ fontSize: '11px', background: '#f0fdfa', color: '#0f766e', border: '1px solid #ccfbf1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      {adm.department || 'Khoa Nội'}
                    </span>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                      BS: {adm.doctor || 'BS điều trị'}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: '160px', fontSize: '11.5px', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={adm.reason}>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>Lý do: </span>{adm.reason || 'Nhập viện điều trị nội trú'}
                  </div>

                  <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    {adm.time || 'Hôm nay'}
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    <button
                      type="button"
                      className="primary"
                      style={{ fontSize: '12px', padding: '5px 12px', height: 'auto', background: '#0f766e', borderColor: '#0f766e', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
                      onClick={() => {
                        if (firstAvailableBed) {
                          onSelectBed(firstAvailableBed, adm.patientId);
                        } else {
                          notify('Hiện không còn giường trống nào sẵn sàng. Vui lòng giải phóng hoặc khử khuẩn giường trước.');
                        }
                      }}
                    >
                      <UserPlus size={14} /> Xếp buồng ngay
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
              role="button"
              tabIndex={0}
              aria-label={roomTitle+' · Giường '+bedNum+' · '+(isOccupied?'Đang điều trị':isCleaning?'Chờ khử khuẩn':'Sẵn sàng')}
              onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelectBed(b);}}}
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
