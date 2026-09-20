// OpenWorldProgress.js
// Local personal-best Open Space distance + obstacles. Device-only — the
// Supabase leaderboard stays anonymous/global; this backs the Play card and
// the Friends Space Board YOU row while Game Center / Play Games catch up.
// Changes:
// - v3 stores bestDestroyedByStyle alongside bestByStyle so Friends can show
//   asteroids smashed, not only KM.
// - v2 bestByStyle and v1 bestScore still migrate to zigzag.

import { FLIGHT_STYLE } from '../config/flightStyle.js';

export const OPEN_WORLD_STORAGE_KEY = 'openWorldProgress';
const VERSION = 3;

function emptyProgress() {
    return { version: VERSION, bestByStyle: {}, bestDestroyedByStyle: {} };
}

function normalizeStyle(flightStyle) {
    return flightStyle === FLIGHT_STYLE.arc ? FLIGHT_STYLE.arc : FLIGHT_STYLE.zigzag;
}

function sanitizeBest(n) {
    return Math.max(0, Math.floor(Number(n) || 0));
}

function pickBests(source) {
    const out = {};
    if (!source || typeof source !== 'object') return out;
    const zig = sanitizeBest(source[FLIGHT_STYLE.zigzag]);
    const arc = sanitizeBest(source[FLIGHT_STYLE.arc]);
    if (zig > 0) out[FLIGHT_STYLE.zigzag] = zig;
    if (arc > 0) out[FLIGHT_STYLE.arc] = arc;
    return out;
}

/**
 * @param {unknown} parsed
 * @returns {{ version: number, bestByStyle: Record<string, number>, bestDestroyedByStyle: Record<string, number> }}
 */
function migrateProgress(parsed) {
    if (!parsed || typeof parsed !== 'object') return emptyProgress();

    if (
        (parsed.version === 2 || parsed.version === VERSION)
        && parsed.bestByStyle
        && typeof parsed.bestByStyle === 'object'
    ) {
        return {
            version: VERSION,
            bestByStyle: pickBests(parsed.bestByStyle),
            bestDestroyedByStyle: pickBests(parsed.bestDestroyedByStyle),
        };
    }

    // v1: single bestScore — treat as zigzag (pre-split board).
    if (parsed.version === 1 || parsed.bestScore != null) {
        const zig = sanitizeBest(parsed.bestScore);
        const bestByStyle = {};
        if (zig > 0) bestByStyle[FLIGHT_STYLE.zigzag] = zig;
        return { version: VERSION, bestByStyle, bestDestroyedByStyle: {} };
    }

    return emptyProgress();
}

/** @returns {{ version: number, bestByStyle: Record<string, number>, bestDestroyedByStyle: Record<string, number> }} */
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

/** Highest Open World asteroids destroyed for a flight style on this device. */
export function personalBestDestroyedFor(progress, flightStyle) {
    const style = normalizeStyle(flightStyle);
    return sanitizeBest(progress?.bestDestroyedByStyle?.[style]);
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
export function recordOpenWorldScore(progress, score, flightStyle, obstaclesDestroyed = 0) {
    const style = normalizeStyle(flightStyle);
    const previous = personalBestFor(progress, style);
    const previousSmash = personalBestDestroyedFor(progress, style);
    const run = sanitizeBest(score);
    const smashRun = sanitizeBest(obstaclesDestroyed);
    const bestScore = Math.max(previous, run);
    const bestSmash = Math.max(previousSmash, smashRun);
    const bestByStyle = { ...(progress?.bestByStyle || {}) };
    const bestDestroyedByStyle = { ...(progress?.bestDestroyedByStyle || {}) };

    if (bestScore > 0) {
        bestByStyle[style] = bestScore;
    } else {
        delete bestByStyle[style];
    }
    if (bestSmash > 0) {
        bestDestroyedByStyle[style] = bestSmash;
    } else {
        delete bestDestroyedByStyle[style];
    }

    const next = { version: VERSION, bestByStyle, bestDestroyedByStyle };

    if (bestScore !== previous || bestSmash !== previousSmash) {
        saveOpenWorldProgress(next);
    }

    return {
        progress: next,
        bestScore,
        isNewBest: run > previous && run > 0,
    };
}
