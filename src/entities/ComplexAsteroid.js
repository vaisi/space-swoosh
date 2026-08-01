export class ComplexAsteroid {
    constructor(game, x, y, size) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.size = size;
        this.baseColor = '#8B4513';
        this.satelliteColor = '#A0522D';
        
        // Create satellites
        this.satellites = [];
        const satelliteCount = 2 + Math.floor(Math.random() * 2); // 2-3 satellites
        
        for (let i = 0; i < satelliteCount; i++) {
            this.satellites.push({
                angle: (Math.PI * 2 * i) / satelliteCount,
                distance: size * 1.2,
                size: size * 0.3,
                // Reduce max rotation speed by 20%
                rotationSpeed: (0.02 + Math.random() * 0.03) * 0.8 // Multiplied by 0.8 for 20% reduction
            });
        }
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);
        
        // Draw main asteroid (circular)
        ctx.beginPath();
        ctx.arc(this.x, relativeY, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.baseColor;
        ctx.fill();
        
        // Draw satellites
        this.satellites.forEach(satellite => {
            const satX = this.x + Math.cos(satellite.angle) * satellite.distance;
            const satY = relativeY + Math.sin(satellite.angle) * satellite.distance;
            
            ctx.beginPath();
            ctx.arc(satX, satY, satellite.size, 0, Math.PI * 2);
            ctx.fillStyle = this.satelliteColor;
            ctx.fill();
            
            // Update satellite position
            satellite.angle += satellite.rotationSpeed;
        });
    }

    checkCollision(spacecraft) {
        const dx = spacecraft.x - this.x;
        const dy = spacecraft.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check collision with main asteroid
        if (distance < this.size + spacecraft.size) {
            return true;
        }
        
        // Check collision with satellites
        return this.satellites.some(satellite => {
            const satX = this.x + Math.cos(satellite.angle) * satellite.distance;
            const satY = this.y + Math.sin(satellite.angle) * satellite.distance;
            const satDx = spacecraft.x - satX;
            const satDy = spacecraft.y - satY;
            const satDistance = Math.sqrt(satDx * satDx + satDy * satDy);
            
            return satDistance < satellite.size + spacecraft.size;
        });
    }

    createDestructionParticles() {
        const particles = [];
        const particleCount = 8;
        const baseSpeed = this.game.baseUnit * 0.2;
        
        // Create particles for main asteroid
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * baseSpeed,
                vy: Math.sin(angle) * baseSpeed,
                size: this.size * 0.2,
                opacity: 1,
                color: this.baseColor
            });
        }
        
        // Create particles for each satellite
        this.satellites.forEach(satellite => {
            const satX = this.x + Math.cos(satellite.angle) * satellite.distance;
            const satY = this.y + Math.sin(satellite.angle) * satellite.distance;
            
            for (let i = 0; i < particleCount/2; i++) {
                const angle = (Math.PI * 2 * i) / (particleCount/2);
                particles.push({
                    x: satX,
                    y: satY,
                    vx: Math.cos(angle) * baseSpeed,
                    vy: Math.sin(angle) * baseSpeed,
                    size: satellite.size * 0.2,
                    opacity: 1,
                    color: this.satelliteColor
                });
            }
        });
        
        return particles;
    }
} 