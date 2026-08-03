// trails.js
// Wake renderers shared by the ship skins. Each takes the raw world-space trail
// plus a world->screen Y mapper and draws in screen space.
// Changes:
// - Wall-trail physics: every wake uses `wallTrailDeform` (pile vs spring from
//   `ship._wallTrailMode`) with along-trail falloff; discrete marks also squash.
// - Wall-jelly trail nudge: Square wakes squiggle in world X while the hull
//   is bouncing, so the path feels physical without blurring the ink.
// - Added stamp (Bloc) and tick (Mark) wakes — dense filled squares and short
//   lateral ticks along the path.
// - Shard / Halo wakes sample every trail point plus midpoints so the path
//   reads as a dense field of chevrons / blooming bubbles.
// - Added chevron, expanding-ring, hairline, and twin-offset wakes for Shard /
//   Halo / Needle / Echo.
// - wakePoints / ribbonPath reuse module-level scratch arrays so ribbon and
//   wisp wakes do not allocate a mapped point list every paint (iOS GC).
// - Wake alphas multiply into the caller's `globalAlpha` instead of overwriting
//   it, so a world-wide fade (the level-clear flyout) takes the wake with it.
// - Created file: `drawDotTrail` (moved from skins.js) plus three wakes that
//   follow the flight path instead of stacking axis-aligned blobs —
//   `drawRibbonTrail` (tapered comet ribbon), `drawStreakTrail` (marks rotated
//   to the local tangent) and `drawWispTrail` (thin ribbon + drifting embers).
// - `drawDotTrail` / `drawRibbonTrail` accept an optional `rgb` so premium
//   skins can paint a Signal-Blue wake without a second renderer.

import { color } from '../brand/tokens.js';
import { withHeading, wallTrailDeform } from './hulls.js';

const INK_RGB = '26, 26, 26';

// Reused across paints — wakePoints / ribbonPath never retain these past return.
const wakeScratch = [];
const ribbonLeft = [];
const ribbonRight = [];

function trailMode(ship) {
    return ship._wallTrailMode === 'pile' ? 'pile' : 'spring';
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
// attached to the hull between samples (points are only recorded every
// `trailSpacing` world units).
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
        // Only extend the wake if the live tail really is ahead of the last
        // sample; otherwise the ribbon would double back on itself.
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

// Quadratic smoothing through the midpoints of a polyline, so a wake sampled
// every 10 world units still reads as one continuous curve.
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

// Offset the centreline by +/- half-width along the local normal, then walk up
// one edge and back down the other to close the ribbon.
function ribbonPath(ctx, pts, widthAt) {
    const n = pts.length;
    for (let i = 0; i < n; i++) {
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(n - 1, i + 1)];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const w = widthAt(i);

        const L = edgePoint(ribbonLeft, i);
        const R = edgePoint(ribbonRight, i);
        L.x = pts[i].x + nx * w;
        L.y = pts[i].y + ny * w;
        R.x = pts[i].x - nx * w;
        R.y = pts[i].y - ny * w;
    }
    ribbonLeft.length = n;
    ribbonRight.length = n;

    ctx.beginPath();
    traceSmooth(ctx, ribbonLeft, true);
    // Walk the right edge newest → oldest without reverse()-allocating.
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
    const { rgb = INK_RGB } = opts;
    const now = performance.now();
    const mode = trailMode(ship);
    const n = trail.length;
    const denom = Math.max(1, n - 1);
    const dotScale = ship.game?.config?.spacecraft?.trailDotSize ?? 0.2;
    const baseSize = ship.radius * dotScale;

    for (let i = 0; i < n; i++) {
        const point = trail[i];
        const along = n <= 1 ? 1 : i / denom;
        const d = wallTrailDeform(ship, now, {
            seed: point.seed ?? 0.5,
            along,
            mode,
        });
        const rx = baseSize * d.sx;
        const ry = baseSize * d.sy;
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
        ctx.fillStyle = `rgba(${rgb}, ${point.opacity})`;
        ctx.fill();
    }
}

