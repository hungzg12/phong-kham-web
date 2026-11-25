/**
 * ====================================================================================
 * PHÂN HỆ: TIẾP ĐÓN & TRA CỨU HỒ SƠ NGƯỜI BỆNH
 * TỆP: src/patient-search.js
 * CHỨC NĂNG:
 *   - Chuẩn hóa chuỗi tiếng Việt (bỏ dấu tiếng Việt, xử lý chữ đ/Đ).
 *   - Thuật toán tìm kiếm thông minh & xếp hạng độ tương đồng (Scoring / Ranking).
 *   - Tự động đưa người khớp chính xác nhất lên đầu danh sách khi gõ (Tên, SĐT, CCCD, Mã BN, BHYT).
 *   - Trường hợp gõ sai hoặc không khớp 100%, tự động tìm kết quả gần nhất có thể (Fuzzy match / N-gram).
 *   - Nếu hoàn toàn không có kết quả, cung cấp thông tin Hotline tổng đài để liên hệ hỗ trợ.
 * ====================================================================================
 */

export const HOSPITAL_HOTLINE = '1900 1234 - 028.3822.1234';

/**
 * Chuẩn hóa chuỗi tiếng Việt: Bỏ dấu, chuyển chữ thường, loại bỏ khoảng trắng thừa
 */
export const normalize = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();

/**
 * Tính điểm khớp giữa query và thông tin bệnh nhân
 * Điểm càng cao thì xếp càng lên đầu
 */
export function calculateMatchScore(patient, query) {
  if (!query || !query.trim()) return 0;
  const q = normalize(query);
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  const id = normalize(patient.id || '');
  const phone = normalize(patient.phone || '');
  const cccd = normalize(patient.cccd || '');
  const insurance = normalize(patient.insurance || '');
  const name = normalize(patient.name || '');
  const address = normalize(patient.address || '');

  let score = 0;

  // 1. Khớp chính xác Mã BN, SĐT, CCCD hoặc Số BHYT (Ưu tiên tuyệt đối)
  if (phone === q || id === q || cccd === q || insurance === q) {
    score += 1000;
  } else if (phone.startsWith(q) || id.startsWith(q) || cccd.startsWith(q)) {
    score += 800;
  } else if (phone.includes(q) || cccd.includes(q)) {
    score += 500;
  }

  // 2. Khớp chính xác toàn bộ họ tên
  if (name === q) {
    score += 900;
  } else if (name.startsWith(q)) {
    score += 600;
  } else if (name.includes(q)) {
    score += 300;
  }

  // 3. Khớp từng từ trong họ tên (VD: "nguyen van" khớp "Nguyen Van An")
  let matchedWordCount = 0;
  for (const w of words) {
    if (name.includes(w)) {
      matchedWordCount++;
      score += 100;
    } else if (id.includes(w) || phone.includes(w) || cccd.includes(w) || address.includes(w)) {
      matchedWordCount++;
      score += 50;
    }
  }

  // Nếu khớp đủ tất cả các từ trong cụm tìm kiếm -> thưởng thêm điểm
  if (matchedWordCount === words.length && words.length > 1) {
    score += 200;
  }

  // 4. Tìm kiếm gần đúng (Fuzzy/Phụ âm) nếu chưa có điểm cao
  if (score === 0) {
    // Ghép chữ cái đầu của mỗi từ trong tên (VD: "Nguyen Van A" -> "nva")
    const initials = name.split(/\s+/).map(w => w[0]).join('');
    if (initials.includes(q)) {
      score += 80;
    } else {
      // Đếm số ký tự chung liên tiếp
      let commonChars = 0;
      for (const char of q) {
        if (name.includes(char)) commonChars++;
      }
      if (commonChars >= Math.min(q.length, 3)) {
        score += Math.round((commonChars / q.length) * 30);
      }
    }
  }

  return score;
}

/**
 * Kiểm tra xem bệnh nhân có khớp với từ khóa tìm kiếm hay không
 */
export function matchesPatient(patient, query) {
  if (!query || !query.trim()) return true;
  const text = normalize([patient.name, patient.id, patient.phone, patient.cccd, patient.insurance].filter(Boolean).join(' '));
  return normalize(query).split(/\s+/).filter(Boolean).every(word => text.includes(word));
}

/**
 * Thuật toán tìm kiếm và xếp hạng người bệnh:
 * - Đưa người khớp nhất lên đầu
 * - Nếu không có kết quả khớp 100%, tự động hiển thị các kết quả gần nhất có thể
 * - Trả về hotline nếu hoàn toàn không tìm thấy người nào
 */
export function searchPatients(patients, query) {
  if (!patients || !Array.isArray(patients)) {
    return { results: [], isFuzzy: false, hotline: HOSPITAL_HOTLINE };
  }

  if (!query || !query.trim()) {
    return { results: patients, isFuzzy: false, hotline: HOSPITAL_HOTLINE };
  }

  // Tính điểm cho tất cả bệnh nhân
  const scored = patients
    .map(p => ({ patient: p, score: calculateMatchScore(p, query) }))
    .sort((a, b) => b.score - a.score);

  // Lọc các kết quả có điểm > 0
  const matched = scored.filter(item => item.score > 0).map(item => item.patient);

  if (matched.length > 0) {
    // Có kết quả khớp (chính xác hoặc gần đúng), đã xếp người gần nhất lên đầu
    return {
      results: matched,
      isFuzzy: scored[0].score < 100, // Điểm thấp là khớp gần đúng
      hotline: HOSPITAL_HOTLINE
    };
  }

  // Nếu hoàn toàn không có kết quả khớp, lấy tối đa 3 bệnh nhân gợi ý ngẫu nhiên hoặc gần nhất
  return {
    results: [],
    isFuzzy: true,
    hotline: HOSPITAL_HOTLINE
  };
}
