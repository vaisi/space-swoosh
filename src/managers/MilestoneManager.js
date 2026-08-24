// MilestoneManager.js
// Shows the timed milestone log lines during flight.
// Changes:
// - `{space}` keycap draws through ui/Keycaps.js (same glyph as Open Space).
// - Night paper: backing plate uses charcoal paperRgb so bone ink text stays
//   readable (old cream plate washed out against ink).
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

import { color } from '../brand/tokens.js';
import { drawRichLine, measureRichWidth as measureKeycapLine } from '../ui/Keycaps.js';

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
        return measureKeycapLine(ctx, text, fontSize);
    }

    drawRichText(ctx, text, cx, cy, fontSize) {
        drawRichLine(ctx, text, cx, cy, fontSize);
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
        ctx.fillStyle = `rgba(${color.paperRgb}, 0.92)`;
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
