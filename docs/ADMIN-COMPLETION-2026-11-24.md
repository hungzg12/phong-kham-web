# Bổ sung quản trị — 24/11/2026

- Sidebar quản trị chỉ giữ Tổng quan và các mục Quản trị hệ thống; chuyển các tab ngang vào sidebar, giữ kiểm tra quyền API.
- Phân biệt Tổng quan bệnh viện và Thống kê quản trị.
- Thêm nút đổi mật khẩu trong giao diện nhúng, dùng API /api/auth/password hiện có. Không thay mật khẩu/tài khoản khi triển khai.
- Phân công ca khám dùng bảng PhanCongKham hiện có qua cơ chế catalog và audit/transaction/idempotency. Quyền kế thừa staff:view/create/edit/export hiện có; không tự thay dữ liệu vai trò. Danh mục cũ thêm cột rowversion nếu chưa có theo cơ chế migration catalog. Kiểm tra ngày, phòng/bác sĩ đúng khoa, chuyên môn, trạng thái; chặn trùng phòng/bác sĩ/điều dưỡng trong cùng ngày/ca đang phân công hoặc đang trực. Trạng thái Hoàn tất/Vắng mặt được giữ theo schema.
- Màn hình sao lưu dùng script admin-backup.mjs hiện có: COPY_ONLY/CHECKSUM và VERIFYONLY. Chỉ role quản trị hệ thống, có phiên/CSRF, thao tác ghi audit. Danh sách file do máy chủ đăng ký trong trạng thái quản trị SQL; không cho nhập đường dẫn .bak tùy ý hoặc tải dữ liệu ra browser.
- Phục hồi chỉ từ bản đã đăng ký, tạo database MediCareRestore_ mới; không WITH REPLACE, không đổi kết nối app, không xóa database cũ. Không chạy phục hồi thực tế trong lượt này. Registry chứa đường dẫn SQL server nên chỉ admin được xem.

## Kiểm chứng

- Build PASS.
- Toàn bộ bộ test: 128/128 PASS, 0 FAIL, 0 SKIPPED (.data/admin-completion-tests.tap).
- Sau sửa cuối: admin + roster + render 37/37 PASS; sau thêm bộ lọc trạng thái: build PASS, roster 2/2 PASS (.data/admin-roster-final.tap).
- Test roster trên database QA mới: lưu, đọc lại, idempotency, sai chuyên môn, trùng ca, sai ngày, sai CSRF, revision cũ và tiếp đón nhận đúng bác sĩ phân công.
- Test backup: chặn vô danh/CSRF sai, không phục hồi bản không đăng ký và không hỗ trợ thao tác ngoài danh sách.
- BLOCKED/chưa thực hiện: backup thành công với quyền SQL thực tế, phục hồi sang database mới, tương tác browser/preview responsive. Không đánh dấu các ca này PASS. Không ghi hồ sơ hoặc tạo chứng từ vào database đang làm việc.
- Không commit/push. Các thay đổi frontend trước đó được giữ nguyên.
