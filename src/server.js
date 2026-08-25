const { app } = require('./app');
const { PORT } = require('./config/env');
const { getPool } = require('./config/db');

async function boot() {
  // Ensure DB connection works at startup
  await getPool();
  app.listen(PORT, () => {
    console.log(`SDT running at http://localhost:${PORT}`);
  });
}

boot().catch(err => {
  console.error('Failed to start SDT:', err);
  process.exit(1);
});
