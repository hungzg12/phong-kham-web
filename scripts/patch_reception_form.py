import sys

file_path = r"z:\Tailieu\PhanTichCTDL_GT\phong-kham-web\src\ReceptionForm.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    c = f.read().replace("\r\n", "\n")

# 1. Imports
c = c.replace(
    "import { HeartPulse, Search, AlertTriangle, IdCard, Shield, Stethoscope, Check, X, UserCheck } from 'lucide-react';",
    "import { HeartPulse, Search, AlertTriangle, IdCard, Shield, Stethoscope, Check, X, UserCheck, Printer } from 'lucide-react';"
)

# 2. Add DEPT_PREFIX and states
t_decl_old = """const CLINIC_ROOMS = [
  { code: 'PK-NOI', name: 'Phòng khám 101 - Nội tổng quát', dept: 'Nội tổng quát', doctor: 'BS.CKI Trần Minh Anh' },
  { code: 'PK-TIM', name: 'Phòng khám 102 - Tim mạch can thiệp', dept: 'Tim mạch', doctor: 'ThS.BS Nguyễn Văn An' },
  { code: 'PK-TMH', name: 'Phòng khám 103 - Tai Mũi Họng', dept: 'Tai Mũi Họng', doctor: 'BS.CKII Lê Thị Mai' },
  { code: 'PK-DA',  name: 'Phòng khám 104 - Da liễu & Thẩm mỹ', dept: 'Da liễu', doctor: 'BS Đỗ Hoàng Long' },
  { code: 'PK-SAN', name: 'Phòng khám 105 - Sản phụ khoa', dept: 'Sản phụ khoa', doctor: 'BS.CKI Phạm Quỳnh Hoa' },
  { code: 'PK-CXK', name: 'Phòng khám 106 - Cơ xương khớp', dept: 'Cơ xương khớp', doctor: 'ThS.BS Đặng Quốc Tuấn' },
];

export default function ReceptionForm({ mode = 'register', patient, onDone }) {
  const [patients] = useWorkspace('patients');
  const [visits] = useWorkspace('visits');
  const [selected, setSelected] = useState(patient?.id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');"""

t_decl_new = """const CLINIC_ROOMS = [
  { code: 'PK-NOI', name: 'Phòng khám 101 - Nội tổng quát', dept: 'Nội tổng quát', doctor: 'BS.CKI Trần Minh Anh' },
  { code: 'PK-TIM', name: 'Phòng khám 102 - Tim mạch can thiệp', dept: 'Tim mạch', doctor: 'ThS.BS Nguyễn Văn An' },
  { code: 'PK-TMH', name: 'Phòng khám 103 - Tai Mũi Họng', dept: 'Tai Mũi Họng', doctor: 'BS.CKII Lê Thị Mai' },
  { code: 'PK-DA',  name: 'Phòng khám 104 - Da liễu & Thẩm mỹ', dept: 'Da liễu', doctor: 'BS Đỗ Hoàng Long' },
  { code: 'PK-SAN', name: 'Phòng khám 105 - Sản phụ khoa', dept: 'Sản phụ khoa', doctor: 'BS.CKI Phạm Quỳnh Hoa' },
  { code: 'PK-CXK', name: 'Phòng khám 106 - Cơ xương khớp', dept: 'Cơ xương khớp', doctor: 'ThS.BS Đặng Quốc Tuấn' },
];

const DEPT_PREFIX = {
  'Nội tổng quát': 'NOI',
  'Tim mạch': 'TIM',
  'Tai Mũi Họng': 'TMH',
  'Da liễu': 'DA',
  'Sản phụ khoa': 'SAN',
  'Cơ xương khớp': 'CXK'
};

export default function ReceptionForm({ mode = 'register', patient, onDone }) {
  const [patients] = useWorkspace('patients');
  const [visits] = useWorkspace('visits');
  const [selected, setSelected] = useState(patient?.id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [issuedTicket, setIssuedTicket] = useState(null);

  const getNextQueueTag = (roomCode) => {
    const room = CLINIC_ROOMS.find(r => r.code === roomCode);
    const prefix = room?.dept ? (DEPT_PREFIX[room.dept] || roomCode.replace(/^PK-/, '')) : 'PK';
    const roomVisits = (visits || []).filter(v => v.department === room?.dept || v.roomCode === roomCode);
    const maxNum = roomVisits.reduce((m, v) => Math.max(m, Number(v.queueNumber) || 0), 0);
    return `${prefix}-${String(maxNum + 1).padStart(2, '0')}`;
  };"""

# 3. Submit handling
t_submit_old = """        result = await hisApi.createVisit(payload);
        message = `Tiếp đón thành công! Cấp STT ${result.queueTag || `#${result.queueNumber}`} tại ${result.roomName || chosenRoom.name}`;
      }

      await syncWithSqlServer();
      onDone(message, result);"""

