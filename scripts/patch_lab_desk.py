import sys

# 1. Patch src/LabDesk.jsx
file_lab = r"z:\Tailieu\PhanTichCTDL_GT\phong-kham-web\src\LabDesk.jsx"
with open(file_lab, "r", encoding="utf-8") as f:
    c_lab = f.read().replace("\r\n", "\n")

# Imports in LabDesk
c_lab = c_lab.replace(
    "import { Search, Plus, Trash2, Printer, Check, Sparkles, Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock, User, Building2, Stethoscope, FileText, Camera } from 'lucide-react';",
    "import { Search, Plus, Trash2, Printer, Check, Sparkles, Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock, User, Building2, Stethoscope, FileText, Camera, Volume2, Play, RotateCcw } from 'lucide-react';"
)

# Handlers in LabDesk
t_lab_handlers_old = """  // Active group & active service
  const activeGroup = patientGroups.find(g => g.key === selectedGroupKey) || patientGroups[0];
  const row = activeGroup?.services.find(s => s.id === selectedServiceId) || activeGroup?.services[0];
  const canWrite = canAction(role, 'labs', 'accept');"""

t_lab_handlers_new = """  // Active group & active service
  const activeGroup = patientGroups.find(g => g.key === selectedGroupKey) || patientGroups[0];
  const row = activeGroup?.services.find(s => s.id === selectedServiceId) || activeGroup?.services[0];
  const canWrite = canAction(role, 'labs', 'accept');
  const [calledLabKey, setCalledLabKey] = useState('');

  const selectedRoomObj = LAB_ROOMS.find(r => r.id === selectedRoom) || LAB_ROOMS[0];

  function callLabPatient(g) {
    if (!g) return;
    setCalledLabKey(g.key);
    setSelectedGroupKey(g.key);
    setSelectedServiceId(g.services[0]?.id || '');
    const gVisit = visits.find(v => v.id === g.episodeId) || visits.find(v => v.patientId === g.patientId);
    const qTag = gVisit?.queueTag || g.patientObj?.queueTag || (`CLS-${String(patientGroups.findIndex(x => x.key === g.key) + 1).padStart(2, '0')}`);
    notify(`🔊 Đang gọi STT ${qTag}: Người bệnh ${g.patientName} vào ${selectedRoomObj.name || 'Phòng Cận lâm sàng'} thực hiện chỉ định!`);
  }

  function handleCallNextLab() {
    if (!patientGroups.length) {
      notify('Hàng đợi hiện không có người bệnh nào chờ cận lâm sàng.');
      return;
    }
    const curIdx = patientGroups.findIndex(g => g.key === (calledLabKey || activeGroup?.key));
    let nextG = null;
    if (curIdx >= 0 && curIdx < patientGroups.length - 1) {
      nextG = patientGroups[curIdx + 1];
    } else {
      nextG = patientGroups[0];
    }
    callLabPatient(nextG);
  }

  function handleRecallLab() {
    if (!activeGroup) return;
    const gVisit = visits.find(v => v.id === activeGroup.episodeId) || visits.find(v => v.patientId === activeGroup.patientId);
    const qTag = gVisit?.queueTag || activeGroup.patientObj?.queueTag || (`CLS-${String(patientGroups.findIndex(x => x.key === activeGroup.key) + 1).padStart(2, '0')}`);
    notify(`🔊 Gọi lại: Mời người bệnh STT ${qTag} - ${activeGroup.patientName} vào ${selectedRoomObj.name || 'Phòng Cận lâm sàng'}!`);
  }"""

c_lab = c_lab.replace(t_lab_handlers_old, t_lab_handlers_new)

# Lab Dispatch bar right before {/* 3. Main Split Desk Layout */}
t_lab_bar_old = """      {/* 3. Main Split Desk Layout */}
      <div className="desk-layout">"""

t_lab_bar_new = """      {/* 2b. Lab Queue Calling Bar */}
      <div className="queue-dispatch-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 16px', marginBottom: '14px', flexWrap: 'wrap', gap: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7c3aed', fontWeight: 600, fontSize: '13px' }}>
            <Volume2 size={18} />
            <span>Đang phục vụ CLS:</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge violet" style={{ fontSize: '13px', fontWeight: 700, padding: '3px 8px' }}>
              STT {activeGroup ? ((visits.find(v=>v.id===activeGroup.episodeId||v.patientId===activeGroup.patientId)?.queueTag) || activeGroup.patientObj?.queueTag || `CLS-${String(patientGroups.findIndex(g=>g.key===activeGroup.key)+1).padStart(2,'0')}`) : '—'}
            </span>
            <b style={{ fontSize: '14px', color: '#0f172a' }}>{activeGroup?.patientName || 'Chưa chọn hồ sơ'}</b>
            {activeGroup?.counts && (
              <span className="badge blue" style={{ fontSize: '11px' }}>
                {activeGroup.counts.done === activeGroup.counts.total ? '⚡ ĐÃ HOÀN TẤT KQ' : `${activeGroup.counts.total} chỉ định CLS`}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="primary"
            style={{ fontSize: '12.5px', padding: '6px 13px', display: 'flex', alignItems: 'center', gap: '6px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            onClick={handleCallNextLab}
            title="Gọi người bệnh kế tiếp vào phòng làm xét nghiệm / CĐHA"
          >
            <Play size={14} fill="currentColor" /> Gọi số tiếp theo vào phòng CLS
          </button>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: '12.5px', padding: '6px 11px', display: 'flex', alignItems: 'center', gap: '5px' }}
            onClick={handleRecallLab}
            disabled={!activeGroup}
            title="Nhắc lại loa gọi người bệnh vào phòng CLS"
          >
            <RotateCcw size={14} /> Gọi lại
          </button>
        </div>
      </div>

      {/* 3. Main Split Desk Layout */}
      <div className="desk-layout">"""

c_lab = c_lab.replace(t_lab_bar_old, t_lab_bar_new)

# Card line in LabDesk
t_lab_card_old = """                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                      <span style={{ background: isSelected ? '#dbeafe' : '#f1f5f9', color: isSelected ? '#2563eb' : '#475569', fontSize: '11px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <b style={{ fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {g.patientName}
                      </b>"""

t_lab_card_new = """                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                      <span style={{ background: isSelected ? '#dbeafe' : '#f1f5f9', color: isSelected ? '#2563eb' : '#475569', fontSize: '11px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                        {(visits.find(v=>v.id===g.episodeId||v.patientId===g.patientId)?.queueTag) || g.patientObj?.queueTag || String(idx + 1).padStart(2, '0')}
                      </span>
                      <b style={{ fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {g.patientName}
                      </b>"""

c_lab = c_lab.replace(t_lab_card_old, t_lab_card_new)

with open(file_lab, "w", encoding="utf-8") as f:
    f.write(c_lab)
print("LAB DESK PATCHED SUCCESSFULLY")
