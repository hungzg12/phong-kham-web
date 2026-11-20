SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE dbo.MediCareKhamNgoaiTru
    @staff varchar(20), @action varchar(10), @visit varchar(20)=NULL,
    @history nvarchar(2000)=NULL, @conclusion nvarchar(500)=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET ARITHABORT ON;
    DECLARE @department varchar(20);
    SELECT @department=maKhoa FROM dbo.NhanVien
    WHERE maNhanVien=@staff AND chuyenMon='BAC_SI' AND dangLamViec=1;
    IF @department IS NULL THROW 51110, 'Doctor unavailable.', 1;

    IF @action='list'
    BEGIN
        SELECT TOP (100) v.maLuotKham AS id,v.soThuTu AS number,r.tenBuong AS room,
               b.maBenhNhan AS patientId,b.hoTen AS patientName,v.lyDoKham AS reason,
               v.trangThai AS status,h.chanDoanXacDinh AS conclusion
        FROM dbo.LuotKham v JOIN dbo.BuongKham r ON r.maBuong=v.maBuong
        JOIN dbo.BenhNhan b ON b.maBenhNhan=v.maBenhNhan
        LEFT JOIN dbo.HoSoKham h ON h.maLuotKham=v.maLuotKham
        WHERE r.maKhoa=@department AND (h.maBacSi IS NULL OR h.maBacSi=@staff)
          AND v.ngayKham=CONVERT(date,SYSDATETIME())
        ORDER BY r.maBuong,v.soThuTu FOR JSON PATH;
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRAN;
        DECLARE @status varchar(30),@owner varchar(20);
        SELECT @status=v.trangThai FROM dbo.LuotKham v WITH (UPDLOCK,HOLDLOCK)
        JOIN dbo.BuongKham r ON r.maBuong=v.maBuong
        WHERE v.maLuotKham=@visit AND r.maKhoa=@department AND v.ngayKham=CONVERT(date,SYSDATETIME());
        IF @status IS NULL THROW 51110, 'Visit unavailable.', 1;
        SELECT @owner=maBacSi FROM dbo.HoSoKham WHERE maLuotKham=@visit;
        IF @owner IS NOT NULL AND @owner<>@staff THROW 51110, 'Visit assigned to another doctor.', 1;

        IF @action='start' AND @status='CHO_KHAM' AND @owner IS NULL
        BEGIN
            INSERT dbo.HoSoKham (maHoSoKham,maLuotKham,maBacSi)
            VALUES ('HS-'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),16),@visit,@staff);
            UPDATE dbo.LuotKham SET trangThai='DANG_KHAM' WHERE maLuotKham=@visit;
        END
        ELSE IF @action='finish' AND @status='DANG_KHAM' AND @owner=@staff
             AND NULLIF(LTRIM(RTRIM(@conclusion)),'') IS NOT NULL
        BEGIN
            IF EXISTS (SELECT 1 FROM dbo.ChiDinhCLS WHERE maLuotKham=@visit)
                THROW 51110, 'Visit has ancillary orders.', 1;
            DECLARE @now datetime2(0)=SYSDATETIME();
            UPDATE dbo.HoSoKham SET benhSu=@history,chanDoanXacDinh=@conclusion,
                trangThai='HOAN_TAT',thoiDiemHoanTat=@now WHERE maLuotKham=@visit;
            UPDATE dbo.LuotKham SET trangThai='HOAN_TAT_KHAM',thoiDiemKetThuc=@now WHERE maLuotKham=@visit;
        END
        ELSE THROW 51110, 'Invalid visit transition.', 1;

        INSERT dbo.NhatKyThayDoi (loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,maNguoiThucHien,ketQua)
        VALUES ('LUOT_KHAM',@visit,CASE WHEN @action='start' THEN 'BAT_DAU_KHAM' ELSE 'KET_THUC_KHAM' END,
                'NHAN_VIEN',@staff,'THANH_CONG');
        COMMIT;
        SELECT @visit AS id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK;
        THROW;
    END CATCH;
END;
