/**
 * clinicalPhrases.js
 * Ngân hàng dữ liệu cụm từ lâm sàng chuẩn hóa theo danh mục Bộ Y tế & Viettel HIS.
 * Phục vụ cơ chế tự động gợi ý 5 dòng (Autocomplete Suggestion) theo từng ký tự,
 * hỗ trợ in đậm ký tự khớp (Highlight matching characters).
 */

export const CLINICAL_PHRASE_DICTIONARY = {
  // 1. Lý do khám / vào viện (Reason for visit / admission)
  reason: [
    'Sốt cao 39°C liên tục 3 ngày, khó thở tăng dần',
    'Sốt cao kèm rét run, ho có đờm đục, đau tức ngực khi thở sâu',
    'Đau thắt ngực trái lan lên vai và mặt trong cánh tay trái',
    'Đau tức ngực âm ỉ kèm khó thở khi gắng sức nhẹ',
    'Đau bụng vùng thượng vị âm ỉ, ợ hơi, ợ chua nhiều sau ăn',
    'Đau quặn từng cơn vùng hạ sườn phải, sốt nhẹ, vàng da',
    'Đau quặn bụng quanh rốn kèm nôn ói và bí trung đại tiện',
    'Chóng mặt, hoa mắt, mất thăng bằng khi thay đổi tư thế đột ngột',
    'Đau đầu dữ dội vùng thái dương, buồn nôn, sợ ánh sáng',
    'Khó thở kịch phát về đêm, phải ngồi dậy để thở',
    'Ho kéo dài trên 2 tuần, khạc đờm đặc lẫn tia máu',
    'Tiểu buốt, tiểu rắt nhiều lần trong ngày, nước tiểu đục',
    'Vết loét bàn chân rỉ dịch vàng, sưng đỏ lan tỏa',
    'Đau khớp gối hai bên sưng nóng đỏ đau, hạn chế vận động',
    'Mệt mỏi nhiều, khát nhiều, uống nhiều, sụt cân nhanh',
    'Huyết áp đo tại nhà dao động cao trên 170/100 mmHg kèm đau gáy',
    'Nuốt nghẹn, cảm giác vướng ở cổ họng, sụt cân không rõ nguyên nhân',
    'Phù hai chi dưới, tiểu ít, tăng cân nhanh trong 1 tuần',
    'Ngất xỉu đột ngột khi đang làm việc, hồi phục sau 1 phút',
    'Xuất huyết dưới da dạng chấm nốt rải rác hai cẳng chân',
    'Khám sức khỏe định kỳ theo hẹn của bác sĩ điều trị'
  ],

  // 2. Tiền sử bệnh / thuốc đang dùng / dị ứng (Medical history & medications)
  history: [
    'Tiền sử Tăng huyết áp 5 năm, đang dùng Amlodipine 5mg/ngày đều đặn',
    'Đái tháo đường type 2 phát hiện 8 năm, đang điều trị Insulin kết hợp Metformin',
    'Viêm loét dạ dày tá tràng mạn tính HP (+), từng có đợt xuất huyết tiêu hóa năm 2021',
    'Tiền sử hen phế quản từ nhỏ, có cơn cấp khi thời tiết chuyển lạnh',
    'Bệnh phổi tắc nghẽn mạn tính (COPD) nhóm D, hút thuốc lá 20 gói-năm',
    'Bệnh tim thiếu máu cục bộ mạn tính, đã đặt stent mạch vành LAD năm 2022',
    'Viêm gan siêu vi B mạn tính đang điều trị Tenofovir 300mg liên tục',
    'Dị ứng thuốc nhóm Penicillin và Cephalosporin (nổi mề đay, khó thở)',
    'Tiền sử dị ứng hải sản và tôm cua biển (phù Quincke)',
    'Rối loạn lipid máu hỗn hợp, đang dùng Atorvastatin 20mg/ngày',
    'Suy tim mạn tính phân suất tống máu giảm NYHA III',
    'Bệnh thận mạn giai đoạn 3b do biến chứng đái tháo đường',
    'Tiền sử tai biến mạch máu não nhồi máu năm 2020, di chứng yếu nhẹ nửa người trái',
    'Gout mạn tính có hạt tophi nhiều khớp, đang dùng Allopurinol',
    'Chưa ghi nhận tiền sử dị ứng thuốc và bệnh lý mạn tính trước đây'
  ],

  // 3. Diễn biến bệnh / triệu chứng lâm sàng (Symptoms & progress)
  symptoms: [
    'Người bệnh tỉnh táo, tiếp xúc tốt, mệt mỏi nhiều, da niêm hồng nhạt, sốt nhẹ 37.8°C',
    'Sốt cao dao động 38.5 - 39.2°C, đáp ứng kém với thuốc hạ sốt, vã mồ hôi nhiều',
    'Cơn đau thắt ngực sau xương ức kéo dài khoảng 15 phút, lan lên hàm dưới và vai trái',
    'Khó thở co kéo cơ hô hấp phụ nhẹ, thở nhanh nông 24 lần/phút, SpO2 94% khí phòng',
    'Đau bụng vùng thượng vị âm ỉ liên tục, bụng mềm, ấn tức nhẹ, không có phản ứng thành bụng',
    'Bụng chướng nhẹ, gõ vang vùng quanh rốn, nhu động ruột tăng 12 lần/phút',
    'Ho khan từng cơn nhiều về đêm, cảm giác ngứa họng và tức ngực sau ho',
    'Chóng mặt dạng xoay tròn kèm buồn nôn khi quay đầu sang phải, Romberg (+)',
    'Khớp cổ chân và bàn chân phải sưng phù, nóng đỏ, đau chói khi chạm vào',
    'Vết loét ngón 1 bàn chân phải rỉ dịch tiết đục, bờ vết loét sưng đỏ chưa thấy mô hạt',
    'Tri giác lơ mơ nhẹ, GCS 13 điểm, gọi hỏi đáp ứng chậm, đồng tử hai bên 2.5mm đều',
    'Người bệnh giảm đau ngực nhiều sau dùng thuốc giãn mạch, sinh hiệu tạm ổn định',
    'Hết sốt 24 giờ qua, ăn uống khá hơn, tự đi lại nhẹ nhàng trong phòng bệnh'
  ],

  // 4. Khám toàn thân & thể trạng chung (Physical examination)
  examination: [
    'Tri giác tỉnh, tiếp xúc tốt. Da niêm hồng. Tuyến giáp không to. Hạch ngoại vi không sờ chạm. Không phù.',
    'Thể trạng trung bình. Da niêm mạc nhợt nhẹ. Móng tay khum nhẹ. Không xuất huyết dưới da.',
    'Tim đều, T1 T2 rõ, tần số 80 lần/phút. Không nghe thấy tiếng cọ màng tim hay âm thổi bệnh lý.',
    'Phổi hai bên thông khí đều, rì rào phế nang êm dịu, không rale ẩm rale nổ.',
    'Phổi thông khí giảm đáy phổi phải, nghe có rale ẩm rải rác vùng giữa và đáy phổi.',
    'Bụng mềm, di động theo nhịp thở. Gan lách không sờ chạm. Điểm MacBurney (-) Murphy (-).',
    'Họng đỏ nhẹ, amidan hai bên quá phát độ II không có giả mạc, hạch góc hàm không sưng.',
    'Mạch mu chân hai bên bắt rõ đều. Không có dấu hiệu phù mắt cá hai bên.',
    'Khám thần kinh: Không có dấu thần kinh định vị, dấu màng não cổ gượng (-), Kernig (-).'
  ],

  // 5. Kế hoạch / hướng điều trị (Treatment plan)
  plan: [
    'Điều trị nội khoa ngoại trú: Giảm tiết acid dạ dày, kháng sinh diệt trừ Helicobacter pylori theo phác đồ.',
    'Kiểm soát huyết áp mục tiêu dưới 130/80 mmHg bằng phối hợp ARB và chẹn kênh Canxi.',
    'Điều chỉnh phác đồ kiểm soát đường huyết: Tăng cường Insulin nền kết hợp thuốc uống nhóm SGLT-2i.',
    'Thở oxy qua kính mũi 3L/phút, ngậm Nitroglycerin 0.5mg dưới lưỡi khi đau ngực, theo dõi ECG liên tục.',
    'Bù dịch điện giải Natri Clorid 0.9% 500ml tĩnh mạch chậm, theo dõi lượng nước tiểu 24 giờ.',
    'Kháng sinh phổ rộng đường tĩnh mạch phối hợp giảm đau hạ sốt, theo dõi sát công thức máu và CRP.',
    'Chăm sóc tại giường: Rửa vết thương hàng ngày bằng Povidine 10%, cắt lọc mô hoại tử, băng gạc vô khuẩn.',
    'Đề nghị hội chẩn liên chuyên khoa Nội tiết - Ngoại chấn thương chỉnh hình để thống nhất hướng xử trí.',
    'Chuyển viện khẩn cấp lên tuyến trên để chụp và can thiệp động mạch vành qua da (PCI).',
    'Cho người bệnh xuất viện, tiếp tục dùng thuốc theo đơn ngoại trú và tái khám đúng hẹn.'
  ],

  // 6. Lời dặn của bác sĩ sau khám / khi ra viện (Doctor's advice)
  advice: [
    'Uống thuốc đúng giờ, đúng liều lượng theo đơn đã kê, tuyệt đối không tự ý ngưng hoặc tăng liều thuốc.',
    'Chế độ ăn nhạt giảm muối (dưới 5g muối/ngày), kiêng rượu bia thuốc lá, hạn chế thức ăn nhiều mỡ động vật.',
    'Ăn đúng giờ, chia nhỏ bữa, tránh thức ăn cay nóng chua, không nằm ngay sau khi ăn no.',
    'Đo và ghi nhật ký huyết áp tại nhà 2 lần/ngày (sáng và tối), mang sổ theo dõi khi đi tái khám.',
    'Kiểm tra đường huyết mao mạch trước các bữa ăn chính, ghi lại chỉ số để bác sĩ điều chỉnh liều.',
    'Vệ sinh bàn chân hàng ngày bằng nước ấm, lau khô kỹ các kẽ ngón, không đi chân trần trên nền cứng.',
    'Tái khám ngay tại cơ sở y tế nếu có dấu hiệu sốt cao liên tục, đau ngực dữ dội hoặc khó thở tăng dần.',
    'Tái khám theo hẹn sau 7 ngày kèm theo kết quả xét nghiệm máu kiểm tra lại.',
    'Tái khám sau 14 ngày để đánh giá đáp ứng phác đồ điều trị và nội soi kiểm tra nếu cần.'
  ],

  // 7. Y lệnh điều trị & cữ thực hiện (Doctor inpatient orders)
  orders: [
    'Đo dấu hiệu sinh tồn (Mạch, Nhiệt, Huyết áp, SpO2) 8 giờ/lần tại giường',
    'Thở oxy qua ống thông mũi 3 lít/phút liên tục, duy trì SpO2 trên 95%',
    'Khí dung Salbutamol 5mg/2.5ml x 1 tép pha 2ml NaCl 0.9% khi khó thở co thắt',
    'Tiêm bắp Paracetamol 500mg x 1 ống khi sốt cao trên 38.5°C',
    'Thay băng và rửa vết thương vô trùng hàng ngày bằng Betadine 10%',
    'Truyền tĩnh mạch Natri Clorid 0.9% 500ml x 1 chai, tốc độ 40 giọt/phút',
    'Thử đường huyết mao mạch trước 3 bữa ăn chính và 21 giờ tối',
    'Theo dõi lượng nước tiểu vào - ra 24 giờ ghi bảng điều dưỡng',
    'Bất động tại giường, nằm đầu cao 30 độ, ăn súp loãng dinh dưỡng'
  ],

  // 8. Tóm tắt cận lâm sàng (Lab summary)
  labSummary: [
    'CTM: Bạch cầu tăng nhẹ BC 11.5 G/L, Neutrophil 78%. Hồng cầu, huyết sắc tố trong giới hạn bình thường.',
    'Sinh hóa máu: Đường huyết đói 12.4 mmol/L, HbA1c 8.6%, Men gan AST 32 U/L, ALT 38 U/L, Creatinine 84 µmol/L.',
    'Men tim: Troponin T nhạy cảm cao tăng 0.85 ng/mL (ngưỡng bình thường < 0.014 ng/mL).',
    'X-quang ngực thẳng: Rốn phổi đậm hai bên, không thấy đám mờ đông đặc thâm nhiễm nhu mô phổi.',
    'Điện tim (ECG): Nhịp xoang đều tần số 82 chu kỳ/phút, ST chênh lên 1.5mm ở các chuyển đạo V1-V3.',
    'Siêu âm ổ bụng tổng quát: Nhu mô gan nhiễm mỡ độ 1 rải rác, túi mật vách mỏng không sỏi, hai thận bình thường.',
    'Nội soi thực quản - dạ dày: Viêm sung huyết niêm mạc hang vị dạ dày rải rác, Clo-test (HP) dương tính.'
  ],

  // 9. Phương pháp điều trị (Treatment method)
  treatment: [
    'Điều trị nội khoa phối hợp chế độ dinh dưỡng lâm sàng, bù dịch điện giải và giảm đau hạ sốt.',
    'Điều trị nội khoa theo phác đồ kháng sinh phổ rộng đường tĩnh mạch kết hợp kiểm soát đường huyết.',
    'Điều trị nội trú: Phối hợp thuốc ức chế bơm proton (PPI) liều kép và băng niêm mạc dạ dày.',
    'Phẫu thuật cắt lọc mô hoại tử vô trùng tại phòng mổ kết hợp kháng sinh dự phòng chống nhiễm khuẩn.',
    'Hồi sức tích cực, thở oxy hỗ trợ, kiểm soát huyết động và theo dõi điện giải đồ sát sao.'
  ],

  // 10. Tình trạng người bệnh (Patient clinical condition)
  condition: [
    'Người bệnh tỉnh táo, tiếp xúc tốt, dấu hiệu sinh tồn trong giới hạn bình thường, giảm đau nhiều.',
    'Người bệnh tỉnh, còn mệt mỏi nhẹ, không khó thở, hết đau ngực, sinh hiệu ổn định.',
    'Người bệnh tỉnh, tiếp xúc chậm, mạch nhanh 96 ck/p, huyết áp 135/85 mmHg, SpO2 97%.',
    'Hết sốt, ăn ngủ khá, tự sinh hoạt nhẹ nhàng tại phòng bệnh, sẵn sàng xuất viện.',
    'Tình trạng tạm ổn định sau xử trí ban đầu, đủ điều kiện chuyển tuyến an toàn.'
  ],

  // 11. Bệnh kèm theo & mã ICD (Comorbidities)
  comorbidities: [
    'E11.9 - Đái tháo đường type 2 không có biến chứng',
    'I10 - Tăng huyết áp vô căn (nguyên phát)',
    'K29.0 - Viêm dạ dày cấp tính xuất huyết',
    'E78.5 - Rối loạn chuyển hóa lipoprotein không đặc hiệu (Mỡ máu cao)',
    'J45.9 - Hen phế quản không xác định',
    'M10.9 - Bệnh Gút không xác định (Gout mạn tính)',
    'K21.0 - Bệnh trào ngược dạ dày - thực quản có viêm thực quản',
    'N18.3 - Bệnh thận mạn tính, giai đoạn 3',
    'I25.1 - Bệnh tim do xơ vữa động mạch'
  ],

  // 12. Lý do hủy hoặc điều chuyển (Cancel & Transfer reasons)
  cancel: [
    'Người bệnh xin hoãn hoặc chuyển lịch hẹn do bận việc đột xuất',
    'Người bệnh có nguyện vọng chuyển tuyến chuyên khoa sâu điều trị',
    'Trùng thông tin đăng ký lượt khám tại bàn tiếp đón',
    'Người bệnh không có mặt khi gọi số thứ tự quá 3 lần',
    'Bác sĩ điều chuyển buồng khám phù hợp tình trạng chuyên môn người bệnh',
    'Người bệnh xin xuất viện về điều trị ngoại trú tại nhà theo nguyện vọng gia đình',
    'Không liên hệ được với người bệnh qua số điện thoại đã đăng ký'
  ],

  // 13. Chẩn đoán và lý do nhập viện nội trú (Inpatient admission reasons)
  admission: [
    'Theo dõi và điều trị nội trú đợt cấp bệnh phổi tắc nghẽn mạn tính (COPD)',
    'Cơn đau thắt ngực không ổn định nguy cơ cao cần theo dõi tim mạch liên tục',
    'Sốt nhiễm trùng chưa rõ nguyên nhân cần làm xét nghiệm cấy máu chuyên sâu',
    'Đái tháo đường type 2 mất bù có nhiễm toan ceton cần truyền Insulin liên tục',
    'Chấn thương cần theo dõi diễn biến ngoại khoa và hội chẩn phẫu thuật',
    'Xuất huyết tiêu hóa mức độ vừa cần theo dõi sát huyết động và nội soi can thiệp',
    'Tăng huyết áp kịch phát có tổn thương cơ quan đích cần hạ áp qua đường tĩnh mạch'
  ],

  // 14. Mô tả hình ảnh tổn thương CĐHA (Imaging findings)
  imagingFindings: [
    'Hình ảnh tim không to, cung động mạch chủ bình thường, góc tâm hoành sáng rõ hai bên.',
    'Đám mờ rải rác vùng rốn phổi và đáy phổi phải, không thấy hình ảnh tràn dịch màng phổi.',
    'Hình ảnh thâm nhiễm phế nang vùng thùy dưới phổi trái nghĩ nhiều do viêm phổi cấp.',
    'Khung xương lồng ngực và xương sườn hai bên liên tục, không thấy gãy xương hay nứt xương.',
    'Bóng gan lách thận kích thước bình thường, không thấy sỏi cản quang hệ tiết niệu hai bên.',
    'Hình ảnh thoái hóa thân đốt sống thắt lưng L4-L5 có gai xương nhỏ ở bờ trước.'
  ],

  // 15. Kết luận Chẩn đoán hình ảnh (Imaging conclusions)
  imagingConclusion: [
    'X-quang ngực thẳng: Hình ảnh tim phổi hiện tại trong giới hạn bình thường.',
    'X-quang ngực thẳng: Theo dõi đám mờ thâm nhiễm thùy dưới phổi phải nghĩ do viêm.',
    'X-quang xương khớp: Không thấy hình ảnh gãy xương hay trật khớp trên phim chụp.',
    'X-quang cột sống thắt lưng: Thoái hóa cột sống thắt lưng L4-L5 mức độ trung bình.',
    'Siêu âm ổ bụng: Gan nhiễm mỡ độ 1 rải rác, các tạng khác trong ổ bụng chưa thấy bất thường.',
    'Theo dõi viêm xoang hàm hai bên mức độ nhẹ, niêm mạc xoang phù nề.'
  ],

  // 16. Kết luận Xét nghiệm chuyên môn (Lab conclusions)
  labConclusion: [
    'Công thức máu: Bạch cầu tăng nhẹ BC 11.8 G/L, ưu thế Neutrophil nghĩ nhiễm trùng cấp.',
    'Sinh hóa máu: Glucose và HbA1c trong giới hạn kiểm soát tốt, chức năng gan thận bình thường.',
    'Men gan AST/ALT tăng nhẹ dưới 2 lần giới hạn trên bình thường, cần theo dõi định kỳ.',
    'Nước tiểu: Có bạch cầu và vi khuẩn (+), theo dõi nhiễm khuẩn đường tiết niệu.',
    'Xét nghiệm mỡ máu: Tăng Cholesterol toàn phần và LDL-c, đề nghị điều chỉnh chế độ ăn.',
    'Các chỉ số sinh hóa và huyết học cơ bản trong giới hạn bình thường.'
  ],

  // 17. Khám chuyên khoa lâm sàng (Specialty clinical notes)
  specialtyCardioResp: [
    'Tim đều, T1 T2 rõ, không âm thổi bệnh lý. Phổi thông khí đều hai bên, rì rào phế nang êm dịu, không rale.',
    'Mạch đập rõ đều tần số 78 ck/p. Huyết áp 120/80 mmHg. Phổi nghe có rale ẩm rải rác đáy phổi phải.',
    'Tiếng tim mờ nhẹ, không cọ màng tim. Khó thở co kéo cơ hô hấp phụ nhẹ, thở nhanh nông 22 l/p.'
  ],
  specialtyGI: [
    'Bụng mềm, không chướng, gan lách không sờ chạm, không có điểm đau khu trú, phản ứng thành bụng (-).',
    'Bụng mềm, ấn đau tức vùng thượng vị, không đề kháng thành bụng, nhu động ruột bình thường.',
    'Bụng chướng nhẹ quanh rốn, gõ vang, ấn tức nhẹ hạ sườn phải, Murphy (-).'
  ],
  specialtyRenalNeuro: [
    "Chạm thận âm tính hai bên, bập bềnh thận âm tính, không đau các điểm niệu quản.",
    "Không cầu bàng quang. Người bệnh không ghi nhận tiểu buốt, tiểu rắt hoặc tiểu máu.",
    "Người bệnh ghi nhận tiểu buốt, tiểu rắt; cần bổ sung thời điểm khởi phát và triệu chứng kèm theo.",
    "Tri giác tỉnh, tiếp xúc tốt. Cổ mềm, chưa ghi nhận dấu thần kinh khu trú qua thăm khám.",
    "Sức cơ hai bên đều, cảm giác nông chưa ghi nhận bất thường qua thăm khám.",
    "Chưa thăm khám / chưa đủ thông tin đánh giá Thận - Tiết niệu & Thần kinh."
],
  specialtyMetabolic: [
    'Đánh giá kiểm soát đường huyết và huyết áp ổn định, nguy cơ tim mạch mức độ trung bình.',
    'Đái tháo đường type 2 kiểm soát chưa tối ưu, cần tăng cường theo dõi chế độ dinh dưỡng và vận động.'
  ],
  specialtyEar: [
    'Ống tai ngoài thông thoáng, sạch, không sưng đỏ. Màng nhĩ hai bên sáng bóng, nón sáng rõ, không thủng, không ứ dịch.',
    'Ống tai ngoài sung huyết nhẹ, màng nhĩ đục, nón sáng thu nhỏ, theo dõi viêm tai giữa thanh dịch.'
  ],
  specialtyNose: [
    'Niêm mạc mũi hồng, cuốn mũi dưới hai bên không phì đại. Vách ngăn mũi thẳng, khe giữa sạch không có polyp hay dịch đục.',
    'Niêm mạc mũi sung huyết đỏ, cuốn mũi phù nề thoái hóa nhẹ, khe giữa có dịch nhầy trong.'
  ],
  specialtyThroat: [
    'Niêm mạc họng hồng, thành sau họng sạch không có hạt lympho. Amidan độ I hai bên không sưng đỏ, không hốc mủ. Dây thanh khép kín tốt.',
    'Họng đỏ rực, Amidan hai bên sưng to độ II sung huyết, có vài chấm mủ trắng rải rác.'
  ],
  specialtyJoint: [
    'Khớp gối hai bên: Tầm vận động gập 130 độ, duỗi 0 độ. Không sưng nóng đỏ, có tiếng lạo xạo nhẹ khi vận động.',
    'Khớp cổ chân và bàn chân không biến dạng, vận động trong giới hạn bình thường, bập bềnh bánh chè (-).'
  ],
  specialtySpine: [
    'Độ giãn cột sống thắt lưng (Schober) 14/10 cm (bình thường). Dấu Lasegue hai bên 85 độ âm tính.',
    'Cột sống thắt lưng thẳng trục, ấn các gai sau không đau chói, cơ cạnh sống không co cứng.'
  ],

  // 18. Địa chỉ hành chính thường trú (Patient residence address)
  address: [
    "TP. Hà Nội",
    "TP. Hải Phòng",
    "TP. Huế",
    "TP. Đà Nẵng",
    "TP. Hồ Chí Minh",
    "TP. Cần Thơ",
    "An Giang",
    "Bắc Ninh",
    "Cà Mau",
    "Cao Bằng",
    "Đắk Lắk",
    "Điện Biên",
    "Đồng Nai",
    "Đồng Tháp",
    "Gia Lai",
    "Hà Tĩnh",
    "Hưng Yên",
    "Khánh Hòa",
    "Lai Châu",
    "Lâm Đồng",
    "Lạng Sơn",
    "Lào Cai",
    "Nghệ An",
    "Ninh Bình",
    "Phú Thọ",
    "Quảng Ngãi",
    "Quảng Ninh",
    "Quảng Trị",
    "Sơn La",
    "Tây Ninh",
    "Thái Nguyên",
    "Thanh Hóa",
    "Tuyên Quang",
    "Vĩnh Long"
],

  // 19. Dị ứng thuốc & dị nguyên (Drug allergy & allergens)
  allergy: [
    'Không ghi nhận tiền sử dị ứng thuốc và thức ăn',
    'Dị ứng thuốc kháng sinh nhóm Penicillin (nổi mề đay, khó thở)',
    'Dị ứng thuốc nhóm Cephalosporin (ngứa, ban đỏ toàn thân)',
    'Dị ứng thuốc Paracetamol (phù môi, ngứa kết mạc mắt)',
    'Dị ứng thuốc giảm đau chống viêm nhóm NSAIDs (Aspirin, Ibuprofen)',
    'Dị ứng thuốc cản quang có chứa iod trong chụp CLS',
    'Dị ứng thức ăn hải sản: Tôm, cua biển (phù Quincke, mề đay cấp)',
    'Dị ứng thời tiết và phấn hoa (viêm mũi dị ứng, hắt hơi)'
  ],

  // 20. Chẩn đoán xác định lâm sàng (Clinical diagnosis)
  diagnosis: [
    'Tăng huyết áp vô căn (nguyên phát) (I10)',
    'Đái tháo đường type 2 không có biến chứng (E11.9)',
    'Viêm phế quản cấp không đặc hiệu (J20.9)',
    'Viêm phổi thùy cấp do vi khuẩn (J18.1)',
    'Viêm dạ dày cấp tính xuất huyết (K29.0)',
    'Bệnh trào ngược dạ dày - thực quản có viêm thực quản (K21.0)',
    'Bệnh tim thiếu máu cục bộ do xơ vữa động mạch (I25.1)',
    'Hen phế quản không xác định (J45.9)',
    'Đợt cấp bệnh phổi tắc nghẽn mạn tính (COPD) (J44.1)',
    'Bệnh Gút không xác định (Gout mạn tính) (M10.9)',
    'Thoái hóa khớp gối nguyên phát hai bên (M17.0)',
    'Đau thắt lưng dưới cấp tính (M54.5)',
    'Nhiễm khuẩn đường tiết niệu không đặc hiệu (N39.0)',
    'Rối loạn chuyển hóa lipoprotein không đặc hiệu (E78.5)',
    'Viêm họng cấp tính do virus (J02.9)'
  ],

  // 21. Cơ sở tiếp nhận chuyển viện / chuyển tuyến (Referral destinations)
  destination: [
    'Bệnh viện Chợ Rẫy (Tuyến Trung ương - Hạng đặc biệt)',
    'Bệnh viện Thống Nhất (Tuyến Trung ương - Hạng I)',
    'Bệnh viện Đại học Y Dược TP. Hồ Chí Minh (Tuyến Trung ương)',
    'Bệnh viện Đa khoa Tỉnh Bình Dương (Tuyến Tỉnh - Hạng I)',
    'Bệnh viện Nhân dân Gia Định (Tuyến Thành phố - Hạng I)',
    'Bệnh viện Từ Dũ (Tuyến Chuyên khoa Sản - Hạng I)',
    'Bệnh viện Nhi Đồng 1 (Tuyến Chuyên khoa Nhi - Hạng I)',
    'Bệnh viện Bạch Mai (Tuyến Trung ương - Hạng đặc biệt)',
    'Bệnh viện Tai Mũi Họng TP. Hồ Chí Minh (Tuyến Chuyên khoa Hạng I)',
    'Bệnh viện Da Liễu TP. Hồ Chí Minh (Tuyến Chuyên khoa Hạng I)'
  ],

  // 22. Ghi chú chăm sóc & theo dõi nội trú (Inpatient care notes)
  note: [
    'Theo dõi dấu hiệu sinh tồn (Mạch, Nhiệt, HA, SpO2) mỗi 4 giờ tại giường',
    'Thở oxy qua kính mũi 3 lít/phút, duy trì SpO2 trên 95%',
    'Bệnh nhân nằm bất động tại giường, đầu cao 30 độ, ăn súp loãng dinh dưỡng',
    'Chế độ ăn kiêng muối nghiêm ngặt (dưới 3g muối/ngày) và hạn chế nước uống',
    'Thử đường huyết mao mạch trước các bữa ăn chính và lúc 21 giờ tối',
    'Chăm sóc vết thương hàng ngày, thay băng vô khuẩn, theo dõi dẫn lưu',
    'Báo bác sĩ trực ngay nếu có cơn đau ngực tái phát, khó thở hoặc sốt > 38.5°C'
  ],

  // 23. Đề nghị chuyên môn CĐHA & CLS (Diagnostic proposals)
  proposal: [
    'Đề nghị chụp lại kiểm tra sau 7-10 ngày điều trị nội khoa',
    'Đề nghị chụp cắt lớp vi tính (CT-Scanner) ngực để đánh giá chi tiết tổn thương',
    'Đề nghị kết hợp siêu âm Doppler tim và siêu âm ổ bụng tổng quát',
    'Đề nghị nội soi thực quản - dạ dày kiểm tra và làm Clo-test',
    'Chưa phát hiện tổn thương bất thường cần can thiệp ngoại khoa cấp cứu'
  ],

  // 24. Vùng khảo sát hình ảnh (Survey area)
  surveyArea: [
    'Lồng ngực và nhu mô phổi hai bên',
    'Cột sống thắt lưng thẳng và nghiêng',
    'Cột sống cổ thẳng và nghiêng',
    'Khớp gối hai bên (thẳng và nghiêng)',
    'Khớp háng hai bên (thế thẳng)',
    'Toàn bộ ổ bụng và hệ tiết niệu',
    'Xoang hàm mặt và vòm mũi họng',
    'Sọ não thẳng và nghiêng'
  ],

  // 25. Kỹ thuật thực hiện hình ảnh (Imaging technique)
  technique: [
    'Chụp X-quang kỹ thuật số thẳng thế đứng PA',
    'Chụp X-quang kỹ thuật số thẳng và nghiêng',
    'Siêu âm màu Doppler 2D/4D tổng quát',
    'Nội soi huỳnh quang độ nét cao',
    'Điện tâm đồ 12 chuyển đạo chuẩn tại giường',
    'Chụp CT-Scanner đa dãy đầu dò có tiêm thuốc cản quang'
  ],

  // 26. Phòng khám tiếp nhận (Clinic rooms)
  room: [
    'Phòng khám 101 - Nội tổng quát (BS.CKI Trần Minh Anh)',
    'Phòng khám 102 - Tim mạch can thiệp (ThS.BS Nguyễn Văn An)',
    'Phòng khám 103 - Tai Mũi Họng (BS.CKII Lê Thị Mai)',
    'Phòng khám 104 - Da liễu & Thẩm mỹ (BS Đỗ Hoàng Long)',
    'Phòng khám 105 - Sản phụ khoa (BS.CKI Phạm Quỳnh Hoa)',
    'Phòng khám 106 - Cơ xương khớp (ThS.BS Đặng Quốc Tuấn)'
  ],

  // 27. Tiếng tim & âm thổi chuyên khoa Tim mạch
  specialtyHeartSounds: [
    'T1, T2 đều rõ, không âm thổi bệnh lý, không tiếng tim thứ 3 (T3/T4)',
    'T1, T2 rõ, âm thổi tâm thu 2/6 ở mỏm tim lan nách',
    'Tim loạn nhịp hoàn toàn, T1 thay đổi cường độ (Nghi rung nhĩ)',
    'Âm thổi tâm thu 3/6 ở liên sườn 2 bờ phải xương ức (Hẹp van ĐMC)',
    'Tiếng tim mờ xa xăm, có tiếng cọ màng tim vùng trước tim'
  ],

  // 28. Điện tâm đồ & Siêu âm tim chuyên khoa Tim mạch
  specialtyEcg: [
    'Nhịp xoang đều 75 bpm, không biến đổi đoạn ST-T. EF ước tính > 55%',
    'Nhịp nhanh xoang 105 bpm, không thiếu máu cơ tim cấp',
    'Rung nhĩ đáp ứng thất trung bình 85 bpm, không có sóng f lớn',
    'Dày thất trái theo tiêu chuẩn Sokolow-Lyon (Sv1 + Rv5 > 35mm)',
    'Ngoại tâm thu thất thưa đơn dạng rải rác'
  ],

  // 29. Tổn thương da cơ bản & Tính chất chuyên khoa Da liễu
  specialtySkin: [
    'Dát đỏ hình tròn, sẩn phù mề đay rải rác, ngứa nhiều',
    'Mụn nước nhỏ li ti mọc thành chùm trên nền dát đỏ, rát buốt',
    'Mảng đỏ bong vảy trắng bạc, dấu cạo vỏ hành (+)',
    'Sẩn sừng nang lông, da khô ráp dày sừng vùng duỗi',
    'Vết loét trợt nông, bờ rõ, rỉ dịch mủ vàng nhạt'
  ],

  // 30. Khám mỏ vịt & Cổ tử cung chuyên khoa Sản phụ khoa
  specialtyCervix: [
    'Âm đạo không viêm, CTC trơn láng, đóng kín, không chảy máu',
    'CTC lộ tuyến độ I, tiết dịch nhầy trong, không đau',
    'Âm đạo nhiều huyết trắng dạng vón cục, CTC viêm đỏ nhẹ',
    'Tử cung tư thế trung gian, kích thước bình thường, hai phần phụ mềm không đau',
    'Tử cung ngả trước, kích thước tương đương tuổi thai, hai phần phụ mềm'
  ]
};

