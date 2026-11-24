IF DB_ID(N'NextSkill_Audit_Certificates') IS NULL
    CREATE DATABASE NextSkill_Audit_Certificates;
GO
USE NextSkill_Audit_Certificates;
GO
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
        FullName nvarchar(100) NOT NULL,
        Email nvarchar(254) NOT NULL,
        NormalizedEmail nvarchar(254) NOT NULL,
        PasswordHash nvarchar(512) NOT NULL,
        CreatedAt datetime2 NOT NULL CONSTRAINT DF_Users_Created DEFAULT SYSUTCDATETIME(),
        TermsAcceptedAt datetime2 NOT NULL,
        LastLoginAt datetime2 NULL,
        FailedAttempts int NOT NULL CONSTRAINT DF_Users_Failed DEFAULT 0,
        LockoutEnd datetime2 NULL,
        CONSTRAINT UQ_Users_Email UNIQUE (NormalizedEmail)
    );
END;
IF OBJECT_ID(N'dbo.Admins', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Admins (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_Admins PRIMARY KEY,
        FullName nvarchar(100) NOT NULL,
        Email nvarchar(254) NOT NULL,
        NormalizedEmail nvarchar(254) NOT NULL,
        PasswordHash nvarchar(512) NOT NULL,
        CreatedAt datetime2 NOT NULL CONSTRAINT DF_Admins_Created DEFAULT SYSUTCDATETIME(),
        TermsAcceptedAt datetime2 NOT NULL,
        LastLoginAt datetime2 NULL,
        FailedAttempts int NOT NULL CONSTRAINT DF_Admins_Failed DEFAULT 0,
        LockoutEnd datetime2 NULL,
        CONSTRAINT UQ_Admins_Email UNIQUE (NormalizedEmail)
    );
END;
IF OBJECT_ID(N'dbo.AdminInvitations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AdminInvitations (
        CodeHash varchar(64) NOT NULL CONSTRAINT PK_AdminInvitations PRIMARY KEY,
        CreatedAt datetime2 NOT NULL CONSTRAINT DF_Invitations_Created DEFAULT SYSUTCDATETIME(),
        ExpiresAt datetime2 NOT NULL,
        RedeemedAt datetime2 NULL
    );
END;
GO

