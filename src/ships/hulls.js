// hulls.js
// Hull geometry shared by the ship skins.
// Changes:
// - Ink `script` boop: bigger calligraphic reverse/whip on mid+tip (still
//   locked at along≈1); envelope peaks where the ribbon is still visible.
// - Flux hex + Cinder petal paths; jelly profiles + flick/cinder trail modes.
// - foldPath is a solid origami kite (no concave hollow notch).
// - cloud boop puff is isotropic (seed angle), not wall-side biased.
// - script wallTrailDeform keeps along≈1 locked to the hull; reverse/whip
//   only mid-trail and tip so Ink's ribbon never disconnects on boop.
// - Per-ship wall-jelly profiles: halo, shard, stamp, fold, spine, mote,
//   orbit — plus default / needle. beginHullFrame plant follows the profile.
// - Orbit hull: solid planetoid body (orbitPath) + ring/sat drawn in skinDefs.
// - New hull paths: foldPath, spinePath, orbitPath helper.
// - wallTrailDeform modes: pile/spring/whip + desync, scatter, shatter, blot,
//   dense, flare, crease, cloud, ladder, lag, script.
// - Needle wall jelly: whip/flex (length pulse + tip shear + quiver).
// - beginHullFrame: shared wall-jelly plant / shake / squash for every hull.
// - Added squarePath, shardPath, needlePath, crescentPath, dartPath, tearPath.

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

// Origami fold: solid kite diamond (no hollow / concave notch).
export function foldPath(ctx, cx, cy, r, stretch = 1) {
    const ry = r * stretch;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry * 1.05);
    ctx.lineTo(cx + r * 0.78, cy + ry * 0.12);
    ctx.lineTo(cx, cy + ry * 0.98);
    ctx.lineTo(cx - r * 0.78, cy + ry * 0.12);
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

// Vertical bar / spine: tall thin rectangle with slightly rounded ends via path.
export function spinePath(ctx, cx, cy, r, stretch = 1) {
    const ry = r * stretch;
    const halfW = r * 0.28;
    const halfH = ry * 1.05;
    ctx.beginPath();
    ctx.moveTo(cx - halfW, cy - halfH * 0.85);
    ctx.quadraticCurveTo(cx, cy - halfH * 1.15, cx + halfW, cy - halfH * 0.85);
    ctx.lineTo(cx + halfW, cy + halfH * 0.85);
    ctx.quadraticCurveTo(cx, cy + halfH * 1.1, cx - halfW, cy + halfH * 0.85);
    ctx.closePath();
}

// Pointy hex crystal — Flux (compact; shorter than a full tear/dart).
export function hexPath(ctx, cx, cy, r, stretch = 1) {
    const ry = r * stretch;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry * 0.88);
    ctx.lineTo(cx + r * 0.52, cy - ry * 0.32);
    ctx.lineTo(cx + r * 0.48, cy + ry * 0.38);
    ctx.lineTo(cx, cy + ry * 0.72);
    ctx.lineTo(cx - r * 0.48, cy + ry * 0.38);
    ctx.lineTo(cx - r * 0.52, cy - ry * 0.32);
    ctx.closePath();
}

// Soft petal / blunt diamond — Cinder.
export function petalPath(ctx, cx, cy, r, stretch = 1) {
    const ry = r * stretch;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry * 1.05);
    ctx.quadraticCurveTo(cx + r * 0.85, cy - ry * 0.15, cx + r * 0.55, cy + ry * 0.55);
    ctx.quadraticCurveTo(cx, cy + ry * 1.05, cx - r * 0.55, cy + ry * 0.55);
    ctx.quadraticCurveTo(cx - r * 0.85, cy - ry * 0.15, cx, cy - ry * 1.05);
    ctx.closePath();
}

