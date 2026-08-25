USE SDT;
GO

/*
  SDT Rules Migration (Phase 1)
  - Replaces current placeholder tasks with your finalized SDT rules.
  - Keeps existing schema (Tasks, DayStatus).
  - WARNING: This will clear existing task definitions and day statuses.
*/

BEGIN TRY
  BEGIN TRAN;

  -- Remove all existing completion data (since task IDs will change)
  DELETE FROM dbo.DayStatus;

  -- Remove existing tasks
  DELETE FROM dbo.Tasks;

  -- Insert your tasks in your preferred order
  INSERT INTO dbo.Tasks (name, sortOrder, isActive) VALUES
    (N'Cold shower', 10, 1),
    (N'Workout (Gym)', 1, 1),
    (N'Workout (Home)', 2, 1),
    (N'Walk / Move 10,000 steps', 3, 1),
    (N'Read 10 pages of a book', 13, 1),
    (N'Eat at a 500 calorie deficit (2150kcal daily)', 4, 1),
    (N'Meditate (3 minutes)', 9, 1),
    (N'Journal', 8, 1),
    (N'Deep work (2 hours, no distractions)', 11, 1),
    (N'Learning (20 minutes � motivation video / TED talk)', 12, 1),
    (N'Coding (1 hour � work on a project)', 14, 1),
    (N'No alcohol', 5, 1),
    (N'No clubbing', 6, 1),
    (N'No sugar', 7, 1);

  COMMIT;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  THROW;
END CATCH
GO
