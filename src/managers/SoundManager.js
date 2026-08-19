// SoundManager.js
// Loads looping BGM + SFX from public/sounds/, and synthesizes short Web Audio
// cues for sparkle pickups, style-swoosh near-misses, sidewall wall-boops,
// wormhole portal hops, and empty-tank engine sputter.
// Changes:
// - playFuelLowVoice does not duck BGM (music stays at full volume under the
//   line). Other NAV clips still duck.
// - playFuelOut(): three descending sputters (pitch 1.0 / 0.78 / 0.61, ~0.32s
//   apart) when the tank hits 0 so the dying coast has a clear tell. Gated by
//   canPlaySfx().
// - first-boop / swoosh-voice decode at init into Web Audio buffers (same as
//   turn.mp3) so the first wall BOOP / style swoosh does not hitch or glitch
//   the synth SFX. Swoosh noise puff is reused, not allocated per hit.
// - pauseLevelVoice / resumeLevelVoice: game pause freezes the navigator clip
//   in place (does not reset); resume continues from the same spot.
// - Per-channel Options toggles: Music / Sound FX / Voice (localStorage
//   soundMusicEnabled, soundSfxEnabled, soundVoiceEnabled). Pause Sound stays
//   master mute (soundMuted). canPlayMusic/Sfx/Voice gate playback; voice-off
//   still fires onEnded so Journey captions continue.
// - playCueVoice / playFirstBoopVoice / playSwooshVoice for session cues
//   (first-boop.mp3, swoosh-voice.mp3) in Journey + Open Space; shares the
//   level-voice slot (duck, mute, replace, leave/crash stop via stopLevelVoice).
// - playLevelVoice / stopLevelVoice for Journey levels 1–42 navigator MP3s
//   plus epilogue-open / epilogue-skip cues. Missing files fail soft.
//   Open/skip decode into buffers and wait for AudioContext.resume before
//   start so the 1.6s dark hold does not lose the open line to autoplay.
//   under /sounds/voice/; ducks BGM while speaking; honors mute + voice channel.
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
const MUSIC_ENABLED_KEY = 'soundMusicEnabled';
const SFX_ENABLED_KEY = 'soundSfxEnabled';
const VOICE_ENABLED_KEY = 'soundVoiceEnabled';
const TURN_VOLUME = 0.3;
const MOVE_VOLUME = 0.15;
const BGM_VOLUME = 0.4;
const BGM_DUCK_VOLUME = 0.14;
const VOICE_VOLUME = 0.85;
const VOICE_LEVEL_MIN = 1;
const VOICE_LEVEL_MAX = 42;
const EPILOGUE_OPEN_CUE = 'epilogue-open.mp3';
const EPILOGUE_SKIP_CUE = 'epilogue-skip.mp3';

