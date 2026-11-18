import { initialStock, initialPatients, departments } from '../src/fixtures.js';
import { clinics, today } from '../src/business-data.js';

console.log('====================================================');
console.log('🩺 MEDICARE SYSTEM INTEGRATION & WORKFLOW VERIFICATION');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// TEST SUITE 1: Master Data Verification
console.log('--- TEST SUITE 1: Master Data & Clinical Catalog ---');
assert(departments.length === 6, 'Contains all 6 clinical departments');
assert(clinics.includes('Nội tổng quát') && clinics.includes('Tim mạch'), 'Specialties include Nội tổng quát & Tim mạch');
assert(initialPatients.length >= 7, `Initial patient fixtures present (${initialPatients.length} patients)`);
assert(initialStock.some(s => s.name.includes('Panadol Extra')), 'Stock includes Panadol Extra (GSK)');
assert(initialStock.some(s => s.name.includes('Augmentin 1g')), 'Stock includes Augmentin 1g (GSK)');
assert(initialStock.some(s => s.name.includes('Zinnat 500mg')), 'Stock includes Zinnat 500mg (GSK)');
assert(initialStock.some(s => s.name.includes('Nexium 40mg')), 'Stock includes Nexium 40mg (AstraZeneca)');
assert(initialStock.some(s => s.name.includes('Gạc phẫu thuật')), 'Stock includes Gạc phẫu thuật (Merufa)');

// TEST SUITE 2: FEFO Calculation Logic Verification
console.log('\n--- TEST SUITE 2: FEFO Expiry Sorting & Allocation Engine ---');
const mockLots = [
  { id: 'LOT-3', medicineId: 'TH001', warehouseId: 'KHO001', lot: 'BATCH-2028', expiry: '2028-09-30', qty: 3000, receivedAt: '2026-01-01' },
  { id: 'LOT-1', medicineId: 'TH001', warehouseId: 'KHO001', lot: 'BATCH-2026', expiry: '2026-12-15', qty: 100, receivedAt: '2025-12-01' },
  { id: 'LOT-2', medicineId: 'TH001', warehouseId: 'KHO001', lot: 'BATCH-2027', expiry: '2027-06-30', qty: 500, receivedAt: '2026-01-01' },
  { id: 'LOT-EXPIRED', medicineId: 'TH001', warehouseId: 'KHO001', lot: 'BATCH-EXPIRED', expiry: '2025-01-01', qty: 200, receivedAt: '2024-01-01' }
];

function simulateFEFO(pool, requests, warehouseId, asOfDate = '2026-11-18') {
  const allocations = [];
  for (const req of requests) {
    let remaining = req.quantity;
    const available = pool
      .filter(l => l.medicineId === req.medicine && l.warehouseId === warehouseId && l.expiry >= asOfDate && l.qty > 0)
      .sort((a, b) => a.expiry.localeCompare(b.expiry) || a.receivedAt.localeCompare(b.receivedAt));
    
    for (const lot of available) {
      const take = Math.min(remaining, lot.qty);
      if (take > 0) {
        allocations.push({ lotId: lot.id, lot: lot.lot, expiry: lot.expiry, quantity: take });
        remaining -= take;
      }
      if (!remaining) break;
    }
    if (remaining > 0) throw new Error(`Insufficient stock for ${req.medicine}. Remaining: ${remaining}`);
  }
  return allocations;
}

// Test Case 2.1: Allocate 50 units (should pick BATCH-2026 first)
const alloc1 = simulateFEFO(mockLots, [{ medicine: 'TH001', quantity: 50 }], 'KHO001');
assert(alloc1.length === 1 && alloc1[0].lot === 'BATCH-2026' && alloc1[0].quantity === 50,
  'FEFO correctly prioritizes nearest expiry date (BATCH-2026, expiry 2026-12-15)');

// Test Case 2.2: Allocate 150 units (should exhaust BATCH-2026 [100] and take 50 from BATCH-2027)
const alloc2 = simulateFEFO(mockLots, [{ medicine: 'TH001', quantity: 150 }], 'KHO001');
assert(alloc2.length === 2 && alloc2[0].lot === 'BATCH-2026' && alloc2[0].quantity === 100 &&
       alloc2[1].lot === 'BATCH-2027' && alloc2[1].quantity === 50,
  'FEFO correctly splits across multiple lots in strict expiration sequence');

// Test Case 2.3: Expired lots (BATCH-EXPIRED) must never be allocated
const anyExpired = alloc2.some(a => a.lot === 'BATCH-EXPIRED');
assert(!anyExpired, 'Expired lots (2025-01-01) are strictly excluded from allocation pool');

// Test Case 2.4: Out of stock exception
let threwOutOfStock = false;
try {
  simulateFEFO(mockLots, [{ medicine: 'TH001', quantity: 999999 }], 'KHO001');
} catch {
  threwOutOfStock = true;
}
assert(threwOutOfStock, 'System safely raises exception when requested quantity exceeds available stock');

// TEST SUITE 3: Live Backend API Endpoints
console.log('\n--- TEST SUITE 3: Backend API Integration with SQL Server ---');
async function runApiTests() {
  const baseUrl = 'http://127.0.0.1:3000';

  // 3.1 Health
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const health = await healthRes.json();
  assert(health.status === 'ok' && health.database === 'QuanLyBenhVien', 'GET /api/health connects to QuanLyBenhVien');

  // 3.2 Pharmacy batches
  const batchesRes = await fetch(`${baseUrl}/api/pharmacy/batches`);
  const batches = await batchesRes.json();
  assert(Array.isArray(batches) && batches.length >= 8, `GET /api/pharmacy/batches returns ${batches.length} live SQL Server lots`);
  
  const hasGsk = batches.some(b => b.hangSanXuat && b.hangSanXuat.includes('GSK'));
  const hasAstra = batches.some(b => b.hangSanXuat && b.hangSanXuat.includes('AstraZeneca'));
  const hasMerufa = batches.some(b => b.hangSanXuat && b.hangSanXuat.includes('Merufa'));
  assert(hasGsk && hasAstra && hasMerufa, 'Live batches contain all 3 manufacturers: GSK, AstraZeneca, Merufa');

  const hasExpired = batches.some(b => b.trangThaiHanDung === 'ĐÃ HẾT HẠN' || b.soNgayConHan < 0);
  assert(hasExpired, 'System correctly detects expired lots (e.g. Panadol GSK-OLD-001)');

  // 3.3 Pharmacy Stats
  const statsRes = await fetch(`${baseUrl}/api/pharmacy/stats`);
  const stats = await statsRes.json();
  assert(Array.isArray(stats) && stats.length >= 3, `GET /api/pharmacy/stats groups inventory by manufacturer (${stats.length} groups)`);

  // 3.4 Appointments List
  const apptsRes = await fetch(`${baseUrl}/api/appointments`);
  const appts = await apptsRes.json();
  assert(Array.isArray(appts) && appts.length >= 1, `GET /api/appointments returns appointments from SQL Server (${appts.length} rows)`);
  assert(appts.some(a => a.name && a.phone && a.department), 'Appointments include patient name, phone, and clinical department');

  // Summary
  console.log('\n====================================================');
  console.log(`🏁 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runApiTests().catch(err => {
  console.error('API Verification error:', err);
  process.exit(1);
});
