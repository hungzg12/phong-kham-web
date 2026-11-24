import { transactAdmin, querySql } from '../server/admin-store.mjs';
import { hashPassword } from '../server/admin-domain.mjs';
import { adminPermissions, permissions } from '../src/admin-schema.js';
import { businessPermissions } from '../src/business-permissions.js';

async function main() {
  console.log('>>> Bắt đầu chuẩn hóa & làm gọn Danh mục Nhân viên, Tài khoản và Vai trò & Quyền...');

  // 1. Chuẩn hóa phân quyền cho 8 vai trò bệnh viện
  const roleCatalog = [
    {
      id: 'admin',
      name: 'Quản trị viên',
      workspaceRole: 'none',
      description: 'Toàn quyền cấu hình hệ thống, quản lý người dùng, sao lưu và kiểm soát an toàn vận hành bệnh viện',
      permissions: [
        ...adminPermissions,
        'backups:view', 'backups:create', 'backups:restore',
        ...businessPermissions
      ],
      active: true
    },
    {
      id: 'receptionist',
      name: 'Tiếp tân',
      workspaceRole: 'receptionist',
      description: 'Đón tiếp, tiếp nhận bệnh nhân BHYT/Viện phí, đặt lịch hẹn, phân buồng khám và cấp phát số thứ tự',
      permissions: [
        'biz.appointments:view',
        'biz.appointments:create',
        'biz.appointments:edit',
        'biz.appointments:cancel',
        'biz.appointments:checkin',
        'biz.reception:view',
        'biz.reception:receive',
        'biz.reception:edit',
        'biz.reception:transfer',
        'biz.reception:cancel',
        'biz.notifications:view',
        'biz.notifications:read',
        'biz.notifications:reminder',
        'departments:view',
        'rooms:view',
        'staff:view',
        'services:view'
      ],
      active: true
    },
    {
      id: 'doctor',
      name: 'Bác sĩ',
      workspaceRole: 'doctor',
      description: 'Thăm khám lâm sàng, kê đơn thuốc ngoại trú, chỉ định cận lâm sàng, điều trị nội trú, hội chẩn và chuyển viện',
      permissions: [
        'biz.exam:view',
        'biz.exam:save',
        'biz.labs:view',
        'biz.labs:order',
        'biz.prescriptions:view',
        'biz.prescriptions:save',
        'biz.prescriptions:approve',
        'biz.care:view',
        'biz.care:sheet',
        'biz.care:reopen',
        'biz.care:order',
        'biz.inpatient:view',
        'biz.inpatient:admit',
        'biz.inpatient:discharge',
        'biz.appointments:view',
        'biz.reception:view',
        'biz.notifications:view',
        'biz.notifications:read',
        'departments:view',
        'rooms:view',
        'staff:view',
        'services:view'
      ],
      active: true
    },
    {
      id: 'nurse',
      name: 'Điều dưỡng',
      workspaceRole: 'nurse',
      description: 'Theo dõi chỉ số sinh hiệu, thực hiện y lệnh thuốc theo 5 đúng, quản lý buồng bệnh, xếp giường và vệ sinh',
      permissions: [
        'biz.inpatient:view',
        'biz.inpatient:assign',
        'biz.inpatient:clean',
        'biz.care:view',
        'biz.care:vitals',
        'biz.care:perform',
        'biz.prescriptions:view',
        'biz.labs:view',
        'biz.notifications:view',
        'biz.notifications:read',
        'departments:view',
        'rooms:view',
        'wards:view',
        'beds:view',
        'staff:view'
      ],
      active: true
    },
    {
      id: 'technician',
      name: 'Kỹ thuật viên CLS',
      workspaceRole: 'technician',
      description: 'Tiếp nhận mẫu bệnh phẩm/chụp chiếu, thực hiện xét nghiệm, nhập kết quả và phê duyệt phát hành kết quả LIS/PACS',
      permissions: [
        'biz.labs:view',
        'biz.labs:accept',
        'biz.labs:save',
        'biz.labs:publish',
        'biz.equipment:view',
        'biz.equipment:reportIncident',
        'biz.notifications:view',
        'biz.notifications:read',
        'departments:view',
        'rooms:view',
        'services:view',
        'staff:view'
      ],
      active: true
    },
    {
      id: 'pharmacist',
      name: 'Dược sĩ',
      workspaceRole: 'pharmacist',
      description: 'Duyệt đơn thuốc ngoại trú, xuất kho cấp phát theo FEFO, quản lý danh mục thuốc, nhập kho, điều chuyển và kiểm kê kho',
      permissions: [
        'biz.prescriptions:view',
        'biz.prescriptions:dispense',
        'biz.pharmacy:view',
        'biz.pharmacy:warehouse',
        'biz.pharmacy:toggle',
        'biz.pharmacy:product',
        'biz.pharmacy:shipment',
        'biz.pharmacy:movement',
        'biz.pharmacy:approveMovement',
        'biz.pharmacy:cancelMovement',
        'biz.pharmacy:count',
        'biz.pharmacy:approveCount',
        'biz.pharmacy:cancelCount',
        'biz.notifications:view',
        'biz.notifications:read',
        'departments:view',
        'staff:view'
      ],
      active: true
    },
    {
      id: 'cashier',
      name: 'Thu ngân',
      workspaceRole: 'cashier',
      description: 'Mở/đóng ca thu ngân, thu tiền tạm ứng, lập và quyết toán bảng kê chi phí KCB Mẫu 01/BV theo QĐ 130/QĐ-BYT',
      permissions: [
        'biz.finance:view',
        'biz.finance:openShift',
        'biz.finance:closeShift',
        'biz.finance:saveAdvance',
        'biz.finance:confirmAdvance',
        'biz.finance:cancelAdvance',
        'biz.finance:createSettlement',
        'biz.finance:settle',
        'biz.reception:view',
        'biz.notifications:view',
        'biz.notifications:read',
        'departments:view',
        'services:view',
        'staff:view'
      ],
      active: true
    },
    {
      id: 'patient',
      name: 'Bệnh nhân',
      workspaceRole: 'patient',
      description: 'Cổng thông tin người bệnh tra cứu lịch sử khám, theo dõi kết quả CLS, xem đơn thuốc điện tử và đặt lịch hẹn khám',
      permissions: [
        'biz.portal:view',
        'biz.portal:create',
        'biz.portal:cancel',
        'biz.notifications:view',
        'biz.notifications:read'
      ],
      active: true
    }
  ];

  // 2. Danh mục tài khoản chuẩn (không trùng lặp)
  const canonicalAccounts = [
    { username: 'admin', name: 'Quản trị viên', email: 'admin@medicare.vn', roleId: 'admin', staffId: '', password: 'Admin@12345678' },
    { username: 'tieptan', name: 'Nguyễn Thu Trang', email: 'trang.nt@medicare.vn', roleId: 'receptionist', staffId: 'NV-QT01', password: 'Tieptan@12345678' },
    { username: 'bacsi', name: 'BS.CKI Trần Minh Anh', email: 'anh.tm@medicare.vn', roleId: 'doctor', staffId: 'NV-BS01', password: 'Doctor@12345678' },
    { username: 'dieuduong', name: 'ĐD. Hoàng Thị Lan', email: 'lan.ht@medicare.vn', roleId: 'nurse', staffId: 'NV-DD01', password: 'Nurse@12345678' },
    { username: 'kythuatvien', name: 'KTV. Đỗ Văn Tuấn', email: 'tuan.dv@medicare.vn', roleId: 'technician', staffId: 'NV-KTV01', password: 'Tech@12345678' },
    { username: 'duocsi', name: 'DS. Vũ Đức Thắng', email: 'thang.vd@medicare.vn', roleId: 'pharmacist', staffId: 'NV-DS01', password: 'Pharmacist@12345678' },
    { username: 'thungan', name: 'CN. Đặng Thu Thảo', email: 'thao.dt@medicare.vn', roleId: 'cashier', staffId: 'NV-TC01', password: 'Cashier@12345678' },
    { username: 'benhnhan', name: 'Lê Thị Thu Hương', email: 'huong.lt@gmail.com', roleId: 'patient', staffId: '', patientId: 'BN-240101-001', password: 'Patient@12345678' },
    // Bác sĩ chuyên khoa phụ trách các phòng khám
    { username: 'bacsi_an', name: 'ThS.BS Nguyễn Văn An', email: 'an.nv@medicare.vn', roleId: 'doctor', staffId: 'NV-BS02', password: 'Doctor@12345678' },
    { username: 'bacsi_mai', name: 'BS.CKII Lê Thị Mai', email: 'mai.lt@medicare.vn', roleId: 'doctor', staffId: 'NV-BS03', password: 'Doctor@12345678' },
    { username: 'bacsi_long', name: 'BS Đỗ Hoàng Long', email: 'long.dh@medicare.vn', roleId: 'doctor', staffId: 'NV-BS04', password: 'Doctor@12345678' },
    { username: 'bacsi_hoa', name: 'BS.CKI Phạm Quỳnh Hoa', email: 'hoa.pq@medicare.vn', roleId: 'doctor', staffId: 'NV-BS05', password: 'Doctor@12345678' },
    { username: 'bacsi_tuan', name: 'ThS.BS Đặng Quốc Tuấn', email: 'tuan.dq@medicare.vn', roleId: 'doctor', staffId: 'NV-BS06', password: 'Doctor@12345678' }
  ];

  // Hash mật khẩu cho các tài khoản
  const hashedAccounts = await Promise.all(
    canonicalAccounts.map(async acc => ({
      ...acc,
      passwordHash: await hashPassword(acc.password),
      active: true,
      authVersion: 1,
      version: 1
    }))
  );

  // 3. Cập nhật MediCareAdminState
  await transactAdmin((data, emitEvent, emitEffect) => {
    // Cập nhật roles
    data.roles = roleCatalog.map(r => {
      const existing = data.roles.find(old => old.id === r.id);
      return {
        id: r.id,
        name: r.name,
        workspaceRole: r.workspaceRole,
        description: r.description,
        permissions: r.permissions,
        active: true,
        version: (existing?.version || 0) + 1
      };
    });

    // Cập nhật accounts: giữ tài khoản chuẩn, xóa tài khoản thừa/duplicate
    const newAccounts = [];
    for (const ca of hashedAccounts) {
      const existing = data.accounts.find(a => a.username === ca.username);
      const id = existing?.id || crypto.randomUUID();
      newAccounts.push({
        id,
        username: ca.username,
        name: ca.name,
        email: ca.email,
        roleId: ca.roleId,
        staffId: ca.staffId || '',
        patientId: ca.patientId || '',
        passwordHash: ca.passwordHash,
        active: true,
        authVersion: (existing?.authVersion || 0) + 1,
        version: (existing?.version || 0) + 1
      });
    }

    data.accounts = newAccounts;
    // Xóa các phiên cũ để người dùng đăng nhập lại an toàn
    data.sessions = [];
    console.log(`Đã cập nhật MediCareAdminState: ${data.roles.length} vai trò, ${data.accounts.length} tài khoản.`);
  });

  // 4. Đồng bộ danh mục SQL Server dbo.NhanVien, dbo.TaiKhoan và dbo.TaiKhoanVaiTro
  console.log('>>> Đồng bộ SQL Server dbo.NhanVien & dbo.TaiKhoan...');
  
  // Tạo NV-ADMIN nếu chưa có để đảm bảo tài khoản admin có nhân viên tương ứng
  await querySql(`
    IF NOT EXISTS (SELECT 1 FROM dbo.NhanVien WHERE maNhanVien = 'NV-ADMIN')
    BEGIN
      INSERT INTO dbo.NhanVien (maNhanVien, hoTen, chucDanh, chuyenMon, maKhoa, dangLamViec)
      VALUES ('NV-ADMIN', N'Nguyễn Hoàng Anh', N'Quản trị viên hệ thống', 'QUAN_TRI', 'NOI', 1)
    END
    UPDATE dbo.TaiKhoan SET maNhanVien = 'NV-ADMIN' WHERE tenDangNhap = 'admin';
    UPDATE dbo.TaiKhoan SET maNhanVien = 'NV-QT01' WHERE tenDangNhap = 'tieptan';
  `);

  for (const acc of canonicalAccounts) {
    if (acc.staffId) {
      await querySql(`
        IF NOT EXISTS (SELECT 1 FROM dbo.TaiKhoan WHERE tenDangNhap = @username)
        BEGIN
          INSERT INTO dbo.TaiKhoan (maTaiKhoan, tenDangNhap, matKhauHash, loaiChuThe, maNhanVien, trangThai)
          VALUES (@id, @username, @hash, 'NHAN_VIEN', @staffId, 'HOAT_DONG')
        END
        ELSE
        BEGIN
          UPDATE dbo.TaiKhoan
          SET maNhanVien = @staffId, trangThai = 'HOAT_DONG'
          WHERE tenDangNhap = @username
        END
      `, {
        id: `TK-${acc.username.toUpperCase()}`,
        username: acc.username,
        hash: 'SHA256_HASH_CONSOLIDATED',
        staffId: acc.staffId
      });
    }
  }

  // Xóa tài khoản trùng lặp thừa thãi trong dbo.TaiKhoan nếu có
  await querySql(`
    DELETE FROM dbo.TaiKhoanVaiTro WHERE maTaiKhoan IN (
      SELECT maTaiKhoan FROM dbo.TaiKhoan WHERE tenDangNhap IN (
        'receptionist', 'doctor_noitongquat', 'nurse_noitongquat',
        'technician_cls', 'pharmacist_main', 'cashier_main', 'patient_portal'
      )
    );
    DELETE FROM dbo.TaiKhoan WHERE tenDangNhap IN (
      'receptionist', 'doctor_noitongquat', 'nurse_noitongquat',
      'technician_cls', 'pharmacist_main', 'cashier_main', 'patient_portal'
    );
  `);

  console.log('>>> Hoàn thành chuẩn hóa & làm gọn 100%!');
  process.exit(0);
}

main().catch(e => {
  console.error('Lỗi khi chuẩn hóa:', e);
  process.exit(1);
});
