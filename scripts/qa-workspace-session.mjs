import {qaLoginAccounts} from './qa-login-accounts.mjs';
import {randomBytes} from 'node:crypto';
// Runs the existing Vite app against an isolated database with real session auth.
import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {adminFixture} from '../tests/admin-fixture.mjs';
import {querySql,transactAdmin} from '../server/admin-store.mjs';
import {hashPassword} from '../server/admin-domain.mjs';
import {createAdminMiddleware} from '../server/admin-api.mjs';
import {createApiMiddleware} from '../server/api-router.mjs';
import {receivePatient} from '../server/clinic-flow.mjs';
const fixture=await adminFixture();
await querySql(`INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('NOI',N'Nội tổng quát','KHAM_BENH');
INSERT dbo.BuongKham(maBuong,maKhoa,tenBuong) VALUES('QA_TEST_ROOM','NOI',N'QA_TEST_ROOM');
INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('QA_TEST_REC',N'QA_TEST_REC','NOI',N'Tiếp tân','QUAN_TRI'),('QA_TEST_DOC',N'QA_TEST_DOC','NOI',N'Bác sĩ','BAC_SI'),('QA_TEST_NURSE',N'QA_TEST_NURSE','NOI',N'Điều dưỡng','DIEU_DUONG'),('QA_TEST_TECH',N'QA_TEST_TECH','NOI',N'Kỹ thuật viên','KY_THUAT_VIEN'),('QA_TEST_PHARM',N'QA_TEST_PHARM','NOI',N'Dược sĩ','DUOC_SI'),('QA_TEST_CASH',N'QA_TEST_CASH','NOI',N'Thu ngân','THU_NGAN');
INSERT dbo.PhanCongKham(maPhanCong,maBuong,maBacSi,ngayKham,caKham) VALUES('QA_TEST_AM','QA_TEST_ROOM','QA_TEST_DOC',CONVERT(date,SYSDATETIME()),'SANG'),('QA_TEST_PM','QA_TEST_ROOM','QA_TEST_DOC',CONVERT(date,SYSDATETIME()),'CHIEU');
INSERT dbo.BenhNhan(maBenhNhan,hoTen,ngaySinh,gioiTinh,soDienThoai) VALUES('QA_TEST_PAT_A',N'QA_TEST_PAT_A','1990-01-01',N'Nam','0900000901');SELECT 'ok';`);
const visit=await receivePatient({patientId:'QA_TEST_PAT_A',dept:'Nội tổng quát'});
const labels={admin:'Quản trị viên',receptionist:'Tiếp tân',doctor:'Bác sĩ',nurse:'Điều dưỡng',technician:'Kỹ thuật viên CLS',pharmacist:'Dược sĩ',cashier:'Thu ngân',patient:'Bệnh nhân'};
const credentials=await Promise.all(Object.entries(labels).map(async([role,label])=>{const password='QA!'+randomBytes(15).toString('base64url');return {role,label,username:'qa_test_'+role,password,passwordHash:await hashPassword(password)};}));
await transactAdmin(data=>{const admin=data.accounts.find(a=>a.roleId==='admin');const account=credentials.find(a=>a.role==='admin');Object.assign(admin,{username:account.username,name:'QA_TEST_Admin',passwordHash:account.passwordHash,authVersion:admin.authVersion+1});data.sessions=[];for(const[role,staffId]of Object.entries({receptionist:'QA_TEST_REC',doctor:'QA_TEST_DOC',nurse:'QA_TEST_NURSE',technician:'QA_TEST_TECH',pharmacist:'QA_TEST_PHARM',cashier:'QA_TEST_CASH',patient:''})){
 if(!data.roles.some(r=>r.id===role))data.roles.push({id:role,name:'QA_TEST_'+role,permissions:[],active:true,version:1});
 data.accounts.push({id:'QA_TEST_'+role,username:'qa_test_'+role,name:'QA_TEST_'+role,email:'qa@example.test',roleId:role,staffId,patientId:role==='patient'?'QA_TEST_PAT_A':'',active:true,version:1,authVersion:1,passwordHash:credentials.find(a=>a.role===role).passwordHash});
}});
const vite=await createServer({configFile:false,root:process.cwd(),server:{host:'127.0.0.1',port:52796,strictPort:true},plugins:[{name:'isolated-session-qa',configureServer(server){server.middlewares.use(qaLoginAccounts());server.middlewares.use(createAdminMiddleware());server.middlewares.use(createApiMiddleware());}}]});
await vite.listen();await fs.mkdir('.data',{recursive:true});
const url='http://127.0.0.1:52796/#management';
const quote=value=>'"'+String(value).replaceAll('"','""')+'"';
await fs.writeFile('.data/medicare-8-passwords.csv',['name,url,username,password',...credentials.map(a=>[a.label,url,a.username,a.password].map(quote).join(','))].join('\r\n'),'utf8');
await fs.writeFile('.data/QA_TEST_workspace_session.json',JSON.stringify({url,database:fixture.database,visit,pid:process.pid,passwordFile:'.data/medicare-8-passwords.csv'}));
const checks=[];
for(const a of credentials){const login=await fetch('http://127.0.0.1:52796/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:a.username,password:a.password})});const cookie=login.headers.get('set-cookie')?.split(';')[0]||'';const response=await fetch('http://127.0.0.1:52796/api/workspace/session',{headers:{cookie}});const identity=await response.json();checks.push({role:a.role,username:a.username,loginStatus:login.status,sessionStatus:response.status,verified:identity.role===a.role});}
await fs.writeFile('.data/medicare-8-accounts-check.json',JSON.stringify({database:fixture.database,checks},null,2));
if(checks.some(c=>!c.verified))throw new Error('An account did not pass real session verification');
console.log('ACCOUNT_CHECKS 8/8 passed; 8 distinct passwords exported locally.');
console.log('QA_SESSION_READY http://127.0.0.1:52796/#management');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await vite.close();await fixture.close();process.exit(0);});
