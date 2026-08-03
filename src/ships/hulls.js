// hulls.js
// Hull geometry shared by the ship skins.
// Changes:
// - `beginHullFrame`: shared wall-jelly plant / shake / squash for every hull
//   (not just Square). Hitbox stays undeformed.
// - `wallTrailDeform`: per-skin pile vs spring wake physics on wall bounce
//   (dx/dy + mark sx/sy). `wallJellyTrailNudge` wraps it for simple X offsets.
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

const ZERO_TRAIL_DEFORM = Object.freeze({ dx: 0, dy: 0, sx: 1, sy: 1 });

/**
 * Render-time wake shove while `ship.wallJelly` is live.
 * @param {number} along 0 = oldest wake, 1 = at the hull
 * @param {'pile'|'spring'} mode
 * @returns {{ dx: number, dy: number, sx: number, sy: number }}
 */
export function wallTrailDeform(ship, time = performance.now(), {
    seed = 0.5,
    along = 1,
    mode = 'spring',
} = {}) {
    const j = ship?.wallJelly;
    if (!j) return ZERO_TRAIL_DEFORM;
    const elapsed = time - j.t0;
    if (elapsed < 0 || elapsed >= WALL_JELLY_MS) return ZERO_TRAIL_DEFORM;

    const t = elapsed / WALL_JELLY_MS;
    const a = Math.max(0, Math.min(1, along));
    const side = j.side < 0 ? -1 : 1;
    const r = ship.radius ?? 10;
    const seedPhase = seed * Math.PI * 2;

    if (mode === 'pile') {
        // Crush into the wall near the hull, bunch toward the ship, peel slowly.
        const damp = Math.exp(-1.8 * t);
        const crush = Math.cos(t * Math.PI * 1.6) * damp; // + at impact
        const peel = Math.sin(t * Math.PI * 2.2 + seedPhase * 0.3) * Math.exp(-2.8 * t);
        const near = a * a; // strongest at hull
        const dx = side * r * (0.85 * crush * near + 0.22 * peel * a);
        // World Y: ship climbs (−Y); bunch recent marks up toward the hull.
        const dy = -r * 0.35 * crush * near;
        const sx = Math.max(0.38, 1 - 0.55 * crush * near);
        const sy = Math.min(1.7, 1 + 0.5 * crush * near);
        return { dx, dy, sx, sy };
    }

    // Spring / whip: compress into wall, overshoot away; phase lags down the trail.
    const delay = (1 - a) * 0.35;
    const localT = Math.max(0, Math.min(1, t - delay));
    const damp = Math.exp(-2.5 * localT);
    const primary = Math.cos(localT * Math.PI * 2.8 + seedPhase * 0.15) * damp;
    const whip = Math.sin(localT * Math.PI * 5.2 + seedPhase) * Math.exp(-3.2 * localT);
    // primary +1 = into wall (same sign as side when side is the wall normal inward…):
    // side −1 = left wall → into wall is negative X.
    const intoWall = side; // displacement toward the wall face
    const dx = intoWall * r * (0.62 * primary * (0.35 + 0.65 * a)
        - 0.48 * whip * (0.25 + 0.75 * a));
    const dy = r * 0.12 * whip * a;
    const near = a * a;
    const sx = Math.max(0.55, 1 - 0.28 * primary * near);
    const sy = Math.min(1.4, 1 + 0.22 * primary * near);
    return { dx, dy, sx, sy };
}

/**
 * Lateral trail nudge during wall jelly (world X). Thin wrapper over
 * `wallTrailDeform` for call sites that only need dx.
 */
export function wallJellyTrailNudge(ship, time = performance.now(), seed = 0.5, mode = 'spring') {
    return wallTrailDeform(ship, time, { seed, along: 1, mode }).dx;
}

/**
 * Open a hull draw frame at the ship with optional wall-jelly plant/shake/scale.
 * Caller must `ctx.restore()` after drawing.
 * Order: world plant + shake → bank → local squash (matches Square).
 * @returns {ReturnType<typeof wallJellyDeform>}
 */
export function beginHullFrame(
    ctx,
    ship,
    screenY,
    bank = 0,
    time = performance.now(),
    halfScale = 0.75,
) {
    const jelly = wallJellyDeform(ship, time);
    ctx.save();
    ctx.translate(ship.x, screenY);
    if (jelly) {
        const half = (ship.radius ?? 10) * halfScale;
        ctx.translate(jelly.side * (half - half * jelly.sx), 0);
        ctx.translate(jelly.shake * (ship.radius ?? 10) * jelly.side * 0.35, 0);
    }
    if (bank) ctx.rotate(bank);
    if (jelly) ctx.scale(jelly.sx, jelly.sy);
    return jelly;
}

export function circlePath(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
}

export function drawCircleHull(ctx, ship, screenY, time = performance.now()) {
    const jelly = beginHullFrame(ctx, ship, screenY, ship.bank ?? 0, time, 0.9);
    const baseAlpha = ctx.globalAlpha;
    if (jelly) ctx.globalAlpha = baseAlpha;
    circlePath(ctx, 0, 0, ship.radius);
    ctx.fillStyle = color.ink;
    ctx.fill();
    ctx.restore();
}
