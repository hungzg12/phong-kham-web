import {transact} from '../src/lib/store.ts';import {hashPassword} from '../src/lib/crypto.ts';import {randomUUID} from 'node:crypto';
const username=process.env.ADMIN_USERNAME??'admin',password=process.env.ADMIN_PASSWORD,email=process.env.ADMIN_EMAIL,name=process.env.ADMIN_NAME??'Quản trị viên';
if(!password||password.length<12||!email){console.error('Thiết lập ADMIN_PASSWORD (ít nhất 12 ký tự), ADMIN_EMAIL và ADMIN_USERNAME qua biến môi trường. Không truyền mật khẩu trên dòng lệnh.');process.exit(1);}
await transact(s=>{if(s.users.some(u=>u.username.toLowerCase()===username.toLowerCase()))throw new Error('Tài khoản đã tồn tại. Dùng trang quản trị để cập nhật.');s.users.push({id:randomUUID(),username,passwordHash:hashPassword(password),name,email,role:'admin',version:1,active:true});});
console.log('Đã tạo tài khoản quản trị.');process.exit(0);
