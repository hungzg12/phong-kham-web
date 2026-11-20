import React, {useEffect, useId, useRef} from 'react';

export default function StatDetails({title, rows, patients = [], onClose}) {
  const dialog = useRef(null);
  const titleId = useId();

  useEffect(() => {
    dialog.current.showModal();
  }, []);

  function close() {
    dialog.current.close();
    onClose();
  }

  return <dialog ref={dialog} className="stat-details" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();close();}}>
    <h2 id={titleId}>{title}</h2>
    {rows.length ? <ul className="stat-detail-list">
      {rows.map((row, index) => {
        const patient = patients.find(p => p.id === row.patientId || p.id === row.patient);
        const name = row.name || patient?.name || row.patient || row.id;
        return <li key={row.id || index}>
          <strong>{name}</strong>
          <span>{[row.id !== name && row.id, row.department || row.dept, row.date, row.time, row.status, row.kind].filter(Boolean).join(' · ')}</span>
        </li>;
      })}
    </ul> : <p className="business-empty">Không có dữ liệu trong nhóm này.</p>}
    <button type="button" className="secondary" autoFocus onClick={close}>Quay lại tổng quan</button>
  </dialog>;
}
