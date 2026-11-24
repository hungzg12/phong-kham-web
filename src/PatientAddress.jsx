import React,{useId,useState,useEffect,useRef} from 'react';
import divisions from './vietnam-divisions.json';
import {removeVietnameseAccents} from './clinicalPhrases';
const normalize=value=>removeVietnameseAccents(value).replace(/^(thanh pho|tp\.?|tinh)\s+/,'').trim();
function splitAddress(value){
 const parts=(value||'').split(',').map(v=>v.trim()).filter(Boolean);
 const province=divisions.find(p=>normalize(p.name)===normalize(parts.at(-1)||''));
 if(!province)return {province:'',ward:'',street:value||''};
 parts.pop();const ward=province.wards.find(w=>normalize(w.name)===normalize(parts.at(-1)||''));
 if(ward)parts.pop();
 return {province:province.name,ward:ward?.name||'',street:parts.join(', ')};
}
export default function PatientAddress({value,onChange}){
 const id=useId();const [draft,setDraft]=useState(()=>splitAddress(value));
 const emitted=useRef(value);
 useEffect(()=>{if(value!==emitted.current){setDraft(splitAddress(value));emitted.current=value;}},[value]);
 const province=divisions.find(p=>p.name===draft.province);
 function update(patch){const next={...draft,...patch};setDraft(next);emitted.current=[next.street,next.ward,next.province].filter(Boolean).join(', ');onChange(emitted.current);}
 return <div className="his-label his-col-2">
 <span>Địa chỉ thường trú / Tạm trú *</span>
 <div className="his-grid-3">
 <label className="his-label">Tỉnh / Thành phố<input className="his-input" list={id+'-provinces'} value={draft.province} onChange={e=>update({province:e.target.value,ward:''})} placeholder="Chọn hoặc nhập tỉnh/thành"/><datalist id={id+'-provinces'}>{divisions.map(p=><option key={p.code} value={p.name}/>)}</datalist></label>
 <label className="his-label">Phường / Xã / Đặc khu<input className="his-input" list={id+'-wards'} value={draft.ward} onChange={e=>update({ward:e.target.value})} placeholder={province?'Chọn hoặc tự nhập phường/xã':'Chọn tỉnh/thành để có gợi ý'}/><datalist id={id+'-wards'}>{(province?.wards||[]).map(w=><option key={w.code} value={w.name}/>)}</datalist></label>
 <label className="his-label">Số nhà, tên đường / Thôn, ấp<input className="his-input" value={draft.street} onChange={e=>update({street:e.target.value})} placeholder="Nhập địa chỉ chi tiết"/></label>
 </div>
 <label className="his-label">Địa chỉ đầy đủ<input className="his-input" required maxLength={255} value={value} onChange={e=>onChange(e.target.value)} placeholder="Có thể tự nhập hoặc chỉnh sửa địa chỉ đầy đủ"/></label>
 </div>;
}
