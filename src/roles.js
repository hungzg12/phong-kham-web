export const actorRoles={
 admin:{name:'Quản trị viên',person:'Hoàng Anh',username:'admin',initials:'HA',icon:'shield',description:'Quản lý toàn hệ thống, danh mục và người dùng',pages:['overview','history','appointments','patients','examination','clinical','inpatient','care','pharmacy','warehouse','finance','archive','devices','admin','portal'],home:'Tổng quan bệnh viện',color:'#106b60'},
 receptionist:{name:'Tiếp tân',person:'Nguyễn Thu Trang',username:'tieptan',initials:'TT',description:'Đón tiếp, đăng ký khám và sắp xếp lịch hẹn',pages:['overview','history','appointments','patients'],home:'Quầy tiếp đón',color:'#377eaa'},
 doctor:{name:'Bác sĩ',person:'Trần Minh Anh',username:'bacsi',initials:'MA',staffId:'NV001',description:'Thăm khám, chỉ định, kê đơn và theo dõi điều trị',pages:['overview','history','examination','clinical','inpatient','care','archive'],tabs:{clinical:['vitals','labs','prescriptions','referrals'],care:['rounds','consultations','discharges'],archive:['archives','corrections']},home:'Bàn làm việc bác sĩ',color:'#467eaa'},
 nurse:{name:'Điều dưỡng',person:'Phạm Thu Hà',username:'dieuduong',initials:'TH',staffId:'NV002',description:'Theo dõi sinh hiệu, thực hiện y lệnh và phân buồng giường',pages:['overview','history','inpatient','clinical','care'],tabs:{clinical:['vitals'],care:['rounds']},home:'Bàn chăm sóc điều dưỡng',color:'#9172ae'},
 technician:{name:'Kỹ thuật viên CLS',person:'Đỗ Văn Tuấn',username:'kythuatvien',initials:'VT',staffId:'NV005',description:'Tiếp nhận mẫu, nhập kết quả và duyệt phát hành kết quả CLS',pages:['overview','clinical'],tabs:{clinical:['labs']},home:'Bàn xét nghiệm & CĐHA',color:'#0f766e'},
 pharmacist:{name:'Dược sĩ',person:'Lê Quốc Huy',username:'duocsi',initials:'QH',staffId:'NV003',description:'Kiểm tra đơn, cấp phát thuốc và quản lý tồn kho',pages:['overview','clinical','pharmacy','warehouse'],tabs:{clinical:['prescriptions']},home:'Không gian dược sĩ',color:'#b08046'},
 cashier:{name:'Thu ngân',person:'Nguyễn Hoàng Anh',username:'thungan',initials:'HA',staffId:'NV004',description:'Thu viện phí, tạm ứng, hoàn tiền và quyết toán ra viện',pages:['overview','finance'],home:'Quầy thu ngân',color:'#a3794f'},
 patient:{name:'Bệnh nhân',person:'Nguyễn Thị Mai',username:'benhnhan',initials:'TM',patientId:'BN0001',description:'Xem kết quả, đơn thuốc, lịch hẹn và viện phí cá nhân',pages:['overview','history','portal'],home:'Sức khỏe của tôi',color:'#418a76'}
};
export const actorIds=Object.keys(actorRoles);
export function allowedTabs(role,page,fallback){return actorRoles[role]?.tabs?.[page]||fallback}
export function canCreate(role,tab){
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