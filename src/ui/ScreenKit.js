// ScreenKit.js
// Shared canvas layout primitives for the brand screens (menu, options, high
// scores, end screens): one content grid, one vertical rhythm, section rules
// and text that always fits its box.
// Changes:
// - Created file: extracted screen chrome/metrics out of Game.js so every
//   screen shares the same margins, gaps and label treatments.
// - screenLayout reads logical width/height (game.width / game.height) so the
//   HiDPI backing store on canvas.width never inflates the layout grid.

import { color } from '../brand/tokens.js';
import { dottedLine } from '../utils/DrawUtils.js';
import { setLabelType, resetType } from '../utils/BrandDraw.js';

// The content grid every screen draws inside: the framed border plus a gutter,
// with a named vertical rhythm so gaps stay consistent across screens.
// `surface` is anything with `.width` / `.height` in CSS pixels (the Game).
export function screenLayout(surface, unit) {
    const isMobile = window.innerWidth <= 768;
    const frame = unit * 2.4;
    const gutter = isMobile ? unit * 2.4 : unit * 3;
    const left = frame + gutter;
    const right = surface.width - frame - gutter;

    return {
        isMobile,
        unit,
        frame,
        left,
        right,
        width: right - left,
        centerX: surface.width / 2,
        top: frame + gutter,
        bottom: surface.height - frame - gutter,
        height: surface.height - (frame + gutter) * 2,

        // Vertical rhythm — use these instead of ad-hoc multipliers.
        section: unit * 3.4, // between major sections
        block: unit * 2.2,   // between blocks inside a section
        row: unit * 1.4,     // between tight rows (label under a figure)
    };
}

// Shrink until `text` fits `maxWidth`. `applyFont(px)` sets the font for a size;
// the fitted font is left applied so the caller can draw immediately.
export function fitPx(ctx, text, maxWidth, startPx, minPx, applyFont) {
    let px = startPx;
    applyFont(px);
    while (px > minPx && ctx.measureText(text).width > maxWidth) {
        px -= 0.5;
        applyFont(px);
    }
    return px;
}

// Greedy word wrap using the currently applied font.
export function wrapLines(ctx, text, maxWidth, maxLines = 2) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';

    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > maxWidth) {
            lines.push(line);
            line = word;
            if (lines.length === maxLines) break;
        } else {
            line = next;
        }
    }
    if (line && lines.length < maxLines) lines.push(line);
    return lines;
}

// A dotted separator in the ship-trail idiom — the brand's only divider.
export function drawDivider(ctx, x1, x2, y) {
    dottedLine(ctx, x1, x2, y, 1.3, 8, color.ink30);
}

// Small uppercase section label flanked by dotted rules out to the content edges.
export function drawRuledLabel(ctx, { text, centerX, y, width, px }) {
    ctx.save();
    setLabelType(ctx, px);
    ctx.fillStyle = color.ink55;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, centerX, y);

    const halfText = ctx.measureText(text).width / 2;
    const clearance = px * 1.8;
    const outerLeft = centerX - width / 2;
    const outerRight = centerX + width / 2;
    const innerLeft = centerX - halfText - clearance;
    const innerRight = centerX + halfText + clearance;

    if (innerLeft > outerLeft) drawDivider(ctx, outerLeft, innerLeft, y);
    if (outerRight > innerRight) drawDivider(ctx, innerRight, outerRight, y);

    resetType(ctx);
    ctx.restore();
}
