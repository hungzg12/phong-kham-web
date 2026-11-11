# MediCare — Frontend quản lý bệnh viện

Giao diện tiếng Việt xây dựng theo tài liệu Lab 9 bằng React 18, Vite và Lucide. Dự án độc lập với frontend phòng gym.

## Chạy dự án

```powershell
cd hospital-frontend
npm install
npm run dev
```

Mở URL localhost do Vite hiển thị. Đóng gói: `npm run build`. Kiểm tra bản đóng gói: `npm run preview`.

## Chức năng

- Tổng quan: số lượt khám, số đợt nội trú, giường trống, công suất, thuần thu tiền mặt, biểu đồ 7 ngày và phân bổ chuyên khoa đều tính từ dữ liệu đã lưu; có bộ lọc ngày.
- Tiếp đón: tạo và sửa bệnh nhân, kiểm tra dữ liệu bắt buộc, điều chuyển chuyên khoa, hủy lượt có lý do.
- Khám: ghi triệu chứng, chẩn đoán/ICD-10, chỉ định CLS, hướng xử trí và cập nhật trạng thái.
- Nội trú: phân giường, ngăn phân hai giường cho cùng bệnh nhân, giải phóng giường và xác nhận khử khuẩn.
- Dược: tồn riêng theo kho, mặt hàng và lô; nhập lô, điều chuyển, lọc hạn dùng, xuất CSV và nhật ký số dư. FEFO bỏ qua lô hết hạn/thiếu hạn dùng, ưu tiên lô hết hạn sớm, có thể chia một lần cấp phát qua nhiều lô. Giao diện hiển thị phân bổ dự kiến trước khi xác nhận.
- Lịch hẹn: danh sách / lịch tuần, tìm kiếm, đặt, đổi, hủy có lý do và check-in sang danh sách chờ khám.
- Cận lâm sàng: phiếu sinh hiệu, BMI, chỉ định dịch vụ, chặn trùng trong ngày, tiếp nhận, nhập kết quả, cảnh báo nguy kịch, duyệt và phát hành mẫu.
- Đơn thuốc: nhiều dòng thuốc, liều, đường dùng, tần suất, số ngày, xác nhận mẫu và cấp phát trừ tồn kho; chặn thiếu hàng hoặc lô hết hạn.
- Chuyển tuyến: cơ sở tiếp nhận, chẩn đoán, lý do, bác sĩ và phương tiện vận chuyển.
- Chăm sóc: diễn biến, y lệnh, xác nhận điều dưỡng và 5 đúng; y lệnh thuốc có trừ tồn kho. Biên bản hội chẩn và tổng kết ra viện giải phóng giường.
- Kho: danh mục kho, phiếu nhập/xuất/hoàn trả, duyệt ghi sổ, kiểm kê tồn thực tế, phê duyệt điều chỉnh và chặn số liệu tồn đã thay đổi.
- Viện phí: tạm ứng, hoàn tiền, bảng chi phí nhiều dòng, nhập BHYT, cấn trừ, thu thêm/hoàn/xác nhận đủ tiền, biên nhận mẫu và in biểu mẫu.
- Ca trực: tiền đầu ca, tiền thực đếm, thuần thu/hoàn, giải trình chênh lệch và đóng ca; chứng từ đã chốt được loại khỏi ca sau.
- Báo cáo: lọc khoảng ngày, tổng thu/hoàn, xuất CSV và nhật ký thao tác.
- Bệnh án: hồ sơ ngoại/nội trú, lưu trữ mẫu, đề nghị đính chính, phê duyệt/từ chối theo hạn và cấp/thu hồi ủy quyền.
- Quản trị: nhân viên, khoa/phòng, công suất, dịch vụ và đơn giá, tài khoản, vai trò và ma trận quyền mẫu.
- Thiết bị: danh mục, báo hỏng, khóa sử dụng, bảo trì và nghiệm thu để mở lại thiết bị.
- Cổng người bệnh: hồ sơ, kết quả được phát hành, đơn được xác nhận, lịch hẹn và viện phí của hồ sơ được chọn.
- Đăng nhập / đăng xuất mẫu: chọn vai trò và vào ngay, không cần tài khoản hoặc mật khẩu.
- Thông tin cá nhân: bấm ảnh đại diện ở thanh đầu trang → Thông tin cá nhân; xem/sửa tên hiển thị, ngày sinh, giới tính, email, điện thoại, địa chỉ, giới thiệu và ảnh đại diện. Mỗi vai trò có hồ sơ riêng. Tên hiển thị không đổi định danh chuyên môn trên bệnh án. Thông tin liên hệ của nhân viên/người bệnh đồng bộ với hồ sơ liên quan; vai trò, mã hồ sơ và chức danh chỉ đọc.
- Ảnh cá nhân: JPG/PNG/WEBP tối đa 2 MB, xử lý thành ảnh vuông 256px trước khi lưu cục bộ. Có xem trước, bỏ thay đổi và xác nhận khi hủy chỉnh sửa; không tải ảnh lên máy chủ.
- Giao diện thích ứng cho máy tính và điện thoại.
- Lịch sử khám: tạo nhiều lượt ngoại trú và nhiều đợt nội trú cho cùng bệnh nhân, phiếu khám theo từng lượt, giữ các lần sửa phiếu, lịch sử sử dụng giường và tra cứu chứng từ theo mã lượt/đợt.
- Chứng từ chuyên môn, tạm ứng và quyết toán liên kết với lượt/đợt được chọn. Một người bệnh có thể có các bảng quyết toán riêng cho các lần khám khác nhau; không dùng chung số tiền tạm ứng giữa các hồ sơ.
- Trải nghiệm: có trạng thái đọc dữ liệu ban đầu/tải module, màn hình lỗi với nút thử lại, thông báo lỗi lưu trữ và xác nhận nhập/điều chuyển kho, hủy lượt, kiểm kê và ra viện. Không tạo thời gian chờ giả.

