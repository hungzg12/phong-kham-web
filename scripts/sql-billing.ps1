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
    $action = if ($payload.action) { $payload.action.ToString() } else { 'get_statement' }

    # -------------------------------------------------------------
    # 1. GET STATEMENT / FORM 01/BV (Bảng kê viện phí & BHYT Mẫu 01/BV)
    # -------------------------------------------------------------
    if ($action -eq 'get_statement') {
        $visitId = if ($payload.visitId) { $payload.visitId.ToString().Trim() } else { throw "visitId is required." }

        # Get Visit & Patient info
        $cmdInfo = $db.CreateCommand()
        $cmdInfo.CommandText = @"
SELECT l.maLuotKham, l.maBenhNhan, l.trangThai AS visitStatus,
       b.hoTen, b.ngaySinh, b.gioiTinh, b.soBHYT, b.diaChi,
       k.tenKhoa, bb.tenBuong AS phongKham
FROM dbo.LuotKham l
JOIN dbo.BenhNhan b ON b.maBenhNhan = l.maBenhNhan
LEFT JOIN dbo.BuongBenh bb ON bb.maBuongBenh = l.maBuong
LEFT JOIN dbo.Khoa k ON k.maKhoa = bb.maKhoa
WHERE l.maLuotKham = @vId;
"@
        $cmdInfo.Parameters.AddWithValue("@vId", $visitId) | Out-Null
        $rdrInfo = $cmdInfo.ExecuteReader()
        if (-not $rdrInfo.Read()) { throw "Không tìm thấy lượt khám $visitId." }

        $patientId = $rdrInfo['maBenhNhan'].ToString()
        $patientName = $rdrInfo['hoTen'].ToString()
        $dob = if ($rdrInfo['ngaySinh'] -ne [DBNull]::Value) { [DateTime]$rdrInfo['ngaySinh'] } else { $null }
        $birthStr = if ($dob) { $dob.ToString("dd/MM/yyyy") } else { '' }
        $gender = $rdrInfo['gioiTinh'].ToString()
        $soBHYT = if ($rdrInfo['soBHYT'] -ne [DBNull]::Value) { $rdrInfo['soBHYT'].ToString().Trim() } else { '' }
        $address = if ($rdrInfo['diaChi'] -ne [DBNull]::Value) { $rdrInfo['diaChi'].ToString() } else { '' }
        $deptName = if ($rdrInfo['tenKhoa'] -ne [DBNull]::Value) { $rdrInfo['tenKhoa'].ToString() } else { 'Ngoại trú' }
        $room = if ($rdrInfo['phongKham'] -ne [DBNull]::Value) { $rdrInfo['phongKham'].ToString() } else { '' }
        $rdrInfo.Close()

        # BHYT Rate determination
        $hasBHYT = [bool]($soBHYT -and $soBHYT.Length -ge 10)
        $rateBHYT = 0.0
        if ($hasBHYT) {
            $char3 = if ($soBHYT.Length -ge 3) { $soBHYT.Substring(2, 1) } else { '' }
            if ($char3 -eq '1' -or $char3 -eq '2') { $rateBHYT = 1.0 }
            elseif ($char3 -eq '3') { $rateBHYT = 0.95 }
            else { $rateBHYT = 0.80 }
        }

        # Items breakdown
        $items = @()

        # Item 1: Consultation fee
        $consultPrice = 50000.00
        $consultBhytPrice = 38700.00
        $consultBhytPay = if ($hasBHYT) { [Math]::Round($consultBhytPrice * $rateBHYT, 2) } else { 0.0 }
        $consultPtPay = $consultPrice - $consultBhytPay
        $items += @{
            category = 'KHAM_BENH'
            categoryName = '1. Tiền khám bệnh'
            code = 'KB_CHUYEN_KHOA'
            name = 'Khám lâm sàng chuyên khoa ' + $deptName
            unit = 'Lượt'
            quantity = 1
            unitPrice = $consultPrice
            total = $consultPrice
            bhytUnitPrice = $consultBhytPrice
            bhytPaid = $consultBhytPay
            patientPaid = $consultPtPay
            bhytRate = [int]($rateBHYT * 100)
        }

        # Item 2: Diagnostic Services (ChiTietChiDinh)
        $cmdCLS = $db.CreateCommand()
        $cmdCLS.CommandText = @"
SELECT ct.maChiTiet, ct.maDichVu, s.tenDichVu, s.loaiDichVu,
       ct.soLuong, ct.donGiaApDung, s.giaBHYT
FROM dbo.ChiTietChiDinh ct
JOIN dbo.ChiDinhCLS c ON c.maChiDinh = ct.maChiDinh
JOIN dbo.DichVuKyThuat s ON s.maDichVu = ct.maDichVu
WHERE c.maLuotKham = @vId AND ct.trangThai <> 'DA_HUY';
"@
        $cmdCLS.Parameters.AddWithValue("@vId", $visitId) | Out-Null
        $rdrCLS = $cmdCLS.ExecuteReader()
        while ($rdrCLS.Read()) {
            $qty = [decimal]$rdrCLS['soLuong']
            $price = [decimal]$rdrCLS['donGiaApDung']
            $bhytP = [decimal]$rdrCLS['giaBHYT']
            $tot = $qty * $price
            $bhPaid = if ($hasBHYT) { [Math]::Round($qty * $bhytP * $rateBHYT, 2) } else { 0.0 }
            $ptPaid = $tot - $bhPaid

            $items += @{
                category = 'CAN_LAM_SANG'
                categoryName = '2. Dịch vụ kỹ thuật & Cận lâm sàng'
                code = $rdrCLS['maDichVu'].ToString()
                name = $rdrCLS['tenDichVu'].ToString()
                unit = 'Lần'
                quantity = [double]$qty
                unitPrice = [double]$price
                total = [double]$tot
                bhytUnitPrice = [double]$bhytP
                bhytPaid = [double]$bhPaid
                patientPaid = [double]$ptPaid
                bhytRate = [int]($rateBHYT * 100)
                sourceDetailId = $rdrCLS['maChiTiet'].ToString()
            }
        }
        $rdrCLS.Close()

        # Item 3: Prescriptions (ChiTietDonThuoc)
        $cmdRx = $db.CreateCommand()
        $cmdRx.CommandText = @"
SELECT c.maChiTietDon, c.maHang, h.tenHang, c.donViKe,
       c.soLuongKe, c.donGiaKe, h.giaBHYT
FROM dbo.ChiTietDonThuoc c
JOIN dbo.DonThuoc d ON d.maDon = c.maDon
JOIN dbo.HangHoaYTe h ON h.maHang = c.maHang
WHERE d.maLuotKham = @vId AND c.trangThai <> 'DA_HUY';
"@
        $cmdRx.Parameters.AddWithValue("@vId", $visitId) | Out-Null
        $rdrRx = $cmdRx.ExecuteReader()
        while ($rdrRx.Read()) {
            $qty = [decimal]$rdrRx['soLuongKe']
            $price = [decimal]$rdrRx['donGiaKe']
            $bhytP = if ($rdrRx['giaBHYT'] -ne [DBNull]::Value) { [decimal]$rdrRx['giaBHYT'] } else { 0.0 }
            $tot = $qty * $price
            $bhPaid = if ($hasBHYT) { [Math]::Round($qty * $bhytP * $rateBHYT, 2) } else { 0.0 }
            $ptPaid = $tot - $bhPaid

            $items += @{
                category = 'THUOC'
                categoryName = '3. Thuốc & Dược phẩm'
                code = $rdrRx['maHang'].ToString()
                name = $rdrRx['tenHang'].ToString()
                unit = $rdrRx['donViKe'].ToString()
                quantity = [double]$qty
                unitPrice = [double]$price
                total = [double]$tot
                bhytUnitPrice = [double]$bhytP
                bhytPaid = [double]$bhPaid
                patientPaid = [double]$ptPaid
                bhytRate = [int]($rateBHYT * 100)
                sourceDetailId = $rdrRx['maChiTietDon'].ToString()
            }
        }
        $rdrRx.Close()

        # Totals
        $grandTotal = 0.0
        $totalBhyt = 0.0
        $totalPatient = 0.0
        foreach ($it in $items) {
            $grandTotal += $it.total
            $totalBhyt += $it.bhytPaid
            $totalPatient += $it.patientPaid
        }

        # Check existing advances (TAM_UNG)
        $cmdAdv = $db.CreateCommand()
        $cmdAdv.CommandText = @"
SELECT maGiaoDich, phuongThuc, soTien, CONVERT(varchar(16), thoiDiemGiaoDich, 120) AS txTime
FROM dbo.GiaoDichThanhToan
WHERE maLuotKham = @vId AND loaiGiaoDich = 'TAM_UNG' AND trangThai = 'THANH_CONG';
"@
        $cmdAdv.Parameters.AddWithValue("@vId", $visitId) | Out-Null
        $rdrAdv = $cmdAdv.ExecuteReader()
        $advances = @()
        $totalAdvance = 0.0
        while ($rdrAdv.Read()) {
            $amt = [double]$rdrAdv['soTien']
            $totalAdvance += $amt
            $advances += @{
                id = $rdrAdv['maGiaoDich'].ToString()
                method = $rdrAdv['phuongThuc'].ToString()
                amount = $amt
                time = $rdrAdv['txTime'].ToString()
            }
        }
        $rdrAdv.Close()

        # Check existing settlement (QuyetToan)
        $cmdSet = $db.CreateCommand()
        $cmdSet.CommandText = @"
SELECT maQuyetToan, trangThai, thoiDiemChot, tongChiPhi, tienBHYTChiTra, nguoiBenhPhaiTra
FROM dbo.QuyetToan
WHERE maLuotKham = @vId AND laBanHienHanh = 1;
"@
        $cmdSet.Parameters.AddWithValue("@vId", $visitId) | Out-Null
        $rdrSet = $cmdSet.ExecuteReader()
        $settlement = $null
        if ($rdrSet.Read()) {
            $settlement = @{
                settlementId = $rdrSet['maQuyetToan'].ToString()
                status = $rdrSet['trangThai'].ToString()
                closedAt = [DateTime]$rdrSet['thoiDiemChot']
                gross = [double]$rdrSet['tongChiPhi']
                bhyt = [double]$rdrSet['tienBHYTChiTra']
                patientDue = [double]$rdrSet['nguoiBenhPhaiTra']
            }
        }
        $rdrSet.Close()

        $balanceDue = $totalPatient - $totalAdvance

        $statement = @{
            visitId = $visitId
            patient = @{
                id = $patientId
                name = $patientName
                birth = $birthStr
                gender = $gender
                insuranceCard = $soBHYT
                hasBHYT = $hasBHYT
                benefitRate = [int]($rateBHYT * 100)
                address = $address
                department = $deptName
                room = $room
            }
            formCode = '01/BV'
            formTitle = 'BẢNG KÊ CHI PHÍ KHÁM BỆNH, CHỮA BỆNH NGOẠI TRÚ'
            decisionNumber = 'Ban hành theo Quyết định số 6556/QĐ-BYT của Bộ trưởng Bộ Y tế'
            items = $items
            summary = @{
                totalCharges = [double]$grandTotal
                insuranceCoverage = [double]$totalBhyt
                patientCopay = [double]$totalPatient
                advanceDeposited = [double]$totalAdvance
                balanceDue = [double]$balanceDue
                settled = [bool]($null -ne $settlement -and $settlement.status -eq 'DA_QUYET_TOAN')
            }
            advances = $advances
            settlement = $settlement
        }

        [Console]::Write(($statement | ConvertTo-Json -Depth 6))
    }

    # -------------------------------------------------------------
    # 2. RECORD ADVANCE PAYMENT (Thu tiền tạm ứng viện phí)
    # -------------------------------------------------------------
    elseif ($action -eq 'record_advance') {
        $visitId = if ($payload.visitId) { $payload.visitId.ToString().Trim() } else { throw "visitId is required." }
        $amount = if ($payload.amount) { [decimal]$payload.amount } else { throw "amount is required." }
        if ($amount -le 0) { throw "Số tiền tạm ứng phải lớn hơn 0." }
        $method = if ($payload.paymentMethod) { $payload.paymentMethod.ToString().Trim() } else { 'TIEN_MAT' }
        $note = if ($payload.note) { $payload.note.ToString().Trim() } else { 'Tạm ứng viện phí khám bệnh' }

        $cmdGetBN = $db.CreateCommand()
        $cmdGetBN.CommandText = "SELECT maBenhNhan FROM dbo.LuotKham WHERE maLuotKham = @vId;"
        $cmdGetBN.Parameters.AddWithValue("@vId", $visitId) | Out-Null
        $bn = $cmdGetBN.ExecuteScalar()
        if (-not $bn) { throw "Không tìm thấy lượt khám $visitId." }
        $patientId = $bn.ToString()

        $maGD = "TU-" + (Get-Date).ToString("yyMMdd") + "-" + (Get-Random -Minimum 1000 -Maximum 9999)

        $cmdIns = $db.CreateCommand()
        $cmdIns.CommandText = @"
INSERT INTO dbo.GiaoDichThanhToan (
    maGiaoDich, maBenhNhan, maLuotKham, loaiGiaoDich, phuongThuc,
    soTien, thoiDiemGiaoDich, trangThai, maNhanVienXacNhan, ghiChu
) VALUES (
    @maGD, @bnId, @vId, 'TAM_UNG', @method,
    @amt, SYSDATETIME(), 'THANH_CONG', 'NV-TC01', @note
);
"@
        $cmdIns.Parameters.AddWithValue("@maGD", $maGD) | Out-Null
        $cmdIns.Parameters.AddWithValue("@bnId", $patientId) | Out-Null
        $cmdIns.Parameters.AddWithValue("@vId", $visitId) | Out-Null
        $cmdIns.Parameters.AddWithValue("@method", $method) | Out-Null
        $cmdIns.Parameters.AddWithValue("@amt", $amount) | Out-Null
        $cmdIns.Parameters.AddWithValue("@note", $note) | Out-Null
        $cmdIns.ExecuteNonQuery() | Out-Null

        $res = @{
            success = $true
            transactionId = $maGD
            visitId = $visitId
            amount = [double]$amount
            message = "Đã thu tạm ứng $amount VND thành công (Mã GD: $maGD)."
        } | ConvertTo-Json -Compress
        [Console]::Write($res)
    }

    # -------------------------------------------------------------
    # 3. SETTLE INVOICE & FORM 01/BV (Quyết toán xuất viện phí Mẫu 01/BV)
    # -------------------------------------------------------------
    elseif ($action -eq 'settle_invoice') {
        $visitId = if ($payload.visitId) { $payload.visitId.ToString().Trim() } else { throw "visitId is required." }
        $method = if ($payload.paymentMethod) { $payload.paymentMethod.ToString().Trim() } else { 'TIEN_MAT' }

        # First compute statement numbers
        $stmtRaw = & {
            $cmdGetBN = $db.CreateCommand()
            $cmdGetBN.CommandText = "SELECT l.maBenhNhan, b.soBHYT FROM dbo.LuotKham l JOIN dbo.BenhNhan b ON b.maBenhNhan = l.maBenhNhan WHERE l.maLuotKham = @vId;"
            $cmdGetBN.Parameters.AddWithValue("@vId", $visitId) | Out-Null
            $r = $cmdGetBN.ExecuteReader()
            if (-not $r.Read()) { throw "Không tìm thấy lượt khám $visitId." }
            $patientCode = $r['maBenhNhan'].ToString()
            $soBh = if ($r['soBHYT'] -ne [DBNull]::Value) { $r['soBHYT'].ToString().Trim() } else { '' }
            $r.Close()
            return @{ patientId = $patientCode; soBHYT = $soBh }
        }

        $patientId = $stmtRaw.patientId
        $soBHYT = $stmtRaw.soBHYT
        $hasBHYT = [bool]($soBHYT -and $soBHYT.Length -ge 10)
        $rateBHYT = if ($hasBHYT) { 0.80 } else { 0.0 }

        # Calculate totals from database
        $consultPrice = 50000.00
        $consultBhytPrice = 38700.00
        $consultBhPaid = if ($hasBHYT) { [Math]::Round($consultBhytPrice * $rateBHYT, 2) } else { 0.0 }

        # CLS
        $cmdTotCLS = $db.CreateCommand()
        $cmdTotCLS.CommandText = @"
SELECT ISNULL(SUM(ct.soLuong * ct.donGiaApDung), 0) AS grossCLS,
       ISNULL(SUM(ct.soLuong * s.giaBHYT), 0) AS bhytCLS
FROM dbo.ChiTietChiDinh ct
JOIN dbo.ChiDinhCLS c ON c.maChiDinh = ct.maChiDinh
JOIN dbo.DichVuKyThuat s ON s.maDichVu = ct.maDichVu
WHERE c.maLuotKham = @vId AND ct.trangThai <> 'DA_HUY';
"@
        $cmdTotCLS.Parameters.AddWithValue("@vId", $visitId) | Out-Null
        $rdrTotCLS = $cmdTotCLS.ExecuteReader()
        $grossCLS = 0.0; $baseBhCLS = 0.0
        if ($rdrTotCLS.Read()) {
            $grossCLS = [decimal]$rdrTotCLS['grossCLS']
            $baseBhCLS = [decimal]$rdrTotCLS['bhytCLS']
        }
        $rdrTotCLS.Close()

        # Rx
        $cmdTotRx = $db.CreateCommand()
        $cmdTotRx.CommandText = @"
SELECT ISNULL(SUM(c.soLuongKe * c.donGiaKe), 0) AS grossRx,
       ISNULL(SUM(c.soLuongKe * ISNULL(h.giaBHYT, 0)), 0) AS bhytRx
FROM dbo.ChiTietDonThuoc c
JOIN dbo.DonThuoc d ON d.maDon = c.maDon
JOIN dbo.HangHoaYTe h ON h.maHang = c.maHang
WHERE d.maLuotKham = @vId AND c.trangThai <> 'DA_HUY';
"@
        $cmdTotRx.Parameters.AddWithValue("@vId", $visitId) | Out-Null
        $rdrTotRx = $cmdTotRx.ExecuteReader()
        $grossRx = 0.0; $baseBhRx = 0.0
        if ($rdrTotRx.Read()) {
            $grossRx = [decimal]$rdrTotRx['grossRx']
            $baseBhRx = [decimal]$rdrTotRx['bhytRx']
        }
        $rdrTotRx.Close()

        $totalGross = $consultPrice + $grossCLS + $grossRx
        $bhPaidCLS = if ($hasBHYT) { [Math]::Round($baseBhCLS * $rateBHYT, 2) } else { 0.0 }
        $bhPaidRx = if ($hasBHYT) { [Math]::Round($baseBhRx * $rateBHYT, 2) } else { 0.0 }
        $totalBhytPaid = $consultBhPaid + $bhPaidCLS + $bhPaidRx
        $patientCopay = $totalGross - $totalBhytPaid

        # Total advances
        $cmdTotAdv = $db.CreateCommand()
        $cmdTotAdv.CommandText = @"
SELECT ISNULL(SUM(soTien), 0) 
FROM dbo.GiaoDichThanhToan 
WHERE maLuotKham = @vId AND loaiGiaoDich = 'TAM_UNG' AND trangThai = 'THANH_CONG';
"@
        $cmdTotAdv.Parameters.AddWithValue("@vId", $visitId) | Out-Null
        $totalAdv = [decimal]$cmdTotAdv.ExecuteScalar()

        $balanceDue = $patientCopay - $totalAdv

        $maQT = "QT-" + (Get-Date).ToString("yyMMdd") + "-" + (Get-Random -Minimum 1000 -Maximum 9999)

        $tx = $db.BeginTransaction()
        try {
            # Insert QuyetToan
            $cmdQT = $db.CreateCommand()
            $cmdQT.Transaction = $tx
            $cmdQT.CommandText = @"
INSERT INTO dbo.QuyetToan (
    maQuyetToan, maLuotKham, phienBan, laBanHienHanh,
    thoiDiemChot, tongChiPhi, tienBHYTChiTra, tongMienGiam,
    trangThai, maNguoiChot, ghiChu
) VALUES (
    @maQT, @vId, 1, 1,
    SYSDATETIME(), @gross, @bhyt, 0,
    'DA_QUYET_TOAN', 'NV-TC01', N'Quyết toán viện phí Mẫu 01/BV'
);
"@
            $cmdQT.Parameters.AddWithValue("@maQT", $maQT) | Out-Null
            $cmdQT.Parameters.AddWithValue("@vId", $visitId) | Out-Null
            $cmdQT.Parameters.AddWithValue("@gross", $totalGross) | Out-Null
            $cmdQT.Parameters.AddWithValue("@bhyt", $totalBhytPaid) | Out-Null
            $cmdQT.ExecuteNonQuery() | Out-Null

            # Insert ChiTietQuyetToan for Consultation
            $cmdDongKB = $db.CreateCommand()
            $cmdDongKB.Transaction = $tx
            $cmdDongKB.CommandText = @"
INSERT INTO dbo.ChiTietQuyetToan (
    maDongQuyetToan, maQuyetToan, loaiChiPhi, maLuotKhamNguon,
    soLuong, donGia, thanhTien, tienBHYT, tienBenhNhanTra, tyLeBHYT
) VALUES (
    @dId, @maQT, 'KHAM_BENH', @vId,
    1, @price, @price, @bh, @pt, @rate
);
"@
            $cmdDongKB.Parameters.AddWithValue("@dId", "$maQT-KB01") | Out-Null
            $cmdDongKB.Parameters.AddWithValue("@maQT", $maQT) | Out-Null
            $cmdDongKB.Parameters.AddWithValue("@vId", $visitId) | Out-Null
            $cmdDongKB.Parameters.AddWithValue("@price", $consultPrice) | Out-Null
            $cmdDongKB.Parameters.AddWithValue("@bh", $consultBhPaid) | Out-Null
            $cmdDongKB.Parameters.AddWithValue("@pt", ($consultPrice - $consultBhPaid)) | Out-Null
            $rateVal = if ($hasBHYT) { [decimal]80.00 } else { [decimal]0.00 }
            $cmdDongKB.Parameters.AddWithValue("@rate", $rateVal) | Out-Null
            $cmdDongKB.ExecuteNonQuery() | Out-Null

            # If balance > 0, insert final payment; if balance < 0, insert refund
            if ($balanceDue -ne 0) {
                $isRefund = ($balanceDue -lt 0)
                $txType = if ($isRefund) { 'HOAN_UNG' } else { 'THANH_TOAN_TOAN_BO' }
                $txAmt = [Math]::Abs($balanceDue)
                $txNote = if ($isRefund) { 'Hoàn trả tiền tạm ứng còn thừa cho người bệnh' } else { 'Thu chênh lệch viện phí quyết toán' }
                $prefix = if ($isRefund) { 'HU-' } else { 'TT-' }
                $maGD = $prefix + (Get-Date).ToString("yyMMdd") + "-" + (Get-Random -Minimum 1000 -Maximum 9999)

                $cmdPay = $db.CreateCommand()
                $cmdPay.Transaction = $tx
                $cmdPay.CommandText = @"
INSERT INTO dbo.GiaoDichThanhToan (
    maGiaoDich, maBenhNhan, maLuotKham, maQuyetToan, loaiGiaoDich, phuongThuc,
    soTien, thoiDiemGiaoDich, trangThai, maNhanVienXacNhan, ghiChu
) VALUES (
    @maGD, @bnId, @vId, @maQT, @txType, @method,
    @amt, SYSDATETIME(), 'THANH_CONG', 'NV-TC01', @note
);
"@
                $cmdPay.Parameters.AddWithValue("@maGD", $maGD) | Out-Null
                $cmdPay.Parameters.AddWithValue("@bnId", $patientId) | Out-Null
                $cmdPay.Parameters.AddWithValue("@vId", $visitId) | Out-Null
                $cmdPay.Parameters.AddWithValue("@maQT", $maQT) | Out-Null
                $cmdPay.Parameters.AddWithValue("@txType", $txType) | Out-Null
                $cmdPay.Parameters.AddWithValue("@method", $method) | Out-Null
                $cmdPay.Parameters.AddWithValue("@amt", $txAmt) | Out-Null
                $cmdPay.Parameters.AddWithValue("@note", $txNote) | Out-Null
                $cmdPay.ExecuteNonQuery() | Out-Null
            }

            # Update visit status to HOAN_TAT_KHAM
            $cmdUpVisit = $db.CreateCommand()
            $cmdUpVisit.Transaction = $tx
            $cmdUpVisit.CommandText = @"
UPDATE dbo.LuotKham 
SET trangThai = 'HOAN_TAT_KHAM',
    thoiDiemKetThuc = SYSDATETIME()
WHERE maLuotKham = @vId;
"@
            $cmdUpVisit.Parameters.AddWithValue("@vId", $visitId) | Out-Null
            $cmdUpVisit.ExecuteNonQuery() | Out-Null

            $tx.Commit()

            $res = @{
                success = $true
                settlementId = $maQT
                visitId = $visitId
                totalCharges = [double]$totalGross
                insurancePaid = [double]$totalBhytPaid
                patientCopay = [double]$patientCopay
                advanceUsed = [double]$totalAdv
                balancePaid = [double]$balanceDue
                message = "Đã hoàn tất quyết toán Bảng kê 01/BV thành công (Mã QT: $maQT)."
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
