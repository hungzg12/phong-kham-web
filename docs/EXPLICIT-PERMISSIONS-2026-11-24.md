# Vai trò và quyền được cấp — 24/11/2026

## Hành vi

Quyền lưu trong mảng permissions của vai trò trong dbo.MediCareAdminState. Không tạo kho quyền riêng tại trình duyệt. Vai trò/chuyên môn vẫn giới hạn API được phép và phạm vi hồ sơ; checkbox chỉ thu hẹp, không mở vượt giới hạn đó. API nghiệp vụ yêu cầu quyền đã lưu và quyền Xem cùng nhóm. API không được ánh xạ bị từ chối mặc định. Không có ngoại lệ Admin cho quyền nghiệp vụ.

Vai trò mới và vai trò cũ chưa có quyền biz.* không có quyền nghiệp vụ. Không chọn sẵn dựa vào tên vai trò. Admin cuối cùng phải giữ accounts:view/create/edit và roles:view/create/edit; không bắt buộc có toàn bộ quyền chuyên môn.

Phiên tải quyền từ SQL mỗi yêu cầu. Sửa quyền giữ phiên đăng nhập để yêu cầu tiếp theo trả 403; khóa vai trò hoặc đổi vai trò nghiệp vụ vẫn thu hồi phiên. Frontend kiểm tra lại mỗi 10 giây, khi cửa sổ được focus và khi nhận 403 qua lớp API chung; thay đổi phiên reset bộ nhớ và remount màn hình. Không cam kết thu hồi dữ liệu người dùng đã xem, chụp hoặc tải xuống trước đó.

## File chính

- src/business-permissions.js: danh mục và ánh xạ quyền yêu cầu, bộ lọc trang.
- src/RolePermissions.jsx, src/SecureAdmin.jsx: checkbox thật, tiếng Việt, phân biệt quản trị và nghiệp vụ.
- server/workspace-access.mjs: kiểm quyền trước đọc/ghi và lọc payload tổng hợp.
- server/admin-domain.mjs, server/admin-api.mjs: xác thực quyền lưu, kiểm tra phụ thuộc Xem, bảo vệ Admin cuối cùng, revision và audit hiện có.
- src/WorkspaceSession.jsx, src/session.js, src/api.js, src/main.jsx: khôi phục/cập nhật quyền và bộ nhớ phiên.
- src/roles.js, src/Actors.jsx, src/Appointments.jsx, src/ClinicalDesk.jsx, src/LabDesk.jsx: kiểm quyền thao tác/menu hiện có.
- server/patient-registration.mjs: cho phép vai trò bệnh nhân được cấp quyền nghiệp vụ, vẫn chặn quyền quản trị trong vai trò đăng ký công khai.
- tests/explicit-permissions.test.mjs, tests/workspace-access.test.mjs và fixture/test hồi quy liên quan.

## Migration dữ liệu QA

scripts/migrate-explicit-permissions.mjs chỉ mở database QA đã lưu, kiểm tra tên MediCareQA_Admin_*. Không thay bảng chuyên môn hoặc mật khẩu. Mảng permissionMigrations giữ snapshot quyền trước/sau và audit SQL.

Ánh xạ đúng các fallback đã tồn tại: staff:* → roster:*; Admin được giữ các khả năng sao lưu cũ bằng mã backups:view/create/restore rõ ràng. Không suy diễn biz.* từ tên vai trò. Chạy lần đầu: applied; chạy lại: already applied (đã kiểm chứng). Không chạy trên database làm việc.

Có --rollback với điều kiện quyền chưa bị sửa sau migration; yêu cầu đi cùng rollback mã nguồn tương ứng. Chưa chạy rollback thực tế. Snapshot bản migration đầu không có after sẽ báo yêu cầu xem xét thủ công, không ghi đè quyền hiện tại.

## Ánh xạ API thao tác

