# API contract

This is the contract between the frontend (Ahsan) and the backend (Sameer). It is taken from `frontend/js/mock.js`, which is what the pages were built against. If the real backend and this file disagree, fix one of them and tell the other person, don't let it drift.

## Conventions

- Base path is `/api`. Requests and responses are JSON, except resume upload which is `multipart/form-data`.
- Auth: send `Authorization: Bearer <token>` on every request after login.
- Ids are numbers. Dates are ISO 8601 strings in UTC.
- Field names are camelCase, with these snake_case exceptions that the frontend already reads: `score_json`, `matched_skills`, `learning_areas`, `unsupported_claims`, and everything on interviews and analytics (`scheduled_at`, `duration_minutes`, `active_jobs` and so on). Keep them exactly as written.
- Errors always come back as `{ "error": "Human readable message" }` with a matching HTTP status. The frontend shows that message as is, so write it for the user, not for a developer.
- A 401 on any page except login and register logs the user out and sends them to `login.html`.

| Status | Used for |
|---|---|
| 400 | Bad input, or a status change that is not allowed |
| 401 | Missing or expired token |
| 403 | Wrong role |
| 404 | Job, application, question or interview not found |
| 409 | Conflict: already applied, job closed, no assessment yet, interview clash |
| 413 | Resume over 5 MB |
| 422 | AI could not extract anything from a job description |

Roles are `recruiter` and `candidate`. "Recruiter only" routes return 403 for candidates. A recruiter should only ever see their own jobs and the applications on them.

## Application statuses

```
Submitted -> Parsed -> AI Assessment Available -> Recruiter Review -> Shortlisted -> Interview -> Selected
```

Any status except Selected and Rejected can also go to `Rejected`. Selected and Rejected are final. Allowed next steps:

| From | To |
|---|---|
| Submitted | Parsed, Rejected |
| Parsed | AI Assessment Available, Rejected |
| AI Assessment Available | Recruiter Review, Rejected |
| Recruiter Review | Shortlisted, Rejected |
| Shortlisted | Interview, Rejected |
| Interview | Selected, Rejected |

Anything else is a 400, and the message lists the allowed next steps. Every change is written to the application's history.

## Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` |
| POST | `/api/auth/register` | `{ name, email, password, role }` | `{ token, user }` |
| POST | `/api/auth/logout` | none | `{ message }` |

`user` is `{ id, name, email, role }`. Wrong login is a 401 with "Incorrect email or password. Please try again." A duplicate email on register is a 409.

## Jobs

A job looks like this:

```json
{
  "id": 1,
  "title": "Backend Developer",
  "department": "Engineering",
  "location": "Lahore",
  "type": "Full-time",
  "salary": "PKR 250k to 350k",
  "description": "...",
  "experienceYears": 2,
  "qualifications": "BS in Computer Science or equivalent experience",
  "status": "open",
  "createdAt": "2026-11-01T09:00:00Z",
  "applicantCount": 4,
  "skills": [
    { "skill": "Python", "requirement": "required", "importance": "high" }
  ]
}
```

`requirement` is `required` or `preferred`. `importance` is `high`, `medium` or `low`. `status` is `open` or `closed`.

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/jobs` | recruiter | The recruiter's own jobs, with `applicantCount` |
| GET | `/api/jobs/open` | any logged in user | Open jobs only |
| GET | `/api/jobs/:id` | any logged in user | 404 if missing |
| POST | `/api/jobs` | recruiter | Body is the job fields. `title` is required (400 otherwise). Returns the new job, status `open` |
| PUT | `/api/jobs/:id` | recruiter | Partial update of the same fields, including `skills` |
| PATCH | `/api/jobs/:id/close` | recruiter | Returns the job. Candidates can no longer apply |
| PATCH | `/api/jobs/:id/reopen` | recruiter | Returns the job |
| POST | `/api/jobs/extract-requirements` | recruiter | Body `{ title, description }`. Returns `{ skills: [...], source }`. 422 if nothing could be read |
| GET | `/api/jobs/:id/applicants` | recruiter | Applicants view (see below), sorted by `effectiveScore`, highest first |

## Applications

An applicant as the recruiter sees it:

```json
{
  "id": 102,
  "jobId": 1,
  "candidateId": 4,
  "candidateName": "Bilal Ahmed",
  "email": "bilal@example.com",
  "phone": "+92 300 5550101",
  "status": "Recruiter Review",
  "score": 53,
  "overrideScore": null,
  "overrideReason": null,
  "effectiveScore": 53,
  "appliedAt": "2026-11-02T11:10:00Z",
  "updatedAt": "2026-11-03T09:05:00Z",
  "resumeFileName": "bilal-resume.pdf",
  "score_json": {
    "total": 53,
    "breakdown": { "skills": 41, "experience": 62, "projects": 58, "qualifications": 64 },
    "matched_skills": [
      { "skill": "Python", "similarity": 0.89, "verified": true, "excerpt": "Developed internal tools in Python and Flask." }
    ],
    "gaps": [
      { "skill": "Django", "label": "no_evidence" },
      { "skill": "Docker", "label": "confirmed_absent" }
    ],
    "explanation": "Short plain language summary.",
    "learning_areas": ["Django framework", "Docker fundamentals"],
    "unsupported_claims": [
      { "claim": "REST API design", "excerpt": "...", "reason": "...", "reviewed": false }
    ]
  },
  "history": [
    { "from": null, "to": "Submitted", "changedBy": "Bilal Ahmed", "at": "2026-11-02T11:10:00Z" }
  ],
  "notes": [
    { "id": 1, "text": "...", "author": "Hina Recruiter", "at": "2026-11-03T09:12:00Z" }
  ]
}
```

`effectiveScore` is `overrideScore` when there is one, otherwise `score`. `score` and `score_json` are `null` until the resume has been scored. `gaps[].label` is `no_evidence` or `confirmed_absent`.

The total score is a weighted sum of the four breakdown values: skills 40%, experience 25%, projects 20%, qualifications 15%. Required skills weigh 1.5 against 1 for preferred, and importance weighs 3, 2 and 1 for high, medium and low. A matched skill with `verified: false` counts at 75%. A gap marked `confirmed_absent` scores zero for that skill.

The candidate sees a smaller view of their own application:

```json
{ "id": 102, "jobId": 1, "jobTitle": "Backend Developer", "status": "Submitted",
  "appliedAt": "...", "timeline": [ { "status": "Submitted", "at": "..." } ] }
