-- Additive learning schema. Run against the existing NextSkill account database.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
SET XACT_ABORT ON;
DECLARE @schemaLock int;
EXEC @schemaLock = sys.sp_getapplock @Resource=N'NextSkill.LearningSchema.v1',
    @LockMode=N'Exclusive', @LockOwner=N'Transaction', @LockTimeout=10000;
IF @schemaLock < 0 THROW 51000, 'Cannot obtain learning schema lock.', 1;
IF OBJECT_ID(N'dbo.LearningProfiles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LearningProfiles (
        AccountId uniqueidentifier NOT NULL,
        AccountRole varchar(10) NOT NULL,
        ActiveCourseId int NULL,
        HasCompletedOnboarding bit NOT NULL CONSTRAINT DF_LearningProfiles_Onboard DEFAULT (0),
        Xp int NOT NULL CONSTRAINT DF_LearningProfiles_Xp DEFAULT (0),
        UpdatedAt datetime2 NOT NULL CONSTRAINT DF_LearningProfiles_Updated DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_LearningProfiles PRIMARY KEY (AccountId, AccountRole),
        CONSTRAINT CK_LearningProfiles_Role CHECK (AccountRole IN ('User','Admin')),
        CONSTRAINT CK_LearningProfiles_Xp CHECK (Xp >= 0)
    );
END;
IF OBJECT_ID(N'dbo.LearningCourseProgress', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LearningCourseProgress (
        AccountId uniqueidentifier NOT NULL,
        AccountRole varchar(10) NOT NULL,
        CourseId int NOT NULL,
        LastLessonId int NULL,
        StartedAt datetime2 NOT NULL CONSTRAINT DF_LearningCourse_Started DEFAULT SYSUTCDATETIME(),
        UpdatedAt datetime2 NOT NULL CONSTRAINT DF_LearningCourse_Updated DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_LearningCourseProgress PRIMARY KEY (AccountId,AccountRole,CourseId),
        CONSTRAINT FK_LearningCourse_Profile FOREIGN KEY (AccountId,AccountRole)
            REFERENCES dbo.LearningProfiles(AccountId,AccountRole)
    );
END;
IF OBJECT_ID(N'dbo.LearningLessonCompletions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LearningLessonCompletions (
        AccountId uniqueidentifier NOT NULL,
        AccountRole varchar(10) NOT NULL,
        CourseId int NOT NULL,
        LessonId int NOT NULL,
        AwardedXp int NOT NULL,
        CompletedAt datetime2 NOT NULL CONSTRAINT DF_LearningCompletion_At DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_LearningLessonCompletions PRIMARY KEY (AccountId,AccountRole,CourseId,LessonId),
        CONSTRAINT CK_LearningCompletion_Xp CHECK (AwardedXp >= 0),
        CONSTRAINT FK_LearningCompletion_Course FOREIGN KEY (AccountId,AccountRole,CourseId)
            REFERENCES dbo.LearningCourseProgress(AccountId,AccountRole,CourseId)
    );
END;
IF OBJECT_ID(N'dbo.LearningAchievements', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LearningAchievements (
        AccountId uniqueidentifier NOT NULL,
        AccountRole varchar(10) NOT NULL,
        AchievementKey varchar(80) NOT NULL,
        EarnedAt datetime2 NOT NULL CONSTRAINT DF_LearningAchievement_At DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_LearningAchievements PRIMARY KEY (AccountId,AccountRole,AchievementKey),
        CONSTRAINT FK_LearningAchievement_Profile FOREIGN KEY (AccountId,AccountRole)
            REFERENCES dbo.LearningProfiles(AccountId,AccountRole)
    );
END;
COMMIT TRANSACTION;
