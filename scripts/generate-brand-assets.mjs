// generate-brand-assets.mjs
// Generates the app icon / splash source art from the brand tokens.
// Changes:
// - Created file: the project had no icon of any kind (index.html referenced a
//   favicon.ico and apple-touch-icon.png that did not exist) and the stores
//   require a full set. Rather than commit opaque binaries, the art is derived
//   from src/brand/tokens.js so it can never drift from the palette, and the
//   reticle here is the same glyph utils/BrandDraw.js#drawReticle paints in game.
//
// Outputs (source art only — @capacitor/assets fans these out per platform):
//   assets/icon.png              1024  full-bleed, for iOS + legacy Android
//   assets/icon-foreground.png   1024  Android adaptive foreground (safe zone)
//   assets/icon-background.png   1024  Android adaptive background (flat paper)
//   assets/splash.png            2732  light splash
//   assets/splash-dark.png       2732  dark splash (ink ground, paper glyph)
//   public/favicon.ico            48   web
//   public/apple-touch-icon.png  180   web
//
// Run: npm run assets:generate

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { color } from '../src/brand/tokens.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// --- The reticle, as SVG -----------------------------------------------------
// Mirrors drawReticle(): a ring, four ticks running from r*0.5 out to r*1.35,
// and an optional signal-blue centre dot. Total glyph extent is 2.7r.
function reticle({ cx, cy, r, stroke, dot, strokeWidth }) {
    const inner = r * 0.5;
    const outer = r * 1.35;
    const tick = (x1, y1, x2, y2) =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;

    return `
  <g stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="butt">
    <circle cx="${cx}" cy="${cy}" r="${r}" />
    ${tick(cx, cy - inner, cx, cy - outer)}
    ${tick(cx, cy + inner, cx, cy + outer)}
    ${tick(cx - inner, cy, cx - outer, cy)}
    ${tick(cx + inner, cy, cx + outer, cy)}
  </g>
  ${dot ? `<circle cx="${cx}" cy="${cy}" r="${r * 0.22}" fill="${dot}" />` : ''}`;
}

function svg({ size, ground, glyphRadius, stroke, dot, strokeRatio = 0.11, transparent = false }) {
    const c = size / 2;
    const bg = transparent
        ? ''
        : `<rect width="${size}" height="${size}" fill="${ground}" />`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg}
  ${reticle({
        cx: c,
        cy: c,
        r: glyphRadius,
        stroke,
        dot,
        strokeWidth: glyphRadius * strokeRatio,
    })}
</svg>`;
}

const png = (markup, out, size) =>
    sharp(Buffer.from(markup))
        .resize(size, size)
        .png()
        .toFile(resolve(root, out))
        .then(() => console.log('  ✓', out));

async function main() {
    mkdirSync(resolve(root, 'assets'), { recursive: true });
    mkdirSync(resolve(root, 'public'), { recursive: true });

    console.log('Generating brand assets from src/brand/tokens.js…');

    // iOS masks icons into a squircle and Android may round them further, so the
    // glyph occupies ~58% of the canvas — comfortably inside every mask.
    const icon = svg({
        size: 1024,
        ground: color.paper,
        glyphRadius: 220,
        stroke: color.ink,
        dot: color.signal,
    });

    // Android adaptive icons only guarantee the central 61% of the foreground is
    // visible; the launcher can crop or animate the rest. Hence a smaller glyph.
    const foreground = svg({
        size: 1024,
        ground: null,
        transparent: true,
        glyphRadius: 185,
        stroke: color.ink,
        dot: color.signal,
    });

    const background = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${color.paper}" />
</svg>`;

    // Splashes are centre-cropped to wildly different aspect ratios, so the mark
    // stays small and dead centre where no crop can reach it.
    const splash = svg({
        size: 2732,
        ground: color.paper,
        glyphRadius: 170,
        stroke: color.ink,
        dot: color.signal,
    });

    const splashDark = svg({
        size: 2732,
        ground: color.ink,
        glyphRadius: 170,
        stroke: color.paper,
        dot: color.signal,
    });

    await Promise.all([
        png(icon, 'assets/icon.png', 1024),
        png(foreground, 'assets/icon-foreground.png', 1024),
        png(background, 'assets/icon-background.png', 1024),
        png(splash, 'assets/splash.png', 2732),
        png(splashDark, 'assets/splash-dark.png', 2732),
        png(icon, 'public/apple-touch-icon.png', 180),
        png(icon, 'public/icon-192.png', 192),
        png(icon, 'public/icon-512.png', 512),
    ]);

    // .ico: sharp has no ICO encoder, but every current browser accepts a PNG
    // served at favicon.ico, and index.html declares the type explicitly.
    const favicon = await sharp(Buffer.from(icon)).resize(48, 48).png().toBuffer();
    writeFileSync(resolve(root, 'public/favicon.ico'), favicon);
    console.log('  ✓ public/favicon.ico');

    console.log('Done.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
