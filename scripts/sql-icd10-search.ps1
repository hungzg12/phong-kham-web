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
    $search = ''
    if ($inputRaw) {
        try {
            $parsed = $inputRaw | ConvertFrom-Json
            if ($parsed.q) { $search = $parsed.q.ToString().Trim() }
        } catch { }
    }

    $cmd = $db.CreateCommand()
    if ($search) {
        $cmd.CommandText = @"
SELECT TOP (35)
       maICD,
       tenBenh,
       ISNULL(tenTiengAnh, '') AS tenTiengAnh,
       ISNULL(maChuong, '') AS maChuong,
       ISNULL(tenChuong, '') AS tenChuong,
       thuongGap,
       trangThai
FROM dbo.DanhMucICD10
WHERE trangThai = 1 
  AND (maICD LIKE @q + '%' 
       OR tenBenh LIKE N'%' + @q + '%' 
       OR tenTiengAnh LIKE '%' + @q + '%')
ORDER BY thuongGap DESC, maICD ASC
FOR JSON PATH;
"@
        $p = $cmd.Parameters.Add("@q", [System.Data.SqlDbType]::NVarChar, 100)
        $p.Value = $search
    } else {
        $cmd.CommandText = @"
SELECT TOP (50)
       maICD,
       tenBenh,
       ISNULL(tenTiengAnh, '') AS tenTiengAnh,
       ISNULL(maChuong, '') AS maChuong,
       ISNULL(tenChuong, '') AS tenChuong,
       thuongGap,
       trangThai
FROM dbo.DanhMucICD10
WHERE trangThai = 1
ORDER BY thuongGap DESC, maICD ASC
FOR JSON PATH;
"@
    }

    $reader = $cmd.ExecuteReader()
    $json = [System.Text.StringBuilder]::new()
    while ($reader.Read()) { $null = $json.Append($reader.GetString(0)) }
    if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('[]') }
} finally { $db.Dispose() }
