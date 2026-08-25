const express = require('express');

const router = express.Router();

const {
  getPool,
  sql
} = require('../config/db');


function assertDateKey(dateKey) {

  if (
    !/^\d{4}-\d{2}-\d{2}$/
      .test(dateKey)
  ) {

    const err =
      new Error(
        'Invalid date format. Use YYYY-MM-DD'
      );

    err.statusCode = 400;

    throw err;
  }
}


async function getCurrentChallenge(pool) {

  await pool.request().query(`
    UPDATE dbo.Challenges

    SET status = N'COMPLETED'

    WHERE status = N'ACTIVE'

      AND DATEADD(
            DAY,
            durationDays - 1,
            startDate
          )
          <
          CONVERT(
            DATE,
            GETDATE()
          );
  `);


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

        durationDays,
        strikesAllowed

      FROM dbo.Challenges

      WHERE status = N'ACTIVE'

      ORDER BY
        challengeId DESC;
    `);


  return (
    result.recordset[0] ||
    null
  );
}


function requireChallenge(challenge) {

  if (!challenge) {

    const err =
      new Error(
        'No active challenge.'
      );

    err.statusCode = 404;

    throw err;
  }
}


function assertChallengeDate(
  dateKey,
  challenge
) {

  const start =
    new Date(
      challenge.startDate +
      'T00:00:00'
    );


  const target =
    new Date(
      dateKey +
      'T00:00:00'
    );


  const end =
    new Date(start);


  end.setDate(
    end.getDate() +
    challenge.durationDays -
    1
  );


  if (
    target < start ||
    target > end
  ) {

    const err =
      new Error(
        'Date is outside the challenge period.'
      );

    err.statusCode = 400;

    throw err;
  }
}


/*
 * GET /api/progress/overall-progress
 */
router.get(
  '/overall-progress',
  async (req, res, next) => {

    try {

      const pool =
        await getPool();


      const challenge =
        await getCurrentChallenge(pool);


      requireChallenge(
        challenge
      );


      const result =
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
            'numDays',
            sql.Int,
            challenge.durationDays
          )

          .query(`
            ;WITH RangeDays AS
            (
              SELECT
                0 AS n,
                @startDate AS d

              UNION ALL

              SELECT
                n + 1,
                DATEADD(
                  DAY,
                  1,
                  d
                )

              FROM RangeDays

              WHERE
                n + 1 < @numDays
            ),

            ChallengeTasks AS
            (
              SELECT taskId

              FROM dbo.Tasks

              WHERE
                challengeId =
                  @challengeId

                AND isActive = 1
            ),

            DayDone AS
            (
              SELECT

                rd.d AS dateKey,

                SUM(
                  CASE
                    WHEN ds.isDone = 1
                    THEN 1
                    ELSE 0
                  END
                ) AS doneCount,

                COUNT(
                  ct.taskId
                ) AS totalCount

              FROM RangeDays rd

              CROSS JOIN
                ChallengeTasks ct

              LEFT JOIN
                dbo.DayStatus ds

                ON
                  ds.dateKey = rd.d

                  AND
                  ds.taskId =
                    ct.taskId

              GROUP BY
                rd.d
            )

            SELECT

              SUM(
                CASE

                  WHEN
                    totalCount > 0

                    AND
                    doneCount =
                    totalCount

                  THEN 1

                  ELSE 0

                END
              ) AS completedDays

            FROM DayDone

            OPTION (
              MAXRECURSION 400
            );
          `);


      const completedDays =
        Number(
          result
            .recordset[0]
            ?.completedDays || 0
        );


      const pct =
        Math.round(
          (
            completedDays /
            challenge.durationDays
          ) * 100
        );


      res.json({

        ok: true,

        completedDays,

        days:
          challenge.durationDays,

        pct

      });

    }
    catch (e) {

      next(e);
    }
  }
);


/*
 * GET /api/progress/strikes
 */
router.get(
  '/strikes',
  async (req, res, next) => {

    try {

      const pool =
        await getPool();


      const challenge =
        await getCurrentChallenge(pool);


      requireChallenge(
        challenge
      );


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
              challengeId =
                @challengeId

              AND
              isActive = 1

            ORDER BY
              sortOrder ASC,
              taskId ASC;
          `);


      const recordedResult =
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
            'numDays',
            sql.Int,
            challenge.durationDays
          )

          .query(`
            DECLARE @endDate DATE =

              DATEADD(
                DAY,
                @numDays - 1,
                @startDate
              );


            ;WITH RecordedDays AS
            (
              SELECT DISTINCT
                ds.dateKey

              FROM dbo.DayStatus ds

              INNER JOIN
                dbo.Tasks t

                ON
                  t.taskId =
                    ds.taskId

              WHERE
                t.challengeId =
                  @challengeId

                AND
                ds.dateKey
                  BETWEEN
                    @startDate
                    AND
                    @endDate
            )

            SELECT
              COUNT(*) AS recordedDays

            FROM RecordedDays;
          `);


      const recordedDays =
        Number(
          recordedResult
            .recordset[0]
            ?.recordedDays || 0
        );


      const missesResult =
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
            'numDays',
            sql.Int,
            challenge.durationDays
          )

          .query(`
            DECLARE @endDate DATE =

              DATEADD(
                DAY,
                @numDays - 1,
                @startDate
              );


            ;WITH RecordedDays AS
            (
              SELECT DISTINCT
                ds.dateKey

              FROM dbo.DayStatus ds

              INNER JOIN
                dbo.Tasks dt

                ON
                  dt.taskId =
                    ds.taskId

              WHERE
                dt.challengeId =
                  @challengeId

                AND
                ds.dateKey
                  BETWEEN
                    @startDate
                    AND
                    @endDate
            )

            SELECT

              t.taskId,

              SUM(
                CASE

                  WHEN
                    ds.isDone = 1

                  THEN 0

                  ELSE 1

                END
              ) AS missedDays

            FROM dbo.Tasks t

            CROSS JOIN
              RecordedDays rd

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
              t.taskId;
          `);


      const missMap =
        new Map(

          missesResult
            .recordset

            .map(
              row => [

                row.taskId,

                Number(
                  row.missedDays || 0
                )

              ]
            )
        );


      const tasks =
        tasksResult
          .recordset

          .map(task => {

            const missedDays =
              missMap.get(
                task.taskId
              ) || 0;


            return {

              taskId:
                task.taskId,

              name:
                task.name,

              strikesAllowed:
                challenge.strikesAllowed,

              strikesUsed:
                missedDays,

              strikesLeft:
                Math.max(
                  0,
                  challenge.strikesAllowed -
                  missedDays
                ),

              missedDays
            };
          });


      res.json({

        ok: true,

        strikesAllowed:
          challenge.strikesAllowed,

        recordedDays,

        tasks

      });

    }
    catch (e) {

      next(e);
    }
  }
);


