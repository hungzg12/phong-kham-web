import {protectWorkspaceRequest} from './workspace-access.mjs';
import {pharmacyState,pharmacyAction} from './pharmacy.mjs';
import {querySql} from './admin-store.mjs';
import {receivePatient,updatePatient,listVisits,changeVisit,saveExam,searchIcd,listDoctors} from './clinic-flow.mjs';
import {ancillaryState,saveVitals,createLab,labAction,performCare,listBeds,bedAction} from './ancillary.mjs';
import {financeState,financeAction} from './finance.mjs';
import {portalState,portalAppointment} from './patient-portal.mjs';
import { listAppointments, saveAppointment, cancelAppointment, checkInAppointment } from './appointments.mjs';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const departments = new Map([
  ['Nội tổng quát', 'NOI'], ['Tim mạch', 'TIM'], ['Tai Mũi Họng', 'TMH'],
  ['Da liễu', 'DA'], ['Sản phụ khoa', 'SAN'], ['Cơ xương khớp', 'CXK'],
]);

export function runSqlScript(relativeFile, data) {
  const fullPath = path.join(root, relativeFile);
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', fullPath], {
      windowsHide: true, timeout: 15000,
    });
    let output = '';
    let errorOutput = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { output += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { errorOutput += chunk; });
    child.on('error', reject);
    child.stdin.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`SQL script ${relativeFile} failed (exit ${code}): ${errorOutput || output}`));
      }
    });
    child.stdin.end(JSON.stringify(data ?? null).replace(/[^\x00-\x7F]/g, char =>
      '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')));
  });
}

