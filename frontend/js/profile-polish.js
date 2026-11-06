(function ()
{
    const SECTIONS =
    [
        { id: 'pp-about', label: 'About you', done: function () { return Boolean(draft.phone.trim() && draft.headline.trim()); } },
        { id: 'pp-skills', label: 'Skills', done: function () { return draft.skills.length > 0; } },
        { id: 'pp-education', label: 'Education', done: function () { return hasRows('education'); } },
        { id: 'pp-experience', label: 'Experience', done: function () { return hasRows('experience'); } },
        { id: 'pp-projects', label: 'Projects', done: function () { return hasRows('projects'); } }
    ];
    const form = document.getElementById('profile-form');
    const panels = form.querySelectorAll(':scope > section');
    const hero = document.createElement('section');
    const nav = document.createElement('nav');
    const bar = document.createElement('div');
    let builtFor = null;
    let timer = null;

    function hasRows(name)
    {
        return draft[name].some(function (row) { return isComplete(name, row); });
    }

    function initials(name)
    {
        return String(name || '?').trim().split(/\s+/).slice(0, 2).map(function (word) { return word.charAt(0).toUpperCase(); }).join('') || '?';
    }

    function countUp(node, to)
    {
        if (CandidateKit.reducedMotion() || to === 0)
        {
            node.textContent = to;
            return;
        }

        const start = performance.now();

        function tick(now)
        {
            const t = Math.min(1, (now - start) / 700);
            node.textContent = Math.round(to * (1 - Math.pow(1 - t, 3)));

            if (t < 1)
            {
                requestAnimationFrame(tick);
            }
        }

        requestAnimationFrame(tick);
    }

    function counts()
    {
        const flagged = draft.skills.filter(function (skill) { return skill.verified !== true; }).length;

        return [
            { key: 'skills', label: 'Skills', value: draft.skills.length },
            { key: 'flagged', label: 'Need a check', value: flagged },
            { key: 'experience', label: 'Roles', value: draft.experience.length },
            { key: 'projects', label: 'Projects', value: draft.projects.length }
        ];
    }

    function buildHero()
    {
        const resume = savedProfile.resumeFileName ? 'Read from ' + savedProfile.resumeFileName : 'No resume read yet';

        hero.innerHTML = '<span class="pp-avatar" aria-hidden="true">' + Dash.esc(initials(savedProfile.name)) + '</span>' +
            '<div><h2>' + Dash.esc(savedProfile.name || 'Your profile') + '</h2><p class="pp-headline" data-pp="headline"></p></div>' +
            '<ul class="pp-meta"><li><i data-lucide="mail"></i>' + Dash.esc(savedProfile.email || '') + '</li>' +
            '<li><i data-lucide="phone"></i><span data-pp="phone"></span></li>' +
            '<li><i data-lucide="file-text"></i>' + Dash.esc(resume) + '</li></ul>' +
            '<div class="pp-stats">' + counts().map(function (item)
            {
                return '<div class="pp-stat" data-pp-stat="' + item.key + '"><b>0</b><span>' + item.label + '</span></div>';
            }).join('') + '</div>';

        counts().forEach(function (item)
        {
            countUp(hero.querySelector('[data-pp-stat="' + item.key + '"] b'), item.value);
        });

        builtFor = savedProfile;
        Dash.icons();
    }

    function updateHero()
    {
        hero.querySelector('[data-pp="headline"]').textContent = draft.headline.trim() || 'Add a headline that says what you do';
        hero.querySelector('[data-pp="phone"]').textContent = draft.phone.trim() || 'No phone added';

        counts().forEach(function (item)
        {
            const tile = hero.querySelector('[data-pp-stat="' + item.key + '"]');
            const number = tile.querySelector('b');

            if (number.textContent !== String(item.value) && !tile.hasAttribute('data-busy'))
            {
                number.textContent = item.value;
            }

            tile.classList.toggle('is-alert', item.key === 'flagged' && item.value > 0);
        });
    }

    function updateNav()
    {
        SECTIONS.forEach(function (section)
        {
            const button = nav.querySelector('[data-target="' + section.id + '"]');
            const done = section.done();

            if (button.getAttribute('data-done') !== String(done))
            {
                button.setAttribute('data-done', String(done));
                button.innerHTML = (done ? '<i data-lucide="check"></i>' : '') + section.label;
                Dash.icons();
            }
        });
    }

    function updateBar()
    {
        bar.hidden = !isDirty();
    }

    function refresh()
    {
        if (!draft || !savedProfile)
        {
            return;
        }

        if (builtFor !== savedProfile)
        {
            buildHero();
        }

        updateHero();
        updateNav();
        updateBar();
    }

    function init()
    {
        hero.className = 'pp-hero';
        hero.setAttribute('aria-label', 'Profile summary');
        nav.className = 'pp-nav';
        nav.setAttribute('aria-label', 'Profile sections');
        bar.className = 'pp-savebar';
        bar.hidden = true;
        bar.setAttribute('role', 'status');
        bar.innerHTML = '<span><i data-lucide="pencil-line"></i>You have unsaved changes</span>' +
            '<div><button type="button" class="btn btn-secondary btn-sm" data-pp-discard>Discard</button>' +
            '<button type="button" class="btn btn-sm" data-pp-save>Save corrections</button></div>';

        SECTIONS.forEach(function (section, index)
        {
            panels[index + 1].id = section.id;
        });

        nav.innerHTML = SECTIONS.map(function (section)
        {
            return '<button type="button" class="cd-fchip" data-target="' + section.id + '" data-done="false" aria-pressed="false">' + section.label + '</button>';
        }).join('');

        form.insertBefore(nav, form.firstChild);
        form.insertBefore(hero, form.firstChild);
        form.appendChild(bar);

        nav.addEventListener('click', function (event)
        {
            const button = event.target.closest('[data-target]');

            if (button)
            {
                document.getElementById(button.getAttribute('data-target')).scrollIntoView({ behavior: CandidateKit.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
            }
        });

        bar.querySelector('[data-pp-save]').addEventListener('click', function ()
        {
            form.requestSubmit();
        });

        bar.querySelector('[data-pp-discard]').addEventListener('click', function ()
        {
            document.getElementById('cancel-btn').click();
            document.getElementById('cancel-confirm').scrollIntoView({ behavior: CandidateKit.reducedMotion() ? 'auto' : 'smooth', block: 'center' });
        });

        if (window.IntersectionObserver)
        {
            const spy = new IntersectionObserver(function (entries)
            {
                entries.forEach(function (entry)
                {
                    if (entry.isIntersecting)
                    {
                        nav.querySelectorAll('[data-target]').forEach(function (button)
                        {
                            button.setAttribute('aria-pressed', String(button.getAttribute('data-target') === entry.target.id));
                        });
                    }
                });
            }, { rootMargin: '-20% 0px -65% 0px' });

            SECTIONS.forEach(function (section)
            {
                spy.observe(document.getElementById(section.id));
            });

            const savePanel = panels[panels.length - 1];
            new IntersectionObserver(function (entries)
            {
                bar.style.visibility = entries[0].isIntersecting ? 'hidden' : '';
            }).observe(savePanel);
        }

        const original = window.renderStrength;

        window.renderStrength = function ()
        {
            original();
            refresh();
        };

        form.addEventListener('change', function ()
        {
            clearTimeout(timer);
            timer = setTimeout(refresh, 60);
        });

        Dash.icons();
        refresh();
    }

    init();
}());
