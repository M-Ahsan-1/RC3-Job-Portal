// tests for src/middleware/security.js, each test builds its own app so the rate limit counters start fresh
const express = require('express');
const request = require('supertest');
const { applySecurity, apiNotFound, errorHandler } = require('../src/middleware/security');

const ENV_KEYS = ['CORS_ORIGINS', 'RATE_LIMIT_MAX', 'AUTH_RATE_LIMIT_MAX', 'JSON_LIMIT', 'CSP_OFF'];

function build(env = {}) {
  ENV_KEYS.forEach((k) => delete process.env[k]);
  Object.assign(process.env, env);

  const app = express();
  applySecurity(app);
  app.get('/api/ping', (req, res) => res.json({ ok: true }));
  app.post('/api/echo', (req, res) => res.json(req.body));
  app.post('/api/auth/login', (req, res) => res.json({ ok: true }));
  app.use('/api', apiNotFound);
  app.use(errorHandler);
  return app;
}

afterAll(() => {
  ENV_KEYS.forEach((k) => delete process.env[k]);
});

describe('security headers', () => {
  test('sets the usual helmet headers and hides express', async () => {
    const res = await request(build()).get('/api/ping');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  test('CSP_OFF=true drops the csp header', async () => {
    const res = await request(build({ CSP_OFF: 'true' })).get('/api/ping');
    expect(res.headers['content-security-policy']).toBeUndefined();
  });

  test('csp does not force https upgrades (breaks localhost)', async () => {
    const res = await request(build()).get('/api/ping');
    expect(res.headers['content-security-policy']).not.toMatch(/upgrade-insecure-requests/);
  });
});

describe('cors', () => {
  test('lets a listed origin through', async () => {
    const app = build({ CORS_ORIGINS: 'http://localhost:5173, https://app.example.com' });
    const res = await request(app).get('/api/ping').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  test('gives no cors headers to an origin that is not listed', async () => {
    const app = build({ CORS_ORIGINS: 'http://localhost:5173' });
    const res = await request(app).get('/api/ping').set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('requests without an origin still work', async () => {
    const res = await request(build()).get('/api/ping');
    expect(res.status).toBe(200);
  });
});

describe('rate limiting', () => {
  test('returns 429 with json once the limit is used up', async () => {
    const app = build({ RATE_LIMIT_MAX: '3' });
    for (let i = 0; i < 3; i++) {
      await request(app).get('/api/ping').expect(200);
    }
    const res = await request(app).get('/api/ping');
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many/i);
  });

  test('login route has its own tighter limit', async () => {
    const app = build({ AUTH_RATE_LIMIT_MAX: '2' });
    await request(app).post('/api/auth/login').send({}).expect(200);
    await request(app).post('/api/auth/login').send({}).expect(200);
    await request(app).post('/api/auth/login').send({}).expect(429);
    // the rest of the api is not affected by the login cap
    await request(app).get('/api/ping').expect(200);
  });
});

describe('body limits and errors', () => {
  test('rejects a json body over the limit with 413', async () => {
    const app = build({ JSON_LIMIT: '1kb' });
    const res = await request(app).post('/api/echo').send({ text: 'x'.repeat(5000) });
    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/too large/i);
  });

  test('accepts a normal sized body', async () => {
    const res = await request(build()).post('/api/echo').send({ hello: 'world' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hello: 'world' });
  });

  test('broken json gets a 400 instead of a stack trace', async () => {
    const res = await request(build())
      .post('/api/echo')
      .set('Content-Type', 'application/json')
      .send('{"oops": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid json/i);
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js/);
  });

  test('unknown api route returns json 404', async () => {
    const res = await request(build()).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});
