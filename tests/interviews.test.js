const express = require('express');
const request = require('supertest');

const T = { applications: [], interviews: [], users: [], jobs: [] };
const inH = (h) => new Date(Date.now() + h * 3600000);

function reset()
{
    T.jobs = [{ id: 1, title: 'Backend Developer', recruiter_id: 10 }, { id: 2, title: 'Other', recruiter_id: 11 }];
    T.users = [{ id: 5, name: 'Hamza Rauf' }, { id: 6, name: 'Sana Iqbal' }];
    T.applications = [{ id: 1, job_id: 1, candidate_id: 5, status: 'Applied' }, { id: 2, job_id: 1, candidate_id: 6, status: 'Rejected' }, { id: 3, job_id: 2, candidate_id: 6, status: 'Applied' }];
    T.interviews = [];
}

jest.mock('../src/db', () => ({
    query: jest.fn(async (sql, p) =>
    {
        const t = global.__T;
        const app = (id) => t.applications.find((a) => a.id === id);
        if (sql.startsWith('SELECT i.id, i.application_id'))
        {
            return [t.interviews.filter((i) => (sql.includes('i.recruiter_id = ?') ? i.recruiter_id === p[0] : app(i.application_id).candidate_id === p[0]))
                .sort((x, y) => x.scheduled_at - y.scheduled_at)
                .map((i) => ({ ...i, applicant_name: t.users.find((u) => u.id === app(i.application_id).candidate_id).name, job_title: t.jobs.find((j) => j.id === app(i.application_id).job_id).title }))];
        }
        if (sql.startsWith('SELECT a.id, a.status, j.recruiter_id'))
        {
            const a = app(p[0]); return [a ? [{ id: a.id, status: a.status, recruiter_id: t.jobs.find((j) => j.id === a.job_id).recruiter_id }] : []];
        }
        if (sql.startsWith('SELECT i.id FROM interviews i'))
        {
            const cand = app(p[3]).candidate_id;
            return [t.interviews.filter((i) => i.status === 'Scheduled' && i.scheduled_at > p[0] && i.scheduled_at < p[1] && (i.recruiter_id === p[2] || app(i.application_id).candidate_id === cand)).slice(0, 1)];
        }
        if (sql.startsWith('INSERT INTO interviews'))
        {
            const row = { id: t.interviews.length + 1, application_id: p[0], recruiter_id: p[1], scheduled_at: p[2], mode: p[3], location: p[4], notes: p[5], status: p[6] };
            t.interviews.push(row); return [{ insertId: row.id }];
        }
        if (sql.startsWith('SELECT id, recruiter_id, status FROM interviews')) { return [t.interviews.filter((i) => i.id === p[0])]; }
        if (sql.startsWith('UPDATE interviews SET status')) { t.interviews.find((i) => i.id === p[1]).status = p[0]; return [{}]; }
        throw new Error('Unexpected SQL: ' + sql);
    })
}), { virtual: true });

jest.mock('../src/middleware/auth', () => ({
    requireAuth: (req, res, next) => { try { req.user = JSON.parse(req.get('x-test-user')); next(); } catch (e) { res.status(401).json({ error: 'Log in first.' }); } },
    requireRole: (role) => (req, res, next) => (req.user.role === role ? next() : res.status(403).json({ error: 'Not allowed.' }))
}), { virtual: true });

global.__T = T;
const router = require('../src/routes/interviews');
const app = express();
app.use(express.json());
app.use('/api', router);

const rec = (id) => JSON.stringify({ id, role: 'recruiter' });
const cand = (id) => JSON.stringify({ id, role: 'candidate' });
const post = (user, body) => request(app).post('/api/interviews').set('x-test-user', user).send(body);
const good = (extra) => ({ applicationId: 1, scheduledAt: inH(48).toISOString(), mode: 'Online', location: 'https://meet.example/abc', notes: 'Ask about Docker', ...extra });

beforeEach(reset);

