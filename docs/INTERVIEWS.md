# A7 Interviews

## Routes (mounted at /api)

| Route | Who | Result |
|---|---|---|
| `GET /api/interviews` | recruiter (their jobs) or candidate (their own) | list, soonest first, max 200 |
| `POST /api/interviews` | recruiter who owns the job | `201` the new interview |
| `PATCH /api/interviews/:id` body `{ status }` | recruiter who owns the interview | `{ id, status }` |

List item: `{ id, applicationId, applicantName, jobTitle, scheduledAt (ISO, UTC), mode, location, status, notes }`.
`notes` are private to the recruiter and are never sent to candidates.

POST body: `{ applicationId, scheduledAt (ISO string), mode: "Online" | "On-site" | "Phone", location, notes }`.

Rules: time must be in the future and within one year; location under 300 characters, notes under 1000;
rejected applicants cannot be scheduled; no second interview within an hour for the same recruiter or the
same applicant (cancelled and completed interviews do not count). PATCH only accepts `Completed` or
`Cancelled`, and only from `Scheduled`. Errors use `{ "error": "message" }`.

## Table

```sql
CREATE TABLE interviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  recruiter_id INT NOT NULL,
  scheduled_at DATETIME NOT NULL,
  mode VARCHAR(20) NOT NULL DEFAULT 'Online',
  location VARCHAR(300) NOT NULL DEFAULT '',
  notes VARCHAR(1000) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  INDEX idx_recruiter_time (recruiter_id, scheduled_at),
  INDEX idx_application (application_id)
);
```

## What this expects from Sameer's parts

- `db.js` is a mysql2 promise pool created with `timezone: 'Z'` so DATETIME values are read and written as UTC.
- `users(id, name)`, `jobs(id, title, recruiter_id)`, `applications(id, job_id, candidate_id, status)`.
- Same `requireAuth` and `requireRole` as the pipeline route.

## Mounting

```js
app.use('/api', require('./routes/interviews'));
```

Known limit: two requests at the very same moment could both pass the clash check. For a small
team this is fine; a database lock would be needed for heavy use.
The frontend mock also writes "Interview scheduled" into the audit trail. That needs the
history table, which is not part of this file.
