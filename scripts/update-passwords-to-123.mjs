import { transactAdmin } from '../server/admin-store.mjs';
import { scrypt as scryptCb, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

async function hashPasswordRaw(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${Buffer.from(await scrypt(password, salt, 64)).toString('hex')}`;
}

async function main() {
  console.log('>>> Đang cập nhật mật khẩu 123 cho toàn bộ tài khoản...');
  const hash123 = await hashPasswordRaw('123');

  const result = await transactAdmin((data, emitEvent) => {
    let count = 0;
    for (const acc of data.accounts) {
      acc.passwordHash = hash123;
      acc.authVersion = (acc.authVersion || 0) + 1;
      acc.version = (acc.version || 0) + 1;
      count++;
    }
    // Xóa session cũ để các phiên đăng nhập dùng mật khẩu mới
    data.sessions = [];
    return count;
  });

  console.log(`>>> Thành công! Đã cập nhật mật khẩu "123" cho ${result} tài khoản.`);
}

main().catch(err => {
  console.error('Lỗi khi cập nhật mật khẩu:', err);
  process.exit(1);
});
