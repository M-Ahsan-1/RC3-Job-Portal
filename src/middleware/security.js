// basic hardening for the api: headers, cors, rate limits and body size caps.
// call applySecurity(app) before any routes, then apiNotFound and errorHandler after them.
// everything is read from env at call time so tests can change it per app.
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

function csv(value) {
  return (value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function limiter(limit, windowMs) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, try again in a bit' },
  });
}

function applySecurity(app) {
  const env = process.env;

  // only matters behind nginx or a load balancer, otherwise every user looks like one ip
  if (env.TRUST_PROXY && !Number.isNaN(Number(env.TRUST_PROXY))) {
    app.set('trust proxy', Number(env.TRUST_PROXY));
  }

  // our pages use inline scripts and onclick handlers, so 'unsafe-inline' stays for now.
  // if a page breaks because of csp, set CSP_OFF=true while you track it down.
  app.use(
    helmet({
      contentSecurityPolicy:
        env.CSP_OFF === 'true'
          ? false
          : {
              useDefaults: true,
              directives: {
                'script-src': ["'self'", "'unsafe-inline'"],
                'script-src-attr': ["'unsafe-inline'"],
                'style-src': ["'self'", "'unsafe-inline'", 'https:'],
                'img-src': ["'self'", 'data:'],
                'font-src': ["'self'", 'https:', 'data:'],
                // plain http on localhost and docker would break with this on
                'upgrade-insecure-requests': null,
              },
            },
    })
  );

  // frontend is served from the same server so it doesn't need cors at all.
  // CORS_ORIGINS is only for when the frontend runs somewhere else, comma separated.
  const allowed = csv(env.CORS_ORIGINS);
  app.use(
    '/api',
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true); // curl, same origin, server to server
        cb(null, allowed.includes(origin));
      },
      credentials: true,
    })
  );

  const windowMs = (Number(env.RATE_LIMIT_WINDOW_MIN) || 15) * 60 * 1000;
  app.use('/api', limiter(Number(env.RATE_LIMIT_MAX) || 300, windowMs));
  // login and register get a much tighter cap so passwords can't be guessed all day
  app.use('/api/auth', limiter(Number(env.AUTH_RATE_LIMIT_MAX) || 20, windowMs));

  // json and form bodies are capped. resume uploads go through multer, see MAX_UPLOAD_MB
  const bodyLimit = env.JSON_LIMIT || '100kb';
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: bodyLimit }));
}

// put this after all the routes so unknown api urls get json instead of an html page
function apiNotFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// last middleware in the chain, keeps stack traces away from the client
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large' });
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side' });
}

module.exports = { applySecurity, apiNotFound, errorHandler };
