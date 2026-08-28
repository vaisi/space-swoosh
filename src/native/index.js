// native/index.js
// Everything the packaged iOS / Android app needs that a browser tab does not.
// Changes:
// - requestNativeReview() / openStoreListing() wrap the InAppReview plugin
//   (Play review sheet; store URL only from Options if the sheet cannot start).
// - Splash hide is first in initNative() (menu already paints) plus a finally
//   retry. Dropped leftover ensureSelectionHaptics() which threw before hide
//   and pinned the cream launch screen. hideSplashScreen() is safe to call
//   more than once (3s boot failsafe).
// - hapticShieldSmash(): same Cap ImpactStyle.Light path as wall BOOP (selection
//   ticks were inaudible on device). Android uses a quieter Light waveform
//   (~64% amplitude); web vibrate 8ms vs BOOP 12ms. Never Haptics.vibrate().
// - Keyboard plugin: wireKeyboard() tracks soft-keyboard height on the game
//   (game.softKeyboardHeight) so Submit Signal can sit above the IME. Config
//   uses resizeOnFullScreen so Android edge-to-edge actually resizes the WebView.
// - hapticWallBoop(): Cap ImpactStyle.Light (soft tick). Phone haptics must be
//   on — earlier "no feel" was OS intensity at 0, not a dead plugin. Dropped
//   the heavy vibrate()/HapticTick/startup-thump path that felt too strong.
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
import { storeReviewUrl } from '../services/StoreLinks.js';

export const isNative = () => Capacitor.isNativePlatform();

/** @type {{ requestReview: () => Promise<{ ok?: boolean }>, openUrl: (opts: { url: string }) => Promise<{ ok?: boolean }> } | null} */
let inAppReviewPlugin = null;

function loadInAppReview() {
    inAppReviewPlugin ??= registerPlugin('InAppReview');
    return inAppReviewPlugin;
}

/**
 * Ask Google Play to show the in-app review sheet. Resolves `{ ok: false }` on
 * web, sideload, or any plugin failure — never throws.
 */
export async function requestNativeReview() {
    if (!isNative()) return { ok: false };
    try {
        const result = await loadInAppReview().requestReview();
        return { ok: Boolean(result?.ok) };
    } catch {
        return { ok: false };
    }
}

/**
 * Open the Play listing (Options Rate fallback when the in-app sheet cannot start).
 */
export async function openStoreListing() {
    const url = storeReviewUrl();
    if (!url) return { ok: false };
    if (!isNative()) {
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
            return { ok: true };
        } catch {
            return { ok: false };
        }
    }
    try {
        const result = await loadInAppReview().openUrl({ url });
        return { ok: Boolean(result?.ok) };
    } catch {
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
            return { ok: true };
        } catch {
            return { ok: false };
        }
    }
}

/** @type {{ StatusBar: import('@capacitor/status-bar').StatusBarPlugin, Style: typeof import('@capacitor/status-bar').Style } | null} */
let statusBarApi = null;

/** @type {typeof import('@capacitor/haptics') | null} */
let hapticsApi = null;

/** @type {{ tick: () => Promise<void> } | null} */
let hapticSmashPlugin = null;

async function loadHaptics() {
    if (!hapticsApi) {
        hapticsApi = await import('@capacitor/haptics');
    }
    return hapticsApi;
}

/** Same Light impact the wall BOOP uses. */
async function fireLightImpact() {
    const { Haptics, ImpactStyle } = await loadHaptics();
    await Haptics.impact({ style: ImpactStyle.Light });
}

/**
 * Soft tick when the ship bounces off a sidewall. Safe on web (no-op or short
 * vibrate). Never awaited from the game loop — missing haptics must not stall
 * a frame.
 */
export function hapticWallBoop() {
    if (!isNative()) {
        try {
            navigator.vibrate?.(12);
        } catch {
            /* no vibrator */
        }
        return;
    }

    void (async () => {
        try {
            await fireLightImpact();
        } catch {
            /* missing plugin / no vibrator */
        }
    })();
}

/**
 * Shield smash: same Light-impact family as wall BOOP, quieter. Android uses
 * the Light waveform at ~64% amplitude; other native shells fall back to Cap
 * Light. Web is a shorter vibrate than BOOP. Never awaited from the game loop.
 */
export function hapticShieldSmash() {
    if (!isNative()) {
        try {
            navigator.vibrate?.(8);
        } catch {
            /* no vibrator */
        }
        return;
    }

    void (async () => {
        try {
            if (Capacitor.getPlatform() === 'android') {
                try {
                    hapticSmashPlugin ??= registerPlugin('HapticSmash');
                    await hapticSmashPlugin.tick();
                    return;
                } catch {
                    /* APK without HapticSmash — same Light click as BOOP */
                }
            }
            await fireLightImpact();
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
 * Track IME height on the game so canvas modals (Submit Signal) can stay above
 * the soft keyboard. No-ops if the plugin is missing.
 *
 * @param {import('../game/Game.js').Game} game
 */
async function wireKeyboard(game) {
    try {
        const { Keyboard } = await import('@capacitor/keyboard');
        game.softKeyboardHeight = 0;
        await Keyboard.addListener('keyboardWillShow', (info) => {
            game.softKeyboardHeight = info?.keyboardHeight || 0;
        });
        await Keyboard.addListener('keyboardDidShow', (info) => {
            game.softKeyboardHeight = info?.keyboardHeight || 0;
        });
        await Keyboard.addListener('keyboardWillHide', () => {
            game.softKeyboardHeight = 0;
        });
        await Keyboard.addListener('keyboardDidHide', () => {
            game.softKeyboardHeight = 0;
        });
    } catch {
        game.softKeyboardHeight = 0;
    }
}

/**
 * Dismiss the Capacitor splash. Safe on web and safe to call more than once.
 * launchAutoHide is false, so a missed hide() leaves the cream launch screen up
 * forever.
 */
export async function hideSplashScreen() {
    if (!isNative()) return;
    try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
    } catch {
        /* no splash configured */
    }
}

/**
 * Wire the native shell to a running game. Safe to call on the web, where it
 * returns immediately. Splash is dismissed first — `game.start()` has already
 * begun painting the menu — so a later plugin failure cannot pin the splash.
 *
 * @param {import('../game/Game.js').Game} game
 */
export async function initNative(game) {
    if (!isNative()) return;

    await hideSplashScreen();

    try {
        const [{ App }, { StatusBar, Style }] = await Promise.all([
            import('@capacitor/app'),
            import('@capacitor/status-bar'),
        ]);

        statusBarApi = { StatusBar, Style };
        await syncStatusBarTheme();
        await wireBackButton(game, App);
        await wireLifecycle(game, App);
        await wireKeyboard(game);
        await syncKeepAwake(game);
    } finally {
        await hideSplashScreen();
    }
}
