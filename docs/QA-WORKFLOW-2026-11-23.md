# Kiểm thử và luồng MediCare — 23/11/2026

Phạm vi: bản React/Vite và SQL Server hiện có. Không thay tài khoản, không sửa dữ liệu nghiệp vụ đang dùng. Bộ SQL test tự tạo database QA riêng và giữ lại bằng chứng. Không tự gộp mã hoặc push GitHub trong lượt này.

## Quy trình sử dụng hiện có

1. Tiếp tân tạo lịch hẹn hoặc tiếp đón trực tiếp. Check-in lịch liên kết người bệnh/lượt khám; phòng và bác sĩ lấy từ phân công ca thực tế. Thiếu phân công phải xử lý danh mục/ca, không chọn bác sĩ giả.
2. Bác sĩ mở đúng lượt được phân công, lưu sinh hiệu và phiếu khám. Chỉ định CLS là nhánh theo nhu cầu, không bắt buộc cho mọi lượt.
3. Kỹ thuật viên tiếp nhận chỉ định, nhập kết quả, ký duyệt/phát hành theo quyền hiện có. Bác sĩ đọc kết quả và tiếp tục khám.
4. Bác sĩ lưu đơn nháp rồi duyệt. Dược sĩ chỉ cấp đơn đủ điều kiện; kiểm tra tồn theo lô và hạn dùng. Tải lại/API xác nhận lưu, không chỉ dựa toast.
5. Thu ngân mở ca, tổng hợp chi phí thực tế và xác nhận thu theo luồng quyết toán hiện có. Thời điểm thu và cấp thuốc tuân theo điều kiện đã có, không tự bổ sung một ràng buộc thanh toán mới.
6. Nếu chỉ định nội trú: bác sĩ lưu chỉ định/đợt theo API hiện có; điều dưỡng dùng Buồng giường nội trú để tiếp nhận/xếp giường, thực hiện y lệnh và ghi nhận chăm sóc. Ra viện, quyết toán và khử khuẩn cần nghiệm thu UI riêng.

Nút Tiếp nhận nội trú từ Lịch sử dẫn đến cùng màn hình buồng giường hiện có; không tạo một đợt chỉ trong bộ nhớ frontend.

~~~mermaid
flowchart TD
 A[Tiếp tân: lịch hẹn hoặc tiếp đón] --> B[Lượt khám theo phòng và ca thực tế]
 B --> C[Bác sĩ được phân công: khám và lưu]
 C --> D{Có chỉ định CLS?}
 D -->|Có| E[Kỹ thuật viên: tiếp nhận, kết quả, phát hành]
 E --> C
 D -->|Không / đã có kết quả| F[Bác sĩ: kết luận, lưu và duyệt đơn nếu có]
 F --> G[Dược sĩ: kiểm tra và cấp thuốc theo lô]
 F --> H[Thu ngân: ca thu và chi phí thực tế]
 C --> I[Chỉ định nội trú qua API hiện có]
 I --> J[Điều dưỡng: tiếp nhận, xếp giường và y lệnh]
 J -. Chưa nghiệm thu toàn bộ UI .-> K[Ra viện, quyết toán và khử khuẩn]
~~~

## Lỗi đã xử lý

| Mã | Vai trò / điều kiện | Thao tác và kỳ vọng | Trước sửa | Sau sửa / bằng chứng |
|---|---|---|---|---|
| BUG-H01 | Bác sĩ, lượt chưa có kết quả | Mở lịch sử: không có số đo/chẩn đoán/lời dặn giả | FAIL: tự hiện 120/80, 78 bpm, I10 và lời dặn | PASS render; test missing clinical results |
| BUG-H02 | Bệnh nhân, ID liên kết không tìm thấy | Không mở hồ sơ người khác và không có nút sửa | FAIL: fallback người đầu tiên; có Mở phiếu khám | PASS render; test patient history is read-only |
| BUG-H03 | Bác sĩ, số đo có BMI 31.1 | Hiện giá trị đã ghi, không tự kết luận bình thường | FAIL: gắn Bình thường cho mọi BMI | PASS render; test history preserves recorded results |
| BUG-H04 | Nhân viên, tìm kiếm hồ sơ | Danh sách và chi tiết cùng phạm vi kết quả tìm kiếm | Code giữ người đã chọn ngoài bộ lọc | Đã sửa chọn chi tiết từ matchedPatients; tương tác UI BLOCKED |
| BUG-H05 | Tiếp tân, mở tạo lượt ở Lịch sử | Form mở không ReferenceError | Code dùng biến patient chưa khai báo | Đổi sang curPt.id; mở form UI BLOCKED |
| BUG-H06 | Admin/điều dưỡng, tiếp nhận nội trú từ Lịch sử | Dùng màn hình/API lưu nội trú hiện có | Nhánh transact chỉ cập nhật frontend | Đã nối navigate inpatient và loại nhánh ghi giả; click UI BLOCKED |

Ba test render mới đã FAIL trước sửa (11 PASS, 3 FAIL) và PASS sau sửa (14 PASS). Bằng chứng cục bộ: .data/qa-history-before.tap, .data/qa-history-after.tap. Chúng không phải bằng chứng đã bấm thử trên trình duyệt.

## Kiểm chứng

- Build: PASS.
- Bộ node --test --test-concurrency=1 tests/*.test.mjs: 115/115 PASS, 0 FAIL, 0 SKIPPED; bằng chứng .data/qa-workflow-tests.tap.
- Bộ API/SQL bao gồm lịch hẹn/check-in, phân công bác sĩ, phiếu khám, CLS, duyệt/cấp thuốc FEFO, hoàn tác, đồng thời, y lệnh, điều dưỡng, thu ngân, bệnh nhân và quyền truy cập.
- BLOCKED: công cụ trình duyệt trả Local browser access is unavailable for this chat. Chưa đánh dấu PASS các thao tác chuột, form, popup, bản in và responsive toàn luồng.
- BLOCKED: chưa có kiểm chứng UI trọn chuỗi nội trú đến ra viện/quyết toán/khử khuẩn.
- Phân công cá nhân điều dưỡng/dược sĩ/CLS còn phải dựa vào cơ chế đang có; không suy diễn việc cùng vai trò nghĩa là được giao ca.
