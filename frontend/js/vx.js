/* VEYRA dashboard extras: sidebar plane sticker, recruiter chart/lists, candidate overview. No libraries. */
const VX =
{
    mark()
    {
        return typeof brandMark === 'function' ? brandMark({ size: '26px' }) : 'V';
    },

    sticker()
    {
        const nav = document.querySelector('.d-nav');

        if (!nav || document.querySelector('.vx-sticker'))
        {
            return;
        }

        const recruiter = document.body.classList.contains('theme-recruiter');
        const box = document.createElement('a');

        box.className = 'vx-sticker';
        box.href = recruiter ? 'job-form.html' : '#jobs';
        box.innerHTML = '<span class="vx-orb" aria-hidden="true"><i></i><i></i><i></i><span class="vx-core">' + VX.mark() + '</span></span>' +
            '<b class="vx-st-t">' + (recruiter ? 'Ready to hire?' : 'Find your next role') + '</b>' +
            '<span class="vx-st-s">' + (recruiter ? 'Post a job and let the matches come in.' : 'Browse open jobs and apply in minutes.') + '</span>' +
            '<em class="vx-go">' + (recruiter ? 'Post a job' : 'Browse jobs') + ' <span aria-hidden="true">&rarr;</span></em>';
        nav.insertAdjacentElement('afterend', box);
        nav.style.flex = '0 0 auto';
        box.style.marginTop = 'auto';
    },

    pulse(title, sub, href, cta)
    {
        const box = document.querySelector('.vx-sticker');

        if (!box) { return; }

        box.querySelector('.vx-st-t').textContent = title;
        box.querySelector('.vx-st-s').textContent = sub;
        box.querySelector('.vx-go').firstChild.nodeValue = cta + ' ';
        box.setAttribute('href', href);
    },

    ring(score)
    {
        const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
        const tier = s >= 75 ? '' : s >= 50 ? ' mid' : ' low';

        return '<div class="vx-mini' + tier + '" role="img" aria-label="Score ' + s + '"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="bg" cx="18" cy="18" r="15.9155" pathLength="100"/><circle class="fg" cx="18" cy="18" r="15.9155" pathLength="100" stroke-dasharray="' + s + ' 100"/></svg><b>' + s + '</b></div>';
    },

    icon(name) { return '<i data-lucide="' + name + '"></i>'; },

    esc(text) { return Dash.esc(text); },

    /* ---------- recruiter ---------- */

    series(rows, days)
    {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - (days - 1));

        const make = function () { return new Array(days + 1).join('0').split('').map(Number); };
        const out = { apps: make(), short: make(), int: make(), start: start };

        function bump(list, iso)
        {
            const t = new Date(iso).getTime();
            const i = Math.floor((t - start.getTime()) / 86400000);

            if (!isNaN(t) && i >= 0 && i < days)
            {
                list[i]++;
            }
        }

        rows.forEach(function (row)
        {
            bump(out.apps, row.appliedAt || row.createdAt);

            (row.history || []).forEach(function (h)
            {
                if (h.to === 'Shortlisted') { bump(out.short, h.at); }
                if (h.to === 'Interview') { bump(out.int, h.at); }
            });
        });

        return out;
    },

    smooth(pts, base)
    {
        const clamp = function (v) { return Math.min(base, v); };
        let d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);

        for (let i = 0; i < pts.length - 1; i++)
        {
            const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;

            d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ',' + clamp(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' +
                (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ',' + clamp(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' +
                p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
        }

        return d;
    },

    renderOverview()
    {
        const box = document.getElementById('vx-overview');

        if (!box) { return; }

        const select = document.getElementById('vx-range');
        const days = select ? Number(select.value) || 30 : 30;
        const s = VX.series(RDash.state.rows, days);
        const all = s.apps.concat(s.short, s.int);

        if (!all.some(function (n) { return n > 0; }))
        {
            box.innerHTML = '<p class="rd-empty">Applications from the last ' + days + ' days will be charted here.</p>';
            return;
        }

        const top = Math.max(4, Math.ceil(Math.max.apply(null, all) / 4) * 4);
        const W = 720, H = 270, L = 34, R = 14, T = 14, B = 30, base = H - B;
        const x = function (i) { return L + i * (W - L - R) / (days - 1); };
        const y = function (v) { return T + (base - T) * (1 - v / top); };
        const defs = [['vx-c1', 'apps'], ['vx-c2', 'short'], ['vx-c3', 'int']];
        let g = '<defs>', body = '';

        defs.forEach(function (p, k) { g += '<linearGradient id="vxg' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--c)" stop-opacity="' + (k ? '.14' : '.3') + '" class="' + p[0] + '"/><stop offset="1" stop-color="var(--c)" stop-opacity="0" class="' + p[0] + '"/></linearGradient>'; });
        g += '</defs>';

        for (let k = 0; k <= 4; k++)
        {
            const v = top * k / 4;
            g += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '"/><text class="ax" x="' + (L - 8) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end">' + v + '</text>';
        }

        const step = days <= 7 ? 1 : days <= 14 ? 3 : 6;

        for (let i = 0; i < days; i += step)
        {
            g += '<text class="ax" x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + VX.shortDate(s.start, i) + '</text>';
        }

        defs.slice().reverse().forEach(function (p)
        {
            const k = defs.indexOf(p);
            const pts = s[p[1]].map(function (v, i) { return [x(i), y(v)]; });
            const d = VX.smooth(pts, base);

            body += '<path class="vx-area" d="' + d + ' L' + x(days - 1).toFixed(1) + ',' + base + ' L' + x(0).toFixed(1) + ',' + base + 'Z" fill="url(#vxg' + k + ')" style="--c:var(--' + (k === 0 ? 'accent' : k === 1 ? 'tangerine' : 'match') + ')"/>' +
                '<path class="ln ' + p[0] + '" d="' + d + '"/>';
        });

        const cur = '<g class="vx-cur" hidden><line class="vx-cur-l" y1="' + T + '" y2="' + base + '"/>' + defs.map(function (p) { return '<circle class="vx-cur-d ' + p[0] + '" r="5.5"/>'; }).join('') + '</g>';

        box.innerHTML = '<div class="vx-legend"><span><i class="vx-c1"></i>Applications</span><span><i class="vx-c2"></i>Shortlisted</span><span><i class="vx-c3"></i>Interviews</span></div>' +
            '<div class="vx-chart" tabindex="0" aria-label="Applications, shortlisted and interviews for the last ' + days + ' days. Use the left and right arrow keys to read each day.">' +
            '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-hidden="true">' + g + body + cur + '</svg><div class="vx-tip" hidden></div></div>';

        const wrap = box.querySelector('.vx-chart');
        const svg = wrap.querySelector('svg');
        const guide = svg.querySelector('.vx-cur');
        const tip = wrap.querySelector('.vx-tip');
        let at = -1;

        function show(i)
        {
            i = Math.max(0, Math.min(days - 1, i));
            at = i;
            const px = x(i);

            guide.hidden = false;
            guide.querySelector('.vx-cur-l').setAttribute('x1', px);
            guide.querySelector('.vx-cur-l').setAttribute('x2', px);
            guide.querySelectorAll('.vx-cur-d').forEach(function (c, k) { c.setAttribute('cx', px); c.setAttribute('cy', y(s[defs[k][1]][i])); });

            tip.innerHTML = '<b>' + VX.shortDate(s.start, i) + '</b>' +
                '<span><i class="vx-c1"></i>Applications<em>' + s.apps[i] + '</em></span>' +
                '<span><i class="vx-c2"></i>Shortlisted<em>' + s.short[i] + '</em></span>' +
                '<span><i class="vx-c3"></i>Interviews<em>' + s.int[i] + '</em></span>';
            tip.hidden = false;

            const pct = px / W * 100;
            tip.style.left = Math.max(14, Math.min(86, pct)) + '%';
        }

        function hide() { guide.hidden = true; tip.hidden = true; at = -1; }

        wrap.addEventListener('mousemove', function (e)
        {
            const r = svg.getBoundingClientRect();
            show(Math.round(((e.clientX - r.left) / r.width * W - L) / (W - L - R) * (days - 1)));
        });

        wrap.addEventListener('mouseleave', hide);
        wrap.addEventListener('blur', hide);
        wrap.addEventListener('keydown', function (e)
        {
            if (e.key === 'ArrowRight') { e.preventDefault(); show(at < 0 ? 0 : at + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); show(at < 0 ? days - 1 : at - 1); }
        });
    },

    shortDate(start, i)
    {
        return new Date(start.getTime() + i * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    },

    renderRecentJobs()
    {
        const box = document.getElementById('vx-jobs');

        if (!box) { return; }

        const state = RDash.state;
        const counts = {};
        (state.data.applications_by_job || []).forEach(function (j) { counts[j.job] = j.count; });
        const jobs = state.jobs.slice().sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); }).slice(0, 4);

        box.innerHTML = jobs.length ? '<ul class="vx-list">' + jobs.map(function (job)
        {
            const open = !job.status || job.status === 'open';
            const where = [job.location, job.type].filter(Boolean).join(' · ');

            return '<li class="vx-row"><span class="vx-ico">' + VX.icon('briefcase') + '</span><div><b><a href="applicants.html?jobId=' + encodeURIComponent(job.id) + '">' + VX.esc(job.title) + '</a></b><small>' + VX.esc(where) + '</small></div>' +
                Dash.badge(open ? 'Active' : 'Closed', open ? 'ok' : 'neutral') + '<span class="rd-num">' + (counts[job.title] || 0) + ' applicants</span></li>';
        }).join('') + '</ul>' : '<p class="rd-empty">No jobs yet.</p>';
    },

    renderTop()
    {
        const box = document.getElementById('vx-top');

        if (!box) { return; }

        const rows = RDash.state.rows.filter(function (r) { return r.effectiveScore !== null && r.effectiveScore !== undefined; })
            .sort(function (a, b) { return Number(b.effectiveScore) - Number(a.effectiveScore); }).slice(0, 4);

        box.innerHTML = rows.length ? '<ul class="vx-list">' + rows.map(function (r)
        {
            return '<li class="vx-row"><span class="vx-avatar" aria-hidden="true">' + VX.esc(Dash.initials(r.candidateName)) + '</span><div><b><a href="' + APPLICANT_URL + encodeURIComponent(r.id) + '">' + VX.esc(r.candidateName) + '</a></b><small>' + VX.esc(r.jobTitle) + '</small></div>' +
                Dash.badge(RDash.label(r.status), Dash.statusTone(r.status)) + VX.ring(r.effectiveScore) + '</li>';
        }).join('') + '</ul>' : '<p class="rd-empty">Scores appear once resumes are assessed.</p>';
    },

    kpiIcons()
    {
        const names = ['briefcase', 'users', 'circle-check', 'clock', 'calendar-clock'];
        const cards = document.querySelectorAll('#kpis .rd-kpi');

        cards.forEach(function (card, i)
        {
            if (!card.querySelector('.vx-ic'))
            {
                card.insertAdjacentHTML('afterbegin', '<span class="vx-ic" aria-hidden="true">' + VX.icon(names[i] || 'circle') + '</span>');
            }
        });
    },

    /* hiring pipeline: colourful stage tiles, submitted on top as the big one */
    PL_COLORS: ['#5B4DF0', '#7A5CF2', '#9A63EE', '#C06AD9', '#F2709C', '#FF8A3D', '#FFC83D'],

    pipeFocus(stage)
    {
        const flow = RDash.el('flow');
        const f = RDash.state.filter;
        const key = stage || (f && f.stage) || null;

        flow.querySelectorAll('.rd-node').forEach(function (n)
        {
            const on = Boolean(key) && n.dataset.stage === key;
            n.classList.toggle('lit', on);
            n.classList.toggle('dim', Boolean(key) && !on);
        });
    },

    funnel()
    {
        const flow = RDash.el('flow');
        const find = function (e) { return e.target.closest ? e.target.closest('.rd-node') : null; };

        RDash.showTip = function () {};

        ['mouseover', 'focusin'].forEach(function (type)
        {
            flow.addEventListener(type, function (e) { const n = find(e); if (n) { VX.pipeFocus(n.dataset.stage); } });
        });

        ['mouseleave', 'focusout'].forEach(function (type)
        {
            flow.addEventListener(type, function () { VX.pipeFocus(null); });
        });

        RDash.renderFlow = function ()
        {
            const model = RDash.flowModel();
            const max = model.counts[0] || 1;
            const filter = RDash.state.filter;
            const play = !RDash.state.drawn;
            let tiles = '';

            RD_STAGES.forEach(function (status, i)
            {
                const c = model.counts[i];
                const pct = Math.round(c / max * 100);
                const on = filter && filter.stage === status;
                const text = i >= 5 ? '#171A45' : '#fff';

                tiles += '<button type="button" class="rd-node vx-pl-tile' + (i === 0 ? ' big' : '') + (on ? ' on' : '') + '" style="--col:' + VX.PL_COLORS[i] + ';--fg:' + text + ';--i:' + i + '" aria-pressed="' + (on ? 'true' : 'false') + '" data-index="' + i + '" data-stage="' + Dash.esc(status) + '" title="' + c + ' reached, ' + (model.now[status] || 0) + ' there now">' +
                    '<span class="vx-pl-n">' + (i + 1) + '</span><span class="vx-pl-l">' + Dash.esc(RDash.label(status)) + '</span>' +
                    '<b>' + c + '</b><span class="vx-pl-p"><i style="width:' + pct + '%"></i></span><small>' + pct + '% of applicants</small></button>';
            });

            const onR = filter && filter.stage === 'Rejected';

            tiles += '<button type="button" class="rd-node vx-pl-tile vx-pl-rej' + (onR ? ' on' : '') + '" style="--i:7" aria-pressed="' + (onR ? 'true' : 'false') + '" data-index="7" data-stage="Rejected"><span class="vx-pl-l">Rejected</span><b>' + model.rejected + '</b></button>';

            flow.className = 'rd-flow';
            flow.innerHTML = '<div class="vx-pl' + (play ? ' play' : '') + '" role="group" aria-label="Hiring pipeline">' + tiles + '</div>';
            RDash.el('flow-key').innerHTML = '<span>Click a stage to list who is in it now.</span>';
            RDash.flow = model;
            VX.pipeFocus(null);
        };
    },

    recruiter()
    {
        VX.funnel();

        const range = document.getElementById('vx-range');

        if (range) { range.addEventListener('change', VX.renderOverview); }

        const original = RDash.renderAll;

        RDash.renderAll = function ()
        {
            original.apply(RDash, arguments);

            if (!RDash.state.data) { return; }

            VX.kpiIcons();
            VX.renderOverview();
            VX.renderRecentJobs();
            VX.renderTop();
            VX.pulse((RDash.state.data.pending_reviews || 0) + ' waiting for review', 'Open a job to work through its applicants.', 'jobs.html', 'Review now');
            Dash.icons();
        };
    },

    /* ---------- candidate ---------- */

    names(profile)
    {
        return ((profile && profile.skills) || []).map(function (s) { return String(s.skill || s.name || s).toLowerCase(); });
    },

    tick(on)
    {
        return on ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M7 12h10"/></svg>';
    },

    strengthCard(profile)
    {
        const box = document.getElementById('strength');

        if (!box || !profile) { return; }

        const p = profile;
        const res = CandidateKit.strength(p);
        const items = [[Boolean(p.phone && p.headline), 'Personal information'], [(p.skills || []).length >= 3 && (p.experience || []).length > 0, 'Skills and experience'], [Boolean(p.resumeFileName), 'Resume upload'], [(p.education || []).length > 0, 'Education']];

        box.innerHTML = '<h3>Profile completion</h3><div class="vx-pc">' + CandidateKit.ringHtml(res.percent) +
            '<ul class="vx-checks">' + items.map(function (c) { return '<li class="' + (c[0] ? 'on' : '') + '">' + VX.tick(c[0]) + VX.esc(c[1]) + '</li>'; }).join('') + '</ul></div>' +
            '<p class="vx-pc-tip">' + VX.esc(res.suggestion) + '</p><a class="btn btn-secondary" href="profile.html">Complete profile &rarr;</a>';
        CandidateKit.animateRings(box);
    },

    loadInterviews()
    {
        const panel = document.getElementById('vx-iv');
        const two = panel ? panel.parentElement : null;

        if (!panel || typeof Api === 'undefined') { return; }

        Api.get('/api/candidate/interviews').then(function (list)
        {
            const now = Date.now();
            const up = (list || []).filter(function (i) { return i.status !== 'cancelled' && new Date(i.scheduled_at).getTime() >= now - 3600000; })
                .sort(function (a, b) { return new Date(a.scheduled_at) - new Date(b.scheduled_at); }).slice(0, 2);
            const body = panel.querySelector('.vx-body');

            body.innerHTML = up.length ? up.map(function (i)
            {
                const d = new Date(i.scheduled_at);
                const end = new Date(d.getTime() + (Number(i.duration_minutes) || 45) * 60000);
                const t = function (x) { return x.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
                const type = String(i.interview_type || 'interview');

                return '<div class="vx-ivrow"><div class="vx-date"><small>' + d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() + '</small><b>' + d.getDate() + '</b></div>' +
                    '<div><b>' + VX.esc(i.jobTitle) + ' interview</b><span>' + t(d) + ' – ' + t(end) + '</span><span class="vx-ivtype">' + VX.icon('video') + VX.esc(type.charAt(0).toUpperCase() + type.slice(1)) + ' with ' + VX.esc(i.interviewer) + '</span></div>' +
                    '<a class="btn btn-secondary btn-sm" href="my-applications.html">Details</a></div>';
            }).join('') : '<p class="rd-empty">No interviews scheduled yet. When a recruiter books one, it shows here.</p>';

            panel.hidden = false;
            two.classList.remove('solo');
            Dash.icons();
        }, function ()
        {
            panel.hidden = true;
            two.classList.add('solo');
        });
    },

    STEPS: ['Applied', 'In review', 'Shortlisted', 'Interview', 'Selected'],
    STEP_COLORS: ['#5B4DF0', '#9A63EE', '#F2709C', '#FF8A3D', '#FFC83D'],
    STEP_NEXT: ['Apply to a role and your journey starts here.', 'Next: a recruiter will review your application.', 'Next: get shortlisted.', 'Next: land an interview.', 'Next: the final decision.', 'You made it. Congratulations!'],

    /* which step a status belongs to, 1 to 5, or -1 when rejected */
    stepOf(status)
    {
        const s = String(status || '').toLowerCase();

        if (s.indexOf('reject') !== -1) { return -1; }
        if (/select|hire|offer/.test(s)) { return 5; }
        if (s.indexOf('interview') !== -1) { return 4; }
        if (s.indexOf('shortlist') !== -1) { return 3; }
        if (/review|assess|pars/.test(s)) { return 2; }

        return 1;
    },

    /* the progress road: a winding path with five stops, the finished part gets drawn in colour */
    journey(step)
    {
        const P = [[34, 150], [104, 96], [174, 140], [244, 78], [314, 50]];
        const C = VX.STEP_COLORS;
        let defs = '', base = '', segs = '', dots = '';

        for (let i = 0; i < 4; i++)
        {
            const a = P[i], b = P[i + 1], mx = (a[0] + b[0]) / 2;
            const d = 'M' + a[0] + ',' + a[1] + ' C' + mx + ',' + a[1] + ' ' + mx + ',' + b[1] + ' ' + b[0] + ',' + b[1];

            base += '<path class="vx-jr-base" d="' + d + '"/>';

            if (i + 1 < step)
            {
                defs += '<linearGradient id="vxjg' + i + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + C[i] + '"/><stop offset="1" stop-color="' + C[i + 1] + '"/></linearGradient>';
                segs += '<path class="vx-jr-seg" pathLength="1" d="' + d + '" stroke="url(#vxjg' + i + ')" style="--k:' + i + '"/>';
            }
        }

        P.forEach(function (p, i)
        {
            const reached = i + 1 <= step, now = i + 1 === step;
            const tick = '<path d="M-4.5,.5 l3,3 l6,-6.5" fill="none" stroke="' + (i === 4 ? '#171A45' : '#fff') + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';

            dots += '<g transform="translate(' + p[0] + ',' + p[1] + ')">' +
                (now ? '<circle class="vx-jr-pulse" r="13" fill="' + C[i] + '"/>' : '') +
                (reached ? '<circle r="' + (now ? 13 : 10) + '" fill="' + C[i] + '" stroke="var(--surface)" stroke-width="3"/>' + tick
                    : '<circle r="10" fill="var(--surface)" stroke="var(--line-strong)" stroke-width="2.5"/><text class="vx-jr-num" y="3.6" text-anchor="middle">' + (i + 1) + '</text>') +
                '</g><text class="vx-jr-t' + (reached ? ' on' : '') + '" x="' + p[0] + '" y="' + (p[1] + 32) + '" text-anchor="middle">' + VX.STEPS[i] + '</text>';
        });

        const flag = step >= 5 ? '#FFC83D' : 'var(--line-strong)';

        return '<svg viewBox="0 0 348 200" role="img" aria-label="' + (step ? 'Step ' + step + ' of 5, ' + VX.STEPS[step - 1] : 'No applications yet') + '"><defs>' + defs + '</defs>' +
            base + segs + '<line x1="314" y1="36" x2="314" y2="10" stroke="' + flag + '" stroke-width="2.4" stroke-linecap="round"/><path d="M314,10 L332,16 L314,23Z" fill="' + flag + '"/>' + dots + '</svg>';
    },

    /* five little dots for one application */
    stepper(step)
    {
        let html = '';

        for (let i = 1; i <= 5; i++)
        {
            html += '<i class="' + (i < step ? 'on' : i === step ? 'now' : '') + '"></i>';

            if (i < 5) { html += '<s class="' + (i < step ? 'on' : '') + '"></s>'; }
        }

        return html;
    },

    candidate(ctx)
    {
        const apps = ctx.apps, jobs = ctx.jobs, profile = ctx.profile;
        const st = document.getElementById('vx-stats');

        if (!st || !ctx.appsLoaded) { return; }

        const review = apps.filter(function (a) { return ['Parsed', 'AI Assessment Available', 'Recruiter Review'].indexOf(a.status) !== -1; }).length;
        const short = apps.filter(function (a) { return a.status === 'Shortlisted'; }).length;
        const iv = apps.filter(function (a) { return a.status === 'Interview'; }).length;
        const active = apps.filter(function (a) { return CandidateKit.isActive(a.status); }).length;
        const tiles = [['briefcase', apps.length, 'Total applications'], ['clock', review, 'In review'], ['circle-check', short, 'Shortlisted'], ['star', iv, 'Interviews']];

        st.innerHTML = tiles.map(function (t) { return '<div class="vx-stat"><span class="vx-ico">' + VX.icon(t[0]) + '</span><b>' + t[1] + '</b><span>' + t[2] + '</span></div>'; }).join('');

        VX.pulse(active ? active + (active === 1 ? ' active application' : ' active applications') : 'Find your next role', active ? 'Follow every step to the final answer.' : 'Browse open jobs and apply in minutes.', active ? 'my-applications.html' : '#jobs', active ? 'Track them' : 'Browse jobs');

        /* progress: draw the road up to the furthest step reached */
        const best = apps.reduce(function (m, a) { return Math.max(m, VX.stepOf(a.status)); }, 0);
        const prog = document.querySelector('#vx-progress .vx-body');
        const key = best + '|' + apps.length;

        if (prog && prog.dataset.k !== key)
        {
            const out = apps.length > 0 && best === 0;

            prog.dataset.k = key;
            prog.innerHTML = '<div class="vx-jr">' + VX.journey(best) + '</div>' +
                '<div class="vx-jr-sum"><b>' + (best ? 'Step ' + best + ' of 5' : 'Ready to start') + '</b><span>' + (best ? VX.STEPS[best - 1] : out ? 'Not selected yet' : 'No applications yet') + '</span></div>' +
                '<p class="vx-jr-next">' + (out ? 'Not selected this time. Keep applying, the next one could be yours.' : VX.STEP_NEXT[best]) + '</p>';
        }

        /* skills that open jobs ask for the most, and which of them you already have */
        const need = {};

        jobs.forEach(function (j)
        {
            const seen = {};

            (j.skills || []).forEach(function (s)
            {
                const name = String(s.skill || s.name || s).trim();
                const k = name.toLowerCase();

                if (!k || seen[k] || (s.requirement && s.requirement !== 'required')) { return; }

                seen[k] = 1;
                need[k] = need[k] || { name: name, n: 0 };
                need[k].n++;
            });
        });

        const mine = VX.names(profile);
        const top = Object.keys(need).map(function (k) { return need[k]; }).sort(function (a, b) { return b.n - a.n || a.name.localeCompare(b.name); }).slice(0, 5);
        const have = top.filter(function (s) { return mine.indexOf(s.name.toLowerCase()) !== -1; }).length;
        const sk = document.querySelector('#vx-skills .vx-body');

        sk.innerHTML = top.length ? top.map(function (s)
        {
            const yes = mine.indexOf(s.name.toLowerCase()) !== -1;

            return '<div class="vx-sk-row"><span class="vx-sk-n">' + VX.esc(s.name) + '</span><span class="vx-sk-bar"><i class="' + (yes ? 'yes' : 'no') + '" style="width:' + Math.max(8, Math.round(s.n / jobs.length * 100)) + '%"></i></span>' +
                '<span class="vx-sk-c">' + s.n + (s.n === 1 ? ' job' : ' jobs') + '</span><span class="vx-sk-t ' + (yes ? 'yes' : 'no') + '" title="' + (yes ? 'You have this skill' : 'Not on your profile yet') + '">' + (yes ? '&check;' : '+') + '</span></div>';
        }).join('') + '<p class="vx-sk-foot">You have ' + have + ' of these ' + top.length + '.' + (have < top.length ? ' Add the rest to your profile if you know them.' : ' Strong match.') + '</p>'
            : '<p class="rd-empty">Skills will show here once jobs are open.</p>';

        /* tracker: each application with its own dots, furthest first */
        const tk = document.querySelector('#vx-tracker .vx-body');
        const title = function (a)
        {
            const j = jobs.filter(function (x) { return String(x.id) === String(a.jobId); })[0];
            return a.jobTitle || a.job_title || (j && j.title) || 'Application';
        };
        const list = apps.map(function (a) { return { a: a, s: VX.stepOf(a.status) }; }).sort(function (x, y) { return y.s - x.s; }).slice(0, 3);

        tk.innerHTML = list.length ? '<ul class="vx-tk">' + list.map(function (r)
        {
            return '<li><div class="vx-tk-h"><b>' + VX.esc(title(r.a)) + '</b>' + (r.s < 0 ? '<span class="vx-tk-st bad">Not selected</span>' : '<span class="vx-tk-st">' + VX.STEPS[r.s - 1] + '</span>') + '</div>' +
                (r.s < 0 ? '' : '<div class="vx-tk-steps">' + VX.stepper(r.s) + '</div>') + '</li>';
        }).join('') + '</ul>' : '<p class="rd-empty">No applications yet. Apply to a job and it shows up here.</p>';

        Dash.icons();
    }
};

/* candidate page: wraps the page's own render functions, so candidate.html logic stays as it is */
VX.candidateHook = function ()
{
    let profile = null;
    const home = document.querySelector('.cd-home');
    const first = String(user.name || '').split(' ')[0];

    document.getElementById('greeting').textContent = 'Welcome back, ' + first + '! \uD83D\uDC4B';
    document.getElementById('status-line').setAttribute('data-vx', '1');

    if (home && !document.getElementById('vx-stats'))
    {
        const head = function (icon, id, title, link, text)
        {
            return '<div class="vx-ch"><span class="vx-ch-ico">' + VX.icon(icon) + '</span><h3 id="' + id + '">' + title + '</h3>' + (link ? '<a href="' + link + '">' + text + ' &rarr;</a>' : '') + '</div>';
        };

        home.insertAdjacentHTML('afterend',
            '<div class="vx-cgrid">' +
              '<div class="vx-cleft">' +
                '<section class="d-panel vx-card" aria-labelledby="vx-ov-t">' + head('bar-chart-3', 'vx-ov-t', 'Your application overview', 'my-applications.html', 'View all') + '<div class="vx-stats" id="vx-stats"></div></section>' +
                '<div class="vx-two">' +
                  '<section class="d-panel vx-card" id="vx-iv" aria-labelledby="vx-iv-t" hidden>' + head('calendar-clock', 'vx-iv-t', 'Upcoming interviews', 'my-applications.html', 'View all') + '<div class="vx-body"></div></section>' +
                  '<section class="d-panel vx-card" id="vx-progress" aria-labelledby="vx-pr-t">' + head('trending-up', 'vx-pr-t', 'Your progress', '', '') + '<div class="vx-body"></div></section>' +
                '</div>' +
              '</div>' +
              '<div class="vx-cright">' +
                '<section class="vx-reco-card" id="vx-skills" aria-labelledby="vx-sk-t"><div class="vx-rc-head"><span>' + VX.icon('flame') + '</span><h3 id="vx-sk-t">Skills in demand</h3></div><div class="vx-body"></div></section>' +
                '<section class="d-panel vx-card vx-tracker" id="vx-tracker" aria-labelledby="vx-tk-t">' + head('route', 'vx-tk-t', 'Your applications', 'my-applications.html', 'View all') + '<div class="vx-body"></div></section>' +
              '</div>' +
            '</div>');
        Dash.icons();
    }

    const run = function () { VX.candidate({ apps: apps, jobs: jobs, profile: profile, appsLoaded: appsLoaded }); };
    const wrap = function (name, after)
    {
        const original = window[name];

        window[name] = function ()
        {
            const result = original.apply(this, arguments);
            after.apply(this, arguments);
            return result;
        };
    };

    wrap('renderStrength', function (p) { profile = p || null; VX.strengthCard(profile); run(); });
    wrap('renderApps', run);
    wrap('renderJobs', run);

    VX.loadInterviews();
};