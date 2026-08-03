// LogbookProgress.js
// Journey Logbook persistence: observe / interact / known states per entry.
// Changes:
// - Created file: versioned localStorage, fail-soft like JourneyProgress.

import { LOGBOOK_BY_ID } from '../config/LogbookEntries.js';

export const LOGBOOK_STORAGE_KEY = 'logbookProgress';
const VERSION = 1;

/** @typedef {'locked' | 'observed' | 'known'} EntryState */

function emptyProgress() {
    return { version: VERSION, entries: {} };
}

/**
 * @returns {{ version: number, entries: Record<string, EntryState> }}
 */
export function loadLogbookProgress() {
    try {
        const raw = localStorage.getItem(LOGBOOK_STORAGE_KEY);
        if (!raw) return emptyProgress();

        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== VERSION) return emptyProgress();

        return {
            version: VERSION,
            entries: sanitizeEntries(parsed.entries),
        };
    } catch {
        return emptyProgress();
    }
}

function sanitizeEntries(entries) {
    if (!entries || typeof entries !== 'object') return {};

    const clean = {};
    for (const [id, state] of Object.entries(entries)) {
        if (!LOGBOOK_BY_ID.has(id)) continue;
        if (state === 'observed' || state === 'known') {
            clean[id] = state;
        }
    }

    // Legacy single "simple" entry → round / shard / block shapes.
    const legacy = entries.simple;
    if (legacy === 'observed' || legacy === 'known') {
        for (const id of ['asteroidCircle', 'asteroidTriangle', 'asteroidSquare']) {
            const current = clean[id];
            if (current === 'known') continue;
            if (legacy === 'known' || !current) clean[id] = legacy;
        }
    }

    return clean;
}

export function saveLogbookProgress(progress) {
    try {
        localStorage.setItem(LOGBOOK_STORAGE_KEY, JSON.stringify(progress));
    } catch {
        /* ignore quota / private mode */
    }
    return progress;
}

/** @returns {EntryState} */
export function getEntryState(progress, id) {
    return progress.entries[id] ?? 'locked';
}

/**
 * @returns {{ progress: object, changed: boolean, state: EntryState }}
 */
export function observeEntry(progress, id) {
    if (!LOGBOOK_BY_ID.has(id)) {
        return { progress, changed: false, state: 'locked' };
    }
    const current = getEntryState(progress, id);
    if (current === 'observed' || current === 'known') {
        return { progress, changed: false, state: current };
    }
    const next = {
        ...progress,
        entries: { ...progress.entries, [id]: 'observed' },
    };
    saveLogbookProgress(next);
    return { progress: next, changed: true, state: 'observed' };
}

/**
 * @returns {{ progress: object, changed: boolean, state: EntryState }}
 */
export function interactEntry(progress, id) {
    if (!LOGBOOK_BY_ID.has(id)) {
        return { progress, changed: false, state: 'locked' };
    }
    const current = getEntryState(progress, id);
    if (current === 'known') {
        return { progress, changed: false, state: current };
    }
    const next = {
        ...progress,
        entries: { ...progress.entries, [id]: 'known' },
    };
    saveLogbookProgress(next);
    return { progress: next, changed: true, state: 'known' };
}

/**
 * Instant entries: locked → known in one step.
 * @returns {{ progress: object, changed: boolean, state: EntryState }}
 */
export function revealInstant(progress, id) {
    return interactEntry(progress, id);
}

export function countKnown(progress) {
    return Object.values(progress.entries).filter((s) => s === 'known').length;
}

export function countUnlocked(progress) {
    return Object.keys(progress.entries).length;
}

export function hasAnyEntries(progress) {
    return Object.keys(progress.entries).length > 0;
}
