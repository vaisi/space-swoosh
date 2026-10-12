// ObstacleIntensity.js
// Per-type intensity knobs for the new obstacles: [gentle, today, hard].
// Intensity 0 is the gentle end, 0.5 is today's playtest tuning, 1 is hard.
// Changes:
// - Created file: knobs for spinner, hollowOrbit, ricochet, blinkRow,
//   tunnelField, shoal, satDebris, lightning, meteorShower. Intensity comes
//   from profile.intensityFor(type), else profile.loadDifficulty; web
//   `?intensity=0..1` overrides it everywhere (Hazard Lab preview).
// - Meteor shower warn: 1.05 / 0.75 / 0.5 s of harmless dashed streaks.

import { lerp } from '../utils/math.js';

export const INTENSITY = {
    spinner: { spin: [1.6, 2.15, 2.7] },
    hollowOrbit: { spin: [0.9, 1.25, 1.6] },
    ricochet: { speed: [0.8, 1, 1.2] },
    blinkRow: { beat: [0.95, 0.72, 0.56] },
    tunnelField: { slackSec: [0.13, 0.08, 0.05], legs: [2, 3, 4] },
    shoal: { count: [7, 10, 12], speed: [0.11, 0.14, 0.17] },
    satDebris: { speed: [0.8, 1, 1.2] },
    lightning: { warn: [1.2, 0.9, 0.7], rest: [2.2, 1.5, 1.0], reach: [0.5, 0.62, 0.72] },
    meteorShower: { count: [8, 12, 16], speed: [0.6, 0.7, 0.8], warn: [1.05, 0.75, 0.5] },
};

function urlIntensity() {
    if (typeof location === 'undefined') return null;
    const raw = new URLSearchParams(location.search).get('intensity');
    if (raw == null || raw === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

const URL_INTENSITY = urlIntensity();

/** 0..1 for this type in this run. */
export function intensityOf(game, type) {
    const profile = game?.profile;
    const value = URL_INTENSITY
        ?? profile?.intensityFor?.(type)
        ?? profile?.loadDifficulty
        ?? 0.5;
    return Math.max(0, Math.min(1, value));
}

/** Gentle→today over 0..0.5, today→hard over 0.5..1. */
export function knob(game, type, name) {
    const [gentle, today, hard] = INTENSITY[type][name];
    const t = intensityOf(game, type);
    return t < 0.5 ? lerp(gentle, today, t * 2) : lerp(today, hard, (t - 0.5) * 2);
}

export function knobInt(game, type, name) {
    return Math.round(knob(game, type, name));
}
