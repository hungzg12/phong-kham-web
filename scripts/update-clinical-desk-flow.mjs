import fs from 'node:fs';

const filePath = 'src/ClinicalDesk.jsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Replace the vitals section in Tab 1
const vitalsStartTarget = '<div style={{background:\'#f8fafc\',border:\'1px solid #e2e8f0\',borderRadius:\'8px\',padding:\'12px 14px\',marginBottom:\'14px\'}}><div style={{display:\'flex\',justifyContent:\'space-between\',alignItems:\'center\',marginBottom:\'8px\'}}><h4 style={{margin:0,fontSize:\'13px\',fontWeight:700,color:\'#0f172a\',display:\'flex\',alignItems:\'center\',gap:6}}><Activity size={15} color="#0f766e"/>Chỉ số sinh tồn</h4>';
const vitalsEndTarget = '{showExtraVitals&&<label>BMI<output>{Number(note.vitals?.height)>0&&Number(note.vitals?.weight)>0?(Number(note.vitals.weight)/(Number(note.vitals.height)/100)**2).toFixed(2):\'—\'}</output></label>}</div></div>';

const newVitalsBlock = `<div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'12px 14px',marginBottom:'14px'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
    <h4 style={{margin:0,fontSize:'13px',fontWeight:700,color:'#0f172a',display:'flex',alignItems:'center',gap:6}}>
      <Activity size={15} color="#0f766e"/>Chỉ số sinh hiệu (Huyết áp, Chiều cao, Cân nặng)
    </h4>
    {!hasVitals && (
      <button
        type="button"
        className="text-button"
        onClick={() => {
          setNote(n => ({
            ...n,
            vitals: {
              ...n.vitals,
              pressure: '120/80',
              height: 165,
              weight: 60,
              pulse: n.vitals?.pulse || 78,
              temperature: n.vitals?.temperature || 36.8,
              spo2: n.vitals?.spo2 || 98
            }
          }));
          setDirty(true);
        }}
        style={{fontSize:'11.5px',color:'#0f766e',fontWeight:600,background:'#ecfdf5',border:'1px solid #a7f3d0',padding:'3px 8px',borderRadius:'4px'}}
      >
        ⚡ Điền nhanh chuẩn (120/80, 165cm, 60kg)
      </button>
    )}
  </div>
  {!hasVitals && (
    <div style={{background:'#fffbeb',border:'1px solid #fde68a',color:'#92400e',borderRadius:'6px',padding:'6px 10px',fontSize:'12px',marginBottom:'10px',display:'flex',alignItems:'center',gap:'6px'}}>
      <span>⏳ <b>Lưu ý:</b> Bệnh nhân chưa đo sinh hiệu tại Bàn Điều dưỡng. Điều dưỡng cần đo Huyết áp, Chiều cao, Cân nặng trước khi khám.</span>
    </div>
  )}
  <div className="desk-vitals" style={{gridTemplateColumns:'repeat(4, 1fr)'}}>
    <label>
      Huyết áp (mmHg)
      <input
        type="text"
        placeholder="120/80"
        value={note.vitals?.pressure || ''}
        onChange={e => {
          setNote(n => ({ ...n, vitals: { ...n.vitals, pressure: e.target.value } }));
          setDirty(true);
        }}
      />
    </label>
    <label>
      Chiều cao (cm)
      <input
        type="number"
        step="0.5"
        placeholder="165"
        value={note.vitals?.height || ''}
        onChange={e => {
          setNote(n => ({ ...n, vitals: { ...n.vitals, height: e.target.value } }));
          setDirty(true);
        }}
      />
    </label>
    <label>
      Cân nặng (kg)
      <input
        type="number"
        step="0.5"
        placeholder="60"
        value={note.vitals?.weight || ''}
        onChange={e => {
          setNote(n => ({ ...n, vitals: { ...n.vitals, weight: e.target.value } }));
          setDirty(true);
        }}
      />
    </label>
    <label>
      BMI (kg/m²)
      <output style={{fontWeight:700,color:'#0f766e'}}>
        {Number(note.vitals?.height) > 0 && Number(note.vitals?.weight) > 0
          ? (Number(note.vitals.weight) / Math.pow(Number(note.vitals.height) / 100, 2)).toFixed(1)
          : '—'}
      </output>
    </label>
  </div>
</div>`;

