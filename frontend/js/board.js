const BD_FLOW =
{
    'Submitted': ['Parsed', 'Rejected'],
    'Parsed': ['AI Assessment Available', 'Rejected'],
    'AI Assessment Available': ['Recruiter Review', 'Rejected'],
    'Recruiter Review': ['Shortlisted', 'Rejected'],
    'Shortlisted': ['Interview', 'Rejected'],
    'Interview': ['Selected', 'Rejected'],
    'Selected': [],
    'Rejected': []
};

const BD_LABEL =
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

const BD_HINT =
{
    'Submitted': 'New applications land here.',
    'Parsed': 'Resumes that were read and are waiting for scoring.',
    'AI Assessment Available': 'Scored applicants appear here.',
    'Recruiter Review': 'Move applicants here when you start reviewing them.',
    'Shortlisted': 'Move a strong candidate here to start scheduling.',
    'Interview': 'Candidates with an interview booked.',
    'Selected': 'Your final picks.',
    'Rejected': 'Candidates you decided not to move forward with.'
};

const BD_FINAL = ['Selected', 'Rejected'];
const BD_VIEW_KEY = 'applicants-view';
const BD_REASON_MIN = 10;
const BD_SHAKE_MS = 420;
const BD_CLOSE_MS = 140;

const Board =
{
    cfg: null,
    rows: [],
    view: 'table',
    drag: null,

    el(id)
    {
        return document.getElementById(id);
    },

    label(status)
    {
        return BD_LABEL[status] || status;
    },

    init(cfg)
    {
        Board.cfg = cfg;
        Board.view = Dash.readSetting(BD_VIEW_KEY) === 'board' ? 'board' : 'table';
        Board.bind();
        Board.setView(Board.view, false);
    },

    setView(view, remember)
    {
        const board = view === 'board';

        Board.view = view;

        Board.el('list').classList.toggle('hidden', board);
        Board.el('board').classList.toggle('hidden', !board);
        Board.el('board-note').classList.toggle('hidden', !board);
        Board.el('compare-btn').classList.toggle('hidden', board);
        Board.el('select-hint').classList.toggle('hidden', board);

        Board.el('view-table').setAttribute('aria-pressed', board ? 'false' : 'true');
        Board.el('view-board').setAttribute('aria-pressed', board ? 'true' : 'false');

        if (remember)
        {
            Dash.writeSetting(BD_VIEW_KEY, view);
        }
    },

    showList()
    {
        Board.el('board').classList.add('hidden');
        Board.el('board-note').classList.add('hidden');
        Board.el('list').classList.remove('hidden');
    },

    showSkeleton()
    {
        Board.setView(Board.view, false);

        let html = '';

        for (let i = 0; i < 4; i++)
        {
            html += '<div class="bd-col" aria-hidden="true"><div class="bd-skel head"></div><div class="bd-skel"></div><div class="bd-skel"></div></div>';
        }

        Board.el('board').innerHTML = '<div class="bd-scroll">' + html + '</div>';
    },

    daysIn(item)
    {
        const history = item.history || [];
        let at = null;

        for (let i = history.length - 1; i >= 0; i--)
        {
            if (history[i].to === item.status)
            {
                at = history[i].at;
                break;
            }
        }

        at = at || item.updatedAt || item.appliedAt;

        const days = Math.floor((Date.now() - new Date(at).getTime()) / 86400000);

        if (isNaN(days) || days < 1)
        {
            return 'today';
        }

        return days + (days === 1 ? ' day' : ' days');
    },

    cardHtml(item)
    {
        const score = item.effectiveScore;
        const hasScore = score !== null && score !== undefined;
        const detail = item.score_json || {};
        const skills = (detail.matched_skills || []).slice().sort(function (a, b)
        {
            return (b.similarity || 0) - (a.similarity || 0);
        }).slice(0, 3);
        const gaps = (detail.gaps || []).length;
        const allowed = BD_FLOW[item.status] || [];
        const name = Dash.esc(item.candidateName);
        const href = 'applicant-detail.html?id=' + encodeURIComponent(item.id) + '&amp;jobId=' + encodeURIComponent(Board.cfg.jobId);

        let move = '<p class="bd-final">Final decision recorded</p>';

        if (allowed.length)
        {
            move = '<select class="bd-move" aria-label="Move ' + name + ' to another stage"><option value="">Move to</option>' +
                allowed.map(function (status)
                {
                    return '<option value="' + Dash.esc(status) + '">' + Dash.esc(Board.label(status)) + '</option>';
                }).join('') + '</select>';
        }

        return '<article class="bd-card' + (BD_FINAL.indexOf(item.status) === -1 ? '' : ' is-final') + '" draggable="' + (allowed.length ? 'true' : 'false') + '" data-id="' + Dash.esc(item.id) + '">' +
            '<div class="bd-top"><a class="bd-name" href="' + href + '">' + name + '</a>' +
            (hasScore ? '<span class="bd-score" title="AI assessment">' + Math.round(score) + '</span>' : '<span class="bd-none">Not assessed</span>') + '</div>' +
            (hasScore ? '<div class="bd-track" aria-hidden="true"><i class="' + Dash.scoreTier(score) + '" style="width:' + Math.max(0, Math.min(100, score)) + '%"></i></div>' : '') +
            (skills.length ? '<div class="bd-chips">' + skills.map(function (entry)
            {
                return '<span class="bd-chip">' + Dash.esc(entry.skill) + '</span>';
            }).join('') + '</div>' : '') +
            '<p class="bd-meta">' + (gaps ? gaps + (gaps === 1 ? ' gap' : ' gaps') : 'No gaps') + ' · ' + Board.daysIn(item) + (Board.daysIn(item) === 'today' ? '' : ' in stage') + '</p>' +
            move + '</article>';
    },

    render(rows, total)
    {
        const box = Board.el('board');

        Board.rows = rows;

        if (!total)
        {
            box.innerHTML = Dash.empty('users', 'No one has applied to this job yet. Applicants appear here as soon as they apply.');
            Dash.icons();
            return;
        }

        box.innerHTML = '<div class="bd-scroll">' + Dash.PIPELINE.map(function (status)
        {
            const inColumn = rows.filter(function (item)
            {
                return item.status === status;
            });

            return '<section class="bd-col tone-' + Dash.statusTone(status) + '" data-status="' + Dash.esc(status) + '" aria-label="' + Dash.esc(Board.label(status)) + ', ' + inColumn.length + ' applicants">' +
                '<header class="bd-head"><h4>' + Dash.esc(Board.label(status)) + '</h4><span class="bd-count">' + inColumn.length + '</span></header>' +
                '<div class="bd-cards">' + (inColumn.length ? inColumn.map(Board.cardHtml).join('') : '<p class="bd-empty">' + Dash.esc(BD_HINT[status] || 'No one here yet.') + '</p>') + '</div></section>';
        }).join('') + '</div>';
    },

    find(id)
    {
        return Board.rows.filter(function (item)
        {
            return String(item.id) === String(id);
        })[0] || null;
    },

    explain(from, to)
    {
        const allowed = BD_FLOW[from] || [];
        const order = Dash.PIPELINE;

        if (!allowed.length)
        {
            return Board.label(from) + ' is a final decision, so this candidate cannot be moved again.';
        }

        if (to !== 'Rejected' && order.indexOf(to) < order.indexOf(from))
        {
            return 'Applicants only move forward. This one is already past ' + Board.label(to) + '.';
        }

        if (to === 'Interview')
        {
            return 'Move to Shortlisted before scheduling an interview.';
        }

        if (to === 'Selected')
        {
            return 'Move to Interview before selecting a candidate.';
        }

        if (to === 'Shortlisted')
        {
            return 'Move to Under review before shortlisting.';
        }

        return 'From ' + Board.label(from) + ', the next step is ' + allowed.map(Board.label).join(' or ') + '.';
    },

    shakeCard(id)
    {
        const card = Board.el('board').querySelector('.bd-card[data-id="' + String(id).replace(/"/g, '') + '"]');

        if (!card)
        {
            return;
        }

        card.classList.add('bd-shake');

        setTimeout(function ()
        {
            card.classList.remove('bd-shake');
        }, BD_SHAKE_MS);
    },

    verb(to)
    {
        if (to === 'Shortlisted')
        {
            return 'Candidate shortlisted';
        }

        return 'Moved to ' + Board.label(to).toLowerCase();
    },

    attempt(id, to)
    {
        const item = Board.find(id);

        if (!item || item.status === to)
        {
            return;
        }

        if ((BD_FLOW[item.status] || []).indexOf(to) === -1)
        {
            showToast(Board.explain(item.status, to), 'error');
            Board.render(Board.rows, 1);
            Board.shakeCard(id);
            return;
        }

        if (BD_FINAL.indexOf(to) !== -1)
        {
            Board.decide(item, to);
            return;
        }

        Board.moveStatus(item, to);
    },

    async moveStatus(item, to)
    {
        const before = item;
        const now = new Date().toISOString();

        Board.cfg.onMoved(Object.assign({}, item, { status: to, updatedAt: now }));

        try
        {
            const updated = await Api.patch('/api/applications/' + encodeURIComponent(item.id) + '/status', { status: to });

            Board.cfg.onMoved(updated);
            showToast(Board.verb(to), 'success');
        }
        catch (error)
        {
            Board.cfg.onMoved(before);
            Board.shakeCard(item.id);
            showToast(error.message, 'error');
        }
    },

    decide(item, to)
    {
        const reject = to === 'Rejected';
        const dialog = document.createElement('dialog');
        const name = Dash.esc(item.candidateName);

        dialog.className = 'dialog';
        dialog.setAttribute('aria-labelledby', 'bd-title');

        dialog.innerHTML =
            '<h2 id="bd-title">' + (reject ? 'Reject candidate' : 'Select candidate') + '</h2>' +
            '<p class="dialog-text">' + (reject ? 'Rejecting ' : 'Selecting ') + '<b>' + name + '</b> is a final decision. The candidate is notified, and your reason is saved in the audit trail. Candidates never see the reason.</p>' +
            '<div class="bd-reason"><label for="bd-reason">Reason (required)</label>' +
            '<textarea id="bd-reason" rows="4" placeholder="Why is this the right decision?"></textarea>' +
            '<div class="error-text bd-error" id="bd-error" role="alert"></div></div>' +
            '<div class="dialog-actions"><button class="btn btn-secondary" type="button" data-cancel>Cancel</button>' +
            '<button class="btn' + (reject ? ' btn-danger' : '') + '" type="button" data-confirm>' + (reject ? 'Reject candidate' : 'Select candidate') + '</button></div>';

        document.body.appendChild(dialog);

        const reason = dialog.querySelector('#bd-reason');
        const error = dialog.querySelector('#bd-error');
        const confirm = dialog.querySelector('[data-confirm]');

        function close()
        {
            if (typeof reducedMotion === 'function' && reducedMotion())
            {
                dialog.close();
                return;
            }

            dialog.classList.add('closing');
            setTimeout(function () { dialog.close(); }, BD_CLOSE_MS);
        }

        dialog.querySelector('[data-cancel]').addEventListener('click', close);

        dialog.addEventListener('close', function ()
        {
            dialog.remove();
        });

        reason.addEventListener('input', function ()
        {
            error.textContent = '';
        });

        confirm.addEventListener('click', async function ()
        {
            const text = reason.value.trim();

            if (text.length < BD_REASON_MIN)
            {
                error.textContent = 'Give a reason of at least ' + BD_REASON_MIN + ' characters. Final decisions are audited, so the reason is required.';
                reason.focus();
                return;
            }

            Dash.setBusy(confirm, true);

            try
            {
                const result = await Api.post('/api/applications/' + encodeURIComponent(item.id) + '/decision', { decision: to, reason: text });

                Board.cfg.onMoved(result.application || result);
                showToast(reject ? 'Candidate rejected' : 'Candidate selected', 'success');
                close();
            }
            catch (failure)
            {
                error.textContent = failure.message;
                Dash.setBusy(confirm, false);
            }
        });

        dialog.showModal();
        reason.focus();
    },

    markTargets(item)
    {
        const allowed = item ? BD_FLOW[item.status] || [] : [];

        Board.el('board').querySelectorAll('.bd-col').forEach(function (column)
        {
            const status = column.getAttribute('data-status');

            column.classList.toggle('can-drop', Boolean(item) && allowed.indexOf(status) !== -1);
            column.classList.toggle('no-drop', Boolean(item) && allowed.indexOf(status) === -1 && status !== item.status);
            column.classList.remove('is-over');
        });
    },

    bind()
    {
        const box = Board.el('board');

        Board.el('view-table').addEventListener('click', function ()
        {
            Board.setView('table', true);
        });

        Board.el('view-board').addEventListener('click', function ()
        {
            Board.setView('board', true);
        });

        box.addEventListener('dragstart', function (event)
        {
            const card = event.target.closest ? event.target.closest('.bd-card') : null;

            if (!card)
            {
                return;
            }

            const item = Board.find(card.getAttribute('data-id'));

            if (!item)
            {
                return;
            }

            Board.drag = item;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(item.id));
            card.classList.add('is-dragging');
            Board.markTargets(item);
        });

        box.addEventListener('dragend', function ()
        {
            Board.drag = null;

            box.querySelectorAll('.is-dragging').forEach(function (card)
            {
                card.classList.remove('is-dragging');
            });

            Board.markTargets(null);
        });

        box.addEventListener('dragover', function (event)
        {
            const column = event.target.closest ? event.target.closest('.bd-col') : null;

            if (!column || !Board.drag)
            {
                return;
            }

            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';

            if (!column.classList.contains('is-over'))
            {
                box.querySelectorAll('.is-over').forEach(function (other)
                {
                    other.classList.remove('is-over');
                });

                column.classList.add('is-over');
            }
        });

        box.addEventListener('dragleave', function (event)
        {
            const column = event.target.closest ? event.target.closest('.bd-col') : null;

            if (column && !column.contains(event.relatedTarget))
            {
                column.classList.remove('is-over');
            }
        });

        box.addEventListener('drop', function (event)
        {
            const column = event.target.closest ? event.target.closest('.bd-col') : null;

            if (!column || !Board.drag)
            {
                return;
            }

            event.preventDefault();

            const id = Board.drag.id;
            const to = column.getAttribute('data-status');

            Board.drag = null;
            Board.markTargets(null);
            Board.attempt(id, to);
        });

        box.addEventListener('change', function (event)
        {
            const select = event.target.closest ? event.target.closest('.bd-move') : null;

            if (!select || !select.value)
            {
                return;
            }

            const card = select.closest('.bd-card');
            const to = select.value;

            select.value = '';
            Board.attempt(card.getAttribute('data-id'), to);
        });
    }
};
