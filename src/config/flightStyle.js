// flightStyle.js
// Arc (classic swoosh) vs Zigzag (straight ±angle, tap/swipe to switch).
// Changes:
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
        if (v === FLIGHT_STYLE.zigzag) return FLIGHT_STYLE.zigzag;
    } catch {
        // ignore quota / private mode
    }
    return FLIGHT_STYLE.arc;
}

export function saveFlightStyle(style) {
    const next = style === FLIGHT_STYLE.zigzag
        ? FLIGHT_STYLE.zigzag
        : FLIGHT_STYLE.arc;
    try {
        localStorage.setItem(STORAGE_KEY, next);
    } catch {
        // ignore
    }
    return next;
}
