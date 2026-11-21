# Quản trị MediCare: cài đặt và vận hành

Phạm vi bản cập nhật ngày 21/11/2026 là quản trị viên. Runtime hiện tại là React 18/Vite, Node.js 24, Windows PowerShell và SQL Server. Mã Next.js/PostgreSQL còn trong repository không được các lệnh npm hiện tại chạy. README và VERIFICATION.md hiện mô tả bản Vite/SQL Server; các tài liệu Next.js/PostgreSQL khác là lịch sử.

## Cài trên máy sạch

1. Cài Node.js 24, Windows PowerShell và SQL Server 2019/2022. Tài khoản Windows chạy Node cần quyền truy cập database. Kiểm thử giao diện cần Microsoft Edge.
2. Chạy `npm ci` trong thư mục repository.
3. Tạo database theo `database/QuanLyBenhVien_SQLServer.sql` nếu chưa có database. Script gốc chỉ dành cho database trống. Không chạy lại vào database đang sử dụng.
4. Sao chép `.env.example` thành `.env.local`. Đặt chuỗi kết nối, ADMIN_EMAIL, ADMIN_PASSWORD riêng (12–128 ký tự). Không nhập dữ liệu bệnh nhân thật vào môi trường thử nghiệm.
5. Sao lưu database hiện có trước migration: `node scripts/admin-backup.mjs backup`. Lệnh tạo bản COPY_ONLY, có checksum và RESTORE VERIFYONLY; in đường dẫn trên máy SQL Server.
6. Chạy `npm run admin:init`. Lệnh kiểm tra schema, tạo ba bảng quản trị, thêm cột rowversion cho sáu danh mục và tạo lịch sử giá. Không xóa hoặc thay thế bảng, tài khoản hoặc dữ liệu nghiệp vụ hiện có. Chạy lại không đổi mật khẩu tài khoản đã tạo.
7. Chạy `npm run build`, rồi `npm start`. Mở http://127.0.0.1:5180. Cổng theo PORT trong môi trường hoặc `.env.local`.

Nếu database đã có dữ liệu, dùng schema đang có; chỉ chạy migration quản trị qua admin:init. Chuỗi kết nối được giữ ở server. `.env.local`, `.data`, `qa` không được commit.

## Hai chế độ chạy

| Lệnh | Phạm vi |
| --- | --- |
| `npm run dev -- --port 5176` | Bản phát triển Vite; `/#management` và `/#administration` dùng khung giao diện chung với phiên đăng nhập thật và quyền API. Một số module phụ còn frontend, xem docs/WORKSPACE-ACCESS.md. Chỉ bind loopback. |
| `npm run build` và `npm start` | Máy chủ quản trị độc lập, phục vụ admin.html và API xác thực/quản trị. Không phục vụ API nghiệp vụ cũ. Mọi đường dẫn HTML, kể cả /index.html và /#management, mở quản trị thật. |
| `npm run preview` | Chỉ xem giao diện tĩnh. Không có API; không dùng để vận hành hoặc đánh giá kết nối SQL. |

Bản production quản trị có entry riêng, không tải mã màn hình lâm sàng hoặc bộ đọc Excel của bản cũ. Không mở cổng Vite ra mạng để thay thế production.

## Tài khoản và quyền

