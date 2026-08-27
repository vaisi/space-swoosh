// skinDefs.js
// The ship roster. Every skin is visual only — physics and speed are identical,
// so picking one never changes how the ship plays.
// Changes:
// - Merlin — ultra-slim spark-falcon; prism heart + orbiting 4-point stars; hairline comet + dense star cascade; flare boop.
// - Plume wall-boop uses Koi `whip` + gold/ember scale stamps (Cinder stays `cinder`).
// - Darner, Puff, Argus, Chime — premium IAP; long wake; skipHullCache.
// - Luna (lunar moth + moon heart + scale dust) and Wish (comet + constellation).
//   Premium IAP; long wake; skipHullCache.
// - Lyra, Sprout, Plume, Koi, Spore, Boreal — premium IAP, long wake,
//   skipHullCache for live hull paint.
// - Lantern (jellyfish bell + gold heart + plankton) and Bloom (soap films +
//   prism motes). Premium IAP; long wake; skipHullCache for live hull paint.
// - Mote cloud boop: rippleScale 0.55 (still a dying hull-to-tail pulse, milder
//   than the original cartoon pop). Dusk stays at 0.4.
// - Fletch: smooth ogive arrow + Quill ribbon with length-wise dawn strata
//   (not Nyan's side-by-side rainbow). Premium IAP; long wake; nock attach.
// - Dusk: Echo crescent + Mote cloud in saber purple at 2× density, wider
//   dust scatter (no polar rings), milder ripple than Mote.
// - Long in-game wakes (Quill, Fletch, Shard, Seal, Hatch, Trace, Fold, Spine, Mote,
//   Pulse, Echo, Dusk, Ink, Cinder, Lantern, Bloom, Lyra, Sprout, Plume, Koi,
//   Spore, Boreal, Luna, Wish, Darner, Puff, Argus, Chime, Merlin). Menu preview stays short so it never covers title.
// - Free Saber: Needle hull + slim purple lightsaber wake (long trail, whip).
// - Free forever: Focus / Flicker / Ember / Saber. Every other skin has productId +
//   entitlementId (com.orbi.spaceswoosh.skin.<id> / skin_<id>) for IAP.
// - Renamed square* → Stamp/Tick/Trace/Ring, then Stamp→Seal, Tick→Hatch.
// - Night paper: Nyan hull gray lifted so the crescent still reads on charcoal.
// - Nyan: Echo's crescent (sparrow wings), gray + two pink spots, no ink
//   halo disc; rainbow attaches at hull centre (trailTailOffset 0).
// - Ink wake: slightly wider ribbon + smudge so script boop flourish/flecks
//   read clearly (still hull-attached via script mode).
// - Flux hex shortened/compact; ink/signal dash wake. Cinder petal + flame-smoke.
// - Fold: solid kite drawer (crease stroke, no hollow inset); crease wake
//   attaches at the hull. Orbit: planetoid hull (solid body + tilted ring +
//   satellite) with lagging orbital wake. Ink: hull-attached tip reverse.
//   Mote: organic radial micro-dot cloud (messy, still L/R-balanced).
// - Per-ship wall-boop signatures + jelly profiles. Hitbox stays undeformed.

import { color } from '../brand/tokens.js';

/** Store product + RevenueCat entitlement for a premium skin. */
function iap(id) {
    return {
        productId: `com.orbi.spaceswoosh.skin.${id}`,
        entitlementId: `skin_${id}`,
    };
}

import {
    MAX_BANK,
    tearPath,
    dartPath,
    shardPath,
    needlePath,
    crescentPath,
    fletchPath,
    foldPath,
    spinePath,
    hexPath,
    petalPath,
    orbitPath,
    bellPath,
    bloomPath,
    starPath,
    seedPath,
    wingPath,
    koiPath,
    capPath,
    curtainPath,
    mothPath,
    wishPath,
    darnerPath,
    puffPath,
    argusPath,
    chimePath,
    merlinPath,
    beginHullFrame,
    drawCircleHull,
} from './hulls.js';
import {
    drawDotTrail,
    drawTwinDotTrail,
    drawRibbonTrail,
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
    drawRainbowRibbonTrail,
    drawHorizonRibbonTrail,
    drawSaberTrail,
    drawLanternTrail,
    drawBloomTrail,
    drawLyraTrail,
    drawPlumeTrail,
    drawKoiTrail,
    drawBorealTrail,
    drawLunaTrail,
    drawWishTrail,
    drawDarnerTrail,
    drawPuffTrail,
    drawArgusTrail,
    drawChimeTrail,
    drawMerlinTrail,
} from './trails.js';

/** Extra-long wake: tip should leave the camera, not fade in-view. */
const LONG_WAKE = {
    trailMaxPoints: 200,
    trailFade: 1 / 420,
};

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

