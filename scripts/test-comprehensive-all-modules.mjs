// Mock browser environment for workspace.js in Node.js
const storageMap = new Map();
globalThis.localStorage = {
  getItem: key => storageMap.get(key) ?? null,
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: key => storageMap.delete(key),
  clear: () => storageMap.clear()
};
globalThis.window = {
  addEventListener: () => {}
};

import {
  initializeWorkspace,
  getWorkspace,
  transact,
  syncBeds,
  createVisit,
  saveVisitNote,
  planFEFO,
  applyClinicalStock,
  approveInventoryRow,
  dischargeAdmission,
  financialRows,
  audit,
  addLot,
  id
} from '../src/workspace.js';

import { today, clinics, definitions } from '../src/business-data.js';

console.log('================================================================');
console.log('🏥 MEDICARE HIS - COMPREHENSIVE ALL-MODULE TESTING & VERIFICATION');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function check(testName, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${detail ? '(' + detail + ')' : ''}`);
    failCount++;
  }
}

function expectThrow(testName, fn, expectedSubstring = '') {
  try {
    fn();
    console.error(`  ❌ [FAIL] ${testName} - Expected exception was NOT thrown`);
    failCount++;
  } catch (err) {
    if (!expectedSubstring || err.message.includes(expectedSubstring)) {
      console.log(`  ✅ [PASS] ${testName} (Caught expected error: "${err.message}")`);
      passCount++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - Threw unexpected error: "${err.message}" (expected "${expectedSubstring}")`);
      failCount++;
    }
  }
}

