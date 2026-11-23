import PatientPortal from './PatientPortal';
import {hisApi} from './api';
import {syncWithSqlServer} from './workspace';
import React,{useState,useEffect,useRef} from 'react';
import {Plus,Search,Download,Eye,Pencil,X,Check,ArrowRight,FileText,Trash2,Printer,Shield,ShieldCheck,ShieldAlert,Lock,AlertCircle,Activity,ClipboardList,Wallet,ChevronLeft,ChevronRight,HeartPulse,Pill,FileSpreadsheet,Receipt} from 'lucide-react';
import {definitions,pageGroups,extraTitles,permissionNames,specialLabels,today} from './business-data';
import './business.css';
import {useWorkspace,getWorkspace,episodeOptions,applyClinicalStock,approveInventoryRow,dischargeAdmission,financialRows} from './workspace';
import {EpisodeField,PatientHistory} from './History';
import {AllocationPreview} from './AllocationPreview';
import {DoctorAccessFields,isDoctorAccount,doctorScopes,doctorFunctions} from './DoctorAccess';
function formResult(fn){try{return fn()}catch(e){return e.message||'Không thực hiện được thao tác. Vui lòng thử lại.'}}
import {actorRoles,allowedTabs,canCreate,canEdit,canAction} from './roles';
import {parseBhytCard, BHYT_RATE_OPTIONS, isBhytEligibleItem} from './bhyt-utils';
import MedicalPaperFormViewer, {MedicalBillPaperForm} from './MedicalPaperForms';
import StatutoryPaperBusinessForm from './StatutoryPaperBusinessForm';
import MedicalSuggestInput from './MedicalSuggestInput';

