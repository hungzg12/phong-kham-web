$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$servers = @('.\MSSQLVESE', '.\SQLEXPRESS', 'localhost', '127.0.0.1')
$db = $null
foreach ($srv in $servers) {
    try {
        $candidate = [System.Data.SqlClient.SqlConnection]::new("Server=$srv;Database=QuanLyBenhVien;Integrated Security=True;TrustServerCertificate=True;Connect Timeout=2")
        $candidate.Open()
        $db = $candidate
        break
    } catch { }
}
if ($null -eq $db) { throw "Cannot connect to SQL Server database QuanLyBenhVien." }

try {
    $inputRaw = [Console]::In.ReadToEnd()
    $payload = if ($inputRaw) { $inputRaw | ConvertFrom-Json } else { @{} }
    $action = if ($payload.action) { $payload.action.ToString() } else { 'get_visit_detail' }

    # -------------------------------------------------------------
    # 1. GET VISIT DETAIL & CLINICAL CONTEXT
    # -------------------------------------------------------------
    if ($action -eq 'get_visit_detail') {
        $visitId = if ($payload.visitId) { $payload.visitId.ToString().Trim() } else { throw "visitId is required." }

        $cmd = $db.CreateCommand()
        $cmd.CommandText = @"
SELECT l.maLuotKham AS id,
       l.soThuTu AS queueNumber,
       CONVERT(varchar(10), l.ngayKham, 23) AS date,
       LEFT(CONVERT(varchar(8), l.thoiDiemCapSo, 108), 5) AS time,
       l.lyDoKham AS reason,
       l.trangThai AS statusRaw,
       CASE l.trangThai
           WHEN 'CHO_KHAM' THEN N'Chờ khám'
           WHEN 'DANG_KHAM' THEN N'Đang khám'
           WHEN 'CHO_KET_QUA' THEN N'Chờ kết quả'
           WHEN 'HOAN_TAT' THEN N'Hoàn tất'
           WHEN 'DA_HUY' THEN N'Đã hủy'
           ELSE l.trangThai
       END AS status,
       r.tenBuong AS room,
       r.maBuong AS roomCode,
       k.tenKhoa AS department,
       -- Patient details
       b.maBenhNhan AS patientId,
       b.hoTen AS patientName,
       CONVERT(varchar(10), b.ngaySinh, 23) AS birth,
       b.gioiTinh AS gender,
       ISNULL(b.soDienThoai, '') AS phone,
       ISNULL(b.soDinhDanh, '') AS cccd,
       ISNULL(b.soBHYT, '') AS insurance,
       ISNULL(b.diaChi, '') AS address,
       ISNULL(b.diUngThuoc, '') AS allergy,
       b.trangThaiDiUng AS allergyStatus,
       -- Clinical Exam note
       h.maHoSoKham AS examId,
       ISNULL(h.benhSu, '') AS symptoms,
       ISNULL(h.tienSuBanThan, '') AS medicalHistory,
       ISNULL(h.khamToanThan, '') AS generalExam,
       ISNULL(h.khamBoPhan, '') AS systemExam,
       ISNULL(h.chanDoanSoBo, '') AS preliminaryDiagnosis,
       ISNULL(h.maICDSoBo, '') AS preliminaryIcd,
       ISNULL(h.chanDoanXacDinh, '') AS diagnosis,
       ISNULL(h.maICDXacDinh, '') AS icd,
       ISNULL(h.huongDieuTri, '') AS [plan],
       ISNULL(h.loiDanBacSi, '') AS advice,
       ISNULL(h.trangThai, 'DANG_KHAM') AS examStatus,
       -- Latest Vitals
       v.maPhieu AS vitalsId,
       v.mach AS pulse,
       v.nhietDo AS temperature,
       v.huyetApTamThu AS bpSystolic,
       v.huyetApTamTruong AS bpDiastolic,
       v.nhipTho AS respiration,
       v.spo2 AS spo2,
       v.chieuCao AS height,
       v.canNang AS weight,
       v.bmi AS bmi
FROM dbo.LuotKham l
JOIN dbo.BenhNhan b ON b.maBenhNhan = l.maBenhNhan
JOIN dbo.BuongKham r ON r.maBuong = l.maBuong
JOIN dbo.Khoa k ON k.maKhoa = r.maKhoa
LEFT JOIN dbo.HoSoKham h ON h.maLuotKham = l.maLuotKham
OUTER APPLY (
    SELECT TOP 1 * FROM dbo.PhieuSinhHieu WHERE maLuotKham = l.maLuotKham ORDER BY thoiDiemDo DESC
) v
WHERE l.maLuotKham = @vId
FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
"@
        $cmd.Parameters.AddWithValue("@vId", $visitId) | Out-Null
        $reader = $cmd.ExecuteReader()
        $json = [System.Text.StringBuilder]::new()
        while ($reader.Read()) { $null = $json.Append($reader.GetString(0)) }
        if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('{}') }
    }

    # -------------------------------------------------------------
    # 2. SAVE VITALS (Lưu phiếu sinh hiệu)
    # -------------------------------------------------------------
    elseif ($action -eq 'save_vitals') {
        $visitId = if ($payload.visitId) { $payload.visitId.ToString().Trim() } else { throw "visitId is required." }
        $pulse = if ($payload.pulse) { [int]$payload.pulse } else { $null }
        $temp = if ($payload.temperature) { [decimal]$payload.temperature } else { $null }
        $bpSys = if ($payload.bpSystolic) { [int]$payload.bpSystolic } else { $null }
        $bpDia = if ($payload.bpDiastolic) { [int]$payload.bpDiastolic } else { $null }
        $resp = if ($payload.respiration) { [int]$payload.respiration } else { $null }
        $spo2 = if ($payload.spo2) { [decimal]$payload.spo2 } else { $null }
        $height = if ($payload.height) { [decimal]$payload.height } else { $null }
        $weight = if ($payload.weight) { [decimal]$payload.weight } else { $null }
        $note = if ($payload.note) { $payload.note.ToString().Trim() } else { '' }

        $staffId = 'NV-BS01'

        $cmd = $db.CreateCommand()
        $cmd.CommandText = @"
DECLARE @maPhieu VARCHAR(20) = 'SH-' + RIGHT(REPLACE(@vId, '-', ''), 12);

MERGE dbo.PhieuSinhHieu AS target
USING (SELECT @maPhieu AS maPhieu, @vId AS maLuotKham) AS source
ON (target.maLuotKham = source.maLuotKham)
WHEN MATCHED THEN
    UPDATE SET target.thoiDiemDo = SYSDATETIME(),
               target.mach = @pulse,
               target.nhietDo = @temp,
               target.huyetApTamThu = @bpSys,
               target.huyetApTamTruong = @bpDia,
               target.nhipTho = @resp,
               target.spo2 = @spo2,
               target.chieuCao = @height,
               target.canNang = @weight,
               target.ghiChu = @note
WHEN NOT MATCHED THEN
    INSERT (maPhieu, maLuotKham, maNhanVien, thoiDiemDo, mach, nhietDo, huyetApTamThu, huyetApTamTruong, nhipTho, spo2, chieuCao, canNang, ghiChu)
    VALUES (@maPhieu, @vId, @staff, SYSDATETIME(), @pulse, @temp, @bpSys, @bpDia, @resp, @spo2, @height, @weight, @note);
"@
        $valPulse = if ($pulse) { $pulse } else { [DBNull]::Value }
        $valTemp = if ($temp) { $temp } else { [DBNull]::Value }
        $valBpSys = if ($bpSys) { $bpSys } else { [DBNull]::Value }
        $valBpDia = if ($bpDia) { $bpDia } else { [DBNull]::Value }
        $valResp = if ($resp) { $resp } else { [DBNull]::Value }
        $valSpo2 = if ($spo2) { $spo2 } else { [DBNull]::Value }
        $valHeight = if ($height) { $height } else { [DBNull]::Value }
        $valWeight = if ($weight) { $weight } else { [DBNull]::Value }
        $valNote = if ($note) { $note } else { [DBNull]::Value }

        $cmd.Parameters.AddWithValue("@vId", $visitId) | Out-Null
        $cmd.Parameters.AddWithValue("@staff", $staffId) | Out-Null
        $cmd.Parameters.AddWithValue("@pulse", $valPulse) | Out-Null
        $cmd.Parameters.AddWithValue("@temp", $valTemp) | Out-Null
        $cmd.Parameters.AddWithValue("@bpSys", $valBpSys) | Out-Null
        $cmd.Parameters.AddWithValue("@bpDia", $valBpDia) | Out-Null
        $cmd.Parameters.AddWithValue("@resp", $valResp) | Out-Null
        $cmd.Parameters.AddWithValue("@spo2", $valSpo2) | Out-Null
        $cmd.Parameters.AddWithValue("@height", $valHeight) | Out-Null
        $cmd.Parameters.AddWithValue("@weight", $valWeight) | Out-Null
        $cmd.Parameters.AddWithValue("@note", $valNote) | Out-Null
        $cmd.ExecuteNonQuery() | Out-Null

        $res = @{ success = $true; vitalsId = $visitId; message = 'Đã lưu sinh hiệu vào SQL Server' } | ConvertTo-Json -Compress
        [Console]::Write($res)
    }

    # -------------------------------------------------------------
    # 3. SAVE CLINICAL EXAM NOTE (Lưu phiếu khám bệnh)
    # -------------------------------------------------------------
    elseif ($action -eq 'save_exam_note') {
        $visitId = if ($payload.visitId) { $payload.visitId.ToString().Trim() } else { throw "visitId is required." }
        $symptoms = if ($payload.symptoms) { $payload.symptoms.ToString().Trim() } else { '' }
        $history = if ($payload.history) { $payload.history.ToString().Trim() } else { '' }
        $examination = if ($payload.examination) { $payload.examination.ToString().Trim() } else { '' }
        $diagnosis = if ($payload.diagnosis) { $payload.diagnosis.ToString().Trim() } else { '' }
        $icd = if ($payload.icd) { $payload.icd.ToString().Trim().ToUpper() } elseif ($payload.icdCode) { $payload.icdCode.ToString().Trim().ToUpper() } else { $null }
        $plan = if ($payload.plan) { $payload.plan.ToString().Trim() } else { '' }
        $advice = if ($payload.advice) { $payload.advice.ToString().Trim() } else { '' }
        $outcome = if ($payload.outcome) { $payload.outcome.ToString().Trim() } else { 'Điều trị ngoại trú' }

        $staffId = 'NV-BS01'
        $visitStatus = if ($outcome -eq 'Chờ kết quả CLS') { 'CHO_KET_QUA_CLS' } else { 'DANG_KHAM' }

        $tx = $db.BeginTransaction()
        try {
            $cmd = $db.CreateCommand()
            $cmd.Transaction = $tx
            $cmd.CommandText = @"
DECLARE @maHS VARCHAR(20) = 'HS-' + RIGHT(REPLACE(@vId, '-', ''), 12);

MERGE dbo.HoSoKham AS target
USING (SELECT @vId AS maLuotKham) AS source
ON (target.maLuotKham = source.maLuotKham)
WHEN MATCHED THEN
    UPDATE SET target.benhSu = @symptoms,
               target.tienSuBanThan = @history,
               target.khamToanThan = @exam,
               target.chanDoanXacDinh = @diag,
               target.maICDXacDinh = @icd,
               target.huongDieuTri = @plan,
               target.loiDanBacSi = @advice,
               target.trangThai = 'DANG_KHAM'
WHEN NOT MATCHED THEN
    INSERT (maHoSoKham, maLuotKham, maBacSi, benhSu, tienSuBanThan, khamToanThan, chanDoanXacDinh, maICDXacDinh, huongDieuTri, loiDanBacSi, trangThai)
    VALUES (@maHS, @vId, @staff, @symptoms, @history, @exam, @diag, @icd, @plan, @advice, 'DANG_KHAM');

-- Update visit status
UPDATE dbo.LuotKham 
SET trangThai = @vStatus 
WHERE maLuotKham = @vId;
"@
            $valIcd = if ($icd) { $icd } else { [DBNull]::Value }
            $cmd.Parameters.AddWithValue("@vId", $visitId) | Out-Null
            $cmd.Parameters.AddWithValue("@staff", $staffId) | Out-Null
            $cmd.Parameters.AddWithValue("@symptoms", $symptoms) | Out-Null
            $cmd.Parameters.AddWithValue("@history", $history) | Out-Null
            $cmd.Parameters.AddWithValue("@exam", $examination) | Out-Null
            $cmd.Parameters.AddWithValue("@diag", $diagnosis) | Out-Null
            $cmd.Parameters.AddWithValue("@icd", $valIcd) | Out-Null
            $cmd.Parameters.AddWithValue("@plan", $plan) | Out-Null
            $cmd.Parameters.AddWithValue("@advice", $advice) | Out-Null
            $cmd.Parameters.AddWithValue("@vStatus", $visitStatus) | Out-Null
            $cmd.ExecuteNonQuery() | Out-Null

            $tx.Commit()

            $res = @{ success = $true; recordId = $visitId; message = 'Đã lưu phiếu khám vào CSDL SQL Server' } | ConvertTo-Json -Compress
            [Console]::Write($res)
        } catch {
            if ($tx) { try { $tx.Rollback() } catch {} }
            throw $_
        }
    }

    # -------------------------------------------------------------
    # 4. LOCK RECORD / SIGN EMR (Ký số & Khóa bệnh án)
    # -------------------------------------------------------------
    elseif ($action -eq 'lock_record') {
        $visitId = if ($payload.visitId) { $payload.visitId.ToString().Trim() } else { throw "visitId is required." }

        $tx = $db.BeginTransaction()
        try {
            $cmd = $db.CreateCommand()
            $cmd.Transaction = $tx
            $cmd.CommandText = @"
UPDATE dbo.HoSoKham 
SET trangThai = 'KHOA', 
    thoiDiemHoanTat = SYSDATETIME() 
WHERE maLuotKham = @vId;

UPDATE dbo.LuotKham 
SET trangThai = 'HOAN_TAT_KHAM', 
    thoiDiemKetThuc = SYSDATETIME() 
WHERE maLuotKham = @vId;
"@
            $cmd.Parameters.AddWithValue("@vId", $visitId) | Out-Null
            $cmd.ExecuteNonQuery() | Out-Null
            $tx.Commit()

            $res = @{ success = $true; message = 'Đã khóa bệnh án và hoàn tất ca khám' } | ConvertTo-Json -Compress
            [Console]::Write($res)
        } catch {
            if ($tx) { try { $tx.Rollback() } catch {} }
            throw $_
        }
    }
} finally {
    $db.Dispose()
}
