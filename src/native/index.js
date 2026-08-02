// native/index.js
// Everything the packaged iOS / Android app needs that a browser tab does not.
// Changes:
// - Created file: hardware back navigation, app lifecycle pausing, screen
//   wake-lock during a run, status bar colouring and splash dismissal.
//
// The plugins are imported dynamically inside `isNativePlatform()` branches so
// the web bundle never pays for native code it cannot use, and so a browser
// build has no chance of invoking an unimplemented plugin.

import { Capacitor } from '@capacitor/core';

import { goBack } from '../game/BackNavigation.js';

export const isNative = () => Capacitor.isNativePlatform();

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
async function styleStatusBar(StatusBar, Style) {
    try {
        // Paper ground, so the bar needs dark glyphs. Style.Light means
        // "dark content, for light backgrounds".
        await StatusBar.setStyle({ style: Style.Light });

        if (Capacitor.getPlatform() === 'android') {
            // Keep the bar as its own paper strip rather than letting the
            // WebView slide under it — the CSS safe-area padding then has
            // nothing to compensate for and the HUD sits where it was designed.
            await StatusBar.setBackgroundColor({ color: '#E1D9C1' });
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

    await styleStatusBar(StatusBar, Style);
    await wireBackButton(game, App);
    await wireLifecycle(game, App);
    await syncKeepAwake(game);

    // Held until here so the first painted frame is the real menu, not a blank
    // canvas waiting on fonts.
    try {
        await SplashScreen.hide();
    } catch {
        /* no splash configured */
    }
}
