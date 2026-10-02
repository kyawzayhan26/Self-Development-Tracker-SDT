const path =
  require('path');

const express =
  require('express');


const tasksRoutes =
  require('./routes/tasks.routes');

const daysRoutes =
  require('./routes/days.routes');

const challengesRoutes =
  require('./routes/challenges.routes');

const reportsRoutes =
  require('./routes/reports.routes');


const {
  errorHandler
} =
  require('./middleware/errorHandler');


const {
  requireAuth
} =
  require('./middleware/auth');


const app =
  express();


/*
 * ============================================================
 * REQUEST BODY
 * ============================================================
 */

app.use(
  express.json()
);


/*
 * ============================================================
 * PUBLIC CONFIG
 * ============================================================
 *
 * Required before authentication so the browser can initialise
 * Supabase Auth.
 *
 * Only browser-safe values are returned.
 */

app.get(
  '/api/config',
  (req, res) => {

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const supabasePublishableKey =
      process.env.SUPABASE_PUBLISHABLE_KEY;


    if (
      !supabaseUrl ||
      !supabasePublishableKey
    ) {

      return res
        .status(500)
        .json({
          ok: false,
          error:
            'Supabase browser configuration is incomplete.'
        });
    }


    res.json({
      ok: true,
      supabaseUrl,
      supabasePublishableKey
    });
  }
);


/*
 * ============================================================
 * STATIC FRONTEND
 * ============================================================
 */

app.use(
  express.static(
    path.join(
      __dirname,
      '..',
      'public'
    )
  )
);


/*
 * ============================================================
 * PROTECTED SDT API
 * ============================================================
 *
 * Everything below /api requires a valid Supabase session.
 *
 * /api/config is above this middleware and therefore remains
 * publicly accessible.
 */

app.use(
  '/api',
  requireAuth
);


/*
 * Challenge API
 */

app.use(
  '/api/challenges',
  challengesRoutes
);


/*
 * Reports API
 */

app.use(
  '/api/reports',
  reportsRoutes
);


/*
 * Task API
 */

app.use(
  '/api/tasks',
  tasksRoutes
);


/*
 * Calendar month API
 */

app.use(
  '/api/days',
  daysRoutes
);


/*
 * Individual day API
 */

app.use(
  '/api/day',
  daysRoutes
);


/*
 * Progress + strikes API
 */

app.use(
  '/api/progress',
  daysRoutes
);


/*
 * ============================================================
 * HEALTH CHECK
 * ============================================================
 *
 * Intentionally public.
 */

app.get(
  '/health',
  (req, res) => {

    res.json({
      ok: true,
      app: 'SDT'
    });
  }
);


/*
 * ============================================================
 * ERROR HANDLER
 * ============================================================
 */

app.use(
  errorHandler
);


module.exports = app;
module.exports.app = app;