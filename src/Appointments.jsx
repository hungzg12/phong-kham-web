import React, { useState, useEffect } from 'react';
import { CalendarDays, List, Plus, Search, Check, X, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { clinics, today } from './business-data';
import './calendar.css';
import { syncWithSqlServer } from './workspace';
import MedicalSuggestInput from './MedicalSuggestInput';

export default function Appointments({ appointments, setAppointments, patients, setPatients, notify, request = 0 }) {
  const [view, setView] = useState('list');
  const [filter, setFilter] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [week, setWeek] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync live appointments from SQL Server database
  const syncFromSql = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/appointments');
      if (!res.ok) throw new Error('Không tải được lịch hẹn.');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAppointments(data.map(row => {
              const id = String(row.id);
              const date = row.day && row.time ? `${row.day}T${row.time}` : (row.date || today + 'T08:30');
              const status = row.status === 'DA_DAT' || row.status === 'Đã đặt' ? 'Đã xác nhận' :
                             row.status === 'DA_CHECK_IN' ? 'Đã tiếp đón' :
                             row.status === 'DA_HUY' ? 'Đã hủy' : (row.status || 'Đã xác nhận');
              return {
                id,
                patientId: row.patientId,
                name: row.name || 'Khách đặt lịch',
                phone: row.phone || '',
                birth: row.birth || '',
                gender: row.gender || 'Nam',
                dept: row.department || row.dept || '',
                room: row.room || '',
                date,
                status,
                cancelReason: row.cancelReason
              };
          }));
        }
      }
    } catch {
      setError('Không tải được lịch hẹn. Kiểm tra kết nối và tải lại trang.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncFromSql();
  }, []);

  useEffect(() => {
    if (request) {
      setError('');
      setModal({});
    }
  }, [request]);

  const monday = new Date(today + 'T12:00:00');
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7 + week * 7);
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const filtered = appointments.filter(a => {
    const query = search.trim().toLowerCase();
    const matchSearch = !query || `${a.name} ${a.phone} ${a.dept} ${a.id}`.toLowerCase().includes(query);
    const matchFilter = filter === 'Tất cả' ? a.status !== 'Đã hủy' : a.status === filter;
    return matchSearch && matchFilter;
  });

  const open = value => {
    setError('');
    setModal(value);
  };

  async function persist(method, body) {
    const response = await fetch('/api/appointments', {method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Không lưu được lịch hẹn.');
    if (!result.id) throw new Error('Máy chủ chưa xác nhận lịch hẹn đã lưu.');
    const record = {...result,dept:result.dept || result.department,date:result.day+'T'+result.time};
    setAppointments(list => [record,...list.filter(a=>a.id!==record.id)]);
    return record;
  }

  async function save(e) {
    e.preventDefault();
    if(saving) return;
    const data=Object.fromEntries(new FormData(e.target));
    const editing=modal?.id;
    setError('');setSaving(true);
    try {
      await persist(editing?'PUT':'POST', {...data,id:editing,name:data.name.trim(),phone:data.phone.trim(),day:data.date.slice(0,10),time:data.date.slice(11)});
      setModal(null);
      notify(editing?'Đã cập nhật lịch hẹn':'Đã đặt lịch hẹn khám thành công');
    } catch(error) { setError(error.message); }
    finally { setSaving(false); }
  }

  async function cancel(e) {
    e.preventDefault();
    if(saving) return;
    const reason=new FormData(e.target).get('reason');
    setError('');setSaving(true);
    try {
      await persist('PATCH',{id:modal.id,reason});
      setModal(null);notify('Đã hủy lịch hẹn');
    } catch(error) { setError(error.message); }
    finally { setSaving(false); }
  }

  async function checkIn(a) {
    if(saving) return;
    setError('');setSaving(true);
    try {
      const response=await fetch('/api/visits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({appointmentId:a.id,patientId:a.patientId})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error || 'Không thể tiếp đón người bệnh.');
      await syncFromSql();
      await syncWithSqlServer();
      setModal(null);
      notify('Đã tiếp đón thành công! STT '+result.queueNumber+' tại '+result.roomName);
    } catch(error) {setError('Lỗi tiếp đón: '+error.message);}
    finally {setSaving(false);}
  }

  const statusClass = s => (s === 'Đã hủy' ? 'danger' : s === 'Đã tiếp đón' ? 'teal' : 'amber');

  const totalActive = appointments.filter(a => a.status !== 'Đã hủy').length;
  const pendingCount = appointments.filter(a => a.status === 'Đã xác nhận').length;
  const checkedInCount = appointments.filter(a => a.status === 'Đã tiếp đón').length;

  return (
    <>
      <div className="business-summary">
        <div>
          <span><CalendarDays size={18} />Tổng lịch hẹn</span>
          <b>{totalActive}</b>
        </div>
        <div>
          <span><Clock3 size={18} />Chờ tiếp đón</span>
          <b>{pendingCount}</b>
        </div>
        <div>
          <span><Check size={18} />Đã tiếp đón</span>
          <b>{checkedInCount}</b>
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Lịch hẹn khám bệnh</h2>
            <p>Đặt lịch, đổi lịch và check-in khi người bệnh đến khám.</p>
          </div>
          <div className="row-actions">
            <div className="view-toggle">
              <button
                className={view === 'list' ? 'selected' : ''}
                onClick={() => setView('list')}
                aria-label="Xem danh sách"
              >
                <List size={16} />
              </button>
              <button
                className={view === 'calendar' ? 'selected' : ''}
                onClick={() => setView('calendar')}
                aria-label="Xem lịch tuần"
              >
                <CalendarDays size={16} />
              </button>
            </div>
            <button className="primary" onClick={() => open({})}>
              <Plus size={15} />Đặt lịch
            </button>
          </div>
        </div>

        <div className="table-tools">
          <label className="search">
            <Search size={15} />
            <input
              aria-label="Tìm lịch hẹn"
              placeholder="Họ tên, số điện thoại, mã lịch..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
          <select aria-label="Trạng thái lịch hẹn" value={filter} onChange={e => setFilter(e.target.value)}>
            {['Tất cả', 'Đã xác nhận', 'Đã tiếp đón', 'Đã hủy'].map(s => <option key={s}>{s}</option>)}
          </select>
          {view === 'calendar' && (
            <div className="calendar-controls">
              <button className="icon-button" aria-label="Tuần trước" onClick={() => setWeek(week - 1)}>
                <ChevronLeft size={16} />
              </button>
              <b>
                {dates[0].slice(5)} — {dates[6].slice(5)}, {monday.getFullYear()}
              </b>
              <button className="icon-button" aria-label="Tuần sau" onClick={() => setWeek(week + 1)}>
                <ChevronRight size={16} />
              </button>
              <button className="text-button" onClick={() => setWeek(0)}>
                Tuần này
              </button>
            </div>
          )}
        </div>

        {view === 'list' ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>NGƯỜI BỆNH</th>
                    <th>CHUYÊN KHOA</th>
                    <th>THỜI GIAN HẸN</th>
                    <th>TRẠNG THÁI</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id}>
                      <td>
                        <b>{a.name}</b>
                        {a.phone && <small style={{ display: 'block', color: '#64748b' }}>{a.phone}</small>}
                      </td>
                      <td>
                        <span>{a.dept}</span>
                        {a.room && <small style={{ display: 'block', color: '#64748b' }}>{a.room}</small>}
                      </td>
                      <td>
                        <b>{a.date ? a.date.replace('T', ' · ') : '—'}</b>
                        <small style={{ display: 'block', color: '#64748b' }}>{a.id}</small>
                      </td>
                      <td>
                        <span className={'badge ' + statusClass(a.status)}>{a.status}</span>
                      </td>
                      <td>
                        <div className="row-actions">
                          {a.status === 'Đã xác nhận' && (
                            <>
                              <button className="secondary" onClick={() => open({ ...a, mode: 'checkin' })}>
                                Check-in
                              </button>
                              <button className="secondary" onClick={() => open(a)}>
                                Đổi lịch
                              </button>
                              <button
                                className="icon-button"
                                aria-label={'Hủy lịch ' + a.name}
                                onClick={() => open({ ...a, mode: 'cancel' })}
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtered.length && (
              <div className="business-empty">
                <CalendarDays size={35} />
                <h3>Chưa có lịch hẹn phù hợp</h3>
                <p>Nhấn Đặt lịch để thêm lịch khám cho người bệnh.</p>
              </div>
            )}
          </>
        ) : (
          <div className="week-scroll">
            <div className="week-calendar">
              {dates.map((date, i) => (
                <div className={'calendar-day ' + (date === today ? 'is-today' : '')} key={date}>
                  <header>
                    <span>{['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'][i]}</span>
                    <b>{date.slice(8)}</b>
                  </header>
                  <div>
                    {filtered
                      .filter(a => a.date.startsWith(date))
                      .map(a => (
                        <button
                          className={'calendar-event ' + (a.status === 'Đã hủy' ? 'cancelled' : '')}
                          key={a.id}
                          onClick={() => open({ ...a, mode: a.status === 'Đã xác nhận' ? 'checkin' : 'view' })}
                        >
                          <b>
                            {a.date.slice(11)} · {a.name}
                          </b>
                          <small>{a.dept}</small>
                          <span>{a.status}</span>
                        </button>
                      ))}
                    <button
                      className="calendar-add"
                      aria-label={'Thêm lịch ngày ' + date}
                      onClick={() => open({ date: date + 'T09:00' })}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {error && !modal && <p className="form-error" role="alert">{error}</p>}

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-label="Lịch hẹn" onClick={e => e.stopPropagation()}>
            <button className="close icon-button" aria-label="Đóng lịch hẹn" onClick={() => setModal(null)}>
              <X size={20} />
            </button>
            {modal.mode === 'checkin' || modal.mode === 'view' ? (
              <>
                <h2>{modal.mode === 'checkin' ? 'Check-in người bệnh' : 'Thông tin lịch hẹn'}</h2>
                <div className="detail-list">
                  <div><span>Họ tên</span><b>{modal.name}</b></div>
                  <div><span>Điện thoại</span><b>{modal.phone}</b></div>
                  <div><span>Chuyên khoa</span><b>{modal.dept}</b></div>
                  <div><span>Ngày giờ</span><b>{modal.date ? modal.date.replace('T', ' · ') : ''}</b></div>
                  <div><span>Trạng thái</span><b>{modal.status}</b></div>
                </div>
                {modal.mode === 'checkin' && (
                  <>
                    <div className="inline-notice">
                      Kiểm tra lại danh tính người bệnh trước khi chuyển vào danh sách chờ khám. Hồ sơ mới sẽ dùng ngày sinh và giới tính đã khai báo khi đặt lịch.
                    </div>
                    {error && <p className="form-error" role="alert">{error}</p>}
                    <button className="primary full" disabled={saving} onClick={() => checkIn(modal)}>
                      <Check size={16} />Xác nhận người bệnh đã đến
                    </button>
                  </>
                )}
              </>
            ) : modal.mode === 'cancel' ? (
              <>
                <h2>Hủy lịch hẹn</h2>
                <p>{modal.name} · {modal.date ? modal.date.replace('T', ' · ') : ''}</p>
                <form
                  onSubmit={cancel}
                >
                  <label>Lý do hủy
                    <MedicalSuggestInput type="cancel" name="reason" multiline rows={2} required maxLength={500} placeholder="Nhập hoặc chọn lý do hủy lịch hẹn..." />
                  </label>
                  {error && <p className="form-error" role="alert">{error}</p>}
                  <button className="primary full" disabled={saving}>Xác nhận hủy lịch</button>
                </form>
              </>
            ) : (
              <>
                <h2>{modal.id ? 'Cập nhật lịch hẹn' : 'Đặt lịch khám'}</h2>
                <p>Điền thông tin để chuẩn bị cho lượt khám.</p>
                <form onSubmit={save}>
                  <label>Họ tên<input name="name" required defaultValue={modal.name} placeholder="Họ tên bệnh nhân" /></label>
                  <div className="form-row">
                    <label>Ngày sinh<input name="birth" type="date" max={today} required defaultValue={modal.birth || '1990-01-01'} /></label>
                    <label>Giới tính
                      <select name="gender" defaultValue={modal.gender || 'Nam'}>
                        <option>Nam</option>
                        <option>Nữ</option>
                        <option>Khác</option>
                      </select>
                    </label>
                  </div>
                  <label>Số điện thoại<input name="phone" type="tel" required pattern="[0-9]{10,11}" defaultValue={modal.phone} placeholder="09xxxxxxxx" /></label>
                  <label>Chuyên khoa
                    <select name="dept" required defaultValue={modal.dept || ''}>
                      <option value="">Chọn chuyên khoa</option>
                      {clinics.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </label>
                  <label>Ngày giờ khám<input type="datetime-local" name="date" min={today + 'T00:00'} required defaultValue={modal.date || today + 'T08:30'} /></label>
                  {error && <p className="form-error" role="alert">{error}</p>}
                  <button className="primary full" disabled={saving}>{modal.id ? 'Lưu lịch hẹn' : 'Xác nhận đặt lịch'}</button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