export function drawRibbonTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { widthScale = 1, alpha = 0.8, smudge = true, rgb = INK_RGB } = opts;
    const pts = wakePoints(ship, trail, toScreenY);
    if (pts.length < 3) return;

    const maxWidth = ship.radius * 0.6 * widthScale;
    const last = pts.length - 1;
    const widthAt = (i) => {
        const t = i / last; // 0 = oldest sample, 1 = at the hull
        return maxWidth * Math.pow(t, 0.6) * (0.45 + 0.55 * pts[i].opacity);
    };

    // The fill can't vary per vertex, so length-wise fade rides on a gradient
    // along the wake's chord; the width taper carries the rest.
    const chord = Math.hypot(pts[last].x - pts[0].x, pts[last].y - pts[0].y);
    let gradient = `rgba(${rgb}, ${alpha * 0.7})`;

    if (chord > 1) {
        gradient = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[last].x, pts[last].y);
        gradient.addColorStop(0, `rgba(${rgb}, 0)`);
        gradient.addColorStop(0.45, `rgba(${rgb}, ${alpha * 0.55})`);
        gradient.addColorStop(1, `rgba(${rgb}, ${alpha})`);
    }

    ctx.save();
    // Alphas here are relative to whatever the caller had set, so a world-wide
    // fade (the level-clear flyout) takes the wake with it.
    const baseAlpha = ctx.globalAlpha;

    if (smudge) {
        ribbonPath(ctx, pts, (i) => widthAt(i) * 2.2);
        ctx.globalAlpha = baseAlpha * 0.22;
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.globalAlpha = baseAlpha;
    }

    ribbonPath(ctx, pts, widthAt);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
}

export function drawStreakTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { step = 2, alpha = 0.75 } = opts;
    const r = ship.radius;
    const now = performance.now();
    const mode = trailMode(ship);
    const n = trail.length;
    const denom = Math.max(1, n - 1);
    // Faster ship, longer marks — the wake stretches out of the turns.
    const stretch = Math.min(1.7, 0.65 + (ship.speed ?? 0) / (r * 0.75));

    ctx.save();
    ctx.fillStyle = color.ink;
    const baseAlpha = ctx.globalAlpha;

    for (let i = n - 1; i >= 0; i -= step) {
        const p = trail[i];
        const along = n <= 1 ? 1 : i / denom;
        const d = wallTrailDeform(ship, now, {
            seed: p.seed ?? 0.5,
            along,
            mode,
        });
        const length = r * (0.3 + 0.8 * p.opacity) * stretch * d.sy;
        const width = r * (0.09 + 0.24 * p.opacity) * d.sx;

        ctx.globalAlpha = baseAlpha * p.opacity * alpha;
        withHeading(ctx, p.x + d.dx, toScreenY(p.y + d.dy), p.angle ?? 0, (c) => {
            c.beginPath();
            c.ellipse(0, 0, width, length, 0, 0, Math.PI * 2);
            c.fill();
        });
    }

    ctx.restore();
}

export function drawWispTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { emberStep = 4 } = opts;

    drawRibbonTrail(ctx, ship, trail, toScreenY, {
        widthScale: 0.4,
        alpha: 0.7,
        smudge: false,
    });

    const r = ship.radius;

    ctx.save();
    ctx.fillStyle = color.ink;
    const baseAlpha = ctx.globalAlpha;

    // Embers peel off the wake sideways as they age, using the point's stable
    // seed so they drift steadily instead of re-randomising every frame.
    const now = performance.now();
    const mode = trailMode(ship);
    const n = trail.length;
    const denom = Math.max(1, n - 1);
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
        const drift = ((p.seed ?? 0.5) * 2 - 1) * r * 1.6 * age;
        const size = r * 0.17 * (0.35 + 0.65 * p.opacity);

        ctx.globalAlpha = baseAlpha * p.opacity * 0.55;
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

/** Build denser sample list: every trail point + midpoint between neighbors. */
function denseTrailMarks(ship, trail, toScreenY) {
    const now = performance.now();
    const mode = trailMode(ship);
    const marks = [];
    const len = trail.length;
    const denom = Math.max(1, len - 1);
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
        });
        if (i < len - 1) {
            const nxt = trail[i + 1];
            const midSeed = ((p.seed ?? seed) + (nxt.seed ?? seed)) * 0.5;
            const midAlong = (along + (i + 1) / denom) * 0.5;
            const md = wallTrailDeform(ship, now, { seed: midSeed, along: midAlong, mode });
            marks.push({
                x: (p.x + nxt.x) * 0.5 + md.dx,
                y: toScreenY((p.y + nxt.y) * 0.5 + md.dy),
                opacity: (p.opacity + nxt.opacity) * 0.5,
                angle: Math.atan2(
                    Math.sin(p.angle ?? 0) + Math.sin(nxt.angle ?? 0),
                    Math.cos(p.angle ?? 0) + Math.cos(nxt.angle ?? 0)
                ),
                scale: 0.82,
                sx: md.sx,
                sy: md.sy,
            });
        }
    }
    return marks;
}

