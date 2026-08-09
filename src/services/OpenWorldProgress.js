// OpenWorldProgress.js
// Local personal-best distance for Open Space. Device-only — the Supabase
// leaderboard stays anonymous/global; this is just "your best on this install"
// so the Play → Open Space card can show it.
// Changes:
// - v2 stores bestByStyle { zigzag?, arc? }. Legacy v1 bestScore migrates to
//   zigzag so existing installs keep feeling like today.
// - Empty / zero styles are omitted from bestByStyle (never surface Arc: 0 KM).
// - recordOpenWorldScore takes flightStyle; personalBestFor / personalBestsPresent
//   power the Mode Select footer hide-empty rules.

import { FLIGHT_STYLE } from '../config/flightStyle.js';

export const OPEN_WORLD_STORAGE_KEY = 'openWorldProgress';
const VERSION = 2;

function emptyProgress() {
    return { version: VERSION, bestByStyle: {} };
}

function normalizeStyle(flightStyle) {
    return flightStyle === FLIGHT_STYLE.arc ? FLIGHT_STYLE.arc : FLIGHT_STYLE.zigzag;
}

function sanitizeBest(n) {
    return Math.max(0, Math.floor(Number(n) || 0));
}

/**
 * @param {unknown} parsed
 * @returns {{ version: number, bestByStyle: Record<string, number> }}
 */
function migrateProgress(parsed) {
    if (!parsed || typeof parsed !== 'object') return emptyProgress();

    if (parsed.version === VERSION && parsed.bestByStyle && typeof parsed.bestByStyle === 'object') {
        const bestByStyle = {};
        const zig = sanitizeBest(parsed.bestByStyle[FLIGHT_STYLE.zigzag]);
        const arc = sanitizeBest(parsed.bestByStyle[FLIGHT_STYLE.arc]);
        if (zig > 0) bestByStyle[FLIGHT_STYLE.zigzag] = zig;
        if (arc > 0) bestByStyle[FLIGHT_STYLE.arc] = arc;
        return { version: VERSION, bestByStyle };
    }

    // v1: single bestScore — treat as zigzag (pre-split board).
    if (parsed.version === 1 || parsed.bestScore != null) {
        const zig = sanitizeBest(parsed.bestScore);
        const bestByStyle = {};
        if (zig > 0) bestByStyle[FLIGHT_STYLE.zigzag] = zig;
        return { version: VERSION, bestByStyle };
    }

    return emptyProgress();
}

/** @returns {{ version: number, bestByStyle: Record<string, number> }} */
export function loadOpenWorldProgress() {
    try {
        const raw = localStorage.getItem(OPEN_WORLD_STORAGE_KEY);
        if (!raw) return emptyProgress();
        return migrateProgress(JSON.parse(raw));
    } catch {
        return emptyProgress();
    }
}

export function saveOpenWorldProgress(progress) {
    try {
        localStorage.setItem(OPEN_WORLD_STORAGE_KEY, JSON.stringify(progress));
    } catch {
        /* ignore quota / private mode */
    }
    return progress;
}

/** Highest Open World distance (KM) for a flight style on this device. */
export function personalBestFor(progress, flightStyle) {
    const style = normalizeStyle(flightStyle);
    return sanitizeBest(progress?.bestByStyle?.[style]);
}

/**
 * Styles that have a recorded best (> 0), in zigzag-then-arc display order.
 * @returns {{ style: string, best: number }[]}
 */
export function personalBestsPresent(progress) {
    const out = [];
    const zig = personalBestFor(progress, FLIGHT_STYLE.zigzag);
    const arc = personalBestFor(progress, FLIGHT_STYLE.arc);
    if (zig > 0) out.push({ style: FLIGHT_STYLE.zigzag, best: zig });
    if (arc > 0) out.push({ style: FLIGHT_STYLE.arc, best: arc });
    return out;
}

/** @deprecated Prefer personalBestFor — returns max across styles for callers that still want one number. */
export function personalBest(progress) {
    const present = personalBestsPresent(progress);
    if (present.length === 0) return 0;
    return Math.max(...present.map((p) => p.best));
}

/**
 * Fold a finished Open World run into the local personal best for that style.
 * @returns {{ progress: object, bestScore: number, isNewBest: boolean }}
 */
export function recordOpenWorldScore(progress, score, flightStyle) {
    const style = normalizeStyle(flightStyle);
    const previous = personalBestFor(progress, style);
    const run = sanitizeBest(score);
    const bestScore = Math.max(previous, run);
    const bestByStyle = { ...(progress?.bestByStyle || {}) };

    if (bestScore > 0) {
        bestByStyle[style] = bestScore;
    } else {
        delete bestByStyle[style];
    }

    const next = { version: VERSION, bestByStyle };

    if (bestScore !== previous) {
        saveOpenWorldProgress(next);
    }

    return {
        progress: next,
        bestScore,
        isNewBest: run > previous && run > 0,
    };
}
