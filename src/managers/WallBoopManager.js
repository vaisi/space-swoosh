// WallBoopManager.js
// Short ink "BOOP" popup when the ship bounces off a screen sidewall. Mirrors
// StyleSwooshManager's popup lifecycle, but sits below the hull beside the
// wall (never overlapping ship or edge) — label only, no glow / blot.
// Changes:
// - Journey: first sidewall hit per app session plays first-boop voice and
//   two milestone beats ("The walls forgive." / "Little else out here does.").
// - Soft haptic tick on each boop (Cap ImpactStyle.Light / web vibrate 12ms),
//   gated by the same 180 ms cooldown as the popup + SFX.
// - Journey Logbook: instant unlock for Space BOOP on trigger.
// - Dropped the blooming blot + kick dashes; BOOP is solid ink text only.
// - Label X is padded by measured "BOOP" half-width so left/right walls never
//   clip to "BOO|" / "|OOP".
// - Created file: triggerBoop(ship, side), tickEffects, render.

import { color } from '../brand/tokens.js';
import { FIRST_BOOP_BEATS } from '../config/JourneyNarrative.js';
import { hapticWallBoop } from '../native/index.js';
import { setLabelType, resetType } from '../utils/BrandDraw.js';

const LABEL = 'BOOP';

const BEAT_FADE_IN = 350;
const BEAT_FADE_OUT = 350;
const HOLD_MS_PER_CHAR = 55;
const HOLD_MS_MIN = 900;
const HOLD_MS_MAX = 2800;

/** Once per JS session (resets on full reload). */
let firstBoopVoicePlayed = false;

/** Half-width of the BOOP label at the size we paint it (wide tracking). */
function labelHalfWidth(unit) {
    const fontPx = Math.max(11, unit * 1.05);
    // 4 glyphs ≈ 0.72em each + 3 tracking gaps of 0.18em (see setLabelType).
    return fontPx * (4 * 0.72 + 3 * 0.18) * 0.5;
}

function holdForBeat(text) {
    const len = String(text || '').length;
    return Math.max(HOLD_MS_MIN, Math.min(HOLD_MS_MAX, Math.round(len * HOLD_MS_PER_CHAR)));
}

export class WallBoopManager {
    constructor(game) {
        this.game = game;
        this.popups = [];
        this.cooldownUntil = 0;
        /** @type {{ text: string, gapAfterMs: number }[]} */
        this.cueBeats = [];
        this.cueBeatIndex = 0;
        this.cueGapUntil = 0;
        this.cuePendingGapMs = 0;
        this.cueWaitingForClear = false;
    }

    /** Keep a centred label fully inside the canvas. */
    safeLabelX(preferredX, unit) {
        const halfW = labelHalfWidth(unit);
        const pad = Math.max(unit * 0.35, 4);
        return Math.min(
            Math.max(preferredX, halfW + pad),
            this.game.width - halfW - pad,
        );
    }

    /** @param {number} side -1 = left wall, +1 = right wall */
    triggerBoop(ship, side) {
        if (!ship) return;

        const now = performance.now();
        // Zigzag can brush the clamp for a couple of frames; one boop is enough.
        if (now < this.cooldownUntil) return;
        this.cooldownUntil = now + 180;

        const sign = side < 0 ? -1 : 1;
        const unit = this.game.baseUnit;
        // Below the hull; preferred X hugs the wall side of the ship, then
        // clamped so the full word (not half) stays on-screen.
        const clearHull = ship.radius * 1.75;
        const preferredX = ship.x - sign * (ship.radius * 0.25);
        const x = this.safeLabelX(preferredX, unit);
        const y = ship.y + clearHull;

        this.popups.push({
            x,
            y,
            vy: 1.6, // drift slightly further down (away from the hull)
            opacity: 1,
            side: sign,
        });

        this.game.soundManager?.playBoop?.();
        hapticWallBoop();
        this.game.logbook?.onSpaceBoop?.();
        this.maybePlayFirstBoopCue();
    }

    maybePlayFirstBoopCue() {
        if (firstBoopVoicePlayed) return;
        if (!this.game.isJourney?.()) return;

        firstBoopVoicePlayed = true;
        this.game.soundManager?.playFirstBoopVoice?.();

        this.cueBeats = FIRST_BOOP_BEATS.map((b) => ({
            text: String(b.text || '').trim(),
            gapAfterMs: Number.isFinite(b.gapAfterMs) ? b.gapAfterMs : 400,
        })).filter((b) => b.text);
        this.cueBeatIndex = 0;
        this.cueGapUntil = 0;
        this.cuePendingGapMs = 0;
        this.cueWaitingForClear = false;
        this.showNextCueBeat();
    }

    showNextCueBeat() {
        if (this.cueBeatIndex >= this.cueBeats.length) {
            this.cueBeats = [];
            this.cueWaitingForClear = false;
            return;
        }
        const beat = this.cueBeats[this.cueBeatIndex];
        this.cueBeatIndex += 1;
        this.cuePendingGapMs = beat.gapAfterMs;
        this.cueWaitingForClear = true;
        this.game.milestoneManager?.showMessage?.(beat.text, {
            fadeIn: BEAT_FADE_IN,
            hold: holdForBeat(beat.text),
            fadeOut: BEAT_FADE_OUT,
        });
    }

    tickCueBeats() {
        if (!this.cueBeats.length && !this.cueWaitingForClear) return;

        const now = performance.now();
        const showing = !!this.game.milestoneManager?.currentMessage;

        if (showing) {
            this.cueWaitingForClear = true;
            return;
        }

        if (this.cueWaitingForClear) {
            this.cueWaitingForClear = false;
            if (this.cueBeatIndex >= this.cueBeats.length) {
                this.cueBeats = [];
                return;
            }
            this.cueGapUntil = now + this.cuePendingGapMs;
        }

        if (this.cueBeatIndex >= this.cueBeats.length) {
            this.cueBeats = [];
            return;
        }

        if (this.cueGapUntil > 0 && now < this.cueGapUntil) return;
        this.cueGapUntil = 0;
        this.showNextCueBeat();
    }

    update() {
        // Cue beats keep advancing while paused so the second line still lands.
        this.tickCueBeats();
        if (this.game.isGameOver || this.game.isPaused) return;
        this.tickEffects();
    }

    tickEffects() {
        const dt = this.game.dt ?? (1 / 60);
        const tickScale = dt * 60;

        // In place — no per-frame object churn (GC-hitch fuel).
        let w = 0;
        for (let i = 0; i < this.popups.length; i++) {
            const p = this.popups[i];
            p.y += p.vy * dt;
            p.opacity -= 0.028 * tickScale;
            if (p.opacity > 0) this.popups[w++] = p;
        }
        this.popups.length = w;
    }

    render(ctx) {
        const cam = this.game.camera;
        const unit = this.game.baseUnit;

        for (const p of this.popups) {
            const sy = cam.getRelativeY(p.y);
            ctx.save();
            ctx.globalAlpha *= Math.max(0, p.opacity);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const fontPx = Math.max(11, unit * 1.05);
            setLabelType(ctx, fontPx);
            // Belt-and-suspenders: re-clamp with the real measured width in case
            // the font metrics differ from the spawn-time estimate.
            const measuredHalf = ctx.measureText(LABEL).width * 0.5;
            const pad = Math.max(unit * 0.35, 4);
            const x = Math.min(
                Math.max(p.x, measuredHalf + pad),
                this.game.width - measuredHalf - pad,
            );
            ctx.fillStyle = color.ink;
            ctx.fillText(LABEL, x, sy);
            resetType(ctx);
            ctx.restore();
        }
    }
}
