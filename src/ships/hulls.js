// hulls.js
// Hull geometry shared by the ship skins.
// Changes:
// - Added `dartPath`: a hard-edged chevron with a notched tail, for Ember.
// - Created file: extracted `tearPath` out of skins.js and added `withHeading`
//   so any shaped hull can be drawn rotated into its direction of travel.
// - `tearPath` gained a `stretch` factor (elongation along the nose axis) used
//   to draw the tear leaner while the ship is banking hard.

import { color } from '../brand/tokens.js';

// Hull rotation limit, shared by the entity (which clamps the heading) and the
// skins (which scale visual effects by how hard the ship is leaning). The arc's
// peak lateral speed is several times the vertical speed, so an unclamped
// tangent would leave the ship flying almost sideways mid-turn; 55 degrees
// reads as a hard bank while still pointing "forward".
export const MAX_BANK = 0.96;

// Run `draw` in a frame translated to (x, y) and rotated by `angle`, where
// angle 0 points the local -Y axis (the nose) straight up the screen.
export function withHeading(ctx, x, y, angle, draw) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    draw(ctx);
    ctx.restore();
}

// Upside-down teardrop, nose at local -Y, centred at (cx, cy).
export function tearPath(ctx, cx, cy, r, stretch = 1) {
    const ry = r * stretch;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry);
    ctx.bezierCurveTo(
        cx + r * 0.2, cy - ry * 0.35,
        cx + r * 0.98, cy + ry * 0.15,
        cx + r * 0.72, cy + ry * 0.55
    );
    ctx.quadraticCurveTo(cx, cy + ry * 1.02, cx - r * 0.72, cy + ry * 0.55);
    ctx.bezierCurveTo(
        cx - r * 0.98, cy + ry * 0.15,
        cx - r * 0.2, cy - ry * 0.35,
        cx, cy - ry
    );
    ctx.closePath();
}

// Swept-back dart: nose at local -Y, wingtips aft, concave notch in the tail.
export function dartPath(ctx, cx, cy, r, stretch = 1) {
    const ry = r * stretch;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry * 1.05);
    ctx.lineTo(cx + r * 0.72, cy + ry * 0.6);
    ctx.lineTo(cx, cy + ry * 0.15);
    ctx.lineTo(cx - r * 0.72, cy + ry * 0.6);
    ctx.closePath();
}

export function circlePath(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
}

export function drawCircleHull(ctx, ship, screenY) {
    circlePath(ctx, ship.x, screenY, ship.radius);
    ctx.fillStyle = color.ink;
    ctx.fill();
}
