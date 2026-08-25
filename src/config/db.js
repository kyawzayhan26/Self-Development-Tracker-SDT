const sql = require('mssql');
const { DB } = require('./env');

let pool;

/**
 * Returns a shared connection pool.
 */
async function getPool() {
  if (pool) return pool;
  pool = await sql.connect({
    user: DB.user,
    password: DB.password,
    server: DB.server,
    port: DB.port,
    database: DB.database,
    options: {
      encrypt: false,          // local dev
      trustServerCertificate: true
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  });
  return pool;
}

module.exports = { sql, getPool };
