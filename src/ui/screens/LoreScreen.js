// LoreScreen.js
// One-time pre-Journey Signal Story briefing: short lore, CONTINUE unlocks the
// first Logbook Levels entry (`signalCall`) and opens the Journey map.
// Changes:
// - Created file. Drawn through ScreenKit like mode select / outcome screens.

import { color, font } from '../../brand/tokens.js';
import { resetType } from '../../utils/BrandDraw.js';
import { screenLayout, wrapLines } from '../ScreenKit.js';
import { PRE_LEVEL_1_LORE } from '../../config/JourneyNarrative.js';
import { LORE_ENTRY_ID } from '../../config/LogbookEntries.js';
import {
    hasSeenJourneyLore,
    markJourneyLoreSeen,
} from '../../services/JourneyProgress.js';
import {
    loadLogbookProgress,
    revealInstant,
} from '../../services/LogbookProgress.js';

/** Draws the lore screen and returns hit-boxes for Game click routing. */
export function renderLoreScreen(game) {
    const ctx = game.ctx;
    const unit = game.baseUnit;
    const L = screenLayout(game, unit);

    const header = game.drawScreenHeader('SIGNAL', { back: true });

    const buttonHeight = L.isMobile ? unit * 5.2 : unit * 4.7;
    const buttonWidth = Math.min(unit * 30, L.width);
    const bodyTop = header.contentTop;
    const bodyBottom = L.bottom - buttonHeight - L.block * 1.5;
    const bodyH = Math.max(unit * 8, bodyBottom - bodyTop);

    const bodyPx = Math.max(13, Math.min(unit * 1.35, L.isMobile ? 17 : 18));
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `500 ${bodyPx}px ${font.ui}`;
    ctx.fillStyle = color.ink;
    const lines = wrapLines(ctx, PRE_LEVEL_1_LORE, L.width, 12);
    const lineH = bodyPx * 1.45;
    const blockH = lines.length * lineH;
    let y = bodyTop + Math.max(0, (bodyH - blockH) / 2);

    for (const line of lines) {
        ctx.fillText(line, L.left, y);
        y += lineH;
    }
    resetType(ctx);
    ctx.restore();

    const btnY = L.bottom - buttonHeight;
    const continueBtn = game.drawBrandButton(
        L.centerX - buttonWidth / 2,
        btnY,
        buttonWidth,
        buttonHeight,
        'Continue',
        { primary: true, signal: true }
    );

    return { back: header.backRect, continue: continueBtn };
}

/** @returns {boolean} true when the click was consumed. */
export function handleLoreScreenClick(game, x, y) {
    const buttons = game.loreScreenButtons;
    if (!buttons) return false;

    if (game.isClickInButton(x, y, buttons.back)) {
        game.goToModeSelect();
        return true;
    }

    if (game.isClickInButton(x, y, buttons.continue)) {
        completeJourneyLore(game);
        game.goToJourneyMap();
        return true;
    }

    return false;
}

/** Persist loreSeen + unlock the Logbook lore entry as known. */
export function completeJourneyLore(game) {
    if (!hasSeenJourneyLore(game.journeyProgress)) {
        game.journeyProgress = markJourneyLoreSeen(game.journeyProgress);
    }

    const progress = game.logbook?.progress ?? loadLogbookProgress();
    const result = revealInstant(progress, LORE_ENTRY_ID);
    if (game.logbook) {
        game.logbook.progress = result.progress;
    }

    if (result.changed) {
        game.logbookToast?.show?.();
        game.soundManager?.playLogbook?.();
    }
}

/** Route into Journey: lore once, then the map. */
export function enterJourneyFromModeSelect(game) {
    if (!hasSeenJourneyLore(game.journeyProgress)) {
        game.appScreen = 'lore';
        game.updatePauseButtonVisibility?.();
        return;
    }
    game.goToJourneyMap();
}
