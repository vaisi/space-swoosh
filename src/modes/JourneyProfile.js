// JourneyProfile.js
// Turns one Journey level descriptor into the knobs the managers read. Every
// tunable is a lerp of the level's single `difficulty` scalar, which is what
// keeps the stair-with-plateaus curve honest: hold `d` and nothing gets harder,
// however many levels pass.
// Changes:
// - Difficulty bump: denser soft/hard TUNING ends, tighter gaps, early
//   maxRowSpawns 2, larger cluster ceiling — levels 1–10 pack more threat.
// - Every Journey level opens rocks + pickups at HUD KM 0 (as soon as the
//   distance chip is live / intro unpauses). L1 teach beat still holds spawns.
// - Exposes `smashTarget` for the third-star shield-smash mission.
// - Created file.

import { lerp, lerpInt } from '../utils/math.js';
import { getLevel } from '../config/JourneyConfig.js';
import { PLAY_MODE, RunProfile } from './RunProfile.js';

// Action (asteroids, shields, sparkles) as soon as KM is live. Level 1's
// tutorial phase still suppresses rows until the teach beat ends.
const JOURNEY_ACTION_FROM_KM = 0;

// The ends of every ramp, at difficulty 0 and 1. Soft end is a real field;
// hard end sits a notch above the old ceiling.
const TUNING = {
    density: [1.15, 2.05],
    maxOnScreen: [5, 10],
    // Fraction of canvas height between spawn rows — tighter as it gets harder.
    minGap: [0.30, 0.16],
    gapSpread: 1.35,
    speed: [0.95, 1.38],
    // Plain-asteroid clusters: one rock at the soft end, up to four at the hard.
    baseCluster: [1, 4],
    // Absolute ceiling on rocks in one simple cluster.
    maxCluster: [3, 5],
    // How many separate spawns a row may place. Early: up to two.
    maxRowSpawns: [2, 3],
    // Set pieces get more common as the roster grows.
    simpleChance: [0.70, 0.42],
};

export class JourneyProfile extends RunProfile {
    constructor(game, level) {
        super(game);
        this.descriptor = getLevel(level);
    }

    get d() {
        return this.descriptor.difficulty;
    }

    // --- Identity --------------------------------------------------------
    get mode() {
        return PLAY_MODE.journey;
    }

    get isEndless() {
        return false;
    }

    get level() {
        return this.descriptor.level;
    }

    get title() {
        return `Level ${this.descriptor.level}`;
    }

    get goalScore() {
        return this.descriptor.goalKm;
    }

    /** Asteroids to destroy with the shield for the third star. */
    get smashTarget() {
        return this.descriptor.smashTarget;
    }

    // A level's whole roster is live from its first metre, so there is no unlock
    // to announce mid-flight; the opening line carries the news instead.
    get introMessage() {
        const { level, chapterName, introduces } = this.descriptor;
        if (introduces && introduces !== 'simple') {
            return `Level ${level} — new hazard: ${HAZARD_NAMES[introduces] ?? introduces}`;
        }
        return `Level ${level} — ${chapterName}`;
    }

    get submitsScore() {
        return false;
    }

    // --- Flight ----------------------------------------------------------
    get runsTutorial() {
        return this.descriptor.level === 1;
    }

    get speedMultiplier() {
        return lerp(TUNING.speed[0], TUNING.speed[1], this.d);
    }

    // --- Pickups ---------------------------------------------------------
    // Same mark as the belt — no long empty cruise waiting on goal fractions.
    get shieldsFromScore() {
        return this.obstaclesFromScore;
    }

    get collectiblesFromScore() {
        return this.obstaclesFromScore;
    }

    // --- Obstacles -------------------------------------------------------
    get obstaclesFromScore() {
        return JOURNEY_ACTION_FROM_KM;
    }

    get maxOnScreen() {
        return lerpInt(TUNING.maxOnScreen[0], TUNING.maxOnScreen[1], this.d);
    }

    get simpleChance() {
        return lerp(TUNING.simpleChance[0], TUNING.simpleChance[1], this.d);
    }

    get focusType() {
        return this.descriptor.focusType;
    }

    get advancedBlackHoles() {
        return this.d >= 0.7;
    }

    gapRange(canvasHeight) {
        const min = canvasHeight * lerp(TUNING.minGap[0], TUNING.minGap[1], this.d);
        return { min, max: min * TUNING.gapSpread };
    }

    density() {
        return lerp(TUNING.density[0], TUNING.density[1], this.d);
    }

    baseClusterCount() {
        return lerpInt(TUNING.baseCluster[0], TUNING.baseCluster[1], this.d);
    }

    // Ceiling on a single simple-asteroid cluster. Separates "how many do we aim
    // for" from "how many is too many for this difficulty".
    maxClusterCount() {
        return lerpInt(TUNING.maxCluster[0], TUNING.maxCluster[1], this.d);
    }

    // How many independent obstacles a spawn row may place side by side.
    maxRowSpawns() {
        return lerpInt(TUNING.maxRowSpawns[0], TUNING.maxRowSpawns[1], this.d);
    }

    // The level's difficulty already prices in its whole roster, so all of it is
    // live from the start rather than unlocking by distance mid-level.
    unlocksBy() {
        return this.descriptor.types.map((type) => ({ type, message: null }));
    }
}

const HAZARD_NAMES = {
    simple: 'asteroids',
    sideBarrier: 'side barriers',
    complex: 'orbiting debris',
    moving: 'moving asteroids',
    shooting: 'hostile asteroids',
    pulsating: 'unstable asteroids',
    wormhole: 'spatial anomalies',
    blackhole: 'gravity wells',
};
