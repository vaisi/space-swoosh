// skinDefs.js
// The ship roster. Every skin is visual only — physics and speed are identical,
// so picking one never changes how the ship plays.
// Changes:
// - Wall jelly (squish → extend → shake) applies to every hull via
//   `beginHullFrame`, not only Square. Hitbox stays undeformed.
// - Each skin declares `wallTrailMode` ('pile' | 'spring') so wall bounces shove
//   the wake in a per-vessel way (dense wakes pile; ribbons/lines spring).
// - Square hulls: no soft halo at all; hitbox is a 3×3 fill of the box.
//   Wall jelly is visual-only (hitbox stays the rest pose).
// - Square family (Stamp / Tick / Trace / Ring): same square hull, four wakes,
//   named so the trail is obvious. Removed the Mark cross hull.
// - Shard / Halo wakes are denser (every sample + midpoints; Halo soft-fills
//   young bubbles) so the path feels packed with arrows / rings.
// - Added Shard, Halo, Needle, Echo: unique hulls + wakes (crystal chevrons,
//   orbital core with blooming rings, thin lance + hairline, crescent + twin
//   lines) so the picker has more than tear/dart/circle variants.
// - Hull alphas multiply into the caller's `globalAlpha`, so a world fade (the
//   level-clear flyout) dims the hull along with everything else.
// - Ember now flies a hard-edged dart hull instead of sharing Flicker's tear.
//   The halo / breathing / bank / highlight treatment is shared by a
//   `makeHullRenderer(pathFn)` factory since only the outline differs.
// - Every skin declares a `hitbox`: circles in local hull units that trace its
//   silhouette, so collisions match what's drawn (see Spacecraft.hitCircles).
// - Created file: Focus (circle + dotted trail) plus three shaped ships that
//   differ in their wake: Flicker (ribbon), Ember (streaks), Wisp (thread +
//   drifting sparks).
// - Added two premium skins (Pulse, Quill): Signal-Blue wakes, same physics.
//   Each carries `productId` + `entitlementId` for RevenueCat; the four
//   originals stay free (no productId).
// - Product IDs renamed to com.orbi.spaceswoosh.skin.* (app id gg→com).
// - Shaped hulls rotate with `ship.bank` and lean/stretch into turns.
// - Replaced the old ~3-4 Hz hull strobe with two slow layered sines so the
//   light breathes instead of flickering.

import { color } from '../brand/tokens.js';
import {
    MAX_BANK,
    tearPath,
    dartPath,
    shardPath,
    needlePath,
    crescentPath,
    beginHullFrame,
    drawCircleHull,
} from './hulls.js';
import {
    drawDotTrail,
    drawRibbonTrail,
    drawStreakTrail,
    drawWispTrail,
    drawChevronTrail,
    drawRingTrail,
    drawHairlineTrail,
    drawTwinTrail,
    drawStampTrail,
    drawTickTrail,
} from './trails.js';

// Hitboxes are in local hull space (x right, y toward the tail, nose negative),
// in units of ship.radius. Each circle is inscribed in the drawn silhouette at
// the hull's *smallest* breathing scale, so none of them ever pokes outside the
// ink: the ship can't collide with something it visibly missed. Solved greedily
// for coverage rather than hand-tuned — the leftovers are the thin extremities,
// where a graze reading as a miss is the forgiving answer anyway.
const CIRCLE_HITBOX = [{ x: 0, y: 0, r: 1 }];

// Covers ~93% of the tear. Radii carry a 0.01 margin so rounding can't push a
// rim back outside the ink.
const TEAR_HITBOX = [
    { x: 0, y: -0.61, r: 0.1 },
    { x: 0, y: -0.35, r: 0.23 },
    { x: 0, y: 0.16, r: 0.53 },
    { x: -0.33, y: 0.28, r: 0.33 },
    { x: 0.32, y: 0.28, r: 0.34 },
];

