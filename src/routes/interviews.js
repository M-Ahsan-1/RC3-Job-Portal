// A7: interviews.
//   GET   /api/interviews        recruiter: interviews for their jobs. candidate: their own interviews.
//   POST  /api/interviews        recruiter: schedule { applicationId, scheduledAt, mode, location, notes }
//   PATCH /api/interviews/:id    recruiter: { status: "Completed" | "Cancelled" } (only from "Scheduled")
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const MODES = ['Online', 'On-site', 'Phone'];
const GAP_MS = 60 * 60 * 1000;
const MAX_AHEAD_MS = 365 * 24 * 60 * 60 * 1000;

function fail(res, status, message)
{
    return res.status(status).json({ error: message });
}

function wrap(handler)
{
    return function (req, res, next) { Promise.resolve(handler(req, res)).catch(next); };
}

function parseId(value)
{
    return /^\d+$/.test(String(value)) ? Number(value) : null;
}

function shape(row, role)
{
    const out =
    {
        id: row.id,
        applicationId: row.application_id,
        applicantName: row.applicant_name,
        jobTitle: row.job_title,
        scheduledAt: new Date(row.scheduled_at).toISOString(),
        mode: row.mode,
        location: row.location || '',
        status: row.status
    };

    if (role === 'recruiter')
    {
        out.notes = row.notes || '';
    }

    return out;
}

router.get('/interviews', requireAuth, wrap(async function (req, res)
{
    const owner = req.user.role === 'recruiter' ? 'i.recruiter_id = ?' : 'a.candidate_id = ?';
    const [rows] = await db.query(
        'SELECT i.id, i.application_id, i.scheduled_at, i.mode, i.location, i.notes, i.status, u.name AS applicant_name, j.title AS job_title ' +
        'FROM interviews i JOIN applications a ON a.id = i.application_id JOIN users u ON u.id = a.candidate_id JOIN jobs j ON j.id = a.job_id ' +
        'WHERE ' + owner + ' ORDER BY i.scheduled_at ASC LIMIT 200', [req.user.id]);

    return res.json(rows.map(function (row) { return shape(row, req.user.role); }));
}));

router.post('/interviews', requireAuth, requireRole('recruiter'), wrap(async function (req, res)
{
    const body = req.body || {};
    const applicationId = parseId(body.applicationId);
    const when = new Date(body.scheduledAt);
    const mode = body.mode || 'Online';
    const location = body.location === undefined ? '' : String(body.location).trim();
    const notes = body.notes === undefined ? '' : String(body.notes).trim();

    if (!applicationId)
    {
        return fail(res, 400, 'Choose an applicant.');
    }

    if (typeof body.scheduledAt !== 'string' || isNaN(when.getTime()))
    {
        return fail(res, 400, 'Pick a valid date and time.');
    }

    if (when.getTime() <= Date.now())
    {
        return fail(res, 400, 'Pick a date and time in the future.');
    }

    if (when.getTime() > Date.now() + MAX_AHEAD_MS)
    {
        return fail(res, 400, 'Interviews can be scheduled up to one year ahead.');
    }

    if (MODES.indexOf(mode) === -1)
    {
        return fail(res, 400, 'Format must be Online, On-site or Phone.');
    }

    if (location.length > 300 || notes.length > 1000)
    {
        return fail(res, 400, 'The link or place must be under 300 characters and the notes under 1000.');
    }

    const [apps] = await db.query('SELECT a.id, a.status, j.recruiter_id FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?', [applicationId]);

    if (!apps.length || String(apps[0].recruiter_id) !== String(req.user.id))
    {
        return fail(res, 404, 'Applicant not found.');
    }

    if (apps[0].status === 'Rejected')
    {
        return fail(res, 409, 'This applicant was rejected. Change their status before scheduling an interview.');
    }

    const from = new Date(when.getTime() - GAP_MS);
    const to = new Date(when.getTime() + GAP_MS);
    const [clash] = await db.query(
        "SELECT i.id FROM interviews i JOIN applications a ON a.id = i.application_id WHERE i.status = 'Scheduled' AND i.scheduled_at > ? AND i.scheduled_at < ? AND (i.recruiter_id = ? OR a.candidate_id = (SELECT candidate_id FROM applications WHERE id = ?)) LIMIT 1",
        [from, to, req.user.id, applicationId]);

    if (clash.length)
    {
        return fail(res, 409, 'You or the applicant already have an interview within an hour of this time.');
    }

    const [result] = await db.query('INSERT INTO interviews (application_id, recruiter_id, scheduled_at, mode, location, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [applicationId, req.user.id, when, mode, location, notes, 'Scheduled']);

    return res.status(201).json({ id: result.insertId, applicationId: applicationId, scheduledAt: when.toISOString(), mode: mode, location: location, notes: notes, status: 'Scheduled' });
}));

router.patch('/interviews/:id', requireAuth, requireRole('recruiter'), wrap(async function (req, res)
{
    const id = parseId(req.params.id);
    const status = req.body && req.body.status;

    if (['Completed', 'Cancelled'].indexOf(status) === -1)
    {
        return fail(res, 400, 'Status must be Completed or Cancelled.');
    }

    const [rows] = await db.query('SELECT id, recruiter_id, status FROM interviews WHERE id = ?', [id || 0]);

    if (!rows.length || String(rows[0].recruiter_id) !== String(req.user.id))
    {
        return fail(res, 404, 'Interview not found.');
    }

    if (rows[0].status !== 'Scheduled')
    {
        return fail(res, 409, 'This interview is already ' + rows[0].status.toLowerCase() + ' and cannot be changed.');
    }

    await db.query('UPDATE interviews SET status = ? WHERE id = ?', [status, id]);
    return res.json({ id: id, status: status });
}));

router.use(function (error, req, res, next)
{
    console.error('Interview route error:', error.message);
    return fail(res, 500, 'Something went wrong on the server. Try again in a moment.');
});

module.exports = router;
