// ControlHint.js
// Open World steer overlay: bouncing TAP / click+SPACE keycap, or a sliding
// swipe/drag glyph. Journey never shows this — profile.runsTutorial is false.
// Changes:
// - Desktop helpers embed key icons: SPACE bar, ← / → keys (not the words
//   left/right). Zigzag: “Click or press [SPACE] space”.

import { color } from '../brand/tokens.js';
import { FLIGHT_STYLE } from '../config/flightStyle.js';
import { isDesktopWeb } from '../core/platform.js';
import { drawRichLine, measureRichWidth } from './Keycaps.js';

/**
 * @typedef {'tap' | 'clickSpace' | 'swipeLeft' | 'swipeRight' | 'dragLeft' | 'dragRight'} SteerCueKind
 */

/**
 * @param {import('../game/Game.js').Game} game
 * @returns {SteerCueKind | null}
 */
export function activeSteerCue(game) {
    if (!game?.profile?.runsTutorial) return null;
    if (!game.isPlaying() || game.isPaused || game.isGameOver) return null;
    if (game.levelIntro?.active) return null;
    if (game.hudRevealPhase === 'title' || game.hudRevealPhase === 'wait') return null;

    const history = game.obstacleManager?.movementHistory;
    if (!history) return null;

    const desktop = isDesktopWeb();
    if (game.flightStyle === FLIGHT_STYLE.zigzag) {
        if (history.flip) return null;
        return desktop ? 'clickSpace' : 'tap';
    }

    if (!history.left) return desktop ? 'dragLeft' : 'swipeLeft';
    if (!history.right) return desktop ? 'dragRight' : 'swipeRight';
    return null;
}

const LABELS = {
    tap: 'TAP',
    clickSpace: 'Click or press {space} space',
    swipeLeft: 'SWIPE LEFT',
    swipeRight: 'SWIPE RIGHT',
    dragLeft: 'drag left or press {left} key',
    dragRight: 'drag right or press {right} key',
};

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../game/Game.js').Game} game
 */
export function renderControlHint(ctx, game) {
    const kind = activeSteerCue(game);
    if (!kind) return;

    const unit = game.baseUnit;
    const cx = game.width / 2;
    const cy = game.height * 0.62;
    const now = performance.now();
    const label = LABELS[kind];

    ctx.save();
    ctx.globalAlpha *= 0.96;

    if (kind === 'tap' || kind === 'clickSpace') {
        drawTapGlyph(ctx, cx, cy, unit, now, kind === 'clickSpace');
    } else {
        const dir = kind === 'swipeRight' || kind === 'dragRight' ? 1 : -1;
        drawSwipeGlyph(ctx, cx, cy, unit, now, dir, kind.startsWith('drag'));
    }

    drawCueLabel(ctx, cx, cy - unit * 7.2, unit, label, game.width);
    ctx.restore();
}

function drawCueLabel(ctx, cx, y, unit, label, stageWidth) {
    const maxW = Math.max(80, stageWidth - unit * 6);
    let fontSize = Math.max(13, unit * 1.35);
    while (fontSize > 11 && measureRichWidth(ctx, label, fontSize) > maxW - unit * 2.4) {
        fontSize -= 0.5;
    }
    const width = measureRichWidth(ctx, label, fontSize);
    const padX = unit * 1.4;
    const padY = unit * 0.85;
    const h = Math.max(fontSize * 1.15, fontSize) + padY * 2;
    const w = Math.min(maxW, width + padX * 2);

    ctx.fillStyle = `rgba(${color.paperRgb}, 0.94)`;
    ctx.fillRect(cx - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = color.ink;
    ctx.lineWidth = Math.max(1.5, unit * 0.12);
    ctx.strokeRect(cx - w / 2, y - h / 2, w, h);

    drawRichLine(ctx, label, cx, y, fontSize);
}

function drawTapGlyph(ctx, cx, cy, unit, now, isClick) {
    const cycle = (now / 1000) % 1.15;
    const press = cycle < 0.42
        ? Math.sin((cycle / 0.42) * Math.PI)
        : 0;
    const bounce = Math.abs(Math.sin(now / 180)) * unit * 0.55;
    const scale = 1 - press * 0.18;
    const y = cy - bounce + press * unit * 0.9;

    // Expanding press ring.
    if (press > 0.05) {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = color.ink;
        ctx.globalAlpha *= 0.45 * (1 - press * 0.5);
        ctx.lineWidth = unit * 0.18;
        ctx.arc(cx, y + unit * 1.1, unit * (2.2 + press * 2.4), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    ctx.save();
    ctx.translate(cx, y);
    ctx.scale(scale, scale);
    if (isClick) {
        drawPointer(ctx, 0, 0, unit);
    } else {
        drawFinger(ctx, 0, 0, unit);
    }
    ctx.restore();
}

function drawSwipeGlyph(ctx, cx, cy, unit, now, dir, isDrag) {
    const period = 1.35;
    const cycle = (now / 1000) % period;
    const t = Math.min(1, cycle / 0.95);
    const eased = t * t * (3 - 2 * t);
    const travel = unit * 9;
    const x = cx + dir * travel * (eased - 0.5);
    const y = cy + Math.sin(eased * Math.PI) * unit * -0.35;

    // Trail chevrons.
    ctx.save();
    ctx.strokeStyle = color.ink;
    ctx.fillStyle = color.ink;
    ctx.lineWidth = Math.max(2, unit * 0.16);
    ctx.globalAlpha *= 0.35;
    for (let i = 0; i < 3; i++) {
        const cxn = cx + dir * unit * (2.2 + i * 1.8);
        drawChevron(ctx, cxn, cy, unit * 1.1, dir);
    }
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    if (isDrag) {
        drawPointer(ctx, 0, 0, unit);
    } else {
        drawFinger(ctx, 0, 0, unit);
    }
    ctx.restore();
}

function drawFinger(ctx, x, y, unit) {
    const r = unit * 1.35;
    ctx.fillStyle = color.ink;
    ctx.beginPath();
    ctx.arc(x, y + unit * 0.2, r, 0, Math.PI * 2);
    ctx.fill();
    // Knuckle / pad highlight so it reads as a press, not a rock.
    ctx.fillStyle = color.paper;
    ctx.beginPath();
    ctx.arc(x - unit * 0.28, y - unit * 0.15, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
}

function drawPointer(ctx, x, y, unit) {
    ctx.fillStyle = color.ink;
    ctx.beginPath();
    ctx.moveTo(x - unit * 0.2, y - unit * 2.1);
    ctx.lineTo(x + unit * 1.6, y + unit * 0.55);
    ctx.lineTo(x + unit * 0.35, y + unit * 0.45);
    ctx.lineTo(x + unit * 0.85, y + unit * 2.0);
    ctx.lineTo(x + unit * 0.15, y + unit * 2.15);
    ctx.lineTo(x - unit * 0.35, y + unit * 0.55);
    ctx.closePath();
    ctx.fill();
}

function drawChevron(ctx, x, y, size, dir) {
    ctx.beginPath();
    ctx.moveTo(x - dir * size * 0.5, y - size * 0.7);
    ctx.lineTo(x + dir * size * 0.45, y);
    ctx.lineTo(x - dir * size * 0.5, y + size * 0.7);
    ctx.stroke();
}
