const express = require('express');

const router = express.Router();

const {
  getPool,
  sql
} = require('../config/db');


/*
 * Automatically complete challenges whose
 * planned final day has passed.
 *
 * Example:
 *
 * Challenge ends Aug 30.
 * It remains ACTIVE throughout Aug 30.
 *
 * On Aug 31 it becomes COMPLETED/NATURAL.
 */
async function completeExpiredChallenges(pool){

  await pool.request().query(`
    UPDATE dbo.Challenges

    SET
      status = N'COMPLETED',

      completedAt =
        COALESCE(
          completedAt,
          SYSDATETIME()
        ),

      completionReason =
        COALESCE(
          completionReason,
          N'NATURAL'
        )

    WHERE
      status = N'ACTIVE'

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
}


/*
 * GET /api/challenges/current
 */
router.get(
  '/current',
  async (req, res, next) => {

    try {

      const pool =
        await getPool();


      await completeExpiredChallenges(
        pool
      );


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
            status,
            completedAt,
            completionReason,
            createdAt

          FROM dbo.Challenges

          WHERE
            status = N'ACTIVE'

          ORDER BY
            challengeId DESC;
        `);


      if (
        challengeResult.recordset.length === 0
      ) {

        return res.json({

          ok: true,

          challenge:
            null

        });
      }


      const challenge =
        challengeResult.recordset[0];


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


      challenge.tasks =
        tasksResult.recordset;


      res.json({

        ok: true,

        challenge

      });

    }
    catch (e) {

      next(e);
    }
  }
);


/*
 * GET /api/challenges/latest-completed
 *
 * Used when SDT opens after a challenge
 * naturally finishes.
 */
