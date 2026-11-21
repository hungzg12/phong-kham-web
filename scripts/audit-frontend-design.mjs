import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.MEDICARE_URL || 'http://127.0.0.1:3000';
const qaDir = path.resolve('qa');
if (!fs.existsSync(qaDir)) fs.mkdirSync(qaDir, { recursive: true });

async function audit() {
  console.log('=== BẮT ĐẦU QUÉT VÀ DÒ LỖI THIẾT KẾ FRONTEND (MEDICARE) ===\n');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const issues = [];
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  function addIssue(severity, category, location, description, fixSuggestion) {
    issues.push({ severity, category, location, description, fixSuggestion });
    console.log(`[${severity.toUpperCase()}] [${category}] ${location}: ${description}`);
  }

  // 1. Dò các trang Public Portal
  const publicRoutes = ['trang-chu', 'gioi-thieu', 'chuyen-khoa', 'bac-si', 'dat-lich'];
  console.log('--- 1. Kiểm tra các trang Portal Công cộng ---');
  for (const route of publicRoutes) {
    await page.goto(`${BASE_URL}/#${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    // Kiểm tra overflow ngang
    const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (hasHorizontalScroll) {
      addIssue('Medium', 'Responsive Layout', `/#${route}`, 'Giao diện bị tràn ngang (Horizontal overflow)', 'Kiểm tra thuộc tính width: 100vw hoặc các container vượt quá 100%');
    }

    // Kiểm tra các ảnh vỡ (broken images)
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src);
    });
    if (brokenImages.length > 0) {
      addIssue('Low', 'Assets', `/#${route}`, `Có ${brokenImages.length} ảnh không tải được: ${brokenImages.join(', ')}`, 'Thay bằng icon SVG hoặc ảnh placeholder nội bộ');
    }

    // Chụp ảnh màn hình bằng chứng
    await page.screenshot({ path: `qa/public-${route}.png` });
  }

  // 2. Dò trang Đăng nhập & Xác thực (Management Login)
  console.log('\n--- 2. Kiểm tra Màn hình Đăng nhập (Auth) ---');
  await page.goto(`${BASE_URL}/#management`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'qa/auth-login-desktop.png' });

  // Kiểm tra hardcode port 52796 trong Auth.jsx
  const qaAccountsVisible = await page.locator('.qa-login-accounts').isVisible().catch(() => false);
  if (!qaAccountsVisible) {
    addIssue('High', 'Design / DX', 'Auth (Màn đăng nhập)', 
      'Danh sách tài khoản mẫu QA (QaAccountList) bị ẩn hoàn toàn khi chạy ở port 3000 do hardcode port 52796 trong Auth.jsx',
      'Sửa điều kiện trong Auth.jsx: cho phép hiển thị QA accounts trên localhost/127.0.0.1 bất kể port');
  }

  // Kiểm tra accessibility input
  const inputsWithoutLabels = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
    return inputs.filter(i => !i.getAttribute('aria-label') && !document.querySelector(`label[for="${i.id}"]`) && !i.closest('label')).map(i => i.name || i.type);
  });
  if (inputsWithoutLabels.length > 0) {
    addIssue('Low', 'A11y', 'Auth Form', `Các trường input thiếu label/aria-label: ${inputsWithoutLabels.join(', ')}`, 'Thêm aria-label hoặc bọc trong thẻ label');
  }

  // 3. Thực hiện Đăng nhập vào Không gian Quản lý Bệnh viện
  console.log('\n--- 3. Thực hiện Đăng nhập & Dò Workspace Nội bộ ---');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'Admin@12345678');
  await page.click('button[type="submit"], button:has-text("Đăng nhập")');
  await page.waitForTimeout(1200);

  // Xóa sạch log khởi tạo trước khi vào workspace
  consoleErrors.length = 0;

  // Chờ workspace hiển thị
  const topbarVisible = await page.locator('.topbar').isVisible().catch(() => false);
  if (!topbarVisible) {
    addIssue('Critical', 'Authentication / Flow', 'Login Workspace', 'Không thể đăng nhập vào Workspace quản lý bằng tài khoản admin', 'Kiểm tra backend session hoặc argon2 verification');
    await page.screenshot({ path: 'qa/login-failure.png' });
  } else {
    console.log('  -> Đăng nhập thành công vào Workspace MediCare!');
    await page.screenshot({ path: 'qa/workspace-overview.png' });

    // 4. Quét từng Module nghiệp vụ trong Workspace
    const workspacePages = [
      { id: 'overview', name: 'Tổng quan' },
      { id: 'appointments', name: 'Lịch hẹn' },
      { id: 'patients', name: 'Tiếp đón & bệnh nhân' },
      { id: 'history', name: 'Lịch sử khám & điều trị' },
      { id: 'examination', name: 'Khám bệnh' },
      { id: 'clinical', name: 'Cận lâm sàng & đơn thuốc' },
      { id: 'inpatient', name: 'Buồng giường nội trú' },
      { id: 'care', name: 'Y lệnh & chăm sóc' },
      { id: 'pharmacy', name: 'Dược & vật tư' },
      { id: 'warehouse', name: 'Kho & kiểm kê' },
      { id: 'finance', name: 'Quyết toán & báo cáo' },
      { id: 'archive', name: 'Hồ sơ & ủy quyền' },
      { id: 'devices', name: 'Thiết bị & bảo trì' },
      { id: 'admin', name: 'Quản trị hệ thống' },
      { id: 'portal', name: 'Cổng người bệnh' },
      { id: 'profile', name: 'Thông tin cá nhân' }
    ];

    console.log('\n--- 4. Quét từng phân hệ trong Workspace (Desktop & Mobile) ---');
    for (const p of workspacePages) {
      // Click chuyển tab trong sidebar hoặc gọi điều hướng
      const navItem = page.locator(`nav button[aria-label="${p.name}"]`);
      if (await navItem.isVisible().catch(() => false)) {
        await navItem.click();
      } else {
        // Fallback điều hướng bằng router
        await page.evaluate((pageId) => {
          const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes(pageId));
          if (btn) btn.click();
        }, p.name);
      }
      await page.waitForTimeout(400);

      // A. Dò lỗi Console Errors
      if (consoleErrors.length > 0) {
        addIssue('High', 'Console Error', `Phân hệ ${p.name}`, `Xuất hiện lỗi JS: ${consoleErrors.pop()}`, 'Sửa runtime exception trong code React');
      }

      // B. Dò Layout Overflow Desktop
      const overflowDesktop = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflowDesktop) {
        addIssue('Medium', 'Responsive Layout', `Phân hệ ${p.name} (Desktop)`, 'Bảng hoặc panel tràn màn hình ngang', 'Kiểm tra table-scroll container');
      }

      // C. Dò Text / Font Mojikake
      const mojikakeGlitches = await page.evaluate(() => {
        const text = document.body.innerText;
        const matches = text.match(/(Viá»‡t|VÆ°Æ¡ng|PhÃ¡p|Thá»¥y|Ä |á»|Æ°)/g);
        return matches ? Array.from(new Set(matches)) : [];
      });
      if (mojikakeGlitches.length > 0) {
        addIssue('High', 'Font / Mojikake', `Phân hệ ${p.name}`, `Phát hiện lỗi vỡ phông hiển thị chữ: ${mojikakeGlitches.join(', ')}`, 'Kiểm tra chuỗi hiển thị và đảm bảo UTF-8 decode');
      }

      // D. Dò Hardcoded Demo Text
      const hardcodedDemo = await page.evaluate(() => {
        const text = document.body.innerText;
        const warnings = [];
        if (text.includes('Đây là frontend dùng dữ liệu mẫu')) warnings.push('Vẫn còn thông báo dữ liệu mẫu');
        if (text.includes('chưa kết nối backend')) warnings.push('Thông báo "chưa kết nối backend" gây hiểu nhầm');
        return warnings;
      });
      if (hardcodedDemo.length > 0) {
        addIssue('Medium', 'UX / Wording', `Phân hệ ${p.name}`, `Có thông điệp mâu thuẫn thực tế: ${hardcodedDemo.join('; ')}`, 'Cập nhật lại văn bản trợ giúp phản ánh đúng hệ thống đã kết nối SQL Server');
      }

      // E. Chụp ảnh màn hình Desktop
      await page.screenshot({ path: `qa/screen-${p.id}-desktop.png` });

      // F. Kiểm tra trên Mobile (390x844 iPhone 14)
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      const overflowMobile = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflowMobile) {
        addIssue('High', 'Mobile Responsive', `Phân hệ ${p.name} (Mobile 390px)`, 'Trang bị vỡ layout / tràn ngang trên màn hình điện thoại', 'Thêm overflow-x: auto hoặc ẩn bớt cột phụ trên table mobile');
        await page.screenshot({ path: `qa/screen-${p.id}-mobile-overflow.png` });
      }
      // Trả lại kích thước desktop
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    // 5. Kiểm tra Modals và Dialogs
    console.log('\n--- 5. Kiểm tra Modals và Biểu mẫu Pop-up ---');
    // Nút Tiếp đón bệnh nhân
    const registerBtn = page.locator('button:has-text("Tiếp đón bệnh nhân")');
    if (await registerBtn.isVisible().catch(() => false)) {
      await registerBtn.click();
      await page.waitForTimeout(400);
      const modalVisible = await page.locator('.modal').isVisible();
      if (!modalVisible) {
        addIssue('High', 'Interaction', 'Modal Tiếp đón', 'Bấm nút "Tiếp đón bệnh nhân" nhưng không mở được modal tiếp đón', 'Kiểm tra event handler mở popup');
      } else {
        await page.screenshot({ path: 'qa/modal-register.png' });
        // Kiểm tra nút Đóng
        await page.locator('.modal .close').click();
        await page.waitForTimeout(300);
      }
    }

    // 6. Kiểm tra Admin Panel độc lập (admin.html)
    console.log('\n--- 6. Kiểm tra Admin Portal (admin.html) ---');
    await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'qa/admin-page.png' });
    const adminHeading = await page.locator('h1, h2, .auth-form').isVisible().catch(() => false);
    if (!adminHeading) {
      addIssue('Medium', 'Routing', 'admin.html', 'Trang admin.html không hiển thị form đăng nhập hoặc dashboard quản trị', 'Kiểm tra bundle admin.html');
    }
  }

  await browser.close();

  // Báo cáo tổng hợp
  console.log('\n======================================================');
  console.log(`TỔNG HỢP KẾT QUẢ DÒ LỖI FRONTEND: ${issues.length} VẤN ĐỀ`);
  console.log('======================================================');
  fs.writeFileSync('qa/frontend-audit-report.json', JSON.stringify({ issues, consoleErrors, auditedAt: new Date().toISOString() }, null, 2));

  for (let i = 0; i < issues.length; i++) {
    const item = issues[i];
    console.log(`${i + 1}. [${item.severity}] ${item.location} - ${item.category}`);
    console.log(`   * Mô tả: ${item.description}`);
    console.log(`   * Đề xuất sửa: ${item.fixSuggestion}\n`);
  }
}

audit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
