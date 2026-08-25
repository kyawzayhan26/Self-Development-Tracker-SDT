const express = require('express');

const router = express.Router();

const {
  getPool,
  sql
} = require('../config/db');


function dateStringToUtc(
  value
){

  return new Date(
    value +
    'T00:00:00Z'
  );
}


function inclusiveDays(
  startDate,
  cutoffDate,
  maximumDays
){

  const start =
    dateStringToUtc(
      startDate
    );

  const cutoff =
    dateStringToUtc(
      cutoffDate
    );


  if (
    cutoff < start
  ) {

    return 0;
  }


  const difference =
    Math.floor(
      (
        cutoff - start
      ) /
      86400000
    ) + 1;


  return Math.min(
    maximumDays,
    Math.max(
      0,
      difference
    )
  );
}


async function getServerDate(
  pool
){

  const result =
    await pool.request().query(`
      SELECT
        CONVERT(
          VARCHAR(10),
          GETDATE(),
          23
        ) AS today;
    `);


  return result
    .recordset[0]
    .today;
}


async function getTasks(
  pool,
  challengeId
){

  const result =
    await pool.request()

      .input(
        'challengeId',
        sql.Int,
        challengeId
      )

      .query(`
        SELECT

          taskId,
          name,
          sortOrder

        FROM dbo.Tasks

        WHERE
          challengeId =
            @challengeId

          AND
          isActive = 1

        ORDER BY
          sortOrder ASC,
          taskId ASC;
      `);


  return result.recordset;
}


async function buildReport(
  pool,
  challenge,
  reportType
){

  const tasks =
    await getTasks(
      pool,
      challenge.challengeId
    );


  const totalTasks =
    tasks.length;


  const today =
    await getServerDate(
      pool
    );


  let cutoffDate;


  if (
    reportType ===
    'FINAL'
  ) {

    if (
      challenge.completionReason ===
      'NATURAL'
    ) {

      cutoffDate =
        challenge.endDate;

    }
    else if (
      challenge.completedDate
    ) {

      cutoffDate =
        challenge.completedDate;

    }
    else {

      cutoffDate =
        today;
    }

  }
  else {

    cutoffDate =
      today;
  }


  const elapsedDays =
    inclusiveDays(

      challenge.startDate,

      cutoffDate,

      challenge.durationDays

    );


  const currentDayNumber =
    elapsedDays;


  let dailyRows = [];


  if (
    elapsedDays > 0
  ) {

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
                COUNT(
                  ds.taskId
                ) > 0

              THEN
                CAST(
                  1 AS BIT
                )

              ELSE
                CAST(
                  0 AS BIT
                )

            END AS isRecorded,

            SUM(
              CASE

                WHEN
                  ds.isDone = 1

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


  const averageRecordedCompletionPct =

    totalRecordedInstances > 0

      ? Math.round(
          (
            totalCompletedInstances /
            totalRecordedInstances
          ) * 100
        )

      : 0;


  const overallChallengeProgressPct =

    challenge.durationDays > 0

      ? Math.round(
          (
            perfectDays /
            challenge.durationDays
          ) * 100
        )

      : 0;


  let rulePerformance = [];


  if (
    tasks.length > 0
  ) {

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

                WHEN
                  ds.isDone = 1

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


  const measurableRules =
    rulePerformance.filter(
      rule =>
        rule.completionPct !== null
    );


  let strongestRule =
    null;


  let weakestRule =
    null;


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


  return {

    ok: true,

    reportType,

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

      completionReason:
        challenge.completionReason ||
        null,

      completedAt:
        challenge.completedAt ||
        null,

      completedDate:
        challenge.completedDate ||
        null,

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

  };
}


/*
 * CURRENT PROGRESS REPORT
 */
router.get(
  '/current',
  async (req, res, next) => {

    try {

      const pool =
        await getPool();


      const result =
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
            status,
            completedAt,
            completionReason,

            CONVERT(
              VARCHAR(10),
              completedAt,
              23
            ) AS completedDate

          FROM dbo.Challenges

          WHERE
            status = N'ACTIVE'

          ORDER BY
            challengeId DESC;
        `);


      if (
        result.recordset.length === 0
      ) {

        const err =
          new Error(
            'No active challenge found.'
          );

        err.statusCode = 404;

        throw err;
      }


      const report =
        await buildReport(

          pool,

          result.recordset[0],

          'PROGRESS'

        );


      res.json(
        report
      );

    }
    catch (e) {

      next(e);
    }
  }
);


/*
 * FINAL REPORT FOR A COMPLETED CHALLENGE
 *
 * GET:
 * /api/reports/challenge/123/final
 */
router.get(
  '/challenge/:challengeId/final',
  async (req, res, next) => {

    try {

      const challengeId =
        Number(
          req.params.challengeId
        );


      if (
        !Number.isInteger(
          challengeId
        ) ||

        challengeId < 1
      ) {

        const err =
          new Error(
            'Invalid challenge ID.'
          );

        err.statusCode = 400;

        throw err;
      }


      const pool =
        await getPool();


      const result =
        await pool.request()

          .input(
            'challengeId',
            sql.Int,
            challengeId
          )

          .query(`
            SELECT

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
              status,
              completedAt,
              completionReason,

              CONVERT(
                VARCHAR(10),
                completedAt,
                23
              ) AS completedDate

            FROM dbo.Challenges

            WHERE
              challengeId =
                @challengeId;
          `);


      if (
        result.recordset.length === 0
      ) {

        const err =
          new Error(
            'Challenge not found.'
          );

        err.statusCode = 404;

        throw err;
      }


      const challenge =
        result.recordset[0];


      if (
        challenge.status !==
        'COMPLETED'
      ) {

        const err =
          new Error(
            'Final report is only available for completed challenges.'
          );

        err.statusCode = 400;

        throw err;
      }


      const report =
        await buildReport(

          pool,

          challenge,

          'FINAL'

        );


      res.json(
        report
      );

    }
    catch (e) {

      next(e);
    }
  }
);


module.exports = router;