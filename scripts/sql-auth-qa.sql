SET QUOTED_IDENTIFIER ON;
SET ARITHABORT ON;
INSERT dbo.NhanVien(maNhanVien,hoTen,maKhoa,chucDanh,chuyenMon)
VALUES ('QA-BS-TIM',N'MediCare Synthetic Doctor','TIM',N'Demo','BAC_SI'),
       ('QA-RECEPTION',N'MediCare Synthetic Reception','NOI',N'Tiếp tân','QUAN_TRI');
INSERT dbo.VaiTro(maVaiTro,tenVaiTro)
VALUES ('doctor',N'Bác sĩ'),('receptionist',N'Tiếp tân');
INSERT dbo.TaiKhoan(maTaiKhoan,tenDangNhap,matKhauHash,loaiChuThe,maNhanVien,trangThai)
VALUES ('QA-A-DOCTOR','qa-doctor','PENDING','NHAN_VIEN','QA-BS-TIM','KHOA_TAM_THOI'),
       ('QA-A-RECEPTION','qa-reception','PENDING','NHAN_VIEN','QA-RECEPTION','KHOA_TAM_THOI');
INSERT dbo.TaiKhoanVaiTro(maGanVaiTro,maTaiKhoan,maVaiTro,maKhoaPhamVi,phamViDuLieu,maNguoiCap)
VALUES ('QA-G-DOCTOR','QA-A-DOCTOR','doctor','TIM','THEO_KHOA','QA-BS-TIM'),
       ('QA-G-RECEPTION','QA-A-RECEPTION','receptionist',NULL,'TOAN_VIEN','QA-BS-TIM');
