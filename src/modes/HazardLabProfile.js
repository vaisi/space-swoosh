// HazardLabProfile.js
// Finite sandbox run: Phase / Sweep / Repulsor / Drift / Wormhole (almost no
// simple rocks), shields/sparkles from KM 0, no Journey progress side effects.
// Changes:
// - Wormhole in LAB_FOCUS so portal emerge framing can be practiced in-lab.
// - Balanced focus across lab types (even mix after Journey rollout).
// - allowAdjacentSetPieces so practice rows can stack set pieces.
// - Created file: HazardLabProfile extending RunProfile with isHazardLab.

import { lerp, lerpInt } from '../utils/math.js';
import { HAZARD_LAB, HAZARD_LAB_INTRO } from '../config/HazardLabConfig.js';
import { PLAY_MODE, RunProfile } from './RunProfile.js';

const JOURNEY_ACTION_FROM_KM = 0;

/** Even practice mix — includes wormholes for portal exit framing. */
const LAB_FOCUS = ['phase', 'sweepGate', 'repulsor', 'driftCurrent', 'wormhole'];

export class HazardLabProfile extends RunProfile {
    constructor(game) {
        super(game);
        this.descriptor = HAZARD_LAB;
    }

    get isHazardLab() {
        return true;
    }

    get mode() {
        return PLAY_MODE.hazardLab;
    }

    get isEndless() {
        return false;
    }

    get level() {
        return 0;
    }

    get title() {
        return 'Hazard Lab';
    }

    get goalScore() {
        return this.descriptor.goalKm;
    }

    get smashTarget() {
        return 0;
    }

    get introMessage() {
        return HAZARD_LAB_INTRO;
    }

    get introBeats() {
        return [HAZARD_LAB_INTRO];
    }

    get submitsScore() {
        return false;
    }

    get runsTutorial() {
        return false;
    }

    get speedMultiplier() {
        return lerp(0.95, 1.38, this.descriptor.difficulty);
    }

    get shieldsFromScore() {
        return JOURNEY_ACTION_FROM_KM;
    }

    get collectiblesFromScore() {
        return JOURNEY_ACTION_FROM_KM;
    }

    get wallBoostsFromScore() {
        // Keep wall boosts out of the lab so the new hazards stay the focus.
        return Number.POSITIVE_INFINITY;
    }

    get obstaclesFromScore() {
        return JOURNEY_ACTION_FROM_KM;
    }

    get maxOnScreen() {
        return lerpInt(5, 8, this.descriptor.difficulty);
    }

    /** Almost everything is a set piece — only a thin sprinkle of simple rocks. */
    get simpleChance() {
        return 0.1;
    }

    get focusType() {
        return LAB_FOCUS[Math.floor(Math.random() * LAB_FOCUS.length)];
    }

    get focusChance() {
        return 0.55;
    }

    get allowAdjacentSetPieces() {
        return true;
    }

    get advancedBlackHoles() {
        return false;
    }

    gapRange(canvasHeight) {
        const min = canvasHeight * lerp(0.28, 0.2, this.descriptor.difficulty);
        return { min, max: min * 1.35 };
    }

    density() {
        return lerp(1.2, 1.6, this.descriptor.difficulty);
    }

    baseClusterCount() {
        return 1;
    }

    maxClusterCount() {
        return 2;
    }

    maxRowSpawns() {
        return 2;
    }

    unlocksBy() {
        return this.descriptor.types.map((type) => ({ type, message: null }));
    }
}
