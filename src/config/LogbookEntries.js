// LogbookEntries.js
// Static Journey Logbook catalog: categories, entry copy, unlock modes.
// Changes:
// - Repulsor + Drift Current catalog entries (Hazard Lab).
// - Phase Asteroid + Sweep Gate catalog entries (sandbox / Hazard Lab first).
// - Journey tab (id `levels`): lore + Day N entries from LEVEL_MESSAGES.
//   UI label is “Journey”; entry names are “Day N” (not Level N).
// - Added wallBoost: thin Signal-Blue edge slab → shield + speed refresh.
// - Finish Gate: Signal-Blue jet stream between wall emitters (not dotted rule).
// - Deflector Smash / Finish Gate: flyout smashes still score; results finalize
//   when the level-clear sequence enters screenIn.
// - Complex / shooting asteroid copy notes shield smashes clip moons or shots
//   separately from the parent body.
// - Split simple asteroids into circle / triangle / square entries so each
//   in-game shape is logged with its real silhouette.
// - Created file: obstacles, boosts, Journey day entries, From the Void stub.

import { TOTAL_LEVELS } from './JourneyConfig.js';
import {
    LEVEL_MESSAGES,
    PRE_LEVEL_1_LORE,
    PRE_LEVEL_1_LORE_TITLE,
} from './JourneyNarrative.js';

/** First Levels-tab entry — unlocked when the player Continues past the lore screen. */
export const LORE_ENTRY_ID = 'signalCall';

/** @typedef {'obstacles' | 'boosts' | 'levels' | 'void'} LogbookCategory */
/** @typedef {'observeThenInteract' | 'instant'} UnlockMode */
/**
 * @typedef {{
 *   id: string,
 *   category: LogbookCategory,
 *   name: string,
 *   definition: string,
 *   remark: string,
 *   unlockMode: UnlockMode,
 *   icon: string,
 * }} LogbookEntryDef
 */

export const LOGBOOK_CATEGORIES = [
    { id: 'obstacles', label: 'Obstacles' },
    { id: 'boosts', label: 'Boosts' },
    { id: 'levels', label: 'Journey' },
    { id: 'void', label: 'From the Void' },
];

export const OBSERVED_PENDING_LINES = [
    'Sensors registered the phenomenon. Interaction required before a full reading.',
    'Visual contact confirmed. Understanding remains provisional.',
    'Catalogued by outline only. Direct contact will complete the entry.',
    'Observed. The definition is incomplete until we touch it — carefully.',
];

export const EMPTY_LOGBOOK_COPY =
    'The pages are blank. Explore space. Then explore the space log.';

export const EMPTY_CATEGORY_COPY = {
    obstacles: 'No contacts logged. The rocks are patient.',
    boosts: 'No boosts recorded. Opportunity is still theoretical.',
    levels: 'No flight reports filed. Begin a Journey.',
    void: 'No transmissions. Sensors remain optimistic.',
};

/** Map ObstacleManager class names → catalog ids (SimpleAsteroid uses shapeType). */
export const OBSTACLE_CLASS_TO_ID = {
    SideBarrier: 'sideBarrier',
    ComplexAsteroid: 'complex',
    MovingAsteroid: 'moving',
    ShootingAsteroid: 'shooting',
    PulsatingAsteroid: 'pulsating',
    PhaseAsteroid: 'phase',
    SweepGate: 'sweepGate',
    RepulsorObstacle: 'repulsor',
    DriftCurrent: 'driftCurrent',
    WormholeGate: 'wormhole',
    BlackHoleObstacle: 'blackhole',
};

/** SimpleAsteroid.shapeType → catalog id */
export const SIMPLE_SHAPE_TO_ID = {
    circle: 'asteroidCircle',
    triangle: 'asteroidTriangle',
    square: 'asteroidSquare',
};

