const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

/**
 * GET /api/tasks
 * Returns active tasks
 */
router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT taskId, name, isActive, sortOrder
      FROM dbo.Tasks
      WHERE isActive = 1
      ORDER BY sortOrder ASC, taskId ASC
    `);
    res.json({ ok: true, tasks: r.recordset });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
