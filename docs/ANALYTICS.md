# A9 Analytics

`GET /api/analytics` (recruiter only). Numbers cover only the logged-in recruiter's own jobs.

```json
{
  "totals":       { "jobs": 2, "applicants": 5, "shortlisted": 1, "selected": 1, "averageScore": 59, "unscored": 1 },
  "funnel":       [{ "status": "Applied", "count": 2 }, "... Shortlisted, Selected, Rejected, then any other status"],
  "distribution": [{ "label": "0-39", "count": 1 }, "... 40-59, 60-79, 80-100"],
  "topSkills":    [{ "skill": "Git", "count": 3 }],
  "topGaps":      [{ "skill": "Docker", "count": 3 }],
  "byJob":        [{ "title": "Backend Developer", "applicants": 4, "averageScore": 59 }]
}
```

- Score used everywhere: `override_score` when set, otherwise `score`.
- Applicants with no score yet are counted in `applicants` and `unscored` but not in averages or score bands.
- A skill is counted once per applicant, ignoring upper/lower case. Top 6 each.
- `topSkills` and `topGaps` read `score_json.matched_skills` and `score_json.missing_skills`, which the A4 pipeline saves.
- Up to 20,000 applications are read per request. For a much larger system, add caching.

## Needs from Sameer's parts

- `applications` has `job_id`, `status`, `score`, `override_score`, `score_json`; `jobs` has `id`, `title`, `recruiter_id`.
- Same `requireAuth` and `requireRole` as the other routes.

## Mounting

```js
app.use('/api', require('./routes/analytics'));
```