describe('POST /interviews', () =>
{
    test('schedules an interview', async () =>
    {
        const res = await post(rec(10), good());
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('Scheduled');
        expect(T.interviews).toHaveLength(1);
    });

    test('validates the input', async () =>
    {
        expect((await post(rec(10), good({ applicationId: 'x' }))).status).toBe(400);
        expect((await post(rec(10), good({ scheduledAt: 'tomorrow-ish' }))).status).toBe(400);
        expect((await post(rec(10), good({ scheduledAt: inH(-2).toISOString() }))).body.error).toMatch(/future/);
        expect((await post(rec(10), good({ scheduledAt: inH(24 * 400).toISOString() }))).body.error).toMatch(/one year/);
        expect((await post(rec(10), good({ mode: 'Teleport' }))).body.error).toMatch(/Online, On-site or Phone/);
        expect((await post(rec(10), good({ notes: 'x'.repeat(1001) }))).status).toBe(400);
        expect((await post(rec(10), good({ scheduledAt: 12345 }))).status).toBe(400);
        expect(T.interviews).toHaveLength(0);
    });

    test('only the recruiter who owns the job can schedule', async () =>
    {
        expect((await post(rec(11), good())).status).toBe(404);
        expect((await post(cand(5), good())).status).toBe(403);
        expect((await request(app).post('/api/interviews').send(good())).status).toBe(401);
    });

    test('refuses rejected applicants and unknown applications', async () =>
    {
        expect((await post(rec(10), good({ applicationId: 2 }))).status).toBe(409);
        expect((await post(rec(10), good({ applicationId: 99 }))).status).toBe(404);
    });

    test('blocks a clash for the recruiter and for the applicant', async () =>
    {
        await post(rec(10), good({ scheduledAt: inH(48).toISOString() }));
        expect((await post(rec(10), good({ scheduledAt: inH(48.5).toISOString() }))).status).toBe(409);
        expect((await post(rec(10), good({ scheduledAt: inH(49.5).toISOString() }))).status).toBe(201);
        // candidate 6 has an interview with recruiter 11 (app 3); recruiter 10 cannot double-book them at the same time
        T.applications[1].status = 'Applied';
        await post(rec(11), good({ applicationId: 3, scheduledAt: inH(100).toISOString() }));
        expect((await post(rec(10), good({ applicationId: 2, scheduledAt: inH(100.2).toISOString() }))).status).toBe(409);
    });

    test('a cancelled interview frees the slot', async () =>
    {
        const first = await post(rec(10), good());
        await request(app).patch('/api/interviews/' + first.body.id).set('x-test-user', rec(10)).send({ status: 'Cancelled' });
        expect((await post(rec(10), good())).status).toBe(201);
    });
});

describe('GET /interviews', () =>
{
    beforeEach(async () => { await post(rec(10), good({ scheduledAt: inH(72).toISOString() })); await post(rec(10), good({ scheduledAt: inH(24).toISOString() })); });

    test('recruiter sees their interviews, soonest first, with notes', async () =>
    {
        const res = await request(app).get('/api/interviews').set('x-test-user', rec(10));
        expect(res.body).toHaveLength(2);
        expect(new Date(res.body[0].scheduledAt) < new Date(res.body[1].scheduledAt)).toBe(true);
        expect(res.body[0]).toMatchObject({ applicantName: 'Hamza Rauf', jobTitle: 'Backend Developer', notes: 'Ask about Docker' });
    });

    test('another recruiter sees none', async () =>
    {
        expect((await request(app).get('/api/interviews').set('x-test-user', rec(11))).body).toEqual([]);
    });

    test('a candidate sees only their own and never the private notes', async () =>
    {
        const res = await request(app).get('/api/interviews').set('x-test-user', cand(5));
        expect(res.body).toHaveLength(2);
        expect(res.body[0]).not.toHaveProperty('notes');
        expect((await request(app).get('/api/interviews').set('x-test-user', cand(6))).body).toEqual([]);
    });
});

describe('PATCH /interviews/:id', () =>
{
    let id;
    beforeEach(async () => { id = (await post(rec(10), good())).body.id; });
    const patch = (user, i, status) => request(app).patch('/api/interviews/' + i).set('x-test-user', user).send({ status });

    test('completes an interview once', async () =>
    {
        expect((await patch(rec(10), id, 'Completed')).status).toBe(200);
        expect(T.interviews[0].status).toBe('Completed');
        const again = await patch(rec(10), id, 'Cancelled');
        expect(again.status).toBe(409);
        expect(again.body.error).toMatch(/already completed/);
    });

    test('rejects bad status, strangers, candidates and unknown ids', async () =>
    {
        expect((await patch(rec(10), id, 'Scheduled')).status).toBe(400);
        expect((await patch(rec(11), id, 'Completed')).status).toBe(404);
        expect((await patch(cand(5), id, 'Completed')).status).toBe(403);
        expect((await patch(rec(10), 99, 'Completed')).status).toBe(404);
        expect((await patch(rec(10), 'abc', 'Completed')).status).toBe(404);
    });
});
