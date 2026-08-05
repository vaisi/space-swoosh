// MilestoneManager.js
// Shows the timed milestone log lines during flight.
// Changes:
// - Rich `{space}` lines reset textAlign/fillStyle after the keycap so the
//   trailing words ("to change direction") no longer draw centred on top of it.
// - showMessage() accepts optional fadeIn / hold / fadeOut timings so the
//   run-start level title can linger and fade out over ~3s.
// - Tutorial / log lines can embed `{space}` — rendered as a bold SPACE keycap
//   so Zigzag's "tap or press Space" hint matches the real control.
// - The message alpha multiplies into the caller's `globalAlpha` rather than
//   replacing it, so a log line fades with the world during the level-clear flyout.
// - Re-skinned the notification to the brand kit: ink-on-paper Space Grotesk
//   (medium) instead of the near-invisible white Arial + glow, with a soft paper
//   backing plate so the science-officer log reads clearly over the math paper.

import { color, font } from '../brand/tokens.js';

const SPACE_TOKEN = '{space}';

const DEFAULT_FADE_IN = 500;
const DEFAULT_HOLD = 2000;
const DEFAULT_FADE_OUT = 500;

export class MilestoneManager {
    constructor(game) {
        this.game = game;
        this.milestones = [...game.config.milestones];
        this.currentMessage = null;
    }

    /**
     * @param {string} message
     * @param {{ fadeIn?: number, hold?: number, fadeOut?: number }} [timing]
     */
    showMessage(message, timing = {}) {
        console.log("Showing milestone message:", message);
        this.currentMessage = {
            text: message,
            opacity: 0,
            startTime: performance.now(),
            fadeIn: timing.fadeIn ?? DEFAULT_FADE_IN,
            hold: timing.hold ?? DEFAULT_HOLD,
            fadeOut: timing.fadeOut ?? DEFAULT_FADE_OUT,
        };
    }

    update() {
        if (!this.currentMessage) return;

        const m = this.currentMessage;
        const elapsed = performance.now() - m.startTime;
        const fadeIn = m.fadeIn ?? DEFAULT_FADE_IN;
        const hold = m.hold ?? DEFAULT_HOLD;
        const fadeOut = m.fadeOut ?? DEFAULT_FADE_OUT;
        const duration = fadeIn + hold + fadeOut;

        if (elapsed < fadeIn) {
            m.opacity = elapsed / fadeIn;
        } else if (elapsed < fadeIn + hold) {
            m.opacity = 1;
        } else if (elapsed < duration) {
            m.opacity = 1 - (elapsed - fadeIn - hold) / fadeOut;
        } else {
            this.currentMessage = null;
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
        const left = x;
        const top = y - keyH / 2;

        ctx.fillStyle = color.ink;
        ctx.beginPath();
        const r = fontSize * 0.18;
        ctx.moveTo(left + r, top);
        ctx.arcTo(left + keyW, top, left + keyW, top + keyH, r);
        ctx.arcTo(left + keyW, top + keyH, left, top + keyH, r);
        ctx.arcTo(left, top + keyH, left, top, r);
        ctx.arcTo(left, top, left + keyW, top, r);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = color.paper;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, left + keyW / 2, y + fontSize * 0.04);
        return keyW + fontSize * 0.15;
    }

    drawRichText(ctx, text, cx, cy, fontSize) {
        const parts = String(text).split(SPACE_TOKEN);
        const totalW = this.measureRichWidth(ctx, text, fontSize);
        let x = cx - totalW / 2;

        ctx.textBaseline = 'middle';

        for (let i = 0; i < parts.length; i++) {
            // Keycap draw leaves textAlign=center; restore before each text run
            // or the next words centre on the cursor and sit on top of the key.
            ctx.textAlign = 'left';
            ctx.fillStyle = color.ink;
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
