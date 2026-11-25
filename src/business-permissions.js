// Shared permission catalog. A role identifies specialty; only saved grants authorize work.
export const businessGroups = {
  "appointments": [
    "Lịch hẹn",
    {
      "view": "Xem",
      "create": "Đặt lịch",
      "edit": "Đổi lịch",
      "cancel": "Hủy lịch",
      "checkin": "Check-in"
    }
  ],
  "reception": [
    "Tiếp đón & hồ sơ",
    {
      "view": "Xem người bệnh và lượt khám",
      "receive": "Tiếp đón / tạo lượt",
      "edit": "Sửa người bệnh",
      "transfer": "Điều chuyển",
      "cancel": "Hủy lượt"
    }
  ],
  "exam": [
    "Khám bệnh",
    {
      "view": "Xem phiếu khám",
      "save": "Ghi và lưu khám"
    }
  ],
  "labs": [
    "Cận lâm sàng",
    {
      "view": "Xem chỉ định / kết quả",
      "order": "Chỉ định",
      "accept": "Tiếp nhận",
      "save": "Nhập / sửa kết quả",
      "publish": "Phát hành kết quả"
    }
  ],
  "care": [
    "Điều trị & y lệnh",
    {
      "view": "Xem tờ điều trị / y lệnh",
      "sheet": "Lưu tờ điều trị",
      "reopen": "Mở lại tờ điều trị",
      "order": "Lập y lệnh",
      "vitals": "Ghi sinh hiệu",
      "perform": "Xác nhận thực hiện y lệnh"
    }
  ],
  "inpatient": [
    "Nội trú & giường",
    {
      "view": "Xem giường / đợt điều trị",
      "admit": "Tiếp nhận nhập viện",
      "discharge": "Ra viện",
      "assign": "Phân giường",
      "clean": "Xác nhận khử khuẩn"
    }
  ],
  "prescriptions": [
    "Đơn thuốc",
    {
      "view": "Xem đơn thuốc",
      "save": "Kê / sửa đơn",
      "approve": "Duyệt đơn",
      "dispense": "Cấp thuốc"
    }
  ],
  "pharmacy": [
    "Kho & thuốc",
    {
      "view": "Xem thuốc, lô và tồn",
      "warehouse": "Tạo / sửa kho",
      "toggle": "Đổi trạng thái kho",
      "product": "Tạo mặt hàng",
      "shipment": "Nhập đợt thuốc",
      "movement": "Lập phiếu kho",
      "approveMovement": "Duyệt nhập / xuất / chuyển kho",
      "cancelMovement": "Hủy phiếu kho",
      "count": "Lập kiểm kê",
      "approveCount": "Xác nhận kiểm kê",
      "cancelCount": "Hủy kiểm kê"
    }
  ],
  "finance": [
    "Thu ngân",
    {
      "view": "Xem viện phí / ca thu",
      "openShift": "Mở ca",
      "closeShift": "Đóng ca",
      "saveAdvance": "Lập tạm ứng / hoàn tiền",
      "confirmAdvance": "Xác nhận thu / hoàn",
      "cancelAdvance": "Hủy phiếu thu / hoàn",
      "createSettlement": "Lập quyết toán",
      "settle": "Xác nhận quyết toán"
    }
  ],
  "portal": [
    "Hồ sơ cá nhân bệnh nhân",
    {
      "view": "Xem kết quả, đơn thuốc và viện phí được công bố",
      "create": "Đặt lịch cá nhân",
      "cancel": "Hủy lịch cá nhân"
    }
  ],
  "equipment": [
    "Thiết bị & bảo trì",
    {
      "view": "Xem thiết bị / sự cố",
      "saveEquipment": "Tạo / sửa thiết bị",
      "reportIncident": "Báo hỏng",
      "toggleDevice": "Khóa / mở thiết bị",
      "acceptIncident": "Tiếp nhận sự cố",
      "maintain": "Cập nhật bảo trì"
    }
  ],
  "notifications": [
    "Thông báo cá nhân",
    {
      "view": "Xem thông báo",
      "read": "Đánh dấu đã đọc",
      "reminder": "Nhắc việc cá nhân"
    }
  ]
};
export const businessPermissions=Object.entries(businessGroups).flatMap(([group,[,actions]])=>Object.keys(actions).map(action=>'biz.'+group+':'+action));
export const businessLabels=Object.fromEntries(Object.entries(businessGroups).flatMap(([group,[name,actions]])=>Object.entries(actions).map(([action,label])=>['biz.'+group+':'+action,name+' — '+label])));
export const hasGrant=(grants,key)=>Array.isArray(grants)&&grants.includes(key);
export function requestGrant(path,method='GET',data={}){
 if(method==='GET')return ({
 '/api/appointments':['biz.appointments:view'], '/api/patients':['biz.reception:view','biz.exam:view','biz.care:view','biz.labs:view','biz.prescriptions:view','biz.finance:view'], '/api/queue':['biz.reception:view','biz.exam:view','biz.care:view'],
 '/api/clinical/visit':['biz.exam:view','biz.care:view'], '/api/clinical/doctors':['biz.reception:view','biz.exam:view','biz.care:view'],
 '/api/ancillary':['biz.reception:view','biz.labs:view','biz.care:view','biz.inpatient:view','biz.pharmacy:view'],
 '/api/pharmacy/state':['biz.pharmacy:view','biz.prescriptions:view'], '/api/medicines':['biz.pharmacy:view','biz.prescriptions:view'],
 '/api/pharmacy/batches':['biz.pharmacy:view'], '/api/clinical/prescriptions':['biz.prescriptions:view'],
 '/api/services':['biz.labs:view','biz.finance:view'], '/api/icd10':['biz.exam:view'], '/api/icd10/template':['biz.exam:view'],
 '/api/inpatient/beds':['biz.inpatient:view'], '/api/finance':['biz.finance:view'], '/api/portal':['biz.portal:view'],
 '/api/equipment':['biz.equipment:view'], '/api/notifications':['biz.notifications:view'],
 '/api/paper-forms':['biz.exam:view','biz.care:view','biz.reception:view','biz.finance:view']
 })[path]||null;
 if(path==='/api/appointments')return 'biz.appointments:'+({POST:'create',PUT:'edit',PATCH:'cancel'}[method]||'invalid');
 if(path==='/api/visits'){
  if(method!=='PATCH')return data.appointmentId?'biz.appointments:checkin':'biz.reception:receive';
  if(['call_next','defer','restore'].includes(data.action))return 'biz.exam:save';
  if(data.action==='dispatch')return ({CHO_KET_QUA_CLS:'biz.labs:order',DA_CO_KET_QUA:'biz.labs:publish',CHO_THANH_TOAN:'biz.exam:save',CHO_NHAP_VIEN:'biz.inpatient:admit'})[data.status]||null;
  return ({cancel:'biz.reception:cancel',transfer:'biz.reception:transfer'})[data.action]||null;
 }
 if(path==='/api/patients')return 'biz.reception:edit';
 const direct={'/api/clinical/exam':'biz.exam:save','/api/nursing/vitals':'biz.care:vitals','/api/nursing/perform':'biz.care:perform','/api/labs/orders':'biz.labs:order','/api/inpatient/admit':'biz.inpatient:admit','/api/inpatient/discharge':'biz.inpatient:discharge','/api/inpatient/clean':'biz.inpatient:clean','/api/paper-forms/save':'biz.exam:save'};
 if(direct[path])return direct[path];
 const actionGroups={'/api/labs/action':['labs',{accept:'accept',save:'save',publish:'publish'}],'/api/nursing/bed':['inpatient',{assign:'assign',clean:'clean'}],'/api/clinical/care':['care',{sheet:'sheet',reopen:'reopen',order:'order'}],'/api/portal/appointments':['portal',{create:'create',cancel:'cancel'}],'/api/equipment/action':['equipment',Object.fromEntries(Object.keys(businessGroups.equipment[1]).map(x=>[x,x]))],'/api/finance/action':['finance',Object.fromEntries(Object.keys(businessGroups.finance[1]).map(x=>[x,x]))]};
 if(actionGroups[path]){const [group,actions]=actionGroups[path];return actions[data.action]?'biz.'+group+':'+actions[data.action]:null;}
 if(path==='/api/pharmacy/action')return ({savePrescription:'biz.prescriptions:save',approvePrescription:'biz.prescriptions:approve',dispense:'biz.prescriptions:dispense',saveWarehouse:'biz.pharmacy:warehouse',toggleWarehouse:'biz.pharmacy:toggle',createProduct:'biz.pharmacy:product',importShipment:'biz.pharmacy:shipment',saveMovement:'biz.pharmacy:movement',approveMovement:'biz.pharmacy:approveMovement',cancelMovement:'biz.pharmacy:cancelMovement',saveCount:'biz.pharmacy:count',approveCount:'biz.pharmacy:approveCount',cancelCount:'biz.pharmacy:cancelCount'})[data.action]||null;
 if(path==='/api/notifications')return ({read:'biz.notifications:read',readAll:'biz.notifications:read',remind:'biz.notifications:reminder',saveReminder:'biz.notifications:reminder',cancelReminder:'biz.notifications:reminder'})[data.action]||null;
 return null;
}
export function checkRequestGrant(grants,path,method,data){
 const key=requestGrant(path,method,data);
 if(Array.isArray(key))return key.some(p=>hasGrant(grants,p));
 if(!key||!hasGrant(grants,key))return false;
 const view=key.split(':')[0]+':view';
 return hasGrant(grants,view);
}
export function pageGranted(page,grants){
 const mapping={appointments:['appointments'],patients:['reception'],history:['reception','portal','exam','care'],examination:['exam'],clinical:['labs'],care:['care'],inpatient:['inpatient'],pharmacy:['pharmacy','prescriptions'],warehouse:['pharmacy'],finance:['finance'],archive:['exam'],devices:['equipment'],portal:['portal']};
 if(page==='profile')return true;
 if(page==='admin')return grants?.some(p=>['accounts:view','roles:view','settings:view','audit:view','backups:view'].includes(p));
 if(page==='overview')return grants?.some(p=>p.endsWith(':view'));
 return mapping[page]?.some(group=>hasGrant(grants,'biz.'+group+':view'))||false;
}
