// RunProfile.js
// What a single run *is*: how long it lasts, how hard it gets, which obstacles
// may spawn and when the helper pickups start. One profile is built per run and
// hangs off `game.profile`; the managers read it instead of reaching for
// `game.score` and the global config, which is what makes a second play mode
// possible at all.
// Changes:
// - Default `introBeats` wraps `introMessage` as a one-element array.
// - `wallBoostsFromScore` (default 12000): deep-run wall-boost slab gate.
// - `obstaclesFromScore` (default 0): Journey overrides to a shared early KM
//   mark; Open Space spawns as soon as intro ends.
// - Open Space on iOS draw LOD: soft maxOnScreen (18) so late-run fields
//   cannot explode Safari draw cost; Android/desktop stay uncapped.
// - Created file: RunProfile (the contract + shared defaults) and
//   OpenWorldProfile, which reproduces the endless run's existing numbers
//   exactly. The obstacle unlock schedule moved here from ObstacleManager, so
//   there is now one source of truth for it.

import { clamp01 } from '../utils/math.js';

export const PLAY_MODE = {
    openWorld: 'openWorld',
    journey: 'journey',
};

export const PLAY_MODE_STORAGE_KEY = 'playMode';

// Every obstacle type in spawn order, with the Open World distance that unlocks
// it and the science-officer line announcing it. ObstacleManager used to keep
// its own copy of this table, which had already drifted from the one in
// GameConfig; this is the only copy now.
export const OPEN_WORLD_UNLOCKS = [
    { type: 'simple', score: 0, message: 'Watch out for asteroids!' },
    { type: 'sideBarrier', score: 1000, message: 'Warning: Side barriers detected!' },
    { type: 'complex', score: 1000, message: 'Warning: Asteroids with orbiting debris detected!' },
    { type: 'moving', score: 2000, message: 'Caution: Moving asteroids detected!' },
    { type: 'shooting', score: 3000, message: 'Warning: Hostile asteroids detected!' },
    { type: 'pulsating', score: 4000, message: 'Warning: Unstable asteroids ahead!' },
    { type: 'wormhole', score: 5000, message: 'Spatial anomalies detected!' },
    { type: 'blackhole', score: 6000, message: 'Gravitational anomalies detected!' },
];

export const ALL_OBSTACLE_TYPES = OPEN_WORLD_UNLOCKS.map((entry) => entry.type);

/**
 * The contract the managers rely on. Defaults here describe the endless run, so
 * a subclass only overrides what it actually changes.
 */
export class RunProfile {
    constructor(game) {
        this.game = game;
    }

    // --- Identity --------------------------------------------------------
    get mode() {
        return PLAY_MODE.openWorld;
    }

    /** True when there is no meaningful finish line to show progress against. */
    get isEndless() {
        return true;
    }

    /** Journey level number, or null outside Journey. */
    get level() {
        return null;
    }

    get title() {
        return 'Open Space';
    }

    /** Score at which the run is won. */
    get goalScore() {
        return Infinity;
    }

    /** Journey smash-star target, or null outside Journey. */
    get smashTarget() {
        return null;
    }

    /** A line for the milestone log as the run opens, or null for none. */
    get introMessage() {
        return null;
    }

    /** On-screen intro beats; default is a single introMessage line if any. */
    get introBeats() {
        const line = this.introMessage;
        return line ? [line] : null;
    }

    /** Whether finishing this run offers the leaderboard. */
    get submitsScore() {
        return true;
    }

    // --- Flight ----------------------------------------------------------
    get runsTutorial() {
        return true;
    }

    /** Scales the ship's forward speed, and so the whole run's pace. */
    get speedMultiplier() {
        return 1;
    }

    // --- Pickups ---------------------------------------------------------
    get shieldsFromScore() {
        return 500;
    }

    /** Deep-run wall-boost slabs; Open World / long flights only by default. */
    get wallBoostsFromScore() {
        return 12000;
    }

    get collectiblesFromScore() {
        return 100;
    }

    // --- Obstacles -------------------------------------------------------
    /** HUD KM before obstacle rows may spawn. 0 = as soon as intro unpauses. */
    get obstaclesFromScore() {
        return 0;
    }

    /**
     * How many obstacles may be waiting ahead of the ship at once. Open World
     * has never had an effective cap: the old `length < 7` test guarded a spawn
     * branch that can only fire once per run, so a row was never actually
     * withheld. Keeping it uncapped is what "plays identically" means here.
     */
    get maxOnScreen() {
        return Infinity;
    }

    /** Chance a spawn slot takes a plain asteroid cluster rather than a set piece. */
    get simpleChance() {
        return 0.65;
    }

    /** A type this run leans on, giving otherwise-equal levels their own feel. */
    get focusType() {
        return null;
    }

    get advancedBlackHoles() {
        return this.game.score > 1000;
    }

    /** Vertical spacing between spawn rows, in world units. */
    gapRange(canvasHeight) {
        return { min: canvasHeight * 0.25, max: canvasHeight * 0.4 };
    }

    /** Multiplier feeding the size of plain-asteroid clusters. */
    density() {
        const scaling = this.game.config.obstacles.scaling;
        const progress = Math.min(this.game.score / (scaling.rampUpDistance * 1.2), 1);
        return scaling.startDensity
            + (scaling.maxDensity - scaling.startDensity) * Math.pow(progress, 1.2);
    }

    /** Floor for how many asteroids a cluster contains. */
    baseClusterCount() {
        return 2 + Math.floor(this.game.score / 8000);
    }

    /** Ceiling for a single simple-asteroid cluster. */
    maxClusterCount() {
        return 4;
    }

    /** How many independent obstacles a spawn row may place side by side. */
    maxRowSpawns() {
        return 3;
    }

    /**
     * Types playable at `score`, each with the message to announce it (null =
     * announce nothing). Called every frame, so it must stay cheap.
     */
    unlocksBy(score) {
        return OPEN_WORLD_UNLOCKS.filter((entry) => score >= entry.score);
    }

    // --- Progress --------------------------------------------------------
    isRunComplete(score) {
        return score >= this.goalScore;
    }

    /** 0 - 1 through the run, for the HUD goal bar. */
    progress(score) {
        return Number.isFinite(this.goalScore) ? clamp01(score / this.goalScore) : 0;
    }
}

/**
 * The endless run exactly as it has always played: the ramp in
 * `GameConfig.obstacles.scaling`, unlocks by distance, no finish line in
 * practice. `TOTAL_DISTANCE` is read in the same units the old
 * `remainingDistance` maths used, so the (unreachable) victory line is unmoved.
 */
export class OpenWorldProfile extends RunProfile {
    get goalScore() {
        return this.game.TOTAL_DISTANCE * 100;
    }

    /**
     * Uncapped on Android/desktop (historical Open World feel). On iOS Safari
     * a soft ceiling keeps late-run Canvas2D draw+collision from melting FPS;
     * Journey already caps via JourneyProfile.
     */
    get maxOnScreen() {
        return this.game.iosDrawLod ? 18 : Infinity;
    }
}
