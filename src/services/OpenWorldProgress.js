// OpenWorldProgress.js
// Local personal-best distance for Open World. Device-only — the Supabase
// leaderboard stays anonymous/global; this is just "your best on this install"
// so the Play → Open World card can show it.
// Changes:
// - Created file. Fail-soft localStorage reads/writes match JourneyProgress
//   (private mode / quota → treat as no best yet).

export const OPEN_WORLD_STORAGE_KEY = 'openWorldProgress';
const VERSION = 1;

function emptyProgress() {
    return { version: VERSION, bestScore: 0 };
}

/** @returns {{ version: number, bestScore: number }} */
export function loadOpenWorldProgress() {
    try {
        const raw = localStorage.getItem(OPEN_WORLD_STORAGE_KEY);
        if (!raw) return emptyProgress();

        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== VERSION) return emptyProgress();

        return {
            version: VERSION,
            bestScore: Math.max(0, Math.floor(Number(parsed.bestScore) || 0)),
        };
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

/** Highest Open World distance (KM) recorded on this device. */
export function personalBest(progress) {
    return Math.max(0, Math.floor(progress?.bestScore || 0));
}

/**
 * Fold a finished Open World run into the local personal best.
 * @returns {{ progress: object, bestScore: number, isNewBest: boolean }}
 */
export function recordOpenWorldScore(progress, score) {
    const previous = personalBest(progress);
    const run = Math.max(0, Math.floor(score) || 0);
    const bestScore = Math.max(previous, run);
    const next = { version: VERSION, bestScore };

    if (bestScore !== previous) {
        saveOpenWorldProgress(next);
    }

    return {
        progress: next,
        bestScore,
        isNewBest: run > previous && run > 0,
    };
}
