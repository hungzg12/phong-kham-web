# MediCare: kiểm thử và sửa luồng hiện có — 23/11/2026

## Phạm vi và môi trường

Đối chiếu package.json, entry src/main.jsx, WorkspaceSession, API, database/QuanLyBenhVien_SQLServer.sql và báo cáo QA-WORKFLOW-2026-11-23.md. Bản hiện tại là React/Vite + SQL Server. Giữ nguyên thay đổi chưa commit. Không commit/push, không reset/xóa dữ liệu, không thay tài khoản. Ca ghi dùng fixture tạo database QA riêng, giữ lại database bằng chứng. Tên, dữ liệu mới đều là QA_TEST; không ghi chứng từ vào database đang làm việc.

Bộ 115 test đã PASS ở lượt kiểm tra trước. Lượt này bổ sung 2 ca bản in và mở rộng test nội trú; kết quả bộ cuối được ghi bên dưới. PASS API/SQL/render không được hiểu là PASS thao tác trình duyệt.

## Lỗi mới đã sửa

- PRINT-01: 6 biểu mẫu tự thêm tên, CCCD, điện thoại, triệu chứng, chẩn đoán, phác đồ, bác sĩ và ngày điều trị mẫu khi thiếu dữ liệu. Xóa các fallback giả, thay Chưa ghi nhận; giữ nguyên nội dung đã lưu.
- PRINT-02: hóa đơn trống tự thành 475.000 đồng và sinh dòng dịch vụ/thuốc; đơn thuốc trống tự sinh Nexium/Panadol. Dùng danh sách trống; tổng tiền thiếu không tự tính thành tiền thật, số 0 được giữ.
- PRINT-03: bản in bảng kê đọc qty trong khi API dùng quantity, khiến tiền dòng sai. Hỗ trợ quantity và qty, không tự gán số lượng 1.
- PRINT-04: tóm tắt từ bàn bác sĩ lấy note đang soạn và tự thêm kết luận/lời dặn. Chuyển sang record.note đã lưu; đơn thuốc in từ chính đơn được chọn.
- Giữ các sửa BUG-H01…H06 của báo cáo trước, gồm dữ liệu thiếu, phạm vi người bệnh, quyền sửa, tìm kiếm, mở form tạo lượt và chuyển tiếp nhận nội trú tới màn hình lưu thật.

File sửa trong lượt này: src/MedicalPaperForms.jsx, src/ClinicalDesk.jsx, tests/roles-render.test.mjs, tests/inpatient-care.test.mjs. Không đổi schema hoặc tạo migration mới. src/History.jsx và báo cáo trước là thay đổi chưa commit được giữ lại.

## Ca kiểm thử

Mỗi dòng ghi điều kiện → thao tác → kỳ vọng → thực tế/trạng thái. Có thể tái hiện bằng lệnh ở phần bằng chứng; tên test là mốc tra cứu trong log.

| Mã | Vai trò, điều kiện | Thao tác / kỳ vọng | Thực tế / trạng thái | Bằng chứng |
|---|---|---|---|---|
| OUT-01 | Tiếp tân; fixture lịch hẹn | Tạo/sửa/hủy, check-in, lặp check-in; đúng người và không trùng | Đối chiếu GET/SQL và khởi động server độc lập: PASS API/SQL | appointments.test.mjs |
| OUT-02 | Tiếp tân; có phòng/ca và người bệnh giả | Tiếp đón, điều chuyển/hủy đúng lượt; lỗi không tạo bệnh nhân mồ côi | PASS API/SQL | clinic-flow.test.mjs |
| OUT-03 | Bác sĩ đúng/sai phân công | Lưu sinh hiệu/phiếu, stale revision, khóa/đính chính | PASS API/SQL, sai quyền bị từ chối | clinic-flow.test.mjs; workspace-access.test.mjs |
| OUT-04 | Bác sĩ/KTV; chỉ định thật | Tạo → tiếp nhận → nháp → phát hành, chặn lặp và chuyển sai trạng thái | PASS API/SQL | ancillary.test.mjs |
| OUT-05 | Bác sĩ/dược sĩ; đơn nháp/đã duyệt | Chặn dược sĩ duyệt thay bác sĩ, chặn cấp nháp, cấp FEFO đúng lô | PASS API/SQL | pharmacy.test.mjs |
| OUT-06 | Dược sĩ; thiếu/hết hạn/tranh chấp tồn | Chặn vượt tồn, rollback toàn bộ, gửi lại không trừ hai lần | PASS API/SQL | pharmacy.test.mjs |
| OUT-07 | Thu ngân; ca thu và chi phí | Chặn thiếu ca, đối chiếu số dư, thu/hoàn đúng, gửi lại không thu hai lần | PASS API/SQL | finance-portal.test.mjs |
| OUT-08 | Bệnh nhân; 2 hồ sơ | Chỉ xem kết quả công bố, đơn và viện phí của mình | PASS API/SQL + render | finance-portal.test.mjs; roles-render.test.mjs |
| IN-01 | Điều dưỡng, 2 người và 2 giường | Nhập viện/gửi lại/tranh giường; mỗi giường một phân bổ | PASS API/SQL | inpatient-care.test.mjs |
| IN-02 | Bác sĩ phân công | Lập tờ, khóa/đính chính, tạo y lệnh; nurse xác nhận 5 đúng | PASS API/SQL | inpatient-care.test.mjs |
| IN-03 | Điều dưỡng; y lệnh thuốc có lô | Thực hiện FEFO, đủ đơn vị; thiếu tồn rollback, lặp không trừ lần hai | PASS API/SQL | ancillary.test.mjs |
| IN-04 | Bác sĩ; còn y lệnh | Thử ra viện → phải từ chối, đợt còn DANG_DIEU_TRI | PASS API/SQL | qa-inpatient-chain.tap |
| IN-05 | Thu ngân; y lệnh xong, quyết toán chưa thu | Thử ra viện bị chặn → mở ca/thu đúng số dư | PASS API/SQL | qa-inpatient-chain.tap |
| IN-06 | Bác sĩ/điều dưỡng; quyết toán xong | Ra viện → giường DANG_VE_SINH → clean → TRONG; gửi lại ra viện một audit | PASS API/SQL | qa-inpatient-chain.tap |
| AUTH-01 | 8 vai trò, giả role/staffId/ID | Kiểm tra API đọc/ghi, bác sĩ ngoài phân công, bệnh nhân chéo hồ sơ | PASS HTTP/SQL | workspace-access.test.mjs |
| AUTH-02 | Đăng xuất/đổi phiên, response cũ | Không phục hồi dữ liệu của phiên trước | PASS test bộ nhớ + API; UI chưa kiểm chứng | workspace-flow.test.mjs |
| PRINT-01 | Các vai trò có bản in, dữ liệu trống | Render 6 biểu mẫu; không sinh danh tính/phác đồ/thuốc/tiền giả | FAIL trước sửa → PASS render | qa-print-before.tap; qa-print-after.tap |
| PRINT-02 | Thu ngân; tiền 0, quantity=3, giá 100 | Giữ tổng 0 và dòng 300, không NaN | FAIL trước sửa → PASS render | qa-print-before.tap; qa-print-after.tap |
| UI-01 | 8 vai trò; trình duyệt thực | Toàn luồng ngoại trú bằng click và đối chiếu SQL | BLOCKED: không có kết nối browser | Local browser access is unavailable for this chat |
| UI-02 | Bác sĩ/nurse/cashier | Toàn luồng nội trú, tổng kết, ra viện, thu và khử khuẩn bằng UI | BLOCKED; API/SQL không thay chứng cứ UI | Cùng lỗi công cụ |
| UI-03 | 1440/1024/768/390 px | Popup/back/tab/tìm kiếm/cuộn/focus/không tràn | BLOCKED, chưa đánh dấu PASS | Cùng lỗi công cụ |
| UI-04 | Bác sĩ/KTV/dược sĩ/thu ngân | Preview in và PDF/A4 đúng dữ liệu và không cắt trang | BLOCKED; chỉ render nội dung được test | Cùng lỗi công cụ |

