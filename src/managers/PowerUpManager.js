// PowerUpManager.js
// Spawns/updates shield power-ups (floating plus + wall boost slab).
// Changes:
// - Day 42: skip plus / wall-boost spawns past the finish gate.
// - Wall boost on collect: button-press retract into the edge + wall BOOP,
//   then remove once the press anim finishes (buffs still grant on contact).
// - Wall boost unlocks at 12000 KM (separate from plus); spawn ~22s; much rarer.
// - WallBoostPowerUp: thin Signal-Blue edge slab (random left or right);
//   collect → shield + speed boost (refresh both).
// - Typed pickups via `kind` ('shield' | 'wallBoost'); plus path unchanged.
// - Journey Logbook: observe on-screen shields; interact on collect.
// - The distance shields start appearing at now comes from `game.profile`, so a
//   short Journey level gets them proportionally early instead of waiting for
//   the endless run's fixed 500 KM.
// - Shield pickup is a constant black plus surrounded by pulsating blue circles
//   that start crisp near the plus and expand + fade out quickly (portal blue).

import { SHIELD_BLUE, SHIELD_BLUE_RGB, INK } from '../utils/DrawUtils.js';
import { color } from '../brand/tokens.js';

/** Wall-boost button press duration (ms) — snap in, then gone. */
const WALL_PRESS_MS = 220;

