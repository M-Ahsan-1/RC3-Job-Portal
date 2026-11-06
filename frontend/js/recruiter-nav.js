// Shared sidebar for every recruiter page after the dashboard.
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
        title: title,
        subtitle: subtitle,
        items: Dash.RECRUITER_NAV,
        active: activeHref,
        onBell: function ()
        {
            showToast('You have no new notifications.', 'info');
        }
    });

    return user;
}