// JourneyProgress.js
// Journey progress persistence: which level is unlocked, and the stars and best
// points banked per level. Local only — the Supabase leaderboard stays purely
// Open World, so this needs no schema anywhere.
// Changes:
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
const VERSION = 1;

function emptyProgress() {
    return { version: VERSION, unlocked: 1, loreSeen: false, levels: {} };
}

/** @returns {{ version: number, unlocked: number, loreSeen: boolean, levels: Record<string, { stars: boolean[], bestPoints: number }> }} */
export function loadJourneyProgress() {
    try {
        const raw = localStorage.getItem(JOURNEY_STORAGE_KEY);
        if (!raw) return emptyProgress();

        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== VERSION) return emptyProgress();

        return {
            version: VERSION,
            unlocked: clampLevel(parsed.unlocked),
            loreSeen: Boolean(parsed.loreSeen),
            levels: sanitizeLevels(parsed.levels),
        };
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
    return level <= progress.unlocked;
}

export function isLevelCleared(progress, level) {
    return levelStars(progress, level)[0] === true;
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
        loreSeen: Boolean(progress.loreSeen),
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
