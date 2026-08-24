// JourneyEpilogueSequence.js
// Written ending after L42: fade stays black, NAV speaks two open beats, the
// player writes (or skips) a reply, words become a light, other lights bloom,
// then the ordinal card and Follow @spacewoosh. First ending: Arc unlock card,
// then Controls with Arc on. Later endings return to title. No NAV after
// the prompt. Offline still plays the lights with a local card.
// Changes:
// - After the dark hold: L42 arrival voice + captions, 3s black gap, then open.
// - Prompt: “Write it here.” placeholder, larger type, bottom-docked tall buttons.
// - Reply text fades fully to 0 (ease-in); a bright your-star crossfades in
//   with a birth sparkle. Sky lights are Signal-Blue cores + tight halos + spikes
//   (smaller than the first HD pass, especially the player’s star).
// - Keep BGM through the hold; skip captions are two beats (one per phrase).
// - First-time Arc unlock card after Follow @spacewoosh.
// - One reply per device: replay skips the prompt and does not submit again.

import {
    ENDING_EPILOGUE,
    EPILOGUE_INSTAGRAM_URL,
    DEFAULT_BEAT_GAP_MS,
    LEVEL_INTRO_BEATS,
} from '../config/JourneyNarrative.js';
import { TOTAL_LEVELS } from '../config/JourneyConfig.js';
import { FLIGHT_STYLE } from '../config/flightStyle.js';
import { hasSeenArcUnlock, markArcUnlockSeen, hasEpilogueReply, markEpilogueReply } from '../services/JourneyProgress.js';
import {
    REPLY_MAX_LEN,
    formatOrdinal,
    validateReply,
} from '../services/ReplyFilter.js';
import { ReplyService, ReplyRejectedError } from '../services/ReplyService.js';
import {
    setDisplayType,
    setLabelType,
    setMonoType,
    resetType,
    drawSparkle,
} from '../utils/BrandDraw.js';
import { color } from '../brand/tokens.js';

const BEAT_FADE_IN = 350;
const BEAT_FADE_OUT = 350;
const HOLD_MS_PER_CHAR = 55;
const HOLD_MS_MIN = 900;
const HOLD_MS_MAX = 2800;
const CARD_HOLD_MS = 2800;
const FOOTER_HOLD_MS = 3600;
const LIGHTS_MS = 4200;
const MAX_LIGHTS = 72;
const DRIFT_MS = 1600;
const YOUR_STAR_FADE_MS = 700;
const SPARKLE_MS = 500;
const DARK_HOLD_MS = 1600;
const ARRIVAL_GAP_MS = 3000;
const INPUT_FONT_PX = 22;

function holdForBeat(text) {
    const len = String(text || '').length;
    return Math.max(HOLD_MS_MIN, Math.min(HOLD_MS_MAX, Math.round(len * HOLD_MS_PER_CHAR)));
}

function counterText(ordinal) {
    if (!(ordinal > 0)) return ENDING_EPILOGUE.offlineCounterCard;
    return ENDING_EPILOGUE.counterCard.replace('{N}', formatOrdinal(ordinal));
}

function mapBeats(raw) {
    return (raw || []).map((beat) => ({
        text: String(beat.text || beat || '').trim(),
        gapAfterMs: beat.gapAfterMs ?? DEFAULT_BEAT_GAP_MS,
    })).filter((b) => b.text);
}

function easeInQuad(t) {
    return t * t;
}

export class JourneyEpilogueSequence {
    /**
     * @param {import('./Game.js').Game} game
     */
    constructor(game) {
        this.game = game;
        this.active = true;
        this.phase = 'hold';
        this.phaseStart = performance.now();
        this.arrivalBeats = mapBeats(LEVEL_INTRO_BEATS[TOTAL_LEVELS]);
        this.openBeats = mapBeats(ENDING_EPILOGUE.open);
        this.beats = this.arrivalBeats;
        this.beatIndex = 0;
        this.caption = '';
        this.captionAlpha = 0;
        this.captionMode = 'done';
        this.captionHoldUntil = 0;
        this.captionGapUntil = 0;
        this.voiceDone = false;
        this.skipped = false;
        this.replyText = '';
        this.ordinal = null;
        this.error = '';
        this.busy = false;
        this.lights = [];
        this.buttons = { submit: null, skip: null, follow: null, takeControls: null };
        this.input = null;
        this.driftY = 0;
        this.driftAlpha = 1;

        game.gameOverAlpha = 1;
        game.levelOutcomeButtons = null;
        game.soundManager?.keepEpilogueMusic?.();
    }

