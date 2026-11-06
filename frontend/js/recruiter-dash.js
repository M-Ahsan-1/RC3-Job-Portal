const RD_STAGES = ['Submitted', 'Parsed', 'AI Assessment Available', 'Recruiter Review', 'Shortlisted', 'Interview', 'Selected'];

const RD_LABEL =
{
    'Submitted': 'Submitted',
    'Parsed': 'Parsed',
    'AI Assessment Available': 'AI assessed',
    'Recruiter Review': 'Under review',
    'Shortlisted': 'Shortlisted',
    'Interview': 'Interview',
    'Selected': 'Selected',
    'Rejected': 'Rejected'
};

const RD_PENDING = ['Submitted', 'Parsed', 'AI Assessment Available', 'Recruiter Review'];
const RD_FEED_LIMIT = 8;
const RD_SPARK_DAYS = 14;
const RD_STAMP_MS = 30000;
const RD_FLOW = { width: 760, height: 244, top: 34, plot: 124, node: 14, pad: 28, labelY: 236 };

const RDash =
{
    state:
    {
        data: null,
        jobs: [],
        rows: [],
        interviews: [],
        filter: null,
        drawn: false,
        loadedAt: 0,
        timer: null
    },

    el(id)
    {
        return document.getElementById(id);
    },

    label(status)
    {
        return RD_LABEL[status] || status;
    },

    relTime(iso)
    {
        const time = new Date(iso).getTime();

        if (isNaN(time))
        {
            return '';
        }

        const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));

        if (seconds < 60)
        {
            return 'just now';
        }

        const minutes = Math.floor(seconds / 60);

        if (minutes < 60)
        {
            return minutes + ' min ago';
        }

        const hours = Math.floor(minutes / 60);

        if (hours < 24)
        {
            return hours + (hours === 1 ? ' hour ago' : ' hours ago');
        }

        const days = Math.floor(hours / 24);

        if (days < 7)
        {
            return days + (days === 1 ? ' day ago' : ' days ago');
        }

        return Dash.formatDate(iso);
    },

    clock(iso)
    {
        return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    },

    sameDay(a, b)
    {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    },

    setNumber(element, value, animate)
    {
        if (animate && typeof countUp === 'function')
        {
            countUp(element, value, 700);
            return;
        }

        element.textContent = value;
    },

    needsSkillReview(row)
    {
        const score = row.score_json || {};
        const claims = score.unsupported_claims || [];
        const matched = score.matched_skills || [];

        return claims.length > 0 || matched.some(function (item)
        {
            return item.verified === false;
        });
    },

    interviewsToday()
    {
        const now = new Date();

        return RDash.state.interviews.filter(function (interview)
        {
            return RDash.sameDay(new Date(interview.scheduled_at), now);
        });
    },

    /* header */

    renderHead(user)
    {
        const hour = new Date().getHours();
        const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

        RDash.el('greeting').textContent = part + ', ' + user.name.split(' ')[0];

        RDash.el('today').textContent = new Date().toLocaleDateString('en-GB',
        {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    },

    stamp()
    {
        const box = RDash.el('updated');

        if (!RDash.state.loadedAt)
        {
            box.textContent = '';
            return;
        }

        const minutes = Math.floor((Date.now() - RDash.state.loadedAt) / 60000);

        box.textContent = minutes < 1 ? 'Updated just now' : 'Updated ' + minutes + ' min ago';
    },

    /* needs your attention */

    renderAttention()
    {
        const data = RDash.state.data;
        const rows = RDash.state.rows;
        const today = RDash.interviewsToday().length;
        const review = rows.filter(RDash.needsSkillReview).length;
        const pending = data.pending_reviews || 0;
        let html = '';

        if (pending > 0)
        {
            html += '<button class="rd-att rd-att-main" type="button" data-filter="pending"><b>' + pending + '</b><span>' +
                (pending === 1 ? 'application waiting for your review' : 'applications waiting for your review') + '</span></button>';
        }

        if (today > 0)
        {
            html += '<a class="rd-att" href="interviews.html"><b>' + today + '</b><span>' +
                (today === 1 ? 'interview today' : 'interviews today') + '</span></a>';
        }

        if (review > 0)
        {
            html += '<button class="rd-att" type="button" data-filter="skills"><b>' + review + '</b><span>' +
                (review === 1 ? 'applicant with skills to check' : 'applicants with skills to check') + '</span></button>';
        }

        if (!html)
        {
            html = '<div class="rd-clear">Nothing is waiting on you right now. New applications and interviews will show up here.</div>';
        }

        RDash.el('attention').innerHTML = html;
    },

    /* key numbers */

    sparkline()
    {
        const rows = RDash.state.rows;
        const days = [];
        const start = new Date();

        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - (RD_SPARK_DAYS - 1));

        for (let i = 0; i < RD_SPARK_DAYS; i++)
        {
            days.push(0);
        }

        let dated = 0;

        rows.forEach(function (row)
        {
            const when = new Date(row.appliedAt || row.createdAt);

            if (isNaN(when.getTime()))
            {
                return;
            }

            dated++;

            const index = Math.floor((when.getTime() - start.getTime()) / 86400000);

            if (index >= 0 && index < RD_SPARK_DAYS)
            {
                days[index]++;
            }
        });

        const total = days.reduce(function (sum, value) { return sum + value; }, 0);

        if (dated < 2 || total === 0)
        {
            return '';
        }

        const peak = Math.max.apply(null, days) || 1;
        const points = days.map(function (value, index)
        {
            const x = 3 + index * (114 / (RD_SPARK_DAYS - 1));
            const y = 23 - (value / peak) * 20;
            return x.toFixed(1) + ',' + y.toFixed(1);
        });
        const last = points[points.length - 1].split(',');

        return '<svg class="rd-spark" viewBox="0 0 120 26" role="img" aria-label="' + total + ' applications in the last ' + RD_SPARK_DAYS + ' days">' +
            '<polyline points="' + points.join(' ') + '"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.4"/></svg>';
    },

    renderKpis()
    {
        const data = RDash.state.data;
        const first = !RDash.state.drawn;
        const items =
        [
            { label: 'Active jobs', value: data.active_jobs || 0, extra: '' },
            { label: 'Applications', value: data.total_applications || 0, extra: RDash.sparkline() },
            { label: 'Shortlisted', value: data.shortlisted_count || 0, extra: '' },
            { label: 'Pending reviews', value: data.pending_reviews || 0, extra: '' },
            { label: 'Upcoming interviews', value: data.upcoming_interviews || 0, extra: '' }
        ];

        const box = RDash.el('kpis');

        box.innerHTML = items.map(function (item)
        {
            return '<div class="rd-kpi"><span class="rd-kpi-label">' + Dash.esc(item.label) + '</span>' +
                '<b class="rd-kpi-num">' + (first ? 0 : item.value) + '</b>' + item.extra + '</div>';
        }).join('');

        const numbers = box.querySelectorAll('.rd-kpi-num');

        for (let i = 0; i < numbers.length; i++)
        {
            RDash.setNumber(numbers[i], items[i].value, first);
        }
    },

    /* pipeline flow */

    flowModel()
    {
        const rows = RDash.state.rows;
        const funnel = (RDash.state.data && RDash.state.data.funnel) || [];
        const now = {};
        const counts = [];
        const drops = [];
        let rejected = 0;

        funnel.forEach(function (entry)
        {
            now[entry.status] = entry.count;
        });

        rejected = now['Rejected'] || 0;

        for (let i = 0; i < RD_STAGES.length; i++)
        {
            counts.push(0);
            drops.push(0);
        }

        const exact = rows.length > 0 && rows.some(function (row)
        {
            return Array.isArray(row.history) && row.history.length > 0;
        });

        if (exact)
        {
            rows.forEach(function (row)
            {
                let top = RD_STAGES.indexOf(row.status);

                (row.history || []).forEach(function (entry)
                {
                    const index = RD_STAGES.indexOf(entry.to);

                    if (index > top)
                    {
                        top = index;
                    }
                });

                if (top < 0)
                {
                    top = 0;
                }

                for (let i = 0; i <= top; i++)
                {
                    counts[i]++;
                }

                if (row.status === 'Rejected')
                {
                    drops[top]++;
                }
            });
        }
        else
        {
            for (let i = 0; i < RD_STAGES.length; i++)
            {
                for (let j = i; j < RD_STAGES.length; j++)
                {
                    counts[i] += now[RD_STAGES[j]] || 0;
                }
            }
        }

        return { counts: counts, drops: drops, now: now, exact: exact, rejected: rejected };
    },

    renderFlow()
    {
        const model = RDash.flowModel();
        const f = RD_FLOW;
        const count = RD_STAGES.length;
        const step = (f.width - f.pad * 2 - f.node) / (count - 1);
        const max = model.counts[0] || 1;
        const xs = [];
        const hs = [];
        let flows = '';
        let drops = '';
        let nodes = '';
        let delay = 0;

        for (let i = 0; i < count; i++)
        {
            xs.push(f.pad + i * step);
            hs.push(model.counts[i] ? Math.max(4, model.counts[i] / max * f.plot) : 0);
        }

        for (let i = 0; i < count - 1; i++)
        {
            const left = xs[i] + f.node;
            const gap = step - f.node;
            const rate = model.counts[i] ? Math.round(model.counts[i + 1] / model.counts[i] * 100) : 0;
            const when = delay + 'ms';

            if (hs[i + 1] > 0)
            {
                flows += '<rect class="rd-band" x="' + left.toFixed(1) + '" y="' + f.top + '" width="' + gap.toFixed(1) + '" height="' + hs[i + 1].toFixed(1) + '" style="--d:' + when + '"/>';
            }

            if (model.counts[i] > 0)
            {
                flows += '<text class="rd-conv" x="' + (left + gap / 2).toFixed(1) + '" y="' + (f.top - 10) + '">' + rate + '%</text>';
            }

            if (model.exact && model.drops[i] > 0)
            {
                const thick = Math.max(3, model.drops[i] / max * f.plot);
                const startY = f.top + hs[i] - thick / 2;
                const endX = left + gap * 0.5;
                const endY = f.top + f.plot + 38;

                drops += '<path class="rd-drop" pathLength="1" style="--d:' + (delay + 200) + 'ms" stroke-width="' + thick.toFixed(1) + '" d="M' + left.toFixed(1) + ' ' + startY.toFixed(1) +
                    ' C' + endX.toFixed(1) + ' ' + startY.toFixed(1) + ' ' + endX.toFixed(1) + ' ' + (endY - 24) + ' ' + endX.toFixed(1) + ' ' + endY + '"/>';
            }

            delay += 90;
        }

        for (let i = 0; i < count; i++)
        {
            const status = RD_STAGES[i];
            const on = RDash.state.filter && RDash.state.filter.stage === status;
            const cx = xs[i] + f.node / 2;
            const names = RDash.label(status);

            nodes += '<g class="rd-node' + (on ? ' on' : '') + '" tabindex="0" role="button" aria-pressed="' + (on ? 'true' : 'false') + '" data-index="' + i + '" data-stage="' + Dash.esc(status) + '" ' +
                'aria-label="' + Dash.esc(names) + ', ' + model.counts[i] + ' reached this stage. Show applicants now in this stage.">' +
                '<rect class="rd-hit" x="' + (xs[i] - 8).toFixed(1) + '" y="' + (f.top - 24) + '" width="' + (f.node + 16) + '" height="' + (f.plot + 62) + '"/>' +
                '<rect class="rd-bar" x="' + xs[i].toFixed(1) + '" y="' + f.top + '" width="' + f.node + '" height="' + hs[i].toFixed(1) + '" rx="3" style="--d:' + (i * 90) + 'ms"/>' +
                '<text class="rd-count" x="' + cx.toFixed(1) + '" y="' + (f.top - 10) + '">' + model.counts[i] + '</text>' +
                '<text class="rd-stage" x="' + cx.toFixed(1) + '" y="' + f.labelY + '">' + Dash.esc(names) + '</text></g>';
        }

        const play = !RDash.state.drawn;

        RDash.el('flow').className = 'rd-flow' + (play ? ' play' : '');

        RDash.el('flow').innerHTML = '<svg viewBox="0 0 ' + f.width + ' ' + f.height + '" role="group" aria-label="Pipeline from submitted to selected">' +
            '<g>' + flows + '</g><g>' + drops + '</g><g>' + nodes + '</g></svg>';

        RDash.el('flow-key').innerHTML =
            '<span><i class="rd-key move"></i>Moved on to the next stage</span>' +
            '<span><i class="rd-key drop"></i>Rejected' + (model.rejected ? ' (' + model.rejected + ')' : '') + '</span>' +
            '<span>Select a stage to list the applicants who are in it now.</span>';

        RDash.flow = model;
    },

    showTip(node)
    {
        const model = RDash.flow;

        if (!model)
        {
            return;
        }

        const index = Number(node.dataset.index);
        const status = RD_STAGES[index];
        const tip = RDash.el('flow-tip');
        const wrap = RDash.el('flow-wrap');
        let text = '<b>' + Dash.esc(RDash.label(status)) + '</b>' + model.counts[index] + ' reached this stage<br>' + (model.now[status] || 0) + ' there now';

        if (index < RD_STAGES.length - 1 && model.counts[index] > 0)
        {
            text += '<br>' + Math.round(model.counts[index + 1] / model.counts[index] * 100) + '% moved on';
        }

        if (model.exact && model.drops[index] > 0)
        {
            text += '<br>' + model.drops[index] + ' rejected here';
        }

        tip.innerHTML = text;
        tip.hidden = false;

        const box = node.querySelector('.rd-bar').getBoundingClientRect();
        const area = wrap.getBoundingClientRect();
        const half = tip.offsetWidth / 2;
        const middle = box.left - area.left + box.width / 2;

        tip.style.left = Math.max(half, Math.min(area.width - half, middle)) + 'px';
        tip.style.top = (box.top - area.top) + 'px';
    },

    hideTip()
    {
        RDash.el('flow-tip').hidden = true;
    },

    /* applicants in the chosen stage */

    setFilter(filter)
    {
        const same = RDash.state.filter && filter && RDash.state.filter.key === filter.key;

        RDash.state.filter = same ? null : filter;
        RDash.renderFlow();
        RDash.renderStageList(true);
    },

    filterFor(key)
    {
        if (key === 'pending')
        {
            return {
                key: 'pending',
                stage: null,
                title: 'Waiting for your review',
                test: function (row) { return RD_PENDING.indexOf(row.status) !== -1; }
            };
        }

        if (key === 'skills')
        {
            return { key: 'skills', stage: null, title: 'Skills to check', test: RDash.needsSkillReview };
        }

        return {
            key: 'stage:' + key,
            stage: key,
            title: 'Now in ' + RDash.label(key).toLowerCase(),
            test: function (row) { return row.status === key; }
        };
    },

    renderStageList(focus)
    {
        const panel = RDash.el('stage-list');
        const filter = RDash.state.filter;

        if (!filter)
        {
            panel.classList.add('hidden');
            panel.innerHTML = '';
            return;
        }

        const rows = RDash.state.rows.filter(filter.test).sort(function (a, b)
        {
            return (Number(b.effectiveScore) || 0) - (Number(a.effectiveScore) || 0);
        });

        let body = '';

        if (!RDash.state.rows.length)
        {
            body = '<p class="rd-empty">Applicant names are not available on this page. Open a job to see who applied.</p>';
        }
        else if (!rows.length)
        {
            body = '<p class="rd-empty">Nobody is in this stage right now.</p>';
        }
        else
        {
            body = '<ul class="rd-list">' + rows.map(function (row)
            {
                const score = row.effectiveScore === null || row.effectiveScore === undefined ? '' : '<span class="rd-score" title="AI assessment">' + Math.round(row.effectiveScore) + '</span>';

                return '<li class="rd-row"><div><a href="' + APPLICANT_URL + encodeURIComponent(row.id) + '">' + Dash.esc(row.candidateName) + '</a>' +
                    '<small>' + Dash.esc(row.jobTitle) + '</small></div>' + score +
                    Dash.badge(RDash.label(row.status), Dash.statusTone(row.status)) + '</li>';
            }).join('') + '</ul>';
        }

        panel.innerHTML = '<div class="rd-panel-head"><div><h3 tabindex="-1" id="stage-title">' + Dash.esc(filter.title) + ' (' + rows.length + ')</h3>' +
            '<p class="rd-sub">AI assessment. You make the final decision.</p></div>' +
            '<button class="btn btn-secondary btn-sm" type="button" id="stage-clear">Clear filter</button></div>' + body;

        panel.classList.remove('hidden');

        RDash.el('stage-clear').addEventListener('click', function ()
        {
            RDash.setFilter(null);
        });

        if (focus)
        {
            panel.scrollIntoView({ block: 'nearest', behavior: typeof reducedMotion === 'function' && reducedMotion() ? 'auto' : 'smooth' });
        }
    },

    /* applications by job */

    renderJobs()
    {
        const data = RDash.state.data;
        const byJob = (data.applications_by_job || []).slice().sort(function (a, b)
        {
            return b.count - a.count;
        });
        const box = RDash.el('by-job');

        if (!byJob.length)
        {
            box.innerHTML = '<div class="rd-empty">No jobs yet. Post a role and applicants will appear here.<br><a class="btn btn-sm" href="job-form.html">Post a job</a></div>';
            return;
        }

        const max = Math.max.apply(null, byJob.map(function (item) { return item.count; })) || 1;

        box.innerHTML = '<div class="rd-bars">' + byJob.map(function (item)
        {
            const job = RDash.state.jobs.filter(function (candidate) { return candidate.title === item.job; })[0];
            const href = job ? 'applicants.html?jobId=' + encodeURIComponent(job.id) : 'jobs.html';

            return '<a class="rd-bar-row" href="' + href + '"><span class="rd-name">' + Dash.esc(item.job) + '</span><span class="rd-num">' + item.count + '</span>' +
                '<span class="rd-track"><i class="rd-fill" style="transform:scaleX(' + (item.count / max).toFixed(3) + ')"></i></span></a>';
        }).join('') + '</div>';
    },

    /* shortlist rate, processing time, skill gaps */

    renderRates()
    {
        const data = RDash.state.data;
        const rate = data.shortlist_rate === undefined ? '-' : data.shortlist_rate + '%';
        const time = data.avg_processing_time === undefined ? '-' : data.avg_processing_time + ' days';

        RDash.el('rates').innerHTML =
            '<div class="rd-stat"><b>' + Dash.esc(rate) + '</b><span>Shortlist rate</span><small>Share of decided applicants who were shortlisted.</small></div>' +
            '<div class="rd-stat"><b>' + Dash.esc(time) + '</b><span>Average processing time</span><small>Days from submission to your first decision.</small></div>';
    },

    renderGaps()
    {
        const gaps = (RDash.state.data.common_skill_gaps || []).slice(0, 6);
        const box = RDash.el('gaps');

        if (!gaps.length)
        {
            box.innerHTML = '<p class="rd-empty">No skill gaps yet. They appear once applicants are assessed.</p>';
            return;
        }

        const max = Math.max.apply(null, gaps.map(function (gap) { return gap.count; })) || 1;

        box.innerHTML = '<div class="rd-bars">' + gaps.map(function (gap)
        {
            return '<a class="rd-bar-row" href="search.html?q=' + encodeURIComponent(gap.skill) + '"><span class="rd-name">' + Dash.esc(gap.skill) + '</span><span class="rd-num">' + gap.count + '</span>' +
                '<span class="rd-track"><i class="rd-fill gap" style="--heat:' + (gap.count / max).toFixed(2) + ';transform:scaleX(' + (gap.count / max).toFixed(3) + ')"></i></span></a>';
        }).join('') + '</div>';
    },

    /* activity feed from the audit trail */

    renderFeed()
    {
        const events = [];

        RDash.state.rows.forEach(function (row)
        {
            (row.history || []).forEach(function (entry)
            {
                events.push({ row: row, entry: entry });
            });
        });

        events.sort(function (a, b)
        {
            return new Date(b.entry.at) - new Date(a.entry.at);
        });

        const box = RDash.el('feed');

        if (!events.length)
        {
            box.innerHTML = '<p class="rd-empty">Activity appears here as candidates apply and move between stages.</p>';
            return;
        }

        box.innerHTML = '<ol class="rd-feed">' + events.slice(0, RD_FEED_LIMIT).map(function (item)
        {
            const row = item.row;
            const entry = item.entry;
            const link = '<a href="' + APPLICANT_URL + encodeURIComponent(row.id) + '">' + Dash.esc(row.candidateName) + '</a>';
            const who = entry.changedBy === 'system' ? 'System' : Dash.esc(entry.changedBy);
            let text = '';

            if (!entry.from)
            {
                text = link + ' applied for ' + Dash.esc(row.jobTitle);
            }
            else
            {
                text = who + ' moved ' + link + ' to <b>' + Dash.esc(RDash.label(entry.to)) + '</b>';
            }

            return '<li>' + text + '<time datetime="' + Dash.esc(entry.at) + '">' + Dash.esc(RDash.relTime(entry.at)) + '</time></li>';
        }).join('') + '</ol>';
    },

    /* today's interviews */

    renderInterviews()
    {
        const today = RDash.interviewsToday().sort(function (a, b)
        {
            return new Date(a.scheduled_at) - new Date(b.scheduled_at);
        });
        const box = RDash.el('today-list');

        if (today.length)
        {
            box.innerHTML = '<ul class="rd-slots">' + today.map(function (interview)
            {
                return '<li class="rd-slot"><time datetime="' + Dash.esc(interview.scheduled_at) + '">' + RDash.clock(interview.scheduled_at) + '</time>' +
                    '<div><b>' + Dash.esc(interview.candidateName) + '</b><small>' + Dash.esc(interview.jobTitle) + ', ' +
                    Dash.esc(interview.interview_type || 'interview') + ', ' + Dash.esc(interview.duration_minutes) + ' min with ' + Dash.esc(interview.interviewer) + '</small></div></li>';
            }).join('') + '</ul>';
            return;
        }

        const next = RDash.state.interviews.filter(function (interview)
        {
            return new Date(interview.scheduled_at).getTime() > Date.now();
        }).sort(function (a, b)
        {
            return new Date(a.scheduled_at) - new Date(b.scheduled_at);
        })[0];

        box.innerHTML = '<p class="rd-empty">No interviews today. Schedule one from a shortlisted applicant.</p>' +
            (next ? '<p class="rd-next">Next: ' + Dash.esc(next.candidateName) + ', ' + Dash.esc(Dash.dateTime(next.scheduled_at)) + '</p>' : '');
    },

    /* loading, errors, refresh */

    showSkeletons()
    {
        const heights = { attention: 96, kpis: 92, flow: 220, 'by-job': 160, gaps: 140, feed: 160, 'today-list': 100 };

        Object.keys(heights).forEach(function (id)
        {
            RDash.el(id).innerHTML = '<div class="rd-skel" style="--h:' + heights[id] + 'px" aria-hidden="true"></div>';
        });
    },

    renderAll()
    {
        const state = RDash.state;
        const empty = !state.jobs.length && !(state.data.total_applications > 0);

        RDash.el('rd-body').classList.toggle('hidden', empty);
        RDash.el('empty-box').classList.toggle('hidden', !empty);

        if (empty)
        {
            RDash.el('empty-box').innerHTML = Dash.empty('briefcase', 'You have not posted a job yet. Post a role and applicants will show up here.', '<a class="btn btn-sm" href="job-form.html">Post your first job</a>');
            return;
        }

        RDash.renderAttention();
        RDash.renderKpis();
        RDash.renderFlow();
        RDash.renderStageList(false);
        RDash.renderJobs();
        RDash.renderRates();
        RDash.renderGaps();
        RDash.renderFeed();
        RDash.renderInterviews();
        state.drawn = true;
    },

    async load(manual)
    {
        const self = RDash;
        const errorBox = self.el('error-box');
        const refresh = self.el('refresh-btn');

        errorBox.classList.add('hidden');

        if (!self.state.data)
        {
            self.showSkeletons();
        }

        Dash.setBusy(refresh, true);

        try
        {
            const results = await Promise.all(
            [
                Api.get('/api/analytics'),
                Api.get('/api/jobs'),
                Api.get('/api/interviews').catch(function () { return []; })
            ]);

            const jobs = results[1] || [];

            const groups = await Promise.all(jobs.map(function (job)
            {
                return Api.get('/api/jobs/' + encodeURIComponent(job.id) + '/applicants').then(function (rows)
                {
                    return (rows || []).map(function (row)
                    {
                        row.jobTitle = job.title;
                        return row;
                    });
                }, function ()
                {
                    return [];
                });
            }));

            self.state.data = results[0];
            self.state.jobs = jobs;
            self.state.interviews = results[2] || [];
            self.state.rows = Array.prototype.concat.apply([], groups);
            self.state.loadedAt = Date.now();

            self.renderAll();
            self.stamp();

            if (manual)
            {
                showToast('Dashboard refreshed', 'success');
            }
        }
        catch (error)
        {
            if (!self.state.data)
            {
                self.el('rd-body').classList.add('hidden');
                Dash.failInto(errorBox, error.message, function () { self.load(false); });
                errorBox.classList.remove('hidden');
            }
            else
            {
                showToast(error.message, 'error');
            }
        }

        Dash.setBusy(refresh, false);
        Dash.icons();
    },

    bind()
    {
        const flow = RDash.el('flow');

        function nodeFrom(event)
        {
            return event.target.closest ? event.target.closest('.rd-node') : null;
        }

        flow.addEventListener('click', function (event)
        {
            const node = nodeFrom(event);

            if (node)
            {
                RDash.setFilter(RDash.filterFor(node.dataset.stage));
            }
        });

        flow.addEventListener('keydown', function (event)
        {
            const node = nodeFrom(event);

            if (node && (event.key === 'Enter' || event.key === ' '))
            {
                event.preventDefault();
                RDash.setFilter(RDash.filterFor(node.dataset.stage));
            }
        });

        flow.addEventListener('mouseover', function (event)
        {
            const node = nodeFrom(event);

            if (node)
            {
                RDash.showTip(node);
            }
        });

        flow.addEventListener('focusin', function (event)
        {
            const node = nodeFrom(event);

            if (node)
            {
                RDash.showTip(node);
            }
        });

        flow.addEventListener('mouseleave', RDash.hideTip);
        flow.addEventListener('focusout', RDash.hideTip);
        flow.addEventListener('scroll', RDash.hideTip);

        RDash.el('attention').addEventListener('click', function (event)
        {
            const button = event.target.closest('[data-filter]');

            if (button)
            {
                RDash.setFilter(RDash.filterFor(button.dataset.filter));
            }
        });

        RDash.el('refresh-btn').addEventListener('click', function ()
        {
            RDash.load(true);
        });

        RDash.state.timer = setInterval(RDash.stamp, RD_STAMP_MS);
    },

    start(user)
    {
        RDash.renderHead(user);
        RDash.bind();
        RDash.load(false);
    }
};