## Bằng chứng và tái hiện

~~~powershell
npm run build
node --test tests/roles-render.test.mjs
node --test tests/inpatient-care.test.mjs
node --test --test-concurrency=1 tests/*.test.mjs
~~~

Log cục bộ (không đưa vào Git): .data/qa-print-before.tap, .data/qa-print-after.tap, .data/qa-inpatient-chain.tap, .data/qa-final-build.log, .data/qa-final-tests.tap. Test tự tạo database mới mỗi lần; không chọn database đang làm việc.

Kết quả cuối: npm run build PASS; 117/117 test PASS, 0 FAIL, 0 SKIPPED. Hai ca nội dung bản in mới FAIL trước sửa và PASS sau sửa. Bộ nội trú mở rộng PASS 2/2, gồm chuỗi tới ra viện/quyết toán/khử khuẩn. Không có tuyên bố PASS UI.

## Sơ đồ luồng hiện có

~~~mermaid
flowchart TD
 A[Lịch hẹn hoặc tiếp đón] --> B[Phòng và bác sĩ theo ca thật]
 B --> C[Bác sĩ lưu phiếu khám]
 C --> D{Có chỉ định CLS?}
 D -->|Có| E[KTV tiếp nhận, nhập, phát hành]
 E --> C
 D -->|Không / đã có kết quả| F[Bác sĩ kết luận và duyệt đơn nếu có]
 F --> G[Dược sĩ cấp theo lô]
 F --> H[Thu ngân thu theo ca và chi phí]
 C --> I[Chỉ định nội trú]
 I --> J[Tiếp nhận và xếp giường]
 J --> K[Tờ điều trị, y lệnh]
 K --> L[Điều dưỡng thực hiện]
 L --> M[Quyết toán hiện có đã hoàn tất]
 M --> N[Ra viện]
 N --> O[Giường chờ vệ sinh]
 O --> P[Xác nhận sẵn sàng]
 K -. Tổng kết chuyên môn và toàn chuỗi UI chưa nghiệm thu .-> N
 G -. Chưa kiểm thử chuỗi UI cùng một bệnh nhân .-> H
~~~

## Kết luận A–D

A. Có thể tiếp tục demo có kiểm soát trên QA. Chưa kết luận demo ổn định toàn bộ hoặc vận hành bệnh viện.
B. Đã chạy chuỗi nội trú từ nhập viện tới vệ sinh ở API/SQL và các phân đoạn ngoại trú, phân quyền, rollback, concurrency trong bộ test; chưa chạy toàn luồng UI đầu-cuối.
C. Còn BLOCKED: trình duyệt, responsive, bàn phím, bản in A4, tổng kết nội trú và luồng UI chung một bệnh nhân. Phân công cá nhân nurse/pharmacist/CLS chưa được suy diễn hoặc mở rộng.
D. Cần kết nối lại browser được phép, bộ tài khoản/phân công đối chứng, nghiệm thu UI và bản in. Trước vận hành thực tế cần xác minh biểu mẫu/quy định chuyên môn, dữ liệu cơ sở, sao lưu/khôi phục, phân quyền và bảo mật; không xem bản demo hoặc test tự động là chứng nhận.
