function errorHandler(err, req, res, next) {
  console.error('[SDT_ERROR]', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    ok: false,
    error: status === 500 ? 'Internal Server Error' : (err.message || 'Error')
  });
}

module.exports = { errorHandler };
