const config = require('../config');

// Simple CORS: allow the storefront origin (and any origin in development).
function cors(req, res, next) {
  const origin = req.headers.origin;
  if (origin) {
    const allowed = !process.env.NODE_ENV || process.env.NODE_ENV !== 'production' || origin === config.frontendUrl;
    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Filename');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
}

function notFound(req, res) {
  res.status(404).json({ message: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  let message = err.message || 'Server error';
  if (err.code === 'ER_DUP_ENTRY' || /UNIQUE constraint/.test(message)) {
    return res.status(422).json({ message: 'This value already exists (duplicate).' });
  }
  if (status >= 500 && process.env.NODE_ENV === 'production') message = 'Server error';
  res.status(status).json({ message, ...(err.extra || {}) });
}

module.exports = { cors, notFound, errorHandler };
