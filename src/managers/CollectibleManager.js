// CollectibleManager.js
// Spawns randomly-placed point collectibles (see Collectible.js) during active
// gameplay, updates them, and awards points on pickup with a floating "+N"
// popup (Signal Blue, Space Mono) plus the pickup sound.
// Changes:
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
        // Hold off until the player is past the intro tutorial / cutscene.
        if (!this.enabled &&
            this.game.score >= this.game.profile.collectiblesFromScore &&
            !this.game.obstacleManager.tutorialPhase) {
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
            return c.y > this.game.camera.y - this.game.canvas.height * 1.5;
        });

        // Float popups upward and fade them out.
        this.popups = this.popups
            .map(p => ({ ...p, y: p.y + p.vy * (1 / 60), opacity: p.opacity - 0.02 }))
            .filter(p => p.opacity > 0);
    }

    collect(collectible) {
        this.game.points += this.game.config.points.perCollectible;
        this.game.soundManager?.playCollect?.();
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
        const x = margin + Math.random() * (this.game.canvas.width - margin * 2);
        const y = this.game.camera.y - this.game.canvas.height;
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
