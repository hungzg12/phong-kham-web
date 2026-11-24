import sys

file_path = r"z:\Tailieu\PhanTichCTDL_GT\phong-kham-web\src\Inventory.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read().replace("\r\n", "\n")

# 1. Add icons
import_old = "import { Plus, Search, Download, Package, Pill, AlertCircle, X, Check, ArrowRight, RefreshCw, Building2, Trash2, FileSpreadsheet, Truck, ShieldCheck, ClipboardList, CheckCircle2, Clock, Printer, User, FileText } from 'lucide-react';"
import_new = "import { Plus, Search, Download, Package, Pill, AlertCircle, X, Check, ArrowRight, RefreshCw, Building2, Trash2, FileSpreadsheet, Truck, ShieldCheck, ClipboardList, CheckCircle2, Clock, Printer, User, FileText, Volume2, Play, RotateCcw } from 'lucide-react';"

if import_old in content:
    content = content.replace(import_old, import_new)
elif "Volume2" not in content:
    print("Import not found and Volume2 not present!")
    sys.exit(1)

# 2. Add handleCallNextPharmacy
handler_hook = "  const pendingRxCount = allPrescriptions.filter(r => ['Chờ cấp phát', 'Đã xác nhận', 'Nháp'].includes(r.status)).length;"
handler_code = """  const pendingRxCount = allPrescriptions.filter(r => ['Chờ cấp phát', 'Đã xác nhận', 'Nháp'].includes(r.status)).length;

  const handleCallNextPharmacy = () => {
    const pendingList = filteredPrescriptions.filter(r => ['Chờ cấp phát', 'Đã xác nhận', 'Nháp'].includes(r.status));
    if (!pendingList.length) {
      notify && notify('Hàng đợi hiện không có đơn thuốc nào đang chờ cấp phát.');
      return;
    }
    const target = pendingList[0];
    const p = (patients || []).find(item => item.id === target.patient) || { name: target.patientName || target.patient };
    const v = (visits || []).find(x => x.id === target.episodeId);
    const tag = v?.queueTag || (v?.queueNumber ? `#${v.queueNumber}` : target.id);
    notify && notify(`🔊 Đang gọi STT ${tag}: Người bệnh ${p.name} vào Quầy Dược nhận thuốc!`);
    setActiveRx(target);
  };"""

if handler_hook in content:
    content = content.replace(handler_hook, handler_code)
else:
    print("Handler hook not found!")
    sys.exit(1)

# 3. Add Pharmacy Queue Dispatch Bar above table
toolbar_hook = "{tab === 'dispense' && (\n          <>"
toolbar_bar = """{tab === 'dispense' && (
          <>
            {pendingRxCount > 0 && (
              <div className="queue-dispatch-bar" style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'10px',padding:'12px 16px',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',color:'#166534',fontWeight:700,fontSize:'13px'}}>
                    <Volume2 size={18} />
                    <span>Quầy Dược phát thuốc ngoại trú:</span>
                  </div>
                  <span className="badge amber" style={{fontSize:'12px',padding:'3px 8px',fontWeight:700}}>⚡ HÀNG ĐỢI: {pendingRxCount} đơn chờ cấp phát</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                  <button
                    type="button"
                    className="primary"
                    style={{fontSize:'12.5px',padding:'6px 13px',display:'flex',alignItems:'center',gap:'6px',background:'#16a34a',color:'#fff',border:'none',borderRadius:'6px',fontWeight:600,cursor:'pointer'}}
                    onClick={handleCallNextPharmacy}
                    title="Gọi người bệnh kế tiếp vào Quầy Dược nhận thuốc"
                  >
                    <Play size={14} fill="currentColor" /> Gọi số tiếp theo nhận thuốc
                  </button>
                </div>
              </div>
            )}"""

if toolbar_hook in content:
    content = content.replace(toolbar_hook, toolbar_bar)
else:
    print("Dispense table start not found!")
    sys.exit(1)

# 4. Add individual call button in row actions
row_action_hook = """                          <div className="row-actions">
                            <button className="secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setActiveRx(rx)}>
                              Chi tiết
                            </button>"""

row_action_new = """                          <div className="row-actions">
                            {isPending && (
                              <button
                                type="button"
                                className="secondary"
                                style={{ padding: '5px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: '#166534', borderColor: '#86efac' }}
                                title="Gọi người bệnh này vào Quầy Dược nhận thuốc"
                                onClick={() => {
                                  const v = (visits || []).find(x => x.id === rx.episodeId);
                                  const tag = v?.queueTag || (v?.queueNumber ? `#${v.queueNumber}` : rx.id);
                                  notify && notify(`🔊 Đang gọi STT ${tag}: Người bệnh ${p.name} vào Quầy Dược nhận thuốc!`);
                                }}
                              >
                                <Volume2 size={13} /> Gọi
                              </button>
                            )}
                            <button className="secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setActiveRx(rx)}>
                              Chi tiết
                            </button>"""

if row_action_hook in content:
    content = content.replace(row_action_hook, row_action_new)
else:
    print("Row action hook not found!")
    sys.exit(1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("INVENTORY PATCHED SUCCESSFULLY")
