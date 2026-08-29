// skins.js
// Public API for ship skins: lookup, persistence, roster and menu previews.
// Changes:
// - Default equipped ship is Flicker (`DEFAULT_SHIP_SKIN`) when unset / unknown
//   / not owned — not Focus.
// - Menu preview samples originate at skin.trailTailOffset (Nyan centre;
//   Rook tucks at the fuselage tail) so hangar wakes match in-play attach.
// - Menu preview always uses the short wake so it never covers the title;
//   in-game length still follows trailMaxPoints / trailFade.
// - Preview fakeShip stamps `_wallTrailMode` so new crease/cloud/ladder/lag/
//   script wakes still deform correctly in the Options picker.
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

export const DEFAULT_SHIP_SKIN = 'flicker';
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
// Newest sample sits on the skin's tail attach so thin hulls don't leak wake
// from mid-body.
function previewWake(cx, cy, radius, { longWake = false, attachX = cx, attachY = cy } = {}) {
    const count = longWake ? 22 : 12;
    const span = radius * (longWake ? 5.4 : 3.4);
    const amp = radius * (longWake ? 0.9 : 0.75);
    const bend = 1.6;
    const t0 = 1 / count;
    const trail = [];

    for (let i = count; i >= 1; i--) {
        const t = i / count;
        // Travel runs from high t to low t, so the tangent is the negated
        // derivative of the curve.
        const vx = Math.cos(t * bend) * bend * amp;
        const vy = -span;

        trail.push({
            x: attachX - (Math.sin(t * bend) - Math.sin(t0 * bend)) * amp,
            y: attachY + (t - t0) * span,
            opacity: Math.max(0.08, 1 - t * (longWake ? 0.72 : 0.85)),
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
    // Menu card stays short so the wake never covers the title / HOLD cue.
    // In-game length is trailMaxPoints / trailFade on the skin.
    const fakeShip = {
        x: cx,
        y: cy,
        radius,
        bank,
        tangent: bank,
        speed: radius * 0.12,
        _wallTrailMode: skin.wallTrailMode ?? 'spring',
        tailPoint: () => {
            const offset = radius * (skin.trailTailOffset ?? 0.6);
            return {
                x: cx - Math.sin(bank) * offset,
                y: cy + Math.cos(bank) * offset,
            };
        },
        game: { config: { spacecraft: { trailDotSize: 0.2 } } },
    };

    const attach = fakeShip.tailPoint();
    skin.drawTrail(ctx, fakeShip, previewWake(cx, cy, radius, {
        attachX: attach.x,
        attachY: attach.y,
    }), (y) => y);
    skin.drawHull(ctx, fakeShip, cy, time);
}