export function createApiMiddleware({trustedTest=false}={}) {
  if(trustedTest&&!/Database=MediCareQA_Admin_[a-f0-9]{16}(?:;|$)/i.test(process.env.MEDICARE_SQL_CONNECTION||''))throw new Error('Test bypass requires an isolated MediCareQA database');
  return async (req, res, next) => {
    const url = req.url.split('?')[0];
    if (!url.startsWith('/api/')) return next();

    const respond = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    };

    try {
      const access=trustedTest?{}:await protectWorkspaceRequest(req);
      if(Object.hasOwn(access,'answer'))return respond(200,access.answer);
      if(!trustedTest&&url==='/api/patients'&&req.method==='POST')return respond(410,{error:'Dùng tiếp đón để tạo bệnh nhân và lượt khám cùng giao dịch.'});
      if(url==='/api/pharmacy/state'&&req.method==='GET')return respond(200,await pharmacyState());
      if(url==='/api/pharmacy/action'&&req.method==='POST'){
        let body='';for await(const part of req){body+=part;if(body.length>60000)return respond(413,{error:'Dữ liệu quá dài.'});}
        return respond(200,await pharmacyAction(JSON.parse(body)));
      }
      if(['/api/prescriptions','/api/prescriptions/dispense','/api/pharmacy/import','/api/pharmacy/product','/api/pharmacy/transfer'].includes(url)&&req.method==='POST')return respond(410,{error:'Sử dụng API dược hiện tại /api/pharmacy/action để kiểm tra vai trò, nhân viên và lưu đúng database.'});
      if(url==='/api/finance'&&req.method==='GET')return respond(200,await financeState());
      if(url==='/api/portal'&&req.method==='GET')return respond(200,await portalState());
      if(['/api/finance/action','/api/portal/appointments'].includes(url)&&req.method==='POST'){
        let body='';for await(const part of req){body+=part;if(body.length>60000)return respond(413,{error:'Dữ liệu quá dài.'});}
        const data=JSON.parse(body);return respond(200,await (url==='/api/finance/action'?financeAction(data):portalAppointment(data,access.identity?.patientId)));
      }
      if(url==='/api/ancillary'&&req.method==='GET')return respond(200,await ancillaryState());
      if(['/api/nursing/vitals','/api/nursing/perform','/api/nursing/bed','/api/labs/action','/api/labs/orders'].includes(url)&&req.method==='POST'){
        let body='';for await(const part of req){body+=part;if(body.length>60000)return respond(413,{error:'Dữ liệu quá dài.'});}
        const data=JSON.parse(body);
        return respond(200,await (url==='/api/nursing/vitals'?saveVitals:url==='/api/nursing/perform'?performCare:url==='/api/nursing/bed'?bedAction:url==='/api/labs/orders'?createLab:labAction)(data));
      }
      // 1. Health check
      if (url === '/api/health') {
        return respond(200, { service: 'medicare-his', status: 'ok', database: 'QuanLyBenhVien' });
      }

      // 2. Pharmacy FEFO Batches
      if (url === '/api/pharmacy/batches' && req.method === 'GET') {
        const json = await querySql(`
          SELECT 
              lh.maLoHang,
              lh.soLoNhaSanXuat,
              h.maHang,
              h.tenHang,
              h.loaiHang,
              ISNULL(t.hoatChat, h.tenHang) AS hoatChat,
              ISNULL(lh.hangSanXuat, N'Việt Nam') AS hangSanXuat,
              ISNULL(lh.nuocSanXuat, N'Việt Nam') AS nuocSanXuat,
              CONVERT(char(10), lh.hanSuDung, 23) AS hanSuDung,
              DATEDIFF(day, CAST(GETDATE() AS date), lh.hanSuDung) AS soNgayConHan,
              CASE 
                  WHEN DATEDIFF(day, CAST(GETDATE() AS date), lh.hanSuDung) < 0 THEN N'ĐÃ HẾT HẠN'
                  WHEN DATEDIFF(day, CAST(GETDATE() AS date), lh.hanSuDung) <= 30 THEN N'CẬN DATE (<= 30 NGÀY)'
                  WHEN DATEDIFF(day, CAST(GETDATE() AS date), lh.hanSuDung) <= 90 THEN N'CẬN DATE (<= 90 NGÀY)'
                  ELSE N'CÒN HẠN SỬ DỤNG'
              END AS trangThaiHanDung,
              k.maKho,
              k.tenKho,
              ISNULL(ltk.viTriDayKe, N'Kệ nhập') AS viTriDayKe,
              ltk.soLuongTon,
              ltk.soLuongKhaDung,
              h.donViCoSo,
              lh.donGiaNhap,
              (ltk.soLuongTon * lh.donGiaNhap) AS thanhTienTon,
              ltk.trangThaiKhoa
          FROM dbo.LoTonKho ltk
          INNER JOIN dbo.LoHang lh ON lh.maLoHang = ltk.maLoHang
          INNER JOIN dbo.HangHoaYTe h ON h.maHang = lh.maHang
          INNER JOIN dbo.KhoDuoc k ON k.maKho = ltk.maKho
          LEFT JOIN dbo.Thuoc t ON t.maHang = h.maHang
          ORDER BY lh.hanSuDung ASC
          FOR JSON PATH
        `);
        return respond(200, JSON.parse(json || '[]'));
      }

      // 2b. Pharmacy Shipments & Batches Overview (GET /api/pharmacy/shipments)
      if (url === '/api/pharmacy/shipments' && req.method === 'GET') {
        const json = await querySql(`
          SELECT 
              d.maDotNhap,
              d.tenDotNhap,
              ISNULL(d.hangSanXuat, N'Nhiều hãng') AS hangSanXuat,
              ISNULL(d.nhaCungCap, N'Nhà phân phối dược') AS nhaCungCap,
              ISNULL(d.soHoaDon, N'HD-CHUA-LUU') AS soHoaDon,
              CONVERT(char(10), d.ngayNhapKho, 23) AS ngayNhapKho,
              k.maKho AS maKhoNhap,
              k.tenKho AS khoNhap,
              d.nguoiGiaoHang,
              d.nguoiNhanHang,
              d.ghiChu,
              COUNT(DISTINCT lh.maHang) AS soLoaiThuoc,
              ISNULL(SUM(lh.soLuongNhap), 0) AS tongSoLuongNhap,
              ISNULL(SUM(lh.soLuongNhap * lh.donGiaNhap), 0) AS tongGiaTriNhap,
              JSON_QUERY((
                  SELECT 
                      lh2.maLoHang,
                      lh2.soLoNhaSanXuat,
                      h.maHang,
                      h.tenHang,
                      h.donViCoSo,
                      h.loaiHang,
                      ISNULL(t.hoatChat, h.tenHang) AS hoatChat,
                      CONVERT(char(10), lh2.hanSuDung, 23) AS hanSuDung,
                      DATEDIFF(day, CAST(GETDATE() AS date), lh2.hanSuDung) AS soNgayConHan,
                      lh2.soLuongNhap,
                      lh2.donGiaNhap,
                      (lh2.soLuongNhap * lh2.donGiaNhap) AS thanhTien,
                      ISNULL(SUM(ltk.soLuongTon), 0) AS tonHienTai,
                      ISNULL(SUM(ltk.soLuongKhaDung), 0) AS tonKhaDung
                  FROM dbo.LoHang lh2
                  INNER JOIN dbo.HangHoaYTe h ON h.maHang = lh2.maHang
                  LEFT JOIN dbo.Thuoc t ON t.maHang = h.maHang
                  LEFT JOIN dbo.LoTonKho ltk ON ltk.maLoHang = lh2.maLoHang
                  WHERE lh2.maDotNhap = d.maDotNhap
                  GROUP BY lh2.maLoHang, lh2.soLoNhaSanXuat, h.maHang, h.tenHang, h.donViCoSo, h.loaiHang, t.hoatChat, lh2.hanSuDung, lh2.soLuongNhap, lh2.donGiaNhap
                  FOR JSON PATH
              )) AS danhSachThuoc
          FROM dbo.DotNhapHang d
          INNER JOIN dbo.KhoDuoc k ON k.maKho = d.maKhoNhap
          LEFT JOIN dbo.LoHang lh ON lh.maDotNhap = d.maDotNhap
          GROUP BY d.maDotNhap, d.tenDotNhap, d.hangSanXuat, d.nhaCungCap, d.soHoaDon, d.ngayNhapKho, k.maKho, k.tenKho, d.nguoiGiaoHang, d.nguoiNhanHang, d.ghiChu
          FOR JSON PATH
        `);
        return respond(200, JSON.parse(json || '[]'));
      }

      // 3. Pharmacy Stats by Manufacturer
      if (url === '/api/pharmacy/stats' && req.method === 'GET') {
        const json = await querySql(`
          SELECT 
              hangSanXuat,
              nuocSanXuat,
              soLoaiThuocCungUng,
              tongSoLoHang,
              tongSoLuongTonKho,
              tongGiaTriTonKho,
              soLoCanDate
          FROM dbo.vw_ThongKeThuoc_TheoHangSanXuat
          FOR JSON PATH
        `);
        return respond(200, JSON.parse(json || '[]'));
      }

      // 3b. Pharmacy Import Lot (POST /api/pharmacy/import)
      if (url === '/api/pharmacy/import' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const result = await runSqlScript('scripts/sql-pharmacy-actions.ps1', { action: 'import_lot', ...data });
        return respond(201, JSON.parse(result));
      }

      // 3c. Pharmacy Create Product (POST /api/pharmacy/product)
      if (url === '/api/pharmacy/product' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const result = await runSqlScript('scripts/sql-pharmacy-actions.ps1', { action: 'create_product', ...data });
        return respond(201, JSON.parse(result));
      }

      // 3d. Pharmacy Transfer Stock (POST /api/pharmacy/transfer)
      if (url === '/api/pharmacy/transfer' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const result = await runSqlScript('scripts/sql-pharmacy-actions.ps1', { action: 'transfer_stock', ...data });
        return respond(200, JSON.parse(result));
      }

      // Persist the existing appointment UI operations through the configured SQL connection.
      if (url === '/api/appointments') {
        if (req.method === 'GET') return respond(200, await listAppointments());
        if (['POST','PUT','PATCH'].includes(req.method)) {
          let body = '';
          for await (const part of req) { body += part; if (body.length > 8000) return respond(413,{error:'Thông tin quá dài.'}); }
          let data; try { data=JSON.parse(body); } catch { return respond(400,{error:'Dữ liệu JSON không hợp lệ.'}); }
          if (!data || typeof data!=='object' || Array.isArray(data)) return respond(400,{error:'Thông tin lịch hẹn không hợp lệ.'});
          if (req.method==='PUT' && (typeof data.id!=='string' || !data.id.trim())) return respond(400,{error:'Thiếu mã lịch hẹn cần cập nhật.'});
          if (req.method === 'PATCH') return respond(200,await cancelAppointment(data.id,data.reason));
          return respond(req.method==='POST'?201:200,await saveAppointment(data,req.method==='PUT'?data.id:null));
        }
        return respond(405,{error:'Phương thức không được hỗ trợ.'});
      }

      // 5. ICD-10 Search
      if (url === '/api/icd10' && req.method === 'GET') {
        const fullUrl = new URL(req.url, 'http://127.0.0.1');
        const q = fullUrl.searchParams.get('q') || '';
        return respond(200, await searchIcd(q));
      }

      // 6. ICD-10 Excel Template Download
      if (url === '/api/icd10/template' && req.method === 'GET') {
        const filePath = path.join(root, 'database', 'Danh_Muc_ICD10_Chuan_Bo_Y_Te.xlsx');
        if (fs.existsSync(filePath)) {
          const fileData = fs.readFileSync(filePath);
          res.writeHead(200, {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="Danh_Muc_ICD10_Chuan_Bo_Y_Te.xlsx"'
          });
          return res.end(fileData);
        }
        return respond(404, { error: 'Template file not found' });
      }

      // 7. ICD-10 Import from Excel / JSON
      if (url === '/api/icd10/import' && req.method === 'POST') {
        let body = '';
        for await (const part of req) {
          body += part;
          if (body.length > 10000000) return respond(413, { error: 'Tệp dữ liệu quá lớn (tối đa 10MB).' });
        }
        const data = JSON.parse(body);
        const rows = Array.isArray(data) ? data : (Array.isArray(data.rows) ? data.rows : (data.maICD ? [data] : []));
        if (!rows.length) return respond(400, { error: 'Không có dữ liệu mã bệnh để nhập.' });
        const result = await runSqlScript('scripts/sql-icd10-import.ps1', rows);
        return respond(200, JSON.parse(result));
      }

      // 8. Patients List & Search
      if (url === '/api/patients' && req.method === 'GET') {
        const fullUrl = new URL(req.url, 'http://127.0.0.1');
        const q = fullUrl.searchParams.get('q') || '';
        const list = await runSqlScript('scripts/sql-patients-visits.ps1', { action: 'list_patients', q });
        return respond(200, JSON.parse(list));
      }

      // 9. Patient Registration (POST /api/patients)
      if (url === '/api/patients' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const result = await runSqlScript('scripts/sql-patients-visits.ps1', { action: 'create_patient', ...data });
        return respond(201, JSON.parse(result));
      }

      // 10. Admit to Queue / Create Visit (POST /api/visits)
      if (url === '/api/visits' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        if (data.appointmentId) return respond(200, await checkInAppointment(data));
        return respond(201, await receivePatient(data));
      }

      // 11. Live Waiting Queue (GET /api/queue)
      if (url === '/api/queue' && req.method === 'GET') {
        const params=new URL(req.url,'http://localhost').searchParams;
        return respond(200,await listVisits({history:params.get('history')==='1'}));
      }
      if (url === '/api/patients' && req.method === 'PUT') {
        let body='';for await(const part of req)body+=part;
        return respond(200,await updatePatient(JSON.parse(body)));
      }
      if (url === '/api/visits' && req.method === 'PATCH') {
        let body='';for await(const part of req)body+=part;
        return respond(200,await changeVisit(JSON.parse(body)));
      }

      // 12. Clinical Visit Detail (GET /api/clinical/visit?id=...)
      if (url === '/api/clinical/doctors' && req.method === 'GET') return respond(200,await listDoctors());
      if (url === '/api/clinical/visit' && req.method === 'GET') {
        const id=new URL(req.url,'http://localhost').searchParams.get('id');
        if(!id)return respond(400,{error:'Thiếu mã lượt khám.'});
        const row=(await listVisits({history:true,id}))[0];
        return row?respond(200,row):respond(404,{error:'Không tìm thấy lượt khám.'});
      }

      // 13. Save Vitals (POST /api/clinical/vitals)
      if (url === '/api/clinical/vitals' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const result = await runSqlScript('scripts/sql-clinical-desk.ps1', { action: 'save_vitals', ...data });
        return respond(200, JSON.parse(result));
      }

      // 14. Save Clinical Examination Note (POST /api/clinical/exam)
      if (url === '/api/clinical/exam' && req.method === 'POST') {
        let body='';for await(const part of req){body+=part;if(body.length>60000)return respond(413,{error:'Phiếu khám quá dài.'});}
        return respond(200,await saveExam(JSON.parse(body)));
      }

      // 15. Lock EMR Record (POST /api/clinical/lock)
      if (url === '/api/clinical/lock' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const result = await runSqlScript('scripts/sql-clinical-desk.ps1', { action: 'lock_record', ...data });
        return respond(200, JSON.parse(result));
      }

      // 16. Medicines with Live Stock (GET /api/medicines)
      if (url === '/api/medicines' && req.method === 'GET') {
        const fullUrl = new URL(req.url, 'http://127.0.0.1');
        const warehouse = fullUrl.searchParams.get('warehouse') || 'KHO_NGOAI_TRU';
        const list = await runSqlScript('scripts/sql-prescriptions-fefo.ps1', { action: 'list_medicines', warehouse });
        return respond(200, JSON.parse(list));
      }

      // 17. Create Prescription (POST /api/prescriptions)
      if (url === '/api/prescriptions' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const result = await runSqlScript('scripts/sql-prescriptions-fefo.ps1', { action: 'create_prescription', ...data });
        return respond(201, JSON.parse(result));
      }

      // 18. Dispense Prescription via FEFO (POST /api/prescriptions/dispense)
      if (url === '/api/prescriptions/dispense' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const result = await runSqlScript('scripts/sql-prescriptions-fefo.ps1', { action: 'dispense_fefo', ...data });
        return respond(200, JSON.parse(result));
      }

      // 19. Get Prescriptions by Visit (GET /api/clinical/prescriptions?visitId=...)
      if (url === '/api/clinical/prescriptions' && req.method === 'GET') {
        const fullUrl = new URL(req.url, 'http://127.0.0.1');
        const visitId = fullUrl.searchParams.get('visitId') || '';
        const list = await runSqlScript('scripts/sql-prescriptions-fefo.ps1', { action: 'get_prescriptions_by_visit', visitId });
        return respond(200, JSON.parse(list));
      }

      // 20. Technical Services List (GET /api/services)
      if (url === '/api/services' && req.method === 'GET') {
        const list = await runSqlScript('scripts/sql-services-labs.ps1', { action: 'list_services' });
        return respond(200, JSON.parse(list));
      }

      // 21. Create Diagnostic / Lab Order (POST /api/clinical/orders)
      if (url === '/api/clinical/orders' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const result = await runSqlScript('scripts/sql-services-labs.ps1', { action: 'create_order', ...data });
        return respond(201, JSON.parse(result));
      }

      // 22. Get Orders & Results by Visit (GET /api/clinical/orders?visitId=...)
      if (url === '/api/clinical/orders' && req.method === 'GET') {
        const fullUrl = new URL(req.url, 'http://127.0.0.1');
        const visitId = fullUrl.searchParams.get('visitId') || '';
        const list = await runSqlScript('scripts/sql-services-labs.ps1', { action: 'get_orders_by_visit', visitId });
        return respond(200, JSON.parse(list));
      }

      // 23. Save & Approve Lab / Diagnostic Result (POST /api/labs/results)
      if (url === '/api/labs/results' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const result = await runSqlScript('scripts/sql-services-labs.ps1', { action: 'save_result', ...data });
        return respond(200, JSON.parse(result));
      }

      // 24. Statement Form 01/BV (GET /api/billing/statement?visitId=...)
      if (url === '/api/billing/statement' && req.method === 'GET') {
        const fullUrl = new URL(req.url, 'http://127.0.0.1');
        const visitId = fullUrl.searchParams.get('visitId') || '';
        const data = await runSqlScript('scripts/sql-billing.ps1', { action: 'get_statement', visitId });
        return respond(200, JSON.parse(data));
      }

      // 25. Advance Payment Deposit (POST /api/billing/advance)
      if (url === '/api/billing/advance' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const result = await runSqlScript('scripts/sql-billing.ps1', { action: 'record_advance', ...data });
        return respond(201, JSON.parse(result));
      }

      // 26. Settle Invoice & Discharge Billing (POST /api/billing/settle)
      if (url === '/api/billing/settle' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const result = await runSqlScript('scripts/sql-billing.ps1', { action: 'settle_invoice', ...data });
        return respond(200, JSON.parse(result));
      }

      // 27. Inpatient Beds Live Status (GET /api/inpatient/beds)
      if (url === '/api/inpatient/beds' && req.method === 'GET') {
        return respond(200, await listBeds());
      }

      // 28. Admit Inpatient & Assign Bed (POST /api/inpatient/admit)
      if (url === '/api/inpatient/admit' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const {
          patientId,
          bedId,
          doctor = 'NV-BS01',
          diagnosis = 'Viêm phổi thùy cấp',
          icdCode = 'J18.1',
          reason = 'Tiếp nhận điều trị nội trú',
          admissionTime,
          advanceAmount = 0,
          paymentMethod = 'TIEN_MAT',
          staffId = 'NV-DD01',
          note = ''
        } = data;

        if (!patientId || !bedId) {
          return respond(400, { error: 'Thiếu mã bệnh nhân hoặc mã buồng giường.' });
        }

        const advanceNum = Number(advanceAmount) || 0;
        const pMethod = ['TIEN_MAT', 'CHUYEN_KHOAN', 'VIETQR', 'THE_POS'].includes(paymentMethod) ? paymentMethod : 'TIEN_MAT';

        const sql = `
          SET QUOTED_IDENTIFIER ON;
          SET ANSI_NULLS ON;
          BEGIN TRY
            BEGIN TRANSACTION;

            -- 1. Check bed status
            DECLARE @currentStatus VARCHAR(30), @bedRate DECIMAL(18,2), @bedDept VARCHAR(30);
            SELECT @currentStatus = g.trangThaiHienTai, @bedRate = g.donGiaNgay, @bedDept = b.maKhoa
            FROM dbo.GiuongBenh g
            JOIN dbo.BuongBenh b ON b.maBuongBenh = g.maBuongBenh
            WHERE g.maGiuong = @bedId;

            IF @currentStatus IS NULL
              THROW 50001, N'Không tìm thấy thông tin buồng giường.', 1;

            IF @currentStatus <> 'TRONG'
              THROW 50002, N'Giường bệnh hiện không ở trạng thái sẵn sàng tiếp nhận.', 1;

            -- 2. Generate unique IDs
            DECLARE @now DATETIME2 = SYSDATETIME();
            DECLARE @datePrefix VARCHAR(10) = FORMAT(@now, 'yyMMdd');
            DECLARE @randStr VARCHAR(6) = RIGHT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 4);
            DECLARE @maDot VARCHAR(20) = 'BA-' + @datePrefix + '-' + @randStr;
            DECLARE @maPG VARCHAR(20) = 'PG-' + @datePrefix + '-' + @randStr;
            DECLARE @maGD VARCHAR(20) = 'GD-' + @datePrefix + '-' + @randStr;

            -- 3. Insert DotDieuTri
            INSERT INTO dbo.DotDieuTri (
                maDotDieuTri, maBenhNhan, maKhoaDieuTri,
                thoiDiemNhapVien, lyDoNhapVien, chanDoanVaoVien, maICDVaoVien,
                maBacSiDieuTriChinh, soThuTuToDieuTri, trangThai,
                tienTamUngHienTai, tongChiPhiHienTai
            ) VALUES (
                @maDot, @patientId, @bedDept,
                ISNULL(@admissionTime, @now), @reason, @diagnosis, @icdCode,
                @doctor, 1, 'DANG_DIEU_TRI',
                @advanceNum, 0
            );

            -- 4. Insert PhanGiuong
            INSERT INTO dbo.PhanGiuong (
                maPhanGiuong, maDotDieuTri, maGiuong,
                tuThoiDiem, donGiaApDung, trangThai,
                maNhanVienXep, ghiChu
            ) VALUES (
                @maPG, @maDot, @bedId,
                ISNULL(@admissionTime, @now), @bedRate, 'DANG_SU_DUNG',
                @staffId, @note
            );

            -- 5. Update GiuongBenh
            UPDATE dbo.GiuongBenh
            SET trangThaiHienTai = 'DANG_SU_DUNG'
            WHERE maGiuong = @bedId;

            -- 6. Insert Advance Payment if > 0
            IF @advanceNum > 0
            BEGIN
                INSERT INTO dbo.GiaoDichThanhToan (
                    maGiaoDich, maBenhNhan, maDotDieuTri,
                    loaiGiaoDich, phuongThuc, soTien,
                    thoiDiemGiaoDich, trangThai, maNhanVienXacNhan, ghiChu
                ) VALUES (
                    @maGD, @patientId, @maDot,
                    'TAM_UNG', @pMethod, @advanceNum,
                    @now, 'THANH_CONG', @staffId, N'Tạm ứng viện phí khi nhập viện nội trú'
                );
            END

            COMMIT TRANSACTION;

            SELECT 
                @maDot AS admissionId,
                @maPG AS bedAssignmentId,
                @maGD AS paymentId,
                @bedId AS bedId,
                @patientId AS patientId,
                N'Đã tiếp nhận nội trú và xếp giường thành công.' AS message
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
          END TRY
          BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            THROW;
          END CATCH;
        `;

        const resultJson = await querySql(sql, {
          patientId,
          bedId,
          doctor,
          diagnosis,
          icdCode,
          reason,
          admissionTime: admissionTime ? new Date(admissionTime).toISOString().replace('T', ' ').slice(0, 19) : null,
          advanceNum,
          pMethod,
          staffId,
          note
        });

        const parsed = JSON.parse(resultJson);
        return respond(201, { success: true, ...parsed });
      }

      // 29. Discharge Inpatient & Release Bed (POST /api/inpatient/discharge)
      if (url === '/api/inpatient/discharge' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const {
          admissionId,
          bedId,
          dischargeDiagnosis = 'Viêm phổi điều trị ổn định',
          dischargeIcd = 'J18.1',
          treatmentResult = 'KHOI',
          advice = 'Uống nhiều nước, tái khám sau 7 ngày'
        } = data;

        const sql = `
          SET QUOTED_IDENTIFIER ON;
          SET ANSI_NULLS ON;
          BEGIN TRY
            BEGIN TRANSACTION;
            DECLARE @now DATETIME2 = SYSDATETIME();

            -- 1. Update DotDieuTri
            UPDATE dbo.DotDieuTri
            SET trangThai = 'CHO_XUAT_VIEN',
                thoiDiemRaVien = @now,
                chanDoanRaVien = ISNULL(@dischargeDiagnosis, chanDoanVaoVien),
                maICDRaVien = ISNULL(@dischargeIcd, maICDVaoVien),
                ketQuaDieuTri = @treatmentResult,
                loiDanRaVien = @advice
            WHERE maDotDieuTri = @admissionId;

            -- 2. Update PhanGiuong
            UPDATE dbo.PhanGiuong
            SET denThoiDiem = @now,
                trangThai = 'DA_KET_THUC',
                lyDoKetThuc = N'Bác sĩ duyệt ra viện'
            WHERE maDotDieuTri = @admissionId AND trangThai = 'DANG_SU_DUNG';

            -- 3. Update GiuongBenh to DANG_VE_SINH
            IF @bedId IS NOT NULL
            BEGIN
              UPDATE dbo.GiuongBenh
              SET trangThaiHienTai = 'DANG_VE_SINH'
              WHERE maGiuong = @bedId;
            END
            ELSE
            BEGIN
              UPDATE g
              SET trangThaiHienTai = 'DANG_VE_SINH'
              FROM dbo.GiuongBenh g
              JOIN dbo.PhanGiuong p ON p.maGiuong = g.maGiuong
              WHERE p.maDotDieuTri = @admissionId;
            END

            COMMIT TRANSACTION;

            SELECT 
                @admissionId AS admissionId,
                'DANG_VE_SINH' AS bedStatus,
                N'Đã xác nhận duyệt ra viện và chuyển buồng giường sang trạng thái chờ khử khuẩn.' AS message
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
          END TRY
          BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            THROW;
          END CATCH;
        `;

        const resultJson = await querySql(sql, {
          admissionId,
          bedId: bedId || null,
          dischargeDiagnosis,
          dischargeIcd,
          treatmentResult: ['KHOI', 'DO_GIAM', 'KHONG_THAY_DOI', 'NANG_HON'].includes(treatmentResult) ? treatmentResult : 'KHOI',
          advice
        });

        const parsed = JSON.parse(resultJson);
        return respond(200, { success: true, ...parsed });
      }

      // 30. Confirm Bed Disinfection (POST /api/inpatient/clean)
      if (url === '/api/inpatient/clean' && req.method === 'POST') {
        let body = '';
        for await (const part of req) { body += part; }
        const data = JSON.parse(body);
        const { bedId } = data;
        if (!bedId) return respond(400, { error: 'Thiếu mã buồng giường.' });

        const sql = `
          SET QUOTED_IDENTIFIER ON;
          SET ANSI_NULLS ON;
          UPDATE dbo.GiuongBenh
          SET trangThaiHienTai = 'TRONG'
          WHERE maGiuong = @bedId;

          SELECT @bedId AS bedId, 'TRONG' AS bedStatus, N'Giường đã hoàn tất khử khuẩn và sẵn sàng tiếp nhận.' AS message
          FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
        `;
        const resultJson = await querySql(sql, { bedId });
        return respond(200, { success: true, ...JSON.parse(resultJson) });
      }

      next();
    } catch (err) {
      if (err instanceof SyntaxError) return respond(400,{error:'Dữ liệu JSON không hợp lệ.'});
      if (err.status) return respond(err.status, {error:err.message});
      console.error('API Error:', err.message);
      respond(503, { error: 'Lỗi xử lý yêu cầu CSDL SQL Server.', details: err.message });
    }
  };
}
