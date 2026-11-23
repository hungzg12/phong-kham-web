import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBhytCard, isBhytEligibleItem, calculateBhytCostBreakdown, BHYT_RATE_OPTIONS } from '../src/bhyt-utils.js';

test('BHYT Statutory: isBhytEligibleItem strictly isolates non-reimbursable OTC combination drugs (TT 20/2022/TT-BYT)', () => {
  // Panadol Extra contains Caffeine (65mg) - STRICTLY PROHIBITED from BHYT reimbursement
  const panadolExtra = isBhytEligibleItem('Panadol Extra 500mg/65mg');
  assert.equal(panadolExtra.eligible, false);
  assert.equal(panadolExtra.statutoryCode, 'NON_BHYT_CAFFEINE');
  assert.match(panadolExtra.reason, /Caffeine/i);
  assert.match(panadolExtra.reason, /20\/2022\/TT-BYT/);

  // Generic Paracetamol 500mg without Caffeine is fully reimbursable
  const genericPara = isBhytEligibleItem('Paracetamol 500mg (Viên nén)');
  assert.equal(genericPara.eligible, true);
  assert.equal(genericPara.statutoryCode, 'BHYT_ELIGIBLE');

  // Augmentin antibiotic is reimbursable
  const augmentin = isBhytEligibleItem('Augmentin 1g (Amoxicillin/Clavulanate)');
  assert.equal(augmentin.eligible, true);

  // Dietary supplements / TPCN are non-reimbursable
  const supplement = isBhytEligibleItem('Thực phẩm chức năng bổ não');
  assert.equal(supplement.eligible, false);
  assert.equal(supplement.statutoryCode, 'NON_BHYT_SUPPLEMENT');

  // Elective on-demand service is non-reimbursable
  const onDemand = isBhytEligibleItem('Khám chuyên gia theo yêu cầu');
  assert.equal(onDemand.eligible, false);
  assert.equal(onDemand.statutoryCode, 'NON_BHYT_ON_DEMAND');
});

test('BHYT Statutory: calculateBhytCostBreakdown never bills Panadol Extra to BHYT fund (Zero BHYT Fraud)', () => {
  // Patient with BHYT 100% benefit (e.g. HT2 - Hưu trí ưu đãi / Sĩ quan)
  const cardCode = 'HT2790123456789';
  const info = parseBhytCard(cardCode);
  assert.equal(info.rate, 100);

  const items = [
    { description: 'Khám chuyên khoa Nội tổng quát', quantity: 1, price: 150000, insuranceCovered: true },
    { description: 'Tổng phân tích tế bào máu ngoại vi (CBC)', quantity: 1, price: 110000, insuranceCovered: true },
    { description: 'Paracetamol 500mg (Viên nén)', quantity: 10, price: 1200, insuranceCovered: true },
    // Panadol Extra mistakenly checked as insuranceCovered: true by user/scratchpad
    { description: 'Panadol Extra 500mg/65mg', quantity: 10, price: 1500, insuranceCovered: true }
  ];

  const breakdown = calculateBhytCostBreakdown(items, cardCode, true);

  // Total gross: 150,000 + 110,000 + 12,000 + 15,000 = 287,000đ
  assert.equal(breakdown.gross, 287000);

  // BHYT covered gross MUST ONLY include: Exam (150k) + CBC (110k) + Paracetamol (12k) = 272,000đ
  // Panadol Extra (15k) MUST BE EXCLUDED from BHYT coverage!
  assert.equal(breakdown.bhytCoveredGross, 272000);
  assert.equal(breakdown.totalBhytPaid, 272000);

  // Patient Copay inside BHYT is 0đ (100% card)
  assert.equal(breakdown.totalPatientCopay, 0);

  // Out of pocket gross MUST equal Panadol Extra: 15,000đ
  assert.equal(breakdown.outOfPocketGross, 15000);

  // Patient total due: 0đ copay + 15,000đ Panadol Extra = 15,000đ
  assert.equal(breakdown.totalPatientDue, 15000);

  // Verify itemized details for Panadol Extra
  const panadolRow = breakdown.itemDetails.find(r => r.description.includes('Panadol Extra'));
  assert.ok(panadolRow);
  assert.equal(panadolRow.isEligible, false);
  assert.equal(panadolRow.bhytAmount, 0); // BHYT pays 0đ!
  assert.equal(panadolRow.patientAmount, 15000); // Patient pays 100%!
  assert.match(panadolRow.nonBhytReason, /Caffeine/i);
});

test('BHYT Statutory: BHYT_RATE_OPTIONS labels accurately reflect statutory groups without demographic confusion', () => {
  const opt100 = BHYT_RATE_OPTIONS.find(o => o.rate === 100);
  const opt95 = BHYT_RATE_OPTIONS.find(o => o.rate === 95);
  const opt80 = BHYT_RATE_OPTIONS.find(o => o.rate === 80);
  const opt0 = BHYT_RATE_OPTIONS.find(o => o.rate === 0);

  assert.ok(opt100.label.includes('100%'));
  assert.ok(opt100.label.includes('HT2') || opt100.label.includes('Hưu trí'));
  assert.ok(opt95.label.includes('95%'));
  assert.ok(opt95.label.includes('HT3') || opt95.label.includes('Hưu trí'));
  assert.ok(opt80.label.includes('80%'));
  assert.ok(opt0.label.includes('100%'));
});
