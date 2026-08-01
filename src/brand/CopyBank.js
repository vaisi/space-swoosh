// CopyBank.js
// Spock-voice flavor lines, pooled by screen. Screens pick once on enter so the
// words change visit to visit without reshuffling every frame.
// Changes:
// - Created file: menu / crash / victory / Journey fail & clear pools, plus
//   pickCopy() with a one-deep last-used guard so the same line rarely lands
//   twice in a row.

// Short. Witty. Smart. Funny. Shockingly truthful. Logical and dry — no
// exclamation marks, no emoji. A dry wonder ("Fascinating.") is permitted.

const POOLS = {
    menu: [
        'Clearance is a choice.',
        'The void does not grade on a curve.',
        'Probability of boredom: negligible.',
        'Your trajectory is illogical, yet effective.',
        'Asteroids ahead. Manners optional.',
        'Space is empty. Your excuses need not be.',
        'Logic suggests you press Play.',
        'The ship is ready. Are you.',
        'Distance is a suggestion. Survival is not.',
        'Fascinating place for a mistake.',
        'No life signs. Plenty of rock.',
        'Turn left. Or right. Or become debris.',
        'The leaderboard remembers. So does the void.',
        'Inertia is patient. You are not.',
        'A calm mind. A sharp arc. A short life, otherwise.',
        'Welcome back. The asteroids missed you. Briefly.',
        'Flight is simple. Remaining intact is the thesis.',
        'Sensors detect ambition. Also rocks.',
        'Live long. Or at least past the next belt.',
        'Paper universe. Real consequences.',
    ],

    crash: [
        'Trajectory terminated. Fascinating.',
        'Inertia was consulted. It declined.',
        'The asteroid had the right of way. Regrettably.',
        'Structural integrity: historical.',
        'That was not a gap. Noted.',
        'Survival probability just hit zero. Efficient.',
        'The rock remains unimpressed.',
        'Your arc was elegant. The ending was not.',
        'Debris now. Formally.',
        'Impact confirmed. Ego optional.',
        'Physics filed a complaint. It won.',
        'A learning opportunity. Loudly delivered.',
    ],

    victory: [
        'Live long and prosper.',
        'The void yields. Temporarily.',
        'Distance conquered. Humility recommended.',
        'Mission complete. The rocks are disappointed.',
        'You outran probability. Barely.',
        'End of line. Beginning of legend. Perhaps.',
    ],

    // Journey fail — plain lines; the km-short figure stays on the screen elsewhere
    // only if we want it, but the plan prefers personality over the template.
    fail: [
        'Short of the mark. The goal noticed.',
        'Almost. Almost is still debris.',
        'The finish line remains unimpressed.',
        'Insufficient distance. Excess optimism.',
        'Try again. The rocks are waiting.',
        'Trajectory incomplete. Ego intact. For now.',
        'You stopped. The level did not care.',
        'Close enough is a myth. Fascinating.',
        'The goal was ahead. You were not.',
        'Failure: educational. Also final.',
    ],

    clearPartial: [
        'Adequate. The remaining stars disagree.',
        'Cleared. Perfection postponed.',
        'The way ahead is open. The stars are picky.',
        'Forward. The unfinished business remains.',
        'Level secured. Ambition: pending.',
        'You lived. The stars want more.',
        'Progress noted. Brilliance deferred.',
        'Clearance granted. Applause withheld.',
        'Onward. Two truths can wait.',
        'The chapter continues. So do the gaps.',
    ],

    clearFlawless: [
        'Flawless. Fascinating.',
        'Three stars. Zero excuses.',
        'Perfect. Annoyingly so.',
        'Three stars. The rocks remember.',
        'Smashed, scored, finished. Excellent.',
        'All stars. No notes.',
        'Logic and luck, briefly allied.',
        'Immaculate. The void takes notes.',
        'Three of three. Probability sulks.',
        'Flawless ascent. Continue.',
    ],

    journeyComplete: [
        'You are away. Live long and prosper.',
        'Exosphere cleared. Nothing holds you now.',
        'Journey complete. The void applauds quietly.',
        'Forty levels. Zero patience for rocks.',
        'Away. As promised.',
        'The atmosphere is behind you. Stay that way.',
    ],
};

const lastPicked = Object.create(null);

/**
 * Pick a line from a named pool. Avoids the immediately previous pick for that
 * pool when the pool has more than one entry.
 * @param {keyof typeof POOLS} poolKey
 * @param {{ avoid?: string | null }} [opts]
 */
export function pickCopy(poolKey, { avoid = null } = {}) {
    const pool = POOLS[poolKey];
    if (!pool || pool.length === 0) return '';

    const banned = avoid ?? lastPicked[poolKey] ?? null;
    let choices = pool;
    if (banned && pool.length > 1) {
        const filtered = pool.filter((line) => line !== banned);
        if (filtered.length > 0) choices = filtered;
    }

    const line = choices[Math.floor(Math.random() * choices.length)];
    lastPicked[poolKey] = line;
    return line;
}

/** @returns {readonly string[]} */
export function copyPool(poolKey) {
    return POOLS[poolKey] ?? [];
}

/**
 * Which Journey outcome pool to use for the subtitle.
 * @param {{ completed: boolean, stars: boolean[], descriptor: { level: number } }} outcome
 * @param {number} totalLevels
 */
export function journeyFlavorPool(outcome, totalLevels) {
    if (!outcome.completed) return 'fail';
    if (outcome.descriptor.level >= totalLevels) return 'journeyComplete';
    if (outcome.stars.every(Boolean)) return 'clearFlawless';
    return 'clearPartial';
}
