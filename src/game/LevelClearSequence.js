// LevelClearSequence.js
// The Journey level-clear flyout. Crossing the goal used to freeze the ship and
// hold the world for half a second, which read as a stall. Instead the game takes
// the controls: shield up, a short "we made it" hold, then the ship boosts off
// the top of the screen, the world fades out behind it, and the outcome screen
// fades in.
// Changes:
// - L42 fade-to-black is slower (~1400 ms), then the written epilogue.
//   Day 42 voice + captions play in JourneyEpilogueSequence after the dark hold.
// - L42 clear hands off to the written epilogue instead of fading in JOURNEY COMPLETE.

import { clamp01, lerp } from '../utils/math.js';
import {
    captureArcHeading,
    streamCinematicFlight,
    REF_FPS,
} from './cinematicFlight.js';
import { TOTAL_LEVELS } from '../config/JourneyConfig.js';

// Wall-clock timings. Keep these the single source of "how the exit feels".
const HOLD_MS = 315;        // shield snap + beat of recognition before the boost
const RAMP_MS = 770;        // how long the ship takes to reach full boost
const BOOST_MIN_MS = 1260;  // never cut the boost short of this, even if already off-screen
const BOOST_CAP_MS = 2240;  // hard stop, so the phase can never hang
const FADE_OUT_MS = 385;
const FINALE_FADE_OUT_MS = 1400;
const SCREEN_IN_MS = 420;

// Scaled with the shorter window so the ship still clears the top in time.
const BOOST_TARGET = 7.2;
const CAMERA_BOOST = 1.25;  // the world streams a little faster, ship still pulls away
const EXIT_MARGIN = 2;      // ship radii past the top edge before it counts as gone

function easeOut(t) {
    return 1 - (1 - t) * (1 - t);
}

export class LevelClearSequence {
    constructor(game) {
        this.game = game;
        this.active = true;
        this.phase = 'hold';
        this.startTime = performance.now();
        this.phaseStart = this.startTime;
        this.worldAlpha = 1;
        this.hudAlpha = 1;

        // The camera tracks the ship, so left alone it would follow the boost and
        // the ship would never leave its screen position. From here the sequence
        // scrolls it by hand, at the speed the run was already travelling.
        // `camera.velocity` is a per-frame delta from the normal update path; we
        // convert it to units/sec so wall-clock integration stays honest.
        const perFrame = game.camera.velocity
            || -Math.abs(game.spacecraft.verticalVelocity) / REF_FPS;
        this.cameraSpeed = perFrame * REF_FPS;

        game.obstacleManager.pauseSpawning = true;
        game.obstacleManager.createMotionLines();

        const ship = game.spacecraft;
        ship.moveState = null;
        ship.boost = 1;
        ship.activateShield(); // 5s of shield covers the whole flyout

        // Arc exits keep the bank you had at the gate; zigzag keeps zigzagSign.
        this.arcState = ship.isZigzag() ? null : captureArcHeading(ship);

        game.soundManager?.playShield?.();
        game.soundManager?.playSwoosh?.();
    }

    /** @param {number} deltaTime seconds, capped by Game's loop. */
    update(deltaTime = 1 / REF_FPS) {
        if (!this.active) return;

        const dt = Math.max(0, Math.min(deltaTime, 0.1));
        const elapsed = performance.now() - this.phaseStart;

        if (this.phase === 'hold') this.updateHold(elapsed, dt);
        else if (this.phase === 'boost') this.updateBoost(elapsed, dt);
        else if (this.phase === 'fadeOut') this.updateFadeOut(elapsed, dt);
        else if (this.phase === 'screenIn') this.updateScreenIn(elapsed);
    }

    updateHold(elapsed, dt) {
        // Keep drifting at the run's pace so the hold doesn't feel like a freeze.
        this.game.spacecraft.boost = 1;
        this.streamWorld(1, dt);
        if (elapsed >= HOLD_MS) this.enter('boost');
    }

