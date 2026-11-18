import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const departments = new Map([
  ['Nội tổng quát', 'NOI'], ['Tim mạch', 'TIM'], ['Tai Mũi Họng', 'TMH'],
  ['Da liễu', 'DA'], ['Sản phụ khoa', 'SAN'], ['Cơ xương khớp', 'CXK'],
]);
const script = fileURLToPath(new URL('./scripts/sql-booking.ps1', import.meta.url));

function runSqlScript(file, data) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', file], {
      windowsHide: true, timeout: 15000,
    });
    let output = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { output += chunk; });
    child.stderr.resume();
    child.on('error', reject);
    child.stdin.on('error', reject);
    child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error('SQL booking failed')));
    child.stdin.end(JSON.stringify(data ?? null).replace(/[^\x00-\x7F]/g, char =>
      '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')));
  });
}

export default defineConfig({
  plugins: [{
    name: 'local-sql-booking',
    configureServer(server) {
      server.middlewares.use('/api/appointments', async (req, res) => {
        const respond = (status, data) => {
          res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(data));
        };
        if (req.method === 'GET') {
          try {
            const listScript = fileURLToPath(new URL('./scripts/sql-booking-list.ps1', import.meta.url));
            return respond(200, JSON.parse(await runSqlScript(listScript)));
          } catch {
            return respond(503, { error: 'Không đọc được lịch hẹn từ SQL Server.' });
          }
        }
        if (req.method !== 'POST' || !req.headers['content-type']?.startsWith('application/json')) {
          return respond(405, { error: 'Yêu cầu không hợp lệ.' });
        }
        try {
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
          if (!name || name.length > 100 || !deptCode || !/^[0-9]{10,11}$/.test(data.phone) ||
              !isDate(data.birth) || !isDate(data.day) || !/^(0[89]|10|1[3-6]):(00|30)$/.test(data.time) ||
              !['Nam', 'Nữ', 'Khác'].includes(data.gender)) {
            return respond(400, { error: 'Vui lòng kiểm tra thông tin lịch hẹn.' });
          }
          const id = 'LH-' + randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase();
          const saved = await runSqlScript(script, { ...data, id, name, deptCode });
          if (saved === 'duplicate') return respond(409, { error: 'Bạn đã có lịch hẹn vào giờ này.' });
          if (saved !== id) throw new Error('Unexpected SQL result');
          respond(201, { id });
        } catch {
          respond(503, { error: 'Không lưu được lịch hẹn vào SQL Server.' });
        }
      });
    },
  }],
});
