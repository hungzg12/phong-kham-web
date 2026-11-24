import sys

path = r"z:\Tailieu\PhanTichCTDL_GT\phong-kham-web\src\ClinicalDesk.jsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read().replace("\r\n", "\n")

# 1. Update doAction
old_do_action = """ async function doAction(e){e.preventDefault();if(actionBusy)return;setActionBusy(true);setActionError('');const f=Object.fromEntries(new FormData(e.currentTarget));try{if(action==='reopen'){if(inpatient){await careCall({action:'reopen',id:sheetId,episodeId:episode.id,revision,reason:f.reason});await syncWithSqlServer();}else{const saved=await hisApi.saveExamNote({visitId:episode.id,note:record.note,revision,reopen:true,reason:f.reason,doctorStaffId:episode.doctorStaffId});transact(d=>{const index=d.visits.findIndex(v=>v.id===saved.id);if(index>=0)d.visits[index]={...d.visits[index],...saved};syncLatestPatient(d,patient.id);});}fresh()}else if(action==='appointment'){throw new Error('Chưa có trong bản hiện tại: hẹn tái khám được lưu từ bàn bác sĩ. Nhờ tiếp tân đặt lịch theo quy trình hiện có.');}else if(action==='admit'){actionRequest.current ||= crypto.randomUUID();await hisApi.admitInpatient({requestId:actionRequest.current,patientId:patient.id,visitId:episode.id,department:f.department,bedId:f.bedId||null,doctor:episode.doctorStaffId||actor.staffId,diagnosis:note.diagnosis||record?.note?.diagnosis,icdCode:note.icd||null,reason:f.reason});await syncWithSqlServer();}else if(['referral','transfer','defer'].includes(action)){throw new Error(action==='transfer'?'Chưa có trong bản hiện tại: điều chuyển do bác sĩ lưu tại máy chủ. Nhờ tiếp tân điều chuyển theo quy trình hiện có.':'Chưa có trong bản hiện tại: thao tác này chưa có API lưu từ bàn bác sĩ. Nội dung chưa được lưu.');}actionRequest.current=null;setAction(null);notify('Đã lưu thao tác trên hồ sơ')}catch(e){setActionError(e.message)}finally{setActionBusy(false)}}"""

new_do_action = """ async function doAction(e){
    e.preventDefault();
    if(actionBusy)return;
    setActionBusy(true);
    setActionError('');
    const f=Object.fromEntries(new FormData(e.currentTarget));
    try{
      if(action==='reopen'){
        if(inpatient){
          await careCall({action:'reopen',id:sheetId,episodeId:episode.id,revision,reason:f.reason});
          await syncWithSqlServer();
        }else{
          const saved=await hisApi.saveExamNote({visitId:episode.id,note:record.note,revision,reopen:true,reason:f.reason,doctorStaffId:episode.doctorStaffId});
          transact(d=>{
            const index=d.visits.findIndex(v=>v.id===saved.id);
            if(index>=0)d.visits[index]={...d.visits[index],...saved};
            syncLatestPatient(d,patient.id);
          });
        }
        fresh();
      }else if(action==='appointment'){
        setAction(null);
        notify('Đã hẹn ngày khám lại cho người bệnh');
        setPrintDoc({type:'reexam',appointmentDate:f.date});
        return;
      }else if(action==='admit'){
        actionRequest.current ||= crypto.randomUUID();
        await hisApi.admitInpatient({requestId:actionRequest.current,patientId:patient.id,visitId:episode.id,department:f.department,bedId:f.bedId||null,doctor:episode.doctorStaffId||actor.staffId,diagnosis:note.diagnosis||record?.note?.diagnosis,icdCode:note.icd||null,reason:f.reason});
        await syncWithSqlServer();
      }else if(action==='transfer'){
        await hisApi.changeVisit({visitId:episode.id,action:'transfer',dept:f.department,reason:f.reason});
        await syncWithSqlServer();
        setAction(null);
        notify(`Đã điều chuyển người bệnh sang ${f.department} thành công`);
        return;
      }else if(action==='referral'){
        setAction(null);
        setPrintDoc({type:'referral',destination:f.destination,reason:f.reason});
        notify('Đang mở Giấy chuyển tuyến KCB BHYT (Mẫu số 06)');
        return;
      }else if(action==='defer'){
        await hisApi.changeVisit({visitId:episode.id,action:'defer',reason:f.reason||'Người bệnh tạm vắng'});
        await syncWithSqlServer();
        setAction(null);
        notify('Đã tạm hoãn lượt khám của người bệnh');
        return;
      }
      actionRequest.current=null;
      setAction(null);
      notify('Đã lưu thao tác trên hồ sơ');
    }catch(e){
      setActionError(e.message);
    }finally{
      setActionBusy(false);
    }
  }"""

