// LevelOutcomeScreen.js
// The end of a Journey level: the verdict, the three objectives and how you did
// against each, and where to go next. Replaces the Open Space game-over screen
// while in Journey — there is no score submission here.
// Changes:
// - Outcome tallies / rows use descriptor.starSlots (1/1, 2/2, or 3/3).
// - Points/smash rows only appear when that slot exists for the level.
// - Stopped calling removed `game.drawScreenFrame()` — that threw after the
//   flyout and left a blank paper end screen (dead end after level clear).
// - Third objective value is smash count vs `smashTarget` (shield destroy mission).
// - Verdict subtitle reads `outcome.flavor` from CopyBank (picked once when the
//   level ends) so fail / partial / flawless / finale lines rotate visit to visit.
// - Stars are now one row per objective: a small sparkle, a single-line label,
//   and the number it was measured against. That merges the old star band and
//   the separate stats band (which repeated what stars 1 and 2 already say) into
//   one, and drops the two-line wrapped captions and the ring markers. Unearned
//   stars are hollow rather than a faint fill, and a newly-won one carries a
//   small NEW tag.
// - Secondary actions pair two-up, so the four-action clear screen is three rows
//   of buttons instead of four.
// - Created file.

import { color, font } from '../../brand/tokens.js';
import {
    drawSparkle,
    setLabelType,
    setMonoType,
    setDisplayType,
    resetType,
} from '../../utils/BrandDraw.js';
import { screenLayout, fitPx, drawDivider, drawRuledLabel } from '../ScreenKit.js';
import { starLabelsFor, TOTAL_LEVELS } from '../../config/JourneyConfig.js';
import { ScoreService } from '../../services/ScoreService.js';

// Every vertical size on the screen, derived from one unit so the whole thing can
// be scaled to fit in a single pass. `baseUnit` is width-derived on desktop, which
// a short window can't afford — measure, then shrink if it doesn't fit.
function metrics(unit, { isMobile, actionRows: rowCount, starSlots }) {
    const titlePx = isMobile ? Math.min(unit * 3, 34) : unit * 2.8;
    const subPx = isMobile ? Math.min(unit * 1.4, 16) : unit * 1.3;
    const tallyPx = Math.max(9, unit * 0.92);
    const objectiveH = Math.max(unit * 2.3, tallyPx * 2.4);
    const buttonGap = unit * 1.3;
    const buttonHeight = isMobile ? unit * 5.2 : unit * 4.7;
    const slots = Math.max(1, starSlots || 1);

    const m = {
        unit,
        titlePx,
        subPx,
        tallyPx,
        objectiveH,
        objectivesH: objectiveH * slots,
        titleGap: unit * 1.4,
        bandGap: unit * 2.4,
        buttonGap,
        buttonHeight,
        buttonsH: buttonHeight * rowCount + buttonGap * (rowCount - 1),
        starSlots: slots,
    };
    m.verdictH = titlePx * 1.1 + m.titleGap + subPx * 1.3;
    m.totalH = m.verdictH + m.bandGap * 3 + tallyPx * 1.9 + m.objectivesH + m.buttonsH;
    return m;
}

