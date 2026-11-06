// polish.js
// small helpers shared by the jobs, job form and applicants pages

const Polish = (function ()
{
    function reduced()
    {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // counts a number up from 0 so stats feel alive, skips it if the user wants less motion
    function countUp(node, target)
    {
        const end = Number(target);

        if (!node || !Number.isFinite(end) || reduced())
        {
            if (node) { node.textContent = target; }
            return;
        }

        const start = performance.now();
        const duration = 700;

        function tick(now)
        {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            node.textContent = Math.round(end * eased);

            if (t < 1) { requestAnimationFrame(tick); }
        }

        requestAnimationFrame(tick);
    }

    function initials(name)
    {
        const parts = String(name || '?').trim().split(/\s+/);
        return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    }

    return { countUp: countUp, initials: initials };
})();
