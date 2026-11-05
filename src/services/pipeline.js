// A4 pipeline: parse the resume, match it to the job, save the score.
// Parsing and matching are Sameer's services (src/services/parser.js and matcher.js).
const db = require('../db');
const parser = require('./parser');
const matcher = require('./matcher');

const STEP_TIMEOUT_MS = Number(process.env.PIPELINE_STEP_TIMEOUT_MS) || 60000;

function withTimeout(promise, label)
{
    let timer;
    const timeout = new Promise(function (resolve, reject)
    {
        timer = setTimeout(function () { reject(new Error(label + ' took too long.')); }, STEP_TIMEOUT_MS);
    });

    return Promise.race([promise, timeout]).finally(function () { clearTimeout(timer); });
}

function toList(value)
{
    if (Array.isArray(value))
    {
        return value;
    }

    try
    {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (error)
    {
        return [];
    }
}

function cleanResult(result)
{
    if (!result || typeof result !== 'object')
    {
        throw new Error('The matcher returned no result.');
    }

    const score = Number(result.score);

    if (isNaN(score))
    {
        throw new Error('The matcher returned a score that is not a number.');
    }

    return {
        score: Math.max(0, Math.min(100, Math.round(score))),
        score_json:
        {
            breakdown: result.breakdown || {},
            matched_skills: toList(result.matched_skills),
            missing_skills: toList(result.missing_skills),
            explanation: typeof result.explanation === 'string' ? result.explanation : ''
        }
    };
}

async function setStatus(id, status, error)
{
    await db.query('UPDATE applications SET pipeline_status = ?, pipeline_error = ? WHERE id = ?', [status, error ? String(error).slice(0, 500) : null, id]);
}

// Never throws: a failure is saved on the application as pipeline_status = 'failed'.
async function runPipeline(applicationId)
{
    try
    {
        const [rows] = await db.query(
            'SELECT a.id, a.resume_path, j.id AS job_id, j.title, j.description, j.required_skills FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?',
            [applicationId]);

        if (!rows.length)
        {
            return { ok: false, error: 'Application not found.' };
        }

        const row = rows[0];
        const job = { id: row.job_id, title: row.title, description: row.description, required_skills: toList(row.required_skills) };

        await setStatus(applicationId, 'parsing');
        const parsed = await withTimeout(parser.parseResume(row.resume_path), 'Resume parsing');
        await db.query('UPDATE applications SET parsed_json = ? WHERE id = ?', [JSON.stringify(parsed || {}), applicationId]);

        await setStatus(applicationId, 'matching');
        const result = cleanResult(await withTimeout(matcher.scoreApplication({ job: job, parsed: parsed }), 'Matching'));

        await db.query('UPDATE applications SET score = ?, score_json = ?, pipeline_status = ?, pipeline_error = NULL WHERE id = ?',
            [result.score, JSON.stringify(result.score_json), 'done', applicationId]);

        return { ok: true, score: result.score };
    }
    catch (error)
    {
        try { await setStatus(applicationId, 'failed', error.message); } catch (inner) { }
        return { ok: false, error: error.message };
    }
}

// Call once when the server starts: runs that were cut off by a restart become 'failed',
// so a recruiter can use reprocess on them.
async function resetStuck()
{
    const [result] = await db.query("UPDATE applications SET pipeline_status = 'failed', pipeline_error = ? WHERE pipeline_status IN ('queued', 'parsing', 'matching')", ['The server restarted while this application was being processed.']);
    return result.affectedRows || 0;
}

module.exports = { runPipeline, resetStuck, toList };
