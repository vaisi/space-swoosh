// DebutCue.js
// On a Journey debut day, can speak the teach line the first time that
// obstacle enters the view. The belt is already running.
// Changes:
// - DEBUT_CUE_ENABLED is false. The obstacle still appears. The sentence
//   and debut-N.mp3 stay in the repo and do not play until this is turned on.

import { debutOn } from '../config/JourneyConfig.js';
import { DEBUT_LINES, debutVoiceFile } from '../config/JourneyNarrative.js';

/** Draft teach lines are not final. Keep the clip and caption off the run. */
export const DEBUT_CUE_ENABLED = false;

/** Quiet beat after the obstacle appears, before the line. */
const PAUSE_MS = 700;

export class DebutCue {
    constructor(game) {
        this.game = game;
        this.type = null;
        this.seenAt = 0;
        this.spoken = false;
    }

    /** Call once the run's level is known. No-op off a debut day. */
    arm() {
        this.spoken = false;
        this.seenAt = 0;
        const level = this.game.journeyLevel;
        this.type = this.game.isJourney?.() ? debutOn(level) : null;
    }

    update() {
        if (!DEBUT_CUE_ENABLED) return;
        if (this.spoken || !this.type) return;
        const game = this.game;
        if (game.hudRevealPhase === 'title' || game.hudRevealPhase === 'wait') return;
        if (game.isPaused || game.isGameOver) return;
        if (!this.obstacleVisible()) {
            this.seenAt = 0;
            return;
        }
        const now = performance.now();
        if (!this.seenAt) this.seenAt = now;
        if (now - this.seenAt < PAUSE_MS) return;
        if (game.soundManager?.isLevelVoicePlaying?.()) return;

        this.spoken = true;
        const line = DEBUT_LINES[game.journeyLevel];
        if (line) {
            const hold = Math.max(3200, Math.min(5600, line.length * 70));
            game.milestoneManager?.showMessage?.(line, { hold });
        }
        const file = debutVoiceFile(game.journeyLevel);
        if (file) game.soundManager?.playCueVoice?.(file);
    }

    /** True once any part of the debut obstacle overlaps the view. */
    obstacleVisible() {
        const game = this.game;
        const height = game.height;
        const obstacles = game.obstacleManager?.obstacles;
        if (!obstacles) return false;
        for (const obstacle of obstacles) {
            if (obstacle.retired || obstacle.logbookId !== this.type) continue;
            const top = obstacle.claim?.top ?? obstacle.y;
            const bottom = obstacle.claim?.bottom ?? obstacle.y;
            const relTop = game.camera.getRelativeY(top);
            const relBottom = game.camera.getRelativeY(bottom);
            if (relBottom >= 0 && relTop <= height) return true;
        }
        return false;
    }
}
