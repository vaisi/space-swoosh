// HullCache.js
// Phase 1: bake each skin's resting hull to an offscreen canvas; blit via drawImage.
// Changes:
// - Nyan uses the same tear bake meta as Quill/Ink (default profile).
// - Created: per-skin/radius cache; live bank + wall-jelly via beginHullFrame.
//   Breath/orbit micro-animation is frozen in the bake (acceptable iOS tradeoff).

import { beginHullFrame } from './hulls.js';
import { getSkin } from './skins.js';

/** @type {Map<string, { canvas: HTMLCanvasElement, origin: number, cssSize: number, radius: number }>} */
const cache = new Map();

/** Jelly profile + halfScale matching each skin's drawHull beginHullFrame call. */
const HULL_META = {
    focus: { profile: 'default', halfScale: 0.85 },
    flicker: { profile: 'default', halfScale: 0.85 },
    ember: { profile: 'default', halfScale: 0.85 },
    wisp: { profile: 'default', halfScale: 0.85 },
    pulse: { profile: 'default', halfScale: 0.85 },
    quill: { profile: 'default', halfScale: 0.85 },
    nyan: { profile: 'default', halfScale: 0.85 },
    shard: { profile: 'shard', halfScale: 0.85 },
    halo: { profile: 'halo', halfScale: 0.9 },
    needle: { profile: 'needle', halfScale: 0.55 },
    echo: { profile: 'default', halfScale: 0.85 },
    squareStamp: { profile: 'stamp', halfScale: 0.82 },
    squareTick: { profile: 'default', halfScale: 0.82 },
    squareTrace: { profile: 'default', halfScale: 0.82 },
    squareRing: { profile: 'default', halfScale: 0.82 },
    fold: { profile: 'fold', halfScale: 0.85 },
    mote: { profile: 'mote', halfScale: 0.9 },
    spine: { profile: 'spine', halfScale: 0.55 },
    orbit: { profile: 'orbit', halfScale: 0.75 },
    ink: { profile: 'default', halfScale: 0.85 },
    flux: { profile: 'flux', halfScale: 0.72 },
    cinder: { profile: 'cinder', halfScale: 0.85 },
};

// Mid breath / scale so the bake isn't at a trough or peak.
const BAKE_TIME = 100000;

function cacheKey(skinId, radius) {
    return `${skinId}:${radius.toFixed(2)}`;
}

/**
 * @param {string} skinId
 * @param {number} radius  ship.radius in CSS px
 * @param {number} [bakeDpr=2]
 */
export function getHullBake(skinId, radius, bakeDpr = 2) {
    const key = cacheKey(skinId, radius);
    const hit = cache.get(key);
    if (hit) return hit;

    const skin = getSkin(skinId);
    const pad = Math.ceil(radius * 2.8);
    const cssSize = pad * 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cssSize * bakeDpr));
    canvas.height = Math.max(1, Math.round(cssSize * bakeDpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(bakeDpr, 0, 0, bakeDpr, 0, 0);

    const fakeShip = {
        x: pad,
        y: 0,
        radius,
        bank: 0,
        wallJelly: null,
        tangent: 0,
        game: null,
    };

    skin.drawHull(ctx, fakeShip, pad, BAKE_TIME);

    const entry = { canvas, origin: pad, cssSize, radius };
    cache.set(key, entry);
    return entry;
}

/**
 * Draw a baked hull with live bank + jelly transforms.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} ship
 * @param {number} screenY
 * @param {number} [time]
 */
export function drawCachedHull(ctx, ship, screenY, time = performance.now()) {
    const skinId = ship.game?.shipSkinId;
    const meta = HULL_META[skinId] || { profile: 'default', halfScale: 0.85 };
    const bake = getHullBake(skinId, ship.radius);
    beginHullFrame(
        ctx,
        ship,
        screenY,
        ship.bank ?? 0,
        time,
        meta.halfScale,
        meta.profile
    );
    ctx.drawImage(
        bake.canvas,
        -bake.origin,
        -bake.origin,
        bake.cssSize,
        bake.cssSize
    );
    ctx.restore();
}

export function clearHullCache() {
    cache.clear();
}

export function hullMetaFor(skinId) {
    return HULL_META[skinId] || { profile: 'default', halfScale: 0.85 };
}
