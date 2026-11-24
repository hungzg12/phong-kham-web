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
    'Chạm thận âm tính, bập bềnh thận âm tính, các điểm đau niệu quản không đau. Cổ mềm, không dấu thần kinh khu trú.',
    'Tiểu tự chủ, nước tiểu vàng trong, không tiểu buốt rắt. Tri giác tỉnh táo, 12 đôi dây thần kinh sọ chưa ghi nhận tổn thương.'
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
    '124 Nguyễn Trãi, Phường 3, Quận 5, TP. Hồ Chí Minh',
    '45 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    '78 Cách Mạng Tháng Tám, Phường 6, Quận 3, TP. Hồ Chí Minh',
    '12 Đại lộ Bình Dương, Phường Phú Hòa, TP. Thủ Dầu Một, Bình Dương',
    '89 Nguyễn Du, Phường Dĩ An, TP. Dĩ An, Bình Dương',
    '34 Cách Mạng Tháng Tám, Phường Lái Thiêu, TP. Thuận An, Bình Dương',
    '56 Quốc lộ 1K, Phường Linh Xuân, TP. Thủ Đức, TP. Hồ Chí Minh',
    '102 Đồng Khởi, Phường Tân Hiệp, TP. Biên Hòa, Đồng Nai',
    '15 Hoàng Hoa Thám, Phường Hiệp Thành, TP. Thủ Dầu Một, Bình Dương',
    '88 Bến Vân Đồn, Phường 12, Quận 4, TP. Hồ Chí Minh'
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
 * Lọc danh sách gợi ý (tối đa 5 dòng) dựa trên ký tự gõ vào
 */
export function getClinicalSuggestions(type, query, limit = 5) {
  const bank = CLINICAL_PHRASE_DICTIONARY[type] || CLINICAL_PHRASE_DICTIONARY.reason || [];
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

  if (allMatch.length >= limit) {
    return allMatch.slice(0, limit);
  }

  // 2. Nếu chưa đủ 5 dòng, lấy thêm các câu khớp một phần (Any word match)
  const anyMatch = bank.filter(item => {
    if (allMatch.includes(item)) return false;
    const cleanItem = removeVietnameseAccents(item);
    return words.some(w => cleanItem.includes(w));
  });

  const combined = [...allMatch, ...anyMatch];
  if (combined.length > 0) {
    return combined.slice(0, limit);
  }

  // 3. Nếu không khớp chữ nào, trả về các mục tiêu biểu đầu tiên để người dùng luôn có gợi ý chuẩn
  return bank.slice(0, limit);
}
