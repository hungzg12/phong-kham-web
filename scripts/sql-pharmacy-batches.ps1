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
    $cmd = $db.CreateCommand()
    $cmd.CommandText = @"
SELECT 
    lh.maLoHang,
    lh.soLoNhaSanXuat,
    h.maHang,
    h.tenHang,
    h.loaiHang,
    ISNULL(t.hoatChat, h.tenHang) AS hoatChat,
    ISNULL(lh.hangSanXuat, N'Việt Nam') AS hangSanXuat,
    ISNULL(lh.nuocSanXuat, N'Việt Nam') AS nuocSanXuat,
    CONVERT(char(10), lh.hanSuDung, 23) AS hanSuDung,
    DATEDIFF(day, CAST(GETDATE() AS date), lh.hanSuDung) AS soNgayConHan,
    CASE 
        WHEN DATEDIFF(day, CAST(GETDATE() AS date), lh.hanSuDung) < 0 THEN N'ĐÃ HẾT HẠN'
        WHEN DATEDIFF(day, CAST(GETDATE() AS date), lh.hanSuDung) <= 30 THEN N'CẬN DATE (<= 30 NGÀY)'
        WHEN DATEDIFF(day, CAST(GETDATE() AS date), lh.hanSuDung) <= 90 THEN N'CẬN DATE (<= 90 NGÀY)'
        ELSE N'CÒN HẠN SỬ DỤNG'
    END AS trangThaiHanDung,
    k.maKho,
    k.tenKho,
    ISNULL(ltk.viTriDayKe, N'Kệ nhập') AS viTriDayKe,
    ltk.soLuongTon,
    ltk.soLuongKhaDung,
    h.donViCoSo,
    lh.donGiaNhap,
    (ltk.soLuongTon * lh.donGiaNhap) AS thanhTienTon,
    ltk.trangThaiKhoa
FROM dbo.LoTonKho ltk
INNER JOIN dbo.LoHang lh ON lh.maLoHang = ltk.maLoHang
INNER JOIN dbo.HangHoaYTe h ON h.maHang = lh.maHang
INNER JOIN dbo.KhoDuoc k ON k.maKho = ltk.maKho
LEFT JOIN dbo.Thuoc t ON t.maHang = h.maHang
ORDER BY lh.hanSuDung ASC
FOR JSON PATH;
"@
    $reader = $cmd.ExecuteReader()
    $json = [System.Text.StringBuilder]::new()
    while ($reader.Read()) { $null = $json.Append($reader.GetString(0)) }
    if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('[]') }
} finally {
    $db.Dispose()
}
