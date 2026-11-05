# RC3 Job Portal

A job portal where recruiters post jobs and candidates apply with a PDF resume. When someone applies, the backend parses the resume, matches it against the job requirements and saves a score. Recruiters then review applicants, override scores, move people through a pipeline, schedule interviews and look at analytics.

Frontend is plain HTML, CSS and JavaScript. Backend is Node with Express.

## Who owns what

Ahsan: everything inside `frontend/`, plus the pipeline, interviews and analytics routes, tests, docs and Docker.
Sameer: database, server, auth, jobs, resume parsing, matching, Gemini services and advanced search.

Branches are `main`, `ahsan` (frontend and my backend routes) and `sameer` (his backend). Merge `ahsan` into `main` first, then `sameer`.

## Folder layout

```
RC3-Job-Portal/
├── frontend/        pages, css and js (mock files live in frontend/js)
├── src/
│   ├── routes/      pipeline.js, interviews.js, analytics.js
│   ├── services/    pipeline.js (parser.js and matcher.js are Sameer's)
│   └── middleware/  auth goes here (Sameer)
├── tests/           jest tests for the routes above
├── docs/            API.md, PIPELINE.md, INTERVIEWS.md, ANALYTICS.md
├── samples/         three test resumes: strong, medium, weak
├── Dockerfile
└── docker-compose.yml
```

## Running it locally

You need Node 20 or newer.

```
npm install
copy .env.example .env
npm start
```

On Linux or Mac, use `cp` instead of `copy`. Fill in `.env` before starting, the file lists every variable the app reads. The server listens on port 3000 unless `PORT` says otherwise, so open `http://localhost:3000`.

### Environment variables

Copy `.env.example` to `.env` and fill it in. Never commit `.env`.

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `NODE_ENV` | `development` | `development` or `production` |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | `change_me` | MySQL password. Change it |
| `DB_NAME` | `rc3_job_portal` | MySQL database name |
| `JWT_SECRET` | `change_me_to_a_long_random_string` | Secret used to sign login tokens. Use a long random value |
| `JWT_EXPIRES_IN` | `1d` | How long a login token stays valid |
| `GEMINI_API_KEY` | none | Gemini key for resume parsing, matching and explanations |
| `UPLOAD_DIR` | `uploads` | Folder where uploaded resumes are stored |
| `MAX_UPLOAD_MB` | `5` | Largest resume upload allowed, in MB |
| `CORS_ORIGINS` | empty | Origins the browser may call the API from, comma separated |
| `RATE_LIMIT_MAX` | `300` | Most requests one client may make per rate limit window |
| `RATE_LIMIT_WINDOW_MIN` | `15` | Length of the rate limit window, in minutes |
| `AUTH_RATE_LIMIT_MAX` | `20` | Stricter request limit for the login and register routes |
| `JSON_LIMIT` | `100kb` | Largest JSON request body the server accepts |
| `TRUST_PROXY` | empty | Set when the app runs behind a proxy or load balancer, so client IPs and rate limits are read correctly |
| `CSP_OFF` | `false` | Set to `true` to turn off the Content Security Policy header, for debugging only |

`.env.example` is the full list. If you add a variable to the code, add it there and here.

Note: `npm start` only works once Sameer's `src/server.js` is in the repo and a `start` script exists in `package.json`.

## Mock mode vs the real backend

The frontend can run on its own with fake data. In `frontend/js/api.js` there is a `USE_MOCK` switch.

With `USE_MOCK = true`, every call is answered by `frontend/js/mock.js`, so you can open the pages straight from disk, no server needed. Good for working on the UI. `mock.js` follows `docs/API.md`, so it is the only mock file the pages should load.

With `USE_MOCK = false`, calls go to the real `/api` routes. When you switch, remove the `mock.js` script tag from every page. The older helper files (`mock-extra.js`, `mock-applicants.js`, `mock-jobs.js`, `mock-candidate.js`) are retired: take their script tags out of any page that still has one and delete the files.

## Tests

```
npx jest
```

The tests mock the database, auth and Sameer's parser and matcher, so they run without any of his files. That also means a green run says nothing about the real database. Run the app against the real thing before you trust it.

## Docker

```
copy .env.example .env
docker compose up --build
```

Stop it with `docker compose down`. Uploaded resumes are kept in a named volume, so they survive restarts. There is no database service in the compose file yet, it gets added once the database choice is settled.

## API docs

Each feature has its own doc in `docs/`: `API.md` for the general routes, `PIPELINE.md` for the apply and scoring flow, `INTERVIEWS.md` and `ANALYTICS.md` for the other two. If the frontend and backend ever disagree about a field name, `API.md` is the tiebreaker.

One thing the database needs: the `applications` table must have an `override_score` column next to `score` and `score_json`, because analytics and the override route both use it.

## Sample resumes

`samples/` has `resume-strong.pdf`, `resume-medium.pdf` and `resume-weak.pdf`. Upload them against the same job to check that the scores come out in a sensible order.