// A4: candidate applies with a resume, then the pipeline scores it in the background.
//   POST /api/applications                  candidate, multipart fields "jobId" and "resume" (PDF)
//   GET  /api/applications/:id/pipeline     candidate who owns it, or recruiter who owns the job
//   POST /api/applications/:id/reprocess    recruiter who owns the job
// Status path after applying: Submitted -> Parsed -> AI Assessment Available (see docs/API.md)
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { runPipeline } = require('../services/pipeline');

const router = express.Router();
const MAX_MB = Number(process.env.MAX_UPLOAD_MB) || 5;
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const inflight = new Set();

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer(
{
    storage: multer.diskStorage(
    {
        destination: function (req, file, cb) { cb(null, UPLOAD_DIR); },
        filename: function (req, file, cb) { cb(null, crypto.randomBytes(16).toString('hex') + '.pdf'); }
    }),
    limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
    fileFilter: function (req, file, cb)
    {
        const ok = file.mimetype === 'application/pdf' && /\.pdf$/i.test(file.originalname);
        cb(ok ? null : new Error('PDF_ONLY'), ok);
    }
});

function fail(res, status, message)
{
    return res.status(status).json({ error: message });
}

function removeFile(file)
{
    if (file && file.path)
    {
        fs.unlink(file.path, function () { });
    }
}

function looksLikePdf(file)
{
    const fd = fs.openSync(file.path, 'r');
    const buffer = Buffer.alloc(5);

    try { fs.readSync(fd, buffer, 0, 5, 0); } finally { fs.closeSync(fd); }

    return buffer.toString('latin1') === '%PDF-';
}

// history and notifications are nice to have, the application must still be saved if they break
function quietly(label, work)
{
    return Promise.resolve().then(work).catch(function (error) { console.error(label + ' failed:', error.message); });
}

async function changeStatus(applicationId, from, to, userId)
{
    await db.query('UPDATE applications SET status = ? WHERE id = ?', [to, applicationId]);
    await db.query('INSERT INTO application_history (application_id, from_status, to_status, changed_by) VALUES (?, ?, ?, ?)', [applicationId, from, to, userId]);
}

// only a brand new application walks forward, a reprocess must never pull a later status back
async function moveForward(applicationId)
{
    const [rows] = await db.query('SELECT status, pipeline_status FROM applications WHERE id = ?', [applicationId]);
    const row = rows[0];

    if (!row || row.pipeline_status !== 'done' || row.status !== 'Submitted')
    {
        return;
    }

    await changeStatus(applicationId, 'Submitted', 'Parsed', null);
    await changeStatus(applicationId, 'Parsed', 'AI Assessment Available', null);
}

function startPipeline(applicationId)
{
    const job = runPipeline(applicationId)
        .then(function () { return quietly('Moving the status forward', function () { return moveForward(applicationId); }); })
        .catch(function (error) { console.error('Pipeline run failed:', error.message); })
        .finally(function () { inflight.delete(job); });

    inflight.add(job);
}

function wrap(handler)
{
    return function (req, res, next) { Promise.resolve(handler(req, res)).catch(next); };
}

function parseId(value)
{
    return /^\d+$/.test(String(value)) ? Number(value) : null;
}

