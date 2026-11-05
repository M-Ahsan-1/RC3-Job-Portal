process.env.UPLOAD_DIR = require('os').tmpdir() + '/rc3-test-uploads';
process.env.MAX_UPLOAD_MB = '1';
process.env.PIPELINE_STEP_TIMEOUT_MS = '300';

const fs = require('fs');
const express = require('express');
const request = require('supertest');

// ---- in-memory fake database ----
const tables = {};

function resetDb()
{
    tables.jobs = [{ id: 1, status: 'open', recruiter_id: 10, title: 'Backend Developer', description: 'API work', required_skills: JSON.stringify(['Node.js', 'Docker']) },
                   { id: 2, status: 'closed', recruiter_id: 10, title: 'Old job', description: '', required_skills: '[]' }];
    tables.applications = [];
}

jest.mock('../src/db', () => ({
    query: jest.fn(async (sql, params) =>
    {
        const t = global.__tables;
        if (sql.startsWith('SELECT id, status FROM jobs')) { return [t.jobs.filter(j => j.id === params[0])]; }
        if (sql.startsWith('SELECT id FROM applications WHERE job_id')) { return [t.applications.filter(a => a.job_id === params[0] && a.candidate_id === params[1])]; }
        if (sql.startsWith('INSERT INTO applications')) { const row = { id: t.applications.length + 1, job_id: params[0], candidate_id: params[1], resume_path: params[2], status: params[3], pipeline_status: params[4], pipeline_error: null }; t.applications.push(row); return [{ insertId: row.id }]; }
        if (sql.startsWith('SELECT a.id, a.resume_path')) { const a = t.applications.find(x => x.id === params[0]); if (!a) { return [[]]; } const j = t.jobs.find(x => x.id === a.job_id); return [[{ id: a.id, resume_path: a.resume_path, job_id: j.id, title: j.title, description: j.description, required_skills: j.required_skills }]]; }
        if (sql.startsWith('SELECT a.id, a.candidate_id')) { const a = t.applications.find(x => x.id === params[0]); if (!a) { return [[]]; } const j = t.jobs.find(x => x.id === a.job_id); return [[{ id: a.id, candidate_id: a.candidate_id, pipeline_status: a.pipeline_status, pipeline_error: a.pipeline_error, recruiter_id: j.recruiter_id }]]; }
        if (sql.startsWith('UPDATE applications SET pipeline_status = ?, pipeline_error = ? WHERE')) { const a = t.applications.find(x => x.id === params[2]); a.pipeline_status = params[0]; a.pipeline_error = params[1]; return [{}]; }
        if (sql.startsWith('UPDATE applications SET pipeline_status = ?, pipeline_error = NULL')) { const a = t.applications.find(x => x.id === params[1]); a.pipeline_status = params[0]; a.pipeline_error = null; return [{}]; }
        if (sql.startsWith('UPDATE applications SET parsed_json')) { t.applications.find(x => x.id === params[1]).parsed_json = params[0]; return [{}]; }
        if (sql.startsWith('UPDATE applications SET score = ?')) { const a = t.applications.find(x => x.id === params[3]); a.score = params[0]; a.score_json = JSON.parse(params[1]); a.pipeline_status = params[2]; a.pipeline_error = null; return [{}]; }
        if (sql.startsWith("UPDATE applications SET pipeline_status = 'failed'")) { let n = 0; t.applications.forEach(a => { if (['queued', 'parsing', 'matching'].includes(a.pipeline_status)) { a.pipeline_status = 'failed'; a.pipeline_error = params[0]; n++; } }); return [{ affectedRows: n }]; }
        throw new Error('Unexpected SQL in test: ' + sql);
    })
}), { virtual: true });

jest.mock('../src/middleware/auth', () => ({
    requireAuth: (req, res, next) => { try { req.user = JSON.parse(req.get('x-test-user')); next(); } catch (e) { res.status(401).json({ error: 'Log in first.' }); } },
    requireRole: (role) => (req, res, next) => (req.user.role === role ? next() : res.status(403).json({ error: 'Not allowed.' }))
}), { virtual: true });

