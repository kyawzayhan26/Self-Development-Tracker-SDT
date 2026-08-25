USE SDT;
GO

/*
    SDT Challenge System Migration

    Adds:
    - Challenges table
    - challengeId relationship on Tasks

    Existing Tasks / DayStatus records are preserved.
*/

---------------------------------------------------------
-- 1. Create Challenges table
---------------------------------------------------------

IF OBJECT_ID(N'dbo.Challenges', N'U') IS NULL
BEGIN

    CREATE TABLE dbo.Challenges
    (
        challengeId INT IDENTITY(1,1) PRIMARY KEY,

        name NVARCHAR(150) NOT NULL,

        startDate DATE NOT NULL,

        durationDays INT NOT NULL,

        strikesAllowed INT NOT NULL
            CONSTRAINT DF_Challenges_StrikesAllowed
            DEFAULT(3),

        status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Challenges_Status
            DEFAULT(N'ACTIVE'),

        createdAt DATETIME2 NOT NULL
            CONSTRAINT DF_Challenges_CreatedAt
            DEFAULT(SYSDATETIME()),

        CONSTRAINT CK_Challenges_Duration
            CHECK (durationDays BETWEEN 1 AND 365),

        CONSTRAINT CK_Challenges_Strikes
            CHECK (strikesAllowed BETWEEN 0 AND 99),

        CONSTRAINT CK_Challenges_Status
            CHECK (status IN (N'ACTIVE', N'COMPLETED'))
    );

END
GO


---------------------------------------------------------
-- 2. Add challengeId to Tasks
---------------------------------------------------------

IF COL_LENGTH('dbo.Tasks', 'challengeId') IS NULL
BEGIN

    ALTER TABLE dbo.Tasks
    ADD challengeId INT NULL;

END
GO


---------------------------------------------------------
-- 3. Add Challenge foreign key
---------------------------------------------------------

IF NOT EXISTS
(
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_Tasks_Challenges'
)
BEGIN

    ALTER TABLE dbo.Tasks
    ADD CONSTRAINT FK_Tasks_Challenges
        FOREIGN KEY (challengeId)
        REFERENCES dbo.Challenges(challengeId);

END
GO


---------------------------------------------------------
-- 4. Index for faster challenge task lookup
---------------------------------------------------------

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Tasks_ChallengeId'
      AND object_id = OBJECT_ID('dbo.Tasks')
)
BEGIN

    CREATE INDEX IX_Tasks_ChallengeId
    ON dbo.Tasks(challengeId);

END
GO


PRINT 'SDT challenge migration completed successfully.';
GO