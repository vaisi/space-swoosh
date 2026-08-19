// JourneyProgress.js
// Journey progress persistence: which level is unlocked, and the stars and best
// points banked per level. Local only — the Supabase leaderboard stays purely
// Open World, so this needs no schema anywhere.
// Changes:
// - Arc unlocks only when Day 42 is cleared (`isArcUnlocked`). `arcUnlockSeen`
//   is a once-only flag for the ending joke card (no version bump).
// - One epilogue reply per device: `epilogueReplyDone` + optional `epilogueOrdinal`.
// - Playtest `?level=42&nearend=1` boots that Journey day a few hundred KM
//   before the gate (localhost epilogue testing). `nearend=500` sets remaining KM.
// - v2 migrate: v1 saves are kept (not wiped). Completing old Day 40 unlocks 41
//   so Continue plays Arrival. Mid-journey days stay on their numbers.
// - Playtest `UNLOCK_ALL_LEVELS` (plus `?unlocklevels=1|0`) opens every Journey
//   tile without rewriting saved `unlocked`. Flip the constant false for store.
// - starCount / totalStars only count slots a level actually exposes (1/2/3).
// - Persists `loreSeen` so the pre-Journey Signal Story lore screen shows once.
// - Created file. Reads/writes are guarded the same way ships/skins.js guards
//   its preference, so private mode or a full quota degrades to "no progress"
//   rather than throwing mid-run.

import {
    clampLevel,
    STARS_PER_LEVEL,
    TOTAL_LEVELS,
    starsAvailableFor,
} from '../config/JourneyConfig.js';

export const JOURNEY_STORAGE_KEY = 'journeyProgress';
const VERSION = 2;
/** Last flown day before the 42-level Arrival expansion. */
const PREVIOUS_FINALE = 40;

/** Playtest unlock — true so the Journey map can fly every level. Flip false for store. */
export const UNLOCK_ALL_LEVELS = true;

/** Default remaining KM when `?nearend=1` (flag, not 1 KM). */
const DEFAULT_NEAREND_REMAINING_KM = 350;

function searchParams() {
    try {
        if (typeof location === 'undefined') return null;
        return new URLSearchParams(location.search);
    } catch {
        return null;
    }
}

/**
 * Query override for web testers: `?unlocklevels=1` forces on, `=0`/`false` forces
 * off even when the constant is true. Missing query falls through to the constant.
 * @returns {boolean|null}
 */
function unlockAllLevelsFromQuery() {
    const params = searchParams();
    if (!params?.has('unlocklevels')) return null;
    const value = params.get('unlocklevels');
    return value === '0' || value === 'false' ? false : true;
}

/** `?level=42` → clamped Journey day, or null if the query is absent. */
export function playtestLevelFromQuery() {
    const params = searchParams();
    if (!params?.has('level')) return null;
    const n = Math.floor(Number(params.get('level')));
    if (!Number.isFinite(n) || n < 1) return null;
    return clampLevel(n);
}

/**
 * Remaining KM for a near-end warp. `?nearend=1` / `true` / empty → 350.
 * `?nearend=500` → 500. Missing or `0`/`false` → no warp.
 * @returns {number|null}
 */
export function playtestNearEndRemainingKm() {
    const params = searchParams();
    if (!params?.has('nearend')) return null;
    const raw = String(params.get('nearend') ?? '').trim();
    if (raw === '0' || raw === 'false') return null;
    if (raw === '' || raw === '1' || raw === 'true') return DEFAULT_NEAREND_REMAINING_KM;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_NEAREND_REMAINING_KM;
    return n;
}

/** True when every Journey tile should be playable (constant or URL override). */
export function unlockAllLevelsEnabled() {
    const fromQuery = unlockAllLevelsFromQuery();
    if (fromQuery !== null) return fromQuery;
    return UNLOCK_ALL_LEVELS;
}

function sanitizeOrdinal(value) {
    const n = Math.floor(Number(value) || 0);
    return n > 0 ? n : null;
}

function progressMeta(progress) {
    return {
        loreSeen: Boolean(progress?.loreSeen),
        arcUnlockSeen: Boolean(progress?.arcUnlockSeen),
        epilogueReplyDone: Boolean(progress?.epilogueReplyDone),
        epilogueOrdinal: sanitizeOrdinal(progress?.epilogueOrdinal),
    };
}

function emptyProgress() {
    return {
        version: VERSION,
        unlocked: 1,
        ...progressMeta(null),
        levels: {},
    };
}

function completedLevel(levels, level) {
    const entry = levels?.[level] ?? levels?.[String(level)];
    const stars = entry?.stars;
    return Array.isArray(stars) && stars[0] === true;
}

/**
 * Lift a stored record to v2 without wiping. Unknown future versions reset.
 * @param {object} parsed
 */
function migrateProgress(parsed) {
    if (!parsed || typeof parsed !== 'object') return emptyProgress();
    const storedVersion = Math.floor(Number(parsed.version) || 0);
    if (storedVersion > VERSION) return emptyProgress();

    const levels = sanitizeLevels(parsed.levels);
    let unlocked = Math.floor(Number(parsed.unlocked) || 1);
    if (storedVersion < 2 && completedLevel(parsed.levels, PREVIOUS_FINALE) && unlocked <= PREVIOUS_FINALE) {
        unlocked = PREVIOUS_FINALE + 1;
    }

    return {
        version: VERSION,
        unlocked: clampLevel(unlocked),
        ...progressMeta(parsed),
        levels,
    };
}

