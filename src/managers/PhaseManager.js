export class PhaseManager {
    constructor(game) {
        this.game = game;
        this.phases = {
            learning: {
                name: "Troposphere",
                score: 50000,
                tip: "Stay calm and maintain steady control."
            },
            basic: {
                name: "Stratosphere",
                score: 47000,
                tip: "Watch for moving obstacles. Time your movements carefully."
            },
            intermediate: {
                name: "Mesosphere",
                score: 44000,
                tip: "Use portals wisely to navigate through difficult sections."
            },
            advanced: {
                name: "Thermosphere",
                score: 41000,
                tip: "Complex patterns ahead. Stay focused!"
            },
            expert: {
                name: "Exosphere",
                score: 38000,
                tip: "Beware of black holes. Their pull is irresistible!"
            }
        };
        
        // Fixed phase order
        this.phaseOrder = ['learning', 'basic', 'intermediate', 'advanced', 'expert'];
        this.currentPhaseIndex = 0;
        this.lastTransitionScore = 50000;
        
        // Increase transition duration
        this.transitionDuration = 4000; // 4 seconds for better visibility
        
        // Start with learning phase
        this.currentPhase = 'learning';
        this.transitionActive = false;
        this.transitionStartTime = 0;
        
        // Orbiting orbs configuration
        this.orbs = [];
        this.targetDistance = game.baseUnit * 6;
        
        // Trail configuration
        this.trails = [];
        
        // Debug flag
        this.debug = true;
    }

    getCurrentPhaseForScore(score) {
        // Use fixed phase order instead of score-based lookup
        for (let i = this.phaseOrder.length - 1; i >= 0; i--) {
            const phaseName = this.phaseOrder[i];
            if (score <= this.phases[phaseName].score) {
                return phaseName;
            }
        }
        return 'learning';
    }

    update() {
        const score = this.game.score;
        
        if (!this.transitionActive) {
            const appropriatePhase = this.getCurrentPhaseForScore(score);
            
            // Only transition if we're moving to a different phase and enough time has passed
            if (appropriatePhase !== this.currentPhase && 
                Math.abs(score - this.lastTransitionScore) > 2000) { // Increased minimum distance
                
                this.startPhaseTransition(appropriatePhase);
            }
        }

        if (this.transitionActive) {
            const progress = (performance.now() - this.transitionStartTime) / this.transitionDuration;
            
            if (progress < 1) {
                // Update explosion particles
                this.trails = this.trails.filter(particle => {
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    particle.opacity -= this.trailFadeSpeed;
                    return particle.opacity > 0;
                });
                
                // Don't pause spawning, just make player invulnerable
                this.game.spacecraft.invulnerable = true;
            } else {
                this.transitionActive = false;
                this.game.spacecraft.invulnerable = false;
                this.lastTransitionScore = score;
            }
        }
    }

    startPhaseTransition(newPhase) {
        if (this.transitionActive) return;
        
        console.log(`Starting transition from ${this.currentPhase} to ${newPhase}`);
        this.currentPhase = newPhase;
        this.transitionActive = true;
        this.transitionStartTime = performance.now();
    }

    render(ctx) {
        if (!this.transitionActive) return;

        const phase = this.phases[this.currentPhase];
        
        // Render trails first
        this.trails.forEach(particle => {
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 140, 0, ${particle.opacity})`;
            ctx.arc(particle.x, particle.y, this.orbRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Render text with just glow effect, no background
        ctx.save();
        ctx.shadowColor = 'rgba(255, 165, 0, 0.8)';
        ctx.shadowBlur = 25;
        ctx.font = `bold ${this.game.baseUnit * 3}px Arial`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(
            phase.name,
            this.game.canvas.width / 2,
            this.game.canvas.height * 0.4
        );
        
        ctx.font = `${this.game.baseUnit * 1.5}px Arial`;
        ctx.fillText(
            phase.tip,
            this.game.canvas.width / 2,
            this.game.canvas.height * 0.6
        );
        ctx.restore();
    }
} 