const currency=n=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(Number(n)||0);
const money = currency;
const uid=p=>p+'-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,5).toUpperCase();
const timestamp=()=>new Date().toLocaleString('vi-VN');
const numeric=new Set(['pulse','temperature','spo2','weight','height','quantity','price','actual','amount','opening','counted','capacity']);
const terminal=['Đã hủy','Đã thu hồi','Đã từ chối','Đã đóng ca','Đã lưu trữ','Đã cấp phát','Đã nghiệm thu','Đã điều chỉnh','Đã thực hiện','Đã duyệt','Đã xác nhận','Đã ra viện','Đã hoàn tiền','Đã thanh toán'];
function Tone({value}){const negative=/hủy|hỏng|từ chối|Khóa|Tạm ngưng|Ngừng|thu hồi/.test(value),pending=/Chờ|Nháp|Đang/.test(value);return <span className={'badge '+(negative?'danger':pending?'amber':'teal')}>{value}</span>}
function csvDownload(filename,headers,rows){const csv='\uFEFF'+[headers,...rows].map(r=>r.map(c=>'"'+String(c??'').replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=filename+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

export default function Business({clinicalContext,page,role='admin',requestedTab='',patients,stock,setStock,beds,setBeds,notes,appointments,setAppointments,notify}){
 const [inventory]=useWorkspace('inventory'),[visits]=useWorkspace('visits'),[admissions]=useWorkspace('admissions');
 const actor=actorRoles[role];
 const [scoped,setScoped]=useState(true);const scope=scoped?clinicalContext:null;
 const tabs=allowedTabs(role,page,pageGroups[page]);
 const [db,setDb]=useWorkspace('business'),[tab,setTab]=useState(tabs.includes(requestedTab)?requestedTab:tabs[0]),[search,setSearch]=useState(''),[status,setStatus]=useState('Tất cả'),[index,setIndex]=useState(0),[dialog,setDialog]=useState(null),[selectedPatient,setSelectedPatient]=useState(actor.patientId||patients[0]?.id||''),[reportRange,setReportRange]=useState({from:'2026-11-01',to:today}),[portalTab,setPortalTab]=useState(['summary','results','medicine','appointments','bills'].includes(requestedTab)?requestedTab:'summary');
 useEffect(()=>{setTab(tabs.includes(requestedTab)?requestedTab:tabs[0]);if(['summary','results','medicine','appointments','bills'].includes(requestedTab))setPortalTab(requestedTab);setSearch('');setStatus('Tất cả');setIndex(0);setDialog(null)},[page,requestedTab,role]);
 useEffect(()=>{function key(e){if(e.key==='Escape')setDialog(null)}window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[]);
 function commit(next,event){setDb(old=>{const updated=typeof next==='function'?next(old):next;const value={...updated,audit:[{id:uid('LOG'),time:timestamp(),actor:actor.person+' · '+actor.name,event},...(old.audit||[])].slice(0,300)};return value})}
 const involved=new Set([...patients.filter(p=>p.doctor.includes(actor.person)).map(p=>p.id),...Object.values(db).filter(Array.isArray).flat().filter(x=>x.doctor===actor.staffId&&x.patient).map(x=>x.patient)]);
 const rows=(db[tab]||[]).filter(r=>!scope||r.patient===scope.patientId&&r.episodeId===scope.episodeId).filter(r=>role!=='doctor'||!r.patient||involved.has(r.patient)).filter(r=>role!=='pharmacist'||tab!=='prescriptions'||r.status!=='Nháp'),def=definitions[tab];
 const editable=canCreate(role,tab);
 const episodeTab=['vitals','labs','prescriptions','referrals','rounds','consultations','discharges','archives','advances','settlements'].includes(tab);
 const nameOf=(source,id)=>source?.find(x=>x.id===id)?.name||id||'—';
 function display(key,value){if(value===undefined||value===null||value==='')return '—';if(key==='recordScope')return doctorScopes[value]||value;if(key==='staffId')return nameOf(db.staff,value);if(key==='episodeId')return value;if(key==='patient')return nameOf(patients,value);if(['doctor','requester','reporter','cashier','manager'].includes(key))return nameOf(db.staff,value);if(key==='service')return nameOf(db.services,value);if(key==='medicine')return nameOf(stock,value);if(key==='warehouse')return nameOf(db.warehouses,value);if(key==='role')return nameOf(db.roles,value);if(key==='device')return nameOf(db.equipment,value);if(['price','amount','gross','insurance','advance','balance','cash','received','refund'].includes(key))return currency(value);if(key==='time'||key==='scheduled')return String(value).replace('T',' · ');return String(value)}
 const label=key=>def?.fields.find(f=>f.key===key)?.label||specialLabels[key]||key;
 const filtered=rows.filter(r=>(Object.entries(r).filter(([,v])=>!Array.isArray(v)&&typeof v!=='object').map(([k,v])=>display(k,v)).join(' ')+' '+r.id).toLowerCase().includes(search.toLowerCase())&&(status==='Tất cả'||r.status===status));
 function optionsFor(field){if(scope&&field.type==='patient')return patients.filter(p=>p.id===scope.patientId).map(p=>({value:p.id,label:p.name}));if(role==='doctor'&&field.key==='doctor')return db.staff.filter(s=>s.id===actor.staffId).map(s=>({value:s.id,label:s.name}));if(role==='cashier'&&field.key==='cashier')return db.staff.filter(s=>s.id===actor.staffId).map(s=>({value:s.id,label:s.name}));if(role==='nurse'&&field.key==='nurse')return db.staff.filter(s=>s.id===actor.staffId).map(s=>({value:s.id,label:s.name}));const sources={patient:role==='doctor'?patients.filter(p=>involved.has(p.id)):patients,staff:db.staff.filter(x=>x.status==='Đang hoạt động'),stock,service:db.services.filter(x=>x.status==='Đang hoạt động'&&x.kind!=='Khám bệnh'),warehouse:db.warehouses.filter(x=>x.status==='Đang hoạt động'),role:db.roles.filter(x=>x.status==='Đang hoạt động'),device:db.equipment};return sources[field.type]?.map(x=>({value:x.id,label:x.name+(field.type==='stock'?' · Tổng tồn '+x.qty:'')}))||field.options?.map(x=>({value:x,label:x}))}
 function changeTab(key){setTab(key);setSearch('');setStatus('Tất cả');setIndex(0)}
 
 async function saveRow(values,old){
  if(!canCreate(role,tab))return 'Vai trò này không được tạo hoặc sửa chứng từ tại đây.';
  const data={...values};if(scope&&episodeTab&&(data.patient!==scope.patientId||data.episodeId!==scope.episodeId))return 'Chọn đúng người bệnh và lượt/đợt đang liên kết.';if(tab==='accounts'){if(isDoctorAccount(data,db)){const staff=db.staff.find(s=>s.id===data.staffId&&s.title==='Bác sĩ'&&s.status==='Đang hoạt động');if(!staff)return 'Chọn hồ sơ bác sĩ đang hoạt động.';if(!data.departments?.length)return 'Chọn ít nhất một khoa được phụ trách.';if(data.departments.some(d=>!definitions.staff.fields.find(f=>f.key==='department').options.includes(d)))return 'Chuyên khoa không hợp lệ.';if(!doctorScopes[data.recordScope||'assigned'])return 'Chọn phạm vi hồ sơ hợp lệ.';if(db.accounts.some(a=>a.id!==old?.id&&a.staffId===data.staffId&&isDoctorAccount(a,db)))return 'Bác sĩ này đã được liên kết với tài khoản khác.';data.recordScope=data.recordScope||'assigned';data.doctorPermissions=data.doctorPermissions||doctorFunctions.filter(p=>p!=='Duyệt kết quả CLS');data.departmentSummary=data.departments.join(', ')}else{delete data.staffId;delete data.departments;delete data.recordScope;delete data.doctorPermissions;delete data.departmentSummary}}if(episodeTab){const episodes=episodeOptions(getWorkspace(),data.patient);if(!episodes.some(e=>e.id===data.episodeId))return 'Chọn đúng lượt khám hoặc đợt điều trị của bệnh nhân.';}if(role==='doctor'&&definitions[tab]?.fields.some(f=>f.key==='doctor'))data.doctor=actor.staffId;for(const key of Object.keys(data))if(numeric.has(key)&&data[key]!=='')data[key]=Number(data[key]);
  if(tab==='authorizations'&&data.end<data.start)return 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.';
  if(tab==='accounts'&&db.accounts.some(x=>x.id!==old?.id&&x.username.toLowerCase()===data.username.toLowerCase()))return 'Tên đăng nhập đã tồn tại.';
  if(tab==='equipment'&&db.equipment.some(x=>x.id!==old?.id&&x.serial===data.serial))return 'Số serial đã tồn tại.';
  if(tab==='labs'&&db.labs.some(x=>x.id!==old?.id&&x.patient===data.patient&&x.service===data.service&&x.status!=='Đã hủy'&&(x.date||today)===today))return 'Dịch vụ này đã được chỉ định cho bệnh nhân trong ngày.';
  if(tab==='rounds'&&data.kind==='Dùng thuốc'&&(!data.medicine||!data.quantity||!data.dose))return 'Y lệnh dùng thuốc cần chọn thuốc, số lượng và liều dùng / đường dùng.';
  if(tab==='prescriptions'&&(!data.lines?.length||data.lines.some(x=>!x.medicine||Number(x.quantity)<1||!x.dose||!x.route||!x.frequency||Number(x.days)<1)))return 'Điền đầy đủ thuốc, số lượng, liều, đường dùng, tần suất và số ngày.';
  if(tab==='prescriptions'&&new Set(data.lines.map(x=>x.medicine)).size!==data.lines.length)return 'Có thuốc trùng trong đơn. Hãy gộp số lượng và kiểm tra lại.';
  if(tab==='counts'){const lot=inventory.find(l=>l.id===data.lotId&&l.medicineId===data.medicine&&l.warehouseId===data.warehouse);if(!lot)return 'Chọn đúng lô thuộc mặt hàng và kho kiểm kê.';data.expected=lot.qty;data.difference=data.actual-data.expected}
  if(tab==='movements'&&['Nhập kho','Hoàn trả'].includes(data.kind)&&(!data.lot||!data.expiry))return 'Phiếu nhập / hoàn trả cần số lô và hạn dùng.';if(tab==='movements'&&data.kind==='Điều chuyển'&&(!data.destination||data.destination===data.warehouse))return 'Kho đích phải khác kho nguồn.';
  if(['prescriptions','movements','counts','warehouses'].includes(tab)){if(old&&tab!=='warehouses')return 'Chứng từ đã lưu không sửa trực tiếp. Hãy tạo bản mới hoặc hủy bản chờ.';return savePharmacy({prescriptions:'savePrescription',movements:'saveMovement',counts:'saveCount',warehouses:'saveWarehouse'}[tab],{...data,id:old?.id});}
  if(tab==='advances')return saveFinance('saveAdvance',{...data,id:old?.id});
  if(tab==='shifts'){
   if(old)return 'Ca đã mở chỉ được đóng hoặc đối soát, không sửa trực tiếp.';
   return saveFinance('openShift',{name:data.name,opening:data.opening});
  }
  if(tab==='vitals'){
   try{await hisApi.saveNursingVitals({...data,id:old?.id,role,staffId:actor.staffId});await syncWithSqlServer();setDialog(null);notify('Đã lưu sinh hiệu trong SQL Server');return null;}catch(e){return e.message;}
  }
  if(tab==='labs'){
   if(old)return 'Chỉ định đã lưu không sửa trực tiếp. Dùng bàn xét nghiệm để xử lý.';
   try{await hisApi.createLabOrders({...data,services:[data.service],role,staffId:actor.staffId});await syncWithSqlServer();setDialog(null);notify('Đã lưu chỉ định CLS trong SQL Server');return null;}catch(e){return e.message;}
  }
  if(tab==='vitals')data.bmi=(data.weight/((data.height/100)**2)).toFixed(1);
  if(tab==='shifts'){if(db.shifts.some(x=>x.id!==old?.id&&x.status!=='Đã đóng ca'))return 'Vui lòng đóng ca trực đang mở trước khi tạo ca tiếp theo.';const closed=new Set(db.shifts.filter(x=>x.status==='Đã đóng ca').flatMap(x=>x.transactionIds||[]));const transactions=financialTransactions().filter(x=>!closed.has(x.id));data.transactionIds=transactions.map(x=>x.id);data.cash=transactions.reduce((s,x)=>s+x.signed,0);data.expected=data.opening+data.cash;data.difference=data.counted-data.expected}
  const record={...old,...data,id:old?.id||uid(def.prefix),createdAt:old?.createdAt||timestamp(),date:old?.date||today,status:old?.status||def.initialStatus};
  commit(prev=>({...prev,[tab]:old?prev[tab].map(x=>x.id===old.id?record:x):[record,...prev[tab]]}),`${old?'Cập nhật':'Tạo'} ${def.singular} ${record.id}`);notify('Đã lưu '+def.singular);setDialog(null);return null;
 }

 function patchRow(row,changes,event,extra={}){commit(prev=>({...prev,...extra,[tab]:prev[tab].map(x=>x.id===row.id?{...x,...changes,reviewer:actor.person+' · '+actor.name,updatedAt:timestamp()}:x)}),event+' '+row.id);setDialog(null);notify(event)}
 function financialTransactions(){return financialRows(db)}
 function rawActions(row){
  if(row.status==='Đã hủy'||row.status==='Đã từ chối')return [];
  if(tab==='labs')return row.status==='Chờ tiếp nhận'?[['Tiếp nhận','accept']]:row.status==='Đang thực hiện'?[['Nhập kết quả','result']]:row.status==='Chờ duyệt'?[['Duyệt & phát hành','approve']]:[];
  if(tab==='prescriptions')return row.status==='Nháp'?[['Xác nhận đơn','approveRx']]:row.status==='Đã xác nhận'?[['Cấp phát thuốc','dispense']]:[];
  if(tab==='rounds')return row.status==='Chờ thực hiện'?[['Xác nhận 5 đúng','administer']]:[];
  if(tab==='incidents')return row.status==='Chờ tiếp nhận'?[['Tiếp nhận & khóa thiết bị','acceptIncident']]:row.status==='Đang bảo trì'?[['Ghi bảo trì & nghiệm thu','maintain']]:[];
  if(tab==='equipment')return [[row.status==='Đang hoạt động'?'Khóa sử dụng':'Mở lại sử dụng','toggleDevice']];
  if(tab==='counts'&&row.status==='Chờ phê duyệt')return [['Phê duyệt điều chỉnh','approveCount'],['Từ chối','reject']];
  if(tab==='movements'&&row.status==='Chờ duyệt')return [['Duyệt & ghi sổ','approveMovement'],['Từ chối','reject']];
  if(tab==='advances'&&row.status==='Chờ xác nhận')return [['Xác nhận giao dịch','confirmCash']];
  if(tab==='shifts'&&row.status==='Chờ đối soát')return [['Đối soát & đóng ca','closeShift']];
  if(tab==='archives'&&row.status==='Đang mở')return [['Đóng gói lưu trữ','archive']];
  if(tab==='authorizations'&&row.status==='Có hiệu lực')return [['Thu hồi ủy quyền','revoke']];
  if(tab==='corrections'&&row.status==='Chờ phê duyệt')return [['Phê duyệt','approveCorrection'],['Từ chối','reject']];
  if(tab==='discharges'&&row.status==='Chờ duyệt')return [['Duyệt ra viện','discharge']];
  if(['consultations','referrals'].includes(tab)&&row.status==='Chờ xác nhận')return [['Xác nhận biên bản','confirm']];
  if(['staff','accounts','roles','departments','services','warehouses'].includes(tab))return [[row.status==='Đang hoạt động'?'Tạm ngưng':'Kích hoạt','toggle']];
  return [];
 }
 function actions(row){return rawActions(row).filter(([,action])=>canAction(role,tab,action))}
 
 async function perform(row,action,values){
  if(!canAction(role,tab,action))return 'Vai trò này không được thực hiện thao tác.';
  if(tab==='labs'&&['accept','result','approve'].includes(action)){
   try{await hisApi.labAction({id:row.id,role,staffId:actor.staffId,revision:row.resultRevision||0,action:{accept:'accept',result:'save',approve:'publish'}[action],rows:action==='result'?[{name:'Kết quả',value:values.result||'',unit:'',reference:''}]:undefined,conclusion:values.conclusion,critical:values.critical});await syncWithSqlServer();setDialog(null);notify('Đã lưu CLS trong SQL Server');return null;}catch(e){return e.message;}
  }
  if(tab==='prescriptions'&&['approveRx','dispense'].includes(action))return savePharmacy(action==='approveRx'?'approvePrescription':'dispense',{id:row.id,warehouse:values.warehouse});
  if(['movements','counts','warehouses'].includes(tab))return savePharmacy(tab==='warehouses'?'toggleWarehouse':['reject','cancel'].includes(action)?(tab==='counts'?'cancelCount':'cancelMovement'):action,{id:row.id,reason:values.reason});
  if(action==='accept')return patchRow(row,{status:'Đang thực hiện'},'Đã tiếp nhận chỉ định');
  if(action==='confirmCash')return saveFinance('confirmAdvance',{id:row.id,signedBy:values.signedBy});
  if(action==='closeShift')return saveFinance('closeShift',{id:row.id,counted:values.counted,reason:values.reason});
  if(action==='cancel'&&tab==='advances')return saveFinance('cancelAdvance',{id:row.id,reason:values.reason});
  if(action==='archive')return patchRow(row,{status:'Đã lưu trữ',archivedAt:timestamp()},'Đã hoàn tất đóng gói hồ sơ bệnh án');
  if(action==='revoke')return patchRow(row,{status:'Đã thu hồi'},'Đã thu hồi ủy quyền');
  if(action==='approveCorrection'){if(row.deadline<today)return 'Yêu cầu đã quá hạn chỉnh sửa.';return patchRow(row,{status:'Đã duyệt'},'Đã phê duyệt yêu cầu đính chính')}
  if(action==='confirm')return patchRow(row,{status:'Đã xác nhận'},'Đã xác nhận biên bản');
  if(action==='discharge'){dischargeAdmission(row.episodeId,actor.person,row.id);setDialog(null);notify('Đã hoàn tất đúng đợt điều trị và giải phóng giường');return}
  if(action==='acceptIncident')return patchRow(row,{status:'Đang bảo trì'},'Đã tiếp nhận sự cố và khóa thiết bị',{equipment:db.equipment.map(x=>x.id===row.device?{...x,status:'Ngừng sử dụng'}:x)});
  if(action==='maintain')return patchRow(row,{status:'Đã nghiệm thu',maintenance:values.maintenance,engineer:values.engineer,acceptedAt:timestamp()},'Đã nghiệm thu bảo trì',{equipment:db.equipment.map(x=>x.id===row.device?{...x,status:'Đang hoạt động'}:x)});
  if(action==='toggleDevice'&&row.status!=='Đang hoạt động'&&db.incidents.some(x=>x.device===row.id&&x.status==='Đang bảo trì'))return 'Thiết bị đang có phiếu bảo trì chưa nghiệm thu.';
  if(action==='toggleDevice'||action==='toggle')return patchRow(row,{status:row.status==='Đang hoạt động'?'Tạm ngưng':'Đang hoạt động'},'Đã cập nhật trạng thái');
  if(action==='cancel')return patchRow(row,{status:'Đã hủy',cancelReason:values.reason},'Đã hủy chứng từ');
 }

 function availableAdvance(patient,episodeId){return db.advances.filter(x=>x.patient===patient&&x.episodeId===episodeId&&x.status==='Đã xác nhận').reduce((s,x)=>s+(x.kind==='Hoàn tiền'?-x.amount:x.amount),0)-db.settlements.filter(x=>x.patient===patient&&x.episodeId===episodeId&&x.status!=='Đã hủy').reduce((s,x)=>s+(x.advance||0),0)}
 
 const pharmacyRequest=useRef(null);
 async function savePharmacy(action,values){const body={...values,action,role,staffId:actor.staffId};const signature=JSON.stringify(body);if(pharmacyRequest.current?.signature!==signature)pharmacyRequest.current={signature,key:crypto.randomUUID()};try{await hisApi.pharmacyAction({...body,requestId:pharmacyRequest.current.key});pharmacyRequest.current=null;await syncWithSqlServer();setDialog(null);notify('Đã lưu nghiệp vụ dược trong SQL Server');return null;}catch(e){return e.message;}}
 
 const financeRequest=useRef(null);
 useEffect(()=>{financeRequest.current=null},[dialog?.type,dialog?.row?.id]);
 
 async function saveFinance(action,values){
  const body={...values,action,role,staffId:actor.staffId};const signature=JSON.stringify(body);
  if(financeRequest.current?.signature!==signature)financeRequest.current={signature,key:crypto.randomUUID()};
  try{await hisApi.financeAction({...body,requestId:financeRequest.current.key});await syncWithSqlServer();setDialog(null);notify('Đã lưu chứng từ viện phí trong SQL Server');return null;}catch(error){await syncWithSqlServer();return error.message;}
 }
 
 async function saveSettlement(values){return saveFinance('createSettlement',values);}
 async function settle(row,values){return saveFinance('settle',{id:row.id,signedBy:values.signedBy,expectedBalance:row.balance});}
 
 const summary=<div className="business-summary">{[{label:'Tổng bản ghi',value:rows.length,Icon:ClipboardList},{label:'Cần xử lý',value:rows.filter(x=>/Chờ|Nháp/.test(x.status)).length,Icon:Activity},{label:'Đã hoàn tất',value:rows.filter(x=>/Đã/.test(x.status)&&!['Đã hủy','Đã từ chối','Đã thu hồi'].includes(x.status)).length,Icon:Check}].map(({label,value,Icon})=><div key={label}><span><Icon size={18}/>{label}</span><b>{value}</b></div>)}</div>;
 
 const renderTable=()=>{const baseColumns=tab==='settlements'?['patient','gross','insurance','advance','balance','status']:def.columns;const columns=episodeTab?[...baseColumns.filter(k=>k!=='status'),'episodeId','status']:baseColumns;return <section className="panel"><div className="panel-heading"><div><h2>{def?.title||'Quyết toán viện phí'} <span className="count">{rows.length}</span></h2><p>{def?.description||'Lập chi phí, cấn trừ BHYT và tạm ứng; thu thêm, hoàn tiền hoặc xác nhận đủ tiền.'}</p></div>{editable&&<button className="primary" onClick={()=>setDialog({type:tab==='settlements'?'settlement':'form'})}><Plus size={16}/>Tạo {def?.singular||'quyết toán'}</button>}</div><div className="table-tools"><label className="search"><Search size={16}/><input aria-label="Tìm kiếm bản ghi" placeholder="Tìm mã, tên, nội dung..." value={search} onChange={e=>{setSearch(e.target.value);setIndex(0)}}/></label><select aria-label="Lọc trạng thái" value={status} onChange={e=>{setStatus(e.target.value);setIndex(0)}}>{['Tất cả',...new Set(rows.map(x=>x.status))].map(s=><option key={s}>{s}</option>)}</select><button className="secondary" onClick={()=>csvDownload(tab,['Mã',...columns.map(c=>label(c))],filtered.map(r=>[r.id,...columns.map(k=>display(k,r[k]))]))}><Download size={15}/>Xuất CSV</button></div><div className="table-scroll"><table><thead><tr><th>MÃ CHỨNG TỪ</th>{columns.map(k=><th key={k}>{label(k)}</th>)}<th>THAO TÁC</th></tr></thead><tbody>{filtered.slice(index*8,index*8+8).map(row=><tr key={row.id}><td><button className="record-link" onClick={()=>setDialog({type:'detail',row})}>{row.id}</button><small>{row.createdAt||'Đang cập nhật'}</small></td>{columns.map(k=><td key={k} className={['conclusion','description','reason','diagnosis'].includes(k)?'wrap-cell':''}>{k==='status'?<Tone value={row.status}/>:display(k,row[k])}</td>)}<td><div className="row-actions"><button className="icon-button" aria-label={'Chi tiết '+row.id} onClick={()=>setDialog({type:'detail',row})}><Eye size={16}/></button>{canEdit(role,tab)&&!['prescriptions','movements','counts'].includes(tab)&&!terminal.includes(row.status)&&!['Đã phát hành','Đã ghi sổ'].includes(row.status)&&tab!=='settlements'&&<button className="icon-button" aria-label={'Sửa '+row.id} onClick={()=>setDialog({type:'form',row})}><Pencil size={15}/>{tab==='accounts'&&isDoctorAccount(row,db)&&<span>Phân quyền</span>}</button>}{tab==='settlements'&&row.status==='Chờ quyết toán'?<button className="secondary" onClick={()=>setDialog({type:'settle',row})}>Quyết toán</button>:actions(row).slice(0,1).map(([title,action])=><button key={action} className="secondary" onClick={()=>setDialog({type:'action',row,action,title})}>{title}</button>)}</div></td></tr>)}</tbody></table></div>{!filtered.length&&<div className="business-empty"><ClipboardList size={33}/><h3>{search||status!=='Tất cả'?'Không tìm thấy bản ghi':'Chưa có '+(def?.singular||'quyết toán')}</h3><p>{search?'Thử thay đổi từ khóa hoặc bộ lọc.':'Nhấn nút tạo mới để bắt đầu ghi nhận thông tin.'}</p></div>}<div className="table-footer"><span>{filtered.length?index*8+1:0}–{Math.min(index*8+8,filtered.length)} / {filtered.length} bản ghi</span><div><button className="icon-button" disabled={index===0} onClick={()=>setIndex(index-1)} aria-label="Trang trước"><ChevronLeft size={16}/></button><span>Trang {index+1}</span><button className="icon-button" disabled={(index+1)*8>=filtered.length} onClick={()=>setIndex(index+1)} aria-label="Trang sau"><ChevronRight size={16}/></button></div></div></section>};
 
 const renderReports=()=>{const tx=financialTransactions().filter(x=>x.date>=reportRange.from&&x.date<=reportRange.to),incoming=tx.filter(x=>x.signed>=0).reduce((s,x)=>s+x.signed,0),outgoing=-tx.filter(x=>x.signed<0).reduce((s,x)=>s+x.signed,0);return <><section className="panel report-panel"><div className="panel-heading"><div><h2>Báo cáo thu chi viện phí</h2><p>Chỉ tổng hợp giao dịch tiền mặt đã xác nhận trong phân hệ quyết toán này.</p></div><button className="secondary" onClick={()=>csvDownload('bao-cao-thu-chi',['Mã','Bệnh nhân','Ngày','Loại','Số tiền'],tx.map(x=>[x.id,display('patient',x.patient),x.date,x.kind,x.signed]))}><Download size={15}/>Xuất báo cáo</button></div><div className="report-filters"><label>Từ ngày<input type="date" value={reportRange.from} max={reportRange.to} onChange={e=>setReportRange({...reportRange,from:e.target.value})}/></label><label>Đến ngày<input type="date" value={reportRange.to} min={reportRange.from} onChange={e=>setReportRange({...reportRange,to:e.target.value})}/></label></div><div className="business-summary financial">{[['Tổng thu',incoming],['Tổng hoàn',outgoing],['Thuần tiền mặt',incoming-outgoing]].map(([name,total])=><div key={name}><span><Wallet size={17}/>{name}</span><b>{currency(total)}</b></div>)}</div><div className="table-scroll"><table><thead><tr><th>GIAO DỊCH</th><th>BỆNH NHÂN</th><th>NGÀY</th><th>NỘI DUNG</th><th>SỐ TIỀN</th></tr></thead><tbody>{tx.map(x=><tr key={x.id}><td>{x.id}</td><td>{display('patient',x.patient)}</td><td>{x.date}</td><td>{x.kind}</td><td><b>{currency(x.signed)}</b></td></tr>)}</tbody></table></div>{!tx.length&&<div className="business-empty">Chưa có giao dịch đã xác nhận trong khoảng thời gian này.</div>}</section><section className="panel audit-panel"><div className="panel-heading"><div><h2>Nhật ký thao tác</h2><p>Các thay đổi gần nhất trong phân hệ mở rộng</p></div><ShieldCheck size={19}/></div><div className="audit-list">{db.audit.slice(0,15).map(a=><div key={a.id}><span className="audit-dot"/><div><b>{a.event}</b><small>{a.actor} · {a.time}</small></div></div>)}{!db.audit.length&&<p>Chưa có thao tác được ghi nhận.</p>}</div></section></>};
 
 const renderPortal=()=>{const p=patients.find(x=>x.id===(role==='patient'?actor.patientId:selectedPatient));return <section className="panel portal-panel"><div className="panel-heading"><div><h2>Cổng thông tin người bệnh</h2><p>{role==='patient'?'Thông tin cá nhân, kết quả khám và lịch hẹn của bạn.':'Giao diện cổng thông tin người bệnh. Chọn hồ sơ để tra cứu.'}</p></div>{role!=='patient'&&<select aria-label="Chọn hồ sơ người bệnh" value={selectedPatient} onChange={e=>setSelectedPatient(e.target.value)}>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}</div>{p&&<><div className="portal-welcome"><div><span>HỒ SƠ CÁ NHÂN</span><h2>Xin chào, {p.name}</h2><p>{p.id} · {p.gender} · {p.birth} · {p.phone}</p></div><ShieldCheck size={48}/></div><div className="business-tabs portal-tabs">{[['summary','Tổng quan'],['results','Kết quả khám'],['medicine','Đơn thuốc'],['appointments','Lịch hẹn'],['bills','Viện phí']].map(([key,title])=><button key={key} className={portalTab===key?'selected':''} onClick={()=>setPortalTab(key)}>{title}</button>)}</div><div className="portal-content">{portalTab==='summary'&&<><PatientHistory patientId={p.id} clinical/><div className="portal-cards"><article><Activity size={23}/><h3>Khám & điều trị</h3><b>{p.status}</b><p>{p.dept} · {p.doctor}</p></article><article><FileText size={23}/><h3>Hồ sơ bệnh án</h3><b>{db.archives.filter(x=>x.patient===p.id).length} hồ sơ</b><p>Thông tin đã được ghi nhận tại bệnh viện</p></article></div><h3>Thông tin thẻ Bảo hiểm Y tế</h3>{(()=>{const bh=parseBhytCard(p.insurance);return bh.hasInsurance?<div style={{background:'linear-gradient(135deg, #065f46 0%, #047857 50%, #0f766e 100%)',borderRadius:'8px',padding:'14px 18px',color:'#ffffff',marginTop:'8px',maxWidth:'520px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.2)',paddingBottom:'6px',marginBottom:'8px'}}><span style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.5px',textTransform:'uppercase'}}>Bảo hiểm Y tế Việt Nam</span><span style={{fontSize:'10px',background:'rgba(255,255,255,0.2)',padding:'2px 6px',borderRadius:'4px'}}>Thẻ điện tử</span></div><div style={{fontSize:'16px',fontWeight:700,letterSpacing:'1.5px',fontFamily:'monospace',marginBottom:'8px',color:'#ecfdf5'}}>{bh.code}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',fontSize:'11.5px'}}><div><span style={{opacity:0.8}}>Mức hưởng:</span> <b>BHYT chi trả {bh.rate}%</b></div><div><span style={{opacity:0.8}}>Cùng chi trả:</span> <b>{bh.copayRate}%</b></div><div><span style={{opacity:0.8}}>Đối tượng:</span> <b>{bh.groupName}</b></div><div><span style={{opacity:0.8}}>Khu vực:</span> <b>{bh.provinceName || 'TP. Hồ Chí Minh'}</b></div></div></div>:<div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'6px',padding:'10px 14px',color:'#475569',fontSize:'12px',marginTop:'8px',maxWidth:'520px'}}><b>Chế độ KCB: Viện phí (Khám tự chi trả 100%)</b><p style={{margin:'2px 0 0',color:'#64748b'}}>Chưa cập nhật thẻ BHYT liên kết.</p></div>})()}</>}{portalTab==='results'&&<>{notes[p.id]&&<div className="portal-record"><h3>Kết quả khám</h3><p>Chẩn đoán: {notes[p.id].diagnosis}</p><p>Hướng xử trí: {notes[p.id].outcome}</p></div>}{db.labs.filter(x=>x.patient===p.id&&x.status==='Đã phát hành').map(r=><div className="portal-record" key={r.id}><h3>{display('service',r.service)}</h3><p>{r.result}</p><p>Kết luận: {r.conclusion}</p><small>{r.releasedAt}</small></div>)}{!notes[p.id]&&!db.labs.some(x=>x.patient===p.id&&x.status==='Đã phát hành')&&<Empty text="Chưa có kết quả được phát hành"/>}</>}{portalTab==='medicine'&&<>{db.prescriptions.filter(x=>x.patient===p.id&&x.status!=='Nháp'&&x.status!=='Đã hủy').map(r=><div className="portal-record" key={r.id}><h3>Đơn {r.id}</h3><p>{r.diagnosis}</p>{r.lines.map((l,i)=><p key={i}>{display('medicine',l.medicine)} · {l.quantity} · {l.dose} · {l.route} · {l.frequency} · {l.days} ngày</p>)}<p>Lời dặn: {r.advice}</p><Tone value={r.status}/></div>)}{!db.prescriptions.some(x=>x.patient===p.id&&!['Nháp','Đã hủy'].includes(x.status))&&<Empty text="Chưa có đơn thuốc được xác nhận"/>}</>}{portalTab==='appointments'&&<>{appointments.filter(x=>x.phone===p.phone).map(a=><div className="portal-record" key={a.id}><h3>{a.dept}</h3><p>{a.date.replace('T',' · ')}</p><Tone value={a.status}/>{a.status!=='Đã hủy'&&<button className="secondary" onClick={()=>setDialog({type:'portalCancel',row:a})}>Hủy lịch hẹn</button>}</div>)}<button className="primary" onClick={()=>setDialog({type:'portalAppointment',patient:p})}><Plus size={15}/>Đặt lịch mới</button></>}{portalTab==='bills'&&<>{db.settlements.filter(x=>x.patient===p.id).map(r=><div className="portal-record" key={r.id}><h3>Quyết toán {r.id}</h3><p>Tổng chi phí: {currency(r.gross)}</p><p>BHYT chi trả: {currency(r.insurance)}</p><p>Tạm ứng: {currency(r.advance)}</p><p>Cần thu / hoàn: {currency(r.balance)}</p><Tone value={r.status}/></div>)}{!db.settlements.some(x=>x.patient===p.id)&&<Empty text="Chưa có bảng quyết toán"/>}</>}</div></>}</section>};
 
 if(page==='portal'&&role==='patient')return <PatientPortal requestedTab={requestedTab} notify={notify}/>;
 
 return <div className="business">
  {scope&&<div className="doctor-access-help">Đang xem hồ sơ {scope.episodeId} · {patients.find(p=>p.id===scope.patientId)?.name}<button className="secondary" onClick={()=>setScoped(false)}>Xem tất cả hồ sơ</button></div>}
  <div className="business-tabs" role="tablist" aria-label={extraTitles[page]}>
    {tabs.map(key=><button role="tab" aria-selected={tab===key} key={key} className={tab===key?'selected':''} onClick={()=>changeTab(key)}>{definitions[key]?.title||{settlements:'Quyết toán viện phí',reports:'Báo cáo & nhật ký',portal:'Thông tin người bệnh'}[key]}</button>)}
  </div>
  {tab==='roles'&&<div className="doctor-access-help">Vai trò quy định quyền chức năng chung. Để gán bác sĩ, khoa và phạm vi hồ sơ cho từng người, mở Tài khoản.<button className="secondary" onClick={()=>changeTab('accounts')}>Phân quyền bác sĩ theo khoa</button></div>}
  {tab==='accounts'&&<div className="doctor-access-help">Chọn Sửa tài khoản bác sĩ hoặc tạo tài khoản với vai trò Bác sĩ để gán hồ sơ nhân viên, khoa và phạm vi xem hồ sơ. Khung Xem thử cho thấy kết quả ngay trong biểu mẫu.</div>}
  {def||tab==='settlements'?<>{summary}{renderTable()}</>:tab==='reports'?renderReports():renderPortal()}
  
  {dialog&&<div className="modal-backdrop" onClick={()=>setDialog(null)}>
    <section className={'modal business-modal '+(['form','settlement','detail'].includes(dialog.type)?'wide-modal his-large-modal':'')} role="dialog" aria-modal="true" aria-label={dialog.type==='detail'?'Chi tiết bản ghi':'Biểu mẫu nghiệp vụ'} onClick={e=>e.stopPropagation()}>
      <button className="close icon-button" aria-label="Đóng biểu mẫu" onClick={()=>setDialog(null)}><X size={21}/></button>
      
      {dialog.type==='form' && (
        ['referrals', 'consultations', 'discharges', 'archives'].includes(tab) ? (
          <StatutoryPaperBusinessForm
            tab={tab}
            initialRow={dialog.row}
            patients={patients}
            staff={db.staff}
            onSave={(payload) => {
              const record = {
                ...dialog.row,
                ...payload,
                id: payload.id || dialog.row?.id || uid(def?.prefix || 'CT'),
                createdAt: dialog.row?.createdAt || timestamp(),
                date: dialog.row?.date || today,
                status: dialog.row?.status || def?.initialStatus || 'Đã ghi nhận'
              };
              commit(prev => ({
                ...prev,
                [tab]: dialog.row
                  ? (prev[tab] || []).map(x => x.id === dialog.row.id ? record : x)
                  : [record, ...(prev[tab] || [])]
              }), `${dialog.row ? 'Cập nhật' : 'Tạo'} ${def?.singular || 'chứng từ'} ${record.id}`);
              setDialog(null);
              notify?.('Đã lưu thông tin nghiệp vụ vào CSDL SQL Server');
            }}
            onSaveAndViewPaper={(payload) => {
              const record = {
                ...dialog.row,
                ...payload,
                id: payload.id || dialog.row?.id || uid(def?.prefix || 'CT'),
                createdAt: dialog.row?.createdAt || timestamp(),
                date: dialog.row?.date || today,
                status: dialog.row?.status || def?.initialStatus || 'Đã ghi nhận'
              };
              commit(prev => ({
                ...prev,
                [tab]: dialog.row
                  ? (prev[tab] || []).map(x => x.id === dialog.row.id ? record : x)
                  : [record, ...(prev[tab] || [])]
              }), `${dialog.row ? 'Cập nhật' : 'Tạo'} ${def?.singular || 'chứng từ'} ${record.id}`);
              notify?.('Đã lưu vào SQL Server và mở biểu mẫu in chuẩn A4');
              setDialog({ type: 'detail', row: record });
            }}
            onClose={() => setDialog(null)}
          />
        ) : (
          <RecordForm
            tab={tab}
            episodeTab={episodeTab}
            inpatientOnly={['rounds','consultations','discharges'].includes(tab)}
            definition={def}
            defaults={{doctor:actor.staffId||'',cashier:actor.staffId||'',...(scope?{patient:scope.patientId,episodeId:scope.episodeId}:{})}}
            initial={dialog.row}
            stock={stock}
            optionsFor={optionsFor}
            onSave={values=>saveRow(values,dialog.row)}
          />
        )
      )}
      
      {dialog.type==='detail'&&(
        ['referrals','consultations','discharges','settlements','prescriptions','archives','authorizations'].includes(tab) ? (
          <>
            <MedicalPaperFormViewer
              tab={tab}
              row={dialog.row}
              patient={patients.find(p => p.id === dialog.row.patient)}
              doctorStaff={db.staff.find(s => s.id === dialog.row.doctor)}
              cashierStaff={db.staff.find(s => s.id === dialog.row.cashier)}
              onSave={updatedRow => {
                setDb(d => ({
                  ...d,
                  [tab]: (d[tab] || []).map(x => x.id === updatedRow.id ? { ...x, ...updatedRow } : x)
                }));
                notify?.('Đã lưu biểu mẫu y tế vào CSDL thành công');
              }}
              onOpenBusinessForm={() => setDialog({ type: 'form', row: dialog.row })}
              onClose={() => setDialog(null)}
            />
            <div className="dialog-actions no-print" style={{ marginTop: 16 }}>
              {actions(dialog.row).map(([title,action])=><button className="primary" key={action} onClick={()=>setDialog({type:'action',row:dialog.row,action,title})}>{title}</button>)}
              {tab!=='warehouses'&&canAction(role,tab,'cancel')&&!terminal.includes(dialog.row.status)&&!['Đã phát hành','Đã ghi sổ'].includes(dialog.row.status)&&tab!=='settlements'&&<button className="secondary danger-button" onClick={()=>setDialog({type:'action',row:dialog.row,action:'cancel',title:'Hủy chứng từ'})}>Hủy chứng từ</button>}
              {tab==='settlements'&&dialog.row.status==='Chờ quyết toán'&&<button className="primary" onClick={()=>setDialog({type:'settle',row:dialog.row})}>Thực hiện quyết toán</button>}
            </div>
          </>
        ) : (
          <>
            <div className="print-heading"><h2>MediCare · {def?.title||'Quyết toán viện phí'}</h2><p>Biểu mẫu y tế chuẩn · Kết nối CSDL SQL Server</p></div>
            <h2>{dialog.row.id}</h2>
            <p className="dialog-subtitle">{dialog.row.createdAt||'Dữ liệu hệ thống'} <Tone value={dialog.row.status}/></p>
            <div className="detail-grid">
              {Object.entries(dialog.row).filter(([k,v])=>!['id','status','lines','permissions','transactionIds','allocations'].includes(k)&&typeof v!=='object'&&v!==''&&v!==undefined).map(([k,v])=>(
                <div key={k}><span>{label(k)}</span><b>{display(k,v)}</b></div>
              ))}
            </div>
            {dialog.row.allocations?.length>0&&<div className="allocation-preview"><h3>Lô thực tế đã xuất</h3>{dialog.row.allocations.map((a,i)=><div key={i}><span>{display('medicine',a.medicineId)} · {a.lot}<small>Kho {a.warehouseId} · HSD {a.expiry}{a.sourceLine&&<> · Dòng cấp: {a.sourceLine} · Đã hoàn: {a.returned||0}</>}</small></span><b>{a.quantity}</b></div>)}</div>}
            {dialog.row.lines&&<div className="table-scroll"><table><thead><tr><th>NỘI DUNG</th><th>SỐ LƯỢNG</th><th>LIỀU / ĐƠN GIÁ</th></tr></thead><tbody>{dialog.row.lines.map((l,i)=><tr key={i}><td>{l.description||display('medicine',l.medicine)}{l.route&&<small>{l.route} · {l.frequency} · {l.days} ngày</small>}</td><td>{l.quantity}</td><td>{l.dose||currency(l.price)}</td></tr>)}</tbody></table></div>}
            {dialog.row.permissions&&<div className="permission-tags">{dialog.row.permissions.map(p=><span key={p}><Check size={12}/>{p}</span>)}</div>}
            <div className="dialog-actions no-print">
              <button className="secondary" onClick={()=>window.print()}><Printer size={16}/>In biểu mẫu</button>
              {actions(dialog.row).map(([title,action])=><button className="primary" key={action} onClick={()=>setDialog({type:'action',row:dialog.row,action,title})}>{title}</button>)}
              {tab!=='warehouses'&&canAction(role,tab,'cancel')&&!terminal.includes(dialog.row.status)&&!['Đã phát hành','Đã ghi sổ'].includes(dialog.row.status)&&tab!=='settlements'&&<button className="secondary danger-button" onClick={()=>setDialog({type:'action',row:dialog.row,action:'cancel',title:'Hủy chứng từ'})}>Hủy chứng từ</button>}
              {tab==='settlements'&&dialog.row.status==='Chờ quyết toán'&&<button className="primary" onClick={()=>setDialog({type:'settle',row:dialog.row})}>Thực hiện quyết toán</button>}
            </div>
          </>
        )
      )}
      
      {dialog.type==='action'&&<ActionForm key={dialog.action} dialog={dialog} stock={stock} optionsFor={optionsFor} onSave={values=>perform(dialog.row,dialog.action,values)}/>}
      
      {dialog.type==='settlement'&&<SettlementForm scope={scope} patients={scope?patients.filter(p=>p.id===scope.patientId):patients} services={db.services} availableAdvance={availableAdvance} onSave={saveSettlement}/>}
      
      {dialog.type==='settle'&&<SimpleForm title={dialog.row.balance<0?'Hoàn tiền tạm ứng thừa':dialog.row.balance===0?'Xác nhận đủ tiền':'Thu thêm viện phí'} description={`${display('patient',dialog.row.patient)} · ${currency(Math.abs(dialog.row.balance))}${dialog.row.balance<0?' cần hoàn trả người bệnh':dialog.row.balance===0?' · Đã cấn trừ đủ':' cần thu thêm'}`} fields={[{key:'signedBy',label:'Họ tên người nộp / nhận tiền (Người bệnh hoặc Thân nhân)',required:true}]} submit="Xác nhận giao dịch viện phí" onSave={values=>settle(dialog.row,values)}><div className="inline-notice">Giao dịch được ghi nhận trực tiếp vào CSDL SQL Server và đối soát trong ca trực hiện hành.</div></SimpleForm>}
      
      {dialog.type==='portalCancel'&&<SimpleForm title="Hủy lịch hẹn" description={dialog.row.dept+' · '+dialog.row.date.replace('T',' · ')} fields={[{key:'reason',label:'Lý do hủy lịch',type:'textarea',required:true}]} submit="Xác nhận hủy lịch" onSave={v=>{setAppointments(list=>list.map(x=>x.id===dialog.row.id?{...x,status:'Đã hủy',cancelReason:v.reason}:x));setDialog(null);notify('Đã hủy lịch hẹn')}}/>}
      
      {dialog.type==='portalAppointment'&&<SimpleForm title="Đặt lịch khám" description={dialog.patient.name} fields={[{key:'dept',label:'Chuyên khoa',type:'select',options:definitions.staff.fields.find(x=>x.key==='department').options,required:true},{key:'date',label:'Ngày giờ khám',type:'datetime-local',min:today+'T00:00',required:true}]} submit="Xác nhận đặt lịch" onSave={v=>{setAppointments(list=>[...list,{...v,id:uid('LH'),name:dialog.patient.name,phone:dialog.patient.phone,status:'Đã xác nhận'}]);setDialog(null);notify('Đã ghi nhận lịch hẹn')}}/>}
    </section>
  </div>}
 </div>;
}

function Empty({text}){return <div className="business-empty"><FileText size={30}/><h3>{text}</h3><p>Thông tin sẽ hiển thị sau khi bệnh viện cập nhật.</p></div>}

function Field({field,value,onChange,optionsFor=()=>null}){
  const options=optionsFor(field)||field.options?.map(x=>({label:x,value:x}));
  const clinicalType = ['reason','reasons'].includes(field.key) ? 'reason'
    : ['history','allergy','tienSu'].includes(field.key) ? 'history'
    : ['symptoms','progress','dienBien'].includes(field.key) ? 'symptoms'
    : ['examination','physicalExam'].includes(field.key) ? 'examination'
    : ['plan','treatment','huongDieuTri'].includes(field.key) ? 'plan'
    : ['advice','note','conclusion','finding','loiDan'].includes(field.key) ? 'advice'
    : ['dose','orders','yLenh'].includes(field.key) ? 'orders'
    : null;

  return <label className={field.type==='textarea'?'span-two his-field-label':'his-field-label'}>
    {field.label}{field.required&&<em> *</em>}
    {options?(
      <select name={field.key} value={value??''} required={field.required} onChange={e=>onChange(e.target.value)} className="his-select">
        <option value="">Chọn {field.label.toLowerCase()}</option>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ):clinicalType?(
      <MedicalSuggestInput
        type={clinicalType}
        multiline={field.type==='textarea'}
        rows={field.type==='textarea'?3:1}
        value={value??''}
        onChange={onChange}
        placeholder={field.placeholder || `Nhập hoặc chọn gợi ý ${field.label.toLowerCase()}...`}
        className={field.type==='textarea'?'his-textarea':'his-input'}
      />
    ):field.type==='textarea'?(
      <textarea name={field.key} value={value??''} required={field.required} maxLength={4000} placeholder={field.placeholder} onChange={e=>onChange(e.target.value)} className="his-textarea"/>
    ):(
      <input name={field.key} value={value??''} type={field.type||'text'} required={field.required} min={field.min} max={field.max} step={field.step} pattern={field.pattern} placeholder={field.placeholder} maxLength={field.type==='number'?undefined:250} onChange={e=>onChange(e.target.value)} className="his-input"/>
    )}
  </label>;
}

function SimpleForm({title,description,fields=[],submit='Xác nhận',onSave,children,initial={},optionsFor}){
  const [values,setValues]=useState(initial),[error,setError]=useState('');
  return <>
    <h2>{title}</h2>
    <p className="dialog-subtitle">{description}</p>
    <form onSubmit={async e=>{e.preventDefault();try{setError((await onSave(values))||'')}catch(error){setError(error.message)}}}>
      {fields.map(f=><Field key={f.key} field={f} value={values[f.key]} onChange={v=>setValues({...values,[f.key]:v})} optionsFor={optionsFor}/>)}
      {children}
      {error&&<p className="form-error" role="alert">{error}</p>}
      <button className="primary full his-submit-btn" type="submit"><Check size={16}/>{submit}</button>
    </form>
  </>;
}

function RecordForm({tab,definition,initial,defaults={},episodeTab=false,inpatientOnly=false,stock,optionsFor,onSave}){
 const [inventory]=useWorkspace('inventory'),[accessDb]=useWorkspace('business'),[patients]=useWorkspace('patients');
 const [values,setValues]=useState(()=>({
   ...Object.fromEntries(definition.fields.map(f=>[f.key,f.type==='datetime-local'?today+'T09:00':f.type==='date'?today:''])),
   ...defaults,
   ...initial,
   ...(definition.lines?{lines:initial?.lines||[{medicine:stock[0]?.id||'',quantity:1,dose:'1 viên',route:'Uống',frequency:'Sáng 1 - Tối 1',days:7,beforeFood:'Uống sau ăn 30 phút'}]}:{}),
   ...(definition.permissions?{permissions:initial?.permissions||[]}:{} )
 }));
 const [error,setError]=useState(''),[saving,setSaving]=useState(false);

 function lineChange(index,key,value){setValues({...values,lines:values.lines.map((l,i)=>i===index?{...l,[key]:value}:l)})}

 // Auto BMI calculation for vitals tab
 const isVitals = tab === 'vitals';
 const bmi = values.weight && values.height ? (values.weight / Math.pow(values.height / 100, 2)).toFixed(1) : values.bmi || '22.0';
 const currentPatient = (patients || []).find(p => p.id === values.patient);
 const patientBhyt = parseBhytCard(currentPatient?.insurance);

 return <>
  <div className="his-form-header">
    <div className="his-header-title">
      {isVitals ? <HeartPulse size={24} className="his-header-icon" /> : <ClipboardList size={24} className="his-header-icon" />}
      <div>
        <h2>{initial?'Cập nhật':'Lập mới'} {definition.singular}</h2>
        <p className="his-header-sub">{definition.description}</p>
      </div>
    </div>
  </div>

  <form onSubmit={async e=>{e.preventDefault();if(saving)return;setSaving(true);try{setError((await onSave({...values, bmi}))||'')}catch(error){setError(error.message)}finally{setSaving(false)}}} className="his-form-body">
    {episodeTab&&<EpisodeField patientId={values.patient} value={values.episodeId} inpatientOnly={inpatientOnly} onChange={value=>setValues(v=>({...v,episodeId:value}))}/>}

    {values.patient && ['referrals', 'claims', 'advances', 'discharges'].includes(tab) && (
      <div style={{ marginTop: '10px', marginBottom: '14px', padding: '10px 14px', background: patientBhyt.hasInsurance ? '#f0fdf4' : '#f8fafc', border: patientBhyt.hasInsurance ? '1px solid #bbf7d0' : '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <b style={{ color: patientBhyt.hasInsurance ? '#166534' : '#334155' }}>
            {patientBhyt.hasInsurance ? `Hồ sơ BHYT: ${patientBhyt.code} (${patientBhyt.groupName})` : 'Chế độ KCB: Viện phí (Khám tự chi trả 100%)'}
          </b>
          <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: patientBhyt.hasInsurance ? '#15803d' : '#64748b' }}>
            {tab === 'referrals'
              ? (patientBhyt.hasInsurance ? `Quy chuẩn chuyển tuyến Thông tư 14/2014/TT-BYT: Giữ nguyên quyền lợi ${patientBhyt.rate}% tại cơ sở tuyến trên.` : 'Người bệnh tự chi trả chi phí chuyển viện theo biểu giá dịch vụ.')
              : tab === 'claims'
              ? (patientBhyt.hasInsurance ? `Đối soát giám định BHYT theo Quyết định 130/QĐ-BYT · Tỷ lệ Quỹ chi trả: ${patientBhyt.rate}% · Cùng chi trả: ${patientBhyt.copayRate}%` : 'Hồ sơ viện phí tự túc, không phát sinh chi phí đề nghị BHXH thanh toán.')
              : tab === 'advances'
              ? (patientBhyt.hasInsurance ? `Mức cùng chi trả dự kiến: ${patientBhyt.copayRate}% · Thu tạm ứng theo quy chế viện phí bệnh viện.` : 'Bệnh nhân tự chi trả 100% chi phí điều trị.')
              : (patientBhyt.hasInsurance ? `Mức hưởng BHYT: ${patientBhyt.rate}%` : 'Viện phí 100%')}
          </p>
        </div>
        <span className={`badge ${patientBhyt.hasInsurance ? patientBhyt.benefitBadgeClass : 'gray'}`}>
          {patientBhyt.hasInsurance ? patientBhyt.benefitBadge : 'Viện phí'}
        </span>
      </div>
    )}

    <div className="form-grid">
      {definition.fields.map(f=><Field key={f.key} field={f} value={values[f.key]} onChange={value=>setValues({...values,[f.key]:value})} optionsFor={optionsFor}/>)}
    </div>

    {isVitals&&(
      <div className="his-card" style={{ marginTop: 12 }}>
        <div className="his-card-header"><HeartPulse size={16}/><span>Tự động đánh giá thể trạng dinh dưỡng (BMI)</span></div>
        <div className="his-card-body">
          <div className="his-bmi-box">
            <span>Chỉ số khối cơ thể (BMI): <strong>{bmi} kg/m²</strong></span>
            <span className={`badge ${bmi < 18.5 ? 'amber' : bmi < 23 ? 'teal' : 'danger'}`}>
              {bmi < 18.5 ? 'Thiếu cân / Gầy' : bmi < 23 ? 'Thể trạng Bình thường' : bmi < 25 ? 'Thừa cân' : 'Béo phì'}
            </span>
          </div>
        </div>
      </div>
    )}

    {definition.prefix==='TK'&&isDoctorAccount(values,accessDb)&&<DoctorAccessFields values={values} onChange={setValues}/>}

    {definition.prefix==='KK'&&<label className="his-field-label">Lô trong kho kiểm kê *
      <select name="lotId" required value={values.lotId||''} onChange={e=>setValues({...values,lotId:e.target.value})} className="his-select">
        <option value="">Chọn lô kiểm kê</option>
        {inventory.filter(l=>l.medicineId===values.medicine&&l.warehouseId===values.warehouse).map(l=><option key={l.id} value={l.id}>{l.lot} · HSD {l.expiry} · Tồn {l.qty}</option>)}
      </select>
    </label>}

    {/* CHI TIẾT ĐƠN THUỐC VỚI PHÂN CỮ SÁNG/TRƯA/CHIỀU/TỐI (CHUẨN VIETTEL HIS) */}
    {definition.lines&&(
      <div className="his-card" style={{ marginTop: 15 }}>
        <div className="his-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pill size={16}/>
            <span>Danh mục thuốc kê đơn ({values.lines.length} mặt hàng)</span>
          </div>
          <button type="button" className="secondary his-btn-sm" onClick={()=>setValues({...values,lines:[...values.lines,{medicine:stock[0]?.id||'',quantity:1,dose:'1 viên',route:'Uống',frequency:'Sáng 1 - Tối 1',days:7,beforeFood:'Uống sau ăn'}]})}>
            <Plus size={14}/> Thêm thuốc
          </button>
        </div>

        <div className="his-card-body" style={{ padding: 12 }}>
          {values.lines.map((l,i)=>(
            <div className="his-prescription-card" key={i}>
              <div className="his-prescription-header">
                <strong>Thuốc #{i+1}</strong>
                <button type="button" className="icon-button" disabled={values.lines.length===1} aria-label={'Xóa thuốc '+(i+1)} onClick={()=>setValues({...values,lines:values.lines.filter((_,j)=>j!==i)})}>
                  <Trash2 size={15}/>
                </button>
              </div>

              <div className="form-row form-row-3">
                <label className="his-field-label">
                  Thuốc / Biệt dược *
                  <select required value={l.medicine} onChange={e=>lineChange(i,'medicine',e.target.value)} className="his-select">
                    <option value="">Chọn thuốc</option>
                    {stock.filter(s=>s.kind==='THUOC'||s.type==='Thuốc').map(s=>(
                      <option value={s.id} key={s.id}>{s.name} · {s.lot} · Tồn: {s.qty} {s.unit}</option>
                    ))}
                  </select>
                </label>
                <label className="his-field-label">
                  Số lượng kê *
                  <input required type="number" min="1" step="1" value={l.quantity} onChange={e=>lineChange(i,'quantity',e.target.value)} className="his-input"/>
                </label>
                <label className="his-field-label">
                  Đường dùng *
                  <select required value={l.route} onChange={e=>lineChange(i,'route',e.target.value)} className="his-select">
                    {['Uống','Tiêm bắp','Tiêm tĩnh mạch','Truyền tĩnh mạch','Bôi ngoài da','Nhỏ mắt','Nhỏ tai','Khí dung','Đặt dưới lưỡi'].map(r=><option key={r}>{r}</option>)}
                  </select>
                </label>
              </div>

              <div className="form-row form-row-3">
                <label className="his-field-label">
                  Liều lượng & Cữ dùng trong ngày *
                  <input required list="biz-rx-schedules" value={l.frequency} placeholder="Sáng 1v - Trưa 1v - Tối 1v" onChange={e=>lineChange(i,'frequency',e.target.value)} className="his-input"/>
                  <datalist id="biz-rx-schedules">
                    <option value="Sáng 1v - Tối 1v (sau ăn)" />
                    <option value="Sáng 1v - Trưa 1v - Tối 1v (sau ăn)" />
                    <option value="Sáng 1v (trước ăn 30p)" />
                    <option value="Tối 1v trước khi đi ngủ" />
                    <option value="Uống khi sốt ≥ 38.5°C cách 4-6 giờ" />
                    <option value="1 gói x 2 lần/ngày (hòa tan nước)" />
                  </datalist>
                </label>
                <label className="his-field-label">
                  Thời điểm uống
                  <select value={l.beforeFood||'Uống sau ăn 30 phút'} onChange={e=>lineChange(i,'beforeFood',e.target.value)} className="his-select">
                    <option>Uống sau ăn 30 phút</option>
                    <option>Uống trước ăn 30 phút</option>
                    <option>Uống ngay sau ăn no</option>
                    <option>Uống trước khi đi ngủ</option>
                    <option>Uống khi có cơn đau</option>
                  </select>
                </label>
                <label className="his-field-label">
                  Số ngày dùng *
                  <input required type="number" min="1" step="1" value={l.days} onChange={e=>lineChange(i,'days',e.target.value)} className="his-input"/>
                </label>
              </div>
            </div>
          ))}
          <div className="inline-notice">Hệ thống tự động liên kết kho FEFO để xuất thuốc hạn dùng gần nhất khi Dược sĩ cấp phát.</div>
        </div>
      </div>
    )}

    {definition.permissions&&<fieldset className="permissions"><legend>Phân quyền chức năng</legend>{permissionNames.map(p=><label key={p}><input type="checkbox" checked={values.permissions.includes(p)} onChange={e=>setValues({...values,permissions:e.target.checked?[...values.permissions,p]:values.permissions.filter(x=>x!==p)})}/>{p}</label>)}</fieldset>}

    {error&&<p role="alert" className="form-error">{error}</p>}
    <button className="primary full his-submit-btn" type="submit" disabled={saving}><Check size={16}/>Lưu {definition.singular}</button>
  </form>
 </>;
}

function ActionForm({dialog,stock,optionsFor,onSave}){
 const {row,action,title}=dialog;const [saving,setSaving]=useState(false);const [error,setError]=useState(''),[values,setValues]=useState({counted:row.counted||0,reason:row.reason||'',nurse:'',warehouse:''});
 
 const isLabResult = action === 'result';
 const [labRows, setLabRows] = useState([
   { name: 'WBC (Bạch cầu)', value: '6.8', unit: 'G/L', reference: '4.0 - 10.0', status: 'Bình thường' },
   { name: 'RBC (Hồng cầu)', value: '4.5', unit: 'T/L', reference: '3.8 - 5.5', status: 'Bình thường' },
   { name: 'HGB (Huyết sắc tố)', value: '138', unit: 'g/L', reference: '120 - 165', status: 'Bình thường' },
   { name: 'PLT (Tiểu cầu)', value: '240', unit: 'G/L', reference: '150 - 450', status: 'Bình thường' },
   { name: 'Glucose (Đường huyết lúc đói)', value: '5.4', unit: 'mmol/L', reference: '3.9 - 6.4', status: 'Bình thường' },
   { name: 'Creatinine (Chức năng thận)', value: '82', unit: 'µmol/L', reference: '53 - 106', status: 'Bình thường' }
 ]);

 const fields=action==='result'?[
   {key:'conclusion',label:'Kết luận chuyên môn Cận lâm sàng *',type:'textarea',required:true,placeholder:'Các chỉ số xét nghiệm huyết học và sinh hóa trong giới hạn bình thường.'},
   {key:'critical',label:'Cảnh báo giá trị nguy kịch',type:'select',options:['Không','Có - Báo ngay Bác sĩ lâm sàng'],required:true},
   {key:'pacs',label:'Mã tham chiếu hệ thống PACS / Thiết bị xét nghiệm',placeholder:'SID-2026-88129'}
 ]:['reject','cancel'].includes(action)?[
   {key:'reason',label:'Lý do thao tác *',type:'textarea',required:true}
 ]:action==='confirmCash'?[
   {key:'signedBy',label:'Họ tên người nộp / nhận tiền *',required:true}
 ]:action==='closeShift'?[
   {key:'counted',label:'Tiền thực đếm (₫) *',type:'number',min:0,step:1,required:true},
   {key:'reason',label:'Giải trình nếu có chênh lệch',type:'textarea'}
 ]:action==='maintain'?[
   {key:'maintenance',label:'Nội dung sửa chữa và kết quả nghiệm thu *',type:'textarea',required:true},
   {key:'engineer',label:'Kỹ sư thiết bị y tế thực hiện *',required:true}
 ]:action==='administer'?[
   {key:'patientCheck',label:'Nhập mã bệnh nhân để đối chiếu *',required:true},
   {key:'nurse',label:'Điều dưỡng thực hiện *',type:'staff',required:true},
   {key:'note',label:'Ghi chú theo dõi lâm sàng sau dùng thuốc',type:'textarea'}
 ]:[];

 return <>
  <div className="his-form-header">
    <div className="his-header-title">
      <Activity size={24} className="his-header-icon" />
      <div>
        <h2>{title}</h2>
        <p className="his-header-sub">Chứng từ {row.id} · Trạng thái hiện tại: <Tone value={row.status}/></p>
      </div>
    </div>
  </div>

  <form onSubmit={async e=>{
    e.preventDefault();
    if(saving)return;
    setSaving(true);
    try{
      const payload = isLabResult ? { ...values, rows: labRows, result: values.conclusion } : values;
      setError((await onSave(payload))||'');
    }catch(error){
      setError(error.message);
    }finally{
      setSaving(false);
    }
  }} className="his-form-body">
    {action==='administer'&&<div className="inline-notice">
      Bệnh nhân: <b>{row.patient}</b><br/>
      Y lệnh: {row.kind} · {stock.find(x=>x.id===row.medicine)?.name||'Không dùng thuốc'} · {row.quantity||'—'} · {row.dose||'Theo nội dung y lệnh'}<br/>
      Dự kiến thực hiện: {row.scheduled?.replace('T',' · ')}
    </div>}

    {/* BẢNG KẾT QUẢ XÉT NGHIỆM CHUẨN VIETTEL HIS */}
    {isLabResult&&(
      <div className="his-card">
        <div className="his-card-header"><Activity size={16}/><span>Bảng kết quả chỉ số Cận lâm sàng chi tiết</span></div>
        <div className="his-card-body" style={{ padding: 0 }}>
          <div className="table-scroll">
            <table className="his-mini-table">
              <thead>
                <tr>
                  <th>TÊN CHỈ SỐ</th>
                  <th style={{ width: 120 }}>KẾT QUẢ *</th>
                  <th style={{ width: 100 }}>ĐƠN VỊ</th>
                  <th style={{ width: 140 }}>KHOẢNG THAM CHIẾU</th>
                  <th style={{ width: 130 }}>CẢNH BÁO</th>
                </tr>
              </thead>
              <tbody>
                {labRows.map((r, idx)=>(
                  <tr key={idx}>
                    <td><b>{r.name}</b></td>
                    <td>
                      <input
                        value={r.value}
                        onChange={e=>{
                          const next = [...labRows];
                          next[idx].value = e.target.value;
                          setLabRows(next);
                        }}
                        className="his-input his-table-input"
                      />
                    </td>
                    <td>{r.unit}</td>
                    <td><small>{r.reference}</small></td>
                    <td>
                      <select
                        value={r.status}
                        onChange={e=>{
                          const next = [...labRows];
                          next[idx].status = e.target.value;
                          setLabRows(next);
                        }}
                        className="his-select his-table-select"
                      >
                        <option>Bình thường</option>
                        <option>Thấp [L]</option>
                        <option>Cao [H]</option>
                        <option>Nguy kịch [Cao/Nguy hiểm]</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {fields.map(f=><Field key={f.key} field={f} value={values[f.key]} optionsFor={optionsFor} onChange={v=>setValues({...values,[f.key]:v})}/>)}

    {action==='administer'&&<fieldset className="permissions"><legend>Đối chiếu quy tắc 5 Đúng trong Y tế</legend>{[['patient','Đúng người bệnh'],['medicine','Đúng thuốc / y lệnh'],['dose','Đúng liều dùng'],['route','Đúng đường dùng'],['time','Đúng thời điểm']].map(([key,text])=><label key={key}><input type="checkbox" required checked={!!values['check_'+key]} onChange={e=>setValues({...values,['check_'+key]:e.target.checked})}/>{text}</label>)}</fieldset>}

    {(action==='dispense'||action==='administer'&&(row.kind==='Dùng thuốc'||row.stockRequired))&&<>
      <Field field={{key:'warehouse',label:'Kho xuất thuốc *',type:'warehouse',required:true}} value={values.warehouse} optionsFor={optionsFor} onChange={v=>setValues({...values,warehouse:v})}/>
      <AllocationPreview requests={action==='dispense'?row.lines:[{medicine:row.medicine,quantity:row.quantity}]} warehouse={values.warehouse}/>
    </>}

    {action==='approveMovement'&&<div className="inline-notice">{row.kind} · Kho {row.warehouse} · {row.quantity} đơn vị {row.destination?'→ Kho '+row.destination:''}{row.lot?' · Lô '+row.lot:''}</div>}

    {error&&<p className="form-error" role="alert">{error}</p>}
    <button className="primary full his-submit-btn" type="submit" disabled={saving}><Check size={16}/>Xác nhận thực hiện</button>
  </form>
 </>;
}

/* =============================================================================
   FORM QUYẾT TOÁN VIỆN PHÍ CHUẨN BẢNG KÊ CHI PHÍ MẪU 01/BV (VIETTEL HIS ENGINE)
   Tuân thủ nghiêm ngặt Quyết định 130/QĐ-BYT, QĐ 3618/QĐ-BHXH & Thông tư 20/2022/TT-BYT
   Nghiêm cấm gian lận BHYT (Điều 215 BLHS) - Khóa cứng thuốc ngoài danh mục (Panadol Extra)
   ============================================================================= */
function SettlementForm({scope,initialLines,patients,services,availableAdvance,onSave}){
  const [db] = useWorkspace('business');
  const [stock] = useWorkspace('stock');
  const [patientId,setPatientId]=useState(scope?.patientId||patients[0]?.id||'');
  const currentPatient = patients.find(p => p.id === patientId);
  const patientBhyt = parseBhytCard(currentPatient?.insurance);
  const [episodeId,setEpisodeId]=useState(scope?.episodeId||'');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  // BHYT rate auto-detected from card code
  const [insuranceRate, setInsuranceRate] = useState(patientBhyt.rate);
  useEffect(() => {
    const bh = parseBhytCard(currentPatient?.insurance);
    setInsuranceRate(bh.rate);
  }, [patientId, currentPatient]);

  const COST_GROUPS = [
    '1. Tiền khám bệnh',
    '2. Xét nghiệm',
    '3. Chẩn đoán hình ảnh',
    '4. Thủ thuật & Phẫu thuật',
    '5. Thuốc & Dịch truyền',
    '6. Vật tư y tế',
    '7. Máu & Chế phẩm máu',
    '8. Tiền ngày giường'
  ];

  const [lines,setLines]=useState(initialLines?.length ? initialLines.map(l => {
    const el = isBhytEligibleItem(l.description || l.name || '');
    return {
      ...l,
      quantity: Number(l.quantity || l.qty || 1),
      price: Number(l.price || 0),
      inBhyt: el.eligible && l.insuranceCovered !== false,
      insuranceCovered: el.eligible && l.insuranceCovered !== false,
      nonBhytReason: !el.eligible ? el.reason : l.nonBhytReason
    };
  }) : [
    { category: '1. Tiền khám bệnh', description: 'Khám chuyên khoa Nội tổng quát', quantity: 1, price: 150000, insuranceCovered: true, inBhyt: true },
    { category: '2. Xét nghiệm', description: 'Tổng phân tích tế bào máu ngoại vi (CBC - 24 thông số)', quantity: 1, price: 110000, insuranceCovered: true, inBhyt: true },
    { category: '3. Chẩn đoán hình ảnh', description: 'Chụp X-quang tim phổi thẳng kỹ thuật số', quantity: 1, price: 150000, insuranceCovered: true, inBhyt: true },
    { category: '5. Thuốc & Dịch truyền', description: 'Paracetamol 500mg (Viên nén)', quantity: 10, price: 1200, insuranceCovered: true, inBhyt: true },
    { category: '5. Thuốc & Dịch truyền', description: 'Panadol Extra 500mg/65mg (Chứa Caffeine)', quantity: 10, price: 1500, insuranceCovered: false, inBhyt: false, nonBhytReason: 'Ngoài danh mục TT 20/2022/TT-BYT (chứa Caffeine)' }
  ]);

  // Load actual clinical services and medications when episode is selected
  useEffect(() => {
    if (episodeId && !initialLines?.length) {
      const matchedLabs = (db.labs || []).filter(r => r.episodeId === episodeId && r.status !== 'Đã hủy');
      const matchedCharges = (db.clinicalCharges || []).filter(r => r.episodeId === episodeId && r.status !== 'Đã hủy');
      const matchedRx = (db.prescriptions || []).filter(r => r.episodeId === episodeId && r.status !== 'Đã hủy');

      const labItems = matchedLabs.map(r => {
        const s = db.services.find(x => x.id === r.service);
        const name = s?.name || r.service;
        const el = isBhytEligibleItem(name);
        const isEligible = el.eligible && s?.inBhyt !== false;
        return {
          category: s?.kind === 'Chẩn đoán hình ảnh' ? '3. Chẩn đoán hình ảnh' : '2. Xét nghiệm',
          description: name,
          quantity: 1,
          price: Number(r.price ?? s?.price ?? 110000),
          insuranceCovered: isEligible,
          inBhyt: isEligible,
          nonBhytReason: !isEligible ? el.reason : undefined,
          sourceId: r.id
        };
      });

      const chargeItems = matchedCharges.map(r => {
        const s = db.services.find(x => x.id === r.service);
        const name = s?.name || r.service;
        const el = isBhytEligibleItem(name);
        const isEligible = el.eligible && s?.inBhyt !== false;
        return {
          category: '1. Tiền khám bệnh',
          description: name,
          quantity: Number(r.quantity) || 1,
          price: Number(r.price ?? s?.price ?? 150000),
          insuranceCovered: isEligible,
          inBhyt: isEligible,
          nonBhytReason: !isEligible ? el.reason : undefined,
          sourceId: r.id
        };
      });

      const rxItems = matchedRx.flatMap(rx => (rx.lines || []).map(line => {
        const m = stock.find(s => s.id === line.medicine);
        const medName = m?.name || line.medicine;
        const el = isBhytEligibleItem(medName);
        const isPanadolExtra = /panadol extra|caffeine/i.test(medName);
        const isCovered = !isPanadolExtra && el.eligible && (m?.insurancePrice > 0 || m?.coBHYT === 1 || m?.giaBHYT > 0 || /paracetamol|augmentin|zinnat|nexium|ceftriaxone|berberin/i.test(medName) || m?.inBhyt !== false);
        return {
          category: '5. Thuốc & Dịch truyền',
          description: medName,
          quantity: Number(line.quantity) || 1,
          price: Number(m?.price || m?.cost || line.price || 2500),
          insuranceCovered: isCovered,
          inBhyt: isCovered,
          nonBhytReason: isPanadolExtra ? 'Thuốc phối hợp chứa Caffeine không thuộc danh mục TT 20/2022/TT-BYT (Nghiêm cấm quyết toán BHYT)' : (!isCovered ? (el.reason || 'Ngoài danh mục thuốc BHYT') : undefined),
          sourceId: rx.id
        };
      }));

      const combined = [...chargeItems, ...labItems, ...rxItems];
      if (combined.length > 0) {
        setLines(combined);
      }
    }
  }, [episodeId, initialLines, db.labs, db.clinicalCharges, db.prescriptions, db.services, stock]);

  const [showAuditor, setShowAuditor] = useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'F4') {
        e.preventDefault();
        const submitBtn = document.getElementById('his-settle-submit-btn');
        if (submitBtn) submitBtn.click();
      } else if (e.key === 'F10') {
        e.preventDefault();
        setShowAuditor(prev => !prev);
      } else if (e.key === 'F12') {
        e.preventDefault();
        setShowPrintPreview(prev => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [error,setError]=useState(''),[saving,setSaving]=useState(false);

  function changeLine(i, key, val) {
    setLines(prev => prev.map((l, j) => {
      if (j !== i) return l;
      const updated = { ...l, [key]: val };
      if (key === 'insuranceCovered') {
        updated.inBhyt = val;
      }
      if (key === 'description') {
        const el = isBhytEligibleItem(val);
        if (!el.eligible) {
          updated.insuranceCovered = false;
          updated.inBhyt = false;
          updated.nonBhytReason = el.reason;
        } else {
          updated.insuranceCovered = true;
          updated.inBhyt = true;
          updated.nonBhytReason = undefined;
        }
      }
      return updated;
    }));
  }

  function removeLine(i) {
    setLines(prev => prev.filter((_, j) => j !== i));
  }

  // Process every row through statutory BHYT eligibility check
  const processedLines = lines.map((l, idx) => {
    const qty = Number(l.quantity) || 1;
    const price = Number(l.price) || 0;
    const lineGross = qty * price;
    const el = isBhytEligibleItem(l.description);
    // Strict statutory rule: If drug is legally ineligible (e.g. Panadol Extra containing Caffeine), it is ALWAYS false
    // Automatic coverage: Reimbursable items are 100% automated by catalog and card benefit rate without manual checkboxes
    const isCovered = el.eligible && l.inBhyt !== false && insuranceRate > 0;
    const lineBHYT = isCovered ? Math.round((lineGross * insuranceRate) / 100) : 0;
    const lineCopay = isCovered ? (lineGross - lineBHYT) : 0;
    const lineOutOfPocket = !isCovered ? lineGross : 0;
    const linePatient = lineCopay + lineOutOfPocket;

    return {
      ...l,
      idx,
      quantity: qty,
      price,
      lineGross,
      isCovered,
      isEligible: el.eligible,
      nonBhytReason: !el.eligible ? el.reason : (l.nonBhytReason || (!isCovered ? (insuranceRate === 0 ? 'Khám tự nguyện / Chưa áp dụng thẻ BHYT' : 'Người bệnh tự chi trả (Ngoài BHYT)') : undefined)),
      lineBHYT,
      lineCopay,
      lineOutOfPocket,
      linePatient
    };
  });

  const inBhytRows = processedLines.filter(l => l.isCovered);
  const outBhytRows = processedLines.filter(l => !l.isCovered);

  const gross = processedLines.reduce((s, l) => s + l.lineGross, 0);
  const insuranceCoveredAmount = processedLines.reduce((s, l) => s + l.lineBHYT, 0);
  const patientCopayAmount = processedLines.reduce((s, l) => s + l.lineCopay, 0);
  const patientOutOfPocketAmount = processedLines.reduce((s, l) => s + l.lineOutOfPocket, 0);
  const totalPatientDue = patientCopayAmount + patientOutOfPocketAmount;
  const advance = patientId ? availableAdvance(patientId, episodeId) : 0;
  const balance = totalPatientDue - advance;

  return (
    <div className="his-cashier-desk">
      {/* HEADER BÀN THU NGÂN VIỆN PHÍ */}
      <div className="his-cashier-header">
        <div className="his-header-title">
          <Receipt size={22} className="his-header-icon" />
          <div>
            <h2 style={{ fontSize: 16, margin: 0, fontWeight: 750 }}>Thu ngân viện phí · Bảng kê Mẫu 01/BV</h2>
            <p className="his-header-sub" style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
              Quyết định 130/QĐ-BYT · Tách bạch tự động Quỹ BHYT & Người bệnh chi trả
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="secondary no-print his-btn-sm"
            onClick={() => setShowAuditor(prev => !prev)}
            title="Xem bảng minh bạch căn cứ pháp lý giám định BHYT theo QĐ 130 và TT 20/2022"
            style={{
              background: showAuditor ? '#0f766e' : '#f8fafc',
              color: showAuditor ? '#ffffff' : '#0f766e',
              borderColor: '#0d9488',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <Shield size={13} /> {showAuditor ? 'Đóng căn cứ (F10)' : 'Căn cứ BHYT (F10)'}
          </button>
          <button type="button" className="secondary no-print his-btn-sm" onClick={() => setShowPrintPreview(true)} title="In bảng kê chi phí A4 chuẩn cho người bệnh ký">
            <Printer size={14} /> In Mẫu 01/BV (F12)
          </button>
        </div>
      </div>

      <form onSubmit={async e => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
          const payload = {
            patient: patientId,
            episodeId,
            insurance: insuranceCoveredAmount,
            lines: processedLines.map(l => ({
              category: l.category,
              description: l.description,
              quantity: l.quantity,
              price: l.price,
              insuranceCovered: l.isCovered,
              inBhyt: l.isCovered,
              nonBhytReason: l.nonBhytReason
            })),
            gross,
            advance,
            balance
          };
          setError((await onSave(payload)) || '');
        } catch (err) {
          setError(err.message);
        } finally {
          setSaving(false);
        }
      }} className="his-form-body">
        
        {/* THANH THÔNG TIN BỆNH NHÂN & THẺ BHYT (CHUẨN VIETTEL HIS) */}
        <div className="his-cashier-patient-ribbon">
          <div className="his-ribbon-row-1">
            <label className="his-ribbon-field">
              <span>Họ tên người bệnh *</span>
              <select required value={patientId} onChange={e => setPatientId(e.target.value)} className="his-select-sm">
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} · {p.id}</option>
                ))}
              </select>
            </label>

            <label className="his-ribbon-field">
              <span>Lượt khám / Đợt điều trị *</span>
              <EpisodeField patientId={patientId} value={episodeId} onChange={setEpisodeId} />
            </label>

            <label className="his-ribbon-field">
              <span>Mức hưởng BHYT áp dụng *</span>
              <select
                value={insuranceRate}
                onChange={e => setInsuranceRate(Number(e.target.value))}
                className="his-select-sm"
              >
                {BHYT_RATE_OPTIONS.map(opt => (
                  <option key={opt.rate} value={opt.rate}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="his-ribbon-row-2">
            {patientBhyt.hasInsurance ? (
              <div className="his-bhyt-chip-bar">
                <span className="his-bhyt-chip-item"><b>Thẻ BHYT:</b> {patientBhyt.code}</span>
                <span className="his-bhyt-chip-item"><b>Nhóm:</b> {patientBhyt.groupCode} ({patientBhyt.groupName})</span>
                <span className={`badge ${patientBhyt.benefitBadgeClass}`}>{patientBhyt.benefitBadge}</span>
                <span className="badge teal">Đúng tuyến KCB</span>
                <span className="his-bhyt-chip-item"><b>Cùng chi trả:</b> {patientBhyt.copayRate}%</span>
              </div>
            ) : (
              <div className="his-bhyt-chip-bar his-selfpay-bar">
                <span><b>Đối tượng:</b> Khám tự nguyện / Viện phí 100% (Không thẻ BHYT)</span>
                <span className="badge gray">Viện phí 100%</span>
              </div>
            )}
          </div>
        </div>

        {/* BẢNG MINH BẠCH CĂN CỨ PHÁP LÝ BHYT (F10) */}
        {showAuditor && (
          <div className="his-auditor-panel" style={{
            background: '#f0fdfa',
            border: '1px solid #99f6e4',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '12px',
            fontSize: '11.5px',
            color: '#134e4a',
            lineHeight: '1.6'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #ccfbf1', paddingBottom: '6px' }}>
              <b style={{ fontSize: '12.5px', color: '#0f766e', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} /> BẢNG MINH BẠCH CĂN CỨ PHÁP LÝ GIÁM ĐỊNH BHYT (QUYẾT ĐỊNH 130 & TT 20/2022/TT-BYT)
              </b>
              <span style={{ fontSize: '10px', background: '#ccfbf1', color: '#0f766e', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                BẢO VỆ PHÁP LÝ · 100% TỰ ĐỘNG
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#047857' }}>✓ PHẠM VI THANH TOÁN QUỸ BHYT ({insuranceRate}%):</p>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  <li>Dịch vụ kỹ thuật, Khám bệnh, CĐHA: Thuộc Danh mục BHYT theo giá phê duyệt CSDL SQL Server (QĐ 130/QĐ-BYT).</li>
                  <li>Thuốc thiết yếu (Amoxicillin, Kháng sinh, Paracetamol đơn chất): Đúng danh mục TT 20/2022/TT-BYT.</li>
                  <li>Quỹ BHYT chi trả: <b>{currency(insuranceCoveredAmount)}</b> ({insuranceRate}%) · Bệnh nhân cùng chi trả: <b>{currency(patientCopayAmount)}</b> ({100 - insuranceRate}%).</li>
                </ul>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#b91c1c' }}>✗ NGOÀI DANH MỤC / TỰ TÚC 100% (NGHIÊM CẤM QUYẾT TOÁN BHYT):</p>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  <li>Thuốc phối hợp chứa Caffeine (Panadol Extra 500mg/65mg): <b>Khóa cứng BHYT = 0%</b> theo Điều khoản loại trừ TT 20/2022/TT-BYT.</li>
                  <li>Ngăn chặn tuyệt đối hành vi gian lận bảo hiểm y tế theo <b>Điều 215 Bộ luật Hình sự</b>.</li>
                  <li>Người bệnh tự chi trả 100%: <b>{currency(patientOutOfPocketAmount)}</b>.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* BẢNG KÊ CHI TIẾT CHI PHÍ (AUDITED DATAGRID) */}
        <div className="his-table-card">
          <div className="his-table-toolbar">
            <div className="his-table-toolbar-left">
              <ClipboardList size={15} style={{ color: '#0f766e' }} />
              <span>Bảng kê chi tiết chi phí ({lines.length} mục)</span>
            </div>
            <div className="his-table-toolbar-right">
              {/* Thêm nhanh DV kỹ thuật / CLS */}
              <select
                aria-label="Thêm nhanh từ danh mục dịch vụ"
                value=""
                onChange={e => {
                  const s = services.find(x => x.id === e.target.value);
                  if (s) {
                    const el = isBhytEligibleItem(s.name);
                    const isCovered = el.eligible && s.inBhyt !== false;
                    setLines(prev => [
                      ...prev,
                      {
                        category: s.kind === 'Chẩn đoán hình ảnh' ? '3. Chẩn đoán hình ảnh' : '2. Xét nghiệm',
                        description: s.name,
                        quantity: 1,
                        price: Number(s.price || 0),
                        insuranceCovered: isCovered,
                        inBhyt: isCovered,
                        nonBhytReason: !isCovered ? el.reason : undefined
                      }
                    ]);
                  }
                }}
                className="his-select-xs"
              >
                <option value="">+ Thêm DV kỹ thuật / CLS...</option>
                {services.filter(s => s.status === 'Đang hoạt động').map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({currency(s.price)})</option>
                ))}
              </select>

              {/* Thêm nhanh thuốc từ kho dược */}
              <select
                aria-label="Thêm thuốc từ kho dược"
                value=""
                onChange={e => {
                  const m = stock.find(x => x.id === e.target.value);
                  if (m) {
                    const el = isBhytEligibleItem(m.name);
                    const isPanadolExtra = /panadol extra|caffeine/i.test(m.name);
                    const isCovered = !isPanadolExtra && el.eligible && (m.insurancePrice > 0 || m.coBHYT === 1 || m.giaBHYT > 0 || /paracetamol|augmentin|zinnat|nexium|ceftriaxone|berberin/i.test(m.name) || m.inBhyt !== false);
                    setLines(prev => [
                      ...prev,
                      {
                        category: '5. Thuốc & Dịch truyền',
                        description: m.name,
                        quantity: 1,
                        price: Number(m.price || m.cost || 2000),
                        insuranceCovered: isCovered,
                        inBhyt: isCovered,
                        nonBhytReason: isPanadolExtra ? 'Thuốc phối hợp chứa Caffeine không thuộc danh mục TT 20/2022/TT-BYT (Nghiêm cấm quyết toán BHYT)' : (!isCovered ? (el.reason || 'Ngoài danh mục thuốc BHYT') : undefined)
                      }
                    ]);
                  }
                }}
                className="his-select-xs"
              >
                <option value="">+ Thêm thuốc từ kho dược...</option>
                {stock.filter(s => !s.locked).map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({currency(m.price || m.cost)})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-scroll">
            <table className="his-audited-table">
              <thead>
                <tr>
                  <th style={{ width: 135 }}>NHÓM CHI PHÍ</th>
                  <th>TÊN DỊCH VỤ / THUỐC / VẬT TƯ</th>
                  <th style={{ width: 60, textAlign: 'center' }}>SL</th>
                  <th style={{ width: 95, textAlign: 'right' }}>ĐƠN GIÁ (₫)</th>
                  <th style={{ width: 90, textAlign: 'center' }}>MỨC HƯỞNG</th>
                  <th style={{ width: 110, textAlign: 'right' }}>QUỸ BHYT (₫)</th>
                  <th style={{ width: 115, textAlign: 'right' }}>BN TRẢ (₫)</th>
                  <th style={{ width: 36, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {/* MỤC I: CHI PHÍ TRONG PHẠM VI BHYT */}
                {inBhytRows.length > 0 && (
                  <>
                    <tr className="his-section-divider-row his-section-in-bhyt">
                      <td colSpan={8}>
                        I. CHI PHÍ TRONG PHẠM VI QUỸ BHYT THANH TOÁN (Mức hưởng {insuranceRate}%)
                      </td>
                    </tr>
                    {inBhytRows.map(l => (
                      <tr key={'in_' + l.idx}>
                        <td>
                          <span className="his-cat-badge">{l.category}</span>
                        </td>
                        <td>
                          <div><b>{l.description}</b></div>
                          <span className="his-tag-bhyt-ok"><Check size={10} /> Trong DM BHYT</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={l.quantity}
                            onChange={e => changeLine(l.idx, 'quantity', e.target.value)}
                            className="his-input-qty"
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {currency(l.price)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="his-rate-active" title={`Quỹ BHYT chi trả tự động ${insuranceRate}% theo quyền lợi thẻ`}>
                            {insuranceRate}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', color: '#047857', fontWeight: 700 }}>
                          {currency(l.lineBHYT)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#1e40af', fontWeight: 600 }}>
                          {currency(l.lineCopay)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="icon-button"
                            disabled={lines.length === 1}
                            onClick={() => removeLine(l.idx)}
                            title="Xóa dòng này"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* MỤC II: CHI PHÍ NGOÀI DANH MỤC BHYT */}
                {outBhytRows.length > 0 && (
                  <>
                    <tr className="his-section-divider-row his-section-out-bhyt">
                      <td colSpan={8}>
                        II. CHI PHÍ NGOÀI DANH MỤC BHYT THANH TOÁN (Người bệnh tự chi trả 100%)
                      </td>
                    </tr>
                    {outBhytRows.map(l => (
                      <tr key={'out_' + l.idx} style={{ background: '#fffdf7' }}>
                        <td>
                          <span className="his-cat-badge">{l.category}</span>
                        </td>
                        <td>
                          <div><b>{l.description}</b></div>
                          {!l.isEligible ? (
                            <span className="his-tag-bhyt-forbidden" title={l.nonBhytReason}>
                              <Lock size={10} /> Ngoài DM BHYT
                            </span>
                          ) : (
                            <span className="his-tag-bhyt-selfpay" title="Dịch vụ/thuốc thuộc danh mục BHYT nhưng người bệnh tự chi trả">
                              <ShieldAlert size={10} /> {insuranceRate === 0 ? 'Khám tự nguyện' : (l.nonBhytReason || 'Tự chi trả')}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={l.quantity}
                            onChange={e => changeLine(l.idx, 'quantity', e.target.value)}
                            className="his-input-qty"
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {currency(l.price)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="his-rate-locked" title={!l.isEligible ? "Ngoài danh mục BHYT - Người bệnh tự chi trả 100%" : "Khám tự nguyện / Ngoài BHYT"}>
                            0%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}>
                          0 ₫
                        </td>
                        <td style={{ textAlign: 'right', color: '#b45309', fontWeight: 700 }}>
                          {currency(l.lineOutOfPocket)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="icon-button"
                            disabled={lines.length === 1}
                            onClick={() => removeLine(l.idx)}
                            title="Xóa dòng này"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* THANH TỔNG HỢP CHI PHÍ & THANH TOÁN VIỆN PHÍ (STICKY BOTTOM BAR CHUẨN HIS) */}
        <div className="his-cashier-summary-bar">
          <div className="his-summary-metrics">
            <div className="his-metric-item">
              <span className="his-metric-label">Tổng viện phí</span>
              <strong className="his-metric-value">{currency(gross)}</strong>
            </div>
            <div className="his-metric-item">
              <span className="his-metric-label">Quỹ BHYT ({insuranceRate}%)</span>
              <strong className="his-metric-value text-green">{currency(insuranceCoveredAmount)}</strong>
            </div>
            <div className="his-metric-item">
              <span className="his-metric-label">Cùng chi trả</span>
              <strong className="his-metric-value">{currency(patientCopayAmount)}</strong>
            </div>
            <div className="his-metric-item">
              <span className="his-metric-label">Ngoài BHYT</span>
              <strong className="his-metric-value text-amber">{currency(patientOutOfPocketAmount)}</strong>
            </div>
            {advance > 0 && (
              <div className="his-metric-item">
                <span className="his-metric-label">Tạm ứng</span>
                <strong className="his-metric-value">{currency(advance)}</strong>
              </div>
            )}
            <div className="his-metric-item his-metric-highlight">
              <span className="his-metric-label">
                {balance > 0 ? 'BN CẦN NỘP THÊM' : balance < 0 ? 'HOÀN TRẢ LẠI BN' : 'ĐÃ ĐỦ TIỀN'}
              </span>
              <strong className="his-metric-value-huge">
                {currency(Math.abs(balance))}
              </strong>
            </div>
          </div>

          <div className="his-summary-actions">
            <button
              id="his-settle-submit-btn"
              type="submit"
              className="primary his-btn-pay"
              disabled={saving}
              title="Phím tắt: F4"
            >
              <Check size={16} /> {saving ? 'Đang lưu...' : `Xác nhận thu tiền (F4)`}
            </button>
          </div>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
      </form>

      {/* MODAL XEM TRƯỚC VÀ IN MẪU 01/BV A4 CHUẨN BỘ Y TẾ */}
      {showPrintPreview && (
        <div className="his-modal-overlay" onClick={() => setShowPrintPreview(false)}>
          <div className="his-modal-card" onClick={e => e.stopPropagation()}>
            <div className="his-modal-header no-print">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Printer size={18} style={{ color: '#0f766e' }} />
                <b style={{ fontSize: 14 }}>Xem trước & In Bảng kê chi phí KCB (Mẫu 01/BV) chuẩn Bộ Y tế</b>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="primary his-btn-sm" onClick={() => window.print()}>
                  <Printer size={14} /> In A4 Ngay
                </button>
                <button type="button" className="icon-button" onClick={() => setShowPrintPreview(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="his-modal-body">
              <MedicalBillPaperForm
                row={{
                  id: episodeId || uid('TT'),
                  patient: patientId,
                  patientName: currentPatient?.name,
                  insuranceCard: currentPatient?.insurance,
                  lines: processedLines.map(l => ({
                    name: l.description,
                    category: l.category,
                    qty: l.quantity,
                    price: l.price,
                    inBhyt: l.isCovered,
                    insuranceCovered: l.isCovered,
                    bhytRate: l.isCovered ? insuranceRate : 0,
                    nonBhytReason: l.nonBhytReason
                  })),
                  gross,
                  insurance: insuranceCoveredAmount,
                  advance,
                  balance
                }}
                patient={currentPatient}
                cashierStaff={db.staff?.find(s => s.role === 'cashier') || { name: 'Thu ngân MediCare' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
