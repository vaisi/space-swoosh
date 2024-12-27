export class MilestoneManager {
    constructor(game) {
        this.game = game;
        this.milestones = [...game.config.milestones];
        this.currentMessage = null;
    }

    showMessage(message) {
        console.log("Showing milestone message:", message);
        this.currentMessage = {
            text: message,
            opacity: 1,
            startTime: performance.now()
        };
    }

    update() {
        if (this.currentMessage) {
            const elapsed = performance.now() - this.currentMessage.startTime;
            const duration = 3000; // 3 seconds display time
            
            if (elapsed < duration) {
                // Fade in and out
                if (elapsed < 500) {
                    // First 0.5s: fade in
                    this.currentMessage.opacity = elapsed / 500;
                } else if (elapsed > duration - 500) {
                    // Last 0.5s: fade out
                    this.currentMessage.opacity = (duration - elapsed) / 500;
                } else {
                    // Middle: full opacity
                    this.currentMessage.opacity = 1;
                }
            } else {
                this.currentMessage = null;
            }
        }
    }

    render(ctx) {
        if (this.currentMessage) {
            ctx.save();
            
            // Set up text style
            ctx.font = `${3 * this.game.baseUnit}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Add glow effect
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 1.5 * this.game.baseUnit;
            
            // Draw text with current opacity
            ctx.fillStyle = `rgba(255, 255, 255, ${this.currentMessage.opacity})`;
            ctx.fillText(
                this.currentMessage.text,
                this.game.canvas.width / 2,
                this.game.canvas.height / 2
            );
            
            ctx.restore();
        }
    }
} 