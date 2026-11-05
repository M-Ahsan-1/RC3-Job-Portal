const express = require('express');
const request = require('supertest');

const T = { jobs: [], applications: [], interviews: [] };
const inH = (h) => new Date(Date.now() + h * 3600000);

function reset()
{
    T.jobs = [{ id: 1, title: 'Backend Developer', status: 'open', recruiter_id: 10 }, { id: 2, title: 'Designer', status: 'closed', recruiter_id: 10 }, { id: 3, title: 'Other team', status: 'open', recruiter_id: 11 }];
    T.applications = [
        { job_id: 1, status: 'Selected', created_at: '2026-11-01T09:00:00Z', updated_at: '2026-11-03T09:00:00Z', score: 92, override_score: null, score_json: { matched_skills: ['Node.js', 'Docker', 'Git'], missing_skills: [] } },
        { job_id: 1, status: 'Shortlisted', created_at: '2026-11-01T09:00:00Z', updated_at: '2026-11-02T09:00:00Z', score: 61, override_score: 85, score_json: JSON.stringify({ matched_skills: [{ skill: 'node.js' }, 'Git'], missing_skills: ['Docker', 'Jest'] }) },
        { job_id: 1, status: 'AI Assessment Available', created_at: '2026-11-02T09:00:00Z', updated_at: '2026-11-02T10:00:00Z', score: 45, override_score: null, score_json: { matched_skills: ['Git'], missing_skills: ['Docker', 'Node.js'] } },
        { job_id: 1, status: 'Rejected', created_at: '2026-11-01T09:00:00Z', updated_at: '2026-11-02T09:00:00Z', score: 12, override_score: null, score_json: { matched_skills: [], missing_skills: ['Node.js', 'node.js', 'Docker'] } },
        { job_id: 2, status: 'Submitted', created_at: '2026-11-04T09:00:00Z', updated_at: '2026-11-04T09:00:00Z', score: null, override_score: null, score_json: null },
        { job_id: 3, status: 'Selected', created_at: '2026-11-01T09:00:00Z', updated_at: '2026-11-09T09:00:00Z', score: 99, override_score: null, score_json: { matched_skills: ['Secret'], missing_skills: [] } }
    ];
    T.interviews = [
        { recruiter_id: 10, status: 'scheduled', scheduled_at: inH(24) },
        { recruiter_id: 10, status: 'scheduled', scheduled_at: inH(72) },
        { recruiter_id: 10, status: 'cancelled', scheduled_at: inH(30) },
        { recruiter_id: 10, status: 'scheduled', scheduled_at: inH(-5) },
        { recruiter_id: 11, status: 'scheduled', scheduled_at: inH(24) }
    ];
}

