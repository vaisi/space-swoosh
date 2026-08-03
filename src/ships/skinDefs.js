// skinDefs.js
// The ship roster. Every skin is visual only — physics and speed are identical,
// so picking one never changes how the ship plays.
// Changes:
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
    withHeading,
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

        ctx.save();
        // Relative to the caller's alpha, so a world fade takes the hull with it.
        const baseAlpha = ctx.globalAlpha;
        ctx.globalAlpha = baseAlpha * breath;

        withHeading(ctx, ship.x, screenY, bank, (c) => {
            c.beginPath();
            c.arc(0, r * 0.12, r * 1.35, 0, Math.PI * 2);
            c.fillStyle = color.ink12;
            c.fill();

            pathFn(c, 0, 0, r, stretch);
            c.fillStyle = color.ink;
            c.fill();

            c.globalAlpha = baseAlpha * breath * 0.35;
            pathFn(c, 0, r * 0.08, r * 0.42, stretch);
            c.fillStyle = color.ink55;
            c.fill();
        });

        ctx.restore();
    };
}

const drawTearHull = makeHullRenderer(tearPath);
const drawDartHull = makeHullRenderer(dartPath);
const drawShardHull = makeHullRenderer(shardPath);
const drawNeedleHull = makeHullRenderer(needlePath);
const drawCrescentHull = makeHullRenderer(crescentPath);

/** Orbital core: solid disc + a thin ring with two crawling ticks. */
function drawHaloHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0048);
    const bank = ship.bank ?? 0;
    const r = ship.radius;
    const core = r * 0.72;
    const orbit = r * 1.22;
    const phase = time * 0.0028;

    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = baseAlpha * breath;

    withHeading(ctx, ship.x, screenY, bank, (c) => {
        c.beginPath();
        c.arc(0, 0, orbit, 0, Math.PI * 2);
        c.strokeStyle = color.ink30;
        c.lineWidth = r * 0.07;
        c.stroke();

        for (let i = 0; i < 2; i++) {
            const a = phase + i * Math.PI;
            c.beginPath();
            c.arc(Math.cos(a) * orbit, Math.sin(a) * orbit, r * 0.13, 0, Math.PI * 2);
            c.fillStyle = color.ink;
            c.fill();
        }

        c.beginPath();
        c.arc(0, 0, core, 0, Math.PI * 2);
        c.fillStyle = color.ink;
        c.fill();

        c.globalAlpha = baseAlpha * breath * 0.35;
        c.beginPath();
        c.arc(0, r * 0.06, core * 0.42, 0, Math.PI * 2);
        c.fillStyle = color.ink55;
        c.fill();
    });

    ctx.restore();
}

const focus = {
    id: 'focus',
    name: 'Focus',
    blurb: 'Precise. Instrumental.',
    hitbox: CIRCLE_HITBOX,

    drawHull(ctx, ship, screenY) {
        drawCircleHull(ctx, ship, screenY);
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
    productId: 'com.orbi.spaceswoosh.skin.pulse',
    entitlementId: 'skin_pulse',

    drawHull(ctx, ship, screenY) {
        drawCircleHull(ctx, ship, screenY);
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

    drawHull: drawCrescentHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawTwinTrail(ctx, ship, trail, toScreenY);
    },
};

export const SKIN_DEFS = [
    focus, flicker, ember, wisp, pulse, quill,
    shard, halo, needle, echo,
];