// Smooth arrow — spine + shoulder roots; skip the thin nock tips.
const FLETCH_HITBOX = [
    { x: 0, y: -0.78, r: 0.1 },
    { x: 0, y: -0.38, r: 0.22 },
    { x: 0, y: 0.02, r: 0.3 },
    { x: -0.26, y: 0.16, r: 0.14 },
    { x: 0.26, y: 0.16, r: 0.14 },
    { x: 0, y: 0.32, r: 0.14 },
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

// Lantern bell — body only; tentacles are decorative.
const LANTERN_HITBOX = [
    { x: 0, y: -0.52, r: 0.14 },
    { x: 0, y: -0.22, r: 0.30 },
    { x: 0, y: 0.04, r: 0.34 },
    { x: -0.32, y: 0.06, r: 0.16 },
    { x: 0.32, y: 0.06, r: 0.16 },
    { x: 0, y: 0.18, r: 0.14 },
];

// Bloom central soap disc — overlapping films / satellites are decorative.
const BLOOM_HITBOX = [{ x: 0, y: 0, r: 0.70 }];

const LYRA_HITBOX = [
    { x: 0, y: -0.42, r: 0.16 },
    { x: 0, y: 0, r: 0.28 },
    { x: 0, y: 0.4, r: 0.16 },
    { x: -0.32, y: 0, r: 0.14 },
    { x: 0.32, y: 0, r: 0.14 },
];

const SPROUT_HITBOX = [
    { x: 0, y: -0.42, r: 0.2 },
    { x: 0, y: 0.02, r: 0.34 },
    { x: 0, y: 0.42, r: 0.22 },
];

const PLUME_HITBOX = [
    { x: 0, y: -0.48, r: 0.16 },
    { x: 0, y: -0.08, r: 0.28 },
    { x: -0.38, y: 0.18, r: 0.18 },
    { x: 0.38, y: 0.18, r: 0.18 },
    { x: 0, y: 0.32, r: 0.16 },
];

const KOI_HITBOX = [
    { x: 0, y: -0.58, r: 0.16 },
    { x: 0, y: -0.18, r: 0.32 },
    { x: 0, y: 0.22, r: 0.3 },
    { x: 0, y: 0.48, r: 0.16 },
];

const SPORE_HITBOX = [
    { x: 0, y: -0.38, r: 0.22 },
    { x: 0, y: -0.08, r: 0.42 },
    { x: -0.4, y: 0.02, r: 0.22 },
    { x: 0.4, y: 0.02, r: 0.22 },
    { x: 0, y: 0.18, r: 0.2 },
];

const BOREAL_HITBOX = [
    { x: 0, y: -0.52, r: 0.12 },
    { x: 0, y: -0.12, r: 0.18 },
    { x: 0, y: 0.22, r: 0.16 },
    { x: 0, y: 0.58, r: 0.12 },
];

// Luna body + inner wings; outer dust is decorative.
const LUNA_HITBOX = [
    { x: 0, y: -0.42, r: 0.16 },
    { x: 0, y: -0.06, r: 0.26 },
    { x: -0.3, y: 0.08, r: 0.18 },
    { x: 0.3, y: 0.08, r: 0.18 },
    { x: 0, y: 0.22, r: 0.14 },
];

// Wish crystal body only; orbiting stars are decorative.
const WISH_HITBOX = [
    { x: 0, y: -0.62, r: 0.12 },
    { x: 0, y: -0.22, r: 0.2 },
    { x: 0, y: 0.12, r: 0.18 },
    { x: 0, y: 0.42, r: 0.14 },
];

// Darner needle body only; wings are decorative.
const DARNER_HITBOX = [
    { x: 0, y: -0.62, r: 0.08 },
    { x: 0, y: -0.22, r: 0.1 },
    { x: 0, y: 0.18, r: 0.09 },
    { x: 0, y: 0.55, r: 0.07 },
];

// Puff seed head only; stem and ticks are decorative.
const PUFF_HITBOX = [
    { x: 0, y: -0.42, r: 0.28 },
    { x: -0.22, y: -0.08, r: 0.32 },
    { x: 0.22, y: -0.08, r: 0.32 },
    { x: 0, y: 0.22, r: 0.28 },
];

// Argus body + inner fan; thin feather tips are decorative.
const ARGUS_HITBOX = [
    { x: 0, y: -0.55, r: 0.16 },
    { x: 0, y: -0.12, r: 0.32 },
    { x: 0, y: 0.28, r: 0.28 },
    { x: -0.22, y: 0.38, r: 0.16 },
    { x: 0.22, y: 0.38, r: 0.16 },
];

// Chime central bell only; side bells and clappers are decorative.
const CHIME_HITBOX = [
    { x: 0, y: -0.48, r: 0.26 },
    { x: 0, y: -0.04, r: 0.38 },
    { x: 0, y: 0.28, r: 0.28 },
];

// Merlin needle body only; winglets and orbiting stars are decorative.
const MERLIN_HITBOX = [
    { x: 0, y: -0.85, r: 0.04 },
    { x: 0, y: -0.40, r: 0.05 },
    { x: 0, y: 0.05, r: 0.06 },
    { x: 0, y: 0.50, r: 0.04 },
    { x: 0, y: 0.95, r: 0.04 },
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

/** Smooth arrow — no gray halo; a thin spine so the nock reads as a fletching seat. */
function drawFletchHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.9 + 0.06 * Math.sin(time * 0.0056) + 0.04 * Math.sin(time * 0.0088);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.2 * turn;
    const ry = r * stretch;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.85, 'default');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    fletchPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.globalAlpha = baseAlpha * (jelly ? 0.35 : breath * 0.42);
    ctx.strokeStyle = color.ink55;
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -ry * 0.92);
    ctx.lineTo(0, ry * 0.28);
    ctx.stroke();

    ctx.restore();
}

// Nyan body colours — ship-local (not brand UI tokens). Lifted for night paper.
const NYAN_GRAY = '#C4BDB0';
const NYAN_GRAY_SOFT = 'rgba(196, 189, 176, 0.45)';
const NYAN_PINK = '#FF8FB8';

/** Two pink dots — one on each sparrow wing (local fractions of r). */
const NYAN_SPOTS = [
    [0.48, 0.12, 0.085],
    [-0.48, 0.12, 0.085],
];

/** Echo crescent / sparrow wings in dark gray + two pink spots. */
function drawNyanHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.9 + 0.06 * Math.sin(time * 0.0056) + 0.04 * Math.sin(time * 0.0088);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
    const r = ship.radius * 0.95 * scale;

    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.2 * turn;
    const ry = r * stretch;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.85, 'default');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    crescentPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = NYAN_GRAY;
    ctx.fill();

    // Softer inner wash on the wing join (same gray family, not ink).
    ctx.globalAlpha = baseAlpha * (jelly ? 0.22 : breath * 0.28);
    crescentPath(ctx, 0, r * 0.04, r * 0.42, stretch);
    ctx.fillStyle = NYAN_GRAY_SOFT;
    ctx.fill();

    // Pink spots clipped to the crescent silhouette.
    ctx.globalAlpha = baseAlpha * (jelly ? 0.95 : breath);
    crescentPath(ctx, 0, 0, r, stretch);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = NYAN_PINK;
    for (let i = 0; i < NYAN_SPOTS.length; i++) {
        const [fx, fy, fr] = NYAN_SPOTS[i];
        ctx.beginPath();
        ctx.arc(fx * r, fy * ry, Math.max(1.2, fr * r), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    ctx.restore();
}

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

/** Biolume spots on the lantern cap (local fractions of r). */
const LANTERN_SPOTS = [
    [0.32, -0.18, 0.08],
    [-0.28, -0.08, 0.07],
    [0.08, 0.06, 0.055],
];

/** Tentacle roots along the scalloped underside (decorative). */
const LANTERN_TENTACLES = [
    { x: -0.72, y: 0.28, phase: 0.0 },
    { x: -0.36, y: 0.34, phase: 1.1 },
    { x: 0.00, y: 0.36, phase: 2.2 },
    { x: 0.36, y: 0.34, phase: 3.3 },
    { x: 0.72, y: 0.28, phase: 4.4 },
    { x: 0.00, y: 0.42, phase: 5.0 },
];

/**
 * Lantern — ink-teal bell, pulsing gold heart, undulating tentacles.
 * Tentacles are paint only; hitbox is the bell.
 */
function drawLanternHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0048);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.16 * turn;
    const lod = !!ship.game?.iosDrawLod;
    const pulse = 0.82 + 0.18 * Math.sin(time * 0.0062);

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.85, 'lantern');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    ctx.beginPath();
    ctx.arc(0, r * 0.08, r * 1.28, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternTealRgb}, 0.16)`;
    ctx.fill();

    bellPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.globalAlpha = baseAlpha * (jelly ? 0.22 : breath * 0.28);
    bellPath(ctx, 0, r * 0.04, r * 0.78, stretch);
    ctx.fillStyle = `rgba(${color.lanternTealRgb}, 1)`;
    ctx.fill();

    const core = r * (0.22 + 0.06 * pulse);
    ctx.globalAlpha = jelly ? baseAlpha * 0.7 : baseAlpha * breath * pulse;
    ctx.beginPath();
    ctx.arc(0, r * 0.02, core * 1.55, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 0.28)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, r * 0.02, core, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 1)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, r * 0.01, core * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = color.ink55;
    ctx.fill();

    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;
    for (let i = 0; i < LANTERN_SPOTS.length; i++) {
        const [sx, sy, sr] = LANTERN_SPOTS[i];
        const rgb = i === 1 ? color.lanternGoldRgb : color.lanternTealRgb;
        ctx.beginPath();
        ctx.arc(sx * r, sy * r * stretch, sr * r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, 1)`;
        ctx.fill();
    }

    const tentacles = lod
        ? [LANTERN_TENTACLES[0], LANTERN_TENTACLES[2], LANTERN_TENTACLES[4]]
        : LANTERN_TENTACLES;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < tentacles.length; i++) {
        const t = tentacles[i];
        const sway = Math.sin(time * 0.0042 + t.phase) * r * 0.22;
        const len = r * (0.52 + 0.14 * Math.sin(time * 0.0031 + t.phase * 0.7));
        const x0 = t.x * r;
        const y0 = t.y * r * stretch;
        ctx.strokeStyle = i % 2 === 0
            ? `rgba(${color.lanternTealRgb}, 1)`
            : `rgba(${color.lanternGoldRgb}, 1)`;
        ctx.globalAlpha = baseAlpha * (jelly ? 0.55 : breath * 0.7);
        ctx.lineWidth = Math.max(1, r * (0.055 + 0.02 * Math.sin(time * 0.005 + t.phase)));
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(x0 + sway, y0 + len * 0.55, x0 + sway * 0.35, y0 + len);
        ctx.stroke();
    }

    ctx.restore();
}

