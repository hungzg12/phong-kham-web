import CheckInForm from './CheckInForm.jsx';
import React, { useEffect, useState } from 'react';

const statuses = {
  DA_DAT: 'Đã đặt',
  DA_CHECK_IN: 'Đã tiếp nhận',
  HOAN_TAT: 'Hoàn tất',
  DA_HUY: 'Đã hủy',
  QUA_HEN: 'Quá hẹn',
};

export default function SqlAppointments({onExpired}) {
  const [receipt, setReceipt] = useState(null);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ rows: null, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/appointments', { signal: controller.signal, cache: "no-store" });
        if (response.status === 401) onExpired();
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setResult({ rows: data, error: '' });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ rows: null, error: error.message });
      }
    }
    load();
    return () => controller.abort();
  }, [revision, onExpired]);

  return <section className="panel">
    <div className="panel-heading"><div><h2>Danh sách lịch hẹn</h2><p>Lịch đã lưu vào SQL Server</p></div>
        <button className="secondary" type="button" onClick={()=>{
          setResult({rows:null,error:''});
          setRevision(previous=>previous+1);
        }}>Tải lại lịch hẹn</button></div>
    {receipt && <p role="status">Đã cấp số {receipt.queueNumber} · Mã lượt {receipt.visitId}</p>}
    {result.error && <p role="alert">{result.error}</p>}
    {!result.error && !result.rows && <p role="status">Đang tải lịch hẹn…</p>}
    {result.rows?.length === 0 && <p>Chưa có lịch hẹn.</p>}
    {result.rows?.length > 0 && <div className="table-scroll">
      <table>
        <thead><tr><th>Mã lịch</th><th>Ngày giờ</th><th>Chuyên khoa</th><th>Phòng</th><th>Trạng thái</th><th>Lượt khám</th></tr></thead>
        <tbody>{result.rows.map(row => <tr key={row.id}>
          <td>{row.id}</td><td>{row.day.split('-').reverse().join('/')} · {row.time}</td>
          <td>{row.department}</td><td>{row.room}</td><td>{statuses[row.status] || row.status}{row.possibleDuplicate&&<small> · Có hồ sơ nghi trùng, đối chiếu trước khi tiếp nhận</small>}</td><td>{row.visitId ? row.queueNumber + ' · ' + row.visitId : row.canCheckIn ? <CheckInForm appointment={row} onExpired={onExpired} onSaved={result => { setReceipt(result); setRevision(previous => previous + 1); }}/> : '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </section>;
}