| API / action | Quyền bắt buộc (cộng quyền Xem cùng nhóm) |
|---|---|
| GET /api/appointments | biz.appointments:view |
| POST /api/appointments | biz.appointments:create |
| PUT /api/appointments | biz.appointments:edit |
| PATCH /api/appointments | biz.appointments:cancel |
| POST /api/visits | biz.reception:receive |
| PATCH /api/visits · transfer | biz.reception:transfer |
| PATCH /api/visits · cancel | biz.reception:cancel |
| POST /api/clinical/exam | biz.exam:save |
| POST /api/labs/action · accept | biz.labs:accept |
| POST /api/labs/action · save | biz.labs:save |
| POST /api/labs/action · publish | biz.labs:publish |
| POST /api/labs/orders | biz.labs:order |
| POST /api/clinical/care · sheet | biz.care:sheet |
| POST /api/clinical/care · reopen | biz.care:reopen |
| POST /api/clinical/care · order | biz.care:order |
| POST /api/nursing/vitals | biz.care:vitals |
| POST /api/nursing/perform | biz.care:perform |
| POST /api/nursing/bed · assign | biz.inpatient:assign |
| POST /api/nursing/bed · clean | biz.inpatient:clean |
| POST /api/inpatient/admit | biz.inpatient:admit |
| POST /api/inpatient/discharge | biz.inpatient:discharge |
| POST /api/inpatient/clean | biz.inpatient:clean |
| POST /api/pharmacy/action · savePrescription | biz.prescriptions:save |
| POST /api/pharmacy/action · approvePrescription | biz.prescriptions:approve |
| POST /api/pharmacy/action · dispense | biz.prescriptions:dispense |
| POST /api/pharmacy/action · saveWarehouse | biz.pharmacy:warehouse |
| POST /api/pharmacy/action · toggleWarehouse | biz.pharmacy:toggle |
| POST /api/pharmacy/action · createProduct | biz.pharmacy:product |
| POST /api/pharmacy/action · importShipment | biz.pharmacy:shipment |
| POST /api/pharmacy/action · saveMovement | biz.pharmacy:movement |
| POST /api/pharmacy/action · approveMovement | biz.pharmacy:approveMovement |
| POST /api/pharmacy/action · cancelMovement | biz.pharmacy:cancelMovement |
| POST /api/pharmacy/action · saveCount | biz.pharmacy:count |
| POST /api/pharmacy/action · approveCount | biz.pharmacy:approveCount |
| POST /api/pharmacy/action · cancelCount | biz.pharmacy:cancelCount |
| POST /api/finance/action · openShift | biz.finance:openShift |
| POST /api/finance/action · closeShift | biz.finance:closeShift |
| POST /api/finance/action · saveAdvance | biz.finance:saveAdvance |
| POST /api/finance/action · confirmAdvance | biz.finance:confirmAdvance |
| POST /api/finance/action · cancelAdvance | biz.finance:cancelAdvance |
| POST /api/finance/action · createSettlement | biz.finance:createSettlement |
| POST /api/finance/action · settle | biz.finance:settle |
| POST /api/portal/appointments · create | biz.portal:create |
| POST /api/portal/appointments · cancel | biz.portal:cancel |
| POST /api/equipment/action · saveEquipment | biz.equipment:saveEquipment |
| POST /api/equipment/action · reportIncident | biz.equipment:reportIncident |
| POST /api/equipment/action · toggleDevice | biz.equipment:toggleDevice |
| POST /api/equipment/action · acceptIncident | biz.equipment:acceptIncident |
| POST /api/equipment/action · maintain | biz.equipment:maintain |
| POST /api/visits có appointmentId | biz.appointments:checkin |

GET mapping đầy đủ nằm trong requestGrant. Các API tổng hợp chỉ trả phần hồ sơ thuộc nhóm quyền được cấp. Quyền lập/duyệt phiếu kho bao gồm loại nhập/xuất/chuyển trong action hiện có, chưa tách checkbox riêng theo loại phiếu. Không thêm quyền cho API cũ đã đóng.

## Ca kiểm chứng

| Mã | Điều kiện / thao tác | Kỳ vọng và thực tế | Kết quả / bằng chứng |
|---|---|---|---|
| RB01 | SQL fixture, 8 vai trò có phiên; bỏ biz.* rồi gọi API tương ứng | 403 cho cả 8, cấp lại được đọc | tests/workspace-access.test.mjs |
| RB02 | Chỉ appointments:view; POST với role/permissions giả | Không ghi, 403 | tests/explicit-permissions.test.mjs |
| RB03 | Bỏ quyền bằng PUT vai trò, dùng lại cookie | 403 ngay yêu cầu tiếp; phiên vẫn đọc được danh tính mới | tests/explicit-permissions.test.mjs |
| RB04 | Quyền action thiếu quyền Xem | Validate từ chối 400; request checker từ chối | tests/explicit-permissions.test.mjs |
| RB05 | Quyền accept CLS, thử publish | Không được suy ra quyền publish | tests/explicit-permissions.test.mjs |
| RB06 | Hai bác sĩ cùng vai trò, khác phân công | Bộ quyền giống nhau, hồ sơ ngoài phân công trả 403 | tests/workspace-access.test.mjs |
| RB07 | Hai bệnh nhân / đoán notification ID / giả danh | Giữ kiểm tra chủ sở hữu và liên kết hồ sơ | tests/notifications.test.mjs, workspace-access |
| RB08 | Vai trò mới / initialState | Không tự cấp biz.* | tests/explicit-permissions.test.mjs |
| RB09 | Sửa revision cũ / Admin cuối cùng | 409, không ghi đè hoặc làm mất quyền quản lý | tests/admin.test.mjs |
| RB10 | Frontend bằng trình duyệt, checkbox, popup, in, refresh/session switch | Chưa thao tác trực tiếp trên trình duyệt ở lần sửa này | BLOCKED: công cụ trình duyệt local chưa truy cập được trong phiên trước |
| RB11 | Hai điều dưỡng cùng khoa, khác phân công chăm sóc | Chưa có cơ chế phân công chăm sóc đầy đủ trong bản hiện tại để chứng minh phạm vi theo từng điều dưỡng | BLOCKED; không suy diễn phân công từ khoa |
| RB12 | UI mọi nút chuyên biệt, popup và bản in sau thu hồi | API đã chặn; chưa chứng minh mọi nút đều ẩn/disabled và mọi bản in đóng ngay | BLOCKED: cần kiểm thử UI trực tiếp |

Không tuyên bố hoàn tất toàn bộ yêu cầu: chưa tách loại phiếu kho thành quyền riêng; chưa có phân công chăm sóc đầy đủ; chưa kiểm chứng UI toàn bộ. Quyền xem portal hiện là một nhóm gồm kết quả, đơn thuốc, viện phí đã công bố, chưa tách từng phần thành checkbox riêng.

## Kết quả lệnh

Build PASS. Bộ kiểm thử đầy đủ: 136/136 PASS tại .data/explicit-permissions-final2.tap; bộ kiểm thử tập trung quyền/phạm vi: 13/13 PASS tại .data/explicit-permissions-final-scope.tap. Sau sửa nhánh cấp thuốc, chạy lại kiểm thử hồi quy liên quan và build. Log không commit. Browser local lần này trả "Local browser access is unavailable for this chat"; RB10/RB12 vẫn BLOCKED. Không commit/push/triển khai.