router.post('/applications', requireAuth, requireRole('candidate'), function (req, res, next)
{
    upload.single('resume')(req, res, function (error)
    {
        if (!error)
        {
            return next();
        }

        if (error.code === 'LIMIT_FILE_SIZE')
        {
            return fail(res, 413, 'Your resume is larger than ' + MAX_MB + ' MB. Upload a smaller PDF.');
        }

        if (error.message === 'PDF_ONLY')
        {
            return fail(res, 400, 'Your resume must be a PDF file.');
        }

        return fail(res, 400, 'The resume upload failed. Try again with a PDF in the "resume" field.');
    });
}, wrap(async function (req, res)
{
    // jobId comes in the multipart form now, so it is only readable after multer has run
    const jobId = parseId(req.body && req.body.jobId);
    let saved = false;

    try
    {
        if (!jobId)
        {
            removeFile(req.file);
            return fail(res, 400, 'The job id is not valid.');
        }

        if (!req.file)
        {
            return fail(res, 400, 'Attach your resume as a PDF in the "resume" field.');
        }

        if (!looksLikePdf(req.file))
        {
            removeFile(req.file);
            return fail(res, 400, 'That file is not a real PDF. Export your resume as a PDF and try again.');
        }

        const [jobs] = await db.query('SELECT id, title, status FROM jobs WHERE id = ?', [jobId]);

        if (!jobs.length)
        {
            removeFile(req.file);
            return fail(res, 404, 'This job does not exist.');
        }

        if (String(jobs[0].status || '').toLowerCase() === 'closed')
        {
            removeFile(req.file);
            return fail(res, 409, 'This job is closed and no longer accepts applications.');
        }

        const [existing] = await db.query('SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?', [jobId, req.user.id]);

        if (existing.length)
        {
            removeFile(req.file);
            return fail(res, 409, 'You have already applied to this job.');
        }

        const [result] = await db.query('INSERT INTO applications (job_id, candidate_id, resume_path, status, pipeline_status) VALUES (?, ?, ?, ?, ?)',
            [jobId, req.user.id, req.file.path, 'Submitted', 'queued']);

        // from here the row exists, so the file has to stay even if something below goes wrong
        saved = true;
        const appliedAt = new Date().toISOString();
        const title = jobs[0].title;

        await quietly('Writing the first history entry', function ()
        {
            return db.query('INSERT INTO application_history (application_id, from_status, to_status, changed_by) VALUES (?, ?, ?, ?)', [result.insertId, null, 'Submitted', req.user.id]);
        });

        await quietly('Sending the received notification', function ()
        {
            return db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [req.user.id, 'Your application for ' + title + ' was received.']);
        });

        startPipeline(result.insertId);

        return res.status(201).json(
        {
            application: { id: result.insertId, jobId: jobId, jobTitle: title, status: 'Submitted', appliedAt: appliedAt, timeline: [{ status: 'Submitted', at: appliedAt }] },
            jobTitle: title
        });
    }
    catch (error)
    {
        if (!saved)
        {
            removeFile(req.file);
        }

        throw error;
    }
}));

async function loadForAccess(req)
{
    const [rows] = await db.query('SELECT a.id, a.candidate_id, a.pipeline_status, a.pipeline_error, j.recruiter_id FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?', [parseId(req.params.id) || 0]);
    return rows[0] || null;
}

router.get('/applications/:id/pipeline', requireAuth, wrap(async function (req, res)
{
    const row = await loadForAccess(req);
    const allowed = row && ((req.user.role === 'candidate' && String(row.candidate_id) === String(req.user.id)) || (req.user.role === 'recruiter' && String(row.recruiter_id) === String(req.user.id)));

    if (!allowed)
    {
        return fail(res, 404, 'Application not found.');
    }

    return res.json({ id: row.id, pipelineStatus: row.pipeline_status, error: row.pipeline_status === 'failed' && req.user.role === 'recruiter' ? row.pipeline_error : null });
}));

router.post('/applications/:id/reprocess', requireAuth, requireRole('recruiter'), wrap(async function (req, res)
{
    const row = await loadForAccess(req);

    if (!row || String(row.recruiter_id) !== String(req.user.id))
    {
        return fail(res, 404, 'Application not found.');
    }

    if (row.pipeline_status === 'parsing' || row.pipeline_status === 'matching' || row.pipeline_status === 'queued')
    {
        return fail(res, 409, 'This application is already being processed. Wait for it to finish.');
    }

    await db.query('UPDATE applications SET pipeline_status = ?, pipeline_error = NULL WHERE id = ?', ['queued', row.id]);
    startPipeline(row.id);
    return res.status(202).json({ id: row.id, pipelineStatus: 'queued' });
}));

router.use(function (error, req, res, next)
{
    console.error('Pipeline route error:', error.message);
    return fail(res, 500, 'Something went wrong on the server. Try again in a moment.');
});

router.idle = function () { return Promise.all(Array.from(inflight)); };

module.exports = router;
