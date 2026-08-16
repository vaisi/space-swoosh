// trails.js
// Wake renderers shared by the ship skins. Each takes the raw world-space trail
// plus a world->screen Y mapper and draws in screen space.
// Changes:
// - Fletch `drawHorizonRibbonTrail`: Quill ribbon with length-wise dawn
//   strata (not Nyan's side-by-side lanes). Solid fills, cheap-canvas safe.
// - Dusk cloud: densityScale 2, scatter 'dust' (along-wake jitter, no polar
//   rings), scatterWidth 1.4, milder rippleScale. Mote stays polar + full ripple.
// - drawCloudTrail densityScale / rippleScale / scatter options.
// - Mote/Dusk cloud: hull-to-tail rippleBoop (size + spread pulse, dies off).
// - Focus/Ember `rippleBoop`: hull-to-tail cartoon pulse from hulls.rippleEnvelope.
// - Saber `drawSaberTrail`: slim bright-purple lightsaber blade (bloom + body
//   + hot core) with seed-stable crackle sparks; denser/hotter on wall jelly.
// - Theme toggle: trail defaults read `color.inkRgb` at draw time (no snapshot).
// - Night paper: trail ink follows `color.inkRgb` (was hard-coded near-black,
//   which vanished on charcoal).
// - Nyan: `drawRainbowRibbonTrail` — stacked Nyan-Cat stripe bands along the
//   path normals (parallel ribbons, tip fade). Cheap Canvas uses flat fills.
// - Ink reverseBoop: stronger calligraphic pressure pulse + tip ink flecks
//   during wall jelly (script deform still owns the path whip).
// - Phase 1 cheap Canvas: skip createLinearGradient on ribbons (flat fill).
// - iOS draw LOD (via game.iosDrawLod): skip ribbon smudge pass, skip
//   dense-mark midpoints, thin Mote cloud dots — Safari fill-rate relief only.
// - Flux `drawDashTrail`: alternating ink / signal dashes (new trail type).
// - Cinder `drawCinderTrail`: calm ember ribbon + cool ash dots (no time
//   jitter); soft ink edge; sparse signal glints on boop.
// - Fold crease: hull-locked attach (zig→0 at body), denser/longer wake.
// - Orbit wake redesigned: continuous lagging orbital ribbon + dense ellipse
//   ticks along a smoothed path (no sparse 2-ring ghost).
// - Ink reverseBoop no longer flips point order; script deform keeps the
//   newest ribbon points locked to the hull during wall jelly.
// - Mote cloud: organic radial micro-dot scatter again (messy Focus cousin);
//   golden-ratio hashes keep L/R balance without mirrored pairs.
// - Per-ship wall-boop extras: Halo bubbles, Echo desync, Shard fan, Ember
//   twin-dot ripple, Seal blot, Focus ripple / Pulse dense, Wisp flare, Hatch stretch.
// - Needle hairline whip + tip ripples. wallTrailDeform on discrete marks.
// - wakePoints / ribbonPath reuse scratch arrays (iOS GC).

import { color } from '../brand/tokens.js';
import { withHeading, wallTrailDeform, WALL_JELLY_MS, TRAIL_WAVE_MS, rippleEnvelope } from './hulls.js';

const wakeScratch = [];
const ribbonLeft = [];
const ribbonRight = [];
/** Offset centreline for rainbow stripe bands (reused per band). */
const bandCenter = [];

/** Classic Nyan Cat pop-stripe RGBs (outer → inner order is left-of-path first). */
const NYAN_RGB = [
    '255, 0, 102',
    '255, 153, 0',
    '255, 230, 0',
    '51, 204, 51',
    '0, 153, 255',
    '153, 51, 255',
];

/** Fletch dawn strata — tip (oldest) → hull (newest). Length-wise, not Nyan lanes. */
const FLETCH_RGB = [
    '72, 48, 118',
    '48, 142, 154',
    '255, 214, 118',
    '255, 142, 64',
    '232, 72, 58',
];

const KNOWN_MODES = new Set([
    'pile', 'spring', 'whip', 'desync', 'scatter', 'shatter', 'blot',
    'dense', 'ripple', 'flare', 'crease', 'cloud', 'ladder', 'lag', 'script',
    'flick', 'cinder',
]);

function trailMode(ship) {
    const mode = ship._wallTrailMode;
    return KNOWN_MODES.has(mode) ? mode : 'spring';
}

function jellyEnergy(ship, now = performance.now()) {
    const j = ship?.wallJelly;
    if (!j) return 0;
    const elapsed = now - j.t0;
    if (elapsed < 0 || elapsed >= WALL_JELLY_MS) return 0;
    const t = elapsed / WALL_JELLY_MS;
    return Math.exp(-1.4 * t);
}

function scratchPoint(i) {
    let p = wakeScratch[i];
    if (!p) {
        p = { x: 0, y: 0, opacity: 0, angle: 0, seed: 0.5, sx: 1, sy: 1 };
        wakeScratch[i] = p;
    }
    return p;
}

// Trail order is oldest -> newest. The live tail is appended so the wake stays
// attached to the hull between samples.
function wakePoints(ship, trail, toScreenY) {
    const now = performance.now();
    const mode = trailMode(ship);
    const n = trail.length;
    const denom = Math.max(1, n - 1);
    for (let i = 0; i < n; i++) {
        const src = trail[i];
        const p = scratchPoint(i);
        const seed = src.seed ?? 0.5;
        const along = n <= 1 ? 1 : i / denom;
        const d = wallTrailDeform(ship, now, { seed, along, mode });
        p.x = src.x + d.dx;
        p.y = toScreenY(src.y + d.dy);
        p.opacity = src.opacity;
        p.angle = src.angle ?? 0;
        p.seed = seed;
        p.sx = d.sx;
        p.sy = d.sy;
    }

    let count = n;
    const tail = ship.tailPoint?.();
    if (tail) {
        const d = wallTrailDeform(ship, now, { seed: 0.5, along: 1, mode });
        const screenX = tail.x + d.dx;
        const screenY = toScreenY(tail.y + d.dy);
        const last = count > 0 ? wakeScratch[count - 1] : null;
        const angle = ship.tangent ?? 0;
        const ahead = last
            ? (screenX - last.x) * Math.sin(angle) - (screenY - last.y) * Math.cos(angle)
            : 1;

        if (ahead > 0.5) {
            const live = scratchPoint(count);
            live.x = screenX;
            live.y = screenY;
            live.opacity = 1;
            live.angle = angle;
            live.seed = 0.5;
            live.sx = d.sx;
            live.sy = d.sy;
            count++;
        }
    }

    wakeScratch.length = count;
    return wakeScratch;
}

function traceSmooth(ctx, pts, startNewSubpath) {
    if (!pts.length) return;

    if (startNewSubpath) ctx.moveTo(pts[0].x, pts[0].y);
    else ctx.lineTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }

    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
}

function edgePoint(bucket, i) {
    let p = bucket[i];
    if (!p) {
        p = { x: 0, y: 0 };
        bucket[i] = p;
    }
    return p;
}

