// Additive migration. Source triggers and outbox rows participate in the same
// business transaction; rollback also rolls back the notification event.
const sources=[
 ['LuotKham','maLuotKham',['maBuong']],
 ['DotDieuTri','maDotDieuTri',['maBacSiDieuTriChinh']],
 ['ChiTietChiDinh','maChiTiet',['trangThai']],
 ['KetQuaCLS','maKetQua',['trangThai']],
 ['YLenh','maYLenh',['trangThai']],
 ['DonThuoc','maDon',['thoiDiemDuyet','trangThaiCapPhat']],
 ['GiaoDichThanhToan','maGiaoDich',['trangThai']],
 ['LichHen','maHen',['ngayHen','gioHenDuKien','trangThai','maBuong']],
 ['LoTonKho','maLoTon',['soLuongKhaDung','trangThaiKhoa']],
];
export const notificationMigration=`
SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRAN;
DECLARE @lock int; EXEC @lock=sys.sp_getapplock @Resource='MediCareNotificationsMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
IF @lock<0 THROW 51000,'Notification migration busy',1;
IF OBJECT_ID('dbo.MediCareNotificationOutbox','U') IS NULL
CREATE TABLE dbo.MediCareNotificationOutbox(
 id uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(), source varchar(40) NOT NULL,target varchar(100) NOT NULL,
 payload nvarchar(max) NOT NULL CHECK(ISJSON(payload)=1), createdAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
 state varchar(20) NOT NULL DEFAULT 'PENDING', attempts int NOT NULL DEFAULT 0,nextAttempt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(), reason nvarchar(500) NULL);
IF COL_LENGTH('dbo.MediCareNotificationOutbox','eventKey') IS NULL
ALTER TABLE dbo.MediCareNotificationOutbox ADD eventKey varchar(200) NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.MediCareNotificationOutbox') AND name='UX_NotificationEventKey')
EXEC('CREATE UNIQUE INDEX UX_NotificationEventKey ON dbo.MediCareNotificationOutbox(eventKey) WHERE eventKey IS NOT NULL');
IF OBJECT_ID('dbo.MediCareNotification','U') IS NULL
CREATE TABLE dbo.MediCareNotification(
 id uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(), eventId uniqueidentifier NOT NULL REFERENCES dbo.MediCareNotificationOutbox(id),
 recipient nvarchar(100) NOT NULL, kind varchar(40) NOT NULL,title nvarchar(120) NOT NULL,content nvarchar(1000) NOT NULL,
 severity varchar(12) NOT NULL CHECK(severity IN('normal','important','urgent')),createdAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
 readAt datetime2 NULL, page varchar(40) NULL,tab varchar(40) NULL,episodeId varchar(20) NULL,recordId varchar(100) NULL,
 CONSTRAINT UQ_MediCareNotification_Recipient UNIQUE(eventId,recipient));
IF OBJECT_ID('dbo.MediCareReminder','U') IS NULL
CREATE TABLE dbo.MediCareReminder(id uniqueidentifier NOT NULL PRIMARY KEY,owner nvarchar(100) NOT NULL,
 title nvarchar(120) NOT NULL,content nvarchar(1000) NOT NULL,dueAt datetimeoffset NOT NULL,
 severity varchar(12) NOT NULL CHECK(severity IN('normal','important','urgent')),eventId uniqueidentifier NULL,
 cancelled bit NOT NULL DEFAULT 0,createdAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
${sources.map(([table,key,fields])=>`EXEC(N'CREATE OR ALTER TRIGGER dbo.MediCareNotify_${table} ON dbo.${table} AFTER INSERT,UPDATE AS BEGIN SET NOCOUNT ON;
INSERT dbo.MediCareNotificationOutbox(source,target,payload)
SELECT ''${table}'',i.${key},(SELECT i.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER) FROM inserted i LEFT JOIN deleted d ON d.${key}=i.${key}
WHERE d.${key} IS NULL OR ${fields.map(f=>`ISNULL(CONVERT(nvarchar(100),i.${f}),N'''')<>ISNULL(CONVERT(nvarchar(100),d.${f}),N'''')`).join(' OR ')}; END;');`).join('\n')}
IF OBJECT_ID('dbo.MediCareNotificationAuditTrigger','TR') IS NULL
EXEC(N'CREATE TRIGGER dbo.MediCareNotificationAuditTrigger ON dbo.MediCareAdminAudit AFTER INSERT AS BEGIN SET NOCOUNT ON;
INSERT dbo.MediCareNotificationOutbox(source,target,payload) SELECT ''Equipment'',target,(SELECT i.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER) FROM inserted i WHERE entity IN(''equipment'',''maintenance''); END;');
COMMIT; SELECT 'ok';`;
