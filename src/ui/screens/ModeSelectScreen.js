// ModeSelectScreen.js
// The screen behind Play: pick Open World (the endless run, with the
// leaderboard) or Journey (levels). Two description cards rather than two bare
// buttons, because the difference between the modes needs one line to explain.
// Changes:
// - Created file. Kept out of Game.js, which is already long; it draws through
//   the same ScreenKit grid and brand button as every other screen.

import { color, font } from '../../brand/tokens.js';
import { drawFramedTile, setLabelType, resetType } from '../../utils/BrandDraw.js';
import { screenLayout, fitPx, wrapLines } from '../ScreenKit.js';
import { PLAY_MODE } from '../../modes/index.js';
import { STARS_PER_LEVEL, TOTAL_LEVELS } from '../../config/JourneyConfig.js';
import { nextPlayableLevel, totalStars } from '../../services/JourneyProgress.js';

/** Draws the screen and returns the hit-boxes Game routes clicks against. */
export function renderModeSelect(game) {
    const ctx = game.ctx;
    const unit = game.baseUnit;
    const L = screenLayout(game.canvas, unit);

    game.drawScreenFrame();
    const header = game.drawScreenHeader('PLAY', { back: true });

    const footnotePx = Math.max(9, unit * 0.9);
    const gap = unit * 2.2;
    const footnoteY = L.bottom - footnotePx / 2;
    const area = footnoteY - footnotePx / 2 - L.block - header.contentTop;
    const cardH = Math.min(unit * 17, (area - gap) / 2);
    const cardW = Math.min(unit * 34, L.width);
    const cardX = L.centerX - cardW / 2;
    const top = header.contentTop + Math.max(0, (area - (cardH * 2 + gap)) / 2);

    const level = nextPlayableLevel(game.journeyProgress);
    const stars = totalStars(game.journeyProgress);

    const buttons = { back: header.backRect };

    buttons.openWorld = drawModeCard(game, {
        x: cardX, y: top, w: cardW, h: cardH,
        title: 'Open World',
        blurb: 'One run, no finish line. Fly until you crash — the leaderboard is here.',
        tag: 'ENDLESS',
    });

    buttons.journey = drawModeCard(game, {
        x: cardX, y: top + cardH + gap, w: cardW, h: cardH,
        title: 'Journey',
        blurb: `${TOTAL_LEVELS} levels that climb, then hold, then climb again. Three stars each.`,
        tag: `LEVEL ${level}`,
        signal: true,
        footer: `${stars} / ${TOTAL_LEVELS * STARS_PER_LEVEL} STARS`,
    });

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setLabelType(ctx, footnotePx);
    ctx.fillStyle = color.ink30;
    ctx.fillText('SAME SHIP. SAME CONTROLS.', L.centerX, footnoteY);
    resetType(ctx);
    ctx.restore();

    return buttons;
}

// One mode card: title, one-line explanation, a mono micro-tag, and an optional
// footer stat. Same framed-tile treatment as the ship picker.
function drawModeCard(game, { x, y, w, h, title, blurb, tag, signal = false, footer = null }) {
    const ctx = game.ctx;
    const unit = game.baseUnit;
    const pad = unit * 1.8;
    const innerW = w - pad * 2;

    drawFramedTile(ctx, x, y, w, h, {
        surface: color.paperTint,
        stroke: signal ? color.signal : color.ink,
    });

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const tagPx = Math.max(9, unit * 0.9);
    setLabelType(ctx, tagPx);
    ctx.fillStyle = signal ? color.signal : color.ink55;
    ctx.textAlign = 'right';
    ctx.fillText(tag, x + w - pad, y + pad);
    resetType(ctx);

    const titlePx = Math.min(unit * 2.4, h * 0.22);
    ctx.textAlign = 'left';
    ctx.fillStyle = color.ink;
    fitPx(ctx, title.toUpperCase(), innerW * 0.68, titlePx, unit * 1.4,
        (px) => setLabelType(ctx, px, 700));
    ctx.fillText(title.toUpperCase(), x + pad, y + pad + titlePx * 0.2);
    resetType(ctx);

    const blurbPx = Math.max(10, unit * 1.05);
    ctx.font = `500 ${blurbPx}px ${font.ui}`;
    ctx.fillStyle = color.ink55;
    wrapLines(ctx, blurb, innerW, 3).forEach((line, i) => {
        ctx.fillText(line, x + pad, y + pad + titlePx * 1.5 + i * blurbPx * 1.4);
    });

    if (footer) {
        setLabelType(ctx, Math.max(9, unit * 0.85));
        ctx.fillStyle = color.ink30;
        ctx.fillText(footer, x + pad, y + h - pad);
        resetType(ctx);
    }

    ctx.restore();
    return { x, y, width: w, height: h };
}

/** @returns {boolean} true when the click was consumed. */
export function handleModeSelectClick(game, x, y) {
    const buttons = game.modeSelectButtons;
    if (!buttons) return false;

    if (game.isClickInButton(x, y, buttons.back)) {
        game.appScreen = 'menu';
        return true;
    }
    if (game.isClickInButton(x, y, buttons.openWorld)) {
        game.beginRun(PLAY_MODE.openWorld);
        return true;
    }
    if (game.isClickInButton(x, y, buttons.journey)) {
        game.goToJourneyMap();
        return true;
    }
    return false;
}
