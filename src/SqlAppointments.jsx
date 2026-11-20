import React, { useEffect, useState } from 'react';

const statuses = {
  DA_DAT: 'Đã đặt',
  DA_CHECK_IN: 'Đã tiếp nhận',
  HOAN_TAT: 'Hoàn tất',
  DA_HUY: 'Đã hủy',
  QUA_HEN: 'Quá hẹn',
};

export default function SqlAppointments() {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ rows: null, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/appointments', { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setResult({ rows: data, error: '' });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ rows: null, error: error.message });
      }
    }
    load();
    return () => controller.abort();
  }, [revision]);

  return <section className="panel">
    <div className="panel-heading"><div><h2>Danh sách lịch hẹn</h2><p>Lịch đã lưu vào SQL Server</p></div>
    <button className="secondary" type="button" onClick={() => setRevision(previous => previous + 1)}>Tải lại</button></div>
    {result.error && <p role="alert">{result.error}</p>}
    {!result.error && !result.rows && <p role="status">Đang tải lịch hẹn…</p>}
    {result.rows?.length === 0 && <p>Chưa có lịch hẹn.</p>}
    {result.rows?.length > 0 && <div className="table-scroll">
      <table>
        <thead><tr><th>Mã lịch</th><th>Ngày giờ</th><th>Chuyên khoa</th><th>Phòng</th><th>Trạng thái</th></tr></thead>
        <tbody>{result.rows.map(row => <tr key={row.id}>
          <td>{row.id}</td><td>{row.day.split('-').reverse().join('/')} · {row.time}</td>
          <td>{row.department}</td><td>{row.room}</td><td>{statuses[row.status] || row.status}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </section>;
}
