const AUTH_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCENE_REPLAY_GAP_MS = 3600;

let sceneLastPlay = 0;
let sceneCountTimer = null;

/* the annotated resume. Everything is drawn in svg, fixed colors since the stage is dark in both themes */

function buildScene()
{
    const lines = [[136, 280], [152, 232], [206, 250], [222, 196], [284, 262], [300, 214], [362, 244], [378, 150]];

    const phrases = [
        { text: 'Built REST APIs in Django', baseline: 190, width: 176, box: 186, delay: '0.2s' },
        { text: 'Deployed with Docker', baseline: 268, width: 140, box: 150, delay: '0.9s' },
        { text: 'Designed PostgreSQL schemas', baseline: 346, width: 186, box: 196, delay: '1.6s' }
    ];

    const chips = [
        { label: 'Django', width: 112, centerY: 150, thread: '0.7s', pop: '0.9s' },
        { label: 'Docker', width: 112, centerY: 232, thread: '1.4s', pop: '1.6s' },
        { label: 'PostgreSQL', width: 140, centerY: 314, thread: '2.1s', pop: '2.3s' }
    ];

    let svg = '<svg viewBox="0 0 600 440" role="presentation" focusable="false">';

    svg += '<rect x="24" y="24" width="340" height="392" rx="10" fill="#FAF9F6"/>';
    svg += '<rect x="52" y="54" width="130" height="12" rx="6" fill="#171A45" opacity="0.85"/>';
    svg += '<rect x="52" y="76" width="200" height="7" rx="3.5" fill="#D9D6EE"/>';
    svg += '<rect x="52" y="112" width="70" height="8" rx="4" fill="#A8A5C7"/>';

    lines.forEach(function (line)
    {
        svg += '<rect x="52" y="' + line[0] + '" width="' + line[1] + '" height="7" rx="3.5" fill="#E6E3F2"/>';
    });

    phrases.forEach(function (phrase)
    {
        svg += '<rect class="sc-hl" style="--d:' + phrase.delay + '" x="48" y="' + (phrase.baseline - 16) + '" width="' + phrase.box + '" height="22" rx="3" fill="#FFD9C2"/>';
        svg += '<text class="sc-text" x="52" y="' + phrase.baseline + '" textLength="' + phrase.width + '" lengthAdjust="spacingAndGlyphs">' + phrase.text + '</text>';
    });

    chips.forEach(function (chip, index)
    {
        const phrase = phrases[index];
        const startX = 48 + phrase.box + 4;
        const startY = phrase.baseline - 5;

        svg += '<path class="sc-thread" style="--d:' + chip.thread + '" pathLength="1" d="M' + startX + ' ' + startY +
            ' C' + (startX + 62) + ' ' + startY + ' 360 ' + chip.centerY + ' 420 ' + chip.centerY + '"/>';

        svg += '<g class="sc-chip" style="--d:' + chip.pop + '">' +
            '<rect x="420" y="' + (chip.centerY - 16) + '" width="' + chip.width + '" height="32" rx="16" fill="#0F2F3A" stroke="#2DD4BF" stroke-width="1.5"/>' +
            '<text class="sc-chip-text" x="' + (420 + chip.width / 2) + '" y="' + (chip.centerY + 5) + '">' + chip.label + '</text></g>';
    });

    // magnifier over the resume and a floating tag, both drawn so the scene needs no image files
    svg += '<g class="sc-chip" style="--d:0.4s"><circle cx="322" cy="112" r="30" fill="#FFC83D" fill-opacity="0.16" stroke="#FFC83D" stroke-width="5"/>' +
        '<path d="M343 134l22 22" stroke="#FFC83D" stroke-width="7" stroke-linecap="round"/></g>';

    svg += '<g class="sc-chip" style="--d:2.6s">' +
        '<rect x="420" y="62" width="156" height="32" rx="16" fill="#2A2160" stroke="#FFC83D" stroke-width="1.5"/>' +
        '<circle cx="438" cy="78" r="8" fill="#FFC83D"/>' +
        '<path d="M434.5 78l2.6 2.6 4.6-5.4" fill="none" stroke="#171A45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<text class="sc-chip-text sc-gold" x="510" y="83">Verified skills</text></g>';

    svg += '<circle cx="490" cy="385" r="30" fill="none" stroke="#2B2F66" stroke-width="6"/>';
    svg += '<circle class="sc-ring-fill" style="--d:2.3s" cx="490" cy="385" r="30" fill="none" stroke="#2DD4BF" stroke-width="6" stroke-linecap="round" pathLength="100" transform="rotate(-90 490 385)"/>';
    svg += '<text class="sc-ring-num" x="490" y="392">86</text>';
    svg += '<text class="sc-ring-label" x="490" y="434">Example</text>';

    return svg + '</svg>';
}

