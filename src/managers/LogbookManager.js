// LogbookManager.js
// Journey-only façade: maps gameplay events → logbook progress + toast.
// Changes:
// - Space Travel Boost no longer writes a logbook entry.

import {
    OBSTACLE_CLASS_TO_ID,
    SIMPLE_SHAPE_TO_ID,
    levelEntryId,
} from '../config/LogbookEntries.js';
import {
    loadLogbookProgress,
    observeEntry,
    interactEntry,
    revealInstant,
} from '../services/LogbookProgress.js';

export class LogbookManager {
    constructor(game) {
        this.game = game;
        this.progress = loadLogbookProgress();
        this._toastQueued = false;
        this._toastFrame = -1;
    }

    isActive() {
        return this.game.isJourney?.() === true
            || this.game.isHazardLab?.() === true;
    }

    /** Call once per frame after gameplay updates so multi-unlocks share one toast. */
    flushToast() {
        if (!this._toastQueued) return;
        this._toastQueued = false;
        this.game.logbookToast?.show();
        this.game.soundManager?.playLogbook?.();
    }

    _markChanged() {
        const frame = this.game.frameCount ?? 0;
        if (this._toastFrame !== frame) {
            this._toastFrame = frame;
            this._toastQueued = true;
        } else {
            this._toastQueued = true;
        }
    }

    observe(id) {
        if (!this.isActive() || !id) return false;
        const result = observeEntry(this.progress, id);
        this.progress = result.progress;
        if (result.changed) this._markChanged();
        return result.changed;
    }

    interact(id) {
        if (!this.isActive() || !id) return false;
        // Ensure observe lands first so state never skips visually mid-frame.
        const observed = observeEntry(this.progress, id);
        this.progress = observed.progress;
        const result = interactEntry(this.progress, id);
        this.progress = result.progress;
        if (observed.changed || result.changed) this._markChanged();
        return observed.changed || result.changed;
    }

    revealInstant(id) {
        if (!this.isActive() || !id) return false;
        const result = revealInstant(this.progress, id);
        this.progress = result.progress;
        if (result.changed) this._markChanged();
        return result.changed;
    }

    obstacleId(obstacle) {
        if (!obstacle) return null;
        const name = obstacle.constructor?.name;
        if (name === 'SimpleAsteroid') {
            return SIMPLE_SHAPE_TO_ID[obstacle.shapeType] ?? 'asteroidCircle';
        }
        return OBSTACLE_CLASS_TO_ID[name] ?? null;
    }

    /** Observe every on-screen obstacle once per update. */
    scanObstaclesVisible() {
        if (!this.isActive()) return;
        const cam = this.game.camera;
        const h = this.game.height;
        for (const obs of this.game.obstacleManager?.obstacles ?? []) {
            const id = this.obstacleId(obs);
            if (!id || id === 'spaceBoop') continue;
            const relY = cam.getRelativeY(obs.y);
            const extent = obs.height ?? (obs.currentSize ?? obs.size) * 2;
            if (relY + extent < -h * 0.05 || relY - extent > h * 1.05) continue;
            this.observe(id);
        }
    }

    onObstacleInteract(obstacle) {
        const id = this.obstacleId(obstacle);
        if (id) this.interact(id);
    }

    onBlackHolePull() {
        this.interact('blackhole');
    }

    onRepulsorPush() {
        this.interact('repulsor');
    }

    onDriftCurrent() {
        this.interact('driftCurrent');
    }

    onWormholeTeleport() {
        this.interact('wormhole');
    }

    onSpaceBoop() {
        this.revealInstant('spaceBoop');
    }

    onStyleSwoosh() {
        this.revealInstant('styleSwoosh');
    }

    onDeflectorSmash() {
        this.revealInstant('deflectorSmash');
    }

    scanPowerUpsVisible() {
        if (!this.isActive()) return;
        const cam = this.game.camera;
        const h = this.game.height;
        for (const p of this.game.powerUpManager?.powerUps ?? []) {
            const relY = cam.getRelativeY(p.y);
            if (p.kind === 'wallBoost') {
                const half = (p.height ?? 0) / 2;
                if (relY + half < 0 || relY - half > h) continue;
                this.observe('wallBoost');
                continue;
            }
            const size = p.size ?? this.game.baseUnit;
            if (relY + size < 0 || relY - size > h) continue;
            this.observe('shield');
        }
    }

    onShieldCollected() {
        this.interact('shield');
    }

    onWallBoostCollected() {
        this.interact('wallBoost');
    }

    scanCollectiblesVisible() {
        if (!this.isActive()) return;
        const cam = this.game.camera;
        const h = this.game.height;
        for (const c of this.game.collectibleManager?.collectibles ?? []) {
            const relY = cam.getRelativeY(c.y);
            const size = c.size ?? this.game.baseUnit;
            if (relY + size < 0 || relY - size > h) continue;
            this.observe('pointsSparkle');
        }
    }

    onSparkleCollected() {
        this.interact('pointsSparkle');
    }

    scanFinishGateVisible() {
        if (!this.isActive()) return;
        if (this.game.profile?.isEndless) return;

        const SCORE_TO_WORLD = 0.6;
        let worldY = this.game.finishLineWorldY;
        if (worldY == null) {
            const remaining = Math.max(0, this.game.profile.goalScore - this.game.score);
            if (remaining * SCORE_TO_WORLD > this.game.height * 2.2) return;
            worldY = this.game.spacecraft.y - remaining * SCORE_TO_WORLD;
        }

        const screenY = this.game.camera.getRelativeY(worldY);
        if (screenY < -this.game.baseUnit * 4 || screenY > this.game.height + this.game.baseUnit * 2) {
            return;
        }
        this.observe('finishGate');
    }

    onFinishGateCrossed() {
        this.interact('finishGate');
    }

    onLevelStarted(level) {
        // Hearing the intro transmission completes the entry — don't leave
        // Spock "pending" copy in the Levels tab until the finish gate.
        this.interact(levelEntryId(level));
    }

    onLevelCleared(level) {
        this.interact(levelEntryId(level));
    }
}
