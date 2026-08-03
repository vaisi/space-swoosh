// skinDefs.js
// The ship roster. Every skin is visual only — physics and speed are identical,
// so picking one never changes how the ship plays.
// Changes:
// - Flux hex shortened/compact; ink/signal dash wake. Cinder petal + flame-smoke.
// - Fold: solid kite drawer (crease stroke, no hollow inset); crease wake
//   attaches at the hull. Orbit: planetoid hull (solid body + tilted ring +
//   satellite) with lagging orbital wake. Ink: hull-attached tip reverse.
//   Mote: organic radial micro-dot cloud (messy, still L/R-balanced).
// - Per-ship wall-boop signatures + jelly profiles; free ships Fold/Mote/
//   Spine/Orbit/Ink/Flux/Cinder. Hitbox stays undeformed.

import { color } from '../brand/tokens.js';
import {
    MAX_BANK,
    tearPath,
    dartPath,
    shardPath,
    needlePath,
    crescentPath,
    foldPath,
    spinePath,
    hexPath,
    petalPath,
    orbitPath,
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
    drawCreaseTrail,
    drawCloudTrail,
    drawLadderTrail,
    drawLagEllipseTrail,
    drawDashTrail,
    drawCinderTrail,
} from './trails.js';

// Hitboxes are in local hull space (x right, y toward the tail, nose negative),
// in units of ship.radius. Each circle is inscribed in the drawn silhouette at
// the hull's *smallest* breathing scale, so none of them ever pokes outside the
// ink: the ship can't collide with something it visibly missed.
const CIRCLE_HITBOX = [{ x: 0, y: 0, r: 1 }];

const TEAR_HITBOX = [
    { x: 0, y: -0.61, r: 0.1 },
    { x: 0, y: -0.35, r: 0.23 },
    { x: 0, y: 0.16, r: 0.53 },
    { x: -0.33, y: 0.28, r: 0.33 },
    { x: 0.32, y: 0.28, r: 0.34 },
];

const DART_HITBOX = [
    { x: 0, y: -0.71, r: 0.08 },
    { x: 0, y: -0.5, r: 0.16 },
    { x: 0, y: -0.17, r: 0.29 },
    { x: -0.27, y: 0.1, r: 0.16 },
    { x: 0.29, y: 0.13, r: 0.15 },
    { x: -0.43, y: 0.29, r: 0.09 },
    { x: 0.44, y: 0.29, r: 0.08 },
];

const SHARD_HITBOX = [
    { x: 0, y: -0.72, r: 0.12 },
    { x: 0, y: -0.28, r: 0.28 },
    { x: 0, y: 0.12, r: 0.3 },
    { x: -0.22, y: 0.35, r: 0.14 },
    { x: 0.22, y: 0.35, r: 0.14 },
];

// Solid origami kite — nose / mid / tail + wing roots; skip thin tips.
const FOLD_HITBOX = [
    { x: 0, y: -0.68, r: 0.12 },
    { x: 0, y: -0.12, r: 0.28 },
    { x: 0, y: 0.48, r: 0.2 },
    { x: -0.3, y: 0.08, r: 0.14 },
    { x: 0.3, y: 0.08, r: 0.14 },
];

const NEEDLE_HITBOX = [
    { x: 0, y: -0.85, r: 0.08 },
    { x: 0, y: -0.45, r: 0.12 },
    { x: 0, y: 0.0, r: 0.14 },
    { x: 0, y: 0.45, r: 0.11 },
    { x: 0, y: 0.78, r: 0.08 },
];

const CRESCENT_HITBOX = [
    { x: 0, y: -0.55, r: 0.18 },
    { x: -0.42, y: -0.05, r: 0.2 },
    { x: 0.42, y: -0.05, r: 0.2 },
    { x: -0.55, y: 0.35, r: 0.16 },
    { x: 0.55, y: 0.35, r: 0.16 },
];

const HALO_HITBOX = [{ x: 0, y: 0, r: 0.72 }];

// Soft mote disc — slightly smaller than Focus so the soft edge feels fair.
const MOTE_HITBOX = [{ x: 0, y: 0, r: 0.92 }];

// Flux hex — compact facets matching the shorter hull.
const HEX_HITBOX = [
    { x: 0, y: -0.55, r: 0.12 },
    { x: 0, y: -0.12, r: 0.28 },
    { x: 0, y: 0.22, r: 0.28 },
    { x: -0.22, y: 0.08, r: 0.15 },
    { x: 0.22, y: 0.08, r: 0.15 },
    { x: 0, y: 0.52, r: 0.16 },
];