    startOpenVoice() {
        this.game.soundManager?.keepEpilogueMusic?.();
        this.game.soundManager?.playEpilogueOpenVoice?.({
            onEnded: () => {
                this.voiceDone = true;
            },
        });
    }

    showBeat(index) {
        const beat = this.beats[index];
        if (!beat) {
            this.beatIndex = Math.max(index, this.beats.length);
            this.caption = '';
            this.captionAlpha = 0;
            this.captionMode = 'done';
            return;
        }
        this.beatIndex = index;
        this.caption = beat.text;
        this.captionAlpha = 0;
        this.captionMode = 'in';
        this.captionHoldUntil = 0;
        this.captionGapUntil = 0;
    }

    /** @param {number} deltaTime */
    update(deltaTime = 1 / 60) {
        if (!this.active) return;
        const now = performance.now();
        const dt = Math.max(0, Math.min(deltaTime, 0.1));

        if (this.phase === 'hold') this.updateHold(now);
        else if (this.phase === 'arrival') this.updateArrival(now);
        else if (this.phase === 'arrivalHold') this.updateArrivalHold(now);
        else if (this.phase === 'open') this.updateOpen(now);
        else if (this.phase === 'prompt') this.layoutInput();
        else if (this.phase === 'skipHold') this.updateSkipHold(now);
        else if (this.phase === 'skipVoice') this.updateSkipVoice(now);
        else if (this.phase === 'lights') this.updateLights(now, dt);
        else if (this.phase === 'counter') this.updateCard(now, CARD_HOLD_MS, 'footer');
        else if (this.phase === 'footer') {
            this.updateCard(now, FOOTER_HOLD_MS, this.shouldShowArcUnlock() ? 'arcUnlock' : 'done');
        }
        else if (this.phase === 'done') this.finish();
    }

    updateHold(now) {
        if (now - this.phaseStart >= DARK_HOLD_MS) this.enterArrival();
    }

    enterArrival() {
        this.phase = 'arrival';
        this.phaseStart = performance.now();
        this.beats = this.arrivalBeats;
        this.beatIndex = 0;
        this.voiceDone = false;
        this.caption = '';
        this.captionAlpha = 0;
        this.captionMode = 'done';
        this.game.soundManager?.keepEpilogueMusic?.();
        this.game.soundManager?.playLevelVoice?.(TOTAL_LEVELS, {
            onEnded: () => {
                this.voiceDone = true;
            },
        });
        this.showBeat(0);
    }

    updateArrival(now) {
        if (this.captionMode !== 'done') this.tickCaption(now);
        if (this.captionMode === 'done' && this.voiceDone) this.enterArrivalHold();
    }

    enterArrivalHold() {
        this.phase = 'arrivalHold';
        this.phaseStart = performance.now();
        this.caption = '';
        this.captionAlpha = 0;
        this.captionMode = 'done';
        this.game.soundManager?.stopLevelVoice?.({ notify: false });
        this.game.soundManager?.keepEpilogueMusic?.();
    }

    updateArrivalHold(now) {
        if (now - this.phaseStart >= ARRIVAL_GAP_MS) this.enterOpen();
    }

    enterOpen() {
        this.phase = 'open';
        this.phaseStart = performance.now();
        this.beats = this.openBeats;
        this.beatIndex = 0;
        this.voiceDone = false;
        this.caption = '';
        this.captionAlpha = 0;
        this.captionMode = 'done';
        this.startOpenVoice();
        this.showBeat(0);
    }

    updateOpen(now) {
        if (this.captionMode !== 'done') this.tickCaption(now);
        const beatsDone = this.captionMode === 'done';
        if (beatsDone && this.voiceDone) this.enterPrompt();
    }

