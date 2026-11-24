import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { permissions, adminDefinitions } from '../src/admin-schema.js';
const scrypt = promisify(scryptCallback);
export const fail = (status,message) => { throw Object.assign(new Error(message),{status}); };
export const digest = text => createHash('sha256').update(text).digest('hex');
export async function hashPassword(password) {
  if(typeof password!=='string'||password.length<12||password.length>128) fail(400,'Mật khẩu phải có từ 12 đến 128 ký tự.');
  const salt=randomBytes(16).toString('hex');
  return `${salt}:${Buffer.from(await scrypt(password,salt,64)).toString('hex')}`;
}
export async function verifyPassword(password,hash) {
  if(typeof password!=='string'||password.length>128||!hash) return false;
  const [salt,key]=hash.split(':'); const actual=Buffer.from(await scrypt(password,salt,64)); const expected=Buffer.from(key,'hex');
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export const publicAccount = ({passwordHash,...account}) => account;
export function authorize(data,token,permission) {
  const session=data.sessions.find(s=>s.hash===digest(token||'')&&s.expires>Date.now());
  const user=session&&data.accounts.find(u=>u.id===session.userId&&u.active&&u.authVersion===session.authVersion);
  const role=user&&data.roles.find(r=>r.id===user.roleId&&r.active);
  if(!user||!role) fail(401,'Phiên đã hết hạn hoặc tài khoản đã bị khóa. Vui lòng đăng nhập lại.');
  if(permission&&!role.permissions.includes(permission)) fail(403,'Bạn không có quyền thực hiện thao tác này.');
  return {user,role,session};
}
export function validate(resource,input,{create=false}={}) {
  if(!input||typeof input!=='object'||Array.isArray(input)) fail(400,'Dữ liệu biểu mẫu không hợp lệ.');
  const definition=adminDefinitions[resource]; if(!definition) fail(404,'Không tìm thấy phân hệ.');
  const result={};
  for(const field of definition.fields) {
    let value=input[field.key];
    if(field.key==='id'&&!create) continue;
    if(field.type==='checkbox') { if(typeof value!=='boolean') fail(400,`${field.label}: phải là giá trị bật/tắt.`); }
    else if(field.type==='permissions') {
      if(!Array.isArray(value)||value.some(p=>!permissions.includes(p))) fail(400,'Danh sách quyền không hợp lệ.');
      value=[...new Set(value)];
    } else if(field.type==='number') {
      if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e9||(!['price','insurancePrice'].includes(field.key)&&(!Number.isInteger(value)||value<1))) fail(400,`${field.label}: số không hợp lệ.`);
      if(Math.round(value*100)!==value*100) fail(400,`${field.label}: tối đa hai chữ số thập phân.`);
    } else {
      if(typeof value!=='string') { if(field.optional) value=''; else fail(400,`Thiếu ${field.label.toLowerCase()}.`); }
      value=value.trim();
      if((!value&&!field.optional)||value.length>(field.key==='description'?255:field.key==='name'&&resource==='services'?150:100)) fail(400,`${field.label}: bắt buộc và không vượt giới hạn độ dài.`);
      if(field.type==='select'&&!(field.optional&&!value)&&!field.options.includes(value)) fail(400,`${field.label}: lựa chọn không hợp lệ.`);
      if(field.type==='email'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail(400,'Email không hợp lệ.');
      if(field.type==='tel'&&value&&!/^\+?[0-9][0-9 ()-]{8,19}$/.test(value)) fail(400,'Điện thoại không hợp lệ.');
      if(field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)) fail(400,'Ngày không hợp lệ.');
      if(field.type==='time'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) fail(400,'Giờ làm việc không hợp lệ.');
      if(field.key==='id'&&!/^[A-Za-z0-9_-]{1,20}$/.test(value)) fail(400,'Mã chỉ gồm chữ, số, gạch dưới/gạch ngang; tối đa 20 ký tự.');
      if(field.key==='username') {value=value.toLowerCase();if(!/^[a-z0-9._-]{3,50}$/.test(value)) fail(400,'Tên đăng nhập phải có 3–50 chữ, số hoặc . _ -');}
    }
    result[field.key]=value;
  }
  if(resource==='roles')for(const permission of result.permissions.filter(p=>p.startsWith('biz.')&&!p.endsWith(':view'))){if(!result.permissions.includes(permission.split(':')[0]+':view'))fail(400,'Cần tích quyền Xem của cùng nhóm trước khi cấp quyền thao tác.');}
  if(resource==='settings'&&result.close<=result.open) fail(400,'Giờ đóng cửa phải sau giờ mở cửa.');
  return result;
}
export function ensureLastAdmin(data) {
  // A designated administrator role cannot lose security administration rights.
  const role=data.roles.find(r=>r.id==='admin');
  // Preserve security administration without forcing clinical or optional catalog grants.
  if(!role?.active||['accounts:view','accounts:create','accounts:edit','roles:view','roles:create','roles:edit'].some(p=>!role.permissions.includes(p))) fail(409,'Vai trò quản trị hệ thống phải giữ đầy đủ quyền quản trị.');
  if(!data.accounts.some(a=>a.active&&a.roleId==='admin')) fail(409,'Phải giữ ít nhất một quản trị viên đang hoạt động.');
}
export function event(actor,action,entity,target,changes={}) {
  return {id:randomUUID(),actor,action,entity,target,changes};
}
export async function initialState({username,name,email,password}) {
  const admin=validate('accounts',{username,name,email,roleId:'admin',staffId:'',active:true});
  return {accounts:[{...admin,id:randomUUID(),version:1,authVersion:1,passwordHash:await hashPassword(password)}],
    roles:[{id:'admin',name:'Quản trị viên',description:'Quản trị cấu hình và tài khoản; không cấp quyền hồ sơ chuyên môn.',permissions:permissions.filter(p=>!p.startsWith('biz.')),active:true,version:1},
      ...[['receptionist','Tiếp tân'],['doctor','Bác sĩ'],['nurse','Điều dưỡng'],['technician','Kỹ thuật viên CLS'],['pharmacist','Dược sĩ'],['cashier','Thu ngân'],['patient','Bệnh nhân']].map(([id,name])=>({id,name,description:'Chưa được cấp quyền quản trị.',permissions:[],active:true,version:1}))],
    sessions:[],settings:{name:'MediCare',address:'Chưa cấu hình',phone:'0900000000',open:'08:00',close:'17:00',version:1}};
}
