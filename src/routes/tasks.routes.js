const express = require('express');

const router = express.Router();

const {
  getPool,
  sql
} = require('../config/db');


router.get('/', async (req, res, next) => {

  try {

    const pool =
      await getPool();


    const challengeResult =
      await pool.request().query(`
        SELECT TOP 1 challengeId

        FROM dbo.Challenges

        WHERE status = N'ACTIVE'

        ORDER BY challengeId DESC;
      `);


    if (
      challengeResult.recordset.length === 0
    ) {

      return res.json({
        ok: true,
        tasks: []
      });

    }


    const challengeId =
      challengeResult
        .recordset[0]
        .challengeId;


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
            isActive,
            sortOrder

          FROM dbo.Tasks

          WHERE challengeId = @challengeId
            AND isActive = 1

          ORDER BY
            sortOrder ASC,
            taskId ASC;
        `);


    res.json({
      ok: true,
      tasks: result.recordset
    });

  }
  catch (e) {

    next(e);

  }

});


module.exports = router;