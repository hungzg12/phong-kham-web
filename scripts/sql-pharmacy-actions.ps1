$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

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
    # 1. IMPORT PHARMACY / SUPPLY LOT & SHIPMENT (NHẬP LÔ HÀNG GỒM NHIỀU THUỐC)
    # =========================================================================
    if ($action -eq 'import_lot' -or $action -eq 'import_shipment') {
        $warehouseId = if ($payload.warehouseId) { $payload.warehouseId.ToString().Trim() } else { 'KHO_TONG' }
        $supplier = if ($payload.supplier) { $payload.supplier.ToString().Trim() } else { 'Công ty Dược phẩm' }
        $manufacturer = if ($payload.manufacturer) { $payload.manufacturer.ToString().Trim() } else { 'Việt Nam' }
        $importDate = if ($payload.importDate) { $payload.importDate.ToString().Trim() } else { (Get-Date).ToString("yyyy-MM-dd") }
        $invoice = if ($payload.invoiceNumber) { $payload.invoiceNumber.ToString().Trim() } else { 'HD-' + (Get-Date).ToString("yyMMddHHmm") }
        $shipmentName = if ($payload.shipmentName) { $payload.shipmentName.ToString().Trim() } else { 'Lô hàng nhập ' + (Get-Date).ToString("dd/MM/yyyy") }

        # Prepare lines: either $payload.lines (array) or single item from $payload
        $lines = @()
        if ($payload.lines -and $payload.lines.Count -gt 0) {
            $lines = $payload.lines
        } elseif ($payload.medicineId) {
            $lines = @([PSCustomObject]@{
                medicineId = $payload.medicineId
                lot = $payload.lot
                expiry = $payload.expiry
                qty = $payload.qty
                unitPrice = if ($payload.unitPrice) { $payload.unitPrice } else { 1000 }
                shelfLocation = if ($payload.shelfLocation) { $payload.shelfLocation } else { 'Kệ nhập mới' }
            })
        } else {
            throw "Cần ít nhất một dòng thuốc / vật tư để nhập kho."
        }

        $tx = $db.BeginTransaction()
        try {
            # 1. Check or create DotNhapHang
            $pfx = (Get-Date).ToString("yyMMdd")
            $cntCmd = $db.CreateCommand()
            $cntCmd.Transaction = $tx
            $cntCmd.CommandText = "SELECT COUNT(*) + 1 FROM dbo.DotNhapHang"
            $dotSeq = [int]$cntCmd.ExecuteScalar()
            $dotNhapId = if ($payload.shipmentId) { $payload.shipmentId.ToString().Trim() } else { "DOT_" + $pfx + "_" + $dotSeq.ToString("D3") }

            $insDotCmd = $db.CreateCommand()
            $insDotCmd.Transaction = $tx
            $insDotCmd.CommandText = @"
IF NOT EXISTS (SELECT 1 FROM dbo.DotNhapHang WHERE maDotNhap = @dId)
BEGIN
    INSERT INTO dbo.DotNhapHang (maDotNhap, tenDotNhap, hangSanXuat, nhaCungCap, soHoaDon, ngayNhapKho, maKhoNhap, nguoiGiaoHang, nguoiNhanHang, ghiChu)
    VALUES (@dId, @name, @mfg, @sup, @inv, @dt, @wId, N'Người giao hàng', N'Dược sĩ Trưởng', @note);
END
"@
            $insDotCmd.Parameters.AddWithValue("@dId", $dotNhapId) | Out-Null
            $insDotCmd.Parameters.AddWithValue("@name", $shipmentName) | Out-Null
            $insDotCmd.Parameters.AddWithValue("@mfg", $manufacturer) | Out-Null
            $insDotCmd.Parameters.AddWithValue("@sup", $supplier) | Out-Null
            $insDotCmd.Parameters.AddWithValue("@inv", $invoice) | Out-Null
            $insDotCmd.Parameters.AddWithValue("@dt", $importDate) | Out-Null
            $insDotCmd.Parameters.AddWithValue("@wId", $warehouseId) | Out-Null
            $insDotCmd.Parameters.AddWithValue("@note", "Nhập đợt hàng gồm " + $lines.Count + " mặt hàng") | Out-Null
            $insDotCmd.ExecuteNonQuery() | Out-Null

            # 2. Iterate each medicine line
            $importedCount = 0
            $totalUnits = [decimal]0
            $lineResults = @()

            foreach ($line in $lines) {
                $mId = $line.medicineId.ToString().Trim()
                $lot = $line.lot.ToString().Trim()
                $exp = $line.expiry.ToString().Trim()
                $qty = [decimal]($line.qty)
                if ($qty -le 0) { continue }
                $unitPrc = if ($line.unitPrice) { [decimal]($line.unitPrice) } else { 1000 }
                $shelf = if ($line.shelfLocation) { $line.shelfLocation.ToString().Trim() } else { 'Kệ nhập mới' }

                # Check or insert LoHang
                $chkLoCmd = $db.CreateCommand()
                $chkLoCmd.Transaction = $tx
                $chkLoCmd.CommandText = "SELECT TOP 1 maLoHang FROM dbo.LoHang WHERE maHang = @mId AND soLoNhaSanXuat = @lot"
                $chkLoCmd.Parameters.AddWithValue("@mId", $mId) | Out-Null
                $chkLoCmd.Parameters.AddWithValue("@lot", $lot) | Out-Null
                $existBatch = $chkLoCmd.ExecuteScalar()

                if (-not $existBatch) {
                    $cntLoCmd = $db.CreateCommand()
                    $cntLoCmd.Transaction = $tx
                    $cntLoCmd.CommandText = "SELECT COUNT(*) + 1 FROM dbo.LoHang"
                    $seqLo = [int]$cntLoCmd.ExecuteScalar()
                    $batchId = "LO_" + $mId + "_" + $seqLo

                    $insLo = $db.CreateCommand()
                    $insLo.Transaction = $tx
                    $insLo.CommandText = @"
INSERT INTO dbo.LoHang (maLoHang, maDotNhap, maHang, soLoNhaSanXuat, ngaySanXuat, hanSuDung, hangSanXuat, nuocSanXuat, donGiaNhap, soLuongNhap)
VALUES (@bId, @dId, @mId, @lot, @dt, @exp, @mfg, N'Việt Nam', @prc, @qty);
"@
                    $insLo.Parameters.AddWithValue("@bId", $batchId) | Out-Null
                    $insLo.Parameters.AddWithValue("@dId", $dotNhapId) | Out-Null
                    $insLo.Parameters.AddWithValue("@mId", $mId) | Out-Null
                    $insLo.Parameters.AddWithValue("@lot", $lot) | Out-Null
                    $insLo.Parameters.AddWithValue("@dt", $importDate) | Out-Null
                    $insLo.Parameters.AddWithValue("@exp", $exp) | Out-Null
                    $insLo.Parameters.AddWithValue("@mfg", $manufacturer) | Out-Null
                    $insLo.Parameters.AddWithValue("@prc", $unitPrc) | Out-Null
                    $insLo.Parameters.AddWithValue("@qty", $qty) | Out-Null
                    $insLo.ExecuteNonQuery() | Out-Null
                } else {
                    $batchId = [string]$existBatch
                    # Update maDotNhap if unlinked
                    $updLo = $db.CreateCommand()
                    $updLo.Transaction = $tx
                    $updLo.CommandText = "UPDATE dbo.LoHang SET maDotNhap = ISNULL(maDotNhap, @dId) WHERE maLoHang = @bId"
                    $updLo.Parameters.AddWithValue("@dId", $dotNhapId) | Out-Null
                    $updLo.Parameters.AddWithValue("@bId", $batchId) | Out-Null
                    $updLo.ExecuteNonQuery() | Out-Null
                }

                # Upsert LoTonKho
                $upsertLtk = $db.CreateCommand()
                $upsertLtk.Transaction = $tx
                $upsertLtk.CommandText = @"
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
                $upsertLtk.Parameters.AddWithValue("@wId", $warehouseId) | Out-Null
                $upsertLtk.Parameters.AddWithValue("@bId", $batchId) | Out-Null
                $upsertLtk.Parameters.AddWithValue("@qty", $qty) | Out-Null
                $upsertLtk.Parameters.AddWithValue("@shelf", $shelf) | Out-Null
                $upsertLtk.ExecuteNonQuery() | Out-Null

                $importedCount++
                $totalUnits += $qty
                $lineResults += [PSCustomObject]@{
                    medicineId = $mId
                    lot = $lot
                    batchId = $batchId
                    qty = $qty
                }
            }

            $tx.Commit()
            $resObj = [PSCustomObject]@{
                success = $true
                shipmentId = $dotNhapId
                shipmentName = $shipmentName
                warehouseId = $warehouseId
                totalItemTypes = $importedCount
                totalUnits = $totalUnits
                items = $lineResults
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
