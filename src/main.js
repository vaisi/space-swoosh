// main.js
// Entry point: bootstraps the game.
// Changes:
// - Boots straight into the main menu (no blocking name prompt). Name is
//   collected when submitting a score.
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
import { initNative } from './native/index.js';
import { initAnalytics } from './services/Analytics.js';
import { initEntitlements } from './services/Entitlements.js';

window.addEventListener('load', async () => {
    initAnalytics();

    // Make sure the geometric brand type is ready before we draw anything.
    await ensureBrandFonts();

    // Hydrate owned skins (and configure RevenueCat on native) before Game
    // reads the selected skin from localStorage.
    await initEntitlements();

    const game = new Game(GameConfig);
    game.start();

    initNative(game).catch((error) => {
        console.error('Native shell failed to initialize:', error);
    });
});
