$ErrorActionPreference = 'Stop'
$connection = $env:MEDICARE_SQL_CONNECTION
if ([string]::IsNullOrWhiteSpace($connection)) {
    $connection = 'Server=.\SQLEXPRESS;Database=QuanLyBenhVien;Integrated Security=True;TrustServerCertificate=True'
}
$db = [System.Data.SqlClient.SqlConnection]::new($connection)
try {
    $db.Open()
    $cmd = $db.CreateCommand()
    $cmd.CommandText = @"
SELECT TOP (100) h.maHen AS id, k.tenKhoa AS department, r.tenBuong AS room,
       CONVERT(char(10), h.ngayHen, 23) AS day,
       LEFT(CONVERT(char(8), h.gioHenDuKien, 108), 5) AS time,
       h.trangThai AS status, v.maLuotKham AS visitId, v.soThuTu AS queueNumber,
       CONVERT(bit,CASE WHEN h.trangThai='DA_DAT' AND h.ngayHen=CONVERT(date,SYSDATETIME()) THEN 1 ELSE 0 END) AS canCheckIn,
       CONVERT(bit,CASE WHEN EXISTS(SELECT 1 FROM dbo.BenhNhan other WHERE other.maBenhNhan<>p.maBenhNhan
       AND other.soDienThoai=p.soDienThoai AND other.hoTen=p.hoTen AND other.ngaySinh=p.ngaySinh) THEN 1 ELSE 0 END) AS possibleDuplicate
FROM dbo.LichHen h
JOIN dbo.BenhNhan p ON p.maBenhNhan=h.maBenhNhan
JOIN dbo.Khoa k ON k.maKhoa = h.maKhoa
JOIN dbo.BuongKham r ON r.maBuong = h.maBuong
LEFT JOIN dbo.LuotKham v ON v.maHen = h.maHen
ORDER BY h.ngayHen DESC, h.gioHenDuKien DESC, h.maHen DESC
FOR JSON PATH;
"@
    $reader = $cmd.ExecuteReader()
    $json = [System.Text.StringBuilder]::new()
    while ($reader.Read()) { $null = $json.Append($reader.GetString(0)) }
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('[]') }
} finally { $db.Dispose() }
