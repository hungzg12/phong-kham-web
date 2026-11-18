$ErrorActionPreference = 'Stop'
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
    $cmd = $db.CreateCommand()
    $cmd.CommandText = @"
SELECT TOP (100) h.maHen AS id, k.tenKhoa AS department, r.tenBuong AS room,
       CONVERT(char(10), h.ngayHen, 23) AS day,
       LEFT(CONVERT(char(8), h.gioHenDuKien, 108), 5) AS time,
       h.trangThai AS status
FROM dbo.LichHen h
JOIN dbo.Khoa k ON k.maKhoa = h.maKhoa
JOIN dbo.BuongKham r ON r.maBuong = h.maBuong
ORDER BY h.ngayHen DESC, h.gioHenDuKien DESC, h.maHen DESC
FOR JSON PATH;
"@
    $reader = $cmd.ExecuteReader()
    $json = [System.Text.StringBuilder]::new()
    while ($reader.Read()) { $null = $json.Append($reader.GetString(0)) }
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('[]') }
} finally { $db.Dispose() }
