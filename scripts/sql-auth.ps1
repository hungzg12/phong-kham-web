$ErrorActionPreference = 'Stop'
$data = [Console]::In.ReadToEnd() | ConvertFrom-Json
$connection = $env:MEDICARE_SQL_CONNECTION
if (!$connection) {
    $connection = 'Server=.\SQLEXPRESS;Database=QuanLyBenhVien;Integrated Security=True;TrustServerCertificate=True'
}
$db = [System.Data.SqlClient.SqlConnection]::new($connection)
try {
    $db.Open()
    $cmd = $db.CreateCommand()
    $cmd.Parameters.Add('@action','VarChar',12).Value = [string]$data.action
    $cmd.Parameters.Add('@username','VarChar',100).Value = [string]$data.username
    $cmd.Parameters.Add('@passwordHash','VarChar',500).Value = [string]$data.passwordHash
    $cmd.Parameters.Add('@tokenHash','VarChar',64).Value = [string]$data.tokenHash
    $cmd.CommandText = @"
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ARITHABORT ON;
SET XACT_ABORT ON;
DECLARE @now datetime2(3)=SYSUTCDATETIME(), @token varbinary(32)=TRY_CONVERT(varbinary(32),NULLIF(@tokenHash,''),2);
IF @action='logout'
BEGIN
    UPDATE dbo.PhienDangNhap SET thuHoiLucUtc=@now WHERE refreshTokenHash=@token AND thuHoiLucUtc IS NULL;
    SELECT 'true';
    RETURN;
END;
IF @action='provision'
BEGIN
    BEGIN TRAN;
    UPDATE dbo.TaiKhoan SET matKhauHash=@passwordHash,trangThai='HOAT_DONG'
    WHERE tenDangNhap=@username AND trangThai IN('KHOA_TAM_THOI','HOAT_DONG');
    IF @@ROWCOUNT<>1 THROW 51000,'Account unavailable',1;
    UPDATE p SET thuHoiLucUtc=@now FROM dbo.PhienDangNhap p
    JOIN dbo.TaiKhoan t ON t.maTaiKhoan=p.maTaiKhoan WHERE t.tenDangNhap=@username AND p.thuHoiLucUtc IS NULL;
    COMMIT;
    SELECT 'true';
    RETURN;
END;

DECLARE @account varchar(40),@staff varchar(40),@name nvarchar(160),@role varchar(40),@hash varchar(500);
SELECT TOP (1) @account=t.maTaiKhoan,@staff=t.maNhanVien,@name=n.hoTen,@role=g.maVaiTro,@hash=t.matKhauHash
FROM dbo.TaiKhoan t
JOIN dbo.NhanVien n ON n.maNhanVien=t.maNhanVien AND n.dangLamViec=1
JOIN dbo.TaiKhoanVaiTro g ON g.maTaiKhoan=t.maTaiKhoan
JOIN dbo.VaiTro r ON r.maVaiTro=g.maVaiTro AND r.dangHoatDong=1
WHERE t.trangThai='HOAT_DONG' AND g.trangThai='HIEU_LUC' AND g.ngayHieuLuc<=SYSDATETIME() AND g.phamViPhanHe IN ('NGOAI_TRU','CA_HAI')
  AND (g.ngayHetHan IS NULL OR g.ngayHetHan>SYSDATETIME())
  AND ((g.maVaiTro='receptionist' AND g.phamViDuLieu='TOAN_VIEN') OR
       (g.maVaiTro='doctor' AND n.chuyenMon='BAC_SI' AND g.maKhoaPhamVi=n.maKhoa AND g.phamViDuLieu='THEO_KHOA'))
  AND ((@action IN('lookup','login') AND t.tenDangNhap=@username)
       OR (@action='session' AND EXISTS(SELECT 1 FROM dbo.PhienDangNhap p
           WHERE p.maTaiKhoan=t.maTaiKhoan AND p.refreshTokenHash=@token AND p.thuHoiLucUtc IS NULL AND p.hetHanUtc>@now)))
ORDER BY g.maVaiTro, g.maGanVaiTro;

IF @account IS NULL OR (@action='login' AND @hash COLLATE Latin1_General_100_BIN2<>@passwordHash)
BEGIN
    SELECT 'null';
    RETURN;
END;
IF @action='lookup'
BEGIN
    SELECT (SELECT @hash AS passwordHash FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
    RETURN;
END;
IF @action='login'
BEGIN
    BEGIN TRAN;
    UPDATE dbo.TaiKhoan SET lanDangNhapCuoi=SYSDATETIME() WHERE maTaiKhoan=@account AND trangThai='HOAT_DONG'
      AND matKhauHash COLLATE Latin1_General_100_BIN2=@passwordHash;
    IF @@ROWCOUNT<>1
    BEGIN
        ROLLBACK;
        SELECT 'null';
        RETURN;
    END;
    INSERT dbo.PhienDangNhap(maTaiKhoan,refreshTokenHash,hetHanUtc) VALUES(@account,@token,DATEADD(hour,8,@now));
    COMMIT;
END;
SELECT (SELECT @account AS id,@staff AS staff,@name AS name,@role AS role FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
"@
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::Write([string]$cmd.ExecuteScalar())
} finally {
    $db.Dispose()
}
