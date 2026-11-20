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
SELECT 
    maLoHang,
    soLoNhaSanXuat,
    maHang,
    tenHang,
    loaiHang,
    hoatChat,
    hangSanXuat,
    nuocSanXuat,
    CONVERT(char(10), hanSuDung, 23) AS hanSuDung,
    soNgayConHan,
    trangThaiHanDung,
    maKho,
    tenKho,
    viTriDayKe,
    soLuongTon,
    soLuongKhaDung,
    donViCoSo,
    donGiaNhap,
    thanhTienTon,
    trangThaiKhoa
FROM dbo.vw_QuanLyLoThuoc_ChiTiet
ORDER BY hanSuDung ASC
FOR JSON PATH;
"@
    $reader = $cmd.ExecuteReader()
    $json = [System.Text.StringBuilder]::new()
    while ($reader.Read()) { $null = $json.Append($reader.GetString(0)) }
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('[]') }
} finally { $db.Dispose() }
