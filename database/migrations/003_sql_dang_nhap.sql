IF OBJECT_ID(N'dbo.PhienDangNhap', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PhienDangNhap (
        maPhienDangNhap uniqueidentifier NOT NULL DEFAULT NEWID() PRIMARY KEY,
        maTaiKhoan varchar(20) NOT NULL REFERENCES dbo.TaiKhoan(maTaiKhoan),
        refreshTokenHash binary(32) NOT NULL UNIQUE,
        hetHanUtc datetime2(3) NOT NULL,
        thuHoiLucUtc datetime2(3) NULL
    );
    CREATE INDEX IX_PhienDangNhap_TaiKhoan ON dbo.PhienDangNhap(maTaiKhoan);
END;
