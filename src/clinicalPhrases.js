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
  const bank = CLINICAL_PHRASE_DICTIONARY[type] || [];
  if (!query || !query.trim()) {
    return bank.slice(0, limit);
  }

  const cleanQuery = removeVietnameseAccents(query.trim());
  const words = cleanQuery.split(/\s+/).filter(Boolean);

  const matched = bank.filter(item => {
    const cleanItem = removeVietnameseAccents(item);
    return words.every(w => cleanItem.includes(w));
  });

  return matched.slice(0, limit);
}
