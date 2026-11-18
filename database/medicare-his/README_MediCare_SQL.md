# Cơ sở dữ liệu MediCare HIS

File chính: **MediCare_HIS_Complete.sql**. Hệ quản trị: SQL Server 2019/2022. Đây là schema mới cho giao diện MediCare, không phải PostgreSQL/MySQL và không phải migration của ClinicCare_HIS cũ.

## Phạm vi

75 bảng, 22 index bổ sung ngoài PK/UNIQUE, 4 stored procedure, 4 view và 2 hàm kiểm tra quyền. Có 6 chuyên khoa công khai và 24 module biểu mẫu nghiệp vụ theo danh mục frontend. Phân hệ chuyên sâu dùng biểu mẫu JSON có cấu hình trường và ma trận trạng thái, chưa phải thiết kế chuyên ngành chi tiết đã được bệnh viện nghiệm thu.

- Tổ chức: Khoa, ChuyenKhoa, NhanVien, NhanVienChuyenKhoa, PhongKham, BuongBenh, GiuongBenh.
- Bệnh nhân và truy cập: BenhNhan, NguoiDaiDien, TaiKhoan, VaiTro, Quyen, VaiTroQuyen, TaiKhoanVaiTro, PhienDangNhap.
- Lịch và hồ sơ: LichLamViec, LichHen, BoDemSoKham, HoSoDieuTri, LuotKham, DotDieuTri, PhanCongDieuTri, PhanGiuong.
- Khám và điều trị: PhieuKham, PhienBanPhieuKham, ToDieuTri, PhienBanToDieuTri, SinhHieu, DiUngCanhBao, YLenh, CuYLenh.
- Dịch vụ và kết quả: DichVu, BangGiaDichVu, GoiDichVu, ChiTietGoiDichVu, ChiDinhDichVu, MauXetNghiem, KetQuaCLS, ChiSoKetQua, ThamChieuHinhAnh.
- Thuốc và kho: HangHoaYTe, QuyDoiDonVi, DonThuoc, ChiTietDonThuoc, KhoDuoc, LoHang, TonKho, PhieuKho, ChiTietPhieuKho, SoKho, KiemKeKho, ChiTietKiemKe.
- Tài chính: ChiPhiHoSo, QuyetToan, ChiTietQuyetToan, CaThuNgan, YeuCauThanhToan, SuKienThanhToan, GiaoDichThanhToan.
- Hồ sơ và vận hành: ChuyenTuyen, HoiChan, BenhAnDienTu, PhienBanBenhAn, UyQuyenHoSo, YeuCauDinhChinh, ThietBiYTe, SuCoThietBi, ThongBao, NhatKyHeThong.
- Biểu mẫu: ModuleNghiepVu, TrangThaiModule, ChuyenTrangThaiModule, BieuMauNghiepVu, LichSuBieuMau.

## Chạy file

1. Kết nối SQL Server bằng SSMS với tài khoản có quyền tạo database.
2. Mở MediCare_HIS_Complete.sql và chạy. Script tạo MediCare_HIS nếu chưa có, không DROP database/bảng.
3. Chạy MediCare_HIS_Verify.sql để xem danh mục, tài khoản, quan hệ và dữ liệu mẫu.

Có thể dùng: sqlcmd -S localhost\SQLEXPRESS -E -b -f 65001 -i MediCare_HIS_Complete.sql.

Script dùng một transaction cho schema, dữ liệu và đối tượng nghiệp vụ; việc CREATE DATABASE ở batch riêng. Nếu cài đặt lỗi thì schema/seed được rollback, database rỗng có thể vẫn tồn tại. Chạy lại chỉ thêm mã seed chưa có. Không dùng để tự nâng cấp một schema khác có tên bảng trùng; sao lưu và lập migration riêng nếu đã có dữ liệu. Một số quyền cài đặt phụ thuộc tài khoản SQL Server.

## Khớp frontend như thế nào

| Dữ liệu frontend | Bảng / cách ánh xạ |
|---|---|
| patients | BenhNhan; id → maBenhNhan |
| business.staff | NhanVien; staffId → maNhanVien |
| clinics | ChuyenKhoa, liên kết đơn vị tổ chức Khoa |
| business.departments | PhongKham; giữ mã KP001…KP006 |
| visits | HoSoDieuTri + LuotKham; id → maHoSoDieuTri |
| admissions | HoSoDieuTri + DotDieuTri |
| visit.note / revisions | PhieuKham + PhienBanPhieuKham |
| business.careSheets | ToDieuTri + PhienBanToDieuTri |
| business.vitals | SinhHieu |
| business.labs | ChiDinhDichVu; kết quả ở KetQuaCLS + ChiSoKetQua |
| business.prescriptions / lines | DonThuoc + ChiTietDonThuoc |
| business.rounds | YLenh + CuYLenh; một dòng demo tương ứng một cữ dự kiến |
| stock / inventory / ledger | HangHoaYTe + LoHang + TonKho + SoKho |
| business.settlements | QuyetToan + ChiTietQuyetToan |
| business.advances | GiaoDichThanhToan, loại TAM_UNG / HOAN_TIEN |
| business.operations.records / events | BieuMauNghiepVu + LichSuBieuMau |
| business.audit | NhatKyHeThong |
| notifications / reminders | ThongBao |

Trạng thái SQL dùng mã ổn định (NHAP, CHO_DUYET…). Backend phải ánh xạ sang nhãn tiếng Việt trên giao diện. Riêng trạng thái module giữ nhãn cấu hình hiện tại để khớp 24 biểu mẫu. Khoản chi phí liên kết hồ sơ; không ghép chéo nhiều lượt khám của cùng người bệnh.

