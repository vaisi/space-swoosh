// native/index.js
// Everything the packaged iOS / Android app needs that a browser tab does not.
// Changes:
// - Native boot blanks document.title so WebView / media chrome cannot
//   reuse "Space Swoosh". Android caption / ActionBar stay hidden in
//   MainActivity; this file only styles system-bar glyphs. Never call
//   SystemBars.show() — Capacitor plugin load already shows systemBars
//   (including captionBar) and that was restoring the "Spac…" strip.
// - Android 15+ edge-to-edge: syncStatusBarTheme() uses Capacitor SystemBars
//   (setStyle only). Dropped @capacitor/status-bar setBackgroundColor /
//   setOverlaysWebView — those call Window.setStatusBarColor, which Play flags
//   as deprecated and which is a no-op on API 35+. Insets are CSS
//   --safe-area-inset-* / env(safe-area-inset-*).
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
// - Theme toggle: syncStatusBarTheme() matches light/dark glyph style.
// - Night paper: SystemBarsStyle.Dark so light glyphs read on the dark stage.
// - PlayGames plugin: silent authenticate on boot, Open Space score submit,
//   and Friends-collection load. Friends Sign in uses authenticate({ force })
//   so a tap always runs GamesSignInClient.signIn() instead of a silent no-op.
//
// The plugins are imported dynamically inside `isNativePlatform()` branches so
// the web bundle never pays for native code it cannot use, and so a browser
// build has no chance of invoking an unimplemented plugin.

import { Capacitor, registerPlugin, SystemBars, SystemBarsStyle } from '@capacitor/core';

import { goBack } from '../game/BackNavigation.js';
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
/** Match system-bar glyph contrast to the active light/dark paper theme. */
export async function syncStatusBarTheme() {
    if (!isNative()) return;
    try {
        // Glyph contrast only. Do not SystemBars.show() — that re-shows
        // captionBar (the "Spac…" strip) after MainActivity hid it.
        await SystemBars.setStyle({
            style: isDarkTheme() ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
        });
    } catch {
        // Not fatal — worst case the bars keep the system default.
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

/** @type {{ authenticate: () => Promise<{ signedIn?: boolean }>, submitScore: (opts: object) => Promise<{ ok?: boolean }>, loadFriends: (opts: object) => Promise<{ signedIn?: boolean, rows?: object[] }> } | null} */
let playGamesPlugin = null;

function loadPlayGames() {
    playGamesPlugin ??= registerPlugin('PlayGames');
    return playGamesPlugin;
}

function playGamesEnabled() {
    return isNative() && Capacitor.getPlatform() === 'android';
}

/** Play Games sign-in. Pass `{ force: true }` from the Friends Sign in button. Never throws. */
export async function playGamesAuthenticate(opts = {}) {
    if (!playGamesEnabled()) return { signedIn: false, configured: false, error: 'web', rows: [] };
    try {
        const result = await Promise.race([
            loadPlayGames().authenticate({
                force: Boolean(opts.force),
            }),
            new Promise((resolve) => setTimeout(() => resolve({
                signedIn: false,
                configured: true,
                error: 'timeout',
            }), opts.force ? 45000 : 12000)),
        ]);
        return {
            signedIn: Boolean(result?.signedIn),
            configured: result?.configured !== false,
            error: typeof result?.error === 'string' ? result.error : null,
            rows: [],
        };
    } catch {
        return { signedIn: false, configured: true, error: 'plugin', rows: [] };
    }
}

/** Fire-and-forget Open Space submit. Never throws. */
export async function playGamesSubmitScore(opts) {
    if (!playGamesEnabled()) return { ok: false };
    try {
        const result = await loadPlayGames().submitScore(opts || {});
        return { ok: Boolean(result?.ok) };
    } catch {
        return { ok: false };
    }
}

/** Friends-collection scores for the current style + metric. Never throws. */
export async function playGamesLoadFriends(opts) {
    if (!playGamesEnabled()) return { signedIn: false, rows: [] };
    try {
        const result = await loadPlayGames().loadFriends(opts || {});
        return {
            signedIn: Boolean(result?.signedIn),
            rows: Array.isArray(result?.rows) ? result.rows : [],
        };
    } catch {
        return { signedIn: false, rows: [] };
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

    try {
        document.title = ' ';
    } catch {
        /* ignore */
    }

    await hideSplashScreen();

    try {
        const { App } = await import('@capacitor/app');

        await syncStatusBarTheme();
        await wireBackButton(game, App);
        await wireLifecycle(game, App);
        await wireKeyboard(game);
        await syncKeepAwake(game);
        playGamesAuthenticate();
    } finally {
        await hideSplashScreen();
    }
}
