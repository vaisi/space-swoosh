// MilestoneManager.js
// Shows the timed milestone log lines during flight.
// Changes:
// - The message alpha multiplies into the caller's `globalAlpha` rather than
//   replacing it, so a log line fades with the world during the level-clear flyout.
// - Re-skinned the notification to the brand kit: ink-on-paper Space Grotesk
//   (medium) instead of the near-invisible white Arial + glow, with a soft paper
//   backing plate so the science-officer log reads clearly over the math paper.

import { color, font } from '../brand/tokens.js';

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
        if (!this.currentMessage) return;

        const isMobile = window.innerWidth <= 768;
        const unit = this.game.baseUnit;
        const opacity = this.currentMessage.opacity;

        const messageLength = this.currentMessage.text.length;
        const sizeAdjust = messageLength > 30 ? 0.8 : 1;
        const fontSize = (isMobile ? 1.4 : 1.7) * unit * sizeAdjust;

        const cx = this.game.canvas.width / 2;
        const cy = isMobile ? this.game.canvas.height * 0.3 : this.game.canvas.height / 2;

        ctx.save();
        // Multiplied, not set: the level-clear flyout fades the whole world out
        // through the context alpha, and a log line must fade with it.
        ctx.globalAlpha *= Math.max(0, Math.min(1, opacity));

        // Space Grotesk medium — the UI/label voice of the brand.
        ctx.font = `500 ${fontSize}px ${font.ui}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Soft paper backing plate so the log line reads over any obstacles/grid.
        const textWidth = ctx.measureText(this.currentMessage.text).width;
        const padX = unit * 1.4;
        const padY = unit * 0.9;
        ctx.fillStyle = 'rgba(234, 228, 210, 0.82)';
        ctx.fillRect(cx - textWidth / 2 - padX, cy - fontSize / 2 - padY, textWidth + padX * 2, fontSize + padY * 2);

        // A dotted-trail underline (the brand's signature mark).
        ctx.fillStyle = color.ink30;
        for (let x = cx - textWidth / 2; x <= cx + textWidth / 2; x += 8) {
            ctx.beginPath();
            ctx.arc(x, cy + fontSize / 2 + padY * 0.7, 1.4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = color.ink;
        ctx.fillText(this.currentMessage.text, cx, cy);

        ctx.restore();
    }
} 