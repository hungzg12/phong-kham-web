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
        p.soCCCD AS cccd,
        p.maSoBHYT AS insurance,
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
        g.huongDieuTriTiep AS plan,
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
        h.huongDieuTriThongNhat AS plan,
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
        p.maSoBHYT AS insurance,
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
        p.maSoBHYT AS insurance,
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
          coSoTiepNhan = @destination,
          lyDoChuyen = @reason,
          tomTatBenhSu = @symptoms,
          tomTatCLS = @labSummary,
          chanDoanChuyen = @diagnosis,
          phuongPhapDieuTri = @treatment,
          tinhTrangNguoiBenh = @condition,
          huongDieuTriTiep = @plan,
          phuongTienVanChuyen = @transport,
          nguoiHoTong = @escort
      WHEN NOT MATCHED THEN
        INSERT (maGiayChuyenTuyen, soVaoSo, maBenhNhan, coSoTiepNhan, lyDoChuyen, tomTatBenhSu, tomTatCLS, chanDoanChuyen, phuongPhapDieuTri, tinhTrangNguoiBenh, huongDieuTriTiep, phuongTienVanChuyen, nguoiHoTong)
        VALUES (@id, @soVaoSo, @patientId, @destination, @reason, @symptoms, @labSummary, @diagnosis, @treatment, @condition, @plan, @transport, @escort);
    `, {
      id,
      soVaoSo: d.soVaoSo || '01/2026/GCT',
      patientId: d.patient || d.patientId || 'BN-240101-001',
      destination: d.destination || 'Bệnh viện Chợ Rẫy',
      reason: d.reason || 'Vượt khả năng chuyên môn',
      symptoms: d.symptoms || d.note || '',
      labSummary: d.labSummary || '',
      diagnosis: d.diagnosis || '',
      treatment: d.treatment || '',
      condition: d.condition || 'Ổn định',
      plan: d.plan || '',
      transport: d.transport || 'Xe cứu thương',
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
          lyDoHoiChan = @reason,
          thanhVienThamGia = @participants,
          tomTatDienBien = @summary,
          chanDoanThongNhat = @conclusion,
          huongDieuTriThongNhat = @plan
      WHEN NOT MATCHED THEN
        INSERT (maBienBan, maDotDieuTri, thoiDiemHoiChan, diaDiem, hinhThucHoiChan, lyDoHoiChan, maChuToa, maThuKy, thanhVienThamGia, tomTatDienBien, chanDoanThongNhat, huongDieuTriThongNhat, trangThai)
        VALUES (@id, @episodeId, SYSUTCDATETIME(), @location, 'LIEN_KHOA', @reason, @leader, @secretary, @participants, @summary, @conclusion, @plan, 'DA_DUYET');
    `, {
      id,
      episodeId: d.episodeId || 'BA-261121-EA9A',
      location: d.location || 'Phòng Giao ban Bệnh viện',
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
          chanDoanRaVien = @diagnosis,
          phuongPhapDieuTri = @treatment,
          ketQuaDieuTri = @outcome,
          soNgayNghiBHXH = @daysOff,
          loiDanBacSi = @advice
      WHEN NOT MATCHED THEN
        INSERT (maGiayRaVien, soLuuTru, maBenhNhan, maDotDieuTri, maKhoaRaVien, ngayVaoVien, ngayRaVien, chanDoanVaoVien, chanDoanRaVien, phuongPhapDieuTri, ketQuaDieuTri, soNgayNghiBHXH, loiDanBacSi, trangThai)
        VALUES (@id, @soLuuTru, @patientId, @episodeId, 'KHOA_NOI', DATEADD(day, -5, SYSUTCDATETIME()), SYSUTCDATETIME(), @diagnosis, @diagnosis, @treatment, @outcome, @daysOff, @advice, N'Đã hoàn tất');
    `, {
      id,
      soLuuTru: d.soLuuTru || ('RV-2026/' + id),
      patientId: d.patient || d.patientId || 'BN-240101-001',
      episodeId: d.episodeId || 'BA-261121-EA9A',
      diagnosis: d.diagnosis || '',
      treatment: d.treatment || '',
      outcome: d.outcome || 'Đỡ / giảm',
      daysOff: Number(d.daysOff || d.soNgayNghiBHXH || 7),
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
          phuongPhapDieuTri = @treatment,
          tinhTrangRaVien = @outcome,
          ghiChuLoiDan = @advice
      WHEN NOT MATCHED THEN
        INSERT (maTomTat, maBenhNhan, maLuotKham, quaTrinhBenhLy, tomTatCLS, chanDoan, phuongPhapDieuTri, tinhTrangRaVien, ghiChuLoiDan, trangThai)
        VALUES (@id, @patientId, @episodeId, @pathology, @labSummary, @diagnosis, @treatment, @outcome, @advice, N'Đã hoàn tất');
    `, {
      id,
      patientId: d.patient || d.patientId || 'BN-240101-001',
      episodeId: d.episodeId || null,
      pathology: d.pathology || d.quaTrinhBenhLy || '',
      labSummary: d.labSummary || d.tomTatCLS || '',
      diagnosis: d.diagnosis || '',
      treatment: d.treatment || d.phuongPhapDieuTri || '',
      outcome: d.outcome || d.tinhTrangRaVien || 'Ổn định',
      advice: d.advice || d.ghiChuLoiDan || ''
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