function playScene(offsetSeconds)
{
    const scene = document.getElementById('scene');

    if (!scene || reducedMotion())
    {
        return;
    }

    const number = scene.querySelector('.sc-ring-num');
    const offset = offsetSeconds || 0;

    scene.style.setProperty('--scene-offset', offset + 's');
    scene.classList.remove('play');

    // forcing a reflow, otherwise the animation never restarts
    void scene.offsetWidth;

    scene.classList.add('play');
    sceneLastPlay = Date.now();

    clearTimeout(sceneCountTimer);
    number.textContent = '0';

    sceneCountTimer = setTimeout(function ()
    {
        countUp(number, 86, 900);
    }, (offset + 2.3) * 1000);
}

function authStagePoints()
{
    const points = [
        'Every score links to the resume line behind it',
        'Gaps are flagged, never hidden',
        'AI explains the evidence. You make the decision.'
    ];

    let html = '<ul class="stage-points">';

    points.forEach(function (text)
    {
        html += '<li><span class="sp-tick" aria-hidden="true">' + (typeof icon === 'function' ? icon('check', 14) : '') + '</span>' + text + '</li>';
    });

    return html + '</ul>';
}

function mountAuthStage(line)
{
    const stage = document.getElementById('stage');

    stage.innerHTML =
        '<div class="stage-top">' + brand({ onDark: true, size: '1.6rem', className: 'wordmark' }) + '</div>' +
        '<div class="stage-copy">' +
            '<p class="stage-tagline">See the evidence. Hire with confidence.</p>' +
            '<p class="stage-line" id="stage-line"></p>' +
            authStagePoints() +
        '</div>' +
        '<div class="scene-wrap" aria-hidden="true"><img class="scene-art" src="assets/illustrations/register-scene.png" alt="" width="1354" height="1161" decoding="async"></div>';

    document.getElementById('stage-line').textContent = line;
}

function authStageLine(text)
{
    const element = document.getElementById('stage-line');

    if (!element || element.textContent === text)
    {
        return;
    }

    element.classList.add('swap');

    setTimeout(function ()
    {
        element.textContent = text;
        element.classList.remove('swap');
    }, 160);
}

/* form helpers */

function authSetFieldError(input, message)
{
    const box = document.getElementById(input.id + '-error');

    if (box)
    {
        box.textContent = message;
    }

    input.classList.toggle('invalid', Boolean(message));

    if (message)
    {
        input.setAttribute('aria-invalid', 'true');
    }
    else
    {
        input.removeAttribute('aria-invalid');
    }
}

// check() returns an error message or an empty string. The returned function validates on demand.
function authBindField(input, check)
{
    function validate()
    {
        const message = check();
        authSetFieldError(input, message);
        return message === '';
    }

    input.addEventListener('blur', validate);

    input.addEventListener('input', function ()
    {
        if (input.classList.contains('invalid'))
        {
            validate();
        }
    });

    return validate;
}

function authShowFormError(message, link)
{
    const box = document.getElementById('form-error');

    box.textContent = message;

    if (link)
    {
        const anchor = document.createElement('a');
        anchor.href = link.href;
        anchor.textContent = link.label;
        box.appendChild(document.createTextNode(' '));
        box.appendChild(anchor);
    }

    box.classList.remove('hidden');
}

function authHideFormError()
{
    document.getElementById('form-error').classList.add('hidden');
}

function authBindPasswordToggles()
{
    const toggles = document.querySelectorAll('.pw-toggle');

    for (let i = 0; i < toggles.length; i++)
    {
        toggles[i].addEventListener('click', function (event)
        {
            const button = event.currentTarget;
            const input = button.parentNode.querySelector('input');
            const showing = input.type === 'text';

            input.type = showing ? 'password' : 'text';
            button.textContent = showing ? 'Show' : 'Hide';
            button.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
            button.setAttribute('aria-pressed', showing ? 'false' : 'true');
        });
    }
}

function authRedirect(url, wait)
{
    setTimeout(function ()
    {
        showPageLoader();

        setTimeout(function ()
        {
            window.location.href = url;
        }, 350);
    }, wait || 0);
}

// Back button restores this page from the browser cache with the loader and the busy button still on
window.addEventListener('pageshow', function (event)
{
    if (!event.persisted)
    {
        return;
    }

    hidePageLoader();

    const button = document.getElementById('submit-btn');

    if (button)
    {
        setLoading(button, false);
    }
});