/*
 * GET /api/days?month=YYYY-MM
 */
router.get(
  '/',
  async (req, res, next) => {

    try {

      const month =
        String(
          req.query.month || ''
        );


      if (
        !/^\d{4}-\d{2}$/
          .test(month)
      ) {

        const err =
          new Error(
            'Invalid month format. Use YYYY-MM'
          );

        err.statusCode = 400;

        throw err;
      }


      const pool =
        await getPool();


      const challenge =
        await getCurrentChallenge(pool);


      requireChallenge(
        challenge
      );


      const result =
        await pool.request()

          .input(
            'month',
            sql.NVarChar(7),
            month
          )

          .input(
            'challengeId',
            sql.Int,
            challenge.challengeId
          )

          .query(`
            ;WITH MonthDays AS
            (
              SELECT
                CAST(
                  CONCAT(
                    @month,
                    '-01'
                  )
                  AS DATE
                ) AS d

              UNION ALL

              SELECT
                DATEADD(
                  DAY,
                  1,
                  d
                )

              FROM MonthDays

              WHERE
                DATEADD(
                  DAY,
                  1,
                  d
                )
                <
                DATEADD(
                  MONTH,
                  1,
                  CAST(
                    CONCAT(
                      @month,
                      '-01'
                    )
                    AS DATE
                  )
                )
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

              CONVERT(
                VARCHAR(10),
                md.d,
                23
              ) AS dateKey,

              SUM(
                CASE
                  WHEN ds.isDone = 1
                  THEN 1
                  ELSE 0
                END
              ) AS doneCount,

              COUNT(
                ct.taskId
              ) AS totalCount

            FROM MonthDays md

            CROSS JOIN
              ChallengeTasks ct

            LEFT JOIN
              dbo.DayStatus ds

              ON
                ds.dateKey =
                  md.d

                AND
                ds.taskId =
                  ct.taskId

            GROUP BY
              md.d

            OPTION (
              MAXRECURSION 50
            );
          `);


      res.json({

        ok: true,

        month,

        days:
          result.recordset.map(
            row => ({

              dateKey:
                row.dateKey,

              doneCount:
                Number(
                  row.doneCount || 0
                ),

              totalCount:
                Number(
                  row.totalCount || 0
                )

            })
          )

      });

    }
    catch (e) {

      next(e);
    }
  }
);


