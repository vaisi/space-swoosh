// CollectibleManager.js
// Spawns randomly-placed Signal-Blue sparkles (see Collectible.js) during active
// gameplay, updates them, and on pickup refills fuel + counts sparkles with a
// floating "+FUEL" popup (Signal Blue, Space Mono) plus the pickup sound.
// Changes:
// - Collect refills clamped fuel and increments sparklesCollected (no points).
// - Popup text is "+FUEL"; no salvage once fuelDying has started.
// - Spawn also respects obstacleManager.pauseSpawning so the level-clear flyout
//   can tick collection without planting new sparkles ahead of the exit.
// - Enable gate is profile score only (no tutorial hold) so Journey @ 0 KM can
//   show sparkles with the belt; cutscene still pauses new spawns.
// - Journey Logbook: observe on-screen sparkles; interact on collect.
// - Popup motion uses `game.dt` so float speed matches ship pacing across FPS.
// - The distance sparkles start appearing at now comes from `game.profile`.
// - Collect plays SoundManager.playCollect() (sparkle chime).

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
        const om = this.game.obstacleManager;
        if (this.enabled &&
            !om.inCutscene &&
            !om.pauseSpawning &&
            now - this.lastSpawnTime > this.spawnInterval) {
            this.spawn();
            this.lastSpawnTime = now;
            this.spawnInterval = 2600 + Math.random() * 2600; // 2.6s – 5.2s
        }

        this.collectibles.forEach(c => c.update());

        // Collect on contact; otherwise drop once well below the camera.
        // No salvage after engines start dying (fuel already at 0).
        this.collectibles = this.collectibles.filter(c => {
            if (!this.game.fuelDying && c.checkCollision(this.game.spacecraft)) {
                this.collect(c);
                return false;
            }
            return c.y > this.game.camera.y - this.game.height * 1.5;
        });

        this.game.logbook?.scanCollectiblesVisible?.();

        // Float popups upward and fade them out — in place, so the hot loop
        // allocates nothing (per-frame object churn is what turns into GC
        // hitches mid-run).
        const dt = this.game.dt ?? (1 / 60);
        const tickScale = dt * 60;
        let w = 0;
        for (let i = 0; i < this.popups.length; i++) {
            const p = this.popups[i];
            p.y += p.vy * dt;
            p.opacity -= 0.02 * tickScale;
            if (p.opacity > 0) this.popups[w++] = p;
        }
        this.popups.length = w;
    }

    collect(collectible) {
        const fuelCfg = this.game.config.fuel;
        const max = fuelCfg?.max ?? 1;
        const refill = fuelCfg?.refillPerCollectible ?? 0.42;
        this.game.fuel = Math.min(max, (this.game.fuel ?? 0) + refill);
        this.game.sparklesCollected = (this.game.sparklesCollected ?? 0) + 1;
        this.game.soundManager?.playCollect?.();
        this.game.logbook?.onSparkleCollected?.();
        this.popups.push({
            x: collectible.x,
            y: collectible.y,
            vy: -2,
            opacity: 1,
            text: '+FUEL',
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
