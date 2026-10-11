// HangarLore.js
// Lore-order roster and archive copy for the Hangar. Ship ids stay the
// game's ids; display order follows navCues.json (Saber is Hull 004).
// Changes:
// - hangarOnFile() counts owned listed hulls against the 39 on the roster.
// - Added the lore roster, archive card fields, and the seen-set for NEW ENTRY.
// - Hidden Merlin and Rook stay unlisted and cannot be equipped from here.

import navCues from './navCues.json';
import { skins } from '../ships/skins.js';
import { isSkinOwned } from '../services/Entitlements.js';

const SEEN_KEY = 'hangarSeenShipIds';
const SEED_KEY = 'hangarSeenSeeded';

/** @typedef {{ id: string, num: string, name: string, hidden: boolean, filedAs: string, archiveNote: string, lines: object[] }} HangarEntry */

/** @type {HangarEntry[]} */
export const HANGAR_ROSTER = navCues.ships.map((ship) => {
    const id = String(ship.name || '').trim().toLowerCase();
    return {
        id,
        num: String(ship.num),
        name: ship.name,
        hidden: Boolean(ship.hidden) || Boolean(skins[id]?.hidden),
        filedAs: ship.filed_as,
        archiveNote: ship.archive_note,
        lines: ship.lines || [],
    };
});

const LISTED_TOTAL = HANGAR_ROSTER.filter((entry) => !entry.hidden).length;

const byId = new Map(HANGAR_ROSTER.map((entry) => [entry.id, entry]));

export function hangarEntry(id) {
    return byId.get(id) || null;
}

export function hangarIndexOf(id) {
    const index = HANGAR_ROSTER.findIndex((entry) => entry.id === id);
    return index >= 0 ? index : 0;
}

/** Owned listed hulls, and how many listed hulls the roster files (39). */
export function hangarOnFile() {
    let owned = 0;
    for (const entry of HANGAR_ROSTER) {
        if (!entry.hidden && isSkinOwned(entry.id)) owned++;
    }
    return { owned, listed: LISTED_TOTAL };
}

/** `Hull 004 / 039` for a listed hull. Hidden hulls use the unlisted label. */
export function hangarFileLabel(entry) {
    if (!entry || entry.hidden) return 'Hull ??? / Unlisted';
    const num = String(entry.num).padStart(3, '0');
    const total = String(LISTED_TOTAL).padStart(3, '0');
    return `Hull ${num} / ${total}`;
}

function readSeen() {
    try {
        const raw = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
        return new Set(Array.isArray(raw) ? raw : []);
    } catch {
        return new Set();
    }
}

function writeSeen(set) {
    try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
    } catch {
        /* private mode */
    }
}

/**
 * First launch after this ships marks the current fleet as seen, so existing
 * owners do not all get a NEW ENTRY stamp at once.
 */
export function ensureHangarSeenSeed() {
    try {
        if (localStorage.getItem(SEED_KEY)) return;
    } catch {
        return;
    }
    const seen = new Set();
    for (const entry of HANGAR_ROSTER) {
        if (!entry.hidden && isSkinOwned(entry.id)) seen.add(entry.id);
    }
    writeSeen(seen);
    try {
        localStorage.setItem(SEED_KEY, '1');
    } catch {
        /* private mode */
    }
}

export function markHangarSeen(id) {
    if (!id) return;
    const seen = readSeen();
    if (seen.has(id)) return;
    seen.add(id);
    writeSeen(seen);
}

export function isHangarNew(id) {
    if (!id || !isSkinOwned(id)) return false;
    const entry = hangarEntry(id);
    if (!entry || entry.hidden) return false;
    return !readSeen().has(id);
}

export function hasUnseenHangarShip() {
    return HANGAR_ROSTER.some((entry) => isHangarNew(entry.id));
}