- Bootstrap chỉ tạo một tài khoản quản trị riêng; không dùng tài khoản mẫu trong bảng TaiKhoan cũ. Tài khoản quản trị mới nằm trong MediCareAdminState.
- Mật khẩu băm scrypt với salt riêng; không có API đọc mật khẩu. Đổi/đặt lại mật khẩu thu hồi mọi phiên của tài khoản. Khóa tài khoản, đổi thông tin tài khoản hoặc cập nhật vai trò cũng thu hồi phiên liên quan.
- Phiên cookie HttpOnly, SameSite=Strict, tồn tại tối đa 8 giờ. Đăng nhập mới của cùng tài khoản thay phiên trước. Trong NODE_ENV=production cookie dùng Secure.
- API ghi yêu cầu JSON, kiểm tra Origin và mã CSRF. API quản trị kiểm tra quyền ở server. Bộ chọn vai trò demo không tạo phiên quản trị.
- Vai trò `admin` giữ đầy đủ quyền quản trị; hệ thống ngăn khóa/hạ quyền quản trị viên hoạt động cuối cùng. Chỉ admin được quản lý tài khoản admin và gán vai trò. Quyền chỉnh sửa tài khoản được ủy quyền không cho phép đặt lại mật khẩu admin.
- Tên quyền: `resource:view/create/edit/deactivate/export`. Nhật ký và dashboard chỉ có quyền đọc/xuất. Không có quyền xem hồ sơ chuyên môn trong bộ quyền quản trị.
- Vai trò được tạo sẵn: quản trị viên, tiếp tân, bác sĩ, điều dưỡng, dược sĩ, thu ngân, bệnh nhân. Các vai trò ngoài admin mặc định chưa có quyền quản trị. Đây là ma trận quản trị; không thay cho phân quyền chuyên môn của toàn hệ thống.
- Nhân viên liên kết phải đang hoạt động, một nhân viên chỉ liên kết một tài khoản. Khóa tài khoản liên quan trước khi ngừng nhân viên. Khi ủy quyền tạo/sửa danh mục, cấp quyền xem danh mục liên kết để biểu mẫu tải được lựa chọn.
- Đăng nhập sai bị giới hạn theo IP/tên đăng nhập trong tiến trình. Trước triển khai nhiều máy chủ cần giới hạn ở reverse proxy hoặc kho chia sẻ.

## Danh mục và dữ liệu

Khoa, phòng khám, buồng bệnh, giường, nhân viên và dịch vụ đọc/ghi trực tiếp các bảng SQL hiện có. Các biểu mẫu có tìm kiếm, trạng thái, phân trang, xuất CSV và kiểm tra dữ liệu ở server. Không có API DELETE; dùng ngừng hoạt động để giữ lịch sử.

Các cập nhật dùng rowversion, xung đột trả 409. Việc ghi trạng thái quản trị, ghi danh mục và nhật ký nằm trong cùng transaction. Mã thao tác chống gửi lại được giữ 24 giờ; cùng mã với nội dung khác bị từ chối. Quản trị đồng thời được tuần tự hóa qua revision của MediCareAdminState, phù hợp quy mô quản trị nhỏ; chưa đo tải đa cơ sở.

Chặn ngừng khoa khi còn danh mục hoạt động/đợt điều trị; chặn ngừng phòng khi còn lịch/lượt chưa kết thúc; chặn ngừng buồng khi còn giường hoạt động. Chặn thay đổi giường đang sử dụng hoặc chờ vệ sinh. Kiểm tra số giường theo công suất và số hiệu trùng trong buồng. Phân giường cho bệnh nhân và xác nhận vệ sinh thuộc nghiệp vụ điều dưỡng, không được giả lập từ màn hình quản trị.

Đơn giá có hiệu lực ngay khi lưu; thời điểm UTC và người thay đổi được ghi trong MediCareServicePriceHistory. Màn hình dịch vụ có lịch sử giá. Không hỗ trợ lên lịch áp dụng giá tương lai trong bản này. Không cập nhật donGiaApDung của chỉ định/chứng từ cũ.

Cấu hình tên/địa chỉ/điện thoại/giờ làm được lưu SQL và công bố qua `/api/facility`; tên cơ sở được dùng trong giao diện quản trị. Cấu hình giờ làm chưa thay thế các khung giờ cố định của luồng đặt lịch cũ.

Dashboard dùng số liệu SQL: bệnh nhân mới theo ngày tiếp nhận; lượt khám theo ngày cấp số; lịch hẹn theo ngày hẹn; thu trừ hoàn thành công theo ngày giao dịch. Giường và tồn kho là số hiện tại, ghi rõ trên giao diện. Tổng số lượng tồn chưa quy đổi các đơn vị mặt hàng khác nhau; không phải chỉ số mua hàng.