router.get(
  '/latest-completed',
  async (req, res, next) => {

    try {

      const pool =
        await getPool();


      await completeExpiredChallenges(
        pool
      );


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
            status,
            completionReason,
            completedAt

          FROM dbo.Challenges

          WHERE
            status = N'COMPLETED'

          ORDER BY

            completedAt DESC,
            challengeId DESC;
        `);


      res.json({

        ok: true,

        challenge:
          result.recordset[0] ||
          null

      });

    }
    catch (e) {

      next(e);
    }
  }
);


/*
 * POST /api/challenges/start
 */
router.post(
  '/start',
  express.json(),
  async (req, res, next) => {

    try {

      const name =
        String(
          req.body?.name || ''
        ).trim();


      const startDate =
        String(
          req.body?.startDate || ''
        ).trim();


      const durationDays =
        Number(
          req.body?.durationDays
        );


      const strikesAllowed =
        Number(
          req.body?.strikesAllowed
        );


      const incomingTasks =
        req.body?.tasks;


      if (!name) {

        const err =
          new Error(
            'Challenge name is required.'
          );

        err.statusCode = 400;

        throw err;
      }


      if (
        name.length > 150
      ) {

        const err =
          new Error(
            'Challenge name is too long.'
          );

        err.statusCode = 400;

        throw err;
      }


      if (
        !/^\d{4}-\d{2}-\d{2}$/
          .test(startDate)
      ) {

        const err =
          new Error(
            'Start date must use YYYY-MM-DD.'
          );

        err.statusCode = 400;

        throw err;
      }


      if (
        !Number.isInteger(
          durationDays
        ) ||

        durationDays < 1 ||

        durationDays > 365
      ) {

        const err =
          new Error(
            'Challenge duration must be between 1 and 365 days.'
          );

        err.statusCode = 400;

        throw err;
      }


      if (
        !Number.isInteger(
          strikesAllowed
        ) ||

        strikesAllowed < 0 ||

        strikesAllowed > 99
      ) {

        const err =
          new Error(
            'Strikes allowed must be between 0 and 99.'
          );

        err.statusCode = 400;

        throw err;
      }


      if (
        !Array.isArray(
          incomingTasks
        ) ||

        incomingTasks.length === 0
      ) {

        const err =
          new Error(
            'Add at least one rule or task.'
          );

        err.statusCode = 400;

        throw err;
      }


      if (
        incomingTasks.length > 100
      ) {

        const err =
          new Error(
            'Maximum 100 tasks allowed.'
          );

        err.statusCode = 400;

        throw err;
      }


      const tasks =
        incomingTasks

          .map(task => {

            if (
              typeof task ===
              'string'
            ) {

              return task.trim();
            }

            return String(
              task?.name || ''
            ).trim();

          })

          .filter(Boolean);


      if (
        tasks.length === 0
      ) {

        const err =
          new Error(
            'Add at least one valid task.'
          );

        err.statusCode = 400;

        throw err;
      }


      for (
        const task of tasks
      ) {

        if (
          task.length > 200
        ) {

          const err =
            new Error(
              'Each task must be 200 characters or fewer.'
            );

          err.statusCode = 400;

          throw err;
        }
      }


      const normalized =
        tasks.map(
          task =>
            task.toLowerCase()
        );


      if (
        new Set(
          normalized
        ).size !==
        normalized.length
      ) {

        const err =
          new Error(
            'Duplicate tasks are not allowed.'
          );

        err.statusCode = 400;

        throw err;
      }


      const pool =
        await getPool();


      await completeExpiredChallenges(
        pool
      );


      const existing =
        await pool.request().query(`
          SELECT TOP 1
            challengeId

          FROM dbo.Challenges

          WHERE
            status = N'ACTIVE';
        `);


      if (
        existing.recordset.length > 0
      ) {

        const err =
          new Error(
            'An active challenge already exists.'
          );

        err.statusCode = 409;

        throw err;
      }


      const tx =
        new sql.Transaction(
          pool
        );


      await tx.begin();


      try {

        const challengeInsert =
          await new sql.Request(tx)

            .input(
              'name',
              sql.NVarChar(150),
              name
            )

            .input(
              'startDate',
              sql.Date,
              startDate
            )

            .input(
              'durationDays',
              sql.Int,
              durationDays
            )

            .input(
              'strikesAllowed',
              sql.Int,
              strikesAllowed
            )

            .query(`
              INSERT INTO dbo.Challenges
              (
                name,
                startDate,
                durationDays,
                strikesAllowed,
                status,
                completedAt,
                completionReason
              )

              OUTPUT
                INSERTED.challengeId

              VALUES
              (
                @name,
                @startDate,
                @durationDays,
                @strikesAllowed,
                N'ACTIVE',
                NULL,
                NULL
              );
            `);


        const challengeId =
          challengeInsert
            .recordset[0]
            .challengeId;


        for (
          let i = 0;
          i < tasks.length;
          i++
        ) {

          await new sql.Request(tx)

            .input(
              'challengeId',
              sql.Int,
              challengeId
            )

            .input(
              'name',
              sql.NVarChar(200),
              tasks[i]
            )

            .input(
              'sortOrder',
              sql.Int,
              i + 1
            )

            .query(`
              INSERT INTO dbo.Tasks
              (
                challengeId,
                name,
                isActive,
                sortOrder
              )

              VALUES
              (
                @challengeId,
                @name,
                1,
                @sortOrder
              );
            `);
        }


        await tx.commit();


        res.status(201).json({

          ok: true,

          challengeId

        });

      }
      catch (inner) {

        await tx.rollback();

        throw inner;
      }

    }
    catch (e) {

      next(e);
    }
  }
);


/*
 * POST /api/challenges/current/end
 *
 * Manual end.
 *
 * Nothing is deleted.
 */
router.post(
  '/current/end',
  async (req, res, next) => {

    try {

      const pool =
        await getPool();


      const currentResult =
        await pool.request().query(`
          SELECT TOP 1

            challengeId,
            name

          FROM dbo.Challenges

          WHERE
            status = N'ACTIVE'

          ORDER BY
            challengeId DESC;
        `);


      if (
        currentResult.recordset.length === 0
      ) {

        const err =
          new Error(
            'There is no active challenge to end.'
          );

        err.statusCode = 404;

        throw err;
      }


      const currentChallenge =
        currentResult.recordset[0];


      const updateResult =
        await pool.request()

          .input(
            'challengeId',
            sql.Int,
            currentChallenge.challengeId
          )

          .query(`
            UPDATE dbo.Challenges

            SET

              status =
                N'COMPLETED',

              completedAt =
                SYSDATETIME(),

              completionReason =
                N'MANUAL'

            OUTPUT
              INSERTED.completedAt

            WHERE
              challengeId =
                @challengeId

              AND
              status =
                N'ACTIVE';
          `);


      res.json({

        ok: true,

        challengeId:
          currentChallenge.challengeId,

        name:
          currentChallenge.name,

        status:
          'COMPLETED',

        completionReason:
          'MANUAL',

        completedAt:
          updateResult
            .recordset[0]
            ?.completedAt ||
          null

      });

    }
    catch (e) {

      next(e);
    }
  }
);


module.exports = router;