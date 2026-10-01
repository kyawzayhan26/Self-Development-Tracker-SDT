const path = require('path');
const express = require('express');

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
} = require('./middleware/errorHandler');


const app = express();


/*
 * JSON body parser
 */
app.use(
  express.json()
);


/*
 * Public Supabase configuration
 *
 * These values are safe to expose to the browser:
 * - Supabase project URL
 * - Supabase publishable key
 *
 * Never expose a Supabase secret/service-role key here.
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

      return res.status(500).json({
        error:
          'Supabase browser configuration is incomplete.'
      });

    }

    res.json({
      supabaseUrl,
      supabasePublishableKey
    });

  }
);


/*
 * Static frontend
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
 * Health check
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
 * Error handler
 */
app.use(
  errorHandler
);


module.exports = {
  app
};