// ~80% of the dart. Lower than the tear because its swept wings are thin
// triangles, and nothing sits in the middle of the tail — that's the notch.
const DART_HITBOX = [
    { x: 0, y: -0.71, r: 0.08 },
    { x: 0, y: -0.5, r: 0.16 },
    { x: 0, y: -0.17, r: 0.29 },
    { x: -0.27, y: 0.1, r: 0.16 },
    { x: 0.29, y: 0.13, r: 0.15 },
    { x: -0.43, y: 0.29, r: 0.09 },
    { x: 0.44, y: 0.29, r: 0.08 },
];

// Faceted diamond — nose / mid / tail facet, skip the thin wing tips.
const SHARD_HITBOX = [
    { x: 0, y: -0.72, r: 0.12 },
    { x: 0, y: -0.28, r: 0.28 },
    { x: 0, y: 0.12, r: 0.3 },
    { x: -0.22, y: 0.35, r: 0.14 },
    { x: 0.22, y: 0.35, r: 0.14 },
];

// Thin lance — stacked circles down the spine only.
const NEEDLE_HITBOX = [
    { x: 0, y: -0.85, r: 0.08 },
    { x: 0, y: -0.45, r: 0.12 },
    { x: 0, y: 0.0, r: 0.14 },
    { x: 0, y: 0.45, r: 0.11 },
    { x: 0, y: 0.78, r: 0.08 },
];

// Crescent arms + nose join; empty notch in the middle stays clear.
const CRESCENT_HITBOX = [
    { x: 0, y: -0.55, r: 0.18 },
    { x: -0.42, y: -0.05, r: 0.2 },
    { x: 0.42, y: -0.05, r: 0.2 },
    { x: -0.55, y: 0.35, r: 0.16 },
    { x: 0.55, y: 0.35, r: 0.16 },
];

// Halo's solid core only — the orbit ring and ticks are decoration.
const HALO_HITBOX = [{ x: 0, y: 0, r: 0.72 }];

// Square body — 3×3 inscribed circles filling the drawn box (half ≈ 0.78).
// Jelly squash is visual-only; these stay the rest pose.
const SQUARE_HITBOX = (() => {
    const circles = [];
    const step = 0.38;
    const cr = 0.26;
    for (let iy = -1; iy <= 1; iy++) {
        for (let ix = -1; ix <= 1; ix++) {
            circles.push({ x: ix * step, y: iy * step, r: cr });
        }
    }
    return circles;
})();

// Shaped hulls share everything but their outline: an ink halo standing in for
// glow, a slow breath, rotation into the bank and a softer inner highlight.
function makeHullRenderer(pathFn) {
    return function drawHull(ctx, ship, screenY, time = performance.now()) {
        const breath = 0.9 + 0.06 * Math.sin(time * 0.0056) + 0.04 * Math.sin(time * 0.0088);
        const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
        const r = ship.radius * 0.95 * scale;

        const bank = ship.bank ?? 0;
        const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
        const stretch = 1 + 0.2 * turn; // leaner nose the harder it banks

        const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.85);
        const baseAlpha = ctx.globalAlpha;
        // Hold breath while jellying so the bounce reads cleanly.
        ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

        ctx.beginPath();
        ctx.arc(0, r * 0.12, r * 1.35, 0, Math.PI * 2);
        ctx.fillStyle = color.ink12;
        ctx.fill();

        pathFn(ctx, 0, 0, r, stretch);
        ctx.fillStyle = color.ink;
        ctx.fill();

        ctx.globalAlpha = baseAlpha * (jelly ? 0.28 : breath * 0.35);
        pathFn(ctx, 0, r * 0.08, r * 0.42, stretch);
        ctx.fillStyle = color.ink55;
        ctx.fill();

        ctx.restore();
    };
}

