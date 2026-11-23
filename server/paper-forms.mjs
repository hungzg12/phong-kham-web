import { querySql } from './admin-store.mjs';

export async function getPaperFormData(type, id) {
  if (type === 'referrals') {
    const json = await querySql(`
      SELECT 
        g.maGiayChuyenTuyen AS id,
        g.soVaoSo,
        g.maBenhNhan AS patient,
        p.hoTen AS patientName,
        p.gioiTinh AS gender,
        CONVERT(varchar(10), p.ngaySinh, 23) AS birth,
        p.soDienThoai AS phone,
        p.soDinhDanh AS cccd,
        p.soBHYT AS insurance,
        p.diaChi AS address,
        g.coSoTiepNhan AS destination,
        g.maCSKCBTiepNhan AS destinationCode,
        g.tuyenTiepNhan AS level,
        g.lyDoChuyen AS reason,
        g.tomTatBenhSu AS symptoms,
        g.tomTatCLS AS labSummary,
        g.chanDoanChuyen AS diagnosis,
        g.maICDChuyen AS icd,
        g.phuongPhapDieuTri AS treatment,
        g.tinhTrangNguoiBenh AS condition,
        g.huongDieuTriTiep AS [plan],
        g.phuongTienVanChuyen AS transport,
        g.nguoiHoTong AS escort,
        bs.hoTen AS doctor,
        g.trangThai AS status
      FROM dbo.GiayChuyenTuyen g
      LEFT JOIN dbo.BenhNhan p ON p.maBenhNhan = g.maBenhNhan
      LEFT JOIN dbo.NhanVien bs ON bs.maNhanVien = g.maBacSiDieuTri
      WHERE g.maGiayChuyenTuyen = @id OR g.maLuotKham = @id
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    `, { id });
    return json ? JSON.parse(json) : null;
  }

  if (type === 'consultations') {
    const json = await querySql(`
      SELECT 
        h.maBienBan AS id,
        h.maDotDieuTri AS episodeId,
        h.diaDiem AS location,
        h.hinhThucHoiChan AS formType,
        h.lyDoHoiChan AS reason,
        h.thanhVienThamGia AS participants,
        h.tomTatDienBien AS summary,
        h.chanDoanThongNhat AS conclusion,
        h.huongDieuTriThongNhat AS [plan],
        h.trangThai AS status,
        bs.hoTen AS doctor
      FROM dbo.BienBanHoiChan h
      LEFT JOIN dbo.NhanVien bs ON bs.maNhanVien = h.maChuToa
      WHERE h.maBienBan = @id OR h.maDotDieuTri = @id
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    `, { id });
    return json ? JSON.parse(json) : null;
  }

  if (type === 'discharges') {
    const json = await querySql(`
      SELECT 
        r.maGiayRaVien AS id,
        r.soLuuTru,
        r.maBenhNhan AS patient,
        p.hoTen AS patientName,
        p.gioiTinh AS gender,
        p.soBHYT AS insurance,
        CONVERT(varchar(10), p.ngaySinh, 23) AS birth,
        r.chanDoanVaoVien AS admissionDiagnosis,
        r.chanDoanRaVien AS diagnosis,
        r.maICDRaVien AS icd,
        r.phuongPhapDieuTri AS treatment,
        r.ketQuaDieuTri AS outcome,
        r.soNgayNghiBHXH AS daysOff,
        CONVERT(varchar(10), r.tuNgayNghi, 23) AS leaveFrom,
        CONVERT(varchar(10), r.denNgayNghi, 23) AS leaveTo,
        r.loiDanBacSi AS advice,
        bs.hoTen AS doctor,
        r.trangThai AS status
      FROM dbo.GiayRaVien r
      LEFT JOIN dbo.BenhNhan p ON p.maBenhNhan = r.maBenhNhan
      LEFT JOIN dbo.NhanVien bs ON bs.maNhanVien = r.maBacSiDieuTri
      WHERE r.maGiayRaVien = @id OR r.maDotDieuTri = @id
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    `, { id });
    return json ? JSON.parse(json) : null;
  }

  if (type === 'summaries' || type === 'archives') {
    const json = await querySql(`
      SELECT 
        t.maTomTat AS id,
        t.maBenhNhan AS patient,
        p.hoTen AS patientName,
        p.gioiTinh AS gender,
        p.soBHYT AS insurance,
        CONVERT(varchar(10), p.ngaySinh, 23) AS birth,
        t.quaTrinhBenhLy AS pathology,
        t.tomTatCLS AS labSummary,
        t.chanDoan AS diagnosis,
        t.maICD AS icd,
        t.phuongPhapDieuTri AS treatment,
        t.tinhTrangRaVien AS outcome,
        t.ghiChuLoiDan AS advice,
        bs.hoTen AS doctor,
        t.trangThai AS status
      FROM dbo.TomTatBenhAn t
      LEFT JOIN dbo.BenhNhan p ON p.maBenhNhan = t.maBenhNhan
      LEFT JOIN dbo.NhanVien bs ON bs.maNhanVien = t.maBacSi
      WHERE t.maTomTat = @id OR t.maLuotKham = @id OR t.maDotDieuTri = @id
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    `, { id });
    return json ? JSON.parse(json) : null;
  }

  if (type === 'reexaminations') {
    const json = await querySql(`
      SELECT 
        h.maGiayHen AS id,
        h.soVaoSo,
        h.maBenhNhan AS patient,
        p.hoTen AS patientName,
        p.gioiTinh AS gender,
        p.soBHYT AS insurance,
        p.diaChi AS address,
        p.soDinhDanh AS cccd,
        CONVERT(varchar(10), p.ngaySinh, 23) AS birth,
        CONVERT(varchar(10), h.ngayHenKham, 23) AS appointmentDate,
        h.gioHenKham AS appointmentTime,
        h.khoaPhongHen AS clinicRoom,
        h.lyDoHenKham AS reason,
        h.chanDoanHienTai AS diagnosis,
        h.maICD AS icd,
        h.chiDinhCanLam AS testsNeeded,
        h.loiDanBacSi AS advice,
        bs.hoTen AS doctor,
        h.trangThai AS status
      FROM dbo.GiayHenKhamLai h
      LEFT JOIN dbo.BenhNhan p ON p.maBenhNhan = h.maBenhNhan
      LEFT JOIN dbo.NhanVien bs ON bs.maNhanVien = h.maBacSiHen
      WHERE h.maGiayHen = @id OR h.maLuotKham = @id OR h.maDotDieuTri = @id
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    `, { id });
    return json ? JSON.parse(json) : null;
  }

  return null;
}

