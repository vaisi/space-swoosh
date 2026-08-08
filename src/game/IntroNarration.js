// IntroNarration.js
// Chains Journey level-intro text beats (one sentence at a time) with the
// matching navigator voice clip. Keeps hudRevealPhase on 'title' until every
// beat has cleared and the voice has ended (or failed / been muted).
// Changes:
// - Beats accept `{ text, gapAfterMs }` (ElevenLabs <break> pacing) or strings.
// - Voice clips supported for levels 1–15; later levels are text-only for now.

import { DEFAULT_BEAT_GAP_MS } from '../config/JourneyNarrative.js';

const BEAT_FADE_IN = 350;
const BEAT_FADE_OUT = 350;
// ~55ms per character, clamped — short lines still get a readable beat.
const HOLD_MS_PER_CHAR = 55;
const HOLD_MS_MIN = 900;
const HOLD_MS_MAX = 2800;

function holdForBeat(text) {
    const len = String(text || '').length;
    return Math.max(HOLD_MS_MIN, Math.min(HOLD_MS_MAX, Math.round(len * HOLD_MS_PER_CHAR)));
}

/**
 * @param {string | { text?: string, gapAfterMs?: number }} beat
 * @returns {{ text: string, gapAfterMs: number } | null}
 */
function normalizeBeat(beat) {
    if (typeof beat === 'string') {
        const text = beat.trim();
        return text ? { text, gapAfterMs: DEFAULT_BEAT_GAP_MS } : null;
    }
    const text = String(beat?.text || '').trim();
    if (!text) return null;
    const gap = Number(beat.gapAfterMs);
    return {
        text,
        gapAfterMs: Number.isFinite(gap) && gap >= 0 ? gap : DEFAULT_BEAT_GAP_MS,
    };
}

export class IntroNarration {
    /**
     * @param {import('./Game.js').Game | object} game
     * @param {Array<string | { text?: string, gapAfterMs?: number }>} beats
     * @param {number | null} voiceLevel Journey level for MP3 (1–15), or null
     */
    constructor(game, beats, voiceLevel = null) {
        this.game = game;
        this.beats = (beats || []).map(normalizeBeat).filter(Boolean);
        this.voiceLevel = voiceLevel;
        this.active = this.beats.length > 0;
        this.nextIndex = 0;
        this.voiceDone = voiceLevel == null;
        this.gapUntil = 0;
        /** @type {number} gap to use after the beat that just cleared */
        this.pendingGapMs = DEFAULT_BEAT_GAP_MS;
        this.started = false;

        game.introNarration = this;
    }

    /** Kick voice + first on-screen beat. Call once when the fly-in hands off. */
    start() {
        if (!this.active || this.started) return;
        this.started = true;

        const level = this.voiceLevel;
        if (level != null) {
            this.game.soundManager?.playLevelVoice?.(level, {
                onEnded: () => {
                    this.voiceDone = true;
                },
            });
        } else {
            this.voiceDone = true;
        }

        this.showNextBeat();
    }

    showNextBeat() {
        if (this.nextIndex >= this.beats.length) return;
        const beat = this.beats[this.nextIndex];
        this.nextIndex += 1;
        this.pendingGapMs = beat.gapAfterMs;
        this.game.milestoneManager?.showMessage?.(beat.text, {
            fadeIn: BEAT_FADE_IN,
            hold: holdForBeat(beat.text),
            fadeOut: BEAT_FADE_OUT,
        });
    }

    /**
     * Drive the queue while hudRevealPhase === 'title'.
     * @returns {boolean} true when beats + voice are done (ready for chips/belt)
     */
    update() {
        if (!this.active) return true;
        if (!this.started) this.start();

        const now = performance.now();
        const showing = !!this.game.milestoneManager?.currentMessage;

        if (showing) return false;

        if (this.nextIndex < this.beats.length) {
            if (this.gapUntil === 0) {
                this.gapUntil = now + this.pendingGapMs;
                return false;
            }
            if (now < this.gapUntil) return false;
            this.gapUntil = 0;
            this.showNextBeat();
            return false;
        }

        // All beats shown — wait for the voice clip to finish so rocks don't
        // spawn under the last spoken words.
        return this.voiceDone;
    }

    dispose() {
        this.active = false;
        this.game.soundManager?.stopLevelVoice?.({ notify: false });
        if (this.game.introNarration === this) {
            this.game.introNarration = null;
        }
    }
}
