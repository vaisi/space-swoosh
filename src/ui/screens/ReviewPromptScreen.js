// ReviewPromptScreen.js
// Paper overlay on a Journey clear: enjoying the game so far?
// Changes: Created — three framed actions. It's great immediately requests
// the OS review sheet (no second screen). Not really / Later dismiss.

import { color } from '../../brand/tokens.js';
import { setDisplayType, resetType } from '../../utils/BrandDraw.js';
import { screenLayout, fitPx, drawDivider } from '../ScreenKit.js';

/**
 * Draws the enjoyment card over the level-outcome screen.
 * @returns {{ great: object, no: object, later: object }}
 */
export function renderReviewPrompt(game) {
    const ctx = game.ctx;
    const L = screenLayout(game, game.baseUnit);
    const unit = game.baseUnit;
    const isMobile = L.isMobile;
    const titlePx = isMobile ? Math.min(unit * 2.4, 28) : unit * 2.2;
    const buttonHeight = isMobile ? unit * 5.0 : unit * 4.6;
    const buttonGap = unit * 1.2;
    const buttonWidth = Math.min(unit * 30, L.width);
    const buttonsH = buttonHeight * 3 + buttonGap * 2;
    const blockH = titlePx * 1.2 + L.section + buttonsH;
    const y0 = Math.max(L.top, (game.height - blockH) / 2);

    ctx.save();
    ctx.fillStyle = `rgba(${color.paperRgb}, 0.94)`;
    ctx.fillRect(0, 0, game.width, game.height);
    ctx.restore();

    let y = y0;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color.ink;
    const title = 'Enjoying Space Swoosh so far?';
    fitPx(ctx, title, L.width, titlePx, unit * 1.4, (px) => setDisplayType(ctx, px));
    ctx.fillText(title, L.centerX, y + titlePx * 0.55);
    resetType(ctx);

    ctx.restore();

    y += titlePx * 1.1 + L.section * 0.6;
    drawDivider(ctx, L.left, L.right, y);
    y += L.section * 0.7;

    const bx = L.centerX - buttonWidth / 2;
    const buttons = {};
    buttons.great = game.drawBrandButton(
        bx, y, buttonWidth, buttonHeight, "It's great", { primary: true, tag: '\u25B6' }
    );
    y += buttonHeight + buttonGap;
    buttons.no = game.drawBrandButton(
        bx, y, buttonWidth, buttonHeight, 'Not really', { tag: '\u2014' }
    );
    y += buttonHeight + buttonGap;
    buttons.later = game.drawBrandButton(
        bx, y, buttonWidth, buttonHeight, 'Later', { tag: '\u2026' }
    );

    return buttons;
}

/** @returns {boolean} true when the tap was consumed. */
export function handleReviewPromptClick(game, x, y) {
    const buttons = game.reviewPromptButtons;
    if (!buttons || !game.reviewPromptLive) return false;
    if (game.gameOverAlpha < 0.6) return true;

    if (game.isClickInButton(x, y, buttons.great)) {
        void game.handleReviewPromptChoice('yes');
        return true;
    }
    if (game.isClickInButton(x, y, buttons.no)) {
        void game.handleReviewPromptChoice('no');
        return true;
    }
    if (game.isClickInButton(x, y, buttons.later)) {
        void game.handleReviewPromptChoice('later');
        return true;
    }
    return true;
}
