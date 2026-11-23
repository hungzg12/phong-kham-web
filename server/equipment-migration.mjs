// Additive persistence for the existing equipment and incident screens.
// No sample rows or invented staff assignments are migrated.
export const equipmentMigration=`
SET XACT_ABORT ON; BEGIN TRAN;
DECLARE @lock int; EXEC @lock=sys.sp_getapplock @Resource='MediCareEquipmentMigration',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
IF @lock<0 THROW 51000,'Equipment migration busy',1;
IF OBJECT_ID('dbo.MediCareEquipment','U') IS NULL
CREATE TABLE dbo.MediCareEquipment(
 id varchar(20) PRIMARY KEY, name nvarchar(150) NOT NULL,
 serial nvarchar(100) NOT NULL UNIQUE, department nvarchar(100) NOT NULL,
 nextService date NOT NULL, status nvarchar(40) NOT NULL,
 revision int NOT NULL DEFAULT 1,
 createdAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),updatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
IF OBJECT_ID('dbo.MediCareEquipmentIncident','U') IS NULL
CREATE TABLE dbo.MediCareEquipmentIncident(
 id varchar(20) PRIMARY KEY, device varchar(20) NOT NULL REFERENCES dbo.MediCareEquipment(id),
 reporter varchar(20) NOT NULL REFERENCES dbo.NhanVien(maNhanVien),severity nvarchar(50) NOT NULL,
 reason nvarchar(2000) NOT NULL,status nvarchar(40) NOT NULL,
 maintenance nvarchar(2000) NULL,engineer nvarchar(100) NULL,
 revision int NOT NULL DEFAULT 1,
 createdAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),acceptedAt datetime2 NULL,updatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
IF OBJECT_ID('dbo.MediCareEquipmentRequest','U') IS NULL
CREATE TABLE dbo.MediCareEquipmentRequest(
 requestId uniqueidentifier PRIMARY KEY,actor nvarchar(100) NOT NULL,
 fingerprint varchar(64) NOT NULL,result nvarchar(max) NOT NULL CHECK(ISJSON(result)=1));
COMMIT;SELECT 'ok';`;
