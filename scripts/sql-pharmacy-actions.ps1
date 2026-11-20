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
    $action = if ($payload.action) { $payload.action.ToString() } else { throw "action is required." }

    # =========================================================================
    # 1. IMPORT PHARMACY / SUPPLY LOT (NHẬP LÔ THUỐC / VẬT TƯ Y TẾ)
    # =========================================================================
    if ($action -eq 'import_lot') {
        $medicineId = if ($payload.medicineId) { $payload.medicineId.ToString().Trim() } else { throw "medicineId is required." }
        $warehouseId = if ($payload.warehouseId) { $payload.warehouseId.ToString().Trim() } else { 'KHO_NGOAI_TRU' }
        $lot = if ($payload.lot) { $payload.lot.ToString().Trim() } else { throw "lot is required." }
        $expiry = if ($payload.expiry) { $payload.expiry.ToString().Trim() } else { throw "expiry is required." }
        $qty = [decimal]($payload.qty)
        if ($qty -le 0) { throw "Quantity must be greater than zero." }
        $unitPrice = if ($payload.unitPrice) { [decimal]($payload.unitPrice) } else { 1000 }
        $mfg = if ($payload.manufacturer) { $payload.manufacturer.ToString().Trim() } else { 'Việt Nam' }
        $mfgDate = if ($payload.mfgDate) { $payload.mfgDate.ToString().Trim() } else { (Get-Date).ToString("yyyy-MM-dd") }
        $shelf = if ($payload.shelfLocation) { $payload.shelfLocation.ToString().Trim() } else { 'Kệ nhập mới' }

        $tx = $db.BeginTransaction()
        try {
            # Check or create LoHang
            $chkCmd = $db.CreateCommand()
            $chkCmd.Transaction = $tx
            $chkCmd.CommandText = "SELECT TOP 1 maLoHang FROM dbo.LoHang WHERE maHang = @mId AND soLoNhaSanXuat = @lot"
            $chkCmd.Parameters.AddWithValue("@mId", $medicineId) | Out-Null
            $chkCmd.Parameters.AddWithValue("@lot", $lot) | Out-Null
            $existingBatchId = $chkCmd.ExecuteScalar()

            if (-not $existingBatchId) {
                $pfx = (Get-Date).ToString("yyMMdd")
                $cntCmd = $db.CreateCommand()
                $cntCmd.Transaction = $tx
                $cntCmd.CommandText = "SELECT COUNT(*) + 1 FROM dbo.LoHang"
                $seq = [int]$cntCmd.ExecuteScalar()
                $batchId = "LO_" + $medicineId + "_" + $seq

                $insLoCmd = $db.CreateCommand()
                $insLoCmd.Transaction = $tx
                $insLoCmd.CommandText = @"
INSERT INTO dbo.LoHang (maLoHang, maHang, soLoNhaSanXuat, ngaySanXuat, hanSuDung, hangSanXuat, nuocSanXuat, donGiaNhap, soLuongNhap)
VALUES (@bId, @mId, @lot, @mfgDate, @exp, @mfg, N'Việt Nam', @prc, @qty);
"@
                $insLoCmd.Parameters.AddWithValue("@bId", $batchId) | Out-Null
                $insLoCmd.Parameters.AddWithValue("@mId", $medicineId) | Out-Null
                $insLoCmd.Parameters.AddWithValue("@lot", $lot) | Out-Null
                $insLoCmd.Parameters.AddWithValue("@mfgDate", $mfgDate) | Out-Null
                $insLoCmd.Parameters.AddWithValue("@exp", $expiry) | Out-Null
                $insLoCmd.Parameters.AddWithValue("@mfg", $mfg) | Out-Null
                $insLoCmd.Parameters.AddWithValue("@prc", $unitPrice) | Out-Null
                $insLoCmd.Parameters.AddWithValue("@qty", $qty) | Out-Null
                $insLoCmd.ExecuteNonQuery() | Out-Null
            } else {
                $batchId = [string]$existingBatchId
            }

            # Upsert into LoTonKho
            $upsertCmd = $db.CreateCommand()
            $upsertCmd.Transaction = $tx
            $upsertCmd.CommandText = @"
IF EXISTS (SELECT 1 FROM dbo.LoTonKho WHERE maKho = @wId AND maLoHang = @bId)
BEGIN
    UPDATE dbo.LoTonKho
    SET soLuongTon = soLuongTon + @qty,
        soLuongKhaDung = soLuongKhaDung + @qty,
        viTriDayKe = ISNULL(@shelf, viTriDayKe)
    WHERE maKho = @wId AND maLoHang = @bId;
END
ELSE
BEGIN
    DECLARE @loTonId varchar(20) = 'LTK_' + SUBSTRING(REPLACE(CONVERT(varchar(36), NEWID()), '-', ''), 1, 14);
    INSERT INTO dbo.LoTonKho (maLoTon, maKho, maLoHang, soLuongTon, soLuongKhaDung, viTriDayKe, trangThaiKhoa)
    VALUES (@loTonId, @wId, @bId, @qty, @qty, @shelf, 0);
END
"@
            $upsertCmd.Parameters.AddWithValue("@wId", $warehouseId) | Out-Null
            $upsertCmd.Parameters.AddWithValue("@bId", $batchId) | Out-Null
            $upsertCmd.Parameters.AddWithValue("@qty", $qty) | Out-Null
            $upsertCmd.Parameters.AddWithValue("@shelf", $shelf) | Out-Null
            $upsertCmd.ExecuteNonQuery() | Out-Null

            $tx.Commit()
            $resObj = [PSCustomObject]@{
                success = $true
                batchId = $batchId
                medicineId = $medicineId
                lot = $lot
                warehouse = $warehouseId
                addedQty = $qty
            }
            [Console]::Write(($resObj | ConvertTo-Json -Compress))
        } catch {
            $tx.Rollback()
            throw $_
        }
    }

    # =========================================================================
    # 2. CREATE NEW PRODUCT / MEDICINE / SUPPLY (THÊM MẶT HÀNG THUỐC / VẬT TƯ)
    # =========================================================================
    elseif ($action -eq 'create_product') {
        $id = if ($payload.id) { $payload.id.ToString().Trim().ToUpper() } else { throw "id is required." }
        $name = if ($payload.name) { $payload.name.ToString().Trim() } else { throw "name is required." }
        $unit = if ($payload.unit) { $payload.unit.ToString().Trim() } else { 'Viên' }
        $kind = if ($payload.type -eq 'Vật tư y tế' -or $payload.kind -eq 'VAT_TU') { 'VAT_TU' } else { 'THUOC' }
        $price = if ($payload.price) { [decimal]($payload.price) } else { 1000 }
        $insPrice = if ($payload.insurancePrice) { [decimal]($payload.insurancePrice) } else { [decimal]($price * 0.8) }
        $activeIngredient = if ($payload.activeIngredient) { $payload.activeIngredient.ToString().Trim() } else { $name }
        $dosage = if ($payload.dosage) { $payload.dosage.ToString().Trim() } else { 'Chuẩn' }
        $route = if ($payload.route) { $payload.route.ToString().Trim() } else { 'Uống' }

        $tx = $db.BeginTransaction()
        try {
            $insProdCmd = $db.CreateCommand()
            $insProdCmd.Transaction = $tx
            $insProdCmd.CommandText = @"
IF NOT EXISTS (SELECT 1 FROM dbo.HangHoaYTe WHERE maHang = @id)
BEGIN
    INSERT INTO dbo.HangHoaYTe (maHang, tenHang, donViCoSo, loaiHang, donGiaNhapBinhQuan, donGiaXuatCoSo, giaBHYT, dangKinhDoanh)
    VALUES (@id, @name, @unit, @kind, @prc * 0.7, @prc, @insPrc, 1);

    IF (@kind = 'THUOC')
    BEGIN
        INSERT INTO dbo.Thuoc (maHang, loaiHang, hoatChat, hamLuong, duongDung, dangBaoChe)
        VALUES (@id, 'THUOC', @act, @dos, @route, N'Viên nén');
    END
END
ELSE
BEGIN
    UPDATE dbo.HangHoaYTe
    SET tenHang = @name, donViCoSo = @unit, donGiaXuatCoSo = @prc, giaBHYT = @insPrc
    WHERE maHang = @id;
END
"@
            $insProdCmd.Parameters.AddWithValue("@id", $id) | Out-Null
            $insProdCmd.Parameters.AddWithValue("@name", $name) | Out-Null
            $insProdCmd.Parameters.AddWithValue("@unit", $unit) | Out-Null
            $insProdCmd.Parameters.AddWithValue("@kind", $kind) | Out-Null
            $insProdCmd.Parameters.AddWithValue("@prc", $price) | Out-Null
            $insProdCmd.Parameters.AddWithValue("@insPrc", $insPrice) | Out-Null
            $insProdCmd.Parameters.AddWithValue("@act", $activeIngredient) | Out-Null
            $insProdCmd.Parameters.AddWithValue("@dos", $dosage) | Out-Null
            $insProdCmd.Parameters.AddWithValue("@route", $route) | Out-Null
            $insProdCmd.ExecuteNonQuery() | Out-Null

            $tx.Commit()
            $resObj = [PSCustomObject]@{
                success = $true
                id = $id
                name = $name
                kind = $kind
                unit = $unit
                price = $price
            }
            [Console]::Write(($resObj | ConvertTo-Json -Compress))
        } catch {
            $tx.Rollback()
            throw $_
        }
    }

    # =========================================================================
    # 3. TRANSFER STOCK BETWEEN WAREHOUSES (ĐIỀU CHUYỂN TỒN KHO)
    # =========================================================================
    elseif ($action -eq 'transfer_stock') {
        $sourceWh = if ($payload.sourceWarehouse) { $payload.sourceWarehouse.ToString().Trim() } else { throw "sourceWarehouse is required." }
        $targetWh = if ($payload.targetWarehouse) { $payload.targetWarehouse.ToString().Trim() } else { throw "targetWarehouse is required." }
        $medicineId = if ($payload.medicineId) { $payload.medicineId.ToString().Trim() } else { throw "medicineId is required." }
        $qty = [decimal]($payload.quantity)
        if ($qty -le 0) { throw "Quantity must be greater than zero." }

        $tx = $db.BeginTransaction()
        try {
            # Find available batch in source warehouse
            $findCmd = $db.CreateCommand()
            $findCmd.Transaction = $tx
            $findCmd.CommandText = @"
SELECT TOP 1 ltk.maLoTon, ltk.maLoHang, ltk.soLuongKhaDung
FROM dbo.LoTonKho ltk
INNER JOIN dbo.LoHang lh ON lh.maLoHang = ltk.maLoHang
WHERE ltk.maKho = @src AND lh.maHang = @mId AND ltk.soLuongKhaDung >= @qty AND ltk.trangThaiKhoa = 0
ORDER BY lh.hanSuDung ASC;
"@
            $findCmd.Parameters.AddWithValue("@src", $sourceWh) | Out-Null
            $findCmd.Parameters.AddWithValue("@mId", $medicineId) | Out-Null
            $findCmd.Parameters.AddWithValue("@qty", $qty) | Out-Null
            $reader = $findCmd.ExecuteReader()
            $batchFound = $reader.Read()
            if (-not $batchFound) {
                $reader.Close()
                throw "Kho nguồn ($sourceWh) không đủ tồn khả dụng cho mặt hàng $medicineId (cần $qty)."
            }
            $srcLotTonId = $reader.GetString(0)
            $batchId = $reader.GetString(1)
            $reader.Close()

            # Decrement source warehouse
            $decCmd = $db.CreateCommand()
            $decCmd.Transaction = $tx
            $decCmd.CommandText = @"
UPDATE dbo.LoTonKho
SET soLuongTon = soLuongTon - @qty,
    soLuongKhaDung = soLuongKhaDung - @qty
WHERE maLoTon = @lotTonId;
"@
            $decCmd.Parameters.AddWithValue("@qty", $qty) | Out-Null
            $decCmd.Parameters.AddWithValue("@lotTonId", $srcLotTonId) | Out-Null
            $decCmd.ExecuteNonQuery() | Out-Null

            # Increment target warehouse
            $incCmd = $db.CreateCommand()
            $incCmd.Transaction = $tx
            $incCmd.CommandText = @"
IF EXISTS (SELECT 1 FROM dbo.LoTonKho WHERE maKho = @targetWh AND maLoHang = @bId)
BEGIN
    UPDATE dbo.LoTonKho
    SET soLuongTon = soLuongTon + @qty,
        soLuongKhaDung = soLuongKhaDung + @qty
    WHERE maKho = @targetWh AND maLoHang = @bId;
END
ELSE
BEGIN
    DECLARE @loTonId varchar(20) = 'LTK_' + SUBSTRING(REPLACE(CONVERT(varchar(36), NEWID()), '-', ''), 1, 14);
    INSERT INTO dbo.LoTonKho (maLoTon, maKho, maLoHang, soLuongTon, soLuongKhaDung, viTriDayKe, trangThaiKhoa)
    VALUES (@loTonId, @targetWh, @bId, @qty, @qty, N'Kệ điều chuyển', 0);
END
"@
            $incCmd.Parameters.AddWithValue("@targetWh", $targetWh) | Out-Null
            $incCmd.Parameters.AddWithValue("@bId", $batchId) | Out-Null
            $incCmd.Parameters.AddWithValue("@qty", $qty) | Out-Null
            $incCmd.ExecuteNonQuery() | Out-Null

            $tx.Commit()
            $resObj = [PSCustomObject]@{
                success = $true
                medicineId = $medicineId
                batchId = $batchId
                from = $sourceWh
                to = $targetWh
                quantity = $qty
            }
            [Console]::Write(($resObj | ConvertTo-Json -Compress))
        } catch {
            $tx.Rollback()
            throw $_
        }
    }
} finally {
    $db.Dispose()
}