/** Compact planetoid body (Orbit) — solid oval core to fill. */
export function orbitPath(ctx, cx, cy, r, stretch = 1) {
    const rx = r * 0.58;
    const ry = r * 0.78 * stretch;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
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
 * @param {string} [profile]
 * @returns {{ sx: number, sy: number, side: number, shake: number, shear: number } | null}
 */
export function wallJellyDeform(ship, time = performance.now(), profile = 'default') {
    const j = ship.wallJelly;
    if (!j) return null;
    const elapsed = time - j.t0;
    if (elapsed < 0 || elapsed >= WALL_JELLY_MS) return null;

    const t = elapsed / WALL_JELLY_MS;

    if (profile === 'needle') {
        const damp = Math.exp(-1.85 * t);
        const flex = Math.cos(t * Math.PI * 3.6) * damp;
        const settle = Math.sin(t * Math.PI * 5.5) * Math.exp(-2.8 * t);
        return {
            sx: Math.max(0.8, 1 - 0.16 * flex + settle * 0.04),
            sy: Math.min(1.9, Math.max(0.74, 1 + 0.58 * flex - settle * 0.1)),
            side: j.side,
            shake: settle * 0.12,
            shear: flex * 0.4 + settle * 0.1,
        };
    }

    // Halo: keep the disc round — tiny orbital wobble, not fat squash.
    if (profile === 'halo') {
        const damp = Math.exp(-2.1 * t);
        const orbit = Math.sin(t * Math.PI * 4.2) * damp;
        const settle = Math.cos(t * Math.PI * 6.5) * Math.exp(-3.2 * t);
        return {
            sx: Math.max(0.9, 1 + orbit * 0.06),
            sy: Math.max(0.9, 1 - orbit * 0.05),
            side: j.side,
            shake: settle * 0.18,
            shear: orbit * 0.22,
        };
    }

    // Shard: crystal crack — sharp compress then snap, little jelly bounce.
    if (profile === 'shard') {
        const crack = Math.exp(-5.5 * t) * Math.cos(t * Math.PI * 1.2);
        const shard = Math.sin(t * Math.PI * 8) * Math.exp(-4.5 * t);
        return {
            sx: Math.max(0.62, 1 - 0.38 * crack),
            sy: Math.min(1.35, 1 + 0.28 * crack - shard * 0.08),
            side: j.side,
            shake: shard * 0.1,
            shear: shard * 0.18 * (j.side < 0 ? -1 : 1),
        };
    }

    // Stamp: rubber plant — hard crush into the wall, then peel.
    if (profile === 'stamp') {
        const damp = Math.exp(-2.0 * t);
        const plant = Math.cos(t * Math.PI * 1.8) * damp;
        const peel = Math.sin(t * Math.PI * 3.2) * Math.exp(-3.0 * t);
        return {
            sx: Math.max(0.48, 1 - 0.5 * plant),
            sy: Math.min(1.45, 1 + 0.35 * plant - peel * 0.08),
            side: j.side,
            shake: peel * 0.08,
            shear: 0,
        };
    }

    // Fold: crease — angular asymmetric squash along a fold line.
    if (profile === 'fold') {
        const damp = Math.exp(-2.2 * t);
        const crease = Math.cos(t * Math.PI * 2.4) * damp;
        const flick = Math.sin(t * Math.PI * 5.5) * Math.exp(-3.4 * t);
        return {
            sx: Math.max(0.55, 1 - 0.4 * crease),
            sy: Math.min(1.5, 1 + 0.42 * crease),
            side: j.side,
            shake: flick * 0.07,
            shear: crease * 0.28 + flick * 0.12,
        };
    }

    // Spine: bar compresses toward the wall (height pulse, narrow X hold).
    if (profile === 'spine') {
        const damp = Math.exp(-2.0 * t);
        const flex = Math.cos(t * Math.PI * 2.6) * damp;
        const quiver = Math.sin(t * Math.PI * 7) * Math.exp(-3.8 * t);
        return {
            sx: Math.max(0.72, 1 - 0.22 * flex),
            sy: Math.min(1.55, Math.max(0.7, 1 + 0.48 * flex - quiver * 0.06)),
            side: j.side,
            shake: quiver * 0.09,
            shear: 0,
        };
    }

    // Mote: soft disc — gentle wobble, never a hard cube squash.
    if (profile === 'mote') {
        const damp = Math.exp(-1.9 * t);
        const soft = Math.cos(t * Math.PI * 2.2) * damp;
        const drift = Math.sin(t * Math.PI * 4.8) * Math.exp(-2.6 * t);
        return {
            sx: Math.max(0.7, 1 - 0.28 * soft),
            sy: Math.min(1.35, 1 + 0.26 * soft),
            side: j.side,
            shake: drift * 0.14,
            shear: drift * 0.08,
        };
    }

    // Orbit: planetoid — slight oval wobble, no fat blob.
    if (profile === 'orbit') {
        const damp = Math.exp(-2.0 * t);
        const oval = Math.sin(t * Math.PI * 3.4) * damp;
        const settle = Math.cos(t * Math.PI * 5.8) * Math.exp(-3.0 * t);
        return {
            sx: Math.max(0.85, 1 + oval * 0.12),
            sy: Math.max(0.85, 1 - oval * 0.1),
            side: j.side,
            shake: settle * 0.1,
            shear: oval * 0.15,
        };
    }

    // Flux: crisp hex facet — short shear flash, little squash.
    if (profile === 'flux') {
        const damp = Math.exp(-2.4 * t);
        const facet = Math.cos(t * Math.PI * 3.2) * damp;
        const tick = Math.sin(t * Math.PI * 8.5) * Math.exp(-3.8 * t);
        return {
            sx: Math.max(0.72, 1 - 0.22 * facet),
            sy: Math.min(1.28, 1 + 0.2 * facet),
            side: j.side,
            shake: tick * 0.08,
            shear: facet * 0.22 + tick * 0.1,
        };
    }

    // Cinder: soft petal — warm bloom squash then settle.
    if (profile === 'cinder') {
        const damp = Math.exp(-1.85 * t);
        const bloom = Math.cos(t * Math.PI * 2.1) * damp;
        const flicker = Math.sin(t * Math.PI * 5.2) * Math.exp(-2.8 * t);
        return {
            sx: Math.max(0.62, 1 - 0.32 * bloom),
            sy: Math.min(1.42, 1 + 0.34 * bloom),
            side: j.side,
            shake: flicker * 0.12,
            shear: flicker * 0.1,
        };
    }

    // cos: +1 at impact (squish) → −1 (extend) → settle. Damped oscillation.
    const damp = Math.exp(-2.4 * t);
    const primary = Math.cos(t * Math.PI * 2.8) * damp;
    const shake = Math.sin(t * Math.PI * 7.5) * Math.exp(-4.2 * t) * 0.06;

    return {
        sx: Math.max(0.42, 1 - 0.52 * primary + shake),
        sy: Math.min(1.65, 1 + 0.48 * primary - shake * 0.7),
        side: j.side,
        shake,
        shear: 0,
    };
}

const ZERO_TRAIL_DEFORM = Object.freeze({ dx: 0, dy: 0, sx: 1, sy: 1 });

function pileDeform(t, a, side, r, seedPhase, strength = 1) {
    const damp = Math.exp(-1.8 * t);
    const crush = Math.cos(t * Math.PI * 1.6) * damp;
    const peel = Math.sin(t * Math.PI * 2.2 + seedPhase * 0.3) * Math.exp(-2.8 * t);
    const near = a * a;
    const s = strength;
    const dx = side * r * (0.85 * crush * near * s + 0.22 * peel * a);
    const dy = -r * 0.35 * crush * near * s;
    const sx = Math.max(0.38, 1 - 0.55 * crush * near * s);
    const sy = Math.min(1.7, 1 + 0.5 * crush * near * s);
    return { dx, dy, sx, sy };
}

function springLikeDeform(t, a, side, r, seedPhase, {
    delayScale = 0.35,
    dampRate = 2.5,
    freq = 2.8,
    whipFreq = 5.2,
    whipDamp = 3.2,
    into = 0.62,
    whipAmp = 0.48,
    endBoost = 1,
    tipHeavy = false,
} = {}) {
    const delay = (1 - a) * delayScale;
    const localT = Math.max(0, Math.min(1, t - delay));
    const damp = Math.exp(-dampRate * localT);
    const primary = Math.cos(localT * Math.PI * freq + seedPhase * 0.15) * damp;
    const whip = Math.sin(localT * Math.PI * whipFreq + seedPhase)
        * Math.exp(-whipDamp * localT);
    const alongW = tipHeavy ? (0.5 + 0.5 * (1 - a)) : (0.25 + 0.75 * a);
    const dx = side * r * endBoost * (
        into * primary * (0.25 + 0.75 * a)
        - whipAmp * whip * alongW
    );
    const dy = r * (tipHeavy ? 0.22 : 0.12) * whip
        * (tipHeavy ? (0.45 + 0.55 * (1 - a)) : a) * endBoost;
    const near = a * a;
    const sx = Math.max(0.55, 1 - 0.28 * primary * near);
    const sy = Math.min(1.4, 1 + 0.22 * primary * near);
    return { dx, dy, sx, sy };
}

/**
 * Render-time wake shove while `ship.wallJelly` is live.
 * @param {number} along 0 = oldest wake, 1 = at the hull
 * @param {string} mode
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

    if (mode === 'pile') return pileDeform(t, a, side, r, seedPhase, 1);
    if (mode === 'dense') return pileDeform(t, a, side, r, seedPhase, 1.35);
    if (mode === 'blot') {
        const base = pileDeform(t, a, side, r, seedPhase, 1.15);
        // Extra contact blot near the hull early in the bounce.
        const blot = Math.exp(-3.2 * t) * a * a;
        return {
            dx: base.dx + side * r * 0.2 * blot,
            dy: base.dy - r * 0.12 * blot,
            sx: Math.max(0.32, base.sx * (1 - 0.25 * blot)),
            sy: Math.min(1.85, base.sy * (1 + 0.35 * blot)),
        };
    }

    if (mode === 'cloud') {
        const base = pileDeform(t, a, side, r, seedPhase, 0.85);
        // Soft isotropic puff on boop — seed angle, not wall-side bias.
        const puffAng = seedPhase * Math.PI * 2;
        const puff = r * 0.5 * Math.exp(-1.6 * t) * (0.4 + 0.6 * (1 - a));
        return {
            dx: base.dx + Math.cos(puffAng) * puff,
            dy: base.dy + Math.sin(puffAng) * puff * 0.85,
            sx: Math.max(0.5, base.sx * (0.85 + 0.3 * seed)),
            sy: Math.min(1.6, base.sy * (0.9 + 0.25 * (1 - seed))),
        };
    }

    if (mode === 'scatter') {
        const damp = Math.exp(-2.0 * t);
        const kick = Math.sin(t * Math.PI * 2.4 + seedPhase) * damp;
        const realign = Math.cos(t * Math.PI * 3.6 + seedPhase * 0.5) * Math.exp(-3.2 * t);
        const lateral = (seed * 2 - 1);
        const near = 0.35 + 0.65 * a;
        return {
            dx: side * r * 0.35 * realign * near + lateral * r * 0.95 * kick * (0.5 + 0.5 * (1 - a)),
            dy: -r * 0.15 * Math.abs(kick) * near + lateral * r * 0.25 * kick,
            sx: Math.max(0.5, 1 - 0.2 * Math.abs(realign) * a),
            sy: Math.min(1.55, 1 + 0.45 * Math.abs(kick) * (1 - a * 0.4)),
        };
    }

    if (mode === 'shatter') {
        const damp = Math.exp(-2.4 * t);
        const fan = Math.sin(t * Math.PI * 1.8) * damp;
        const stack = Math.cos(t * Math.PI * 3.2 + seedPhase * 0.2) * Math.exp(-3.5 * t);
        const spread = (seed * 2 - 1);
        const near = a * a;
        return {
            dx: side * r * 0.4 * stack * near + spread * r * 1.1 * fan * (0.55 + 0.45 * (1 - a)),
            dy: spread * r * 0.7 * fan * (0.4 + 0.6 * (1 - a)) - r * 0.18 * stack * near,
            sx: Math.max(0.5, 1 - 0.25 * Math.abs(stack) * near),
            sy: Math.min(1.45, 1 + 0.3 * Math.abs(fan) * (1 - a)),
        };
    }

    if (mode === 'desync') {
        // Seed shifts phase hard so twin lines can stick / spring late.
        const delay = (1 - a) * 0.28 + seed * 0.42;
        const localT = Math.max(0, Math.min(1, t - delay));
        const damp = Math.exp(-2.2 * localT);
        const primary = Math.cos(localT * Math.PI * 2.6) * damp;
        const snap = Math.sin(localT * Math.PI * 4.5) * Math.exp(-3.4 * localT);
        const near = 0.3 + 0.7 * a;
        return {
            dx: side * r * (0.7 * primary * near - 0.35 * snap * (0.4 + 0.6 * seed)),
            dy: r * 0.14 * snap * a,
            sx: Math.max(0.6, 1 - 0.2 * primary * a),
            sy: Math.min(1.35, 1 + 0.18 * primary * a),
        };
    }

    if (mode === 'flare') {
        const base = springLikeDeform(t, a, side, r, seedPhase, {
            delayScale: 0.3,
            into: 0.5,
            whipAmp: 0.55,
        });
        const flare = Math.exp(-1.7 * t) * (1 - a * 0.35);
        const lateral = (seed * 2 - 1) * r * 0.85 * flare;
        return {
            dx: base.dx + lateral,
            dy: base.dy + Math.abs(seed - 0.5) * r * 0.35 * flare,
            sx: base.sx,
            sy: Math.min(1.5, base.sy * (1 + 0.2 * flare)),
        };
    }

    if (mode === 'crease') {
        const base = springLikeDeform(t, a, side, r, seedPhase, {
            delayScale: 0.32,
            freq: 2.4,
            whipFreq: 4.2,
        });
        // Zigzag amplify: alternate marks kick harder on boop.
        const zig = ((seed > 0.5 ? 1 : -1) * r * 0.55
            * Math.sin(t * Math.PI * 3.2) * Math.exp(-2.2 * t) * (0.5 + 0.5 * (1 - a)));
        return {
            dx: base.dx + zig * 0.35,
            dy: base.dy + zig,
            sx: base.sx,
            sy: base.sy,
        };
    }

    if (mode === 'ladder') {
        const damp = Math.exp(-1.9 * t);
        const crush = Math.cos(t * Math.PI * 2.0) * damp;
        const near = a * a;
        return {
            dx: side * r * 0.9 * crush * near,
            dy: -r * 0.55 * crush * near, // rungs compress toward hull/wall
            sx: Math.max(0.45, 1 - 0.4 * crush * near),
            sy: Math.max(0.4, 1 - 0.5 * crush * near), // rung spacing collapses
        };
    }

    if (mode === 'lag') {
        // Soft lag: wake ellipse trails the shove a beat late.
        return springLikeDeform(t, a, side, r, seedPhase, {
            delayScale: 0.55,
            dampRate: 1.7,
            freq: 2.0,
            whipFreq: 3.2,
            whipDamp: 2.4,
            into: 0.48,
            whipAmp: 0.32,
        });
    }

    if (mode === 'script') {
        // Calligraphic whip: reverse mid-trail / tip only. Newest points
        // (along → 1) stay locked to the hull so the ribbon never disconnects.
        // Envelope peaks ~along 0.2–0.45 so the flourish reads on the still-
        // opaque ribbon, not only the faded tip.
        const tip = Math.pow(1 - a, 1.1);
        const lock = Math.pow(a, 2.4); // hard zero near hull
        const midBell = Math.sin(Math.min(1, a * 1.15) * Math.PI);
        const flourish = tip * (1 - lock) * (0.45 + 0.55 * midBell);
        const delay = tip * 0.22;
        const localT = Math.max(0, Math.min(1, t - delay));
        const damp = Math.exp(-1.45 * localT);
        // Broad reverse stroke, then a quicker counter-flick (pen lift).
        const reverse = Math.sin(localT * Math.PI * 1.35) * Math.exp(-1.7 * localT);
        const stroke = Math.sin(localT * Math.PI * 2.8 + seedPhase * 0.35) * damp;
        const flick = Math.sin(localT * Math.PI * 4.2) * Math.exp(-2.6 * localT);
        const w = flourish;
        return {
            dx: side * r * (
                0.55 * stroke * w
                - 1.35 * reverse * flourish
                - 0.4 * flick * tip * (1 - lock)
            ),
            dy: r * (
                1.05 * reverse * flourish
                - 0.28 * stroke * w
                + 0.35 * flick * tip * (1 - lock)
            ),
            sx: Math.max(0.45, 1 - 0.32 * Math.abs(stroke) * flourish),
            sy: Math.min(1.65, 1 + 0.55 * Math.abs(reverse) * flourish),
        };
    }

    if (mode === 'flick') {
        // Flux dashes: stretch along path then snap; slight lateral tick.
        const damp = Math.exp(-2.2 * t);
        const stretch = Math.sin(t * Math.PI * 2.6) * damp;
        const tick = Math.cos(t * Math.PI * 4.8 + seedPhase) * Math.exp(-3.2 * t);
        const near = 0.35 + 0.65 * a;
        return {
            dx: side * r * 0.35 * tick * near + (seed * 2 - 1) * r * 0.2 * stretch * (1 - a),
            dy: -r * 0.55 * stretch * near,
            sx: Math.max(0.55, 1 - 0.2 * Math.abs(tick) * near),
            sy: Math.min(1.7, 1 + 0.65 * Math.abs(stretch) * near),
        };
    }

    if (mode === 'cinder') {
        // Soft warm bloom on boop — gentle, not a jittery scatter.
        const damp = Math.exp(-2.1 * t);
        const bloom = Math.sin(t * Math.PI * 1.6) * damp;
        const near = 0.4 + 0.6 * a;
        return {
            dx: side * r * 0.28 * bloom * near,
            dy: -r * 0.18 * bloom * near,
            sx: Math.max(0.7, 1 - 0.12 * bloom * near),
            sy: Math.min(1.35, 1 + 0.28 * bloom * near),
        };
    }

    if (mode === 'whip') {
        const endBoost = 1 + 1.7 * Math.pow(1 - a, 1.4);
        return springLikeDeform(t, a, side, r, seedPhase, {
            delayScale: 0.5,
            dampRate: 1.8,
            freq: 2.2,
            whipFreq: 2.8,
            whipDamp: 1.9,
            into: 0.52,
            whipAmp: 0.7,
            endBoost,
            tipHeavy: true,
        });
    }

    // Default spring.
    return springLikeDeform(t, a, side, r, seedPhase);
}

/**
 * Lateral trail nudge during wall jelly (world X). Thin wrapper over
 * `wallTrailDeform` for call sites that only need dx.
 */
export function wallJellyTrailNudge(ship, time = performance.now(), seed = 0.5, mode = 'spring') {
    return wallTrailDeform(ship, time, { seed, along: 1, mode }).dx;
}

const PLANT_BY_PROFILE = {
    default: 1,
    needle: 0.55,
    halo: 0.35,
    shard: 0.75,
    stamp: 1.1,
    fold: 0.85,
    spine: 0.7,
    mote: 0.9,
    orbit: 0.4,
    flux: 0.75,
    cinder: 0.95,
};

/**
 * Open a hull draw frame at the ship with optional wall-jelly plant/shake/scale.
 * Caller must `ctx.restore()` after drawing.
 * @param {string} [profile]
 * @returns {ReturnType<typeof wallJellyDeform>}
 */
export function beginHullFrame(
    ctx,
    ship,
    screenY,
    bank = 0,
    time = performance.now(),
    halfScale = 0.75,
    profile = 'default',
) {
    const jelly = wallJellyDeform(ship, time, profile);
    ctx.save();
    ctx.translate(ship.x, screenY);
    if (jelly) {
        const half = (ship.radius ?? 10) * halfScale;
        const plant = PLANT_BY_PROFILE[profile] ?? 1;
        ctx.translate(jelly.side * (half - half * jelly.sx) * plant, 0);
        const shakeScale = profile === 'halo' || profile === 'orbit' ? 0.7
            : profile === 'needle' ? 0.55
            : 0.35;
        ctx.translate(jelly.shake * (ship.radius ?? 10) * jelly.side * shakeScale, 0);
    }
    if (bank) ctx.rotate(bank);
    if (jelly) {
        ctx.scale(jelly.sx, jelly.sy);
        if (jelly.shear) {
            ctx.transform(1, 0, jelly.shear * jelly.side, 1, 0, 0);
        }
    }
    return jelly;
}

export function circlePath(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
}

export function drawCircleHull(ctx, ship, screenY, time = performance.now(), profile = 'default') {
    const jelly = beginHullFrame(ctx, ship, screenY, ship.bank ?? 0, time, 0.9, profile);
    const baseAlpha = ctx.globalAlpha;
    if (jelly) ctx.globalAlpha = baseAlpha;
    circlePath(ctx, 0, 0, ship.radius);
    ctx.fillStyle = color.ink;
    ctx.fill();
    ctx.restore();
}
