// A9: analytics for the logged in recruiter, only for their own jobs.
//   GET /api/analytics
// One response carries both key sets from docs/API.md, so recruiter.html and analytics.html call the same route:
//   overview page:  active_jobs, total_applications, shortlisted_count, pending_reviews, upcoming_interviews,
//                   applications_by_job, applications_by_stage, shortlist_rate, avg_processing_time, common_skill_gaps
//   analytics page: totals, funnel, distribution, topSkills, topGaps, byJob
// The score used everywhere is the override score when there is one, otherwise the AI score.
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const FUNNEL_ORDER = ['Submitted', 'Parsed', 'AI Assessment Available', 'Recruiter Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];
const SHORTLISTED_OR_LATER = ['Shortlisted', 'Interview', 'Selected'];
const NEEDS_REVIEW = ['AI Assessment Available', 'Recruiter Review'];
const FINISHED = ['Selected', 'Rejected'];
const BANDS = [['0-39', 0, 39], ['40-59', 40, 59], ['60-79', 60, 79], ['80-100', 80, 100]];
const TOP = 6;
const MAX_ROWS = 20000;
const DAY_MS = 24 * 60 * 60 * 1000;

function asObject(value)
{
    if (value && typeof value === 'object')
    {
        return value;
    }

    try
    {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : {};
    }
    catch (error)
    {
        return {};
    }
}

function skillNames(list)
{
    if (!Array.isArray(list))
    {
        return [];
    }

    return list.map(function (item) { return typeof item === 'string' ? item : (item && (item.skill || item.name)) || ''; }).map(function (s) { return String(s).trim(); }).filter(Boolean);
}

function average(numbers)
{
    return numbers.length ? Math.round(numbers.reduce(function (sum, n) { return sum + n; }, 0) / numbers.length) : 0;
}

// average days from applying to a final decision, one decimal. 0 when nothing has been decided yet
function averageDays(rows)
{
    const spans = rows.filter(function (r) { return FINISHED.indexOf(r.status) !== -1 && r.created && r.updated; })
        .map(function (r) { return (new Date(r.updated).getTime() - new Date(r.created).getTime()) / DAY_MS; })
        .filter(function (days) { return !isNaN(days) && days >= 0; });

    return spans.length ? Math.round(spans.reduce(function (sum, d) { return sum + d; }, 0) / spans.length * 10) / 10 : 0;
}

function tally(rows, pick)
{
    const counts = {};

    rows.forEach(function (row)
    {
        const seen = {};

        pick(row).forEach(function (name)
        {
            const key = name.toLowerCase();

            if (!seen[key])
            {
                seen[key] = true;
                counts[key] = counts[key] || { skill: name, count: 0 };
                counts[key].count += 1;
            }
        });
    });

    return Object.keys(counts).map(function (key) { return counts[key]; })
        .sort(function (a, b) { return b.count - a.count || a.skill.localeCompare(b.skill); }).slice(0, TOP);
}

function build(jobs, rows, upcoming)
{
    const scored = rows.filter(function (r) { return r.score !== null; });
    const count = function (status) { return rows.filter(function (r) { return r.status === status; }).length; };
    const countIn = function (list) { return rows.filter(function (r) { return list.indexOf(r.status) !== -1; }).length; };
    const extra = [];

    rows.forEach(function (r) { if (FUNNEL_ORDER.indexOf(r.status) === -1 && extra.indexOf(r.status) === -1) { extra.push(r.status); } });

    const funnel = FUNNEL_ORDER.concat(extra).map(function (status) { return { status: status, count: count(status) }; });
    const topGaps = tally(rows, function (r) { return skillNames(r.json.missing_skills || r.json.skill_gaps || r.json.gaps); });
    // someone who moved on to Interview or Selected was shortlisted too, so they stay in this number
    const shortlisted = countIn(SHORTLISTED_OR_LATER);

    return {
        // overview page
        active_jobs: jobs.filter(function (j) { return String(j.status || 'open').toLowerCase() !== 'closed'; }).length,
        total_applications: rows.length,
        shortlisted_count: shortlisted,
        pending_reviews: countIn(NEEDS_REVIEW),
        upcoming_interviews: upcoming,
        applications_by_job: jobs.map(function (job) { return { job: job.title, count: rows.filter(function (r) { return String(r.job_id) === String(job.id); }).length }; }),
        applications_by_stage: funnel,
        shortlist_rate: rows.length ? Math.round(shortlisted / rows.length * 100) : 0,
        avg_processing_time: averageDays(rows),
        common_skill_gaps: topGaps,

        // analytics page
        totals:
        {
            jobs: jobs.length,
            applicants: rows.length,
            shortlisted: shortlisted,
            selected: count('Selected'),
            averageScore: average(scored.map(function (r) { return r.score; })),
            unscored: rows.length - scored.length
        },
        funnel: funnel,
        distribution: BANDS.map(function (b) { return { label: b[0], count: scored.filter(function (r) { return r.score >= b[1] && r.score <= b[2]; }).length }; }),
        topSkills: tally(rows, function (r) { return skillNames(r.json.matched_skills); }),
        topGaps: topGaps,
        byJob: jobs.map(function (job)
        {
            const mine = rows.filter(function (r) { return String(r.job_id) === String(job.id); });
            return { title: job.title, applicants: mine.length, averageScore: average(mine.filter(function (r) { return r.score !== null; }).map(function (r) { return r.score; })) };
        })
    };
}

router.get('/analytics', requireAuth, requireRole('recruiter'), async function (req, res)
{
    try
    {
        const [jobs] = await db.query('SELECT id, title, status FROM jobs WHERE recruiter_id = ? ORDER BY id', [req.user.id]);
        const [applications] = await db.query(
            'SELECT a.job_id, a.status, a.created_at, a.updated_at, COALESCE(a.override_score, a.score) AS effective_score, a.score_json FROM applications a JOIN jobs j ON j.id = a.job_id WHERE j.recruiter_id = ? LIMIT ' + MAX_ROWS,
            [req.user.id]);
        const [upcoming] = await db.query('SELECT COUNT(*) AS total FROM interviews WHERE recruiter_id = ? AND status = ? AND scheduled_at > ?', [req.user.id, 'scheduled', new Date()]);

        const rows = applications.map(function (a)
        {
            const value = a.effective_score === null || a.effective_score === undefined ? null : Number(a.effective_score);
            return { job_id: a.job_id, status: a.status, created: a.created_at, updated: a.updated_at, score: value === null || isNaN(value) ? null : value, json: asObject(a.score_json) };
        });

        return res.json(build(jobs, rows, Number(upcoming[0] && upcoming[0].total) || 0));
    }
    catch (error)
    {
        console.error('Analytics route error:', error.message);
        return res.status(500).json({ error: 'Could not load analytics. Try again in a moment.' });
    }
});

module.exports = router;
