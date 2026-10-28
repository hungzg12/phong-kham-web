# Kết quả kiểm tra ngày 25 tháng 10 năm 2026

- TypeScript `npm run typecheck`: đạt.
- 17 kiểm thử nghiệp vụ `npm test`: đạt.
- Production build `npm run build`: đạt.
- Kiểm thử bằng giao diện với bệnh nhân, lễ tân, bác sĩ và quản trị viên: đạt.
- Luồng đặt lịch, xác nhận, tiếp nhận, khám, lưu nháp, kê đơn, công bố và xem kết quả: đạt.
- Bệnh nhân không đọc được phiếu nháp. Lễ tân và quản trị viên không nhận nội dung chuyên môn: đạt.
- Tạo và cập nhật danh mục, màn hình phân quyền, ca làm việc, thuốc và thống kê: đạt.
- Bố cục 390 px và hộp thoại đặt lịch không làm tràn chiều ngang trang: đạt.
- Hai yêu cầu đặt chỗ cuối cùng chạy đồng thời qua API và PostgreSQL: đúng một yêu cầu thành công, yêu cầu còn lại nhận HTTP 409.
- Đăng ký có trường vai trò giả mạo vẫn chỉ tạo bệnh nhân; thay mật khẩu thu hồi phiên: đạt.
- Chặn yêu cầu ghi dữ liệu khác Origin: đạt.
- PostgreSQL riêng có 12 bảng, dữ liệu giữ nguyên sau khi khởi động lại.
- Không có lỗi JavaScript chưa xử lý trong các luồng trình duyệt đã kiểm tra.

Đã kiểm tra trên máy này bằng Chromium, Next.js và PostgreSQL. Chưa triển khai tên miền công khai, chưa đánh giá tải nhiều phòng khám hoặc vận hành với dữ liệu y tế thật. Các giả định nghiệp vụ và giới hạn được ghi trong README.md.

## Hoàn tất bổ sung

- Bản build tối ưu đã được kiểm tra đăng nhập bằng trình duyệt và đang chạy tại cổng 3000.
- Bộ mở website đã chạy thử ở cổng 3002, kiểm tra kết nối cơ sở dữ liệu, tự build và mở máy chủ nền; bộ tắt xác minh tiến trình và tắt đúng máy chủ đã mở.
- Kiểm tra nhắc lịch theo thời điểm hẹn, quyền người nhận, chống lặp và bỏ qua lịch hủy: đạt.
- Kiểm tra phiên hết hạn khi đang mở kết quả khám, sau đó đăng nhập lễ tân không còn thấy dữ liệu chuyên môn cũ: đạt.
- Kiểm tra lễ tân xác nhận ở phiên khác, trình duyệt bệnh nhân nhận cập nhật khi quay lại tab: đạt.
- Mã lịch hẹn hiển thị trên lịch của bệnh nhân để phân biệt các lần khám cùng bác sĩ.


## Đối chiếu bổ sung với Word ngày 28/10/2026

- Lịch hẹn: Chờ xác nhận → Đã xác nhận → Đã tiếp nhận; các nhánh Hủy/Từ chối độc lập.
- Lượt khám: Chờ khám → Đang khám → Hoàn tất. Hoàn tất khám giữ lịch hẹn ở Đã tiếp nhận.
- Màn hình Tiếp nhận & điều phối dành cho lễ tân và Khám bệnh dành cho bác sĩ.
- Phiếu nháp riêng tư; hoàn tất khóa phiếu và công bố kết quả. Gửi lại yêu cầu hoàn tất không tạo thông báo lặp.
- Không bắt buộc kê thuốc; nếu có thuốc, cần hướng dẫn sử dụng trước khi công bố.
- Migration 002 chuyển dữ liệu trạng thái cũ, giữ nguyên lịch hẹn, lượt khám và hồ sơ.
- Đã đạt: 17 kiểm thử nghiệp vụ, TypeScript, production build, kiểm thử trình duyệt bốn vai trò, hai trang mới, phiên đăng nhập và tích hợp PostgreSQL.

## Chuẩn bị hosting ngày 28/10/2026

- Kiểm thử khởi tạo hosting trên database PostgreSQL trống: đạt; chỉ tạo một quản trị riêng, không tạo tài khoản hoặc hồ sơ mẫu.
- Chạy lại bootstrap không đổi mật khẩu hoặc tạo tài khoản trùng: đạt.
- Chặn DEMO_MODE=true và dữ liệu quản trị không hợp lệ, không ghi mật khẩu vào log: đạt.
- Bộ e2e, session-ui, workflow-ui, integration và 17 kiểm thử nghiệp vụ: đạt.
- Production build và TypeScript: đạt. HTTP 200, X-Content-Type-Options=nosniff và X-Frame-Options=DENY: đạt.
- Chưa xác minh Render Live; cần liên kết tài khoản hosting của chủ repository.
