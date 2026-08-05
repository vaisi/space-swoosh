// CollectibleManager.js
// Spawns randomly-placed point collectibles (see Collectible.js) during active
// gameplay, updates them, and awards points on pickup with a floating "+N"
// popup (Signal Blue, Space Mono) plus the pickup sound.
// Changes:
// - Enable gate is profile score only (no tutorial hold) so Journey @ 0 KM can
//   show sparkles with the belt; cutscene still pauses new spawns.
// - First sparkle collect unlocks the POINTS HUD row (Game.noteHudPointsFromCollect).
// - Journey Logbook: observe on-screen sparkles; interact on collect.
// - Popup motion uses `game.dt` so float speed matches ship pacing across FPS.
// - The distance sparkles start appearing at now comes from `game.profile`, so a
//   short Journey level isn't half over before the first one shows up.
// - Collect now plays SoundManager.playCollect() (sparkle chime) instead of the
//   missing powerup.mp3 path, so diamond pickups actually make a sound.
// - Created file: manages spawn cadence, collection -> game.points, and popups.

import { Collectible } from '../entities/Collectible.js';
import { color } from '../brand/tokens.js';
import { setMonoType } from '../utils/BrandDraw.js';

export class CollectibleManager {
    constructor(game) {
        this.game = game;
        this.collectibles = [];
        this.popups = [];
        this.lastSpawnTime = performance.now();
        this.spawnInterval = 3200; // base ms; re-jittered after each spawn
        this.enabled = false;
    }

    update() {
        // Profile distance gate only — Journey opens at 0 KM with the belt.
        if (!this.enabled &&
            this.game.score >= this.game.profile.collectiblesFromScore) {
            this.enabled = true;
            this.lastSpawnTime = performance.now();
        }

        const now = performance.now();
        if (this.enabled &&
            !this.game.obstacleManager.inCutscene &&
            now - this.lastSpawnTime > this.spawnInterval) {
            this.spawn();
            this.lastSpawnTime = now;
            this.spawnInterval = 2600 + Math.random() * 2600; // 2.6s – 5.2s
        }

        this.collectibles.forEach(c => c.update());

        // Collect on contact; otherwise drop once well below the camera.
        this.collectibles = this.collectibles.filter(c => {
            if (c.checkCollision(this.game.spacecraft)) {
                this.collect(c);
                return false;
            }
            return c.y > this.game.camera.y - this.game.height * 1.5;
        });

        this.game.logbook?.scanCollectiblesVisible?.();

        // Float popups upward and fade them out.
        const dt = this.game.dt ?? (1 / 60);
        const tickScale = dt * 60;
        this.popups = this.popups
            .map(p => ({
                ...p,
                y: p.y + p.vy * dt,
                opacity: p.opacity - 0.02 * tickScale,
            }))
            .filter(p => p.opacity > 0);
    }

    collect(collectible) {
        this.game.points += this.game.config.points.perCollectible;
        this.game.noteHudPointsFromCollect?.();
        this.game.soundManager?.playCollect?.();
        this.game.logbook?.onSparkleCollected?.();
        this.popups.push({
            x: collectible.x,
            y: collectible.y,
            vy: -2,
            opacity: 1,
            text: `+${this.game.config.points.perCollectible}`,
        });
    }

    spawn() {
        const margin = this.game.baseUnit * 4;
        const x = margin + Math.random() * (this.game.width - margin * 2);
        const y = this.game.camera.y - this.game.height;
        this.collectibles.push(new Collectible(this.game, x, y));
    }

    render(ctx) {
        this.collectibles.forEach(c => c.render(ctx));

        this.popups.forEach(p => {
            ctx.save();
            setMonoType(ctx, this.game.baseUnit * 1.4);
            ctx.fillStyle = `rgba(${color.signalRgb}, ${p.opacity})`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.text, p.x, this.game.camera.getRelativeY(p.y));
            ctx.restore();
        });
    }
}
