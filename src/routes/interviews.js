// A7: interviews, shapes and rules follow docs/API.md.
//   GET  /api/interviews                 recruiter: their interviews. candidate: their own. Oldest first, cancelled ones left out.
//   POST /api/interviews                 recruiter: { application_id, interviewer, scheduled_at, duration_minutes?, interview_type?, force? }
//   PUT  /api/interviews/:id             recruiter: { scheduled_at?, duration_minutes?, interviewer?, interview_type?, status?, force? }
//   POST /api/interviews/:id/feedback    recruiter: { technical, communication, problem_solving, culture_fit, recommendation, comments? }
// Statuses are lowercase: scheduled, completed, cancelled. Only a scheduled interview can still change.
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const STATUSES = ['scheduled', 'completed', 'cancelled'];
const SCORES = ['technical', 'communication', 'problem_solving', 'culture_fit'];
const RECOMMENDATIONS = ['hire', 'hold', 'reject'];
const DEFAULT_MINUTES = 45;
const MIN_MINUTES = 15;
const MAX_MINUTES = 240;
const DEFAULT_TYPE = 'technical';
const MAX_AHEAD_MS = 365 * 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const SELECT_INTERVIEW =
    'SELECT i.id, i.application_id, i.recruiter_id, i.interviewer, i.interview_type, i.scheduled_at, i.duration_minutes, i.status, i.feedback, i.created_at, ' +
    'a.job_id, a.candidate_id, u.name AS candidate_name, j.title AS job_title ' +
    'FROM interviews i JOIN applications a ON a.id = i.application_id JOIN users u ON u.id = a.candidate_id JOIN jobs j ON j.id = a.job_id ';

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

// the notification and the status move happen after the interview is saved, so a failure there is only logged
function quietly(label, work)
{
    return Promise.resolve().then(work).catch(function (error) { console.error(label + ' failed:', error.message); });
}

function readFeedback(value)
{
    if (!value)
    {
        return null;
    }

    if (typeof value === 'object')
    {
        return value;
    }

    try
    {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : null;
    }
    catch (error)
    {
        return null;
    }
}

function shape(row, role, conflicts)
{
    const out =
    {
        id: row.id,
        applicationId: row.application_id,
        jobId: row.job_id,
        candidateId: row.candidate_id,
        candidateName: row.candidate_name,
        jobTitle: row.job_title,
        interviewer: row.interviewer,
        interview_type: row.interview_type,
        scheduled_at: new Date(row.scheduled_at).toISOString(),
        duration_minutes: Number(row.duration_minutes) || DEFAULT_MINUTES,
        status: row.status,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        conflicts: conflicts || []
    };

    // the scorecard is for the recruiter only, the candidate never sees it
    if (role === 'recruiter')
    {
        out.feedback = readFeedback(row.feedback);
    }

    return out;
}

function readDate(value)
{
    const when = new Date(value);

    if (typeof value !== 'string' || isNaN(when.getTime()))
    {
        return { error: 'Pick a valid date and time.' };
    }

    if (when.getTime() <= Date.now())
    {
        return { error: 'Pick a date and time in the future.' };
    }

    if (when.getTime() > Date.now() + MAX_AHEAD_MS)
    {
        return { error: 'Interviews can be scheduled up to one year ahead.' };
    }

    return { date: when };
}

function readMinutes(value, fallback)
{
    if (value === undefined || value === null || value === '')
    {
        return { minutes: fallback };
    }

    const minutes = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;

    if (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES)
    {
        return { error: 'The duration must be a whole number of minutes between ' + MIN_MINUTES + ' and ' + MAX_MINUTES + '.' };
    }

    return { minutes: minutes };
}

function readInterviewer(value)
{
    const name = typeof value === 'string' ? value.trim() : '';

    if (!name)
    {
        return { error: 'Enter who is taking the interview.' };
    }

    if (name.length > 100)
    {
        return { error: 'The interviewer name must be under 100 characters.' };
    }

    return { name: name };
}