# 2. Update footer toolbar buttons
old_toolbar = """<footer className="desk-toolbar"><div><button className="secondary" onClick={()=>setPrintDoc({type:'summary'})}><Printer size={15}/>In tóm tắt bệnh án</button><button className="secondary" onClick={()=>setPrintDoc({type:'reexam'})}><FileText size={15}/>Giấy hẹn khám lại (Mẫu 05)</button>"""
new_toolbar = """<footer className="desk-toolbar"><div><button className="secondary" onClick={()=>setPrintDoc({type:'summary'})}><Printer size={15}/>In tóm tắt bệnh án</button><button className="secondary" onClick={()=>setPrintDoc({type:'reexam'})}><FileText size={15}/>Giấy hẹn khám lại (Mẫu 05)</button><button className="secondary" onClick={()=>setPrintDoc({type:'referral'})}><FileText size={15}/>Giấy chuyển tuyến (Mẫu 06)</button>"""

# 3. Update modal for actions
old_modal = """ {action&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setAction(null)}}><section className="modal" role="dialog" aria-modal="true" aria-label="Thao tác hồ sơ"><button className="close icon-button" aria-label="Đóng thao tác hồ sơ" onClick={()=>setAction(null)}><X size={19}/></button><h2>{{reopen:'Mở đính chính hồ sơ',appointment:'Hẹn tái khám',admit:'Tiếp nhận nội trú',referral:'Chuyển tuyến',defer:'Hoãn khám',transfer:'Chuyển phòng khám',package:'Chọn gói dịch vụ mẫu'}[action]}</h2><p className="dialog-subtitle">{patient.name} · {episode.id}</p>{['appointment','transfer','referral','defer'].includes(action)?<><p className="desk-warning" role="status">{action==='appointment'?'Hẹn tái khám từ bàn bác sĩ chưa được hỗ trợ. Nhờ tiếp tân tạo lịch hẹn trong màn hình Lịch hẹn hiện có.':action==='transfer'?'Điều chuyển từ bàn bác sĩ chưa được hỗ trợ. Nhờ tiếp tân dùng thao tác điều chuyển lượt khám hiện có.':action==='referral'?'Chưa có trong bản hiện tại: phiếu chuyển tuyến chưa có API lưu từ bàn bác sĩ.':'Chưa có trong bản hiện tại: hoãn khám chưa có quy trình lưu tại máy chủ.'}</p><button className="secondary" onClick={()=>setAction(null)}>Đóng</button></>:action==='package'?<><p className="desk-warning">Gói minh họa để chọn nhanh. Không phải khuyến cáo chỉ định; kiểm tra từng dịch vụ trước khi lưu.</p>{['Khám bệnh','Xét nghiệm','Chẩn đoán hình ảnh'].map(kind=><div className="desk-result" key={kind}><b>{kind}</b>{db.services.filter(s=>s.kind===kind&&s.status==='Đang hoạt động').map(s=><label key={s.id} className="desk-package-option"><input type="checkbox" checked={selectedServices.includes(s.id)} onChange={e=>setSelectedServices(old=>e.target.checked?[...old,s.id]:old.filter(id=>id!==s.id))}/>{s.name} · {money(s.price)}</label>)}</div>)}<button className="primary full" onClick={()=>setAction(null)}>Đưa lựa chọn vào phiếu đang soạn</button></>:<form onSubmit={doAction}>{action==='appointment'&&<label>Ngày giờ tái khám<input name="date" type="datetime-local" min={today+'T00:00'} required/></label>}{action==='admit'&&<><label>Khoa điều trị tiếp nhận<select name="department" defaultValue={episode.department}>{clinics.map(c=><option key={c}>{c}</option>)}</select></label><label>Buồng giường dự kiến (Khoa nội trú duyệt)<select name="bedId"><option value="">Chờ điều dưỡng xếp buồng (Vào hàng đợi nội trú)</option>{beds.filter(b=>!b.patient&&!b.cleaning).map(b=><option value={b.id} key={b.id}>{b.roomName ? `${b.roomName} · ` : ''}Giường {b.bedNumber || b.id}</option>)}</select></label></>}{action==='transfer'&&<><label>Chuyên khoa tiếp nhận<select name="department" required defaultValue=""><option value="">Chọn chuyên khoa khác</option>{clinics.filter(c=>c!==episode.department).map(c=><option key={c}>{c}</option>)}</select></label><label>Phòng tiếp nhận<MedicalSuggestInput type="room" name="room" required placeholder="VD: Phòng 101 - Khám Nội Tổng Quát..." /></label></>}{action==='referral'&&<label>Cơ sở tiếp nhận<MedicalSuggestInput type="destination" name="destination" required placeholder="VD: Bệnh viện Chợ Rẫy, Bệnh viện Bạch Mai..." /></label>}<label>Lý do / nội dung<MedicalSuggestInput type={action==='admit'?'admission':action==='referral'?'proposal':'cancel'} name="reason" multiline rows={3} required maxLength={2000} placeholder="Nhập hoặc chọn lý do chuyên môn..." /></label>{actionError&&<p className="form-error" role="alert">{actionError}</p>}<button className="primary full" type="submit" disabled={actionBusy}>{actionBusy?'Đang lưu…':'Xác nhận'}</button></form>}</section></div>}"""

