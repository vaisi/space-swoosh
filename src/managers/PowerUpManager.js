// PowerUpManager.js
// Spawns/updates the shield power-up.
// Changes:
// - Journey Logbook: observe on-screen shields; interact on collect.
// - The distance shields start appearing at now comes from `game.profile`, so a
//   short Journey level gets them proportionally early instead of waiting for
//   the endless run's fixed 500 KM.
// - Shield pickup is a constant black plus surrounded by pulsating blue circles
//   that start crisp near the plus and expand + fade out quickly (portal blue).

import { SHIELD_BLUE_RGB, INK } from '../utils/DrawUtils.js';

class ShieldPowerUp {
    constructor(game, x, y) {
        this.game = game;
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

export class PowerUpManager {
    constructor(game) {
        this.game = game;
        this.powerUps = [];
        this.lastSpawnTime = 0;
        this.spawnInterval = 5000; // Base spawn interval
        
        // Only start spawning shields after learning phase
        this.shieldsEnabled = false;
    }

    update() {
        // Enable shields after the run's opening stretch.
        if (!this.shieldsEnabled && this.game.score >= this.game.profile.shieldsFromScore) {
            this.shieldsEnabled = true;
        }

        const currentTime = performance.now();
        if (this.shieldsEnabled && currentTime - this.lastSpawnTime > this.spawnInterval) {
            this.spawnPowerUp();
            this.lastSpawnTime = currentTime;
        }

        // Update existing power-ups
        this.powerUps.forEach(powerUp => powerUp.update());

        // Check collisions and remove off-screen power-ups
        this.powerUps = this.powerUps.filter(powerUp => {
            if (powerUp.checkCollision(this.game.spacecraft)) {
                console.log('Shield collected!');
                // Play shield sound before activating shield
                this.game.soundManager.playShield();
                this.game.spacecraft.activateShield();
                this.game.logbook?.onShieldCollected?.();
                return false;
            }
            return powerUp.y > this.game.camera.y - this.game.height * 1.5;
        });

        this.game.logbook?.scanPowerUpsVisible?.();
    }

    spawnPowerUp() {
        const margin = this.game.baseUnit * 4;
        const availableWidth = this.game.width - (margin * 2);
        const x = margin + (Math.random() * availableWidth);
        const y = this.game.camera.y - this.game.height;
        
        // Always spawn shield powerup since it's the only type now
        this.powerUps.push(new ShieldPowerUp(this.game, x, y));
    }

    render(ctx) {
        this.powerUps.forEach(powerUp => powerUp.render(ctx));
    }
} 