    updateSkipVoice(now) {
        if (this.captionMode !== 'done') this.tickCaption(now);
        if (this.captionMode === 'done' && this.voiceDone) this.enterLights();
    }

    tickCaption(now) {
        if (this.captionMode === 'done') return;
        if (this.captionMode === 'gap') {
            if (now >= this.captionGapUntil) {
                this.showBeat(this.beatIndex + 1);
            }
            return;
        }
        if (this.captionMode === 'in') {
            this.captionAlpha = Math.min(1, this.captionAlpha + 16 / BEAT_FADE_IN);
            if (this.captionAlpha >= 1) {
                this.captionMode = 'hold';
                this.captionHoldUntil = now + holdForBeat(this.caption);
            }
            return;
        }
        if (this.captionMode === 'hold') {
            if (now >= this.captionHoldUntil) this.captionMode = 'out';
            return;
        }
        if (this.captionMode === 'out') {
            this.captionAlpha = Math.max(0, this.captionAlpha - 16 / BEAT_FADE_OUT);
            if (this.captionAlpha <= 0) {
                const beat = this.beats[this.beatIndex];
                this.caption = '';
                this.captionMode = 'gap';
                this.captionGapUntil = now + (beat?.gapAfterMs ?? DEFAULT_BEAT_GAP_MS);
            }
        }
    }

    enterPrompt() {
        this.phase = 'prompt';
        this.phaseStart = performance.now();
        this.game.soundManager?.stopLevelVoice?.({ notify: false });
        if (hasEpilogueReply(this.game.journeyProgress)) {
            this.ordinal = this.game.journeyProgress.epilogueOrdinal ?? null;
            this.replyText = '';
            this.skipped = true;
            this.enterLights();
            return;
        }
        this.mountInput();
    }

    async submit(skipped) {
        if (this.busy || this.phase !== 'prompt') return;
        const raw = skipped ? '' : (this.input?.value || '');
        if (!skipped) {
            const check = validateReply(raw);
            if (!check.ok) {
                this.error = check.message;
                return;
            }
            this.replyText = check.text;
        } else {
            this.replyText = '';
        }
        this.skipped = skipped;
        this.error = '';
        this.busy = true;
        this.removeInput();
        try {
            this.ordinal = await ReplyService.submitJourneyReply({
                text: this.replyText,
                skipped,
            });
        } catch (err) {
            if (err instanceof ReplyRejectedError) {
                this.error = err.message;
                this.busy = false;
                this.mountInput();
                this.phase = 'prompt';
                return;
            }
            this.ordinal = null;
        }
        this.game.journeyProgress = markEpilogueReply(this.game.journeyProgress, {
            ordinal: this.ordinal,
        });
        this.busy = false;
        if (skipped) this.enterSkipHold();
        else this.enterLights();
    }

    enterSkipHold() {
        this.phase = 'skipHold';
        this.phaseStart = performance.now();
        this.caption = '';
        this.captionAlpha = 0;
        this.captionMode = 'done';
    }

    updateSkipHold(now) {
        if (now - this.phaseStart >= DARK_HOLD_MS) this.enterSkipVoice();
    }

    enterSkipVoice() {
        this.phase = 'skipVoice';
        this.phaseStart = performance.now();
        this.beats = (ENDING_EPILOGUE.skip?.length
            ? ENDING_EPILOGUE.skip
            : [{ text: ENDING_EPILOGUE.skipLine, gapAfterMs: 700 }]
        ).map((beat) => ({
            text: String(beat.text || beat).trim(),
            gapAfterMs: beat.gapAfterMs ?? DEFAULT_BEAT_GAP_MS,
        })).filter((b) => b.text);
        this.voiceDone = false;
        this.showBeat(0);
        this.game.soundManager?.playEpilogueSkipVoice?.({
            onEnded: () => {
                this.voiceDone = true;
            },
        });
    }

