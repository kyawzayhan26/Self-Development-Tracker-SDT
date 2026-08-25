const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

/**
 * Utility: ensure date string is YYYY-MM-DD
 */
function assertDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const err = new Error('Invalid date format. Use YYYY-MM-DD');
    err.statusCode = 400;
    throw err;
  }
}

/**
 * GET /api/progress/overall-progress?start=YYYY-MM-DD&days=75
 * Overall progress across the challenge window.
 * Progress is measured by "completed days" = days where ALL active tasks are done.
 *
 * IMPORTANT: This MUST be defined before "/:dateKey" routes.
 */
router.get('/overall-progress', async (req, res, next) => {
  try {
    const start = String(req.query.start || '');
    const days = Number(req.query.days || 75);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      const err = new Error('Invalid start format. Use YYYY-MM-DD');
      err.statusCode = 400;
      throw err;
    }
    if (!Number.isInteger(days) || days <= 0 || days > 365) {
      const err = new Error('Invalid days value.');
      err.statusCode = 400;
      throw err;
    }

    const pool = await getPool();

    // Total active tasks
    const t = await pool.request().query(`
      SELECT COUNT(*) AS totalCount
      FROM dbo.Tasks
      WHERE isActive = 1
    `);
    const totalCount = t.recordset[0]?.totalCount ?? 0;

    // Count completed days in [start, start + days - 1]
    const r = await pool.request()
      .input('startDate', sql.Date, start)
      .input('numDays', sql.Int, days)
      .input('totalCount', sql.Int, totalCount)
      .query(`
        ;WITH RangeDays AS (
          SELECT 0 AS n, @startDate AS d
          UNION ALL
          SELECT n + 1, DATEADD(DAY, 1, d)
          FROM RangeDays
          WHERE n + 1 < @numDays
        ),
        DayDone AS (
          SELECT
            rd.d AS dateKey,
            COALESCE(SUM(CASE WHEN ds.isDone = 1 THEN 1 ELSE 0 END), 0) AS doneCount
          FROM RangeDays rd
          LEFT JOIN dbo.DayStatus ds
            ON ds.dateKey = rd.d
          GROUP BY rd.d
        )
        SELECT
          SUM(CASE WHEN @totalCount > 0 AND dd.doneCount = @totalCount THEN 1 ELSE 0 END) AS completedDays
        FROM DayDone dd
        OPTION (MAXRECURSION 400);
      `);

    const completedDays = r.recordset[0]?.completedDays ?? 0;
    const pct = days === 0 ? 0 : Math.round((completedDays / days) * 100);

    res.json({ ok: true, start, days, completedDays, pct });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/progress/strikes?start=YYYY-MM-DD&days=75&strikes=3
 *
 * NEW BEHAVIOR (as requested):
 * - Unrecorded days DO NOT count.
 * - A day counts only if it was explicitly "recorded" (you hit Save),
 *   meaning DayStatus has at least one row for that date.
 * - For recorded days, a "miss" = task isDone = 0 for that day.
 */
router.get('/strikes', async (req, res, next) => {
  try {
    const start = String(req.query.start || '');
    const days = Number(req.query.days || 75);
    const strikes = Number(req.query.strikes || 3);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      const err = new Error('Invalid start format. Use YYYY-MM-DD');
      err.statusCode = 400;
      throw err;
    }
    if (!Number.isInteger(days) || days <= 0 || days > 365) {
      const err = new Error('Invalid days value.');
      err.statusCode = 400;
      throw err;
    }
    if (!Number.isInteger(strikes) || strikes < 0 || strikes > 999) {
      const err = new Error('Invalid strikes value.');
      err.statusCode = 400;
      throw err;
    }

    const pool = await getPool();

    // Active tasks
    const tasksRes = await pool.request().query(`
      SELECT taskId, name, sortOrder
      FROM dbo.Tasks
      WHERE isActive = 1
      ORDER BY sortOrder ASC, taskId ASC
    `);

    // Recorded days within the challenge range = dates that exist in DayStatus
    // (i.e., user hit Save at least once for that date).
    const statsRes = await pool.request()
      .input('startDate', sql.Date, start)
      .input('numDays', sql.Int, days)
      .query(`
        DECLARE @endDate DATE = DATEADD(day, @numDays - 1, @startDate);

        ;WITH RecordedDays AS (
          SELECT DISTINCT ds.dateKey
          FROM dbo.DayStatus ds
          WHERE ds.dateKey BETWEEN @startDate AND @endDate
        )
        SELECT COUNT(*) AS recordedDays
        FROM RecordedDays;
      `);

    const recordedDays = Number(statsRes.recordset[0]?.recordedDays ?? 0);

    // If nothing recorded yet, no strikes used.
    if (recordedDays === 0) {
      const tasks = tasksRes.recordset.map(t => ({
        taskId: t.taskId,
        name: t.name,
        strikesAllowed: strikes,
        strikesUsed: 0,
        strikesLeft: strikes,
        missedDays: 0,
        recordedDays
      }));
      return res.json({ ok: true, start, days, strikesAllowed: strikes, recordedDays, tasks });
    }

    // Misses per task over RECORDED days only
    const missesRes = await pool.request()
      .input('startDate', sql.Date, start)
      .input('numDays', sql.Int, days)
      .query(`
        DECLARE @endDate DATE = DATEADD(day, @numDays - 1, @startDate);

        ;WITH RecordedDays AS (
          SELECT DISTINCT ds.dateKey
          FROM dbo.DayStatus ds
          WHERE ds.dateKey BETWEEN @startDate AND @endDate
        )
        SELECT
          t.taskId,
          SUM(CASE WHEN ds.isDone = 1 THEN 0 ELSE 1 END) AS missedDays
        FROM dbo.Tasks t
        CROSS JOIN RecordedDays rd
        LEFT JOIN dbo.DayStatus ds
          ON ds.taskId = t.taskId AND ds.dateKey = rd.dateKey
        WHERE t.isActive = 1
        GROUP BY t.taskId;
      `);

    const missMap = new Map(missesRes.recordset.map(r => [r.taskId, Number(r.missedDays || 0)]));

    const tasks = tasksRes.recordset.map(t => {
      const missedDays = missMap.get(t.taskId) ?? 0;
      const strikesUsed = missedDays; // 1 recorded miss consumes 1 strike
      const strikesLeft = Math.max(0, strikes - strikesUsed);
      return {
        taskId: t.taskId,
        name: t.name,
        strikesAllowed: strikes,
        strikesUsed,
        strikesLeft,
        missedDays,
        recordedDays
      };
    });

    res.json({ ok: true, start, days, strikesAllowed: strikes, recordedDays, tasks });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/days?month=YYYY-MM
 * Returns completion summary for each day in the month:
 * [{ dateKey, doneCount, totalCount }]
 */
router.get('/', async (req, res, next) => {
  try {
    const month = String(req.query.month || '');
    if (!/^\d{4}-\d{2}$/.test(month)) {
      const err = new Error('Invalid month format. Use YYYY-MM');
      err.statusCode = 400;
      throw err;
    }

    const pool = await getPool();

    // Get tasks count once (active tasks)
    const t = await pool.request().query(`
      SELECT COUNT(*) AS totalCount
      FROM dbo.Tasks
      WHERE isActive = 1
    `);
    const totalCount = t.recordset[0]?.totalCount ?? 0;

    // For the selected month, count completed per day
    const r = await pool.request()
      .input('month', sql.NVarChar(7), month)
      .query(`
        ;WITH MonthDays AS (
          SELECT CAST(CONCAT(@month, '-01') AS DATE) AS d
          UNION ALL
          SELECT DATEADD(DAY, 1, d)
          FROM MonthDays
          WHERE DATEADD(DAY, 1, d) < DATEADD(MONTH, 1, CAST(CONCAT(@month, '-01') AS DATE))
        )
        SELECT
          CONVERT(VARCHAR(10), md.d, 23) AS dateKey,
          COALESCE(SUM(CASE WHEN ds.isDone = 1 THEN 1 ELSE 0 END), 0) AS doneCount
        FROM MonthDays md
        LEFT JOIN dbo.DayStatus ds
          ON ds.dateKey = md.d
        GROUP BY md.d
        OPTION (MAXRECURSION 50);
      `);

    const days = r.recordset.map(x => ({
      dateKey: x.dateKey,
      doneCount: x.doneCount,
      totalCount
    }));

    res.json({ ok: true, month, days });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/day/:dateKey
 * Returns:
 * - tasks list
 * - status for this date
 */
router.get('/:dateKey', async (req, res, next) => {
  try {
    const dateKey = req.params.dateKey;
    assertDateKey(dateKey);

    const pool = await getPool();

    const tasksRes = await pool.request().query(`
      SELECT taskId, name, sortOrder
      FROM dbo.Tasks
      WHERE isActive = 1
      ORDER BY sortOrder ASC, taskId ASC
    `);

    const statusRes = await pool.request()
      .input('dateKey', sql.Date, dateKey)
      .query(`
        SELECT taskId, isDone
        FROM dbo.DayStatus
        WHERE dateKey = @dateKey
      `);

    const statusMap = new Map(statusRes.recordset.map(r => [r.taskId, r.isDone]));

    const tasks = tasksRes.recordset.map(t => ({
      taskId: t.taskId,
      name: t.name,
      isDone: Boolean(statusMap.get(t.taskId) || 0)
    }));

    res.json({ ok: true, dateKey, tasks });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/day/:dateKey
 * Body: { tasks: [{ taskId, isDone }, ...] }
 * Upserts completion status.
 */
router.put('/:dateKey', express.json(), async (req, res, next) => {
  try {
    const dateKey = req.params.dateKey;
    assertDateKey(dateKey);

    const tasks = req.body?.tasks;
    if (!Array.isArray(tasks)) {
      const err = new Error('Body must include tasks: [{taskId, isDone}]');
      err.statusCode = 400;
      throw err;
    }

    const pool = await getPool();
    const tx = new (require('mssql').Transaction)(pool);
    await tx.begin();

    try {
      for (const item of tasks) {
        const taskId = Number(item.taskId);
        const isDone = item.isDone ? 1 : 0;

        if (!Number.isInteger(taskId) || taskId <= 0) {
          const err = new Error('Invalid taskId');
          err.statusCode = 400;
          throw err;
        }

        await tx.request()
          .input('dateKey', sql.Date, dateKey)
          .input('taskId', sql.Int, taskId)
          .input('isDone', sql.Bit, isDone)
          .query(`
            MERGE dbo.DayStatus AS target
            USING (SELECT @dateKey AS dateKey, @taskId AS taskId) AS src
            ON target.dateKey = src.dateKey AND target.taskId = src.taskId
            WHEN MATCHED THEN
              UPDATE SET isDone = @isDone, updatedAt = SYSDATETIME()
            WHEN NOT MATCHED THEN
              INSERT (dateKey, taskId, isDone, updatedAt)
              VALUES (@dateKey, @taskId, @isDone, SYSDATETIME());
          `);
      }

      await tx.commit();
    } catch (inner) {
      await tx.rollback();
      throw inner;
    }

    res.json({ ok: true, dateKey });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
