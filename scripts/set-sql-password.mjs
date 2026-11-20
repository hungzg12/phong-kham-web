import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './auth-api.mjs';

const username = process.argv[2];
if (!/^[a-z0-9_.-]{1,50}$/i.test(username || '') || !process.env.MEDICARE_SQL_CONNECTION) {
  throw new Error('An existing SQL username and an explicit MEDICARE_SQL_CONNECTION are required.');
}
process.stdin.setEncoding('utf8');
let password = '';
for await (const chunk of process.stdin) password += chunk;
password = password.replace(/\r?\n$/, '');
if (password.length < 12 || password.length > 256) throw new Error('Password must contain 12 to 256 characters.');
const passwordHash = await hashPassword(password);
const script = fileURLToPath(new URL('./sql-auth.ps1', import.meta.url));
const child = spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script], {
  stdio: ['pipe','ignore','ignore'], windowsHide: true
});
const done = once(child, 'close');
child.stdin.end(JSON.stringify({action:'provision',username,passwordHash}));
const [code] = await done;
if (code !== 0) throw new Error('Could not set the SQL account password.');
console.log('Đã cập nhật mật khẩu và thu hồi các phiên đăng nhập cũ.');
