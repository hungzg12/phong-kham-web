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
    if (-not $inputRaw) { throw "No data provided to import." }
    $rows = $inputRaw | ConvertFrom-Json
    if (-not ($rows -is [System.Collections.IEnumerable])) {
        $rows = @($rows)
    }

    $tx = $db.BeginTransaction()
    $inserted = 0
    $updated = 0

    $mergeSql = @"
MERGE dbo.DanhMucICD10 AS target
USING (SELECT @maICD AS maICD, @tenBenh AS tenBenh, @tenTiengAnh AS tenTiengAnh, @maChuong AS maChuong, @tenChuong AS tenChuong, @thuongGap AS thuongGap) AS source
ON (target.maICD = source.maICD)
WHEN MATCHED THEN
    UPDATE SET target.tenBenh = source.tenBenh, 
               target.tenTiengAnh = source.tenTiengAnh, 
               target.maChuong = source.maChuong, 
               target.tenChuong = source.tenChuong, 
               target.thuongGap = source.thuongGap, 
               target.ngayCapNhat = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (maICD, tenBenh, tenTiengAnh, maChuong, tenChuong, thuongGap, trangThai)
    VALUES (source.maICD, source.tenBenh, source.tenTiengAnh, source.maChuong, source.tenChuong, source.thuongGap, 1)
OUTPUT `$action;
"@

    $cmd = $db.CreateCommand()
    $cmd.Transaction = $tx
    $cmd.CommandText = $mergeSql

    $pMa = $cmd.Parameters.Add("@maICD", [System.Data.SqlDbType]::VarChar, 20)
    $pTen = $cmd.Parameters.Add("@tenBenh", [System.Data.SqlDbType]::NVarChar, 350)
    $pEn = $cmd.Parameters.Add("@tenTiengAnh", [System.Data.SqlDbType]::NVarChar, 350)
    $pChCode = $cmd.Parameters.Add("@maChuong", [System.Data.SqlDbType]::VarChar, 10)
    $pChName = $cmd.Parameters.Add("@tenChuong", [System.Data.SqlDbType]::NVarChar, 250)
    $pTg = $cmd.Parameters.Add("@thuongGap", [System.Data.SqlDbType]::Bit)

    foreach ($item in $rows) {
        $ma = if ($item.maICD) { $item.maICD.ToString().Trim().ToUpper() } else { '' }
        $ten = if ($item.tenBenh) { $item.tenBenh.ToString().Trim() } else { '' }
        if (-not $ma -or -not $ten) { continue }

        $pMa.Value = $ma
        $pTen.Value = $ten
        $pEn.Value = if ($item.tenTiengAnh) { $item.tenTiengAnh.ToString().Trim() } else { [System.DBNull]::Value }
        $pChCode.Value = if ($item.maChuong) { $item.maChuong.ToString().Trim() } else { [System.DBNull]::Value }
        $pChName.Value = if ($item.tenChuong) { $item.tenChuong.ToString().Trim() } else { [System.DBNull]::Value }
        $pTg.Value = if ($item.thuongGap -eq 1 -or $item.thuongGap -eq $true -or $item.thuongGap -eq '1') { 1 } else { 0 }

        $action = $cmd.ExecuteScalar()
        if ($action -eq 'INSERT') { $inserted++ }
        if ($action -eq 'UPDATE') { $updated++ }
    }

    $tx.Commit()

    $res = @{
        success = $true
        total = $rows.Count
        inserted = $inserted
        updated = $updated
    } | ConvertTo-Json -Compress

    [Console]::Write($res)
} catch {
    if ($tx) { try { $tx.Rollback() } catch {} }
    throw $_
} finally {
    $db.Dispose()
}
