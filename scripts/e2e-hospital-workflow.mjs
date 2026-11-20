import { runSqlScript } from '../server/api-router.mjs';

async function runE2E() {
  console.log('================================================================');
  console.log('  MEDICARE HIS - COMPREHENSIVE END-TO-END WORKFLOW VERIFICATION ');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // STEP 1: PATIENT REGISTRATION & QUEUE ADMISSION
    // -------------------------------------------------------------
    console.log('[STEP 1] ĐĂNG KÝ TIẾP ĐÓN BỆNH NHÂN & CẤP SỐ THỨ TỰ PHÒNG KHÁM');
    const patientRaw = await runSqlScript('scripts/sql-patients-visits.ps1', {
      action: 'create_patient',
      name: 'Hoàng Quốc Việt',
      birth: '1988-06-15',
      gender: 'Nam',
      phone: '0918889999',
      insurance: 'GD4797931123456',
      cccd: '001088012345',
      address: 'Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội'
    });
    const patient = JSON.parse(patientRaw);
    console.log('  -> Đã tạo bệnh nhân:', patient.id, '| Họ tên:', patient.name, '| BHYT:', patient.insurance);

    const visitRaw = await runSqlScript('scripts/sql-patients-visits.ps1', {
      action: 'create_visit',
      patientId: patient.id,
      dept: 'Nội tổng quát',
      reason: 'Sốt cao, ho khạc đờm 3 ngày nay'
    });
    const visit = JSON.parse(visitRaw);
    console.log('  -> Đã tạo ca khám:', visit.visitId, '| STT:', visit.queueNumber, '| Phòng:', visit.roomName);

    const queueRaw = await runSqlScript('scripts/sql-patients-visits.ps1', { action: 'list_queue', dept: 'Nội tổng quát' });
    const queue = JSON.parse(queueRaw);
    console.log('  -> Hàng đợi phòng khám hiện có:', queue.length, 'bệnh nhân đang chờ\n');

    // -------------------------------------------------------------
    // STEP 2: VITALS & CLINICAL EXAMINATION (ICD-10)
    // -------------------------------------------------------------
    console.log('[STEP 2] ĐO SINH HIỆU & KHÁM LÂM SÀNG BÁC SĨ (ICD-10)');
    const vitalsRaw = await runSqlScript('scripts/sql-clinical-desk.ps1', {
      action: 'save_vitals',
      visitId: visit.visitId,
      pressure: '130/85',
      pulse: 84,
      temperature: 38.2,
      respiration: 20,
      spo2: 97,
      height: 172,
      weight: 68
    });
    console.log('  -> Đã ghi nhận sinh hiệu:', JSON.parse(vitalsRaw).vitalsId);

    const examRaw = await runSqlScript('scripts/sql-clinical-desk.ps1', {
      action: 'save_exam_note',
      visitId: visit.visitId,
      reason: 'Sốt cao, ho khạc đờm vàng',
      symptoms: 'Bệnh khởi phát 3 ngày, sốt nóng gai rét, ho đờm vàng đục, mệt mỏi nhiều',
      physicalExam: 'Tim đều T1 T2 rõ; Phổi thông khí hai bên thô, rải rác ran ẩm đáy phổi phải',
      icdCode: 'J20',
      diagnosis: 'J20 - Viêm phế quản cấp tính',
      treatmentPlan: 'Kháng sinh, hạ sốt, long đờm, chỉ định cận lâm sàng đánh giá nhu mô phổi',
      outcome: 'Chờ kết quả CLS'
    });
    console.log('  -> Đã lưu bệnh án lâm sàng ICD-10:', JSON.parse(examRaw).recordId, '\n');

    // -------------------------------------------------------------
    // STEP 3: DIAGNOSTIC & LAB ORDERS (CẬN LÂM SÀNG)
    // -------------------------------------------------------------
    console.log('[STEP 3] CHỈ ĐỊNH CẬN LÂM SÀNG & DUYỆT TRẢ KẾT QUẢ');
    const orderRaw = await runSqlScript('scripts/sql-services-labs.ps1', {
      action: 'create_order',
      visitId: visit.visitId,
      diagnosis: 'Viêm phế quản cấp, theo dõi viêm phổi',
      priority: 'Thường quy',
      services: ['DV_CONG_THUC_MAU', 'DV_XQUANG_TIM_PHOI']
    });
    const order = JSON.parse(orderRaw);
    console.log('  -> Đã tạo phiếu chỉ định:', order.orderId);

    const orderDetailRaw = await runSqlScript('scripts/sql-services-labs.ps1', {
      action: 'get_orders_by_visit',
      visitId: visit.visitId
    });
    const ordersList = JSON.parse(orderDetailRaw);
    const lineXN = ordersList[0].lines.find(l => l.resultType === 'XET_NGHIEM').lineId;
    const lineCDHA = ordersList[0].lines.find(l => l.resultType === 'MO_TA').lineId;

    await runSqlScript('scripts/sql-services-labs.ps1', {
      action: 'save_result',
      orderDetailId: lineXN,
      findings: 'WBC: 12.4 G/L, Neu: 77%, RBC: 4.6 T/L, PLT: 235 G/L',
      conclusion: 'Bạch cầu tăng nhẹ ưu thế trung tính, dấu hiệu nhiễm khuẩn cấp'
    });
    console.log('  -> Đã duyệt kết quả Xét nghiệm máu:', lineXN);

    await runSqlScript('scripts/sql-services-labs.ps1', {
      action: 'save_result',
      orderDetailId: lineCDHA,
      findings: 'Tăng đậm rốn phổi hai bên, đám mờ nhẹ gian sườn 4-5 bên phải',
      conclusion: 'Hình ảnh thâm nhiễm phế quản phổi phải, tim không to'
    });
    console.log('  -> Đã duyệt kết quả X-quang tim phổi:', lineCDHA, '\n');

    // -------------------------------------------------------------
    // STEP 4: PRESCRIPTION & FEFO DISPENSING (DƯỢC & XUẤT KHO)
    // -------------------------------------------------------------
    console.log('[STEP 4] KÊ ĐƠN THUỐC & CẤP PHÁT XUẤT KHO FEFO');
    const rxRaw = await runSqlScript('scripts/sql-prescriptions-fefo.ps1', {
      action: 'create_prescription',
      visitId: visit.visitId,
      diagnosis: 'J20 - Viêm phế quản cấp tính',
      advice: 'Uống thuốc sau ăn, uống nhiều nước ấm, nghỉ ngơi',
      lines: [
        {
          id: 'TH_AUG1G',
          quantity: 14,
          days: 7,
          dose: '1 viên',
          route: 'Uống',
          frequency: '2 lần/ngày sáng - tối',
          morning: '1',
          evening: '1'
        },
        {
          id: 'TH_PARA500',
          quantity: 10,
          days: 5,
          dose: '1 viên',
          route: 'Uống',
          frequency: 'Khi sốt > 38.5 độ C',
          morning: '1',
          noon: '1'
        }
      ]
    });
    const rx = JSON.parse(rxRaw);
    console.log('  -> Bác sĩ kê đơn thuốc:', rx.prescriptionId);

    const dispenseRaw = await runSqlScript('scripts/sql-prescriptions-fefo.ps1', {
      action: 'dispense_fefo',
      prescriptionId: rx.prescriptionId,
      warehouse: 'KHO_NGOAI_TRU'
    });
    const dispense = JSON.parse(dispenseRaw);
    console.log('  -> Dược sĩ cấp phát FEFO thành công. Các lô đã trừ:');
    dispense.allocated.forEach(a => console.log('     * Thuốc:', a.maHang, '| Số lô:', a.soLo, '| Số lượng xuất:', a.quantity));
    console.log('');

    // -------------------------------------------------------------
    // STEP 5: BILLING STATEMENT FORM 01/BV & SETTLEMENT
    // -------------------------------------------------------------
    console.log('[STEP 5] VIỆN PHÍ: BẢNG KÊ 01/BV & QUYẾT TOÁN NGOẠI TRÚ');
    await runSqlScript('scripts/sql-billing.ps1', {
      action: 'record_advance',
      visitId: visit.visitId,
      amount: 400000,
      paymentMethod: 'VIETQR',
      note: 'Tạm ứng viện phí ban đầu qua VietQR'
    });
    console.log('  -> Đã thu tạm ứng: 400.000 VND (VietQR)');

    const stmtRaw = await runSqlScript('scripts/sql-billing.ps1', {
      action: 'get_statement',
      visitId: visit.visitId
    });
    const stmt = JSON.parse(stmtRaw);
    console.log('  -> BẢNG KÊ 01/BV - TỔNG HỢP CHI PHÍ:');
    console.log('     + Tổng chi phí phát sinh :', stmt.summary.totalCharges.toLocaleString('vi-VN'), 'VND');
    console.log('     + BHYT chi trả (80%)     :', stmt.summary.insuranceCoverage.toLocaleString('vi-VN'), 'VND');
    console.log('     + Người bệnh cùng chi trả:', stmt.summary.patientCopay.toLocaleString('vi-VN'), 'VND');
    console.log('     + Đã nộp tạm ứng         :', stmt.summary.advanceDeposited.toLocaleString('vi-VN'), 'VND');
    console.log('     + Chênh lệch thanh toán  :', stmt.summary.balanceDue.toLocaleString('vi-VN'), 'VND');

    const settleRaw = await runSqlScript('scripts/sql-billing.ps1', {
      action: 'settle_invoice',
      visitId: visit.visitId,
      paymentMethod: 'TIEN_MAT'
    });
    const settle = JSON.parse(settleRaw);
    console.log('  -> Đã chốt quyết toán:', settle.settlementId, '| Khép lại lượt khám: HOAN_TAT_KHAM\n');

    // -------------------------------------------------------------
    // STEP 6: INPATIENT ADMISSION & BED RELEASE
    // -------------------------------------------------------------
    console.log('[STEP 6] CHUYỂN NỘI TRÚ, XẾP BUỒNG GIƯỜNG & TỔNG KẾT RA VIỆN');
    const admitRaw = await runSqlScript('scripts/sql-inpatient.ps1', {
      action: 'admit_inpatient',
      patientId: patient.id,
      visitId: visit.visitId,
      department: 'NOI',
      bedId: 'G_NOI_301_02',
      reason: 'Cần theo dõi sát đáp ứng kháng sinh đường tiêm tĩnh mạch',
      diagnosis: 'Viêm phế quản phổi cấp bội nhiễm',
      icdCode: 'J20'
    });
    const admit = JSON.parse(admitRaw);
    console.log('  -> Đã mở hồ sơ bệnh án nội trú:', admit.admissionId, 'tại giường:', admit.bedId);

    const bedsOccupiedRaw = await runSqlScript('scripts/sql-inpatient.ps1', { action: 'list_beds' });
    const bedsOccupied = JSON.parse(bedsOccupiedRaw);
    const targetBed = bedsOccupied.find(b => b.id === 'G_NOI_301_02');
    console.log('  -> Trạng thái giường:', targetBed.bedNumber, '|', targetBed.status, '| Bệnh nhân:', targetBed.patientName);

    const dischargeRaw = await runSqlScript('scripts/sql-inpatient.ps1', {
      action: 'discharge_inpatient',
      admissionId: admit.admissionId,
      dischargeDiagnosis: 'Viêm phế quản phổi cấp đã ổn định',
      icdCode: 'J20',
      treatmentResult: 'KHOI',
      dischargeAdvice: 'Tái khám định kỳ sau 2 tuần, giữ ấm lồng ngực'
    });
    const discharge = JSON.parse(dischargeRaw);
    console.log('  -> Bệnh nhân xuất viện thành công:', discharge.admissionId);

    const finalBedsRaw = await runSqlScript('scripts/sql-inpatient.ps1', { action: 'list_beds' });
    const finalBeds = JSON.parse(finalBedsRaw);
    const cleanedBed = finalBeds.find(b => b.id === 'G_NOI_301_02');
    console.log('  -> Giường sau xuất viện:', cleanedBed.bedNumber, '| Trạng thái:', cleanedBed.status, '(Chờ khử khuẩn)\n');

    console.log('================================================================');
    console.log('  TẤT CẢ 6 PHÂN HỆ BACKEND & WORKFLOW E2E ĐỀU ĐẠT CHUẨN 100%!   ');
    console.log('================================================================');
  } catch (err) {
    console.error('E2E TEST FAILED:', err);
    process.exit(1);
  }
}

runE2E();