## Phạm vi

Dữ liệu nghiệp vụ hiện lưu chung trong `localStorage['medicare-workspace-v3']`. Các khóa cũ được đọc một lần để chuyển đổi, giữ nguyên bản cũ và không tiếp tục ghi vào chúng. Chuyển đổi tạo một lượt khám từ thông tin hiện có của từng bệnh nhân, một đợt nội trú từ mỗi bệnh nhân đang có giường, và đưa số tồn cũ vào kho tổng `KHO001`; không tự chia tồn sang kho khác hoặc tạo thêm các lần khám trong quá khứ. Bản ghi chuyển đổi có cờ `migrated` và ngày quy chiếu 11/11/2026.

Các màn hình dùng chung một kho trạng thái trong `src/workspace.js`. Mỗi thao tác cấp phát/ghi sổ/điều chỉnh ghi cả số dư, trạng thái chứng từ và nhật ký trong cùng một lần lưu localStorage. Khi lưu thất bại, trạng thái đang hiển thị không bị cập nhật dở dang. Thay đổi từ tab cùng origin được nhận qua sự kiện `storage`; đây không phải cơ chế khóa giao dịch cho nhiều người dùng.

Để khôi phục mẫu, cần xóa cả khóa `medicare-workspace-v3` và các khóa nghiệp vụ cũ `medicare-patients-v1`, `medicare-stock-v1`, `medicare-beds-v2`, `medicare-notes-v1`, `medicare-appointments-v1`, `medicare-business-v2`, `medicare-paid-v1`. Việc này xóa dữ liệu trình diễn, không nên thực hiện khi cần giữ bài demo. Dữ liệu JSON lỗi không được tự xóa hoặc ghi đè; màn hình khôi phục có nút tải bản gốc và thử đọc lại.

Ban đầu ứng dụng mở sẵn dashboard quản trị. Nút **Chuyển vai trò trải nghiệm** trên thanh đầu trang cho phép chọn tác nhân; nút **Đăng xuất** ở cuối thanh bên mở màn hình đăng nhập có 7 lựa chọn vai trò. Vai trò và phiên demo được giữ trong sessionStorage khi tải lại trang.

### Các tác nhân

Không cần tài khoản hoặc mật khẩu. Chọn một trong 7 vai trò rồi bấm **Đăng nhập**. Các tên đăng nhập bên dưới chỉ là mã tham chiếu tác nhân mẫu, không cần nhập.

| Tác nhân | Tên đăng nhập | Không gian và thao tác |
| --- | --- | --- |
| Quản trị viên | `admin` | Toàn bộ phân hệ, cấu hình, danh mục, nhân viên, tài khoản và quyền |
| Tiếp tân | `tieptan` | Quầy tiếp đón, danh sách bệnh nhân, đăng ký/điều chuyển/hủy lượt, lịch hẹn và check-in; không mở phiếu khám chuyên môn |
| Bác sĩ | `bacsi` | Bàn khám, hàng chờ được phân công, CLS, kê/xác nhận đơn, y lệnh, hội chẩn, ra viện và bệnh án; không cấp phát thuốc hay sửa tồn kho |
| Điều dưỡng | `dieuduong` | Bàn chăm sóc, phiếu sinh hiệu, phân giường, khử khuẩn và thực hiện y lệnh với 5 đúng; không lập y lệnh hoặc duyệt ra viện |
| Dược sĩ | `duocsi` | Đơn đã xác nhận, cấp phát thuốc, danh mục thuốc, tồn kho, nhập/xuất và kiểm kê; không kê hoặc xác nhận đơn thay bác sĩ |
| Thu ngân | `thungan` | Quầy thu ngân, quyết toán, tạm ứng/hoàn tiền, đối soát ca và báo cáo; không mở phân hệ khám hoặc bệnh án |
| Bệnh nhân | `benhnhan` | Trang sức khỏe của Nguyễn Thị Mai (`BN0001`), chỉ xem kết quả/đơn thuốc đã phát hành của mình, đặt/hủy lịch và xem viện phí; không có bộ chọn bệnh nhân |

