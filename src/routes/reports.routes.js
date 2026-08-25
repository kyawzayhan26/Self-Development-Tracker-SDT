const express = require('express');

const router = express.Router();

const {
  getPool,
  sql
} = require('../config/db');


/*
 * GET /api/reports/current
 *
 * Generates a progress report for the
 * currently active challenge.
 *
 * IMPORTANT:
 * - Unrecorded days are NOT failures.
 * - Misses only exist on days that were saved.
 * - Future days are excluded from "elapsed" statistics.
 */
router.get(
  '/current',
  async (req, res, next) => {

    try {

      const pool =
        await getPool();


      /*
       * Get active challenge.
       */
      const challengeResult =
        await pool.request().query(`
          SELECT TOP 1

            challengeId,
            name,

            CONVERT(
              VARCHAR(10),
              startDate,
              23
            ) AS startDate,

            CONVERT(
              VARCHAR(10),
              DATEADD(
                DAY,
                durationDays - 1,
                startDate
              ),
              23
            ) AS endDate,

            durationDays,
            strikesAllowed,
            status

          FROM dbo.Challenges

          WHERE status = N'ACTIVE'

          ORDER BY
            challengeId DESC;
        `);


      if (
        challengeResult.recordset.length === 0
      ) {

        const err =
          new Error(
            'No active challenge found.'
          );

        err.statusCode = 404;

        throw err;

      }


      const challenge =
        challengeResult.recordset[0];


      /*
       * Get challenge tasks.
       */
      const tasksResult =
        await pool.request()

          .input(
            'challengeId',
            sql.Int,
            challenge.challengeId
          )

          .query(`
            SELECT

              taskId,
              name,
              sortOrder

            FROM dbo.Tasks

            WHERE
              challengeId = @challengeId

              AND
              isActive = 1

            ORDER BY
              sortOrder ASC,
              taskId ASC;
          `);


      const tasks =
        tasksResult.recordset;


      const totalTasks =
        tasks.length;


      /*
       * Determine current challenge timing.
       */
      const timingResult =
        await pool.request()

          .input(
            'startDate',
            sql.Date,
            challenge.startDate
          )

          .input(
            'durationDays',
            sql.Int,
            challenge.durationDays
          )

          .query(`
            DECLARE @today DATE =
              CONVERT(
                DATE,
                GETDATE()
              );

            DECLARE @endDate DATE =
              DATEADD(
                DAY,
                @durationDays - 1,
                @startDate
              );


            SELECT

              CASE

                WHEN
                  @today < @startDate

                THEN 0


                WHEN
                  @today > @endDate

                THEN @durationDays


                ELSE
                  DATEDIFF(
                    DAY,
                    @startDate,
                    @today
                  ) + 1

              END AS elapsedDays,


              CASE

                WHEN
                  @today < @startDate

                THEN 0


                WHEN
                  @today > @endDate

                THEN @durationDays


                ELSE
                  DATEDIFF(
                    DAY,
                    @startDate,
                    @today
                  ) + 1

              END AS currentDayNumber;
          `);


      const elapsedDays =
        Number(
          timingResult
            .recordset[0]
            ?.elapsedDays || 0
        );


      const currentDayNumber =
        Number(
          timingResult
            .recordset[0]
            ?.currentDayNumber || 0
        );


      /*
       * Daily report.
       *
       * Generates challenge days from Day 1
       * through the current elapsed day.
       *
       * A recorded day means at least one
       * DayStatus row exists for one of this
       * challenge's tasks.
       */
      let dailyRows = [];


      if (elapsedDays > 0) {

        const dailyResult =
          await pool.request()

            .input(
              'challengeId',
              sql.Int,
              challenge.challengeId
            )

            .input(
              'startDate',
              sql.Date,
              challenge.startDate
            )

            .input(
              'elapsedDays',
              sql.Int,
              elapsedDays
            )

            .query(`
              ;WITH ChallengeDays AS
              (
                SELECT

                  1 AS dayNumber,

                  @startDate AS dateKey


                UNION ALL


                SELECT

                  dayNumber + 1,

                  DATEADD(
                    DAY,
                    1,
                    dateKey
                  )

                FROM ChallengeDays

                WHERE
                  dayNumber <
                  @elapsedDays
              ),

              ChallengeTasks AS
              (
                SELECT
                  taskId

                FROM dbo.Tasks

                WHERE
                  challengeId =
                    @challengeId

                  AND
                  isActive = 1
              )

              SELECT

                cd.dayNumber,

                CONVERT(
                  VARCHAR(10),
                  cd.dateKey,
                  23
                ) AS dateKey,

                CASE

                  WHEN
                    COUNT(ds.taskId) > 0

                  THEN CAST(1 AS BIT)

                  ELSE CAST(0 AS BIT)

                END AS isRecorded,

                SUM(
                  CASE

                    WHEN ds.isDone = 1

                    THEN 1

                    ELSE 0

                  END
                ) AS completedCount,

                COUNT(
                  ct.taskId
                ) AS totalTasks

              FROM ChallengeDays cd

              CROSS JOIN
                ChallengeTasks ct

              LEFT JOIN
                dbo.DayStatus ds

                ON
                  ds.dateKey =
                    cd.dateKey

                  AND
                  ds.taskId =
                    ct.taskId

              GROUP BY

                cd.dayNumber,
                cd.dateKey

              ORDER BY
                cd.dayNumber ASC

              OPTION (
                MAXRECURSION 400
              );
            `);


        dailyRows =
          dailyResult.recordset.map(
            row => {

              const isRecorded =
                Boolean(
                  row.isRecorded
                );

              const completedCount =
                Number(
                  row.completedCount || 0
                );

              const rowTotalTasks =
                Number(
                  row.totalTasks || 0
                );


              const completionPct =
                isRecorded &&
                rowTotalTasks > 0

                  ? Math.round(
                      (
                        completedCount /
                        rowTotalTasks
                      ) * 100
                    )

                  : null;


              return {

                dayNumber:
                  Number(
                    row.dayNumber
                  ),

                dateKey:
                  row.dateKey,

                isRecorded,

                completedCount,

                totalTasks:
                  rowTotalTasks,

                completionPct,

                isPerfect:
                  Boolean(
                    isRecorded &&
                    rowTotalTasks > 0 &&
                    completedCount ===
                      rowTotalTasks
                  )

              };

            }
          );

      }


      /*
       * Recorded days only.
       */
      const recordedDailyRows =
        dailyRows.filter(
          row =>
            row.isRecorded
        );


      const recordedDays =
        recordedDailyRows.length;


      const unrecordedDays =
        Math.max(
          0,
          elapsedDays -
          recordedDays
        );


      const perfectDays =
        recordedDailyRows.filter(
          row =>
            row.isPerfect
        ).length;


      /*
       * Total task completion instances.
       *
       * Example:
       * 10 tasks × 5 recorded days =
       * 50 possible recorded task instances.
       */
      const totalCompletedInstances =
        recordedDailyRows.reduce(
          (
            total,
            row
          ) =>
            total +
            row.completedCount,
          0
        );


      const totalRecordedInstances =
        recordedDays *
        totalTasks;


      const totalMissedInstances =
        Math.max(
          0,
          totalRecordedInstances -
          totalCompletedInstances
        );


      /*
       * Average completion across
       * RECORDED days only.
       */
      const averageRecordedCompletionPct =
        totalRecordedInstances > 0

          ? Math.round(
              (
                totalCompletedInstances /
                totalRecordedInstances
              ) * 100
            )

          : 0;


      /*
       * Existing SDT overall progress concept:
       *
       * Perfect days / total challenge days.
       */
      const overallChallengeProgressPct =
        challenge.durationDays > 0

          ? Math.round(
              (
                perfectDays /
                challenge.durationDays
              ) * 100
            )

          : 0;


      /*
       * Per-rule performance.
       */
      let rulePerformance = [];


      if (tasks.length > 0) {

        const ruleResult =
          await pool.request()

            .input(
              'challengeId',
              sql.Int,
              challenge.challengeId
            )

            .input(
              'startDate',
              sql.Date,
              challenge.startDate
            )

            .input(
              'elapsedDays',
              sql.Int,
              elapsedDays
            )

            .query(`
              DECLARE @lastElapsedDate DATE;

              IF @elapsedDays > 0
              BEGIN

                SET @lastElapsedDate =
                  DATEADD(
                    DAY,
                    @elapsedDays - 1,
                    @startDate
                  );

              END
              ELSE
              BEGIN

                SET @lastElapsedDate =
                  DATEADD(
                    DAY,
                    -1,
                    @startDate
                  );

              END;


              ;WITH RecordedDays AS
              (
                SELECT DISTINCT

                  ds.dateKey

                FROM dbo.DayStatus ds

                INNER JOIN
                  dbo.Tasks sourceTask

                  ON
                    sourceTask.taskId =
                      ds.taskId

                WHERE

                  sourceTask.challengeId =
                    @challengeId

                  AND
                  ds.dateKey
                    BETWEEN
                      @startDate
                      AND
                      @lastElapsedDate
              )

              SELECT

                t.taskId,

                t.name,

                t.sortOrder,

                COUNT(
                  rd.dateKey
                ) AS recordedDays,

                SUM(
                  CASE

                    WHEN ds.isDone = 1

                    THEN 1

                    ELSE 0

                  END
                ) AS completedDays,

                SUM(
                  CASE

                    WHEN
                      rd.dateKey IS NOT NULL
                      AND
                      (
                        ds.isDone = 0
                        OR
                        ds.isDone IS NULL
                      )

                    THEN 1

                    ELSE 0

                  END
                ) AS missedDays

              FROM dbo.Tasks t

              LEFT JOIN
                RecordedDays rd

                ON
                  1 = 1

              LEFT JOIN
                dbo.DayStatus ds

                ON
                  ds.taskId =
                    t.taskId

                  AND
                  ds.dateKey =
                    rd.dateKey

              WHERE

                t.challengeId =
                  @challengeId

                AND
                t.isActive = 1

              GROUP BY

                t.taskId,
                t.name,
                t.sortOrder

              ORDER BY

                t.sortOrder ASC,
                t.taskId ASC;
            `);


        rulePerformance =
          ruleResult.recordset.map(
            row => {

              const ruleRecordedDays =
                Number(
                  row.recordedDays || 0
                );

              const completedDays =
                Number(
                  row.completedDays || 0
                );

              const missedDays =
                Number(
                  row.missedDays || 0
                );


              const completionPct =
                ruleRecordedDays > 0

                  ? Math.round(
                      (
                        completedDays /
                        ruleRecordedDays
                      ) * 100
                    )

                  : null;


              return {

                taskId:
                  row.taskId,

                name:
                  row.name,

                completedDays,

                missedDays,

                recordedDays:
                  ruleRecordedDays,

                completionPct,

                strikesAllowed:
                  challenge.strikesAllowed,

                strikesUsed:
                  missedDays,

                strikesLeft:
                  Math.max(
                    0,
                    challenge.strikesAllowed -
                    missedDays
                  )

              };

            }
          );

      }


      /*
       * Strongest and weakest rules.
       *
       * Only calculate once there is
       * at least one recorded day.
       */
      const measurableRules =
        rulePerformance.filter(
          rule =>
            rule.completionPct !== null
        );


      let strongestRule = null;
      let weakestRule = null;


      if (
        measurableRules.length > 0
      ) {

        strongestRule =
          measurableRules.reduce(
            (
              strongest,
              rule
            ) => {

              if (
                strongest === null ||
                rule.completionPct >
                strongest.completionPct
              ) {

                return rule;

              }

              return strongest;

            },
            null
          );


        weakestRule =
          measurableRules.reduce(
            (
              weakest,
              rule
            ) => {

              if (
                weakest === null ||
                rule.completionPct <
                weakest.completionPct
              ) {

                return rule;

              }

              return weakest;

            },
            null
          );

      }


      const totalStrikesUsed =
        rulePerformance.reduce(
          (
            total,
            rule
          ) =>
            total +
            rule.strikesUsed,
          0
        );


      res.json({

        ok: true,

        reportType:
          'PROGRESS',

        generatedAt:
          new Date()
            .toISOString(),

        challenge: {

          challengeId:
            challenge.challengeId,

          name:
            challenge.name,

          startDate:
            challenge.startDate,

          endDate:
            challenge.endDate,

          durationDays:
            challenge.durationDays,

          strikesAllowed:
            challenge.strikesAllowed,

          status:
            challenge.status,

          totalTasks

        },

        summary: {

          currentDayNumber,

          elapsedDays,

          recordedDays,

          unrecordedDays,

          remainingDays:
            Math.max(
              0,
              challenge.durationDays -
              elapsedDays
            ),

          perfectDays,

          overallChallengeProgressPct,

          averageRecordedCompletionPct,

          totalCompletedInstances,

          totalMissedInstances,

          totalRecordedInstances,

          totalStrikesUsed

        },

        strongestRule,

        weakestRule,

        rules:
          rulePerformance,

        days:
          dailyRows

      });

    }
    catch (e) {

      next(e);

    }

  }
);


module.exports = router;