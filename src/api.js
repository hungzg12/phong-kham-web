/**
 * API Service Layer for MediCare HIS
 * Direct integration with Microsoft SQL Server (QuanLyBenhVien, 66 tables)
 * Replaces browser localStorage with real server-side ACID persistence.
 */

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

async function req(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errMessage = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const err = await res.json();
      errMessage = err.error || err.details || errMessage;
    } catch {}
    throw new Error(errMessage);
  }
  return res.json();
}

export const hisApi = {
  // 1. Health check
  health: () => req('/api/health'),

  // 2. Patients & Visits
  getPatients: (q = '') => req(`/api/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createPatient: (data) => req('/api/patients', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),
  createVisit: (data) => req('/api/visits', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),
  getQueue: (dept = '') => req(`/api/queue${dept ? `?dept=${encodeURIComponent(dept)}` : ''}`),

  // 3. Clinical Examination & Vitals
  getVisitDetail: (visitId) => req(`/api/clinical/visit?id=${encodeURIComponent(visitId)}`),
  saveVitals: (data) => req('/api/clinical/vitals', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),
  saveExamNote: (data) => req('/api/clinical/exam', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),
  lockRecord: (visitId, doctorStaffId = 'NV-BS01') => req('/api/clinical/lock', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ visitId, doctorStaffId }),
  }),

  // 4. Pharmacy & Prescriptions
  getMedicines: (warehouse = 'KHO_NGOAI_TRU') => req(`/api/medicines?warehouse=${encodeURIComponent(warehouse)}`),
  getPharmacyBatches: () => req('/api/pharmacy/batches'),
  getPharmacyStats: () => req('/api/pharmacy/stats'),
  createPrescription: (data) => req('/api/prescriptions', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),
  dispensePrescription: (prescriptionId, warehouse = 'KHO_NGOAI_TRU') => req('/api/prescriptions/dispense', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ prescriptionId, warehouse }),
  }),
  getPrescriptionsByVisit: (visitId) => req(`/api/clinical/prescriptions?visitId=${encodeURIComponent(visitId)}`),

  // 5. Technical Services & Labs
  getServices: () => req('/api/services'),
  createOrder: (data) => req('/api/clinical/orders', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),
  getOrdersByVisit: (visitId) => req(`/api/clinical/orders?visitId=${encodeURIComponent(visitId)}`),
  saveLabResult: (data) => req('/api/labs/results', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),

  // 6. Inpatient & Beds
  getBeds: () => req('/api/inpatient/beds'),
  admitInpatient: (data) => req('/api/inpatient/admit', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),
  dischargeInpatient: (data) => req('/api/inpatient/discharge', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),

  // 7. Billing & Financial Settle
  getStatement: (visitId) => req(`/api/billing/statement?visitId=${encodeURIComponent(visitId)}`),
  recordAdvance: (data) => req('/api/billing/advance', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),
  settleInvoice: (data) => req('/api/billing/settle', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),

  // 8. Appointments & ICD-10
  getAppointments: () => req('/api/appointments'),
  createAppointment: (data) => req('/api/appointments', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),
  searchIcd10: (q) => req(`/api/icd10?q=${encodeURIComponent(q)}`),
};
