import React from 'react';
export default function ReceptionEncounter({encounter,onCancel,canCancel}){
 if(!encounter)return <div className="business-empty"><h3>Chưa có lượt tiếp đón</h3><p>Chọn người bệnh và lượt khám để xem thông tin tiếp đón.</p></div>;
 const fields=[['Mã lượt / đợt',encounter.id],['Loại tiếp nhận',encounter.kind],['Ngày giờ',[(encounter.date||''),(encounter.time||'')].filter(Boolean).join(' · ')],['Khoa',encounter.department],['Phòng khám',encounter.room],['Bác sĩ phụ trách',encounter.doctor],['Số thứ tự',encounter.queueTag||encounter.queueNumber],['Trạng thái',encounter.status],['Lý do tiếp đón',encounter.reason]];
 return <div><h3>Thông tin tiếp đón</h3><dl className="reception-encounter-details">{fields.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value===undefined||value===null||value===''?'Chưa ghi nhận':String(value)}</dd></div>)}</dl>{canCancel&&encounter.kind==='Ngoại trú'&&!encounter.locked&&!['Đã hủy','Hoàn tất'].includes(encounter.status)&&<button className="secondary" onClick={onCancel}>Hủy lượt khám</button>}<p className="form-hint">Thông tin khám và điều trị chuyên môn do nhân viên y tế phụ trách quản lý.</p></div>;
}