function ribbonPath(ctx, pts, widthAt, i0 = 0, i1 = -1) {
    const end = i1 < 0 ? pts.length - 1 : i1;
    const n = end - i0 + 1;
    if (n < 2) return;
    for (let k = 0; k < n; k++) {
        const i = i0 + k;
        const prev = pts[Math.max(i0, i - 1)];
        const next = pts[Math.min(end, i + 1)];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const w = widthAt(i);

        const L = edgePoint(ribbonLeft, k);
        const R = edgePoint(ribbonRight, k);
        L.x = pts[i].x + nx * w;
        L.y = pts[i].y + ny * w;
        R.x = pts[i].x - nx * w;
        R.y = pts[i].y - ny * w;
    }
    ribbonLeft.length = n;
    ribbonRight.length = n;

    ctx.beginPath();
    traceSmooth(ctx, ribbonLeft, true);
    if (n) {
        ctx.lineTo(ribbonRight[n - 1].x, ribbonRight[n - 1].y);
        for (let i = n - 2; i > 0; i--) {
            const mx = (ribbonRight[i].x + ribbonRight[i - 1].x) / 2;
            const my = (ribbonRight[i].y + ribbonRight[i - 1].y) / 2;
            ctx.quadraticCurveTo(ribbonRight[i].x, ribbonRight[i].y, mx, my);
        }
        if (n > 1) ctx.lineTo(ribbonRight[0].x, ribbonRight[0].y);
    }
    ctx.closePath();
}

export function drawDotTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { rgb = color.inkRgb, denseBoop = false, rippleBoop = false } = opts;
    const now = performance.now();
    const mode = trailMode(ship);
    const n = trail.length;
    const denom = Math.max(1, n - 1);
    const dotScale = ship.game?.config?.spacecraft?.trailDotSize ?? 0.2;
    const baseSize = ship.radius * dotScale;
    const jelly = denseBoop ? jellyEnergy(ship, now) : 0;
    const j = ship?.wallJelly;
    const rippleElapsed = rippleBoop && j ? now - j.t0 : -1;

    for (let i = 0; i < n; i++) {
        const point = trail[i];
        const along = n <= 1 ? 1 : i / denom;
        const d = wallTrailDeform(ship, now, {
            seed: point.seed ?? 0.5,
            along,
            mode,
        });
        const env = rippleElapsed >= 0 ? rippleEnvelope(rippleElapsed, along) : 0;
        let sizeBoost = 1;
        let alphaBoost = 1;
        if (env > 0) {
            // Cartoon pop: ~2x at the wave peak, brighter while it hits.
            sizeBoost = 1 + env * 1.15;
            alphaBoost = 1 + env * 0.85;
        } else if (jelly > 0) {
            sizeBoost = 1 + jelly * 0.85 * along * along;
            alphaBoost = 1 + jelly * 0.35 * along;
        }
        const rx = baseSize * d.sx * sizeBoost;
        const ry = baseSize * d.sy * sizeBoost;
        ctx.beginPath();
        ctx.ellipse(
            point.x + d.dx,
            toScreenY(point.y + d.dy),
            rx,
            ry,
            0,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = `rgba(${rgb}, ${Math.min(1, point.opacity * alphaBoost)})`;
        ctx.fill();
    }
}

