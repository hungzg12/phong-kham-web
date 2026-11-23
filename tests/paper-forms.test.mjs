import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { adminFixture } from './admin-fixture.mjs';
import { querySql } from '../server/admin-store.mjs';
import { migratePaperFormsSchema } from '../scripts/migrate-paper-forms.mjs';
import { seedPaperFormsData } from '../scripts/seed-paper-forms-data.mjs';
import { getPaperFormData, savePaperFormData } from '../server/paper-forms.mjs';

let fixture;

before(async () => {
  fixture = await adminFixture();
  await migratePaperFormsSchema();
  await seedPaperFormsData();
});

after(async () => {
  if (fixture) await fixture.close();
});

test('paper forms: getPaperFormData fetches seeded referral correctly', async () => {
  const row = await getPaperFormData('referrals', 'CT-261122-001');
  assert.ok(row, 'Referral record must exist');
  assert.equal(row.id, 'CT-261122-001');
  assert.equal(row.destination, 'Bệnh viện Chợ Rẫy');
  assert.equal(row.icd, 'I20.0');
});

test('paper forms: savePaperFormData creates and updates referral with SQL round-trip', async () => {
  const customId = 'CT-TEST-999';
  const saveRes = await savePaperFormData('referrals', {
    id: customId,
    soVaoSo: '99/2026/GCT',
    patient: 'BN-240101-001',
    destination: 'Bệnh viện Bạch Mai',
    destinationCode: '01-001',
    level: 'Tuyến 1 (Tuyến Trung ương)',
    reason: 'Vượt quá năng lực can thiệp chuyên sâu',
    symptoms: 'Đau thắt ngực gắng sức độ 3 theo CCS',
    labSummary: 'Troponin T = 1.2 ng/mL',
    diagnosis: 'Hội chứng vành cấp',
    icd: 'I20.0',
    treatment: 'Aspirin, Clopidogrel, Nitroglycerin',
    condition: 'Tỉnh, thở oxy',
    plan: 'Can thiệp mạch vành qua da (PCI)',
    transport: 'Xe cấp cứu chuyên dụng 115',
    escort: 'BS. Trần Minh Anh'
  });

  assert.equal(saveRes.ok, true);
  assert.equal(saveRes.id, customId);

  const fetched = await getPaperFormData('referrals', customId);
  assert.ok(fetched, 'Newly created referral must be retrievable');
  assert.equal(fetched.destination, 'Bệnh viện Bạch Mai');
  assert.equal(fetched.soVaoSo, '99/2026/GCT');
  assert.equal(fetched.icd, 'I20.0');

  // Update existing referral
  await savePaperFormData('referrals', {
    id: customId,
    destination: 'Bệnh viện Đại học Y Dược TP.HCM',
    condition: 'Đã ổn định sau hồi sức'
  });

  const updated = await getPaperFormData('referrals', customId);
  assert.equal(updated.destination, 'Bệnh viện Đại học Y Dược TP.HCM');
  assert.equal(updated.condition, 'Đã ổn định sau hồi sức');
});

test('paper forms: getPaperFormData fetches seeded discharge paper correctly', async () => {
  const row = await getPaperFormData('discharges', 'RV-261122-001');
  assert.ok(row, 'Discharge record must exist');
  assert.equal(row.id, 'RV-261122-001');
  assert.equal(row.soLuuTru, 'RV-2026/088');
  assert.equal(row.icd, 'E11.9');
});

test('paper forms: savePaperFormData creates discharge paper and updates correctly', async () => {
  const customId = 'RV-TEST-888';
  const saveRes = await savePaperFormData('discharges', {
    id: customId,
    soLuuTru: 'RV-2026/888',
    patient: 'BN-240101-001',
    diagnosis: 'Viêm dạ dày cấp tính',
    icd: 'K29.0',
    treatment: 'PPI 40mg + kháng sinh diệt HP',
    outcome: 'Khỏi bệnh',
    daysOff: 10,
    advice: 'Nghỉ ngơi, ăn uống điều độ'
  });

  assert.equal(saveRes.ok, true);
  assert.equal(saveRes.id, customId);

  const fetched = await getPaperFormData('discharges', customId);
  assert.ok(fetched, 'Discharge record must exist in SQL');
  assert.equal(fetched.soLuuTru, 'RV-2026/888');
  assert.equal(fetched.daysOff, 10);
});

test('paper forms: getPaperFormData and savePaperFormData for archives (medical summary)', async () => {
  const customId = 'TTBA-TEST-777';
  const saveRes = await savePaperFormData('archives', {
    id: customId,
    patient: 'BN-240101-001',
    pathology: 'Đau đầu âm ỉ kèm chóng mặt',
    labSummary: 'MRI sọ não không tổn thương khu trú',
    diagnosis: 'Rối loạn tiền đình ngoại biên',
    icd: 'H81.0',
    treatment: 'Betahistine 24mg, Ginkgo biloba',
    outcome: 'Đỡ nhiều',
    advice: 'Tránh căng thẳng, tái khám sau 14 ngày'
  });

  assert.equal(saveRes.ok, true);
  assert.equal(saveRes.id, customId);

  const fetched = await getPaperFormData('archives', customId);
  assert.ok(fetched, 'Summary record must exist');
  assert.equal(fetched.diagnosis, 'Rối loạn tiền đình ngoại biên');
  assert.equal(fetched.icd, 'H81.0');
});
