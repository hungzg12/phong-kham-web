# Đăng nhập và quyền nghiệp vụ hiện tại

Áp dụng cho entry Vite của `phong-kham-web`, đang chạy tại
http://127.0.0.1:5176/#management. Không áp dụng tài liệu Next.js/PostgreSQL cũ.

## Tài khoản

Không còn đăng nhập bằng cách chọn tác nhân. Màn hình nghiệp vụ dùng tên đăng
nhập/mật khẩu và phiên cookie HttpOnly của cơ chế quản trị hiện có. Khi tải lại,
`GET /api/workspace/session` kiểm tra phiên, tài khoản, vai trò và hồ sơ liên kết
trong SQL. Các khóa sessionStorage cũ không cấp quyền.

Quản trị viên dùng màn hình Tài khoản/Vai trò hiện có ở
http://127.0.0.1:5180 để cấu hình. Nếu máy chủ quản trị đang chạy tiến trình cũ,
dùng http://127.0.0.1:5176/#administration để thấy biểu mẫu mới mà không cần dừng
tiến trình cũ.

| Vai trò nghiệp vụ | Hồ sơ phải liên kết |
| --- | --- |
| Tiếp tân (`receptionist`) | Nhân viên `QUAN_TRI` đang hoạt động; schema hiện tại không có chuyên môn TIEP_TAN |
| Bác sĩ (`doctor`) | Nhân viên `BAC_SI` đang hoạt động, có phân công lượt/đợt |
| Điều dưỡng (`nurse`) | Nhân viên `DIEU_DUONG` đang hoạt động |
| Kỹ thuật viên CLS (`technician`) | Nhân viên `KY_THUAT_VIEN` đang hoạt động |
| Dược sĩ (`pharmacist`) | Nhân viên `DUOC_SI` đang hoạt động |
| Thu ngân (`cashier`) | Nhân viên `THU_NGAN` đang hoạt động |
| Bệnh nhân (`patient`) | Mã bệnh nhân thực tế trong trường Mã hồ sơ bệnh nhân; không gắn đồng thời nhân viên |
| Quản trị viên (`admin`) | Quản trị tài khoản/danh mục; không tự có quyền hồ sơ chuyên môn |

Vai trò chuẩn được nhận diện bằng mã. Vai trò tùy chỉnh có thể chọn trường
**Vai trò nghiệp vụ** trên biểu mẫu Vai trò hiện có. Chỉ quản trị viên hệ thống
được đổi vai trò nghiệp vụ và hồ sơ liên kết. Không tự tạo tài khoản, phân công,
bệnh nhân hay dữ liệu thuốc vào database làm việc để lấp chỗ thiếu.

## Kiểm soát API

- API nghiệp vụ yêu cầu phiên hợp lệ; endpoint chưa được cho phép bị từ chối.
- API ghi yêu cầu CSRF và kiểm tra Origin nếu trình duyệt gửi Origin.
- `role`, `staffId`, `doctorStaffId` gửi từ client bị thay bằng danh tính của phiên.
- Bác sĩ chỉ đọc/ghi lượt khám theo phân công và đợt do mình phụ trách.
- Cổng bệnh nhân lấy mã hồ sơ từ tài khoản; không cố định BN0001, không chọn theo
  điện thoại hoặc query/body do client gửi.
- Điều dưỡng chỉ nhận phần danh mục/tồn kho cần cho thực hiện y lệnh; không nhận
  đơn thuốc, phiếu kho và sổ kho của dược sĩ qua snapshot đó.
- Quản trị viên không mặc nhiên là bác sĩ. Tài khoản nghiệp vụ không được kế thừa
  quyền quản trị chỉ vì biết đường dẫn quản trị.
- Đăng xuất thu hồi phiên trên máy chủ và bỏ dữ liệu nghiệp vụ trong bộ nhớ.
  Không xóa localStorage. Phản hồi của phiên cũ đến muộn bị bỏ qua.
- Các đường ghi PowerShell cũ không được dùng để vượt qua cơ chế phiên hoặc ghi
  sang database cố định. Máy chủ quản trị production 5180 vẫn chỉ bật API quản trị.

## Dược: quy đổi và hoàn thuốc

Đơn kê có thể chọn đơn vị đang có đúng một quy tắc `QuyDoiDonVi` hiệu lực. Số
lượng cấp được chuyển sang đơn vị cơ sở; số lượng đã cấp trên đơn giữ theo đơn
vị kê. Quy tắc thiếu, mơ hồ hoặc lượng cơ sở không biểu diễn chính xác bị từ chối.

Trong Phiếu nhập xuất, chọn **Hoàn trả** và nhập mã **dòng cấp gốc** hiển thị ở
chi tiết phân bổ của đơn. Số lượng hoàn là đơn vị cơ sở. API đối chiếu đúng mặt
hàng/lô/kho và lượng đã cấp còn có thể trả, lưu `maChiTietGoc`, `maPhieuGoc`,
`soLuongDaHoan` và sổ kho. Không dùng hoàn trả để tự tạo một lô tùy ý. Hoàn thuốc
hết hạn hoặc vào lô khóa bị chặn; chưa có quy trình cách ly thuốc trả.

## Kiểm thử và giới hạn

Chạy `node --test --test-concurrency=1 tests/workspace-access.test.mjs` để kiểm
thử phiên thật của 8 vai trò. Chạy `tests/pharmacy.test.mjs` để kiểm tra SQL dược.
Fixture luôn tạo database riêng `MediCareQA_Admin_*` và dữ liệu giả QA_TEST.
`trustedTest` chỉ là tùy chọn của harness nội bộ; khởi tạo với database làm việc
sẽ bị từ chối, không phải query/header được client bật.

Chưa kết luận hoàn thiện toàn bộ ứng dụng: nhiều thao tác phụ trong bàn nội trú
và các module trình diễn (chuyển tuyến, hẹn tái khám từ bàn bác sĩ, lưu tờ điều
trị…) vẫn còn dùng frontend và cần nối SQL/kiểm thử riêng. Không xem việc đổi
trạng thái trong các module đó là đã lưu database. Kiểm thử bấm/reload trình
duyệt chưa thực hiện được do công cụ phiên hiện tại không truy cập an toàn được
đúng cửa sổ. Thiếu tài khoản/nhân viên/kho trong database làm việc vẫn là BLOCKED.