function readType(value, fallback)
{
    if (value === undefined || value === null || value === '')
    {
        return { type: fallback };
    }

    const type = typeof value === 'string' ? value.trim() : '';

    if (!type || type.length > 50)
    {
        return { error: 'The interview type must be under 50 characters.' };
    }

    return { type: type };
}

// overlap is worked out here and not in SQL so it does not depend on which database Sameer picks
async function findClashes(args)
{
    const end = args.start.getTime() + args.minutes * MINUTE_MS;
    const from = new Date(args.start.getTime() - MAX_MINUTES * MINUTE_MS);
    const [rows] = await db.query(
        "SELECT i.id, i.recruiter_id, i.interviewer, i.scheduled_at, i.duration_minutes, a.candidate_id, u.name AS candidate_name FROM interviews i JOIN applications a ON a.id = i.application_id JOIN users u ON u.id = a.candidate_id WHERE i.status = 'scheduled' AND i.scheduled_at > ? AND i.scheduled_at < ?",
        [from, new Date(end)]);

    const wanted = args.interviewer.toLowerCase();
    const hits = [];

    rows.forEach(function (row)
    {
        const rowStart = new Date(row.scheduled_at).getTime();
        const rowEnd = rowStart + (Number(row.duration_minutes) || DEFAULT_MINUTES) * MINUTE_MS;
        const sameInterviewer = String(row.interviewer || '').trim().toLowerCase() === wanted;
        const sameCandidate = String(row.candidate_id) === String(args.candidateId);

        if (String(row.id) === String(args.ignoreId) || !(rowStart < end && rowEnd > args.start.getTime()) || !(sameInterviewer || sameCandidate))
        {
            return;
        }

        hits.push({ row: row, sameInterviewer: sameInterviewer });
    });

    return hits;
}

// someone else's interview only shows its time, the details belong to that recruiter
function describeClashes(hits, recruiterId)
{
    return hits.map(function (hit)
    {
        const out = { scheduled_at: new Date(hit.row.scheduled_at).toISOString(), duration_minutes: Number(hit.row.duration_minutes) || DEFAULT_MINUTES };

        if (String(hit.row.recruiter_id) === String(recruiterId))
        {
            out.id = hit.row.id;
            out.candidateName = hit.row.candidate_name;
            out.interviewer = hit.row.interviewer;
        }

        return out;
    });
}

function clashMessage(hits, interviewer)
{
    return hits.some(function (hit) { return hit.sameInterviewer; })
        ? interviewer + ' already has an interview that overlaps this time.'
        : 'This applicant already has an interview that overlaps this time.';
}

async function loadOwned(req)
{
    const [rows] = await db.query(SELECT_INTERVIEW + 'WHERE i.id = ?', [parseId(req.params.id) || 0]);
    const row = rows[0];
    return row && String(row.recruiter_id) === String(req.user.id) ? row : null;
}

router.get('/interviews', requireAuth, wrap(async function (req, res)
{
    const owner = req.user.role === 'recruiter' ? 'i.recruiter_id = ?' : 'a.candidate_id = ?';
    const [rows] = await db.query(SELECT_INTERVIEW + "WHERE " + owner + " AND i.status <> 'cancelled' ORDER BY i.scheduled_at ASC LIMIT 200", [req.user.id]);

    return res.json(rows.map(function (row) { return shape(row, req.user.role); }));
}));