const vStart = code.indexOf(vitalsStartTarget);
const vEnd = code.indexOf(vitalsEndTarget);

if (vStart !== -1 && vEnd !== -1) {
  code = code.slice(0, vStart) + newVitalsBlock + code.slice(vEnd + vitalsEndTarget.length);
  console.log('✓ Successfully replaced Tab 1 vitals block');
} else {
  console.error('Failed to locate vitals targets', { vStart, vEnd });
  process.exit(1);
}

// 2. Add navigation buttons at end of Tab 1 (before </fieldset></>})
const tab1EndTarget = '{inpatient&&<div style={{marginTop:\'10px\'}}><label>Kế hoạch chăm sóc & điều trị nội trú<MedicalSuggestInput type="plan" department={episode.department} multiline rows={2} value={note.plan||\'\'} onChange={val=>change(\'plan\',val)} placeholder="Kế hoạch chăm sóc và theo dõi điều trị nội trú..." disabled={!canWrite}/></label></div>}</div></fieldset></>}';

const newTab1End = `{inpatient&&<div style={{marginTop:'10px'}}><label>Kế hoạch chăm sóc & điều trị nội trú<MedicalSuggestInput type="plan" department={episode.department} multiline rows={2} value={note.plan||''} onChange={val=>change('plan',val)} placeholder="Kế hoạch chăm sóc và theo dõi điều trị nội trú..." disabled={!canWrite}/></label></div>}</div>
  <div style={{background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:'10px',padding:'12px 16px',marginTop:'16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
    <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',fontSize:'13.5px',fontWeight:700,color:'#0f172a',margin:0}}>
      <input
        type="checkbox"
        style={{width:'18px',height:'18px',cursor:'pointer',accentColor:'#0f766e'}}
        checked={hasClsOrder || selectedServices.length > 0}
        onChange={e => setHasClsOrder(e.target.checked)}
      />
      <span>Chỉ định Cận lâm sàng (Xét nghiệm / Chẩn đoán hình ảnh / Thăm dò chức năng)</span>
    </label>
    <div>
      {(hasClsOrder || selectedServices.length > 0) ? (
        <button
          type="button"
          className="primary"
          style={{padding:'9px 18px',fontSize:'13px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:'8px',background:'#0f766e',borderColor:'#0d9488'}}
          onClick={() => { setTab('services'); setError(''); }}
        >
          Chuyển sang chỉ định Cận lâm sàng (CLS) <ArrowRight size={16}/>
        </button>
      ) : (
        <button
          type="button"
          className="primary"
          style={{padding:'9px 18px',fontSize:'13px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:'8px',background:'#2563eb',borderColor:'#1d4ed8'}}
          onClick={() => { setTab('rx'); setError(''); }}
        >
          Chuyển sang Kê đơn thuốc <ArrowRight size={16}/>
        </button>
      )}
    </div>
  </div>
</fieldset></>}`;

if (code.includes(tab1EndTarget)) {
  code = code.replace(tab1EndTarget, newTab1End);
  console.log('✓ Successfully replaced Tab 1 bottom navigation');
} else {
  console.error('Failed to locate tab1EndTarget');
  process.exit(1);
}

// 3. Add navigation buttons at end of Tab 2 (before </>} after RecordList)
const tab2EndTarget = '<RecordList rows={charges} columns={[[\'id\',\'Mã phiếu\'],[\'name\',\'Dịch vụ\'],[\'status\',\'Trạng thái\']]}/></>}';

const newTab2End = `<RecordList rows={charges} columns={[['id','Mã phiếu'],['name','Dịch vụ'],['status','Trạng thái']]}/><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'18px',paddingTop:'14px',borderTop:'1px solid #e2e8f0',flexWrap:'wrap',gap:'10px'}}><button type="button" className="secondary" style={{padding:'9px 16px',fontSize:'13px',fontWeight:600,display:'inline-flex',alignItems:'center',gap:'6px'}} onClick={()=>{setTab('exam');setError('');}}><ArrowLeft size={15}/> Quay lại Khám & Chẩn đoán</button><button type="button" className="primary" style={{padding:'9px 18px',fontSize:'13px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:'6px',background:'#2563eb',borderColor:'#1d4ed8'}} onClick={()=>{setTab('rx');setError('');}}>Tiếp tục sang Kê đơn thuốc <ArrowRight size={15}/></button></div></>}`;