/** @returns {{ version: number, unlocked: number, loreSeen: boolean, arcUnlockSeen: boolean, epilogueReplyDone: boolean, epilogueOrdinal: number | null, levels: Record<string, { stars: boolean[], bestPoints: number }> }} */
export function loadJourneyProgress() {
    try {
        const raw = localStorage.getItem(JOURNEY_STORAGE_KEY);
        if (!raw) return emptyProgress();

        const parsed = JSON.parse(raw);
        const next = migrateProgress(parsed);
        if (parsed?.version !== VERSION || next.unlocked !== parsed.unlocked) {
            saveJourneyProgress(next);
        }
        return next;
    } catch {
        return emptyProgress();
    }
}

function sanitizeLevels(levels) {
    if (!levels || typeof levels !== 'object') return {};

    const clean = {};
    for (const [key, entry] of Object.entries(levels)) {
        const level = Number(key);
        if (!Number.isInteger(level) || level < 1 || level > TOTAL_LEVELS) continue;

        clean[level] = {
            stars: normalizeStars(entry?.stars),
            bestPoints: Math.max(0, Math.floor(Number(entry?.bestPoints) || 0)),
        };
    }
    return clean;
}

function normalizeStars(stars) {
    const list = Array.isArray(stars) ? stars : [];
    return Array.from({ length: STARS_PER_LEVEL }, (_, i) => Boolean(list[i]));
}

export function saveJourneyProgress(progress) {
    try {
        localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(progress));
    } catch {
        /* ignore quota / private mode */
    }
    return progress;
}

export function levelEntry(progress, level) {
    return progress.levels[level] ?? { stars: normalizeStars(null), bestPoints: 0 };
}

export function levelStars(progress, level) {
    return levelEntry(progress, level).stars;
}

export function starCount(progress, level) {
    const slots = starsAvailableFor(level);
    return levelStars(progress, level).slice(0, slots).filter(Boolean).length;
}

export function isLevelUnlocked(progress, level) {
    if (unlockAllLevelsEnabled()) return true;
    return level <= progress.unlocked;
}

export function isLevelCleared(progress, level) {
    return levelStars(progress, level)[0] === true;
}

/** Arc is flyable only after Day 42 is actually cleared. Playtest map unlock does not count. */
export function isArcUnlocked(progress) {
    return isLevelCleared(progress, TOTAL_LEVELS);
}

export function hasSeenArcUnlock(progress) {
    return Boolean(progress?.arcUnlockSeen);
}

/** Mark the first-ending Arc joke card as shown and persist. */
export function markArcUnlockSeen(progress) {
    const next = {
        ...progress,
        version: VERSION,
        ...progressMeta(progress),
        arcUnlockSeen: true,
        unlocked: clampLevel(progress?.unlocked ?? 1),
        levels: progress?.levels ?? {},
    };
    saveJourneyProgress(next);
    return next;
}

export function hasEpilogueReply(progress) {
    return Boolean(progress?.epilogueReplyDone);
}

/**
 * Consume the one-shot written ending. Skip and send both count.
 * Body is not stored locally.
 */
export function markEpilogueReply(progress, { ordinal = null } = {}) {
    const next = {
        ...progress,
        version: VERSION,
        ...progressMeta(progress),
        epilogueReplyDone: true,
        epilogueOrdinal: sanitizeOrdinal(ordinal) ?? sanitizeOrdinal(progress?.epilogueOrdinal),
        unlocked: clampLevel(progress?.unlocked ?? 1),
        levels: progress?.levels ?? {},
    };
    saveJourneyProgress(next);
    return next;
}

export function totalStars(progress) {
    return Object.keys(progress.levels)
        .reduce((sum, level) => sum + starCount(progress, level), 0);
}

/** The furthest level the player can play, for "Continue". */
export function nextPlayableLevel(progress) {
    return clampLevel(progress.unlocked);
}

export function hasSeenJourneyLore(progress) {
    return Boolean(progress?.loreSeen);
}

/** Mark the pre-Journey lore screen as completed and persist. */
export function markJourneyLoreSeen(progress) {
    const next = {
        ...progress,
        version: VERSION,
        ...progressMeta(progress),
        loreSeen: true,
        unlocked: clampLevel(progress.unlocked ?? 1),
        levels: progress.levels ?? {},
    };
    saveJourneyProgress(next);
    return next;
}

/**
 * Fold one finished run into the progress record. Stars are cumulative — a
 * later run can add the points or smash star without repeating the others — and
 * clearing a level unlocks the next one.
 *
 * @returns {{ progress: object, stars: boolean[], newStars: boolean[], unlockedNext: boolean, bestPoints: number }}
 */
export function recordLevelResult(progress, { level, stars, points, completed }) {
    const target = clampLevel(level);
    const previous = levelEntry(progress, target);
    const earned = normalizeStars(stars);

    const merged = earned.map((star, i) => star || previous.stars[i]);
    const newStars = earned.map((star, i) => star && !previous.stars[i]);
    const bestPoints = Math.max(previous.bestPoints, Math.floor(points) || 0);

    const shouldUnlock = completed && target === progress.unlocked && target < TOTAL_LEVELS;

    const next = {
        version: VERSION,
        unlocked: shouldUnlock ? target + 1 : progress.unlocked,
        ...progressMeta(progress),
        levels: { ...progress.levels, [target]: { stars: merged, bestPoints } },
    };

    saveJourneyProgress(next);

    return {
        progress: next,
        stars: merged,
        newStars,
        unlockedNext: shouldUnlock,
        bestPoints,
    };
}
