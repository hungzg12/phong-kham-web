import {currentIdentity,granted} from './session.js';
export const actorRoles={
 admin:{name:'Quản trị viên',person:'Hoàng Anh',username:'admin',initials:'HA',icon:'shield',description:'Quản lý toàn hệ thống, danh mục và người dùng',defaultPage:'overview',pages:['overview','admin'],home:'Tổng quan bệnh viện',color:'#106b60'},
 receptionist:{name:'Tiếp tân',person:'Nguyễn Thu Trang',username:'tieptan',initials:'TT',staffId:'NV-QT01',description:'Đón tiếp, đăng ký khám và sắp xếp lịch hẹn',defaultPage:'appointments',pages:['overview','history','appointments','patients'],home:'Quầy tiếp đón',color:'#377eaa'},
 doctor:{name:'Bác sĩ',person:'Trần Minh Anh',username:'bacsi',initials:'MA',staffId:'NV-BS01',description:'Thăm khám, chỉ định, kê đơn và theo dõi điều trị',defaultPage:'examination',pages:['overview','history','examination','clinical','inpatient','care','archive'],tabs:{clinical:['labs'],care:['rounds'],archive:['archives','corrections']},home:'Bàn làm việc bác sĩ',color:'#467eaa'},
 nurse:{name:'Điều dưỡng',person:'Hoàng Thị Lan',username:'dieuduong',initials:'HL',staffId:'NV-DD01',description:'Theo dõi sinh hiệu, thực hiện y lệnh và phân buồng giường',defaultPage:'inpatient',pages:['overview','history','inpatient','care'],tabs:{care:['rounds']},home:'Bàn chăm sóc điều dưỡng',color:'#9172ae'},
 technician:{name:'Kỹ thuật viên CLS',person:'Đỗ Văn Tuấn',username:'kythuatvien',initials:'VT',staffId:'NV-KTV01',description:'Tiếp nhận mẫu, nhập kết quả và duyệt phát hành kết quả CLS',defaultPage:'clinical',pages:['overview','clinical'],tabs:{clinical:['labs']},home:'Bàn xét nghiệm & CĐHA',color:'#0f766e'},
 pharmacist:{name:'Dược sĩ',person:'Vũ Đức Thắng',username:'duocsi',initials:'DT',staffId:'NV-DS01',description:'Kiểm tra đơn, cấp phát thuốc và quản lý tồn kho',defaultPage:'pharmacy',pages:['overview','pharmacy','warehouse'],home:'Không gian dược sĩ',color:'#b08046'},
 cashier:{name:'Thu ngân',person:'Đặng Thu Thảo',username:'thungan',initials:'TT',staffId:'NV-TC01',description:'Thu viện phí, tạm ứng, hoàn tiền và quyết toán ra viện',defaultPage:'finance',pages:['overview','finance'],home:'Quầy thu ngân',color:'#a3794f'},
 patient:{name:'Bệnh nhân',person:'Lê Thị Thu Hương',username:'benhnhan',initials:'TH',patientId:'BN-240101-001',description:'Xem kết quả, đơn thuốc, lịch hẹn và viện phí cá nhân',defaultPage:'portal',pages:['overview','history','portal'],home:'Sức khỏe của tôi',color:'#418a76'}
};
export const actorIds=Object.keys(actorRoles);
export function allowedTabs(role,page,fallback){return actorRoles[role]?.tabs?.[page]||fallback}
export function canCreate(role,tab){
 const keys={labs:'biz.labs:order',prescriptions:'biz.prescriptions:save',rounds:'biz.care:order',vitals:'biz.care:vitals',warehouses:'biz.pharmacy:warehouse',movements:'biz.pharmacy:movement',counts:'biz.pharmacy:count',settlements:'biz.finance:createSettlement',advances:'biz.finance:saveAdvance',shifts:'biz.finance:openShift'};
 if(currentIdentity()&&(!keys[tab]||!granted(keys[tab])))return false;
 if(role==='admin')return true;
 if(role==='doctor')return ['labs','prescriptions','referrals','rounds','consultations','discharges','archives','corrections'].includes(tab);
 if(role==='technician')return false;
 if(role==='nurse')return tab==='vitals';
 if(role==='pharmacist')return ['warehouses','movements','counts'].includes(tab);
 if(role==='cashier')return ['settlements','advances','shifts'].includes(tab);
 return false;
}
export function canEdit(role,tab){return canCreate(role,tab)}
export function canAction(role,tab,action){
 const key=({labs:{accept:'biz.labs:accept',result:'biz.labs:save',approve:'biz.labs:publish'},prescriptions:{approveRx:'biz.prescriptions:approve',dispense:'biz.prescriptions:dispense'},rounds:{administer:'biz.care:perform'},warehouses:{toggle:'biz.pharmacy:toggle'},movements:{approveMovement:'biz.pharmacy:approveMovement',cancel:'biz.pharmacy:cancelMovement'},counts:{approveCount:'biz.pharmacy:approveCount',cancel:'biz.pharmacy:cancelCount'},advances:{confirmCash:'biz.finance:confirmAdvance',cancel:'biz.finance:cancelAdvance'},settlements:{settle:'biz.finance:settle'},shifts:{closeShift:'biz.finance:closeShift'}})[tab]?.[action];
 if(currentIdentity()&&(!key||!granted(key)))return false;
 if(role==='admin')return true;
 const allowed={
  doctor:{labs:['cancel'],prescriptions:['approveRx'],referrals:['confirm'],rounds:['cancel'],consultations:['confirm'],discharges:['discharge'],archives:['archive'],corrections:[]},
  technician:{labs:['accept','result','approve']},
  nurse:{rounds:['administer'],vitals:[]},
  pharmacist:{prescriptions:['dispense'],warehouses:['toggle'],movements:['approveMovement','reject','cancel'],counts:['approveCount','reject','cancel']},
  cashier:{advances:['confirmCash','cancel'],settlements:['settle'],shifts:['closeShift','cancel']}
 };
 return (allowed[role]?.[tab]||[]).includes(action)||(action==='cancel'&&canCreate(role,tab));
}