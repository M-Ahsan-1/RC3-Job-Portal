// Mock routes for: applicant detail, questions, interviews, analytics, search.
// Load AFTER js/api.js. It wraps Api.get/post/patch/put/delete and answers the routes below;
// every other route is passed to the original Api untouched.
// Delete this file (and its script tags) when USE_MOCK = false.
(function ()
{
    if (typeof Api === 'undefined' || (typeof USE_MOCK !== 'undefined' && USE_MOCK === false))
    {
        return;
    }

    const KEY = 'rc3_mock_extra';
    let store = { status: {}, notes: {}, history: {}, questions: {}, rounds: {}, interviews: [], nextId: 1 };

    try
    {
        const saved = JSON.parse(localStorage.getItem(KEY));

        if (saved)
        {
            store = Object.assign(store, saved);
        }
    }
    catch (error) { }

    function save()
    {
        try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (error) { }
    }

    function wait()
    {
        return new Promise(function (resolve) { setTimeout(resolve, 150); });
    }

    function fail(message)
    {
        throw new Error(message);
    }

    function newId()
    {
        const id = store.nextId;
        store.nextId += 1;
        return id;
    }

    const orig = {};
    const methods = ['get', 'post', 'patch', 'put', 'delete'];

    methods.forEach(function (method)
    {
        if (typeof Api[method] === 'function')
        {
            orig[method] = Api[method].bind(Api);
        }
    });

    function names(list)
    {
        return (list || []).map(function (item) { return typeof item === 'string' ? item : (item && (item.skill || item.name)) || ''; }).filter(Boolean);
    }

    function effective(a)
    {
        return a.overrideScore !== null && a.overrideScore !== undefined ? a.overrideScore : a.score;
    }

    function gapsOf(a)
    {
        const json = a.score_json || {};
        return names(json.missing_skills || json.skill_gaps || json.gaps);
    }

    function withStore(a)
    {
        if (store.status[a.id])
        {
            a.status = store.status[a.id];
        }

        return a;
    }

    async function jobsList()
    {
        const result = await orig.get('/api/jobs');
        return Array.isArray(result) ? result : (result.jobs || []);
    }

    async function everyone()
    {
        const out = [];
        const jobs = await jobsList();

        for (const job of jobs)
        {
            let rows = [];

            try { rows = await orig.get('/api/jobs/' + job.id + '/applicants'); } catch (error) { rows = []; }

            rows.forEach(function (a)
            {
                out.push(withStore(Object.assign({}, a, { jobId: a.jobId !== undefined ? a.jobId : job.id, jobTitle: job.title })));
            });
        }

        return out;
    }

    async function findOne(id)
    {
        const all = await everyone();
        const found = all.filter(function (a) { return String(a.id) === String(id); })[0];
        return found || fail('Applicant not found.');
    }

    function addEvent(id, action, detail, by)
    {
        store.history[id] = store.history[id] || [];
        store.history[id].push({ action: action, detail: detail || '', by: by || 'You', createdAt: new Date().toISOString() });
        save();
    }

    const TEMPLATES =
    {
        tech: [
            function (s) { return 'Walk me through a project where you used ' + s + '. What was your role and what trade-offs did you make?'; },
            function (s) { return 'What is the hardest bug you have fixed that involved ' + s + ', and how did you find the cause?'; }
        ],
        gap: [
            function (s) { return 'This role needs ' + s + ', which is not on your resume. How would you get up to speed, and have you used anything similar?'; },
            function (s) { return 'How would you plan your first month to learn ' + s + ' while still delivering work?'; }
        ],
        behave: [
            ['Tell me about a time you had to meet a tight deadline. How did you decide what to cut?', 'Describe a disagreement with a teammate about a technical decision. How did it end?'],
            ['Tell me about a mistake you made at work and what you changed afterwards.', 'How do you handle feedback on code or work you were proud of?']
        ]
    };

    function makeQuestions(a, round)
    {
        const v = round % 2;
        const json = a.score_json || {};
        const list = [];

        names(json.matched_skills).slice(0, 3).forEach(function (s) { list.push({ category: 'Technical', text: TEMPLATES.tech[v](s) }); });
        gapsOf(a).slice(0, 3).forEach(function (s) { list.push({ category: 'Skill gap', text: TEMPLATES.gap[v](s) }); });
        TEMPLATES.behave[v].forEach(function (t) { list.push({ category: 'Behavioral', text: t }); });
        list.push({ category: 'Role fit', text: 'Why are you interested in the ' + (a.jobTitle || 'this') + ' role, and what do you want to learn in it?' });

        return list.map(function (q) { return Object.assign({ id: newId() }, q); });
    }

    function parseQuery(path)
    {
        return new URLSearchParams(String(path).split('?')[1] || '');
    }

    const routes =
    [
        ['get', /^\/api\/jobs\/([^/]+)\/applicants$/, async function (m, body, path)
        {
            const rows = await orig.get(path);
            return rows.map(function (a) { return withStore(a); });
        }],

        ['get', /^\/api\/applications\/([^/]+)$/, function (m) { return findOne(m[1]); }],

        ['patch', /^\/api\/applications\/([^/]+)\/status$/, async function (m, body)
        {
            const a = await findOne(m[1]);
            const allowed = ['Applied', 'Shortlisted', 'Selected', 'Rejected'];

            if (!body || allowed.indexOf(body.status) === -1)
            {
                fail('Choose a valid status.');
            }

            store.status[a.id] = body.status;
            addEvent(a.id, 'Status changed', a.status + ' to ' + body.status);
            return Object.assign(a, { status: body.status });
        }],

        ['patch', /^\/api\/applications\/([^/]+)\/override$/, async function (m, body, path)
        {
            const result = await orig.patch(path, body);
            addEvent(m[1], 'Score overridden', 'New score ' + body.score + '. Reason: ' + body.reason);
            return result;
        }],

        ['get', /^\/api\/applications\/([^/]+)\/notes$/, function (m) { return store.notes[m[1]] || []; }],

        ['post', /^\/api\/applications\/([^/]+)\/notes$/, function (m, body)
        {
            const text = body && body.text ? String(body.text).trim() : '';

            if (text.length < 2)
            {
                fail('Write a note before saving.');
            }

            const note = { id: newId(), text: text, author: 'You', createdAt: new Date().toISOString() };
            store.notes[m[1]] = (store.notes[m[1]] || []).concat([note]);
            addEvent(m[1], 'Note added', '');
            return note;
        }],

        ['get', /^\/api\/applications\/([^/]+)\/history$/, async function (m)
        {
            const a = await findOne(m[1]);
            const first = { action: 'Applied', detail: 'Application received for ' + (a.jobTitle || 'the job'), by: a.candidateName, createdAt: a.appliedAt || a.createdAt || new Date(Date.now() - 86400000).toISOString() };
            return [first].concat(store.history[m[1]] || []);
        }],

        ['get', /^\/api\/applications\/([^/]+)\/questions$/, async function (m)
        {
            if (!store.questions[m[1]])
            {
                const a = await findOne(m[1]);
                store.rounds[m[1]] = 0;
                store.questions[m[1]] = makeQuestions(a, 0);
                save();
            }

            return store.questions[m[1]];
        }],

        ['post', /^\/api\/applications\/([^/]+)\/questions\/generate$/, async function (m)
        {
            const a = await findOne(m[1]);
            const custom = (store.questions[m[1]] || []).filter(function (q) { return q.category === 'Custom'; });
            store.rounds[m[1]] = (store.rounds[m[1]] || 0) + 1;
            store.questions[m[1]] = makeQuestions(a, store.rounds[m[1]]).concat(custom);
            addEvent(m[1], 'Questions generated', '');
            return store.questions[m[1]];
        }],

        ['post', /^\/api\/applications\/([^/]+)\/questions$/, function (m, body)
        {
            const text = body && body.text ? String(body.text).trim() : '';

            if (text.length < 5)
            {
                fail('Write the question (at least 5 characters).');
            }

            store.questions[m[1]] = (store.questions[m[1]] || []).concat([{ id: newId(), category: 'Custom', text: text }]);
            save();
            return store.questions[m[1]];
        }],

        ['get', /^\/api\/interviews$/, function ()
        {
            return store.interviews.slice().sort(function (x, y) { return new Date(x.scheduledAt) - new Date(y.scheduledAt); });
        }],

        ['post', /^\/api\/interviews$/, async function (m, body)
        {
            body = body || {};

            if (!body.applicationId)
            {
                fail('Choose an applicant.');
            }

            const when = new Date(body.scheduledAt);

            if (isNaN(when.getTime()) || when.getTime() < Date.now())
            {
                fail('Pick a date and time in the future.');
            }

            const clash = store.interviews.some(function (i)
            {
                return i.status === 'Scheduled' && Math.abs(new Date(i.scheduledAt) - when) < 3600000;
            });

            if (clash)
            {
                fail('Another interview is already scheduled within an hour of this time.');
            }

            const a = await findOne(body.applicationId);
            const interview = { id: newId(), applicationId: a.id, applicantName: a.candidateName, jobTitle: a.jobTitle, scheduledAt: when.toISOString(), mode: body.mode || 'Online', location: body.location || '', notes: body.notes || '', status: 'Scheduled' };
            store.interviews.push(interview);
            addEvent(a.id, 'Interview scheduled', when.toLocaleString() + ' (' + interview.mode + ')');
            return interview;
        }],

        ['patch', /^\/api\/interviews\/([^/]+)$/, function (m, body)
        {
            const item = store.interviews.filter(function (i) { return String(i.id) === m[1]; })[0] || fail('Interview not found.');

            if (['Scheduled', 'Completed', 'Cancelled'].indexOf(body && body.status) === -1)
            {
                fail('Choose a valid interview status.');
            }

            item.status = body.status;
            addEvent(item.applicationId, 'Interview ' + body.status.toLowerCase(), '');
            return item;
        }],

        ['get', /^\/api\/analytics$/, async function ()
        {
            const all = await everyone();
            const jobs = await jobsList();
            const order = ['Applied', 'Shortlisted', 'Selected', 'Rejected'];
            const count = function (fn) { return all.filter(fn).length; };
            const scores = all.map(effective);
            const average = function (list) { return list.length ? Math.round(list.reduce(function (s, n) { return s + n; }, 0) / list.length) : 0; };
            const tally = function (pick)
            {
                const map = {};
                all.forEach(function (a) { pick(a).forEach(function (s) { map[s] = (map[s] || 0) + 1; }); });
                return Object.keys(map).map(function (s) { return { skill: s, count: map[s] }; }).sort(function (x, y) { return y.count - x.count; }).slice(0, 6);
            };
            const bucket = function (lo, hi) { return scores.filter(function (s) { return s >= lo && s <= hi; }).length; };

            return {
                totals: { jobs: jobs.length, applicants: all.length, shortlisted: count(function (a) { return a.status === 'Shortlisted'; }), selected: count(function (a) { return a.status === 'Selected'; }), averageScore: average(scores) },
                funnel: order.map(function (s) { return { status: s, count: count(function (a) { return a.status === s; }) }; }),
                distribution: [{ label: '0-39', count: bucket(0, 39) }, { label: '40-59', count: bucket(40, 59) }, { label: '60-79', count: bucket(60, 79) }, { label: '80-100', count: bucket(80, 100) }],
                topSkills: tally(function (a) { return names((a.score_json || {}).matched_skills); }),
                topGaps: tally(gapsOf),
                byJob: jobs.map(function (j)
                {
                    const mine = all.filter(function (a) { return String(a.jobId) === String(j.id); });
                    return { title: j.title, applicants: mine.length, averageScore: average(mine.map(effective)) };
                })
            };
        }],

        ['get', /^\/api\/search$/, async function (m, body, path)
        {
            const params = parseQuery(path);
            const q = (params.get('q') || '').trim().toLowerCase();
            const skills = (params.get('skills') || '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
            const min = Number(params.get('minScore')) || 0;
            const status = params.get('status') || '';
            const all = await everyone();

            return all.filter(function (a)
            {
                const have = names((a.score_json || {}).matched_skills).map(function (s) { return s.toLowerCase(); });
                const text = ((a.candidateName || '') + ' ' + (a.email || '') + ' ' + have.join(' ')).toLowerCase();
                const skillsOk = skills.every(function (s) { return have.some(function (h) { return h.indexOf(s) !== -1; }); });
                return (!q || text.indexOf(q) !== -1) && skillsOk && effective(a) >= min && (!status || a.status === status);
            }).sort(function (x, y) { return effective(y) - effective(x); });
        }]
    ];

    methods.forEach(function (method)
    {
        Api[method] = async function (path, body)
        {
            const clean = String(path).split('?')[0];

            for (const route of routes)
            {
                const match = route[0] === method ? clean.match(route[1]) : null;

                if (match)
                {
                    await wait();
                    return route[2](match, body, path);
                }
            }

            if (!orig[method])
            {
                fail('Api.' + method + ' is not available for ' + clean + '.');
            }

            return orig[method].apply(Api, arguments);
        };
    });
}());