export const SPECIALTY_CLINICAL_DICTIONARY = {
  'Tim mạch': {
    reason: [
      'Đau thắt ngực trái lan lên vai và cánh tay trái khi gắng sức',
      'Đau tức ngực âm ỉ kèm khó thở khi nằm phẳng, phải kê gối cao',
      'Hồi hộp, đánh trống ngực từng cơn, cảm giác tim đập nhanh hẫng hụt',
      'Chóng mặt, choáng váng khi thay đổi tư thế, huyết áp tăng cao',
      'Tái khám định kỳ Tăng huyết áp - Bệnh tim thiếu máu cục bộ'
    ],
    history: [
      'Tăng huyết áp 7 năm, đang dùng Amlodipine 5mg + Losartan 50mg hàng ngày',
      'Bệnh mạch vành mạn tính, tiền sử đặt Stent LAD năm 2021',
      'Rối loạn lipid máu hỗn hợp, đang uống Atorvastatin 20mg tối',
      'Suy tim mạn tính NYHA II phân suất tống máu giảm nhẹ',
      'Tiền sử rung nhĩ cơn, đang dùng thuốc chống đông máu'
    ],
    symptoms: [
      'Cơn đau thắt ngực vùng sau xương ức kéo dài 10-15 phút, giảm khi nghỉ',
      'Khó thở khi gắng sức nhẹ độ II-III theo NYHA, không ho ra máu',
      'Mạch nhanh 95-105 ck/p, không sốt, tĩnh mạch cổ nổi nhẹ tư thế 45 độ',
      'Phù nhẹ hai mắt cá chân về chiều, ấn lõm nhẹ không đau',
      'Huyết áp đo tại phòng khám 155/95 mmHg, nhịp tim đều rõ'
    ],
    examination: [
      'Tim đều, T1 T2 rõ, không âm thổi bệnh lý. Phổi thông khí đều hai bên, không rale.',
      'Mạch đập rõ đều tần số 82 ck/p. Huyết áp 150/90 mmHg. Không tiếng cọ màng tim.',
      'Mỏm tim đập ở liên sườn V đường trung đòn trái, diện đập 2cm. T2 đanh ở ổ van ĐMC.'
    ],
    diagnosis: [
      'I10 - Bệnh tăng huyết áp vô căn (nguyên phát)',
      'I20.0 - Cơn đau thắt ngực không ổn định (Hội chứng vành cấp)',
      'I20.9 - Cơn đau thắt ngực, không đặc hiệu (Thiếu máu cơ tim)',
      'I25.1 - Bệnh tim do xơ vữa động mạch (Bệnh mạch vành mạn)',
      'I48 - Rung nhĩ và cuồng nhĩ',
      'I50.0 - Suy tim sung huyết (Suy tim mạn tính NYHA II)',
      'E78.2 - Rối loạn lipid máu hỗn hợp'
    ],
    advice: [
      'Ăn nhạt giảm muối (dưới 3-5g muối/ngày), kiêng mỡ động vật và phủ tạng',
      'Uống thuốc hạ huyết áp và tim mạch đều đặn cùng một giờ mỗi ngày',
      'Theo dõi huyết áp và nhịp tim tại nhà sáng - tối, ghi sổ theo dõi',
      'Tránh làm việc nặng gắng sức đột ngột, kiêng rượu bia thuốc lá',
      'Tái khám định kỳ sau 2-4 tuần hoặc khám ngay khi có cơn đau ngực tái phát'
    ]
  },
  'Tai Mũi Họng': {
    reason: [
      'Đau rát cổ họng, nuốt đau vướng, sốt nhẹ 38°C, mệt mỏi',
      'Ngạt mũi, chảy nước mũi trong liên tục, ngứa mũi, hắt hơi từng tràng',
      'Đau nhức vùng má và trán hai bên, chảy dịch mũi vàng đục tanh',
      'Đau nhức trong tai, ù tai, cảm giác bít tắc tai, nghe kém',
      'Khàn tiếng kéo dài trên 1 tuần, vướng họng, đằng hắng nhiều'
    ],
    history: [
      'Tiền sử viêm mũi dị ứng thời tiết nhiều năm, hay tái phát mùa lạnh',
      'Viêm họng hạt mạn tính, hay nói nhiều do đặc thù nghề nghiệp',
      'Tiền sử viêm amidan mủ tái phát 3-4 đợt/năm',
      'Đã mổ nạo VA hồi nhỏ, chưa phẫu thuật vách ngăn mũi'
    ],
    symptoms: [
      'Niêm mạc họng đỏ rực, thành sau họng nhiều hạt lympho sung huyết',
      'Amidan hai bên sưng nề độ II, bề mặt có vài chấm mủ trắng rải rác',
      'Niêm mạc cuốn mũi dưới phù nề nhợt, khe giữa có nhiều dịch nhầy trong',
      'Màng nhĩ tai hai bên sáng bóng, nón sáng rõ, không thủng màng nhĩ',
      'Thanh quản: Hai dây thanh khép kín tốt, bờ dây thanh phù nề nhẹ'
    ],
    examination: [
      'Ống tai ngoài thông thoáng, màng nhĩ nguyên vẹn sáng bóng. Niêm mạc họng đỏ nhẹ.',
      'Họng sung huyết, amidan độ II có chất bựa trắng, thành sau họng sạch.',
      'Vách ngăn mũi thẳng, khe giữa có nhầy đục, cuốn mũi sưng to cản trở thông khí.'
    ],
    diagnosis: [
      'J02.9 - Viêm họng cấp, không đặc hiệu',
      'J03.9 - Viêm amidan cấp mủ, không đặc hiệu',
      'J30.4 - Viêm mũi dị ứng, không đặc hiệu',
      'J01.0 - Viêm xoang hàm cấp tính',
      'J31.2 - Viêm họng mạn tính (Viêm họng hạt)',
      'H66.0 - Viêm tai giữa nung mủ cấp tính',
      'J04.0 - Viêm thanh quản cấp tính'
    ],
    advice: [
      'Súc họng bằng nước muối sinh lý 0.9% ngày 3-4 lần sau ăn và trước khi ngủ',
      'Uống nhiều nước ấm, giữ ấm vùng cổ ngực, tránh uống nước đá lạnh',
      'Đeo khẩu trang khi ra đường, tránh tiếp xúc khói bụi và hóa chất',
      'Uống đủ liều kháng sinh và thuốc chống viêm theo đơn đã kê',
      'Tái khám sau 5 ngày hoặc khám lại ngay nếu sốt cao hay nuốt khó tăng'
    ]
  },
  'Cơ xương khớp': {
    reason: [
      'Đau nhức khớp gối hai bên, lục cục khi co duỗi và lên xuống cầu thang',
      'Đau sưng nóng đỏ dữ dội khớp bàn ngón 1 chân phải sau bữa ăn nhiều đạm',
      'Đau thắt lưng lan xuống mông và mặt sau đùi cẳng chân trái',
      'Đau cứng khớp cổ tay và khớp ngón tay hai bên vào buổi sáng trên 1 giờ',
      'Đau mỏi vùng cổ gáy lan lên thái dương và bả vai hai bên'
    ],
    history: [
      'Thoái hóa khớp gối 3 năm, đã từng tiêm nội khớp Acid Hyaluronic',
      'Tiền sử Gút mạn tính 5 năm, có hạt tophi nhỏ ở vành tai và khớp bàn chân',
      'Thoát vị đĩa đệm cột sống thắt lưng L4-L5 chẩn đoán qua MRI năm 2022',
      'Viêm khớp dạng thấp huyết thanh dương tính đang dùng Methotrexate'
    ],
    symptoms: [
      'Khớp gối hai bên phì đại nhẹ, dấu lạo xạo xương (+), bập bềnh bánh chè (-)',
      'Khớp bàn ngón chân cái sưng nề đỏ bóng, ấn đau chói, hạn chế đi lại',
      'Cơ cạnh sống thắt lưng co cứng, bấm điểm đau Valleix (+), Lasegue 60 độ',
      'Vận động cột sống cổ hạn chế cúi ngửa, nghiệm pháp Spurling (+)',
      'Các khớp bàn ngón tay hai bên sưng đối xứng dạng hình thoi'
    ],
    examination: [
      'Các khớp vận động trong giới hạn bình thường, không biến dạng, không sưng nóng.',
      'Khớp gối ấn đau khe khớp trong, lạo xạo xương (+), dấu chạm bánh chè (-).',
      'Cột sống thắt lưng giảm đường cong sinh lý, tầm vận động cúi cán 40 độ.'
    ],
    diagnosis: [
      'M17.0 - Thoái hóa khớp gối nguyên phát hai bên',
      'M10.0 - Gút vô căn (Cơn Gút cấp tính ngón chân cái)',
      'M10.9 - Bệnh Gút mạn tính có hạt tophi',
      'M54.5 - Đau thắt lưng vùng thấp (Đau lưng dưới cấp/mạn)',
      'M54.3 - Đau dây thần kinh tọa (Sciatica)',
      'M51.2 - Thoát vị đĩa đệm cột sống thắt lưng L4-L5',
      'M06.9 - Viêm khớp dạng thấp, không đặc hiệu',
      'M81.0 - Loãng xương sau mãn kinh'
    ],
    advice: [
      'Hạn chế khiêng vác nặng, tránh ngồi xổm, tránh leo cầu thang nhiều',
      'Tập thể dục nhẹ nhàng: Bơi lội, đạp xe tại chỗ, yoga kéo giãn cơ lưng',
      'Chế độ ăn cho bệnh Gút: Kiêng thịt đỏ, phủ tạng động vật, hải sản, rượu bia',
      'Bổ sung Canxi và Vitamin D3 hàng ngày, phơi nắng sáng sớm',
      'Chườm ấm vùng khớp đau 15-20 phút mỗi tối trước khi ngủ'
    ]
  },
  'Da liễu': {
    reason: [
      'Ngứa ngáy nhiều ở vùng mặt và cổ tay, nổi mẩn đỏ sau khi dùng mỹ phẩm',
      'Nổi mẩn ngứa dạng sẩn phù mề đay từng mảng khắp người, ngứa dữ dội',
      'Mụn trứng cá bọc và sẩn đỏ nhiều ở hai bên má và cằm, đau nhức',
      'Vùng bẹn và kẽ đùi nổi mảng đỏ bờ viền rõ rệt, ngứa nhiều khi ra mồ hôi',
      'Mụn nước nhỏ mọc thành chùm đau rát như bỏng một bên sườn ngực'
    ],
    history: [
      'Viêm da cơ địa từ nhỏ, hay tái phát vào mùa đông hanh khô',
      'Cơ địa dị ứng thời tiết và dị ứng thức ăn (tôm, cua, hải sản)',
      'Tiền sử bị mụn trứng cá viêm nặng nhiều năm, từng dùng Corticoid bôi',
      'Chưa từng ghi nhận bệnh da mạn tính khác'
    ],
    symptoms: [
      'Dát đỏ rải rác vùng mặt và cẳng tay, nhiều sẩn phù nổi gồ bề mặt da',
      'Mảng sẩn đỏ hình tròn bờ đa cung có mụn nước nhỏ ở rìa tổn thương',
      'Nhiều sẩn viêm, mụn mủ và nhân trứng cá đóng vảy vùng chữ T',
      'Dải mụn nước mọc thành chùm trên nền dát đỏ phân bố theo khoanh da D5-D6',
      'Mảng da dày lichen hóa thâm sạm ở nếp gấp khuỷu tay và khoeo chân'
    ],
    examination: [
      'Tổn thương da dạng dát sẩn mề đay rải rác, không có phỏng nước, không hoại tử.',
      'Nhiều sẩn mủ viêm nang lông vùng mặt, cồi mụn đầu đen rải rác.',
      'Thương tổn dạng đám mảng đỏ bờ đa cung, bong vảy mịn rìa thương tổn.'
    ],
    diagnosis: [
      'L20.9 - Viêm da cơ địa dị ứng (Eczema)',
      'L23.9 - Viêm da tiếp xúc dị ứng',
      'L50.0 - Mày đay dị ứng cấp tính',
      'L70.0 - Mụn trứng cá thông thường (Acne vulgaris)',
      'B35.6 - Nấm bẹn [Tinea cruris]',
      'B35.4 - Nấm thân mình [Tinea corporis - Hắc lào]',
      'B02.9 - Bệnh Zona [Herpes zoster] không biến chứng',
      'L40.0 - Vảy nến thể mảng thông thường'
    ],
    advice: [
      'Tuyệt đối không gãi chà xát mạnh gây trầy xước và bội nhiễm da',
      'Dùng sữa tắm dịu nhẹ không xà phòng, bôi kem dưỡng ẩm ngay sau khi tắm',
      'Tránh tiếp xúc xà phòng thơm, chất tẩy rửa hóa chất và mỹ phẩm lạ',
      'Bôi thuốc đúng vùng tổn thương theo hướng dẫn của bác sĩ chuyên khoa',
      'Giữ cơ thể thoáng mát, mặc đồ cotton rộng rãi, tái khám sau 1-2 tuần'
    ]
  },
  'Sản phụ khoa': {
    reason: [
      'Chậm kinh 10 ngày, thử que thử thai Quickstick hiện 2 vạch đậm',
      'Đau tức âm ỉ vùng hạ vị kèm ra máu nâu sẫm âm đạo lượng ít',
      'Khí hư ra nhiều màu trắng đục vón cục như váng sữa, ngứa ngáy vùng kín',
      'Kinh nguyệt không đều, chu kỳ kéo dài 45-60 ngày, đau bụng kinh nhiều',
      'Khám thai định kỳ quý I / quý II theo lịch hẹn'
    ],
    history: [
      'PARA 1001, đẻ thường đủ tháng năm 2021, bé nặng 3.2kg khỏe mạnh',
      'Tiền sử viêm âm đạo do nấm Candida từng điều trị đặt thuốc năm ngoái',
      'Chu kỳ kinh nguyệt 30 ngày đều đặn, không có tiền sử sẩy thai nạo hút',
      'Chưa ghi nhận bệnh lý ngoại khoa ổ bụng'
    ],
    symptoms: [
      'Bụng mềm, không chướng, ấn tức nhẹ điểm hạ vị, không có phản ứng thành bụng',
      'Khám mỏ vịt: Âm đạo nhiều huyết trắng vón cục dính thành âm đạo',
      'Cổ tử cung trơn láng, đóng kín, không có tổn thương sùi hay loét',
      'Tử cung tư thế trung gian, to tương đương tuổi thai 6-7 tuần, mềm',
      'Hai phần phụ mềm mại, không sờ thấy khối bất thường, không đau'
    ],
    examination: [
      'Bụng mềm, gan lách không to. Khám mỏ vịt: Âm đạo bình thường, CTC trơn láng.',
      'Cổ tử cung lộ tuyến nhẹ độ I, chất tiết nhầy trong, không hôi, không chảy máu.',
      'Tử cung to kích thước tương đương tuổi thai, hai phần phụ mềm không sờ thấy u.'
    ],
    diagnosis: [
      'Z34.0 - Khám theo dõi thai nghén bình thường (Thai kỳ sớm)',
      'O20.0 - Dọa sẩy thai (Động thai)',
      'B37.3 - Viêm âm đạo và âm hộ do nấm Candida',
      'N76.0 - Viêm âm đạo cấp tính do vi khuẩn',
      'N72 - Viêm lộ tuyến cổ tử cung',
      'N94.6 - Đau bụng kinh (Thống kinh)',
      'D25.9 - U xơ tử cung kích thước nhỏ'
    ],
    advice: [
      'Nghỉ ngơi tại giường, tránh vận động mạnh, kiêng quan hệ vợ chồng trong giai đoạn dọa sẩy',
      'Bổ sung Acid Folic, Sắt và Vitamin tổng hợp theo đơn chỉ định',
      'Vệ sinh phụ khoa sạch sẽ bằng dung dịch vệ sinh chuyên dụng pH phù hợp',
      'Ăn uống đủ chất dinh dưỡng, uống nhiều nước, ăn nhiều rau quả tươi',
      'Khám lại ngay nếu có ra máu âm đạo đỏ tươi hoặc đau quặn bụng dưới'
    ]
  },
  'Nội tổng quát': {
    reason: [
      'Sốt cao 39°C liên tục 3 ngày, gai rét, đau mỏi toàn thân, mệt nhiều',
      'Đau rát vùng thượng vị âm ỉ sau ăn, ợ hơi, ợ chua, đầy bụng khó tiêu',
      'Mệt mỏi nhiều, khát nước, uống nhiều, tiểu nhiều lần, sụt 3kg trong 1 tháng',
      'Ho có đờm đục, sốt nhẹ về chiều, đau tức ngực khi hít thở sâu',
      'Chóng mặt, hoa mắt, mất thăng bằng khi đứng dậy đột ngột'
    ],
    history: [
      'Tăng huyết áp 5 năm, đái tháo đường type 2 đang uống Metformin 500mg',
      'Viêm dạ dày tá tràng mạn tính HP (+), từng điều trị phác đồ 4 thuốc',
      'Tiền sử dị ứng kháng sinh nhóm Penicillin (nổi ban ngứa)',
      'Không hút thuốc lá, thỉnh thoảng uống bia rượu khi giao tiếp'
    ],
    symptoms: [
      'Bệnh nhân tỉnh táo, tiếp xúc tốt, da niêm hồng nhạt, sốt nhẹ 38°C',
      'Bụng mềm, ấn tức nhẹ vùng thượng vị, Murphy (-), MacBurney (-)',
      'Phổi hai bên thông khí rõ, rì rào phế nang êm dịu, không rale ẩm rale nổ',
      'Họng sung huyết nhẹ, amidan hai bên không sưng mủ, hạch ngoại vi không to',
      'Mạch đập rõ đều 80 ck/p, huyết áp 125/80 mmHg, SpO2 98% khí phòng'
    ],
    examination: [
      'Tri giác tỉnh, tiếp xúc tốt. Da niêm hồng. Tim đều T1 T2 rõ. Phổi không rale.',
      'Bụng mềm di động theo nhịp thở, ấn tức thượng vị, không đề kháng thành bụng.',
      'Thể trạng trung bình, niêm mạc mắt hồng, tuyến giáp không to, không phù ngoại biên.'
    ],
    diagnosis: [
      'K29.7 - Viêm dạ dày, không đặc hiệu (Đau dạ dày / Viêm niêm mạc)',
      'K21.9 - Bệnh trào ngược dạ dày - thực quản (GERD)',
      'E11.9 - Đái tháo đường không phụ thuộc insulin (Type 2)',
      'I10 - Bệnh tăng huyết áp vô căn (nguyên phát)',
      'J06.9 - Nhiễm trùng đường hô hấp trên cấp tính',
      'K30 - Chứng khó tiêu [Dyspepsia - Rối loạn tiêu hóa]',
      'A09 - Tiêu chảy và viêm dạ dày - ruột nghi do nhiễm khuẩn'
    ],
    advice: [
      'Uống thuốc đúng giờ, đúng liều lượng theo đơn đã kê của bác sĩ',
      'Ăn chín uống sôi, chia nhỏ bữa ăn, kiêng đồ chua cay nóng và rượu bia',
      'Hạn chế ăn mặn, tập thể dục nhẹ nhàng 30 phút mỗi ngày',
      'Tái khám sau 1-2 tuần đánh giá lại đáp ứng điều trị'
    ]
  }
};

