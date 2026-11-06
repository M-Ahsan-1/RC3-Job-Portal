// Hero illustrations for the dashboards, drawn in code so they stay sharp and need no image files.
// Usage: <div class="hero-art" data-scene="recruiter" aria-hidden="true"></div>. Names: recruiter, candidate, jobs, create.
// Fixed colors on purpose: hero bands are Midnight Indigo in both themes.

const SC = { indigo: '#5146D8', soft: '#8F86FF', navy: '#171A45', screen: '#232870', lav: '#EAE7FF', gold: '#FFC83D', white: '#FFFFFF' };

function scResume(x, y, w, rot, highlight)
{
    const h = 100;
    const cx = x + w / 2;
    const cy = y + h / 2;

    return '<g transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')">' +
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="' + SC.white + '"/>' +
        '<circle cx="' + (x + 20) + '" cy="' + (y + 22) + '" r="9" fill="' + SC.lav + '"/>' +
        '<rect x="' + (x + 36) + '" y="' + (y + 15) + '" width="' + (w * 0.42) + '" height="6" rx="3" fill="' + SC.navy + '" opacity=".85"/>' +
        '<rect x="' + (x + 36) + '" y="' + (y + 26) + '" width="' + (w * 0.28) + '" height="5" rx="2.5" fill="#C9C5EA"/>' +
        '<rect x="' + (x + 14) + '" y="' + (y + 46) + '" width="' + (w - 28) + '" height="5" rx="2.5" fill="#E6E3F2"/>' +
        (highlight
            ? '<rect x="' + (x + 12) + '" y="' + (y + 58) + '" width="' + (w * 0.62) + '" height="14" rx="3" fill="' + SC.gold + '"/>' +
              '<rect x="' + (x + 17) + '" y="' + (y + 63) + '" width="' + (w * 0.5) + '" height="5" rx="2.5" fill="' + SC.navy + '" opacity=".8"/>'
            : '<rect x="' + (x + 14) + '" y="' + (y + 61) + '" width="' + (w * 0.6) + '" height="5" rx="2.5" fill="#E6E3F2"/>') +
        '<rect x="' + (x + 14) + '" y="' + (y + 80) + '" width="' + (w * 0.7) + '" height="5" rx="2.5" fill="#E6E3F2"/></g>';
}

function scBadge(cx, cy, r)
{
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + SC.gold + '"/>' +
        '<path d="M' + (cx - r * 0.42) + ' ' + cy + 'l' + (r * 0.3) + ' ' + (r * 0.3) + ' ' + (r * 0.56) + ' ' + (-r * 0.62) + '" fill="none" stroke="' + SC.navy + '" stroke-width="' + (r * 0.2) + '" stroke-linecap="round" stroke-linejoin="round"/>';
}

function scLens(cx, cy, r)
{
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + SC.gold + '" fill-opacity=".14" stroke="' + SC.gold + '" stroke-width="6"/>' +
        '<path d="M' + (cx + r * 0.72) + ' ' + (cy + r * 0.72) + 'l' + (r * 0.8) + ' ' + (r * 0.8) + '" stroke="' + SC.gold + '" stroke-width="9" stroke-linecap="round"/>';
}

function scLaptop(x, y, w, h, inner)
{
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="' + SC.screen + '" stroke="' + SC.soft + '" stroke-width="2"/>' +
        inner +
        '<path d="M' + (x - 16) + ' ' + (y + h + 6) + 'h' + (w + 32) + 'l-8 10h-' + (w + 16) + 'z" fill="' + SC.soft + '"/>';
}

function scBriefcase(x, y, w)
{
    const h = w * 0.7;

    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + SC.indigo + '" stroke="' + SC.soft + '" stroke-width="2"/>' +
        '<path d="M' + (x + w * 0.35) + ' ' + y + 'v-6a4 4 0 014-4h' + (w * 0.3 - 8) + 'a4 4 0 014 4v6" fill="none" stroke="' + SC.soft + '" stroke-width="3"/>' +
        '<rect x="' + (x + w / 2 - 6) + '" y="' + (y + h / 2 - 5) + '" width="12" height="10" rx="2" fill="' + SC.gold + '"/>';
}

function scBars(x, y)
{
    const heights = [34, 52, 28, 64, 46];
    let out = '';

    heights.forEach(function (bar, index)
    {
        out += '<rect x="' + (x + index * 26) + '" y="' + (y + 74 - bar) + '" width="16" height="' + bar + '" rx="4" fill="' + (index === 3 ? SC.gold : SC.soft) + '"/>';
    });

    return out + '<rect x="' + x + '" y="' + (y + 84) + '" width="118" height="5" rx="2.5" fill="#3A3F96"/>';
}

function scBlobs()
{
    return '<circle cx="290" cy="60" r="78" fill="' + SC.indigo + '" opacity=".4"/>' +
        '<circle cx="84" cy="190" r="46" fill="' + SC.gold + '" opacity=".1"/>' +
        '<circle cx="340" cy="190" r="6" fill="' + SC.gold + '"/><circle cx="24" cy="48" r="4" fill="' + SC.soft + '"/><circle cx="206" cy="16" r="5" fill="' + SC.gold + '" opacity=".8"/>';
}

const SCENE_BODIES =
{
    recruiter: function ()
    {
        return scBlobs() +
            scLaptop(24, 70, 190, 118, scBars(48, 86)) +
            scResume(214, 14, 124, 8, false) +
            scResume(224, 76, 124, -5, true) +
            scBadge(338, 88, 15) + scLens(176, 62, 24);
    },

    candidate: function ()
    {
        return scBlobs() +
            scResume(126, 36, 150, -6, true) +
            scBriefcase(46, 128, 90) +
            scBadge(282, 56, 17) +
            '<path d="M292 150l54-26-18 52-14-18-16 10z" fill="' + SC.gold + '"/><path d="M314 158l14-34" stroke="' + SC.navy + '" stroke-width="2" opacity=".5"/>' +
            '<path d="M150 190c40 14 90 10 130-8" fill="none" stroke="' + SC.soft + '" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round"/>';
    },

    jobs: function ()
    {
        return scBlobs() +
            scResume(196, 6, 130, 9, false) +
            scResume(184, 58, 130, -4, false) +
            scResume(170, 104, 140, 3, true) +
            scBriefcase(54, 112, 96) +
            scBadge(320, 112, 15);
    },

    create: function ()
    {
        return scBlobs() +
            scResume(168, 20, 140, -5, true) +
            '<rect x="60" y="120" width="120" height="40" rx="20" fill="' + SC.screen + '" stroke="' + SC.gold + '" stroke-width="2"/>' +
            '<text x="120" y="145" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#FFE7A3">+ Add skill</text>' +
            '<rect x="200" y="140" width="96" height="32" rx="16" fill="' + SC.indigo + '"/>' +
            '<text x="248" y="161" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="#FFFFFF">Django</text>' +
            scBadge(312, 36, 16);
    }
};

function sceneSvg(name)
{
    const draw = SCENE_BODIES[name];

    if (!draw)
    {
        return '';
    }

    return '<svg viewBox="0 0 360 220" preserveAspectRatio="xMaxYMid meet" role="presentation" aria-hidden="true" focusable="false">' + draw() + '</svg>';
}

document.addEventListener('DOMContentLoaded', function ()
{
    const slots = document.querySelectorAll('[data-scene]');

    for (let i = 0; i < slots.length; i++)
    {
        slots[i].innerHTML = sceneSvg(slots[i].getAttribute('data-scene'));
    }
});
