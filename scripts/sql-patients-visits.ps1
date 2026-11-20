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
    $action = if ($payload.action) { $payload.action.ToString() } else { 'list_patients' }

    # -------------------------------------------------------------
    # 1. LIST / SEARCH PATIENTS
    # -------------------------------------------------------------
    if ($action -eq 'list_patients') {
        $q = if ($payload.q) { $payload.q.ToString().Trim() } else { '' }
        $cmd = $db.CreateCommand()
        if ($q) {
            $cmd.CommandText = @"
SELECT TOP (50)
       b.maBenhNhan AS id,
       b.hoTen AS name,
       CONVERT(varchar(10), b.ngaySinh, 23) AS birth,
       b.gioiTinh AS gender,
       ISNULL(b.soDienThoai, '') AS phone,
       ISNULL(b.soDinhDanh, '') AS cccd,
       ISNULL(b.soBHYT, '') AS insurance,
       ISNULL(b.diaChi, '') AS address,
       ISNULL(b.tienSuBenh, '') AS medicalHistory,
       ISNULL(b.diUngThuoc, '') AS allergy,
       b.trangThaiDiUng AS allergyStatus,
       CONVERT(varchar(19), b.ngayTiepNhanDauTien, 120) AS createdAt
FROM dbo.BenhNhan b
WHERE (b.hoTen LIKE N'%' + @q + '%'
    OR b.maBenhNhan LIKE @q + '%'
    OR b.soDienThoai LIKE @q + '%'
    OR b.soDinhDanh LIKE @q + '%'
    OR b.soBHYT LIKE @q + '%')
ORDER BY b.ngayTiepNhanDauTien DESC
FOR JSON PATH;
"@
            $p = $cmd.Parameters.Add("@q", [System.Data.SqlDbType]::NVarChar, 100)
            $p.Value = $q
        } else {
            $cmd.CommandText = @"
SELECT TOP (50)
       b.maBenhNhan AS id,
       b.hoTen AS name,
       CONVERT(varchar(10), b.ngaySinh, 23) AS birth,
       b.gioiTinh AS gender,
       ISNULL(b.soDienThoai, '') AS phone,
       ISNULL(b.soDinhDanh, '') AS cccd,
       ISNULL(b.soBHYT, '') AS insurance,
       ISNULL(b.diaChi, '') AS address,
       ISNULL(b.tienSuBenh, '') AS medicalHistory,
       ISNULL(b.diUngThuoc, '') AS allergy,
       b.trangThaiDiUng AS allergyStatus,
       CONVERT(varchar(19), b.ngayTiepNhanDauTien, 120) AS createdAt
FROM dbo.BenhNhan b
ORDER BY b.ngayTiepNhanDauTien DESC
FOR JSON PATH;
"@
        }

        $reader = $cmd.ExecuteReader()
        $json = [System.Text.StringBuilder]::new()
        while ($reader.Read()) { $null = $json.Append($reader.GetString(0)) }
        if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('[]') }
    }

    # -------------------------------------------------------------
    # 2. CREATE / UPDATE PATIENT
    # -------------------------------------------------------------
    elseif ($action -eq 'create_patient') {
        $hoTen = if ($payload.name) { $payload.name.ToString().Trim() } else { throw "Họ tên không được để trống." }
        $rawGender = if ($payload.gender) { $payload.gender.ToString().Trim() } else { 'Nam' }
        $gioiTinh = if ($rawGender -match '^(Nữ|Nu|Female|F)') { 'Nữ' } elseif ($rawGender -match '^(Khác|Khac|Other)') { 'Khác' } elseif ($rawGender -match '^(Chưa|Chua)') { 'Chưa rõ' } else { 'Nam' }
        $ngaySinh = if ($payload.birth) { $payload.birth.ToString().Trim() } else { $null }
        $soDienThoai = if ($payload.phone) { $payload.phone.ToString().Trim() } else { '' }
        $soDinhDanh = if ($payload.cccd) { $payload.cccd.ToString().Trim() } else { '' }
        $soBHYT = if ($payload.insurance) { $payload.insurance.ToString().Trim() } else { '' }
        $diaChi = if ($payload.address) { $payload.address.ToString().Trim() } else { '' }
        $diUngThuoc = if ($payload.allergy) { $payload.allergy.ToString().Trim() } else { '' }
        $trangThaiDiUng = if ($diUngThuoc) { 'CO_DI_UNG' } else { 'CHUA_KHAI_THAC' }

        # Check existing by CCCD or Phone
        $existingId = $null
        if ($soDinhDanh) {
            $cmdCheck = $db.CreateCommand()
            $cmdCheck.CommandText = "SELECT TOP 1 maBenhNhan FROM dbo.BenhNhan WHERE soDinhDanh = @cccd"
            $cmdCheck.Parameters.AddWithValue("@cccd", $soDinhDanh) | Out-Null
            $existingId = $cmdCheck.ExecuteScalar()
        }

        if ($existingId) {
            $res = @{
                success = $true
                id = $existingId
                name = $hoTen
                isExisting = $true
            } | ConvertTo-Json -Compress
            [Console]::Write($res)
            return
        }

        # Generate standard ID: BN + 6 digits
        $cmdSeq = $db.CreateCommand()
        $cmdSeq.CommandText = @"
SELECT 'BN' + RIGHT('000000' + CAST(ISNULL(MAX(CAST(SUBSTRING(maBenhNhan, 3, 10) AS INT)), 0) + 1 AS VARCHAR(10)), 6)
FROM dbo.BenhNhan
WHERE maBenhNhan LIKE 'BN[0-9]%';
"@
        $newId = $cmdSeq.ExecuteScalar()
        if (-not $newId) { $newId = 'BN000001' }

        $valBirth = if ($ngaySinh) { [DateTime]::Parse($ngaySinh) } else { [DBNull]::Value }
        $valCccd = if ($soDinhDanh) { $soDinhDanh } else { [DBNull]::Value }
        $valBhyt = if ($soBHYT) { $soBHYT } else { [DBNull]::Value }
        $valPhone = if ($soDienThoai) { $soDienThoai } else { [DBNull]::Value }
        $valAddr = if ($diaChi) { $diaChi } else { [DBNull]::Value }
        $valAllergy = if ($diUngThuoc) { $diUngThuoc } else { [DBNull]::Value }

        $cmdInsert = $db.CreateCommand()
        $cmdInsert.CommandText = @"
INSERT INTO dbo.BenhNhan (
    maBenhNhan, hoTen, ngaySinh, gioiTinh, soDinhDanh, soBHYT, soDienThoai, diaChi, 
    diUngThuoc, trangThaiDiUng, trangThaiXacMinh, ngayTiepNhanDauTien
) VALUES (
    @ma, @ten, @birth, @gender, @cccd, @bhyt, @phone, @addr, 
    @allergy, @allergyStatus, 'DA_XAC_MINH', SYSDATETIME()
);
"@
        $cmdInsert.Parameters.Add("@ma", [System.Data.SqlDbType]::VarChar, 20).Value = $newId
        $cmdInsert.Parameters.Add("@ten", [System.Data.SqlDbType]::NVarChar, 100).Value = $hoTen
        $cmdInsert.Parameters.Add("@birth", [System.Data.SqlDbType]::Date).Value = $valBirth
        $cmdInsert.Parameters.Add("@gender", [System.Data.SqlDbType]::NVarChar, 10).Value = $gioiTinh
        $cmdInsert.Parameters.Add("@cccd", [System.Data.SqlDbType]::VarChar, 20).Value = $valCccd
        $cmdInsert.Parameters.Add("@bhyt", [System.Data.SqlDbType]::VarChar, 25).Value = $valBhyt
        $cmdInsert.Parameters.Add("@phone", [System.Data.SqlDbType]::VarChar, 15).Value = $valPhone
        $cmdInsert.Parameters.Add("@addr", [System.Data.SqlDbType]::NVarChar, 255).Value = $valAddr
        $cmdInsert.Parameters.Add("@allergy", [System.Data.SqlDbType]::NVarChar, 255).Value = $valAllergy
        $cmdInsert.Parameters.Add("@allergyStatus", [System.Data.SqlDbType]::VarChar, 20).Value = $trangThaiDiUng
        $cmdInsert.ExecuteNonQuery() | Out-Null

        $res = @{
            success = $true
            id = $newId
            name = $hoTen
            isExisting = $false
        } | ConvertTo-Json -Compress
        [Console]::Write($res)
    }

    # -------------------------------------------------------------
    # 3. CREATE VISIT & QUEUE TICKET (Tiếp đón & Cấp số thứ tự buồng)
    # -------------------------------------------------------------
    elseif ($action -eq 'create_visit') {
        $patientId = if ($payload.patientId) { $payload.patientId.ToString().Trim() } else { throw "patientId is required." }
        $dept = if ($payload.dept) { $payload.dept.ToString().Trim() } else { 'Nội tổng quát' }
        $reason = if ($payload.reason) { $payload.reason.ToString().Trim() } else { 'Khám sức khỏe tổng quát' }
        $appointmentId = if ($payload.appointmentId) { $payload.appointmentId.ToString().Trim() } else { $null }

        # Map department name or code to buong kham
        $deptMap = @{
            'Nội tổng quát' = 'PK-NOI'
            'Tim mạch' = 'PK-TIM'
            'Tai Mũi Họng' = 'PK-TMH'
            'Da liễu' = 'PK-DA'
            'Sản phụ khoa' = 'PK-SAN'
            'Cơ xương khớp' = 'PK-CXK'
            'NOI' = 'PK-NOI'
            'TIM' = 'PK-TIM'
            'TMH' = 'PK-TMH'
            'DA' = 'PK-DA'
            'SAN' = 'PK-SAN'
            'CXK' = 'PK-CXK'
        }
        $maBuong = if ($deptMap.ContainsKey($dept)) { $deptMap[$dept] } else { 'PK-NOI' }

        $tx = $db.BeginTransaction()
        try {
            $todayStr = (Get-Date).ToString("yyyy-MM-dd")

            # Increment queue counter for this room today
            $cmdCounter = $db.CreateCommand()
            $cmdCounter.Transaction = $tx
            $cmdCounter.CommandText = @"
MERGE dbo.BoDemSoThuTuKham AS target
USING (SELECT @maBuong AS maBuong, CAST(@today AS DATE) AS ngayCapSo) AS source
ON (target.maBuong = source.maBuong AND target.ngayCapSo = source.ngayCapSo)
WHEN MATCHED THEN
    UPDATE SET target.soThuTuHienTai = target.soThuTuHienTai + 1
WHEN NOT MATCHED THEN
    INSERT (maBuong, ngayCapSo, soThuTuHienTai)
    VALUES (source.maBuong, source.ngayCapSo, 1)
OUTPUT inserted.soThuTuHienTai;
"@
            $cmdCounter.Parameters.AddWithValue("@maBuong", $maBuong) | Out-Null
            $cmdCounter.Parameters.AddWithValue("@today", $todayStr) | Out-Null
            $stt = [int]$cmdCounter.ExecuteScalar()

            # Generate globally unique maLuotKham: LK-yyMMdd-XXXX
            $datePrefix = (Get-Date).ToString("yyMMdd")
            $cmdSeq = $db.CreateCommand()
            $cmdSeq.Transaction = $tx
            $cmdSeq.CommandText = "SELECT COUNT(*) + 1 FROM dbo.LuotKham WHERE maLuotKham LIKE 'LK-' + @pfx + '-%'"
            $cmdSeq.Parameters.AddWithValue("@pfx", $datePrefix) | Out-Null
            $seqVal = [int]$cmdSeq.ExecuteScalar()
            $maLuotKham = "LK-" + $datePrefix + "-" + $seqVal.ToString("0000")
            $valAppt = if ($appointmentId) { $appointmentId } else { [DBNull]::Value }

            # Insert LuotKham (ngayKham is a computed column from thoiDiemCapSo)
            $cmdVisit = $db.CreateCommand()
            $cmdVisit.Transaction = $tx
            $cmdVisit.CommandText = @"
INSERT INTO dbo.LuotKham (
    maLuotKham, maBenhNhan, maBuong, maHen, thoiDiemDangKy, thoiDiemCapSo, 
    soThuTu, lyDoKham, trangThai
) VALUES (
    @maLK, @maBN, @maBuong, @maHen, SYSDATETIME(), SYSDATETIME(), 
    @stt, @reason, 'CHO_KHAM'
);

-- If linked to LichHen, update appointment status
IF @maHen IS NOT NULL
BEGIN
    UPDATE dbo.LichHen 
    SET trangThai = 'DA_CHECK_IN' 
    WHERE maHen = @maHen;
END
"@
            $cmdVisit.Parameters.AddWithValue("@maLK", $maLuotKham) | Out-Null
            $cmdVisit.Parameters.AddWithValue("@maBN", $patientId) | Out-Null
            $cmdVisit.Parameters.AddWithValue("@maBuong", $maBuong) | Out-Null
            $cmdVisit.Parameters.AddWithValue("@maHen", $valAppt) | Out-Null
            $cmdVisit.Parameters.AddWithValue("@stt", $stt) | Out-Null
            $cmdVisit.Parameters.AddWithValue("@reason", $reason) | Out-Null
            $cmdVisit.ExecuteNonQuery() | Out-Null

            # Get room & department names
            $cmdInfo = $db.CreateCommand()
            $cmdInfo.Transaction = $tx
            $cmdInfo.CommandText = @"
SELECT b.hoTen AS patientName, r.tenBuong, k.tenKhoa
FROM dbo.BenhNhan b
CROSS JOIN dbo.BuongKham r
JOIN dbo.Khoa k ON k.maKhoa = r.maKhoa
WHERE b.maBenhNhan = @maBN AND r.maBuong = @maBuong;
"@
            $cmdInfo.Parameters.AddWithValue("@maBN", $patientId) | Out-Null
            $cmdInfo.Parameters.AddWithValue("@maBuong", $maBuong) | Out-Null
            $rInfo = $cmdInfo.ExecuteReader()
            $pName = ''
            $roomName = ''
            $deptName = ''
            if ($rInfo.Read()) {
                $pName = $rInfo['patientName'].ToString()
                $roomName = $rInfo['tenBuong'].ToString()
                $deptName = $rInfo['tenKhoa'].ToString()
            }
            $rInfo.Close()

            $tx.Commit()

            $res = @{
                success = $true
                visitId = $maLuotKham
                patientId = $patientId
                patientName = $pName
                queueNumber = $stt
                roomCode = $maBuong
                roomName = $roomName
                department = $deptName
                date = $todayStr
                time = (Get-Date).ToString("HH:mm")
                status = 'CHO_KHAM'
            } | ConvertTo-Json -Compress
            [Console]::Write($res)
        } catch {
            if ($tx) { try { $tx.Rollback() } catch {} }
            throw $_
        }
    }

    # -------------------------------------------------------------
    # 4. LIST VISITS & WAITING QUEUE (Hàng đợi khám trong ngày)
    # -------------------------------------------------------------
    elseif ($action -eq 'list_queue') {
        $todayStr = (Get-Date).ToString("yyyy-MM-dd")
        $cmd = $db.CreateCommand()
        $cmd.CommandText = @"
SELECT l.maLuotKham AS id,
       l.maBenhNhan AS patientId,
       b.hoTen AS name,
       CONVERT(varchar(10), b.ngaySinh, 23) AS birth,
       b.gioiTinh AS gender,
       ISNULL(b.soDienThoai, '') AS phone,
       ISNULL(b.soBHYT, '') AS insurance,
       k.tenKhoa AS department,
       r.tenBuong AS room,
       r.maBuong AS roomCode,
       l.soThuTu AS queueNumber,
       l.lyDoKham AS reason,
       CONVERT(varchar(10), l.ngayKham, 23) AS date,
       LEFT(CONVERT(varchar(8), l.thoiDiemCapSo, 108), 5) AS time,
       l.trangThai AS statusRaw,
       CASE l.trangThai
           WHEN 'CHO_KHAM' THEN N'Chờ khám'
           WHEN 'DANG_KHAM' THEN N'Đang khám'
           WHEN 'CHO_KET_QUA' THEN N'Chờ kết quả'
           WHEN 'HOAN_TAT' THEN N'Hoàn tất'
           WHEN 'DA_HUY' THEN N'Đã hủy'
           ELSE l.trangThai
       END AS status
FROM dbo.LuotKham l
JOIN dbo.BenhNhan b ON b.maBenhNhan = l.maBenhNhan
JOIN dbo.BuongKham r ON r.maBuong = l.maBuong
JOIN dbo.Khoa k ON k.maKhoa = r.maKhoa
WHERE l.ngayKham = CAST(@today AS DATE)
ORDER BY l.soThuTu ASC
FOR JSON PATH;
"@
        $cmd.Parameters.AddWithValue("@today", $todayStr) | Out-Null
        $reader = $cmd.ExecuteReader()
        $json = [System.Text.StringBuilder]::new()
        while ($reader.Read()) { $null = $json.Append($reader.GetString(0)) }
        if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('[]') }
    }
} finally {
    $db.Dispose()
}
