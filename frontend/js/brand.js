const FAVICON_SVG =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>" +
    "<rect width='64' height='64' rx='14' fill='#17233A'/>" +
    "<path d='M12 47L52 17' stroke='#FFE066' stroke-width='8' stroke-linecap='round'/>" +
    "<text x='32' y='47' text-anchor='middle' font-family='Arial,Helvetica,sans-serif' font-size='40' font-weight='700' fill='#FFFFFF'>S</text>" +
    "</svg>";

const LOADER_MIN_MS = 500;
const LOADER_MAX_MS = 10000;

let loaderShownAt = 0;
let loaderTimer = null;

// html instead of svg text on purpose, webfont widths shift and the highlighter would drift
function wordmark(options)
{
    const settings = options || {};
    let classes = 'wordmark';
    let style = '';

    if (settings.onInk)
    {
        classes += ' on-ink';
    }

    if (settings.sweep)
    {
        classes += ' sweep';
    }

    if (settings.size)
    {
        style = ' style="--wm-size: ' + settings.size + '"';
    }

    return '<span class="' + classes + '" role="img" aria-label="SORYNTH"' + style + '>SO<span class="wm-mark">RYN</span>TH</span>';
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
    loader.innerHTML = wordmark({ size: '2.25rem', sweep: true }) + '<span class="sr-only">Loading</span>';
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

    // keep it up long enough to see the sweep, otherwise it just flashes
    setTimeout(removeLoader, wait);
}

injectFavicon();
