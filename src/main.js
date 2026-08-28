// main.js
// Entry point: bootstraps the game.
// Changes:
// - Do not await RevenueCat / entitlements before the menu: the free roster
//   plus ownedSkinIds cache is enough for the first hangar paint. A
//   Play Billing hang must not pin the native splash.
// - 3s splash failsafe plus initNative hide-first so launchAutoHide:false can
//   never leave the cream launch screen up.
// - Font preload is time-capped in ensureBrandFonts(); splash hide does not
//   wait on webfonts.
// - markDocumentShell() so desktop web can show store rails; native hides them.
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
import { markDocumentShell } from './core/platform.js';
import { hideSplashScreen, initNative } from './native/index.js';
import { initAnalytics } from './services/Analytics.js';
import { initEntitlements } from './services/Entitlements.js';
import { playtestLevelFromQuery } from './services/JourneyProgress.js';

const SPLASH_FAILSAFE_MS = 3000;

window.addEventListener('load', async () => {
    const splashFailsafe = setTimeout(() => {
        hideSplashScreen().catch(() => {});
    }, SPLASH_FAILSAFE_MS);

    initAnalytics();

    // Tokens + page shell before fonts/canvas so the first frame matches preference.
    initTheme();
    markDocumentShell();

    // Time-capped: a hung WebView font request must not block the menu.
    await ensureBrandFonts();

    const game = new Game(GameConfig);
    game.start();
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
