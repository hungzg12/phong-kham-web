param()
$ErrorActionPreference = 'Stop'
$data = [Console]::In.ReadToEnd() | ConvertFrom-Json
$db = [System.Data.SqlClient.SqlConnection]::new('Server=.\SQLEXPRESS;Database=QuanLyBenhVien;Integrated Security=True;TrustServerCertificate=True')
try {
    $db.Open()
    $cmd = $db.CreateCommand()
    $cmd.CommandText = @"
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @lockResult int;
EXEC @lockResult = sp_getapplock @Resource=N'MediCareBooking', @LockMode='Exclusive', @LockTimeout=5000;
IF @lockResult < 0 THROW 50005, 'Booking lock unavailable', 1;
IF EXISTS (SELECT 1 FROM dbo.LichHen h JOIN dbo.BenhNhan b ON b.maBenhNhan=h.maBenhNhan
    WHERE b.soDienThoai=@phone AND h.ngayHen=@day AND h.gioHenDuKien=@time AND h.trangThai<>'DA_HUY')
BEGIN
    ROLLBACK;
    SELECT 'duplicate';
    RETURN;
END;
DECLARE @room varchar(20);
SELECT TOP (1) @room=maBuong FROM dbo.BuongKham WHERE maKhoa=@deptCode AND dangHoatDong=1 ORDER BY maBuong;
IF @room IS NULL THROW 50006, 'No active booking room', 1;
INSERT dbo.BenhNhan (maBenhNhan,hoTen,ngaySinh,gioiTinh,soDienThoai)
VALUES (@id,@name,@birth,@gender,@phone);
INSERT dbo.LichHen (maHen,maBenhNhan,maKhoa,maBuong,ngayHen,gioHenDuKien,maQRCheckIn)
VALUES (@id,@id,@deptCode,@room,@day,@time,@id);
COMMIT;
SELECT @id;
"@
    foreach ($key in @('id','name','birth','gender','phone','deptCode','day','time')) {
        $null = $cmd.Parameters.AddWithValue('@'+$key, [string]$data.$key)
    }
    [Console]::Out.Write($cmd.ExecuteScalar())
} finally { $db.Dispose() }
