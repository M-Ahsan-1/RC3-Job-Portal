const SHELL_CSS = 'css/shell.css';
const APPLICANT_URL = 'applicant-detail.html?id=';
const THEME_KEY = 'theme';
const SIDEBAR_KEY = 'sidebar-collapsed';
const NAV_PREV_KEY = 'nav-prev';
const MOBILE_MENU_WIDTH = 860;
const PALETTE_CACHE_MS = 60000;
const PALETTE_DEBOUNCE_MS = 250;
const PALETTE_JOB_LIMIT = 5;
const PALETTE_APPLICANT_LIMIT = 6;
const SHORTCUT_WINDOW_MS = 1000;

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
        { label: 'Dashboard', href: 'recruiter.html', icon: 'layout-dashboard' },
        { label: 'Jobs', href: 'jobs.html', icon: 'briefcase' },
        { label: 'Talent search', href: 'search.html', icon: 'search' },
        { label: 'Interviews', href: 'interviews.html', icon: 'calendar-clock' },
        { label: 'Analytics', href: 'analytics.html', icon: 'bar-chart-3' }
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

    kit(name, size)
    {
        return typeof icon === 'function' ? icon(name, size) : '';
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

    readSetting(key)
    {
        try
        {
            return localStorage.getItem(key);
        }
        catch (error)
        {
            return null;
        }
    },

    writeSetting(key, value)
    {
        try
        {
            localStorage.setItem(key, value);
        }
        catch (error)
        {
            // Storage can be blocked in private browsing, so the setting then lasts for this page only.
        }
    },

    isMac()
    {
        return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
    },

    modalOpen()
    {
        return Boolean(document.querySelector('dialog[open]')) || Object.keys(openDrawers).length > 0;
    },

    storedTheme()
    {
        const value = Dash.readSetting(THEME_KEY);
        return value === 'light' || value === 'dark' ? value : null;
    },

    currentTheme()
    {
        const stored = Dash.storedTheme();

        if (stored)
        {
            return stored;
        }

        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },

    applyStoredTheme()
    {
        const stored = Dash.storedTheme();

        if (stored)
        {
            document.documentElement.setAttribute('data-theme', stored);
        }
    },

    setTheme(mode)
    {
        document.documentElement.setAttribute('data-theme', mode);
        Dash.writeSetting(THEME_KEY, mode);
        Dash.syncThemeButton();
    },

    toggleTheme()
    {
        Dash.setTheme(Dash.currentTheme() === 'dark' ? 'light' : 'dark');
    },

    syncThemeButton()
    {
        const button = document.getElementById('theme-btn');

        if (!button)
        {
            return;
        }

        const dark = Dash.currentTheme() === 'dark';
        const label = dark ? 'Switch to light mode' : 'Switch to dark mode';

        button.classList.toggle('is-dark', dark);
        button.setAttribute('aria-pressed', dark ? 'true' : 'false');
        button.setAttribute('aria-label', label);
        button.title = label;
    },

    loadShellStyles()
    {
        if (document.getElementById('shell-css'))
        {
            return;
        }

        const link = document.createElement('link');
        link.id = 'shell-css';
        link.rel = 'stylesheet';
        link.href = SHELL_CSS;
        document.head.appendChild(link);
    },

    placeNavIndicator(indicator, link)
    {
        if (!indicator)
        {
            return;
        }

        if (!link)
        {
            indicator.style.opacity = '0';
            return;
        }

        indicator.style.opacity = '1';
        indicator.style.height = link.offsetHeight + 'px';
        indicator.style.transform = 'translateY(' + link.offsetTop + 'px)';
    },

    syncNavIndicator()
    {
        const nav = document.querySelector('.d-nav');

        if (!nav)
        {
            return;
        }

        Dash.placeNavIndicator(nav.querySelector('.d-nav-ind'), nav.querySelector('a.on'));
    },

    initNavIndicator(nav)
    {
        const indicator = nav.querySelector('.d-nav-ind');
        const links = Array.prototype.slice.call(nav.querySelectorAll('a'));
        const current = nav.querySelector('a.on');
        const currentHref = current ? current.getAttribute('href') : null;
        const previousHref = sessionStorage.getItem(NAV_PREV_KEY);
        let from = null;

        if (previousHref && currentHref && previousHref !== currentHref)
        {
            from = links.filter(function (link)
            {
                return link.getAttribute('href') === previousHref;
            })[0] || null;
        }

        if (currentHref)
        {
            sessionStorage.setItem(NAV_PREV_KEY, currentHref);
        }

        indicator.classList.add('no-anim');
        Dash.placeNavIndicator(indicator, from || current);
        void indicator.offsetWidth;

        function settle()
        {
            indicator.classList.remove('no-anim');
            Dash.syncNavIndicator();
        }

        if (from && !reducedMotion())
        {
            // the page loader is still fading, so the slide starts a moment after load to be seen
            if (document.readyState === 'complete')
            {
                setTimeout(settle, 120);
            }
            else
            {
                window.addEventListener('load', function ()
                {
                    setTimeout(settle, 450);
                });
            }
        }
        else
        {
            requestAnimationFrame(function ()
            {
                requestAnimationFrame(settle);
            });
        }

        new MutationObserver(Dash.syncNavIndicator).observe(nav, { attributes: true, attributeFilter: ['class'], subtree: true });
        window.addEventListener('resize', Dash.syncNavIndicator);
        window.addEventListener('load', Dash.syncNavIndicator);

        if (document.fonts && document.fonts.ready)
        {
            document.fonts.ready.then(Dash.syncNavIndicator);
        }
    },

    mountShell(config)
    {
        const user = config.user;
        const active = Dash.activeHref(config);
        const recruiter = user.role === 'recruiter';
        const home = dashboardFor(user.role);

        Dash.loadShellStyles();

        const links = config.items.map(function (item)
        {
            const on = item.href === active;
            return '<a href="' + item.href + '"' + (on ? ' class="on" aria-current="page"' : '') + '><i data-lucide="' + item.icon + '"></i><span class="lbl">' + Dash.esc(item.label) + '</span></a>';
        }).join('');

        const search = recruiter
            ? '<button class="d-search" id="palette-btn" type="button" aria-haspopup="dialog" aria-label="Search and commands">' + Dash.kit('search', 16) +
                '<span class="d-search-text">Search or jump to</span><kbd class="d-kbd" id="palette-kbd">Ctrl K</kbd></button>'
            : '';

        const mark = typeof brand === 'function' ? brand({ onDark: true, size: '1.3rem', className: 'wordmark' }) : 'VEYRA';

        const shell = document.createElement('div');
        shell.className = 'd-shell';
        shell.innerHTML =
            '<a class="skip-link" href="#content">Skip to content</a>' +
            '<aside class="d-sidebar" id="sidebar" aria-label="Sidebar">' +
                '<div class="d-side-head">' +
                    '<a class="d-brand" href="' + home + '">' + mark + '<span class="d-mono" aria-hidden="true">' + (typeof brandMark === 'function' ? brandMark({ size: '24px' }) : 'V') + '</span></a>' +
                    '<button class="d-icon-btn d-collapse" id="collapse-btn" type="button" aria-label="Collapse sidebar" aria-expanded="true"><i data-lucide="panel-left"></i></button>' +
                '</div>' +
                '<nav class="d-nav" aria-label="Main"><span class="d-nav-ind" aria-hidden="true"></span>' + links + '</nav>' +
                '<div class="d-user"><span class="d-avatar" aria-hidden="true">' + Dash.esc(Dash.initials(user.name)) + '</span>' +
                    '<div class="who">' + Dash.esc(user.name) + '<span>' + Dash.esc(user.role) + '</span></div>' +
                    '<button class="d-icon-btn" id="logout-btn" type="button" aria-label="Log out" title="Log out"><i data-lucide="log-out"></i></button></div>' +
            '</aside>' +
            '<div class="d-overlay" id="overlay"></div>' +
            '<div class="d-main">' +
                '<header class="d-topbar">' +
                    '<button class="d-icon-btn" id="menu-btn" type="button" aria-label="Open menu" aria-expanded="false"><i data-lucide="menu"></i></button>' +
                    '<div class="d-titles"><h1>' + Dash.esc(config.title) + '</h1><p>' + Dash.esc(config.subtitle) + '</p></div>' +
                    '<div class="d-spacer"></div>' + search +
                    '<button class="d-icon-btn" id="theme-btn" type="button" aria-pressed="false"><span class="ico-moon"><i data-lucide="moon"></i></span><span class="ico-sun"><i data-lucide="sun"></i></span></button>' +
                    '<button class="d-icon-btn" id="bell-btn" type="button" aria-label="Notifications"><i data-lucide="bell"></i><span class="dot hidden" id="bell-dot"></span></button>' +
                    '<div class="d-whoami"><span class="d-avatar" aria-hidden="true">' + Dash.esc(Dash.initials(user.name)) + '</span>' +
                        '<span class="d-who-text"><b>' + Dash.esc(user.name) + '</b><small>' + Dash.esc(user.role) + '</small></span></div>' +
                '</header>' +
            '</div>';

        const content = document.getElementById('content');
        content.setAttribute('tabindex', '-1');
        shell.querySelector('.d-main').appendChild(content);
        document.body.prepend(shell);

        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const menuButton = document.getElementById('menu-btn');
        const collapseButton = document.getElementById('collapse-btn');
        const navLinks = shell.querySelectorAll('.d-nav a');
        let releaseMenu = null;

        function setMenu(open)
        {
            sidebar.classList.toggle('open', open);
            overlay.classList.toggle('open', open);
            menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');

            if (open && !releaseMenu)
            {
                releaseMenu = trapFocus(sidebar, function ()
                {
                    setMenu(false);
                });
            }
            else if (!open && releaseMenu)
            {
                const release = releaseMenu;
                releaseMenu = null;
                release();
            }
        }

        function setCollapsed(collapsed, remember)
        {
            shell.classList.toggle('collapsed', collapsed);
            collapseButton.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            collapseButton.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
            collapseButton.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';

            for (let i = 0; i < navLinks.length; i++)
            {
                if (collapsed)
                {
                    navLinks[i].title = navLinks[i].textContent;
                }
                else
                {
                    navLinks[i].removeAttribute('title');
                }
            }

            if (remember)
            {
                Dash.writeSetting(SIDEBAR_KEY, collapsed ? '1' : '0');
            }

            setTimeout(Dash.syncNavIndicator, 230);
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

        window.addEventListener('resize', function ()
        {
            if (window.innerWidth > MOBILE_MENU_WIDTH && sidebar.classList.contains('open'))
            {
                setMenu(false);
            }
        });

        collapseButton.addEventListener('click', function ()
        {
            setCollapsed(!shell.classList.contains('collapsed'), true);
        });

        setCollapsed(Dash.readSetting(SIDEBAR_KEY) === '1', false);

        document.getElementById('theme-btn').addEventListener('click', Dash.toggleTheme);
        Dash.syncThemeButton();

        document.getElementById('logout-btn').addEventListener('click', logout);

        if (typeof config.onBell === 'function')
        {
            document.getElementById('bell-btn').addEventListener('click', config.onBell);
        }

        Dash.icons();
        Dash.initNavIndicator(shell.querySelector('.d-nav'));

        if (recruiter)
        {
            document.getElementById('palette-kbd').textContent = Dash.isMac() ? '\u2318 K' : 'Ctrl K';
            document.getElementById('palette-btn').addEventListener('click', CommandPalette.open);
            CommandPalette.init();
            ShellKeys.init();
        }
    }
};

/* command palette: Ctrl+K or Cmd+K, searches jobs and applicants and runs actions */

const CommandPalette =
{
    ready: false,
    root: null,
    panel: null,
    input: null,
    list: null,
    status: null,
    release: null,
    entries: [],
    selectedId: null,
    selected: 0,
    jobs: [],
    applicants: [],
    loadedAt: 0,
    loading: false,
    loadFailed: false,
    skillRows: [],
    skillFor: '',
    skillTimer: null,
    skillToken: 0,

    init()
    {
        if (CommandPalette.ready)
        {
            return;
        }

        CommandPalette.ready = true;

        document.addEventListener('keydown', function (event)
        {
            const key = String(event.key || '').toLowerCase();

            if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || key !== 'k')
            {
                return;
            }

            if (CommandPalette.root)
            {
                event.preventDefault();
                CommandPalette.close();
                return;
            }

            if (Dash.modalOpen())
            {
                return;
            }

            event.preventDefault();
            CommandPalette.open();
        });
    },

    go(href)
    {
        CommandPalette.close();
        window.location.href = href;
    },

    actions()
    {
        const mod = Dash.isMac() ? 'Cmd' : 'Ctrl';

        return [
            { id: 'action:post-job', label: 'Post a job', icon: 'plus', run: function () { CommandPalette.go('job-form.html'); } },
            { id: 'action:talent', label: 'Open talent search', icon: 'search', keys: 'G then S', run: function () { CommandPalette.go('search.html'); } },
            { id: 'action:interviews', label: 'Go to interviews', icon: 'calendar-clock', run: function () { CommandPalette.go('interviews.html'); } },
            { id: 'action:dashboard', label: 'Go to dashboard', icon: 'layout-dashboard', keys: 'G then D', run: function () { CommandPalette.go('recruiter.html'); } },
            { id: 'action:jobs', label: 'Go to jobs', icon: 'briefcase', keys: 'G then J', run: function () { CommandPalette.go('jobs.html'); } },
            {
                id: 'action:theme',
                label: 'Toggle dark mode',
                icon: 'moon',
                run: function ()
                {
                    CommandPalette.close();
                    Dash.toggleTheme();
                    showToast(Dash.currentTheme() === 'dark' ? 'Dark mode on' : 'Light mode on', 'info');
                }
            },
            {
                id: 'action:shortcuts',
                label: 'Show keyboard shortcuts',
                icon: 'keyboard',
                keys: '?',
                run: function ()
                {
                    CommandPalette.close();
                    ShellKeys.showHelp();
                }
            }
        ];
    },

    hit(text, query)
    {
        const value = String(text === null || text === undefined ? '' : text);
        const needle = String(query || '').trim().toLowerCase();
        const at = needle ? value.toLowerCase().indexOf(needle) : -1;

        if (at === -1)
        {
            return Dash.esc(value);
        }

        return Dash.esc(value.slice(0, at)) +
            '<b class="cp-hit">' + Dash.esc(value.slice(at, at + needle.length)) + '</b>' +
            Dash.esc(value.slice(at + needle.length));
    },

    query()
    {
        return CommandPalette.input ? String(CommandPalette.input.value || '').trim() : '';
    },

    buildEntries(query)
    {
        const needle = query.toLowerCase();
        const entries = [];
        const seen = {};
        let count = 0;

        CommandPalette.actions().forEach(function (action)
        {
            if (!needle || action.label.toLowerCase().indexOf(needle) !== -1)
            {
                action.group = 'Actions';
                action.meta = action.keys ? '<kbd class="d-kbd">' + Dash.esc(action.keys) + '</kbd>' : '';
                entries.push(action);
            }
        });

        CommandPalette.jobs.forEach(function (job)
        {
            const place = [job.department, job.location].filter(Boolean).join(', ');
            const haystack = [job.title, job.department, job.location].join(' ').toLowerCase();

            if (count >= PALETTE_JOB_LIMIT || (needle && haystack.indexOf(needle) === -1))
            {
                return;
            }

            count++;

            entries.push(
            {
                id: 'job:' + job.id,
                group: 'Jobs',
                label: job.title,
                sub: place,
                icon: 'briefcase',
                meta: statusPill(job.status),
                run: function () { CommandPalette.go('applicants.html?jobId=' + encodeURIComponent(job.id)); }
            });
        });

        count = 0;

        if (needle)
        {
            CommandPalette.applicants.forEach(function (row)
            {
                const haystack = [row.candidateName, row.jobTitle].join(' ').toLowerCase();

                if (count >= PALETTE_APPLICANT_LIMIT || haystack.indexOf(needle) === -1)
                {
                    return;
                }

                count++;
                seen[row.id] = true;

                entries.push(
                {
                    id: 'applicant:' + row.id,
                    group: 'Applicants',
                    label: row.candidateName,
                    sub: row.jobTitle,
                    icon: 'user',
                    meta: statusPill(row.status),
                    run: function () { CommandPalette.go(APPLICANT_URL + encodeURIComponent(row.id)); }
                });
            });
        }

        count = 0;

        if (needle.length >= 2 && CommandPalette.skillFor === query)
        {
            CommandPalette.skillRows.forEach(function (row)
            {
                if (count >= PALETTE_APPLICANT_LIMIT || seen[row.applicationId])
                {
                    return;
                }

                const skills = [];

                (row.excerpts || []).forEach(function (excerpt)
                {
                    if (skills.indexOf(excerpt.skill) === -1)
                    {
                        skills.push(excerpt.skill);
                    }
                });

                count++;

                entries.push(
                {
                    id: 'skill:' + row.applicationId,
                    group: 'Applicants with matching skills',
                    label: row.candidateName,
                    sub: skills.length ? 'Matches ' + skills.join(', ') : 'Matches your search',
                    icon: 'user-search',
                    meta: Dash.esc(row.jobTitle),
                    run: function () { CommandPalette.go(APPLICANT_URL + encodeURIComponent(row.applicationId)); }
                });
            });
        }

        return entries;
    },

    render()
    {
        const self = CommandPalette;

        if (!self.root)
        {
            return;
        }

        const query = self.query();
        const entries = self.buildEntries(query);
        let html = '';
        let group = '';
        let index = -1;

        for (let i = 0; i < entries.length; i++)
        {
            if (entries[i].id === self.selectedId)
            {
                index = i;
            }
        }

        self.entries = entries;
        self.selected = index === -1 ? 0 : index;

        entries.forEach(function (entry, position)
        {
            if (entry.group !== group)
            {
                group = entry.group;
                html += '<li class="cp-group" role="presentation">' + Dash.esc(group) + '</li>';
            }

            html += '<li class="cp-opt" role="option" id="cp-opt-' + position + '" data-index="' + position + '" aria-selected="false">' +
                '<span class="cp-ico" aria-hidden="true"><i data-lucide="' + entry.icon + '"></i></span>' +
                '<span class="cp-main"><span class="cp-label">' + self.hit(entry.label, query) + '</span>' +
                (entry.sub ? '<span class="cp-sub">' + Dash.esc(entry.sub) + '</span>' : '') + '</span>' +
                '<span class="cp-meta">' + (entry.meta || '') + '</span></li>';
        });

        if (self.loading)
        {
            html += '<li class="cp-note" role="presentation">Loading jobs and applicants</li>';
        }
        else if (self.loadFailed)
        {
            html += '<li class="cp-note" role="presentation">Jobs and applicants did not load. Actions still work. Close and reopen to try again.</li>';
        }

        if (!entries.length && !self.loading && !self.loadFailed)
        {
            html += '<li class="cp-note" role="presentation">Nothing matches \u201c' + Dash.esc(query) + '\u201d. Try a skill, a job title or a candidate name.</li>';
        }

        self.list.innerHTML = html;
        Dash.icons();
        self.mark();

        self.status.textContent = entries.length
            ? entries.length + (entries.length === 1 ? ' result' : ' results')
            : 'No results';
    },

    mark()
    {
        const self = CommandPalette;
        const options = self.list.querySelectorAll('.cp-opt');

        for (let i = 0; i < options.length; i++)
        {
            options[i].setAttribute('aria-selected', i === self.selected ? 'true' : 'false');
        }

        const current = options[self.selected];

        if (current)
        {
            self.input.setAttribute('aria-activedescendant', current.id);
            self.selectedId = self.entries[self.selected].id;
            current.scrollIntoView({ block: 'nearest' });
        }
        else
        {
            self.input.removeAttribute('aria-activedescendant');
            self.selectedId = null;
        }
    },

    move(step)
    {
        const self = CommandPalette;

        if (!self.entries.length)
        {
            return;
        }

        self.selected = (self.selected + step + self.entries.length) % self.entries.length;
        self.mark();
    },

    runSelected()
    {
        const entry = CommandPalette.entries[CommandPalette.selected];

        if (entry)
        {
            entry.run();
        }
    },

    load()
    {
        const self = CommandPalette;

        if (self.loading || Date.now() - self.loadedAt < PALETTE_CACHE_MS)
        {
            return;
        }

        self.loading = true;
        self.loadFailed = false;
        self.render();

        Api.get('/api/jobs').then(function (jobs)
        {
            self.jobs = jobs || [];

            return Promise.all(self.jobs.map(function (job)
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
        }).then(function (groups)
        {
            self.applicants = Array.prototype.concat.apply([], groups);
            self.loadedAt = Date.now();
        }).catch(function ()
        {
            self.loadFailed = true;
        }).then(function ()
        {
            self.loading = false;
            self.render();
        });
    },

    searchSkills(query)
    {
        const self = CommandPalette;
        const token = ++self.skillToken;

        Api.post('/api/talent/search', { query: query }).then(function (data)
        {
            if (token !== self.skillToken || !self.root)
            {
                return;
            }

            self.skillRows = (data && data.results) || [];
            self.skillFor = query;
            self.render();
        }, function ()
        {
            if (token === self.skillToken)
            {
                self.skillRows = [];
                self.skillFor = '';
            }
        });
    },

    onInput()
    {
        const self = CommandPalette;
        const query = self.query();

        clearTimeout(self.skillTimer);
        self.selectedId = null;
        self.render();

        if (query.length < 2)
        {
            self.skillToken++;
            self.skillRows = [];
            self.skillFor = '';
            return;
        }

        self.skillTimer = setTimeout(function ()
        {
            self.searchSkills(query);
        }, PALETTE_DEBOUNCE_MS);
    },

    open()
    {
        const self = CommandPalette;

        if (self.root)
        {
            return;
        }

        const root = document.createElement('div');

        root.className = 'cp-backdrop';
        root.innerHTML =
            '<div class="cp" role="dialog" aria-modal="true" aria-label="Command palette">' +
                '<div class="cp-field">' + Dash.kit('search', 18) +
                    '<input class="cp-input" id="cp-input" type="text" role="combobox" aria-expanded="true" aria-controls="cp-list" aria-autocomplete="list" ' +
                        'aria-label="Search jobs and applicants, or run an action" placeholder="Search jobs and applicants, or run an action" autocomplete="off" spellcheck="false">' +
                    '<button class="cp-close" type="button" aria-label="Close command palette">' + Dash.kit('close', 18) + '</button>' +
                '</div>' +
                '<ul class="cp-list" id="cp-list" role="listbox" aria-label="Results"></ul>' +
                '<div class="cp-foot" aria-hidden="true">' +
                    '<span><kbd class="d-kbd">\u2191</kbd><kbd class="d-kbd">\u2193</kbd> move</span>' +
                    '<span><kbd class="d-kbd">Enter</kbd> open</span>' +
                    '<span><kbd class="d-kbd">Esc</kbd> close</span>' +
                '</div>' +
                '<div class="sr-only" id="cp-status" role="status" aria-live="polite"></div>' +
            '</div>';

        document.body.appendChild(root);
        document.body.classList.add('no-scroll');

        self.root = root;
        self.panel = root.querySelector('.cp');
        self.input = root.querySelector('#cp-input');
        self.list = root.querySelector('#cp-list');
        self.status = root.querySelector('#cp-status');
        self.selectedId = null;
        self.selected = 0;

        root.addEventListener('mousedown', function (event)
        {
            if (event.target === root)
            {
                self.close();
            }
        });

        root.querySelector('.cp-close').addEventListener('click', self.close);
        self.input.addEventListener('input', self.onInput);

        self.input.addEventListener('keydown', function (event)
        {
            if (event.key === 'ArrowDown')
            {
                event.preventDefault();
                self.move(1);
            }
            else if (event.key === 'ArrowUp')
            {
                event.preventDefault();
                self.move(-1);
            }
            else if (event.key === 'Enter')
            {
                event.preventDefault();
                self.runSelected();
            }
        });

        self.list.addEventListener('mousemove', function (event)
        {
            const option = event.target.closest('.cp-opt');

            if (option && Number(option.dataset.index) !== self.selected)
            {
                self.selected = Number(option.dataset.index);
                self.mark();
            }
        });

        self.list.addEventListener('click', function (event)
        {
            const option = event.target.closest('.cp-opt');

            if (option)
            {
                self.selected = Number(option.dataset.index);
                self.runSelected();
            }
        });

        self.render();
        self.release = trapFocus(self.panel, self.close);
        self.load();
    },

    close()
    {
        const self = CommandPalette;

        if (!self.root)
        {
            return;
        }

        const root = self.root;
        const release = self.release;

        self.root = null;
        self.release = null;
        clearTimeout(self.skillTimer);
        self.skillToken++;

        function finish()
        {
            root.remove();

            if (Object.keys(openDrawers).length === 0)
            {
                document.body.classList.remove('no-scroll');
            }

            if (release)
            {
                release();
            }
        }

        if (reducedMotion())
        {
            finish();
            return;
        }

        root.classList.add('closing');
        setTimeout(finish, 120);
    }
};

/* keyboard shortcuts: g then d, j or s, and ? for the help dialog */

const ShellKeys =
{
    ready: false,
    pending: false,
    timer: null,
    chord: null,
    routes: { d: 'recruiter.html', j: 'jobs.html', s: 'search.html' },

    typing(target)
    {
        if (!target || !target.tagName)
        {
            return false;
        }

        return ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(target.tagName) !== -1 || target.isContentEditable;
    },

    start()
    {
        ShellKeys.pending = true;
        ShellKeys.chord.hidden = false;
        clearTimeout(ShellKeys.timer);
        ShellKeys.timer = setTimeout(ShellKeys.cancel, SHORTCUT_WINDOW_MS);
    },

    cancel()
    {
        ShellKeys.pending = false;
        ShellKeys.chord.hidden = true;
        clearTimeout(ShellKeys.timer);
    },

    init()
    {
        if (ShellKeys.ready)
        {
            return;
        }

        ShellKeys.ready = true;

        const chord = document.createElement('div');
        chord.className = 'd-chord';
        chord.hidden = true;
        chord.setAttribute('aria-hidden', 'true');
        chord.textContent = 'G, then D for dashboard, J for jobs, S for search';
        document.body.appendChild(chord);
        ShellKeys.chord = chord;

        document.addEventListener('keydown', function (event)
        {
            if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey)
            {
                return;
            }

            if (CommandPalette.root || Dash.modalOpen() || ShellKeys.typing(event.target))
            {
                return;
            }

            const key = String(event.key || '').toLowerCase();

            if (ShellKeys.pending)
            {
                ShellKeys.cancel();

                if (ShellKeys.routes[key])
                {
                    event.preventDefault();
                    window.location.href = ShellKeys.routes[key];
                }

                return;
            }

            if (key === 'g')
            {
                ShellKeys.start();
            }
            else if (event.key === '?')
            {
                event.preventDefault();
                ShellKeys.showHelp();
            }
        });
    },

    showHelp()
    {
        const mod = Dash.isMac() ? '\u2318' : 'Ctrl';
        const rows = [
            [mod + ' K', 'Open the command palette'],
            ['G then D', 'Go to dashboard'],
            ['G then J', 'Go to jobs'],
            ['G then S', 'Go to talent search'],
            ['?', 'Show this list'],
            ['Esc', 'Close the palette, drawers and dialogs']
        ];

        const dialog = document.createElement('dialog');

        dialog.className = 'dialog';
        dialog.setAttribute('aria-labelledby', 'kb-title');

        dialog.innerHTML =
            '<h2 id="kb-title">Keyboard shortcuts</h2>' +
            '<dl class="kb-list">' +
                rows.map(function (row)
                {
                    return '<div><dt><kbd class="d-kbd">' + Dash.esc(row[0]) + '</kbd></dt><dd>' + Dash.esc(row[1]) + '</dd></div>';
                }).join('') +
            '</dl>' +
            '<div class="dialog-actions"><button class="btn" type="button">Close</button></div>';

        dialog.querySelector('button').addEventListener('click', function ()
        {
            dialog.close();
        });

        dialog.addEventListener('click', function (event)
        {
            if (event.target === dialog)
            {
                dialog.close();
            }
        });

        dialog.addEventListener('close', function ()
        {
            dialog.remove();
        });

        document.body.appendChild(dialog);
        dialog.showModal();
    }
};

Dash.applyStoredTheme();
