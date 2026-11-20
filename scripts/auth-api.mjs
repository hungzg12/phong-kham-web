import { argon2, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const derive = promisify(argon2);
const parameters = { memory: 65536, passes: 3, parallelism: 1, tagLength: 32 };
const prefix = '$argon2id$v=19$m=65536,t=3,p=1$';
const authScript = fileURLToPath(new URL('./sql-auth.ps1', import.meta.url));
const hashToken = token => createHash('sha256').update(token).digest('hex');
const cookieName = 'medicare_session';
const tokenFrom = req => req.headers.cookie?.split(/;\s*/).find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);

export async function hashPassword(password) {
  const nonce = randomBytes(16);
  const tag = await derive('argon2id', { ...parameters, nonce, message: Buffer.from(password) });
  return prefix + nonce.toString('base64').replace(/=+$/, '') + '$' + tag.toString('base64').replace(/=+$/, '');
}

async function verifyPassword(password, stored) {
  const encoded = stored?.startsWith(prefix) && stored.slice(prefix.length).match(/^([A-Za-z0-9+/]{22})\$([A-Za-z0-9+/]{43})$/);
  const nonce = encoded ? Buffer.from(encoded[1], 'base64') : Buffer.alloc(16);
  const tag = await derive('argon2id', { ...parameters, nonce, message: Buffer.from(password) });
  return Boolean(encoded && timingSafeEqual(tag, Buffer.from(encoded[2], 'base64')));
}

export function createAuth(runSqlScript) {
  const query = async data => JSON.parse(await runSqlScript(authScript, data));
  const attempts = new Map();
  let pending = 0;

  async function session(req) {
    const token = tokenFrom(req);
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    return query({ action: 'session', tokenHash: hashToken(token) });
  }

  async function middleware(req, res) {
    const send = (status, data, cookie) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
        ...(cookie ? { 'Set-Cookie': cookie } : {}) });
      res.end(JSON.stringify(data));
    };
    const cookie = (token, age) => cookieName + '=' + token + '; Path=/api; HttpOnly; SameSite=Strict; Max-Age=' + age +
      (req.socket.encrypted ? '; Secure' : '');
    const path = new URL(req.url, 'http://localhost').pathname;
    try {
      if (path === '/session' && req.method === 'GET') {
        const account = await session(req);
        return account ? send(200, account) : send(401, { error: 'Vui lòng đăng nhập.' });
      }
      if (req.method !== 'POST') return send(405, { error: 'Phương thức không hợp lệ.' });
      if ((req.headers.origin && req.headers.origin !== (req.socket.encrypted ? 'https://' : 'http://') + req.headers.host) ||
          req.headers['sec-fetch-site'] === 'cross-site' || !req.headers['content-type']?.startsWith('application/json')) {
        return send(403, { error: 'Yêu cầu không hợp lệ.' });
      }
      if (path === '/logout') {
        const token = tokenFrom(req);
        if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) await query({ action: 'logout', tokenHash: hashToken(token) });
        return send(200, { ok: true }, cookie('', 0));
      }
      if (path !== '/login') return send(404, { error: 'Không tìm thấy chức năng.' });
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 4096) return send(413, { error: 'Thông tin quá dài.' });
      }
      let data;
      try { data = JSON.parse(body); } catch { return send(400, { error: 'Dữ liệu không hợp lệ.' }); }
      const username = typeof data?.username === 'string' ? data.username.trim() : '';
      const password = data?.password;
      if (!/^[a-z0-9_.-]{1,50}$/i.test(username) || typeof password !== 'string' || !password || password.length > 256) {
        return send(400, { error: 'Kiểm tra tên đăng nhập và mật khẩu.' });
      }
      const now = Date.now();
      for (const [key, attempt] of attempts) if (attempt.until <= now) attempts.delete(key);
      const key = req.socket.remoteAddress;
      const attempt = attempts.get(key) || { count: 0, until: now + 60_000 };
      if (attempt.count >= 12 || pending >= 4) return send(429, { error: 'Vui lòng thử lại sau ít phút.' });
      attempt.count++;
      attempts.set(key, attempt);
      pending++;
      try {
        const account = await query({ action: 'lookup', username });
        if (!await verifyPassword(password, account?.passwordHash) || !account) {
          return send(401, { error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }
        const token = randomBytes(32).toString('base64url');
        const saved = await query({ action: 'login', username, passwordHash: account.passwordHash, tokenHash: hashToken(token) });
        if (!saved) return send(401, { error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        return send(200, saved, cookie(token, 8 * 3600));
      } finally { pending--; }
    } catch {
      return send(503, { error: 'Không thể kết nối dịch vụ xác thực.' });
    }
  }
  return { middleware, session };
}
