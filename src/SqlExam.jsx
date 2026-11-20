import React, { useState } from 'react';

const statuses = { CHO_KHAM: 'Chờ khám', DANG_KHAM: 'Đang khám', HOAN_TAT_KHAM: 'Hoàn tất khám' };
export default function SqlExam({onExpired}) {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function request(data) {
    const response = await fetch('/api/outpatient/exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (response.status === 401) onExpired();
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  }
  async function run(data) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (data.action !== 'list') {
        await request(data);
        setEditing(null);
      }
      setRows(await request({ action: 'list' }));
    } catch (err) {
      if (data.action === 'list') setRows(null);
      setError(err.message);
    } finally { setBusy(false); }
  }
  return <section className="panel">
    <div className="panel-heading"><div><h2>Bàn khám ngoại trú</h2><p>Hàng đợi SQL Server theo khoa của bác sĩ trong ngày.</p></div></div>
    <form onSubmit={event => { event.preventDefault(); run({ action: 'list' }); }}>
      <button className="secondary" disabled={busy}>{busy ? 'Đang xử lý…' : 'Tải hàng đợi'}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {rows?.length === 0 && <p>Hôm nay chưa có lượt khám trong khoa.</p>}
    {rows?.length > 0 && <div className="table-scroll"><table>
      <thead><tr><th>Số</th><th>Phòng</th><th>Người bệnh</th><th>Mã lượt</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>
        <td>{row.number}</td><td>{row.room}</td><td>{row.patientName}<small>{row.patientId}</small></td>
        <td>{row.id}</td><td>{statuses[row.status] || row.status}</td>
        <td>{row.status === 'CHO_KHAM' && <button type="button" className="primary" disabled={busy}
          onClick={() => run({ action: 'start', visit: row.id })}>Bắt đầu khám</button>}
          {row.status === 'DANG_KHAM' && <button type="button" className="secondary" disabled={busy}
          onClick={() => setEditing(row)}>Ghi kết luận</button>}
          {row.conclusion && <span>{row.conclusion}</span>}</td>
      </tr>)}</tbody>
    </table></div>}
    {editing && <form key={editing.id} onSubmit={event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      run({ action: 'finish', visit: editing.id, history: data.get('history'), conclusion: data.get('conclusion') });
    }}>
      <h3>{editing.patientName} · {editing.patientId} · {editing.id}</h3>
      <p>Lý do khám: {editing.reason}</p>
      <label>Nội dung khám<textarea name="history" maxLength={2000} disabled={busy}/></label>
      <label>Kết luận<textarea name="conclusion" maxLength={500} required disabled={busy}/></label>
      <button className="primary" disabled={busy}>Kết thúc khám không chỉ định</button>
      <button type="button" className="secondary" disabled={busy} onClick={() => setEditing(null)}>Đóng</button>
    </form>}
  </section>;
}
