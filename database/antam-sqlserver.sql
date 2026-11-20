USE master;
GO
IF DB_ID(N'AnTamClinic') IS NULL EXEC(N'CREATE DATABASE [AnTamClinic]');
GO
USE AnTamClinic;
GO
IF DB_NAME() <> N'AnTamClinic' THROW 51000, 'Wrong database.', 1;
IF OBJECT_ID(N'dbo.ClinicState',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClinicState (
        Id tinyint NOT NULL PRIMARY KEY CHECK (Id=1),
        Payload nvarchar(max) NOT NULL CHECK (ISJSON(Payload)=1),
        Revision rowversion NOT NULL
    );
END;
GO
