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
    $action = if ($payload.action) { $payload.action.ToString() } else { 'list_medicines' }

    # -------------------------------------------------------------
    # 1. LIST MEDICINES WITH LIVE STOCK
    # -------------------------------------------------------------
    if ($action -eq 'list_medicines') {
        $warehouse = if ($payload.warehouse) { $payload.warehouse.ToString().Trim() } else { 'KHO_NGOAI_TRU' }
        $cmd = $db.CreateCommand()
        $cmd.CommandText = @"
SELECT h.maHang AS id,
       h.tenHang AS name,
       h.donViCoSo AS unit,
       h.loaiHang AS kind,
       h.donGiaXuatCoSo AS price,
       h.giaBHYT AS insurancePrice,
       ISNULL(SUM(l.soLuongKhaDung), 0) AS stockQty
FROM dbo.HangHoaYTe h
LEFT JOIN dbo.LoHang lh ON lh.maHang = h.maHang
LEFT JOIN dbo.LoTonKho l ON l.maLoHang = lh.maLoHang AND l.maKho = @wh AND l.trangThaiKhoa = 0
WHERE h.dangKinhDoanh = 1
GROUP BY h.maHang, h.tenHang, h.donViCoSo, h.loaiHang, h.donGiaXuatCoSo, h.giaBHYT
ORDER BY h.tenHang ASC
FOR JSON PATH;
"@
        $cmd.Parameters.AddWithValue("@wh", $warehouse) | Out-Null
        $reader = $cmd.ExecuteReader()
        $json = [System.Text.StringBuilder]::new()
        while ($reader.Read()) { $null = $json.Append($reader.GetString(0)) }
        if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('[]') }
    }

    # -------------------------------------------------------------
    # 2. CREATE PRESCRIPTION
    # -------------------------------------------------------------
    elseif ($action -eq 'create_prescription') {
        $visitId = if ($payload.visitId) { $payload.visitId.ToString().Trim() } else { throw "visitId is required." }
        $lines = if ($payload.lines) { $payload.lines } else { throw "lines is required." }
        $advice = if ($payload.advice) { $payload.advice.ToString().Trim() } else { '' }
        $diagnosis = if ($payload.diagnosis) { $payload.diagnosis.ToString().Trim() } else { 'Theo chẩn đoán phiếu khám' }

        $staffId = 'NV-BS01'
        $maDon = "DT-" + (Get-Date).ToString("yyMMdd") + "-" + (Get-Random -Minimum 1000 -Maximum 9999)

        $tx = $db.BeginTransaction()
        try {
            # Insert header DonThuoc
            $cmdHeader = $db.CreateCommand()
            $cmdHeader.Transaction = $tx
            $cmdHeader.CommandText = @"
INSERT INTO dbo.DonThuoc (
    maDon, maLuotKham, loaiDon, thoiDiemKe, maBacSiKe, chanDoan, 
    trangThaiCapPhat, loiDan
) VALUES (
    @maDon, @vId, 'NGOAI_TRU', SYSDATETIME(), @staff, @diag, 
    'CHUA_CAP', @advice
);
"@
            $cmdHeader.Parameters.AddWithValue("@maDon", $maDon) | Out-Null
            $cmdHeader.Parameters.AddWithValue("@vId", $visitId) | Out-Null
            $cmdHeader.Parameters.AddWithValue("@staff", $staffId) | Out-Null
            $cmdHeader.Parameters.AddWithValue("@diag", $diagnosis) | Out-Null
            $cmdHeader.Parameters.AddWithValue("@advice", $advice) | Out-Null
            $cmdHeader.ExecuteNonQuery() | Out-Null

            # Insert lines ChiTietDonThuoc
            $lineIdx = 1
            foreach ($item in $lines) {
                $maHang = if ($item.medicine) { $item.medicine.ToString().Trim() } else { $item.id }
                if (-not $maHang) { continue }
                $qty = if ($item.quantity) { [decimal]$item.quantity } else { 1 }
                $days = if ($item.days) { [int]$item.days } else { 1 }
                $dose = if ($item.dose) { $item.dose.ToString().Trim() } else { '' }
                $route = if ($item.route) { $item.route.ToString().Trim() } else { 'Uống' }
                $freq = if ($item.frequency) { $item.frequency.ToString().Trim() } else { '' }
                $cachDung = "$dose $route $freq"

                $sang = if ($item.morning) { $item.morning.ToString().Trim() } else { $null }
                $trua = if ($item.noon) { $item.noon.ToString().Trim() } else { $null }
                $chieu = if ($item.evening) { $item.evening.ToString().Trim() } else { $null }
                $toi = if ($item.night) { $item.night.ToString().Trim() } else { $null }

                $valSang = if ($sang) { $sang } else { [DBNull]::Value }
                $valTrua = if ($trua) { $trua } else { [DBNull]::Value }
                $valChieu = if ($chieu) { $chieu } else { [DBNull]::Value }
                $valToi = if ($toi) { $toi } else { [DBNull]::Value }

                $maCT = "$maDon-" + $lineIdx.ToString("00")

                $cmdLine = $db.CreateCommand()
                $cmdLine.Transaction = $tx
                $cmdLine.CommandText = @"
DECLARE @unit NVARCHAR(20), @price DECIMAL(18,2);
SELECT @unit = donViCoSo, @price = donGiaXuatCoSo FROM dbo.HangHoaYTe WHERE maHang = @maHang;

INSERT INTO dbo.ChiTietDonThuoc (
    maChiTietDon, maDon, maHang, soLuongKe, donViKe, cachDung, soNgayDung,
    sang, trua, chieu, toi, donGiaKe, soLuongDaCap, trangThai
) VALUES (
    @maCT, @maDon, @maHang, @qty, ISNULL(@unit, N'Viên'), @cachDung, @days,
    @sang, @trua, @chieu, @toi, ISNULL(@price, 0), 0, 'CHUA_CAP'
);
"@
                $cmdLine.Parameters.AddWithValue("@maCT", $maCT) | Out-Null
                $cmdLine.Parameters.AddWithValue("@maDon", $maDon) | Out-Null
                $cmdLine.Parameters.AddWithValue("@maHang", $maHang) | Out-Null
                $cmdLine.Parameters.AddWithValue("@qty", $qty) | Out-Null
                $cmdLine.Parameters.AddWithValue("@cachDung", $cachDung) | Out-Null
                $cmdLine.Parameters.AddWithValue("@days", $days) | Out-Null
                $cmdLine.Parameters.AddWithValue("@sang", $valSang) | Out-Null
                $cmdLine.Parameters.AddWithValue("@trua", $valTrua) | Out-Null
                $cmdLine.Parameters.AddWithValue("@chieu", $valChieu) | Out-Null
                $cmdLine.Parameters.AddWithValue("@toi", $valToi) | Out-Null
                $cmdLine.ExecuteNonQuery() | Out-Null

                $lineIdx++
            }

            $tx.Commit()

            $res = @{
                success = $true
                prescriptionId = $maDon
                visitId = $visitId
                message = "Đã lưu đơn thuốc $maDon vào CSDL SQL Server"
            } | ConvertTo-Json -Compress
            [Console]::Write($res)
        } catch {
            if ($tx) { try { $tx.Rollback() } catch {} }
            throw $_
        }
    }

    # -------------------------------------------------------------
    # 3. DISPENSE MEDICINE VIA FEFO (Cấp phát trừ kho FEFO)
    # -------------------------------------------------------------
    elseif ($action -eq 'dispense_fefo') {
        $rxId = if ($payload.prescriptionId) { $payload.prescriptionId.ToString().Trim() } else { throw "prescriptionId is required." }
        $warehouse = if ($payload.warehouse) { $payload.warehouse.ToString().Trim() } else { 'KHO_NGOAI_TRU' }

        $tx = $db.BeginTransaction()
        try {
            # Get pending lines
            $cmdGetLines = $db.CreateCommand()
            $cmdGetLines.Transaction = $tx
            $cmdGetLines.CommandText = @"
SELECT maChiTietDon, maHang, soLuongKe 
FROM dbo.ChiTietDonThuoc 
WHERE maDon = @rxId AND trangThai = 'CHUA_CAP';
"@
            $cmdGetLines.Parameters.AddWithValue("@rxId", $rxId) | Out-Null
            $rdr = $cmdGetLines.ExecuteReader()
            $pending = @()
            while ($rdr.Read()) {
                $pending += @{
                    maCT = $rdr['maChiTietDon'].ToString()
                    maHang = $rdr['maHang'].ToString()
                    qty = [decimal]$rdr['soLuongKe']
                }
            }
            $rdr.Close()

            if (-not $pending.Count) {
                throw "Đơn thuốc không có dòng nào ở trạng thái chờ cấp phát."
            }

            $allocations = @()

            foreach ($line in $pending) {
                $needed = $line.qty
                $maHang = $line.maHang

                # Fetch available lots according to FEFO (Earliest Expiry First)
                $cmdLots = $db.CreateCommand()
                $cmdLots.Transaction = $tx
                $cmdLots.CommandText = @"
SELECT l.maLoTon, l.soLuongKhaDung, lh.soLoNhaSanXuat AS soLo, lh.hanSuDung
FROM dbo.LoTonKho l
JOIN dbo.LoHang lh ON lh.maLoHang = l.maLoHang
WHERE lh.maHang = @maHang 
  AND l.maKho = @wh 
  AND l.trangThaiKhoa = 0 
  AND l.soLuongKhaDung > 0 
  AND lh.hanSuDung >= CAST(GETDATE() AS DATE)
ORDER BY lh.hanSuDung ASC;
"@
                $cmdLots.Parameters.AddWithValue("@maHang", $maHang) | Out-Null
                $cmdLots.Parameters.AddWithValue("@wh", $warehouse) | Out-Null
                $rdrLots = $cmdLots.ExecuteReader()
                $lots = @()
                while ($rdrLots.Read()) {
                    $lots += @{
                        maLoTon = $rdrLots['maLoTon'].ToString()
                        avail = [decimal]$rdrLots['soLuongKhaDung']
                        soLo = $rdrLots['soLo'].ToString()
                        expiry = $rdrLots['hanSuDung'].ToString()
                    }
                }
                $rdrLots.Close()

                $remain = $needed
                foreach ($lot in $lots) {
                    if ($remain -le 0) { break }
                    $take = [Math]::Min($remain, $lot.avail)
                    if ($take -gt 0) {
                        # Deduct stock
                        $cmdDeduct = $db.CreateCommand()
                        $cmdDeduct.Transaction = $tx
                        $cmdDeduct.CommandText = @"
UPDATE dbo.LoTonKho 
SET soLuongTon = soLuongTon - @take,
    soLuongKhaDung = soLuongKhaDung - @take
WHERE maLoTon = @maLoTon;
"@
                        $cmdDeduct.Parameters.AddWithValue("@take", $take) | Out-Null
                        $cmdDeduct.Parameters.AddWithValue("@maLoTon", $lot.maLoTon) | Out-Null
                        $cmdDeduct.ExecuteNonQuery() | Out-Null

                        $allocations += @{
                            maHang = $maHang
                            soLo = $lot.soLo
                            quantity = $take
                        }
                        $remain -= $take
                    }
                }

                if ($remain -gt 0) {
                    throw "Không đủ tồn kho khả dụng cho thuốc $maHang trong kho $warehouse (Còn thiếu $remain)."
                }

                # Mark line as completed
                $cmdUpdateLine = $db.CreateCommand()
                $cmdUpdateLine.Transaction = $tx
                $cmdUpdateLine.CommandText = @"
UPDATE dbo.ChiTietDonThuoc 
SET soLuongDaCap = soLuongKe, 
    trangThai = 'DA_CAP_DU' 
WHERE maChiTietDon = @maCT;
"@
                $cmdUpdateLine.Parameters.AddWithValue("@maCT", $line.maCT) | Out-Null
                $cmdUpdateLine.ExecuteNonQuery() | Out-Null
            }

            # Update header DonThuoc
            $cmdHeaderDone = $db.CreateCommand()
            $cmdHeaderDone.Transaction = $tx
            $cmdHeaderDone.CommandText = @"
UPDATE dbo.DonThuoc 
SET trangThaiCapPhat = 'DA_CAP_DU', 
    maNguoiDuyet = 'NV-DS01', 
    thoiDiemDuyet = SYSDATETIME() 
WHERE maDon = @rxId;
"@
            $cmdHeaderDone.Parameters.AddWithValue("@rxId", $rxId) | Out-Null
            $cmdHeaderDone.ExecuteNonQuery() | Out-Null

            $tx.Commit()

            $res = @{
                success = $true
                prescriptionId = $rxId
                allocated = $allocations
                message = "Đã cấp phát thuốc thành công theo nguyên tắc FEFO và trừ tồn kho."
            } | ConvertTo-Json -Compress
            [Console]::Write($res)
        } catch {
            if ($tx) { try { $tx.Rollback() } catch {} }
            throw $_
        }
    }

    # -------------------------------------------------------------
    # 4. GET PRESCRIPTIONS BY VISIT
    # -------------------------------------------------------------
    elseif ($action -eq 'get_prescriptions_by_visit') {
        $visitId = if ($payload.visitId) { $payload.visitId.ToString().Trim() } else { throw "visitId is required." }
        $cmd = $db.CreateCommand()
        $cmd.CommandText = @"
SELECT d.maDon AS id,
       d.maLuotKham AS visitId,
       CONVERT(varchar(16), d.thoiDiemKe, 120) AS prescribedAt,
       d.chanDoan AS diagnosis,
       d.trangThaiCapPhat AS statusRaw,
       CASE d.trangThaiCapPhat
           WHEN 'CHUA_CAP' THEN N'Chưa cấp'
           WHEN 'DA_CAP_DU' THEN N'Đã cấp phát'
           WHEN 'CAP_MOT_PHAN' THEN N'Cấp một phần'
           ELSE d.trangThaiCapPhat
       END AS status,
       d.loiDan AS advice,
       (
           SELECT c.maChiTietDon AS lineId,
                  c.maHang AS medicineId,
                  h.tenHang AS medicineName,
                  c.soLuongKe AS quantity,
                  c.donViKe AS unit,
                  c.cachDung AS usage,
                  c.soNgayDung AS days,
                  c.donGiaKe AS unitPrice,
                  (c.soLuongKe * c.donGiaKe) AS lineTotal,
                  c.soLuongDaCap AS dispensedQty,
                  c.trangThai AS lineStatus
           FROM dbo.ChiTietDonThuoc c
           JOIN dbo.HangHoaYTe h ON h.maHang = c.maHang
           WHERE c.maDon = d.maDon
           FOR JSON PATH
       ) AS lines
FROM dbo.DonThuoc d
WHERE d.maLuotKham = @vId
ORDER BY d.thoiDiemKe DESC
FOR JSON PATH;
"@
        $cmd.Parameters.AddWithValue("@vId", $visitId) | Out-Null
        $reader = $cmd.ExecuteReader()
        $json = [System.Text.StringBuilder]::new()
        while ($reader.Read()) { $null = $json.Append($reader.GetString(0)) }
        if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('[]') }
    }
} finally {
    $db.Dispose()
}
