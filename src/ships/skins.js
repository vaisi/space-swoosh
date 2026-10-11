// skins.js
// Public API for ship skins: lookup, persistence, roster and menu previews.
// Changes:
// - Hull + wake preview lives in skinPreview.js (drawSkinSpecimen). Menu
//   preview still uses the short wake via drawSkinPreview.
// - `skinRosterMark(id)` is the home hangar pager (`5 / 42`); hidden skins omitted.
// - SHIP_SKIN_LIST omits `hidden` skins (Merlin, Rook). resolve/load/save treat
//   a hidden id as unknown so a leftover shipSkinId falls back to Flicker.
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
import { drawSkinSpecimen } from './skinPreview.js';
import { isSkinOwned } from '../services/Entitlements.js';

export const DEFAULT_SHIP_SKIN = 'flicker';
export const SHIP_SKIN_STORAGE_KEY = 'shipSkinId';

export const skins = Object.fromEntries(SKIN_DEFS.map((skin) => [skin.id, skin]));

/** Hangar / menu / yearly pick — withheld skins stay in `skins` for lookup. */
export const SHIP_SKIN_LIST = SKIN_DEFS.filter((skin) => !skin.hidden);

/** Home hangar pager, 1-based. Hidden skins omitted. */
export function skinRosterParts(id) {
    const total = SHIP_SKIN_LIST.length;
    if (total === 0) return { index: 0, total: 0 };
    let i = SHIP_SKIN_LIST.findIndex((skin) => skin.id === id);
    if (i < 0) i = 0;
    return { index: i + 1, total };
}

/** Home hangar pager label — `"5 / 42"`. Hidden skins omitted. */
export function skinRosterMark(id) {
    const { index, total } = skinRosterParts(id);
    return `${index} / ${total}`;
}

function isListedSkin(id) {
    return Boolean(skins[id]) && !skins[id].hidden;
}

/** @returns {string} */
export function resolveShipSkinId(id) {
    return isListedSkin(id) ? id : DEFAULT_SHIP_SKIN;
}

/** @returns {typeof SKIN_DEFS[0]} */
export function getSkin(id) {
    return skins[resolveShipSkinId(id)];
}

export function loadShipSkinId() {
    try {
        const raw = localStorage.getItem(SHIP_SKIN_STORAGE_KEY);
        const id = resolveShipSkinId(raw);
        const next = isSkinOwned(id) ? id : DEFAULT_SHIP_SKIN;
        if (raw && raw !== next) {
            try {
                localStorage.setItem(SHIP_SKIN_STORAGE_KEY, next);
            } catch {
                /* ignore quota / private mode */
            }
        }
        return next;
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

export { drawSkinSpecimen } from './skinPreview.js';

/** Draw a skin at a screen-space point (menu / options preview). */
export function drawSkinPreview(ctx, skinId, cx, cy, radius, time = performance.now()) {
    // Menu card stays short so the wake never covers the title / HOLD cue.
    drawSkinSpecimen(ctx, getSkin(skinId), cx, cy, radius, time, { longWake: false });
}
