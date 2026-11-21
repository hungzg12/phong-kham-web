# Kiểm chứng MediCare — 21/11/2026

Trạng thái: **DONE_WITH_CONCERNS**. Đây là bản React/Vite + SQL Server hiện tại, không phải bản Next.js/PostgreSQL cũ.

- Chạy đủ `node --test --test-concurrency=1 tests/*.test.mjs`: **91/91 đạt**, không bỏ qua.
- `npm run build`: đạt; còn cảnh báo bundle site lớn hơn500kB.
- Kiểm tra bao gồm quản trị, lịch hẹn, tiếp đón/khám, sinh hiệu/y lệnh, CLS, dược/kho, tài chính, cổng bệnh nhân, phiên thật và ma trận quyền8 vai trò.
- Có ca cạnh tranh/hoàn tác SQL, idempotency, giới hạn bác sĩ, hồ sơ bệnh nhân liên kết, CSRF, giả mạo vai trò, đăng xuất/thu hồi và phản hồi cũ đến muộn.
- Dữ liệu test chỉ ghi ở database `MediCareQA_Admin_*` với hồ sơ QA_TEST, không reset hoặc ghi thử vào database làm việc.
- Render React tĩnh đã kiểm tra. Chưa đánh PASS cho click/reload toàn bộ UI: công cụ trình duyệt trong phiên không khả dụng. Các bằng chứng Edge của đợt quản trị trước được ghi riêng trong [docs/ADMIN-VERIFICATION.md](docs/ADMIN-VERIFICATION.md), không suy rộng cho giao diện vừa thay đổi.

Chưa hoàn tất một số nhánh nội trú/chuyển tuyến/tái khám phụ chỉ đổi frontend; xem [docs/WORKSPACE-ACCESS.md](docs/WORKSPACE-ACCESS.md). Tài khoản và mật khẩu QA được tạo riêng trên từng máy và không có trong Git.
