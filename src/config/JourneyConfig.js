// JourneyConfig.js
// The Journey: a finite, ordered list of levels whose difficulty climbs in
// steps and then holds, with each plateau lasting longer than the one before.
// This is the single source of truth for a level's length, difficulty, obstacle
// roster and star targets — `JourneyProfile` only translates it into the knobs
// the managers read.
// Changes:
// - Level 1 is a short tutorial run (2,000 km) rather than sitting on the same
//   4,000+ km ramp as the rest of Troposphere — long enough to learn the turn,
//   short enough that the first clear isn't a grind.
// - Third star is a smash mission (`smashTarget` asteroids destroyed with the
//   shield), not "take no hits" — bumping rocks is the fantasy.
// - `starLabels()` names the objectives only; the outcome screen prints each
//   target beside the figure actually reached, so baking it into the label said
//   the same number twice.
// - Created file: STEPS (the stair), CHAPTERS (names + how many steps each
//   spans), the derived JOURNEY_LEVELS / JOURNEY_CHAPTERS tables, and the star
//   rules.

import { lerp } from '../utils/math.js';

// One entry = one difficulty step. `d` is the 0-1 difficulty scalar every
// tunable lerps from, and `levels` is how long the plateau at that height
// lasts. Plateaus lengthen as `d` rises, so the climb reads as: a little
// harder, a stretch to master it, harder again, then a longer stretch. `unlock`
// is the obstacle type the step introduces; rosters are cumulative.
//
// Appending steps here (and topping up CHAPTERS to cover them) is all a new
// chapter of the Journey takes.
const STEPS = [
    { d: 0.08, levels: 2, unlock: 'simple' },
    { d: 0.16, levels: 3, unlock: 'sideBarrier' },
    { d: 0.26, levels: 3, unlock: 'complex' },
    { d: 0.36, levels: 4, unlock: 'moving' },
    { d: 0.46, levels: 4, unlock: 'shooting' },
    { d: 0.58, levels: 5, unlock: 'pulsating' },
    { d: 0.70, levels: 5, unlock: 'wormhole' },
    { d: 0.84, levels: 6, unlock: 'blackhole' },
    { d: 1.00, levels: 8, unlock: null },
];

// Named bands over those steps. The atmosphere names come from the old
// PhaseManager, which never shipped — this is where they belong.
const CHAPTERS = [
    { id: 'troposphere', name: 'Troposphere', steps: 2, blurb: 'Thick air. Loose rock.' },
    { id: 'stratosphere', name: 'Stratosphere', steps: 2, blurb: 'The debris starts moving.' },
    { id: 'mesosphere', name: 'Mesosphere', steps: 2, blurb: 'Hostile, and unstable.' },
    { id: 'thermosphere', name: 'Thermosphere', steps: 2, blurb: 'Space folds here.' },
    { id: 'exosphere', name: 'Exosphere', steps: 1, blurb: 'Nothing holds you now.' },
];

// Run length in KM. Both ends are wide because pace rises with difficulty too,
// so a late level is longer *and* faster. Level 1 is overridden below — it is a
// short first flight, not a full step on this ramp.
const GOAL_KM = { min: 4000, max: 12000 };
const LEVEL_ONE_GOAL_KM = 2000;
// Length still creeps up inside a plateau even though difficulty does not, so a
// held difficulty never feels like the same level twice.
const GOAL_KM_PER_LEVEL_IN_STEP = 300;
// Points needed for the second star, per 1000 KM of the run.
const POINTS_TARGET_PER_1000KM = 15;

function roundTo(value, step) {
    return Math.round(value / step) * step;
}

function pickFocus(introduces, setPieces, indexInStep) {
    if (introduces && introduces !== 'simple') return introduces;
    if (setPieces.length === 0) return null;
    return setPieces[indexInStep % setPieces.length];
}

function buildLevels() {
    const levels = [];
    const roster = [];
    let chapterIndex = 0;
    let stepsIntoChapter = 0;

    STEPS.forEach((step, stepIndex) => {
        if (step.unlock) roster.push(step.unlock);
        const chapter = CHAPTERS[Math.min(chapterIndex, CHAPTERS.length - 1)];
        const types = [...roster];
        const setPieces = types.filter((type) => type !== 'simple');

        for (let i = 0; i < step.levels; i++) {
            const levelNumber = levels.length + 1;
            const goalKm = levelNumber === 1
                ? LEVEL_ONE_GOAL_KM
                : roundTo(
                    lerp(GOAL_KM.min, GOAL_KM.max, step.d) + i * GOAL_KM_PER_LEVEL_IN_STEP,
                    100
                );
            const introduces = i === 0 ? step.unlock : null;

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
                // Each level in a plateau leans on a different set piece, so
                // levels of equal difficulty still play differently — except the
                // one introducing a hazard, which shows off the new arrival.
                focusType: pickFocus(introduces, setPieces, i),
                introduces,
                pointsTarget: Math.max(
                    25,
                    roundTo((goalKm / 1000) * POINTS_TARGET_PER_1000KM, 5)
                ),
                // Shield-smash side quest: a few early, a real hunt late.
                // Soft end sits just under 3.5 so level 1 rounds to 3, not 4.
                smashTarget: Math.max(3, Math.round(lerp(2.5, 14, step.d))),
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
// Three per level, in a fixed order: finish it, hit the points target, and smash
// enough asteroids with the shield. Bumping rocks is encouraged.
export const STARS_PER_LEVEL = 3;

export function evaluateStars(descriptor, { completed, points, obstaclesDestroyed }) {
    if (!completed) return [false, false, false];
    return [
        true,
        points >= descriptor.pointsTarget,
        obstaclesDestroyed >= descriptor.smashTarget,
    ];
}

// Objective names only — the outcome screen prints the target next to the figure
// you actually reached, so baking it in here would say it twice.
export function starLabels() {
    return [
        'Reach the goal',
        'Collect points',
        'Smash asteroids',
    ];
}
