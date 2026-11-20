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
    $action = if ($payload.action) { $payload.action.ToString() } else { 'list_beds' }

    # -------------------------------------------------------------
    # 1. LIST BEDS WITH REAL-TIME OCCUPANCY (Lấy tình trạng buồng giường)
    # -------------------------------------------------------------
    if ($action -eq 'list_beds') {
        $cmd = $db.CreateCommand()
        $cmd.CommandText = @"
SELECT g.maGiuong AS id,
       g.soHieuGiuong AS bedNumber,
       b.maBuongBenh AS roomId,
       b.tenBuong AS roomName,
       k.maKhoa AS departmentId,
       k.tenKhoa AS departmentName,
       b.viTri AS location,
       g.loaiGiuong AS bedTypeRaw,
       CASE g.loaiGiuong
           WHEN 'THUONG' THEN N'Giường chuẩn'
           WHEN 'CAP_CUU' THEN N'Giường cấp cứu'
           WHEN 'HOI_SUC_VIP' THEN N'Giường hồi sức VIP'
           ELSE g.loaiGiuong
       END AS bedType,
       g.donGiaNgay AS dailyRate,
       g.trangThaiHienTai AS statusRaw,
       CASE g.trangThaiHienTai
           WHEN 'TRONG' THEN N'Sẵn sàng'
           WHEN 'DANG_SU_DUNG' THEN N'Đang sử dụng'
           WHEN 'DANG_VE_SINH' THEN N'Chờ khử khuẩn'
           WHEN 'BAO_TRI' THEN N'Bảo trì'
           ELSE g.trangThaiHienTai
       END AS status,
       pg.maDotDieuTri AS admissionId,
       bn.maBenhNhan AS patientId,
       bn.hoTen AS patientName,
       CONVERT(varchar(16), pg.tuThoiDiem, 120) AS occupiedSince
FROM dbo.GiuongBenh g
JOIN dbo.BuongBenh b ON b.maBuongBenh = g.maBuongBenh
JOIN dbo.Khoa k ON k.maKhoa = b.maKhoa
LEFT JOIN dbo.PhanGiuong pg ON pg.maGiuong = g.maGiuong AND pg.trangThai = 'DANG_SU_DUNG'
LEFT JOIN dbo.DotDieuTri d ON d.maDotDieuTri = pg.maDotDieuTri
LEFT JOIN dbo.BenhNhan bn ON bn.maBenhNhan = d.maBenhNhan
WHERE g.dangHoatDong = 1
ORDER BY k.tenKhoa, b.tenBuong, g.soHieuGiuong
FOR JSON PATH;
"@
        $reader = $cmd.ExecuteReader()
        $json = [System.Text.StringBuilder]::new()
        while ($reader.Read()) { $null = $json.Append($reader.GetString(0)) }
        if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('[]') }
    }

    # -------------------------------------------------------------
    # 2. ADMIT INPATIENT & ASSIGN BED (Tiếp nhận nội trú & Xếp giường)
    # -------------------------------------------------------------
    elseif ($action -eq 'admit_inpatient') {
        $patientId = if ($payload.patientId) { $payload.patientId.ToString().Trim() } else { throw "patientId is required." }
        $bedId = if ($payload.bedId) { $payload.bedId.ToString().Trim() } else { throw "bedId is required." }
        $visitId = if ($payload.visitId) { $payload.visitId.ToString().Trim() } else { $null }
        $dept = if ($payload.department) { $payload.department.ToString().Trim() } else { 'NOI' }
        $reason = if ($payload.reason) { $payload.reason.ToString().Trim() } else { 'Theo dõi điều trị nội trú' }
        $diagnosis = if ($payload.diagnosis) { $payload.diagnosis.ToString().Trim() } else { 'Viêm phế quản phổi cấp' }
        $icd = if ($payload.icdCode) { $payload.icdCode.ToString().Trim() } else { 'J20' }

        $tx = $db.BeginTransaction()
        try {
            # Check bed availability
            $cmdCheckBed = $db.CreateCommand()
            $cmdCheckBed.Transaction = $tx
            $cmdCheckBed.CommandText = @"
SELECT g.trangThaiHienTai, g.donGiaNgay, b.maKhoa
FROM dbo.GiuongBenh g
JOIN dbo.BuongBenh b ON b.maBuongBenh = g.maBuongBenh
WHERE g.maGiuong = @gId;
"@
            $cmdCheckBed.Parameters.AddWithValue("@gId", $bedId) | Out-Null
            $rdrBed = $cmdCheckBed.ExecuteReader()
            if (-not $rdrBed.Read()) { throw "Không tìm thấy giường $bedId." }
            $bedStatus = $rdrBed['trangThaiHienTai'].ToString()
            $rate = [decimal]$rdrBed['donGiaNgay']
            $bedDept = $rdrBed['maKhoa'].ToString()
            $rdrBed.Close()

            if ($bedStatus -ne 'TRONG') {
                throw "Giường $bedId không ở trạng thái sẵn sàng (Hiện tại: $bedStatus)."
            }

            $maDot = "BA-" + (Get-Date).ToString("yyMMdd") + "-" + (Get-Random -Minimum 1000 -Maximum 9999)
            $maPG = "PG-" + (Get-Date).ToString("yyMMdd") + "-" + (Get-Random -Minimum 1000 -Maximum 9999)

            # Insert DotDieuTri
            $cmdDot = $db.CreateCommand()
            $cmdDot.Transaction = $tx
            $cmdDot.CommandText = @"
INSERT INTO dbo.DotDieuTri (
    maDotDieuTri, maBenhNhan, maLuotKham, maKhoaDieuTri,
    thoiDiemNhapVien, lyDoNhapVien, chanDoanVaoVien, maICDVaoVien,
    maBacSiDieuTriChinh, soThuTuToDieuTri, trangThai,
    tienTamUngHienTai, tongChiPhiHienTai
) VALUES (
    @maDot, @bnId, @vId, @khoa,
    SYSDATETIME(), @reason, @diag, @icd,
    'NV-BS01', 1, 'DANG_DIEU_TRI',
    0, 0
);
"@
            $cmdDot.Parameters.AddWithValue("@maDot", $maDot) | Out-Null
            $cmdDot.Parameters.AddWithValue("@bnId", $patientId) | Out-Null
            $valVisit = if ($visitId) { $visitId } else { [DBNull]::Value }
            $cmdDot.Parameters.AddWithValue("@vId", $valVisit) | Out-Null
            $cmdDot.Parameters.AddWithValue("@khoa", $bedDept) | Out-Null
            $cmdDot.Parameters.AddWithValue("@reason", $reason) | Out-Null
            $cmdDot.Parameters.AddWithValue("@diag", $diagnosis) | Out-Null
            $cmdDot.Parameters.AddWithValue("@icd", $icd) | Out-Null
            $cmdDot.ExecuteNonQuery() | Out-Null

            # Insert PhanGiuong
            $cmdPG = $db.CreateCommand()
            $cmdPG.Transaction = $tx
            $cmdPG.CommandText = @"
INSERT INTO dbo.PhanGiuong (
    maPhanGiuong, maDotDieuTri, maGiuong,
    tuThoiDiem, donGiaApDung, trangThai, maNhanVienXep
) VALUES (
    @maPG, @maDot, @gId,
    SYSDATETIME(), @rate, 'DANG_SU_DUNG', 'NV-DD01'
);
"@
            $cmdPG.Parameters.AddWithValue("@maPG", $maPG) | Out-Null
            $cmdPG.Parameters.AddWithValue("@maDot", $maDot) | Out-Null
            $cmdPG.Parameters.AddWithValue("@gId", $bedId) | Out-Null
            $cmdPG.Parameters.AddWithValue("@rate", $rate) | Out-Null
            $cmdPG.ExecuteNonQuery() | Out-Null

            # Update GiuongBenh status to DANG_SU_DUNG
            $cmdUpBed = $db.CreateCommand()
            $cmdUpBed.Transaction = $tx
            $cmdUpBed.CommandText = @"
UPDATE dbo.GiuongBenh SET trangThaiHienTai = 'DANG_SU_DUNG' WHERE maGiuong = @gId;
"@
            $cmdUpBed.Parameters.AddWithValue("@gId", $bedId) | Out-Null
            $cmdUpBed.ExecuteNonQuery() | Out-Null

            $tx.Commit()

            $res = @{
                success = $true
                admissionId = $maDot
                bedId = $bedId
                patientId = $patientId
                message = "Đã tiếp nhận nội trú bệnh án $maDot và xếp giường $bedId thành công."
            } | ConvertTo-Json -Compress
            [Console]::Write($res)
        } catch {
            if ($tx) { try { $tx.Rollback() } catch {} }
            throw $_
        }
    }

    # -------------------------------------------------------------
    # 3. DISCHARGE INPATIENT & RELEASE BED (Ra viện & Giải phóng giường)
    # -------------------------------------------------------------
    elseif ($action -eq 'discharge_inpatient') {
        $admissionId = if ($payload.admissionId) { $payload.admissionId.ToString().Trim() } else { throw "admissionId is required." }
        $diagnosis = if ($payload.dischargeDiagnosis) { $payload.dischargeDiagnosis.ToString().Trim() } else { 'Bệnh ổn định, hết sốt' }
        $icd = if ($payload.icdCode) { $payload.icdCode.ToString().Trim() } else { 'J20' }
        $result = if ($payload.treatmentResult) { $payload.treatmentResult.ToString().Trim() } else { 'DO_GIAM' }
        $advice = if ($payload.dischargeAdvice) { $payload.dischargeAdvice.ToString().Trim() } else { 'Uống thuốc theo đơn ra viện, tái khám sau 7 ngày' }

        $tx = $db.BeginTransaction()
        try {
            # Find active bed assignment
            $cmdFindBed = $db.CreateCommand()
            $cmdFindBed.Transaction = $tx
            $cmdFindBed.CommandText = @"
SELECT maPhanGiuong, maGiuong 
FROM dbo.PhanGiuong 
WHERE maDotDieuTri = @dotId AND trangThai = 'DANG_SU_DUNG';
"@
            $cmdFindBed.Parameters.AddWithValue("@dotId", $admissionId) | Out-Null
            $rdrFind = $cmdFindBed.ExecuteReader()
            $activeAssignments = @()
            while ($rdrFind.Read()) {
                $activeAssignments += @{
                    maPG = $rdrFind['maPhanGiuong'].ToString()
                    maGiuong = $rdrFind['maGiuong'].ToString()
                }
            }
            $rdrFind.Close()

            # Close bed assignments and set beds to DANG_VE_SINH (Cleaning)
            foreach ($asgn in $activeAssignments) {
                $cmdClosePG = $db.CreateCommand()
                $cmdClosePG.Transaction = $tx
                $cmdClosePG.CommandText = @"
UPDATE dbo.PhanGiuong 
SET denThoiDiem = SYSDATETIME(), 
    trangThai = 'DA_KET_THUC', 
    lyDoKetThuc = N'Bệnh nhân ra viện' 
WHERE maPhanGiuong = @pgId;

UPDATE dbo.GiuongBenh 
SET trangThaiHienTai = 'DANG_VE_SINH' 
WHERE maGiuong = @gId;
"@
                $cmdClosePG.Parameters.AddWithValue("@pgId", $asgn.maPG) | Out-Null
                $cmdClosePG.Parameters.AddWithValue("@gId", $asgn.maGiuong) | Out-Null
                $cmdClosePG.ExecuteNonQuery() | Out-Null
            }

            # Update DotDieuTri to DA_XUAT_VIEN
            $cmdCloseDot = $db.CreateCommand()
            $cmdCloseDot.Transaction = $tx
            $cmdCloseDot.CommandText = @"
UPDATE dbo.DotDieuTri 
SET thoiDiemRaVien = SYSDATETIME(),
    thoiDiemDongDot = SYSDATETIME(),
    chanDoanRaVien = @diag,
    maICDRaVien = @icd,
    ketQuaDieuTri = @res,
    loiDanRaVien = @advice,
    trangThai = 'DA_XUAT_VIEN'
WHERE maDotDieuTri = @dotId;
"@
            $cmdCloseDot.Parameters.AddWithValue("@dotId", $admissionId) | Out-Null
            $cmdCloseDot.Parameters.AddWithValue("@diag", $diagnosis) | Out-Null
            $cmdCloseDot.Parameters.AddWithValue("@icd", $icd) | Out-Null
            $cmdCloseDot.Parameters.AddWithValue("@res", $result) | Out-Null
            $cmdCloseDot.Parameters.AddWithValue("@advice", $advice) | Out-Null
            $cmdCloseDot.ExecuteNonQuery() | Out-Null

            $tx.Commit()

            $res = @{
                success = $true
                admissionId = $admissionId
                releasedBeds = $activeAssignments.Count
                message = "Đã tổng kết ra viện cho bệnh án $admissionId và chuyển giường sang chờ khử khuẩn."
            } | ConvertTo-Json -Compress
            [Console]::Write($res)
        } catch {
            if ($tx) { try { $tx.Rollback() } catch {} }
            throw $_
        }
    }
} finally {
    $db.Dispose()
}
