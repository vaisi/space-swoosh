// LogbookToastManager.js
// Short top-center "Space Log updated" chip during Journey flight.
// Changes:
// - Toast label SPACE LOG UPDATED (was LOGBOOK UPDATED).
// - Anchored top-center so it clears the DOM pause button (top-right).
// - Created file: independent of MilestoneManager; ~2s fade.

import { color } from '../brand/tokens.js';
import { setLabelType, resetType } from '../utils/BrandDraw.js';

const DURATION_MS = 2000;
const FADE_MS = 350;

export class LogbookToastManager {
    constructor(game) {
        this.game = game;
        /** @type {{ startTime: number, opacity: number } | null} */
        this.toast = null;
    }

    show() {
        this.toast = {
            startTime: performance.now(),
            opacity: 1,
        };
    }

    update() {
        if (!this.toast) return;

        const elapsed = performance.now() - this.toast.startTime;
        if (elapsed >= DURATION_MS) {
            this.toast = null;
            return;
        }

        if (elapsed < FADE_MS) {
            this.toast.opacity = elapsed / FADE_MS;
        } else if (elapsed > DURATION_MS - FADE_MS) {
            this.toast.opacity = (DURATION_MS - elapsed) / FADE_MS;
        } else {
            this.toast.opacity = 1;
        }
    }

    render(ctx) {
        if (!this.toast) return;

        const unit = this.game.baseUnit;
        const label = 'SPACE LOG UPDATED';
        const px = Math.max(9, unit * 0.95);
        const padX = unit * 1.1;
        const padY = unit * 0.55;

        ctx.save();
        setLabelType(ctx, px, 600);
        const textW = ctx.measureText(label).width;
        const boxW = textW + padX * 2;
        const boxH = px + padY * 2;
        const x = (this.game.width - boxW) / 2;
        const y = unit * 2;

        const a = this.toast.opacity;
        ctx.globalAlpha *= a;

        ctx.fillStyle = color.paperTint;
        ctx.strokeStyle = color.ink;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(x, y, boxW, boxH);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = color.ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + boxW / 2, y + boxH / 2);
        resetType(ctx);
        ctx.restore();
    }
}
