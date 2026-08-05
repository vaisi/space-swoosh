// JourneyMapScreen.js
// The Journey level select: chapter bands of numbered tiles, each showing its
// three stars, with everything past the furthest cleared level locked. The list
// is taller than the screen, so it scrolls (wheel or drag — Game owns the
// gesture and hands us the offset).
// Changes:
// - No longer draws the gray inset screen frame (removed app-wide).
// - Tile star pips are solid when earned and hollow when not (they used to be a
//   faint fill), matching the outcome screen's objective rows.
// - Created file.

import { color, font } from '../../brand/tokens.js';
import {
    drawFramedTile,
    drawSparkle,
    setLabelType,
    setMonoType,
    resetType,
} from '../../utils/BrandDraw.js';
import { screenLayout, drawDivider } from '../ScreenKit.js';
import {
    JOURNEY_CHAPTERS,
    STARS_PER_LEVEL,
    TOTAL_LEVELS,
} from '../../config/JourneyConfig.js';
import {
    isLevelUnlocked,
    levelStars,
    nextPlayableLevel,
    totalStars,
} from '../../services/JourneyProgress.js';

/**
 * Draws the map and returns `{ back, levels, metrics }`. `metrics` tells Game
 * how far the list can scroll; `levels` hit-boxes are already in screen space,
 * so click routing needs no knowledge of the scroll offset.
 */
export function renderJourneyMap(game) {
    const ctx = game.ctx;
    const unit = game.baseUnit;
    const L = screenLayout(game, unit);

    const header = game.drawScreenHeader('JOURNEY', { back: true });

    // Star tally, pinned to the header band on the right.
    const tallyPx = Math.max(9, unit * 0.95);
    const tallyY = L.top + (L.isMobile ? unit * 2.1 : unit * 1.9);
    const tally = `${totalStars(game.journeyProgress)} / ${TOTAL_LEVELS * STARS_PER_LEVEL}`;
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    setLabelType(ctx, tallyPx);
    ctx.fillStyle = color.ink55;
    ctx.fillText(tally, L.right - tallyPx * 1.9, tallyY);
    resetType(ctx);
    drawSparkle(ctx, L.right - tallyPx * 0.7, tallyY, tallyPx * 0.62, { fill: color.signal });
    ctx.restore();

    const viewTop = header.contentTop - L.section * 0.5;
    const viewBottom = L.bottom - unit * 1.6;
    const viewportHeight = viewBottom - viewTop;

    const columns = L.isMobile ? 4 : 5;
    const gap = unit * 1.2;
    const tileW = Math.min(unit * 8, (L.width - gap * (columns - 1)) / columns);
    const tileH = tileW * 1.15;
    const chapterLabelPx = Math.max(10, unit * 1.05);
    const chapterBlurbPx = Math.max(9, unit * 0.92);

    // Clip to the viewport, then draw the whole list translated by the scroll.
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.left - unit, viewTop, L.width + unit * 2, viewportHeight);
    ctx.clip();
    ctx.translate(0, -game.journeyMapScroll);

    const unlockedTo = nextPlayableLevel(game.journeyProgress);
    const levels = [];
    // Chapter labels are drawn from their middle, so the list starts clear of the
    // clip edge rather than with its first heading sliced in half.
    let y = viewTop + unit * 1.2;

    JOURNEY_CHAPTERS.forEach((chapter, index) => {
        if (index > 0) y += L.section * 0.7;

        y = drawChapterHeading(game, {
            chapter, L, y,
            labelPx: chapterLabelPx,
            blurbPx: chapterBlurbPx,
            locked: !isLevelUnlocked(game.journeyProgress, chapter.from),
        });

        const rows = Math.ceil(chapter.levels.length / columns);
        const startX = L.left + (L.width - (tileW * columns + gap * (columns - 1))) / 2;

        for (let row = 0; row < rows; row++) {
            const inRow = chapter.levels.slice(row * columns, (row + 1) * columns);

            inRow.forEach((descriptor, i) => {
                const x = startX + i * (tileW + gap);
                const tileY = y + row * (tileH + gap);
                const unlocked = isLevelUnlocked(game.journeyProgress, descriptor.level);

                drawLevelTile(game, {
                    descriptor,
                    x, y: tileY, w: tileW, h: tileH,
                    unlocked,
                    current: descriptor.level === unlockedTo,
                    stars: levelStars(game.journeyProgress, descriptor.level),
                });

                levels.push({
                    level: descriptor.level,
                    unlocked,
                    x,
                    // Screen-space box: undo the scroll translate.
                    y: tileY - game.journeyMapScroll,
                    width: tileW,
                    height: tileH,
                });
            });
        }

        y += rows * (tileH + gap) - gap;
    });

    ctx.restore();

    const contentHeight = y - viewTop + unit;
    drawScrollHint(game, { L, viewTop, viewBottom, contentHeight, viewportHeight });

    return {
        back: header.backRect,
        levels,
        metrics: { contentHeight, viewportHeight, viewTop, viewBottom },
    };
}

