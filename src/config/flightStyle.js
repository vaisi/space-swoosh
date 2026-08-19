// flightStyle.js
// Arc (classic swoosh) vs Zigzag (straight ±angle, tap/key to flip — no swipe).
// Changes:
// - Arc cannot be loaded or saved until Day 42 is cleared (isArcUnlocked).
//   Stale `arc` localStorage values coerce back to zigzag.
// - Default is now Zigzag when no preference is saved. Existing `arc` /
//   `zigzag` localStorage values are still respected once Arc is unlocked.
// - Created so Options → Controls can persist a try-out flight style without
//   burying localStorage keys inside Game.js.

import { isArcUnlocked, loadJourneyProgress } from '../services/JourneyProgress.js';

export const FLIGHT_STYLE = {
    arc: 'arc',
    zigzag: 'zigzag',
};

const STORAGE_KEY = 'spaceswoosh.flightStyle';

/** Clamp a requested style against current Journey progress. */
export function resolveFlightStyle(style, progress = loadJourneyProgress()) {
    if (style === FLIGHT_STYLE.arc && isArcUnlocked(progress)) return FLIGHT_STYLE.arc;
    return FLIGHT_STYLE.zigzag;
}

export function loadFlightStyle() {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v === FLIGHT_STYLE.arc || v === FLIGHT_STYLE.zigzag) {
            return resolveFlightStyle(v);
        }
    } catch {
        // ignore quota / private mode
    }
    return FLIGHT_STYLE.zigzag;
}

export function saveFlightStyle(style) {
    const next = resolveFlightStyle(style);
    try {
        localStorage.setItem(STORAGE_KEY, next);
    } catch {
        // ignore
    }
    return next;
}
