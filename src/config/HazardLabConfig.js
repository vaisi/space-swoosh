// HazardLabConfig.js
// Sandbox descriptor for testing new hazards without Journey progression.
// Always opened from the Journey map Hazard Lab tile; does not touch
// journeyProgress or STEPS unlocks.
// Changes:
// - Added wormhole to the roster; goalKm 6000 → 12000 for a longer practice run.
// - `sparklesTarget` (was pointsTarget) — lab has no star objectives.
// - Roster: phase, sweepGate, repulsor, driftCurrent, wormhole.
// - Intro mentions portals + push nodes + drift lanes.
// - Created file: HAZARD_LAB descriptor (types, goal, mid difficulty, no stars).

/** Synthetic level descriptor consumed by HazardLabProfile / outcome UI. */
export const HAZARD_LAB = {
    id: 'hazardLab',
    level: 0,
    chapterId: 'lab',
    chapterName: 'Hazard Lab',
    difficulty: 0.45,
    goalKm: 12000,
    types: ['phase', 'sweepGate', 'repulsor', 'driftCurrent', 'wormhole'],
    focusType: null,
    introduces: null,
    sparklesTarget: 0,
    smashTarget: 0,
    starSlots: 0,
    isHazardLab: true,
};

export const HAZARD_LAB_INTRO =
    'Hazard Lab — blooms, sweeps, push nodes, wind, and portals. Practice only — nothing counts toward Journey.';
