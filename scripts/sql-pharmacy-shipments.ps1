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
    d.maDotNhap,
    d.tenDotNhap,
    ISNULL(d.hangSanXuat, N'Nhiều hãng') AS hangSanXuat,
    ISNULL(d.nhaCungCap, N'Nhà phân phối dược') AS nhaCungCap,
    ISNULL(d.soHoaDon, N'HD-CHUA-LUU') AS soHoaDon,
    CONVERT(char(10), d.ngayNhapKho, 23) AS ngayNhapKho,
    k.maKho AS maKhoNhap,
    k.tenKho AS khoNhap,
    d.nguoiGiaoHang,
    d.nguoiNhanHang,
    d.ghiChu,
    COUNT(DISTINCT lh.maHang) AS soLoaiThuoc,
    ISNULL(SUM(lh.soLuongNhap), 0) AS tongSoLuongNhap,
    ISNULL(SUM(lh.soLuongNhap * lh.donGiaNhap), 0) AS tongGiaTriNhap,
    (
        SELECT 
            lh2.maLoHang,
            lh2.soLoNhaSanXuat,
            h.maHang,
            h.tenHang,
            h.donViCoSo,
            h.loaiHang,
            ISNULL(t.hoatChat, h.tenHang) AS hoatChat,
            CONVERT(char(10), lh2.hanSuDung, 23) AS hanSuDung,
            DATEDIFF(day, CAST(GETDATE() AS date), lh2.hanSuDung) AS soNgayConHan,
            lh2.soLuongNhap,
            lh2.donGiaNhap,
            (lh2.soLuongNhap * lh2.donGiaNhap) AS thanhTien,
            ISNULL(SUM(ltk.soLuongTon), 0) AS tonHienTai,
            ISNULL(SUM(ltk.soLuongKhaDung), 0) AS tonKhaDung
        FROM dbo.LoHang lh2
        INNER JOIN dbo.HangHoaYTe h ON h.maHang = lh2.maHang
        LEFT JOIN dbo.Thuoc t ON t.maHang = h.maHang
        LEFT JOIN dbo.LoTonKho ltk ON ltk.maLoHang = lh2.maLoHang
        WHERE lh2.maDotNhap = d.maDotNhap
        GROUP BY lh2.maLoHang, lh2.soLoNhaSanXuat, h.maHang, h.tenHang, h.donViCoSo, h.loaiHang, t.hoatChat, lh2.hanSuDung, lh2.soLuongNhap, lh2.donGiaNhap
        FOR JSON PATH
    ) AS danhSachThuoc
FROM dbo.DotNhapHang d
INNER JOIN dbo.KhoDuoc k ON k.maKho = d.maKhoNhap
LEFT JOIN dbo.LoHang lh ON lh.maDotNhap = d.maDotNhap
GROUP BY d.maDotNhap, d.tenDotNhap, d.hangSanXuat, d.nhaCungCap, d.soHoaDon, d.ngayNhapKho, k.maKho, k.tenKho, d.nguoiGiaoHang, d.nguoiNhanHang, d.ghiChu
ORDER BY d.ngayNhapKho DESC
FOR JSON PATH;
"@
    $reader = $cmd.ExecuteReader()
    $json = [System.Text.StringBuilder]::new()
    while ($reader.Read()) { $null = $json.Append($reader.GetString(0)) }
    if ($json.Length) { [Console]::Write($json.ToString()) } else { [Console]::Write('[]') }
} finally {
    $db.Dispose()
}
