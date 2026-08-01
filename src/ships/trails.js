// trails.js
// Wake renderers shared by the ship skins. Each takes the raw world-space trail
// plus a world->screen Y mapper and draws in screen space.
// Changes:
// - Wake alphas multiply into the caller's `globalAlpha` instead of overwriting
//   it, so a world-wide fade (the level-clear flyout) takes the wake with it.
// - Created file: `drawDotTrail` (moved from skins.js) plus three wakes that
//   follow the flight path instead of stacking axis-aligned blobs —
//   `drawRibbonTrail` (tapered comet ribbon), `drawStreakTrail` (marks rotated
//   to the local tangent) and `drawWispTrail` (thin ribbon + drifting embers).

import { color } from '../brand/tokens.js';
import { withHeading } from './hulls.js';

const INK_RGB = '26, 26, 26';

// Trail order is oldest -> newest. The live tail is appended so the wake stays
// attached to the hull between samples (points are only recorded every
// `trailSpacing` world units).
function wakePoints(ship, trail, toScreenY) {
    const pts = trail.map((p) => ({
        x: p.x,
        y: toScreenY(p.y),
        opacity: p.opacity,
        angle: p.angle ?? 0,
        seed: p.seed ?? 0.5,
    }));

    const tail = ship.tailPoint?.();
    if (tail) {
        const screen = { x: tail.x, y: toScreenY(tail.y) };
        const last = pts[pts.length - 1];
        const angle = ship.tangent ?? 0;
        // Only extend the wake if the live tail really is ahead of the last
        // sample; otherwise the ribbon would double back on itself.
        const ahead = last
            ? (screen.x - last.x) * Math.sin(angle) - (screen.y - last.y) * Math.cos(angle)
            : 1;

        if (ahead > 0.5) {
            pts.push({ ...screen, opacity: 1, angle, seed: 0.5 });
        }
    }

    return pts;
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

// Offset the centreline by +/- half-width along the local normal, then walk up
// one edge and back down the other to close the ribbon.
function ribbonPath(ctx, pts, widthAt) {
    const left = [];
    const right = [];

    for (let i = 0; i < pts.length; i++) {
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(pts.length - 1, i + 1)];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const w = widthAt(i);

        left.push({ x: pts[i].x + nx * w, y: pts[i].y + ny * w });
        right.push({ x: pts[i].x - nx * w, y: pts[i].y - ny * w });
    }

    ctx.beginPath();
    traceSmooth(ctx, left, true);
    traceSmooth(ctx, right.reverse(), false);
    ctx.closePath();
}

export function drawDotTrail(ctx, ship, trail, toScreenY) {
    const dotScale = ship.game?.config?.spacecraft?.trailDotSize ?? 0.2;
    const dotSize = ship.radius * dotScale;

    for (const point of trail) {
        ctx.beginPath();
        ctx.arc(point.x, toScreenY(point.y), dotSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${INK_RGB}, ${point.opacity})`;
        ctx.fill();
    }
}

export function drawRibbonTrail(ctx, ship, trail, toScreenY, opts = {}) {
    const { widthScale = 1, alpha = 0.8, smudge = true } = opts;
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
    let gradient = `rgba(${INK_RGB}, ${alpha * 0.7})`;

    if (chord > 1) {
        gradient = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[last].x, pts[last].y);
        gradient.addColorStop(0, `rgba(${INK_RGB}, 0)`);
        gradient.addColorStop(0.45, `rgba(${INK_RGB}, ${alpha * 0.55})`);
        gradient.addColorStop(1, `rgba(${INK_RGB}, ${alpha})`);
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
    // Faster ship, longer marks — the wake stretches out of the turns.
    const stretch = Math.min(1.7, 0.65 + (ship.speed ?? 0) / (r * 0.75));

    ctx.save();
    ctx.fillStyle = color.ink;
    const baseAlpha = ctx.globalAlpha;

    for (let i = trail.length - 1; i >= 0; i -= step) {
        const p = trail[i];
        const length = r * (0.3 + 0.8 * p.opacity) * stretch;
        const width = r * (0.09 + 0.24 * p.opacity);

        ctx.globalAlpha = baseAlpha * p.opacity * alpha;
        withHeading(ctx, p.x, toScreenY(p.y), p.angle ?? 0, (c) => {
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
    for (let i = trail.length - 1; i >= 0; i -= emberStep) {
        const p = trail[i];
        const age = 1 - p.opacity;
        const angle = p.angle ?? 0;
        const drift = ((p.seed ?? 0.5) * 2 - 1) * r * 1.6 * age;
        const size = r * 0.17 * (0.35 + 0.65 * p.opacity);

        ctx.globalAlpha = baseAlpha * p.opacity * 0.55;
        ctx.beginPath();
        ctx.arc(
            p.x + Math.cos(angle) * drift,
            toScreenY(p.y) + Math.sin(angle) * drift,
            size,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    ctx.restore();
}
