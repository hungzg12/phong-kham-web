import {randomUUID} from 'node:crypto';
import {transactAdmin} from './admin-store.mjs';
import {fail,hashPassword,event} from './admin-domain.mjs';

export async function registerPatient(input){
 const allowed=['username','password','confirmPassword','name','email','phone','birth','gender'];
 if(Object.keys(input).some(k=>!allowed.includes(k)))fail(400,'Đăng ký chỉ dành cho tài khoản bệnh nhân; không được chỉ định quyền hoặc hồ sơ liên kết.');
 const trim=(key,max)=>typeof input[key]==='string'&&input[key].trim().length<=max?input[key].trim():'';
 const username=trim('username',50).toLowerCase(),name=trim('name',100),email=trim('email',100),phone=trim('phone',20),birth=trim('birth',10),gender=trim('gender',10);
 if(!/^[a-z0-9._-]{3,50}$/.test(username))fail(400,'Tên đăng nhập phải có 3–50 chữ không dấu, số hoặc . _ -');
 if(!name||!email||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Nhập họ tên và email hợp lệ.');
 if(!/^0\d{9}$/.test(phone))fail(400,'Số điện thoại phải có 10 chữ số, bắt đầu bằng 0.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birth)||!Number.isFinite(Date.parse(birth))||new Date(birth).toISOString().slice(0,10)!==birth||birth>new Date().toISOString().slice(0,10)||!['Nam','Nữ','Khác'].includes(gender))fail(400,'Ngày sinh hoặc giới tính không hợp lệ.');
 if(input.password!==input.confirmPassword)fail(400,'Mật khẩu xác nhận chưa khớp.');
 const passwordHash=await hashPassword(input.password),id=randomUUID(),patientId='BN-'+randomUUID().replaceAll('-','').slice(0,16).toUpperCase();
 return transactAdmin((data,log,effect)=>{
  const role=data.roles.find(r=>r.id==='patient'&&r.active);
  if(!role||role.permissions.length||(role.workspaceRole&&role.workspaceRole!=='patient'))fail(503,'Chưa thể đăng ký bệnh nhân. Vui lòng liên hệ cơ sở.');
  if(data.accounts.some(a=>a.username.toLowerCase()===username))fail(409,'Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác hoặc đăng nhập.');
  // Never claim an existing medical record using unverified phone/email information.
  data.accounts.push({id,username,name,email,roleId:'patient',staffId:'',patientId,active:true,version:1,authVersion:1,passwordHash});
  effect({sql:`INSERT dbo.BenhNhan(maBenhNhan,hoTen,ngaySinh,gioiTinh,soDienThoai) VALUES(@registrationPatient,@registrationName,CONVERT(date,@registrationBirth),@registrationGender,@registrationPhone);`,parameters:{registrationPatient:patientId,registrationName:name,registrationBirth:birth,registrationGender:gender,registrationPhone:phone}});
  log(event(username,'register','accounts',id,{roleId:'patient'}));
  return {ok:true};
 });
}