if (code.includes(tab2EndTarget)) {
  code = code.replace(tab2EndTarget, newTab2End);
  console.log('✓ Successfully replaced Tab 2 bottom navigation');
} else {
  console.error('Failed to locate tab2EndTarget');
  process.exit(1);
}

// 4. Add navigation buttons at end of Tab 3 (before </>;})() at end of prescriptions)
const tab3EndTarget = '{!prescriptions.length&&<p className="desk-muted">Chưa có đơn thuốc.</p>}</>;})()}';

const newTab3End = `{!prescriptions.length&&<p className="desk-muted">Chưa có đơn thuốc.</p>}<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'18px',paddingTop:'14px',borderTop:'1px solid #e2e8f0',flexWrap:'wrap',gap:'10px'}}><button type="button" className="secondary" style={{padding:'9px 16px',fontSize:'13px',fontWeight:600,display:'inline-flex',alignItems:'center',gap:'6px'}} onClick={()=>{setTab(hasClsOrder||labs.length?'services':'exam');setError('');}}><ArrowLeft size={15}/> {hasClsOrder||labs.length?'Quay lại Cận lâm sàng':'Quay lại Khám lâm sàng'}</button><div style={{display:'flex',gap:'8px'}}><button type="button" className="secondary" style={{padding:'9px 14px',fontSize:'13px',fontWeight:600,display:'inline-flex',alignItems:'center',gap:'6px'}} onClick={()=>{setTab('costs');setError('');}}>Xem Chi phí & BHYT <ArrowRight size={15}/></button><button type="button" className="primary" style={{padding:'9px 18px',fontSize:'13px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:'6px',background:'#059669',borderColor:'#047857'}} onClick={()=>save(true)} disabled={locked||saving}><Check size={16}/> Lưu & Kết thúc lượt khám (F4)</button></div></div></>;})()}`;

if (code.includes(tab3EndTarget)) {
  code = code.replace(tab3EndTarget, newTab3End);
  console.log('✓ Successfully replaced Tab 3 bottom navigation');
} else {
  console.error('Failed to locate tab3EndTarget');
  process.exit(1);
}

// 5. Add navigation buttons at end of Tab 4 (before </>;\r\n})() after corrections)
const tab4EndTarget = '{record?.corrections?.map((r,i)=><p key={i} className="desk-muted">Đính chính: {r.reason} · {r.time}</p>)}\r\n    </div>\r\n  </>;';
const tab4EndTargetLF = '{record?.corrections?.map((r,i)=><p key={i} className="desk-muted">Đính chính: {r.reason} · {r.time}</p>)}\n    </div>\n  </>;';

const newTab4End = (crlf) => `{record?.corrections?.map((r,i)=><p key={i} className="desk-muted">Đính chính: {r.reason} · {r.time}</p>)}${crlf}    </div>${crlf}    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'18px',paddingTop:'14px',borderTop:'1px solid #e2e8f0',flexWrap:'wrap',gap:'10px'}}><button type="button" className="secondary" style={{padding:'9px 16px',fontSize:'13px',fontWeight:600,display:'inline-flex',alignItems:'center',gap:'6px'}} onClick={()=>{setTab('rx');setError('');}}><ArrowLeft size={15}/> Quay lại Kê đơn thuốc</button><button type="button" className="primary" style={{padding:'9px 18px',fontSize:'13px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:'6px',background:'#059669',borderColor:'#047857'}} onClick={()=>save(true)} disabled={locked||saving}><Check size={16}/> Lưu & Kết thúc lượt khám (F4)</button></div>${crlf}  </>;`;

if (code.includes(tab4EndTarget)) {
  code = code.replace(tab4EndTarget, newTab4End('\r\n'));
  console.log('✓ Successfully replaced Tab 4 bottom navigation (CRLF)');
} else if (code.includes(tab4EndTargetLF)) {
  code = code.replace(tab4EndTargetLF, newTab4End('\n'));
  console.log('✓ Successfully replaced Tab 4 bottom navigation (LF)');
} else {
  console.error('Failed to locate tab4EndTarget');
  process.exit(1);
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('✓ All 5 replacements applied successfully to ClinicalDesk.jsx');