/** Paper-cut V marks along the path — Shard. */
export function drawChevronTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.88 } = opts;
    const r = ship.radius;
    const marks = denseTrailMarks(ship, trail, toScreenY);

    ctx.save();
    ctx.strokeStyle = color.ink;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const baseAlpha = ctx.globalAlpha;

    for (let i = marks.length - 1; i >= 0; i--) {
        const p = marks[i];
        const sx = p.sx ?? 1;
        const sy = p.sy ?? 1;
        const armX = r * (0.22 + 0.38 * p.opacity) * p.scale * sx;
        const armY = r * (0.22 + 0.38 * p.opacity) * p.scale * sy;
        const width = r * (0.05 + 0.08 * p.opacity) * p.scale;

        ctx.globalAlpha = baseAlpha * p.opacity * alpha;
        ctx.lineWidth = width;
        withHeading(ctx, p.x, p.y, p.angle, (c) => {
            // Open V pointing toward the hull (local -Y is forward).
            c.beginPath();
            c.moveTo(-armX * 0.7, armY * 0.55);
            c.lineTo(0, -armY * 0.15);
            c.lineTo(armX * 0.7, armY * 0.55);
            c.stroke();
        });
    }

    ctx.restore();
}

/** Hollow rings that bloom as they age — Halo. */
export function drawRingTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.72 } = opts;
    const r = ship.radius;
    const marks = denseTrailMarks(ship, trail, toScreenY);

    ctx.save();
    ctx.strokeStyle = color.ink;
    ctx.fillStyle = color.ink;
    const baseAlpha = ctx.globalAlpha;

    for (let i = marks.length - 1; i >= 0; i--) {
        const p = marks[i];
        const age = 1 - p.opacity;
        const ringR = r * (0.16 + age * 0.95) * p.scale;
        const width = r * (0.055 + 0.04 * p.opacity) * p.scale;
        const fade = baseAlpha * p.opacity * alpha * (0.4 + 0.6 * (1 - age));
        const sx = p.sx ?? 1;
        const sy = p.sy ?? 1;

        ctx.globalAlpha = fade;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, ringR * sx, ringR * sy, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Fresh marks keep a soft filled bubble so the wake reads denser near the hull.
        if (p.opacity > 0.55) {
            ctx.globalAlpha = fade * 0.22;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, ringR * 0.45 * sx, ringR * 0.45 * sy, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

/** Single stroked centreline — Needle. */
export function drawHairlineTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.9, widthScale = 1 } = opts;
    const pts = wakePoints(ship, trail, toScreenY);
    if (pts.length < 2) return;

    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = baseAlpha * alpha;
    ctx.strokeStyle = color.ink;
    ctx.lineWidth = Math.max(1, ship.radius * 0.09 * widthScale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    traceSmooth(ctx, pts, true);
    ctx.stroke();
    ctx.restore();
}

/** Two parallel hairlines offset along the path normal — Echo. */
export function drawTwinTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.8, sepScale = 0.55 } = opts;
    const pts = wakePoints(ship, trail, toScreenY);
    if (pts.length < 2) return;

    const sep = ship.radius * sepScale;
    const left = [];
    const right = [];

    for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const angle = p.angle ?? 0;
        // Perpendicular to travel (angle 0 = nose up → lateral is ±X).
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        const fade = 0.35 + 0.65 * p.opacity;
        left.push({ x: p.x - nx * sep * fade, y: p.y - ny * sep * fade });
        right.push({ x: p.x + nx * sep * fade, y: p.y + ny * sep * fade });
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

/** Filled squares stamped along the path — Bloc. */
export function drawStampTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.82 } = opts;
    const r = ship.radius;
    const marks = denseTrailMarks(ship, trail, toScreenY);

    ctx.save();
    ctx.fillStyle = color.ink;
    const baseAlpha = ctx.globalAlpha;

    for (let i = marks.length - 1; i >= 0; i--) {
        const p = marks[i];
        const half = r * (0.14 + 0.22 * p.opacity) * p.scale;
        const hx = half * (p.sx ?? 1);
        const hy = half * (p.sy ?? 1);

        ctx.globalAlpha = baseAlpha * p.opacity * alpha;
        withHeading(ctx, p.x, p.y, p.angle, (c) => {
            c.fillRect(-hx, -hy, hx * 2, hy * 2);
        });
    }

    ctx.restore();
}

/** Short ticks perpendicular to travel — Mark. */
export function drawTickTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.85 } = opts;
    const r = ship.radius;
    const marks = denseTrailMarks(ship, trail, toScreenY);

    ctx.save();
    ctx.strokeStyle = color.ink;
    ctx.lineCap = 'round';
    const baseAlpha = ctx.globalAlpha;

    for (let i = marks.length - 1; i >= 0; i--) {
        const p = marks[i];
        const half = r * (0.22 + 0.4 * p.opacity) * p.scale * (p.sx ?? 1);
        const width = r * (0.055 + 0.07 * p.opacity) * p.scale * (p.sy ?? 1);

        ctx.globalAlpha = baseAlpha * p.opacity * alpha;
        ctx.lineWidth = width;
        withHeading(ctx, p.x, p.y, p.angle, (c) => {
            // Lateral tick (local X) — reads as indexing marks on the course.
            c.beginPath();
            c.moveTo(-half, 0);
            c.lineTo(half, 0);
            c.stroke();
        });
    }

    ctx.restore();
}
