SET XACT_ABORT ON;
BEGIN TRAN;
IF OBJECT_ID(N'dbo.Clinic_users',N'U') IS NULL
 CREATE TABLE dbo.Clinic_users (Id nvarchar(100) NOT NULL PRIMARY KEY, Position int NOT NULL, Data nvarchar(max) NOT NULL CHECK(ISJSON(Data)=1));
IF OBJECT_ID(N'dbo.Clinic_patients',N'U') IS NULL
 CREATE TABLE dbo.Clinic_patients (Id nvarchar(100) NOT NULL PRIMARY KEY, Position int NOT NULL, Data nvarchar(max) NOT NULL CHECK(ISJSON(Data)=1));
IF OBJECT_ID(N'dbo.Clinic_doctors',N'U') IS NULL
 CREATE TABLE dbo.Clinic_doctors (Id nvarchar(100) NOT NULL PRIMARY KEY, Position int NOT NULL, Data nvarchar(max) NOT NULL CHECK(ISJSON(Data)=1));
IF OBJECT_ID(N'dbo.Clinic_specialties',N'U') IS NULL
 CREATE TABLE dbo.Clinic_specialties (Id nvarchar(100) NOT NULL PRIMARY KEY, Position int NOT NULL, Data nvarchar(max) NOT NULL CHECK(ISJSON(Data)=1));
IF OBJECT_ID(N'dbo.Clinic_shifts',N'U') IS NULL
 CREATE TABLE dbo.Clinic_shifts (Id nvarchar(100) NOT NULL PRIMARY KEY, Position int NOT NULL, Data nvarchar(max) NOT NULL CHECK(ISJSON(Data)=1));
IF OBJECT_ID(N'dbo.Clinic_appointments',N'U') IS NULL
 CREATE TABLE dbo.Clinic_appointments (Id nvarchar(100) NOT NULL PRIMARY KEY, Position int NOT NULL, Data nvarchar(max) NOT NULL CHECK(ISJSON(Data)=1));
IF OBJECT_ID(N'dbo.Clinic_visits',N'U') IS NULL
 CREATE TABLE dbo.Clinic_visits (Id nvarchar(100) NOT NULL PRIMARY KEY, Position int NOT NULL, Data nvarchar(max) NOT NULL CHECK(ISJSON(Data)=1));
IF OBJECT_ID(N'dbo.Clinic_records',N'U') IS NULL
 CREATE TABLE dbo.Clinic_records (Id nvarchar(100) NOT NULL PRIMARY KEY, Position int NOT NULL, Data nvarchar(max) NOT NULL CHECK(ISJSON(Data)=1));
IF OBJECT_ID(N'dbo.Clinic_medicines',N'U') IS NULL
 CREATE TABLE dbo.Clinic_medicines (Id nvarchar(100) NOT NULL PRIMARY KEY, Position int NOT NULL, Data nvarchar(max) NOT NULL CHECK(ISJSON(Data)=1));
IF OBJECT_ID(N'dbo.Clinic_notifications',N'U') IS NULL
 CREATE TABLE dbo.Clinic_notifications (Id nvarchar(100) NOT NULL PRIMARY KEY, Position int NOT NULL, Data nvarchar(max) NOT NULL CHECK(ISJSON(Data)=1));
