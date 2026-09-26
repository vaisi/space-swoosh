// Capture-only tooling is loaded behind ?capture=1. Normal players never
// create a MediaRecorder, capture canvas, or recording audio graph.

const CAPTURE_WIDTH = 720;
const CAPTURE_HEIGHT = 1280;
const GAME_HEIGHT = 1080;
const GAME_TOP = CAPTURE_HEIGHT - GAME_HEIGHT;
const DEFAULT_FPS = 30;
const DEFAULT_VIDEO_BITS_PER_SECOND = 4_000_000;
const DEFAULT_AUDIO_BITS_PER_SECOND = 128_000;
const END_HOLD_MS = 2400;

function captureOptions() {
    const params = new URLSearchParams(window.location.search);
    return {
        enabled: params.get('capture') === '1',
        auto: params.get('captureAuto') === '1',
    };
}

function preferredMimeType() {
    const candidates = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm',
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function timestampSlug(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, '-');
}

function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export class CaptureManager {
    constructor(game) {
        this.game = game;
        this.options = captureOptions();
        this.active = false;
        this.stopping = false;
        this.chunks = [];
        this.startedAt = 0;
        this.renderFrame = null;
        this.monitorTimer = null;
        this.endTimer = null;
        this.lastScreen = game.appScreen;
        this.lastResult = null;

        if (!this.options.enabled) return;
        this.game.captureMode = true;
        this.installOperatorApi();
        this.installKeyboardControls();
        if (this.options.auto) this.startStateMonitor();
        console.info('[capture] Ready. F8 starts; F9 stops and downloads.');
    }

    supported() {
        return typeof MediaRecorder !== 'undefined'
            && typeof this.game.canvas?.captureStream === 'function';
    }

    status() {
        return {
            enabled: this.options.enabled,
            supported: this.supported(),
            active: this.active,
            stopping: this.stopping,
            auto: this.options.auto,
            startedAt: this.startedAt || null,
            elapsedMs: this.startedAt ? Math.round(performance.now() - this.startedAt) : 0,
            appScreen: this.game.appScreen,
            hasLastResult: !!this.lastResult,
        };
    }

    installOperatorApi() {
        const manager = this;
        window.SpaceSwooshCapture = Object.freeze({
            start: (opts) => manager.start(opts),
            stop: (opts) => manager.stop(opts),
            status: () => manager.status(),
            lastResult: () => manager.lastResult,
        });
    }

    installKeyboardControls() {
        window.addEventListener('keydown', (event) => {
            if (event.code === 'F8') {
                event.preventDefault();
                void this.start();
            } else if (event.code === 'F9') {
                event.preventDefault();
                void this.stop();
            }
        });
    }

    startStateMonitor() {
        this.monitorTimer = window.setInterval(() => {
            const screen = this.game.appScreen;
            const enteredRun = screen === 'playing' && this.lastScreen !== 'playing';
            const endedRun = screen === 'gameover' && this.lastScreen === 'playing';
            this.lastScreen = screen;

            if (enteredRun && !this.active) void this.start();
            if (endedRun && this.active && !this.endTimer) {
                this.endTimer = window.setTimeout(() => {
                    this.endTimer = null;
                    void this.stop();
                }, END_HOLD_MS);
            }
        }, 100);
    }

    createCompositor(fps) {
        const canvas = document.createElement('canvas');
        canvas.width = CAPTURE_WIDTH;
        canvas.height = CAPTURE_HEIGHT;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Unable to create capture canvas');

        const frameInterval = 1000 / fps;
        let lastPaintAt = -frameInterval;
        const paint = (now = performance.now()) => {
            if (now - lastPaintAt >= frameInterval) {
                const dark = document.documentElement.dataset.theme !== 'light';
                ctx.fillStyle = dark ? '#12100E' : '#EAE4D2';
                ctx.fillRect(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(
                    this.game.canvas,
                    0,
                    0,
                    this.game.canvas.width,
                    this.game.canvas.height,
                    0,
                    GAME_TOP,
                    CAPTURE_WIDTH,
                    GAME_HEIGHT,
                );
                lastPaintAt = now;
            }
            this.renderFrame = requestAnimationFrame(paint);
        };
        paint();
        return canvas;
    }

    async start(opts = {}) {
        if (!this.options.enabled) throw new Error('Capture mode requires ?capture=1');
        if (!this.supported()) throw new Error('This browser does not support native capture');
        if (this.active || this.stopping) return this.status();

        if (this.endTimer) {
            clearTimeout(this.endTimer);
            this.endTimer = null;
        }

        // Capture mode uses its own operator profile. A stale mute preference
        // must not silently produce an unusable social clip.
        this.game.soundManager.setMuted(false);
        this.game.soundManager.setMusicEnabled(true);
        this.game.soundManager.setSfxEnabled(true);
        this.game.soundManager.setVoiceEnabled(true);
        await this.game.soundManager.initialize();
        this.game.soundInitialized = true;
        const audioStream = await this.game.soundManager.beginCaptureMix();
        const fps = Number.isFinite(opts.fps) ? opts.fps : DEFAULT_FPS;
        const compositor = this.createCompositor(fps);
        const videoStream = compositor.captureStream(fps);
        const stream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
        ]);
        const mimeType = preferredMimeType();
        const recorderOptions = {
            videoBitsPerSecond: DEFAULT_VIDEO_BITS_PER_SECOND,
            audioBitsPerSecond: DEFAULT_AUDIO_BITS_PER_SECOND,
        };
        if (mimeType) recorderOptions.mimeType = mimeType;

        this.compositor = compositor;
        this.videoStream = videoStream;
        this.stream = stream;
        this.chunks = [];
        this.recorder = new MediaRecorder(stream, recorderOptions);
        this.recorder.addEventListener('dataavailable', (event) => {
            if (event.data?.size) this.chunks.push(event.data);
        });
        this.recorder.start(1000);
        this.active = true;
        this.startedAt = performance.now();
        document.documentElement.dataset.capturing = 'true';
        console.info('[capture] Recording started', this.status());
        return this.status();
    }

    async stop(opts = {}) {
        if (!this.active || !this.recorder || this.stopping) return this.lastResult;
        this.stopping = true;
        const shouldDownload = opts.download !== false;
        const recorder = this.recorder;

        const stopped = new Promise((resolve) => {
            recorder.addEventListener('stop', resolve, { once: true });
        });
        recorder.stop();
        await stopped;

        cancelAnimationFrame(this.renderFrame);
        this.renderFrame = null;
        this.videoStream?.getTracks().forEach((track) => track.stop());
        this.stream?.getTracks().forEach((track) => track.stop());
        this.game.soundManager.endCaptureMix();

        const mimeType = recorder.mimeType || 'video/webm';
        const blob = new Blob(this.chunks, { type: mimeType });
        const fileName = `space-swoosh-native-${timestampSlug()}.webm`;
        const durationMs = Math.round(performance.now() - this.startedAt);
        this.lastResult = { blob, fileName, durationMs, size: blob.size, mimeType };
        if (shouldDownload) triggerDownload(blob, fileName);

        this.active = false;
        this.stopping = false;
        this.startedAt = 0;
        this.chunks = [];
        this.recorder = null;
        this.compositor = null;
        this.videoStream = null;
        this.stream = null;
        delete document.documentElement.dataset.capturing;
        console.info('[capture] Recording ready', this.lastResult);
        window.dispatchEvent(new CustomEvent('spaceswoosh:capture-ready', {
            detail: { ...this.lastResult, blob: undefined },
        }));
        return this.lastResult;
    }
}