jest.mock('../src/services/parser', () => ({ parseResume: jest.fn() }), { virtual: true });
jest.mock('../src/services/matcher', () => ({ scoreApplication: jest.fn() }), { virtual: true });

global.__tables = tables;
const parser = require('../src/services/parser');
const matcher = require('../src/services/matcher');
const router = require('../src/routes/pipeline');

const app = express();
app.use(express.json());
app.use('/api', router);

const candidate = (id) => JSON.stringify({ id: id, role: 'candidate' });
const recruiter = (id) => JSON.stringify({ id: id, role: 'recruiter' });
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n');

function apply(user, jobId, file, name, type)
{
    return request(app).post('/api/jobs/' + jobId + '/apply').set('x-test-user', user).attach('resume', file, { filename: name || 'cv.pdf', contentType: type || 'application/pdf' });
}

beforeEach(() =>
{
    resetDb();
    parser.parseResume.mockReset().mockResolvedValue({ skills: ['Node.js'] });
    matcher.scoreApplication.mockReset().mockResolvedValue({ score: 82.4, breakdown: { skills: 90 }, matched_skills: ['Node.js'], missing_skills: ['Docker'], explanation: 'Good fit.' });
});

afterEach(async () => { await router.idle(); });

describe('apply and pipeline', () =>
{
    test('saves the application and scores it in the background', async () =>
    {
        const res = await apply(candidate(5), 1, pdf);
        expect(res.status).toBe(201);
        expect(res.body.pipelineStatus).toBe('queued');
        await router.idle();
        const a = tables.applications[0];
        expect(a.pipeline_status).toBe('done');
        expect(a.score).toBe(82);
        expect(a.score_json.missing_skills).toEqual(['Docker']);
        expect(matcher.scoreApplication.mock.calls[0][0].job.required_skills).toEqual(['Node.js', 'Docker']);
    });

    test('clamps scores to 0-100', async () =>
    {
        matcher.scoreApplication.mockResolvedValue({ score: 150, matched_skills: [], missing_skills: [] });
        await apply(candidate(5), 1, pdf);
        await router.idle();
        expect(tables.applications[0].score).toBe(100);
    });

    test('a parser failure is saved, not thrown', async () =>
    {
        parser.parseResume.mockRejectedValue(new Error('Gemini quota exceeded'));
        const res = await apply(candidate(5), 1, pdf);
        expect(res.status).toBe(201);
        await router.idle();
        expect(tables.applications[0].pipeline_status).toBe('failed');
        expect(tables.applications[0].pipeline_error).toMatch(/quota/);
    });

    test('a score that is not a number fails the pipeline', async () =>
    {
        matcher.scoreApplication.mockResolvedValue({ score: 'high' });
        await apply(candidate(5), 1, pdf);
        await router.idle();
        expect(tables.applications[0].pipeline_status).toBe('failed');
    });

    test('a hung service times out', async () =>
    {
        parser.parseResume.mockImplementation(() => new Promise(() => { }));
        await apply(candidate(5), 1, pdf);
        await router.idle();
        expect(tables.applications[0].pipeline_status).toBe('failed');
        expect(tables.applications[0].pipeline_error).toMatch(/too long/);
    });
});

describe('upload validation', () =>
{
    test('rejects a non-PDF', async () =>
    {
        const res = await apply(candidate(5), 1, Buffer.from('hello'), 'cv.txt', 'text/plain');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/PDF/);
        expect(tables.applications).toHaveLength(0);
    });

    test('rejects a fake PDF and deletes it', async () =>
    {
        const before = fs.readdirSync(process.env.UPLOAD_DIR).length;
        const res = await apply(candidate(5), 1, Buffer.from('not really a pdf'));
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/not a real PDF/);
        await new Promise(r => setTimeout(r, 50));
        expect(fs.readdirSync(process.env.UPLOAD_DIR).length).toBe(before);
    });

    test('rejects a file over the size limit', async () =>
    {
        const big = Buffer.concat([pdf, Buffer.alloc(2 * 1024 * 1024)]);
        const res = await apply(candidate(5), 1, big);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/larger than 1 MB/);
    });

    test('rejects a missing file', async () =>
    {
        const res = await request(app).post('/api/jobs/1/apply').set('x-test-user', candidate(5));
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Attach your resume/);
    });
});