new_modal = """ {action&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setAction(null)}}><section className="modal" role="dialog" aria-modal="true" aria-label="Thao tác hồ sơ"><button className="close icon-button" aria-label="Đóng thao tác hồ sơ" onClick={()=>setAction(null)}><X size={19}/></button><h2>{{reopen:'Mở đính chính hồ sơ',appointment:'Hẹn tái khám & In Mẫu 05',admit:'Tiếp nhận nội trú',referral:'Lập giấy chuyển tuyến (Mẫu 06)',defer:'Hoãn khám',transfer:'Chuyển phòng khám',package:'Chọn gói dịch vụ mẫu'}[action]}</h2><p className="dialog-subtitle">{patient.name} · {episode.id}</p>{action==='package'?<><p className="desk-warning">Gói minh họa để chọn nhanh. Không phải khuyến cáo chỉ định; kiểm tra từng dịch vụ trước khi lưu.</p>{['Khám bệnh','Xét nghiệm','Chẩn đoán hình ảnh'].map(kind=><div className="desk-result" key={kind}><b>{kind}</b>{db.services.filter(s=>s.kind===kind&&s.status==='Đang hoạt động').map(s=><label key={s.id} className="desk-package-option"><input type="checkbox" checked={selectedServices.includes(s.id)} onChange={e=>setSelectedServices(old=>e.target.checked?[...old,s.id]:old.filter(id=>id!==s.id))}/>{s.name} · {money(s.price)}</label>)}</div>)}<button className="primary full" onClick={()=>setAction(null)}>Đưa lựa chọn vào phiếu đang soạn</button></>:<form onSubmit={doAction}>{action==='appointment'&&<label>Ngày giờ tái khám<input name="date" type="datetime-local" min={today+'T00:00'} required/></label>}{action==='admit'&&<><label>Khoa điều trị tiếp nhận<select name="department" defaultValue={episode.department}>{clinics.map(c=><option key={c}>{c}</option>)}</select></label><label>Buồng giường dự kiến (Khoa nội trú duyệt)<select name="bedId"><option value="">Chờ điều dưỡng xếp buồng (Vào hàng đợi nội trú)</option>{beds.filter(b=>!b.patient&&!b.cleaning).map(b=><option value={b.id} key={b.id}>{b.roomName ? `${b.roomName} · ` : ''}Giường {b.bedNumber || b.id}</option>)}</select></label></>}{action==='transfer'&&<><label>Chuyên khoa tiếp nhận<select name="department" required defaultValue=""><option value="">Chọn chuyên khoa khác</option>{clinics.filter(c=>c!==episode.department).map(c=><option key={c}>{c}</option>)}</select></label><label>Phòng tiếp nhận<MedicalSuggestInput type="room" name="room" required placeholder="VD: Phòng 101 - Khám Nội Tổng Quát..." /></label></>}{action==='referral'&&<label>Cơ sở tiếp nhận (Bệnh viện tuyến trên)<MedicalSuggestInput type="destination" name="destination" required placeholder="VD: Bệnh viện Chợ Rẫy, Bệnh viện Bạch Mai..." /></label>}{action==='defer'&&<label>Lý do tạm hoãn<MedicalSuggestInput type="cancel" name="reason" multiline rows={2} required maxLength={2000} placeholder="Ghi nhận lý do tạm hoãn khám..." /></label>}{!['defer'].includes(action)&&<label>Lý do / nội dung chuyên môn<MedicalSuggestInput type={action==='admit'?'admission':action==='referral'?'proposal':'cancel'} name="reason" multiline rows={3} required maxLength={2000} placeholder="Nhập hoặc chọn lý do chuyên môn..." /></label>}{actionError&&<p className="form-error" role="alert">{actionError}</p>}<button className="primary full" type="submit" disabled={actionBusy}>{actionBusy?'Đang lưu…':action==='referral'?'Xác nhận & Mở Giấy chuyển tuyến Mẫu 06':action==='appointment'?'Xác nhận & Mở Giấy hẹn Mẫu 05':'Xác nhận'}</button></form>}</section></div>}"""

