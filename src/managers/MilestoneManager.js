export class MilestoneManager {
    constructor(game) {
        this.game = game;
        this.milestones = [...game.config.milestones];
        this.currentMilestone = null;
        this.messageAlpha = 0;
        this.messageTimer = 0;
    }

    showMessage(message) {
        // Show a temporary message without affecting milestones
        this.currentMilestone = { message };
        this.messageAlpha = 0;
        this.messageTimer = 3000;
    }

    update() {
        // Check for new milestones
        if (this.milestones.length > 0 && this.game.score >= this.milestones[0].score) {
            this.currentMilestone = this.milestones.shift();
            this.messageAlpha = 0;
            this.messageTimer = 3000; // 3 seconds display time
        }

        // Update message display
        if (this.messageTimer > 0) {
            this.messageTimer -= (1000 / 60); // Assuming 60fps
            
            // Fade in
            if (this.messageTimer > 2500) {
                this.messageAlpha = (3000 - this.messageTimer) / 500;
            }
            // Fade out
            else if (this.messageTimer < 500) {
                this.messageAlpha = this.messageTimer / 500;
            }
            // Full opacity
            else {
                this.messageAlpha = 1;
            }
        }
    }

    render(ctx) {
        if (this.currentMilestone && this.messageTimer > 0) {
            ctx.save();
            
            // Set up text style
            ctx.font = `${3 * this.game.baseUnit}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Add glow effect
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 1.5 * this.game.baseUnit;
            
            // Draw text with current alpha
            ctx.fillStyle = `rgba(255, 255, 255, ${this.messageAlpha})`;
            ctx.fillText(
                this.currentMilestone.message,
                this.game.canvas.width / 2,
                this.game.canvas.height / 2
            );
            
            ctx.restore();
        }
    }
} 