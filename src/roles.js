/**
 * ====================================================================================
 * PHÂN HỆ: QUẢN TRỊ BẢO MẬT & PHÂN QUYỀN TRUY CẬP (RBAC - ROLE BASED ACCESS CONTROL)
 * TỆP: src/roles.js
 * CHỨC NĂNG:
 *   - Định nghĩa 8 vai trò người dùng trong toàn bộ bệnh viện MediCare HIS.
 *   - Khai báo trang mặc định (defaultPage), danh sách màn hình được phép mở (pages).
 *   - Hàm kiểm tra quyền tạo mới (canCreate), quyền chỉnh sửa (canEdit), quyền thực thi nghiệp vụ (canAction).
 *
 * 8 VAI TRÒ HỆ THỐNG:
 *   1. admin (Quản trị viên)      : Toàn quyền cấu hình danh mục, tài khoản, hệ thống.
 *   2. receptionist (Tiếp đón)     : Đón tiếp, đăng ký lượt khám, cấp STT, thu tiền khám.
 *   3. doctor (Bác sĩ)             : Khám bệnh ngoại trú, chẩn đoán ICD-10, chỉ định CLS, kê đơn thuốc, y lệnh.
 *   4. nurse (Điều dưỡng)          : Đo sinh hiệu, sơ đồ buồng giường, thực hiện y lệnh tại giường.
 *   5. technician (Kỹ thuật viên)  : Tiếp nhận mẫu xét nghiệm/CĐHA, nhập kết quả, duyệt kết quả.
 *   6. pharmacist (Dược sĩ)        : Duyệt đơn, xuất kho thuốc theo FEFO, nhập xuất kho, kiểm kê.
 *   7. cashier (Thu ngân)          : Quản lý ca trực, thu tiền tạm ứng, quyết toán viện phí BHYT.
 *   8. patient (Bệnh nhân)         : Xem hồ sơ bệnh án cá nhân, kết quả CLS, đơn thuốc, lịch hẹn.
 *
 * HƯỚNG DẪN SỬA NHANH KHI CÔ GIÁO HỎI:
 *   - Muốn thêm màn hình cho một vai trò: Thêm key trang vào mảng `pages` của vai trò đó (dòng 25-50).
 *   - Muốn cho phép vai trò tạo phiếu mới: Sửa trong hàm `canCreate()` (dòng 58-70).
 *   - Muốn cho phép vai trò bấm nút duyệt/thao tác đặc biệt: Sửa trong hàm `canAction()` (dòng 75-100).
 * ====================================================================================
 */

import { currentIdentity, granted } from './session.js';

/**
 * Danh sách 8 vai trò chi tiết của bệnh viện
 */
export const actorRoles = {
  // 1. Quản trị viên
  admin: {
    name: 'Quản trị viên',
    person: 'Hoàng Anh',
    username: 'admin',
    initials: 'HA',
    icon: 'shield',
    description: 'Quản lý toàn hệ thống, danh mục và người dùng',
    defaultPage: 'overview',
    pages: ['overview', 'admin'],
    home: 'Tổng quan bệnh viện',
    color: '#106b60'
  },

  // 2. Tiếp tân / Nhân viên tiếp đón
  receptionist: {
    name: 'Tiếp tân',
    person: 'Nguyễn Thu Trang',
    username: 'tieptan',
    initials: 'TT',
    staffId: 'NV-QT01',
    description: 'Đón tiếp, đăng ký khám và sắp xếp lịch hẹn',
    defaultPage: 'appointments',
    pages: ['overview', 'history', 'appointments', 'patients'],
    home: 'Quầy tiếp đón',
    color: '#377eaa'
  },

  // 3. Bác sĩ khám bệnh & điều trị
  doctor: {
    name: 'Bác sĩ',
    person: 'Trần Minh Anh',
    username: 'bacsi',
    initials: 'MA',
    staffId: 'NV-BS01',
    description: 'Thăm khám, chỉ định, kê đơn và theo dõi điều trị',
    defaultPage: 'examination',
    pages: ['overview', 'history', 'examination', 'clinical', 'inpatient', 'care', 'archive'],
    tabs: {
      clinical: ['labs'],
      care: ['rounds'],
      archive: ['archives', 'corrections']
    },
    home: 'Bàn làm việc bác sĩ',
    color: '#467eaa'
  },

  // 4. Điều dưỡng chăm sóc nội trú
  nurse: {
    name: 'Điều dưỡng',
    person: 'Hoàng Thị Lan',
    username: 'dieuduong',
    initials: 'HL',
    staffId: 'NV-DD01',
    description: 'Theo dõi sinh hiệu, thực hiện y lệnh và phân buồng giường',
    defaultPage: 'overview',
    pages: ['overview', 'history', 'inpatient', 'care'],
    tabs: {
      care: ['vitals', 'rounds']
    },
    home: 'Bàn chăm sóc điều dưỡng',
    color: '#9172ae'
  },

  // 5. Kỹ thuật viên Cận lâm sàng / Xét nghiệm
  technician: {
    name: 'Kỹ thuật viên CLS',
    person: 'Đỗ Văn Tuấn',
    username: 'kythuatvien',
    initials: 'VT',
    staffId: 'NV-KTV01',
    description: 'Tiếp nhận mẫu, nhập kết quả và duyệt phát hành kết quả CLS',
    defaultPage: 'clinical',
    pages: ['overview', 'clinical'],
    tabs: {
      clinical: ['labs']
    },
    home: 'Bàn xét nghiệm & CĐHA',
    color: '#0f766e'
  },

  // 6. Dược sĩ phụ trách kho dược
  pharmacist: {
    name: 'Dược sĩ',
    person: 'Vũ Đức Thắng',
    username: 'duocsi',
    initials: 'DT',
    staffId: 'NV-DS01',
    description: 'Kiểm tra đơn, cấp phát thuốc và quản lý tồn kho theo FEFO',
    defaultPage: 'pharmacy',
    pages: ['overview', 'pharmacy', 'warehouse'],
    home: 'Không gian dược sĩ',
    color: '#b08046'
  },

  // 7. Thu ngân viện phí
  cashier: {
    name: 'Thu ngân',
    person: 'Đặng Thu Thảo',
    username: 'thungan',
    initials: 'TT',
    staffId: 'NV-TC01',
    description: 'Thu viện phí, tạm ứng, hoàn tiền và quyết toán ra viện',
    defaultPage: 'finance',
    pages: ['overview', 'finance'],
    home: 'Quầy thu ngân',
    color: '#a3794f'
  },

  // 8. Bệnh nhân (Cổng thông tin)
  patient: {
    name: 'Bệnh nhân',
    person: 'Lê Thị Thu Hương',
    username: 'benhnhan',
    initials: 'TH',
    patientId: 'BN-240101-001',
    description: 'Xem kết quả, đơn thuốc, lịch hẹn và viện phí cá nhân',
    defaultPage: 'portal',
    pages: ['overview', 'history', 'portal'],
    home: 'Sức khỏe của tôi',
    color: '#418a76'
  }
};

