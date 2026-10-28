# Chạy website công khai trên Render

Project cần Node.js 24 và PostgreSQL. GitHub Pages không chạy được API và cơ sở dữ liệu của ứng dụng này.

[Triển khai từ repository GitHub](https://dashboard.render.com/select-repo?type=blueprint&repo=https://github.com/hungzg12/phong-kham-web)

## Khởi tạo

1. Đăng nhập Render bằng tài khoản GitHub có quyền truy cập repository.
2. Tạo Blueprint từ repository `hungzg12/phong-kham-web`, nhánh `main`, file `render.yaml`.
3. Kiểm tra tài nguyên gồm một Web Service và một PostgreSQL ở Singapore. File cấu hình chọn gói `free` cho cả hai; kiểm tra chi phí trên màn hình trước khi tạo.
4. Nhập `ADMIN_EMAIL` và `ADMIN_PASSWORD` riêng, mật khẩu từ 12 ký tự. Tên đăng nhập quản trị mặc định là `admin`.
5. Deploy. Chờ trạng thái Live và mở URL HTTPS do Render cấp. Đăng nhập bằng thông tin vừa nhập.

Render tự sinh SESSION_SECRET, kết nối DATABASE_URL qua mạng nội bộ và đặt DEMO_MODE=false. Không tải `.env.local`, `.data` hoặc cơ sở dữ liệu từ máy cá nhân lên hosting. Bản công khai khởi tạo dữ liệu trống; tài khoản demo local không tồn tại trên bản này.

## Thiết lập phòng khám lần đầu

Quản trị tạo chuyên khoa, bác sĩ, ca làm việc, danh mục thuốc, tài khoản lễ tân và bác sĩ. Tài khoản bác sĩ cần liên kết đúng hồ sơ bác sĩ. Bệnh nhân đăng ký tài khoản để đặt lịch; lễ tân cũng có thể tạo hồ sơ hành chính và đặt lịch giúp bệnh nhân.

## Kiểm tra sau deploy

- `/api/health` trả HTTP 200 và `status: ok`, chứng tỏ kết nối và khởi tạo PostgreSQL thành công.
- Trang đăng nhập không hiện nút điền tài khoản demo.
- Đăng nhập quản trị riêng; kiểm tra tạo chuyên khoa và dữ liệu còn sau restart.
- Kiểm tra luồng đặt lịch → xác nhận → tiếp nhận → bắt đầu khám → lưu nháp → hoàn tất → bệnh nhân xem kết quả.
- GitHub Actions kiểm tra nghiệp vụ, khởi tạo hosting, build và TypeScript cho mỗi lần push/PR.

## Cập nhật và giới hạn

Các lần deploy sau giữ nguyên tài khoản, mật khẩu và dữ liệu. Thay `ADMIN_PASSWORD` trong môi trường không đặt lại mật khẩu tài khoản đã có; đổi mật khẩu qua website.

Gói Render miễn phí có thể ngủ sau 15 phút không có truy cập; lần mở tiếp theo cần thời gian khởi động. PostgreSQL miễn phí hết hạn sau 30 ngày, cần xuất dữ liệu hoặc chọn phương án lưu trữ phù hợp trước hạn. Tham khảo https://render.com/docs/free. Chưa cấu hình sao lưu cloud hoặc đánh giá tải vận hành cho dữ liệu y tế thật.

Thông báo nằm trong ứng dụng; chưa gửi email/SMS. Chỉ kết luận website đã triển khai sau khi Render báo Live và kiểm tra HTTPS thực tế đạt.