```

### Applying (candidate)

`POST /api/applications`, multipart form with `jobId` and `resume` (a PDF).

Returns `{ application, jobTitle }` where `application` is the candidate view above, with status `Submitted`. Errors:

| Case | Status |
|---|---|
| No file | 400 |
| Not a PDF | 400 |
| Over 5 MB | 413 |
| Job not found | 404 |
| Job closed | 409 |
| Already applied to this job | 409 |

After the upload the backend parses and scores the resume in the background and moves the status along: Parsed, then AI Assessment Available. The candidate gets a notification when the application is received.

### Recruiter actions on an application

All of these are recruiter only and take the application id in the path.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/applications/:id` | none | Applicant view, same shape as the applicants list. 404 if not found |
| POST | `/api/applications/:id/assess` | none | Applicant view with the score recalculated. 409 if the resume is not parsed yet |
| PATCH | `/api/applications/:id/status` | `{ status }` | Applicant view. 400 for a status that is not an allowed next step |
| PATCH | `/api/applications/:id/override` | `{ score, reason }` | Applicant view. `score` is 0 to 100, `reason` is at least 10 characters. Both are written to history |
| POST | `/api/applications/:id/explain` | none | `{ applicationId, explanation }`. 409 if not assessed |
| POST | `/api/applications/:id/learning-areas` | none | `{ applicationId, learning_areas }`. 409 if not assessed |
| PATCH | `/api/applications/:id/skills` | see below | Applicant view with the score recalculated |
| GET | `/api/applications/:id/notes` | none | Array of notes |
| POST | `/api/applications/:id/notes` | `{ text }` | The new note. Required, 1000 characters at most |
| GET | `/api/applications/:id/history` | none | Array of history entries, oldest first |
| POST | `/api/applications/:id/decision` | `{ decision, reason }` | `{ application, notification }`. `decision` is `Selected` or `Rejected`, `reason` is required |
| POST | `/api/applications/:id/fairness-test` | none | See below. 409 if not assessed |

`PATCH .../skills` takes `{ skill }` plus one of:

- `{ verified: true | false }` to mark a matched skill as verified or not
- `{ label: "no_evidence" | "confirmed_absent" }` to label a gap. Confirming absence removes it from `matched_skills`
- optionally `{ claim, reviewed }` to mark an unsupported claim as reviewed

Any of these recalculates `score_json.breakdown.skills`, `score_json.total` and `score`.

Fairness test result:

```json
{ "applicationId": 102, "original_score": 53, "anonymised_score": 53, "difference": 0,
  "unchanged": true, "protected_attributes_excluded": ["age", "gender", "..."], "note": "..." }
```

Every status change, override, decision and note must show up in `history`, with who did it and when. That is the audit trail.

## Interview questions

