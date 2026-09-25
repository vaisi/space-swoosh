// main.js
// Entry point: bootstraps the game.
// Changes:
// - Mobile web never starts Game — store gate + analytics only. Native apps
//   and desktop browsers still boot the canvas.
// - Do not await RevenueCat / entitlements before the menu: the free roster
//   plus ownedSkinIds cache is enough for the first hangar paint. A
//   Play Billing hang must not pin the native splash.
// - 3s splash failsafe plus initNative hide-first so launchAutoHide:false can
//   never leave the cream launch screen up.
// - Font preload is time-capped in ensureBrandFonts(); splash hide does not
//   wait on webfonts.
// - markDocumentShell() so desktop web can show store rails; native hides them.
// - Playtest `?signal=1` opens Submit Signal with sample stats; `?kb=N`
//   fakes IME height so the keyboard sheet can be checked in a browser.
// - Playtest `?level=42&nearend=1` starts that Journey day near the finish;
//   no intro captions; level-42.mp3 plays after the fade with the written ending.
// - Preload the brand webfonts (Space Grotesk / Space Mono) before the first
//   canvas paint so the on-brand HUD and end screens render correctly from
//   frame one instead of flashing a system fallback.
// - Wire the native shell (hardware back, lifecycle, wake lock, status bar,
//   splash dismissal) after the first frame. It no-ops on the web, and it is
//   deliberately not awaited before `start()` so a slow plugin can never delay
//   the menu appearing.

import { Game } from './game/Game.js';
import { GameConfig } from './config/GameConfig.js';
import { ensureBrandFonts } from './utils/BrandDraw.js';
import { initTheme } from './brand/theme.js';
import {
    markDocumentShell,
    preferredStoreTarget,
    shouldBlockBrowserPlay,
} from './core/platform.js';
import { hideSplashScreen, initNative } from './native/index.js';
import { initAnalytics, track } from './services/Analytics.js';
import { PLAY_STORE_URL, appStoreUrl } from './services/StoreLinks.js';
import { initEntitlements } from './services/Entitlements.js';
import { playtestLevelFromQuery } from './services/JourneyProgress.js';
import { CaptureManager } from './capture/CaptureManager.js';

const SPLASH_FAILSAFE_MS = 3000;

function applyStoreHrefs() {
    const ios = appStoreUrl();
    const play = PLAY_STORE_URL;
    for (const node of document.querySelectorAll('[data-store="ios"]')) {
        if (ios) node.setAttribute('href', ios);
    }
    for (const node of document.querySelectorAll('[data-store="play"]')) {
        if (play) node.setAttribute('href', play);
    }
}

window.addEventListener('load', async () => {
    initAnalytics();

    // Tokens + page shell before fonts/canvas so the first frame matches preference.
    initTheme();
    markDocumentShell();
    applyStoreHrefs();

    if (shouldBlockBrowserPlay()) {
        track('web_store_gate', { store_target: preferredStoreTarget() });
        return;
    }

    const splashFailsafe = setTimeout(() => {
        hideSplashScreen().catch(() => {});
    }, SPLASH_FAILSAFE_MS);

    // Time-capped: a hung WebView font request must not block the menu.
    await ensureBrandFonts();

    const game = new Game(GameConfig);
    game.start();
    game.captureManager = new CaptureManager(game);
    const playtestLevel = playtestLevelFromQuery();
    if (playtestLevel != null) game.tryBeginJourneyLevel(playtestLevel);

    initEntitlements().catch((error) => {
        console.error('Entitlements failed to initialize:', error);
    });

    try {
        await initNative(game);
    } catch (error) {
        console.error('Native shell failed to initialize:', error);
        await hideSplashScreen();
    } finally {
        clearTimeout(splashFailsafe);
    }
});
