/**
 * Tiện ích chuẩn hóa & phân tích Bảo hiểm Y tế (BHYT) theo quy chuẩn Bộ Y tế & BHXH Việt Nam
 * (Quyết định số 1666/QĐ-BHXH và Luật BHYT hiện hành)
 */

export const BHYT_GROUPS = {
  HT: { name: 'Hưu trí, người hưởng trợ cấp mất sức', defaultRate: 100 },
  DN: { name: 'Người lao động doanh nghiệp', defaultRate: 80 },
  GD: { name: 'Hộ gia đình tham gia BHYT', defaultRate: 80 },
  CC: { name: 'Cựu chiến binh, sĩ quan, người có công', defaultRate: 100 },
  TE: { name: 'Trẻ em dưới 6 tuổi', defaultRate: 100 },
  HN: { name: 'Hộ nghèo, dân tộc thiểu số vùng khó khăn', defaultRate: 100 },
  CN: { name: 'Người thuộc hộ cận nghèo', defaultRate: 95 },
  SV: { name: 'Sinh viên các trường Đại học, Cao đẳng', defaultRate: 80 },
  HS: { name: 'Học sinh phổ thông', defaultRate: 80 },
  QN: { name: 'Sĩ quan, quân nhân chuyên nghiệp QĐND', defaultRate: 100 },
  CA: { name: 'Sĩ quan, hạ sĩ quan lực lượng CAND', defaultRate: 100 },
  CY: { name: 'Sĩ quan, nhân viên cơ yếu', defaultRate: 100 },
  CB: { name: 'Cán bộ, công chức, viên chức Nhà nước', defaultRate: 80 }
};

export const PROVINCES = {
  '01': 'Hà Nội',
  '79': 'TP. Hồ Chí Minh',
  '48': 'Đà Nẵng',
  '31': 'Hải Phòng',
  '92': 'Cần Thơ',
  '47': 'Đắk Lắk'
};

/**
 * Danh mục các mức hưởng BHYT chuẩn Bộ Y tế & BHXH Việt Nam (QĐ 1666/QĐ-BHXH & QĐ 130/QĐ-BYT)
 */
export const BHYT_RATE_OPTIONS = [
  {
    rate: 100,
    label: 'Mức 1 & 2: Quỹ BHYT chi trả 100% (Sĩ quan, Trẻ em <6T, Người có công, Hưu trí HT2 - Không cùng chi trả)',
    shortLabel: '100% BHYT (Miễn cùng chi trả)',
    copayRate: 0
  },
  {
    rate: 95,
    label: 'Mức 3: Quỹ BHYT chi trả 95% (Hưu trí HT3, Trợ cấp BHXH, Hộ cận nghèo - Cùng chi trả 5%)',
    shortLabel: '95% BHYT (Cùng chi trả 5%)',
    copayRate: 5
  },
  {
    rate: 80,
    label: 'Mức 4: Quỹ BHYT chi trả 80% (Người lao động DN, Hộ gia đình GD, HSSV - Cùng chi trả 20%)',
    shortLabel: '80% BHYT (Cùng chi trả 20%)',
    copayRate: 20
  },
  {
    rate: 0,
    label: '0% - Viện phí tự chi trả 100% (Khám tự nguyện / Ngoài danh mục BHYT / Không thẻ BHYT)',
    shortLabel: '0% - Tự chi trả 100%',
    copayRate: 100
  }
];

/**
 * Kiểm tra xem một thuốc/dịch vụ có hợp lệ để thanh toán BHYT hay không theo quy định của Bộ Y tế
 * (Thông tư 20/2022/TT-BYT & Quyết định 130/QĐ-BYT)
 * Nghiêm cấm đưa thuốc chứa Caffeine (như Panadol Extra) hoặc TPCN vào quyết toán BHYT (Điều 215 Bộ luật Hình sự)
 */
