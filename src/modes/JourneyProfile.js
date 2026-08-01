// JourneyProfile.js
// Turns one Journey level descriptor into the knobs the managers read. Every
// tunable is a lerp of the level's single `difficulty` scalar, which is what
// keeps the stair-with-plateaus curve honest: hold `d` and nothing gets harder,
// however many levels pass.
// Changes:
// - Exposes `smashTarget` for the third-star shield-smash mission.
// - Early levels lean beginner-friendly: thinner density, single-asteroid
//   clusters at the soft end, and a hard cap on how many rocks may share a row
//   so the opening never dumps a wall of four across the screen.
// - Created file.

import { lerp, lerpInt } from '../utils/math.js';
import { getLevel } from '../config/JourneyConfig.js';
import { PLAY_MODE, RunProfile } from './RunProfile.js';

// The ends of every ramp, at difficulty 0 and 1. Level 1 sits a little below
// the Open World baseline on purpose; the last levels sit well above it.
const TUNING = {
    density: [0.55, 1.9],
    maxOnScreen: [3, 9],
    // Fraction of canvas height between spawn rows — tighter as it gets harder.
    minGap: [0.48, 0.2],
    gapSpread: 1.55,
    speed: [0.88, 1.32],
    // Plain-asteroid clusters: one rock at the soft end, up to four at the hard.
    baseCluster: [1, 4],
    // Absolute ceiling on rocks in one simple cluster — early levels stay at 2.
    maxCluster: [2, 4],
    // How many separate spawns a row may place. Early: always one.
    maxRowSpawns: [1, 3],
    // Set pieces get more common as the roster grows.
    simpleChance: [0.78, 0.5],
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
    // Fractions of the level rather than absolute distances, so a short early
    // level still gets its shields and sparkles.
    get shieldsFromScore() {
        return this.goalScore * 0.12;
    }

    get collectiblesFromScore() {
        return this.goalScore * 0.04;
    }

    // --- Obstacles -------------------------------------------------------
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
