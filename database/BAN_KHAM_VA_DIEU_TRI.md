# Bàn khám và điều trị MediCare

- Khám bệnh: danh sách lượt khám trái, hồ sơ phải; chọn đúng mã lượt. Lưu nháp không tự kết thúc khám. F2 lưu nháp. Có phiên bản và mở đính chính có lý do.
- Chỉ định: chọn dịch vụ hoặc gói mẫu để đưa vào phiếu. Chẩn đoán được lấy từ tab Chẩn đoán. Không tự xác nhận thu tiền.
- Đơn thuốc: có nhiều dòng, cách dùng và lời dặn; lưu vào đơn nháp của đúng lượt/đợt. Kiểm tra/xác nhận/cấp phát dùng màn hình hiện có với hồ sơ chọn sẵn. Không kiểm tra tương tác, không suy diễn giá thuốc.
- Bàn xét nghiệm: Cận lâm sàng → Bàn xét nghiệm & trả kết quả. Tiếp nhận, nhập các chỉ số, lưu chờ duyệt, phát hành. Kết quả về đúng tab CLS của bàn khám. Chỉ số và tham chiếu nhập tay, chưa kết nối thiết bị.
- Nội trú: Y lệnh & chăm sóc → Bàn điều trị. Một đợt có nhiều tờ; lưu tờ trước khi thêm cữ y lệnh. Sao chép chỉ tạo nháp mới, không sao chép việc đã thực hiện. Danh sách y lệnh hiện có dùng để xác nhận thực hiện và trừ kho theo cơ chế cũ.
- Chi phí: dịch vụ và quyết toán liên kết cùng lượt/đợt, mở quyết toán chọn sẵn hồ sơ và đưa dịch vụ vào nháp. Tổng dịch vụ chưa gồm tất cả thuốc, giường, BHYT.
- Thao tác: ghi nhận gọi, chuyển phòng, hẹn tái khám, tiếp nhận nội trú với giường trống, chuyển tuyến, hoãn khám, in phần đang xem.

Tất cả là frontend demo lưu localStorage. Kiểm tra quyền và xung đột chỉ trong cơ chế demo, chưa có xác thực máy chủ hay chữ ký số.

Kiểm thử: node scripts/clinical-desk.mjs (dev server 5175).