const drawTearHull = makeHullRenderer(tearPath);
const drawDartHull = makeHullRenderer(dartPath);
const drawShardHull = makeHullRenderer(shardPath);
const drawNeedleHull = makeHullRenderer(needlePath);
const drawCrescentHull = makeHullRenderer(crescentPath);

/** Square hull: hard ink only (no soft halo). Jelly via shared beginHullFrame. */
function drawSquareHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.9 + 0.06 * Math.sin(time * 0.0056) + 0.04 * Math.sin(time * 0.0088);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.2 * turn;

    // Scale is applied by beginHullFrame; draw the rest-pose box in local units.
    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.82);
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    const half = r * 0.82;
    const halfY = half * stretch;
    ctx.beginPath();
    ctx.rect(-half, -halfY, half * 2, halfY * 2);
    ctx.fillStyle = color.ink;
    ctx.fill();

    const inset = jelly ? 0.38 : 0.42;
    ctx.globalAlpha = baseAlpha * (jelly ? 0.28 : breath * 0.35);
    ctx.beginPath();
    ctx.rect(
        -half * inset,
        -halfY * inset + r * 0.06,
        half * inset * 2,
        halfY * inset * 2
    );
    ctx.fillStyle = color.ink55;
    ctx.fill();

    ctx.restore();
}

/** Orbital core: solid disc + a thin ring with two crawling ticks. */
function drawHaloHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0048);
    const bank = ship.bank ?? 0;
    const r = ship.radius;
    const core = r * 0.72;
    const orbit = r * 1.22;
    const phase = time * 0.0028;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.9);
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    ctx.beginPath();
    ctx.arc(0, 0, orbit, 0, Math.PI * 2);
    ctx.strokeStyle = color.ink30;
    ctx.lineWidth = r * 0.07;
    ctx.stroke();

    for (let i = 0; i < 2; i++) {
        const a = phase + i * Math.PI;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * orbit, Math.sin(a) * orbit, r * 0.13, 0, Math.PI * 2);
        ctx.fillStyle = color.ink;
        ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(0, 0, core, 0, Math.PI * 2);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.globalAlpha = baseAlpha * (jelly ? 0.28 : breath * 0.35);
    ctx.beginPath();
    ctx.arc(0, r * 0.06, core * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = color.ink55;
    ctx.fill();

    ctx.restore();
}

const focus = {
    id: 'focus',
    name: 'Focus',
    blurb: 'Precise. Instrumental.',
    hitbox: CIRCLE_HITBOX,
    wallTrailMode: 'pile',

    drawHull(ctx, ship, screenY, time) {
        drawCircleHull(ctx, ship, screenY, time);
    },

    drawTrail(ctx, ship, trail, toScreenY) {
        drawDotTrail(ctx, ship, trail, toScreenY);
    },
};

const flicker = {
    id: 'flicker',
    name: 'Flicker',
    blurb: 'Organic. One flowing wake.',
    hitbox: TEAR_HITBOX,
    wallTrailMode: 'spring',

    drawHull: drawTearHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawRibbonTrail(ctx, ship, trail, toScreenY);
    },
};

const ember = {
    id: 'ember',
    name: 'Ember',
    blurb: 'Restless. A wake of streaks.',
    hitbox: DART_HITBOX,
    wallTrailMode: 'pile',

    drawHull: drawDartHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawStreakTrail(ctx, ship, trail, toScreenY);
    },
};

const wisp = {
    id: 'wisp',
    name: 'Wisp',
    blurb: 'Weightless. Sheds sparks.',
    hitbox: TEAR_HITBOX,
    wallTrailMode: 'spring',

    drawHull: drawTearHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawWispTrail(ctx, ship, trail, toScreenY);
    },
};