export async function savePaperFormData(type, d) {
  if (type === 'referrals') {
    const id = d.id || ('CT-' + Date.now().toString(36).toUpperCase());
    await querySql(`
      MERGE dbo.GiayChuyenTuyen AS target
      USING (SELECT @id AS maGiayChuyenTuyen) AS source
      ON target.maGiayChuyenTuyen = source.maGiayChuyenTuyen
      WHEN MATCHED THEN
        UPDATE SET
          soVaoSo = @soVaoSo,
          coSoTiepNhan = @destination,
          maCSKCBTiepNhan = @destinationCode,
          tuyenTiepNhan = @level,
          lyDoChuyen = @reason,
          tomTatBenhSu = @symptoms,
          tomTatCLS = @labSummary,
          chanDoanChuyen = @diagnosis,
          maICDChuyen = @icd,
          phuongPhapDieuTri = @treatment,
          tinhTrangNguoiBenh = @condition,
          huongDieuTriTiep = @plan,
          phuongTienVanChuyen = @transport,
          nguoiHoTong = @escort
      WHEN NOT MATCHED THEN
        INSERT (maGiayChuyenTuyen, soVaoSo, maBenhNhan, coSoTiepNhan, maCSKCBTiepNhan, tuyenTiepNhan, lyDoChuyen, tomTatBenhSu, tomTatCLS, chanDoanChuyen, maICDChuyen, phuongPhapDieuTri, tinhTrangNguoiBenh, huongDieuTriTiep, phuongTienVanChuyen, nguoiHoTong)
        VALUES (@id, @soVaoSo, @patientId, @destination, @destinationCode, @level, @reason, @symptoms, @labSummary, @diagnosis, @icd, @treatment, @condition, @plan, @transport, @escort);
    `, {
      id,
      soVaoSo: d.soVaoSo || '01/2026/GCT',
      patientId: d.patient || d.patientId || 'BN-240101-001',
      destination: d.destination || 'Bệnh viện Chợ Rẫy TP. Hồ Chí Minh',
      destinationCode: d.destinationCode || '79-015',
      level: d.level || 'Tuyến 1 (Tuyến Trung ương)',
      reason: d.reason || 'Vượt quá năng lực chuyên môn kỹ thuật can thiệp',
      symptoms: d.symptoms || d.note || '',
      labSummary: d.labSummary || '',
      diagnosis: d.diagnosis || '',
      icd: d.icd || 'I20.0',
      treatment: d.treatment || '',
      condition: d.condition || 'Ổn định, tỉnh táo',
      plan: d.plan || '',
      transport: d.transport || 'Xe cứu thương chuyên dụng',
      escort: d.escort || ''
    });
    return { ok: true, id };
  }

  if (type === 'consultations') {
    const id = d.id || ('HC-' + Date.now().toString(36).toUpperCase());
    await querySql(`
      MERGE dbo.BienBanHoiChan AS target
      USING (SELECT @id AS maBienBan) AS source
      ON target.maBienBan = source.maBienBan
      WHEN MATCHED THEN
        UPDATE SET
          diaDiem = @location,
          hinhThucHoiChan = @formType,
          lyDoHoiChan = @reason,
          thanhVienThamGia = @participants,
          tomTatDienBien = @summary,
          chanDoanThongNhat = @conclusion,
          huongDieuTriThongNhat = @plan
      WHEN NOT MATCHED THEN
        INSERT (maBienBan, maDotDieuTri, thoiDiemHoiChan, diaDiem, hinhThucHoiChan, lyDoHoiChan, maChuToa, maThuKy, thanhVienThamGia, tomTatDienBien, chanDoanThongNhat, huongDieuTriThongNhat, trangThai)
        VALUES (@id, @episodeId, SYSUTCDATETIME(), @location, @formType, @reason, @leader, @secretary, @participants, @summary, @conclusion, @plan, 'DA_DUYET');
    `, {
      id,
      episodeId: d.episodeId || 'BA-261121-EA9A',
      location: d.location || 'Phòng Giao ban Bệnh viện',
      formType: d.formType || 'LIEN_KHOA',
      reason: d.reason || '',
      leader: d.leader || 'NV-BS01',
      secretary: d.secretary || 'NV-DD01',
      participants: d.participants || '',
      summary: d.summary || '',
      conclusion: d.conclusion || '',
      plan: d.plan || ''
    });
    return { ok: true, id };
  }

  if (type === 'discharges') {
    const id = d.id || ('RV-' + Date.now().toString(36).toUpperCase());
    await querySql(`
      MERGE dbo.GiayRaVien AS target
      USING (SELECT @id AS maGiayRaVien) AS source
      ON target.maGiayRaVien = source.maGiayRaVien
      WHEN MATCHED THEN
        UPDATE SET
          soLuuTru = @soLuuTru,
          chanDoanVaoVien = @admissionDiagnosis,
          chanDoanRaVien = @diagnosis,
          maICDRaVien = @icd,
          phuongPhapDieuTri = @treatment,
          ketQuaDieuTri = @outcome,
          soNgayNghiBHXH = @daysOff,
          tuNgayNghi = @leaveFrom,
          denNgayNghi = @leaveTo,
          loiDanBacSi = @advice
      WHEN NOT MATCHED THEN
        INSERT (maGiayRaVien, soLuuTru, maBenhNhan, maDotDieuTri, maKhoaRaVien, ngayVaoVien, ngayRaVien, chanDoanVaoVien, chanDoanRaVien, maICDRaVien, phuongPhapDieuTri, ketQuaDieuTri, soNgayNghiBHXH, tuNgayNghi, denNgayNghi, loiDanBacSi, trangThai)
        VALUES (@id, @soLuuTru, @patientId, @episodeId, 'KHOA_NOI', DATEADD(day, -5, SYSUTCDATETIME()), SYSUTCDATETIME(), @admissionDiagnosis, @diagnosis, @icd, @treatment, @outcome, @daysOff, @leaveFrom, @leaveTo, @advice, N'Đã hoàn tất');
    `, {
      id,
      soLuuTru: d.soLuuTru || ('RV-2026/' + id),
      patientId: d.patient || d.patientId || 'BN-240101-001',
      episodeId: d.episodeId || 'BA-261121-EA9A',
      admissionDiagnosis: d.admissionDiagnosis || d.diagnosis || '',
      diagnosis: d.diagnosis || '',
      icd: d.icd || 'E11.9',
      treatment: d.treatment || '',
      outcome: d.outcome || 'Đỡ / giảm',
      daysOff: Number(d.daysOff || d.soNgayNghiBHXH || 7),
      leaveFrom: d.leaveFrom || null,
      leaveTo: d.leaveTo || null,
      advice: d.advice || d.loiDanBacSi || ''
    });
    return { ok: true, id };
  }

  if (type === 'summaries' || type === 'archives') {
    const id = d.id || ('TTBA-' + Date.now().toString(36).toUpperCase());
    await querySql(`
      MERGE dbo.TomTatBenhAn AS target
      USING (SELECT @id AS maTomTat) AS source
      ON target.maTomTat = source.maTomTat
      WHEN MATCHED THEN
        UPDATE SET
          quaTrinhBenhLy = @pathology,
          tomTatCLS = @labSummary,
          chanDoan = @diagnosis,
          maICD = @icd,
          phuongPhapDieuTri = @treatment,
          tinhTrangRaVien = @outcome,
          ghiChuLoiDan = @advice
      WHEN NOT MATCHED THEN
        INSERT (maTomTat, maBenhNhan, maLuotKham, quaTrinhBenhLy, tomTatCLS, chanDoan, maICD, phuongPhapDieuTri, tinhTrangRaVien, ghiChuLoiDan, trangThai)
        VALUES (@id, @patientId, @episodeId, @pathology, @labSummary, @diagnosis, @icd, @treatment, @outcome, @advice, N'Đã hoàn tất');
    `, {
      id,
      patientId: d.patient || d.patientId || 'BN-240101-001',
      episodeId: d.episodeId || null,
      pathology: d.pathology || d.quaTrinhBenhLy || '',
      labSummary: d.labSummary || d.tomTatCLS || '',
      diagnosis: d.diagnosis || '',
      icd: d.icd || 'K29.0',
      treatment: d.treatment || d.phuongPhapDieuTri || '',
      outcome: d.outcome || d.tinhTrangRaVien || 'Ổn định',
      advice: d.advice || d.ghiChuLoiDan || ''
    });
    return { ok: true, id };
  }

  if (type === 'reexaminations') {
    const id = d.id || ('GHKL-' + Date.now().toString(36).toUpperCase());
    await querySql(`
      MERGE dbo.GiayHenKhamLai AS target
      USING (SELECT @id AS maGiayHen) AS source
      ON target.maGiayHen = source.maGiayHen
      WHEN MATCHED THEN
        UPDATE SET
          soVaoSo = @soVaoSo,
          ngayHenKham = @appointmentDate,
          gioHenKham = @appointmentTime,
          khoaPhongHen = @clinicRoom,
          lyDoHenKham = @reason,
          chanDoanHienTai = @diagnosis,
          maICD = @icd,
          chiDinhCanLam = @testsNeeded,
          loiDanBacSi = @advice
      WHEN NOT MATCHED THEN
        INSERT (maGiayHen, soVaoSo, maBenhNhan, maLuotKham, maDotDieuTri, ngayHenKham, gioHenKham, khoaPhongHen, lyDoHenKham, chanDoanHienTai, maICD, chiDinhCanLam, loiDanBacSi, trangThai)
        VALUES (@id, @soVaoSo, @patientId, @episodeId, @admissionId, @appointmentDate, @appointmentTime, @clinicRoom, @reason, @diagnosis, @icd, @testsNeeded, @advice, N'Đang có hiệu lực');
    `, {
      id,
      soVaoSo: d.soVaoSo || '01/2026/GHKL',
      patientId: d.patient || d.patientId || 'BN-240101-001',
      episodeId: d.episodeId || null,
      admissionId: d.admissionId || null,
      appointmentDate: d.appointmentDate || '2026-12-01',
      appointmentTime: d.appointmentTime || '08:30',
      clinicRoom: d.clinicRoom || 'Phòng khám Nội tổng quát 101',
      reason: d.reason || 'Tái khám đánh giá đáp ứng điều trị',
      diagnosis: d.diagnosis || '',
      icd: d.icd || 'I10',
      testsNeeded: d.testsNeeded || '',
      advice: d.advice || d.loiDan || ''
    });
    return { ok: true, id };
  }

  if (type === 'prescriptions') {
    await querySql(`
      UPDATE dbo.DonThuoc
      SET chanDoan = @diagnosis,
          loiDan = @advice
      WHERE maDon = @id;
    `, {
      id: d.id,
      diagnosis: d.diagnosis || '',
      advice: d.advice || d.loiDan || ''
    });
    return { ok: true, id: d.id };
  }

  return { ok: true };
}
