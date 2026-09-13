// DepthField.js
// Drifting depth sparkles painted after the flat paper fill.
// Changes:
// - Light Mode is flat paper only — the field paints on night paper (and the
//   L42 epilogue black hold). Cream no longer gets ink grit.
// - Created: wrapping far/mid/near specks with idle drift + in-run camera
//   parallax. Night paper is Twitter-like bone sparkles (rare ice glints,
//   a few tiny 4-point flares). Cheap / iOS LOD drops the near layer and
//   flares. ?kill=stars skips the field. Epilogue can force a quieter night
//   paint on #050505.

import { color } from '../brand/tokens.js';
import { isDarkTheme } from '../brand/theme.js';
import { isKilled } from '../core/perfFlags.js';

const TAU = Math.PI * 2;
const SEED = 0x5e1d1e1d;

// Bone / ice used when the epilogue forces night on a black hold
// (live ink is dark on cream, so we cannot read tokens there).
const NIGHT_INK_RGB = '225, 217, 193';
const NIGHT_SIGNAL_RGB = '92, 200, 255';

const LAYERS_FULL = [
    { count: 58, sizeMin: 0.7, sizeMax: 1.15, parallax: 0.07, driftX: 3.2, driftY: 4.6, twinkleMin: 0.35, twinkleMax: 0.85 },
    { count: 36, sizeMin: 1.0, sizeMax: 1.5, parallax: 0.16, driftX: -5.4, driftY: 7.1, twinkleMin: 0.4, twinkleMax: 1.05 },
    { count: 18, sizeMin: 1.4, sizeMax: 2.2, parallax: 0.30, driftX: 7.8, driftY: 10.2, twinkleMin: 0.45, twinkleMax: 1.2 },
];

const LAYERS_CHEAP = [
    { count: 32, sizeMin: 0.7, sizeMax: 1.15, parallax: 0.08, driftX: 3.0, driftY: 4.4, twinkleMin: 0.35, twinkleMax: 0.8 },
    { count: 22, sizeMin: 1.0, sizeMax: 1.45, parallax: 0.18, driftX: -5.0, driftY: 6.8, twinkleMin: 0.4, twinkleMax: 1.0 },
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
    value %= max;
    return value < 0 ? value + max : value;
}

function seedStars(layers, rand) {
    const stars = [];
    const last = layers.length - 1;
    for (let layer = 0; layer < layers.length; layer++) {
        const spec = layers[layer];
        for (let i = 0; i < spec.count; i++) {
            const near = layer === last && layers === LAYERS_FULL;
            stars.push({
                nx: rand(),
                ny: rand(),
                layer,
                size: spec.sizeMin + rand() * (spec.sizeMax - spec.sizeMin),
                phase: rand() * TAU,
                twinkleHz: spec.twinkleMin + rand() * (spec.twinkleMax - spec.twinkleMin),
                tint: rand() < 0.07 ? 'signal' : 'ink',
                hero: near && rand() < 0.55,
            });
        }
    }
    return stars;
}

function drawTinySpark(ctx, cx, cy, radius) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI / 4) - Math.PI / 2;
        const r = i % 2 === 0 ? radius : radius * 0.32;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

export class DepthField {
    constructor(game) {
        this.game = game;
        this.cheap = !!(game.cheapCanvas || game.iosDrawLod);
        this.layers = this.cheap ? LAYERS_CHEAP : LAYERS_FULL;
        this.stars = seedStars(this.layers, mulberry32(SEED));
    }

    resize() {
        // Positions are normalized; width/height are read from the game each paint.
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ forceNight?: boolean, quiet?: boolean }} [opts]
     */
    render(ctx, opts = {}) {
        const game = this.game;
        if (isKilled(game.perfFlags, 'stars')) return;

        const width = game.width;
        const height = game.height;
        if (!(width > 0) || !(height > 0)) return;

        const forceNight = opts.forceNight === true;
        if (!forceNight && !isDarkTheme()) return;

        const quiet = opts.quiet === true;
        const inWorld = game.appScreen === 'playing' || game.appScreen === 'gameover';
        const cam = inWorld && game.camera ? game.camera.totalDistance : 0;
        const now = performance.now() * 0.001;
        const quietMul = quiet ? 0.5 : 1;
        const allowFlares = !this.cheap && !quiet;
        const inkRgb = forceNight ? NIGHT_INK_RGB : color.inkRgb;
        const signalRgb = forceNight ? NIGHT_SIGNAL_RGB : color.signalRgb;

        ctx.save();

        this.paintGroup(ctx, {
            width,
            height,
            cam,
            now,
            quietMul,
            allowFlares: false,
            rgb: inkRgb,
            tint: 'ink',
        });

        this.paintGroup(ctx, {
            width,
            height,
            cam,
            now,
            quietMul,
            allowFlares: false,
            rgb: signalRgb,
            tint: 'signal',
        });

        if (allowFlares) {
            this.paintGroup(ctx, {
                width,
                height,
                cam,
                now,
                quietMul,
                allowFlares: true,
                rgb: inkRgb,
                tint: 'ink',
            });
        }

        ctx.restore();
    }

    paintGroup(ctx, {
        width,
        height,
        cam,
        now,
        quietMul,
        allowFlares,
        rgb,
        tint,
    }) {
        ctx.fillStyle = `rgba(${rgb}, 1)`;

        const stars = this.stars;
        const layers = this.layers;
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            const isSignal = star.tint === 'signal';
            if (allowFlares) {
                if (!star.hero) continue;
            } else if (tint === 'signal') {
                if (!isSignal) continue;
            } else if (isSignal) {
                continue;
            }

            const spec = layers[star.layer];
            const twinkle = 0.5 + 0.5 * Math.sin(now * star.twinkleHz * TAU + star.phase);
            if (allowFlares && twinkle < 0.88) continue;

            const alpha = (0.20 + 0.68 * twinkle) * quietMul;
            if (alpha < 0.02) continue;

            const x = wrap(star.nx * width + now * spec.driftX, width);
            const y = wrap(star.ny * height + now * spec.driftY + cam * spec.parallax, height);

            ctx.globalAlpha = alpha;
            if (allowFlares) {
                drawTinySpark(ctx, x, y, 2.2 + star.size * 0.35);
                continue;
            }

            const size = star.size < 1.3 ? 1 : 2;
            ctx.fillRect(Math.round(x), Math.round(y), size, size);
        }
    }
}
