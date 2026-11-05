# A4 Pipeline

Candidate applies with a PDF resume. The server saves the application at once (status `Applied`)
and scores it in the background: parse the resume, match it to the job, save the score.

## Routes (mounted at /api)

| Route | Who | Result |
|---|---|---|
| `POST /api/jobs/:jobId/apply` (multipart, field `resume`) | candidate | `201 { id, jobId, status, pipelineStatus: "queued" }` |
| `GET /api/applications/:id/pipeline` | candidate who owns it, recruiter who owns the job | `{ id, pipelineStatus, error }` |
| `POST /api/applications/:id/reprocess` | recruiter who owns the job | `202 { id, pipelineStatus: "queued" }` |

`pipelineStatus` goes `queued`, `parsing`, `matching`, then `done` or `failed`.
Errors use `{ "error": "message" }`. Align this shape with the frontend `Api` error handling.

Rules: PDF only (checked by type, name and the `%PDF-` header), `MAX_UPLOAD_MB` limit (default 5),
one application per candidate per job, closed jobs refuse applications, stored file names are random.

## What this code expects from Sameer's parts

- `src/db.js` exports a mysql2/promise pool: `const [rows] = await db.query(sql, params)`.
  For INSERT the first value has `insertId`.
- `src/middleware/auth.js` exports `requireAuth` (sets `req.user = { id, role }`, 401 if not logged in)
  and `requireRole('candidate' | 'recruiter')` (403 if the role is wrong).
- `src/services/parser.js`: `async parseResume(filePath)` returns an object (skills, experience, education, text).
- `src/services/matcher.js`: `async scoreApplication({ job, parsed })` returns
  `{ score, breakdown, matched_skills, missing_skills, explanation }`.
  `job` is `{ id, title, description, required_skills: [] }`.
- Tables: `jobs(id, status, recruiter_id, title, description, required_skills)`, `applications(...)` as below.

## Columns the pipeline needs on `applications`

```sql
ALTER TABLE applications
  ADD COLUMN resume_path VARCHAR(500) NULL,
  ADD COLUMN parsed_json JSON NULL,
  ADD COLUMN score INT NULL,
  ADD COLUMN score_json JSON NULL,
  ADD COLUMN pipeline_status VARCHAR(20) NOT NULL DEFAULT 'queued',
  ADD COLUMN pipeline_error VARCHAR(500) NULL;
-- plus: job_id, candidate_id, status; and a unique key to stop double applications:
ALTER TABLE applications ADD UNIQUE KEY uq_job_candidate (job_id, candidate_id);
```
(Skip any column that already exists.)

## Mounting

```js
app.use('/api', require('./routes/pipeline'));
```
Install: `npm i multer` and for tests `npm i -D jest supertest`. Run: `npx jest`.

The scoring runs inside the server process. If the server restarts mid-run, the application would stay in
`parsing` or `matching`. Call `resetStuck()` once at start-up (it marks those runs `failed`), then a recruiter can use `reprocess`:

```js
require('./services/pipeline').resetStuck().catch(console.error);
```
