// native/index.js
// Everything the packaged iOS / Android app needs that a browser tab does not.
// Changes:
// - hapticWallBoop(): short Cap `vibrate(28ms)` on sidewall bounce — Android
//   ImpactStyle.Light (amp ~110) is often imperceptible; one-shot DEFAULT
//   amplitude reads as a real tick. Preload in initNative. Web: vibrate(28).
// - Theme toggle: syncStatusBarTheme() matches light/dark paper + glyph style.
// - Night paper: status bar uses Style.Dark + charcoal paper background so light
//   glyphs read on the dark stage.
// - Created file: hardware back navigation, app lifecycle pausing, screen
//   wake-lock during a run, status bar colouring and splash dismissal.
//
// The plugins are imported dynamically inside `isNativePlatform()` branches so
// the web bundle never pays for native code it cannot use, and so a browser
// build has no chance of invoking an unimplemented plugin.

import { Capacitor, registerPlugin } from '@capacitor/core';

import { goBack } from '../game/BackNavigation.js';
import { color } from '../brand/tokens.js';
import { isDarkTheme } from '../brand/theme.js';

export const isNative = () => Capacitor.isNativePlatform();

/** @type {{ StatusBar: import('@capacitor/status-bar').StatusBarPlugin, Style: typeof import('@capacitor/status-bar').Style } | null} */
let statusBarApi = null;

/** @type {typeof import('@capacitor/haptics') | null} */
let hapticsApi = null;

/** Wall-boop pulse length (ms). Short enough to feel like a tick, not a buzz. */
const WALL_BOOP_VIBRATE_MS = 28;

async function loadHaptics() {
    if (!hapticsApi) {
        hapticsApi = await import('@capacitor/haptics');
    }
    return hapticsApi;
}

/**
 * Soft tick when the ship bounces off a sidewall. Safe on web (no-op or short
 * vibrate). Never awaited from the game loop — missing haptics must not stall
 * a frame.
 */
export function hapticWallBoop() {
    if (!isNative()) {
        try {
            navigator.vibrate?.(WALL_BOOP_VIBRATE_MS);
        } catch {
            /* no vibrator */
        }
        return;
    }

    void (async () => {
        try {
            const { Haptics } = await loadHaptics();
            // One-shot vibrate (DEFAULT_AMPLITUDE) — more reliable on Android
            // than ImpactStyle.Light, which many OEMs render as nearly silent.
            await Haptics.vibrate({ duration: WALL_BOOP_VIBRATE_MS });
        } catch {
            /* missing plugin / no vibrator */
        }
    })();
}

// --- Screen wake lock --------------------------------------------------------
// The ship flies itself, so a player threading a dense field can go a long time
// without touching the glass — long enough for the display to dim. The lock is
// held only during an active, unpaused run.
let keepAwakePlugin = null;
let keepAwakeHeld = false;

async function loadKeepAwake() {
    if (!keepAwakePlugin) {
        keepAwakePlugin = (await import('@capacitor-community/keep-awake')).KeepAwake;
    }
    return keepAwakePlugin;
}

export async function syncKeepAwake(game) {
    if (!isNative()) return;

    const shouldHold = game.appScreen === 'playing' && !game.isPaused && !game.isGameOver;
    if (shouldHold === keepAwakeHeld) return;

    try {
        const KeepAwake = await loadKeepAwake();
        await (shouldHold ? KeepAwake.keepAwake() : KeepAwake.allowSleep());
        keepAwakeHeld = shouldHold;
    } catch {
        // A missing wake lock is a papercut, never a reason to break a run.
    }
}

// --- Display refresh pin (Android only) --------------------------------------
// Android VRR panels rest at 60 Hz and boost to 120 only while a finger is
// down, so sparse taps flap the display 60<->120 mid-run — visible as a
// smoothness texture change even with clock-true pacing (?perf=1 histogram:
// 8-12 ms bucket fills while tapping, 16-20 ms at rest). Pin the panel's
// highest mode for the whole run so the boost cadence is permanent. iOS is a
// no-op: WKWebView rAF is capped at 60 Hz, so there is nothing to pin.
let refreshRatePlugin = null;
let highRefreshHeld = false;

export async function syncHighRefresh(game) {
    if (!isNative() || Capacitor.getPlatform() !== 'android') return;

    const shouldHold = game.appScreen === 'playing';
    if (shouldHold === highRefreshHeld) return;

    try {
        refreshRatePlugin ??= registerPlugin('RefreshRate');
        await (shouldHold ? refreshRatePlugin.pinHigh() : refreshRatePlugin.release());
        highRefreshHeld = shouldHold;
    } catch {
        // A refresh pin is a nicety — the system rate is never a broken run.
    }
}

// --- Hardware back -----------------------------------------------------------
// Without this the system back button tears the app down mid-run, which both
// users and Play reviewers treat as a bug.
async function wireBackButton(game, App) {
    await App.addListener('backButton', () => {
        const handled = goBack(game);
        if (!handled) App.exitApp();
    });
}

// --- Lifecycle ---------------------------------------------------------------
// `visibilitychange` already auto-pauses, but a WebView does not always fire it
// on backgrounding (and never reliably during a phone call or app switcher), so
// the native signal is authoritative.
async function wireLifecycle(game, App) {
    await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
            if (game.isPlaying() && !game.isPaused) {
                game.togglePause();
                game.wasAutoPaused = true;
            }
            game.soundManager?.pauseBGM?.();
            syncKeepAwake(game);
            return;
        }

        // Coming back: only auto-resume what we auto-paused. A run the player
        // paused deliberately stays paused.
        if (game.wasAutoPaused) {
            game.togglePause();
            game.wasAutoPaused = false;
        }
        syncKeepAwake(game);
    });
}

// --- Chrome ------------------------------------------------------------------
/** Match the status bar to the active light/dark paper theme. */
export async function syncStatusBarTheme() {
    if (!isNative() || !statusBarApi) return;
    const { StatusBar, Style } = statusBarApi;
    try {
        // Style.Dark = light glyphs on dark bg; Style.Light = dark glyphs on light bg.
        await StatusBar.setStyle({
            style: isDarkTheme() ? Style.Dark : Style.Light,
        });

        if (Capacitor.getPlatform() === 'android') {
            // Keep the bar as its own paper strip rather than letting the
            // WebView slide under it — the CSS safe-area padding then has
            // nothing to compensate for and the HUD sits where it was designed.
            await StatusBar.setBackgroundColor({ color: color.paper });
            await StatusBar.setOverlaysWebView({ overlay: false });
        }
    } catch {
        // Not fatal — worst case the bar keeps the system default.
    }
}

/**
 * Wire the native shell to a running game. Safe to call on the web, where it
 * returns immediately.
 *
 * @param {import('../game/Game.js').Game} game
 */
export async function initNative(game) {
    if (!isNative()) return;

    const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import('@capacitor/app'),
        import('@capacitor/status-bar'),
        import('@capacitor/splash-screen'),
    ]);

    statusBarApi = { StatusBar, Style };
    await syncStatusBarTheme();
    await wireBackButton(game, App);
    await wireLifecycle(game, App);
    await syncKeepAwake(game);
    // Warm the haptics chunk so the first wall boop isn't racing a dynamic import.
    try {
        await loadHaptics();
    } catch {
        /* optional */
    }

    // Held until here so the first painted frame is the real menu, not a blank
    // canvas waiting on fonts.
    try {
        await SplashScreen.hide();
    } catch {
        /* no splash configured */
    }
}
