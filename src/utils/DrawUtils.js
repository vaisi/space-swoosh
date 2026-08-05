// DrawUtils.js
// Shared hand-drawn ("doodle / ink on paper") rendering helpers.
// Keeps every UI surface (power-ups, game-over, high-scores, modals) consistent
// with the sketchy in-game aesthetic instead of stark black boxes + plain Arial.
//
// Changes:
// - Theme toggle: PAPER / INK / SHIELD_* are live `let`s refreshed via
//   syncPaintConsts() when light/dark switches (no module-load snapshots).
// - Night paper: PAPER / INK / INK_SOFT / SHIELD_BLUE re-export from brand tokens
//   so legacy callers stay in sync with the inverted palette.
// - Created file: extracted reusable sketch primitives (seeded, stable wobble)
//   plus a shield glyph + checkmark so the shield power-up and screens share one look.

import { color } from '../brand/tokens.js';

export let PAPER = color.paper;
export let INK = color.ink;
export let INK_SOFT = color.ink55;
// Shared "shield blue" — the same hue used by the portal gates that grant a
// shield, so the pickup + active-shield glow read as the same mechanic.
export let SHIELD_BLUE = color.signal;
export let SHIELD_BLUE_RGB = color.signalRgb;

/** Call after applyTheme so legacy paint consts match live tokens. */
export function syncPaintConsts() {
    PAPER = color.paper;
    INK = color.ink;
    INK_SOFT = color.ink55;
    SHIELD_BLUE = color.signal;
    SHIELD_BLUE_RGB = color.signalRgb;
}

// Deterministic pseudo-random in [-1, 1] from a seed. Using a seed (instead of
// Math.random) keeps the hand-drawn wobble fixed frame-to-frame so static
// screens don't visibly shake.
function seeded(seed) {
    const s = Math.sin(seed * 127.1) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
}

// A single wobbly line made of a few jittered segments (endpoints stay put).
export function sketchLine(ctx, x1, y1, x2, y2, roughness = 1.5, seed = 1) {
    const segments = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < segments; i++) {
        const t = i / segments;
        ctx.lineTo(
            x1 + (x2 - x1) * t + seeded(seed + i * 3) * roughness,
            y1 + (y2 - y1) * t + seeded(seed + i * 7) * roughness
        );
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

// A rough rectangle outline (4 wobbly sides). Drawn with the current strokeStyle.
export function sketchRect(ctx, x, y, w, h, roughness = 1.5, seed = 1) {
    sketchLine(ctx, x, y, x + w, y, roughness, seed);
    sketchLine(ctx, x + w, y, x + w, y + h, roughness, seed + 11);
    sketchLine(ctx, x + w, y + h, x, y + h, roughness, seed + 23);
    sketchLine(ctx, x, y + h, x, y, roughness, seed + 37);
}

// A short hand-drawn underline stroke, handy for titles / active tabs.
export function sketchUnderline(ctx, x1, x2, y, roughness = 2, seed = 5) {
    sketchLine(ctx, x1, y, x2, y, roughness, seed);
}

// A dotted separator line — echoes the spacecraft's signature dotted trail.
export function dottedLine(ctx, x1, x2, y, dotRadius = 1.5, gap = 8, strokeColor = null) {
    ctx.save();
    ctx.fillStyle = strokeColor ?? INK_SOFT;
    for (let x = x1; x <= x2; x += gap) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// A graceful shield silhouette centered at (cx, cy). w/h are half-width/half-height.
// Softly rounded top corners, gently curved flanks tapering to a clean point.
export function shieldPath(ctx, cx, cy, w, h) {
    const corner = Math.min(w, h) * 0.28;
    ctx.beginPath();
    ctx.moveTo(cx - w, cy - h + corner);
    ctx.quadraticCurveTo(cx - w, cy - h, cx - w + corner, cy - h);
    ctx.lineTo(cx + w - corner, cy - h);
    ctx.quadraticCurveTo(cx + w, cy - h, cx + w, cy - h + corner);
    ctx.lineTo(cx + w, cy - h * 0.08);
    ctx.quadraticCurveTo(cx + w, cy + h * 0.52, cx, cy + h);
    ctx.quadraticCurveTo(cx - w, cy + h * 0.52, cx - w, cy - h * 0.08);
    ctx.closePath();
}

// A checkmark path centered at (cx, cy) sized by s. Caller sets stroke + strokes it.
export function checkPath(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx - s, cy);
    ctx.lineTo(cx - s * 0.2, cy + s * 0.75);
    ctx.lineTo(cx + s, cy - s * 0.7);
}