A question is `{ id, applicationId, level, text, guideline, skill }`. `level` is `beginner`, `intermediate` or `advanced`. `skill` can be `null`.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/applications/:id/questions/generate` | none | The application's questions. Returns the existing ones if they were already generated. 409 if not assessed |
| GET | `/api/applications/:id/questions` | none | Array of questions |
| PUT | `/api/questions/:id` | `{ text?, guideline?, level? }` | The updated question. An empty `text` is a 400 |
| POST | `/api/questions/:id/regenerate` | none | The question with new text |
| DELETE | `/api/questions/:id` | none | `{ deleted: id }` |

The generated set is two questions on matched skills, one on the first gap, and one general question.

## Interviews

An interview:

```json
{
  "id": 1,
  "applicationId": 102,
  "jobId": 1,
  "candidateId": 4,
  "candidateName": "Bilal Ahmed",
  "jobTitle": "Backend Developer",
  "interviewer": "Hina Recruiter",
  "interview_type": "technical",
  "scheduled_at": "2026-11-10T10:00:00Z",
  "duration_minutes": 45,
  "status": "scheduled",
  "feedback": null,
  "createdAt": "...",
  "conflicts": []
}
```

`status` is `scheduled`, `completed` or `cancelled`.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/interviews` | `{ application_id, interviewer, scheduled_at, duration_minutes?, interview_type?, force? }` | `{ interview, conflicts }` |
| GET | `/api/interviews` | none | Array, oldest first, cancelled ones left out |
| PUT | `/api/interviews/:id` | `{ scheduled_at?, duration_minutes?, interviewer?, interview_type?, status?, force? }` | `{ interview, conflicts }` |
| POST | `/api/interviews/:id/feedback` | see below | The interview, now `completed` |

Rules:

- `interviewer` is required. `scheduled_at` must be a valid date. `duration_minutes` is 15 to 240, default 45.
- If the slot overlaps another scheduled interview for the same interviewer, the answer is a 409 with the clash message. Sending the same request again with `force: true` goes through anyway. The frontend uses this to show a warning first.
- Scheduling for an application in `Shortlisted` moves it to `Interview` and notifies the candidate.
- Feedback body: `technical`, `communication`, `problem_solving`, `culture_fit` (each a whole number 1 to 5), `recommendation` (`hire`, `hold` or `reject`) and optional `comments`.

## Analytics

`GET /api/analytics`, recruiter only, for that recruiter's own jobs only.

The overview page reads these keys:

```json
{
  "active_jobs": 3,
  "total_applications": 12,
  "shortlisted_count": 4,
  "pending_reviews": 5,
  "upcoming_interviews": 2,
  "applications_by_job": [ { "job": "Backend Developer", "count": 6 } ],
  "applications_by_stage": [ { "status": "Submitted", "count": 2 } ],
  "shortlist_rate": 33,
  "avg_processing_time": 1.8,
  "common_skill_gaps": [ { "skill": "Docker", "count": 5 } ]
}
```

The analytics page reads these:

```json
{
  "totals": { "jobs": 3, "applicants": 12, "shortlisted": 4, "selected": 1, "averageScore": 61 },
  "funnel": [ { "status": "Submitted", "count": 2 } ],
  "distribution": [ { "label": "0-39", "count": 2 }, { "label": "40-59", "count": 3 },
                    { "label": "60-79", "count": 5 }, { "label": "80-100", "count": 2 } ],
  "topSkills": [ { "skill": "Python", "count": 8 } ],
  "topGaps": [ { "skill": "Docker", "count": 5 } ],
  "byJob": [ { "title": "Backend Developer", "applicants": 6, "averageScore": 64 } ]
}
```

One response carries both sets of keys, so both pages can call the same route. Scoring rules: use `effectiveScore`, leave unscored applicants out of the averages, count a skill once per applicant ignoring case.

## Talent search and compare

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/talent/search` | `{ query }` | `{ query, count, results }` |
| GET | `/api/compare?ids=1,2,3` | none | `{ applicants, missing_information }` |

`query` is at least 2 characters (400 otherwise). Each result is `{ applicationId, candidateId, candidateName, jobId, jobTitle, score, status, similarity, excerpts }`, where `similarity` is the share of search terms that matched (0 to 1) and `excerpts` holds up to 3 `{ skill, excerpt, term }` entries. Results sort by `similarity`, then `score`.

Compare needs 2 or 3 ids, otherwise 400. `applicants` are applicant views. `missing_information` has one entry per applicant: `{ applicantId, candidateName, unique_skills }`, the skills only that person has.

## Candidate

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/candidate/profile` | none | The profile |
| PUT | `/api/candidate/profile` | profile fields | The saved profile |
| GET | `/api/candidate/applications` | none | Candidate views, newest first |
| GET | `/api/candidate/recommendations` | none | Array of jobs. An empty array is fine for now |
| GET | `/api/notifications` | none | Array of `{ id, message, createdAt, read }`, newest first. Recruiters get `[]` |
| PATCH | `/api/notifications/read` | none | The notifications, all marked read |

Profile:

```json
{ "userId": 4, "name": "Ali Candidate", "email": "ali@example.com", "phone": "", "headline": "",
  "skills": [ { "skill": "Python", "verified": true } ],
  "education": [], "experience": [], "projects": [],
  "resumeFileName": null, "parsedAt": null }
```

`PUT` accepts `phone`, `headline`, `skills`, `education`, `experience` and `projects`, and ignores anything else. Skills with an empty name are dropped.

## Still to settle with Sameer

1. Which database, and the `applications` table needs `override_score` and `override_reason` next to `score` and `score_json`.
2. The server must serve the `frontend` folder with `express.static('frontend')`.