import React from 'react';
import InpatientAdmissionModal from './InpatientAdmissionModal';
import { useWorkspace } from './workspace';

export default function NursingBed({ bed, actor, onDone, navigate, notify }) {
  const [patients] = useWorkspace('patients');
  const [beds, setBeds] = useWorkspace('beds');

  return (
    <InpatientAdmissionModal
      bed={bed}
      role="nurse"
      actor={actor}
      patients={patients}
      onClose={onDone}
      onSuccess={({ bedId, patientId, admissionId, cleaning, status }) => {
        setBeds(list => list.map(b => b.id === bedId ? {
          ...b,
          patient: cleaning ? null : (patientId || b.patient),
          patientName: cleaning ? null : (patients.find(p => p.id === patientId)?.name || b.patientName),
          admissionId: cleaning ? null : (admissionId || b.admissionId),
          cleaning: cleaning ?? false,
          status: status || (cleaning ? 'Chờ khử khuẩn' : 'Đang sử dụng')
        } : b));
        if (onDone) onDone('Đã cập nhật buồng giường trong SQL Server');
      }}
      notify={notify || (() => {})}
      navigate={navigate}
    />
  );
}
