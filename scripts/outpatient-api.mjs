import { fileURLToPath } from 'node:url';

export function registerCheckIn(server, runSqlScript, session) {
  server.middlewares.use('/api/outpatient/check-in', async (req, res) => {
    const send = (status, payload) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(payload));
    };
    if (req.method !== 'POST') return send(405, { error: 'Phương thức không hợp lệ.' });
    try {
      const account = await session(req);
      if (!account) return send(401, { error: 'Vui lòng đăng nhập.' });
      if (account.role !== 'receptionist') return send(403, { error: 'Cần quyền tiếp đón.' });
    } catch {
      return send(503, { error: 'Không kiểm tra được phiên đăng nhập.' });
    }
    let input;
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 4096) return send(413, { error: 'Thông tin quá dài.' });
      }
      input = JSON.parse(body);
    } catch {
      return send(400, { error: 'Dữ liệu không hợp lệ.' });
    }
    const reason = typeof input?.reason === 'string' ? input.reason.trim() : '';
    if (typeof input?.id !== 'string' || !/^LH-[0-9A-F]{16}$/.test(input.id) ||
        !reason || reason.length > 255) {
      return send(400, { error: 'Kiểm tra mã lịch hẹn và lý do khám.' });
    }
    try {
      const script = fileURLToPath(new URL('./sql-check-in.ps1', import.meta.url));
      const result = JSON.parse(await runSqlScript(script, { id: input.id, reason }));
      if (result.conflict) return send(409, { error: 'Lịch hẹn không đủ điều kiện tiếp đón.' });
      return send(200, result);
    } catch {
      return send(503, { error: 'Chưa xác nhận được tiếp đón. Hãy thử lại cùng mã lịch.' });
    }
  });
}

export function registerExam(server, runSqlScript, session) {
  server.middlewares.use('/api/outpatient/exam', async (req, res) => {
    const send = (status, payload) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(payload));
    };
    if (req.method !== 'POST') return send(405, { error: 'Phương thức không hợp lệ.' });
    try {
      const account = await session(req);
      if (!account) return send(401, { error: 'Vui lòng đăng nhập.' });
      if (account.role !== 'doctor') return send(403, { error: 'Cần quyền bác sĩ.' });
      const staff = account.staff;
      let body = '';
      for await (const part of req) {
        body += part;
        if (body.length > 16000) return send(413, { error: 'Thông tin quá dài.' });
      }
      let data;
      try { data = JSON.parse(body); } catch { return send(400, { error: 'Dữ liệu không hợp lệ.' }); }
      const { action, visit, history = '', conclusion = '' } = data || {};
      if (!['list','start','finish'].includes(action) ||
          (action !== 'list' && (typeof visit !== 'string' || !/^LK-[0-9a-f]{16}$/i.test(visit))) ||
          typeof history !== 'string' || history.length > 2000 ||
          typeof conclusion !== 'string' || conclusion.length > 500 ||
          (action === 'finish' && !conclusion.trim())) {
        return send(400, { error: 'Kiểm tra mã lượt và nội dung khám.' });
      }
      const script = fileURLToPath(new URL('./sql-exam.ps1', import.meta.url));
      const result = JSON.parse(await runSqlScript(script, { staff, action, visit, history, conclusion }));
      if (result.conflict) return send(409, { error: 'Lượt ngoài phạm vi hoặc đã đổi trạng thái. Tải lại danh sách.' });
      return send(200, result);
    } catch {
      return send(503, { error: 'SQL Server chưa xác nhận. Tải lại trước khi thao tác tiếp.' });
    }
  });
}
