# MediCare — Quản lý phòng khám

Dự án hiện tại dùng **React 18 / Vite, Node.js, Windows PowerShell và SQL Server**.
Các tài liệu Next.js/PostgreSQL cũ trong repository không mô tả entry đang chạy.

## Chạy dự án trên Windows

1. Cài Node.js và SQL Server; tạo database bằng `database/QuanLyBenhVien_SQLServer.sql` nếu chưa có. Không chạy reset hay seed lên database đang làm việc.
2. Chạy `npm ci`, sao chép `.env.example` thành `.env.local` và cấu hình kết nối SQL Server.
3. Khởi tạo quản trị lần đầu theo [docs/ADMIN.md](docs/ADMIN.md); mật khẩu do người vận hành đặt, không có mật khẩu mặc định.
4. Chạy `npm run dev -- --port 5176`, mở http://127.0.0.1:5176/#management.

Đăng nhập bằng tài khoản được cấp. Vai trò, nhân viên và bệnh nhân được xác định từ phiên SQL; sửa sessionStorage hoặc chọn menu không cấp quyền API. Cả 8 vai trò dùng khung giao diện nghiệp vụ chung. Quản trị có biểu mẫu cấu hình tại `#administration`.

`npm run build` tạo bundle. `npm start` chạy máy chủ **chỉ dành cho quản trị** tại cổng5180; chưa bật API nghiệp vụ trên máy chủ production này. `vite preview` không chạy middleware SQL của Vite dev.

## Bản QA có đủ 8 tài khoản

Chạy `node scripts/qa-workspace-session.mjs` để tạo **database QA riêng**, hồ sơ giả QA_TEST và 8 mật khẩu khác nhau. Bản QA chạy tại http://127.0.0.1:52796/#management.

- Tài khoản và mật khẩu được xuất vào `.data/medicare-8-passwords.csv` (định dạng nhập trình quản lý mật khẩu).
- Màn hình đăng nhập QA hiển thị danh sách này và cho bấm để điền. Chức năng chỉ nằm trong runner QA loopback52796, không nằm trong máy chủ production hoặc Vite5176.
- Muốn mở lại cùng database/tài khoản, chạy `node scripts/run-saved-accounts.mjs`. Không chạy lại script tạo QA nếu muốn giữ mật khẩu hiện có.
- `.data/`, `.env.local`, mật khẩu và log QA không được đưa lên Git. Bản clone mới cần tự tạo tài khoản/mật khẩu QA của mình.

## Phần đã nối SQL

- Lịch hẹn, đổi/hủy lịch và check-in; tiếp đón và phân công khám theo ca.
- Lưu/khóa phiếu khám, kiểm tra phiên bản, giới hạn hồ sơ bác sĩ theo phân công.
- Sinh hiệu điều dưỡng, thực hiện y lệnh và tiêu hao kho; tiếp nhận/nhập/phát hành CLS.
- Đơn thuốc, xác nhận và cấp FEFO; nhập/điều chuyển/kiểm kê kho, quy đổi đơn vị và hoàn thuốc theo dòng cấp gốc.
- Ca thu ngân, tạm ứng/hoàn tiền, quyết toán theo lượt/đợt và đối soát; chống xử lý trùng.
- Cổng bệnh nhân theo mã hồ sơ liên kết trong tài khoản, không theo số điện thoại hoặc BN0001 cố định.
- Quản trị tài khoản/danh mục, quyền API, cookie phiên, CSRF và thu hồi phiên.

Xem [hướng dẫn quyền và liên kết tài khoản](docs/WORKSPACE-ACCESS.md), [quản trị](docs/ADMIN.md) và [kiểm chứng](VERIFICATION.md).

## Kiểm thử

`node --test --test-concurrency=1 tests/*.test.mjs`

Các test SQL tạo database riêng `MediCareQA_Admin_*`, giữ lại bằng chứng; không ghi vào database làm việc. Máy chạy test phải có SQL Server và quyền tạo database. `MEDICARE_TEST_SQL_BASE` chỉ cấu hình server/kết nối, không chứa Database.

Các script Playwright cũ trong package.json là tài liệu/harness lịch sử; không coi chúng là bằng chứng cho luồng đăng nhập hiện tại nếu chưa cập nhật và chạy lại.

## Giới hạn đã biết

Chưa hoàn thiện toàn bộ ứng dụng: một số thao tác phụ ở bàn nội trú, chuyển tuyến và hẹn tái khám từ bàn bác sĩ vẫn ở frontend. Không coi thông báo của các nhánh đó là đã lưu SQL. Chưa có tích hợp thanh toán ngân hàng, giám định BHYT, tương tác thuốc, chữ ký số hoặc kết nối LIS/PACS thực tế.

Bản kiểm tra gần nhất đạt91 test tự động và build; kiểm thử click/reload toàn bộ giao diện hiện tại chưa hoàn tất. Chưa nghiệm thu vận hành với dữ liệu y tế thật.

## Cập nhật giao diện và dữ liệu demo 24/11/2026

- Bác sĩ nhập chẩn đoán trực tiếp, không bắt buộc chọn ICD-10; kiểm tra thiếu triệu chứng/chẩn đoán trước khi khóa khám.
- Điều dưỡng có tab Phiếu sinh hiệu và lối tắt Ghi sinh hiệu từ lịch sử.
- Biểu mẫu tiếp đón có gợi ý 34 tỉnh/thành và 3.321 phường/xã/đặc khu, vẫn cho nhập địa chỉ tự do. Dữ liệu từ https://provinces.open-api.vn/api/v2/.
- Script `scripts/add-qa-demo-services.mjs`, `scripts/add-qa-demo-medicines.mjs`, `scripts/add-qa-demo-icd10.mjs` chỉ ghi database QA được lưu trong `.data/QA_TEST_workspace_session.json`. Chúng không thay thế danh mục chuyên môn thực tế.

### Chia sẻ demo

Sau khi tạo QA, chạy `npm run build`, rồi `node scripts/share-demo.mjs`. Server bind loopback 5188; có thể dùng tunnel HTTPS tới cổng này. Đây là server demo riêng, không thay thế `npm start`.

**Server chia sẻ demo công khai danh sách tài khoản QA và mật khẩu tại `/__qa/login-accounts`, gồm cả Admin, theo lựa chọn chia sẻ demo.** Người có link có thể sửa dữ liệu QA. Không dùng server này với bệnh nhân thật, tài khoản thật hoặc database làm việc. Không đưa `.data/`, `.env.local` hay mật khẩu lên Git. Khi không chạy endpoint demo, giao diện không có tài khoản/mật khẩu dự phòng.
