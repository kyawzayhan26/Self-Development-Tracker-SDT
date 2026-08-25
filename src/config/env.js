require('dotenv').config();

function must(name, fallback = undefined) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

module.exports = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  DB: {
    server: must('DB_SERVER'),
    port: parseInt(process.env.DB_PORT || '1433', 10),
    user: must('DB_USER'),
    password: must('DB_PASSWORD'),
    database: must('DB_DATABASE', 'SDT')
  }
};
