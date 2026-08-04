// trails.js
// Wake renderers shared by the ship skins. Each takes the raw world-space trail
// plus a world->screen Y mapper and draws in screen space.
// Changes:
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
//   sparks, Stamp blot, Focus/Pulse dense, Wisp flare, Square Tick stretch.
// - Needle hairline whip + tip ripples. wallTrailDeform on discrete marks.
// - wakePoints / ribbonPath reuse scratch arrays (iOS GC).

import { color } from '../brand/tokens.js';
import { withHeading, wallTrailDeform, WALL_JELLY_MS } from './hulls.js';

const INK_RGB = '26, 26, 26';

const wakeScratch = [];
const ribbonLeft = [];
const ribbonRight = [];

const KNOWN_MODES = new Set([
    'pile', 'spring', 'whip', 'desync', 'scatter', 'shatter', 'blot',
    'dense', 'flare', 'crease', 'cloud', 'ladder', 'lag', 'script',
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
    const { rgb = INK_RGB, denseBoop = false } = opts;
    const now = performance.now();
    const mode = trailMode(ship);
    const n = trail.length;
    const denom = Math.max(1, n - 1);
    const dotScale = ship.game?.config?.spacecraft?.trailDotSize ?? 0.2;
    const baseSize = ship.radius * dotScale;
    const energy = denseBoop ? jellyEnergy(ship, now) : 0;

    for (let i = 0; i < n; i++) {
        const point = trail[i];
        const along = n <= 1 ? 1 : i / denom;
        const d = wallTrailDeform(ship, now, {
            seed: point.seed ?? 0.5,
            along,
            mode,
        });
        // On boop, young dots pile denser / slightly larger near the hull.
        const pileBoost = energy > 0
            ? 1 + energy * 0.85 * along * along
            : 1;
        const rx = baseSize * d.sx * pileBoost;
        const ry = baseSize * d.sy * pileBoost;
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
        const alphaBoost = energy > 0 ? 1 + energy * 0.35 * along : 1;
        ctx.fillStyle = `rgba(${rgb}, ${Math.min(1, point.opacity * alphaBoost)})`;
        ctx.fill();
    }
}

function iosBudget(ship) {
    // Prefer Phase-1 lod flag when present; fall back to the older budget name.
    return !!(ship?.game?.iosDrawLod ?? ship?.game?.iosCanvasBudget);
}

export function drawRibbonTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const {
        widthScale = 1,
        alpha = 0.8,
        smudge = true,
        rgb = INK_RGB,
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

export function drawStreakTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { step = 2, alpha = 0.75, sparkBoop = false } = opts;
    const r = ship.radius;
    const now = performance.now();
    const mode = trailMode(ship);
    const n = trail.length;
    const denom = Math.max(1, n - 1);
    const stretch = Math.min(1.7, 0.65 + (ship.speed ?? 0) / (r * 0.75));
    const energy = sparkBoop ? jellyEnergy(ship, now) : 0;
    const side = ship.wallJelly?.side < 0 ? -1 : 1;

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
        const seed = p.seed ?? 0.5;
        // Sparks off flint: extra sideways kick while jelly is live.
        const spark = energy * (seed * 2 - 1) * r * 1.15 * (0.4 + 0.6 * (1 - along));
        const length = r * (0.3 + 0.8 * p.opacity) * stretch * d.sy;
        const width = r * (0.09 + 0.24 * p.opacity) * d.sx;

        ctx.globalAlpha = baseAlpha * p.opacity * alpha;
        withHeading(
            ctx,
            p.x + d.dx + spark * side * 0.15,
            toScreenY(p.y + d.dy) + spark * 0.55,
            (p.angle ?? 0) + spark * 0.04,
            (c) => {
                c.beginPath();
                c.ellipse(0, 0, width, length * (1 + energy * 0.25 * (1 - along)), 0, 0, Math.PI * 2);
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

/** Build denser sample list: every trail point + midpoint between neighbors. */
function denseTrailMarks(ship, trail, toScreenY) {
    const now = performance.now();
    const mode = trailMode(ship);
    const marks = [];
    const len = trail.length;
    const denom = Math.max(1, len - 1);
    // Midpoints roughly double mark count — skip on the iOS canvas budget.
    const withMids = !iosBudget(ship);
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
                seed: midSeed,
                along: midAlong,
            });
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

/** Filled squares stamped along the path — Bloc / Square Stamp. */
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

/** Short ticks perpendicular to travel — Mark / Square Tick. */
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

/** Soft cloud of micro-dots that drift and re-condense — Mote. */
export function drawCloudTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { alpha = 0.78, rgb = INK_RGB } = opts;
    const r = ship.radius;
    const now = performance.now();
    const mode = trailMode(ship);
    const n = trail.length;
    const denom = Math.max(1, n - 1);
    const energy = jellyEnergy(ship, now);

    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    ctx.fillStyle = `rgba(${rgb}, 1)`;

    for (let i = 0; i < n; i++) {
        const p = trail[i];
        const along = n <= 1 ? 1 : i / denom;
        const seed = p.seed ?? 0.5;
        const d = wallTrailDeform(ship, now, { seed, along, mode });
        const age = 1 - p.opacity;
        const condense = energy > 0 ? (1 - energy * along * 0.65) : 1;
        // Messy Focus cousin: several independent dots in a soft radial cloud.
        // Hashes are zero-mean in angle (not mirrored pairs) so it stays organic
        // without always leaning one screen side. iOS: 1–2 dots (was 3–5).
        const count = iosBudget(ship)
            ? 1 + ((fract(seed * 17.13) * 2) | 0)
            : 3 + ((fract(seed * 17.13) * 3) | 0);
        const screenY = toScreenY(p.y + d.dy);
        for (let k = 0; k < count; k++) {
            const u = fract(seed * 12.9898 + k * 0.6180339887);
            const v = fract(seed * 78.233 + k * 0.3819660113);
            const w = fract(seed * 4.1414 + k * 0.7548776662);
            // Full-circle scatter in world space (bank doesn't shove the cloud).
            const ang = u * Math.PI * 2;
            const radial = Math.sqrt(v); // denser near center, soft fringe
            const spread = r * (0.28 + age * 1.15 + energy * 0.95) * (0.35 + 0.9 * radial);
            const size = r * (0.055 + 0.11 * p.opacity) * (0.5 + w * 0.75) * d.sx;
            ctx.globalAlpha = baseAlpha * p.opacity * alpha * (0.4 + 0.6 * (1 - radial * 0.55));
            ctx.beginPath();
            ctx.arc(
                p.x + d.dx + Math.cos(ang) * spread * condense,
                screenY + Math.sin(ang) * spread * condense,
                size,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    }

    ctx.restore();
}

function fract(x) {
    return x - Math.floor(x);
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
        inkRgb = INK_RGB,
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
        inkRgb = INK_RGB,
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