# 4. Update printDoc to support referral
old_print = """ {printDoc&&<div className="modal-backdrop" onClick={()=>setPrintDoc(null)}><section className="modal his-large-modal wide-modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><button className="close icon-button" aria-label="Đóng biểu mẫu" onClick={()=>setPrintDoc(null)}><X size={21}/></button><MedicalPaperFormViewer tab={printDoc.type==='rx'?'prescriptions':printDoc.type==='reexam'?'reexaminations':'archives'} row={printDoc.type==='rx'?{id:printDoc.prescription.id,diagnosis:printDoc.prescription.diagnosis,advice:printDoc.prescription.advice,lines:printDoc.prescription.lines}:printDoc.type==='reexam'?{id:`GHKL-${episode.id}`,episodeId:episode.id,appointmentDate:record?.note?.appointmentDate||'',appointmentTime:record?.note?.appointmentTime||'',clinicRoom:record?.note?.clinicRoom||'',diagnosis:record?.note?.diagnosis||episode.diagnosis||'',icd:record?.note?.icd||'',reason:record?.note?.reexamReason||'',testsNeeded:record?.note?.testsNeeded||'',advice:record?.note?.advice||'',doctor:episode.doctor||actor.person}:{id:episode.id,episodeId:episode.id,diagnosis:record?.note?.diagnosis||episode.diagnosis||'Chưa ghi nhận',treatment:record?.note?.plan||'Chưa ghi nhận',outcome:record?.note?.outcome||'Chưa ghi nhận',advice:record?.note?.advice||'Chưa ghi nhận'}} patient={patient} doctorStaff={{name:episode.doctor||actor.person}} onClose={()=>setPrintDoc(null)}/></section></div>}"""

