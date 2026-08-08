// generate-brand-assets.mjs
// Generates the app icon / splash source art for @capacitor/assets + web favicons.
// Changes:
// - App icon outputs now come from assets/store/app-icon-512.png (upscaled to
//   1024); splash still uses the brand reticle on paper/ink grounds.
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
const STORE_ICON = resolve(root, 'assets/store/app-icon-512.png');

// --- The reticle, as SVG (splash only) ---------------------------------------
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

const pngFromSvg = (markup, out, size) =>
    sharp(Buffer.from(markup))
        .resize(size, size)
        .png()
        .toFile(resolve(root, out))
        .then(() => console.log('  ✓', out));

async function writePng(pipeline, out) {
    await pipeline.png().toFile(resolve(root, out));
    console.log('  ✓', out);
}

async function main() {
    mkdirSync(resolve(root, 'assets'), { recursive: true });
    mkdirSync(resolve(root, 'public'), { recursive: true });

    console.log('Generating brand assets…');
    console.log('  icon source:', 'assets/store/app-icon-512.png');

    // Full-bleed 1024 master from the store art (capacitor-assets fans this out).
    const icon1024 = await sharp(STORE_ICON)
        .resize(1024, 1024, { fit: 'fill' })
        .png()
        .toBuffer();

    // Adaptive foreground: same art (launcher masks the squircle). Background
    // stays brand paper so any peek under the mask matches the icon ground.
    const background = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${color.paper}" />
</svg>`;

    // Splashes keep the reticle mark — centre-safe for wild aspect crops.
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
        writePng(sharp(icon1024), 'assets/icon.png'),
        writePng(sharp(icon1024), 'assets/icon-foreground.png'),
        pngFromSvg(background, 'assets/icon-background.png', 1024),
        pngFromSvg(splash, 'assets/splash.png', 2732),
        pngFromSvg(splashDark, 'assets/splash-dark.png', 2732),
        writePng(sharp(icon1024).resize(180, 180), 'public/apple-touch-icon.png'),
        writePng(sharp(icon1024).resize(192, 192), 'public/icon-192.png'),
        writePng(sharp(icon1024).resize(512, 512), 'public/icon-512.png'),
    ]);

    // .ico: sharp has no ICO encoder, but every current browser accepts a PNG
    // served at favicon.ico, and index.html declares the type explicitly.
    const favicon = await sharp(icon1024).resize(48, 48).png().toBuffer();
    writeFileSync(resolve(root, 'public/favicon.ico'), favicon);
    console.log('  ✓ public/favicon.ico');

    console.log('Done.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
