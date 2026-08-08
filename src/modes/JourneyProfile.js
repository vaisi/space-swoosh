// JourneyProfile.js
// Turns one Journey level descriptor into the knobs the managers read. Every
// tunable is a lerp of the level's single `difficulty` scalar, which is what
// keeps the stair-with-plateaus curve honest: hold `d` and nothing gets harder,
// however many levels pass.
// Changes:
// - introBeats exposes LEVEL_INTRO_BEATS (sentence-at-a-time; voice on 1–40);
//   introMessage stays the full LEVEL_MESSAGES line.
// - Levels 1–5 teach gates: L1 no belt; collectibles from L4; shields from L5.
// - introMessage uses Signal Story LEVEL_MESSAGES (JourneyNarrative).
// - Difficulty bump: denser soft/hard TUNING ends, tighter gaps, early
//   maxRowSpawns 2, larger cluster ceiling — levels 1–10 pack more threat.
// - Every Journey level opens rocks + pickups at HUD KM 0 (as soon as the
//   distance chip is live / intro unpauses). L1 teach beat still holds spawns.
// - Exposes `smashTarget` for the third-star shield-smash mission.
// - Created file.

import { lerp, lerpInt } from '../utils/math.js';
import {
    getLevel,
    POINTS_FROM_LEVEL,
    SHIELDS_FROM_LEVEL,
} from '../config/JourneyConfig.js';
import { levelIntroBeats, levelMessage } from '../config/JourneyNarrative.js';
import { PLAY_MODE, RunProfile } from './RunProfile.js';

// Action (asteroids, shields, sparkles) as soon as KM is live — except when a
// teach gate pushes the threshold to Infinity for that level.
const JOURNEY_ACTION_FROM_KM = 0;
const NEVER_FROM_KM = Number.POSITIVE_INFINITY;

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

    // Navigator voice line from the Signal Story — one compact transmission.
    get introMessage() {
        return levelMessage(this.descriptor.level)
            ?? `Level ${this.descriptor.level} — ${this.descriptor.chapterName}`;
    }

    /** On-screen intro beats (one sentence each for levels 1–5). */
    get introBeats() {
        return levelIntroBeats(this.descriptor.level)
            ?? [this.introMessage];
    }

    get submitsScore() {
        return false;
    }

    // --- Flight ----------------------------------------------------------
    // L1 is the empty teach corridor; no competing HUD tips / atmosphere cutscene.
    get runsTutorial() {
        return false;
    }

    get speedMultiplier() {
        return lerp(TUNING.speed[0], TUNING.speed[1], this.d);
    }

    // --- Pickups ---------------------------------------------------------
    get shieldsFromScore() {
        if (this.level < SHIELDS_FROM_LEVEL) return NEVER_FROM_KM;
        return JOURNEY_ACTION_FROM_KM;
    }

    get collectiblesFromScore() {
        if (this.level < POINTS_FROM_LEVEL) return NEVER_FROM_KM;
        return JOURNEY_ACTION_FROM_KM;
    }

    // --- Obstacles -------------------------------------------------------
    get obstaclesFromScore() {
        // Empty first flight — roster is also [], but keep the belt sealed.
        if (this.level <= 1) return NEVER_FROM_KM;
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
