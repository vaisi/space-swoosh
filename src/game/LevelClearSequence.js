// LevelClearSequence.js
// The Journey level-clear flyout. Crossing the goal used to freeze the ship and
// hold the world for half a second, which read as a stall. Instead the game takes
// the controls: shield up, a short "we made it" hold, then the ship boosts off
// the top of the screen, the world fades out behind it, and the outcome screen
// fades in.
// Changes:
// - Flyout keeps the ship's lean (zigzag sign / captured arc heading) instead of
//   easing to centre — hyperspeed exit via cinematicFlight.
// - Journey Logbook: Space Travel Boost unlocks when the boost phase begins.
// - Flyout is no longer skippable — tap / key / back are swallowed until the
//   outcome screen finishes fading in.
// - Timings tightened ~30% after the slower pass felt a touch long; boost target
//   scaled up with them so the ship still clears the top inside the shorter window.
// - Hold beat before the boost; motion integrated with real `deltaTime` so a
//   120 Hz display no longer makes the exit feel twice as fast as a 60 Hz one.
// - Created file. Owns four phases (hold / boost / fadeOut / screenIn) and drives
//   `game.gameOverAlpha` itself in the last one, so Game's existing fade-in
//   render path and its `gameOverAlpha < 0.6` click guard keep working unchanged.

import { clamp01, lerp } from '../utils/math.js';
import {
    captureArcHeading,
    streamCinematicFlight,
    REF_FPS,
} from './cinematicFlight.js';

// Wall-clock timings. Keep these the single source of "how the exit feels".
const HOLD_MS = 315;        // shield snap + beat of recognition before the boost
const RAMP_MS = 770;        // how long the ship takes to reach full boost
const BOOST_MIN_MS = 1260;  // never cut the boost short of this, even if already off-screen
const BOOST_CAP_MS = 2240;  // hard stop, so the phase can never hang
const FADE_OUT_MS = 385;
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

    updateFadeOut(elapsed, dt) {
        const t = clamp01(elapsed / FADE_OUT_MS);
        this.worldAlpha = 1 - t;
        // The readout goes first: its job ended when the goal was crossed.
        this.hudAlpha = clamp01(1 - t * 1.6);
        this.streamWorld(CAMERA_BOOST, dt);

        if (t >= 1) this.enter('screenIn');
    }

    updateScreenIn(elapsed) {
        this.worldAlpha = 0;
        this.hudAlpha = 0;
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

        // Obstacles tick on game.dt (set by Game.update) — smash VFX only.
        obstacleManager.update();
        obstacleManager.updateMotionLines();
        milestoneManager.update();
    }

    enter(phase) {
        this.phase = phase;
        this.phaseStart = performance.now();

        if (phase === 'boost') {
            this.game.logbook?.onSpaceTravelBoost?.();
            this.game.logbook?.flushToast?.();
        }

        if (phase === 'screenIn') {
            this.game.obstacleManager.motionLines = [];
            this.game.obstacleManager.motionLineAlpha = 0.3;
            this.game.obstacleManager.motionLineBand = null;
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