Các trang chủ có thống kê theo công việc và lối tắt đến tab tương ứng. Phân hệ chuyên môn ẩn các nút tạo/sửa/xử lý ngoài phạm vi tác nhân và kiểm tra vai trò tại hàm xử lý trong frontend. Nhật ký ghi tên tác nhân thực hiện mẫu. Vai trò UI khai báo trong `src/roles.js`; trang chủ và bộ chọn trong `src/Actors.jsx`.

Đây là mô phỏng phân quyền giao diện, không phải bảo mật dữ liệu: bộ chọn vai trò được mở công khai để chấm/trình diễn đồ án; các khóa sessionStorage và localStorage có thể sửa từ DevTools. Tài khoản quản trị trong danh mục là dữ liệu mẫu và chưa liên kết với các tài khoản trải nghiệm. Cần backend để xác thực, phân quyền và giới hạn dữ liệu thực.

Ngày quy chiếu của bộ dữ liệu mẫu là 11/11/2026; dashboard cho phép chọn ngày khác để thống kê. Dashboard không cộng thêm số lượt hoặc doanh thu cố định. Báo cáo tiền mặt chỉ lấy giao dịch đã xác nhận có chứng từ trong phân hệ tài chính; các đánh dấu `paid` đơn giản của phiên bản đầu được giữ trong dữ liệu chuyển đổi nhưng không giả lập thành chứng từ thu tiền. Công suất giường và số ca nội trú đang mở phản ánh trạng thái hiện tại, không phải ảnh chụp lịch sử theo ngày chọn.

Các nút xác nhận, phát hành và lưu trữ chỉ chuyển trạng thái mẫu, không tạo chữ ký số hoặc mã băm toàn vẹn. Cấp phát có kiểm tra tồn/hạn dùng và FEFO, chưa có kiểm tra tương tác hoặc chỉ định điều trị thực tế.

## Kiểm tra giao diện

Sau khi khởi chạy `npm run dev -- --port 5175`, mở terminal thứ hai:

```powershell
npm run test:e2e
npm run test:actors
npm run test:frontend
npm run test:profile
```

Kiểm thử dùng Playwright với Microsoft Edge đã cài trên Windows, chạy trong phiên trình duyệt riêng để không ảnh hưởng dữ liệu đang trình diễn. Có thể đặt `MEDICARE_URL` để đổi URL. Script đầu mở từng màn hình/tab/biểu mẫu và kiểm tra luồng CLS, cấp phát, tồn kho, hoàn tiền, đóng ca, y lệnh, kiểm kê, lịch hẹn, bảo trì, phân quyền mẫu, đăng nhập và khung nhìn 390px. Script tác nhân kiểm tra đăng nhập 7 vai trò, menu, giới hạn nút thao tác, giữ phiên, giao diện điện thoại và luồng bác sĩ kê đơn → dược sĩ cấp phát → bệnh nhân xem đơn cá nhân. Script frontend kiểm tra chuyển dữ liệu cũ, số liệu dashboard, nhiều lượt khám/quyết toán, FEFO qua nhiều lô, thiếu tồn theo kho, điều chuyển, nhiều đợt nhập viện, xác nhận trước thay đổi, lỗi dung lượng lưu trữ, lỗi dữ liệu và trạng thái tải module. Ảnh kiểm tra được lưu trong thư mục `qa/` đã bỏ qua trong Git.

Đây là bản frontend để trình diễn đồ án, chưa có backend, xác thực người dùng, phân quyền thực, thanh toán VietQR/webhook, tính BHYT thực tế, cơ sở dữ liệu tương tác thuốc, ký số, LIS/PACS hoặc lưu bệnh án an toàn. Dữ liệu demo không hỗ trợ giao dịch đồng thời trên nhiều cửa sổ. Chỉ sử dụng dữ liệu giả. Font Be Vietnam Pro được tải từ Google Fonts và có sans-serif dự phòng khi ngoại tuyến.