async function runAllTests() {
  // -------------------------------------------------------------------------
  // MODULE 1: TIẾP ĐÓN & LƯỢT KHÁM BỆNH NHÂN (PATIENTS & VISITS)
  // -------------------------------------------------------------------------
  console.log('--- MODULE 1: Tiếp đón & Quản lý bệnh nhân ---');
  const ws = initializeWorkspace();
  check('Khởi tạo không gian làm việc ban đầu', Array.isArray(ws.patients) && ws.patients.length >= 7);

  // Thêm bệnh nhân mới
  const newPatientId = 'BN9999';
  transact(d => {
    d.patients.push({
      id: newPatientId,
      name: 'Lê Văn Thử Nghiệm',
      gender: 'Nam',
      birth: '1990-01-01',
      phone: '0988776655',
      insurance: 'DN4790999999999',
      dept: 'Tim mạch',
      doctor: 'BS. Nguyễn Quốc Bảo',
      time: '08:30',
      status: 'Chờ khám',
      color: 'blue'
    });
  });

  const pFound = getWorkspace().patients.find(p => p.id === newPatientId);
  check('Đăng ký bệnh nhân mới thành công', pFound && pFound.name === 'Lê Văn Thử Nghiệm');

  // Tạo lượt khám hợp lệ
  const visit = createVisit({
    patientId: newPatientId,
    department: 'Tim mạch',
    doctor: 'BS. Nguyễn Quốc Bảo',
    date: today,
    time: '08:30'
  });
  check('Tạo lượt khám ngoại trú mới', visit && visit.id.startsWith('LK-') && visit.status === 'Chờ khám');

  // Biên: Tạo lượt khám cho bệnh nhân không tồn tại -> phải ném lỗi
  expectThrow(
    'Chặn tạo lượt khám cho bệnh nhân không tồn tại',
    () => createVisit({ patientId: 'BN_NON_EXISTENT', department: 'Tim mạch', doctor: 'BS' }),
    'Không tìm thấy bệnh nhân'
  );

  // -------------------------------------------------------------------------
  // MODULE 2: BÀN KHÁM BỆNH & GHI PHIẾU KHÁM (CLINICAL EXAMINATION)
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 2: Bàn khám bệnh & Hồ sơ khám lâm sàng ---');
  
  // Trường hợp 2.1: Khám và chỉ định CLS -> trạng thái chuyển "Chờ kết quả"
  saveVisitNote(visit.id, {
    symptoms: 'Đau tức ngực trái lan ra sau lưng, hồi hộp',
    diagnosis: 'I20 - Cơn đau thắt ngực ổn định',
    orders: 'Điện tim 12 cần, Siêu âm tim Doppler màu',
    outcome: 'Chờ kết quả CLS'
  });
  let updatedVisit = getWorkspace().visits.find(v => v.id === visit.id);
  check('Chỉ định CLS tự động chuyển trạng thái lượt khám sang "Chờ kết quả"', updatedVisit.status === 'Chờ kết quả');

  // Trường hợp 2.2: Cập nhật kết luận điều trị -> chuyển "Hoàn tất" và lưu phiên bản (noteRevisions)
  saveVisitNote(visit.id, {
    symptoms: 'Đau tức ngực trái lan ra sau lưng, hồi hộp',
    diagnosis: 'I20 - Cơn đau thắt ngực ổn định',
    orders: 'Điện tim 12 cần, Siêu âm tim Doppler màu',
    outcome: 'Kê đơn điều trị ngoại trú',
    advice: 'Uống thuốc đều, tái khám sau 2 tuần'
  });
  updatedVisit = getWorkspace().visits.find(v => v.id === visit.id);
  check('Hoàn tất khám bệnh chuyển trạng thái sang "Hoàn tất"', updatedVisit.status === 'Hoàn tất');
  check('Lưu lịch sử đính chính (noteRevisions) khi cập nhật phiếu khám', updatedVisit.noteRevisions.length === 1);

  // Biên: Ghi phiếu khám cho lượt khám bị hủy
  transact(d => {
    d.visits.find(v => v.id === visit.id).status = 'Đã hủy';
  });
  expectThrow(
    'Chặn ghi phiếu khám trên lượt khám đã hủy',
    () => saveVisitNote(visit.id, { symptoms: 'abc', diagnosis: 'xyz', outcome: 'Hoàn tất' }),
    'Lượt khám đã hủy không thể ghi phiếu khám'
  );

  // Biên: Ghi phiếu khám đã khóa
  transact(d => {
    const v = d.visits.find(x => x.id === visit.id);
    v.status = 'Hoàn tất';
    v.locked = true;
  });
  expectThrow(
    'Chặn sửa phiếu khám khi đã khóa hồ sơ',
    () => saveVisitNote(visit.id, { symptoms: 'abc', diagnosis: 'xyz', outcome: 'Hoàn tất' }),
    'Phiếu đã khóa'
  );

  // -------------------------------------------------------------------------
  // MODULE 3: ĐƠN THUỐC & CẤP PHÁT KHO THEO FEFO (PRESCRIPTIONS & DISPENSING)
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 3: Đơn thuốc & Cấp phát kho tự động FEFO ---');
  const prescriptionId = 'DT-TEST-001';
  transact(d => {
    // Đảm bảo có tồn kho tại Kho lẻ Ngoại trú (KHO002)
    d.inventory.push(
      { id: 'LOT-AUG-EARLY', medicineId: 'TH002', warehouseId: 'KHO002', lot: 'AUG-2027A', expiry: '2027-01-15', qty: 50, receivedAt: '2026-01-01' },
      { id: 'LOT-AUG-LATER', medicineId: 'TH002', warehouseId: 'KHO002', lot: 'AUG-2027B', expiry: '2027-06-30', qty: 200, receivedAt: '2026-01-01' }
    );
    // Bác sĩ kê đơn và xác nhận
    d.business.prescriptions.push({
      id: prescriptionId,
      patient: newPatientId,
      doctor: 'BS. Nguyễn Quốc Bảo',
      diagnosis: 'Nhiễm khuẩn hô hấp trên',
      status: 'Đã xác nhận',
      lines: [
        { medicine: 'TH002', quantity: 30, dose: '1 viên x 2 lần/ngày', route: 'Uống', days: 7 }
      ]
    });
  });

  // Dược sĩ cấp phát đơn thuốc
  applyClinicalStock('prescriptions', prescriptionId, 'KHO002', 'DS. Lê Quốc Huy');
  const dispensedPrescription = getWorkspace().business.prescriptions.find(p => p.id === prescriptionId);
  check('Đơn thuốc cập nhật trạng thái "Đã cấp phát"', dispensedPrescription.status === 'Đã cấp phát');
  check('Ghi nhận phân bổ FEFO vào chi tiết cấp phát', dispensedPrescription.allocations.length === 1 && dispensedPrescription.allocations[0].lot === 'AUG-2027A');
  
  const lotEarly = getWorkspace().inventory.find(l => l.id === 'LOT-AUG-EARLY');
  check('Tồn kho lô cận date bị trừ chính xác (50 - 30 = 20)', lotEarly.qty === 20);

  const ledgerEntry = getWorkspace().ledger.find(e => e.event === prescriptionId);
  check('Ghi sổ kho (ledger) chính xác với delta âm (-30)', ledgerEntry && ledgerEntry.delta === -30);

  // Biên: Cố tình cấp phát lại đơn đã cấp phát -> phải ném lỗi
  expectThrow(
    'Chặn cấp phát trùng lặp đơn thuốc đã xuất kho',
    () => applyClinicalStock('prescriptions', prescriptionId, 'KHO002', 'DS. Lê Quốc Huy'),
    'Chứng từ đã được xử lý hoặc trạng thái đã thay đổi'
  );

  // -------------------------------------------------------------------------
  // MODULE 4: ĐIỀU CHUYỂN KHO & KIỂM KÊ (WAREHOUSE MOVEMENTS & AUDIT)
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 4: Điều chuyển kho, Nhập xuất & Kiểm kê ---');

  // Điều chuyển giữa Kho Tổng (KHO001) sang Tủ trực Cấp cứu (KHO003)
  const transferId = 'PK-DC-001';
  const transferMedId = 'TH_TEST_DC';
  transact(d => {
    // Đăng ký mặt hàng mới và nạp tồn duy nhất tại KHO001
    d.stock.push({ id: transferMedId, name: 'Thuốc Thử Điều Chuyển', unit: 'Viên', type: 'Thuốc', qty: 100 });
    d.inventory.push({
      id: 'LOT-DC-UNIQUE', medicineId: transferMedId, warehouseId: 'KHO001', lot: 'DC-BATCH-01', expiry: '2028-05-20', qty: 100, receivedAt: '2026-01-01'
    });
    d.business.movements.push({
      id: transferId,
      kind: 'Điều chuyển',
      medicine: transferMedId,
      quantity: 40,
      warehouse: 'KHO001',
      destination: 'KHO003',
      status: 'Chờ duyệt'
    });
  });

  approveInventoryRow('movements', transferId, 'DS. Quản Lý');
  const sourceLot = getWorkspace().inventory.find(l => l.id === 'LOT-DC-UNIQUE');
  const destLot = getWorkspace().inventory.find(l => l.medicineId === transferMedId && l.warehouseId === 'KHO003' && l.lot === 'DC-BATCH-01');
  check('Điều chuyển kho: Kho nguồn bị trừ 40 đơn vị (100 -> 60)', sourceLot && sourceLot.qty === 60);
  check('Điều chuyển kho: Kho đích nhận đúng 40 đơn vị cùng số lô và hạn dùng', destLot && destLot.qty === 40 && destLot.expiry === '2028-05-20');

  // Biên: Điều chuyển kho nguồn trùng kho đích -> phải ném lỗi
  const invalidTransferId = 'PK-DC-ERR';
  transact(d => {
    d.business.movements.push({
      id: invalidTransferId,
      kind: 'Điều chuyển',
      medicine: transferMedId,
      quantity: 10,
      warehouse: 'KHO001',
      destination: 'KHO001',
      status: 'Chờ duyệt'
    });
  });
  expectThrow(
    'Chặn điều chuyển khi kho nguồn trùng kho đích',
    () => approveInventoryRow('movements', invalidTransferId, 'DS. Quản Lý'),
    'Chọn kho đích khác kho nguồn'
  );

  // Kiểm kê kho (Counts)
  const countId = 'KK-TEST-001';
  transact(d => {
    d.business.counts.push({
      id: countId,
      lotId: 'LOT-DC-UNIQUE',
      medicine: transferMedId,
      warehouse: 'KHO001',
      expected: 60, // Tồn hiện tại sau khi điều chuyển 40 là 60
      actual: 58,   // Hao hụt thực tế 2 viên
      reason: 'Hao hụt rách vỉ bao bì',
      status: 'Chờ phê duyệt'
    });
  });

  approveInventoryRow('counts', countId, 'DS. Trưởng Kho');
  const adjustedLot = getWorkspace().inventory.find(l => l.id === 'LOT-DC-UNIQUE');
  check('Kiểm kê kho: Tồn lô được điều chỉnh chính xác về số lượng thực đếm (58)', adjustedLot && adjustedLot.qty === 58);
  const countLedger = getWorkspace().ledger.find(l => l.event === countId);
  check('Kiểm kê kho: Ghi sổ biến động chênh lệch âm (-2)', countLedger && countLedger.delta === -2);

  // -------------------------------------------------------------------------
  // MODULE 5: NỘI TRÚ, BUỒNG GIƯỜNG & Y LỆNH (INPATIENT BEDS & CARE)
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 5: Buồng giường nội trú, Y lệnh & Ra viện ---');
  const targetBedId = 8; // Giường 08 (Phòng 203)
  
  // Tiếp nhận bệnh nhân vào giường
  transact(d => {
    const old = structuredClone(d.beds);
    const bed = d.beds.find(b => b.id === targetBedId);
    bed.patient = newPatientId;
    bed.cleaning = false;
    syncBeds(d, old);
  });

  // syncBeds tự động tạo admission
  const admission = getWorkspace().admissions.find(a => a.patientId === newPatientId && a.status === 'Đang điều trị');
  check('Tiếp nhận giường tự động kích hoạt đợt điều trị nội trú (DTNT)', admission && admission.department === 'Tim mạch');

  // Bác sĩ ra y lệnh dùng thuốc tại giường
  const roundId = 'YL-TEST-001';
  transact(d => {
    // Đảm bảo có thuốc tại Tủ trực Cấp cứu (KHO003)
    d.inventory.push({
      id: 'LOT-PAN-EMERGENCY', medicineId: 'TH001', warehouseId: 'KHO003', lot: 'PAN-2028E', expiry: '2028-12-31', qty: 20, receivedAt: '2026-01-01'
    });
    d.business.rounds.push({
      id: roundId,
      episodeId: admission.id,
      patient: newPatientId,
      doctor: 'BS. Nguyễn Quốc Bảo',
      progress: 'Bệnh nhân ổn định, giảm đau ngực',
      plan: 'Dùng thuốc giảm đau hạ sốt',
      kind: 'Dùng thuốc',
      medicine: 'TH001',
      quantity: 2,
      scheduled: today + 'T14:00',
      status: 'Chờ thực hiện'
    });
  });

  // Biên: Cố tình cho ra viện khi y lệnh còn đang "Chờ thực hiện" -> phải chặn
  expectThrow(
    'Chặn ra viện khi còn y lệnh điều trị chưa thực hiện',
    () => dischargeAdmission(admission.id, 'BS. Trưởng Khoa'),
    'Đợt điều trị còn y lệnh chưa thực hiện'
  );

  // Điều dưỡng thực hiện y lệnh -> trừ thuốc tại tủ trực
  applyClinicalStock('rounds', roundId, 'KHO003', 'ĐD. Phạm Thu Hà');
  const executedRound = getWorkspace().business.rounds.find(r => r.id === roundId);
  check('Điều dưỡng thực hiện y lệnh thành công', executedRound.status === 'Đã thực hiện');
  const panEmergencyLot = getWorkspace().inventory.find(l => l.id === 'LOT-PAN-EMERGENCY');
  check('Y lệnh dùng thuốc trừ đúng 2 viên tại tủ trực (20 - 2 = 18)', panEmergencyLot.qty === 18);

  // Bệnh nhân khỏi bệnh -> Ra viện
  dischargeAdmission(admission.id, 'BS. Nguyễn Quốc Bảo');
  const dischargedAdm = getWorkspace().admissions.find(a => a.id === admission.id);
  check('Đợt nội trú cập nhật trạng thái "Đã ra viện"', dischargedAdm.status === 'Đã ra viện' && !!dischargedAdm.dischargedAt);
  
  const freedBed = getWorkspace().beds.find(b => b.id === targetBedId);
  check('Giường bệnh được giải phóng người bệnh', freedBed.patient === null);
  check('Giường tự động kích hoạt cờ chờ khử khuẩn (cleaning = true)', freedBed.cleaning === true);

  // Điều dưỡng khử khuẩn xong
  transact(d => {
    d.beds.find(b => b.id === targetBedId).cleaning = false;
  });
  check('Khử khuẩn hoàn tất: Giường sẵn sàng tiếp nhận lượt tiếp theo', getWorkspace().beds.find(b => b.id === targetBedId).cleaning === false);

  // -------------------------------------------------------------------------
  // MODULE 6: TÀI CHÍNH, TẠM ỨNG & QUYẾT TOÁN (FINANCE & SETTLEMENTS)
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 6: Tài chính, Tạm ứng & Quyết toán viện phí ---');
  const advanceId = 'GD-TU-001';
  const settlementId = 'QT-001';

  transact(d => {
    // Thu tạm ứng 3.000.000 đ
    d.business.advances.push({
      id: advanceId,
      patient: newPatientId,
      kind: 'Tạm ứng',
      amount: 3000000,
      reason: 'Tạm ứng điều trị nội trú Tim mạch',
      status: 'Đã xác nhận',
      date: today
    });
    // Bảng quyết toán chi phí
    d.business.settlements.push({
      id: settlementId,
      patient: newPatientId,
      gross: 4200000,     // Tổng chi phí
      insurance: 1500000, // BHYT chi trả
      advance: 3000000,   // Đã tạm ứng
      balance: -300000,   // Thừa 300.000 đ -> Hoàn trả cho bệnh nhân
      received: 0,
      refund: 300000,
      status: 'Đã hoàn tiền',
      settledDate: today
    });
  });

  const finRows = financialRows(getWorkspace().business);
  check('Tính toán giao dịch tài chính bao gồm cả Tạm ứng và Quyết toán', finRows.length >= 2);
  const advRow = finRows.find(r => r.id === advanceId);
  const setRow = finRows.find(r => r.id === settlementId);
  check('Thu tạm ứng được ghi nhận là dòng tiền dương (+3.000.000)', advRow && advRow.signed === 3000000);
  check('Hoàn tiền quyết toán được ghi nhận chính xác dòng tiền âm (-300.000)', setRow && setRow.signed === -300000);

  // -------------------------------------------------------------------------
  // MODULE 7: NHẬT KÝ KIỂM TOÁN HỆ THỐNG (AUDIT LOGGING)
  // -------------------------------------------------------------------------
  console.log('\n--- MODULE 7: Nhật ký kiểm toán hệ thống (Audit Trail) ---');
  const auditLogs = getWorkspace().business.audit;
  check('Nhật ký kiểm toán lưu trữ đầy đủ các sự kiện nghiệp vụ', Array.isArray(auditLogs) && auditLogs.length >= 4);
  check('Kiểm toán ghi nhận cấp phát đơn thuốc', auditLogs.some(a => a.event.includes('Cấp phát thuốc') || a.event.includes(prescriptionId)));
  check('Kiểm toán ghi nhận điều chuyển kho', auditLogs.some(a => a.event.includes('Điều chuyển') || a.event.includes(transferId)));
  check('Kiểm toán ghi nhận hoàn tất đợt nội trú', auditLogs.some(a => a.event.includes('Hoàn tất đợt nội trú')));

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🏁 TỔNG KẾT TOÀN DIỆN: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) process.exit(1);
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
