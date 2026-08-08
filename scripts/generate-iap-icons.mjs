// generate-iap-icons.mjs
// Changes: Store-icon framing matches classic Pulse/Quill listing art —
// upright hull in the upper third, real in-game hull+wake, trail samples
// stretched from under the hull down to the bottom of the 512 canvas.
//
// Outputs: assets/iap/<skinId>.png (512×512) for every skin with productId.
//
// Run: npm run assets:iap

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';

import { color } from '../src/brand/tokens.js';
import { SKIN_DEFS } from '../src/ships/skinDefs.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIZE = 512;

/**
 * Long vertical wake for store icons — oldest at the bottom of the canvas,
 * newest just under the hull (same direction as in-game travel: up).
 */
function iconWake(cx, hullCy, radius, bottomY, { longWake = false } = {}) {
    const count = longWake ? 48 : 36;
    const startY = hullCy + radius * 0.55;
    // Overshoot slightly so faded tips still paint on the bottom edge.
    const span = Math.max(radius * 2, bottomY - startY) + radius * 0.35;
    // Gentle S so ribbons/dots still read as motion, without eating the frame.
    const amp = radius * (longWake ? 0.5 : 0.38);
    const bend = 1.05;
    const trail = [];

    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        // Oldest first (bottom); newest last (at hull) — matches live trail order.
        const u = 1 - t;
        const y = startY + u * span;
        const x = cx - Math.sin(u * bend) * amp * (0.25 + 0.75 * u);
        const vx = Math.cos(u * bend) * amp * bend;
        const vy = -span;

        trail.push({
            x,
            y,
            // Stay readable all the way to the bottom (store icons, not HUD fade).
            opacity: Math.max(0.28, 1 - u * 0.55),
            angle: Math.atan2(vx, -vy),
            seed: (i * 0.618) % 1,
        });
    }

    return trail;
}

function drawStoreIcon(ctx, skin, cx, hullCy, radius, bottomY, time) {
    // Near-upright — same silhouette language as the original Pulse/Quill SVGs.
    const bank = 0.12;
    const longWake = (skin.trailMaxPoints ?? 80) > 100;

    const fakeShip = {
        x: cx,
        y: hullCy,
        radius,
        bank,
        tangent: bank,
        speed: radius * 0.14,
        _wallTrailMode: skin.wallTrailMode ?? 'spring',
        tailPoint: () => ({
            x: cx - Math.sin(bank) * radius * 0.55,
            y: hullCy + Math.cos(bank) * radius * 0.55,
        }),
        game: { config: { spacecraft: { trailDotSize: 0.22 } } },
    };

    const wake = iconWake(cx, hullCy, radius, bottomY, { longWake });
    skin.drawTrail(ctx, fakeShip, wake, (y) => y);
    skin.drawHull(ctx, fakeShip, hullCy, time);
}

async function renderSkinIcon(skin) {
    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = color.paper;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Match original Pulse SVG: hull upper third, r~58; wake to bottom edge.
    const cx = SIZE * 0.5;
    const hullCy = 175;
    const radius = 60;
    const bottomY = SIZE - 10;
    const time = 1200;

    drawStoreIcon(ctx, skin, cx, hullCy, radius, bottomY, time);

    const out = resolve(root, `assets/iap/${skin.id}.png`);
    writeFileSync(out, canvas.toBuffer('image/png'));
    console.log('  ✓', `assets/iap/${skin.id}.png`);
}

async function main() {
    mkdirSync(resolve(root, 'assets/iap'), { recursive: true });
    const paid = SKIN_DEFS.filter((s) => s.productId);
    console.log(`Rendering store IAP icons (hull top, wake to bottom) for ${paid.length}…`);
    for (const skin of paid) {
        await renderSkinIcon(skin);
    }
    console.log('Done. Upload these in Play Console → In-app products → Icon.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
