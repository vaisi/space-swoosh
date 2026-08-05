// LogbookScreen.js
// Journey discovery journal: scrollable tall cards — icon left (1/3), text right (2/3).
// Changes:
// - No longer draws the gray inset screen frame (removed app-wide).
// - Scrollable taller cards again (not a one-card pager). Real in-game obstacle
//   silhouettes (circle / triangle / square / pentagon / star / cluster…).
// - Created file: observe/known states, empty Spock copy, From the Void stub.

import { color, font } from '../../brand/tokens.js';
import {
    drawFramedTile,
    drawSparkle,
    setLabelType,
    setMonoType,
    resetType,
} from '../../utils/BrandDraw.js';
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
    hasAnyEntries,
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

    const header = game.drawScreenHeader('LOGBOOK', { back: true });

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

    if (!progress || !hasAnyEntries(progress)) {
        const bannerPx = Math.max(12, unit * 1.15);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `500 ${bannerPx}px ${font.ui}`;
        ctx.fillStyle = color.ink55;
        const bannerLines = wrapLines(ctx, EMPTY_LOGBOOK_COPY, L.width * 0.92, 3);
        bannerLines.forEach((line, i) => {
            ctx.fillText(line, L.centerX, viewTop + bannerPx * 0.6 + i * bannerPx * 1.4);
        });
        ctx.restore();
        viewTop += bannerLines.length * bannerPx * 1.4 + L.block;
    }

    const listTop = viewTop;
    const listH = viewBottom - listTop;
    const entries = entriesForCategory(category);
    const rowH = Math.max(unit * 11, L.isMobile ? 118 : 130);
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
        const state = getEntryState(progress, entry.id);
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

        // 1/3 picture well | 2/3 text
        const colGap = unit * 1.2;
        const picW = (L.width - colGap) / 3;
        const textW = L.width - picW - colGap;
        const picX = L.left;
        const textX = L.left + picW + colGap;

        // Picture well
        const wellPad = unit * 1.1;
        ctx.save();
        ctx.fillStyle = color.paper;
        ctx.fillRect(picX + wellPad, y + wellPad, picW - wellPad * 2, rowH - wellPad * 2);
        ctx.strokeStyle = color.ink12;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
            picX + wellPad + 0.75,
            y + wellPad + 0.75,
            picW - wellPad * 2 - 1.5,
            rowH - wellPad * 2 - 1.5
        );
        ctx.restore();

        const iconSize = Math.min(picW - wellPad * 2, rowH - wellPad * 2) * 0.42;
        const iconCx = picX + picW / 2;
        const iconCy = y + rowH / 2;

        if (state === 'locked') {
            ctx.save();
            ctx.strokeStyle = color.ink12;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(iconCx, iconCy, iconSize * 0.55, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else {
            drawEntryIcon(ctx, entry.icon, iconCx, iconCy, iconSize, false);
        }

        const textPad = unit * 1.4;
        const textLeft = textX + textPad * 0.2;
        const textInnerW = textW - textPad * 1.2;
        const titlePx = Math.max(15, unit * 1.55);
        const statusPx = Math.max(11, unit * 1.05);
        const bodyPx = Math.max(13, unit * 1.25);

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        if (state === 'locked') {
            setLabelType(ctx, titlePx, 700);
            ctx.fillStyle = color.ink30;
            fitPx(ctx, 'UNKNOWN CONTACT', textInnerW, titlePx, unit * 1.1,
                (px) => setLabelType(ctx, px, 700));
            ctx.fillText('UNKNOWN CONTACT', textLeft, y + rowH / 2 - titlePx * 0.55);
            resetType(ctx);
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

/**
 * Draw the real in-game silhouette for a catalog icon id.
 * Matches ObstacleManager shapes (circle / triangle / square / pentagon / star…).
 */
export function drawEntryIcon(ctx, icon, cx, cy, size, dimmed) {
    ctx.save();
    ctx.translate(cx, cy);
    const ink = dimmed ? color.ink30 : color.ink;
    const signal = dimmed ? 'rgba(0, 0, 255, 0.35)' : color.signal;
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(2, size * 0.08);
    ctx.lineJoin = 'miter';

    switch (icon) {
        case 'asteroidCircle':
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'asteroidTriangle':
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.48);
            ctx.lineTo(size * 0.48 * Math.cos(Math.PI / 6), size * 0.48 * Math.sin(Math.PI / 6));
            ctx.lineTo(-size * 0.48 * Math.cos(Math.PI / 6), size * 0.48 * Math.sin(Math.PI / 6));
            ctx.closePath();
            ctx.fill();
            break;
        case 'asteroidSquare': {
            const half = size * 0.45 * 0.7;
            ctx.beginPath();
            ctx.rect(-half, -half, half * 2, half * 2);
            ctx.fill();
            break;
        }
        case 'sideBarrier':
            ctx.fillRect(-size * 0.48, -size * 0.42, size * 0.2, size * 0.84);
            ctx.fillRect(size * 0.28, -size * 0.42, size * 0.2, size * 0.84);
            break;
        case 'complex':
            // Core disc + orbiting moons (matches ComplexAsteroid render).
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
            ctx.fill();
            for (let i = 0; i < 3; i++) {
                const a = (Math.PI * 2 * i) / 3;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * size * 0.42, Math.sin(a) * size * 0.42, size * 0.1, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'moving':
            // Pentagon (MovingAsteroid).
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                const x = size * 0.45 * Math.cos(a);
                const y = size * 0.45 * Math.sin(a);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            break;
        case 'shooting':
            // 8-point star (ShootingAsteroid).
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const r = i % 2 === 0 ? size * 0.48 : size * 0.24;
                const a = (i * Math.PI) / 4;
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            break;
        case 'pulsating':
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.48, 0, Math.PI * 2);
            ctx.strokeStyle = color.ink30;
            ctx.stroke();
            break;
        case 'wormhole':
            ctx.strokeStyle = signal;
            ctx.setLineDash([size * 0.14, size * 0.1]);
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            break;
        case 'blackhole': {
            const g = ctx.createRadialGradient(0, 0, size * 0.05, 0, 0, size * 0.5);
            g.addColorStop(0, ink);
            g.addColorStop(0.55, 'rgba(26,26,26,0.55)');
            g.addColorStop(1, 'rgba(26,26,26,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = ink;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'spaceBoop':
            setLabelType(ctx, size * 0.32, 700);
            ctx.fillStyle = ink;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('BOOP', 0, 0);
            resetType(ctx);
            break;
        case 'shield':
            ctx.strokeStyle = signal;
            ctx.lineWidth = Math.max(2.5, size * 0.1);
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = ink;
            ctx.lineWidth = Math.max(2, size * 0.1);
            ctx.beginPath();
            ctx.moveTo(-size * 0.2, 0);
            ctx.lineTo(size * 0.2, 0);
            ctx.moveTo(0, -size * 0.2);
            ctx.lineTo(0, size * 0.2);
            ctx.stroke();
            break;
        case 'pointsSparkle':
            drawSparkle(ctx, 0, 0, size * 0.48, { fill: signal });
            break;
        case 'styleSwoosh':
            ctx.strokeStyle = signal;
            ctx.lineWidth = Math.max(2.5, size * 0.1);
            ctx.beginPath();
            ctx.moveTo(-size * 0.42, size * 0.15);
            ctx.quadraticCurveTo(0, -size * 0.42, size * 0.42, size * 0.1);
            ctx.stroke();
            break;
        case 'deflectorSmash':
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = signal;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
            ctx.stroke();
            break;
        case 'finishGate':
            ctx.strokeStyle = color.ink30;
            ctx.setLineDash([size * 0.12, size * 0.1]);
            ctx.lineWidth = Math.max(2.5, size * 0.09);
            ctx.beginPath();
            ctx.moveTo(-size * 0.45, 0);
            ctx.lineTo(size * 0.45, 0);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = signal;
            ctx.beginPath();
            ctx.arc(-size * 0.45, 0, size * 0.12, 0, Math.PI * 2);
            ctx.arc(size * 0.45, 0, size * 0.12, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'spaceTravelBoost':
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.42);
            ctx.lineTo(size * 0.3, size * 0.36);
            ctx.lineTo(0, size * 0.14);
            ctx.lineTo(-size * 0.3, size * 0.36);
            ctx.closePath();
            ctx.fill();
            break;
        case 'level':
            setMonoType(ctx, size * 0.5, 700);
            ctx.fillStyle = ink;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('#', 0, 0);
            resetType(ctx);
            break;
        default:
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
            ctx.stroke();
    }
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