/** Two parallel dotted traces — Echo's twin layout, Focus marks, denser/smaller. Ember. */
export function drawTwinDotTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const {
        rgb = color.inkRgb,
        sepScale = 0.5,
        rippleBoop = false,
        sizeScale = 0.62,
        subdiv = 2,
    } = opts;
    const dotScale = ship.game?.config?.spacecraft?.trailDotSize ?? 0.2;
    const baseSize = ship.radius * dotScale * sizeScale;
    const sep = ship.radius * sepScale;
    const j = ship?.wallJelly;
    const rippleElapsed = rippleBoop && j ? performance.now() - j.t0 : -1;
    const marks = denseTrailMarks(ship, trail, toScreenY, subdiv);

    for (let i = 0; i < marks.length; i++) {
        const p = marks[i];
        const along = p.along ?? 0.5;
        const env = rippleElapsed >= 0 ? rippleEnvelope(rippleElapsed, along) : 0;
        const sizeBoost = env > 0 ? 1 + env * 1.15 : 1;
        const alphaBoost = env > 0 ? 1 + env * 0.85 : 1;
        const rx = baseSize * (p.sx ?? 1) * sizeBoost;
        const ry = baseSize * (p.sy ?? 1) * sizeBoost;
        const angle = p.angle ?? 0;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        const fade = 0.4 + 0.6 * p.opacity;
        const ox = nx * sep * fade;
        const oy = ny * sep * fade;
        const alpha = Math.min(1, p.opacity * alphaBoost);
        ctx.fillStyle = `rgba(${rgb}, ${alpha})`;

        ctx.beginPath();
        ctx.ellipse(p.x - ox, p.y - oy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(p.x + ox, p.y + oy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function iosBudget(ship) {
    return !!ship?.game?.iosDrawLod;
}

export function drawRibbonTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const {
        widthScale = 1,
        alpha = 0.8,
        smudge = true,
        rgb = color.inkRgb,
        reverseBoop = false,
    } = opts;
    const pts = wakePoints(ship, trail, toScreenY);
    if (pts.length < 3) return;

    // Soft outer smudge is a second full gradient fill — drop on iOS Safari.
    const useSmudge = smudge && !iosBudget(ship);

    // Ink / script: tip/mid reverse lives in wallTrailDeform('script').
    // Never reverse point order — that yanked the ribbon off the hull.
    const now = performance.now();
    const energy = reverseBoop ? jellyEnergy(ship, now) : 0;

    const maxWidth = ship.radius * 0.6 * widthScale;
    const last = pts.length - 1;
    const widthAt = (i) => {
        const t = i / last;
        // Calligraphic pressure: tip thins hard, mid swells, hull stays fat.
        let pressure = 1;
        if (energy > 0) {
            const tipThin = 1 - energy * 0.55 * Math.pow(1 - t, 1.15);
            const midSwell = 1 + energy * 0.7 * Math.sin(t * Math.PI) * Math.sin(t * Math.PI);
            pressure = tipThin * midSwell;
        }
        return maxWidth * Math.pow(t, 0.6) * (0.45 + 0.55 * pts[i].opacity) * pressure;
    };

    const chord = Math.hypot(pts[last].x - pts[0].x, pts[last].y - pts[0].y);
    let gradient = `rgba(${rgb}, ${alpha * 0.7})`;

    // Cheap Canvas / kill=gradients: avoid per-frame gradient allocation.
    const skipGrad = !!ship?.game?.cheapCanvas
        || ship?.game?.perfFlags?.kill?.has?.('gradients');
    if (chord > 1 && !skipGrad) {
        gradient = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[last].x, pts[last].y);
        gradient.addColorStop(0, `rgba(${rgb}, 0)`);
        gradient.addColorStop(0.45, `rgba(${rgb}, ${alpha * 0.55})`);
        gradient.addColorStop(1, `rgba(${rgb}, ${alpha})`);
    }

    ctx.save();
    const baseAlpha = ctx.globalAlpha;

    if (useSmudge) {
        // Extra bloom on boop so the flourish reads even on a thin ribbon.
        const smudgeScale = energy > 0 ? 2.2 + energy * 1.4 : 2.2;
        ribbonPath(ctx, pts, (i) => widthAt(i) * smudgeScale);
        ctx.globalAlpha = baseAlpha * (0.22 + energy * 0.18);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.globalAlpha = baseAlpha;
    }

    ribbonPath(ctx, pts, widthAt);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Tip ink flecks — pen-lift spray while the script whip is live.
    if (reverseBoop && energy > 0.08 && !iosBudget(ship)) {
        const side = ship.wallJelly?.side < 0 ? -1 : 1;
        const r = ship.radius ?? 10;
        const tipCount = Math.min(5, Math.floor(pts.length * 0.35));
        for (let k = 0; k < tipCount; k++) {
            const p = pts[k];
            const seed = p.seed ?? (k + 0.3) / tipCount;
            const alongTip = 1 - k / Math.max(1, tipCount - 1);
            const ang = (p.angle ?? 0) + side * (0.6 + seed * 1.4);
            const dist = r * (0.35 + seed * 1.1) * energy * alongTip;
            const fx = p.x + Math.cos(ang) * dist * side;
            const fy = p.y + Math.sin(ang) * dist * 0.75;
            const fr = r * (0.06 + seed * 0.1) * (0.55 + energy * 0.7);
            ctx.beginPath();
            ctx.arc(fx, fy, fr, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${rgb}, ${Math.min(0.85, p.opacity * energy * (0.45 + alongTip * 0.4))})`;
            ctx.fill();
        }
    }

    ctx.restore();
}

/**
 * Quill-like ribbon split into parallel Nyan Cat colour bands.
 * Bands sit side-by-side across the wake width (not a length-wise hue ramp).
 */
export function drawRainbowRibbonTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const {
        widthScale = 0.95,
        alpha = 0.92,
        bands = NYAN_RGB,
    } = opts;
    const pts = wakePoints(ship, trail, toScreenY);
    if (pts.length < 3) return;

    const bandCount = bands.length;
    if (bandCount < 1) return;

    const halfTotal = ship.radius * 0.58 * widthScale;
    const bandHalf = halfTotal / bandCount;
    const last = pts.length - 1;
    const n = pts.length;

    const skipGrad = !!ship?.game?.cheapCanvas
        || ship?.game?.perfFlags?.kill?.has?.('gradients');

    ctx.save();
    const baseAlpha = ctx.globalAlpha;

    for (let b = 0; b < bandCount; b++) {
        const centerOffset = (b - (bandCount - 1) / 2) * (bandHalf * 2);
        const rgb = bands[b];

        for (let i = 0; i < n; i++) {
            const prev = pts[Math.max(0, i - 1)];
            const next = pts[Math.min(n - 1, i + 1)];
            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;

            let p = bandCenter[i];
            if (!p) {
                p = { x: 0, y: 0, opacity: 1 };
                bandCenter[i] = p;
            }
            p.x = pts[i].x + nx * centerOffset;
            p.y = pts[i].y + ny * centerOffset;
            p.opacity = pts[i].opacity;
        }
        bandCenter.length = n;

        const widthAt = (i) => {
            const t = i / last;
            return bandHalf * Math.pow(t, 0.55) * (0.5 + 0.5 * pts[i].opacity);
        };

        const chord = Math.hypot(
            bandCenter[last].x - bandCenter[0].x,
            bandCenter[last].y - bandCenter[0].y,
        );
        let fill = `rgba(${rgb}, ${alpha * 0.75})`;
        if (chord > 1 && !skipGrad) {
            fill = ctx.createLinearGradient(
                bandCenter[0].x, bandCenter[0].y,
                bandCenter[last].x, bandCenter[last].y,
            );
            fill.addColorStop(0, `rgba(${rgb}, 0)`);
            fill.addColorStop(0.35, `rgba(${rgb}, ${alpha * 0.55})`);
            fill.addColorStop(1, `rgba(${rgb}, ${alpha})`);
        }

        ribbonPath(ctx, bandCenter, widthAt);
        ctx.globalAlpha = baseAlpha;
        ctx.fillStyle = fill;
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Quill-like single ribbon with colour bands stacked along the path
 * (horizontal strata when flying up). Opposite of Nyan's side-by-side lanes.
 */
export function drawHorizonRibbonTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const {
        widthScale = 0.58,
        alpha = 0.9,
        bands = FLETCH_RGB,
    } = opts;
    const pts = wakePoints(ship, trail, toScreenY);
    if (pts.length < 3) return;

    const bandCount = bands.length;
    if (bandCount < 1) return;

    const last = pts.length - 1;
    const maxWidth = ship.radius * 0.6 * widthScale;
    const widthAt = (i) => {
        const t = i / last;
        return maxWidth * Math.pow(t, 0.6) * (0.45 + 0.55 * pts[i].opacity);
    };

    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = baseAlpha;

    for (let b = 0; b < bandCount; b++) {
        const i0 = Math.max(0, Math.floor((b / bandCount) * last) - 1);
        const i1 = Math.min(last, Math.ceil(((b + 1) / bandCount) * last) + 1);
        if (i1 - i0 < 2) continue;
        ribbonPath(ctx, pts, widthAt, i0, i1);
        ctx.fillStyle = `rgba(${bands[b]}, ${alpha})`;
        ctx.fill();
    }

    ctx.restore();
}

export function drawStreakTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { step = 2, alpha = 0.75, sparkBoop = false, rippleBoop = false } = opts;
    const r = ship.radius;
    const now = performance.now();
    const mode = trailMode(ship);
    const n = trail.length;
    const denom = Math.max(1, n - 1);
    const stretch = Math.min(1.7, 0.65 + (ship.speed ?? 0) / (r * 0.75));
    const energy = sparkBoop ? jellyEnergy(ship, now) : 0;
    const side = ship.wallJelly?.side < 0 ? -1 : 1;
    const j = ship?.wallJelly;
    const rippleElapsed = rippleBoop && j ? now - j.t0 : -1;
    const waveLive = rippleElapsed >= 0 && rippleElapsed < TRAIL_WAVE_MS;
    const drawStep = waveLive ? 1 : step;

    ctx.save();
    ctx.fillStyle = color.ink;
    const baseAlpha = ctx.globalAlpha;

    for (let i = n - 1; i >= 0; i -= drawStep) {
        const p = trail[i];
        const along = n <= 1 ? 1 : i / denom;
        const d = wallTrailDeform(ship, now, {
            seed: p.seed ?? 0.5,
            along,
            mode,
        });
        const seed = p.seed ?? 0.5;
        const env = rippleElapsed >= 0 ? rippleEnvelope(rippleElapsed, along) : 0;
        let sparkX = 0;
        let sparkY = 0;
        let lenPulse = 1;
        if (env > 0) {
            const kick = env * r * 1.4;
            sparkX = -side * kick;
            sparkY = kick * 0.28 * (seed * 2 - 1);
            lenPulse = 1 + env * 0.85;
        } else if (energy > 0) {
            const spark = energy * (seed * 2 - 1) * r * 1.15 * (0.4 + 0.6 * (1 - along));
            sparkX = spark * side * 0.15;
            sparkY = spark * 0.55;
            lenPulse = 1 + energy * 0.25 * (1 - along);
        }
        const length = r * (0.3 + 0.8 * p.opacity) * stretch * d.sy * lenPulse;
        const width = r * (0.09 + 0.24 * p.opacity) * d.sx;

        ctx.globalAlpha = baseAlpha * p.opacity * alpha * (env > 0 ? 1 + env * 0.35 : 1);
        withHeading(
            ctx,
            p.x + d.dx + sparkX,
            toScreenY(p.y + d.dy) + sparkY,
            (p.angle ?? 0) + sparkY * 0.04,
            (c) => {
                c.beginPath();
                c.ellipse(0, 0, width, length, 0, 0, Math.PI * 2);
                c.fill();
            },
        );
    }

    ctx.restore();
}

export function drawWispTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { emberStep = 4, flareBoop = false } = opts;

    drawRibbonTrail(ctx, ship, trail, toScreenY, {
        widthScale: 0.4,
        alpha: 0.7,
        smudge: false,
    });

    const r = ship.radius;
    ctx.save();
    ctx.fillStyle = color.ink;
    const baseAlpha = ctx.globalAlpha;

    const now = performance.now();
    const mode = trailMode(ship);
    const n = trail.length;
    const denom = Math.max(1, n - 1);
    const energy = flareBoop ? jellyEnergy(ship, now) : 0;

    for (let i = n - 1; i >= 0; i -= emberStep) {
        const p = trail[i];
        const along = n <= 1 ? 1 : i / denom;
        const d = wallTrailDeform(ship, now, {
            seed: p.seed ?? 0.5,
            along,
            mode,
        });
        const age = 1 - p.opacity;
        const angle = p.angle ?? 0;
        const flare = 1 + energy * 2.2;
        const drift = ((p.seed ?? 0.5) * 2 - 1) * r * 1.6 * age * flare;
        const size = r * 0.17 * (0.35 + 0.65 * p.opacity) * (1 + energy * 0.6);

        ctx.globalAlpha = baseAlpha * p.opacity * (0.55 + energy * 0.25);
        ctx.beginPath();
        ctx.arc(
            p.x + d.dx + Math.cos(angle) * drift,
            toScreenY(p.y + d.dy) + Math.sin(angle) * drift,
            size,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    ctx.restore();
}

/** Build denser sample list: every trail point + `subdiv` in-betweens. */
function denseTrailMarks(ship, trail, toScreenY, subdiv = 1) {
    const now = performance.now();
    const mode = trailMode(ship);
    const marks = [];
    const len = trail.length;
    const denom = Math.max(1, len - 1);
    // Extra marks roughly multiply count — skip on the iOS canvas budget.
    const withMids = !iosBudget(ship) && subdiv > 0;
    for (let i = 0; i < len; i++) {
        const p = trail[i];
        const seed = p.seed ?? (i * 0.17) % 1;
        const along = len <= 1 ? 1 : i / denom;
        const d = wallTrailDeform(ship, now, { seed, along, mode });
        marks.push({
            x: p.x + d.dx,
            y: toScreenY(p.y + d.dy),
            opacity: p.opacity,
            angle: p.angle ?? 0,
            scale: 1,
            sx: d.sx,
            sy: d.sy,
            seed,
            along,
        });
        if (withMids && i < len - 1) {
            const nxt = trail[i + 1];
            const nxtAlong = (i + 1) / denom;
            const nxtSeed = nxt.seed ?? seed;
            for (let s = 1; s <= subdiv; s++) {
                const t = s / (subdiv + 1);
                const u = 1 - t;
                const subSeed = (p.seed ?? seed) * u + nxtSeed * t;
                const subAlong = along * u + nxtAlong * t;
                const md = wallTrailDeform(ship, now, { seed: subSeed, along: subAlong, mode });
                marks.push({
                    x: p.x * u + nxt.x * t + md.dx,
                    y: toScreenY(p.y * u + nxt.y * t + md.dy),
                    opacity: p.opacity * u + nxt.opacity * t,
                    angle: Math.atan2(
                        Math.sin(p.angle ?? 0) * u + Math.sin(nxt.angle ?? 0) * t,
                        Math.cos(p.angle ?? 0) * u + Math.cos(nxt.angle ?? 0) * t
                    ),
                    scale: 0.82,
                    sx: md.sx,
                    sy: md.sy,
                    seed: subSeed,
                    along: subAlong,
                });
            }
        }
    }
    return marks;
}

/** Paper-cut V marks along the path — Shard. */
export function drawChevronTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.88, shatterBoop = false } = opts;
    const r = ship.radius;
    const marks = denseTrailMarks(ship, trail, toScreenY);
    const energy = shatterBoop ? jellyEnergy(ship) : 0;
    const side = ship.wallJelly?.side < 0 ? -1 : 1;

    ctx.save();
    ctx.strokeStyle = color.ink;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const baseAlpha = ctx.globalAlpha;

    for (let i = marks.length - 1; i >= 0; i--) {
        const p = marks[i];
        const sx = p.sx ?? 1;
        const sy = p.sy ?? 1;
        const seed = p.seed ?? 0.5;
        const along = p.along ?? 0.5;
        // Crystal crack: fan open against the wall, then restack.
        const fan = energy * (seed * 2 - 1) * 0.55 * (0.5 + 0.5 * (1 - along));
        const armX = r * (0.22 + 0.38 * p.opacity) * p.scale * sx * (1 + energy * 0.35);
        const armY = r * (0.22 + 0.38 * p.opacity) * p.scale * sy;
        const width = r * (0.05 + 0.08 * p.opacity) * p.scale;

        ctx.globalAlpha = baseAlpha * p.opacity * alpha;
        ctx.lineWidth = width;
        withHeading(
            ctx,
            p.x + side * r * 0.15 * energy * (1 - along),
            p.y,
            p.angle + fan,
            (c) => {
                c.beginPath();
                c.moveTo(-armX * 0.7, armY * 0.55);
                c.lineTo(0, -armY * 0.15);
                c.lineTo(armX * 0.7, armY * 0.55);
                c.stroke();
            },
        );
    }

    ctx.restore();
}

/** Hollow rings that bloom as they age — Halo (+ soap-bubble boop). */
export function drawRingTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.72, bubbleBoop = false } = opts;
    const r = ship.radius;
    const marks = denseTrailMarks(ship, trail, toScreenY);
    const now = performance.now();
    const energy = bubbleBoop ? jellyEnergy(ship, now) : 0;
    const side = ship.wallJelly?.side < 0 ? -1 : 1;
    const t = ship.wallJelly
        ? Math.max(0, Math.min(1, (now - ship.wallJelly.t0) / WALL_JELLY_MS))
        : 1;

    ctx.save();
    ctx.strokeStyle = color.ink;
    ctx.fillStyle = color.ink;
    const baseAlpha = ctx.globalAlpha;

    for (let i = marks.length - 1; i >= 0; i--) {
        const p = marks[i];
        const age = 1 - p.opacity;
        // Soap bubbles: young rings inflate + stack toward wall, then pop/collapse.
        let inflate = 1;
        let stack = 0;
        let pop = 1;
        if (energy > 0 && p.opacity > 0.35) {
            const youth = p.opacity;
            inflate = 1 + energy * 1.4 * youth * Math.sin(Math.PI * Math.min(1, t * 1.6));
            stack = side * r * 0.55 * energy * youth * youth * (i % 3) * 0.22;
            // Late-phase collapse inward.
            pop = t < 0.55 ? 1 : Math.max(0.15, 1 - (t - 0.55) * 2.2 * energy);
        }
        const ringR = r * (0.16 + age * 0.95) * p.scale * inflate * pop;
        const width = r * (0.055 + 0.04 * p.opacity) * p.scale;
        const fade = baseAlpha * p.opacity * alpha * (0.4 + 0.6 * (1 - age)) * pop;
        const sx = (p.sx ?? 1) * (bubbleBoop && energy ? 1 + energy * 0.15 : 1);
        const sy = (p.sy ?? 1);

        ctx.globalAlpha = fade;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.ellipse(p.x + stack, p.y, ringR * sx, ringR * sy, 0, 0, Math.PI * 2);
        ctx.stroke();

        if (p.opacity > 0.55) {
            ctx.globalAlpha = fade * (0.22 + energy * 0.18);
            ctx.beginPath();
            ctx.ellipse(
                p.x + stack,
                p.y,
                ringR * 0.45 * sx,
                ringR * 0.45 * sy,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    }

    ctx.restore();
}

/** Single stroked centreline — Needle. Optional tip ripples on wall boop. */
export function drawHairlineTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.9, widthScale = 1, tipRipple = false } = opts;
    const pts = wakePoints(ship, trail, toScreenY);
    if (pts.length < 2) return;

    let drawPts = pts;
    if (tipRipple && ship.wallJelly) {
        const now = performance.now();
        const elapsed = now - ship.wallJelly.t0;
        if (elapsed >= 0 && elapsed < WALL_JELLY_MS) {
            const t = elapsed / WALL_JELLY_MS;
            const energy = Math.exp(-1.35 * t);
            const side = ship.wallJelly.side < 0 ? -1 : 1;
            const r = ship.radius ?? 10;
            const n = pts.length;
            const denom = Math.max(1, n - 1);
            drawPts = [];
            for (let i = 0; i < n; i++) {
                const p = pts[i];
                const along = i / denom;
                const endW = Math.pow(1 - along, 1.35);
                const seed = (p.seed ?? 0.5) * Math.PI;
                const curl = Math.sin(along * Math.PI * 2.2 + t * Math.PI * 1.6 + seed * 0.4);
                const soft = Math.sin(along * Math.PI * 3.6 + t * Math.PI * 2.1 + seed) * 0.38;
                const wave = curl + soft;
                const amp = r * 0.9 * endW * energy;
                const angle = p.angle ?? 0;
                const nx = Math.cos(angle);
                const ny = Math.sin(angle);
                drawPts.push({
                    x: p.x + nx * wave * amp * side,
                    y: p.y + ny * wave * amp * 0.55,
                    opacity: p.opacity,
                    angle: p.angle,
                    seed: p.seed,
                });
            }
        }
    }

    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = baseAlpha * alpha;
    ctx.strokeStyle = color.ink;
    ctx.lineWidth = Math.max(1, ship.radius * 0.09 * widthScale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    traceSmooth(ctx, drawPts, true);
    ctx.stroke();
    ctx.restore();
}

/** Two parallel hairlines offset along the path normal — Echo (desync on boop). */
export function drawTwinTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.8, sepScale = 0.55, desyncBoop = false } = opts;
    const pts = wakePoints(ship, trail, toScreenY);
    if (pts.length < 2) return;

    const sep = ship.radius * sepScale;
    const now = performance.now();
    const energy = desyncBoop ? jellyEnergy(ship, now) : 0;
    const side = ship.wallJelly?.side < 0 ? -1 : 1;
    const left = [];
    const right = [];

    for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const angle = p.angle ?? 0;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        const fade = 0.35 + 0.65 * p.opacity;
        const along = pts.length <= 1 ? 1 : i / Math.max(1, pts.length - 1);

        // One line sticks to the wall; the other springs late — then snap in phase.
        let lExtra = 0;
        let rExtra = 0;
        if (energy > 0) {
            const stick = energy * side * ship.radius * 0.55 * along;
            const late = energy * side * ship.radius * 0.2
                * Math.sin(along * Math.PI * 2 + (now * 0.02));
            lExtra = stick;
            rExtra = -late * (1 - along * 0.3);
        }

        left.push({
            x: p.x - nx * sep * fade + lExtra,
            y: p.y - ny * sep * fade,
        });
        right.push({
            x: p.x + nx * sep * fade + rExtra,
            y: p.y + ny * sep * fade,
        });
    }

    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = baseAlpha * alpha;
    ctx.strokeStyle = color.ink;
    ctx.lineWidth = Math.max(1, ship.radius * 0.1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    traceSmooth(ctx, left, true);
    ctx.stroke();
    ctx.beginPath();
    traceSmooth(ctx, right, true);
    ctx.stroke();

    ctx.restore();
}

/** Filled squares stamped along the path — Seal. */
export function drawStampTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.82, blotBoop = false } = opts;
    const r = ship.radius;
    const marks = denseTrailMarks(ship, trail, toScreenY);
    const now = performance.now();
    const energy = blotBoop ? jellyEnergy(ship, now) : 0;
    const t = ship.wallJelly
        ? Math.max(0, Math.min(1, (now - ship.wallJelly.t0) / WALL_JELLY_MS))
        : 1;

    ctx.save();
    ctx.fillStyle = color.ink;
    const baseAlpha = ctx.globalAlpha;

    for (let i = marks.length - 1; i >= 0; i--) {
        const p = marks[i];
        const along = p.along ?? 0.5;
        // Dense tile blot at contact, then peel (rubber-stamp moment).
        let blot = 1;
        let peel = 0;
        if (energy > 0) {
            blot = 1 + energy * 1.6 * along * along * (t < 0.45 ? 1 : Math.max(0.2, 1.3 - t));
            peel = energy * (1 - along) * Math.max(0, t - 0.35) * r * 0.4;
        }
        const half = r * (0.14 + 0.22 * p.opacity) * p.scale * blot;
        const hx = half * (p.sx ?? 1);
        const hy = half * (p.sy ?? 1);

        ctx.globalAlpha = baseAlpha * p.opacity * alpha * (1 - peel * 0.02);
        withHeading(ctx, p.x, p.y + peel, p.angle, (c) => {
            c.fillRect(-hx, -hy, hx * 2, hy * 2);
        });
    }

    ctx.restore();
}

/** Short hatch marks perpendicular to travel — Hatch. */
export function drawTickTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.85, wallStretch = false } = opts;
    const r = ship.radius;
    const marks = denseTrailMarks(ship, trail, toScreenY);
    const energy = wallStretch ? jellyEnergy(ship) : 0;
    const side = ship.wallJelly?.side < 0 ? -1 : 1;

    ctx.save();
    ctx.strokeStyle = color.ink;
    ctx.lineCap = 'round';
    const baseAlpha = ctx.globalAlpha;

    for (let i = marks.length - 1; i >= 0; i--) {
        const p = marks[i];
        const along = p.along ?? 0.5;
        const stretch = 1 + energy * 0.9 * along;
        const half = r * (0.22 + 0.4 * p.opacity) * p.scale * (p.sx ?? 1) * stretch;
        const width = r * (0.055 + 0.07 * p.opacity) * p.scale * (p.sy ?? 1);

        ctx.globalAlpha = baseAlpha * p.opacity * alpha;
        ctx.lineWidth = width;
        withHeading(
            ctx,
            p.x + side * r * 0.12 * energy * along,
            p.y,
            p.angle,
            (c) => {
                c.beginPath();
                c.moveTo(-half, 0);
                c.lineTo(half, 0);
                c.stroke();
            },
        );
    }

    ctx.restore();
}

/** Dashed crease line that zigzags harder when banking — Fold. */
export function drawCreaseTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.88 } = opts;
    const pts = wakePoints(ship, trail, toScreenY);
    if (pts.length < 2) return;

    const bank = Math.min(1, Math.abs(ship.bank ?? 0) / 0.96);
    const r = ship.radius;
    const energy = jellyEnergy(ship);

    // Denser samples so the crease reads longer and joins the hull cleanly.
    const dense = [];
    for (let i = 0; i < pts.length; i++) {
        dense.push(pts[i]);
        if (i < pts.length - 1) {
            const a = pts[i];
            const b = pts[i + 1];
            dense.push({
                x: (a.x + b.x) * 0.5,
                y: (a.y + b.y) * 0.5,
                opacity: (a.opacity + b.opacity) * 0.5,
                angle: a.angle ?? 0,
            });
        }
    }

    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    ctx.strokeStyle = color.ink;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const n = dense.length;
    const denom = Math.max(1, n - 1);
    const zigPts = [];
    for (let i = 0; i < n; i++) {
        const p = dense[i];
        const along = i / denom;
        // Hull lock: zig amplitude → 0 at the body; full fold farther back.
        const leave = Math.pow(1 - along, 1.15);
        const amp = r * (0.12 + 0.62 * bank + energy * 0.4)
            * (0.35 + 0.65 * Math.pow(p.opacity, 0.55))
            * leave;
        const sign = (i % 2 === 0) ? 1 : -1;
        const angle = p.angle ?? 0;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        zigPts.push({
            x: p.x + nx * amp * sign,
            y: p.y + ny * amp * sign * 0.4,
        });
    }

    // Soft longer under-crease so the wake reads farther behind the kite.
    ctx.globalAlpha = baseAlpha * alpha * 0.28;
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.setLineDash([]);
    ctx.beginPath();
    traceSmooth(ctx, zigPts, true);
    ctx.stroke();

    ctx.globalAlpha = baseAlpha * alpha;
    ctx.lineWidth = Math.max(1.2, r * 0.11);
    ctx.setLineDash([r * 0.55, r * 0.22]);
    ctx.beginPath();
    traceSmooth(ctx, zigPts, true);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

/** Soft cloud of micro-dots. Optional hull-to-tail ripple on boop (Mote / Dusk). */
export function drawCloudTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const {
        alpha = 0.78,
        rgb = color.inkRgb,
        rippleBoop = false,
        densityScale = 1,
        rippleScale = 1,
        scatter = 'cloud',
        scatterWidth = 1,
    } = opts;
    const r = ship.radius;
    const now = performance.now();
    const mode = trailMode(ship);
    const n = trail.length;
    const denom = Math.max(1, n - 1);
    const jelly = rippleBoop ? 0 : jellyEnergy(ship, now);
    const j = ship?.wallJelly;
    const rippleElapsed = rippleBoop && j ? now - j.t0 : -1;
    const deformK = rippleBoop ? rippleScale : 1;

    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    ctx.fillStyle = `rgba(${rgb}, 1)`;

    for (let i = 0; i < n; i++) {
        const p = trail[i];
        const along = n <= 1 ? 1 : i / denom;
        const seed = p.seed ?? 0.5;
        const d = wallTrailDeform(ship, now, { seed, along, mode });
        const dx = d.dx * deformK;
        const dy = d.dy * deformK;
        const sx = 1 + (d.sx - 1) * deformK;
        const age = 1 - p.opacity;
        const env = rippleElapsed >= 0 ? rippleEnvelope(rippleElapsed, along) * rippleScale : 0;
        const condense = jelly > 0 ? (1 - jelly * along * 0.65) : 1;
        // Messy Focus cousin: several independent dots in a soft radial cloud.
        // Hashes are zero-mean in angle (not mirrored pairs) so it stays organic
        // without always leaning one screen side. iOS: 2–3 dots (was 1–2).
        const count = Math.max(1, Math.round((iosBudget(ship)
            ? 2 + ((fract(seed * 17.13) * 2) | 0)
            : 6 + ((fract(seed * 17.13) * 3) | 0)) * densityScale));
        const screenY = toScreenY(p.y + dy);
        const sizeBoost = env > 0 ? 1 + env * 1.2 : 1;
        const spreadBoost = 1 + env * 0.85 + jelly * 0.95;
        const prev = i > 0 ? trail[i - 1] : p;
        const next = i < n - 1 ? trail[i + 1] : p;
        for (let k = 0; k < count; k++) {
            let specX;
            let specY;
            let radial;
            let size;
            if (scatter === 'dust') {
                // Along-wake + sideways jitter. Polar disks stack into rings
                // once density goes up; this fills the segment instead.
                const h = seed * 41.17 + k * 19.19 + i * 0.031;
                const tx = next.x - prev.x;
                const ty = next.y - prev.y;
                const len = Math.hypot(tx, ty) || 1;
                const ux = tx / len;
                const uy = ty / len;
                const alongN = (hash11(h + 0.11) * 2 - 1) * (len * 0.48);
                const sideU = hash11(h + 2.27) * 2 - 1;
                const side = sideU * sideU * sideU;
                const spread = r * (0.14 + age * 0.7) * spreadBoost * scatterWidth;
                const w = hash11(h + 5.91);
                specX = p.x + dx + ux * alongN - uy * side * spread * condense;
                specY = toScreenY(p.y + dy + uy * alongN + ux * side * spread * condense);
                radial = Math.min(1, Math.abs(side) * 0.85 + Math.abs(alongN) / (len + r) * 0.35);
                size = r * (0.03 + 0.08 * p.opacity) * (0.35 + w * 0.8) * sx * sizeBoost;
            } else {
                const u = fract(seed * 12.9898 + k * 0.6180339887);
                const v = fract(seed * 78.233 + k * 0.3819660113);
                const w = fract(seed * 4.1414 + k * 0.7548776662);
                const ang = u * Math.PI * 2;
                radial = Math.sqrt(v);
                const spread = r * (0.28 + age * 1.15) * spreadBoost * (0.35 + 0.9 * radial);
                size = r * (0.04 + 0.07 * p.opacity) * (0.55 + w * 0.45) * sx * sizeBoost;
                specX = p.x + dx + Math.cos(ang) * spread * condense;
                specY = screenY + Math.sin(ang) * spread * condense;
            }
            ctx.globalAlpha = baseAlpha * p.opacity * alpha
                * (0.4 + 0.6 * (1 - radial * 0.55))
                * (env > 0 ? 1 + env * 0.7 : 1);
            ctx.beginPath();
            ctx.arc(specX, specY, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

function fract(x) {
    return x - Math.floor(x);
}

function hash11(n) {
    return fract(Math.sin(n) * 43758.5453123);
}

/** Ladder of rungs along the path — Spine. */
export function drawLadderTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.86, step = 1 } = opts;
    const r = ship.radius;
    const marks = denseTrailMarks(ship, trail, toScreenY);
    const energy = jellyEnergy(ship);
    const side = ship.wallJelly?.side < 0 ? -1 : 1;

    ctx.save();
    ctx.strokeStyle = color.ink;
    ctx.lineCap = 'round';
    const baseAlpha = ctx.globalAlpha;

    // Thin spine line
    const pts = wakePoints(ship, trail, toScreenY);
    if (pts.length >= 2) {
        ctx.globalAlpha = baseAlpha * alpha * 0.45;
        ctx.lineWidth = Math.max(1, r * 0.06);
        ctx.beginPath();
        traceSmooth(ctx, pts, true);
        ctx.stroke();
    }

    for (let i = marks.length - 1; i >= 0; i -= step) {
        const p = marks[i];
        const along = p.along ?? 0.5;
        // Rungs compress toward the wall on boop (sy from ladder mode + extra).
        const compress = (p.sy ?? 1) * (1 - energy * 0.35 * along);
        const half = r * (0.28 + 0.35 * p.opacity) * p.scale * (p.sx ?? 1) * compress;
        const width = r * (0.05 + 0.06 * p.opacity) * p.scale;

        ctx.globalAlpha = baseAlpha * p.opacity * alpha;
        ctx.lineWidth = width;
        withHeading(
            ctx,
            p.x + side * r * 0.2 * energy * along,
            p.y,
            p.angle,
            (c) => {
                c.beginPath();
                c.moveTo(-half, 0);
                c.lineTo(half, 0);
                c.stroke();
            },
        );
    }

    ctx.restore();
}

/** Continuous lagging orbital path — Orbit (dense ellipses + soft ribbon). */
export function drawLagEllipseTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.8 } = opts;
    const pts = wakePoints(ship, trail, toScreenY);
    if (pts.length < 2) return;

    const r = ship.radius;
    const energy = jellyEnergy(ship);
    const n = pts.length;
    const denom = Math.max(1, n - 1);

    // Lag the wake a beat behind the hull for orbital chase feel.
    const lagSteps = Math.max(1, Math.min(4, Math.floor(n * 0.08)));
    const lagged = [];
    for (let i = 0; i < n; i++) {
        const src = pts[i];
        const older = pts[Math.max(0, i - lagSteps)];
        const along = i / denom;
        const blend = 0.22 + 0.2 * (1 - along);
        lagged.push({
            x: src.x * (1 - blend) + older.x * blend,
            y: src.y * (1 - blend) + older.y * blend,
            opacity: src.opacity,
            angle: src.angle ?? 0,
            along,
        });
    }

    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    ctx.strokeStyle = color.ink;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Soft elliptical ribbon (continuous path, not two sparse rings).
    const widthAt = (i) => {
        const t = i / denom;
        const age = 1 - lagged[i].opacity;
        return r * (0.16 + 0.28 * t) * (0.55 + 0.45 * lagged[i].opacity)
            * (1 + age * 0.35 + energy * 0.2);
    };
    ribbonPath(ctx, lagged, widthAt);
    ctx.globalAlpha = baseAlpha * alpha * 0.22;
    ctx.fillStyle = color.ink;
    ctx.fill();

    // Centre hairline so the orbit reads as one continuous path.
    ctx.globalAlpha = baseAlpha * alpha * 0.55;
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath();
    traceSmooth(ctx, lagged, true);
    ctx.stroke();

    // Dense hollow ellipse ticks along the smoothed lag path.
    const tickStep = Math.max(1, Math.floor(n / 28));
    for (let i = 0; i < n; i += tickStep) {
        const p = lagged[i];
        const age = 1 - p.opacity;
        const leave = Math.pow(1 - p.along, 0.85);
        // Near the hull, ticks shrink into the ring so attach reads clean.
        const rx = r * (0.22 + age * 0.55) * (0.35 + 0.65 * leave) * (1 + energy * 0.15);
        const ry = rx * (0.55 + 0.2 * Math.sin(p.along * Math.PI * 3));
        const fade = baseAlpha * alpha * p.opacity * (0.35 + 0.65 * leave);

        ctx.globalAlpha = fade;
        ctx.lineWidth = Math.max(0.9, r * (0.04 + 0.03 * p.opacity));
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, Math.max(0.5, rx), Math.max(0.5, ry), p.angle, 0, Math.PI * 2);
        ctx.stroke();

        // Tiny orbital tick marks on older samples.
        if (leave > 0.35 && p.opacity > 0.2) {
            const tick = r * 0.12 * leave;
            const nx = Math.cos(p.angle);
            const ny = Math.sin(p.angle);
            ctx.globalAlpha = fade * 0.7;
            ctx.lineWidth = Math.max(0.8, r * 0.035);
            ctx.beginPath();
            ctx.moveTo(p.x - nx * tick, p.y - ny * tick);
            ctx.lineTo(p.x + nx * tick, p.y + ny * tick);
            ctx.stroke();
        }
    }

    ctx.restore();
}

/**
 * Alternating ink / Signal-Blue dashes along the path — Flux.
 * New trail type: discrete colored segments, not a continuous ribbon.
 */
export function drawDashTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const {
        alpha = 0.9,
        inkRgb = color.inkRgb,
        signalRgb = color.signalRgb,
    } = opts;
    const r = ship.radius;
    const marks = denseTrailMarks(ship, trail, toScreenY);
    const energy = jellyEnergy(ship);
    const n = marks.length;
    if (n < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    const baseAlpha = ctx.globalAlpha;

    for (let i = 0; i < n - 1; i++) {
        const a = marks[i];
        const b = marks[i + 1];
        // Skip every other gap so dashes read as beads, not a solid line.
        if ((i & 1) === 1) continue;
        const along = a.along ?? i / Math.max(1, n - 1);
        const useSignal = (i >> 1) % 2 === 0;
        const rgb = useSignal ? signalRgb : inkRgb;
        const lenBoost = 1 + energy * 0.9 * along;
        const width = r * (0.1 + 0.08 * a.opacity) * (a.sx ?? 1) * (1 + energy * 0.25 * along);

        // Stretch dash endpoints slightly on boop (flick mode sy).
        const mx = (a.x + b.x) * 0.5;
        const my = (a.y + b.y) * 0.5;
        const dx = (b.x - a.x) * 0.5 * lenBoost * (a.sy ?? 1);
        const dy = (b.y - a.y) * 0.5 * lenBoost * (a.sy ?? 1);

        ctx.globalAlpha = baseAlpha * alpha * Math.min(a.opacity, b.opacity) * (useSignal ? 0.95 : 0.85);
        ctx.strokeStyle = `rgba(${rgb}, 1)`;
        ctx.lineWidth = Math.max(1.2, width);
        ctx.beginPath();
        ctx.moveTo(mx - dx, my - dy);
        ctx.lineTo(mx + dx, my + dy);
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Calm warm wake — Cinder.
 * Soft ember ribbon (path-locked, no time jitter) that cools into sparse ash
 * dots toward the old end. Ink hairline for paper read; Signal glints on boop.
 */
export function drawCinderTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const {
        alpha = 0.9,
        inkRgb = color.inkRgb,
        emberRgb = color.emberRgb,
        signalRgb = color.signalRgb,
    } = opts;
    const pts = wakePoints(ship, trail, toScreenY);
    const n = pts.length;
    if (n < 3) return;

    const r = ship.radius;
    const energy = jellyEnergy(ship);
    const denom = Math.max(1, n - 1);

    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Soft ember body — tapers from hull, widens slightly as it cools.
    const emberWidthAt = (i) => {
        const t = i / denom;
        const leave = 1 - t;
        const op = pts[i].opacity;
        return r * (0.14 + 0.22 * t + 0.18 * leave) * (0.5 + 0.5 * op)
            * (1 + energy * 0.25 * t);
    };
    ribbonPath(ctx, pts, emberWidthAt);
    ctx.globalAlpha = baseAlpha * alpha * 0.42;
    ctx.fillStyle = `rgba(${emberRgb}, 1)`;
    ctx.fill();

    // Narrower inner ribbon — hotter near the ship.
    const coreWidthAt = (i) => {
        const t = i / denom;
        return r * (0.05 + 0.12 * t) * pts[i].opacity * (1 + energy * 0.15 * t);
    };
    ribbonPath(ctx, pts, coreWidthAt);
    ctx.globalAlpha = baseAlpha * alpha * 0.55;
    ctx.fill();

    // Ink hairline so the path stays crisp on paper.
    ctx.globalAlpha = baseAlpha * alpha * 0.5;
    ctx.strokeStyle = `rgba(${inkRgb}, 1)`;
    ctx.lineWidth = Math.max(1, r * 0.055);
    ctx.beginPath();
    traceSmooth(ctx, pts, true);
    ctx.stroke();

    // Cooling ash — seed-stable dots (no animated sway), denser farther back.
    ctx.fillStyle = `rgba(${emberRgb}, 1)`;
    for (let i = 0; i < n; i += 2) {
        const p = pts[i];
        const leave = 1 - i / denom;
        if (leave < 0.25 || p.opacity < 0.18) continue;
        const u = fract((p.seed ?? 0.5) * 12.9898 + i * 0.37);
        const v = fract((p.seed ?? 0.5) * 78.233 + i * 0.19);
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(n - 1, i + 1)];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        // Fixed lateral offset from seed — drifts with the path, doesn't shake.
        const side = (u * 2 - 1) * r * (0.25 + 0.7 * leave);
        const size = r * (0.05 + 0.07 * leave) * (0.6 + v * 0.5);
        ctx.globalAlpha = baseAlpha * alpha * p.opacity * (0.3 + 0.4 * leave);
        ctx.beginPath();
        ctx.arc(p.x + nx * side, p.y + ny * side, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Sparse Signal glints — mostly on wall boop.
    if (energy > 0.08) {
        ctx.fillStyle = `rgba(${signalRgb}, 1)`;
        for (let i = 0; i < n; i += 3) {
            const p = pts[i];
            const t = i / denom;
            const u = fract((p.seed ?? 0.5) * 4.1414 + i * 0.11);
            if (u > 0.55 || p.opacity < 0.25) continue;
            ctx.globalAlpha = baseAlpha * alpha * p.opacity * energy * 0.7;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r * (0.035 + 0.03 * t), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

/**
 * Slim bright-purple lightsaber wake — soft bloom, violet body, hot core,
 * seed-stable crackle sparks (denser / hotter on wall jelly).
 */
export function drawSaberTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const {
        alpha = 0.95,
        widthScale = 0.4,
        rgb = color.saberRgb,
        coreRgb = color.saberCoreRgb,
    } = opts;
    const pts = wakePoints(ship, trail, toScreenY);
    const n = pts.length;
    if (n < 3) return;

    const r = ship.radius;
    const energy = jellyEnergy(ship);
    const denom = Math.max(1, n - 1);
    const skipBloom = iosBudget(ship);

    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Soft outer bloom — skipped on iOS LOD fill-rate budget.
    if (!skipBloom) {
        const bloomWidthAt = (i) => {
            const t = i / denom;
            const op = pts[i].opacity;
            return r * (0.1 + 0.22 * t) * widthScale * (0.55 + 0.45 * op)
                * (1 + energy * 0.35);
        };
        ribbonPath(ctx, pts, bloomWidthAt);
        ctx.globalAlpha = baseAlpha * alpha * (0.28 + energy * 0.22);
        ctx.fillStyle = `rgba(${rgb}, 1)`;
        ctx.fill();
    }

    // Bright violet body — slim blade, hotter near the hull.
    const bodyWidthAt = (i) => {
        const t = i / denom;
        return r * (0.04 + 0.11 * t) * widthScale * pts[i].opacity
            * (1 + energy * 0.2 * t);
    };
    ribbonPath(ctx, pts, bodyWidthAt);
    ctx.globalAlpha = baseAlpha * alpha * (0.78 + energy * 0.18);
    ctx.fillStyle = `rgba(${rgb}, 1)`;
    ctx.fill();

    // Near-white hot core hairline.
    const coreWidthAt = (i) => {
        const t = i / denom;
        return r * (0.015 + 0.04 * t) * widthScale * pts[i].opacity
            * (1 + energy * 0.25);
    };
    ribbonPath(ctx, pts, coreWidthAt);
    ctx.globalAlpha = baseAlpha * alpha * (0.9 + energy * 0.1);
    ctx.fillStyle = `rgba(${coreRgb}, 1)`;
    ctx.fill();

    // Seed-stable crackle sparks along path normals — always on, sparse.
    // Wall jelly densifies and brightens the spray.
    const step = energy > 0.08 ? 1 : 2;
    const sparkChance = energy > 0.08 ? 0.72 : 0.38;
    for (let i = 0; i < n; i += step) {
        const p = pts[i];
        if (p.opacity < 0.18) continue;
        const leave = 1 - i / denom;
        const u = fract((p.seed ?? 0.5) * 12.9898 + i * 0.37);
        if (u > sparkChance) continue;

        const v = fract((p.seed ?? 0.5) * 78.233 + i * 0.19);
        const w = fract((p.seed ?? 0.5) * 4.1414 + i * 0.11);
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(n - 1, i + 1)];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const side = (u * 2 - 1) * r * (0.12 + 0.55 * leave) * (1 + energy * 0.9);
        const size = r * (0.03 + 0.045 * leave) * (0.55 + v * 0.55)
            * (1 + energy * 0.65);
        const useCore = w > 0.55;
        ctx.fillStyle = useCore ? `rgba(${coreRgb}, 1)` : `rgba(${rgb}, 1)`;
        ctx.globalAlpha = baseAlpha * alpha * p.opacity
            * (0.35 + 0.35 * leave + energy * 0.45);
        ctx.beginPath();
        ctx.arc(p.x + nx * side, p.y + ny * side, size, 0, Math.PI * 2);
        ctx.fill();

        // Extra tip flecks while the whip is live.
        if (energy > 0.12 && leave > 0.55 && w > 0.4) {
            const ang = (p.angle ?? 0) + (u - 0.5) * 2.2;
            const dist = r * (0.2 + v * 0.7) * energy;
            ctx.globalAlpha = baseAlpha * alpha * p.opacity * energy * 0.75;
            ctx.beginPath();
            ctx.arc(
                p.x + Math.cos(ang) * dist,
                p.y + Math.sin(ang) * dist * 0.8,
                size * 0.7,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    }

    ctx.restore();
}
