# Bàn giao quản trị MediCare — 21/11/2026

**Trạng thái: DONE_WITH_CONCERNS.** Phạm vi thực hiện là task quản trị viên trong file yêu cầu thứ hai. Chưa hoàn thành mục tiêu vận hành toàn bộ phòng khám trong file thứ nhất.

## Kết quả đã kiểm chứng

| Hạng mục | Kết quả |
| --- | --- |
| `npm run build` | Đạt. Entry quản trị độc lập khoảng 164 kB JS trước gzip, khoảng 53 kB gzip; không tải parser Excel hoặc màn hình nghiệp vụ cũ. Bundle site cũ còn cảnh báo lớn hơn 500 kB. |
| `npm run test:admin` | 19/19 nhóm đạt, không bỏ qua. SQL Server thật, database riêng cho mỗi lượt chạy. |
| `npm run test:admin-ui` | 16/16 kiểm tra đạt trên Edge, desktop 1440×1000 và điện thoại 390×844. Không có pageerror; không tràn ngang toàn trang. |
| Backup và restore | COPY_ONLY, checksum, VERIFYONLY đạt; phục hồi sang database mới và đối chiếu nguyên trạng thái quản trị, số bản ghi nhật ký đạt. Từ chối ghi đè database đã tồn tại. |
| Máy chủ local | http://127.0.0.1:5180/api/health trả 200, status=ok, database=SQL Server, scope=administration. |
| Database đang làm việc | Đã backup trước migration. Chỉ thêm cấu trúc quản trị, rowversion và quản trị viên đầu tiên; không xóa dữ liệu nghiệp vụ. |
| Kiểm tra diff | `git diff --check` đạt. Chưa commit hoặc push. |
| Dependency | npm audit còn 1 dependency high: xlsx 0.18.5, gồm hai advisory. Chưa có bản vá trên npm registry; không chạy parser này trong entry quản trị production. |

Bằng chứng gần nhất:

- API: `qa/admin/api-results.txt`, database `MediCareQA_Admin_934583c57b1f414f`.
- Restore đã đối chiếu: `MediCareRestore_cc7f12be16a81ac2`.
- UI: `qa/admin/ui-results-final.txt`, `qa/admin/ui-result.json`, database `MediCareQA_Admin_beb95eafed0a7adf`.
- Ảnh: `qa/admin/accounts-desktop.png`, `qa/admin/accounts-mobile.png`.
- Dependency: `qa/admin/npm-audit.json`.
- Đường dẫn bản backup trước migration local: `.data/admin-pre-migration-backup.json`.
- Thông tin đăng nhập local: `.data/admin-access.txt`; mật khẩu không ghi trong báo cáo hoặc Git.

Database test và bản backup được giữ nguyên làm bằng chứng. Không có bài test ghi nào chạy trên database nghiệp vụ hiện có. Việc khởi tạo quản trị local được thực hiện riêng sau khi sao lưu.

## Bảng chức năng

| Chức năng | Trước cập nhật | Hiện tại | Nguồn dữ liệu |
| --- | --- | --- | --- |
| Dashboard quản trị | Giao diện demo và dữ liệu đồng bộ không đầy đủ | Thống kê SQL, lọc ngày; phân biệt trong kỳ/hiện tại; tải/lỗi/thử lại | Các bảng nghiệp vụ SQL |
| Tài khoản | Dữ liệu mẫu frontend, không dùng để xác thực | Tạo/sửa/tìm/lọc/phân trang, khóa/mở, đặt lại/đổi mật khẩu, thu hồi phiên | MediCareAdminState |
| Vai trò | Chỉ ẩn menu/nút frontend | Quyền được kiểm tra trên từng API; chặn nâng quyền qua quản lý tài khoản; thu hồi phiên khi đổi vai trò | MediCareAdminState |
| Nhân viên | Sửa bộ nhớ frontend | CRUD không xóa, kiểm tra khoa, trạng thái, liên kết tài khoản và nghiệp vụ đang mở | NhanVien |
| Khoa | Danh mục mẫu | CRUD không xóa, kiểm tra liên kết đang hoạt động | Khoa |
| Phòng khám/buồng bệnh | Danh mục mẫu gộp | Phân loại riêng, quản lý công suất và khoa; chặn ngừng khi đang sử dụng | BuongKham/BuongBenh |
| Giường | Mô phỏng/SQL một phần | Quản lý danh mục; chặn thay đổi giường đang dùng/chờ vệ sinh, trùng số, vượt công suất | GiuongBenh/PhanGiuong |
| Dịch vụ/giá | Thay đổi bộ nhớ; chưa có lịch sử giá | Ghi SQL, lịch sử giá có thời điểm hiệu lực ngay; giữ nguyên giá chỉ định đã lập | DichVuKyThuat/MediCareServicePriceHistory |
| Cấu hình | Chưa có lưu trữ quản trị thực | Tên/địa chỉ/liên hệ/giờ làm lưu SQL; dùng tên cơ sở ở header; endpoint công khai chỉ chứa cấu hình cơ sở | MediCareAdminState |
| Nhật ký | Mảng frontend giới hạn | Ghi cùng transaction, chi tiết trước/sau, tìm/lọc/phân trang/xuất; không có API sửa/xóa | MediCareAdminAudit |
| Sao lưu/khôi phục | Chưa có quy trình phù hợp runtime hiện tại | CLI COPY_ONLY, kiểm tra checksum và restore sang database mới; đã chạy kiểm chứng | SQL Server backup |

