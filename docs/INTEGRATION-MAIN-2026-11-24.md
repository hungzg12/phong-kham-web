# Hợp nhất main — 24/11/2026

- Điểm lưu local trước merge: d7080e4 trên integration/medicare-20261124.
- Nhánh GitHub đã ghép: origin/main tại 124f597 (7 commit mới).
- Giải quyết 6 file: server/clinic-flow.mjs; src/ClinicalDesk.jsx; src/Inventory.jsx; src/LabDesk.jsx; src/ReceptionForm.jsx; src/main.jsx.
- Giữ gọi số, vé STT, thứ tự hàng đợi và trạng thái điều phối từ main; giữ quyền SQL, mã khoa động, phân công theo mã bác sĩ và giao diện local.
- Nối quyền API cho gọi/tạm hoãn/khôi phục; kỹ thuật viên chỉ chuyển trạng thái kết quả của lượt đã có kết quả do mình phát hành. Bác sĩ không được mở rộng phạm vi bằng payload giả.
- Sửa lỗi dùng DonThuoc.trangThai (không tồn tại) thành trạng thái cấp phát; không chuyển lượt khi chỉ lập nháp quyết toán. Chỉ chuyển trạng thái trong transaction xác nhận. Bỏ PATCH dư sau cấp thuốc/quyết toán.
- Script trạng thái lượt khám chỉ chạy vào database QA đã lưu; transaction, kiểm tra dữ liệu và không reset. Đã chạy hai lần an toàn. Database làm việc không thay đổi.
- Build PASS: .data/integration-build.log; toàn bộ test 141/141 PASS: .data/integration-tests-final.tap; render riêng 18/18 PASS: .data/integration-render.tap.
- Kiểm thử dùng database QA riêng. Không xóa dữ liệu, đổi mật khẩu hoặc tạo lại tài khoản đang dùng.
- Trình duyệt local không kết nối được trong chat, nên thao tác UI và âm thanh/màn hình gọi số thực tế chưa được xác nhận. Không tuyên bố kiểm chứng vận hành thực tế.
- Không push hoặc force push trong lần hợp nhất này.
