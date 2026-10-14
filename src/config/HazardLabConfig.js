// HazardLabConfig.js
// Sandbox descriptor for testing new hazards without Journey progression.
// Always opened from the Journey map Hazard Lab tile; does not touch
// journeyProgress or STEPS unlocks.
// Changes:
// - Playtest branch: spinner, hollowOrbit, blinkRow, tunnelField,
//   shoal, ricochet, satDebris, lightning, and meteorShower join the
//   lab roster. Snap removed. Not Journey unlocks.
// - Added blackhole (advanced Y-pull) so lab can practice the camera reseat.
// - Added wormhole to the roster; goalKm 6000 → 12000 for a longer practice run.
// - `sparklesTarget` (was pointsTarget) — lab has no star objectives.
// - Roster: phase, sweepGate, repulsor, driftCurrent, wormhole, blackhole.
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
    types: [
        'phase', 'sweepGate', 'repulsor', 'driftCurrent', 'wormhole', 'blackhole',
        'spinner', 'hollowOrbit', 'ricochet', 'blinkRow',
        'tunnelField', 'shoal',
        'satDebris', 'lightning', 'meteorShower',
    ],
    focusType: null,
    introduces: null,
    sparklesTarget: 0,
    smashTarget: 0,
    starSlots: 0,
    isHazardLab: true,
};

export const HAZARD_LAB_INTRO =
    'Hazard Lab. Blooms, sweeps, and new shapes: tunnel fields, lightning, meteor showers, satellite debris, and more. Practice only. Nothing counts toward Journey.';
