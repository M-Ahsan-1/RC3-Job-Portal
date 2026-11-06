// VEYRA brand kit. The mark is a faceted V: an Electric Indigo arm and a Midnight Indigo arm that meet
// at the base, with a Golden Yellow evidence point in the notch. Colors come from --mark-a, --mark-b and
// --mark-dot (see css/style.css), so the mark recolors for dark surfaces.

const MARK_LEFT = '3,5 10.5,5 16,19 16,27';
const MARK_RIGHT = '29,5 21.5,5 16,19 16,27';

const FAVICON_SVG =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>" +
    "<rect width='64' height='64' rx='15' fill='#171A45'/>" +
    "<g transform='translate(5 8) scale(1.85)'>" +
    "<polygon points='" + MARK_LEFT + "' fill='#8F86FF'/>" +
    "<polygon points='" + MARK_RIGHT + "' fill='#FAF9F6'/>" +
    "<circle cx='16' cy='8.5' r='2.6' fill='#FFC83D'/>" +
    "</g></svg>";

const LOADER_MIN_MS = 500;
const LOADER_MAX_MS = 10000;

let loaderShownAt = 0;
let loaderTimer = null;

// shared mark geometry used by the logo, the sidebar and the loader
function markSvg(extraClass, style)
{
    return '<svg class="brand-mark' + (extraClass ? ' ' + extraClass : '') + '" viewBox="0 0 32 32" aria-hidden="true" focusable="false"' + (style ? ' style="' + style + '"' : '') + '>' +
        '<polygon class="bm-path l" points="' + MARK_LEFT + '"/>' +
        '<polygon class="bm-path r" points="' + MARK_RIGHT + '"/>' +
        '<circle class="bm-dot" cx="16" cy="8.5" r="2.3"/></svg>';
}

// the V mark on its own, for collapsed navigation, app icons and small headers
function brandMark(options)
{
    const settings = options || {};
    const style = (settings.onDark ? '--mark-a: #8F86FF; --mark-b: #FAF9F6;' : '') + (settings.size ? ' --mark-size: ' + settings.size + ';' : '');

    return markSvg('', style.trim());
}

// mark plus the VEYRA wordmark. options: onDark, size (CSS length for the wordmark), className
function brand(options)
{
    const settings = options || {};
    let classes = 'brand';
    let style = '';

    if (settings.onDark)
    {
        classes += ' on-dark';
    }

    if (settings.className)
    {
        classes += ' ' + settings.className;
    }

    if (settings.size)
    {
        style = ' style="--brand-size: ' + settings.size + '"';
    }

    return '<span class="' + classes + '" role="img" aria-label="VEYRA"' + style + '>' + markSvg('') + '<span class="brand-text" aria-hidden="true">VEYRA</span></span>';
}

// kept so older callers keep working. 'wordmark' stays as a hook class for sidebar CSS that targets it.
function wordmark(options)
{
    const settings = options || {};

    return brand({ onDark: settings.onInk, size: settings.size, className: 'wordmark' });
}

function injectFavicon()
{
    const href = 'data:image/svg+xml,' + encodeURIComponent(FAVICON_SVG);
    const existing = document.querySelectorAll('link[rel~="icon"]');

    for (let i = 0; i < existing.length; i++)
    {
        existing[i].remove();
    }

    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = href;
    document.head.appendChild(link);
}

function showPageLoader()
{
    if (document.getElementById('page-loader') || !document.body)
    {
        return;
    }

    const loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.className = 'page-loader';
    loader.setAttribute('role', 'status');
    loader.innerHTML = '<div class="brand-loader">' + markSvg('', '--mark-size: 64px') +
        '<span class="brand" aria-hidden="true" style="--brand-size: 1.5rem"><span class="brand-text">VEYRA</span></span></div>' +
        '<span class="sr-only">Loading</span>';
    document.body.appendChild(loader);

    loaderShownAt = Date.now();

    // never leave someone staring at a loader if a request hangs
    loaderTimer = setTimeout(removeLoader, LOADER_MAX_MS);
}

function removeLoader()
{
    const loader = document.getElementById('page-loader');

    clearTimeout(loaderTimer);

    if (!loader)
    {
        return;
    }

    loader.classList.add('done');

    setTimeout(function ()
    {
        loader.remove();
    }, 220);
}

function hidePageLoader()
{
    const shownFor = Date.now() - loaderShownAt;
    const wait = Math.max(0, LOADER_MIN_MS - shownFor);

    // keep it up long enough to see the mark draw, otherwise it just flashes
    setTimeout(removeLoader, wait);
}

injectFavicon();
