// SoundManager.js
// Loads looping BGM + SFX from public/sounds/, and synthesizes short Web Audio
// cues for sparkle pickups, style-swoosh near-misses, sidewall wall-boops,
// and wormhole portal hops.
// Changes:
// - playLevelVoice / stopLevelVoice for Journey levels 1–5 navigator MP3s
//   under /sounds/voice/; ducks BGM while speaking; honors mute.
// - playTurn / playMove use pre-decoded Web Audio buffer sources (no HTMLAudio
//   seek on tap). Removes direction-change micro-freeze; move.mp3 optional.
// - Portal SFX split into playPortalEntry / playPortalExit: deeper space warp
//   with delay-feedback echo (suck-in vs emerge). playPortal() aliases entry.
// - playBoop: phone-audible body (320→180 Hz) + short mid tick (~520 Hz);
//   reused noise buffer (no per-hit alloc). Old 185→92 Hz was inaudible on
//   iPhone speakers under BGM even though the BOOP popup fired.
// - Softened playLogbook() into a gentle Enterprise-style bridge chirp
//   (two quiet sine tones) instead of a sharp triangle stylus tick.
// - Added playBoop(): a soft low "space rubber" blip for screen-edge wall hits.
// - Added a persisted mute switch (setMuted / toggleMuted / isMuted) driving both
//   the <audio> elements and the synthesized cues, so the pause menu's Sound
//   control is a real toggle rather than a stub.
// - Added playSwoosh(): a brief airy whoosh for narrow twin-obstacle near-misses.
// - Added playCollect(): a light two-tone ascending chime for sparkle pickups
//   (powerup.mp3 was referenced but missing, so diamond collects were silent).

const MUTE_STORAGE_KEY = 'soundMuted';
const TURN_VOLUME = 0.3;
const MOVE_VOLUME = 0.15;
const BGM_VOLUME = 0.4;
const BGM_DUCK_VOLUME = 0.14;
const VOICE_VOLUME = 0.85;
const VOICE_LEVEL_MIN = 1;
const VOICE_LEVEL_MAX = 5;