// Cinder petal — soft diamond coverage.
const PETAL_HITBOX = [
    { x: 0, y: -0.65, r: 0.16 },
    { x: 0, y: -0.15, r: 0.36 },
    { x: 0, y: 0.35, r: 0.34 },
    { x: -0.3, y: 0.2, r: 0.2 },
    { x: 0.3, y: 0.2, r: 0.2 },
    { x: 0, y: 0.75, r: 0.18 },
];

// Vertical bar — stacked circles down the spine only.
const SPINE_HITBOX = [
    { x: 0, y: -0.78, r: 0.16 },
    { x: 0, y: -0.35, r: 0.2 },
    { x: 0, y: 0.1, r: 0.22 },
    { x: 0, y: 0.5, r: 0.2 },
    { x: 0, y: 0.85, r: 0.16 },
];

// Orbit planetoid — solid oval body only (ring / satellite are decorative).
const ORBIT_HITBOX = [
    { x: 0, y: -0.48, r: 0.22 },
    { x: 0, y: -0.05, r: 0.36 },
    { x: 0, y: 0.38, r: 0.3 },
];

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

function makeHullRenderer(pathFn, profile = 'default') {
    return function drawHull(ctx, ship, screenY, time = performance.now()) {
        const breath = 0.9 + 0.06 * Math.sin(time * 0.0056) + 0.04 * Math.sin(time * 0.0088);
        const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
        const r = ship.radius * 0.95 * scale;

        const bank = ship.bank ?? 0;
        const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
        const stretch = 1 + 0.2 * turn;

        const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.85, profile);
        const baseAlpha = ctx.globalAlpha;
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
const drawShardHull = makeHullRenderer(shardPath, 'shard');
const drawCrescentHull = makeHullRenderer(crescentPath);
// Flux draws a bit smaller than the shared factory so the hex doesn't dominate.
function drawFluxHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.9 + 0.06 * Math.sin(time * 0.0056) + 0.04 * Math.sin(time * 0.0088);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
    const r = ship.radius * 0.82 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.14 * turn;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.72, 'flux');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    ctx.beginPath();
    ctx.arc(0, r * 0.1, r * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = color.ink12;
    ctx.fill();

    hexPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.globalAlpha = baseAlpha * (jelly ? 0.28 : breath * 0.35);
    hexPath(ctx, 0, r * 0.06, r * 0.4, stretch);
    ctx.fillStyle = color.ink55;
    ctx.fill();

    ctx.restore();
}

const drawCinderHull = makeHullRenderer(petalPath, 'cinder');

/** Solid origami kite — filled diamond + centre crease (no hollow inset). */
function drawFoldHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.9 + 0.06 * Math.sin(time * 0.0056) + 0.04 * Math.sin(time * 0.0088);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.2 * turn;
    const ry = r * stretch;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.85, 'fold');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    ctx.beginPath();
    ctx.arc(0, r * 0.12, r * 1.35, 0, Math.PI * 2);
    ctx.fillStyle = color.ink12;
    ctx.fill();

    foldPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    // Centre crease only — keeps the kite solid (no hollow highlight window).
    ctx.globalAlpha = baseAlpha * (jelly ? 0.35 : breath * 0.45);
    ctx.strokeStyle = color.ink55;
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -ry * 0.85);
    ctx.lineTo(0, ry * 0.75);
    ctx.stroke();

    ctx.restore();
}

/** Needle: thin lance uses whip/flex jelly (shear + length pulse), not fat squash. */
function drawNeedleHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.9 + 0.06 * Math.sin(time * 0.0056) + 0.04 * Math.sin(time * 0.0088);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
    const r = ship.radius * 0.95 * scale;

    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.2 * turn;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.55, 'needle');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    ctx.beginPath();
    ctx.arc(0, r * 0.12, r * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = color.ink12;
    ctx.fill();

    needlePath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.globalAlpha = baseAlpha * (jelly ? 0.4 : breath * 0.35);
    needlePath(ctx, 0, -r * 0.15, r * 0.38, stretch * 1.05);
    ctx.fillStyle = color.ink55;
    ctx.fill();

    ctx.restore();
}

/** Square hull: hard ink only (no soft halo). */
function drawSquareHull(ctx, ship, screenY, time = performance.now(), profile = 'default') {
    const breath = 0.9 + 0.06 * Math.sin(time * 0.0056) + 0.04 * Math.sin(time * 0.0088);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.2 * turn;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.82, profile);
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

function drawStampHull(ctx, ship, screenY, time) {
    drawSquareHull(ctx, ship, screenY, time, 'stamp');
}

