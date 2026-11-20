SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE dbo.MediCareTiepDon
    @maHen varchar(20),
    @lyDo nvarchar(255)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET ARITHABORT ON;
    SET NUMERIC_ROUNDABORT OFF;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @room varchar(20), @patient varchar(20), @status varchar(30),
                @visit varchar(20), @number int, @lock int, @appointmentDay date;
        DECLARE @now datetime2(0) = SYSDATETIME();
        DECLARE @day date = CONVERT(date, @now);

        SELECT @room=maBuong, @patient=maBenhNhan, @status=trangThai, @appointmentDay=ngayHen
        FROM dbo.LichHen WITH (UPDLOCK,HOLDLOCK) WHERE maHen=@maHen;

        SELECT @visit=maLuotKham,@number=soThuTu FROM dbo.LuotKham WHERE maHen=@maHen;
        IF @status='DA_CHECK_IN' AND @visit IS NOT NULL
        BEGIN
            COMMIT;
            SELECT @visit AS visitId,@number AS queueNumber;
            RETURN;
        END;
        IF @status IS NULL OR @status<>'DA_DAT'
            THROW 51101, 'Appointment is not eligible for check-in.', 1;
        IF @appointmentDay<>@day THROW 51101, 'Appointment is not scheduled today.', 1;
        IF NOT EXISTS (SELECT 1 FROM dbo.BuongKham WHERE maBuong=@room AND dangHoatDong=1)
            THROW 51101, 'Exam room is unavailable.', 1;

        DECLARE @resource nvarchar(255)=CONCAT('MediCareQueue:',@room,':',@day);
        EXEC @lock=sys.sp_getapplock @Resource=@resource,@LockMode='Exclusive',@LockTimeout=5000;
        IF @lock<0 THROW 51102, 'Queue is temporarily unavailable.', 1;

        SELECT @number=ISNULL(MAX(soThuTu),0)+1 FROM dbo.LuotKham WHERE maBuong=@room AND ngayKham=@day;
        UPDATE dbo.BoDemSoThuTuKham SET soThuTuHienTai=@number WHERE maBuong=@room AND ngayCapSo=@day;
        IF @@ROWCOUNT=0
            INSERT dbo.BoDemSoThuTuKham (maBuong,ngayCapSo,soThuTuHienTai) VALUES (@room,@day,@number);

        SET @visit='LK-'+LEFT(REPLACE(CONVERT(varchar(36),NEWID()),'-',''),16);
        INSERT dbo.LuotKham (maLuotKham,maBenhNhan,maBuong,maHen,soThuTu,lyDoKham,thoiDiemDangKy,thoiDiemCapSo)
        VALUES (@visit,@patient,@room,@maHen,@number,@lyDo,@now,@now);
        UPDATE dbo.LichHen SET trangThai='DA_CHECK_IN' WHERE maHen=@maHen;
        INSERT dbo.NhatKyThayDoi (loaiDoiTuong,maDoiTuong,hanhDong,loaiTacNhan,maDichVuNguon,maTuongQuan,ketQua)
        VALUES ('LUOT_KHAM',@visit,'TIEP_DON','DICH_VU','MEDICARE_DEV',@maHen,'THANH_CONG');
        COMMIT;
        SELECT @visit AS visitId,@number AS queueNumber;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK;
        THROW;
    END CATCH;
END;
