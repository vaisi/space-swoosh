// Keycaps.js
// Canvas keyboard glyphs for teaching copy: a SPACE bar and ← / → keys.
// Changes:
// - Shared SPACE keycap (was MilestoneManager-only) plus square arrow keys
//   so Open Space helpers can say “press [key] space / key”.

import { color, font } from '../brand/tokens.js';

const SPACE_LABEL = 'SPACE';

function fillRoundRect(ctx, left, top, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(left + radius, top);
    ctx.arcTo(left + w, top, left + w, top + h, radius);
    ctx.arcTo(left + w, top + h, left, top + h, radius);
    ctx.arcTo(left, top + h, left, top, radius);
    ctx.arcTo(left, top, left + w, top, radius);
    ctx.closePath();
    ctx.fill();
}

/** @param {CanvasRenderingContext2D} ctx */
export function spaceKeyWidth(ctx, fontSize) {
    ctx.font = `700 ${fontSize * 0.72}px ${font.ui}`;
    return ctx.measureText(SPACE_LABEL).width + fontSize * 0.7;
}

export function arrowKeyWidth(fontSize) {
    return fontSize * 1.28;
}

/**
 * Wide SPACE bar. Left edge at x, vertically centred on y.
 * @returns {number} advance including a hair of trailing gap
 */
export function drawSpaceKey(ctx, x, y, fontSize) {
    const keyH = fontSize * 1.05;
    const padX = fontSize * 0.28;
    ctx.font = `700 ${fontSize * 0.72}px ${font.ui}`;
    const labelW = ctx.measureText(SPACE_LABEL).width;
    const keyW = labelW + padX * 2;
    const left = x;
    const top = y - keyH / 2;

    ctx.fillStyle = color.ink;
    fillRoundRect(ctx, left, top, keyW, keyH, fontSize * 0.18);

    ctx.fillStyle = color.paper;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SPACE_LABEL, left + keyW / 2, y + fontSize * 0.04);
    return keyW + fontSize * 0.15;
}

/**
 * Square arrow key with a drawn ← / →, not the words left/right.
 * @param {1 | -1} dir
 * @returns {number} advance including trailing gap
 */
export function drawArrowKey(ctx, x, y, fontSize, dir) {
    const keyW = arrowKeyWidth(fontSize);
    const keyH = fontSize * 1.05;
    const left = x;
    const top = y - keyH / 2;

    ctx.fillStyle = color.ink;
    fillRoundRect(ctx, left, top, keyW, keyH, fontSize * 0.18);

    const cx = left + keyW / 2;
    const stem = keyW * 0.28;
    const head = keyW * 0.22;
    const tipX = cx + dir * stem;
    const backX = cx - dir * stem;
    ctx.strokeStyle = color.paper;
    ctx.fillStyle = color.paper;
    ctx.lineWidth = Math.max(1.6, fontSize * 0.12);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(backX, y);
    ctx.lineTo(tipX, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tipX, y);
    ctx.lineTo(tipX - dir * head, y - head * 0.85);
    ctx.lineTo(tipX - dir * head, y + head * 0.85);
    ctx.closePath();
    ctx.fill();

    return keyW + fontSize * 0.15;
}

const TOKEN_RE = /\{(space|left|right)\}/g;

function tokenWidth(ctx, token, fontSize) {
    if (token === 'space') return spaceKeyWidth(ctx, fontSize);
    return arrowKeyWidth(fontSize) + fontSize * 0.15;
}

function drawToken(ctx, token, x, y, fontSize) {
    if (token === 'space') return drawSpaceKey(ctx, x, y, fontSize);
    return drawArrowKey(ctx, x, y, fontSize, token === 'right' ? 1 : -1);
}

/** Measure a line that may embed `{space}` / `{left}` / `{right}` keycaps. */
export function measureRichWidth(ctx, text, fontSize) {
    const re = new RegExp(TOKEN_RE.source, 'g');
    let width = 0;
    let last = 0;
    ctx.font = `500 ${fontSize}px ${font.ui}`;
    let match;
    while ((match = re.exec(text))) {
        width += ctx.measureText(text.slice(last, match.index)).width;
        width += tokenWidth(ctx, match[1], fontSize);
        last = match.index + match[0].length;
        ctx.font = `500 ${fontSize}px ${font.ui}`;
    }
    width += ctx.measureText(text.slice(last)).width;
    return width;
}

/** Centre a mixed text+keycap line on (cx, cy). */
export function drawRichLine(ctx, text, cx, cy, fontSize) {
    const totalW = measureRichWidth(ctx, text, fontSize);
    let x = cx - totalW / 2;
    const re = new RegExp(TOKEN_RE.source, 'g');
    let last = 0;
    let match;
    ctx.textBaseline = 'middle';

    while ((match = re.exec(text))) {
        ctx.textAlign = 'left';
        ctx.fillStyle = color.ink;
        ctx.font = `500 ${fontSize}px ${font.ui}`;
        const chunk = text.slice(last, match.index);
        if (chunk) {
            ctx.fillText(chunk, x, cy);
            x += ctx.measureText(chunk).width;
        }
        x += drawToken(ctx, match[1], x, cy, fontSize);
        last = match.index + match[0].length;
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = color.ink;
    ctx.font = `500 ${fontSize}px ${font.ui}`;
    const tail = text.slice(last);
    if (tail) ctx.fillText(tail, x, cy);
}
