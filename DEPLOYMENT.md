# Triển khai hiện tại

Runtime đang được package.json sử dụng là React/Vite + Node.js 24 + Windows PowerShell + SQL Server. Cấu hình Render/PostgreSQL trước đây không chạy được runtime hiện tại.

Xem [docs/ADMIN.md](docs/ADMIN.md) để cài đặt, migration, tạo quản trị viên, chạy máy chủ production, cấu hình HTTPS, sao lưu và phục hồi.

`npm start` chỉ bật phần quản trị đã có xác thực; các API lâm sàng cũ chưa được bật trên máy chủ này. Chưa triển khai công khai hoặc nghiệm thu vận hành với dữ liệu y tế thật.