/*
 * GET /api/day/:dateKey
 */
router.get(
  '/:dateKey',
  async (req, res, next) => {

    try {

      const dateKey =
        req.params.dateKey;


      assertDateKey(
        dateKey
      );


      const pool =
        await getPool();


      const challenge =
        await getCurrentChallenge(pool);


      requireChallenge(
        challenge
      );


      assertChallengeDate(
        dateKey,
        challenge
      );


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
              challengeId =
                @challengeId

              AND
              isActive = 1

            ORDER BY
              sortOrder ASC,
              taskId ASC;
          `);


      const statusResult =
        await pool.request()

          .input(
            'dateKey',
            sql.Date,
            dateKey
          )

          .query(`
            SELECT
              taskId,
              isDone

            FROM dbo.DayStatus

            WHERE
              dateKey =
                @dateKey;
          `);


      const statusMap =
        new Map(

          statusResult
            .recordset

            .map(
              row => [

                row.taskId,

                row.isDone

              ]
            )
        );


      const tasks =
        tasksResult
          .recordset

          .map(task => ({

            taskId:
              task.taskId,

            name:
              task.name,

            isDone:
              Boolean(
                statusMap.get(
                  task.taskId
                )
              )

          }));


      res.json({

        ok: true,

        dateKey,

        tasks

      });

    }
    catch (e) {

      next(e);
    }
  }
);


/*
 * PUT /api/day/:dateKey
 */
router.put(
  '/:dateKey',
  express.json(),
  async (req, res, next) => {

    try {

      const dateKey =
        req.params.dateKey;


      assertDateKey(
        dateKey
      );


      const items =
        req.body?.tasks;


      if (
        !Array.isArray(items)
      ) {

        const err =
          new Error(
            'Body must include tasks.'
          );

        err.statusCode = 400;

        throw err;
      }


      const pool =
        await getPool();


      const challenge =
        await getCurrentChallenge(pool);


      requireChallenge(
        challenge
      );


      assertChallengeDate(
        dateKey,
        challenge
      );


      const validTasks =
        await pool.request()

          .input(
            'challengeId',
            sql.Int,
            challenge.challengeId
          )

          .query(`
            SELECT taskId

            FROM dbo.Tasks

            WHERE
              challengeId =
                @challengeId

              AND
              isActive = 1;
          `);


      const validTaskIds =
        new Set(

          validTasks
            .recordset

            .map(
              row =>
                Number(
                  row.taskId
                )
            )
        );


      const tx =
        new sql.Transaction(
          pool
        );


      await tx.begin();


      try {

        for (
          const item of items
        ) {

          const taskId =
            Number(
              item.taskId
            );


          if (
            !validTaskIds.has(
              taskId
            )
          ) {

            const err =
              new Error(
                'Invalid task for this challenge.'
              );

            err.statusCode = 400;

            throw err;
          }


          const isDone =
            item.isDone
              ? 1
              : 0;


          await new sql.Request(tx)

            .input(
              'dateKey',
              sql.Date,
              dateKey
            )

            .input(
              'taskId',
              sql.Int,
              taskId
            )

            .input(
              'isDone',
              sql.Bit,
              isDone
            )

            .query(`
              MERGE
                dbo.DayStatus
                AS target

              USING
              (
                SELECT

                  @dateKey
                    AS dateKey,

                  @taskId
                    AS taskId
              )
              AS source

              ON
                target.dateKey =
                  source.dateKey

                AND
                target.taskId =
                  source.taskId

              WHEN MATCHED
              THEN

                UPDATE SET

                  isDone =
                    @isDone,

                  updatedAt =
                    SYSDATETIME()

              WHEN NOT MATCHED
              THEN

                INSERT
                (
                  dateKey,
                  taskId,
                  isDone,
                  updatedAt
                )

                VALUES
                (
                  @dateKey,
                  @taskId,
                  @isDone,
                  SYSDATETIME()
                );
            `);
        }


        await tx.commit();

      }
      catch (inner) {

        await tx.rollback();

        throw inner;
      }


      res.json({

        ok: true,

        dateKey

      });

    }
    catch (e) {

      next(e);
    }
  }
);


module.exports = router;