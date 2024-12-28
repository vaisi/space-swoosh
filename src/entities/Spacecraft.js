export class Spacecraft {
    constructor(game) {
        console.log('Creating spacecraft...');
        this.game = game;
        this.radius = this.game.baseUnit;
        this.x = this.game.canvas.width / 2;
        this.y = this.game.canvas.height * 0.8;
        this.baseSpeed = game.config.spacecraft.speed * game.canvas.height;
        this.arcRadius = game.config.spacecraft.arcRadius * game.canvas.width;
        this.arcDuration = game.config.spacecraft.arcDuration;
        
        this.trail = [];
        this.moveState = null;
        this.verticalSpeed = this.baseSpeed;
        this.isVisible = true;
        this.verticalVelocity = this.baseSpeed;
        
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldDuration = 5000; // Increased from 3000 to 5000 (5 seconds)
        this.shieldPulse = 0;
        this.shieldWarningStarted = false; // For visual feedback when shield is about to end
        
        console.log('Spacecraft position:', this.x, this.y);
        this.pausedState = null; // Store movement state during pause
        this.pausedTime = 0;  // Store time when paused
    }

    reset() {
        this.x = this.game.canvas.width / 2;
        this.y = this.game.canvas.height * 0.85;
        this.trail = [];
        this.moveState = null;
        this.isVisible = true;
    }

    update() {
        if (this.game.isPaused) return;

        const currentTime = performance.now();
        
        // If we were paused and have a movement state
        if (this.pausedTime > 0) {
            if (this.moveState) {
                // Adjust the movement timing
                const pauseDuration = currentTime - this.pausedTime;
                this.moveState.startTime += pauseDuration;
                
                // Check if movement should have completed during pause
                const elapsed = currentTime - this.moveState.startTime;
                if (elapsed >= this.arcDuration) {
                    this.moveState = null;
                }
            }
            // Always reset pause time after handling it
            this.pausedTime = 0;
        }

        // Smooth vertical movement
        const targetVerticalSpeed = this.baseSpeed;
        this.verticalVelocity = this.verticalVelocity * 0.95 + targetVerticalSpeed * 0.05;
        this.y -= this.verticalVelocity * (1/60);

        // Handle arc movement if active
        if (this.moveState) {
            const elapsed = currentTime - this.moveState.startTime;
            const progress = Math.min(1, elapsed / this.arcDuration);
            
            const angle = (this.moveState.direction === 'left' ? -1 : 1) * Math.PI * progress;
            const newX = this.moveState.startX + Math.sin(angle) * this.arcRadius;
            
            // Wall collision check
            if (newX < this.radius || newX > this.game.canvas.width - this.radius) {
                const newDirection = newX < this.radius ? 'right' : 'left';
                const bounceX = newX < this.radius ? this.radius : this.game.canvas.width - this.radius;
                
                // Play turn sound when bouncing
                this.game.soundManager.playTurn();
                
                this.moveState = {
                    startX: bounceX,
                    startY: this.y,
                    startTime: currentTime,
                    direction: newDirection,
                };
                
                this.x = bounceX;
            } else {
                this.x = newX;
            }
            
            // Smoother vertical boost during movement
            const verticalBoost = Math.sin(progress * Math.PI) * (this.baseSpeed * 0.3);
            this.verticalVelocity = this.baseSpeed + verticalBoost;
            
            if (progress >= 1) {
                this.moveState = null;
            }
        }

        this.updateTrail();

        // Update shield
        if (this.shieldActive) {
            this.shieldTimer -= (1000/60);
            this.shieldPulse += 0.1;

            // Start warning animation when shield is about to end (last 1.5 seconds)
            if (this.shieldTimer < 1500 && !this.shieldWarningStarted) {
                this.shieldWarningStarted = true;
                this.shieldPulse = 0; // Reset pulse for warning animation
            }

            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
                this.shieldWarningStarted = false;
            }
        }
    }

    startMovement(direction) {
        if (this.game.isPaused) return;

        // Play turn sound when starting a new movement
        this.game.soundManager.playTurn();
        
        // Always start fresh movement
        this.moveState = {
            startX: this.x,
            startY: this.y,
            startTime: performance.now(),
            direction
        };
        this.game.soundManager.playMove();
    }

    updateTrail() {
        // Only add new trail point if we've moved enough since the last one
        const lastPoint = this.trail[this.trail.length - 1];
        if (!lastPoint || 
            Math.hypot(this.x - lastPoint.x, this.y - lastPoint.y) > this.game.config.spacecraft.trailSpacing) {
            this.trail.push({
                x: this.x,
                y: this.y,
                opacity: 1.0
            });
        }

        // Update existing trail points
        this.trail = this.trail
            .map(point => ({
                ...point,
                opacity: point.opacity - (1 / 180)
            }))
            .filter(point => point.opacity > 0)
            .slice(-50); // Reduced number of trail points for dotted effect
    }

    render(ctx) {
        if (!this.isVisible) return;

        // Save context state
        ctx.save();
        
        // Draw spacecraft
        ctx.beginPath();
        ctx.arc(
            this.x,
            this.game.camera.getRelativeY(this.y),
            this.radius,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = '#000000';
        ctx.fill();

        // Render dotted trail with proper scaling
        const dotSize = this.radius * this.game.config.spacecraft.trailDotSize;
        this.trail.forEach(point => {
            ctx.beginPath();
            ctx.arc(
                point.x,
                this.game.camera.getRelativeY(point.y),
                dotSize,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = `rgba(0, 0, 0, ${point.opacity})`;
            ctx.fill();
        });

        ctx.restore();

        // Render shield if active
        if (this.shieldActive) {
            let pulseScale;
            let opacity;
            
            if (this.shieldWarningStarted) {
                // Faster, more dramatic pulsing for warning
                pulseScale = 1 + Math.sin(this.shieldPulse * 2) * 0.3;
                opacity = 0.7 + Math.sin(this.shieldPulse * 2) * 0.3;
            } else {
                // Normal shield pulsing
                pulseScale = 1 + Math.sin(this.shieldPulse) * 0.2;
                opacity = 0.5 + Math.sin(this.shieldPulse) * 0.2;
            }
            
            const shieldSize = this.radius * 1.5 * pulseScale;
            
            ctx.beginPath();
            ctx.arc(
                this.x,
                this.game.camera.getRelativeY(this.y),
                shieldSize,
                0,
                Math.PI * 2
            );
            ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
            ctx.lineWidth = this.radius * 0.2;
            ctx.stroke();

            // Add second shield ring for visual effect
            ctx.beginPath();
            ctx.arc(
                this.x,
                this.game.camera.getRelativeY(this.y),
                shieldSize * 1.1,
                0,
                Math.PI * 2
            );
            ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
            ctx.lineWidth = this.radius * 0.1;
            ctx.stroke();
        }
    }

    activateShield() {
        this.shieldActive = true;
        this.shieldTimer = this.shieldDuration;
        this.shieldWarningStarted = false;
        this.shieldPulse = 0;
    }
} 