export const actorIds = Object.keys(actorRoles);

/**
 * Lấy danh sách tab con được phép xem theo vai trò và màn hình
 */
export function allowedTabs(role, page, fallback) {
  return actorRoles[role]?.tabs?.[page] || fallback;
}

/**
 * Kiểm tra xem vai trò hiện tại có được phép TẠO MỚI bản ghi trong tab này không
 */
export function canCreate(role, tab) {
  const keys = {
    labs: 'biz.labs:order',
    prescriptions: 'biz.prescriptions:save',
    rounds: 'biz.care:order',
    vitals: 'biz.care:vitals',
    warehouses: 'biz.pharmacy:warehouse',
    movements: 'biz.pharmacy:movement',
    counts: 'biz.pharmacy:count',
    settlements: 'biz.finance:createSettlement',
    advances: 'biz.finance:saveAdvance',
    shifts: 'biz.finance:openShift'
  };

  // Kiểm tra permission matrix của session người dùng
  if (currentIdentity() && (!keys[tab] || !granted(keys[tab]))) return false;

  // Quyền theo vai trò
  if (role === 'admin') return true;
  if (role === 'doctor') return ['labs', 'prescriptions', 'referrals', 'rounds', 'consultations', 'discharges', 'archives', 'corrections'].includes(tab);
  if (role === 'technician') return false;
  if (role === 'nurse') return tab === 'vitals';
  if (role === 'pharmacist') return ['warehouses', 'movements', 'counts'].includes(tab);
  if (role === 'cashier') return ['settlements', 'advances', 'shifts'].includes(tab);
  return false;
}

/**
 * Kiểm tra quyền chỉnh sửa bản ghi (tương đương quyền tạo)
 */
export function canEdit(role, tab) {
  return canCreate(role, tab);
}

/**
 * Kiểm tra xem vai trò hiện tại có được thực hiện ACTION cụ thể trên tab hay không
 * Ví dụ:
 *  - Dược sĩ: dispense (Cấp phát thuốc)
 *  - Kỹ thuật viên: accept (Tiếp nhận), result (Nhập kết quả), approve (Duyệt kết quả)
 *  - Điều dưỡng: administer (Thực hiện y lệnh)
 *  - Thu ngân: settle (Chốt quyết toán), confirmCash (Xác nhận thu tiền)
 */
export function canAction(role, tab, action) {
  const key = ({
    labs: { accept: 'biz.labs:accept', result: 'biz.labs:save', approve: 'biz.labs:publish' },
    prescriptions: { approveRx: 'biz.prescriptions:approve', dispense: 'biz.prescriptions:dispense' },
    rounds: { administer: 'biz.care:perform' },
    warehouses: { toggle: 'biz.pharmacy:toggle' },
    movements: { approveMovement: 'biz.pharmacy:approveMovement', cancel: 'biz.pharmacy:cancelMovement' },
    counts: { approveCount: 'biz.pharmacy:approveCount', cancel: 'biz.pharmacy:cancelCount' },
    advances: { confirmCash: 'biz.finance:confirmAdvance', cancel: 'biz.finance:cancelAdvance' },
    settlements: { settle: 'biz.finance:settle' },
    shifts: { closeShift: 'biz.finance:closeShift' }
  })[tab]?.[action];

  if (currentIdentity() && (!key || !granted(key))) return false;
  if (role === 'admin') return true;

  const allowed = {
    doctor: {
      labs: ['cancel'],
      prescriptions: ['approveRx'],
      referrals: ['confirm'],
      rounds: ['cancel'],
      consultations: ['confirm'],
      discharges: ['discharge'],
      archives: ['archive'],
      corrections: []
    },
    technician: {
      labs: ['accept', 'result', 'approve']
    },
    nurse: {
      rounds: ['administer'],
      vitals: []
    },
    pharmacist: {
      prescriptions: ['dispense'],
      warehouses: ['toggle'],
      movements: ['approveMovement', 'reject', 'cancel'],
      counts: ['approveCount', 'reject', 'cancel']
    },
    cashier: {
      advances: ['confirmCash', 'cancel'],
      settlements: ['settle'],
      shifts: ['closeShift', 'cancel']
    }
  };

  return (allowed[role]?.[tab] || []).includes(action) || (action === 'cancel' && canCreate(role, tab));
}
