import {createLab} from '../server/ancillary.mjs';
// Isolated QA runner for the existing app. Never changes the working database.
import {createServer} from 'vite';
import {adminFixture} from '../tests/admin-fixture.mjs';
import {querySql} from '../server/admin-store.mjs';
import {createApiMiddleware} from '../server/api-router.mjs';
import {createAdminMiddleware} from '../server/admin-api.mjs';
import {saveAppointment,checkInAppointment} from '../server/appointments.mjs';
import {fileURLToPath} from 'node:url';

const fixture=await adminFixture();
await querySql(`INSERT dbo.Khoa(maKhoa,tenKhoa,loaiKhoa) VALUES('NOI',N'Nội tổng quát','KHAM_BENH'),('TIM',N'Tim mạch','KHAM_BENH');
INSERT dbo.BuongKham(maBuong,maKhoa,tenBuong) VALUES('QA_TEST_ROOM','NOI',N'QA_TEST_Phòng Nội'),('QA_TEST_OTHER','TIM',N'QA_TEST_Phòng Tim');
INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('NV001',N'Trần Minh Anh','NOI',N'QA_TEST_Bác sĩ','BAC_SI'),('QA_TEST_DOC',N'QA_TEST_Bác sĩ khác','TIM',N'QA_TEST_Bác sĩ','BAC_SI');
INSERT dbo.BenhNhan(maBenhNhan,hoTen,ngaySinh,gioiTinh,soDienThoai) VALUES('BN0001',N'QA_TEST_Bệnh nhân của tôi','1990-01-01',N'Nữ','0900000101');
INSERT dbo.PhanCongKham(maPhanCong,maBuong,maBacSi,ngayKham,caKham) VALUES
('QA_TEST_A1','QA_TEST_ROOM','NV001',CONVERT(date,SYSDATETIME()),'SANG'),('QA_TEST_A2','QA_TEST_ROOM','NV001',CONVERT(date,SYSDATETIME()),'CHIEU'),
('QA_TEST_B1','QA_TEST_OTHER','QA_TEST_DOC',CONVERT(date,SYSDATETIME()),'SANG'),('QA_TEST_B2','QA_TEST_OTHER','QA_TEST_DOC',CONVERT(date,SYSDATETIME()),'CHIEU'); SELECT 'ok';`);
const day=await querySql('SELECT CONVERT(char(10),SYSDATETIME(),23)');
const base={name:'QA_TEST_Bệnh nhân của tôi',phone:'0900000101',birth:'1990-01-01',gender:'Nữ',dept:'Nội tổng quát',day,time:'08:30'};
const a=await saveAppointment(base),b=await saveAppointment({...base,time:'09:00'}),other=await saveAppointment({...base,name:'QA_TEST_Người khác',phone:'0900000102',dept:'Tim mạch',time:'09:30'});
const va=await checkInAppointment({appointmentId:a.id}),vb=await checkInAppointment({appointmentId:b.id}),vo=await checkInAppointment({appointmentId:other.id});
const fixtures={patient:'BN0001',ownVisit:va.visitId,secondVisit:vb.visitId,otherPatient:other.patientId,otherVisit:vo.visitId};
await querySql(`INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon) VALUES('NV002',N'QA_TEST_Điều dưỡng','NOI',N'Điều dưỡng','DIEU_DUONG'),('NV005',N'QA_TEST_Kỹ thuật viên','NOI',N'Kỹ thuật viên','KY_THUAT_VIEN');
INSERT dbo.DichVuKyThuat(maDichVu,tenDichVu,maKhoaThucHien,loaiDichVu,loaiKetQua,donGia) VALUES('QA_TEST_SERVICE',N'QA_TEST_Xét nghiệm','NOI','XET_NGHIEM','XET_NGHIEM',1000);
INSERT dbo.DotDieuTri(maDotDieuTri,maBenhNhan,maLuotKham,maKhoaDieuTri,lyDoNhapVien,chanDoanVaoVien,maBacSiDieuTriChinh) VALUES('QA_TEST_ADMISSION','BN0001',@visit,'NOI',N'QA_TEST',N'QA_TEST','NV001');
INSERT dbo.ToDieuTri(maTo,maDotDieuTri,soThuTuTo,ngayDieuTri,dienBienBenh,maBacSi) VALUES('QA_TEST_SHEET','QA_TEST_ADMISSION',1,CONVERT(date,SYSDATETIME()),N'QA_TEST','NV001');
INSERT dbo.YLenh(maYLenh,maTo,loaiYLenh,noiDungYLenh,thoiDiemBatDau,maBacSiRaYLenh) VALUES('QA_TEST_CARE','QA_TEST_SHEET','CHAM_SOC',N'QA_TEST_Chăm sóc',SYSDATETIME(),'NV001');
INSERT dbo.BuongBenh(maBuongBenh,maKhoa,tenBuong,soGiuongToiDa) VALUES('QA_TEST_WARD','NOI',N'QA_TEST_Buồng',2);
INSERT dbo.GiuongBenh(maGiuong,maBuongBenh,soHieuGiuong,donGiaNgay,trangThaiHienTai) VALUES('QA_TEST_BED','QA_TEST_WARD','01',1000,'TRONG'),('QA_TEST_CLEAN','QA_TEST_WARD','02',1000,'DANG_VE_SINH');SELECT 'ok';`,{visit:va.visitId});
await createLab({role:'doctor',staffId:'NV001',patient:'BN0001',episodeId:va.visitId,diagnosis:'QA_TEST',services:['QA_TEST_SERVICE']});
const stateCode='';
const allow=new Set(['/api/appointments','/api/patients','/api/queue','/api/visits','/api/clinical/visit','/api/clinical/exam','/api/clinical/doctors','/api/icd10','/api/ancillary','/api/nursing/vitals','/api/nursing/perform','/api/nursing/bed','/api/inpatient/beds','/api/labs/action','/api/labs/orders']);
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{host:'127.0.0.1',port:52795,strictPort:true},plugins:[{
 name:'isolated-appointment-qa',
 transform(source,id){if(id.split('?')[0].replaceAll('\\','/').endsWith('/src/workspace.js'))return {code:source+stateCode,map:null};},
 configureServer(server){
  server.middlewares.use((req,res,next)=>{
   const path=req.url.split('?')[0];
   if(path.startsWith('/api/')&&!allow.has(path)&&!path.startsWith('/api/auth/')&&!path.startsWith('/api/admin')&&path!=='/api/facility'){
    res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'QA_TEST: endpoint ngoài phạm vi bị chặn để cô lập dữ liệu.'}));return;
   }
   next();
  });
  server.middlewares.use(createAdminMiddleware());server.middlewares.use(createApiMiddleware({trustedTest:true}));
 }
}]});
await vite.listen();
console.log(JSON.stringify({url:'http://127.0.0.1:52795/#management',database:fixture.database,fixtures}));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await vite.close();await fixture.close();process.exit(0);});
