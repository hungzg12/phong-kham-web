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
    $action = if ($payload.action) { $payload.action.ToString() } else { 'list_services' }

    # -------------------------------------------------------------
    # 1. LIST TECHNICAL & DIAGNOSTIC SERVICES
    # -------------------------------------------------------------
    if ($action -eq 'list_services') {
        $cmd = $db.CreateCommand()
        $cmd.CommandText = @"
SELECT s.maDichVu AS id,
       s.tenDichVu AS name,
       s.maKhoaThucHien AS departmentId,
       k.tenKhoa AS departmentName,
       s.loaiDichVu AS categoryRaw,
       CASE s.loaiDichVu
           WHEN 'XET_NGHIEM' THEN N'Xét nghiệm'
           WHEN 'CDHA' THEN N'Chẩn đoán hình ảnh'
           WHEN 'THU_THUAT' THEN N'Thủ thuật'
           WHEN 'PHAU_THUAT' THEN N'Phẫu thuật'
           ELSE s.loaiDichVu
       END AS kind,
       s.loaiKetQua AS resultType,
       s.donGia AS price,
       s.giaBHYT AS insurancePrice,
       s.thoiGianTrungBinhPhut AS durationMinutes
FROM dbo.DichVuKyThuat s
JOIN dbo.Khoa k ON k.maKhoa = s.maKhoaThucHien
WHERE s.dangHoatDong = 1
ORDER BY s.loaiDichVu ASC, s.tenDichVu ASC
FOR JSON PATH;
"@
        $reader = $cmd.ExecuteReader()
        $json = [System.Text.StringBuilder]::new()
        while ($reader.Read()) { $null = $json.Append($reader.GetString(0)) }
        if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('[]') }
    }

    # -------------------------------------------------------------
    # 2. CREATE DIAGNOSTIC / LAB ORDER (Tạo phiếu chỉ định CLS)
    # -------------------------------------------------------------
    elseif ($action -eq 'create_order') {
        $visitId = if ($payload.visitId) { $payload.visitId.ToString().Trim() } else { throw "visitId is required." }
        $services = if ($payload.services) { $payload.services } else { throw "services list is required." }
        $diagnosis = if ($payload.diagnosis) { $payload.diagnosis.ToString().Trim() } else { 'Theo dõi lâm sàng' }
        $priorityRaw = if ($payload.priority) { $payload.priority.ToString().Trim() } else { 'THUONG' }
        $priority = if ($priorityRaw -like '*Khẩn*' -or $priorityRaw -eq 'CAP_CUU') { 'CAP_CUU' } else { 'THUONG' }
        $note = if ($payload.note) { $payload.note.ToString().Trim() } else { $null }

        $staffId = 'NV-BS01'
        $maChiDinh = "CD-" + (Get-Date).ToString("yyMMdd") + "-" + (Get-Random -Minimum 1000 -Maximum 9999)

        $tx = $db.BeginTransaction()
        try {
            # Insert header ChiDinhCLS
            $cmdHeader = $db.CreateCommand()
            $cmdHeader.Transaction = $tx
            $cmdHeader.CommandText = @"
INSERT INTO dbo.ChiDinhCLS (
    maChiDinh, maLuotKham, maBacSiChiDinh, thoiDiemChiDinh,
    chanDoanLamSang, loaiUuTien, trangThai, ghiChu
) VALUES (
    @maCD, @vId, @staff, SYSDATETIME(),
    @diag, @prio, 'CHO_THUC_HIEN', @note
);
"@
            $cmdHeader.Parameters.AddWithValue("@maCD", $maChiDinh) | Out-Null
            $cmdHeader.Parameters.AddWithValue("@vId", $visitId) | Out-Null
            $cmdHeader.Parameters.AddWithValue("@staff", $staffId) | Out-Null
            $cmdHeader.Parameters.AddWithValue("@diag", $diagnosis) | Out-Null
            $cmdHeader.Parameters.AddWithValue("@prio", $priority) | Out-Null
            $valNote = if ($note) { $note } else { [DBNull]::Value }
            $cmdHeader.Parameters.AddWithValue("@note", $valNote) | Out-Null
            $cmdHeader.ExecuteNonQuery() | Out-Null

            # Insert line items ChiTietChiDinh
            $lineIdx = 1
            foreach ($svc in $services) {
                $serviceId = if ($svc.id) { $svc.id.ToString().Trim() } else { $svc.ToString().Trim() }
                if (-not $serviceId) { continue }

                $maChiTiet = "$maChiDinh-" + $lineIdx.ToString("00")

                $cmdLine = $db.CreateCommand()
                $cmdLine.Transaction = $tx
                $cmdLine.CommandText = @"
DECLARE @price DECIMAL(18,2);
SELECT @price = donGia FROM dbo.DichVuKyThuat WHERE maDichVu = @sId;

INSERT INTO dbo.ChiTietChiDinh (
    maChiTiet, maChiDinh, maDichVu, soLuong, donGiaApDung, trangThai
) VALUES (
    @maCT, @maCD, @sId, 1, ISNULL(@price, 0), 'CHO_THUC_HIEN'
);
"@
                $cmdLine.Parameters.AddWithValue("@maCT", $maChiTiet) | Out-Null
                $cmdLine.Parameters.AddWithValue("@maCD", $maChiDinh) | Out-Null
                $cmdLine.Parameters.AddWithValue("@sId", $serviceId) | Out-Null
                $cmdLine.ExecuteNonQuery() | Out-Null

                $lineIdx++
            }

            $tx.Commit()

            $res = @{
                success = $true
                orderId = $maChiDinh
                visitId = $visitId
                message = "Đã lưu phiếu chỉ định cận lâm sàng $maChiDinh vào SQL Server"
            } | ConvertTo-Json -Compress
            [Console]::Write($res)
        } catch {
            if ($tx) { try { $tx.Rollback() } catch {} }
            throw $_
        }
    }

    # -------------------------------------------------------------
    # 3. GET ORDERS & RESULTS BY VISIT (Lấy danh sách chỉ định & KQ)
    # -------------------------------------------------------------
    elseif ($action -eq 'get_orders_by_visit') {
        $visitId = if ($payload.visitId) { $payload.visitId.ToString().Trim() } else { throw "visitId is required." }
        $cmd = $db.CreateCommand()
        $cmd.CommandText = @"
SELECT c.maChiDinh AS orderId,
       c.maLuotKham AS visitId,
       CONVERT(varchar(16), c.thoiDiemChiDinh, 120) AS orderedAt,
       c.chanDoanLamSang AS diagnosis,
       c.loaiUuTien AS priority,
       c.trangThai AS statusRaw,
       CASE c.trangThai
           WHEN 'CHO_THUC_HIEN' THEN N'Chờ tiếp nhận'
           WHEN 'DANG_THUC_HIEN' THEN N'Đang thực hiện'
           WHEN 'HOAN_TAT' THEN N'Đã có kết quả'
           WHEN 'DA_HUY' THEN N'Đã hủy'
           ELSE c.trangThai
       END AS status,
       (
           SELECT ct.maChiTiet AS lineId,
                  ct.maDichVu AS serviceId,
                  s.tenDichVu AS serviceName,
                  s.loaiDichVu AS serviceCategory,
                  s.loaiKetQua AS resultType,
                  ct.donGiaApDung AS price,
                  ct.trangThai AS lineStatusRaw,
                  CASE ct.trangThai
                      WHEN 'CHO_THUC_HIEN' THEN N'Chờ thực hiện'
                      WHEN 'DANG_THUC_HIEN' THEN N'Đang xử lý'
                      WHEN 'CO_KET_QUA' THEN N'Đã phát hành'
                      WHEN 'DA_HUY' THEN N'Đã hủy'
                      ELSE ct.trangThai
                  END AS lineStatus,
                  kq.maKetQua AS resultId,
                  CONVERT(varchar(16), kq.thoiDiemDuyet, 120) AS approvedAt,
                  mota.moTaHinhAnh AS description,
                  mota.ketLuan AS conclusion,
                  xn.coCanhBaoNguyKich AS criticalAlert
           FROM dbo.ChiTietChiDinh ct
           JOIN dbo.DichVuKyThuat s ON s.maDichVu = ct.maDichVu
           LEFT JOIN dbo.KetQuaCLS kq ON kq.maChiTiet = ct.maChiTiet AND kq.laBanHienHanh = 1
           LEFT JOIN dbo.KetQuaMoTa mota ON mota.maKetQua = kq.maKetQua
           LEFT JOIN dbo.KetQuaXetNghiem xn ON xn.maKetQua = kq.maKetQua
           WHERE ct.maChiDinh = c.maChiDinh
           FOR JSON PATH
       ) AS lines
FROM dbo.ChiDinhCLS c
WHERE c.maLuotKham = @vId
ORDER BY c.thoiDiemChiDinh DESC
FOR JSON PATH;
"@
        $cmd.Parameters.AddWithValue("@vId", $visitId) | Out-Null
        $reader = $cmd.ExecuteReader()
        $json = [System.Text.StringBuilder]::new()
        while ($reader.Read()) { $null = $json.Append($reader.GetString(0)) }
        if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('[]') }
    }

    # -------------------------------------------------------------
    # 4. ENTER & APPROVE RESULT (Nhập & Duyệt kết quả xét nghiệm / CĐHA)
    # -------------------------------------------------------------
    elseif ($action -eq 'save_result') {
        $lineId = if ($payload.orderDetailId) { $payload.orderDetailId.ToString().Trim() } else { throw "orderDetailId is required." }
        $findings = if ($payload.findings) { $payload.findings.ToString().Trim() } else { 'Bình thường, không phát hiện tổn thương khu trú.' }
        $conclusion = if ($payload.conclusion) { $payload.conclusion.ToString().Trim() } else { 'Kết quả trong giới hạn bình thường.' }
        $critical = if ($payload.critical) { [bool]$payload.critical } else { $false }
        $notes = if ($payload.notes) { $payload.notes.ToString().Trim() } else { $null }

        $techStaff = 'NV-DD01'
        $doctorStaff = 'NV-BS01'
        $maKQ = "KQ-" + (Get-Date).ToString("yyMMdd") + "-" + (Get-Random -Minimum 1000 -Maximum 9999)

        $tx = $db.BeginTransaction()
        try {
            # Find service info
            $cmdGetSvc = $db.CreateCommand()
            $cmdGetSvc.Transaction = $tx
            $cmdGetSvc.CommandText = @"
SELECT ct.maChiDinh, s.loaiKetQua, s.tenDichVu
FROM dbo.ChiTietChiDinh ct
JOIN dbo.DichVuKyThuat s ON s.maDichVu = ct.maDichVu
WHERE ct.maChiTiet = @lineId;
"@
            $cmdGetSvc.Parameters.AddWithValue("@lineId", $lineId) | Out-Null
            $rdrSvc = $cmdGetSvc.ExecuteReader()
            if (-not $rdrSvc.Read()) { throw "Không tìm thấy dòng chỉ định $lineId." }
            $maCD = $rdrSvc['maChiDinh'].ToString()
            $resType = $rdrSvc['loaiKetQua'].ToString()
            $rdrSvc.Close()

            # Insert KetQuaCLS
            $cmdHeaderKq = $db.CreateCommand()
            $cmdHeaderKq.Transaction = $tx
            $cmdHeaderKq.CommandText = @"
INSERT INTO dbo.KetQuaCLS (
    maKetQua, maChiTiet, loaiKetQua, lanThucHien, phienBan,
    laBanHienHanh, thoiDiemCoKetQua, maKyThuatVien, maBacSiDuyet,
    thoiDiemDuyet, trangThai, ghiChuChuyenMon
) VALUES (
    @maKQ, @lineId, @resType, 1, 1,
    1, SYSDATETIME(), @tech, @doc,
    SYSDATETIME(), 'DA_DUYET', @notes
);
"@
            $cmdHeaderKq.Parameters.AddWithValue("@maKQ", $maKQ) | Out-Null
            $cmdHeaderKq.Parameters.AddWithValue("@lineId", $lineId) | Out-Null
            $cmdHeaderKq.Parameters.AddWithValue("@resType", $resType) | Out-Null
            $cmdHeaderKq.Parameters.AddWithValue("@tech", $techStaff) | Out-Null
            $cmdHeaderKq.Parameters.AddWithValue("@doc", $doctorStaff) | Out-Null
            $valNotes = if ($notes) { $notes } else { [DBNull]::Value }
            $cmdHeaderKq.Parameters.AddWithValue("@notes", $valNotes) | Out-Null
            $cmdHeaderKq.ExecuteNonQuery() | Out-Null

            # Sub-table based on result type
            if ($resType -eq 'MO_TA') {
                $cmdMoTa = $db.CreateCommand()
                $cmdMoTa.Transaction = $tx
                $cmdMoTa.CommandText = @"
INSERT INTO dbo.KetQuaMoTa (
    maKetQua, loaiKetQua, vungKhaoSat, moTaHinhAnh, ketLuan, soLuongAnh
) VALUES (
    @maKQ, 'MO_TA', N'Theo chỉ định lâm sàng', @findings, @conclusion, 1
);
"@
                $cmdMoTa.Parameters.AddWithValue("@maKQ", $maKQ) | Out-Null
                $cmdMoTa.Parameters.AddWithValue("@findings", $findings) | Out-Null
                $cmdMoTa.Parameters.AddWithValue("@conclusion", $conclusion) | Out-Null
                $cmdMoTa.ExecuteNonQuery() | Out-Null
            } else {
                $cmdXN = $db.CreateCommand()
                $cmdXN.Transaction = $tx
                $cmdXN.CommandText = @"
INSERT INTO dbo.KetQuaXetNghiem (
    maKetQua, loaiKetQua, theTichMau, chatLuongMau, thoiDiemNhanMau, coCanhBaoNguyKich
) VALUES (
    @maKQ, 'XET_NGHIEM', N'2 ml', N'Đạt yêu cầu tiêu chuẩn', SYSDATETIME(), @critical
);
"@
                $cmdXN.Parameters.AddWithValue("@maKQ", $maKQ) | Out-Null
                $critVal = if ($critical) { 1 } else { 0 }
                $cmdXN.Parameters.AddWithValue("@critical", $critVal) | Out-Null
                $cmdXN.ExecuteNonQuery() | Out-Null
            }

            # Update line status to CO_KET_QUA
            $cmdUpdateLine = $db.CreateCommand()
            $cmdUpdateLine.Transaction = $tx
            $cmdUpdateLine.CommandText = @"
UPDATE dbo.ChiTietChiDinh SET trangThai = 'CO_KET_QUA' WHERE maChiTiet = @lineId;
"@
            $cmdUpdateLine.Parameters.AddWithValue("@lineId", $lineId) | Out-Null
            $cmdUpdateLine.ExecuteNonQuery() | Out-Null

            # Check if all lines of this order have results
            $cmdCheckAll = $db.CreateCommand()
            $cmdCheckAll.Transaction = $tx
            $cmdCheckAll.CommandText = @"
IF NOT EXISTS (
    SELECT 1 FROM dbo.ChiTietChiDinh 
    WHERE maChiDinh = @maCD AND trangThai <> 'CO_KET_QUA' AND trangThai <> 'DA_HUY'
)
BEGIN
    UPDATE dbo.ChiDinhCLS SET trangThai = 'HOAN_TAT' WHERE maChiDinh = @maCD;
END
ELSE
BEGIN
    UPDATE dbo.ChiDinhCLS SET trangThai = 'DANG_THUC_HIEN' WHERE maChiDinh = @maCD;
END
"@
            $cmdCheckAll.Parameters.AddWithValue("@maCD", $maCD) | Out-Null
            $cmdCheckAll.ExecuteNonQuery() | Out-Null

            $tx.Commit()

            $res = @{
                success = $true
                resultId = $maKQ
                orderDetailId = $lineId
                message = "Đã lưu và duyệt kết quả cận lâm sàng $maKQ thành công vào CSDL."
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
