const SAVED_KEY_PREFIX = 'soryn-saved-jobs-';
const NOTES_POLL_MS = 30000;
const NEW_JOB_DAYS = 14;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const CandidateKit =
{
    STEPS: ['Submitted', 'Resume read', 'Under review', 'Shortlisted', 'Interview', 'Decision'],

    STEP_OF:
    {
        'Submitted': 0,
        'Parsed': 1,
        'AI Assessment Available': 2,
        'Recruiter Review': 2,
        'Shortlisted': 3,
        'Interview': 4,
        'Selected': 5,
        'Rejected': 5
    },

    LABEL_OF:
    {
        'Submitted': 'Submitted',
        'Parsed': 'Resume read',
        'AI Assessment Available': 'Under review',
        'Recruiter Review': 'Under review',
        'Shortlisted': 'Shortlisted',
        'Interview': 'Interview',
        'Selected': 'Selected',
        'Rejected': 'Not selected'
    },

    NEXT_OF:
    {
        'Submitted': 'We have your application. Next, we read your resume and pick out your skills.',
        'Parsed': 'Your resume has been read. Next, it joins the review queue.',
        'AI Assessment Available': 'A person on the hiring team is reviewing your application. You will hear from us when it moves forward.',
        'Recruiter Review': 'A person on the hiring team is reviewing your application. You will hear from us when it moves forward.',
        'Shortlisted': 'You are on the shortlist. The team will contact you about the next step.',
        'Interview': 'You are at the interview stage. Details arrive in your notifications.',
        'Selected': 'Congratulations, you have been selected. The team will contact you with the next steps.',
        'Rejected': 'The team has decided not to move forward with this application. Thank you for your time, and have a look at the other open roles.'
    },

    TONE_OF:
    {
        'Selected': 'ok',
        'Rejected': 'bad',
        'Shortlisted': 'ok'
    },

    CHECK: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    DASH: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>',

    reducedMotion()
    {
        return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    },

    attrEsc(value)
    {
        return Dash.esc(String(value)).replace(/"/g, '&quot;');
    },

    stepIndex(status)
    {
        const index = CandidateKit.STEP_OF[status];
        return index === undefined ? 0 : index;
    },

    label(status)
    {
        return CandidateKit.LABEL_OF[status] || status;
    },

    tone(status)
    {
        return CandidateKit.TONE_OF[status] || 'info';
    },

    isActive(status)
    {
        return status !== 'Selected' && status !== 'Rejected';
    },

    nextText(status)
    {
        return CandidateKit.NEXT_OF[status] || 'We will update this page when something changes.';
    },

    stepperHtml(app)
    {
        const current = CandidateKit.stepIndex(app.status);
        const stopped = app.status === 'Rejected';
        const finished = app.status === 'Selected';

        return '<ol class="cd-stepper" aria-label="Application progress">' + CandidateKit.STEPS.map(function (name, index)
        {
            let cls = '';
            let state = 'not reached yet';
            let mark = '';

            if (index < current || (index === current && finished))
            {
                cls = 'is-done';
                state = 'completed';
                mark = CandidateKit.CHECK;
            }
            else if (index === current)
            {
                cls = stopped ? 'is-stop' : 'is-current';
                state = stopped ? 'ended here' : 'current step';
                mark = stopped ? CandidateKit.DASH : '';
            }

            return '<li class="' + cls + '"' + (index === current ? ' aria-current="step"' : '') + '>' +
                '<span class="cd-dot" aria-hidden="true">' + mark + '</span>' +
                '<span class="cd-step-label">' + Dash.esc(name) + '<span class="cd-vh">, ' + state + '</span></span></li>';
        }).join('') + '</ol>';
    },

    timelineHtml(timeline)
    {
        const entries = [];

        (timeline || []).forEach(function (entry)
        {
            const label = CandidateKit.label(entry.status);

            if (!entries.length || entries[entries.length - 1].label !== label)
            {
                entries.push({ label: label, at: entry.at });
            }
        });

        if (entries.length < 2)
        {
            return '';
        }

        return '<details class="cd-history"><summary>See every update</summary><ul>' + entries.map(function (entry)
        {
            return '<li><b>' + Dash.esc(entry.label) + '</b><span>' + Dash.esc(Dash.dateTime(entry.at)) + '</span></li>';
        }).join('') + '</ul></details>';
    },

    applicationHtml(app, compact)
    {
        const date = Dash.formatDate(app.appliedAt);
        const step = CandidateKit.stepIndex(app.status);

        return '<article class="cd-app" data-app="' + CandidateKit.attrEsc(app.id) + '">' +
            '<header class="cd-app-head"><div><h4>' + Dash.esc(app.jobTitle) + '</h4><p>' + (date ? 'Applied ' + Dash.esc(date) : '') + '</p></div>' +
            Dash.badge(CandidateKit.label(app.status), CandidateKit.tone(app.status)) + '</header>' +
            (compact
                ? '<p class="cd-step-line">Step ' + (step + 1) + ' of ' + CandidateKit.STEPS.length + '</p>'
                : CandidateKit.stepperHtml(app)) +
            '<p class="cd-next">' + Dash.esc(CandidateKit.nextText(app.status)) + '</p>' +
            (compact ? '' : CandidateKit.timelineHtml(app.timeline)) +
            '</article>';
    },

    loadSaved(userId)
    {
        try
        {
            const list = JSON.parse(localStorage.getItem(SAVED_KEY_PREFIX + userId) || '[]');
            return Array.isArray(list) ? list.map(String) : [];
        }
        catch (error)
        {
            return [];
        }
    },

    storeSaved(userId, list)
    {
        try
        {
            localStorage.setItem(SAVED_KEY_PREFIX + userId, JSON.stringify(list));
        }
        catch (error)
        {
        }
    },

    daysSince(iso)
    {
        const time = new Date(iso).getTime();

        if (!Number.isFinite(time))
        {
            return Infinity;
        }

        return (Date.now() - time) / 86400000;
    },

    isNewJob(job)
    {
        return CandidateKit.daysSince(job.createdAt) <= NEW_JOB_DAYS;
    },

    strength(profile)
    {
        const p = profile || {};
        const skills = p.skills || [];
        const unverified = skills.filter(function (item) { return item.verified === false; }).length;
        const checks =
        [
            { done: Boolean(p.resumeFileName), weight: 20, text: 'Upload your resume so we can read your skills.' },
            { done: skills.length >= 3, weight: 20, text: 'Add at least three skills to your profile.' },
            { done: (p.experience || []).length > 0, weight: 15, text: 'Add your work experience to strengthen your profile.' },
            { done: (p.education || []).length > 0, weight: 15, text: 'Add your education to strengthen your profile.' },
            { done: (p.projects || []).length > 0, weight: 10, text: 'Add a project to strengthen your profile.' },
            { done: Boolean(p.headline), weight: 10, text: 'Add a headline that says what you do.' },
            { done: Boolean(p.phone), weight: 10, text: 'Add a phone number so the team can reach you.' }
        ];

        let percent = 0;
        let suggestion = '';

        checks.forEach(function (check)
        {
            if (check.done)
            {
                percent += check.weight;
            }
            else if (!suggestion)
            {
                suggestion = check.text;
            }
        });

        if (unverified > 0 && (!suggestion || checks[0].done))
        {
            suggestion = unverified + (unverified === 1 ? ' skill is' : ' skills are') + ' not in your resume text. Check ' + (unverified === 1 ? 'it' : 'them') + ' or remove ' + (unverified === 1 ? 'it' : 'them') + '.';
        }

        return { percent: percent, suggestion: suggestion || 'Your profile is complete. Update it whenever your experience changes.' };
    },

    ringHtml(percent)
    {
        return '<div class="cd-ring" style="--p:0" data-p="' + percent + '" role="img" aria-label="Profile strength ' + percent + ' percent">' +
            '<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="bg" cx="18" cy="18" r="15.9155" pathLength="100"/><circle class="fg" cx="18" cy="18" r="15.9155" pathLength="100"/></svg>' +
            '<b>' + percent + '%</b></div>';
    },

    animateRings(root)
    {
        const rings = root.querySelectorAll('.cd-ring');

        requestAnimationFrame(function ()
        {
            requestAnimationFrame(function ()
            {
                for (let i = 0; i < rings.length; i++)
                {
                    rings[i].style.setProperty('--p', rings[i].getAttribute('data-p'));
                }
            });
        });
    },

    bellHandler()
    {
        const target = document.getElementById('notifications');

        if (!target)
        {
            window.location.href = 'candidate.html#notifications';
            return;
        }

        target.scrollIntoView({ behavior: CandidateKit.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        target.focus({ preventScroll: true });
    },

    mountNotes(options)
    {
        const list = options.list;
        const markButton = options.markButton;
        const state = { items: [], known: null, timer: null };

        function unreadCount()
        {
            return state.items.filter(function (item) { return item.read !== true; }).length;
        }

        function render()
        {
            const unread = unreadCount();
            Dash.setBell(unread);
            markButton.disabled = unread === 0;

            if (!state.items.length)
            {
                list.innerHTML = Dash.empty('bell', 'No notifications yet. We will tell you the moment something changes.');
                Dash.icons();
                return;
            }

            list.innerHTML = '<ul class="cd-notes">' + state.items.map(function (item)
            {
                const isUnread = item.read !== true;

                return '<li class="cd-note' + (isUnread ? ' is-unread' : '') + '"><span class="cd-unread" aria-hidden="true"></span>' +
                    '<div><p>' + (isUnread ? '<span class="cd-vh">Unread: </span>' : '') + Dash.esc(item.message) + '</p><small>' + Dash.esc(Dash.timeAgo(item.createdAt)) + '</small></div></li>';
            }).join('') + '</ul>';

            Dash.icons();
        }

        async function refresh(announce)
        {
            const items = await Api.get('/api/notifications');
            const fresh = [];

            if (state.known !== null)
            {
                items.forEach(function (item)
                {
                    if (item.read !== true && !state.known[item.id])
                    {
                        fresh.push(item);
                    }
                });
            }

            state.known = {};

            items.forEach(function (item)
            {
                state.known[item.id] = true;
            });

            state.items = items;
            render();

            if (announce && fresh.length)
            {
                showToast(fresh.length === 1 ? fresh[0].message : fresh.length + ' new notifications.', 'info');
            }
        }

        async function load()
        {
            list.innerHTML = Dash.skeletons(1);

            try
            {
                await refresh(false);
            }
            catch (error)
            {
                markButton.disabled = true;
                Dash.failInto(list, error.message, load);
            }

            Dash.icons();
        }

        async function markAll()
        {
            Dash.setBusy(markButton, true);

            try
            {
                const items = await Api.patch('/api/notifications/read');
                state.items = Array.isArray(items) ? items : state.items.map(function (item) { item.read = true; return item; });
                render();
                showToast('All notifications marked as read.', 'success');
            }
            catch (error)
            {
                showToast(error.message, 'error');
            }

            Dash.setBusy(markButton, false);
            markButton.disabled = unreadCount() === 0;
        }

        markButton.addEventListener('click', markAll);

        state.timer = setInterval(function ()
        {
            if (!document.hidden)
            {
                refresh(true).catch(function () {});
            }
        }, NOTES_POLL_MS);

        return {
            load: load,
            refresh: function (announce)
            {
                return refresh(Boolean(announce)).catch(function () {});
            }
        };
    }
};

const ApplyFlow =
{
    formatSize(bytes)
    {
        if (bytes >= 1024 * 1024)
        {
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }

        return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    },

    fileProblem(file)
    {
        if (!file)
        {
            return 'Choose your resume before you submit.';
        }

        if (!/\.pdf$/i.test(file.name))
        {
            return 'We can only accept PDF resumes. Export your resume as a PDF and choose it again.';
        }

        if (file.size > MAX_RESUME_BYTES)
        {
            return 'That file is over the 5 MB limit. Exporting again without images usually makes it smaller.';
        }

        return '';
    },

    advice(error)
    {
        const status = error && error.status;

        if (status === 409)
        {
            return { title: 'You already applied to this role.', hint: 'Follow it from My applications.', link: true };
        }

        if (status === 413 || status === 400 || status === 415)
        {
            return { title: error.message, hint: 'Choose a different PDF and submit again.' };
        }

        if (status === 404)
        {
            return { title: 'This job is no longer available.', hint: 'It may have been closed. Go back and pick another role.' };
        }

        if (!status)
        {
            return { title: 'We could not reach the server.', hint: 'Check your connection and submit again. Your file is still selected.' };
        }

        return { title: error.message || 'Something went wrong.', hint: 'Nothing was submitted. Try again in a moment.' };
    },

    mount(root, job, hooks)
    {
        const options = hooks || {};

        root.innerHTML =
            '<form class="cd-apply" novalidate>' +
                '<div class="d-drop" role="button" tabindex="0" aria-label="Choose your resume PDF file">' +
                    '<i data-lucide="file-up"></i><b>Choose your resume</b>' +
                    '<span>PDF only, up to 5 MB. You can also drag it here.</span>' +
                '</div>' +
                '<input type="file" class="d-sr" accept=".pdf,application/pdf" aria-label="Resume PDF file">' +
                '<div class="cd-file" hidden>' +
                    '<i data-lucide="file-text"></i>' +
                    '<div class="cd-file-name"><b></b><span></span></div>' +
                    '<button type="button" class="btn btn-secondary btn-sm" data-remove>Remove</button>' +
                '</div>' +
                '<p class="error-text" data-file-error role="alert"></p>' +
                '<div class="cd-stages" role="status" aria-live="polite" hidden>' +
                    '<ol class="cd-stage-list"><li data-stage="upload">Uploading</li><li data-stage="read">Reading your resume</li><li data-stage="done">Done</li></ol>' +
                    '<div class="d-progress" aria-hidden="true"><u></u></div>' +
                '</div>' +
                '<div class="cd-error" role="alert" hidden><b></b><span></span></div>' +
                '<div class="cd-actions">' +
                    '<button type="submit" class="btn" data-submit><i data-lucide="send" style="width:16px;height:16px"></i>Submit application</button>' +
                    (options.cancelHref ? '<a class="btn btn-secondary" href="' + CandidateKit.attrEsc(options.cancelHref) + '">' + Dash.esc(options.cancelLabel || 'Cancel') + '</a>' : '') +
                    (options.onCancel ? '<button type="button" class="btn btn-secondary" data-cancel>' + Dash.esc(options.cancelLabel || 'Cancel') + '</button>' : '') +
                '</div>' +
            '</form>' +
            '<div class="cd-done" hidden></div>' +
            '<div class="cd-next-box"><b>What happens next</b><p>Your resume is read, then a real person on the hiring team reviews your application. We send you an update as soon as there is news.</p></div>';

        const form = root.querySelector('form');
        const drop = root.querySelector('.d-drop');
        const input = root.querySelector('input[type="file"]');
        const fileBox = root.querySelector('.cd-file');
        const fileError = root.querySelector('[data-file-error]');
        const stages = root.querySelector('.cd-stages');
        const fill = root.querySelector('.d-progress u');
        const errorBox = root.querySelector('.cd-error');
        const submit = root.querySelector('[data-submit]');
        const done = root.querySelector('.cd-done');
        let file = null;
        let busy = false;
        let ramp = null;
        let stageTimer = null;

        function setStage(name)
        {
            const order = ['upload', 'read', 'done'];
            const at = order.indexOf(name);

            stages.querySelectorAll('li').forEach(function (item)
            {
                const index = order.indexOf(item.getAttribute('data-stage'));
                item.classList.toggle('is-done', index < at || name === 'done');
                item.classList.toggle('is-active', index === at && name !== 'done');
            });
        }

        function stopTimers()
        {
            clearInterval(ramp);
            clearTimeout(stageTimer);
            ramp = null;
            stageTimer = null;
        }

        function showFile()
        {
            if (!file)
            {
                fileBox.hidden = true;
                drop.hidden = false;
                return;
            }

            fileBox.querySelector('b').textContent = file.name;
            fileBox.querySelector('span').textContent = 'PDF, ' + ApplyFlow.formatSize(file.size);
            fileBox.hidden = false;
            drop.hidden = true;
        }

        function pick(files)
        {
            const candidate = files && files.length ? files[0] : null;
            const problem = candidate ? ApplyFlow.fileProblem(candidate) : '';

            errorBox.hidden = true;
            fileError.textContent = problem;
            file = problem ? null : candidate;

            if (problem)
            {
                input.value = '';
            }

            showFile();
            Dash.icons();
        }

        function fail(error)
        {
            const advice = ApplyFlow.advice(error);

            stopTimers();
            stages.hidden = true;
            fill.style.width = '0';
            errorBox.querySelector('b').textContent = advice.title;
            errorBox.querySelector('span').innerHTML = Dash.esc(advice.hint) + (advice.link ? ' <a href="my-applications.html">Open My applications</a>.' : '');
            errorBox.hidden = false;
            busy = false;
            Dash.setBusy(submit, false);
        }

        function succeed(result)
        {
            stopTimers();
            fill.style.width = '100%';
            setStage('done');

            window.setTimeout(function ()
            {
                form.hidden = true;
                done.innerHTML = '<i data-lucide="circle-check"></i><h4>Application received</h4>' +
                    '<p>Your application for ' + Dash.esc(result.jobTitle || job.title) + ' is in. You can follow every step from My applications.</p>' +
                    '<div class="cd-actions"><a class="btn" href="my-applications.html">Track my applications</a>' +
                    (options.onClose ? '<button type="button" class="btn btn-secondary" data-close>Close</button>' : '') + '</div>';
                done.hidden = false;
                busy = false;
                Dash.icons();

                const closer = done.querySelector('[data-close]');

                if (closer)
                {
                    closer.addEventListener('click', options.onClose);
                }

                done.querySelector('a').focus();

                if (options.onApplied)
                {
                    options.onApplied(result, job);
                }
            }, CandidateKit.reducedMotion() ? 0 : 350);
        }

        async function send(event)
        {
            event.preventDefault();

            if (busy)
            {
                return;
            }

            const problem = ApplyFlow.fileProblem(file);
            fileError.textContent = problem;
            errorBox.hidden = true;

            if (problem)
            {
                drop.focus();
                return;
            }

            const data = new FormData();
            data.append('jobId', String(job.id));
            data.append('resume', file);

            busy = true;
            Dash.setBusy(submit, true);
            stages.hidden = false;
            setStage('upload');

            let width = 10;
            fill.style.width = width + '%';

            ramp = setInterval(function ()
            {
                width = Math.min(90, width + (90 - width) * 0.15);
                fill.style.width = Math.round(width) + '%';
            }, 200);

            stageTimer = setTimeout(function ()
            {
                setStage('read');
            }, 1400);

            try
            {
                const result = await Api.upload('/api/applications', data);
                succeed(result);
            }
            catch (error)
            {
                fail(error);
            }
        }

        drop.addEventListener('click', function ()
        {
            input.click();
        });

        drop.addEventListener('keydown', function (event)
        {
            if (event.key === 'Enter' || event.key === ' ')
            {
                event.preventDefault();
                input.click();
            }
        });

        drop.addEventListener('dragover', function (event)
        {
            event.preventDefault();
            drop.classList.add('over');
        });

        drop.addEventListener('dragleave', function ()
        {
            drop.classList.remove('over');
        });

        drop.addEventListener('drop', function (event)
        {
            event.preventDefault();
            drop.classList.remove('over');
            pick(event.dataTransfer.files);
        });

        input.addEventListener('change', function ()
        {
            pick(input.files);
        });

        root.querySelector('[data-remove]').addEventListener('click', function ()
        {
            file = null;
            input.value = '';
            fileError.textContent = '';
            showFile();
            drop.focus();
        });

        const cancel = root.querySelector('[data-cancel]');

        if (cancel)
        {
            cancel.addEventListener('click', function ()
            {
                if (!busy)
                {
                    options.onCancel();
                }
            });
        }

        form.addEventListener('submit', send);
        Dash.icons();

        return {
            busy: function ()
            {
                return busy;
            },
            focus: function ()
            {
                drop.focus();
            }
        };
    }
};
