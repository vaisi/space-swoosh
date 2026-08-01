// main.js
// Entry point: bootstraps the game.
// Changes:
// - Boots straight into the main menu (no blocking name prompt). Name is
//   collected when submitting a score.
// - Preload the brand webfonts (Space Grotesk / Space Mono) before the first
//   canvas paint so the on-brand HUD and end screens render correctly from
//   frame one instead of flashing a system fallback.

import { Game } from './game/Game.js';
import { GameConfig } from './config/GameConfig.js';
import { ensureBrandFonts } from './utils/BrandDraw.js';

window.addEventListener('load', async () => {
    // Make sure the geometric brand type is ready before we draw anything.
    await ensureBrandFonts();

    const game = new Game(GameConfig);
    game.start();
});
