import React,{useState} from 'react';
import {Search,Plus,Trash2,Printer,Check,Sparkles} from 'lucide-react';
import {useWorkspace,transact,audit} from './workspace';
import {actorRoles,canAction} from './roles';
import {hisApi} from './api';
export default function LabDesk({role,notify,clinicalContext}){
 const [db]=useWorkspace('business'),[patients]=useWorkspace('patients'),[visits]=useWorkspace('visits'),[admissions]=useWorkspace('admissions');const actor=actorRoles[role];
 const allowed=new Set([...visits,...admissions].filter(e=>role!=='doctor'||(e.doctor||'').includes(actor.person)).map(e=>e.id));
 const [query,setQuery]=useState(''),[status,setStatus]=useState(''),[selected,setSelected]=useState(''),[editing,setEditing]=useState(null),[error,setError]=useState('');
 const [scoped,setScoped]=useState(true);const scope=scoped?clinicalContext:null;
 const rows=db.labs.filter(l=>!scope||l.patient===scope.patientId&&l.episodeId===scope.episodeId).filter(l=>role!=='doctor'||allowed.has(l.episodeId)).filter(l=>(!status||l.status===status)&&(l.id+' '+patients.find(p=>p.id===l.patient)?.name).toLowerCase().includes(query.toLowerCase()));const row=rows.find(r=>r.id===selected)||rows[0];const canWrite=canAction(role,'labs','accept');
 const [saving,setSaving]=useState(false);
 async function action(kind){
  if(saving)return;setError('');setSaving(true);
  try{
   const saved=await hisApi.labAction({id:row.id,action:kind,role,staffId:actor.staffId,revision:kind==='save'?editing.baseRevision:(row.resultRevision||0),rows:editing?.rows,conclusion:editing?.conclusion,critical:editing?.critical});
   transact(d=>{d.business.labs=d.business.labs.map(r=>r.id===saved.id?saved:r);});
   setEditing(null);notify(kind==='publish'?'Đã phát hành kết quả CLS trong SQL Server':'Đã lưu trạng thái CLS trong SQL Server');
  }catch(e){setError(e.message);}finally{setSaving(false);}
 }

 function fillQuickTemplate(){
  const sName = (db.services.find(s=>s.id===row?.service)?.name || '').toLowerCase();
  if(sName.includes('đường') || sName.includes('glucose')){
   setEditing({
    baseRevision: row.resultRevision||0,
    rows: [
      { name: 'Glucose máu', value: '5.2', unit: 'mmol/L', reference: '3.9 - 6.4' },
      { name: 'HbA1c', value: '5.5', unit: '%', reference: '4.0 - 6.0' }
    ],
    conclusion: 'Nồng độ Glucose máu và HbA1c nằm trong giới hạn kiểm soát tốt.',
    critical: 'Không'
   });
  } else if(sName.includes('máu') || sName.includes('công thức')){
   setEditing({
    baseRevision: row.resultRevision||0,
    rows: [
      { name: 'RBC (Hồng cầu)', value: '4.65', unit: 'T/L', reference: '4.0 - 5.5' },
      { name: 'HGB (Huyết sắc tố)', value: '142', unit: 'g/L', reference: '120 - 165' },
      { name: 'WBC (Bạch cầu)', value: '6.8', unit: 'G/L', reference: '4.0 - 10.0' },
      { name: 'PLT (Tiểu cầu)', value: '250', unit: 'G/L', reference: '150 - 450' }
    ],
    conclusion: 'Công thức máu 24 thông số trong giới hạn sinh lý bình thường.',
    critical: 'Không'
   });
  } else if(sName.includes('men gan') || sName.includes('ast') || sName.includes('alt')){
   setEditing({
    baseRevision: row.resultRevision||0,
    rows: [
      { name: 'AST (GOT)', value: '24.5', unit: 'U/L', reference: '<= 37' },
      { name: 'ALT (GPT)', value: '26.0', unit: 'U/L', reference: '<= 40' }
    ],
    conclusion: 'Hoạt độ men gan bình thường, chức năng tế bào gan bảo tồn tốt.',
    critical: 'Không'
   });
  } else if(sName.includes('quang')){
   setEditing({
    baseRevision: row.resultRevision||0,
    rows: [
      { name: 'Mô tả hình ảnh', value: 'Trường phổi 2 bên sáng đều, rốn phổi đậm nhẹ. Tim không to. Vòm hoành 2 bên mềm mại.', unit: '', reference: 'Bình thường' }
    ],
    conclusion: 'Hình ảnh tim phổi thẳng chưa phát hiện tổn thương khu trú.',
    critical: 'Không'
   });
  } else {
   setEditing({
    baseRevision: row.resultRevision||0,
    rows: [
      { name: 'Chỉ số đo', value: 'Bình thường', unit: '', reference: 'Bình thường' }
    ],
    conclusion: 'Kết quả xét nghiệm không ghi nhận bất thường bệnh lý.',
    critical: 'Không'
   });
  }
 }
 return <section className="lab-desk"><div className="desk-intro"><div><span className="eyebrow">CẬN LÂM SÀNG</span><h2>Bàn tiếp nhận & trả kết quả</h2><p>Tiếp nhận → nhập kết quả → duyệt → phát hành. Chưa kết nối máy xét nghiệm hoặc PACS.</p></div><button className="secondary" onClick={()=>window.print()}><Printer size={15}/>In kết quả</button></div>{scope&&<div className="doctor-access-help">Phiếu thuộc {scope.episodeId}<button className="secondary" onClick={()=>setScoped(false)}>Xem tất cả phiếu</button></div>}<div className="desk-layout"><aside className="desk-queue"><label className="search"><Search size={15}/><input aria-label="Tìm phiếu xét nghiệm" placeholder="Mã phiếu / người bệnh" value={query} onChange={e=>{setQuery(e.target.value);setEditing(null)}}/></label><select aria-label="Trạng thái kết quả" value={status} onChange={e=>{setStatus(e.target.value);setEditing(null)}}><option value="">Tất cả trạng thái</option>{['Chờ tiếp nhận','Đang thực hiện','Chờ duyệt','Đã phát hành','Đã hủy'].map(s=><option key={s}>{s}</option>)}</select><div className="desk-patient-list">{rows.map(l=><button key={l.id} aria-pressed={row?.id===l.id} onClick={()=>{if(editing&&!window.confirm('Bỏ kết quả chưa lưu để chuyển phiếu?'))return;setSelected(l.id);setEditing(null);setError('')}}><div><b>{patients.find(p=>p.id===l.patient)?.name}</b><small>{l.id} · {l.episodeId}</small><small>{db.services.find(s=>s.id===l.service)?.name||l.service}</small><span className="badge gray">{l.status}</span></div></button>)}</div></aside><div className="desk-workspace">{row?<><div className="desk-identity"><h3>{patients.find(p=>p.id===row.patient)?.name} · {row.patient}</h3><p>{row.id} · {row.episodeId} · {db.services.find(s=>s.id===row.service)?.name}</p><p>Trạng thái: <b>{row.status}</b> · Bác sĩ: {db.staff.find(s=>s.id===row.doctor)?.name||row.doctor}</p></div><div className="desk-tab-panel">{editing?<><h3>Nhập kết quả CLS</h3><div className="table-scroll"><table><thead><tr><th>Tên chỉ số / nội dung</th><th>Kết quả</th><th>Đơn vị</th><th>Tham chiếu</th><th/></tr></thead><tbody>{editing.rows.map((r,i)=><tr key={i}>{['name','value','unit','reference'].map(k=><td key={k}><input aria-label={k+' chỉ số '+(i+1)} value={r[k]} onChange={e=>setEditing({...editing,rows:editing.rows.map((a,j)=>j===i?{...a,[k]:e.target.value}:a)})}/></td>)}<td><button className="icon-button" disabled={editing.rows.length===1} aria-label={'Bỏ chỉ số '+(i+1)} onClick={()=>setEditing({...editing,rows:editing.rows.filter((_,j)=>j!==i)})}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div><button className="secondary" onClick={()=>setEditing({...editing,rows:[...editing.rows,{name:'',value:'',unit:'',reference:''}]})}><Plus size={14}/>Thêm chỉ số</button><button type="button" className="secondary" style={{marginLeft:8,color:'#0f766e',borderColor:'#0f766e',fontWeight:600}} onClick={fillQuickTemplate}><Sparkles size={14}/>Điền mẫu chuẩn nhanh</button><label>Kết luận<textarea aria-label="Kết luận xét nghiệm" value={editing.conclusion} onChange={e=>setEditing({...editing,conclusion:e.target.value})}/></label><label>Cảnh báo nguy kịch do người nhập xác nhận<select value={editing.critical} onChange={e=>setEditing({...editing,critical:e.target.value})}><option>Không</option><option>Có</option></select></label><p className="desk-warning">Khoảng tham chiếu và cảnh báo nhập tay, chưa được máy hoặc cơ sở dữ liệu chuyên môn kiểm chứng.</p><button className="primary" onClick={()=>action('save')}>Lưu kết quả chờ duyệt</button><button className="secondary" onClick={()=>setEditing(null)}>Bỏ thay đổi</button></>:<><h3>{row.status==='Đã phát hành'?'Kết quả đã phát hành':'Kết quả đang xử lý'}</h3>{row.resultRows?.length?<div className="table-scroll"><table><thead><tr><th>Chỉ số</th><th>Kết quả</th><th>Đơn vị</th><th>Tham chiếu mẫu</th></tr></thead><tbody>{row.resultRows.map((r,i)=><tr key={i}><td>{r.name}</td><td>{r.value}</td><td>{r.unit}</td><td>{r.reference}</td></tr>)}</tbody></table></div>:<p>{row.result||'Chưa nhập kết quả.'}</p>}<p><b>Kết luận:</b> {row.conclusion||'—'}</p><p><b>Người duyệt:</b> {row.reviewer||'Chưa duyệt'}</p><div className="desk-lab-actions">{canWrite&&!saving&&row.status==='Chờ tiếp nhận'&&<button className="primary" onClick={()=>action('accept')}>Tiếp nhận phiếu</button>}{canWrite&&!saving&&['Đang thực hiện','Chờ duyệt'].includes(row.status)&&<button className="secondary" onClick={()=>setEditing({baseRevision:row.resultRevision||0,rows:row.resultRows||[{name:db.services.find(s=>s.id===row.service)?.name||'Kết quả',value:row.result||'',unit:'',reference:''}],conclusion:row.conclusion||'',critical:row.critical||'Không'})}>Nhập / sửa kết quả nháp</button>}{canWrite&&!saving&&row.status==='Chờ duyệt'&&<button className="primary" onClick={()=>action('publish')}><Check size={15}/>Duyệt & phát hành</button>}</div></>}{error&&<p className="form-error" role="alert">{error}</p>}</div></>:<div className="desk-empty">Chưa có phiếu phù hợp. Chỉ định dịch vụ từ bàn khám trước.</div>}</div></div></section>
}
