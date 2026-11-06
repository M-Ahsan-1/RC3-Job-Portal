/* VEYRA – constellation background for the auth stage (login + register).
   Drop in js/constellation.js and include it AFTER the inline script on each page:
   <script src="js/constellation.js"></script>
*/
(function ()
{
    'use strict';

    const stage = document.getElementById('stage');

    if (!stage)
    {
        return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Put the canvas behind the stage content but above the stage background.
    stage.style.position = stage.style.position || 'relative';
    stage.style.isolation = 'isolate';

    const canvas = document.createElement('canvas');
    canvas.className = 'constellation';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;' +
        // keep it calmer behind the headline text on the left, full strength in the empty area
        '-webkit-mask-image:linear-gradient(to right,rgba(0,0,0,.3) 0%,#000 55%);' +
        'mask-image:linear-gradient(to right,rgba(0,0,0,.3) 0%,#000 55%);';
    stage.insertBefore(canvas, stage.firstChild);

    const ctx = canvas.getContext('2d');

    const LINK_DISTANCE = 140;     // px: max distance for a line between two stars
    const MOUSE_RADIUS = 170;      // px: how far the cursor reaches
    const DENSITY = 1 / 9500;      // stars per px²
    const MAX_STARS = 140;
    const LINK_RGB = '167, 160, 255';   // soft violet lines
    const STAR_COLORS = ['255,255,255', '200,196,255', '255,209,102'];  // white, lavender, accent yellow

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars = [];
    let rafId = 0;
    const mouse = { x: -9999, y: -9999, active: false };

    function makeStar()
    {
        const speed = 0.08 + Math.random() * 0.22;
        const angle = Math.random() * Math.PI * 2;
        const colorRoll = Math.random();

        return {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: 0.7 + Math.random() * 1.6,
            color: colorRoll > 0.92 ? STAR_COLORS[2] : (colorRoll > 0.6 ? STAR_COLORS[1] : STAR_COLORS[0]),
            phase: Math.random() * Math.PI * 2,
            twinkle: 0.6 + Math.random() * 1.4
        };
    }

    function resize()
    {
        const rect = stage.getBoundingClientRect();
        width = Math.max(1, Math.floor(rect.width));
        height = Math.max(1, Math.floor(rect.height));
        dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const target = Math.min(MAX_STARS, Math.round(width * height * DENSITY));

        while (stars.length < target)
        {
            stars.push(makeStar());
        }

        if (stars.length > target)
        {
            stars.length = target;
        }

        stars.forEach(function (s)
        {
            s.x = Math.min(s.x, width);
            s.y = Math.min(s.y, height);
        });

        if (reduceMotion)
        {
            draw(0);
        }
    }

    function step()
    {
        for (let i = 0; i < stars.length; i++)
        {
            const s = stars[i];

            s.x += s.vx;
            s.y += s.vy;

            if (s.x < -10) { s.x = width + 10; }
            else if (s.x > width + 10) { s.x = -10; }

            if (s.y < -10) { s.y = height + 10; }
            else if (s.y > height + 10) { s.y = -10; }

            // gentle pull toward the cursor so the constellation reacts to it
            if (mouse.active)
            {
                const dx = mouse.x - s.x;
                const dy = mouse.y - s.y;
                const d = Math.sqrt(dx * dx + dy * dy);

                if (d < MOUSE_RADIUS && d > 1)
                {
                    const pull = (1 - d / MOUSE_RADIUS) * 0.012;
                    s.x += dx * pull;
                    s.y += dy * pull;
                }
            }
        }
    }

    function draw(time)
    {
        ctx.clearRect(0, 0, width, height);

        // lines
        ctx.lineWidth = 1;

        for (let i = 0; i < stars.length; i++)
        {
            const a = stars[i];

            for (let j = i + 1; j < stars.length; j++)
            {
                const b = stars[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = dx * dx + dy * dy;

                if (dist < LINK_DISTANCE * LINK_DISTANCE)
                {
                    const alpha = (1 - Math.sqrt(dist) / LINK_DISTANCE) * 0.35;
                    ctx.strokeStyle = 'rgba(' + LINK_RGB + ',' + alpha.toFixed(3) + ')';
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }

            // lines from the cursor to nearby stars
            if (mouse.active)
            {
                const mx = a.x - mouse.x;
                const my = a.y - mouse.y;
                const md = Math.sqrt(mx * mx + my * my);

                if (md < MOUSE_RADIUS)
                {
                    const alpha = (1 - md / MOUSE_RADIUS) * 0.5;
                    ctx.strokeStyle = 'rgba(255,209,102,' + alpha.toFixed(3) + ')';
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }
            }
        }

        // stars
        for (let i = 0; i < stars.length; i++)
        {
            const s = stars[i];
            const tw = reduceMotion ? 0.8 : 0.55 + 0.45 * Math.sin(time * 0.001 * s.twinkle + s.phase);

            ctx.fillStyle = 'rgba(' + s.color + ',' + tw.toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();

            // soft glow on the bigger stars
            if (s.r > 1.7)
            {
                ctx.fillStyle = 'rgba(' + s.color + ',' + (tw * 0.12).toFixed(3) + ')';
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function loop(time)
    {
        step();
        draw(time);
        rafId = requestAnimationFrame(loop);
    }

    function start()
    {
        if (reduceMotion || rafId)
        {
            return;
        }

        rafId = requestAnimationFrame(loop);
    }

    function stop()
    {
        cancelAnimationFrame(rafId);
        rafId = 0;
    }

    stage.addEventListener('mousemove', function (event)
    {
        const rect = stage.getBoundingClientRect();
        mouse.x = event.clientX - rect.left;
        mouse.y = event.clientY - rect.top;
        mouse.active = true;
    });

    stage.addEventListener('mouseleave', function ()
    {
        mouse.active = false;
    });

    document.addEventListener('visibilitychange', function ()
    {
        if (document.hidden)
        {
            stop();
        }
        else
        {
            start();
        }
    });

    if (typeof ResizeObserver !== 'undefined')
    {
        new ResizeObserver(resize).observe(stage);
    }
    else
    {
        window.addEventListener('resize', resize);
    }

    resize();
    start();
})();
