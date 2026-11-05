const NAV_LINKS =
{
    recruiter: [
        { label: 'Dashboard', href: 'recruiter.html' },
        { label: 'Jobs', href: 'jobs.html' },
        { label: 'Interviews', href: 'interviews.html' },
        { label: 'Talent Search', href: 'search.html' }
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
    }

    return anchor;
}

function renderNav()
{
    const user = getUser();

    if (!user)
    {
        return;
    }

    const activePage = currentPageName();
    const links = NAV_LINKS[user.role] || [];

    const nav = document.createElement('nav');
    nav.className = 'navbar';

    const brand = document.createElement('a');
    brand.className = 'nav-brand';
    brand.href = dashboardFor(user.role);
    brand.innerHTML = 'RC3 <span>Job Portal</span>';
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
    logoutButton.textContent = 'Logout';
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