router.post('/interviews', requireAuth, requireRole('recruiter'), wrap(async function (req, res)
{
    const body = req.body || {};
    const applicationId = parseId(body.application_id);

    if (!applicationId)
    {
        return fail(res, 400, 'Choose an applicant.');
    }

    const who = readInterviewer(body.interviewer);
    const when = readDate(body.scheduled_at);
    const length = readMinutes(body.duration_minutes, DEFAULT_MINUTES);
    const kind = readType(body.interview_type, DEFAULT_TYPE);
    const problem = who.error || when.error || length.error || kind.error;

    if (problem)
    {
        return fail(res, 400, problem);
    }

    const [apps] = await db.query(
        'SELECT a.id, a.status, a.job_id, a.candidate_id, j.recruiter_id, j.title AS job_title, u.name AS candidate_name FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.candidate_id WHERE a.id = ?',
        [applicationId]);
    const application = apps[0];

    if (!application || String(application.recruiter_id) !== String(req.user.id))
    {
        return fail(res, 404, 'Applicant not found.');
    }

    if (application.status === 'Rejected')
    {
        return fail(res, 409, 'This applicant was rejected. Change their status before scheduling an interview.');
    }

    const hits = await findClashes({ recruiterId: req.user.id, interviewer: who.name, candidateId: application.candidate_id, start: when.date, minutes: length.minutes });
    const conflicts = describeClashes(hits, req.user.id);

    // the page shows this as a warning first, then sends the same request again with force
    if (hits.length && body.force !== true)
    {
        return res.status(409).json({ error: clashMessage(hits, who.name), conflicts: conflicts });
    }

    const [result] = await db.query('INSERT INTO interviews (application_id, recruiter_id, interviewer, interview_type, scheduled_at, duration_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [applicationId, req.user.id, who.name, kind.type, when.date, length.minutes, 'scheduled']);

    if (application.status === 'Shortlisted')
    {
        await quietly('Moving the application to Interview', async function ()
        {
            await db.query('UPDATE applications SET status = ? WHERE id = ?', ['Interview', applicationId]);
            await db.query('INSERT INTO application_history (application_id, from_status, to_status, changed_by) VALUES (?, ?, ?, ?)', [applicationId, 'Shortlisted', 'Interview', req.user.id]);
        });
    }

    await quietly('Sending the interview notification', function ()
    {
        return db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)',
            [application.candidate_id, 'An interview for ' + application.job_title + ' was scheduled for ' + when.date.toISOString().slice(0, 16).replace('T', ' ') + ' UTC.']);
    });

    const row =
    {
        id: result.insertId, application_id: applicationId, recruiter_id: req.user.id, interviewer: who.name, interview_type: kind.type, scheduled_at: when.date,
        duration_minutes: length.minutes, status: 'scheduled', feedback: null, created_at: new Date(), job_id: application.job_id,
        candidate_id: application.candidate_id, candidate_name: application.candidate_name, job_title: application.job_title
    };

    return res.status(201).json({ interview: shape(row, 'recruiter', conflicts), conflicts: conflicts });
}));

