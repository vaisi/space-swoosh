// generate-store-assets.mjs
// Changes: Created — Play Console listing assets (512 icon + 1024×500 feature).
//
// Outputs:
//   assets/store/app-icon-512.png
//   assets/store/feature-graphic-1024x500.png
//
// Run: node scripts/generate-store-assets.mjs

import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { color } from '../src/brand/tokens.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
    mkdirSync(resolve(root, 'assets/store'), { recursive: true });

    await sharp(resolve(root, 'assets/icon.png'))
        .resize(512, 512)
        .png()
        .toFile(resolve(root, 'assets/store/app-icon-512.png'));
    console.log('  ✓ assets/store/app-icon-512.png');

    const w = 1024;
    const h = 500;
    const cx = 220;
    const cy = 250;
    const r = 70;
    const inner = r * 0.5;
    const outer = r * 1.35;
    const sw = r * 0.11;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${color.paper}"/>
  <g stroke="${color.ink}" stroke-width="${sw}" fill="none" stroke-linecap="butt">
    <circle cx="${cx}" cy="${cy}" r="${r}"/>
    <line x1="${cx}" y1="${cy - inner}" x2="${cx}" y2="${cy - outer}"/>
    <line x1="${cx}" y1="${cy + inner}" x2="${cx}" y2="${cy + outer}"/>
    <line x1="${cx - inner}" y1="${cy}" x2="${cx - outer}" y2="${cy}"/>
    <line x1="${cx + inner}" y1="${cy}" x2="${cx + outer}" y2="${cy}"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.22}" fill="${color.signal}"/>
  <text x="340" y="245" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700" letter-spacing="6" fill="${color.ink}">SPACE SWOOSH</text>
  <text x="340" y="300" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="${color.ink}" opacity="0.55">One-thumb dodge on paper</text>
</svg>`;

    await sharp(Buffer.from(svg))
        .png()
        .toFile(resolve(root, 'assets/store/feature-graphic-1024x500.png'));
    console.log('  ✓ assets/store/feature-graphic-1024x500.png');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