## Ca kiểm thử trọng yếu

Đã kiểm tra: không đăng nhập; sai mật khẩu; khác Origin; thiếu CSRF; sai quyền; truy cập API trực tiếp; khóa/hạ quyền quản trị cuối cùng; tài khoản bị khóa với cookie cũ; đổi quyền; reset mật khẩu và từ chối mật khẩu cũ; phiên hết hạn; người được ủy quyền không reset được mật khẩu admin; hai sửa đồng thời chỉ một thành công; gửi lặp không nhân bản; mã trùng; số âm; liên kết không hợp lệ; phòng có lịch chưa kết thúc; giường có phân giường đang mở; dịch vụ có chỉ định đang mở; đổi đơn giá không đổi donGiaApDung cũ; dữ liệu sau restart; SQL mất kết nối trả 503 không lộ chi tiết; nhật ký không có mật khẩu/token; không xóa dữ liệu localStorage cũ khi khởi tạo.

Giao diện đã kiểm tra: đăng nhập thật, tạo/sửa/trùng mã khoa, giữ dữ liệu sau tải lại, mở 11 màn hình, lưu cấu hình, tạo/tìm tài khoản, xuất CSV, reset mật khẩu, khóa và mở khóa, xác nhận đăng nhập bị chặn/được phép tương ứng, đăng xuất, desktop và điện thoại.

## Bốn bộ kiểm thử demo cũ

Đã chạy trên `vite preview` local với `MEDICARE_URL=http://127.0.0.1:52791/#management`. Preview không có API SQL; lựa chọn này tránh để test cũ ghi vào database đang làm việc. Vì vậy đây là kiểm tra khả năng tương thích bản demo tĩnh, không phải kiểm thử tích hợp nghiệp vụ.

| Bộ test | Kết quả quan sát |
| --- | --- |
| test:e2e | Mở được sáu màn hình đầu; dừng vì không tìm thấy tab `Tờ điều trị & y lệnh` theo selector cũ. |
| test:actors | Phần menu/đăng nhập admin demo đạt; dừng khi cần bệnh nhân mẫu `Nguyễn Thị Mai BN0001`, trong khi fixtures hiện rỗng và preview không có SQL. |
| test:frontend | Thất bại: khóa `medicare-workspace-v3` không được bản SQL hiện tại tạo, nên snapshot null. Các kỳ vọng migration mẫu cũ không còn khớp runtime. |
| test:profile | Thất bại: hồ sơ demo đổi trong bộ nhớ nhưng không giữ tên sau reload; workspace SQL hiện tại không lưu hồ sơ demo vào localStorage như test cũ yêu cầu. |

Không sửa các bộ test này thành luôn đạt và không tuyên bố chúng đã đạt. Phần hồ sơ demo, migration dữ liệu frontend cũ và nghiệp vụ chuyên môn còn cần xử lý ở task tương ứng.

## Các điều kiện chưa đạt để vận hành toàn hệ thống

1. Backend chuyên môn cũ chưa có xác thực/phân quyền thống nhất và một số thao tác frontend vẫn chỉ đổi bộ nhớ. Các endpoint đó chưa được bật trong máy chủ quản trị production.
2. Ma trận quyền quản trị không thay thế ma trận quyền hồ sơ bệnh nhân theo tác nhân; chưa có migration các tài khoản cũ sang cơ chế xác thực mới.
3. Chưa hỗ trợ đơn giá có lịch hiệu lực tương lai. Chưa áp dụng giờ làm cấu hình vào các khung giờ đặt lịch cũ.
4. Chưa kiểm thử toàn luồng khám → CLS → thuốc → thanh toán → nội trú → người bệnh trên database riêng với backend bảo mật mới.
5. Dependency xlsx của bản nghiệp vụ cũ còn advisory; bundle site cũ còn lớn.
6. Chưa triển khai HTTPS công khai, quyền SQL tối thiểu, lịch backup/retention ngoài máy, log độc lập, giới hạn đăng nhập chia sẻ giữa nhiều máy chủ hoặc kiểm thử tải.
7. Cần cơ sở nghiệm thu nghiệp vụ và yêu cầu bảo vệ dữ liệu trước khi nhập thông tin bệnh nhân thật.

## Ghi nhận kỹ thuật để tiếp tục

- SQL Server `rowversion` cần chuyển rõ sang varbinary(8) trước khi chuyển hex; CONVERT trực tiếp timestamp sang varchar có thể trả chuỗi nhị phân và làm kiểm tra phiên bản thất bại.
- File SQL schema có UTF-8 BOM; runner chia batch cần loại BOM trước khi gửi qua driver.
- Repository đang chứa hai nền tảng ứng dụng khác nhau. Căn cứ package.json và entry thực tế để chọn tài liệu; không dùng báo cáo Next.js/PostgreSQL cũ làm bằng chứng cho Vite/SQL Server.
- Giữ ô tìm kiếm được mount trong khi tải danh sách để không làm mất focus sau mỗi ký tự.
