const { app } =
  require('./app');

const { PORT } =
  require('./config/env');


/*
 * ============================================================
 * SDT V2 - SERVER STARTUP
 * ============================================================
 *
 * V2 no longer requires a local SQL Server connection during
 * startup.
 *
 * Application data is stored in Supabase PostgreSQL and
 * accessed through authenticated Supabase requests.
 * ============================================================
 */

function boot() {

  app.listen(
    PORT,
    () => {

      console.log(
        `SDT running at http://localhost:${PORT}`
      );

      console.log(
        'Database: Supabase PostgreSQL'
      );
    }
  );
}


boot();