/** @type {LogbookEntryDef[]} */
const OBSTACLE_ENTRIES = [
    {
        id: 'asteroidCircle',
        category: 'obstacles',
        name: 'Round Asteroid',
        definition:
            'A solid ink disc. The most common simple body — circular collision, no edges to thread.',
        remark: 'Geometry at its most agreeable.',
        unlockMode: 'observeThenInteract',
        icon: 'asteroidCircle',
    },
    {
        id: 'asteroidTriangle',
        category: 'obstacles',
        name: 'Shard Asteroid',
        definition:
            'A triangular ink shard. Same family as the round rock, sharper silhouette; corners matter at glancing contact.',
        remark: 'Three points. One opinion.',
        unlockMode: 'observeThenInteract',
        icon: 'asteroidTriangle',
    },
    {
        id: 'asteroidSquare',
        category: 'obstacles',
        name: 'Block Asteroid',
        definition:
            'A square ink block. Axis-aligned after rotation; slightly smaller fill so its visual weight matches the circle and triangle.',
        remark: 'Right angles in a wrong place.',
        unlockMode: 'observeThenInteract',
        icon: 'asteroidSquare',
    },
    {
        id: 'sideBarrier',
        category: 'obstacles',
        name: 'Side Barrier',
        definition:
            'Paired vertical walls that narrow the corridor. Collision geometry is rectangular; clearance is a matter of arc discipline.',
        remark: 'The edges of the page also bite.',
        unlockMode: 'observeThenInteract',
        icon: 'sideBarrier',
    },
    {
        id: 'complex',
        category: 'obstacles',
        name: 'Complex Asteroid',
        definition:
            'A primary disc with orbiting debris moons. Hitboxes include satellites. With a shield up, smashing a moon removes only that moon; the core must be hit to clear the cluster. Threading awards style if clearance is tight enough.',
        remark: 'One rock. Several opinions.',
        unlockMode: 'observeThenInteract',
        icon: 'complex',
    },
    {
        id: 'moving',
        category: 'obstacles',
        name: 'Moving Asteroid',
        definition:
            'A pentagon that drifts laterally across the flight path. Past position is not future position.',
        remark: 'Inertia has hobbies.',
        unlockMode: 'observeThenInteract',
        icon: 'moving',
    },
    {
        id: 'shooting',
        category: 'obstacles',
        name: 'Shooting Asteroid',
        definition:
            'A star-form hazard that emits projectiles. Both body and shot count as lethal contact without a shield. With a shield up, smashing a shot removes only that shot; the star must be hit to clear it.',
        remark: 'It objects at range. Noted.',
        unlockMode: 'observeThenInteract',
        icon: 'shooting',
    },
    {
        id: 'pulsating',
        category: 'obstacles',
        name: 'Pulsating Asteroid',
        definition:
            'A disc whose radius expands and resets on a cycle. A gap that fits now may not fit on the next beat.',
        remark: 'Breathing rock. Illogical, yet consistent.',
        unlockMode: 'observeThenInteract',
        icon: 'pulsating',
    },
    {
        id: 'phase',
        category: 'obstacles',
        name: 'Square Bloom',
        definition:
            'One ink square that springs into four rotating outer squares (overshoot, then magnetic lock) and breathes back. While expanded, a soft push shoves the ship — squares still kill on contact. Fly the open centre.',
        remark: 'Geometry that inhales.',
        unlockMode: 'observeThenInteract',
        icon: 'phase',
    },
    {
        id: 'sweepGate',
        category: 'obstacles',
        name: 'Sweep Gate',
        definition:
            'A slim ink line that spins through the corridor like a wiper blade. No hub, no trail — just the blade. Style swoosh does not score on this set piece.',
        remark: 'A clock with teeth.',
        unlockMode: 'observeThenInteract',
        icon: 'sweepGate',
    },
    {
        id: 'repulsor',
        category: 'obstacles',
        name: 'Repulsor Node',
        definition:
            'A solid ink core that pushes the ship away in a wide soft field — the opposite of a black hole. The core is lethal; the push alone counts as contact for the log.',
        remark: 'Personal space, enforced.',
        unlockMode: 'observeThenInteract',
        icon: 'repulsor',
    },
    {
        id: 'driftCurrent',
        category: 'obstacles',
        name: 'Drift Current',
        definition:
            'A full-width band of flowing ink shear lines that shove the ship sideways while you are inside. No rails, no solid body — just the current.',
        remark: 'Weather with opinions.',
        unlockMode: 'observeThenInteract',
        icon: 'driftCurrent',
    },
    {
        id: 'wormhole',
        category: 'obstacles',
        name: 'Wormhole Gate',
        definition:
            'Paired entry and exit rings. Crossing the entry teleports the ship to the exit and grants a brief deflector.',
        remark: 'You arrive elsewhere. The rocks do not apologize.',
        unlockMode: 'observeThenInteract',
        icon: 'wormhole',
    },
    {
        id: 'blackhole',
        category: 'obstacles',
        name: 'Black Hole',
        definition:
            'A gravitational anomaly that pulls the ship toward its core. The body itself remains a solid collision. Pull alone counts as contact for the log.',
        remark: 'Attraction without consent. Classic.',
        unlockMode: 'observeThenInteract',
        icon: 'blackhole',
    },
    {
        id: 'spaceBoop',
        category: 'obstacles',
        name: 'Space BOOP',
        definition:
            'Contact with the screen sidewall. The hull compresses against the edge of the playfield; the event is audible and annotated BOOP.',
        remark: 'The universe has borders. They squeak.',
        unlockMode: 'instant',
        icon: 'spaceBoop',
    },
];