/** Orbital core: solid disc + thin ring; halo jelly = tiny orbital wobble. */
function drawHaloHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0048);
    const bank = ship.bank ?? 0;
    const r = ship.radius;
    const core = r * 0.72;
    const orbit = r * 1.22;
    const phase = time * 0.0028;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.9, 'halo');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    // Extra orbital wobble of the ring ticks while jellying.
    const wobble = jelly ? jelly.shake * 2.5 : 0;

    ctx.beginPath();
    ctx.arc(0, 0, orbit, 0, Math.PI * 2);
    ctx.strokeStyle = color.ink30;
    ctx.lineWidth = r * 0.07;
    ctx.stroke();

    for (let i = 0; i < 2; i++) {
        const a = phase + i * Math.PI + wobble;
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

/** Soft ink disc — Mote (slightly softer edge via faint outer wash). */
function drawMoteHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.005);
    const bank = ship.bank ?? 0;
    const r = ship.radius;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.9, 'mote');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    ctx.beginPath();
    ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = color.ink12;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.globalAlpha = baseAlpha * (jelly ? 0.3 : breath * 0.4);
    ctx.beginPath();
    ctx.arc(0, r * 0.08, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = color.ink55;
    ctx.fill();

    ctx.restore();
}

/** Vertical bar hull — Spine. */
function drawSpineHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.9 + 0.05 * Math.sin(time * 0.0052);
    const scale = 0.98 + 0.02 * Math.sin(time * 0.004);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.15 * turn;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.55, 'spine');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    spinePath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.globalAlpha = baseAlpha * (jelly ? 0.28 : breath * 0.35);
    spinePath(ctx, 0, r * 0.05, r * 0.45, stretch);
    ctx.fillStyle = color.ink55;
    ctx.fill();

    ctx.restore();
}

/**
 * Orbit planetoid — solid oval body, thin tilted ring, one crawling satellite.
 * Distinct from Halo (round core + circular tick ring): elongated body + tilt.
 */
function drawOrbitHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.04 * Math.sin(time * 0.0046);
    const bank = ship.bank ?? 0;
    const r = ship.radius * 0.95;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.14 * turn;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.75, 'orbit');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    // Soft halo wash behind the body.
    ctx.beginPath();
    ctx.ellipse(0, r * 0.06, r * 0.95, r * 1.05 * stretch, 0, 0, Math.PI * 2);
    ctx.fillStyle = color.ink12;
    ctx.fill();

    // Thin orbital ring (tilted) — drawn under the body so the planet reads on top.
    const ringTilt = -0.55 + bank * 0.15;
    const ringRx = r * 1.05;
    const ringRy = r * 0.38 * stretch;
    ctx.strokeStyle = color.ink;
    ctx.lineWidth = Math.max(1.2, r * 0.1);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.08, ringRx, ringRy, ringTilt, 0, Math.PI * 2);
    ctx.stroke();

    // Solid planetoid body.
    orbitPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    // Soft highlight on the body.
    ctx.globalAlpha = baseAlpha * (jelly ? 0.28 : breath * 0.35);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.12 * stretch, r * 0.28, r * 0.38 * stretch, 0, 0, Math.PI * 2);
    ctx.fillStyle = color.ink55;
    ctx.fill();

    // Single satellite bead crawling the ring (slow).
    const phase = time * 0.0022 + (jelly ? jelly.shake * 3 : 0);
    const satX = Math.cos(phase) * ringRx;
    const satY = Math.sin(phase) * ringRy;
    const c = Math.cos(ringTilt);
    const s = Math.sin(ringTilt);
    const sx = satX * c - satY * s;
    const sy = satX * s + satY * c + r * 0.08;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.restore();
}

const focus = {
    id: 'focus',
    name: 'Focus',
    blurb: 'Precise. Instrumental.',
    hitbox: CIRCLE_HITBOX,
    wallTrailMode: 'dense',

    drawHull(ctx, ship, screenY, time) {
        drawCircleHull(ctx, ship, screenY, time);
    },

    drawTrail(ctx, ship, trail, toScreenY) {
        drawDotTrail(ctx, ship, trail, toScreenY, { denseBoop: true });
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
    wallTrailMode: 'scatter',

    drawHull: drawDartHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawStreakTrail(ctx, ship, trail, toScreenY, { sparkBoop: true });
    },
};

const wisp = {
    id: 'wisp',
    name: 'Wisp',
    blurb: 'Weightless. Sheds sparks.',
    hitbox: TEAR_HITBOX,
    wallTrailMode: 'flare',

    drawHull: drawTearHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawWispTrail(ctx, ship, trail, toScreenY, { flareBoop: true });
    },
};

