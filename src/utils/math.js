// math.js
// Tiny numeric helpers shared by the run profiles and the Journey difficulty
// curve, so tuning code reads as intent rather than arithmetic.
// Changes:
// - Created file: clamp01 / lerp / lerpInt.

export function clamp01(t) {
    return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Linear interpolation with the parameter clamped to [0, 1]. */
export function lerp(a, b, t) {
    return a + (b - a) * clamp01(t);
}

/** `lerp` rounded to a whole number — for counts (obstacles on screen, etc). */
export function lerpInt(a, b, t) {
    return Math.round(lerp(a, b, t));
}