function drawChapterHeading(game, { chapter, L, y, labelPx, blurbPx, locked }) {
    const ctx = game.ctx;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    setLabelType(ctx, labelPx);
    ctx.fillStyle = locked ? color.ink30 : color.ink;
    ctx.fillText(chapter.name.toUpperCase(), L.left, y);
    const nameW = ctx.measureText(chapter.name.toUpperCase()).width;

    ctx.textAlign = 'right';
    setMonoType(ctx, labelPx * 0.92);
    ctx.fillStyle = color.ink30;
    ctx.fillText(`${chapter.from}-${chapter.to}`, L.right, y);
    resetType(ctx);
    ctx.restore();

    drawDivider(ctx, L.left + nameW + labelPx * 1.6, L.right - labelPx * 3.4, y);

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `500 ${blurbPx}px ${font.ui}`;
    ctx.fillStyle = locked ? color.ink30 : color.ink55;
    ctx.fillText(chapter.blurb, L.left, y + blurbPx * 1.9);
    ctx.restore();

    return y + blurbPx * 1.9 + game.baseUnit * 2;
}

// One level tile: the number, and a row of three star pips. Locked tiles keep
// the number but drop to a hairline border and faded ink, so the shape of the
// journey ahead is still legible.
function drawLevelTile(game, { descriptor, x, y, w, h, unlocked, current, stars }) {
    const ctx = game.ctx;
    const unit = game.baseUnit;
    const cleared = stars[0] === true;

    drawFramedTile(ctx, x, y, w, h, {
        surface: unlocked ? (cleared ? color.paperDeep : color.paperTint) : color.paper,
        stroke: current ? color.signal : unlocked ? color.ink : color.ink12,
    });

    if (current) {
        ctx.save();
        ctx.strokeStyle = color.signal;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.restore();
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    setMonoType(ctx, Math.min(unit * 2.1, w * 0.42));
    ctx.fillStyle = unlocked ? color.ink : color.ink30;
    ctx.fillText(`${descriptor.level}`, x + w / 2, y + h * 0.4);
    resetType(ctx);

    const pipR = Math.max(2.5, w * 0.075);
    const pipGap = pipR * 2.6;
    const pipY = y + h * 0.74;
    const pipStart = x + w / 2 - pipGap;

    // Earned stars are solid Signal Blue, the rest hollow — the same language the
    // outcome screen uses, so a tile and its level screen agree.
    for (let i = 0; i < STARS_PER_LEVEL; i++) {
        drawSparkle(ctx, pipStart + i * pipGap, pipY, pipR, {
            fill: color.signal,
            stroke: stars[i] ? null : unlocked ? color.ink30 : color.ink12,
            lineWidth: 1,
        });
    }

    ctx.restore();
}

// A dotted rule above/below the list when there is more of it in that direction,
// in the same idiom as the section dividers.
function drawScrollHint(game, { L, viewTop, viewBottom, contentHeight, viewportHeight }) {
    const ctx = game.ctx;
    const scroll = game.journeyMapScroll;
    const max = Math.max(0, contentHeight - viewportHeight);

    if (scroll > 2) drawDivider(ctx, L.centerX - L.width * 0.12, L.centerX + L.width * 0.12, viewTop - game.baseUnit * 0.5);
    if (scroll < max - 2) drawDivider(ctx, L.centerX - L.width * 0.12, L.centerX + L.width * 0.12, viewBottom + game.baseUnit * 0.8);
}

/** @returns {boolean} true when the click was consumed. */
export function handleJourneyMapClick(game, x, y) {
    const map = game.journeyMapButtons;
    if (!map) return false;

    if (game.isClickInButton(x, y, map.back)) {
        game.goToModeSelect();
        return true;
    }

    for (const tile of map.levels ?? []) {
        if (!game.isClickInButton(x, y, tile)) continue;
        if (tile.unlocked) game.beginJourneyLevel(tile.level);
        return true;
    }

    return false;
}
