# An Tâm Clinic

Website quản lý phòng khám xây dựng từ tài liệu chức năng và báo cáo UML đã cung cấp. Ứng dụng dùng Next.js App Router, React, TypeScript, Tailwind CSS 4, PostgreSQL và giao diện tiếng Việt. Phạm vi gồm bốn vai trò: bệnh nhân, bác sĩ, lễ tân và quản trị viên; không gồm viện phí, thanh toán hoặc kho thuốc.

## Chạy trên máy hiện tại

Website: http://127.0.0.1:3000

Nhấp đôi `Chay-website.cmd`: chương trình tự kiểm tra phụ thuộc, khởi động PostgreSQL riêng, build nếu mã nguồn đã thay đổi, chạy bản tối ưu ở chế độ nền và mở trình duyệt. Không cần giữ cửa sổ lệnh mở. Nhấp `Dung-website.cmd` để tắt đúng tiến trình website của dự án.

Có thể dùng lệnh tương đương:

```powershell
npm run clinic:start
npm run clinic:stop
```

Để phát triển mã nguồn và xem thay đổi trực tiếp, chạy trong thư mục dự án:

```powershell
npm install
npm run db:start
npm run dev
```

`db:start` dùng bộ PostgreSQL đã cài trên Windows để khởi tạo một cụm RIÊNG trong `.data/postgres`, chỉ lắng nghe tại `127.0.0.1:55432`. Script không thay đổi dịch vụ PostgreSQL có sẵn tại cổng 5432. Mật khẩu ngẫu nhiên và khóa phiên được ghi vào `.env.local`, không xuất ra màn hình, không đưa vào Git hay gói mã nguồn.

Nếu dùng PostgreSQL có sẵn hoặc một máy chủ khác, tạo cơ sở dữ liệu trống dành riêng cho dự án và thiết lập `DATABASE_URL`, `SESSION_SECRET` và `DEMO_MODE` theo `.env.example`. Không chạy `db:start` khi đã chọn máy chủ riêng. Khởi động bằng `npm run dev`.

Nếu chưa cấu hình `DATABASE_URL`, chế độ phát triển dùng tệp `.data/clinic.json` để thử giao diện. Production yêu cầu PostgreSQL và không cho dùng tệp JSON thay thế.

Dừng bản nền bằng `Dung-website.cmd` hoặc `npm run clinic:stop`. Nếu dùng `npm run dev`, dừng bằng Ctrl+C tại cửa sổ chạy. Dừng cụm PostgreSQL riêng bằng `npm run db:stop`. Bộ tắt website xác minh đường dẫn và PID trước khi dừng, không tắt các ứng dụng khác.

## Tài khoản trải nghiệm

Chọn vai trò ở màn hình đăng nhập để điền tài khoản. Mật khẩu chung: `Clinic@123`.

| Vai trò | Tên đăng nhập |
|---|---|
| Bệnh nhân | benhnhan |
| Bác sĩ | bacsi |
| Lễ tân | letan |
| Quản trị viên | admin |

Mọi hồ sơ, lịch hẹn và thuốc được tạo sẵn đều là dữ liệu minh họa cho đồ án. Tài khoản chỉ được tạo khi bật chế độ demo. Dữ liệu mẫu được tạo một lần cho cơ sở dữ liệu mới; không ghi đè dữ liệu khi khởi động lại. Ngày mẫu tính theo thời điểm khởi tạo, múi giờ Việt Nam. Sau nhiều ngày có thể cần thêm ca mới ở vai trò quản trị.

## Thử quy trình đầy đủ

1. Vào tài khoản bệnh nhân, chọn Đặt lịch khám, chuyên khoa, bác sĩ, ngày, ca và giờ, nhập lý do rồi gửi yêu cầu.
2. Đăng xuất, vào tài khoản lễ tân. Mở Lịch hẹn khám, chọn đúng ngày, xác nhận lịch. Đến ngày khám, bấm Tiếp nhận để cấp số thứ tự. Điều phối chỉ áp dụng cho lượt đang chờ.
3. Đăng xuất, vào tài khoản bác sĩ. Bác sĩ mẫu được liên kết với Nguyễn Minh Anh. Chọn lượt được phân công, Bắt đầu khám, nhập phiếu và kê thuốc nếu cần.
4. Lưu bản nháp để tiếp tục chỉnh sửa hoặc chọn Hoàn tất khám, kiểm tra thông tin rồi Xác nhận hoàn tất. Phiếu công bố không được sửa trực tiếp.
5. Bệnh nhân vào Hồ sơ sức khỏe để xem kết quả và đơn thuốc đã công bố. Đề nghị tái khám không tự giữ chỗ; cần chọn ca và gửi yêu cầu mới.