export function isBhytEligibleItem(itemOrName) {
  const name = typeof itemOrName === 'string'
    ? itemOrName
    : (itemOrName?.name || itemOrName?.description || itemOrName?.medicine || '');
  const lower = name.toLowerCase();

  // 1. Thuốc kết hợp chứa Caffeine (Panadol Extra, phối hợp Paracetamol + Caffeine...)
  // Theo Thông tư 20/2022/TT-BYT, quỹ BHYT chỉ thanh toán cho hoạt chất Paracetamol đơn chất,
  // KHÔNG thanh toán cho thuốc kết hợp có chứa Caffeine (như Panadol Extra)!
  if (/panadol extra|caffeine|cafein/i.test(lower)) {
    return {
      eligible: false,
      reason: 'Thuốc phối hợp chứa Caffeine không thuộc danh mục TT 20/2022/TT-BYT (Nghiêm cấm quyết toán BHYT)',
      statutoryCode: 'NON_BHYT_CAFFEINE',
      lawRef: 'Thông tư 20/2022/TT-BYT'
    };
  }

  // 2. Thực phẩm chức năng, men tiêu hóa thông thường, bồi bổ không có chỉ định điều trị
  if (/thực phẩm chức năng|tpcn|sữa|bồi bổ|collagen|hoạt huyết dưỡng não/i.test(lower)) {
    return {
      eligible: false,
      reason: 'Thực phẩm chức năng / Sản phẩm bồi bổ không thuộc phạm vi chi trả BHYT',
      statutoryCode: 'NON_BHYT_SUPPLEMENT',
      lawRef: 'Luật Bảo hiểm Y tế'
    };
  }

  // 3. Dịch vụ khám, điều trị theo yêu cầu tự nguyện
  if (/theo yêu cầu|tự nguyện|thẩm mỹ|làm đẹp/i.test(lower)) {
    return {
      eligible: false,
      reason: 'Dịch vụ khám / điều trị theo yêu cầu tự nguyện (Người bệnh tự chi trả)',
      statutoryCode: 'NON_BHYT_ON_DEMAND',
      lawRef: 'Thông tư 13/2023/TT-BYT'
    };
  }

  // 4. Nếu đối tượng có thuộc tính BHYT xác định từ CSDL (dbo.HangHoaYTe / dbo.DichVuKyThuat)
  if (typeof itemOrName === 'object' && itemOrName !== null) {
    if (itemOrName.inBhyt === false || itemOrName.coBHYT === 0 || itemOrName.coBHYT === false || itemOrName.isStatutoryNonBhyt === true) {
      return {
        eligible: false,
        reason: 'Hàng hóa / Dịch vụ ngoài danh mục thanh toán BHYT của cơ sở KCB',
        statutoryCode: 'NON_BHYT_CATALOG',
        lawRef: 'Danh mục KCB cơ sở'
      };
    }
  }

  return {
    eligible: true,
    reason: 'Đủ điều kiện thanh toán BHYT theo quy định',
    statutoryCode: 'BHYT_ELIGIBLE',
    lawRef: 'Thông tư 20/2022/TT-BYT & QĐ 130/QĐ-BYT'
  };
}

/**
 * Phân tích mã thẻ BHYT 15 ký tự chuẩn Bộ Y tế
 * Cấu trúc: 2 ký tự mã đối tượng + 1 ký tự mức hưởng + 2 ký tự mã tỉnh + 10 số định danh
 * Ví dụ: HT2790123456789 -> HT (Hưu trí), 2 (100%), 79 (TP.HCM), 0123456789 (Mã số)
 */
