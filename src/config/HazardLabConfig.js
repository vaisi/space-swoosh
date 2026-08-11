// HazardLabConfig.js
// Sandbox descriptor for testing new hazards without Journey progression.
// Always opened from the Journey map Hazard Lab tile; does not touch
// journeyProgress or STEPS unlocks.
// Changes:
// - `sparklesTarget` (was pointsTarget) — lab has no star objectives.
// - Roster: phase, sweepGate, repulsor, driftCurrent.
// - Intro mentions push nodes + drift lanes.
// - Created file: HAZARD_LAB descriptor (types, goal, mid difficulty, no stars).

/** Synthetic level descriptor consumed by HazardLabProfile / outcome UI. */
export const HAZARD_LAB = {
    id: 'hazardLab',
    level: 0,
    chapterId: 'lab',
    chapterName: 'Hazard Lab',
    difficulty: 0.45,
    goalKm: 6000,
    types: ['phase', 'sweepGate', 'repulsor', 'driftCurrent'],
    focusType: null,
    introduces: null,
    sparklesTarget: 0,
    smashTarget: 0,
    starSlots: 0,
    isHazardLab: true,
};

export const HAZARD_LAB_INTRO =
    'Hazard Lab — square blooms (force field when open), sweeps, push nodes, wind. Neither counts toward Journey.';