/**
 * Loại bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu và chữ hoa/thường
 */
export function removeVietnameseAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Lọc danh sách gợi ý dựa trên ký tự gõ vào và chuyên khoa của phòng khám
 */
export function getClinicalSuggestions(type, query, limit = 5, department = '') {
  // Lấy danh mục gợi ý ưu tiên theo chuyên khoa nếu có
  const specBank = (department && SPECIALTY_CLINICAL_DICTIONARY[department]?.[type]) || [];
  const baseBank = CLINICAL_PHRASE_DICTIONARY[type] || CLINICAL_PHRASE_DICTIONARY.reason || [];
  
  // Kết hợp ngân hàng dữ liệu: Ưu tiên câu chuyên khoa lên đầu, sau đó đến câu chung
  const bank = [...new Set([...specBank, ...baseBank])];

  if (!query || !query.trim()) {
    return bank.slice(0, limit);
  }

  const cleanQuery = removeVietnameseAccents(query.trim());
  const words = cleanQuery.split(/\s+/).filter(Boolean);

  // 1. Khớp toàn bộ các từ gõ vào (All words match)
  const allMatch = bank.filter(item => {
    const cleanItem = removeVietnameseAccents(item);
    return words.every(w => cleanItem.includes(w));
  });

  if (type === 'address') return allMatch.slice(0, limit);

  if (allMatch.length >= limit) {
    return allMatch.slice(0, limit);
  }

  // 2. Nếu chưa đủ limit dòng, lấy thêm các câu khớp một phần (Any word match)
  const anyMatch = bank.filter(item => {
    if (allMatch.includes(item)) return false;
    const cleanItem = removeVietnameseAccents(item);
    return words.some(w => cleanItem.includes(w));
  });

  const combined = [...allMatch, ...anyMatch];
  if (combined.length > 0) {
    return combined.slice(0, limit);
  }

  // 3. Nếu không khớp chữ nào, trả về các mục tiêu biểu đầu tiên
  return bank.slice(0, limit);
}