/** @type {LogbookEntryDef[]} */
const BOOST_ENTRIES = [
    {
        id: 'shield',
        category: 'boosts',
        name: 'Deflector Shield',
        definition:
            'A Signal-Blue energy envelope lasting several seconds. While active, asteroid contact destroys the rock instead of the ship.',
        remark: 'Temporary immortality. Do not file under permanent.',
        unlockMode: 'observeThenInteract',
        icon: 'shield',
    },
    {
        id: 'wallBoost',
        category: 'boosts',
        name: 'Wall Boost',
        definition:
            'A rare thin Signal-Blue slab on a random left or right edge, seen only on deep runs (past 12000 KM). Banking into it grants a fresh deflector shield and a strong forward speed boost. Safer than ink side barriers — blue means charge, not crash.',
        remark: 'The wall finally has manners.',
        unlockMode: 'observeThenInteract',
        icon: 'wallBoost',
    },
    {
        id: 'pointsSparkle',
        category: 'boosts',
        name: 'Point Sparkle',
        definition:
            'A Signal-Blue collectible that awards points on contact. Appears along the corridor after the opening stretch of a run.',
        remark: 'Brightness with a number attached.',
        unlockMode: 'observeThenInteract',
        icon: 'pointsSparkle',
    },
    {
        id: 'styleSwoosh',
        category: 'boosts',
        name: 'Style Swoosh',
        definition:
            'Awarded when the ship threads a narrow gap between two obstacles without contact. Grants style points and a brief Signal-Blue flourish.',
        remark: 'Precision is its own currency.',
        unlockMode: 'instant',
        icon: 'styleSwoosh',
    },
    {
        id: 'deflectorSmash',
        category: 'boosts',
        name: 'Deflector Smash',
        definition:
            'Shielded impact that pulverizes an obstacle. Debris particles mark the event; points and the destroyed counter advance — including during the level-clear flyout.',
        remark: 'Manners optional. Physics mandatory.',
        unlockMode: 'instant',
        icon: 'deflectorSmash',
    },
    {
        id: 'finishGate',
        category: 'boosts',
        name: 'Finish Gate',
        definition:
            'Journey destination: a Signal-Blue energy stream fired between two wall emitters. Crossing it begins the level-clear sequence; the final score locks when the results screen fades in.',
        remark: 'The stream is not a suggestion.',
        unlockMode: 'observeThenInteract',
        icon: 'finishGate',
    },
    {
        id: 'spaceTravelBoost',
        category: 'boosts',
        name: 'Space Travel Boost',
        definition:
            'Autopilot acceleration after a cleared Journey level. The ship centres, boosts off-screen, and the world yields the outcome report.',
        remark: 'Exit velocity: theatrical.',
        unlockMode: 'instant',
        icon: 'spaceTravelBoost',
    },
];

function buildLevelEntries() {
    /** @type {LogbookEntryDef[]} */
    const entries = [
        {
            id: LORE_ENTRY_ID,
            category: 'levels',
            name: PRE_LEVEL_1_LORE_TITLE,
            definition: PRE_LEVEL_1_LORE,
            remark: 'Keep moving. Listen to the voice.',
            unlockMode: 'instant',
            icon: 'level',
        },
    ];
    for (let level = 1; level <= TOTAL_LEVELS; level++) {
        const line = LEVEL_MESSAGES[level] ?? `Level ${level} transmission.`;
        entries.push({
            id: `level_${level}`,
            category: 'levels',
            name: `Day ${level}`,
            definition: line,
            remark: level <= 5
                ? 'Early flight. The voice is teaching.'
                : 'Logged from the navigator’s open channel.',
            unlockMode: 'observeThenInteract',
            icon: 'level',
        });
    }
    return entries;
}

/** @type {LogbookEntryDef[]} */
export const LOGBOOK_ENTRIES = [
    ...OBSTACLE_ENTRIES,
    ...BOOST_ENTRIES,
    ...buildLevelEntries(),
];

/** @type {Map<string, LogbookEntryDef>} */
export const LOGBOOK_BY_ID = new Map(LOGBOOK_ENTRIES.map((e) => [e.id, e]));

export function entriesForCategory(categoryId) {
    return LOGBOOK_ENTRIES.filter((e) => e.category === categoryId);
}

export function levelEntryId(level) {
    return `level_${level}`;
}
