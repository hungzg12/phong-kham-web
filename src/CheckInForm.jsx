import React, { useState } from 'react';

export default function CheckInForm({ appointment, onExpired, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const fields = new FormData(event.currentTarget);
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/outpatient/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointment.id, reason: fields.get('reason') }),
      });
      if (response.status === 401) onExpired();
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onSaved(result);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return <details>
    <summary>Tiếp đón</summary>
    <form onSubmit={submit}>
      <label>Lý do khám <input name="reason" maxLength={255} required disabled={saving}/></label>
      <button className="primary" disabled={saving}>{saving ? 'Đang cấp số…' : 'Xác nhận và cấp số'}</button>
      {message && <p role="alert">{message}</p>}
    </form>
  </details>;
}