    updateBoost(elapsed, dt) {
        const ship = this.game.spacecraft;

        ship.boost = lerp(1, BOOST_TARGET, easeOut(clamp01(elapsed / RAMP_MS)));
        ship.moveState = null;

        this.streamWorld(lerp(1, CAMERA_BOOST, clamp01(elapsed / RAMP_MS)), dt);

        const screenY = this.game.camera.getRelativeY(ship.y);
        const gone = screenY < -ship.radius * EXIT_MARGIN;
        // Stay in boost until the player has had time to see it — then leave once
        // the ship is off-screen, or hit the safety cap.
        if ((gone && elapsed >= BOOST_MIN_MS) || elapsed >= BOOST_CAP_MS) {
            this.enter('fadeOut');
        }
    }

    fadeOutMs() {
        return this.isFinale() ? FINALE_FADE_OUT_MS : FADE_OUT_MS;
    }

    isFinale() {
        return this.game.isJourney?.() && this.game.journeyLevel >= TOTAL_LEVELS;
    }

    updateFadeOut(elapsed, dt) {
        const t = clamp01(elapsed / this.fadeOutMs());
        this.worldAlpha = 1 - t;
        // The readout fades first so the exit reads as the ship leaving the HUD.
        this.hudAlpha = clamp01(1 - t * 1.6);
        this.streamWorld(CAMERA_BOOST, dt);

        if (t >= 1) this.enter('screenIn');
    }

    updateScreenIn(elapsed) {
        this.worldAlpha = 0;
        this.hudAlpha = 0;
        if (this.game.journeyEpilogue?.active) {
            this.finish();
            return;
        }
        this.game.gameOverAlpha = clamp01(elapsed / SCREEN_IN_MS);

        if (this.game.gameOverAlpha >= 1) this.finish();
    }

    // Keep the world moving under the flyout. Ship flies at its lean; camera is
    // scrolled by hand so the hull can pull away and leave the top of the frame.
    streamWorld(cameraFactor, dt) {
        const { camera, spacecraft, obstacleManager, milestoneManager } = this.game;

        streamCinematicFlight(this.game, spacecraft, dt, {
            arcState: this.arcState,
            bounceSfx: false,
        });

        // Keep the shield up for the whole cinematic — no warning pulse mid-exit.
        if (spacecraft.shieldActive) {
            spacecraft.shieldTimer = Math.max(spacecraft.shieldTimer, 2000);
            spacecraft.shieldPulse += dt * 6;
            spacecraft.shieldWarningStarted = false;
        }

        camera.y += this.cameraSpeed * cameraFactor * dt;
        camera.totalDistance = Math.abs(camera.y);

        // Obstacles + sparkles tick on game.dt (set by Game.update) — smash /
        // collect VFX + scoring stay live until screenIn locks the outcome.
        obstacleManager.update();
        obstacleManager.updateMotionLines();
        this.game.collectibleManager.update();
        milestoneManager.update();
    }

    enter(phase) {
        this.phase = phase;
        this.phaseStart = performance.now();

        if (phase === 'boost') {
            this.game.logbook?.flushToast?.();
        }

        if (phase === 'screenIn') {
            this.game.obstacleManager.motionLines = [];
            this.game.obstacleManager.motionLineAlpha = 0.3;
            this.game.obstacleManager.motionLineBand = null;
            // World no longer streams — lock score / stars / outcome for the fade-in.
            this.game.finalScore = Math.floor(this.game.score);
            this.game.finishJourneyLevel(true);
            if (this.game.journeyLevel >= TOTAL_LEVELS) {
                this.game.startJourneyEpilogue();
                // Finish the flyout now. Game.update prefers the epilogue and
                // would otherwise leave this sequence `active`, which swallows taps.
                this.finish();
            }
        }
    }

    finish() {
        this.active = false;
        this.phase = 'done';
        this.worldAlpha = 0;
        this.hudAlpha = 0;
        this.game.gameOverAlpha = 1;
        this.game.spacecraft.boost = 1;
        this.game.obstacleManager.motionLines = [];
        this.game.obstacleManager.motionLineAlpha = 0.3;
        this.game.obstacleManager.motionLineBand = null;
    }
}
