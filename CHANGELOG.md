# Changelog

## [Unreleased] - 2026-11-24

- Cải thiện tiếp đón, tìm bệnh nhân và giới hạn dữ liệu tiếp tân theo quyền.
- Thêm chọn tỉnh/phường/xã, icon quản trị theo chức năng và tab sinh hiệu điều dưỡng.
- Cho bác sĩ nhập chẩn đoán trực tiếp, làm rõ kiểm tra dữ liệu khi gửi CLS và khóa khám.
- Bổ sung script dữ liệu QA và máy chủ chia sẻ demo có danh sách tài khoản công khai.


## [1.0.1.0] - 2026-10-28

### Added
- Có thể triển khai cả website và PostgreSQL bằng Blueprint Render.
- Tự tạo quản trị viên riêng khi khởi động hosting lần đầu, giữ dữ liệu khi deploy lại.
- Kiểm tra tự động trên GitHub cho nghiệp vụ, build và khởi tạo hosting.

### Changed
- Bổ sung các HTTP header bảo vệ trang và tài liệu thiết lập bản công khai.