const pulse = {
    id: 'pulse',
    name: 'Pulse',
    blurb: 'Signal wake. Instrumental, lit.',
    hitbox: CIRCLE_HITBOX,
    wallTrailMode: 'dense',
    productId: 'com.orbi.spaceswoosh.skin.pulse',
    entitlementId: 'skin_pulse',

    drawHull(ctx, ship, screenY, time) {
        drawCircleHull(ctx, ship, screenY, time);
    },

    drawTrail(ctx, ship, trail, toScreenY) {
        drawDotTrail(ctx, ship, trail, toScreenY, {
            rgb: color.signalRgb,
            denseBoop: true,
        });
    },
};

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
    wallTrailMode: 'shatter',

    drawHull: drawShardHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawChevronTrail(ctx, ship, trail, toScreenY, { shatterBoop: true });
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
        drawRingTrail(ctx, ship, trail, toScreenY, { bubbleBoop: true });
    },
};

const needle = {
    id: 'needle',
    name: 'Needle',
    blurb: 'Linear. One thin thread.',
    hitbox: NEEDLE_HITBOX,
    wallTrailMode: 'whip',

    drawHull: drawNeedleHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawHairlineTrail(ctx, ship, trail, toScreenY, { tipRipple: true });
    },
};

const echo = {
    id: 'echo',
    name: 'Echo',
    blurb: 'Paired. Leaves a twin.',
    hitbox: CRESCENT_HITBOX,
    wallTrailMode: 'desync',

    drawHull: drawCrescentHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawTwinTrail(ctx, ship, trail, toScreenY, { desyncBoop: true });
    },
};

const squareStamp = {
    id: 'squareStamp',
    name: 'Square Stamp',
    blurb: 'Square hull. Stamped tiles.',
    hitbox: SQUARE_HITBOX,
    wallTrailMode: 'blot',
    drawHull: drawStampHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawStampTrail(ctx, ship, trail, toScreenY, { blotBoop: true });
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
        drawTickTrail(ctx, ship, trail, toScreenY, { wallStretch: true });
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
        // Distinct from Halo: ring squash only — no soap-bubble inflate/pop.
        drawRingTrail(ctx, ship, trail, toScreenY);
    },
};

const fold = {
    id: 'fold',
    name: 'Fold',
    blurb: 'Origami. A dashed crease.',
    hitbox: FOLD_HITBOX,
    wallTrailMode: 'crease',
    drawHull: drawFoldHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawCreaseTrail(ctx, ship, trail, toScreenY);
    },
};

const mote = {
    id: 'mote',
    name: 'Mote',
    blurb: 'Soft ink. A drifting cloud.',
    hitbox: MOTE_HITBOX,
    wallTrailMode: 'cloud',
    drawHull: drawMoteHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawCloudTrail(ctx, ship, trail, toScreenY);
    },
};

const spine = {
    id: 'spine',
    name: 'Spine',
    blurb: 'Upright. A ladder wake.',
    hitbox: SPINE_HITBOX,
    wallTrailMode: 'ladder',
    drawHull: drawSpineHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawLadderTrail(ctx, ship, trail, toScreenY);
    },
};

const orbit = {
    id: 'orbit',
    name: 'Orbit',
    blurb: 'Planetoid. A lagging orbit wake.',
    hitbox: ORBIT_HITBOX,
    wallTrailMode: 'lag',
    drawHull: drawOrbitHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawLagEllipseTrail(ctx, ship, trail, toScreenY);
    },
};

// Quill's dark twin — fine ink ribbon; boop whips the tip while stay attached.
const ink = {
    id: 'ink',
    name: 'Ink',
    blurb: 'Calligraphic. Tip reverses on boop.',
    hitbox: TEAR_HITBOX,
    wallTrailMode: 'script',
    drawHull: drawTearHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawRibbonTrail(ctx, ship, trail, toScreenY, {
            widthScale: 0.5,
            alpha: 0.88,
            smudge: false,
            reverseBoop: true,
        });
    },
};

const flux = {
    id: 'flux',
    name: 'Flux',
    blurb: 'Hex crystal. Ink and signal dashes.',
    hitbox: HEX_HITBOX,
    wallTrailMode: 'flick',
    drawHull: drawFluxHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawDashTrail(ctx, ship, trail, toScreenY);
    },
};

const cinder = {
    id: 'cinder',
    name: 'Cinder',
    blurb: 'Warm petal. Ember ribbon, cool ash.',
    hitbox: PETAL_HITBOX,
    wallTrailMode: 'cinder',
    drawHull: drawCinderHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawCinderTrail(ctx, ship, trail, toScreenY);
    },
};

export const SKIN_DEFS = [
    focus, flicker, ember, wisp, pulse, quill,
    shard, halo, needle, echo,
    squareStamp, squareTick, squareTrace, squareRing,
    fold, mote, spine, orbit, ink,
    flux, cinder,
];