Lễ tân có thể tạo hồ sơ cho bệnh nhân chưa có tài khoản, đặt thay, xác nhận, đổi, hủy, tiếp nhận, điều phối và in phiếu hẹn. Quản trị viên có thể thêm và cập nhật chuyên khoa, bác sĩ, ca khám, thuốc, tài khoản, vai trò và xem thống kê theo khoảng thời gian.

## Đối chiếu chức năng trong Word

| Use case | Màn hình và xử lý |
|---|---|
| UC01 | Đăng ký bệnh nhân tại màn hình đăng nhập; máy chủ luôn gán vai trò bệnh nhân |
| UC02 UC03 UC04 | Đăng nhập, đăng xuất và đổi mật khẩu; đổi mật khẩu làm hết hiệu lực các phiên cũ |
| UC05 | Thông tin cá nhân; bệnh nhân sửa thông tin hành chính, bác sĩ cập nhật liên hệ |
| UC06 UC07 | Đội ngũ bác sĩ, ca khả dụng và hộp thoại Đặt lịch khám |
| UC08 UC09 UC10 | Lịch hẹn khám, lọc theo ngày và trạng thái, đổi lịch và hủy lịch |
| UC11 UC12 | Hồ sơ sức khỏe, kết quả và đơn thuốc đã công bố |
| UC13 | Thông báo xác nhận, thay đổi, nhắc lịch trong ứng dụng và đánh dấu đã đọc |
| UC14 UC15 | Lịch khám bác sĩ và hồ sơ bệnh nhân được phân công |
| UC16 UC17 UC18 | Phiếu khám, các dòng thuốc và đề nghị tái khám |
| UC19 UC20 | Bắt đầu khám, lưu nháp, xác nhận hoàn tất và công bố |
| UC21 UC22 | Tài khoản và phân quyền, khóa tài khoản, liên kết hồ sơ |
| UC23 UC24 UC25 UC26 | Bác sĩ, chuyên khoa, lịch làm việc và danh mục thuốc |
| UC27 | Báo cáo thống kê, bệnh nhân duy nhất, số lịch và số lượt hoàn tất |
| UC28 | Hồ sơ bệnh nhân, tạo mới và cập nhật hành chính |
| UC29 UC30 UC31 UC32 | Xác nhận, tiếp nhận, cấp số, điều phối và tra cứu trạng thái |
| UC33 | Nút in phiếu hẹn ở các lịch đã được xác nhận |

## Quy tắc và quyền truy cập

- Phân quyền và lọc dữ liệu tại máy chủ. Bệnh nhân chỉ nhận hồ sơ của mình. Bác sĩ chỉ nhận dữ liệu của bệnh nhân được phân công; phiếu nháp của bác sĩ khác không được trả về.
- Lễ tân và quản trị viên không nhận dữ liệu triệu chứng, chẩn đoán, đơn thuốc, tiền sử và dị ứng. Quyền hành chính không cấp quyền chuyên môn.
- Tài khoản bệnh nhân không được liên kết tự động vào hồ sơ cũ chỉ theo tên hoặc số điện thoại. Quản trị viên phải xác minh danh tính ngoài hệ thống rồi liên kết thủ công.
- Ca chưa hủy hoặc từ chối giữ chỗ. Máy chủ kiểm tra lại sức chứa trong giao dịch; hai yêu cầu cùng chỗ cuối chỉ một yêu cầu thành công.
- Đổi lịch thất bại giữ nguyên lịch cũ. Chỉ đổi hoặc hủy trước tiếp nhận. Tiếp nhận lặp không tạo thêm lượt. Chỉ tiếp nhận lịch của ngày hiện tại.
- Không tự đặt số giờ giới hạn đổi hoặc hủy vì tài liệu chưa quy định. Hiện chỉ kiểm tra trạng thái. Chính sách vắng mặt, hết hạn giữ chỗ và quy trình đính chính phiếu đã công bố cần được thống nhất trước khi triển khai vận hành.
- Nội dung đơn thuốc giữ tên và đơn vị tại thời điểm kê, không đổi theo danh mục thuốc về sau.
- Lịch làm việc có sức chứa; một ca phục vụ nhiều lịch. Không coi mỗi lịch là một khoảng thời gian khám độc quyền của bác sĩ.
- Mật khẩu băm bằng scrypt có salt ngẫu nhiên. Phiên ký HMAC, cookie HttpOnly SameSite=Lax, thời hạn 8 giờ; cookie Secure trong production. Máy chủ xác thực nguồn yêu cầu ghi dữ liệu. Có giới hạn số lần đăng nhập thất bại theo tài khoản trong tiến trình.

