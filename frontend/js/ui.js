const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const PILL_LABELS =
{
    submitted: 'Submitted',
    parsed: 'Parsed',
    under_review: 'Under review',
    shortlisted: 'Shortlisted',
    interview: 'Interview',
    interview_scheduled: 'Interview',
    selected: 'Selected',
    rejected: 'Rejected',
    open: 'Open',
    closed: 'Closed',
    draft: 'Draft'
};

const openDrawers = {};

function reducedMotion()
{
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* focus trap, shared by drawers and (later) the command palette */

function trapFocus(container, onEscape)
{
    const previous = document.activeElement;

    function focusables()
    {
        return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(function (item)
        {
            return item.getClientRects().length > 0;
        });
    }

    function onKeyDown(event)
    {
        if (event.key === 'Escape')
        {
            event.stopPropagation();

            if (onEscape)
            {
                onEscape();
            }

            return;
        }

        if (event.key !== 'Tab')
        {
            return;
        }

        const items = focusables();

        if (items.length === 0)
        {
            event.preventDefault();
            container.focus();
            return;
        }

        const first = items[0];
        const last = items[items.length - 1];

        if (!container.contains(document.activeElement))
        {
            event.preventDefault();
            first.focus();
        }
        else if (event.shiftKey && document.activeElement === first)
        {
            event.preventDefault();
            last.focus();
        }
        else if (!event.shiftKey && document.activeElement === last)
        {
            event.preventDefault();
            first.focus();
        }
    }

    document.addEventListener('keydown', onKeyDown, true);

    const start = container.querySelector('[autofocus]') || focusables()[0];

    if (start)
    {
        start.focus();
    }
    else
    {
        container.setAttribute('tabindex', '-1');
        container.focus();
    }

    return function release()
    {
        document.removeEventListener('keydown', onKeyDown, true);

        if (previous && document.body.contains(previous))
        {
            previous.focus();
        }
    };
}

/* toast */

function getToastContainer()
{
    let box = document.querySelector('.toast-container');

    if (!box)
    {
        box = document.createElement('div');
        box.className = 'toast-container';
        box.setAttribute('role', 'region');
        box.setAttribute('aria-label', 'Notifications');
        box.setAttribute('aria-live', 'polite');
        document.body.appendChild(box);
    }

    return box;
}

function dismissToast(toast)
{
    if (!toast.parentNode)
    {
        return;
    }

    if (reducedMotion())
    {
        toast.remove();
        return;
    }

    toast.classList.add('leaving');

    setTimeout(function ()
    {
        toast.remove();
    }, 180);
}

function showToast(message, type)
{
    const kind = type || 'info';
    const iconNames = { success: 'check', error: 'warning', warning: 'warning', info: 'info' };
    const toast = document.createElement('div');
    const text = document.createElement('span');

    toast.className = 'toast ' + kind;
    toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    toast.innerHTML = icon(iconNames[kind] || 'info', 18);

    text.textContent = message;
    toast.appendChild(text);

    getToastContainer().appendChild(toast);

    let timer = setTimeout(function ()
    {
        dismissToast(toast);
    }, kind === 'error' ? 6500 : 4000);

    // hovering pauses the countdown, otherwise it vanishes mid read
    toast.addEventListener('mouseenter', function ()
    {
        clearTimeout(timer);
    });

    toast.addEventListener('mouseleave', function ()
    {
        timer = setTimeout(function ()
        {
            dismissToast(toast);
        }, 2000);
    });

    toast.addEventListener('click', function ()
    {
        clearTimeout(timer);
        dismissToast(toast);
    });

    return toast;
}

/* drawer */

function getDrawerBackdrop()
{
    let backdrop = document.querySelector('.drawer-backdrop');

    if (!backdrop)
    {
        backdrop = document.createElement('div');
        backdrop.className = 'drawer-backdrop';
        backdrop.addEventListener('click', function ()
        {
            Object.keys(openDrawers).forEach(closeDrawer);
        });
        document.body.appendChild(backdrop);
    }

    return backdrop;
}

function openDrawer(id)
{
    const drawer = document.getElementById(id);

    if (!drawer || openDrawers[id])
    {
        return;
    }

    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');

    getDrawerBackdrop().classList.add('open');
    drawer.classList.add('open');
    document.body.classList.add('no-scroll');

    openDrawers[id] = trapFocus(drawer, function ()
    {
        closeDrawer(id);
    });
}

function closeDrawer(id)
{
    const drawer = document.getElementById(id);
    const release = openDrawers[id];

    if (!drawer || !release)
    {
        return;
    }

    drawer.classList.remove('open');
    delete openDrawers[id];
    release();

    if (Object.keys(openDrawers).length === 0)
    {
        getDrawerBackdrop().classList.remove('open');
        document.body.classList.remove('no-scroll');
    }
}

/* confirm dialog. Resolves true or false, or the typed reason (null if cancelled) when reasonLabel is set */

function confirmDialog(message, options)
{
    const settings = options || {};
    const needsReason = Boolean(settings.reasonLabel);

    return new Promise(function (resolve)
    {
        const dialog = document.createElement('dialog');
        const title = document.createElement('h2');
        const text = document.createElement('p');
        const actions = document.createElement('div');
        const cancel = document.createElement('button');
        const confirm = document.createElement('button');
        const titleId = 'dialog-title-' + Date.now();
        let reasonField = null;
        let reasonError = null;
        let result = needsReason ? null : false;

        dialog.className = 'dialog';
        dialog.setAttribute('aria-labelledby', titleId);

        title.id = titleId;
        title.textContent = settings.title || 'Please confirm';
        dialog.appendChild(title);

        text.className = 'dialog-text';
        text.textContent = message;
        dialog.appendChild(text);

        if (needsReason)
        {
            const group = document.createElement('div');
            const label = document.createElement('label');
            const fieldId = titleId + '-reason';

            group.className = 'form-group';
            group.style.marginTop = '16px';
            group.style.marginBottom = '0';

            label.setAttribute('for', fieldId);
            label.textContent = settings.reasonLabel;

            reasonField = document.createElement('textarea');
            reasonField.id = fieldId;
            reasonField.rows = 3;

            reasonError = document.createElement('div');
            reasonError.className = 'error-text';

            group.appendChild(label);
            group.appendChild(reasonField);
            group.appendChild(reasonError);
            dialog.appendChild(group);
        }

        actions.className = 'dialog-actions';

        cancel.type = 'button';
        cancel.className = 'btn btn-secondary';
        cancel.textContent = settings.cancelLabel || 'Cancel';

        confirm.type = 'button';
        confirm.className = settings.danger ? 'btn btn-danger' : 'btn';
        confirm.textContent = settings.confirmLabel || 'Confirm';

        actions.appendChild(cancel);
        actions.appendChild(confirm);
        dialog.appendChild(actions);

        function finish(value)
        {
            result = value;

            if (reducedMotion())
            {
                dialog.close();
                return;
            }

            dialog.classList.add('closing');

            setTimeout(function ()
            {
                dialog.close();
            }, 140);
        }

        cancel.addEventListener('click', function ()
        {
            finish(needsReason ? null : false);
        });

        confirm.addEventListener('click', function ()
        {
            if (!needsReason)
            {
                finish(true);
                return;
            }

            const reason = reasonField.value.trim();

            if (!reason)
            {
                reasonField.classList.add('invalid');
                reasonError.textContent = 'Add a reason before you continue.';
                reasonField.focus();
                shake(dialog);
                return;
            }

            finish(reason);
        });

        // escape fires cancel first, so route it through finish to get the exit animation
        dialog.addEventListener('cancel', function (event)
        {
            event.preventDefault();
            finish(needsReason ? null : false);
        });

        // a click on the backdrop lands on the dialog element itself
        dialog.addEventListener('click', function (event)
        {
            if (event.target === dialog)
            {
                finish(needsReason ? null : false);
            }
        });

        dialog.addEventListener('close', function ()
        {
            dialog.remove();
            resolve(result);
        });

        document.body.appendChild(dialog);
        dialog.showModal();

        if (needsReason)
        {
            reasonField.focus();
        }
        else
        {
            confirm.focus();
        }
    });
}

/* loading, skeleton, empty, error */

function setLoading(button, isLoading)
{
    if (!button)
    {
        return;
    }

    button.classList.toggle('loading', isLoading);
    button.disabled = isLoading;
    button.setAttribute('aria-busy', isLoading ? 'true' : 'false');
}

function renderSkeleton(container, rows)
{
    const widths = ['100%', '82%', '64%'];
    const count = rows || 3;

    container.innerHTML = '';
    container.setAttribute('aria-busy', 'true');

    const label = document.createElement('span');
    label.className = 'sr-only';
    label.setAttribute('role', 'status');
    label.textContent = 'Loading';
    container.appendChild(label);

    for (let i = 0; i < count; i++)
    {
        const line = document.createElement('span');
        line.className = 'skeleton';
        line.style.width = widths[i % widths.length];
        container.appendChild(line);
    }
}

function renderEmpty(container, config)
{
    const settings = config || {};
    const box = document.createElement('div');

    box.className = 'empty-state';
    box.innerHTML = settings.illustration ? illustration(settings.illustration) : '';

    const title = document.createElement('h3');
    title.textContent = settings.title || 'Nothing here yet';
    box.appendChild(title);

    if (settings.text)
    {
        const text = document.createElement('p');
        text.textContent = settings.text;
        box.appendChild(text);
    }

    if (settings.actionLabel)
    {
        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'btn';
        action.textContent = settings.actionLabel;

        if (settings.onAction)
        {
            action.addEventListener('click', settings.onAction);
        }

        box.appendChild(action);
    }

    container.innerHTML = '';
    container.removeAttribute('aria-busy');
    container.appendChild(box);
}

function renderError(container, message, onRetry)
{
    const box = document.createElement('div');
    const title = document.createElement('h3');
    const text = document.createElement('p');

    box.className = 'error-state';
    box.setAttribute('role', 'alert');
    box.innerHTML = illustration('error');

    title.textContent = 'This didn\u2019t load';
    text.textContent = message || 'Check your connection and try again.';

    box.appendChild(title);
    box.appendChild(text);

    if (onRetry)
    {
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'btn btn-secondary';
        retry.textContent = 'Try again';
        retry.addEventListener('click', onRetry);
        box.appendChild(retry);
    }

    container.innerHTML = '';
    container.removeAttribute('aria-busy');
    container.appendChild(box);
}

/* small motion helpers */

function countUp(element, value, duration)
{
    const target = Number(value);

    if (!element)
    {
        return;
    }

    if (isNaN(target))
    {
        element.textContent = value;
        return;
    }

    const decimals = (String(value).split('.')[1] || '').length;
    const total = duration || 900;

    function format(number)
    {
        if (decimals)
        {
            return number.toFixed(decimals);
        }

        return Math.round(number).toLocaleString();
    }

    if (reducedMotion() || total <= 0)
    {
        element.textContent = format(target);
        return;
    }

    const start = performance.now();

    function frame(now)
    {
        const progress = Math.min((now - start) / total, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        element.textContent = format(target * eased);

        if (progress < 1)
        {
            requestAnimationFrame(frame);
        }
    }

    requestAnimationFrame(frame);
}

function shake(element)
{
    if (!element)
    {
        return;
    }

    element.classList.remove('shake');

    // reading offsetWidth forces a reflow so the animation can restart
    void element.offsetWidth;

    element.classList.add('shake');

    element.addEventListener('animationend', function done()
    {
        element.classList.remove('shake');
        element.removeEventListener('animationend', done);
    });
}

function removeChip(chip, onDone)
{
    function finish()
    {
        chip.remove();

        if (onDone)
        {
            onDone();
        }
    }

    if (reducedMotion())
    {
        finish();
        return;
    }

    chip.classList.add('removing');
    setTimeout(finish, 140);
}

function copyToClipboard(text, message)
{
    function succeed()
    {
        showToast(message || 'Copied to clipboard', 'success');
        return true;
    }

    function fail()
    {
        showToast('Couldn\u2019t copy. Select the text and press Ctrl+C.', 'error');
        return false;
    }

    function legacyCopy()
    {
        const area = document.createElement('textarea');
        let copied = false;

        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();

        try
        {
            copied = document.execCommand('copy');
        }
        catch (error)
        {
            copied = false;
        }

        area.remove();
        return copied ? succeed() : fail();
    }

    if (navigator.clipboard && window.isSecureContext)
    {
        return navigator.clipboard.writeText(text).then(succeed, legacyCopy);
    }

    return Promise.resolve(legacyCopy());
}

/* pipeline status pill, returns html */

function statusPill(status)
{
    const key = String(status || '').toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
    const pill = document.createElement('span');
    const dot = document.createElement('span');
    let label = PILL_LABELS[key];

    if (!label)
    {
        label = key.replace(/_/g, ' ');
        label = label.charAt(0).toUpperCase() + label.slice(1);
    }

    pill.className = 'pill pill-' + (key || 'neutral');
    dot.className = 'pill-dot';
    dot.setAttribute('aria-hidden', 'true');

    pill.appendChild(dot);
    pill.appendChild(document.createTextNode(label || 'Unknown'));

    return pill.outerHTML;
}
