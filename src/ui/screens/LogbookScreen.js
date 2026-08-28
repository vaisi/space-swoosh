// LogbookScreen.js
// Journey discovery journal: scrollable tall cards — icon left (1/3), text right (2/3).
// Changes:
// - Picture well is a playfield specimen (LogbookGlyphs): finish gate spans the
//   well, relative sizes match in-game (sparkle smaller than a rock, etc.).
// - Obstacles / Boosts list only observed or known entries (no UNKNOWN CONTACT
//   placeholders, no blank scroll gap). Empty category copy when none logged.
// - Screen title SPACE LOG (was LOGBOOK).
// - Journey tab (category `levels`): text-only rows — no left thumbnail, no
//   KNOWN/OBSERVED tag; titles are Day N from catalog.
// - Night paper: black-hole icon gradient uses inkRgb (bone) instead of near-black.
// - No longer draws the gray inset screen frame (removed app-wide).
// - Created file: observe/known states, empty Spock copy, From the Void stub.

import { color, font } from '../../brand/tokens.js';
import {
    drawFramedTile,
    setLabelType,
    resetType,
} from '../../utils/BrandDraw.js';
import { drawLogbookSpecimen } from './LogbookGlyphs.js';
import { screenLayout, fitPx, wrapLines } from '../ScreenKit.js';
import {
    LOGBOOK_CATEGORIES,
    EMPTY_LOGBOOK_COPY,
    EMPTY_CATEGORY_COPY,
    OBSERVED_PENDING_LINES,
    entriesForCategory,
} from '../../config/LogbookEntries.js';
import {
    getEntryState,
} from '../../services/LogbookProgress.js';

function pendingLine(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * 17) % 997;
    return OBSERVED_PENDING_LINES[hash % OBSERVED_PENDING_LINES.length];
}

