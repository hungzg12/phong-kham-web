import {csrfHeaders,currentIdentity} from './session.js';
/**
 * API Service Layer for MediCare HIS
 * Direct integration with Microsoft SQL Server (QuanLyBenhVien, 66 tables)
 * Replaces browser localStorage with real server-side ACID persistence.
 */

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

async function req(url, options = {}) {
  const res = await fetch(url, {...options,headers:{...csrfHeaders(),...options.headers}});
  if (!res.ok) {
    let errMessage = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const err = await res.json();
      errMessage = err.error || err.details || errMessage;
    } catch {}
    if(res.status===401&&currentIdentity()&&typeof window!=='undefined')window.dispatchEvent(new Event('medicare-session-expired'));
    throw Object.assign(new Error(errMessage),{status:res.status});
  }
  return res.json();
}

export const hisApi = {
  notifications:()=>req('/api/notifications'),
  notificationAction:data=>req('/api/notifications',{method:'POST',headers:jsonHeaders,body:JSON.stringify(data)}),
  getEquipment:()=>req('/api/equipment'),
  login:data=>req('/api/auth/login',{method:'POST',headers:jsonHeaders,body:JSON.stringify(data)}),
  logout:()=>req('/api/auth/logout',{method:'POST',headers:jsonHeaders,body:'{}'}),
  workspaceSession:()=>req('/api/workspace/session'),
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
  getQueue: (dept = '', history = false) => req(`/api/queue?dept=${encodeURIComponent(dept)}${history?'&history=1':''}`),
  updatePatient: (data) => req('/api/patients', {method:'PUT',headers:jsonHeaders,body:JSON.stringify(data)}),
  changeVisit: (data) => req('/api/visits', {method:'PATCH',headers:jsonHeaders,body:JSON.stringify(data)}),

  // 3. Clinical Examination & Vitals
  getVisitDetail: (visitId) => req(`/api/clinical/visit?id=${encodeURIComponent(visitId)}`),
  getDoctors: () => req('/api/clinical/doctors'),
  getAncillary: () => req('/api/ancillary'),
  getPharmacyState: ()=>req('/api/pharmacy/state'),
  pharmacyAction: data=>req('/api/pharmacy/action',{method:'POST',headers:jsonHeaders,body:JSON.stringify(data)}),
  getFinance: () => req('/api/finance'),
  financeAction: data=>req('/api/finance/action',{method:'POST',headers:jsonHeaders,body:JSON.stringify(data)}),
  getPortal: () => req('/api/portal'),
  portalAppointment: data=>req('/api/portal/appointments',{method:'POST',headers:jsonHeaders,body:JSON.stringify(data)}),
  saveNursingVitals: data=>req('/api/nursing/vitals',{method:'POST',headers:jsonHeaders,body:JSON.stringify(data)}),
  performCare: data=>req('/api/nursing/perform',{method:'POST',headers:jsonHeaders,body:JSON.stringify(data)}),
  bedAction: data=>req('/api/nursing/bed',{method:'POST',headers:jsonHeaders,body:JSON.stringify(data)}),
  createLabOrders: data=>req('/api/labs/orders',{method:'POST',headers:jsonHeaders,body:JSON.stringify(data)}),
  labAction: data=>req('/api/labs/action',{method:'POST',headers:jsonHeaders,body:JSON.stringify(data)}),
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
  getPharmacyShipments: () => req('/api/pharmacy/shipments'),
  getPharmacyStats: () => req('/api/pharmacy/stats'),
  importPharmacyLot: (data) => req('/api/pharmacy/import', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),
  createPharmacyProduct: (data) => req('/api/pharmacy/product', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),
  transferPharmacyStock: (data) => req('/api/pharmacy/transfer', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),
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
  cleanBed: (bedId) => req('/api/inpatient/clean', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ bedId }),
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
  saveAppointment: (method,data)=>req('/api/appointments',{method,headers:jsonHeaders,body:JSON.stringify(data)}),
  getAppointments: () => req('/api/appointments'),
  createAppointment: (data) => req('/api/appointments', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  }),
  searchIcd10: (q) => req(`/api/icd10?q=${encodeURIComponent(q)}`),
};