export function renderLevelOutcome(game) {
    const ctx = game.ctx;
    const L = screenLayout(game, game.baseUnit);
    const outcome = game.levelOutcome;
    if (!outcome) return {};

    const starSlots = outcome.descriptor.starSlots ?? 3;
    const rows = actionRows(outcomeActions(outcome));
    const shape = { isMobile: L.isMobile, actionRows: rows.length, starSlots };
    const available = L.bottom - L.top - game.baseUnit * 0.5;

    let m = metrics(game.baseUnit, shape);
    if (m.totalH > available) {
        m = metrics(game.baseUnit * (available / m.totalH), shape);
    }

    const unit = m.unit;
    const { titlePx, subPx, tallyPx, buttonGap, buttonHeight } = m;
    const buttonWidth = Math.min(unit * 30, L.width);

    let y = Math.max(L.top + unit * 0.5, (game.height - m.totalH) / 2);

    // --- Verdict -------------------------------------------------------------
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color.ink;
    const title = verdictTitle(outcome);
    fitPx(ctx, title, L.width, titlePx, unit * 1.6, (px) => setDisplayType(ctx, px));
    ctx.fillText(title, L.centerX, y + titlePx * 0.55);
    resetType(ctx);

    y += titlePx * 1.1 + m.titleGap;

    ctx.font = `500 ${subPx}px ${font.ui}`;
    ctx.fillStyle = color.ink55;
    ctx.fillText(verdictSubtitle(outcome), L.centerX, y + subPx * 0.6);
    ctx.restore();

    // --- Objectives ----------------------------------------------------------
    // The ruled label doubles as the band header and the tally, so the band
    // needs no divider above it.
    y += subPx * 1.3 + m.bandGap;
    const earned = outcome.stars.slice(0, starSlots).filter(Boolean).length;
    drawRuledLabel(ctx, {
        text: `${earned} / ${starSlots} STARS`,
        centerX: L.centerX,
        y,
        width: L.width,
        px: tallyPx,
    });

    y += tallyPx * 1.9;
    const labels = starLabelsFor(outcome.descriptor);
    const values = starValues(outcome, starSlots);
    for (let i = 0; i < starSlots; i++) {
        drawObjectiveRow(game, {
            L,
            unit,
            top: y + i * m.objectiveH,
            height: m.objectiveH,
            earned: outcome.stars[i],
            isNew: Boolean(outcome.newStars?.[i]),
            label: labels[i],
            value: values[i],
        });
    }

    y += m.objectivesH + m.bandGap;
    drawDivider(ctx, L.left, L.right, y);
    y += m.bandGap;

    // --- Actions -------------------------------------------------------------
    const buttons = {};
    rows.forEach((row, rowIndex) => {
        const rowY = y + rowIndex * (buttonHeight + buttonGap);
        const isPair = row.length > 1;
        const cellW = isPair
            ? (buttonWidth - buttonGap) / 2
            : buttonWidth;

        row.forEach((action, i) => {
            const x = L.centerX - buttonWidth / 2 + i * (cellW + buttonGap);
            buttons[action.id] = game.drawBrandButton(
                x, rowY, cellW, buttonHeight, action.label,
                {
                    primary: rowIndex === 0 && !isPair,
                    // Paired buttons drop the mono tag and step the label down:
                    // LEVEL SELECT has to fit half a row.
                    tag: isPair ? null : action.tag,
                    labelPx: isPair
                        ? fitButtonLabelPx(ctx, action.label, cellW * 0.82, Math.min(unit * 1.35, 16))
                        : undefined,
                }
            );
        });
    });

    return buttons;
}

function verdictTitle(outcome) {
    if (!outcome.completed) return 'LEVEL FAILED';
    if (outcome.descriptor.level >= TOTAL_LEVELS) return 'JOURNEY COMPLETE';
    return `LEVEL ${outcome.descriptor.level} CLEAR`;
}

function verdictSubtitle(outcome) {
    // Picked once in finishJourneyLevel so re-renders don't reshuffle.
    if (outcome.flavor) return outcome.flavor;
    if (!outcome.completed) return 'Try again.';
    if (outcome.descriptor.level >= TOTAL_LEVELS) return 'You are away. Live long and prosper.';
    const slots = outcome.descriptor.starSlots ?? 3;
    if (outcome.stars.slice(0, slots).every(Boolean)) return 'Flawless. Fascinating.';
    return outcome.descriptor.chapterName;
}

// What each objective was actually measured against — the reason the star did or
// didn't land, which is why the screen no longer needs a separate stats band.
function starValues(outcome, starSlots) {
    const { descriptor, score, points, obstaclesDestroyed } = outcome;
    const all = [
        `${ScoreService.formatScore(Math.floor(score))} / ${ScoreService.formatScore(descriptor.goalKm)}`,
        `${ScoreService.formatScore(points)} / ${ScoreService.formatScore(descriptor.pointsTarget)}`,
        `${obstaclesDestroyed} / ${descriptor.smashTarget}`,
    ];
    return all.slice(0, starSlots);
}

