class ShieldPowerUp {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.size = game.baseUnit * 2;
        this.rotation = 0;
        this.rotationSpeed = 0.02;
        this.pulsePhase = 0;
    }

    update() {
        this.rotation += this.rotationSpeed;
        this.pulsePhase += 0.05;
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);
        
        if (relativeY + this.size < 0 || relativeY - this.size > this.game.canvas.height) {
            return;
        }

        ctx.save();
        ctx.translate(this.x, relativeY);
        ctx.rotate(this.rotation);

        // Draw pulsing shield icon
        const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.2;
        const currentSize = this.size * pulseScale;
        
        ctx.beginPath();
        ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = this.game.baseUnit * 0.3;
        ctx.stroke();

        // Draw cross inside
        const innerSize = currentSize * 0.5;
        ctx.beginPath();
        ctx.moveTo(-innerSize, 0);
        ctx.lineTo(innerSize, 0);
        ctx.moveTo(0, -innerSize);
        ctx.lineTo(0, innerSize);
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
        this.reset();
    }

    reset() {
        this.powerUps = [];
        this.nextSpawnY = -250;
        this.minSpawnInterval = 600;
        this.maxSpawnInterval = 800;
        this.lastSpawnDistance = 0;
        this.nextSpawnDistance = this.calculateNextSpawnDistance();
        this.powerUpTypes = ['shield'];
        
        // Ensure sound manager exists
        if (!this.game.soundManager) {
            console.warn('SoundManager not initialized');
            this.game.soundManager = {
                playPowerup: () => {} // Empty function as fallback
            };
        }
        
        console.log('PowerUpManager reset');
    }

    calculateNextSpawnDistance() {
        return this.minSpawnInterval + Math.random() * (this.maxSpawnInterval - this.minSpawnInterval);
    }

    update() {
        const currentDistance = Math.abs(this.game.camera.totalDistance);
        
        // Debug logs for power-up spawning
        if (currentDistance % 100 === 0) {
            console.log('Current distance:', currentDistance);
            console.log('Next spawn at:', this.lastSpawnDistance + this.nextSpawnDistance);
        }
        
        // Check if it's time to spawn a new power-up
        if (currentDistance >= this.lastSpawnDistance + this.nextSpawnDistance) {
            console.log('Spawning shield at distance:', currentDistance);
            this.spawnPowerUp();
            this.lastSpawnDistance = currentDistance;
            this.nextSpawnDistance = this.calculateNextSpawnDistance();
        }

        // Update existing power-ups
        this.powerUps.forEach(powerUp => powerUp.update());

        // Check collisions and remove off-screen power-ups
        this.powerUps = this.powerUps.filter(powerUp => {
            if (powerUp.checkCollision(this.game.spacecraft)) {
                console.log('Shield collected!');
                // Safely call sound method
                this.game.soundManager?.playPowerup?.();
                this.game.spacecraft.activateShield();
                return false;
            }
            return powerUp.y > this.game.camera.y - this.game.canvas.height * 1.5;
        });
    }

    spawnPowerUp() {
        const margin = this.game.baseUnit * 4;
        const availableWidth = this.game.canvas.width - (margin * 2);
        const x = margin + (Math.random() * availableWidth);
        const y = this.game.camera.y - this.game.canvas.height;
        
        // Always spawn shield powerup since it's the only type now
        this.powerUps.push(new ShieldPowerUp(this.game, x, y));
    }

    render(ctx) {
        this.powerUps.forEach(powerUp => powerUp.render(ctx));
    }
} 