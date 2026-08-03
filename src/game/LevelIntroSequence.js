// LevelIntroSequence.js
// Short run-start cinematic for Journey and Open World.
// Changes:
// - On handoff: title alone (no pause / HUD), ~3s title fade-out, then Game
//   advances wait → chip fades. Spawning stays paused until chips begin.
// - Settle keeps the HUD dark; centre title is the first thing on screen.
// - Slow centre roll up from below the frame; top-of-screen star shower that
//   eases out over the beat. Exit flyout left unchanged.
// - Created file. ~1s non-skippable intro (arrive + settle); steering locked;
//   spawning paused; score does not advance until finish().

import { clamp01, lerp } from '../utils/math.js';
import { REF_FPS } from './cinematicFlight.js';

// Wall-clock timings — keep these the single source of "how the intro feels".
const ARRIVE_MS = 720;   // slow roll into the cruise seat + world fade
const SETTLE_MS = 280;   // cruise settle; HUD stays dark until handoff reveal
const START_BOOST = 1.35; // gentle — a roll, not a hyperspeed dump
const STREAK_COUNT = 18;
const START_SCREEN = 1.14; // just below the bottom of the frame
const CRUISE_SCREEN = 0.80; // matches Spacecraft constructor seat
const STREAK_BAND = 0.38;  // top fraction of the frame for the shower

// Centre title ceremony (MilestoneManager timings).
const TITLE_FADE_IN = 450;
const TITLE_HOLD = 400;
const TITLE_FADE_OUT = 3000;

function easeOut(t) {
    return 1 - (1 - t) * (1 - t);
}

function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class LevelIntroSequence {
    constructor(game) {
        this.game = game;
        this.active = true;
        this.phase = 'arrive';
        this.startTime = performance.now();
        this.phaseStart = this.startTime;
        this.worldAlpha = 0;
        this.hudAlpha = 0;

        // Pin on game immediately so pause-visibility checks see us mid-construct
        // (beginRun assigns the return value only after `new` finishes).
        game.levelIntro = this;
        game.updatePauseButtonVisibility?.();

        const om = game.obstacleManager;
        om.pauseSpawning = true;
        om.motionLines = [];
        om.createMotionLines(STREAK_COUNT, {
            yMin: 0,
            yMax: game.height * STREAK_BAND,
        });
        om.motionLineAlpha = 0.32;

        const ship = game.spacecraft;
        ship.moveState = null;
        ship.boost = START_BOOST;
        ship.x = game.width / 2;
        ship.bank = 0;
        ship.tangent = 0;
        // Seat just under the frame; roll up into the cruise slot.
        ship.y = game.camera.y + game.height * START_SCREEN;
        ship.verticalVelocity = ship.baseSpeed * START_BOOST;
        ship.prevX = ship.x;
        ship.prevY = ship.y;
        ship.updateHitCircles();
    }

    /** @param {number} deltaTime seconds, capped by Game's loop. */
    update(deltaTime = 1 / REF_FPS) {
        if (!this.active) return;

        const dt = Math.max(0, Math.min(deltaTime, 0.1));
        const elapsed = performance.now() - this.phaseStart;

        if (this.phase === 'arrive') this.updateArrive(elapsed, dt);
        else if (this.phase === 'settle') this.updateSettle(elapsed, dt);
    }

    /** 1 → 0 over the whole intro; drives the top shower fade. */
    showerFade() {
        const total = ARRIVE_MS + SETTLE_MS;
        const t = clamp01((performance.now() - this.startTime) / total);
        // Hold a beat, then ease out so the shower dissolves as you settle.
        const hold = 0.22;
        if (t <= hold) return 1;
        return 1 - easeOut((t - hold) / (1 - hold));
    }

    updateArrive(elapsed, dt) {
        const t = easeOut(clamp01(elapsed / ARRIVE_MS));
        this.worldAlpha = Math.min(1, t * 1.2);
        this.hudAlpha = 0;

        const ship = this.game.spacecraft;
        ship.boost = lerp(START_BOOST, 1.08, t);
        this.streamShip(dt);

        const screenY = lerp(
            this.game.height * START_SCREEN,
            this.game.height * CRUISE_SCREEN,
            t,
        );
        this.game.camera.y = ship.y - screenY;
        this.game.camera.totalDistance = Math.abs(this.game.camera.y);
        this.syncShower();

        if (elapsed >= ARRIVE_MS) this.enter('settle');
    }

    updateSettle(elapsed, dt) {
        const t = easeInOut(clamp01(elapsed / SETTLE_MS));
        this.worldAlpha = 1;
        // HUD stays dark — title, then chips, come after handoff.
        this.hudAlpha = 0;

        const ship = this.game.spacecraft;
        ship.boost = lerp(1.08, 1, t);
        this.streamShip(dt);

        this.game.camera.y = ship.y - this.game.height * CRUISE_SCREEN;
        this.game.camera.totalDistance = Math.abs(this.game.camera.y);
        this.syncShower();

        if (elapsed >= SETTLE_MS) this.finish();
    }

    syncShower() {
        const om = this.game.obstacleManager;
        const fade = this.showerFade();
        const target = Math.max(0, Math.round(STREAK_COUNT * fade));
        while (om.motionLines.length > target) {
            om.motionLines.pop();
        }
        om.motionLineAlpha = fade * 0.32;
        if (fade > 0.02) {
            om.updateMotionLines(0.45 + fade * 0.55);
        }
    }

    // Gentle straight-up roll — centre lane, no side lean during the intro.
    streamShip(dt) {
        const ship = this.game.spacecraft;
        ship.moveState = null;
        ship.x = this.game.width / 2;

        const smooth = Math.pow(0.95, dt * REF_FPS);
        const target = ship.baseSpeed * ship.boost;
        ship.verticalVelocity = ship.verticalVelocity * smooth + target * (1 - smooth);

        const prevX = ship.x;
        const prevY = ship.y;
        ship.y -= ship.verticalVelocity * dt;
        ship.updateHeading(prevX, prevY);
        ship.updateTrail();
        ship.updateHitCircles();
    }

    enter(phase) {
        this.phase = phase;
        this.phaseStart = performance.now();
    }

    finish() {
        const { game } = this;
        const ship = game.spacecraft;

        this.active = false;
        this.phase = 'done';
        this.worldAlpha = 1;
        this.hudAlpha = 1;

        ship.boost = 1;
        ship.moveState = null;
        ship.x = game.width / 2;

        const perFrame = -Math.abs(ship.verticalVelocity) / REF_FPS;
        game.camera.velocity = perFrame;
        game.camera.y = ship.y - game.height * CRUISE_SCREEN;
        game.camera.totalDistance = Math.abs(game.camera.y);

        const om = game.obstacleManager;
        // Stay paused until the HUD chip phase — title beat stays open sky.
        om.pauseSpawning = true;
        om.motionLines = [];
        om.motionLineAlpha = 0.3;
        om.motionLineBand = null;

        const title = game.pendingIntroMessage;
        game.pendingIntroMessage = null;

        if (title) {
            game.hudRevealPhase = 'title';
            game.hudRevealStart = null;
            game.hudRevealWaitStart = null;
            game.milestoneManager?.showMessage?.(title, {
                fadeIn: TITLE_FADE_IN,
                hold: TITLE_HOLD,
                fadeOut: TITLE_FADE_OUT,
            });
        } else {
            // Open World / no line — short calm beat, then chips.
            game.hudRevealPhase = 'wait';
            game.hudRevealWaitStart = performance.now();
            game.hudRevealStart = null;
        }

        game.updatePauseButtonVisibility?.();
        game.levelIntro = null;
    }
}