export function parseBhytCard(cardCode) {
  if (!cardCode || typeof cardCode !== 'string' || cardCode.trim().length < 3) {
    return {
      hasInsurance: false,
      code: '',
      groupCode: '',
      groupName: 'Viện phí (Khám tự chi trả)',
      rate: 0,
      copayRate: 100,
      provinceCode: '',
      provinceName: '',
      personalId: '',
      benefitBadge: 'Viện phí',
      benefitBadgeClass: 'gray',
      summary: 'Khám dịch vụ tự chi trả 100%',
      detailText: 'Người bệnh không có thẻ BHYT hoặc tự chi trả toàn bộ chi phí theo bảng giá niêm yết.'
    };
  }

  const clean = cardCode.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  const groupCode = clean.slice(0, 2);
  const rateChar = clean.charAt(2);
  const provinceCode = clean.length >= 5 ? clean.slice(3, 5) : '';
  const personalId = clean.length > 5 ? clean.slice(5) : '';

  const groupInfo = BHYT_GROUPS[groupCode] || { name: `Nhóm đối tượng ${groupCode}`, defaultRate: 80 };
  const provinceName = PROVINCES[provinceCode] || `Mã tỉnh ${provinceCode}`;

  let rate = 80;
  let badgeClass = 'amber';
  let categoryName = 'Nhóm 4 - Đồng chi trả 20%';

  if (rateChar === '1') {
    rate = 100;
    badgeClass = 'teal';
    categoryName = 'Nhóm 1 - Miễn 100% không giới hạn';
  } else if (rateChar === '2') {
    rate = 100;
    badgeClass = 'teal';
    categoryName = 'Nhóm 2 - Hưởng 100% danh mục BHYT';
  } else if (rateChar === '3') {
    rate = 95;
    badgeClass = 'blue';
    categoryName = 'Nhóm 3 - Hưởng 95% (Đồng chi trả 5%)';
  } else if (rateChar === '4') {
    rate = 80;
    badgeClass = 'amber';
    categoryName = 'Nhóm 4 - Hưởng 80% (Đồng chi trả 20%)';
  } else if (rateChar === '5') {
    rate = 100;
    badgeClass = 'teal';
    categoryName = 'Nhóm 5 - Hưởng 100% kỹ thuật cao';
  }

  return {
    hasInsurance: true,
    code: clean,
    groupCode,
    groupName: groupInfo.name,
    rate,
    copayRate: 100 - rate,
    provinceCode,
    provinceName,
    personalId,
    benefitBadge: `BHYT ${rate}%`,
    benefitBadgeClass: badgeClass,
    summary: `Quỹ BHYT chi trả ${rate}% · Cùng chi trả ${100 - rate}%`,
    detailText: `Thẻ ${clean} · ${groupInfo.name} (${provinceName}) · Đúng tuyến hưởng ${rate}%`
  };
}

/**
 * Tính toán minh bạch chi phí KCB theo danh mục BHYT
 */
export function calculateBhytCostBreakdown(items = [], cardCode = '', isCorrectLine = true) {
  const info = parseBhytCard(cardCode);
  const effectiveRate = isCorrectLine ? info.rate : (info.rate > 0 ? 40 : 0); // Trái tuyến ngoại trú: 40%

  let gross = 0;
  let bhytCoveredGross = 0;
  let outOfPocketGross = 0;

  const itemDetails = items.map(item => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const itemTotal = qty * price;
    gross += itemTotal;

    const eligibility = isBhytEligibleItem(item);
    const isEligible = eligibility.eligible && item.insuranceCovered !== false && item.inBhytList !== false && item.inBhyt !== false && info.hasInsurance;
    let itemBhytPay = 0;
    let itemCopay = itemTotal;

    if (isEligible) {
      bhytCoveredGross += itemTotal;
      itemBhytPay = Math.round((itemTotal * effectiveRate) / 100);
      itemCopay = itemTotal - itemBhytPay;
    } else {
      outOfPocketGross += itemTotal;
    }

    return {
      ...item,
      itemTotal,
      itemGross: itemTotal,
      isEligible,
      nonBhytReason: !eligibility.eligible ? eligibility.reason : (item.nonBhytReason || undefined),
      itemBhytPay,
      bhytAmount: itemBhytPay,
      itemCopay,
      patientAmount: itemCopay
    };
  });

  const totalBhytPaid = Math.round((bhytCoveredGross * effectiveRate) / 100);
  const totalPatientCopay = bhytCoveredGross - totalBhytPaid;
  const totalPatientDue = totalPatientCopay + outOfPocketGross;

  return {
    info,
    effectiveRate,
    isCorrectLine,
    gross,
    bhytCoveredGross,
    totalBhytPaid,
    totalPatientCopay,
    outOfPocketGross,
    totalPatientDue,
    itemDetails,
    itemized: itemDetails
  };
}
