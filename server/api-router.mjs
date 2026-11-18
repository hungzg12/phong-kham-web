import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
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
    child.stdout.setEncoding('utf8').on('data', chunk => { output += chunk; });
    child.stderr.resume();
    child.on('error', reject);
    child.stdin.on('error', reject);
    child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error(`SQL script ${relativeFile} failed`)));
    child.stdin.end(JSON.stringify(data ?? null).replace(/[^\x00-\x7F]/g, char =>
      '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')));
  });
}

export function createApiMiddleware() {
  return async (req, res, next) => {
    const url = req.url.split('?')[0];
    if (!url.startsWith('/api/')) return next();

    const respond = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    };

    try {
      // 1. Health check
      if (url === '/api/health') {
        return respond(200, { service: 'medicare-his', status: 'ok', database: 'QuanLyBenhVien' });
      }

      // 2. Pharmacy FEFO Batches
      if (url === '/api/pharmacy/batches' && req.method === 'GET') {
        const result = await runSqlScript('scripts/sql-pharmacy-batches.ps1');
        return respond(200, JSON.parse(result));
      }

      // 3. Pharmacy Stats by Manufacturer
      if (url === '/api/pharmacy/stats' && req.method === 'GET') {
        const result = await runSqlScript('scripts/sql-pharmacy-stats.ps1');
        return respond(200, JSON.parse(result));
      }

      // 4. Appointments list & booking
      if (url === '/api/appointments') {
        if (req.method === 'GET') {
          const list = await runSqlScript('scripts/sql-booking-list.ps1');
          return respond(200, JSON.parse(list));
        }
        if (req.method === 'POST') {
          let body = '';
          for await (const part of req) {
            body += part;
            if (body.length > 8000) return respond(413, { error: 'Thông tin quá dài.' });
          }
          const data = JSON.parse(body);
          const name = typeof data.name === 'string' ? data.name.trim() : '';
          const deptCode = departments.get(data.dept);
          const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
            Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

          const failed = [];
          if (!name || name.length > 100) failed.push('name');
          if (!deptCode) failed.push('deptCode (' + data.dept + ')');
          if (!/^[0-9]{10,11}$/.test(data.phone)) failed.push('phone (' + data.phone + ')');
          if (!isDate(data.birth)) failed.push('birth (' + data.birth + ')');
          if (!isDate(data.day)) failed.push('day (' + data.day + ')');
          if (!/^(0[89]|10|1[3-6]):(00|30)$/.test(data.time)) failed.push('time (' + data.time + ')');
          if (!['Nam', 'Nữ', 'Khác'].includes(data.gender)) failed.push('gender (' + data.gender + ')');

          if (failed.length > 0) {
            console.error('Validation failed for:', failed.join(', '));
            return respond(400, { error: 'Vui lòng kiểm tra thông tin lịch hẹn: ' + failed.join(', ') });
          }
          const id = 'LH-' + randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase();
          const saved = await runSqlScript('scripts/sql-booking.ps1', { ...data, id, name, deptCode });
          if (saved === 'duplicate') return respond(409, { error: 'Bạn đã có lịch hẹn vào giờ này.' });
          if (saved !== id) throw new Error('Unexpected SQL result');
          return respond(201, { id });
        }
      }

      next();
    } catch (err) {
      console.error('API Error:', err.message);
      respond(503, { error: 'Lỗi xử lý yêu cầu CSDL SQL Server.', details: err.message });
    }
  };
}