function loadMuted() {
    try {
        return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

export class SoundManager {
    constructor() {
        const base = '/';
        // Rare / looping cues stay on <audio>. Rapid-retrigger turn/move use
        // decoded AudioBuffers (sfxBuffers) so taps never seek a media element.
        this.sounds = {
            bgm: new Audio(`${base}sounds/background.mp3`),
            shield: new Audio(`${base}sounds/shield.mp3`),
            explosion: new Audio(`${base}sounds/explosion.mp3`),
            powerup: new Audio(`${base}sounds/powerup.mp3`),
            shieldCrash: new Audio(`${base}sounds/crash_with_shield.mp3`),
            crash: new Audio(`${base}sounds/crash.mp3`)
        };

        // Set up background music
        this.sounds.bgm.loop = true;
        this.sounds.bgm.volume = BGM_VOLUME;

        // Set up other sound volumes
        this.sounds.shield.volume = 0.4;
        this.sounds.explosion.volume = 0.4;
        this.sounds.powerup.volume = 0.3;
        this.sounds.shieldCrash.volume = 0.4;
        this.sounds.crash.volume = 0.4;

        this.turnVolume = TURN_VOLUME;
        this.moveVolume = MOVE_VOLUME;
        this.sfxBuffers = { turn: null, move: null };

        this.initialized = false;
        this.bgmPlaying = false;
        this.bgmPaused = false;
        this.audioCtx = null;
        this.boopNoiseBuffer = null; // reused by playBoop (no per-hit GC)
        this.muted = loadMuted();
        /** @type {HTMLAudioElement | null} */
        this.levelVoice = null;
        this.levelVoicePlaying = false;
        this.bgmDucked = false;
        this.onLevelVoiceEnded = null;
        this.applyMute();

        // Add error handling for sound loading
        Object.values(this.sounds).forEach(sound => {
            sound.addEventListener('error', (e) => {
                console.error('Error loading sound:', e);
            });
        });
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            // Pre-load all HTMLAudio cues (unlock + buffer in media pipeline).
            for (const sound of Object.values(this.sounds)) {
                await sound.play().catch(() => {});
                sound.pause();
                sound.currentTime = 0;
            }

            // Unlock Web Audio for synthesized + decoded one-shot SFX.
            this.ensureAudioContext();
            await this.loadSfxBuffers();
            
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing sounds:', error);
        }
    }

    /** Fetch + decode a one-shot SFX; returns null on 404 / decode failure. */
    async decodeSfxBuffer(url) {
        const ctx = this.audioCtx;
        if (!ctx) return null;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                console.warn(`SFX missing or unreachable: ${url} (${res.status})`);
                return null;
            }
            const raw = await res.arrayBuffer();
            // Copy so decodeAudioData can detach without racing the response body.
            return await ctx.decodeAudioData(raw.slice(0));
        } catch (error) {
            console.warn(`Failed to decode SFX ${url}:`, error);
            return null;
        }
    }

    async loadSfxBuffers() {
        const [turn, move] = await Promise.all([
            this.decodeSfxBuffer('/sounds/turn.mp3'),
            this.decodeSfxBuffer('/sounds/move.mp3'),
        ]);
        this.sfxBuffers.turn = turn;
        this.sfxBuffers.move = move;
    }

    /** Fire-and-forget buffer source — no seek, safe to retrigger every tap. */
    playBuffer(buffer, volume) {
        if (!this.initialized || this.muted || !buffer) return;

        try {
            const ctx = this.ensureAudioContext();
            if (!ctx) return;

            const src = ctx.createBufferSource();
            const gain = ctx.createGain();
            src.buffer = buffer;
            gain.gain.value = volume;
            src.connect(gain);
            gain.connect(ctx.destination);
            src.start(0);
        } catch (error) {
            console.error('Error in playBuffer:', error);
        }
    }

    // Muting the elements rather than zeroing their volume keeps each cue's
    // mix intact, so unmuting doesn't need to remember base levels.
    applyMute() {
        for (const sound of Object.values(this.sounds)) {
            sound.muted = this.muted;
        }
        if (this.levelVoice) this.levelVoice.muted = this.muted;
    }

    isMuted() {
        return this.muted;
    }

    setMuted(muted) {
        this.muted = !!muted;
        this.applyMute();
        if (this.muted) this.stopLevelVoice({ notify: true });
        try {
            localStorage.setItem(MUTE_STORAGE_KEY, this.muted ? '1' : '0');
        } catch {
            /* ignore quota / private mode */
        }
        return this.muted;
    }

    duckBgmForVoice() {
        if (this.bgmDucked) return;
        this.sounds.bgm.volume = BGM_DUCK_VOLUME;
        this.bgmDucked = true;
    }

    restoreBgmAfterVoice() {
        if (!this.bgmDucked) return;
        this.sounds.bgm.volume = BGM_VOLUME;
        this.bgmDucked = false;
    }

    isLevelVoicePlaying() {
        return !!this.levelVoicePlaying;
    }

    /**
     * Play navigator line for Journey levels 1–5. No-op outside that range,
     * when muted, or when the clip fails to load.
     * @param {number} level
     * @param {{ onEnded?: () => void }} [opts]
     */
    playLevelVoice(level, opts = {}) {
        const n = Math.floor(Number(level) || 0);
        // Replace without firing the previous clip's onEnded.
        this.stopLevelVoice({ notify: false });
        this.onLevelVoiceEnded = typeof opts.onEnded === 'function' ? opts.onEnded : null;

        if (!this.initialized || this.muted) {
            this.notifyLevelVoiceEnded();
            return;
        }
        if (n < VOICE_LEVEL_MIN || n > VOICE_LEVEL_MAX) {
            this.notifyLevelVoiceEnded();
            return;
        }

        try {
            const voice = new Audio(`/sounds/voice/level-${n}.mp3`);
            voice.volume = VOICE_VOLUME;
            voice.muted = this.muted;
            this.levelVoice = voice;
            this.levelVoicePlaying = true;
            this.duckBgmForVoice();

            const finish = () => {
                if (this.levelVoice !== voice) return;
                this.levelVoicePlaying = false;
                this.restoreBgmAfterVoice();
                this.levelVoice = null;
                this.notifyLevelVoiceEnded();
            };

            voice.addEventListener('ended', finish);
            voice.addEventListener('error', () => {
                console.warn(`Level voice missing or failed: level-${n}.mp3`);
                finish();
            });

            const playPromise = voice.play();
            if (playPromise !== undefined) {
                playPromise.catch((error) => {
                    console.error('Error playing level voice:', error);
                    finish();
                });
            }
        } catch (error) {
            console.error('Error in playLevelVoice:', error);
            this.levelVoicePlaying = false;
            this.restoreBgmAfterVoice();
            this.notifyLevelVoiceEnded();
        }
    }

    /**
     * @param {{ notify?: boolean }} [opts] notify=true fires onEnded (mute /
     * mid-run stop so the intro title phase can finish).
     */
    stopLevelVoice(opts = {}) {
        const notify = !!opts.notify;
        const voice = this.levelVoice;
        const wasPlaying = this.levelVoicePlaying;
        const cb = this.onLevelVoiceEnded;
        this.levelVoice = null;
        this.levelVoicePlaying = false;
        this.onLevelVoiceEnded = null;
        this.restoreBgmAfterVoice();
        if (voice) {
            try {
                voice.pause();
                voice.currentTime = 0;
            } catch {
                /* ignore */
            }
        }
        if (notify && wasPlaying && cb) {
            try {
                cb();
            } catch (error) {
                console.error('Error in level voice onEnded:', error);
            }
        }
    }

    notifyLevelVoiceEnded() {
        const cb = this.onLevelVoiceEnded;
        this.onLevelVoiceEnded = null;
        if (cb) {
            try {
                cb();
            } catch (error) {
                console.error('Error in level voice onEnded:', error);
            }
        }
    }

    toggleMuted() {
        return this.setMuted(!this.muted);
    }

    ensureAudioContext() {
        if (!this.audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            this.audioCtx = new Ctx();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
        }
        if (this.audioCtx && !this.boopNoiseBuffer) {
            // ~80 ms decaying noise, shared by every wall boop.
            const sampleCount = Math.floor(this.audioCtx.sampleRate * 0.08);
            const buffer = this.audioCtx.createBuffer(1, sampleCount, this.audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < sampleCount; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
            }
            this.boopNoiseBuffer = buffer;
        }
        return this.audioCtx;
    }

    playBGM() {
        if (!this.initialized) return;
        if (this.bgmPlaying) return;
        
        try {
            const playPromise = this.sounds.bgm.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        this.bgmPlaying = true;
                    })
                    .catch(error => {
                        console.error("Error playing background music:", error);
                        this.bgmPlaying = false;
                    });
            }
        } catch (error) {
            console.error("Error in playBGM:", error);
            this.bgmPlaying = false;
        }
    }

    pauseBGM() {
        if (!this.initialized || !this.bgmPlaying) return;
        
        try {
            this.sounds.bgm.pause();
            this.bgmPlaying = false;
            this.bgmPaused = true;
        } catch (error) {
            console.error("Error pausing background music:", error);
        }
    }

    resumeBGM() {
        if (!this.initialized || !this.bgmPaused) return;
        
        try {
            const playPromise = this.sounds.bgm.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        this.bgmPlaying = true;
                        this.bgmPaused = false;
                    })
                    .catch(error => {
                        console.error("Error resuming background music:", error);
                        this.bgmPlaying = false;
                        this.bgmPaused = false;
                    });
            }
        } catch (error) {
            console.error("Error in resumeBGM:", error);
            this.bgmPlaying = false;
            this.bgmPaused = false;
        }
    }

    stopBGM() {
        if (!this.initialized) return;
        
        try {
            this.sounds.bgm.pause();
            this.sounds.bgm.currentTime = 0;
            this.bgmPlaying = false;
            this.bgmPaused = false;
        } catch (error) {
            console.error("Error in stopBGM:", error);
        }
    }

    playShield() {
        if (!this.initialized) return;
        
        try {
            const shieldSound = this.sounds.shield;
            shieldSound.currentTime = 0;
            const playPromise = shieldSound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Error playing shield sound:", error);
                });
            }
        } catch (error) {
            console.error("Error in playShield:", error);
        }
    }

    playExplosion() {
        this.sounds.explosion.currentTime = 0;
        this.sounds.explosion.play().catch(() => {});
    }

    playPowerup() {
        this.sounds.powerup.currentTime = 0;
        this.sounds.powerup.play().catch(() => {});
    }

    // Short ascending sparkle chime for diamond / collectible pickups.
    playCollect() {
        if (!this.initialized || this.muted) return;

        try {
            const ctx = this.ensureAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const notes = [988, 1480]; // B5 → F#6 — bright, quick "ping"

            notes.forEach((freq, i) => {
                const t0 = now + i * 0.055;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t0);
                gain.gain.setValueAtTime(0.0001, t0);
                gain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.012);
                gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t0);
                osc.stop(t0 + 0.16);
            });
        } catch (error) {
            console.error('Error in playCollect:', error);
        }
    }

    // Soft "space rubber" blip when the ship kisses a screen sidewall.
    // Phone-audible body + mid tick (old ~185→92 Hz vanished under BGM on
    // iPhone speakers) + tiny filtered noise puff — distinct from turn / swoosh.
    playBoop() {
        if (!this.initialized || this.muted) return;

        try {
            const ctx = this.ensureAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const duration = 0.15;

            // Round body — still thumpy, but above phone-speaker roll-off.
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.11);
            oscGain.gain.setValueAtTime(0.0001, now);
            oscGain.gain.exponentialRampToValueAtTime(0.34, now + 0.01);
            oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            // Short mid tick so the cue cuts through BGM on tiny speakers.
            const tick = ctx.createOscillator();
            const tickGain = ctx.createGain();
            tick.type = 'sine';
            tick.frequency.setValueAtTime(520, now);
            tickGain.gain.setValueAtTime(0.0001, now);
            tickGain.gain.exponentialRampToValueAtTime(0.11, now + 0.008);
            tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

            // Quiet vacuum puff (shared buffer — no per-hit alloc).
            const noise = ctx.createBufferSource();
            noise.buffer = this.boopNoiseBuffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(520, now);
            filter.Q.value = 0.7;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.0001, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.1, now + 0.008);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

            osc.connect(oscGain);
            oscGain.connect(ctx.destination);
            tick.connect(tickGain);
            tickGain.connect(ctx.destination);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
            tick.start(now);
            tick.stop(now + 0.045);
            noise.start(now);
            noise.stop(now + 0.08);
        } catch (error) {
            console.error('Error in playBoop:', error);
        }
    }

    // Brief airy whoosh for style-swoosh near-misses (threading two obstacles).
    playSwoosh() {
        if (!this.initialized || this.muted) return;

        try {
            const ctx = this.ensureAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const duration = 0.22;

            // Band-passed noise burst — reads as air rushing past.
            const sampleCount = Math.floor(ctx.sampleRate * duration);
            const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < sampleCount; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
            }

            const src = ctx.createBufferSource();
            src.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(900, now);
            filter.frequency.exponentialRampToValueAtTime(1800, now + duration);
            filter.Q.value = 0.9;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            // Soft high sine tick layered on top for a "style" accent.
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, now);
            osc.frequency.exponentialRampToValueAtTime(990, now + 0.12);
            oscGain.gain.setValueAtTime(0.0001, now);
            oscGain.gain.exponentialRampToValueAtTime(0.07, now + 0.015);
            oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

            src.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.connect(oscGain);
            oscGain.connect(ctx.destination);

            src.start(now);
            src.stop(now + duration);
            osc.start(now);
            osc.stop(now + 0.15);
        } catch (error) {
            console.error('Error in playSwoosh:', error);
        }
    }

    playMove() {
        this.playBuffer(this.sfxBuffers.move, this.moveVolume);
    }

    playTurn() {
        this.playBuffer(this.sfxBuffers.turn, this.turnVolume);
    }

    playShieldCrash() {
        if (!this.initialized) return;
        
        try {
            const crashSound = this.sounds.shieldCrash;
            crashSound.currentTime = 0;
            const playPromise = crashSound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Error playing shield crash sound:", error);
                });
            }
        } catch (error) {
            console.error("Error in playShieldCrash:", error);
        }
    }

    playCrash() {
        if (!this.initialized) return;
        
        try {
            const crashSound = this.sounds.crash;
            crashSound.currentTime = 0;
            const playPromise = crashSound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Error playing crash sound:", error);
                });
            }
        } catch (error) {
            console.error("Error in playCrash:", error);
        }
    }

    // Deep space warp with delay-feedback echo. direction 'in' = suck into the
    // gate; 'out' = emerge at the exit. Distinct from playSwoosh / playShield.
    playPortalWarp(direction = 'in') {
        if (!this.initialized || this.muted) return;

        try {
            const ctx = this.ensureAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const entering = direction !== 'out';
            const duration = entering ? 0.42 : 0.38;
            const tail = 0.55; // let echoes ring in the void

            // Dry + wet bus. Wet path = delay with feedback for space echo.
            const master = ctx.createGain();
            master.gain.value = 1;
            master.connect(ctx.destination);

            const dry = ctx.createGain();
            dry.gain.value = 0.7;
            dry.connect(master);

            const delay = ctx.createDelay(1.0);
            delay.delayTime.value = entering ? 0.14 : 0.11;
            const feedback = ctx.createGain();
            feedback.gain.value = entering ? 0.42 : 0.34;
            const wetFilter = ctx.createBiquadFilter();
            wetFilter.type = 'lowpass';
            wetFilter.frequency.value = entering ? 900 : 1200;
            wetFilter.Q.value = 0.6;
            const wet = ctx.createGain();
            wet.gain.value = entering ? 0.55 : 0.45;

            delay.connect(feedback);
            feedback.connect(delay);
            delay.connect(wetFilter);
            wetFilter.connect(wet);
            wet.connect(master);

            const route = (node) => {
                node.connect(dry);
                node.connect(delay);
            };

            // Deep body tone — low enough to feel like vacuum, still phone-audible.
            const body = ctx.createOscillator();
            const bodyGain = ctx.createGain();
            body.type = 'sine';
            if (entering) {
                body.frequency.setValueAtTime(420, now);
                body.frequency.exponentialRampToValueAtTime(55, now + duration);
            } else {
                body.frequency.setValueAtTime(70, now);
                body.frequency.exponentialRampToValueAtTime(360, now + duration);
            }
            bodyGain.gain.setValueAtTime(0.0001, now);
            bodyGain.gain.exponentialRampToValueAtTime(entering ? 0.22 : 0.18, now + 0.03);
            bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            body.connect(bodyGain);
            route(bodyGain);

            // Soft sub thump for "space depth" (phone speakers still hear the body).
            const sub = ctx.createOscillator();
            const subGain = ctx.createGain();
            sub.type = 'sine';
            if (entering) {
                sub.frequency.setValueAtTime(180, now);
                sub.frequency.exponentialRampToValueAtTime(48, now + duration * 0.9);
            } else {
                sub.frequency.setValueAtTime(55, now);
                sub.frequency.exponentialRampToValueAtTime(160, now + duration * 0.85);
            }
            subGain.gain.setValueAtTime(0.0001, now);
            subGain.gain.exponentialRampToValueAtTime(entering ? 0.14 : 0.1, now + 0.04);
            subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            sub.connect(subGain);
            route(subGain);

            // Quiet detuned fold layer.
            const fold = ctx.createOscillator();
            const foldGain = ctx.createGain();
            fold.type = 'triangle';
            if (entering) {
                fold.frequency.setValueAtTime(310, now);
                fold.frequency.exponentialRampToValueAtTime(70, now + duration);
            } else {
                fold.frequency.setValueAtTime(90, now);
                fold.frequency.exponentialRampToValueAtTime(280, now + duration);
            }
            foldGain.gain.setValueAtTime(0.0001, now);
            foldGain.gain.exponentialRampToValueAtTime(0.06, now + 0.04);
            foldGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            fold.connect(foldGain);
            route(foldGain);

            // Swirling noise bed — filter travels with the warp direction.
            const sampleCount = Math.floor(ctx.sampleRate * duration);
            const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < sampleCount; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            if (entering) {
                noiseFilter.frequency.setValueAtTime(900, now);
                noiseFilter.frequency.exponentialRampToValueAtTime(180, now + duration);
            } else {
                noiseFilter.frequency.setValueAtTime(220, now);
                noiseFilter.frequency.exponentialRampToValueAtTime(1100, now + duration);
            }
            noiseFilter.Q.value = 1.2;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.0001, now);
            noiseGain.gain.exponentialRampToValueAtTime(entering ? 0.12 : 0.1, now + 0.04);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            route(noiseGain);

            // Kill the feedback loop after the echo tail so nodes can GC.
            feedback.gain.setValueAtTime(feedback.gain.value, now + duration + 0.15);
            feedback.gain.exponentialRampToValueAtTime(0.0001, now + duration + tail);

            body.start(now);
            body.stop(now + duration + 0.02);
            sub.start(now);
            sub.stop(now + duration + 0.02);
            fold.start(now);
            fold.stop(now + duration + 0.02);
            noise.start(now);
            noise.stop(now + duration);
        } catch (error) {
            console.error('Error in playPortalWarp:', error);
        }
    }

    playPortalEntry() {
        this.playPortalWarp('in');
    }

    playPortalExit() {
        this.playPortalWarp('out');
    }

    // Alias — older call sites / habits.
    playPortal() {
        this.playPortalEntry();
    }

    // Soft bridge chirp when the Journey logbook gains an entry —
    // quiet sine pair, like a starship console receiving a new message.
    playLogbook() {
        if (!this.initialized || this.muted) return;

        try {
            const ctx = this.ensureAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            // Gentle ascending pair (E5 → B5), rounded and low in the mix.
            const tones = [
                { freq: 659, start: 0, peak: 0.045, length: 0.22 },
                { freq: 988, start: 0.12, peak: 0.038, length: 0.28 },
            ];

            tones.forEach(({ freq, start, peak, length }) => {
                const t0 = now + start;
                const osc = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t0);

                // Soft low-pass keeps the cue warm, not piercing.
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1800, t0);
                filter.Q.value = 0.5;

                gain.gain.setValueAtTime(0.0001, t0);
                gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t0);
                osc.stop(t0 + length + 0.02);
            });
        } catch (error) {
            console.error('Error in playLogbook:', error);
        }
    }
}