Nhật ký append-only qua API, có người thực hiện, thời điểm UTC, đối tượng và thay đổi trước/sau; có lọc ngày/tìm kiếm/phân trang/xuất CSV. Không ghi mật khẩu hoặc token. Quyền SQL của người vận hành vẫn có thể sửa bảng: cần tài khoản SQL runtime tối thiểu quyền, hạn chế DBA và cơ chế lưu log độc lập khi triển khai thật.

## Sao lưu và khôi phục

```powershell
node scripts/admin-backup.mjs backup
node scripts/admin-backup.mjs restore-new 'C:\SQLBackup\ten-ban-sao-luu.bak'
```

Backup tạo file tên riêng trong InstanceDefaultBackupPath trên máy SQL Server. Đây không phải file ở máy trình duyệt. Tài khoản dịch vụ SQL Server phải có quyền thư mục.

Restore chỉ tạo database mới có tiền tố MediCareRestore_, từ chối tên database đã tồn tại và không dùng WITH REPLACE. Script đọc tên logical file rồi MOVE sang file mới trong thư mục dữ liệu mặc định của SQL Server. Không tự đổi kết nối ứng dụng sang bản phục hồi. Kiểm tra số bản ghi, phiên bản trạng thái, danh mục và nhật ký trước khi quyết định chuyển đổi.

Rollback ứng dụng: giữ bản build trước và bản sao lưu trước migration. Dừng máy chủ, phục hồi sang database mới, kiểm tra rồi mới thay MEDICARE_SQL_CONNECTION và khởi động bản phù hợp. Không DROP cột hoặc bảng để rollback trên dữ liệu đang dùng.

Thiết lập lịch sao lưu, mã hóa, nơi lưu ngoài máy chủ, thời gian giữ bản sao và kiểm thử phục hồi định kỳ trước vận hành. Bản cập nhật này cung cấp lệnh và đã kiểm chứng phục hồi; chưa tự tạo lịch sao lưu cho cơ sở.

## Kiểm thử

```powershell
npm run build
npm run test:admin
npm run test:admin-ui
```

Mỗi bộ test tự tạo database `MediCareQA_Admin_<random>` và chỉ ghi dữ liệu giả tại đó. Test sao lưu phục hồi sang `MediCareRestore_<random>` riêng. Không dùng database đang làm việc để kiểm thử ghi. Database và backup test được giữ lại làm bằng chứng, không tự xóa. MEDICARE_TEST_SQL_BASE có thể đổi instance, nhưng không được chứa Database= hoặc Initial Catalog=.

Ảnh và kết quả UI: `qa/admin/`. Các bộ test cũ test:e2e/test:actors/test:frontend/test:profile mô tả bản demo localStorage trước đó. Xem docs/ADMIN-VERIFICATION.md về kết quả và khác biệt; không dùng chúng để khẳng định production quản trị đã đạt.

## Trước khi mở ra Internet hoặc dùng bệnh nhân thật

- Chọn máy Windows/SQL Server, tạo tài khoản runtime có quyền tối thiểu. Hiện chưa kiểm thử Linux/Render.
- Đặt NODE_ENV=production, MEDICARE_PUBLIC_ORIGIN đúng HTTPS, reverse proxy TLS; không dùng MEDICARE_ALLOW_HTTP ở mạng công khai.
- Triển khai quản lý bí mật, giám sát, giới hạn request, lịch backup và kiểm thử tải phù hợp cơ sở.
- Xử lý dependency xlsx 0.18.5 của chức năng nhập ICD-10 cũ: npm audit hiện báo một dependency high với hai advisory, không có bản vá trên npm registry. Parser này không được tải bởi entry quản trị riêng, nhưng vẫn là vấn đề của bản nghiệp vụ cũ.
- Hoàn thiện xác thực/phân quyền backend, lưu SQL, transaction và kiểm thử xuyên suốt cho các phân hệ khám, dược, tài chính, nội trú và cổng bệnh nhân. Máy chủ quản trị hiện cố ý chưa bật các API cũ này.
- Nghiệm thu quy tắc chuyên môn, quyền truy cập hồ sơ và yêu cầu bảo vệ dữ liệu của cơ sở. Chưa có kết luận toàn hệ thống sẵn sàng phục vụ bệnh nhân thật.
