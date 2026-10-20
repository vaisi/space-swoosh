// stars.js
// Changes: Moved from swooshtober/ so Swooshtober, About and How to play
// share one night-paper starfield. Bone specks, a few ice glints, and slow
// drift, in the same spirit as the game's DepthField. A still field when
// reduced motion is on.

const INK = '225, 217, 193';
const SIGNAL = '92, 200, 255';

const LAYERS = [
    { count: 58, sizeMin: 0.7, sizeMax: 1.15, driftX: 3.2, driftY: 4.6, twinkleMin: 0.35, twinkleMax: 0.85 },
    { count: 36, sizeMin: 1.0, sizeMax: 1.5, driftX: -5.4, driftY: 7.1, twinkleMin: 0.4, twinkleMax: 1.05 },
    { count: 18, sizeMin: 1.4, sizeMax: 2.2, driftX: 7.8, driftY: 10.2, twinkleMin: 0.45, twinkleMax: 1.2 },
];

function mulberry32(seed) {
    let a = seed | 0;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function wrap(value, max) {
    if (max <= 0) return 0;
    const mod = value % max;
    return mod < 0 ? mod + max : mod;
}

function seedStars(rand) {
    const stars = [];
    for (let layer = 0; layer < LAYERS.length; layer += 1) {
        const spec = LAYERS[layer];
        for (let i = 0; i < spec.count; i += 1) {
            stars.push({
                nx: rand(),
                ny: rand(),
                layer,
                size: spec.sizeMin + rand() * (spec.sizeMax - spec.sizeMin),
                phase: rand() * Math.PI * 2,
                twinkleHz: spec.twinkleMin + rand() * (spec.twinkleMax - spec.twinkleMin),
                signal: rand() < 0.07,
                flare: layer === LAYERS.length - 1 && rand() < 0.35,
            });
        }
    }
    return stars;
}

function drawFlare(ctx, x, y, radius) {
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
        const angle = (i * Math.PI) / 4 - Math.PI / 2;
        const r = i % 2 === 0 ? radius : radius * 0.32;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {() => void}
 */
export function mountStars(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

    const stars = seedStars(mulberry32(0x5e1d1e1d));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let running = false;

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.floor(window.innerWidth * dpr));
        const h = Math.max(1, Math.floor(window.innerHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
    }

    function draw(now) {
        resize();
        const w = canvas.width;
        const h = canvas.height;
        const t = now * 0.001;
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < stars.length; i += 1) {
            const star = stars[i];
            const spec = LAYERS[star.layer];
            const twinkle = 0.5 + 0.5 * Math.sin(t * star.twinkleHz * Math.PI * 2 + star.phase);
            const alpha = 0.18 + 0.7 * twinkle;
            const x = wrap(star.nx * w + (reduce ? 0 : t * spec.driftX), w);
            const y = wrap(star.ny * h + (reduce ? 0 : t * spec.driftY), h);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgba(${star.signal ? SIGNAL : INK}, 1)`;
            if (star.flare && twinkle > 0.82) drawFlare(ctx, x, y, star.size * 2.4);
            else ctx.fillRect(x, y, Math.max(1, star.size), Math.max(1, star.size));
        }
        ctx.globalAlpha = 1;
    }

    function frame(now) {
        if (!running) return;
        draw(now);
        raf = requestAnimationFrame(frame);
    }

    if (reduce) draw(0);
    else {
        running = true;
        raf = requestAnimationFrame(frame);
    }

    const onResize = () => draw(reduce ? 0 : performance.now());
    window.addEventListener('resize', onResize);

    return () => {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
    };
}