describe('rules', () =>
{
    test('blocks a second application to the same job', async () =>
    {
        await apply(candidate(5), 1, pdf);
        const res = await apply(candidate(5), 1, pdf);
        expect(res.status).toBe(409);
    });

    test('blocks closed and unknown jobs', async () =>
    {
        expect((await apply(candidate(5), 2, pdf)).status).toBe(409);
        expect((await apply(candidate(5), 99, pdf)).status).toBe(404);
        expect((await apply(candidate(5), 'abc', pdf)).status).toBe(400);
    });

    test('recruiters cannot apply and anonymous users are rejected', async () =>
    {
        expect((await apply(recruiter(10), 1, pdf)).status).toBe(403);
        const anon = await request(app).post('/api/jobs/1/apply').attach('resume', pdf, { filename: 'cv.pdf', contentType: 'application/pdf' });
        expect(anon.status).toBe(401);
    });
});

describe('status and reprocess', () =>
{
    beforeEach(async () => { await apply(candidate(5), 1, pdf); await router.idle(); });

    test('owner candidate and owner recruiter can read status, others cannot', async () =>
    {
        expect((await request(app).get('/api/applications/1/pipeline').set('x-test-user', candidate(5))).body.pipelineStatus).toBe('done');
        expect((await request(app).get('/api/applications/1/pipeline').set('x-test-user', recruiter(10))).status).toBe(200);
        expect((await request(app).get('/api/applications/1/pipeline').set('x-test-user', candidate(6))).status).toBe(404);
        expect((await request(app).get('/api/applications/1/pipeline').set('x-test-user', recruiter(11))).status).toBe(404);
    });

    test('only the recruiter error detail is shown on failure', async () =>
    {
        tables.applications[0].pipeline_status = 'failed';
        tables.applications[0].pipeline_error = 'secret internal detail';
        expect((await request(app).get('/api/applications/1/pipeline').set('x-test-user', candidate(5))).body.error).toBeNull();
        expect((await request(app).get('/api/applications/1/pipeline').set('x-test-user', recruiter(10))).body.error).toMatch(/secret/);
    });

    test('reprocess works for the owning recruiter only', async () =>
    {
        expect((await request(app).post('/api/applications/1/reprocess').set('x-test-user', recruiter(11))).status).toBe(404);
        expect((await request(app).post('/api/applications/1/reprocess').set('x-test-user', candidate(5))).status).toBe(403);
        matcher.scoreApplication.mockResolvedValue({ score: 40, matched_skills: [], missing_skills: ['Node.js'] });
        const res = await request(app).post('/api/applications/1/reprocess').set('x-test-user', recruiter(10));
        expect(res.status).toBe(202);
        await router.idle();
        expect(tables.applications[0].score).toBe(40);
    });

    test('reprocess is refused while a run is in progress', async () =>
    {
        tables.applications[0].pipeline_status = 'matching';
        expect((await request(app).post('/api/applications/1/reprocess').set('x-test-user', recruiter(10))).status).toBe(409);
    });
});

describe('restart recovery', () =>
{
    test('resetStuck fails runs that were cut off, so reprocess works', async () =>
    {
        await apply(candidate(5), 1, pdf);
        await router.idle();
        tables.applications[0].pipeline_status = 'parsing';
        expect(await require('../src/services/pipeline').resetStuck()).toBe(1);
        expect(tables.applications[0].pipeline_status).toBe('failed');
        expect((await request(app).post('/api/applications/1/reprocess').set('x-test-user', recruiter(10))).status).toBe(202);
    });
});
