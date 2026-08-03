// flightStyle.js
// Arc (classic swoosh) vs Zigzag (straight ±angle, tap/key to flip — no swipe).
// Changes:
// - Default is now Zigzag when no preference is saved. Existing `arc` /
//   `zigzag` localStorage values are still respected.
// - Created so Options → Controls can persist a try-out flight style without
//   burying localStorage keys inside Game.js.

export const FLIGHT_STYLE = {
    arc: 'arc',
    zigzag: 'zigzag',
};

const STORAGE_KEY = 'spaceswoosh.flightStyle';

export function loadFlightStyle() {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v === FLIGHT_STYLE.arc) return FLIGHT_STYLE.arc;
        if (v === FLIGHT_STYLE.zigzag) return FLIGHT_STYLE.zigzag;
    } catch {
        // ignore quota / private mode
    }
    return FLIGHT_STYLE.zigzag;
}

export function saveFlightStyle(style) {
    const next = style === FLIGHT_STYLE.arc
        ? FLIGHT_STYLE.arc
        : FLIGHT_STYLE.zigzag;
    try {
        localStorage.setItem(STORAGE_KEY, next);
    } catch {
        // ignore
    }
    return next;
}
