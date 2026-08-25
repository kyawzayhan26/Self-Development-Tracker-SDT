/*
    ============================================================
    SDT - SELF DEVELOPMENT TRACKER
    COMPLETE DATABASE SETUP / RESET
    ============================================================

    WARNING:
    Running this script will DELETE the entire SDT database.

    This includes:
    - All challenges
    - All tasks / rules
    - All daily progress
    - All strike history
    - All test data

    Stop the SDT Node.js server before running this script.
    ============================================================
*/


USE master;
GO


/* ============================================================
   1. DELETE EXISTING DATABASE
   ============================================================ */

IF DB_ID(N'SDT') IS NOT NULL
BEGIN

    PRINT 'Existing SDT database found.';
    PRINT 'Closing active connections...';

    ALTER DATABASE SDT
    SET SINGLE_USER
    WITH ROLLBACK IMMEDIATE;

    PRINT 'Deleting existing SDT database...';

    DROP DATABASE SDT;

    PRINT 'Existing SDT database deleted.';

END
ELSE
BEGIN

    PRINT 'No existing SDT database found.';

END
GO



/* ============================================================
   2. CREATE DATABASE
   ============================================================ */

PRINT 'Creating fresh SDT database...';
GO

CREATE DATABASE SDT;
GO

USE SDT;
GO



/* ============================================================
   3. CHALLENGES
   ============================================================ */

PRINT 'Creating Challenges table...';
GO


CREATE TABLE dbo.Challenges
(
    challengeId INT IDENTITY(1,1)
        NOT NULL
        CONSTRAINT PK_Challenges
        PRIMARY KEY,

    name NVARCHAR(150)
        NOT NULL,

    startDate DATE
        NOT NULL,

    durationDays INT
        NOT NULL,

    strikesAllowed INT
        NOT NULL
        CONSTRAINT DF_Challenges_StrikesAllowed
        DEFAULT(3),

    status NVARCHAR(20)
        NOT NULL
        CONSTRAINT DF_Challenges_Status
        DEFAULT(N'ACTIVE'),

    /*
        Filled when a challenge finishes.

        This allows final reports to know the
        real end point of a manually-ended
        challenge.
    */
    completedAt DATETIME2
        NULL,

    /*
        NULL while active.

        MANUAL =
            End Challenge button used.

        NATURAL =
            Challenge reached its planned end.
    */
    completionReason NVARCHAR(20)
        NULL,

    createdAt DATETIME2
        NOT NULL
        CONSTRAINT DF_Challenges_CreatedAt
        DEFAULT(SYSDATETIME()),


    CONSTRAINT CK_Challenges_Duration
        CHECK
        (
            durationDays BETWEEN 1 AND 365
        ),


    CONSTRAINT CK_Challenges_Strikes
        CHECK
        (
            strikesAllowed BETWEEN 0 AND 99
        ),


    CONSTRAINT CK_Challenges_Status
        CHECK
        (
            status IN
            (
                N'ACTIVE',
                N'COMPLETED'
            )
        ),


    CONSTRAINT CK_Challenges_CompletionReason
        CHECK
        (
            completionReason IS NULL
            OR
            completionReason IN
            (
                N'MANUAL',
                N'NATURAL'
            )
        )
);
GO



/* ============================================================
   4. TASKS
   ============================================================ */

PRINT 'Creating Tasks table...';
GO


CREATE TABLE dbo.Tasks
(
    taskId INT IDENTITY(1,1)
        NOT NULL
        CONSTRAINT PK_Tasks
        PRIMARY KEY,

    challengeId INT
        NOT NULL,

    name NVARCHAR(200)
        NOT NULL,

    isActive BIT
        NOT NULL
        CONSTRAINT DF_Tasks_IsActive
        DEFAULT(1),

    sortOrder INT
        NOT NULL
        CONSTRAINT DF_Tasks_SortOrder
        DEFAULT(0),

    createdAt DATETIME2
        NOT NULL
        CONSTRAINT DF_Tasks_CreatedAt
        DEFAULT(SYSDATETIME()),


    CONSTRAINT FK_Tasks_Challenges
        FOREIGN KEY
        (
            challengeId
        )
        REFERENCES dbo.Challenges
        (
            challengeId
        )
);
GO



/* ============================================================
   5. DAY STATUS
   ============================================================ */

PRINT 'Creating DayStatus table...';
GO


CREATE TABLE dbo.DayStatus
(
    dateKey DATE
        NOT NULL,

    taskId INT
        NOT NULL,

    isDone BIT
        NOT NULL
        CONSTRAINT DF_DayStatus_IsDone
        DEFAULT(0),

    updatedAt DATETIME2
        NOT NULL
        CONSTRAINT DF_DayStatus_UpdatedAt
        DEFAULT(SYSDATETIME()),


    CONSTRAINT PK_DayStatus
        PRIMARY KEY
        (
            dateKey,
            taskId
        ),


    CONSTRAINT FK_DayStatus_Tasks
        FOREIGN KEY
        (
            taskId
        )
        REFERENCES dbo.Tasks
        (
            taskId
        )
);
GO



/* ============================================================
   6. INDEXES
   ============================================================ */

PRINT 'Creating indexes...';
GO


CREATE INDEX IX_Tasks_ChallengeId
ON dbo.Tasks
(
    challengeId
);
GO


CREATE INDEX IX_Tasks_Challenge_SortOrder
ON dbo.Tasks
(
    challengeId,
    sortOrder
);
GO


CREATE INDEX IX_DayStatus_TaskId
ON dbo.DayStatus
(
    taskId
);
GO


CREATE INDEX IX_Challenges_Status
ON dbo.Challenges
(
    status
);
GO


CREATE INDEX IX_Challenges_CompletedAt
ON dbo.Challenges
(
    completedAt
);
GO



/* ============================================================
   7. VERIFICATION
   ============================================================ */

PRINT '';
PRINT '============================================================';
PRINT 'SDT DATABASE RESET COMPLETE';
PRINT '============================================================';
PRINT '';

PRINT 'Database: SDT';
PRINT 'Tables created:';
PRINT '  - Challenges';
PRINT '  - Tasks';
PRINT '  - DayStatus';
PRINT '';

PRINT 'No challenge has been created.';
PRINT 'Open SDT and create one through the setup screen.';
PRINT '';
GO


SELECT
    TABLE_NAME AS tableName
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'dbo'
ORDER BY TABLE_NAME;
GO


SELECT
    COUNT(*) AS challengeCount
FROM dbo.Challenges;

SELECT
    COUNT(*) AS taskCount
FROM dbo.Tasks;

SELECT
    COUNT(*) AS dayStatusCount
FROM dbo.DayStatus;
GO