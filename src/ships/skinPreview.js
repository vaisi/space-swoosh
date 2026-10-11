// skinPreview.js
// Hangar preview: a banked hull plus the curved wake attached at the tail.
// Changes:
// - Created file: preview wake and drawSkinSpecimen moved out of skins.js so
//   reference renders can import them without the Vite / entitlements graph.
//   longWake draws the longer arc (hull and wake). The menu still asks for
//   the short wake.

import { MAX_BANK } from './hulls.js';

// A short arc curving in from the lower left, sampled the way a live trail is
// (oldest first, each point carrying the direction of travel at that moment).
// Newest sample sits on the skin's tail attach so thin hulls don't leak wake
// from mid-body.
function previewWake(cx, cy, radius, { longWake = false, attachX = cx, attachY = cy } = {}) {
    const count = longWake ? 22 : 12;
    const span = radius * (longWake ? 5.4 : 3.4);
    const amp = radius * (longWake ? 0.9 : 0.75);
    const bend = 1.6;
    const t0 = 1 / count;
    const trail = [];

    for (let i = count; i >= 1; i--) {
        const t = i / count;
        // Travel runs from high t to low t, so the tangent is the negated
        // derivative of the curve.
        const vx = Math.cos(t * bend) * bend * amp;
        const vy = -span;

        trail.push({
            x: attachX - (Math.sin(t * bend) - Math.sin(t0 * bend)) * amp,
            y: attachY + (t - t0) * span,
            opacity: Math.max(0.08, 1 - t * (longWake ? 0.72 : 0.85)),
            angle: Math.atan2(vx, -vy),
            seed: (i * 0.618) % 1,
        });
    }

    return trail;
}

/**
 * Hull plus wake for one skin. Pass the skin object so hidden ships
 * (Merlin, Rook) still draw; getSkin() remaps those ids to Flicker.
 * longWake is the longer preview arc. The menu keeps the short one.
 */
export function drawSkinSpecimen(ctx, skin, cx, cy, radius, time = performance.now(), { longWake = false } = {}) {
    const bank = Math.min(MAX_BANK, Math.atan2(1.6 * 0.75, 4.2));
    const fakeShip = {
        x: cx,
        y: cy,
        radius,
        bank,
        tangent: bank,
        speed: radius * 0.12,
        _wallTrailMode: skin.wallTrailMode ?? 'spring',
        tailPoint: () => {
            const offset = radius * (skin.trailTailOffset ?? 0.6);
            return {
                x: cx - Math.sin(bank) * offset,
                y: cy + Math.cos(bank) * offset,
            };
        },
        game: { config: { spacecraft: { trailDotSize: 0.2 } } },
    };

    const attach = fakeShip.tailPoint();
    skin.drawTrail(ctx, fakeShip, previewWake(cx, cy, radius, {
        longWake,
        attachX: attach.x,
        attachY: attach.y,
    }), (y) => y);
    skin.drawHull(ctx, fakeShip, cy, time);
}