    enterLights() {
        this.phase = 'lights';
        this.phaseStart = performance.now();
        this.caption = '';
        this.driftY = 0;
        this.driftAlpha = 1;
        const extra = Math.min(
            MAX_LIGHTS,
            12 + Math.min(MAX_LIGHTS - 12, (this.ordinal || 24) % MAX_LIGHTS)
        );
        const w = this.game.width;
        const h = this.game.height;
        this.lights = [];
        for (let i = 0; i < extra; i++) {
            this.lights.push({
                x: w * (0.12 + Math.random() * 0.76),
                y: h * (0.12 + Math.random() * 0.7),
                r: 0.75 + Math.random() * 1.05,
                delay: 400 + Math.random() * 2200,
                born: 0,
            });
        }
    }

    updateLights(now, dt) {
        const elapsed = now - this.phaseStart;
        if (this.replyText) {
            const t = Math.min(1, elapsed / DRIFT_MS);
            const ease = easeInQuad(t);
            this.driftY = ease * this.game.height * 0.42;
            this.driftAlpha = 1 - ease;
        }
        for (const light of this.lights) {
            if (!light.born && elapsed >= light.delay) light.born = now;
        }
        if (elapsed >= LIGHTS_MS) {
            this.phase = 'counter';
            this.phaseStart = now;
        }
    }

    updateCard(now, holdMs, next) {
        if (now - this.phaseStart >= holdMs) {
            this.phase = next;
            this.phaseStart = now;
            if (next === 'done') this.finish();
        }
    }

    shouldShowArcUnlock() {
        return !hasSeenArcUnlock(this.game.journeyProgress);
    }

    leaveFooter() {
        if (this.shouldShowArcUnlock()) this.enterArcUnlock();
        else this.finish();
    }

    enterArcUnlock() {
        this.phase = 'arcUnlock';
        this.phaseStart = performance.now();
        this.caption = '';
        this.buttons.follow = null;
        this.buttons.takeControls = null;
    }

    takeArcControls() {
        if (!this.active) return;
        this.active = false;
        this.removeInput();
        this.game.soundManager?.stopLevelVoice?.({ notify: false });
        this.game.journeyEpilogue = null;
        this.game.journeyProgress = markArcUnlockSeen(this.game.journeyProgress);
        this.game.setFlightStyle(FLIGHT_STYLE.arc);
        this.game.leaveRun('optionsControls');
    }

    finish() {
        if (!this.active) return;
        this.active = false;
        this.removeInput();
        this.game.soundManager?.stopLevelVoice?.({ notify: false });
        this.game.journeyEpilogue = null;
        this.game.goToMenu();
    }

    handleBack() {
        if (!this.active) return true;
        if (this.phase === 'prompt') {
            void this.submit(true);
            return true;
        }
        if (this.phase === 'counter' || this.phase === 'footer') {
            this.leaveFooter();
            return true;
        }
        if (this.phase === 'arcUnlock') {
            this.takeArcControls();
            return true;
        }
        return true;
    }

    handleClick(x, y) {
        if (!this.active) return false;
        if (this.phase === 'hold' || this.phase === 'arrival' || this.phase === 'arrivalHold' || this.phase === 'open') {
            this.game.soundManager?.keepEpilogueMusic?.();
            if (this.phase === 'open' && !this.game.soundManager?.isLevelVoicePlaying?.()) {
                this.startOpenVoice();
            }
            return true;
        }
        if (this.phase === 'prompt') {
            if (this.hit(x, y, this.buttons.submit) && !this.busy) {
                void this.submit(false);
                return true;
            }
            if (this.hit(x, y, this.buttons.skip) && !this.busy) {
                void this.submit(true);
                return true;
            }
            return true;
        }
        if (this.phase === 'footer') {
            if (this.hit(x, y, this.buttons.follow)) {
                this.openFollow();
                return true;
            }
            this.leaveFooter();
            return true;
        }
        if (this.phase === 'arcUnlock') {
            this.takeArcControls();
            return true;
        }
        if (this.phase === 'counter') {
            this.phase = 'footer';
            this.phaseStart = performance.now();
            return true;
        }
        return true;
    }

    hit(x, y, button) {
        if (!button) return false;
        return x >= button.x && x <= button.x + button.w
            && y >= button.y && y <= button.y + button.h;
    }

    openFollow() {
        const url = EPILOGUE_INSTAGRAM_URL;
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch {
            location.assign(url);
        }
    }

