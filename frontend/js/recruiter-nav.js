// Shared sidebar for the recruiter pages that come after A5.
function mountRecruiterShell(title, subtitle, activeHref)
{
    const user = guardPage('recruiter');

    if (!user)
    {
        return null;
    }

    Dash.mountShell(
    {
        user: user,
        logo: 'sparkles',
        title: title,
        subtitle: subtitle,
        search: true,
        items:
        [
            { label: 'Overview', href: 'recruiter.html', icon: 'layout-dashboard' },
            { label: 'Jobs', href: 'jobs.html', icon: 'briefcase' },
            { label: 'Interviews', href: 'interviews.html', icon: 'calendar-clock' },
            { label: 'Analytics', href: 'analytics.html', icon: 'bar-chart-3' },
            { label: 'Talent Search', href: 'search.html', icon: 'search' }
        ],
        onBell: function ()
        {
            showToast('You have no new notifications.', 'info');
        }
    });

    document.querySelectorAll('.d-nav a').forEach(function (link)
    {
        link.classList.toggle('on', link.getAttribute('href') === activeHref);
    });

    return user;
}
