// JourneyConfig.js
// The Journey: a finite, ordered list of levels whose difficulty climbs in
// steps and then holds, with each plateau lasting longer than the one before.
// This is the single source of truth for a level's length, difficulty, obstacle
// roster and star targets — `JourneyProfile` only translates it into the knobs
// the managers read.
// Changes:
// - Star slots scale with the teach band: L1–3 → 1 star, L4 → 2, L5+ → 3.
// - Goal KM after L5: +500 each level; L10/15/20/25/30/35/40 also +1000 extra.
// - Teach-band goals: L1 1000 → L2 2000 → L3 3000 → L4 4000 → L5 7500.
// - Levels 1–5 Signal Story tutorial: empty → simple → moving → sparkles →
//   shields. `moving` at L3; sideBarrier/complex later.
// - Points star from L4; smash star from L5.
// - Created file: STEPS, CHAPTERS, JOURNEY_LEVELS / JOURNEY_CHAPTERS, star rules.

// One entry = one difficulty step. `d` is the 0-1 difficulty scalar every
// tunable lerps from, and `levels` is how long the plateau at that height
// lasts. Plateaus lengthen as `d` rises. `unlock` is the obstacle type the
// step introduces; rosters are cumulative.
//
// First five steps are the teach band (1 level each): empty → simple → moving
// → same + sparkles (profile gate) → same + shields (profile gate).
const STEPS = [
    { d: 0.16, levels: 1, unlock: null },
    { d: 0.22, levels: 1, unlock: 'simple' },
    { d: 0.28, levels: 1, unlock: 'moving' },
    { d: 0.30, levels: 1, unlock: null },
    { d: 0.32, levels: 1, unlock: null },
    { d: 0.42, levels: 3, unlock: 'sideBarrier' },
    { d: 0.50, levels: 3, unlock: 'complex' },
    { d: 0.58, levels: 4, unlock: 'shooting' },
    { d: 0.68, levels: 5, unlock: 'pulsating' },
    { d: 0.78, levels: 5, unlock: 'wormhole' },
    { d: 0.90, levels: 6, unlock: 'blackhole' },
    { d: 1.00, levels: 9, unlock: null },
];

const CHAPTERS = [
    { id: 'troposphere', name: 'Troposphere', steps: 5, blurb: 'Learn the path. Listen to the voice.' },
    { id: 'stratosphere', name: 'Stratosphere', steps: 2, blurb: 'The debris starts moving.' },
    { id: 'mesosphere', name: 'Mesosphere', steps: 2, blurb: 'Hostile, and unstable.' },
    { id: 'thermosphere', name: 'Thermosphere', steps: 2, blurb: 'Space folds here.' },
    { id: 'exosphere', name: 'Exosphere', steps: 1, blurb: 'Nothing holds you now.' },
];

/** Fixed goal KM for the Troposphere teach band (levels 1–5). */
const TEACH_GOAL_KM = {
    1: 1000,
    2: 2000,
    3: 3000,
    4: 4000,
    5: 7500,
};

/** After the teach band, every level adds this many KM. */
const GOAL_KM_STEP = 500;
/** Milestone levels also add this many KM on top of the regular step. */
const GOAL_KM_MILESTONE_BONUS = 1000;
const GOAL_KM_MILESTONE_LEVELS = new Set([10, 15, 20, 25, 30, 35, 40]);

// Points needed for the second star, per 1000 KM (levels with sparkles).
const POINTS_TARGET_PER_1000KM = 6;
/** First level that can spawn point sparkles (and earn the points star). */
export const POINTS_FROM_LEVEL = 4;
/** First level that can spawn shields (and earn the smash star). */
export const SHIELDS_FROM_LEVEL = 5;
const POINTS_STAR_FLOOR = 25;
const SMASH_STAR_FLOOR = 1;
const SMASH_AFTER_TEACH = 2;
const SMASH_LEVELS_PER_STEP = 7;
const SMASH_TARGET_MAX = 6;

function roundTo(value, step) {
    return Math.round(value / step) * step;
}

function pickFocus(introduces, setPieces, indexInStep) {
    if (introduces && introduces !== 'simple') return introduces;
    if (setPieces.length === 0) return null;
    return setPieces[indexInStep % setPieces.length];
}

/** How many star objectives this level exposes (1 / 2 / 3). */
export function starsAvailableFor(level) {
    const n = Math.floor(Number(level) || 1);
    if (n < POINTS_FROM_LEVEL) return 1;
    if (n < SHIELDS_FROM_LEVEL) return 2;
    return 3;
}

function pointsTargetFor(levelNumber, goalKm) {
    if (levelNumber < POINTS_FROM_LEVEL) return 0;
    if (levelNumber === POINTS_FROM_LEVEL) return POINTS_STAR_FLOOR;
    return Math.max(
        POINTS_STAR_FLOOR,
        roundTo((goalKm / 1000) * POINTS_TARGET_PER_1000KM, 5)
    );
}

