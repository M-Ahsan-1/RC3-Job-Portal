
        const user = guardPage('candidate');
        const jobId = Dash.intParam('jobId', 0);
        const MAX_BYTES = 5 * 1024 * 1024;
        let rampTimer = null;

        function el(id)
        {
            return document.getElementById(id);
        }

        function formatSize(bytes)
        {
            if (bytes >= 1024 * 1024)
            {
                return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
            }

            return Math.max(1, Math.round(bytes / 1024)) + ' KB';
        }

        function fileProblem(file)
        {
            if (!file)
            {
                return 'Please choose your resume before submitting your application.';
            }

            if (!/\.pdf$/i.test(file.name))
            {
                return 'We can only accept PDF resumes. Please save or export your resume as a PDF and choose it again.';
            }

            if (file.size > MAX_BYTES)
            {
                return 'That file is larger than our 5 MB limit. A simpler export or removing a photo usually makes it smaller.';
            }

            return '';
        }

        function onFilePicked(files)
        {
            const file = files && files.length ? files[0] : null;
            const problem = file ? fileProblem(file) : '';
            el('file-error').textContent = problem;
            el('submit-error').textContent = '';

            if (!file)
            {
                el('drop-title').textContent = 'Click to choose your resume';
                el('drop-hint').textContent = 'PDF only, up to 5 MB. Drag and drop works too.';
                return;
            }

            el('drop-title').textContent = file.name;

            if (problem)
            {
                el('drop-hint').textContent = 'This file cannot be used yet. Please see the message below.';
                return;
            }

            el('drop-hint').textContent = 'PDF, ' + formatSize(file.size) + '. Click to choose a different file.';
        }

        function startProgress()
        {
            el('progress-wrap').classList.remove('hidden');
            el('progress-label').textContent = 'Uploading your resume… this bar shows activity, not an exact percentage.';

            let width = 10;
            el('progress-fill').style.width = width + '%';

            rampTimer = setInterval(function ()
            {
                width = Math.min(90, width + (90 - width) * 0.2);
                el('progress-fill').style.width = Math.round(width) + '%';
            }, 200);
        }

        function stopProgress()
        {
            if (rampTimer)
            {
                clearInterval(rampTimer);
                rampTimer = null;
            }
        }

        function resetProgress()
        {
            stopProgress();
            el('progress-fill').style.width = '0';
            el('progress-wrap').classList.add('hidden');
        }

        function skillChips(job)
        {
            return (job.skills || []).map(function (item)
            {
                const required = item.requirement === 'required';
                return '<span class="d-chip ' + (required ? 'info' : '') + '">' + Dash.esc(item.skill) + ' &middot; ' + (required ? 'Required' : 'Preferred') + '</span>';
            }).join('');
        }

        function renderJob(job)
        {
            const tags = [job.department, job.location, job.type].filter(Boolean).map(function (tag)
            {
                return '<span class="d-badge info">' + Dash.esc(tag) + '</span>';
            }).join('');

            const closed = job.status === 'open' ? '' : Dash.callout('lock', 'This role is closed',
                '<p>We are no longer accepting applications for this position. Have a look at the other open roles, we would love to see you apply to one of them.</p>' +
                '<a href="candidate.html" style="display:inline-block;margin-top:8px">Back to my dashboard</a>', 'warn');

            const experience = Number(job.experienceYears) > 0 ? Dash.esc(job.experienceYears) + '+ years' : 'Flexible';
            const chips = skillChips(job);

            el('job-panel').innerHTML = closed +
                '<h3>' + Dash.esc(job.title) + '</h3>' +
                (tags ? '<div class="d-meta" style="margin-top:8px">' + tags + '</div>' : '') +
                '<div class="d-metrics" style="margin-top:16px">' +
                    '<div class="d-metric"><b>' + Dash.esc(job.salary || 'Not disclosed') + '</b><span>Salary</span></div>' +
                    '<div class="d-metric"><b>' + experience + '</b><span>Experience required</span></div>' +
                '</div>' +
                '<p style="margin-top:14px;font-size:.9rem;color:#475569;line-height:1.65">' + Dash.esc(job.description || 'No description provided yet.') + '</p>' +
                (job.qualifications ? '<p style="margin-top:10px;font-size:.86rem;color:#475569"><b>Qualifications:</b> ' + Dash.esc(job.qualifications) + '</p>' : '') +
                (chips ? '<div class="d-group-title">Skills we are looking for</div><div class="d-chips">' + chips + '</div>' : '');
        }

        async function load()
        {
            el('apply-panel').classList.add('hidden');

            if (!jobId)
            {
                el('job-panel').innerHTML = Dash.empty('briefcase', 'We could not tell which job you want to apply to. Please open the job from your dashboard and choose Apply now.', '<a class="btn btn-sm" href="candidate.html#jobs">Browse open jobs</a>');
                Dash.icons();
                return;
            }

            el('job-panel').innerHTML = Dash.skeletons(1);

            try
            {
                const job = await Api.get('/api/jobs/' + jobId);
                renderJob(job);

                if (job.status === 'open')
                {
                    el('apply-panel').classList.remove('hidden');
                }
            }
            catch (error)
            {
                if (error.status === 404)
                {
                    el('job-panel').innerHTML = Dash.empty('briefcase', 'This job is no longer available. It may have been filled or removed.', '<a class="btn btn-sm" href="candidate.html">Back to my dashboard</a>');
                }
                else
                {
                    Dash.failInto(el('job-panel'), error.message, load);
                }
            }

            Dash.icons();
        }

        async function submitApplication(event)
        {
            event.preventDefault();
            el('submit-error').textContent = '';

            const file = el('resume-input').files[0] || null;
            const problem = fileProblem(file);
            el('file-error').textContent = problem;

            if (problem)
            {
                return;
            }

            const data = new FormData();
            data.append('jobId', String(jobId));
            data.append('resume', file);

            Dash.setBusy(el('submit-btn'), true);
            startProgress();

            try
            {
                const result = await Api.upload('/api/applications', data);
                stopProgress();
                el('progress-fill').style.width = '100%';
                el('progress-label').textContent = 'Upload complete.';
                el('apply-form').classList.add('hidden');
                el('success-box').innerHTML = Dash.callout('circle-check', 'Application received',
                    '<p>Thank you. Your application for ' + Dash.esc(result.jobTitle) + ' has been received, and a real person on our hiring team will review it. You can follow every step from your applications page.</p>' +
                    '<a class="btn btn-sm" href="my-applications.html" style="margin-top:10px">Track my applications</a>', 'ok');
                el('success-box').classList.remove('hidden');
                showToast('Your application was submitted. Good luck!', 'success');
                Dash.icons();
            }
            catch (error)
            {
                resetProgress();
                el('submit-error').textContent = error.message;
                Dash.setBusy(el('submit-btn'), false);
            }
        }

        if (user)
        {
            Dash.mountShell(
            {
                user: user,
                logo: 'rocket',
                title: 'Apply',
                subtitle: 'One step closer to your next role',
                search: false,
                active: 'candidate.html',
                items: Dash.CANDIDATE_NAV,
                onBell: function ()
                {
                    window.location.href = 'candidate.html#notifications';
                }
            });

            const drop = el('drop');
            const input = el('resume-input');

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
                input.files = event.dataTransfer.files;
                onFilePicked(event.dataTransfer.files);
            });

            input.addEventListener('change', function ()
            {
                onFilePicked(input.files);
            });

            el('apply-form').addEventListener('submit', submitApplication);
            load();
        }
    