t_submit_new = """        result = await hisApi.createVisit(payload);
        message = `Tiếp đón thành công! Cấp STT ${result.queueTag || getNextQueueTag(selectedRoom)} tại ${result.roomName || chosenRoom.name}`;
        await syncWithSqlServer();
        setIssuedTicket({
          queueTag: result.queueTag || getNextQueueTag(selectedRoom),
          queueNumber: result.queueNumber,
          patientName: fullName.trim().toUpperCase(),
          age: calculatedAge(),
          gender,
          department: chosenRoom.dept,
          roomName: chosenRoom.name,
          doctor: chosenRoom.doctor,
          time: new Date().toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'}),
          message
        });
        return;
      }

      await syncWithSqlServer();
      onDone(message, result);"""

# 4. Room selection preview
t_room_old = """                      {CLINIC_ROOMS.map(room => (
                        <option key={room.code} value={room.code}>
                          {room.dept}
                        </option>
                      ))}
                    </select>
                  </label>"""

t_room_new = """                      {CLINIC_ROOMS.map(room => (
                        <option key={room.code} value={room.code}>
                          {room.dept} - {room.name} ({getNextQueueTag(room.code)})
                        </option>
                      ))}
                    </select>
                    <div style={{marginTop: '8px', padding: '8px 12px', background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span style={{fontSize: '12px', color: '#065f46', fontWeight: 600}}>⚡ STT tự động cấp tiếp theo:</span>
                        <span className="badge teal" style={{fontSize: '14px', fontWeight: 800, padding: '2px 8px', fontFamily: 'monospace'}}>
                          {getNextQueueTag(selectedRoom)}
                        </span>
                      </div>
                      <span style={{fontSize: '11.5px', color: '#047857'}}>
                        {chosenRoom.doctor}
                      </span>
                    </div>
                  </label>"""

# 5. Modal Ticket at end of ReceptionForm
t_end_old = """      </form>
    </div>
  );
}"""

t_end_new = """      </form>

      {/* POPUP PHIẾU KHÁM BỆNH & SỐ THỨ TỰ */}
      {issuedTicket && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div style={{background:'#ffffff',borderRadius:'14px',boxShadow:'0 20px 25px -5px rgba(0,0,0,0.2)',width:'100%',maxWidth:'440px',overflow:'hidden',border:'1px solid #cbd5e1',textAlign:'center'}}>
            <div style={{background:'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',color:'#ffffff',padding:'18px 20px'}}>
              <span style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'1px',fontWeight:700,opacity:0.9}}>Bệnh viện Đa khoa MediCare</span>
              <h3 style={{margin:'4px 0 0',fontSize:'16px',fontWeight:700}}>PHIẾU KHÁM BỆNH & SỐ THỨ TỰ</h3>
            </div>
            <div style={{padding:'24px 20px'}}>
              <span style={{fontSize:'12px',color:'#64748b',fontWeight:600,textTransform:'uppercase'}}>Số thứ tự khám bệnh (STT)</span>
              <div style={{fontSize:'48px',fontWeight:900,color:'#0f766e',letterSpacing:'2px',fontFamily:'monospace',margin:'6px 0 14px',background:'#f0fdfa',border:'2px dashed #99f6e4',borderRadius:'10px',padding:'10px'}}>
                {issuedTicket.queueTag}
              </div>
              <div style={{textAlign:'left',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'12px 14px',fontSize:'12.5px',display:'grid',gap:'6px',marginBottom:'18px'}}>
                <div><b>Họ tên người bệnh:</b> <span style={{color:'#0f172a',fontWeight:700}}>{issuedTicket.patientName}</span> {issuedTicket.age ? `(${issuedTicket.age}·${issuedTicket.gender})` : ''}</div>
                <div><b>Chuyên khoa:</b> <span>{issuedTicket.department}</span></div>
                <div><b>Phòng khám:</b> <b style={{color:'#0f766e'}}>{issuedTicket.roomName}</b></div>
                <div><b>Bác sĩ phụ trách:</b> <span>{issuedTicket.doctor}</span></div>
                <div><b>Thời điểm cấp số:</b> <span style={{color:'#64748b'}}>{issuedTicket.time}</span></div>
              </div>
              <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 18px',lineHeight:1.6}}>
                Quý khách vui lòng cầm phiếu này đến trước cửa <b>{issuedTicket.roomName}</b> và theo dõi âm thanh loa gọi số.
              </p>
              <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
                <button type="button" className="secondary" style={{padding:'8px 16px',fontSize:'13px'}} onClick={()=>{window.print();}}>
                  <Printer size={15}/> In phiếu STT
                </button>
                <button type="button" className="primary" style={{padding:'8px 20px',fontSize:'13px'}} onClick={()=>{onDone(issuedTicket.message);}}>
                  Hoàn tất tiếp đón
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}"""

print("decl:", t_decl_old in c)
print("submit:", t_submit_old in c)
print("room:", t_room_old in c)
print("end:", t_end_old in c)

if t_decl_old in c and t_submit_old in c and t_room_old in c and t_end_old in c:
    c = c.replace(t_decl_old, t_decl_new)
    c = c.replace(t_submit_old, t_submit_new)
    c = c.replace(t_room_old, t_room_new)
    c = c.replace(t_end_old, t_end_new)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(c)
    print("RECEPTION FORM PATCHED SUCCESSFULLY")
else:
    print("PATCH FAILED")
    sys.exit(1)
