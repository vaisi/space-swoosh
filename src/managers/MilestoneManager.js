// MilestoneManager.js
// Shows the timed milestone log lines during flight.
// Changes:
// - Tutorial / log lines can embed `{space}` — rendered as a bold SPACE keycap
//   so Zigzag's "tap or press Space" hint matches the real control.
// - The message alpha multiplies into the caller's `globalAlpha` rather than
//   replacing it, so a log line fades with the world during the level-clear flyout.
// - Re-skinned the notification to the brand kit: ink-on-paper Space Grotesk
//   (medium) instead of the near-invisible white Arial + glow, with a soft paper
//   backing plate so the science-officer log reads clearly over the math paper.

import { color, font } from '../brand/tokens.js';

const SPACE_TOKEN = '{space}';

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

    /** Measure width of a message that may contain `{space}` keycaps. */
    measureRichWidth(ctx, text, fontSize) {
        const parts = String(text).split(SPACE_TOKEN);
        let width = 0;
        ctx.font = `500 ${fontSize}px ${font.ui}`;
        for (let i = 0; i < parts.length; i++) {
            width += ctx.measureText(parts[i]).width;
            if (i < parts.length - 1) {
                width += this.spaceKeyWidth(ctx, fontSize);
            }
        }
        return width;
    }

    spaceKeyWidth(ctx, fontSize) {
        const label = 'SPACE';
        ctx.font = `700 ${fontSize * 0.72}px ${font.ui}`;
        const labelW = ctx.measureText(label).width;
        return labelW + fontSize * 0.7;
    }

    drawSpaceKey(ctx, x, y, fontSize) {
        const label = 'SPACE';
        const keyH = fontSize * 1.05;
        const padX = fontSize * 0.28;
        ctx.font = `700 ${fontSize * 0.72}px ${font.ui}`;
        const labelW = ctx.measureText(label).width;
        const keyW = labelW + padX * 2;

        ctx.save();
        ctx.fillStyle = color.ink;
        ctx.strokeStyle = color.ink;
        ctx.lineWidth = Math.max(1.5, fontSize * 0.08);
        ctx.beginPath();
        ctx.rect(x, y - keyH / 2, keyW, keyH);
        ctx.stroke();

        ctx.fillStyle = color.ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + keyW / 2, y + fontSize * 0.02);
        ctx.restore();

        return keyW;
    }

    drawRichText(ctx, text, cx, cy, fontSize) {
        const parts = String(text).split(SPACE_TOKEN);
        const totalW = this.measureRichWidth(ctx, text, fontSize);
        let x = cx - totalW / 2;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color.ink;

        for (let i = 0; i < parts.length; i++) {
            ctx.font = `500 ${fontSize}px ${font.ui}`;
            if (parts[i]) {
                ctx.fillText(parts[i], x, cy);
                x += ctx.measureText(parts[i]).width;
            }
            if (i < parts.length - 1) {
                x += this.drawSpaceKey(ctx, x, cy, fontSize);
            }
        }
    }

    render(ctx) {
        if (!this.currentMessage) return;

        const isMobile = window.innerWidth <= 768;
        const unit = this.game.baseUnit;
        const opacity = this.currentMessage.opacity;
        const text = this.currentMessage.text;

        const plainLen = String(text).split(SPACE_TOKEN).join('SPACE').length;
        const sizeAdjust = plainLen > 30 ? 0.8 : 1;
        const fontSize = (isMobile ? 1.4 : 1.7) * unit * sizeAdjust;

        const cx = this.game.width / 2;
        const cy = isMobile ? this.game.height * 0.3 : this.game.height / 2;

        ctx.save();
        // Multiplied, not set: the level-clear flyout fades the whole world out
        // through the context alpha, and a log line must fade with it.
        ctx.globalAlpha *= Math.max(0, Math.min(1, opacity));

        const textWidth = this.measureRichWidth(ctx, text, fontSize);
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

        this.drawRichText(ctx, text, cx, cy, fontSize);

        ctx.restore();
    }
}
