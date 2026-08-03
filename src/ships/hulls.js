// hulls.js
// Hull geometry shared by the ship skins.
// Changes:
// - Wall-jelly: crisp squish → extend → shake (vertex deform, no soft halo
//   scaling). Trail offsets via `wallJellyTrailNudge` for a physical squiggle.
// - Added `squarePath` for the Square Stamp / Tick / Trace / Ring family.
// - Added `shardPath` (faceted diamond), `needlePath` (thin lance), and
//   `crescentPath` (open boomerang) for the Shard / Needle / Echo skins.
// - Added `dartPath`: a hard-edged chevron with a notched tail, for Ember.
// - Created file: extracted `tearPath` out of skins.js and added `withHeading`
//   so any shaped hull can be drawn rotated into its direction of travel.
// - `tearPath` gained a `stretch` factor (elongation along the nose axis) used
//   to draw the tear leaner while the ship is banking hard.

import { color } from '../brand/tokens.js';

// Hull rotation limit, shared by the entity (which clamps the heading) and the
// skins (which scale visual effects by how hard the ship is leaning). The arc's
// peak lateral speed is several times the vertical speed, so an unclamped
// tangent would leave the ship flying almost sideways mid-turn; 55 degrees
// reads as a hard bank while still pointing "forward".
export const MAX_BANK = 0.96;

// Run `draw` in a frame translated to (x, y) and rotated by `angle`, where
// angle 0 points the local -Y axis (the nose) straight up the screen.
export function withHeading(ctx, x, y, angle, draw) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    draw(ctx);
    ctx.restore();
}

// Upside-down teardrop, nose at local -Y, centred at (cx, cy).
export function tearPath(ctx, cx, cy, r, stretch = 1) {
    const ry = r * stretch;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry);
    ctx.bezierCurveTo(
        cx + r * 0.2, cy - ry * 0.35,
        cx + r * 0.98, cy + ry * 0.15,
        cx + r * 0.72, cy + ry * 0.55
    );
    ctx.quadraticCurveTo(cx, cy + ry * 1.02, cx - r * 0.72, cy + ry * 0.55);
    ctx.bezierCurveTo(
        cx - r * 0.98, cy + ry * 0.15,
        cx - r * 0.2, cy - ry * 0.35,
        cx, cy - ry
    );
    ctx.closePath();
}

// Swept-back dart: nose at local -Y, wingtips aft, concave notch in the tail.
export function dartPath(ctx, cx, cy, r, stretch = 1) {
    const ry = r * stretch;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry * 1.05);
    ctx.lineTo(cx + r * 0.72, cy + ry * 0.6);
    ctx.lineTo(cx, cy + ry * 0.15);
    ctx.lineTo(cx - r * 0.72, cy + ry * 0.6);
    ctx.closePath();
}

// Faceted crystal: long diamond with a cut tail facet (Shard).
export function shardPath(ctx, cx, cy, r, stretch = 1) {
    const ry = r * stretch;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry * 1.12);
    ctx.lineTo(cx + r * 0.58, cy - ry * 0.02);
    ctx.lineTo(cx + r * 0.4, cy + ry * 0.72);
    ctx.lineTo(cx, cy + ry * 0.32);
    ctx.lineTo(cx - r * 0.4, cy + ry * 0.72);
    ctx.lineTo(cx - r * 0.58, cy - ry * 0.02);
    ctx.closePath();
}

// Ultra-thin lance: long nose, almost no wings (Needle).
export function needlePath(ctx, cx, cy, r, stretch = 1) {
    const ry = r * stretch;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry * 1.28);
    ctx.lineTo(cx + r * 0.2, cy + ry * 0.2);
    ctx.lineTo(cx, cy + ry * 1.0);
    ctx.lineTo(cx - r * 0.2, cy + ry * 0.2);
    ctx.closePath();
}

// Open boomerang / crescent: twin tips aft, join at the nose (Echo).
export function crescentPath(ctx, cx, cy, r, stretch = 1) {
    const ry = r * stretch;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.88, cy + ry * 0.62);
    ctx.quadraticCurveTo(cx - r * 1.05, cy - ry * 0.05, cx, cy - ry * 1.02);
    ctx.quadraticCurveTo(cx + r * 1.05, cy - ry * 0.05, cx + r * 0.88, cy + ry * 0.62);
    ctx.quadraticCurveTo(cx + r * 0.38, cy + ry * 0.12, cx, cy + ry * 0.02);
    ctx.quadraticCurveTo(cx - r * 0.38, cy + ry * 0.12, cx - r * 0.88, cy + ry * 0.62);
    ctx.closePath();
}

// Axis-aligned square in hull space (banks with the ship) — Square family.
export function squarePath(ctx, cx, cy, r, stretch = 1) {
    const half = r * 0.82;
    const hy = half * stretch;
    ctx.beginPath();
    ctx.rect(cx - half, cy - hy, half * 2, hy * 2);
    ctx.closePath();
}

/** How long the wall-bounce jelly lasts (ms). */
export const WALL_JELLY_MS = 420;

/**
 * Squash/stretch for a live wall jelly along world X.
 * t=0 starts fully squished into the wall, then extends past rest and shakes.
 * @returns {{ sx: number, sy: number, side: number, shake: number } | null}
 */
export function wallJellyDeform(ship, time = performance.now()) {
    const j = ship.wallJelly;
    if (!j) return null;
    const elapsed = time - j.t0;
    if (elapsed < 0 || elapsed >= WALL_JELLY_MS) return null;

    const t = elapsed / WALL_JELLY_MS;
    // cos: +1 at impact (squish) → −1 (extend) → settle. Damped oscillation.
    const damp = Math.exp(-2.4 * t);
    const primary = Math.cos(t * Math.PI * 2.8) * damp;
    // Extra high-freq shake once it's off the wall (reads physical, stays sharp).
    const shake = Math.sin(t * Math.PI * 7.5) * Math.exp(-4.2 * t) * 0.06;

    return {
        sx: Math.max(0.42, 1 - 0.52 * primary + shake),
        sy: Math.min(1.65, 1 + 0.48 * primary - shake * 0.7),
        side: j.side,
        shake,
    };
}

/**
 * Lateral trail nudge during wall jelly (world X). `seed` 0..1 varies the phase
 * per mark so the wake squiggles instead of sliding as a rigid ribbon.
 */
export function wallJellyTrailNudge(ship, time = performance.now(), seed = 0.5) {
    const jelly = wallJellyDeform(ship, time);
    if (!jelly) return 0;
    const j = ship.wallJelly;
    const t = (time - j.t0) / WALL_JELLY_MS;
    const damp = Math.exp(-2.6 * t);
    const wave = Math.sin(t * Math.PI * 5.5 + seed * Math.PI * 2);
    const r = ship.radius ?? 10;
    return jelly.side * wave * damp * r * 0.55;
}

export function circlePath(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
}

export function drawCircleHull(ctx, ship, screenY) {
    circlePath(ctx, ship.x, screenY, ship.radius);
    ctx.fillStyle = color.ink;
    ctx.fill();
}
