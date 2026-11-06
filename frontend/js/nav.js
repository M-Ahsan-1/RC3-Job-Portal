const NAV_LINKS =
{
    recruiter: [
        { label: 'Dashboard', href: 'recruiter.html' },
        { label: 'Jobs', href: 'jobs.html' },
        { label: 'Interviews', href: 'interviews.html' },
        { label: 'Talent search', href: 'search.html' }
    ],
    candidate: [
        { label: 'Dashboard', href: 'candidate.html' }
    ]
};

function currentPageName()
{
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || 'index.html';
}

function buildNavLink(link, activePage)
{
    const anchor = document.createElement('a');
    anchor.href = link.href;
    anchor.textContent = link.label;

    if (link.href === activePage)
    {
        anchor.className = 'active';
        anchor.setAttribute('aria-current', 'page');
    }

    return anchor;
}

function renderNav()
{
    const user = getUser();

    if (!user || document.querySelector('.d-shell'))
    {
        return;
    }
    const activePage = currentPageName();
    const links = NAV_LINKS[user.role] || [];

    const nav = document.createElement('nav');
    nav.className = 'navbar';
    nav.setAttribute('aria-label', 'Main');

    const brand = document.createElement('a');
    brand.className = 'nav-brand';
    brand.href = dashboardFor(user.role);
    brand.innerHTML = typeof wordmark === 'function' ? wordmark() : 'VEYRA';
    nav.appendChild(brand);

    const linkBox = document.createElement('div');
    linkBox.className = 'nav-links';

    for (let i = 0; i < links.length; i++)
    {
        linkBox.appendChild(buildNavLink(links[i], activePage));
    }

    nav.appendChild(linkBox);

    const userBox = document.createElement('div');
    userBox.className = 'nav-user';

    const name = document.createElement('span');
    name.textContent = user.name + ' (' + user.role + ')';
    userBox.appendChild(name);

    const logoutButton = document.createElement('button');
    logoutButton.className = 'btn btn-secondary btn-sm';
    logoutButton.type = 'button';
    logoutButton.textContent = 'Log out';
    logoutButton.addEventListener('click', logout);
    userBox.appendChild(logoutButton);

    nav.appendChild(userBox);

    const existing = document.getElementById('navbar');

    if (existing)
    {
        existing.replaceWith(nav);
    }
    else
    {
        document.body.prepend(nav);
    }
}

document.addEventListener('DOMContentLoaded', renderNav);
