// HullCache.js
// Phase 1: bake each skin's resting hull to an offscreen canvas; blit via drawImage.
// Changes:
// - Seal jelly profile `seal` (halfScale 0.55). Orbit Spine bar (cached);
//   HULL_META still listed for the jelly profile.
// - Rook skipHullCache; HULL_META still listed for the jelly profile.
// - Merlin skipHullCache; HULL_META still listed for the jelly profile.
// - Darner / Puff / Argus / Chime plus Luna / Wish / Lantern / Bloom / Lyra /
//   Sprout / Plume / Koi / Spore / Boreal skip the cache via skipHullCache;
//   HULL_META still listed for the jelly profile.
// - Fletch reuses default jelly bake (smooth arrow hull).
// - Dusk reuses Echo's default jelly bake (same crescent hull).
// - Bake at the live canvas DPR (game.dpr) instead of a hardcoded 2, so the ship
//   stays as sharp as the vector-drawn scene at any DPR. Cache key includes DPR.
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
    fletch: { profile: 'default', halfScale: 0.85 },
    nyan: { profile: 'default', halfScale: 0.85 },
    shard: { profile: 'shard', halfScale: 0.85 },
    halo: { profile: 'halo', halfScale: 0.9 },
    needle: { profile: 'needle', halfScale: 0.55 },
    saber: { profile: 'needle', halfScale: 0.55 },
    echo: { profile: 'default', halfScale: 0.85 },
    dusk: { profile: 'default', halfScale: 0.85 },
    seal: { profile: 'seal', halfScale: 0.55 },
    hatch: { profile: 'default', halfScale: 0.82 },
    trace: { profile: 'default', halfScale: 0.82 },
    ring: { profile: 'default', halfScale: 0.82 },
    fold: { profile: 'fold', halfScale: 0.85 },
    mote: { profile: 'mote', halfScale: 0.9 },
    spine: { profile: 'spine', halfScale: 0.55 },
    orbit: { profile: 'orbit', halfScale: 0.55 },
    ink: { profile: 'default', halfScale: 0.85 },
    flux: { profile: 'flux', halfScale: 0.72 },
    cinder: { profile: 'cinder', halfScale: 0.85 },
    lantern: { profile: 'lantern', halfScale: 0.85 },
    bloom: { profile: 'bloom', halfScale: 0.9 },
    lyra: { profile: 'lyra', halfScale: 0.85 },
    sprout: { profile: 'sprout', halfScale: 0.85 },
    plume: { profile: 'plume', halfScale: 0.75 },
    koi: { profile: 'koi', halfScale: 0.8 },
    spore: { profile: 'spore', halfScale: 0.85 },
    boreal: { profile: 'boreal', halfScale: 0.55 },
    luna: { profile: 'luna', halfScale: 0.7 },
    wish: { profile: 'wish', halfScale: 0.55 },
    darner: { profile: 'darner', halfScale: 0.55 },
    puff: { profile: 'puff', halfScale: 0.9 },
    argus: { profile: 'argus', halfScale: 0.75 },
    chime: { profile: 'chime', halfScale: 0.85 },
    merlin: { profile: 'merlin', halfScale: 0.55 },
    rook: { profile: 'rook', halfScale: 0.55 },
};

// Mid breath / scale so the bake isn't at a trough or peak.
const BAKE_TIME = 100000;

function cacheKey(skinId, radius, bakeDpr) {
    return `${skinId}:${radius.toFixed(2)}:${bakeDpr.toFixed(2)}`;
}

/**
 * @param {string} skinId
 * @param {number} radius  ship.radius in CSS px
 * @param {number} [bakeDpr=2]  device pixels per CSS px (game.dpr); clamped 1–3
 */
export function getHullBake(skinId, radius, bakeDpr = 2) {
    bakeDpr = Math.min(3, Math.max(1, bakeDpr || 2));
    const key = cacheKey(skinId, radius, bakeDpr);
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
    const bake = getHullBake(skinId, ship.radius, ship.game?.dpr ?? 2);
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