## Cập nhật và nhắc lịch

- Khi đang đăng nhập và tab đang hiển thị, dữ liệu tự cập nhật mỗi 20 giây và khi quay lại tab. Có nút Làm mới dữ liệu trên thanh trên cùng.
- Khi phiên hết hiệu lực hoặc đổi tài khoản, các hộp thoại, phiếu khám và dữ liệu chọn trước đó được xóa khỏi màn hình trước khi vai trò mới đăng nhập.
- Thông báo được xếp mới nhất trước. Phiếu khám đã công bố được xếp theo thời gian công bố.
- Quy tắc nhắc lịch đề xuất: tạo thông báo trong ứng dụng cho lịch Đã xác nhận trong 24 giờ sắp tới, mỗi tài khoản và thời điểm hẹn chỉ một thông báo. Việc kiểm tra diễn ra khi ứng dụng được truy cập hoặc tự cập nhật; không gửi SMS/email và không chạy dịch vụ nền khi không ai mở ứng dụng.
- Đặt lịch từ đề nghị tái khám tự chọn chuyên khoa, bác sĩ và ngày đề nghị nếu ngày đó còn phù hợp; vẫn phải chọn ca và gửi xác nhận.

## PostgreSQL và cấu trúc dự án

`database/schema.sql` tạo 12 bảng, có khóa ngoại, ràng buộc tài khoản duy nhất, yêu cầu đặt lịch duy nhất và một lượt khám trên một lịch. Danh tính và quan hệ được lưu ở các cột có kiểu; những trường còn lại được lưu trong JSONB. Dòng thuốc có bảng riêng để giữ bản chụp tên thuốc. Đây là cách lưu kết hợp quan hệ và JSONB, không phải mô hình SQL chuẩn hóa toàn bộ từng thuộc tính trong UML.

Ứng dụng dùng khóa advisory theo giao dịch cho toàn bộ thao tác trên trạng thái phòng khám, phù hợp bản đồ án quy mô nhỏ. Khi mở rộng tải, nên chuyển sang thao tác từng bảng và khóa theo ca, bổ sung audit log chuyên môn, sao lưu và quy trình phục hồi. Các quyết định này không thay đổi chức năng trong tài liệu.

- `src/app/api/auth/route.ts`: đăng nhập, đăng ký, đăng xuất.
- `src/app/api/app/route.ts`: lấy dữ liệu được lọc và xử lý thao tác.
- `src/lib/domain.ts`: quyền, quy tắc đặt hẹn, tiếp nhận, khám và danh mục.
- `src/lib/store.ts`: giao dịch PostgreSQL và chế độ tệp khi phát triển.
- `src/lib/postgres.ts`: ánh xạ dữ liệu vào các bảng.
- `src/lib/auth.ts`: phiên đăng nhập và kiểm tra nguồn yêu cầu.
- `src/components/clinic-app.tsx`: màn hình theo vai trò và các biểu mẫu.
- `src/app/globals.css`: giao diện và bố cục máy tính, điện thoại.

## Kiểm tra

```powershell
npm run typecheck
npm test
npm run build
```

17 kiểm thử nghiệp vụ kiểm tra quyền sở hữu hồ sơ, dữ liệu chuyên môn, sức chứa, yêu cầu lặp, đổi lịch thất bại, tiếp nhận lặp, phân công bác sĩ, phiếu nháp, công bố, bản chụp thuốc, điều phối, trùng ca và tự khóa tài khoản; kiểm tra nhắc lịch không lặp và thứ tự thông báo.

Kiểm thử trình duyệt và tích hợp yêu cầu website đang chạy và bật dữ liệu mẫu:

```powershell
npx playwright install chromium
node tests/e2e.cjs
node tests/integration.cjs
node tests/session-ui.cjs
node tests/workflow-ui.cjs
```

Kiểm thử trình duyệt đi qua luồng đặt lịch, tiếp nhận, khám, kê đơn, công bố và xem kết quả bằng giao diện; kiểm tra điện thoại 390 px và các màn hình quản trị. Kiểm thử tích hợp xác nhận hai yêu cầu đặt chỗ cuối trên PostgreSQL, đăng ký không thể nâng quyền và đổi mật khẩu thu hồi phiên. Kiểm thử phiên trên giao diện xác nhận phiếu cũ không còn hiển thị khi phiên hết hạn và khi đổi vai trò; cập nhật từ lễ tân được nhận trong trình duyệt bệnh nhân. Kiểm thử chỉ dùng dữ liệu mẫu; không chạy trên cơ sở dữ liệu vận hành.

`node tests/hosting.cjs` kiểm tra khởi tạo hosting trên một database tạm trong PostgreSQL local: không tạo dữ liệu mẫu, không tạo quản trị trùng hoặc đổi mật khẩu khi chạy lại. Tài khoản PostgreSQL chạy kiểm thử này cần quyền tạo database; database tạm được xóa sau kiểm thử.

## Chuẩn bị production

1. Dùng cơ sở dữ liệu trống và cấu hình DATABASE_URL dành riêng cho hệ thống.
2. Đặt `DEMO_MODE=false`, `SESSION_SECRET` ngẫu nhiên ít nhất 32 ký tự và chỉ phục vụ qua HTTPS. Cơ sở dữ liệu demo đã khởi tạo không được tự xóa khi đổi cờ; dùng một cơ sở dữ liệu mới cho vận hành.
3. Đặt ADMIN_USERNAME, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD qua biến môi trường. Mật khẩu bootstrap ít nhất 12 ký tự. Không truyền mật khẩu trong tham số dòng lệnh.
4. Chạy `npm run build` và `npm run hosting:start` để tự tạo quản trị viên đầu tiên rồi mở máy chủ trên `0.0.0.0`, cổng theo biến `PORT`. Các lần chạy sau giữ nguyên tài khoản và mật khẩu đã có. Đặt máy chủ ứng dụng sau reverse proxy HTTPS giữ đúng Host/Origin. Lệnh `npm run admin:create` là công cụ tạo quản trị thủ công và yêu cầu file `.env.local`.
5. Thống nhất chính sách hẹn khám và đính chính, cấu hình sao lưu, kiểm tra bảo mật và quyền trước khi đưa hồ sơ bệnh nhân thật vào hệ thống.

Chưa có tích hợp email, SMS, xét nghiệm, bảo hiểm, viện phí hoặc thanh toán. Thông báo hiện nằm trong ứng dụng. Website hiện chạy local; chưa được xuất bản lên tên miền công khai.


## Đối chiếu bổ sung với Word ngày 28/10/2026

- Lịch hẹn: Chờ xác nhận → Đã xác nhận → Đã tiếp nhận; các nhánh Hủy/Từ chối độc lập.
- Lượt khám: Chờ khám → Đang khám → Hoàn tất. Hoàn tất khám giữ lịch hẹn ở Đã tiếp nhận.
- Màn hình Tiếp nhận & điều phối dành cho lễ tân và Khám bệnh dành cho bác sĩ.
- Phiếu nháp riêng tư; hoàn tất khóa phiếu và công bố kết quả. Gửi lại yêu cầu hoàn tất không tạo thông báo lặp.
- Không bắt buộc kê thuốc; nếu có thuốc, cần hướng dẫn sử dụng trước khi công bố.
- Migration 002 chuyển dữ liệu trạng thái cũ, giữ nguyên lịch hẹn, lượt khám và hồ sơ.
- Đã đạt: 17 kiểm thử nghiệp vụ, TypeScript, production build, kiểm thử trình duyệt bốn vai trò, hai trang mới, phiên đăng nhập và tích hợp PostgreSQL.

## Website công khai

Xem [hướng dẫn deploy Render](DEPLOYMENT.md). Repository có sẵn render.yaml để tạo Web Service và PostgreSQL; bản công khai dùng DEMO_MODE=false và tài khoản quản trị riêng. Chỉ có mã nguồn trên GitHub chưa đồng nghĩa website đã chạy công khai.
