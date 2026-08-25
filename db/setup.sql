/*
  SDT Database Setup
  - Creates database SDT (if not exists)
  - Creates tables: Tasks, DayStatus
  - Seeds default tasks (placeholder - you will customize later)
*/

IF DB_ID(N'SDT') IS NULL
BEGIN
  CREATE DATABASE SDT;
END
GO

USE SDT;
GO

IF OBJECT_ID(N'dbo.Tasks', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Tasks (
    taskId INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    isActive BIT NOT NULL CONSTRAINT DF_Tasks_isActive DEFAULT(1),
    sortOrder INT NOT NULL CONSTRAINT DF_Tasks_sortOrder DEFAULT(0),
    createdAt DATETIME2 NOT NULL CONSTRAINT DF_Tasks_createdAt DEFAULT(SYSDATETIME())
  );
END
GO

IF OBJECT_ID(N'dbo.DayStatus', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.DayStatus (
    dateKey DATE NOT NULL,
    taskId INT NOT NULL,
    isDone BIT NOT NULL CONSTRAINT DF_DayStatus_isDone DEFAULT(0),
    updatedAt DATETIME2 NOT NULL CONSTRAINT DF_DayStatus_updatedAt DEFAULT(SYSDATETIME()),
    CONSTRAINT PK_DayStatus PRIMARY KEY (dateKey, taskId),
    CONSTRAINT FK_DayStatus_Tasks FOREIGN KEY (taskId) REFERENCES dbo.Tasks(taskId)
  );
END
GO

-- Seed a few default tasks if none exist
IF NOT EXISTS (SELECT 1 FROM dbo.Tasks)
BEGIN
  INSERT INTO dbo.Tasks (name, sortOrder) VALUES
    (N'Outdoor workout (45 min)', 1),
    (N'Indoor workout (45 min)', 2),
    (N'Drink water goal', 3),
    (N'Read 10 pages', 4),
    (N'Progress photo', 5);
END
GO
