const express = require('express');
const request = require('supertest');

const T = { applications: [], interviews: [], users: [], jobs: [], history: [], notifications: [] };
const inH = (h) => new Date(Date.now() + h * 3600000);

function reset()
{
    T.jobs = [{ id: 1, title: 'Backend Developer', recruiter_id: 10 }, { id: 2, title: 'Other', recruiter_id: 11 }];
    T.users = [{ id: 5, name: 'Hamza Rauf' }, { id: 6, name: 'Sana Iqbal' }];
    T.applications = [{ id: 1, job_id: 1, candidate_id: 5, status: 'Recruiter Review' }, { id: 2, job_id: 1, candidate_id: 6, status: 'Rejected' }, { id: 3, job_id: 2, candidate_id: 6, status: 'Recruiter Review' }];
    T.interviews = [];
    T.history = [];
    T.notifications = [];
}

jest.mock('../src/db', () => ({
    query: jest.fn(async (sql, p) =>
    {
        const t = global.__T;
        const app = (id) => t.applications.find((a) => a.id === id);
        const joined = (i) => ({ ...i, job_id: app(i.application_id).job_id, candidate_id: app(i.application_id).candidate_id, candidate_name: t.users.find((u) => u.id === app(i.application_id).candidate_id).name, job_title: t.jobs.find((j) => j.id === app(i.application_id).job_id).title });
        if (sql.startsWith('SELECT i.id, i.application_id'))
        {
            if (sql.includes('WHERE i.id = ?')) { return [t.interviews.filter((i) => i.id === p[0]).map(joined)]; }
            return [t.interviews.map(joined)
                .filter((i) => (sql.includes('i.recruiter_id = ?') ? i.recruiter_id === p[0] : i.candidate_id === p[0]) && i.status !== 'cancelled')
                .sort((x, y) => x.scheduled_at - y.scheduled_at)];
        }
        if (sql.startsWith('SELECT a.id, a.status, a.job_id'))
        {
            const a = app(p[0]);
            return [a ? [{ id: a.id, status: a.status, job_id: a.job_id, candidate_id: a.candidate_id, recruiter_id: t.jobs.find((j) => j.id === a.job_id).recruiter_id, job_title: t.jobs.find((j) => j.id === a.job_id).title, candidate_name: t.users.find((u) => u.id === a.candidate_id).name }] : []];
        }
        if (sql.startsWith('SELECT i.id, i.recruiter_id, i.interviewer'))
        {
            return [t.interviews.filter((i) => i.status === 'scheduled' && i.scheduled_at > p[0] && i.scheduled_at < p[1]).map(joined)];
        }
        if (sql.startsWith('INSERT INTO interviews'))
        {
            const row = { id: t.interviews.length + 1, application_id: p[0], recruiter_id: p[1], interviewer: p[2], interview_type: p[3], scheduled_at: p[4], duration_minutes: p[5], status: p[6], feedback: null, created_at: new Date() };
            t.interviews.push(row); return [{ insertId: row.id }];
        }
        if (sql.startsWith('UPDATE interviews SET scheduled_at'))
        {
            const i = t.interviews.find((x) => x.id === p[5]);
            Object.assign(i, { scheduled_at: p[0], duration_minutes: p[1], interviewer: p[2], interview_type: p[3], status: p[4] }); return [{}];
        }
        if (sql.startsWith('UPDATE interviews SET feedback')) { const i = t.interviews.find((x) => x.id === p[2]); i.feedback = p[0]; i.status = p[1]; return [{}]; }
        if (sql.startsWith('UPDATE applications SET status = ?')) { app(p[1]).status = p[0]; return [{}]; }
        if (sql.startsWith('INSERT INTO application_history')) { t.history.push({ application_id: p[0], from: p[1], to: p[2], changed_by: p[3] }); return [{}]; }
        if (sql.startsWith('INSERT INTO notifications')) { t.notifications.push({ user_id: p[0], message: p[1] }); return [{}]; }
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
const put = (user, id, body) => request(app).put('/api/interviews/' + id).set('x-test-user', user).send(body);
const feedback = (user, id, body) => request(app).post('/api/interviews/' + id + '/feedback').set('x-test-user', user).send(body);
const good = (extra) => ({ application_id: 1, interviewer: 'Hina Recruiter', scheduled_at: inH(48).toISOString(), duration_minutes: 45, interview_type: 'technical', ...extra });
const card = (extra) => ({ technical: 4, communication: 5, problem_solving: 3, culture_fit: 4, recommendation: 'hire', comments: 'Solid on Docker.', ...extra });

beforeEach(reset);

describe('POST /interviews', () =>
{
    test('schedules an interview and returns it in the contract shape', async () =>
    {
        const res = await post(rec(10), good());
        expect(res.status).toBe(201);
        expect(res.body.conflicts).toEqual([]);
        expect(res.body.interview).toMatchObject({
            id: 1, applicationId: 1, jobId: 1, candidateId: 5, candidateName: 'Hamza Rauf', jobTitle: 'Backend Developer', interviewer: 'Hina Recruiter',
            interview_type: 'technical', duration_minutes: 45, status: 'scheduled', feedback: null, conflicts: []
        });
        expect(new Date(res.body.interview.scheduled_at).getTime()).toBe(T.interviews[0].scheduled_at.getTime());
        expect(T.interviews).toHaveLength(1);
    });

    test('duration and type fall back to 45 minutes and technical', async () =>
    {
        const res = await post(rec(10), good({ duration_minutes: undefined, interview_type: undefined }));
        expect(res.status).toBe(201);
        expect(res.body.interview).toMatchObject({ duration_minutes: 45, interview_type: 'technical' });
    });

    test('validates the input', async () =>
    {
        expect((await post(rec(10), good({ application_id: 'x' }))).status).toBe(400);
        expect((await post(rec(10), good({ interviewer: undefined }))).body.error).toMatch(/who is taking/);
        expect((await post(rec(10), good({ interviewer: '   ' }))).status).toBe(400);
        expect((await post(rec(10), good({ scheduled_at: 'tomorrow-ish' }))).status).toBe(400);
        expect((await post(rec(10), good({ scheduled_at: inH(-2).toISOString() }))).body.error).toMatch(/future/);
        expect((await post(rec(10), good({ scheduled_at: inH(24 * 400).toISOString() }))).body.error).toMatch(/one year/);
        expect((await post(rec(10), good({ scheduled_at: 12345 }))).status).toBe(400);
        expect((await post(rec(10), good({ duration_minutes: 10 }))).body.error).toMatch(/between 15 and 240/);
        expect((await post(rec(10), good({ duration_minutes: 241 }))).status).toBe(400);
        expect((await post(rec(10), good({ duration_minutes: 45.5 }))).status).toBe(400);
        expect((await post(rec(10), good({ duration_minutes: 'long' }))).status).toBe(400);
        expect((await post(rec(10), good({ interview_type: 'x'.repeat(51) }))).status).toBe(400);
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
        expect((await post(rec(10), good({ application_id: 2 }))).status).toBe(409);
        expect((await post(rec(10), good({ application_id: 99 }))).status).toBe(404);
    });

    test('scheduling for a Shortlisted application moves it to Interview and writes history', async () =>
    {
        T.applications[0].status = 'Shortlisted';
        await post(rec(10), good());
        expect(T.applications[0].status).toBe('Interview');
        expect(T.history).toEqual([{ application_id: 1, from: 'Shortlisted', to: 'Interview', changed_by: 10 }]);
    });

    test('other statuses are left alone, and the candidate is told either way', async () =>
    {
        await post(rec(10), good());
        expect(T.applications[0].status).toBe('Recruiter Review');
        expect(T.history).toEqual([]);
        expect(T.notifications).toHaveLength(1);
        expect(T.notifications[0]).toMatchObject({ user_id: 5 });
        expect(T.notifications[0].message).toMatch(/Backend Developer/);
    });

    test('a failing notification does not undo the interview', async () =>
    {
        const db = require('../src/db');
        const real = db.query.getMockImplementation();
        db.query.mockImplementation(async (sql, p) => { if (sql.startsWith('INSERT INTO notifications')) { throw new Error('no such table'); } return real(sql, p); });
        const quiet = jest.spyOn(console, 'error').mockImplementation(() => { });
        expect((await post(rec(10), good())).status).toBe(201);
        db.query.mockImplementation(real);
        quiet.mockRestore();
    });
});

describe('clashes', () =>
{
    test('overlap is worked out from the duration, not a fixed hour', async () =>
    {
        await post(rec(10), good({ scheduled_at: inH(48).toISOString(), duration_minutes: 120 }));
        const clash = await post(rec(10), good({ scheduled_at: inH(49.5).toISOString() }));
        expect(clash.status).toBe(409);
        expect(clash.body.error).toMatch(/Hina Recruiter already has an interview/);
        expect(clash.body.conflicts).toHaveLength(1);
        expect(clash.body.conflicts[0]).toMatchObject({ id: 1, candidateName: 'Hamza Rauf', duration_minutes: 120 });
        expect(T.interviews).toHaveLength(1);
        // right after it ends is fine
        expect((await post(rec(10), good({ scheduled_at: inH(50.1).toISOString() }))).status).toBe(201);
    });

    test('back to back interviews do not clash', async () =>
    {
        await post(rec(10), good({ scheduled_at: inH(48).toISOString(), duration_minutes: 60 }));
        expect((await post(rec(10), good({ scheduled_at: inH(49).toISOString() }))).status).toBe(201);
    });

    test('the interviewer name is compared ignoring case and spaces', async () =>
    {
        await post(rec(10), good());
        expect((await post(rec(10), good({ interviewer: '  hina recruiter ', application_id: 3 }))).status).toBe(404);
        T.applications.push({ id: 4, job_id: 1, candidate_id: 6, status: 'Recruiter Review' });
        const res = await post(rec(10), good({ interviewer: '  hina recruiter ', application_id: 4 }));
        expect(res.status).toBe(409);
    });

    test('a different interviewer at the same time is fine', async () =>
    {
        await post(rec(10), good());
        T.applications.push({ id: 4, job_id: 1, candidate_id: 6, status: 'Recruiter Review' });
        expect((await post(rec(10), good({ interviewer: 'Someone Else', application_id: 4 }))).status).toBe(201);
    });

    test('the same applicant cannot be double booked even with another interviewer', async () =>
    {
        await post(rec(10), good());
        const res = await post(rec(10), good({ interviewer: 'Someone Else', scheduled_at: inH(48.2).toISOString() }));
        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/applicant already has/);
    });

    test('force goes through and still reports the clash', async () =>
    {
        await post(rec(10), good());
        const res = await post(rec(10), good({ scheduled_at: inH(48.2).toISOString(), force: true }));
        expect(res.status).toBe(201);
        expect(res.body.conflicts).toHaveLength(1);
        expect(res.body.interview.conflicts).toHaveLength(1);
        expect(T.interviews).toHaveLength(2);
    });

    test('a clash with another recruiter shows only the time, nothing else about their interview', async () =>
    {
        // candidate 6 has an interview with recruiter 11 (application 3)
        await post(rec(11), good({ application_id: 3, interviewer: 'Zed Recruiter', scheduled_at: inH(100).toISOString() }));
        T.applications[1].status = 'Recruiter Review';
        const res = await post(rec(10), good({ application_id: 2, interviewer: 'Hina Recruiter', scheduled_at: inH(100.2).toISOString() }));
        expect(res.status).toBe(409);
        expect(Object.keys(res.body.conflicts[0]).sort()).toEqual(['duration_minutes', 'scheduled_at']);
    });

    test('a cancelled interview frees the slot', async () =>
    {
        const first = await post(rec(10), good());
        await put(rec(10), first.body.interview.id, { status: 'cancelled' });
        expect((await post(rec(10), good())).status).toBe(201);
    });
});

describe('GET /interviews', () =>
{
    beforeEach(async () => { await post(rec(10), good({ scheduled_at: inH(72).toISOString() })); await post(rec(10), good({ scheduled_at: inH(24).toISOString() })); });

    test('recruiter sees their interviews, soonest first', async () =>
    {
        const res = await request(app).get('/api/interviews').set('x-test-user', rec(10));
        expect(res.body).toHaveLength(2);
        expect(new Date(res.body[0].scheduled_at) < new Date(res.body[1].scheduled_at)).toBe(true);
        expect(res.body[0]).toMatchObject({ candidateName: 'Hamza Rauf', jobTitle: 'Backend Developer', interviewer: 'Hina Recruiter', status: 'scheduled', feedback: null });
    });

    test('cancelled interviews are left out', async () =>
    {
        await put(rec(10), 1, { status: 'cancelled' });
        const res = await request(app).get('/api/interviews').set('x-test-user', rec(10));
        expect(res.body.map((i) => i.id)).toEqual([2]);
    });

    test('another recruiter sees none', async () =>
    {
        expect((await request(app).get('/api/interviews').set('x-test-user', rec(11))).body).toEqual([]);
    });

    test('a candidate sees only their own and never the feedback', async () =>
    {
        await feedback(rec(10), 2, card());
        const res = await request(app).get('/api/interviews').set('x-test-user', cand(5));
        expect(res.body).toHaveLength(2);
        expect(res.body[0]).not.toHaveProperty('feedback');
        expect(JSON.stringify(res.body)).not.toMatch(/Solid on Docker/);
        expect((await request(app).get('/api/interviews').set('x-test-user', cand(6))).body).toEqual([]);
    });
});

describe('PUT /interviews/:id', () =>
{
    let id;
    beforeEach(async () => { id = (await post(rec(10), good())).body.interview.id; });

    test('reschedules and updates the other fields', async () =>
    {
        const when = inH(96).toISOString();
        const res = await put(rec(10), id, { scheduled_at: when, duration_minutes: 90, interviewer: 'Ali Khan', interview_type: 'hr' });
        expect(res.status).toBe(200);
        expect(res.body.conflicts).toEqual([]);
        expect(res.body.interview).toMatchObject({ id, interviewer: 'Ali Khan', interview_type: 'hr', duration_minutes: 90, status: 'scheduled' });
        expect(new Date(T.interviews[0].scheduled_at).toISOString()).toBe(when);
    });

    test('moving a little inside its own old slot is not a clash with itself', async () =>
    {
        expect((await put(rec(10), id, { scheduled_at: inH(48.2).toISOString() })).status).toBe(200);
    });

    test('moving onto another interview is a 409, force lets it through', async () =>
    {
        T.applications.push({ id: 4, job_id: 1, candidate_id: 6, status: 'Recruiter Review' });
        const second = await post(rec(10), good({ application_id: 4, scheduled_at: inH(72).toISOString() }));
        const clash = await put(rec(10), second.body.interview.id, { scheduled_at: inH(48.3).toISOString() });
        expect(clash.status).toBe(409);
        expect(clash.body.conflicts).toHaveLength(1);
        const forced = await put(rec(10), second.body.interview.id, { scheduled_at: inH(48.3).toISOString(), force: true });
        expect(forced.status).toBe(200);
        expect(forced.body.conflicts).toHaveLength(1);
    });

    test('completes an interview once', async () =>
    {
        expect((await put(rec(10), id, { status: 'completed' })).status).toBe(200);
        expect(T.interviews[0].status).toBe('completed');
        const again = await put(rec(10), id, { status: 'cancelled' });
        expect(again.status).toBe(409);
        expect(again.body.error).toMatch(/already completed/);
    });

    test('sending the unchanged time back with a new status works even after the time has passed', async () =>
    {
        // the interview time has gone by, the page sends the whole record back with status completed
        T.interviews[0].scheduled_at = inH(-1);
        const iso = T.interviews[0].scheduled_at.toISOString();
        expect((await put(rec(10), id, { scheduled_at: iso, status: 'completed' })).status).toBe(200);
    });

    test('status scheduled is accepted as a no change', async () =>
    {
        const res = await put(rec(10), id, { status: 'scheduled', interviewer: 'Ali Khan' });
        expect(res.status).toBe(200);
        expect(res.body.interview.status).toBe('scheduled');
    });

    test('rejects bad input, strangers, candidates and unknown ids', async () =>
    {
        expect((await put(rec(10), id, {})).status).toBe(400);
        expect((await put(rec(10), id, { status: 'Completed' })).status).toBe(400);
        expect((await put(rec(10), id, { status: 'done' })).status).toBe(400);
        expect((await put(rec(10), id, { interviewer: '' })).status).toBe(400);
        expect((await put(rec(10), id, { duration_minutes: 5 })).status).toBe(400);
        expect((await put(rec(10), id, { scheduled_at: inH(-3).toISOString() })).status).toBe(400);
        expect((await put(rec(11), id, { status: 'completed' })).status).toBe(404);
        expect((await put(cand(5), id, { status: 'completed' })).status).toBe(403);
        expect((await put(rec(10), 99, { status: 'completed' })).status).toBe(404);
        expect((await put(rec(10), 'abc', { status: 'completed' })).status).toBe(404);
        expect(T.interviews[0].status).toBe('scheduled');
    });

    test('the old PATCH route is gone', async () =>
    {
        const res = await request(app).patch('/api/interviews/' + id).set('x-test-user', rec(10)).send({ status: 'completed' });
        expect(res.status).toBe(404);
    });
});

describe('POST /interviews/:id/feedback', () =>
{
    let id;
    beforeEach(async () => { id = (await post(rec(10), good())).body.interview.id; });

    test('saves the scorecard and completes the interview', async () =>
    {
        const res = await feedback(rec(10), id, card());
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('completed');
        expect(res.body.feedback).toMatchObject({ technical: 4, communication: 5, problem_solving: 3, culture_fit: 4, recommendation: 'hire', comments: 'Solid on Docker.' });
        expect(T.interviews[0].status).toBe('completed');
        expect(JSON.parse(T.interviews[0].feedback).recommendation).toBe('hire');
    });

    test('comments are optional and scores can arrive as numeric strings', async () =>
    {
        const res = await feedback(rec(10), id, card({ comments: undefined, technical: '5' }));
        expect(res.status).toBe(200);
        expect(res.body.feedback).toMatchObject({ technical: 5, comments: '' });
    });

    test('the saved feedback shows up in the list for the recruiter', async () =>
    {
        await feedback(rec(10), id, card());
        const res = await request(app).get('/api/interviews').set('x-test-user', rec(10));
        expect(res.body[0].feedback.recommendation).toBe('hire');
    });

    test('validates scores, recommendation and comments', async () =>
    {
        expect((await feedback(rec(10), id, card({ technical: 0 }))).status).toBe(400);
        expect((await feedback(rec(10), id, card({ communication: 6 }))).status).toBe(400);
        expect((await feedback(rec(10), id, card({ culture_fit: 3.5 }))).status).toBe(400);
        expect((await feedback(rec(10), id, card({ problem_solving: undefined }))).body.error).toMatch(/problem solving/);
        expect((await feedback(rec(10), id, card({ recommendation: 'maybe' }))).body.error).toMatch(/hire, hold or reject/);
        expect((await feedback(rec(10), id, card({ comments: 'x'.repeat(2001) }))).status).toBe(400);
        expect(T.interviews[0].feedback).toBeNull();
        expect(T.interviews[0].status).toBe('scheduled');
    });

    test('feedback can only be sent once', async () =>
    {
        await feedback(rec(10), id, card());
        const again = await feedback(rec(10), id, card());
        expect(again.status).toBe(409);
        expect(again.body.error).toMatch(/already submitted/);
    });

    test('an interview completed without feedback can still get it', async () =>
    {
        await put(rec(10), id, { status: 'completed' });
        expect((await feedback(rec(10), id, card())).status).toBe(200);
    });

    test('a cancelled interview cannot get feedback', async () =>
    {
        await put(rec(10), id, { status: 'cancelled' });
        expect((await feedback(rec(10), id, card())).status).toBe(409);
    });

    test('strangers, candidates and unknown ids are refused', async () =>
    {
        expect((await feedback(rec(11), id, card())).status).toBe(404);
        expect((await feedback(cand(5), id, card())).status).toBe(403);
        expect((await feedback(rec(10), 99, card())).status).toBe(404);
        expect((await request(app).post('/api/interviews/' + id + '/feedback').send(card())).status).toBe(401);
    });
});