/** Bloom film colors — rose / mint / lavender / sky (hull strokes, not HUD). */
const BLOOM_HULL_RGB = [
    '255, 140, 180',
    '120, 220, 190',
    '180, 150, 255',
    '120, 190, 255',
];

const BLOOM_SATS = [
    { radius: 1.12, size: 0.16, speed: 0.0022, phase: 0.0 },
    { radius: 1.36, size: 0.11, speed: -0.0016, phase: 2.1 },
    { radius: 1.52, size: 0.09, speed: 0.0028, phase: 4.0 },
];

function bloomRgbAt(time, index) {
    const n = BLOOM_HULL_RGB.length;
    const t = (time * 0.00035 + index * 0.17) % 1;
    return BLOOM_HULL_RGB[Math.floor(t * n) % n];
}

function drawBloomFilm(ctx, x, y, rx, ry, rgb, alpha, fill) {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) {
        ctx.fillStyle = `rgba(${rgb}, 0.16)`;
        ctx.fill();
    }
    ctx.strokeStyle = `rgba(${rgb}, 1)`;
    ctx.stroke();
}

/**
 * Bloom — overlapping soap films + orbiting satellite bubbles.
 * Satellites are paint only; hitbox is the central disc.
 */
function drawBloomHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0046);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.004);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.12 * turn;
    const lod = !!ship.game?.iosDrawLod;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.9, 'bloom');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;
    ctx.lineWidth = Math.max(1.2, r * 0.08);
    ctx.lineCap = 'round';

    const wobble = jelly ? jelly.shake * 2.2 : 0;

    drawBloomFilm(
        ctx,
        -r * 0.28,
        -r * 0.1 * stretch,
        r * 0.48,
        r * 0.48 * stretch,
        bloomRgbAt(time, 1),
        baseAlpha * (jelly ? 0.55 : breath * 0.7),
        true
    );
    drawBloomFilm(
        ctx,
        r * 0.3,
        r * 0.16 * stretch,
        r * 0.42,
        r * 0.42 * stretch,
        bloomRgbAt(time, 2),
        baseAlpha * (jelly ? 0.5 : breath * 0.65),
        true
    );

    bloomPath(ctx, 0, 0, r, stretch);
    ctx.globalAlpha = baseAlpha * (jelly ? 0.22 : breath * 0.2);
    ctx.fillStyle = `rgba(${bloomRgbAt(time, 0)}, 1)`;
    ctx.fill();
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;
    ctx.strokeStyle = `rgba(${bloomRgbAt(time, 0)}, 1)`;
    ctx.lineWidth = Math.max(1.4, r * 0.09);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, -r * 0.18 * stretch, r * 0.22, r * 0.14 * stretch, 0, 0, Math.PI * 2);
    ctx.globalAlpha = baseAlpha * (jelly ? 0.28 : breath * 0.35);
    ctx.fillStyle = color.ink55;
    ctx.fill();

    if (!lod) {
        for (let i = 0; i < BLOOM_SATS.length; i++) {
            const sat = BLOOM_SATS[i];
            const phase = time * sat.speed + sat.phase + wobble;
            const sx = Math.cos(phase) * r * sat.radius;
            const sy = Math.sin(phase) * r * sat.radius * 0.55 * stretch;
            ctx.lineWidth = Math.max(0.9, r * 0.055);
            drawBloomFilm(
                ctx,
                sx,
                sy,
                r * sat.size,
                r * sat.size,
                bloomRgbAt(time, i + 1),
                baseAlpha * (jelly ? 0.6 : breath * 0.8),
                false
            );
        }
    }

    ctx.restore();
}

const LYRA_TWINKLES = [
    [0.0, -0.08, 0.1],
    [0.22, 0.06, 0.055],
    [-0.2, 0.1, 0.05],
];

function drawLyraHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0048);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0042);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.14 * turn;
    const lod = !!ship.game?.iosDrawLod;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.85, 'lyra');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    ctx.beginPath();
    ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${AURORA_HULL[0]}, 0.14)`;
    ctx.fill();

    starPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.globalAlpha = baseAlpha * (jelly ? 0.35 : breath * 0.42);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22 * (0.9 + 0.1 * Math.sin(time * 0.007)), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${AURORA_HULL[1]}, 1)`;
    ctx.fill();

    if (!lod) {
        for (let i = 0; i < LYRA_TWINKLES.length; i++) {
            const [sx, sy, sr] = LYRA_TWINKLES[i];
            const tw = 0.55 + 0.45 * Math.sin(time * 0.008 + i * 1.7);
            ctx.globalAlpha = baseAlpha * tw * (jelly ? 0.7 : breath);
            ctx.beginPath();
            ctx.arc(sx * r, sy * r * stretch, sr * r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${AURORA_HULL[i % AURORA_HULL.length]}, 1)`;
            ctx.fill();
        }
    }

    ctx.restore();
}

const AURORA_HULL = [
    '48, 186, 132',
    '72, 198, 220',
    '232, 92, 168',
];

function drawLeaf(ctx, x, y, rx, ry, rot, rgb, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb}, 1)`;
    ctx.fill();
    ctx.restore();
}

function drawSproutHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0046);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.004);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.14 * turn;
    const unfurl = 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(time * 0.0038));

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.85, 'sprout');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    const leafRgb = color.sproutGreenRgb;
    drawLeaf(ctx, -r * 0.42, r * 0.08, r * 0.38 * unfurl, r * 0.22 * stretch, -0.7, leafRgb, baseAlpha * 0.7);
    drawLeaf(ctx, r * 0.42, r * 0.08, r * 0.38 * unfurl, r * 0.22 * stretch, 0.7, leafRgb, baseAlpha * 0.7);

    seedPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.globalAlpha = baseAlpha * (jelly ? 0.4 : breath * 0.45);
    ctx.beginPath();
    ctx.arc(0, -r * 0.12 * stretch, r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 1)`;
    ctx.fill();

    ctx.restore();
}

function drawPlumeHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.9 + 0.06 * Math.sin(time * 0.0052);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.18 * turn;
    const flicker = 0.85 + 0.15 * Math.sin(time * 0.011);

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.75, 'plume');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    ctx.beginPath();
    ctx.arc(0, r * 0.1, r * 1.25, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.emberRgb}, 0.16)`;
    ctx.fill();

    wingPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.globalAlpha = baseAlpha * (jelly ? 0.55 : breath * flicker);
    ctx.beginPath();
    ctx.arc(0, r * 0.04, r * 0.2 * flicker, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 1)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, r * 0.04, r * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.emberRgb}, 1)`;
    ctx.fill();

    ctx.restore();
}

function drawKoiHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0048);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.004);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.16 * turn;
    const sway = Math.sin(time * 0.0055) * 0.22;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.8, 'koi');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    koiPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.fillStyle = `rgba(210, 72, 58, 1)`;
    ctx.beginPath();
    ctx.arc(-r * 0.16, -r * 0.28 * stretch, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.18, r * 0.06 * stretch, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(210, 72, 58, 1)`;
    ctx.lineWidth = Math.max(1.1, r * 0.08);
    ctx.lineCap = 'round';
    ctx.globalAlpha = baseAlpha * (jelly ? 0.6 : breath * 0.75);
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, r * 0.52 * stretch);
    ctx.quadraticCurveTo(-r * (0.38 + sway), r * 0.82 * stretch, -r * 0.08, r * 1.05 * stretch);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.12, r * 0.52 * stretch);
    ctx.quadraticCurveTo(r * (0.38 - sway), r * 0.82 * stretch, r * 0.08, r * 1.05 * stretch);
    ctx.stroke();

    ctx.restore();
}

function drawSporeHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0048);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.12 * turn;
    const pulse = 0.82 + 0.18 * Math.sin(time * 0.006);
    const lod = !!ship.game?.iosDrawLod;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.85, 'spore');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    ctx.beginPath();
    ctx.arc(0, 0, r * 1.22, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.sporeAmberRgb}, 0.16)`;
    ctx.fill();

    capPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.globalAlpha = baseAlpha * (jelly ? 0.35 : breath * 0.4);
    ctx.strokeStyle = `rgba(${color.sporeAmberRgb}, 1)`;
    ctx.lineWidth = Math.max(1, r * 0.045);
    ctx.lineCap = 'round';
    const gills = lod ? 3 : 5;
    for (let i = 0; i < gills; i++) {
        const t = (i + 1) / (gills + 1);
        const x0 = (t * 2 - 1) * r * 0.72;
        ctx.beginPath();
        ctx.moveTo(x0 * 0.35, r * 0.02 * stretch);
        ctx.quadraticCurveTo(x0, r * 0.08 * stretch, x0 * 0.85, r * 0.16 * stretch);
        ctx.stroke();
    }

    ctx.globalAlpha = jelly ? baseAlpha * 0.7 : baseAlpha * breath * pulse;
    ctx.beginPath();
    ctx.arc(0, -r * 0.12 * stretch, r * 0.2 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.sporeAmberRgb}, 1)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -r * 0.12 * stretch, r * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.sporeVioletRgb}, 1)`;
    ctx.fill();

    ctx.fillStyle = color.ink;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.28 * stretch, r * 0.11, r * 0.2 * stretch, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawBorealHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0046);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.004);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.16 * turn;
    const lod = !!ship.game?.iosDrawLod;
    const phase = time * 0.0004;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.55, 'boreal');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    curtainPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.lineCap = 'round';
    const bands = lod ? 2 : 3;
    for (let i = 0; i < bands; i++) {
        const rgb = AURORA_HULL[i % AURORA_HULL.length];
        ctx.strokeStyle = `rgba(${rgb}, 1)`;
        ctx.globalAlpha = baseAlpha * (jelly ? 0.45 : breath * 0.55);
        ctx.lineWidth = Math.max(1, r * 0.07);
        ctx.beginPath();
        const xOff = (i - 1) * r * 0.1;
        ctx.moveTo(xOff - r * 0.08, -r * 0.7 * stretch);
        ctx.bezierCurveTo(
            xOff + r * 0.35, -r * 0.15 * stretch,
            xOff - r * 0.32, r * 0.28 * stretch,
            xOff + r * 0.12, r * 0.78 * stretch
        );
        ctx.stroke();
    }

    ctx.globalAlpha = baseAlpha * (0.5 + 0.5 * Math.sin(phase * 20));
    ctx.beginPath();
    ctx.arc(0, -r * 0.15 * stretch, r * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${AURORA_HULL[Math.floor(phase * 3) % 3]}, 1)`;
    ctx.fill();

    ctx.restore();
}

const LUNA_DUST = [
    [0.42, 0.02, 0.07],
    [-0.38, 0.08, 0.06],
    [0.22, -0.18, 0.045],
    [-0.18, -0.22, 0.04],
];

function drawLunaHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0048);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0042);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.16 * turn;
    const lod = !!ship.game?.iosDrawLod;
    const flutter = 0.92 + 0.08 * Math.sin(time * 0.0064);

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.7, 'luna');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    ctx.beginPath();
    ctx.arc(0, r * 0.06, r * 1.35, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.mothLavenderRgb}, 0.16)`;
    ctx.fill();

    mothPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.strokeStyle = `rgba(${color.mothLavenderRgb}, 1)`;
    ctx.lineWidth = Math.max(0.9, r * 0.045);
    ctx.lineCap = 'round';
    ctx.globalAlpha = baseAlpha * (jelly ? 0.5 : breath * 0.6);
    ctx.beginPath();
    ctx.moveTo(-r * 0.08, -r * 0.72 * stretch);
    ctx.quadraticCurveTo(-r * 0.22, -r * 1.05 * stretch, -r * 0.12, -r * 1.18 * stretch);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.08, -r * 0.72 * stretch);
    ctx.quadraticCurveTo(r * 0.22, -r * 1.05 * stretch, r * 0.12, -r * 1.18 * stretch);
    ctx.stroke();

    const moon = r * (0.2 + 0.05 * flutter);
    ctx.globalAlpha = jelly ? baseAlpha * 0.75 : baseAlpha * breath * flutter;
    ctx.beginPath();
    ctx.arc(0, -r * 0.08 * stretch, moon * 1.45, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 0.28)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -r * 0.08 * stretch, moon, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 1)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.04, -r * 0.12 * stretch, moon * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = color.ink55;
    ctx.fill();

    const dustN = lod ? 2 : LUNA_DUST.length;
    for (let i = 0; i < dustN; i++) {
        const [sx, sy, sr] = LUNA_DUST[i];
        const tw = 0.5 + 0.5 * Math.sin(time * 0.008 + i * 1.6);
        ctx.globalAlpha = baseAlpha * tw * (jelly ? 0.65 : breath);
        ctx.beginPath();
        ctx.arc(sx * r, sy * r * stretch, sr * r, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0
            ? `rgba(${color.mothLavenderRgb}, 1)`
            : `rgba(${color.lanternGoldRgb}, 1)`;
        ctx.fill();
    }

    ctx.restore();
}

function drawWishHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.005);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.14 * turn;
    const lod = !!ship.game?.iosDrawLod;
    const pulse = 0.82 + 0.18 * Math.sin(time * 0.0072);

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.55, 'wish');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 0.16)`;
    ctx.fill();

    wishPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.strokeStyle = `rgba(${color.lanternGoldRgb}, 1)`;
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.globalAlpha = baseAlpha * (jelly ? 0.4 : breath * 0.5);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.85 * stretch);
    ctx.lineTo(0, r * 0.35 * stretch);
    ctx.stroke();

    ctx.globalAlpha = jelly ? baseAlpha * 0.8 : baseAlpha * breath * pulse;
    ctx.beginPath();
    ctx.arc(0, -r * 0.05 * stretch, r * 0.22 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 0.35)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -r * 0.05 * stretch, r * 0.14 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 1)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -r * 0.05 * stretch, r * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 248, 230, 1)';
    ctx.fill();

    if (!lod) {
        const wobble = jelly ? jelly.shake * 2 : 0;
        for (let i = 0; i < 3; i++) {
            const a = time * 0.0024 + i * (Math.PI * 2 / 3) + wobble;
            const orbit = r * (0.95 + 0.12 * i);
            const sx = Math.cos(a) * orbit * 0.55;
            const sy = Math.sin(a) * orbit * 0.38 * stretch;
            const tw = 0.55 + 0.45 * Math.sin(time * 0.009 + i);
            ctx.globalAlpha = baseAlpha * tw * (jelly ? 0.7 : breath);
            ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 1)`;
            ctx.beginPath();
            ctx.arc(sx, sy, r * 0.07, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `rgba(${color.lanternGoldRgb}, 1)`;
            ctx.lineWidth = Math.max(0.6, r * 0.03);
            const arm = r * 0.11;
            ctx.beginPath();
            ctx.moveTo(sx - arm, sy);
            ctx.lineTo(sx + arm, sy);
            ctx.moveTo(sx, sy - arm);
            ctx.lineTo(sx, sy + arm);
            ctx.stroke();
        }
    }

    ctx.restore();
}

const DARNER_VEIN = [
    '48, 186, 168',
    '232, 184, 74',
    '140, 88, 210',
];

function drawDarnerWing(ctx, x, y, span, chord, flip, rgb, alpha, vein) {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
        x + flip * span * 0.38, y - chord,
        x + flip * span * 0.92, y - chord * 0.22,
        x + flip * span, y + chord * 0.12
    );
    ctx.quadraticCurveTo(x + flip * span * 0.42, y + chord * 0.38, x, y);
    ctx.closePath();
    ctx.fillStyle = `rgba(${rgb}, 0.22)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${rgb}, 1)`;
    ctx.lineWidth = Math.max(0.7, span * 0.035);
    ctx.stroke();
    if (vein) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
            x + flip * span * 0.45, y - chord * 0.15,
            x + flip * span * 0.82, y + chord * 0.02
        );
        ctx.stroke();
    }
}

function drawDarnerHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0048);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0042);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.14 * turn;
    const lod = !!ship.game?.iosDrawLod;
    const shimmer = 0.55 + 0.45 * Math.sin(time * 0.008);

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.55, 'darner');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;
    ctx.lineCap = 'round';

    const wingSpan = r * (1.05 + 0.08 * shimmer);
    const pairs = [
        { y: -r * 0.12 * stretch, chord: r * 0.28, span: wingSpan },
        { y: r * 0.18 * stretch, chord: r * 0.24, span: wingSpan * 0.88 },
    ];
    for (let i = 0; i < pairs.length; i++) {
        const w = pairs[i];
        const rgb = DARNER_VEIN[i % DARNER_VEIN.length];
        const a = baseAlpha * (jelly ? 0.7 : breath * shimmer);
        drawDarnerWing(ctx, 0, w.y, w.span, w.chord, 1, rgb, a, !lod);
        drawDarnerWing(ctx, 0, w.y, w.span, w.chord, -1, rgb, a, !lod);
    }

    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;
    darnerPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.globalAlpha = jelly ? baseAlpha * 0.8 : baseAlpha * breath * shimmer;
    ctx.beginPath();
    ctx.arc(0, -r * 0.08 * stretch, r * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 0.32)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -r * 0.08 * stretch, r * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 1)`;
    ctx.fill();

    ctx.restore();
}

function drawPuffHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0046);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.004);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.1 * turn;
    const lod = !!ship.game?.iosDrawLod;
    const tickBreath = 0.88 + 0.12 * Math.sin(time * 0.0052);

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.9, 'puff');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    ctx.beginPath();
    ctx.arc(0, -r * 0.08 * stretch, r * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 0.14)`;
    ctx.fill();

    puffPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.strokeStyle = `rgba(${color.lanternGoldRgb}, 1)`;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.7, r * 0.035);
    const ticks = lod ? 8 : 14;
    const cy = -r * 0.08 * stretch;
    for (let i = 0; i < ticks; i++) {
        const a = (i / ticks) * Math.PI * 2 + time * 0.00035;
        const len = r * (0.62 + 0.1 * tickBreath) * (0.9 + 0.1 * Math.sin(time * 0.006 + i));
        ctx.globalAlpha = baseAlpha * (jelly ? 0.45 : breath * tickBreath * 0.55);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.14, cy + Math.sin(a) * r * 0.14);
        ctx.lineTo(Math.cos(a) * len, cy + Math.sin(a) * len * stretch);
        ctx.stroke();
    }

    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;
    ctx.strokeStyle = color.ink;
    ctx.lineWidth = Math.max(1.2, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.62 * stretch);
    ctx.lineTo(0, r * 1.02 * stretch);
    ctx.stroke();

    ctx.restore();
}

const ARGUS_SPOTS = [
    [0, 0.78, 0.18],
    [-0.42, 0.64, 0.15],
    [0.42, 0.64, 0.15],
    [-0.24, 0.94, 0.12],
    [0.24, 0.94, 0.12],
];

function drawArgusHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0048);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0042);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.14 * turn;
    const lod = !!ship.game?.iosDrawLod;
    const pulse = 0.72 + 0.28 * Math.sin(time * 0.0064);

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.75, 'argus');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const feathers = lod ? 5 : 7;
    ctx.lineWidth = Math.max(0.9, r * 0.04);
    for (let i = 0; i < feathers; i++) {
        const t = feathers === 1 ? 0 : (i / (feathers - 1)) * 2 - 1;
        const tipX = t * r * 1.12;
        const tipY = r * (0.92 + 0.2 * (1 - Math.abs(t))) * stretch;
        const baseY = r * 0.28 * stretch;
        ctx.globalAlpha = baseAlpha * (jelly ? 0.45 : breath * 0.5);
        ctx.beginPath();
        ctx.moveTo(t * r * 0.1, baseY);
        ctx.quadraticCurveTo(tipX * 0.28, r * 0.5 * stretch, tipX, tipY);
        ctx.quadraticCurveTo(tipX * 0.62, r * 0.58 * stretch, t * r * 0.22, baseY + r * 0.06);
        ctx.closePath();
        ctx.fillStyle = 'rgba(42, 168, 158, 0.28)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(42, 168, 158, 1)';
        ctx.stroke();
    }

    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;
    argusPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    const spots = lod ? ARGUS_SPOTS.slice(0, 3) : ARGUS_SPOTS;
    for (let i = 0; i < spots.length; i++) {
        const [sx, sy, sr] = spots[i];
        const tw = 0.55 + 0.45 * Math.sin(time * 0.007 + i * 1.3);
        const mix = 0.5 + 0.5 * Math.sin(time * 0.0055 + i);
        ctx.globalAlpha = baseAlpha * tw * (jelly ? 0.75 : breath * pulse);
        ctx.beginPath();
        ctx.arc(sx * r, sy * r * stretch, sr * r * (0.85 + 0.15 * pulse), 0, Math.PI * 2);
        ctx.fillStyle = mix > 0.5
            ? `rgba(42, 168, 158, 1)`
            : `rgba(${color.lanternGoldRgb}, 1)`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx * r, sy * r * stretch, sr * r * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = mix > 0.5
            ? `rgba(${color.lanternGoldRgb}, 1)`
            : 'rgba(18, 22, 28, 1)';
        ctx.fill();
    }

    ctx.restore();
}

function drawChimeHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.0048);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.12 * turn;
    const sway = Math.sin(time * 0.0062) * 0.16;
    const lod = !!ship.game?.iosDrawLod;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.85, 'chime');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha * 0.85 : baseAlpha * breath * 0.72;

    chimePath(ctx, -r * 0.88, r * 0.12 * stretch, r * 0.42, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();
    chimePath(ctx, r * 0.88, r * 0.12 * stretch, r * 0.42, stretch);
    ctx.fill();

    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;
    chimePath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, -r * 0.18 * stretch, r * 1.05, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 0.14)`;
    ctx.fill();

    ctx.strokeStyle = `rgba(${color.lanternGoldRgb}, 1)`;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.8, r * 0.045);
    const clappers = lod
        ? [{ x: 0, y: 0, s: 1 }]
        : [{ x: 0, y: 0, s: 1 }, { x: -0.88, y: 0.12, s: 0.42 }, { x: 0.88, y: 0.12, s: 0.42 }];
    for (let i = 0; i < clappers.length; i++) {
        const c = clappers[i];
        const side = i === 0 ? sway : sway * (i === 1 ? -0.7 : 0.7);
        const bx = c.x * r;
        const by = c.y * r * stretch;
        const br = r * c.s;
        ctx.globalAlpha = baseAlpha * (jelly ? 0.55 : breath * 0.65);
        ctx.beginPath();
        ctx.moveTo(bx, by + br * 0.12 * stretch);
        ctx.lineTo(bx + side * br, by + br * 0.42 * stretch);
        ctx.stroke();
        ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 1)`;
        ctx.beginPath();
        ctx.arc(bx + side * br, by + br * 0.48 * stretch, br * 0.09, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

/** Four-point sparkle (diamond + cross) — Merlin hull glitter. */
function merlinSparkle(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.28, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.28, y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - size * 1.7, y);
    ctx.lineTo(x + size * 1.7, y);
    ctx.moveTo(x, y - size * 1.7);
    ctx.lineTo(x, y + size * 1.7);
    ctx.stroke();
}

