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
    <h2>Lịch hẹn từ SQL Server</h2>
    <button type="button" onClick={() => setRevision(previous => previous + 1)}>Tải lại</button>
    {result.error && <p role="alert">{result.error}</p>}
    {!result.error && !result.rows && <p role="status">Đang tải lịch hẹn…</p>}
    {result.rows?.length === 0 && <p>Chưa có lịch hẹn.</p>}
    {result.rows?.length > 0 && <div style={{ overflowX: 'auto' }}>
      <table>
        <thead><tr><th>Người bệnh</th><th>Mã lịch</th><th>Ngày giờ</th><th>Chuyên khoa</th><th>Phòng khám</th><th>Trạng thái</th></tr></thead>
        <tbody>{result.rows.map(row => <tr key={row.id}>
          <td><b>{row.name}</b>{row.phone && <small style={{ display: 'block', color: '#64748b' }}>{row.phone}</small>}</td>
          <td><code>{row.id}</code></td>
          <td>{row.day.split('-').reverse().join('/')} · {row.time}</td>
          <td>{row.department}</td>
          <td>{row.room}</td>
          <td><span className={'badge ' + (row.status === 'DA_DAT' ? 'teal' : 'gray')}>{statuses[row.status] || row.status}</span></td>
        </tr>)}</tbody>
      </table>
    </div>}
  </section>;
}