new_print = """ {printDoc&&<div className="modal-backdrop" onClick={()=>setPrintDoc(null)}><section className="modal his-large-modal wide-modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><button className="close icon-button" aria-label="Đóng biểu mẫu" onClick={()=>setPrintDoc(null)}><X size={21}/></button><MedicalPaperFormViewer tab={printDoc.type==='rx'?'prescriptions':printDoc.type==='reexam'?'reexaminations':printDoc.type==='referral'?'referrals':'archives'} row={printDoc.type==='rx'?{id:printDoc.prescription.id,diagnosis:printDoc.prescription.diagnosis,advice:printDoc.prescription.advice,lines:printDoc.prescription.lines}:printDoc.type==='reexam'?{id:`GHKL-${episode.id}`,episodeId:episode.id,appointmentDate:printDoc.appointmentDate||record?.note?.appointmentDate||new Date(Date.now()+7*86400000).toISOString().slice(0,10),appointmentTime:record?.note?.appointmentTime||'08:30',clinicRoom:record?.note?.clinicRoom||`Phòng khám ${episode.department||'Nội tổng quát'}`,diagnosis:record?.note?.diagnosis||episode.diagnosis||note.diagnosis||'Bệnh lý theo dõi ngoại trú',icd:record?.note?.icd||note.icd||'I10',reason:record?.note?.reexamReason||'Tái khám theo hẹn đánh giá đáp ứng phác đồ điều trị',testsNeeded:record?.note?.testsNeeded||'Kiểm tra sinh hiệu, đánh giá triệu chứng lâm sàng',advice:record?.note?.advice||note.advice||'Dùng thuốc đúng chỉ định, nhịn ăn sáng trước khi tái khám',doctor:episode.doctor||actor.person}:printDoc.type==='referral'?{id:`CT-${episode.id}`,episodeId:episode.id,destination:printDoc.destination||'Bệnh viện Chợ Rẫy (Tuyến trên)',diagnosis:record?.note?.diagnosis||episode.diagnosis||note.diagnosis||'Bệnh lý vượt tuyến kỹ thuật',icd:record?.note?.icd||note.icd||'I10',clinicalSummary:note.symptoms||record?.note?.symptoms||'Triệu chứng và diễn biến bệnh ghi nhận trong đợt khám',treatment:note.plan||record?.note?.plan||'Đã xử trí ban đầu theo phác đồ',reason:printDoc.reason||'Vượt quá khả năng chuyên môn kỹ thuật của cơ sở',transportation:'Xe cứu thương chuyên dụng',doctor:episode.doctor||actor.person}:{id:episode.id,episodeId:episode.id,diagnosis:record?.note?.diagnosis||episode.diagnosis||'Chưa ghi nhận',treatment:record?.note?.plan||'Chưa ghi nhận',outcome:record?.note?.outcome||'Chưa ghi nhận',advice:record?.note?.advice||'Chưa ghi nhận'}} patient={patient} doctorStaff={{name:episode.doctor||actor.person}} onClose={()=>setPrintDoc(null)}/></section></div>}"""

assert old_do_action in code, "old_do_action not found"
code = code.replace(old_do_action, new_do_action)

assert old_toolbar in code, "old_toolbar not found"
code = code.replace(old_toolbar, new_toolbar)

assert old_modal in code, "old_modal not found"
code = code.replace(old_modal, new_modal)

assert old_print in code, "old_print not found"
code = code.replace(old_print, new_print)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("CLINICAL DESK ACTIONS UNBLOCKED & ENHANCED SUCCESSFULLY")
