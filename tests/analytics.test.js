const express = require('express');
const request = require('supertest');

const T = { jobs: [], applications: [] };

function reset()
{
    T.jobs = [{ id: 1, title: 'Backend Developer', recruiter_id: 10 }, { id: 2, title: 'Designer', recruiter_id: 10 }, { id: 3, title: 'Other team', recruiter_id: 11 }];
    T.applications = [
        { job_id: 1, status: 'Selected', score: 92, override_score: null, score_json: { matched_skills: ['Node.js', 'Docker', 'Git'], missing_skills: [] } },
        { job_id: 1, status: 'Shortlisted', score: 61, override_score: 85, score_json: JSON.stringify({ matched_skills: [{ skill: 'node.js' }, 'Git'], missing_skills: ['Docker', 'Jest'] }) },
        { job_id: 1, status: 'Applied', score: 45, override_score: null, score_json: { matched_skills: ['Git'], missing_skills: ['Docker', 'Node.js'] } },
        { job_id: 1, status: 'Rejected', score: 12, override_score: null, score_json: { matched_skills: [], missing_skills: ['Node.js', 'node.js', 'Docker'] } },
        { job_id: 2, status: 'Applied', score: null, override_score: null, score_json: null },
        { job_id: 3, status: 'Selected', score: 99, override_score: null, score_json: { matched_skills: ['Secret'], missing_skills: [] } }
    ];
}

jest.mock('../src/db', () => ({
    query: jest.fn(async (sql, p) =>
    {
        const t = global.__T;
        if (sql.startsWith('SELECT id, title FROM jobs')) { return [t.jobs.filter((j) => j.recruiter_id === p[0])]; }
        if (sql.startsWith('SELECT a.job_id'))
        {
            const mine = t.jobs.filter((j) => j.recruiter_id === p[0]).map((j) => j.id);
            return [t.applications.filter((a) => mine.includes(a.job_id)).map((a) => ({ job_id: a.job_id, status: a.status, effective_score: a.override_score !== null ? a.override_score : a.score, score_json: a.score_json }))];
        }
        throw new Error('Unexpected SQL: ' + sql);
    })
}), { virtual: true });

jest.mock('../src/middleware/auth', () => ({
    requireAuth: (req, res, next) => { try { req.user = JSON.parse(req.get('x-test-user')); next(); } catch (e) { res.status(401).json({ error: 'Log in first.' }); } },
    requireRole: (role) => (req, res, next) => (req.user.role === role ? next() : res.status(403).json({ error: 'Not allowed.' }))
}), { virtual: true });

global.__T = T;
const app = express();
app.use('/api', require('../src/routes/analytics'));
const get = (user) => request(app).get('/api/analytics').set('x-test-user', user);
const rec = (id) => JSON.stringify({ id, role: 'recruiter' });

beforeEach(reset);

test('totals use the override score and ignore unscored applicants in averages', async () =>
{
    const { body } = await get(rec(10));
    // scores used: 92, 85 (override), 45, 12 -> average 58.5 -> 59; one application has no score yet
    expect(body.totals).toEqual({ jobs: 2, applicants: 5, shortlisted: 1, selected: 1, averageScore: 59, unscored: 1 });
});

test('funnel is in pipeline order and counts every status', async () =>
{
    const { body } = await get(rec(10));
    expect(body.funnel).toEqual([{ status: 'Applied', count: 2 }, { status: 'Shortlisted', count: 1 }, { status: 'Selected', count: 1 }, { status: 'Rejected', count: 1 }]);
});

test('score bands use the effective score', async () =>
{
    const { body } = await get(rec(10));
    expect(body.distribution).toEqual([{ label: '0-39', count: 1 }, { label: '40-59', count: 1 }, { label: '60-79', count: 0 }, { label: '80-100', count: 2 }]);
});

test('skills are counted once per applicant, ignoring case, and handle string or object JSON', async () =>
{
    const { body } = await get(rec(10));
    expect(body.topSkills).toEqual([{ skill: 'Git', count: 3 }, { skill: 'Node.js', count: 2 }, { skill: 'Docker', count: 1 }]);
    // Node.js is listed twice by one applicant (Node.js, node.js) but counts once
    expect(body.topGaps).toEqual([{ skill: 'Docker', count: 3 }, { skill: 'Node.js', count: 2 }, { skill: 'Jest', count: 1 }]);
});

test('per job numbers', async () =>
{
    const { body } = await get(rec(10));
    expect(body.byJob).toEqual([{ title: 'Backend Developer', applicants: 4, averageScore: 59 }, { title: 'Designer', applicants: 1, averageScore: 0 }]);
});

test('never includes another recruiter\'s data', async () =>
{
    const { body } = await get(rec(10));
    expect(JSON.stringify(body)).not.toMatch(/Secret|Other team/);
    const other = (await get(rec(11))).body;
    expect(other.totals.applicants).toBe(1);
    expect(other.topSkills).toEqual([{ skill: 'Secret', count: 1 }]);
});

test('a recruiter with no jobs gets zeros, not an error', async () =>
{
    const { status, body } = await get(rec(99));
    expect(status).toBe(200);
    expect(body.totals).toEqual({ jobs: 0, applicants: 0, shortlisted: 0, selected: 0, averageScore: 0, unscored: 0 });
    expect(body.byJob).toEqual([]);
});

test('candidates and anonymous users are refused', async () =>
{
    expect((await get(JSON.stringify({ id: 5, role: 'candidate' }))).status).toBe(403);
    expect((await request(app).get('/api/analytics')).status).toBe(401);
});

test('an unknown status is kept in the funnel instead of being dropped', async () =>
{
    T.applications.push({ job_id: 1, status: 'Interview', score: 70, override_score: null, score_json: {} });
    const { body } = await get(rec(10));
    expect(body.funnel[4]).toEqual({ status: 'Interview', count: 1 });
});