router.put('/interviews/:id', requireAuth, requireRole('recruiter'), wrap(async function (req, res)
{
    const row = await loadOwned(req);
    const body = req.body || {};

    if (!row)
    {
        return fail(res, 404, 'Interview not found.');
    }

    if (row.status !== 'scheduled')
    {
        return fail(res, 409, 'This interview is already ' + row.status + ' and cannot be changed.');
    }

    if (['scheduled_at', 'duration_minutes', 'interviewer', 'interview_type', 'status'].every(function (key) { return body[key] === undefined; }))
    {
        return fail(res, 400, 'There is nothing to change.');
    }

    if (body.status !== undefined && STATUSES.indexOf(body.status) === -1)
    {
        return fail(res, 400, 'Status must be scheduled, completed or cancelled.');
    }

    const next =
    {
        when: new Date(row.scheduled_at),
        minutes: Number(row.duration_minutes) || DEFAULT_MINUTES,
        interviewer: row.interviewer,
        type: row.interview_type,
        status: body.status === undefined ? row.status : body.status
    };
    let moved = false;

    if (body.scheduled_at !== undefined)
    {
        // sending the current time back unchanged is fine, even if it has passed by now
        const same = typeof body.scheduled_at === 'string' && new Date(body.scheduled_at).getTime() === next.when.getTime();
        const when = same ? { date: next.when } : readDate(body.scheduled_at);

        if (when.error)
        {
            return fail(res, 400, when.error);
        }

        moved = moved || !same;
        next.when = when.date;
    }

    if (body.duration_minutes !== undefined)
    {
        const length = readMinutes(body.duration_minutes, next.minutes);

        if (length.error)
        {
            return fail(res, 400, length.error);
        }

        moved = moved || length.minutes !== next.minutes;
        next.minutes = length.minutes;
    }

    if (body.interviewer !== undefined)
    {
        const who = readInterviewer(body.interviewer);

        if (who.error)
        {
            return fail(res, 400, who.error);
        }

        moved = moved || who.name.toLowerCase() !== String(row.interviewer || '').trim().toLowerCase();
        next.interviewer = who.name;
    }

    if (body.interview_type !== undefined)
    {
        const kind = readType(body.interview_type, next.type);

        if (kind.error)
        {
            return fail(res, 400, kind.error);
        }

        next.type = kind.type;
    }

    let conflicts = [];

    if (next.status === 'scheduled' && moved)
    {
        const hits = await findClashes({ recruiterId: req.user.id, interviewer: next.interviewer, candidateId: row.candidate_id, start: next.when, minutes: next.minutes, ignoreId: row.id });
        conflicts = describeClashes(hits, req.user.id);

        if (hits.length && body.force !== true)
        {
            return res.status(409).json({ error: clashMessage(hits, next.interviewer), conflicts: conflicts });
        }
    }

    await db.query('UPDATE interviews SET scheduled_at = ?, duration_minutes = ?, interviewer = ?, interview_type = ?, status = ? WHERE id = ?',
        [next.when, next.minutes, next.interviewer, next.type, next.status, row.id]);

    const updated = Object.assign({}, row, { scheduled_at: next.when, duration_minutes: next.minutes, interviewer: next.interviewer, interview_type: next.type, status: next.status });
    return res.json({ interview: shape(updated, 'recruiter', conflicts), conflicts: conflicts });
}));

router.post('/interviews/:id/feedback', requireAuth, requireRole('recruiter'), wrap(async function (req, res)
{
    const row = await loadOwned(req);
    const body = req.body || {};

    if (!row)
    {
        return fail(res, 404, 'Interview not found.');
    }

    if (row.status === 'cancelled')
    {
        return fail(res, 409, 'This interview was cancelled, so it cannot get feedback.');
    }

    if (readFeedback(row.feedback))
    {
        return fail(res, 409, 'Feedback was already submitted for this interview.');
    }

    const feedback = {};

    for (let i = 0; i < SCORES.length; i += 1)
    {
        const raw = body[SCORES[i]];
        const score = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw;

        if (!Number.isInteger(score) || score < 1 || score > 5)
        {
            return fail(res, 400, 'Rate ' + SCORES[i].replace('_', ' ') + ' with a whole number from 1 to 5.');
        }

        feedback[SCORES[i]] = score;
    }

    if (RECOMMENDATIONS.indexOf(body.recommendation) === -1)
    {
        return fail(res, 400, 'The recommendation must be hire, hold or reject.');
    }

    if (body.comments !== undefined && body.comments !== null && (typeof body.comments !== 'string' || body.comments.length > 2000))
    {
        return fail(res, 400, 'Comments must be text under 2000 characters.');
    }

    feedback.recommendation = body.recommendation;
    feedback.comments = typeof body.comments === 'string' ? body.comments.trim() : '';
    feedback.submitted_at = new Date().toISOString();

    await db.query('UPDATE interviews SET feedback = ?, status = ? WHERE id = ?', [JSON.stringify(feedback), 'completed', row.id]);

    return res.json(shape(Object.assign({}, row, { feedback: feedback, status: 'completed' }), 'recruiter'));
}));

router.use(function (error, req, res, next)
{
    console.error('Interview route error:', error.message);
    return fail(res, 500, 'Something went wrong on the server. Try again in a moment.');
});

module.exports = router;
