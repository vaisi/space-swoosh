// GlowSprites.js
// Phase 1: pre-render soft radial glows once, blit with drawImage each frame.
// Changes:
// - Theme toggle: bakes read live `color.*Rgb`; clearGlowSpriteCache() on switch.
// - Night paper: black-hole soft ring uses ink falloff (not pure black).
// - Created: black-hole ring glow, collectible signal halo, style-swoosh flash.
//   Replaces createRadialGradient / large soft fills on the cheap-Canvas path.

import { color } from '../brand/tokens.js';

/** @type {Map<string, HTMLCanvasElement>} */
const cache = new Map();

/**
 * @param {string} key
 * @param {number} sizePx  canvas edge length in device pixels
 * @param {(ctx: CanvasRenderingContext2D, size: number) => void} paint
 */
function getSprite(key, sizePx, paint) {
    const hit = cache.get(key);
    if (hit) return hit;
    const c = document.createElement('canvas');
    c.width = sizePx;
    c.height = sizePx;
    const ctx = c.getContext('2d');
    paint(ctx, sizePx);
    cache.set(key, c);
    return c;
}

/** Soft disc: opaque center → transparent edge (collectible / flash). */
function bakeSoftDisc(ctx, size, rgbaCenter) {
    const mid = size / 2;
    const g = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
    g.addColorStop(0, rgbaCenter);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
}

/** Soft ring: transparent hole, soft ink falloff (black hole outer glow). */
function bakeSoftRing(ctx, size) {
    const mid = size / 2;
    const inner = mid * 0.25;
    const g = ctx.createRadialGradient(mid, mid, inner, mid, mid, mid);
    g.addColorStop(0, `rgba(${color.inkRgb}, 0)`);
    g.addColorStop(0.15, `rgba(${color.inkRgb}, 0.4)`);
    g.addColorStop(1, `rgba(${color.inkRgb}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
}

/**
 * Draw a soft signal-blue halo centered at (x,y) with CSS radius `radius`.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawSignalHaloSprite(ctx, x, y, radius, alpha = 1) {
    const size = 64;
    const sprite = getSprite(`signalHalo:${color.signalRgb}`, size, (c, s) => {
        bakeSoftDisc(c, s, `rgba(${color.signalRgb}, 0.55)`);
    });
    const d = radius * 2;
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * alpha;
    ctx.drawImage(sprite, x - radius, y - radius, d, d);
    ctx.globalAlpha = prev;
}

/**
 * Black-hole outer glow: drawn from hole radius → outerRadius.
 * Sprite is a soft ring; we scale the whole disc to outer diameter.
 */
export function drawBlackHoleGlowSprite(ctx, x, y, holeRadius, outerRadius) {
    const size = 128;
    const sprite = getSprite(`bhGlow:${color.inkRgb}`, size, (c, s) => bakeSoftRing(c, s));
    const d = outerRadius * 2;
    ctx.drawImage(sprite, x - outerRadius, y - outerRadius, d, d);
    // Keep the hard hole ink on top (caller draws the core before/after).
    void holeRadius;
}

/** Style-swoosh flash — soft signal bloom. */
export function drawSwooshFlashSprite(ctx, x, y, radius, alpha = 1) {
    const size = 96;
    const sprite = getSprite(`swooshFlash:${color.signalRgb}`, size, (c, s) => {
        bakeSoftDisc(c, s, `rgba(${color.signalRgb}, 0.5)`);
    });
    const d = radius * 2;
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * alpha;
    ctx.drawImage(sprite, x - radius, y - radius, d, d);
    ctx.globalAlpha = prev;
}

export function clearGlowSpriteCache() {
    cache.clear();
}