    mountInput() {
        if (this.input) return;
        const input = document.createElement('textarea');
        input.className = 'ss-epilogue-input';
        input.maxLength = REPLY_MAX_LEN;
        input.rows = 3;
        input.placeholder = ENDING_EPILOGUE.promptPlaceholder || 'Write it here.';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.enterKeyHint = 'send';
        input.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: 0;
            height: 0;
            box-sizing: border-box;
            font-size: ${INPUT_FONT_PX}px;
            line-height: 1.35;
            border: none;
            border-bottom: 2px solid #E1D9C1;
            border-radius: 0;
            outline: none;
            padding: 8px 4px;
            background: transparent;
            color: #E1D9C1;
            caret-color: #E1D9C1;
            color-scheme: dark;
            font-family: var(--ss-font-ui, 'Space Grotesk', 'Segoe UI', system-ui, sans-serif);
            font-weight: 500;
            letter-spacing: 0.02em;
            text-align: center;
            resize: none;
            z-index: 6;
        `;
        if (!document.getElementById('ss-epilogue-input-style')) {
            const style = document.createElement('style');
            style.id = 'ss-epilogue-input-style';
            style.textContent = '.ss-epilogue-input::placeholder{color:rgba(225,217,193,0.38)}';
            document.head.appendChild(style);
        }
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void this.submit(false);
            }
        });
        const container = this.game.canvas?.parentElement || document.body;
        container.appendChild(input);
        this.input = input;
        this.layoutInput();
    }

    layoutInput() {
        const input = this.input;
        if (!input) return;
        const unit = this.game.baseUnit || 10;
        const w = this.game.width;
        const h = this.game.height;
        const width = Math.min(w * 0.82, unit * 42);
        const height = Math.max(88, unit * 8.4);
        const x = (w - width) / 2;
        const btnH = Math.max(56, unit * 5.6);
        const gap = unit * 1.2;
        const bottom = Math.max(unit * 2.8, h * 0.055);
        const buttonsBlock = btnH * 2 + gap;
        const y = Math.min(h * 0.40, h - bottom - buttonsBlock - height - unit * 2.4);
        input.style.left = `${x}px`;
        input.style.top = `${y}px`;
        input.style.width = `${width}px`;
        input.style.height = `${height}px`;
        input.style.fontSize = `${Math.max(18, Math.min(INPUT_FONT_PX, unit * 2.2))}px`;
        this.inputRect = { x, y, w: width, h: height };
    }

    removeInput() {
        if (!this.input) return;
        this.input.remove();
        this.input = null;
        this.inputRect = null;
    }

    render(ctx) {
        const w = this.game.width;
        const h = this.game.height;
        const unit = this.game.baseUnit || 10;

        ctx.save();
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, w, h);

        if (this.caption && this.captionAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.captionAlpha;
            setDisplayType(ctx, Math.min(unit * 2.1, 26));
            ctx.fillStyle = 'rgba(225, 217, 193, 0.92)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            this.wrapCenter(ctx, this.caption, w / 2, h * 0.42, w * 0.78, Math.min(unit * 2.6, 32));
            resetType(ctx);
            ctx.restore();
        }

        if (this.phase === 'prompt') this.renderPrompt(ctx, unit, w, h);
        if (this.phase === 'lights') this.renderLights(ctx, unit, w, h);
        if (this.phase === 'counter') this.renderCard(ctx, unit, w, h, counterText(this.ordinal));
        if (this.phase === 'footer') this.renderFooter(ctx, unit, w, h);
        if (this.phase === 'arcUnlock') this.renderArcUnlock(ctx, unit, w, h);

        ctx.restore();
    }

    renderPrompt(ctx, unit, w, h) {
        setLabelType(ctx, Math.min(unit * 1.25, 14));
        ctx.fillStyle = 'rgba(225, 217, 193, 0.62)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.wrapCenter(
            ctx,
            ENDING_EPILOGUE.prompt.toUpperCase(),
            w / 2,
            h * 0.22,
            w * 0.78,
            Math.min(unit * 2.0, 22)
        );
        resetType(ctx);

        if (this.error) {
            setMonoType(ctx, 12);
            ctx.fillStyle = 'rgba(225, 120, 120, 0.9)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(this.error, w / 2, (this.inputRect?.y || h * 0.40) - unit * 0.8);
            resetType(ctx);
        }

        const btnW = Math.min(w * 0.82, unit * 42);
        const btnH = Math.max(56, unit * 5.6);
        const gap = unit * 1.2;
        const bottom = Math.max(unit * 2.8, h * 0.055);
        const x = (w - btnW) / 2;
        this.buttons.skip = this.drawButton(
            ctx, x, h - bottom - btnH, btnW, btnH, ENDING_EPILOGUE.skipLabel, false
        );
        this.buttons.submit = this.drawButton(
            ctx, x, h - bottom - btnH * 2 - gap, btnW, btnH, ENDING_EPILOGUE.submitLabel, true
        );
        this.buttons.follow = null;
    }

    strokeSpikes(ctx, x, y, arm, width, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = `rgba(${color.signalRgb}, 1)`;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - arm, y);
        ctx.lineTo(x + arm, y);
        ctx.moveTo(x, y - arm);
        ctx.lineTo(x, y + arm);
        ctx.stroke();
        ctx.restore();
    }

    drawLight(ctx, x, y, r, alpha) {
        const s = r * 1.12;
        const haloR = s * 2.05;
        const glowR = Math.max(0.55, s * 0.48);
        const coreR = Math.max(0.35, s * 0.26);

        ctx.save();
        const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
        halo.addColorStop(0, `rgba(${color.signalRgb}, ${0.42 * alpha})`);
        halo.addColorStop(0.42, `rgba(${color.signalRgb}, ${0.12 * alpha})`);
        halo.addColorStop(1, `rgba(${color.signalRgb}, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, haloR, 0, Math.PI * 2);
        ctx.fill();

        if (s >= 1.15) {
            this.strokeSpikes(ctx, x, y, s * 3.05, Math.max(0.45, s * 0.24), alpha * 0.7);
        }

        ctx.globalAlpha = alpha * 0.92;
        ctx.fillStyle = `rgba(${color.signalRgb}, 1)`;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, coreR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawYourStar(ctx, x, y, alpha, ageMs, unit) {
        const sparkleT = Math.max(0, Math.min(1, ageMs / SPARKLE_MS));
        const burst = 1 - sparkleT;
        const r = Math.max(2.4, unit * 0.28);

        ctx.save();
        const haloR = r * 4.4 + burst * r * 2.4;
        const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
        halo.addColorStop(0, `rgba(${color.signalRgb}, ${0.55 * alpha})`);
        halo.addColorStop(0.28, `rgba(${color.signalRgb}, ${0.22 * alpha})`);
        halo.addColorStop(0.62, `rgba(${color.signalRgb}, ${0.07 * alpha})`);
        halo.addColorStop(1, `rgba(${color.signalRgb}, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, haloR, 0, Math.PI * 2);
        ctx.fill();

        const arm = r * 4.2 + burst * r * 3.2;
        this.strokeSpikes(ctx, x, y, arm, 0.9 + burst * 0.7, alpha * (0.82 + burst * 0.12));
        if (burst > 0.02) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.PI / 4);
            this.strokeSpikes(ctx, 0, 0, arm * 0.62, 0.55 + burst * 0.4, alpha * burst * 0.75);
            ctx.restore();
            drawSparkle(ctx, x, y, r * 2.2 + burst * r * 2.8, {
                fill: `rgba(${color.signalRgb}, ${alpha * burst * 0.9})`,
                innerRatio: 0.32,
            });
        }

        ctx.globalAlpha = alpha;
        drawSparkle(ctx, x, y, r * 1.55, { fill: color.signal, innerRatio: 0.4 });
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    renderLights(ctx, unit, w, h) {
        if (this.replyText && this.driftAlpha > 0.02) {
            ctx.save();
            ctx.globalAlpha = this.driftAlpha;
            setDisplayType(ctx, Math.min(unit * 1.8, 22));
            ctx.fillStyle = 'rgba(225, 217, 193, 0.9)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            this.wrapCenter(ctx, this.replyText, w / 2, h * 0.62 - this.driftY, w * 0.74, Math.min(unit * 2.2, 26));
            resetType(ctx);
            ctx.restore();
        }

        const now = performance.now();
        for (const light of this.lights) {
            if (!light.born) continue;
            const age = (now - light.born) / 900;
            const alpha = Math.min(1, age);
            this.drawLight(ctx, light.x, light.y, light.r, alpha);
        }

        const elapsed = now - this.phaseStart;
        const yourStart = this.replyText ? DRIFT_MS - YOUR_STAR_FADE_MS : 0;
        const yourAge = elapsed - yourStart;
        const yourAlpha = Math.max(0, Math.min(1, yourAge / YOUR_STAR_FADE_MS));
        if (yourAlpha > 0.01) {
            this.drawYourStar(ctx, w / 2, h * 0.2, yourAlpha, yourAge, unit);
        }
    }

    renderCard(ctx, unit, w, h, text) {
        setDisplayType(ctx, Math.min(unit * 2.2, 28));
        ctx.fillStyle = 'rgba(225, 217, 193, 0.95)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.wrapCenter(ctx, text, w / 2, h * 0.48, w * 0.8, Math.min(unit * 2.8, 34));
        resetType(ctx);
    }

    renderFooter(ctx, unit, w, h) {
        this.renderCard(ctx, unit, w, h, ENDING_EPILOGUE.footerCard);
        const btnW = Math.min(w * 0.82, unit * 42);
        const btnH = Math.max(56, unit * 5.6);
        const x = (w - btnW) / 2;
        const y = h - Math.max(unit * 2.8, h * 0.055) - btnH;
        this.buttons.follow = this.drawButton(ctx, x, y, btnW, btnH, 'Open Instagram', true);
        this.buttons.submit = null;
        this.buttons.skip = null;
    }

    renderArcUnlock(ctx, unit, w, h) {
        const lines = ENDING_EPILOGUE.arcUnlockLines || [];
        const lineH = Math.min(unit * 2.8, 34);
        const blockH = lines.length * lineH;
        let y = h * 0.42 - blockH / 2;
        setDisplayType(ctx, Math.min(unit * 2.2, 28));
        ctx.fillStyle = 'rgba(225, 217, 193, 0.95)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const line of lines) {
            this.wrapCenter(ctx, line, w / 2, y, w * 0.8, lineH);
            y += lineH;
        }
        resetType(ctx);

        const btnW = Math.min(w * 0.82, unit * 42);
        const btnH = Math.max(56, unit * 5.6);
        const x = (w - btnW) / 2;
        const by = h - Math.max(unit * 2.8, h * 0.055) - btnH;
        this.buttons.takeControls = this.drawButton(
            ctx, x, by, btnW, btnH, ENDING_EPILOGUE.arcUnlockLabel, true
        );
        this.buttons.follow = null;
        this.buttons.submit = null;
        this.buttons.skip = null;
    }

    drawButton(ctx, x, y, w, h, label, primary) {
        ctx.save();
        ctx.strokeStyle = primary ? 'rgba(225, 217, 193, 0.9)' : 'rgba(225, 217, 193, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        setLabelType(ctx, Math.min(14, h * 0.32));
        ctx.fillStyle = 'rgba(225, 217, 193, 0.92)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(label || '').toUpperCase(), x + w / 2, y + h / 2);
        resetType(ctx);
        ctx.restore();
        return { x, y, w, h };
    }

    wrapCenter(ctx, text, cx, cy, maxWidth, lineHeight) {
        const words = String(text || '').split(/\s+/).filter(Boolean);
        const lines = [];
        let line = '';
        for (const word of words) {
            const next = line ? `${line} ${word}` : word;
            if (ctx.measureText(next).width > maxWidth && line) {
                lines.push(line);
                line = word;
            } else {
                line = next;
            }
        }
        if (line) lines.push(line);
        const top = cy - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((row, i) => ctx.fillText(row, cx, top + i * lineHeight));
    }

    dispose() {
        this.active = false;
        this.removeInput();
        this.game.soundManager?.stopLevelVoice?.({ notify: false });
    }
}
