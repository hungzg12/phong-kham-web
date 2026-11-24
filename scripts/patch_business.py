import sys

file_biz = r"z:\Tailieu\PhanTichCTDL_GT\phong-kham-web\src\Business.jsx"
with open(file_biz, "r", encoding="utf-8") as f:
    c_biz = f.read().replace("\r\n", "\n")

# 1. Imports
c_biz = c_biz.replace(
    "import {Plus,Search,Download,Eye,Pencil,X,Check,ArrowRight,FileText,Trash2,Printer,Shield,ShieldCheck,ShieldAlert,Lock,AlertCircle,Activity,ClipboardList,Wallet,ChevronLeft,ChevronRight,HeartPulse,Pill,FileSpreadsheet,Receipt} from 'lucide-react';",
    "import {Plus,Search,Download,Eye,Pencil,X,Check,ArrowRight,FileText,Trash2,Printer,Shield,ShieldCheck,ShieldAlert,Lock,AlertCircle,Activity,ClipboardList,Wallet,ChevronLeft,ChevronRight,HeartPulse,Pill,FileSpreadsheet,Receipt,Volume2,Play,RotateCcw} from 'lucide-react';"
)

# 2. Handler inside Business component
t_handler_old = """  const pendingSettlementVisits=(visits||[]).filter(v=>v.status==='Chờ thanh toán');"""

t_handler_new = """  const pendingSettlementVisits=(visits||[]).filter(v=>v.status==='Chờ thanh toán');

  const handleCallNextCashier = () => {
    if (!pendingSettlementVisits.length) {
      notify('Hàng đợi hiện không có người bệnh nào đang chờ thanh toán.');
      return;
    }
    const target = pendingSettlementVisits[0];
    const p = patients.find(x => x.id === target.patientId);
    notify(`🔊 Đang gọi STT ${target.queueTag || '#' + target.queueNumber}: Người bệnh ${p?.name || target.patientId} vào Quầy Thu ngân Viện phí thanh toán!`);
    setDialog({type: 'settlement', scope: {patientId: target.patientId, episodeId: target.id}});
  };"""

# 3. Queue banner replacement
t_banner_old = """  {tab==='settlements'&&pendingSettlementVisits.length>0&&(
    <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:'8px',padding:'10px 14px',margin:'12px 16px 0',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        <span className="badge amber" style={{fontSize:'12px',padding:'3px 8px',fontWeight:700}}>⚡ HÀNG ĐỢI THU TIỀN: {pendingSettlementVisits.length} ca</span>
        <span style={{fontSize:'12.5px',color:'#1e40af'}}>Người bệnh vừa khám xong đang chờ thu ngân:</span>
      </div>
      <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
        {pendingSettlementVisits.map(v=>{
          const p=patients.find(x=>x.id===v.patientId);
          return <button key={v.id} type="button" className="secondary" style={{fontSize:'12px',padding:'3px 8px',fontWeight:600,background:'#ffffff'}} onClick={()=>setDialog({type:'settlement',scope:{patientId:v.patientId,episodeId:v.id}})}>
            {v.queueTag ? `${v.queueTag} · ` : v.queueNumber ? `#${v.queueNumber} · ` : ''}{p?.name || v.patientId} ({v.id})
          </button>;
        })}
      </div>
    </div>
  )}"""

t_banner_new = """  {tab==='settlements'&&pendingSettlementVisits.length>0&&(
    <div className="queue-dispatch-bar" style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:'10px',padding:'12px 16px',margin:'12px 16px 0',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:'6px',color:'#1e40af',fontWeight:700,fontSize:'13px'}}>
          <Volume2 size={18} />
          <span>Quầy Thu ngân Viện phí:</span>
        </div>
        <span className="badge amber" style={{fontSize:'12px',padding:'3px 8px',fontWeight:700}}>⚡ HÀNG ĐỢI: {pendingSettlementVisits.length} ca chờ thanh toán</span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
        <button
          type="button"
          className="primary"
          style={{fontSize:'12.5px',padding:'6px 13px',display:'flex',alignItems:'center',gap:'6px',background:'#0284c7',color:'#fff',border:'none',borderRadius:'6px',fontWeight:600,cursor:'pointer'}}
          onClick={handleCallNextCashier}
          title="Gọi người bệnh kế tiếp vào Quầy Thu ngân thanh toán viện phí / BHYT"
        >
          <Play size={14} fill="currentColor" /> Gọi số tiếp theo vào thu tiền
        </button>
      </div>
      <div style={{display:'flex',gap:'6px',flexWrap:'wrap',width:'100%',marginTop:'4px',paddingTop:'8px',borderTop:'1px dashed #bfdbfe'}}>
        <span style={{fontSize:'12px',color:'#64748b',marginRight:'4px',alignSelf:'center'}}>Danh sách chờ:</span>
        {pendingSettlementVisits.map(v=>{
          const p=patients.find(x=>x.id===v.patientId);
          return <button key={v.id} type="button" className="secondary" style={{fontSize:'12px',padding:'3px 8px',fontWeight:600,background:'#ffffff'}} onClick={()=>{notify(`🔊 Đang gọi STT ${v.queueTag || '#' + v.queueNumber}: Người bệnh ${p?.name || v.patientId} vào Quầy Thu ngân!`);setDialog({type:'settlement',scope:{patientId:v.patientId,episodeId:v.id}});}}>
            {v.queueTag ? `${v.queueTag} · ` : v.queueNumber ? `#${v.queueNumber} · ` : ''}{p?.name || v.patientId} ({v.id})
          </button>;
        })}
      </div>
    </div>
  )}"""

print("handler:", t_handler_old in c_biz)
print("banner:", t_banner_old in c_biz)

if t_handler_old in c_biz and t_banner_old in c_biz:
    c_biz = c_biz.replace(t_handler_old, t_handler_new)
    c_biz = c_biz.replace(t_banner_old, t_banner_new)
    with open(file_biz, "w", encoding="utf-8") as f:
        f.write(c_biz)
    print("BUSINESS PATCHED SUCCESSFULLY")
else:
    print("BUSINESS PATCH FAILED")
    sys.exit(1)
