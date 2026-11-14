# Giao diện nghiệp vụ bổ sung

Mở hệ thống với vai trò nhân viên, chọn Nghiệp vụ bổ sung. Quản trị viên thấy 24 màn hình; vai trò khác thấy các màn hình liên quan. Có lối tắt tại Lịch hẹn, Tiếp đón, Cận lâm sàng, Chăm sóc, Tài chính, Bệnh án, Quản trị và Thiết bị.

Mỗi màn hình có: tạo biểu mẫu, sửa ở trạng thái đầu, tìm kiếm, lọc trạng thái, phân trang, xuất CSV, xem chi tiết, chuyển bước có lý do, hủy có lý do và lịch sử. Dữ liệu nằm trong business.operations của kho localStorage medicare-workspace-v3. Nhật ký cũng ghi vào business.audit.

Các sổ theo dõi này không thay thế dữ liệu nghiệp vụ gốc và không thực thi thao tác lâm sàng hoặc giao dịch thật. Thành công thanh toán được ghi rõ là giả lập, không đổi trạng thái quyết toán. Không có kết nối ngân hàng, LIS/PACS, sao lưu máy chủ, chữ ký pháp lý hay xác thực tài khoản thật. Không nhập dữ liệu người bệnh thật.

Ngày biểu mẫu và ngày hệ thống dùng ngày trên thiết bị. SQL chưa kết nối. Các màn hình chuyên sâu là biểu mẫu điều phối minh họa, chưa phải bộ biểu mẫu chuyên môn được bệnh viện nghiệm thu.

Kiểm thử: node scripts/operations.mjs (cần dev server cổng 5175). Chạy trong trình duyệt tách biệt, kiểm tra 24 biểu mẫu và luồng trạng thái, lưu, lịch sử, hủy, mobile, vai trò và không thay đổi quyết toán.