COMMIT;
GO
CREATE OR ALTER PROCEDURE dbo.ClinicSave @payload nvarchar(max), @revision varchar(16)=NULL
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 BEGIN TRY
    BEGIN TRAN;
    DECLARE @actual varchar(16),@previous nvarchar(max);
    SELECT @actual=CONVERT(varchar(16),Revision,2),@previous=Payload FROM dbo.ClinicState WITH (UPDLOCK,HOLDLOCK) WHERE Id=1;
    IF @revision='MIGRATION'
    BEGIN
      IF @previous=N'{}' OR @actual IS NULL
      BEGIN
        COMMIT;
        SELECT 0;
        RETURN;
      END;
      SET @payload=@previous;
      SET @revision=@actual;
    END;
    IF (@revision IS NULL AND @actual IS NOT NULL) OR (@revision IS NOT NULL AND (@actual IS NULL OR @actual<>@revision))
    BEGIN
      COMMIT;
      SELECT 0;
      RETURN;
    END;
    IF ISJSON(@payload)<>1 THROW 51200,'Invalid clinic payload',1;
    DELETE FROM dbo.Clinic_users;
    INSERT dbo.Clinic_users(Id,Position,Data)
      SELECT JSON_VALUE(value,'$.id'),CONVERT(int,[key]),value FROM OPENJSON(@payload,'$.users');
    DELETE FROM dbo.Clinic_patients;
    INSERT dbo.Clinic_patients(Id,Position,Data)
      SELECT JSON_VALUE(value,'$.id'),CONVERT(int,[key]),value FROM OPENJSON(@payload,'$.patients');
    DELETE FROM dbo.Clinic_doctors;
    INSERT dbo.Clinic_doctors(Id,Position,Data)
      SELECT JSON_VALUE(value,'$.id'),CONVERT(int,[key]),value FROM OPENJSON(@payload,'$.doctors');
    DELETE FROM dbo.Clinic_specialties;
    INSERT dbo.Clinic_specialties(Id,Position,Data)
      SELECT JSON_VALUE(value,'$.id'),CONVERT(int,[key]),value FROM OPENJSON(@payload,'$.specialties');
    DELETE FROM dbo.Clinic_shifts;
    INSERT dbo.Clinic_shifts(Id,Position,Data)
      SELECT JSON_VALUE(value,'$.id'),CONVERT(int,[key]),value FROM OPENJSON(@payload,'$.shifts');
    DELETE FROM dbo.Clinic_appointments;
    INSERT dbo.Clinic_appointments(Id,Position,Data)
      SELECT JSON_VALUE(value,'$.id'),CONVERT(int,[key]),value FROM OPENJSON(@payload,'$.appointments');
    DELETE FROM dbo.Clinic_visits;
    INSERT dbo.Clinic_visits(Id,Position,Data)
      SELECT JSON_VALUE(value,'$.id'),CONVERT(int,[key]),value FROM OPENJSON(@payload,'$.visits');
    DELETE FROM dbo.Clinic_records;
    INSERT dbo.Clinic_records(Id,Position,Data)
      SELECT JSON_VALUE(value,'$.id'),CONVERT(int,[key]),value FROM OPENJSON(@payload,'$.records');
    DELETE FROM dbo.Clinic_medicines;
    INSERT dbo.Clinic_medicines(Id,Position,Data)
      SELECT JSON_VALUE(value,'$.id'),CONVERT(int,[key]),value FROM OPENJSON(@payload,'$.medicines');
    DELETE FROM dbo.Clinic_notifications;
    INSERT dbo.Clinic_notifications(Id,Position,Data)
      SELECT JSON_VALUE(value,'$.id'),CONVERT(int,[key]),value FROM OPENJSON(@payload,'$.notifications');
    IF @actual IS NULL INSERT dbo.ClinicState(Id,Payload) VALUES(1,N'{}');
    ELSE UPDATE dbo.ClinicState SET Payload=N'{}' WHERE Id=1;
    COMMIT;
    SELECT 1;
 END TRY
 BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK;
    THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.ClinicRead
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 BEGIN TRY
    BEGIN TRAN;
    DECLARE @revision varchar(16),@payload nvarchar(max);
    SELECT @revision=CONVERT(varchar(16),Revision,2) FROM dbo.ClinicState WITH (HOLDLOCK) WHERE Id=1;
    IF @revision IS NOT NULL
    BEGIN
      SET @payload=(SELECT
    JSON_QUERY(COALESCE((SELECT '['+STRING_AGG(CONVERT(nvarchar(max),Data),',') WITHIN GROUP (ORDER BY Position)+']' FROM dbo.Clinic_users),'[]')) AS [users],
    JSON_QUERY(COALESCE((SELECT '['+STRING_AGG(CONVERT(nvarchar(max),Data),',') WITHIN GROUP (ORDER BY Position)+']' FROM dbo.Clinic_patients),'[]')) AS [patients],
    JSON_QUERY(COALESCE((SELECT '['+STRING_AGG(CONVERT(nvarchar(max),Data),',') WITHIN GROUP (ORDER BY Position)+']' FROM dbo.Clinic_doctors),'[]')) AS [doctors],
    JSON_QUERY(COALESCE((SELECT '['+STRING_AGG(CONVERT(nvarchar(max),Data),',') WITHIN GROUP (ORDER BY Position)+']' FROM dbo.Clinic_specialties),'[]')) AS [specialties],
    JSON_QUERY(COALESCE((SELECT '['+STRING_AGG(CONVERT(nvarchar(max),Data),',') WITHIN GROUP (ORDER BY Position)+']' FROM dbo.Clinic_shifts),'[]')) AS [shifts],
    JSON_QUERY(COALESCE((SELECT '['+STRING_AGG(CONVERT(nvarchar(max),Data),',') WITHIN GROUP (ORDER BY Position)+']' FROM dbo.Clinic_appointments),'[]')) AS [appointments],
    JSON_QUERY(COALESCE((SELECT '['+STRING_AGG(CONVERT(nvarchar(max),Data),',') WITHIN GROUP (ORDER BY Position)+']' FROM dbo.Clinic_visits),'[]')) AS [visits],
    JSON_QUERY(COALESCE((SELECT '['+STRING_AGG(CONVERT(nvarchar(max),Data),',') WITHIN GROUP (ORDER BY Position)+']' FROM dbo.Clinic_records),'[]')) AS [records],
    JSON_QUERY(COALESCE((SELECT '['+STRING_AGG(CONVERT(nvarchar(max),Data),',') WITHIN GROUP (ORDER BY Position)+']' FROM dbo.Clinic_medicines),'[]')) AS [medicines],
    JSON_QUERY(COALESCE((SELECT '['+STRING_AGG(CONVERT(nvarchar(max),Data),',') WITHIN GROUP (ORDER BY Position)+']' FROM dbo.Clinic_notifications),'[]')) AS [notifications]
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
      SELECT @payload AS Payload,@revision AS Revision FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
    END;
    COMMIT;
 END TRY
 BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK;
    THROW;
 END CATCH;
END;
GO
EXEC dbo.ClinicSave @payload=NULL,@revision='MIGRATION';
GO
