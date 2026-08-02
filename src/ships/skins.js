// skins.js
// Public API for ship skins: lookup, persistence, roster and menu previews.
// Changes:
// - Slimmed to a registry; hull geometry moved to hulls.js, wake renderers to
//   trails.js and the roster itself to skinDefs.js.
// - `drawSkinPreview` now feeds the renderers a banked hull and a gently curved
//   wake (with per-point tangents), so the cards actually show how each ship's
//   trail behaves in a turn rather than a straight column of dots.
// - load/save refuse premium skins the player doesn't own (Entitlements.js), so
//   a stale localStorage id can't equip a locked ship after a reinstall.

import { SKIN_DEFS } from './skinDefs.js';
import { MAX_BANK } from './hulls.js';
import { isSkinOwned } from '../services/Entitlements.js';

export const DEFAULT_SHIP_SKIN = 'focus';
export const SHIP_SKIN_STORAGE_KEY = 'shipSkinId';

export const skins = Object.fromEntries(SKIN_DEFS.map((skin) => [skin.id, skin]));

export const SHIP_SKIN_LIST = SKIN_DEFS;

/** @returns {string} */
export function resolveShipSkinId(id) {
    return skins[id] ? id : DEFAULT_SHIP_SKIN;
}

/** @returns {typeof SKIN_DEFS[0]} */
export function getSkin(id) {
    return skins[resolveShipSkinId(id)];
}

export function loadShipSkinId() {
    try {
        const id = resolveShipSkinId(localStorage.getItem(SHIP_SKIN_STORAGE_KEY));
        return isSkinOwned(id) ? id : DEFAULT_SHIP_SKIN;
    } catch {
        return DEFAULT_SHIP_SKIN;
    }
}

export function saveShipSkinId(id) {
    const resolved = resolveShipSkinId(id);
    if (!isSkinOwned(resolved)) return loadShipSkinId();
    try {
        localStorage.setItem(SHIP_SKIN_STORAGE_KEY, resolved);
    } catch {
        /* ignore quota / private mode */
    }
    return resolved;
}

// A short arc curving in from the lower left, sampled the way a live trail is
// (oldest first, each point carrying the direction of travel at that moment).
function previewWake(cx, cy, radius) {
    const count = 12;
    const span = radius * 3.4;
    const amp = radius * 0.75;
    const bend = 1.6;
    const trail = [];

    for (let i = count; i >= 1; i--) {
        const t = i / count;
        // Travel runs from high t to low t, so the tangent is the negated
        // derivative of the curve.
        const vx = Math.cos(t * bend) * bend * amp;
        const vy = -span;

        trail.push({
            x: cx - Math.sin(t * bend) * amp,
            y: cy + t * span,
            opacity: Math.max(0.08, 1 - t * 0.85),
            angle: Math.atan2(vx, -vy),
            seed: (i * 0.618) % 1,
        });
    }

    return trail;
}

/** Draw a skin at a screen-space point (menu / options preview). */
export function drawSkinPreview(ctx, skinId, cx, cy, radius, time = performance.now()) {
    const skin = getSkin(skinId);
    const bank = Math.min(MAX_BANK, Math.atan2(1.6 * 0.75, 4.2));

    const fakeShip = {
        x: cx,
        y: cy,
        radius,
        bank,
        tangent: bank,
        speed: radius * 0.12,
        tailPoint: () => ({
            x: cx - Math.sin(bank) * radius * 0.6,
            y: cy + Math.cos(bank) * radius * 0.6,
        }),
        game: { config: { spacecraft: { trailDotSize: 0.2 } } },
    };

    skin.drawTrail(ctx, fakeShip, previewWake(cx, cy, radius), (y) => y);
    skin.drawHull(ctx, fakeShip, cy, time);
}
