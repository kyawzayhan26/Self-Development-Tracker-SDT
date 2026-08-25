/*
    ============================================================
    SDT - SELF DEVELOPMENT TRACKER
    COMPLETE DATABASE SETUP / RESET
    ============================================================

    WARNING:
    Running this script will DELETE the entire SDT database
    including:

    - All challenges
    - All tasks / rules
    - All daily progress
    - All strike history
    - All test data

    The database is then recreated from scratch.

    Use this during development whenever you want a clean reset.

    IMPORTANT:
    Stop the SDT Node.js server before running this script.
    ============================================================
*/


USE master;
GO


/* ============================================================
   1. DELETE EXISTING SDT DATABASE
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
   2. CREATE FRESH DATABASE
   ============================================================ */

PRINT 'Creating fresh SDT database...';
GO


CREATE DATABASE SDT;
GO


USE SDT;
GO



/* ============================================================
   3. CHALLENGES TABLE
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

    createdAt DATETIME2
        NOT NULL
        CONSTRAINT DF_Challenges_CreatedAt
        DEFAULT(SYSDATETIME()),


    /* Challenge length: 1 - 365 days */
    CONSTRAINT CK_Challenges_Duration
        CHECK
        (
            durationDays BETWEEN 1 AND 365
        ),


    /* Strike allowance: 0 - 99 */
    CONSTRAINT CK_Challenges_Strikes
        CHECK
        (
            strikesAllowed BETWEEN 0 AND 99
        ),


    /* Currently supported challenge states */
    CONSTRAINT CK_Challenges_Status
        CHECK
        (
            status IN
            (
                N'ACTIVE',
                N'COMPLETED'
            )
        )
);
GO



/* ============================================================
   4. TASKS TABLE
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
   5. DAY STATUS TABLE
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


    /*
        A task can only have one status
        for each calendar date.
    */
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


/*
    Faster lookup of all tasks belonging
    to a particular challenge.
*/
CREATE INDEX IX_Tasks_ChallengeId
ON dbo.Tasks
(
    challengeId
);
GO


/*
    Faster lookup of challenge tasks
    in their checklist display order.
*/
CREATE INDEX IX_Tasks_Challenge_SortOrder
ON dbo.Tasks
(
    challengeId,
    sortOrder
);
GO


/*
    Faster lookup of task status history.
*/
CREATE INDEX IX_DayStatus_TaskId
ON dbo.DayStatus
(
    taskId
);
GO



/* ============================================================
   7. VERIFY DATABASE
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
PRINT 'No tasks have been seeded.';
PRINT 'Open SDT and create your challenge using the setup screen.';
PRINT '';

GO



/* ============================================================
   OPTIONAL VERIFICATION OUTPUT
   ============================================================ */

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