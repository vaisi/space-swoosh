// BrandDraw.js
// -----------------------------------------------------------------------------
// SPACE SWOOSH — Canvas rendering helpers that apply the brand kit
// (src/brand/tokens.js) to the <canvas> game surface.
//
// Changes:
// - ensureBrandFonts() races loads against 1.5s and never awaits
//   document.fonts.ready (Android WebView can hang forever on a missing
//   @font-face). Missing files fall back to the system stack instead of
//   pinning the native splash.
// - Night paper: drawPaper is flat night ground; primary button hairline uses
//   paperRgb so dividers read on bone-ink primary fills.
// - drawFramedButton insets the label with horizontal padding and shrinks the
//   type to fit, so short tags like BACK no longer hug the left frame edge.
// - drawFramedButton `disabled` paints a decommissioned row (dim ink, no fill).
// - Created file: geometric-minimalism drawing primitives shared by the HUD and
//   the end screens so every canvas surface reads from the same brand tokens as
//   the DOM/CSS. Retires the hand-drawn Comic Sans + Arial look:
//     * ensureBrandFonts() — preload Space Grotesk / Space Mono before first paint
//     * drawPaper()         — clean flat warm-paper ground (no grid)
//     * drawFramedButton()  — the framed motif-tile button (uppercase label + mono tag)
//     * drawFramedTile()    — the bordered card/panel treatment
//     * drawReticle()       — the crosshair focus glyph (the ship / monogram)
//     * drawSparkle()       — the four-point points-collectible glyph
//     * setLabelType/setMonoType/setDisplayType — brand type presets for canvas
// - drawSparkle() takes an optional `stroke`, drawing the sparkle hollow. Used
//   for stars not yet earned, where a faint fill read as a gap in the layout.
// - Added drawSparkle(): a solid four-point sparkle (points at N/E/S/W) used for
//   the points collectible and its HUD/end-screen glyph. Shared here so the
//   entity and the HUD draw the exact same mark.
// -----------------------------------------------------------------------------

import { color, font } from '../brand/tokens.js';

// --- Fonts -------------------------------------------------------------------
// Load the brand families (and the weights we actually paint) before the first
// canvas frame, otherwise the HUD/titles fall back to a system font until the
// webfont arrives and then visibly reflow. Cap the wait: a 404 or a hung
// WebView font request must not block the menu / native splash hide.
const FONT_LOAD_MS = 1500;

export async function ensureBrandFonts() {
    if (!document.fonts || !document.fonts.load) return;
    const faces = [
        `500 24px 'Space Grotesk'`,
        `700 24px 'Space Grotesk'`,
        `400 24px 'Space Mono'`,
        `700 24px 'Space Mono'`,
    ];
    try {
        const loads = Promise.all(faces.map(f => document.fonts.load(f)));
        const timeout = new Promise((resolve) => setTimeout(resolve, FONT_LOAD_MS));
        await Promise.race([loads, timeout]);
        // Do not await document.fonts.ready — on Android WebView a missing
        // @font-face (font-display: block) can leave that promise pending.
    } catch (_) {
        // Non-fatal: fall back to the stack declared in tokens if loading fails.
    }
}

// --- Type presets ------------------------------------------------------------
// Canvas has no CSS classes, so these mirror the brand type roles. `letterSpacing`
// is a modern 2D-context property (Chromium/Firefox); assigning it is a harmless
// no-op where unsupported.
export function setDisplayType(ctx, px, weight = 700) {
    ctx.font = `${weight} ${px}px ${font.display}`;
    ctx.letterSpacing = `${-0.02 * px}px`;
}

export function setLabelType(ctx, px, weight = 500) {
    ctx.font = `${weight} ${px}px ${font.ui}`;
    ctx.letterSpacing = `${0.18 * px}px`;
}

export function setMonoType(ctx, px, weight = 700) {
    ctx.font = `${weight} ${px}px ${font.mono}`;
    ctx.letterSpacing = '0px';
}

export function resetType(ctx) {
    ctx.letterSpacing = '0px';
}