/** Spark-falcon — ultra-slim needle, prism heart, orbiting 4-point stars. */
function drawMerlinHull(ctx, ship, screenY, time = performance.now()) {
    const breath = 0.92 + 0.05 * Math.sin(time * 0.005);
    const scale = 0.97 + 0.03 * Math.sin(time * 0.0044);
    const r = ship.radius * 0.95 * scale;
    const bank = ship.bank ?? 0;
    const turn = Math.min(1, Math.abs(bank) / MAX_BANK);
    const stretch = 1 + 0.14 * turn;
    const lod = !!ship.game?.iosDrawLod;
    const pulse = 0.82 + 0.18 * Math.sin(time * 0.0074);
    const ry = r * stretch;

    const jelly = beginHullFrame(ctx, ship, screenY, bank, time, 0.55, 'merlin');
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;

    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.32, ry * 1.18, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 0.22)`;
    ctx.fill();
    ctx.globalAlpha = (jelly ? baseAlpha : baseAlpha * breath) * 0.14;
    ctx.beginPath();
    ctx.ellipse(r * 0.08, 0, r * 0.16, ry * 0.95, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(90, 210, 200, 1)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-r * 0.08, 0, r * 0.16, ry * 0.95, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 140, 180, 1)';
    ctx.fill();

    ctx.globalAlpha = jelly ? baseAlpha : baseAlpha * breath;
    merlinPath(ctx, 0, 0, r, stretch);
    ctx.fillStyle = color.ink;
    ctx.fill();
    ctx.strokeStyle = `rgba(${color.lanternGoldRgb}, 1)`;
    ctx.lineWidth = Math.max(0.7, r * 0.032);
    ctx.lineJoin = 'round';
    ctx.globalAlpha = baseAlpha * (jelly ? 0.55 : breath * 0.7);
    merlinPath(ctx, 0, 0, r, stretch);
    ctx.stroke();

    ctx.strokeStyle = `rgba(${color.lanternGoldRgb}, 1)`;
    ctx.lineWidth = Math.max(0.7, r * 0.038);
    ctx.lineCap = 'round';
    ctx.globalAlpha = baseAlpha * (jelly ? 0.5 : breath * 0.62);
    ctx.beginPath();
    ctx.moveTo(0, -ry * 1.02);
    ctx.lineTo(0, ry * 0.48);
    ctx.stroke();

    const heartA = jelly ? baseAlpha * 0.9 : baseAlpha * breath * pulse;
    const hx = 0;
    const hy = -ry * 0.02;
    ctx.globalAlpha = heartA * 0.42;
    ctx.fillStyle = `rgba(${color.lanternGoldRgb}, 1)`;
    ctx.strokeStyle = `rgba(${color.lanternGoldRgb}, 1)`;
    ctx.lineWidth = Math.max(0.55, r * 0.026);
    merlinSparkle(ctx, hx, hy, r * 0.16 * pulse);
    ctx.globalAlpha = heartA;
    ctx.fillStyle = 'rgba(255, 248, 230, 1)';
    ctx.strokeStyle = 'rgba(255, 248, 230, 1)';
    merlinSparkle(ctx, hx, hy, r * 0.07 * pulse);

    const palettes = [
        color.lanternGoldRgb,
        '90, 210, 200',
        '255, 140, 180',
        '180, 150, 255',
        '255, 248, 230',
        color.lanternGoldRgb,
        '90, 210, 200',
    ];
    const wobble = jelly ? jelly.shake * 2.4 : 0;
    const starN = lod ? 4 : 7;
    for (let i = 0; i < starN; i++) {
        const a = time * 0.0036 + i * (Math.PI * 2 / starN) + wobble;
        const orbit = r * (0.42 + 0.08 * (i % 4));
        const sx = Math.cos(a) * orbit * 0.55;
        const sy = Math.sin(a * 1.15) * orbit * 0.28 * stretch;
        const tw = 0.45 + 0.55 * Math.sin(time * 0.014 + i * 1.7);
        const rgb = palettes[i % palettes.length];
        ctx.globalAlpha = baseAlpha * tw * (jelly ? 0.82 : breath);
        ctx.fillStyle = `rgba(${rgb}, 1)`;
        ctx.strokeStyle = `rgba(${rgb}, 1)`;
        ctx.lineWidth = Math.max(0.5, r * 0.022);
        merlinSparkle(ctx, sx, sy, r * (0.055 + 0.03 * tw));
    }

    const moteN = lod ? 3 : 6;
    for (let i = 0; i < moteN; i++) {
        const y = -ry * 0.78 + i * ry * 0.26;
        const tw = 0.35 + 0.65 * Math.sin(time * 0.02 + i * 2.1);
        const rgb = palettes[i % palettes.length];
        ctx.globalAlpha = baseAlpha * tw * (jelly ? 0.7 : breath * 0.85);
        ctx.fillStyle = `rgba(${rgb}, 1)`;
        ctx.strokeStyle = `rgba(${rgb}, 1)`;
        ctx.lineWidth = Math.max(0.4, r * 0.016);
        merlinSparkle(ctx, (i % 2 === 0 ? 1 : -1) * r * 0.03, y, r * 0.028 * tw);
    }

    ctx.restore();
}

const focus = {
    id: 'focus',
    name: 'Focus',
    blurb: 'Precise. Instrumental.',
    hitbox: CIRCLE_HITBOX,
    wallTrailMode: 'ripple',

    drawHull(ctx, ship, screenY, time) {
        drawCircleHull(ctx, ship, screenY, time);
    },

    drawTrail(ctx, ship, trail, toScreenY) {
        drawDotTrail(ctx, ship, trail, toScreenY, { rippleBoop: true });
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
    blurb: 'Paired. Twin dotted traces.',
    hitbox: DART_HITBOX,
    wallTrailMode: 'ripple',

    drawHull: drawDartHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawTwinDotTrail(ctx, ship, trail, toScreenY, { rippleBoop: true });
    },
};

const wisp = {
    id: 'wisp',
    name: 'Wisp',
    blurb: 'Weightless. Sheds sparks.',
    hitbox: TEAR_HITBOX,
    wallTrailMode: 'flare',
    ...iap('wisp'),

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
    ...iap('pulse'),
    ...LONG_WAKE,

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
    ...iap('quill'),
    ...LONG_WAKE,

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

// Smooth ogive arrow + Quill ribbon with dawn stacked along the wake.
const fletch = {
    id: 'fletch',
    name: 'Fletch',
    blurb: 'A smooth arrow. Dawn on the wake.',
    hitbox: FLETCH_HITBOX,
    wallTrailMode: 'spring',
    ...iap('fletch'),
    ...LONG_WAKE,
    // Nest the ribbon in the nock so hull and wake read as one piece.
    trailTailOffset: 0.32,

    drawHull: drawFletchHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawHorizonRibbonTrail(ctx, ship, trail, toScreenY, {
            widthScale: 0.58,
            alpha: 0.9,
        });
    },
};

// Echo's sparrow wings + Nyan paint — longer rainbow stripe wake.
const nyan = {
    id: 'nyan',
    name: 'Nyan',
    blurb: 'A long rainbow line of travel.',
    hitbox: CRESCENT_HITBOX,
    wallTrailMode: 'spring',
    ...iap('nyan'),
    // ~2× default wake: more samples + slower fade so the rainbow stretches.
    trailMaxPoints: 160,
    trailFade: 1 / 360,

    drawHull: drawNyanHull,
    // Rainbow starts at the crescent centre (under the hull), not behind it.
    trailTailOffset: 0,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawRainbowRibbonTrail(ctx, ship, trail, toScreenY, {
            widthScale: 0.85,
            alpha: 0.9,
        });
    },
};

const shard = {
    id: 'shard',
    name: 'Shard',
    blurb: 'Faceted. A hard wake.',
    hitbox: SHARD_HITBOX,
    wallTrailMode: 'shatter',
    ...iap('shard'),
    ...LONG_WAKE,

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
    ...iap('halo'),

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
    ...iap('needle'),

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
    ...iap('echo'),
    ...LONG_WAKE,

    drawHull: drawCrescentHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawTwinTrail(ctx, ship, trail, toScreenY, { desyncBoop: true });
    },
};

const dusk = {
    id: 'dusk',
    name: 'Dusk',
    blurb: 'Crescent. A violet cloud.',
    hitbox: CRESCENT_HITBOX,
    wallTrailMode: 'ripple',
    ...iap('dusk'),
    ...LONG_WAKE,
    drawHull: drawCrescentHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawCloudTrail(ctx, ship, trail, toScreenY, {
            rgb: color.saberRgb,
            rippleBoop: true,
            densityScale: 2,
            rippleScale: 0.4,
            scatter: 'dust',
            scatterWidth: 1.4,
        });
    },
};

const seal = {
    id: 'seal',
    name: 'Seal',
    blurb: 'Pressed tiles. Peels at the wall.',
    hitbox: SQUARE_HITBOX,
    wallTrailMode: 'blot',
    ...iap('seal'),
    ...LONG_WAKE,
    drawHull: drawStampHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawStampTrail(ctx, ship, trail, toScreenY, { blotBoop: true });
    },
};

const hatch = {
    id: 'hatch',
    name: 'Hatch',
    blurb: 'Lateral marks. Stretches on impact.',
    hitbox: SQUARE_HITBOX,
    wallTrailMode: 'pile',
    ...iap('hatch'),
    ...LONG_WAKE,
    drawHull: drawSquareHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawTickTrail(ctx, ship, trail, toScreenY, { wallStretch: true });
    },
};

const trace = {
    id: 'trace',
    name: 'Trace',
    blurb: 'One thin line. Springs on a bounce.',
    hitbox: SQUARE_HITBOX,
    wallTrailMode: 'spring',
    ...iap('trace'),
    ...LONG_WAKE,
    drawHull: drawSquareHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawHairlineTrail(ctx, ship, trail, toScreenY);
    },
};

const ring = {
    id: 'ring',
    name: 'Ring',
    blurb: 'Blooming rings. Squash, no pop.',
    hitbox: SQUARE_HITBOX,
    wallTrailMode: 'pile',
    ...iap('ring'),
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
    ...iap('fold'),
    ...LONG_WAKE,
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
    wallTrailMode: 'ripple',
    ...iap('mote'),
    ...LONG_WAKE,
    drawHull: drawMoteHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawCloudTrail(ctx, ship, trail, toScreenY, {
            rippleBoop: true,
            rippleScale: 0.55,
        });
    },
};

const spine = {
    id: 'spine',
    name: 'Spine',
    blurb: 'Upright. A ladder wake.',
    hitbox: SPINE_HITBOX,
    wallTrailMode: 'ladder',
    ...iap('spine'),
    ...LONG_WAKE,
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
    ...iap('orbit'),
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
    ...iap('ink'),
    ...LONG_WAKE,
    drawHull: drawTearHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawRibbonTrail(ctx, ship, trail, toScreenY, {
            // Slightly wider so the script whip + flecks read on wall hits.
            widthScale: 0.62,
            alpha: 0.9,
            smudge: true,
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
    ...iap('flux'),
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
    ...iap('cinder'),
    ...LONG_WAKE,
    drawHull: drawCinderHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawCinderTrail(ctx, ship, trail, toScreenY);
    },
};

// Free — Needle hull with a slim bright-purple lightsaber wake.
const saber = {
    id: 'saber',
    name: 'Saber',
    blurb: 'A slim violet blade. Crackle on the wake.',
    hitbox: NEEDLE_HITBOX,
    wallTrailMode: 'whip',
    // ~2× default wake so the blade stretches like Nyan's rainbow.
    trailMaxPoints: 160,
    trailFade: 1 / 360,

    drawHull: drawNeedleHull,

    drawTrail(ctx, ship, trail, toScreenY) {
        drawSaberTrail(ctx, ship, trail, toScreenY);
    },
};

const lantern = {
    id: 'lantern',
    name: 'Lantern',
    blurb: 'A living bell. Gold heart. Plankton in the dark.',
    hitbox: LANTERN_HITBOX,
    wallTrailMode: 'cloud',
    skipHullCache: true,
    ...iap('lantern'),
    ...LONG_WAKE,
    trailTailOffset: 0.42,
    drawHull: drawLanternHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawLanternTrail(ctx, ship, trail, toScreenY);
    },
};

const bloom = {
    id: 'bloom',
    name: 'Bloom',
    blurb: 'Soap-film spheres. Prism motes. They pop on the wall.',
    hitbox: BLOOM_HITBOX,
    wallTrailMode: 'pile',
    skipHullCache: true,
    ...iap('bloom'),
    ...LONG_WAKE,
    trailTailOffset: 0,
    drawHull: drawBloomHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawBloomTrail(ctx, ship, trail, toScreenY);
    },
};

const lyra = {
    id: 'lyra',
    name: 'Lyra',
    blurb: 'A star-forged craft. Aurora in its wake.',
    hitbox: LYRA_HITBOX,
    wallTrailMode: 'flare',
    skipHullCache: true,
    ...iap('lyra'),
    ...LONG_WAKE,
    trailTailOffset: 0,
    drawHull: drawLyraHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawLyraTrail(ctx, ship, trail, toScreenY);
    },
};

const sprout = {
    id: 'sprout',
    name: 'Sprout',
    blurb: 'A living seed. Pollen on the wind.',
    hitbox: SPROUT_HITBOX,
    wallTrailMode: 'cloud',
    skipHullCache: true,
    ...iap('sprout'),
    ...LONG_WAKE,
    trailTailOffset: 0.45,
    drawHull: drawSproutHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawLanternTrail(ctx, ship, trail, toScreenY, {
            palettes: [color.sproutGreenRgb, color.lanternGoldRgb, color.sproutGreenRgb],
            filamentRgb: [color.sproutGreenRgb, color.lanternGoldRgb, color.sproutGreenRgb],
        });
    },
};

const plume = {
    id: 'plume',
    name: 'Plume',
    blurb: 'A firebird. Embers rise, then cool.',
    hitbox: PLUME_HITBOX,
    wallTrailMode: 'whip',
    skipHullCache: true,
    ...iap('plume'),
    ...LONG_WAKE,
    trailTailOffset: 0.28,
    drawHull: drawPlumeHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawPlumeTrail(ctx, ship, trail, toScreenY);
    },
};

const koi = {
    id: 'koi',
    name: 'Koi',
    blurb: 'A river spirit. Scales in the current.',
    hitbox: KOI_HITBOX,
    wallTrailMode: 'whip',
    skipHullCache: true,
    ...iap('koi'),
    ...LONG_WAKE,
    trailTailOffset: 0.5,
    drawHull: drawKoiHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawKoiTrail(ctx, ship, trail, toScreenY);
    },
};

const spore = {
    id: 'spore',
    name: 'Spore',
    blurb: 'A living cap. Amber heart. Spores in the dark.',
    hitbox: SPORE_HITBOX,
    wallTrailMode: 'cloud',
    skipHullCache: true,
    ...iap('spore'),
    ...LONG_WAKE,
    trailTailOffset: 0.38,
    drawHull: drawSporeHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawLanternTrail(ctx, ship, trail, toScreenY, {
            palettes: [color.sporeAmberRgb, color.sporeVioletRgb, '120, 200, 160'],
            filamentRgb: [color.sporeAmberRgb, color.sporeVioletRgb, color.sporeAmberRgb],
            densityScale: 1.45,
        });
    },
};

const boreal = {
    id: 'boreal',
    name: 'Boreal',
    blurb: 'A ribbon of northern light. It waves on the wall.',
    hitbox: BOREAL_HITBOX,
    wallTrailMode: 'spring',
    skipHullCache: true,
    ...iap('boreal'),
    ...LONG_WAKE,
    trailTailOffset: 0,
    drawHull: drawBorealHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawBorealTrail(ctx, ship, trail, toScreenY);
    },
};

const luna = {
    id: 'luna',
    name: 'Luna',
    blurb: 'A lunar moth. Moon heart. Dust on the wind.',
    hitbox: LUNA_HITBOX,
    wallTrailMode: 'cloud',
    skipHullCache: true,
    ...iap('luna'),
    ...LONG_WAKE,
    trailTailOffset: 0.22,
    drawHull: drawLunaHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawLunaTrail(ctx, ship, trail, toScreenY);
    },
};

const wish = {
    id: 'wish',
    name: 'Wish',
    blurb: 'A bottled comet. Stars fall from its wake.',
    hitbox: WISH_HITBOX,
    wallTrailMode: 'flare',
    skipHullCache: true,
    ...iap('wish'),
    ...LONG_WAKE,
    trailTailOffset: 0,
    drawHull: drawWishHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawWishTrail(ctx, ship, trail, toScreenY);
    },
};

const darner = {
    id: 'darner',
    name: 'Darner',
    blurb: 'A needle of light. Mosaic scales in its wake.',
    hitbox: DARNER_HITBOX,
    wallTrailMode: 'flare',
    skipHullCache: true,
    ...iap('darner'),
    ...LONG_WAKE,
    trailTailOffset: 0.28,
    drawHull: drawDarnerHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawDarnerTrail(ctx, ship, trail, toScreenY);
    },
};

const puff = {
    id: 'puff',
    name: 'Puff',
    blurb: 'A dandelion clock. Seeds drift from its wake.',
    hitbox: PUFF_HITBOX,
    wallTrailMode: 'cloud',
    skipHullCache: true,
    ...iap('puff'),
    ...LONG_WAKE,
    trailTailOffset: 0.42,
    drawHull: drawPuffHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawPuffTrail(ctx, ship, trail, toScreenY);
    },
};

const argus = {
    id: 'argus',
    name: 'Argus',
    blurb: 'A peacock fan. Eyespots stamp the path.',
    hitbox: ARGUS_HITBOX,
    wallTrailMode: 'pile',
    skipHullCache: true,
    ...iap('argus'),
    ...LONG_WAKE,
    trailTailOffset: 0.22,
    drawHull: drawArgusHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawArgusTrail(ctx, ship, trail, toScreenY);
    },
};

const chime = {
    id: 'chime',
    name: 'Chime',
    blurb: 'Temple bells. Sound rings down the wake.',
    hitbox: CHIME_HITBOX,
    wallTrailMode: 'ripple',
    skipHullCache: true,
    ...iap('chime'),
    ...LONG_WAKE,
    trailTailOffset: 0.38,
    drawHull: drawChimeHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawChimeTrail(ctx, ship, trail, toScreenY);
    },
};

const merlin = {
    id: 'merlin',
    name: 'Merlin',
    blurb: 'A spark-falcon. Stars pour from its wake.',
    hitbox: MERLIN_HITBOX,
    wallTrailMode: 'flare',
    skipHullCache: true,
    ...iap('merlin'),
    ...LONG_WAKE,
    trailTailOffset: 0.22,
    drawHull: drawMerlinHull,
    drawTrail(ctx, ship, trail, toScreenY) {
        drawMerlinTrail(ctx, ship, trail, toScreenY);
    },
};

export const SKIN_DEFS = [
    focus, flicker, ember, saber, wisp, pulse, quill, fletch, nyan,
    shard, halo, needle, echo, dusk,
    seal, hatch, trace, ring,
    fold, mote, spine, orbit, ink,
    flux, cinder, lantern, bloom,
    lyra, sprout, plume, koi, spore, boreal,
    luna, wish, darner, puff, argus, chime, merlin,
];
