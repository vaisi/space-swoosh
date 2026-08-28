// LogbookEntries.js
// Static Journey Logbook catalog: categories, entry copy, unlock modes.
// Changes:
// - Wormhole Gate lives under Boosts (hop + shield gift), not Obstacles.
// - Shortened obstacle and boost definitions so Space Log cards fit ~3 lines.
// - Removed Space Travel Boost from the catalog (flyout gameplay is unchanged).
// - Dropped em dashes from Space Log player-facing copy.

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
    'Observed. The definition is incomplete until we touch it, carefully.',
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
            'A solid ink disc. Common, round, and lethal on contact.',
        remark: 'Geometry at its most agreeable.',
        unlockMode: 'observeThenInteract',
        icon: 'asteroidCircle',
    },
    {
        id: 'asteroidTriangle',
        category: 'obstacles',
        name: 'Shard Asteroid',
        definition:
            'A triangular ink shard. Corners catch you on a glance.',
        remark: 'Three points. One opinion.',
        unlockMode: 'observeThenInteract',
        icon: 'asteroidTriangle',
    },
    {
        id: 'asteroidSquare',
        category: 'obstacles',
        name: 'Block Asteroid',
        definition:
            'A square ink block. Right angles in the flight path.',
        remark: 'Right angles in a wrong place.',
        unlockMode: 'observeThenInteract',
        icon: 'asteroidSquare',
    },
    {
        id: 'sideBarrier',
        category: 'obstacles',
        name: 'Side Barrier',
        definition:
            'Paired walls that pinch the corridor. Hit them and you are done.',
        remark: 'The edges of the page also bite.',
        unlockMode: 'observeThenInteract',
        icon: 'sideBarrier',
    },
    {
        id: 'complex',
        category: 'obstacles',
        name: 'Complex Asteroid',
        definition:
            'A core with orbiting moons. Smash a moon or the core; both kill.',
        remark: 'One rock. Several opinions.',
        unlockMode: 'observeThenInteract',
        icon: 'complex',
    },
    {
        id: 'moving',
        category: 'obstacles',
        name: 'Moving Asteroid',
        definition:
            'A pentagon that drifts left and right. Do not trust where it was.',
        remark: 'Inertia has hobbies.',
        unlockMode: 'observeThenInteract',
        icon: 'moving',
    },
    {
        id: 'shooting',
        category: 'obstacles',
        name: 'Shooting Asteroid',
        definition:
            'A star that fires shots. Body and shots both kill without a shield.',
        remark: 'It objects at range. Noted.',
        unlockMode: 'observeThenInteract',
        icon: 'shooting',
    },
    {
        id: 'pulsating',
        category: 'obstacles',
        name: 'Pulsating Asteroid',
        definition:
            'A disc that grows and shrinks. A gap that fits now may close next beat.',
        remark: 'Breathing rock. Illogical, yet consistent.',
        unlockMode: 'observeThenInteract',
        icon: 'pulsating',
    },
    {
        id: 'phase',
        category: 'obstacles',
        name: 'Square Bloom',
        definition:
            'One square blooms into four spinning ones. The shove is real; contact still kills.',
        remark: 'Geometry that inhales.',
        unlockMode: 'observeThenInteract',
        icon: 'phase',
    },
    {
        id: 'sweepGate',
        category: 'obstacles',
        name: 'Sweep Gate',
        definition:
            'A slim ink blade that sweeps the corridor. Time the gap. No style bonus here.',
        remark: 'A clock with teeth.',
        unlockMode: 'observeThenInteract',
        icon: 'sweepGate',
    },
    {
        id: 'repulsor',
        category: 'obstacles',
        name: 'Repulsor Node',
        definition:
            'A solid core with a wide push field. The core kills; the shove still logs contact.',
        remark: 'Personal space, enforced.',
        unlockMode: 'observeThenInteract',
        icon: 'repulsor',
    },
    {
        id: 'driftCurrent',
        category: 'obstacles',
        name: 'Drift Current',
        definition:
            'A full-width band of shear lines. Inside it, the ship is shoved left or right.',
        remark: 'Weather with opinions.',
        unlockMode: 'observeThenInteract',
        icon: 'driftCurrent',
    },
    {
        id: 'blackhole',
        category: 'obstacles',
        name: 'Black Hole',
        definition:
            'A well that pulls you toward its core. The body is solid; the pull still logs contact.',
        remark: 'Attraction without consent. Classic.',
        unlockMode: 'observeThenInteract',
        icon: 'blackhole',
    },
    {
        id: 'spaceBoop',
        category: 'obstacles',
        name: 'Space BOOP',
        definition:
            'The ship hits a screen edge. It compresses, squeaks, and turns sharply.',
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
            'A Signal-Blue envelope for a few seconds. Hits smash rocks instead of the ship.',
        remark: 'Temporary immortality. Do not file under permanent.',
        unlockMode: 'observeThenInteract',
        icon: 'shield',
    },
    {
        id: 'wormhole',
        category: 'boosts',
        name: 'Wormhole Gate',
        definition:
            'Paired rings. Cross the entry to jump to the exit and gain a brief shield.',
        remark: 'You arrive elsewhere. The rocks do not apologize.',
        unlockMode: 'observeThenInteract',
        icon: 'wormhole',
    },
    {
        id: 'wallBoost',
        category: 'boosts',
        name: 'Wall Boost',
        definition:
            'A thin Signal-Blue edge slab on deep runs. Bank into it for a shield and a speed burst.',
        remark: 'The wall finally has manners.',
        unlockMode: 'observeThenInteract',
        icon: 'wallBoost',
    },
    {
        id: 'pointsSparkle',
        category: 'boosts',
        name: 'Fuel Sparkle',
        definition:
            'A Signal-Blue diamond that refills fuel. Miss too many and the engines die.',
        remark: 'Brightness you can burn.',
        unlockMode: 'observeThenInteract',
        icon: 'pointsSparkle',
    },
    {
        id: 'styleSwoosh',
        category: 'boosts',
        name: 'Style Swoosh',
        definition:
            'Thread a tight gap between two obstacles. You get style points and a blue flourish.',
        remark: 'Precision is its own currency.',
        unlockMode: 'instant',
        icon: 'styleSwoosh',
    },
    {
        id: 'deflectorSmash',
        category: 'boosts',
        name: 'Deflector Smash',
        definition:
            'A shielded hit that pulverizes a rock. Debris flies; points and the smash count go up.',
        remark: 'Manners optional. Physics mandatory.',
        unlockMode: 'instant',
        icon: 'deflectorSmash',
    },
    {
        id: 'finishGate',
        category: 'boosts',
        name: 'Finish Gate',
        definition:
            'A Signal-Blue stream between two wall emitters. Cross it to clear the Journey level.',
        remark: 'The stream is not a suggestion.',
        unlockMode: 'observeThenInteract',
        icon: 'finishGate',
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