function smashTargetFor(levelNumber) {
    if (levelNumber < SHIELDS_FROM_LEVEL) return 0;
    if (levelNumber === SHIELDS_FROM_LEVEL) return SMASH_STAR_FLOOR;
    const steps = Math.floor((levelNumber - SHIELDS_FROM_LEVEL - 1) / SMASH_LEVELS_PER_STEP);
    return Math.min(SMASH_TARGET_MAX, SMASH_AFTER_TEACH + steps);
}

function goalKmFor(levelNumber, previousGoalKm) {
    if (TEACH_GOAL_KM[levelNumber] != null) return TEACH_GOAL_KM[levelNumber];
    let goal = previousGoalKm + GOAL_KM_STEP;
    if (GOAL_KM_MILESTONE_LEVELS.has(levelNumber)) {
        goal += GOAL_KM_MILESTONE_BONUS;
    }
    return goal;
}

function buildLevels() {
    const levels = [];
    const roster = [];
    let chapterIndex = 0;
    let stepsIntoChapter = 0;
    let previousGoalKm = 0;

    STEPS.forEach((step, stepIndex) => {
        if (step.unlock) roster.push(step.unlock);
        const chapter = CHAPTERS[Math.min(chapterIndex, CHAPTERS.length - 1)];
        const types = [...roster];
        const setPieces = types.filter((type) => type !== 'simple');

        for (let i = 0; i < step.levels; i++) {
            const levelNumber = levels.length + 1;
            const goalKm = goalKmFor(levelNumber, previousGoalKm);
            previousGoalKm = goalKm;
            const introduces = i === 0 ? step.unlock : null;
            const starSlots = starsAvailableFor(levelNumber);

            levels.push({
                level: levelNumber,
                chapterId: chapter.id,
                chapterName: chapter.name,
                stepIndex,
                indexInStep: i,
                plateauLength: step.levels,
                difficulty: step.d,
                goalKm,
                types,
                focusType: pickFocus(introduces, setPieces, i),
                introduces,
                pointsTarget: pointsTargetFor(levelNumber, goalKm),
                smashTarget: smashTargetFor(levelNumber),
                starSlots,
            });
        }

        stepsIntoChapter++;
        if (stepsIntoChapter >= chapter.steps) {
            chapterIndex++;
            stepsIntoChapter = 0;
        }
    });

    return levels;
}

export const JOURNEY_LEVELS = buildLevels();
export const TOTAL_LEVELS = JOURNEY_LEVELS.length;

/** Sum of starSlots across every Journey level (denominator for map / mode select). */
export const TOTAL_STARS = JOURNEY_LEVELS.reduce((sum, level) => sum + level.starSlots, 0);

export const JOURNEY_CHAPTERS = CHAPTERS.map((chapter) => {
    const levels = JOURNEY_LEVELS.filter((level) => level.chapterId === chapter.id);
    return {
        ...chapter,
        levels,
        from: levels[0].level,
        to: levels[levels.length - 1].level,
    };
});

export function clampLevel(level) {
    const n = Math.floor(Number(level) || 1);
    return Math.min(TOTAL_LEVELS, Math.max(1, n));
}

/** @returns {typeof JOURNEY_LEVELS[0]} */
export function getLevel(level) {
    return JOURNEY_LEVELS[clampLevel(level) - 1];
}

export function getChapterFor(level) {
    const descriptor = getLevel(level);
    return JOURNEY_CHAPTERS.find((chapter) => chapter.id === descriptor.chapterId);
}

// --- Stars -------------------------------------------------------------------
// Storage always holds up to three slots (distance / points / smash). Early
// levels only expose the first one or two — UI tallies use `starSlots`.
export const STARS_PER_LEVEL = 3;

export function evaluateStars(descriptor, { completed, points, obstaclesDestroyed }) {
    if (!completed) return [false, false, false];
    const slots = descriptor.starSlots ?? starsAvailableFor(descriptor.level);
    return [
        true,
        slots >= 2 && descriptor.pointsTarget > 0 && points >= descriptor.pointsTarget,
        slots >= 3 && descriptor.smashTarget > 0 && obstaclesDestroyed >= descriptor.smashTarget,
    ];
}

/** Objective names for the slots this level exposes. */
export function starLabelsFor(descriptor) {
    const all = [
        'Reach the goal',
        'Collect points',
        'Smash asteroids',
    ];
    const slots = descriptor?.starSlots ?? STARS_PER_LEVEL;
    return all.slice(0, slots);
}

/** @deprecated Prefer starLabelsFor(descriptor) — kept for callers that need all three names. */
export function starLabels() {
    return [
        'Reach the goal',
        'Collect points',
        'Smash asteroids',
    ];
}
