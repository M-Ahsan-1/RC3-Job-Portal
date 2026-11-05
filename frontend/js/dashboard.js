const Dash =
{
    STATUS_TONE:
    {
        'Submitted': 'neutral',
        'Parsed': 'neutral',
        'AI Assessment Available': 'info',
        'Recruiter Review': 'warn',
        'Shortlisted': 'ok',
        'Interview': 'info',
        'Selected': 'ok',
        'Rejected': 'bad'
    },

    PIPELINE: ['Submitted', 'Parsed', 'AI Assessment Available', 'Recruiter Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected'],

    RECRUITER_NAV: [
        { label: 'Overview', href: 'recruiter.html', icon: 'layout-dashboard' },
        { label: 'Jobs', href: 'jobs.html', icon: 'briefcase' },
        { label: 'Interviews', href: 'interviews.html', icon: 'calendar-clock' },
        { label: 'Analytics', href: 'analytics.html', icon: 'bar-chart-3' },
        { label: 'Talent Search', href: 'search.html', icon: 'search' }
    ],

    CANDIDATE_NAV: [
        { label: 'Overview', href: 'candidate.html', icon: 'layout-dashboard' },
        { label: 'My Applications', href: 'my-applications.html', icon: 'file-text' },
        { label: 'My Profile', href: 'profile.html', icon: 'user' }
    ],

    esc(value)
    {
        const box = document.createElement('div');
        box.textContent = value === null || value === undefined ? '' : String(value);
        return box.innerHTML;
    },

    initials(name)
    {
        return String(name || '?').trim().split(/\s+/).slice(0, 2).map(function (part)
        {
            return part.charAt(0);
        }).join('').toUpperCase();
    },

    formatDate(iso)
    {
        const date = new Date(iso);

        if (isNaN(date.getTime()))
        {
            return '';
        }

        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    timeAgo(iso)
    {
        const date = new Date(iso);

        if (isNaN(date.getTime()))
        {
            return '';
        }

        const days = Math.floor((Date.now() - date.getTime()) / 86400000);

        if (days < 1)
        {
            return 'Today';
        }

        if (days < 7)
        {
            return days + (days === 1 ? ' day ago' : ' days ago');
        }

        return Dash.formatDate(iso);
    },

    icons()
    {
        if (window.lucide)
        {
            window.lucide.createIcons();
        }
    },

    skeletons(count)
    {
        return new Array(count + 1).join('<div class="d-skel" aria-hidden="true"></div>');
    },

    empty(icon, message, actionHtml)
    {
        return '<div class="d-empty"><i data-lucide="' + icon + '"></i><p>' + Dash.esc(message) + '</p>' + (actionHtml || '') + '</div>';
    },

    setBell(count)
    {
        const dot = document.getElementById('bell-dot');

        if (!dot)
        {
            return;
        }

        dot.textContent = count;
        dot.classList.toggle('hidden', !count);
    },

    params()
    {
        return new URLSearchParams(window.location.search);
    },

    param(name)
    {
        return Dash.params().get(name) || '';
    },

    intParam(name, fallback)
    {
        const value = Number(Dash.param(name));
        return Number.isFinite(value) && value > 0 ? value : fallback;
    },

    dateTime(iso)
    {
        const date = new Date(iso);

        if (isNaN(date.getTime()))
        {
            return '';
        }

        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
            ', ' +
            date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    },

    scoreTier(value)
    {
        const score = Number(value) || 0;

        if (score >= 75)
        {
            return 'high';
        }

        if (score >= 50)
        {
            return 'mid';
        }

        return 'low';
    },

    scoreTone(value)
    {
        const score = Number(value) || 0;

        if (score >= 75)
        {
            return 'ok';
        }

        if (score >= 50)
        {
            return 'warn';
        }

        return 'bad';
    },

    statusTone(status)
    {
        return Dash.STATUS_TONE[status] || 'neutral';
    },

    badge(text, tone)
    {
        return '<span class="d-badge ' + (tone || 'neutral') + '">' + Dash.esc(text) + '</span>';
    },

    scoreBar(label, value)
    {
        const score = Math.max(0, Math.min(100, Number(value) || 0));

        return '<div class="d-score"><div class="d-score-head"><span>' + Dash.esc(label) + '</span><b>' + score + '</b></div>' +
            '<div class="d-score-track"><i class="d-score-fill ' + Dash.scoreTier(score) + '" style="width:' + score + '%"></i></div></div>';
    },

    callout(icon, title, bodyHtml, tone)
    {
        return '<div class="d-callout ' + (tone || '') + '"><i data-lucide="' + icon + '"></i><div>' +
            (title ? '<b>' + Dash.esc(title) + '</b>' : '') + (bodyHtml || '') + '</div></div>';
    },

    setBusy(button, busy)
    {
        if (!button)
        {
            return;
        }

        button.disabled = !!busy;
        button.classList.toggle('loading', !!busy);
    },

    failInto(container, message, retry)
    {
        if (!container)
        {
            return;
        }

        container.innerHTML = Dash.empty('triangle-alert', message || 'Something went wrong. Please try again.',
            retry ? '<button class="btn btn-sm" type="button" data-retry>Try again</button>' : '');

        const button = container.querySelector('[data-retry]');

        if (button)
        {
            button.addEventListener('click', retry);
        }

        Dash.icons();
    },

    activeHref(config)
    {
        if (config.active)
        {
            return config.active;
        }

        const here = window.location.pathname.split('/').pop() || 'index.html';
        const items = config.items || [];

        for (let i = 0; i < items.length; i++)
        {
            const href = items[i].href;

            if (href.charAt(0) === '#')
            {
                continue;
            }

            if (href.split('?')[0] === here)
            {
                return href;
            }
        }

        return items.length ? items[0].href : null;
    },

    mountShell(config)
    {
        const user = config.user;
        const active = Dash.activeHref(config);
        const links = config.items.map(function (item)
        {
            const on = item.href === active;
            return '<a href="' + item.href + '"' + (on ? ' class="on" aria-current="page"' : '') + '><i data-lucide="' + item.icon + '"></i>' + item.label + '</a>';
        }).join('');

        const search = config.search ? '<a class="d-search" href="search.html" aria-label="Search talent"><i data-lucide="search"></i>Search talent</a>' : '';
        const today = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' });

        const shell = document.createElement('div');
        shell.className = 'd-shell';
        shell.innerHTML =
            '<aside class="d-sidebar" id="sidebar" aria-label="Main navigation">' +
                '<div class="d-brand"><span class="d-logo"><i data-lucide="' + config.logo + '"></i></span>RC3 Job Portal</div>' +
                '<nav class="d-nav">' + links + '</nav>' +
                '<div class="d-user"><span class="d-avatar">' + Dash.esc(Dash.initials(user.name)) + '</span>' +
                    '<div class="who">' + Dash.esc(user.name) + '<span>' + Dash.esc(user.role) + '</span></div>' +
                    '<button class="d-icon-btn" id="logout-btn" type="button" aria-label="Log out" title="Log out"><i data-lucide="log-out"></i></button></div>' +
            '</aside>' +
            '<div class="d-overlay" id="overlay"></div>' +
            '<div class="d-main">' +
                '<header class="d-topbar">' +
                    '<button class="d-icon-btn" id="menu-btn" type="button" aria-label="Open menu" aria-expanded="false"><i data-lucide="menu"></i></button>' +
                    '<div><h1>' + Dash.esc(config.title) + '</h1><p>' + Dash.esc(config.subtitle) + '</p></div>' +
                    '<div class="d-spacer"></div>' + search +
                    '<button class="d-icon-btn" id="bell-btn" type="button" aria-label="Notifications"><i data-lucide="bell"></i><span class="dot hidden" id="bell-dot"></span></button>' +
                    '<span class="d-date">' + today + '</span>' +
                    '<span class="d-avatar" aria-hidden="true">' + Dash.esc(Dash.initials(user.name)) + '</span>' +
                '</header>' +
            '</div>';

        const content = document.getElementById('content');
        shell.querySelector('.d-main').appendChild(content);
        document.body.prepend(shell);

        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const menuButton = document.getElementById('menu-btn');

        function setMenu(open)
        {
            sidebar.classList.toggle('open', open);
            overlay.classList.toggle('open', open);
            menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        menuButton.addEventListener('click', function ()
        {
            setMenu(!sidebar.classList.contains('open'));
        });

        overlay.addEventListener('click', function ()
        {
            setMenu(false);
        });

        sidebar.addEventListener('click', function (event)
        {
            if (event.target.closest('a'))
            {
                setMenu(false);
            }
        });

        document.addEventListener('keydown', function (event)
        {
            if (event.key === 'Escape')
            {
                setMenu(false);
            }
        });

        document.getElementById('logout-btn').addEventListener('click', logout);
        document.getElementById('bell-btn').addEventListener('click', config.onBell);
        Dash.icons();
    }
};