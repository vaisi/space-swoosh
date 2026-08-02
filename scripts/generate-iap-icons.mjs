// generate-iap-icons.mjs
// Changes: Created — 512×512 Google Play one-time product icons for Pulse and
// Quill, derived from brand tokens (paper ground, ink hull, signal-blue wake).
//
// Outputs:
//   assets/iap/pulse.png
//   assets/iap/quill.png
//
// Run: node scripts/generate-iap-icons.mjs

import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { color } from '../src/brand/tokens.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIZE = 512;

function pulseSvg() {
    // Circle hull (Focus geometry) + signal dotted wake — matches Pulse skin.
    const cx = 256;
    const cy = 200;
    const r = 58;
    const dots = [280, 318, 356, 394, 432]
        .map(
            (y, i) =>
                `<circle cx="${cx}" cy="${y}" r="${10 - i}" fill="${color.signal}" opacity="${0.95 - i * 0.12}" />`,
        )
        .join('\n  ');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${color.paper}" />
  ${dots}
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color.ink}" />
  <circle cx="${cx}" cy="${cy}" r="${r * 0.28}" fill="${color.signal}" />
</svg>`;
}

function quillSvg() {
    // Tear hull (Flicker geometry) + thin signal ribbon wake — matches Quill.
    const cx = 256;
    const tipY = 140;
    const body = `
  <path d="M ${cx} ${tipY}
           C ${cx + 52} ${tipY + 70}, ${cx + 48} ${tipY + 130}, ${cx} ${tipY + 168}
           C ${cx - 48} ${tipY + 130}, ${cx - 52} ${tipY + 70}, ${cx} ${tipY}
           Z" fill="${color.ink}" />`;
    const ribbon = `
  <path d="M ${cx} ${tipY + 160}
           Q ${cx - 18} ${tipY + 220}, ${cx + 6} ${tipY + 280}
           Q ${cx + 22} ${tipY + 330}, ${cx - 4} ${tipY + 390}"
        fill="none" stroke="${color.signal}" stroke-width="10" stroke-linecap="round" opacity="0.9" />
  <path d="M ${cx} ${tipY + 160}
           Q ${cx - 18} ${tipY + 220}, ${cx + 6} ${tipY + 280}
           Q ${cx + 22} ${tipY + 330}, ${cx - 4} ${tipY + 390}"
        fill="none" stroke="${color.signal}" stroke-width="3" stroke-linecap="round" opacity="0.45" />`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${color.paper}" />
  ${ribbon}
  ${body}
</svg>`;
}

async function writePng(markup, out) {
    const dest = resolve(root, out);
    await sharp(Buffer.from(markup)).resize(SIZE, SIZE).png().toFile(dest);
    console.log('  ✓', out);
}

async function main() {
    mkdirSync(resolve(root, 'assets/iap'), { recursive: true });
    console.log('Generating IAP icons…');
    await Promise.all([
        writePng(pulseSvg(), 'assets/iap/pulse.png'),
        writePng(quillSvg(), 'assets/iap/quill.png'),
    ]);
    console.log('Done. Upload these in Play Console → In-app products → Icon.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