jest.mock('../src/db', () => ({
    query: jest.fn(async (sql, p) =>
    {
        const t = global.__T;
        if (sql.startsWith('SELECT id, title, status FROM jobs')) { return [t.jobs.filter((j) => j.recruiter_id === p[0])]; }
        if (sql.startsWith('SELECT a.job_id'))
        {
            const mine = t.jobs.filter((j) => j.recruiter_id === p[0]).map((j) => j.id);
            return [t.applications.filter((a) => mine.includes(a.job_id)).map((a) => ({ job_id: a.job_id, status: a.status, created_at: a.created_at, updated_at: a.updated_at, effective_score: a.override_score !== null ? a.override_score : a.score, score_json: a.score_json }))];
        }
        if (sql.startsWith('SELECT COUNT(*) AS total FROM interviews'))
        {
            return [[{ total: t.interviews.filter((i) => i.recruiter_id === p[0] && i.status === p[1] && i.scheduled_at > p[2]).length }]];
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

describe('analytics page keys', () =>
{
    test('totals use the override score and ignore unscored applicants in averages', async () =>
    {
        const { body } = await get(rec(10));
        // scores used: 92, 85 (override), 45, 12 -> average 58.5 -> 59, one application has no score yet
        // shortlisted counts Shortlisted and everyone who moved past it (here Shortlisted + Selected)
        expect(body.totals).toEqual({ jobs: 2, applicants: 5, shortlisted: 2, selected: 1, averageScore: 59, unscored: 1 });
    });

    test('funnel follows the pipeline order and keeps empty stages', async () =>
    {
        const { body } = await get(rec(10));
        expect(body.funnel).toEqual([
            { status: 'Submitted', count: 1 }, { status: 'Parsed', count: 0 }, { status: 'AI Assessment Available', count: 1 }, { status: 'Recruiter Review', count: 0 },
            { status: 'Shortlisted', count: 1 }, { status: 'Interview', count: 0 }, { status: 'Selected', count: 1 }, { status: 'Rejected', count: 1 }
        ]);
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

    test('gaps written as objects with a label are counted too', async () =>
    {
        T.applications.push({ job_id: 1, status: 'Recruiter Review', created_at: null, updated_at: null, score: 50, override_score: null, score_json: { matched_skills: [], gaps: [{ skill: 'Redis', label: 'no_evidence' }, { skill: 'Docker', label: 'confirmed_absent' }] } });
        const { body } = await get(rec(10));
        expect(body.topGaps).toEqual([{ skill: 'Docker', count: 4 }, { skill: 'Node.js', count: 2 }, { skill: 'Jest', count: 1 }, { skill: 'Redis', count: 1 }]);
    });

    test('per job numbers', async () =>
    {
        const { body } = await get(rec(10));
        expect(body.byJob).toEqual([{ title: 'Backend Developer', applicants: 4, averageScore: 59 }, { title: 'Designer', applicants: 1, averageScore: 0 }]);
    });

    test('an unknown status is kept in the funnel instead of being dropped', async () =>
    {
        T.applications.push({ job_id: 1, status: 'Legacy', created_at: null, updated_at: null, score: 70, override_score: null, score_json: {} });
        const { body } = await get(rec(10));
        expect(body.funnel[8]).toEqual({ status: 'Legacy', count: 1 });
    });
});

describe('overview page keys', () =>
{
    test('counts for the dashboard cards', async () =>
    {
        const { body } = await get(rec(10));
        expect(body).toMatchObject({ active_jobs: 1, total_applications: 5, shortlisted_count: 2, pending_reviews: 1, upcoming_interviews: 2, shortlist_rate: 40 });
    });

    test('upcoming interviews leave out cancelled, past and other recruiters', async () =>
    {
        expect((await get(rec(11))).body.upcoming_interviews).toBe(1);
        expect((await get(rec(99))).body.upcoming_interviews).toBe(0);
    });

    test('applications by job and by stage', async () =>
    {
        const { body } = await get(rec(10));
        expect(body.applications_by_job).toEqual([{ job: 'Backend Developer', count: 4 }, { job: 'Designer', count: 1 }]);
        expect(body.applications_by_stage).toEqual(body.funnel);
    });

    test('average processing time is in days between applying and a final decision', async () =>
    {
        // Selected took 2 days, Rejected took 1 day
        expect((await get(rec(10))).body.avg_processing_time).toBe(1.5);
    });

    test('common skill gaps match the top gaps', async () =>
    {
        const { body } = await get(rec(10));
        expect(body.common_skill_gaps).toEqual(body.topGaps);
    });
});

describe('access', () =>
{
    test('never includes another recruiter\'s data', async () =>
    {
        const { body } = await get(rec(10));
        expect(JSON.stringify(body)).not.toMatch(/Secret|Other team/);
        const other = (await get(rec(11))).body;
        expect(other.totals.applicants).toBe(1);
        expect(other.total_applications).toBe(1);
        expect(other.topSkills).toEqual([{ skill: 'Secret', count: 1 }]);
    });

    test('a recruiter with no jobs gets zeros, not an error', async () =>
    {
        const { status, body } = await get(rec(99));
        expect(status).toBe(200);
        expect(body.totals).toEqual({ jobs: 0, applicants: 0, shortlisted: 0, selected: 0, averageScore: 0, unscored: 0 });
        expect(body).toMatchObject({ active_jobs: 0, total_applications: 0, shortlisted_count: 0, pending_reviews: 0, upcoming_interviews: 0, shortlist_rate: 0, avg_processing_time: 0 });
        expect(body.byJob).toEqual([]);
        expect(body.applications_by_job).toEqual([]);
    });

    test('candidates and anonymous users are refused', async () =>
    {
        expect((await get(JSON.stringify({ id: 5, role: 'candidate' }))).status).toBe(403);
        expect((await request(app).get('/api/analytics')).status).toBe(401);
    });
});