// One objective: sparkle, label, and its figure on the right. Earned rows are
// solid blue and full ink; unearned rows go hollow and drop to ink30, so the
// three read at a glance without any of them shouting.
function drawObjectiveRow(game, { L, unit, top, height, earned, isNew, label, value }) {
    const ctx = game.ctx;
    const midY = top + height / 2;

    const sparkleR = Math.max(4, unit * 0.8);
    const gap = unit * 1.2;
    const labelPx = Math.max(9, unit * 0.95);
    const valuePx = Math.max(10, unit * 1.05);
    const tagPx = Math.max(8, unit * 0.72);

    drawSparkle(ctx, L.left + sparkleR, midY, sparkleR, {
        fill: color.signal,
        stroke: earned ? null : color.ink30,
        lineWidth: 1.25,
    });

    ctx.save();
    ctx.textBaseline = 'middle';

    // NEW sits furthest right so the figures stay in one column.
    let rightEdge = L.right;
    if (isNew && earned) {
        setMonoType(ctx, tagPx);
        ctx.textAlign = 'right';
        ctx.fillStyle = color.signal;
        ctx.fillText('NEW', rightEdge, midY);
        rightEdge -= ctx.measureText('NEW').width + gap * 0.8;
        resetType(ctx);
    }

    setMonoType(ctx, valuePx, earned ? 700 : 400);
    ctx.textAlign = 'right';
    ctx.fillStyle = earned ? color.ink : color.ink30;
    ctx.fillText(value, rightEdge, midY);
    const valueW = ctx.measureText(value).width;

    const labelX = L.left + sparkleR * 2 + gap;
    const labelRoom = rightEdge - valueW - gap - labelX;
    ctx.textAlign = 'left';
    ctx.fillStyle = earned ? color.ink : color.ink30;
    fitPx(ctx, label.toUpperCase(), labelRoom, labelPx, 8, (px) => setLabelType(ctx, px));
    ctx.fillText(label.toUpperCase(), labelX, midY);
    resetType(ctx);

    ctx.restore();
}

function outcomeActions(outcome) {
    if (!outcome.completed) {
        return [
            { id: 'retry', label: 'Retry', tag: '\u21BA' },
            { id: 'levelSelect', label: 'Level Select', tag: '\u2261' },
            { id: 'menu', label: 'Menu', tag: '\u2302' },
        ];
    }

    const actions = [];
    if (outcome.descriptor.level < TOTAL_LEVELS) {
        actions.push({ id: 'next', label: 'Next Level', tag: '\u2192' });
    }
    actions.push({ id: 'retry', label: 'Replay', tag: '\u21BA' });
    actions.push({ id: 'levelSelect', label: 'Level Select', tag: '\u2261' });
    actions.push({ id: 'menu', label: 'Menu', tag: '\u2302' });
    return actions;
}

// Largest label size that still fits the cell, in the button's own font.
function fitButtonLabelPx(ctx, label, maxWidth, startPx) {
    ctx.save();
    const px = fitPx(ctx, label.toUpperCase(), maxWidth, startPx, 9, (size) => {
        ctx.font = `700 ${size}px ${font.ui}`;
        ctx.letterSpacing = `${0.08 * size}px`;
    });
    resetType(ctx);
    ctx.restore();
    return px;
}

// The lead action gets a full-width row of its own; everything after it pairs up
// two to a row, with a trailing odd one going full width again.
function actionRows(actions) {
    if (actions.length === 0) return [];

    const rows = [[actions[0]]];
    for (let i = 1; i < actions.length; i += 2) {
        rows.push(actions.slice(i, i + 2));
    }
    return rows;
}

/** @returns {boolean} true when the click was consumed. */
export function handleLevelOutcomeClick(game, x, y) {
    const buttons = game.levelOutcomeButtons;
    const outcome = game.levelOutcome;
    if (!buttons || !outcome) return false;

    // Don't act on a screen that has barely faded in yet.
    if (game.gameOverAlpha < 0.6) return true;

    if (game.isClickInButton(x, y, buttons.next)) {
        game.beginJourneyLevel(outcome.descriptor.level + 1);
        return true;
    }
    if (game.isClickInButton(x, y, buttons.retry)) {
        game.beginJourneyLevel(outcome.descriptor.level);
        return true;
    }
    if (game.isClickInButton(x, y, buttons.levelSelect)) {
        game.goToJourneyMap();
        return true;
    }
    if (game.isClickInButton(x, y, buttons.menu)) {
        game.goToMenu();
        return true;
    }
    return false;
}
