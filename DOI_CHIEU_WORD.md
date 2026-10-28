# Đối chiếu chức năng theo đề cương Word

Nguồn: Phan_tich_UML_phong_kham_day_du.docx do người dùng cung cấp.

| Use case | Chức năng trên website |
|---|---|
| UC01–05 | Đăng ký bệnh nhân, đăng nhập, đăng xuất, đổi mật khẩu, thông tin cá nhân |
| UC06–10 | Tra cứu bác sĩ/chuyên khoa/ca, đặt lịch, xem lịch, đổi lịch, hủy lịch |
| UC11–13 | Hồ sơ đã công bố, đơn thuốc và thông báo cá nhân |
| UC14–20 | Lịch bác sĩ, bệnh nhân được phân công, phiếu nháp, kê đơn, đề nghị tái khám, bắt đầu và hoàn tất khám |
| UC21–27 | Tài khoản, vai trò, bác sĩ, chuyên khoa, ca làm việc, thuốc, báo cáo |
| UC28–33 | Hồ sơ hành chính bệnh nhân, xác nhận, tiếp nhận, điều phối ca đang chờ, trạng thái lượt khám, in phiếu |

## Quy tắc đã triển khai

Lịch hẹn và lượt khám có hai vòng đời riêng. Mỗi lịch chỉ tạo một lượt khám, có số thứ tự theo ca. Điều phối chỉ khi đang chờ; bác sĩ chỉ sửa lượt được phân công. Bệnh nhân chỉ xem kết quả đã công bố. Lễ tân và quản trị không nhận nội dung chuyên môn. Đổi lịch về chờ xác nhận, sức chứa kiểm soát trong giao dịch PostgreSQL. Đề nghị tái khám không tự tạo lịch.

Thông báo nằm trong ứng dụng; nhắc lịch được tạo khi hệ thống đọc dữ liệu. Chưa gửi SMS/email. Không có viện phí, bảo hiểm, kho hay xét nghiệm ngoài phạm vi Word. Bản hiện tại chạy local.

## Xác minh

`npm test`: 17/17 đạt. TypeScript và production build đạt. Các bộ `e2e.cjs`, `integration.cjs`, `session-ui.cjs`, `workflow-ui.cjs` đạt ngày 28/10/2026. Các bộ kiểm thử dùng dữ liệu mẫu; không phải mọi biến thể của 33 use case đều có kiểm thử giao diện tự động riêng.