// --- Paper (the ground) ------------------------------------------------------
// Clean, flat night paper. Every surface — gameplay and end screens alike — sits
// on this so shapes and type read clearly with no background texture.
export function drawPaper(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = color.paper;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

// --- Framed tile -------------------------------------------------------------
// The shared "motif tile" surface: raised paper tint behind a crisp 1.5px ink
// outline, hard corners. Cards, panels and modals all use this.
export function drawFramedTile(ctx, x, y, w, h, { surface = color.paperTint, stroke = color.ink } = {}) {
    ctx.save();
    ctx.fillStyle = surface;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
    ctx.restore();
}

// --- Framed button -----------------------------------------------------------
// The motif-tile control: an uppercase Space Grotesk label and an optional
// Space Mono micro-tag, split by a hairline. Primary = ink fill / paper label;
// secondary = outline only; signal = blue border (reserved for shield/active).
// Returns the hit-box rect used for click detection.
export function drawFramedButton(ctx, { x, y, w, h, label, tag = null, primary = false, signal = false, disabled = false, baseUnit = 16, labelPx }) {
    ctx.save();
    ctx.lineJoin = 'miter';

    const lit = primary && !disabled;

    // Surface + border.
    ctx.fillStyle = lit ? color.ink : color.paperTint;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = disabled ? color.ink12 : (signal ? color.signal : color.ink);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);

    const tagW = tag ? Math.max(h, baseUnit * 3.2) : 0;
    const labelAreaW = w - tagW;

    if (tag) {
        // Hairline divider between label and micro-tag.
        ctx.strokeStyle = lit ? `rgba(${color.paperRgb}, 0.25)` : color.ink12;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(x + labelAreaW) + 0.5, y + h * 0.16);
        ctx.lineTo(Math.round(x + labelAreaW) + 0.5, y + h * 0.84);
        ctx.stroke();

        ctx.fillStyle = disabled ? color.ink30 : (lit ? color.paperDeep : color.ink55);
        setMonoType(ctx, Math.min(baseUnit * 1.25, h * 0.4));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tag, x + labelAreaW + tagW / 2, y + h / 2 + 1);
    }

    // Label — uppercase, tracking, padded so it never kisses the frame / hairline.
    const text = String(label).toUpperCase();
    const padX = Math.max(baseUnit * 0.7, h * 0.22);
    const labelMaxW = Math.max(8, labelAreaW - padX * 2);
    let size = labelPx ?? Math.min(baseUnit * 1.5, h * 0.42);
    const minPx = Math.max(9, Math.min(size, h * 0.28));

    ctx.fillStyle = disabled ? color.ink30 : (lit ? color.paper : color.ink);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const applyLabelFont = (px) => {
        ctx.font = `700 ${px}px ${font.ui}`;
        // Slightly tighter tracking than before — wide spacing + center align
        // optically shoved short labels into the left border on narrow tiles.
        ctx.letterSpacing = `${0.05 * px}px`;
    };
    applyLabelFont(size);
    while (size > minPx && ctx.measureText(text).width > labelMaxW) {
        size -= 0.5;
        applyLabelFont(size);
    }
    ctx.fillText(text, x + padX + labelMaxW / 2, y + h / 2 + 1);

    resetType(ctx);
    ctx.restore();
    return { x, y, width: w, height: h };
}

// --- Reticle glyph -----------------------------------------------------------
// The crosshair focus mark — ring + four ticks. With `signalDot` a blue centre
// dot is added (the monogram: the ship, in focus / home).
export function drawReticle(ctx, cx, cy, r, { signalDot = false, stroke = color.ink, lineWidth = 3 } = {}) {
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'butt';

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    const inner = r * 0.5;
    const outer = r * 1.35;
    ctx.beginPath();
    ctx.moveTo(cx, cy - inner); ctx.lineTo(cx, cy - outer);
    ctx.moveTo(cx, cy + inner); ctx.lineTo(cx, cy + outer);
    ctx.moveTo(cx - inner, cy); ctx.lineTo(cx - outer, cy);
    ctx.moveTo(cx + inner, cy); ctx.lineTo(cx + outer, cy);
    ctx.stroke();

    if (signalDot) {
        ctx.fillStyle = color.signal;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// --- Sparkle glyph -----------------------------------------------------------
// A four-point sparkle centred at (cx, cy) with radius r — the "points"
// collectible mark. Outer points sit at N/E/S/W with a pulled-in waist, so it
// reads as a distinct friendly star rather than the filled-ink hostile star.
//
// Pass `stroke` for the hollow variant, which is how the brand says "not yet":
// same outline treatment as a secondary button or an unused teleport ring. An
// unearned star drawn as a faint *fill* just reads as a hole in the layout.
export function drawSparkle(ctx, cx, cy, r, {
    fill = color.signal,
    innerRatio = 0.4,
    stroke = null,
    lineWidth = 1.5,
} = {}) {
    const inner = r * innerRatio;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI / 4) - Math.PI / 2; // start at the top point
        const radius = i % 2 === 0 ? r : inner;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();

    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'miter';
        ctx.stroke();
    } else {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    ctx.restore();
}