// Premium: Focus geometry with a Signal-Blue dotted wake — the "active" accent
// as a trail. Same hitbox and arcs as Focus.
const pulse = {
    id: 'pulse',
    name: 'Pulse',
    blurb: 'Signal wake. Instrumental, lit.',
    hitbox: CIRCLE_HITBOX,
    wallTrailMode: 'pile',
    productId: 'com.orbi.spaceswoosh.skin.pulse',
    entitlementId: 'skin_pulse',

    drawHull(ctx, ship, screenY, time) {
        drawCircleHull(ctx, ship, screenY, time);
    },

    drawTrail(ctx, ship, trail, toScreenY) {
        drawDotTrail(ctx, ship, trail, toScreenY, { rgb: color.signalRgb });
    },
};

// Premium: tear hull with a thin Signal-Blue ribbon — Flicker's shape, lit wake.
const quill = {
    id: 'quill',
    name: 'Quill',
    blurb: 'A fine blue line of travel.',
    hitbox: TEAR_HITBOX,
    wallTrailMode: 'spring',
    productId: 'com.orbi.spaceswoosh.skin.quill',
    entitlementId: 'skin_quill',

    drawHull: drawTearHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawRibbonTrail(ctx, ship, trail, toScreenY, {
            widthScale: 0.55,
            alpha: 0.85,
            smudge: false,
            rgb: color.signalRgb,
        });
    },
};

const shard = {
    id: 'shard',
    name: 'Shard',
    blurb: 'Faceted. A hard wake.',
    hitbox: SHARD_HITBOX,
    wallTrailMode: 'pile',

    drawHull: drawShardHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawChevronTrail(ctx, ship, trail, toScreenY);
    },
};

const halo = {
    id: 'halo',
    name: 'Halo',
    blurb: 'Orbital. Rings the path.',
    hitbox: HALO_HITBOX,
    wallTrailMode: 'pile',

    drawHull: drawHaloHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawRingTrail(ctx, ship, trail, toScreenY);
    },
};

const needle = {
    id: 'needle',
    name: 'Needle',
    blurb: 'Linear. One thin thread.',
    hitbox: NEEDLE_HITBOX,
    wallTrailMode: 'spring',

    drawHull: drawNeedleHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawHairlineTrail(ctx, ship, trail, toScreenY);
    },
};

const echo = {
    id: 'echo',
    name: 'Echo',
    blurb: 'Paired. Leaves a twin.',
    hitbox: CRESCENT_HITBOX,
    wallTrailMode: 'spring',

    drawHull: drawCrescentHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawTwinTrail(ctx, ship, trail, toScreenY);
    },
};

// Same square hull; the name is the wake so the picker is self-explanatory.
const squareStamp = {
    id: 'squareStamp',
    name: 'Square Stamp',
    blurb: 'Square hull. Stamped tiles.',
    hitbox: SQUARE_HITBOX,
    wallTrailMode: 'pile',
    drawHull: drawSquareHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawStampTrail(ctx, ship, trail, toScreenY);
    },
};

const squareTick = {
    id: 'squareTick',
    name: 'Square Tick',
    blurb: 'Square hull. Lateral ticks.',
    hitbox: SQUARE_HITBOX,
    wallTrailMode: 'pile',
    drawHull: drawSquareHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawTickTrail(ctx, ship, trail, toScreenY);
    },
};

const squareTrace = {
    id: 'squareTrace',
    name: 'Square Trace',
    blurb: 'Square hull. One thin line.',
    hitbox: SQUARE_HITBOX,
    wallTrailMode: 'spring',
    drawHull: drawSquareHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawHairlineTrail(ctx, ship, trail, toScreenY);
    },
};

const squareRing = {
    id: 'squareRing',
    name: 'Square Ring',
    blurb: 'Square hull. Blooming rings.',
    hitbox: SQUARE_HITBOX,
    wallTrailMode: 'pile',
    drawHull: drawSquareHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawRingTrail(ctx, ship, trail, toScreenY);
    },
};

export const SKIN_DEFS = [
    focus, flicker, ember, wisp, pulse, quill,
    shard, halo, needle, echo,
    squareStamp, squareTick, squareTrace, squareRing,
];
