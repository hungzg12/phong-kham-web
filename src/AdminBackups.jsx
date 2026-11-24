import React,{useRef,useState} from 'react';
export default function AdminBackups({records=[],api,onRefresh}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[restore,setRestore]=useState(null),[target,setTarget]=useState('');
 const request=useRef(null);
 async function perform(action,id){
  if(busy)return;
  if(action==='restore-new'&&!/^MediCareRestore_[A-Za-z0-9_]{8,40}$/.test(target)){setError('Nhập tên database mới: MediCareRestore_ và 8–40 ký tự chữ/số/gạch dưới.');return;}
  const signature=JSON.stringify({action,id,target:action==='restore-new'?target:undefined});
  if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};
  setBusy(true);setError('');setMessage('');
  try{
   const result=await api('/api/admin/backups/'+action,{method:'POST',body:JSON.stringify({requestId:request.current.id,id,target:action==='restore-new'?target:undefined})});
   setMessage(action==='backup'?'Đã sao lưu và kiểm tra checksum thành công.':'Đã phục hồi sang database mới: '+result.target+'. Kết nối ứng dụng hiện tại giữ nguyên.');
   request.current=null;setRestore(null);onRefresh();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <section className="admin-panel"><h2>Sao lưu dữ liệu SQL Server</h2><p>Bản sao được lưu trong thư mục sao lưu của máy SQL Server và kiểm tra bằng RESTORE VERIFYONLY. Không tải dữ liệu bệnh nhân ra trình duyệt.</p><button type="button" className="primary" disabled={busy} onClick={()=>perform('backup')}>{busy?'Đang xử lý…':'Tạo bản sao lưu'}</button>{error&&<p className="form-error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}<div className="table-scroll"><table><thead><tr><th>Thời điểm</th><th>Người tạo</th><th>Database nguồn</th><th>Thao tác</th></tr></thead><tbody>{records.map(r=><tr key={r.id}><td>{new Date(r.createdAt).toLocaleString('vi-VN')}</td><td>{r.createdBy}</td><td>{r.database}</td><td><button type="button" className="secondary" disabled={busy} onClick={()=>{setRestore(r);setTarget('');setError('');}}>Phục hồi sang database mới</button></td></tr>)}</tbody></table></div>{!records.length&&<p>Chưa có bản sao lưu được tạo từ màn hình này. Các bản .bak cũ không bị xóa.</p>}{restore&&<div className="admin-panel"><h3>Phục hồi bản sao lưu</h3><p>Chỉ tạo database mới, không ghi đè database hiện có và không tự chuyển kết nối ứng dụng. Chọn đúng bản sao trước khi xác nhận.</p><label>Tên database đích mới<input value={target} onChange={e=>setTarget(e.target.value)} placeholder="MediCareRestore_kiemthu2026" maxLength={56} disabled={busy}/></label><div className="row-actions"><button type="button" className="secondary" disabled={busy} onClick={()=>setRestore(null)}>Hủy</button><button type="button" className="primary" disabled={busy} onClick={()=>perform('restore-new',restore.id)}>Xác nhận phục hồi sang database mới</button></div></div>}</section>;
}