class ShieldPowerUp {
    constructor(game, x, y) {
        this.game = game;
        this.kind = 'shield';
        this.x = x;
        this.y = y;
        this.size = game.baseUnit * 2;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    update() {
        this.pulsePhase += 0.05;
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);

        if (relativeY + this.size < 0 || relativeY - this.size > this.game.height) {
            return;
        }

        const unit = this.game.baseUnit;

        ctx.save();
        ctx.translate(this.x, relativeY);
        ctx.lineCap = 'round';

        // Pulsating blue circles: each ring starts as a crisp blue circle near the
        // plus, then expands outward and fades out quickly. Two rings offset in
        // phase so a new pulse is always emanating.
        const t = (this.pulsePhase % (Math.PI * 2)) / (Math.PI * 2); // 0 -> 1 loop
        for (let i = 0; i < 2; i++) {
            const tt = (t + i * 0.5) % 1;
            const radius = this.size * (0.5 + tt * 0.8);
            const opacity = Math.pow(1 - tt, 1.8) * 0.9; // strong start, quick fade
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${SHIELD_BLUE_RGB}, ${opacity})`;
            ctx.lineWidth = unit * 0.16;
            ctx.stroke();
        }

        // Constant black plus inside — never scales, so the icon stays readable.
        const arm = this.size * 0.45;
        ctx.beginPath();
        ctx.moveTo(-arm, 0);
        ctx.lineTo(arm, 0);
        ctx.moveTo(0, -arm);
        ctx.lineTo(0, arm);
        ctx.strokeStyle = INK;
        ctx.lineWidth = unit * 0.28;
        ctx.stroke();

        ctx.restore();
    }

    checkCollision(spacecraft) {
        const dx = this.x - spacecraft.x;
        const dy = this.y - spacecraft.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.size + spacecraft.radius);
    }
}

/** Thin Signal-Blue wall slab on one screen edge — bank into it for shield + speed. */
class WallBoostPowerUp {
    constructor(game, isLeft, y) {
        this.game = game;
        this.kind = 'wallBoost';
        this.isLeft = isLeft;
        this.width = game.baseUnit * 0.9;
        this.height = game.baseUnit * 10;
        this.x = isLeft ? this.width / 2 : game.width - this.width / 2;
        this.y = y;
        this.pulsePhase = Math.random() * Math.PI * 2;
        // Button-press state: idle → pressing (retract into wall) → done.
        this.pressing = false;
        this.pressStart = 0;
        this.done = false;
    }

    /** @returns {boolean} true if this was the first press (caller should grant buffs). */
    beginPress() {
        if (this.pressing || this.done) return false;
        this.pressing = true;
        this.pressStart = performance.now();
        return true;
    }

    /** 0 → 1 while pressing; 0 when idle. */
    pressT() {
        if (!this.pressing) return 0;
        return Math.min(1, (performance.now() - this.pressStart) / WALL_PRESS_MS);
    }

    update() {
        this.pulsePhase += this.pressing ? 0.02 : 0.06;
        if (this.pressing && this.pressT() >= 1) {
            this.done = true;
        }
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);
        const halfHeight = this.height / 2;
        if (relativeY + halfHeight < 0 || relativeY - halfHeight > this.game.height) {
            return;
        }

        const unit = this.game.baseUnit;
        const t = this.pressT();
        // Ease-in: quick settle into the wall like a physical button.
        const ease = t * t;
        const retract = this.width * ease;
        const drawW = Math.max(0.01, this.width * (1 - ease));
        const drawH = this.height * (1 - ease * 0.12);
        const drawX = this.isLeft
            ? this.x - retract
            : this.x + retract;
        const pulse = this.pressing
            ? 0.85 * (1 - ease)
            : 0.72 + Math.sin(this.pulsePhase) * 0.18;

        if (pulse <= 0.02 || drawW < 0.5) return;

        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = color.signal || SHIELD_BLUE;
        ctx.beginPath();
        ctx.rect(
            drawX - drawW / 2,
            relativeY - drawH / 2,
            drawW,
            drawH,
        );
        ctx.fill();

        // Soft outer edge pulse (idle only — press is a clean sunk face).
        if (!this.pressing) {
            const pt = (this.pulsePhase % (Math.PI * 2)) / (Math.PI * 2);
            const edgeExpand = pt * unit * 0.45;
            const edgeAlpha = Math.pow(1 - pt, 1.6) * 0.55;
            ctx.globalAlpha = edgeAlpha;
            ctx.strokeStyle = `rgba(${SHIELD_BLUE_RGB}, 1)`;
            ctx.lineWidth = unit * 0.12;
            ctx.strokeRect(
                this.x - this.width / 2 - edgeExpand * 0.35,
                relativeY - halfHeight - edgeExpand * 0.15,
                this.width + edgeExpand * 0.7,
                this.height + edgeExpand * 0.3,
            );
        }
        ctx.restore();
    }

    checkCollision(spacecraft) {
        if (this.pressing || this.done) return false;
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        return spacecraft.x - spacecraft.radius < this.x + halfWidth &&
               spacecraft.x + spacecraft.radius > this.x - halfWidth &&
               spacecraft.y - spacecraft.radius < this.y + halfHeight &&
               spacecraft.y + spacecraft.radius > this.y - halfHeight;
    }
}

export class PowerUpManager {
    constructor(game) {
        this.game = game;
        this.powerUps = [];
        this.lastSpawnTime = 0;
        this.spawnInterval = 5000; // Floating plus
        this.lastWallSpawnTime = 0;
        this.wallSpawnInterval = 22000; // Late-run rarity (~2× previous)

        // Only start spawning shields after learning phase
        this.shieldsEnabled = false;
        // Wall boost is a deep-run gift — far after the plus unlocks.
        this.wallBoostsEnabled = false;
    }

    update() {
        // Enable shields after the run's opening stretch.
        if (!this.shieldsEnabled && this.game.score >= this.game.profile.shieldsFromScore) {
            this.shieldsEnabled = true;
        }
        const wallFrom = this.game.profile.wallBoostsFromScore ?? 12000;
        if (!this.wallBoostsEnabled && this.game.score >= wallFrom) {
            this.wallBoostsEnabled = true;
        }

        const currentTime = performance.now();
        const spawnY = this.game.camera.y - this.game.height;
        const pastGate = this.game.isAtOrPastFinaleGate?.(spawnY);
        if (this.shieldsEnabled && currentTime - this.lastSpawnTime > this.spawnInterval) {
            if (!pastGate) this.spawnPowerUp();
            this.lastSpawnTime = currentTime;
        }
        if (this.wallBoostsEnabled && currentTime - this.lastWallSpawnTime > this.wallSpawnInterval) {
            if (!pastGate) this.spawnWallBoost();
            this.lastWallSpawnTime = currentTime;
        }

        // Update existing power-ups
        this.powerUps.forEach(powerUp => powerUp.update());

        // Check collisions and remove finished / off-screen power-ups
        this.powerUps = this.powerUps.filter(powerUp => {
            if (powerUp.kind === 'wallBoost') {
                if (powerUp.done) return false;
                if (powerUp.checkCollision(this.game.spacecraft)) {
                    this.collectPowerUp(powerUp);
                }
                return powerUp.y > this.game.camera.y - this.game.height * 1.5;
            }

            if (powerUp.checkCollision(this.game.spacecraft)) {
                this.collectPowerUp(powerUp);
                return false;
            }
            return powerUp.y > this.game.camera.y - this.game.height * 1.5;
        });

        this.game.logbook?.scanPowerUpsVisible?.();
    }

    collectPowerUp(powerUp) {
        if (powerUp.kind === 'wallBoost') {
            if (!powerUp.beginPress()) return;
            console.log('Wall boost collected!');
            this.game.soundManager.playShield();
            this.game.spacecraft.activateShield();
            this.game.spacecraft.activateSpeedBoost();
            this.game.logbook?.onWallBoostCollected?.();
            // Same sidewall BOOP as a bounce — sells the button press.
            const side = powerUp.isLeft ? -1 : 1;
            this.game.wallBoopManager?.triggerBoop?.(this.game.spacecraft, side);
            return;
        }

        console.log('Shield collected!');
        this.game.soundManager.playShield();
        this.game.spacecraft.activateShield();
        this.game.logbook?.onShieldCollected?.();
    }

    spawnPowerUp() {
        const margin = this.game.baseUnit * 4;
        const availableWidth = this.game.width - (margin * 2);
        const x = margin + (Math.random() * availableWidth);
        const y = this.game.camera.y - this.game.height;

        this.powerUps.push(new ShieldPowerUp(this.game, x, y));
    }

    spawnWallBoost() {
        const isLeft = Math.random() < 0.5;
        const y = this.game.camera.y - this.game.height;
        this.powerUps.push(new WallBoostPowerUp(this.game, isLeft, y));
    }

    render(ctx) {
        this.powerUps.forEach(powerUp => powerUp.render(ctx));
    }
}