Frontend hiện có một số tên/chuyên khoa bác sĩ không thống nhất giữa website giới thiệu và dữ liệu nội bộ. SQL lấy hồ sơ nhân viên nội bộ làm gốc, cho phép một bác sĩ khám nhiều chuyên khoa qua NhanVienChuyenKhoa. NV001 Trần Minh Anh thuộc Khoa Nội và được gán cả Nội tổng quát, Tim mạch. Khi nối backend cần bỏ các danh sách bác sĩ viết cứng và lấy danh mục từ API.

Dữ liệu mẫu có 7 bệnh nhân, 7 lượt khám, 1 đợt nội trú, 18 giường, 4 dịch vụ, 4 mặt hàng, 2 kho. Ngày lịch mẫu cố định 16/11/2026 để chạy lại không tự sinh thêm hồ sơ. Nội dung lâm sàng là minh họa. Chưa có giá thuốc bán được xác nhận; giaBanDemo để NULL. Giá nhập mẫu bằng 0 không được dùng làm giá viện phí.

## Tài khoản và phân quyền

Có các tài khoản admin, bacsi, dieuduong, duocsi, thungan, tieptan, benhnhan, kythuatvien. **Tất cả đều khóa và không có mật khẩu mặc định.** Backend cần tạo hash mật khẩu bằng cơ chế phù hợp, lưu chuỗi hash đầy đủ rồi mới kích hoạt tài khoản. Không lưu mật khẩu thô.

TaiKhoanVaiTro hỗ trợ phạm vi DUOC_PHAN_CONG, TRONG_KHOA, TOAN_VIEN; có thời hạn và thu hồi. fn_CoQuyen kiểm tra tài khoản hoạt động, vai trò, quyền chức năng, khoa và phân công. fn_DuocXemHoSo bổ sung quyền chủ hồ sơ/người được ủy quyền. Các hàm này không phải SQL Row-Level Security và không tự bảo vệ các SELECT khác. Backend phải gọi đúng policy, lọc kết quả chưa phát hành và lấy mã tài khoản từ phiên đã xác thực; không tin mã tài khoản do client tự khai.

## Thủ tục và view

- sp_TiepNhanVaCapSo: kiểm tra quyền, phòng, bác sĩ/chuyên khoa và lịch hẹn; cấp số có khóa giao dịch theo phòng/ngày. Mã hồ sơ dùng GUID nên không trùng giữa phòng. Chưa giải quyết đầy đủ giữ chỗ/lịch nghỉ/giới hạn ca; backend phải kiểm tra thêm.
- sp_LapQuyetToan: lấy toàn bộ khoản ChiPhiHoSo chưa hủy, chốt chi tiết và tổng khớp nhau; không tự áp 80% BHYT. Chi phí thuốc, giường, dịch vụ phải được ghi vào sổ chi phí trước. Chưa tự tạo biên nhận thu tiền.
- sp_XuatKhoFEFO: xuất một mặt hàng qua nhiều lô còn hạn, khóa giao dịch, không xuất phần giữ chỗ hoặc kho đang kiểm kê; thiếu tồn thì rollback. maYeuCau chống xuất trùng khi retry. Đây là xuất kho độc lập, không tự xác nhận cấp phát đơn hoặc đã thực hiện y lệnh.
- sp_ChuyenTrangThaiBieuMau: kiểm tra rowversion và ma trận trạng thái, lưu lý do/lịch sử. Thủ tục mẫu giới hạn quản trị viên; backend cần bổ sung policy riêng nếu cho vai trò khác thực hiện.
- vw_HoSoBanKham, vw_KetQuaCLSTheoHoSo: dữ liệu cho bàn khám và tab kết quả.
- vw_VienPhiTheoHoSo: tổng hợp giao dịch theo hồ sơ trước khi join để tránh nhân đôi số tiền.
- vw_TonKhoFEFO: xem tồn và cảnh báo hạn dùng, không tự khóa/xuất lô.

Các SP ghi dữ liệu dùng transaction riêng; gọi độc lập, không lồng trong transaction của ứng dụng nếu chưa thiết kế lại cách rollback.

## Còn cần backend

API, đăng nhập/OTP, hash mật khẩu, xác minh webhook ngân hàng, thanh toán/hoàn tiền, tự ghi sổ chi phí, thực hiện y lệnh đồng bộ xuất kho, quản lý lịch chồng lấn, chuyển giường theo khoảng thời gian, ký số và lưu tệp vẫn cần triển khai. ISJSON chỉ kiểm tra JSON hợp lệ, không kiểm tra đầy đủ schema trường và quy tắc lâm sàng. Dữ liệu bệnh án và module không tự đồng bộ với localStorage. Script không cài lịch backup hay kết nối LIS/PACS.

## Kiểm tra đã thực hiện

Phân tích cú pháp bằng Microsoft SqlServer.TransactSql.ScriptDom TSql150Parser cho SQL Server 2019; kiểm tra cả nội dung dynamic SQL. Kiểm tra tĩnh tên bảng/khóa ngoại, số chuyên khoa và module. **Chưa thực thi trên SQL Server vì môi trường không có dịch vụ Database Engine chạy.** Cần chạy trên database kiểm thử rồi kiểm tra lỗi thực thi, giao dịch đồng thời và các tình huống nghiệp vụ trước khi nối ứng dụng.