function loadMuted() {
    try {
        return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

/** Channel prefs default ON; only explicit '0' means off. */
function loadChannelEnabled(key) {
    try {
        return localStorage.getItem(key) !== '0';
    } catch {
        return true;
    }
}

function saveFlag(key, enabled) {
    try {
        localStorage.setItem(key, enabled ? '1' : '0');
    } catch {
        /* ignore quota / private mode */
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
        this.sfxBuffers = {
            turn: null,
            move: null,
            firstBoop: null,
            swooshVoice: null,
            fuelLow1: null,
            fuelLow2: null,
            fuelLow3: null,
            epilogueOpen: null,
            epilogueSkip: null,
        };
        this.lastFuelLowVoice = -1;

        this.initialized = false;
        this.bgmPlaying = false;
        this.bgmPaused = false;
        this.audioCtx = null;
        this.boopNoiseBuffer = null; // reused by playBoop (no per-hit GC)
        this.swooshNoiseBuffer = null; // reused by playSwoosh (no per-hit GC)
        this.cueVoiceSource = null;
        this.muted = loadMuted(); // master mute (pause menu)
        this.musicEnabled = loadChannelEnabled(MUSIC_ENABLED_KEY);
        this.sfxEnabled = loadChannelEnabled(SFX_ENABLED_KEY);
        this.voiceEnabled = loadChannelEnabled(VOICE_ENABLED_KEY);
        /** @type {HTMLAudioElement | null} */
        this.levelVoice = null;
        this.levelVoicePlaying = false;
        /** True when game pause froze a clip mid-play (resume continues it). */
        this.levelVoicePaused = false;
        this.bgmDucked = false;
        this.voiceDucksBgm = true;
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
        const [
            turn, move, firstBoop, swooshVoice, fuelLow1, fuelLow2, fuelLow3,
            epilogueOpen, epilogueSkip,
        ] = await Promise.all([
            this.decodeSfxBuffer('/sounds/turn.mp3'),
            this.decodeSfxBuffer('/sounds/move.mp3'),
            this.decodeSfxBuffer('/sounds/voice/first-boop.mp3'),
            this.decodeSfxBuffer('/sounds/voice/swoosh-voice.mp3'),
            this.decodeSfxBuffer('/sounds/voice/fuel-low-1.mp3'),
            this.decodeSfxBuffer('/sounds/voice/fuel-low-2.mp3'),
            this.decodeSfxBuffer('/sounds/voice/fuel-low-3.mp3'),
            this.decodeSfxBuffer('/sounds/voice/epilogue-open.mp3'),
            this.decodeSfxBuffer('/sounds/voice/epilogue-skip.mp3'),
        ]);
        this.sfxBuffers.turn = turn;
        this.sfxBuffers.move = move;
        this.sfxBuffers.firstBoop = firstBoop;
        this.sfxBuffers.swooshVoice = swooshVoice;
        this.sfxBuffers.fuelLow1 = fuelLow1;
        this.sfxBuffers.fuelLow2 = fuelLow2;
        this.sfxBuffers.fuelLow3 = fuelLow3;
        this.sfxBuffers.epilogueOpen = epilogueOpen;
        this.sfxBuffers.epilogueSkip = epilogueSkip;
    }

    /** Fire-and-forget buffer source — no seek, safe to retrigger every tap. */
    playBuffer(buffer, volume) {
        if (!this.initialized || !this.canPlaySfx() || !buffer) return;

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

    canPlayMusic() {
        return !this.muted && this.musicEnabled;
    }

    canPlaySfx() {
        return !this.muted && this.sfxEnabled;
    }

    canPlayVoice() {
        return !this.muted && this.voiceEnabled;
    }

    // Per-channel .muted on HTMLAudio keeps base volumes intact.
    applyMute() {
        const silenceMusic = !this.canPlayMusic();
        const silenceSfx = !this.canPlaySfx();
        const silenceVoice = !this.canPlayVoice();

        for (const [key, sound] of Object.entries(this.sounds)) {
            sound.muted = key === 'bgm' ? silenceMusic : silenceSfx;
        }
        if (this.levelVoice) this.levelVoice.muted = silenceVoice;
    }

    isMuted() {
        return this.muted;
    }

    isMasterMuted() {
        return this.muted;
    }

    isMusicEnabled() {
        return this.musicEnabled;
    }

    isSfxEnabled() {
        return this.sfxEnabled;
    }

    isVoiceEnabled() {
        return this.voiceEnabled;
    }

    setMuted(muted) {
        this.muted = !!muted;
        this.applyMute();
        if (this.muted) this.stopLevelVoice({ notify: true });
        // Legacy key: '1' = muted, '0' = unmuted.
        try {
            localStorage.setItem(MUTE_STORAGE_KEY, this.muted ? '1' : '0');
        } catch {
            /* ignore quota / private mode */
        }
        return this.muted;
    }

    setMusicEnabled(enabled) {
        this.musicEnabled = !!enabled;
        this.applyMute();
        saveFlag(MUSIC_ENABLED_KEY, this.musicEnabled);
        return this.musicEnabled;
    }

    setSfxEnabled(enabled) {
        this.sfxEnabled = !!enabled;
        this.applyMute();
        saveFlag(SFX_ENABLED_KEY, this.sfxEnabled);
        return this.sfxEnabled;
    }

    setVoiceEnabled(enabled) {
        this.voiceEnabled = !!enabled;
        this.applyMute();
        if (!this.voiceEnabled) this.stopLevelVoice({ notify: true });
        saveFlag(VOICE_ENABLED_KEY, this.voiceEnabled);
        return this.voiceEnabled;
    }

    toggleMusicEnabled() {
        return this.setMusicEnabled(!this.musicEnabled);
    }

    toggleSfxEnabled() {
        return this.setSfxEnabled(!this.sfxEnabled);
    }

    toggleVoiceEnabled() {
        return this.setVoiceEnabled(!this.voiceEnabled);
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
     * Play a navigator MP3 under /sounds/voice/. Replaces any current clip
     * without firing its onEnded. Ducks BGM unless opts.duckBgm is false.
     * @param {string} fileName e.g. 'level-1.mp3' or 'first-boop.mp3'
     * @param {{ onEnded?: () => void, duckBgm?: boolean }} [opts]
     */
    playCueVoice(fileName, opts = {}) {
        const name = String(fileName || '').replace(/^\/+/, '');
        this.playVoiceUrl(`/sounds/voice/${name}`, opts, name);
    }

    playFirstBoopVoice(opts = {}) {
        this.playCueVoice('first-boop.mp3', opts);
    }

    playSwooshVoice(opts = {}) {
        this.playCueVoice('swoosh-voice.mp3', opts);
    }

    /** Random low-fuel NAV line. No-op if Voice is off / muted / missing clips. */
    playFuelLowVoice(opts = {}) {
        const clips = [
            { name: 'fuel-low-1.mp3', buffer: this.sfxBuffers.fuelLow1 },
            { name: 'fuel-low-2.mp3', buffer: this.sfxBuffers.fuelLow2 },
            { name: 'fuel-low-3.mp3', buffer: this.sfxBuffers.fuelLow3 },
        ];
        const available = clips
            .map((c, i) => ({ ...c, i }))
            .filter((c) => c.buffer);
        if (available.length === 0) {
            this.playCueVoice('fuel-low-1.mp3', { ...opts, duckBgm: false });
            return;
        }
        let pick = available[Math.floor(Math.random() * available.length)];
        if (available.length > 1 && pick.i === this.lastFuelLowVoice) {
            const rest = available.filter((c) => c.i !== this.lastFuelLowVoice);
            pick = rest[Math.floor(Math.random() * rest.length)] ?? pick;
        }
        this.lastFuelLowVoice = pick.i;
        this.playCueVoice(pick.name, { ...opts, duckBgm: false });
    }

    /**
     * Play navigator line for Journey levels 1–42. No-op outside that range,
     * when muted, or when the clip fails to load.
     * @param {number} level
     * @param {{ onEnded?: () => void }} [opts]
     */
    playLevelVoice(level, opts = {}) {
        const n = Math.floor(Number(level) || 0);
        if (n < VOICE_LEVEL_MIN || n > VOICE_LEVEL_MAX) {
            this.stopLevelVoice({ notify: false });
            this.onLevelVoiceEnded = typeof opts.onEnded === 'function' ? opts.onEnded : null;
            this.notifyLevelVoiceEnded();
            return;
        }
        this.playCueVoice(`level-${n}.mp3`, opts);
    }

    playEpilogueOpenVoice(opts = {}) {
        this.playCueVoice(EPILOGUE_OPEN_CUE, opts);
    }

    playEpilogueSkipVoice(opts = {}) {
        this.playCueVoice(EPILOGUE_SKIP_CUE, opts);
    }

    /**
     * @param {string} url
     * @param {{ onEnded?: () => void, duckBgm?: boolean }} [opts]
     * @param {string} [label] for warn logs
     */
    playVoiceUrl(url, opts = {}, label = 'voice') {
        // Replace without firing the previous clip's onEnded.
        this.stopLevelVoice({ notify: false });
        this.onLevelVoiceEnded = typeof opts.onEnded === 'function' ? opts.onEnded : null;
        const duckBgm = opts.duckBgm !== false;

        // Master mute, voice channel off, or not ready — still notify so
        // IntroNarration / captions can advance without audio.
        if (!this.initialized || !this.canPlayVoice()) {
            this.notifyLevelVoiceEnded();
            return;
        }

        try {
            const ctx = this.ensureAudioContext();
            void ctx?.resume?.();
            const buffer = this.cueVoiceBuffer(label);
            if (buffer) {
                this.playDecodedCue(buffer, duckBgm);
                return;
            }

            const voice = new Audio(url);
            voice.volume = VOICE_VOLUME;
            voice.muted = !this.canPlayVoice();
            this.levelVoice = voice;
            this.levelVoicePlaying = true;
            this.voiceDucksBgm = duckBgm;
            if (duckBgm) this.duckBgmForVoice();

            const finish = () => {
                if (this.levelVoice !== voice) return;
                this.levelVoicePlaying = false;
                this.restoreBgmAfterVoice();
                this.levelVoice = null;
                this.notifyLevelVoiceEnded();
            };

            voice.addEventListener('ended', finish);
            voice.addEventListener('error', () => {
                console.warn(`Voice missing or failed: ${label}`);
                finish();
            });

            const playPromise = voice.play();
            if (playPromise !== undefined) {
                playPromise.catch((error) => {
                    console.error('Error playing voice:', error);
                    finish();
                });
            }
        } catch (error) {
            console.error('Error in playVoiceUrl:', error);
            this.levelVoicePlaying = false;
            this.restoreBgmAfterVoice();
            this.notifyLevelVoiceEnded();
        }
    }

    cueVoiceBuffer(label) {
        if (label === 'first-boop.mp3') return this.sfxBuffers.firstBoop;
        if (label === 'swoosh-voice.mp3') return this.sfxBuffers.swooshVoice;
        if (label === 'fuel-low-1.mp3') return this.sfxBuffers.fuelLow1;
        if (label === 'fuel-low-2.mp3') return this.sfxBuffers.fuelLow2;
        if (label === 'fuel-low-3.mp3') return this.sfxBuffers.fuelLow3;
        if (label === 'epilogue-open.mp3') return this.sfxBuffers.epilogueOpen;
        if (label === 'epilogue-skip.mp3') return this.sfxBuffers.epilogueSkip;
        return null;
    }

    /** Keep looping music under the L42 written ending (HTMLAudio, not Web Audio). */
    keepEpilogueMusic() {
        void this.ensureAudioContext()?.resume?.();
        if (!this.canPlayMusic()) return;
        if (this.bgmPlaying) return;
        if (this.bgmPaused) this.resumeBGM();
        else this.playBGM();
    }

    /** Pre-decoded first-boop / swoosh-voice — same Web Audio path as turn SFX. */
    playDecodedCue(buffer, duckBgm = true) {
        const ctx = this.ensureAudioContext();
        if (!ctx || !buffer) {
            this.notifyLevelVoiceEnded();
            return;
        }

        const start = () => this.startDecodedCue(ctx, buffer, duckBgm);
        if (ctx.state === 'running') {
            start();
            return;
        }
        const resumed = ctx.resume?.();
        if (resumed && typeof resumed.then === 'function') {
            resumed
                .then(() => {
                    if (ctx.state === 'running') start();
                    else this.notifyLevelVoiceEnded();
                })
                .catch(() => this.notifyLevelVoiceEnded());
            return;
        }
        start();
    }

    startDecodedCue(ctx, buffer, duckBgm = true) {
        if (!ctx || !buffer) {
            this.notifyLevelVoiceEnded();
            return;
        }
        this.stopCueSource();
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = buffer;
        gain.gain.value = VOICE_VOLUME;
        src.connect(gain);
        gain.connect(ctx.destination);

        this.cueVoiceSource = src;
        this.levelVoicePlaying = true;
        this.voiceDucksBgm = duckBgm;
        if (duckBgm) this.duckBgmForVoice();

        const finish = () => {
            if (this.cueVoiceSource !== src) return;
            this.cueVoiceSource = null;
            this.levelVoicePlaying = false;
            this.restoreBgmAfterVoice();
            this.notifyLevelVoiceEnded();
        };

        src.onended = finish;
        try {
            src.start(0);
        } catch (error) {
            console.error('Error playing decoded cue:', error);
            finish();
        }
    }

    stopCueSource() {
        const src = this.cueVoiceSource;
        this.cueVoiceSource = null;
        if (!src) return;
        try {
            src.onended = null;
            src.stop();
        } catch {
            /* already stopped */
        }
    }

    /** Alias — cue clips share the level-voice slot. */
    stopCueVoice(opts = {}) {
        this.stopLevelVoice(opts);
    }

    /**
     * @param {{ notify?: boolean }} [opts] notify=true fires onEnded (mute /
     * mid-run stop so the intro title phase can finish).
     */
    stopLevelVoice(opts = {}) {
        const notify = !!opts.notify;
        const voice = this.levelVoice;
        const wasPlaying = this.levelVoicePlaying || this.levelVoicePaused;
        const cb = this.onLevelVoiceEnded;
        this.levelVoice = null;
        this.levelVoicePlaying = false;
        this.levelVoicePaused = false;
        this.onLevelVoiceEnded = null;
        this.restoreBgmAfterVoice();
        this.stopCueSource();
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

    /** Freeze navigator / cue voice for game pause (keeps seek position). */
    pauseLevelVoice() {
        if (this.cueVoiceSource) {
            this.stopCueSource();
            this.levelVoicePlaying = false;
            this.restoreBgmAfterVoice();
            return;
        }
        const voice = this.levelVoice;
        if (!voice || this.levelVoicePaused) return;
        if (!this.levelVoicePlaying && voice.paused) return;
        try {
            voice.pause();
            this.levelVoicePaused = true;
            this.levelVoicePlaying = false;
        } catch (error) {
            console.error('Error pausing level voice:', error);
        }
    }

    /** Continue a voice clip frozen by pauseLevelVoice. */
    resumeLevelVoice() {
        const voice = this.levelVoice;
        if (!voice || !this.levelVoicePaused) return;
        this.levelVoicePaused = false;
        if (!this.canPlayVoice()) {
            this.stopLevelVoice({ notify: true });
            return;
        }
        try {
            voice.muted = !this.canPlayVoice();
            this.levelVoicePlaying = true;
            if (this.voiceDucksBgm) this.duckBgmForVoice();
            const playPromise = voice.play();
            if (playPromise !== undefined) {
                playPromise.catch((error) => {
                    console.error('Error resuming level voice:', error);
                    this.levelVoicePlaying = false;
                    this.restoreBgmAfterVoice();
                    this.notifyLevelVoiceEnded();
                });
            }
        } catch (error) {
            console.error('Error in resumeLevelVoice:', error);
            this.levelVoicePlaying = false;
            this.restoreBgmAfterVoice();
            this.notifyLevelVoiceEnded();
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
        if (this.audioCtx && !this.swooshNoiseBuffer) {
            const sampleCount = Math.floor(this.audioCtx.sampleRate * 0.22);
            const buffer = this.audioCtx.createBuffer(1, sampleCount, this.audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < sampleCount; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
            }
            this.swooshNoiseBuffer = buffer;
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
        if (!this.initialized || !this.canPlaySfx()) return;
        
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
        if (!this.canPlaySfx()) return;
        this.sounds.explosion.currentTime = 0;
        this.sounds.explosion.play().catch(() => {});
    }

    playPowerup() {
        if (!this.canPlaySfx()) return;
        this.sounds.powerup.currentTime = 0;
        this.sounds.powerup.play().catch(() => {});
    }

    // Short ascending sparkle chime for diamond / collectible pickups.
    playCollect() {
        if (!this.initialized || !this.canPlaySfx()) return;

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
        if (!this.initialized || !this.canPlaySfx()) return;

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
        if (!this.initialized || !this.canPlaySfx()) return;

        try {
            const ctx = this.ensureAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const duration = 0.22;

            // Band-passed noise burst — reads as air rushing past.
            const src = ctx.createBufferSource();
            src.buffer = this.swooshNoiseBuffer;

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

            if (this.swooshNoiseBuffer) {
                src.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                src.start(now);
                src.stop(now + duration);
            }
            osc.connect(oscGain);
            oscGain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.15);
        } catch (error) {
            console.error('Error in playSwoosh:', error);
        }
    }

    // Three descending engine sputters when the tank hits 0 (dying-coast tell).
    // Same body/cough/noise recipe, pitched and a little quieter each time.
    playFuelOut() {
        if (!this.initialized || !this.canPlaySfx()) return;

        try {
            const ctx = this.ensureAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const repeats = [
                { delay: 0, pitch: 1, amp: 1 },
                { delay: 0.32, pitch: 0.78, amp: 0.88 },
                { delay: 0.64, pitch: 0.61, amp: 0.76 },
            ];
            for (const r of repeats) {
                this.scheduleFuelSputter(ctx, now + r.delay, r.pitch, r.amp);
            }
        } catch (error) {
            console.error('Error in playFuelOut:', error);
        }
    }

    scheduleFuelSputter(ctx, tStart, pitch, amp) {
        const duration = 0.45;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220 * pitch, tStart);
        osc.frequency.exponentialRampToValueAtTime(70 * pitch, tStart + 0.38);
        oscGain.gain.setValueAtTime(0.0001, tStart);
        oscGain.gain.exponentialRampToValueAtTime(0.26 * amp, tStart + 0.012);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, tStart + 0.42);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(tStart);
        osc.stop(tStart + duration);

        const ticks = [
            { t0: 0.05, freq: 380, peak: 0.10, dur: 0.045 },
            { t0: 0.16, freq: 290, peak: 0.08, dur: 0.055 },
            { t0: 0.30, freq: 210, peak: 0.06, dur: 0.06 },
        ];
        for (const tick of ticks) {
            const tOsc = ctx.createOscillator();
            const tGain = ctx.createGain();
            const t0 = tStart + tick.t0;
            tOsc.type = 'sine';
            tOsc.frequency.setValueAtTime(tick.freq * pitch, t0);
            tGain.gain.setValueAtTime(0.0001, t0);
            tGain.gain.exponentialRampToValueAtTime(tick.peak * amp, t0 + 0.008);
            tGain.gain.exponentialRampToValueAtTime(0.0001, t0 + tick.dur);
            tOsc.connect(tGain);
            tGain.connect(ctx.destination);
            tOsc.start(t0);
            tOsc.stop(t0 + tick.dur + 0.01);
        }

        if (!this.boopNoiseBuffer) return;

        const noise = ctx.createBufferSource();
        noise.buffer = this.boopNoiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(480 * pitch, tStart);
        filter.Q.value = 0.7;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.0001, tStart);
        noiseGain.gain.exponentialRampToValueAtTime(0.09 * amp, tStart + 0.01);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, tStart + 0.14);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(tStart);
        noise.stop(tStart + 0.14);
    }

    playMove() {
        this.playBuffer(this.sfxBuffers.move, this.moveVolume);
    }

    playTurn() {
        this.playBuffer(this.sfxBuffers.turn, this.turnVolume);
    }

    playShieldCrash() {
        if (!this.initialized || !this.canPlaySfx()) return;
        
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
        if (!this.initialized || !this.canPlaySfx()) return;
        
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
        if (!this.initialized || !this.canPlaySfx()) return;

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
        if (!this.initialized || !this.canPlaySfx()) return;

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