/** Draws the logbook and returns hit-boxes for Game click routing. */
export function renderLogbook(game) {
    const ctx = game.ctx;
    const unit = game.baseUnit;
    const L = screenLayout(game, unit);
    const progress = game.logbook?.progress;

    const header = game.drawScreenHeader('SPACE LOG', { back: true });

    const buttons = { back: header.backRect, tabs: [], entries: [] };
    const category = game.logbookCategory || 'obstacles';

    // Category tabs
    const tabY = header.contentTop - L.section * 0.15;
    const tabH = unit * 2.8;
    const tabGap = unit * 0.45;
    const tabW = (L.width - tabGap * (LOGBOOK_CATEGORIES.length - 1)) / LOGBOOK_CATEGORIES.length;
    let tabX = L.left;

    for (const cat of LOGBOOK_CATEGORIES) {
        const active = cat.id === category;
        const rect = { x: tabX, y: tabY, width: tabW, height: tabH, id: cat.id };
        buttons.tabs.push(rect);

        ctx.save();
        ctx.fillStyle = active ? color.ink : color.paperTint;
        ctx.strokeStyle = color.ink;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(tabX, tabY, tabW, tabH);
        ctx.fill();
        ctx.stroke();

        setLabelType(ctx, Math.max(9, unit * 0.85), active ? 700 : 500);
        ctx.fillStyle = active ? color.paper : color.ink55;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = L.isMobile && cat.id === 'void' ? 'VOID' : cat.label.toUpperCase();
        fitPx(ctx, label, tabW - unit * 0.35, Math.max(9, unit * 0.85), 8,
            (px) => setLabelType(ctx, px, active ? 700 : 500));
        ctx.fillText(label, tabX + tabW / 2, tabY + tabH / 2);
        resetType(ctx);
        ctx.restore();

        tabX += tabW + tabGap;
    }

    let viewTop = tabY + tabH + L.block;
    const viewBottom = L.bottom - unit * 0.5;
    const viewportHeight = viewBottom - viewTop;

    if (category === 'void') {
        drawEmptyState(ctx, L, unit, viewTop, viewBottom, EMPTY_CATEGORY_COPY.void);
        buttons.metrics = { contentHeight: 0, viewportHeight, viewTop };
        return buttons;
    }

    const journeyTab = category === 'levels';
    const catalog = entriesForCategory(category);
    const entries = journeyTab
        ? catalog
        : catalog.filter((entry) => progress && getEntryState(progress, entry.id) !== 'locked');

    if (entries.length === 0) {
        drawEmptyState(
            ctx, L, unit, viewTop, viewBottom,
            EMPTY_CATEGORY_COPY[category] || EMPTY_LOGBOOK_COPY,
        );
        buttons.metrics = { contentHeight: 0, viewportHeight, viewTop };
        return buttons;
    }

    const listTop = viewTop;
    const listH = viewBottom - listTop;
    const rowH = Math.max(unit * 13, L.isMobile ? 136 : 152);
    const gap = unit * 1.1;
    const contentHeight = entries.length * (rowH + gap) - gap;
    const scroll = game.logbookScroll || 0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(L.left - unit * 0.2, listTop, L.width + unit * 0.4, listH);
    ctx.clip();
    ctx.translate(0, -scroll);

    let y = listTop;
    for (const entry of entries) {
        const state = progress ? getEntryState(progress, entry.id) : 'locked';
        const screenY = y - scroll;

        if (state !== 'locked') {
            buttons.entries.push({
                x: L.left, y: screenY, width: L.width, height: rowH, id: entry.id,
            });
        }

        drawFramedTile(ctx, L.left, y, L.width, rowH, {
            surface: color.paperTint,
            stroke: state === 'known' ? color.signal
                : state === 'observed' ? color.ink
                    : color.ink30,
        });

        const textPad = unit * 1.4;
        const titlePx = Math.max(15, unit * 1.55);
        const statusPx = Math.max(11, unit * 1.05);
        const bodyPx = Math.max(13, unit * 1.25);

        let textLeft;
        let textInnerW;

        if (journeyTab) {
            // Full-width text — no empty # thumbnail, no KNOWN tag.
            textLeft = L.left + textPad;
            textInnerW = L.width - textPad * 2;
        } else {
            // 1/3 picture well | 2/3 text
            const colGap = unit * 1.2;
            const picW = (L.width - colGap) / 3;
            const textW = L.width - picW - colGap;
            const picX = L.left;
            const textX = L.left + picW + colGap;

            const wellPad = unit * 0.9;
            const wellX = picX + wellPad;
            const wellY = y + wellPad;
            const wellW = picW - wellPad * 2;
            const wellH = rowH - wellPad * 2;
            ctx.save();
            ctx.fillStyle = color.paper;
            ctx.fillRect(wellX, wellY, wellW, wellH);
            ctx.strokeStyle = color.ink12;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(wellX + 0.75, wellY + 0.75, wellW - 1.5, wellH - 1.5);
            ctx.restore();

            if (state === 'locked') {
                ctx.save();
                ctx.strokeStyle = color.ink12;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(wellX + wellW / 2, wellY + wellH / 2, Math.min(wellW, wellH) * 0.18, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else {
                drawLogbookSpecimen(ctx, entry.icon, wellX, wellY, wellW, wellH, false);
            }

            textLeft = textX + textPad * 0.2;
            textInnerW = textW - textPad * 1.2;
        }

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        if (state === 'locked') {
            setLabelType(ctx, titlePx, 700);
            ctx.fillStyle = color.ink30;
            const lockedLabel = journeyTab
                ? entry.name.toUpperCase()
                : 'UNKNOWN CONTACT';
            fitPx(ctx, lockedLabel, textInnerW, titlePx, unit * 1.1,
                (px) => setLabelType(ctx, px, 700));
            ctx.fillText(lockedLabel, textLeft, y + rowH / 2 - titlePx * 0.55);
            resetType(ctx);
        } else if (journeyTab) {
            setLabelType(ctx, titlePx, 700);
            ctx.fillStyle = color.ink;
            fitPx(ctx, entry.name.toUpperCase(), textInnerW, titlePx, unit * 1.15,
                (px) => setLabelType(ctx, px, 700));
            ctx.fillText(entry.name.toUpperCase(), textLeft, y + textPad);
            resetType(ctx);

            const bodyY = y + textPad + titlePx * 1.35;
            ctx.font = `500 ${bodyPx}px ${font.ui}`;
            ctx.fillStyle = color.ink80;
            const body = state === 'known' ? entry.definition : pendingLine(entry.id);
            const maxLines = Math.max(3, Math.floor((y + rowH - bodyY - textPad) / (bodyPx * 1.4)));
            wrapLines(ctx, body, textInnerW, maxLines).forEach((line, i) => {
                ctx.fillText(line, textLeft, bodyY + i * bodyPx * 1.4);
            });
        } else {
            setLabelType(ctx, titlePx, 700);
            ctx.fillStyle = color.ink;
            fitPx(ctx, entry.name.toUpperCase(), textInnerW, titlePx, unit * 1.15,
                (px) => setLabelType(ctx, px, 700));
            ctx.fillText(entry.name.toUpperCase(), textLeft, y + textPad);
            resetType(ctx);

            const statusY = y + textPad + titlePx * 1.25;
            setLabelType(ctx, statusPx, 700);
            ctx.fillStyle = state === 'known' ? color.signal : color.ink55;
            ctx.fillText(state === 'known' ? 'KNOWN' : 'OBSERVED', textLeft, statusY);
            resetType(ctx);

            const bodyY = statusY + statusPx * 1.55;
            ctx.font = `500 ${bodyPx}px ${font.ui}`;
            ctx.fillStyle = color.ink80;
            const body = state === 'known' ? entry.definition : pendingLine(entry.id);
            const maxLines = Math.max(2, Math.floor((y + rowH - bodyY - textPad) / (bodyPx * 1.4)));
            wrapLines(ctx, body, textInnerW, maxLines).forEach((line, i) => {
                ctx.fillText(line, textLeft, bodyY + i * bodyPx * 1.4);
            });
        }
        ctx.restore();

        y += rowH + gap;
    }

    ctx.restore();

    buttons.metrics = {
        contentHeight,
        viewportHeight: listH,
        viewTop: listTop,
    };
    return buttons;
}

function drawEmptyState(ctx, L, unit, viewTop, viewBottom, copy) {
    const midY = (viewTop + viewBottom) / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `500 ${Math.max(14, unit * 1.3)}px ${font.ui}`;
    ctx.fillStyle = color.ink55;
    wrapLines(ctx, copy, L.width * 0.88, 5).forEach((line, i, lines) => {
        ctx.fillText(line, L.centerX, midY + (i - (lines.length - 1) / 2) * unit * 1.85);
    });
    ctx.restore();
}

/** @returns {boolean} true when the click was consumed. */
export function handleLogbookClick(game, x, y) {
    const buttons = game.logbookButtons;
    if (!buttons) return false;

    if (buttons.back && game.isClickInButton(x, y, buttons.back)) {
        game.showMenu();
        return true;
    }

    for (const tab of buttons.tabs || []) {
        if (game.isClickInButton(x, y, tab)) {
            game.logbookCategory = tab.id;
            game.logbookScroll = 0;
            return true;
        }
    }

    return false;
}

export function clampLogbookScroll(game, value) {
    const metrics = game.logbookButtons?.metrics;
    if (!metrics) return 0;
    const max = Math.max(0, metrics.contentHeight - metrics.viewportHeight);
    return Math.min(max, Math.max(0, value));
}
