// SoundManager.js
// Loads looping BGM + SFX from public/sounds/, and synthesizes short Web Audio
// cues for sparkle pickups, style-swoosh near-misses, and sidewall wall-boops.
// Changes:
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
        this.sounds = {
            bgm: new Audio(`${base}sounds/background.mp3`),
            shield: new Audio(`${base}sounds/shield.mp3`),
            explosion: new Audio(`${base}sounds/explosion.mp3`),
            powerup: new Audio(`${base}sounds/powerup.mp3`),
            move: new Audio(`${base}sounds/move.mp3`),
            turn: new Audio(`${base}sounds/turn.mp3`),
            shieldCrash: new Audio(`${base}sounds/crash_with_shield.mp3`),
            crash: new Audio(`${base}sounds/crash.mp3`)
        };

        // Set up background music
        this.sounds.bgm.loop = true;
        this.sounds.bgm.volume = 0.4;

        // Set up other sound volumes
        this.sounds.shield.volume = 0.4;
        this.sounds.explosion.volume = 0.4;
        this.sounds.powerup.volume = 0.3;
        this.sounds.move.volume = 0.15;
        this.sounds.turn.volume = 0.3;
        this.sounds.shieldCrash.volume = 0.4;
        this.sounds.crash.volume = 0.4;

        this.initialized = false;
        this.bgmPlaying = false;
        this.bgmPaused = false;
        this.audioCtx = null;
        this.muted = loadMuted();
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
            // Pre-load all sounds
            for (const sound of Object.values(this.sounds)) {
                await sound.play().catch(() => {});
                sound.pause();
                sound.currentTime = 0;
            }

            // Unlock Web Audio for synthesized SFX (collect chime).
            this.ensureAudioContext();
            
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing sounds:', error);
        }
    }

    // Muting the elements rather than zeroing their volume keeps each cue's
    // mix intact, so unmuting doesn't need to remember eight base levels.
    applyMute() {
        for (const sound of Object.values(this.sounds)) {
            sound.muted = this.muted;
        }
    }

    isMuted() {
        return this.muted;
    }

    setMuted(muted) {
        this.muted = !!muted;
        this.applyMute();
        try {
            localStorage.setItem(MUTE_STORAGE_KEY, this.muted ? '1' : '0');
        } catch {
            /* ignore quota / private mode */
        }
        return this.muted;
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
    // Low sine thump + a tiny filtered noise puff — distinct from turn / swoosh.
    playBoop() {
        if (!this.initialized || this.muted) return;

        try {
            const ctx = this.ensureAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const duration = 0.16;

            // Round low body — the "boop".
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(185, now);
            osc.frequency.exponentialRampToValueAtTime(92, now + 0.12);
            oscGain.gain.setValueAtTime(0.0001, now);
            oscGain.gain.exponentialRampToValueAtTime(0.28, now + 0.01);
            oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            // Quiet vacuum puff on top so it reads as space, not a UI click.
            const sampleCount = Math.floor(ctx.sampleRate * 0.08);
            const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < sampleCount; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(420, now);
            filter.Q.value = 0.7;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.0001, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.09, now + 0.008);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

            osc.connect(oscGain);
            oscGain.connect(ctx.destination);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
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
        if (!this.sounds.move.playing) {
            this.sounds.move.currentTime = 0;
            this.sounds.move.play().catch(() => {});
        }
    }

    playTurn() {
        if (!this.initialized) return;
        
        try {
            const turnSound = this.sounds.turn;
            turnSound.currentTime = 0;
            const playPromise = turnSound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Error playing turn sound:", error);
                });
            }
        } catch (error) {
            console.error("Error in playTurn:", error);
        }
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
