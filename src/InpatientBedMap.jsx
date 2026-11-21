import React, { useState } from 'react';
import { BedDouble, Search, CheckCircle2, AlertTriangle, User, Stethoscope, Sparkles, Filter, Building2, RefreshCw } from 'lucide-react';
import { hisApi } from './api';

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
  const [selectedDept, setSelectedDept] = useState('Tất cả khoa phòng');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [search, setSearch] = useState('');

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
      <div className="bedmap-header">
        <div>
          <span className="eyebrow">QUẢN TRỊ NỘI TRÚ & ĐIỀU PHỐI BUỒNG GIƯỜNG</span>
          <h2>Sơ đồ buồng giường nội trú toàn viện</h2>
          <p>Theo dõi tình trạng lấp đầy buồng giường, tiếp nhận bệnh nhân và xử lý vệ sinh khử khuẩn chuẩn Viettel HIS.</p>
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
                    <span>Bệnh nhân đã xuất viện. Cần điều dưỡng xác nhận vệ sinh khử khuẩn buồng.</span>
                  </div>
                )}

                {isAvailable && (
                  <div className="bed-available-notice">
                    <CheckCircle2 size={15} />
                    <span>Giường sạch sẽ, đầy đủ drap & thiết bị. Bấm để tiếp nhận người bệnh vào nằm viện.</span>
                  </div>
                )}
              </div>

              <div className="bed-card-footer">
                <span className="bed-action-hint">
                  {isOccupied
                    ? 'Bấm xem hồ sơ / Cho ra viện →'
                    : isCleaning
                    ? 'Bấm xác nhận hoàn tất khử khuẩn →'
                    : 'Bấm tiếp nhận vào giường này →'}
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
