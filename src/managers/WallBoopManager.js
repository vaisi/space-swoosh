// WallBoopManager.js
// Short ink "BOOP" popup + soft impact flash when the ship bounces off a
// screen sidewall. Mirrors StyleSwooshManager's popup lifecycle, but sits
// below the hull beside the wall (never overlapping ship or edge).
// Changes:
// - Label X is padded by measured "BOOP" half-width so left/right walls never
//   clip to "BOO|" / "|OOP"; blot follows the same safe centre.
// - Created file: triggerBoop(ship, side), tickEffects, render.

import { color } from '../brand/tokens.js';
import { setLabelType, resetType } from '../utils/BrandDraw.js';

const LABEL = 'BOOP';

/** Half-width of the BOOP label at the size we paint it (wide tracking). */
function labelHalfWidth(unit) {
    const fontPx = Math.max(11, unit * 1.05);
    // 4 glyphs ≈ 0.72em each + 3 tracking gaps of 0.18em (see setLabelType).
    return fontPx * (4 * 0.72 + 3 * 0.18) * 0.5;
}

export class WallBoopManager {
    constructor(game) {
        this.game = game;
        this.effects = [];
        this.popups = [];
        this.cooldownUntil = 0;
    }

    /** Keep a centred label fully inside the canvas. */
    safeLabelX(preferredX, unit) {
        const halfW = labelHalfWidth(unit);
        const pad = Math.max(unit * 0.35, 4);
        return Math.min(
            Math.max(preferredX, halfW + pad),
            this.game.width - halfW - pad,
        );
    }

    /** @param {number} side -1 = left wall, +1 = right wall */
    triggerBoop(ship, side) {
        if (!ship) return;

        const now = performance.now();
        // Zigzag can brush the clamp for a couple of frames; one boop is enough.
        if (now < this.cooldownUntil) return;
        this.cooldownUntil = now + 180;

        const sign = side < 0 ? -1 : 1;
        const unit = this.game.baseUnit;
        // Below the hull; preferred X hugs the wall side of the ship, then
        // clamped so the full word (not half) stays on-screen.
        const clearHull = ship.radius * 1.75;
        const preferredX = ship.x - sign * (ship.radius * 0.25);
        const x = this.safeLabelX(preferredX, unit);
        const y = ship.y + clearHull;
        const wallX = sign < 0 ? 0 : this.game.width;

        this.popups.push({
            x,
            y,
            vy: 1.6, // drift slightly further down (away from the hull)
            opacity: 1,
            side: sign,
        });

        // Soft ink blot that blooms then fades — quieter than a swoosh ring.
        this.effects.push({
            type: 'blot',
            x,
            y: y - ship.radius * 0.15,
            r: ship.radius * 0.35,
            maxR: ship.radius * 1.6,
            life: 1,
        });

        // Tiny dashes kicking off the wall face.
        for (let i = 0; i < 4; i++) {
            this.effects.push({
                type: 'kick',
                x: wallX - sign * (ship.radius * 0.35 + i * ship.radius * 0.12),
                y: y + (i - 1.5) * ship.radius * 0.35,
                vx: -sign * (1.8 + Math.random() * 1.4),
                vy: 0.6 + Math.random() * 1.2,
                life: 0.75 + Math.random() * 0.2,
            });
        }

        this.game.soundManager?.playBoop?.();
    }

    update() {
        if (this.game.isGameOver || this.game.isPaused) return;
        this.tickEffects();
    }

    tickEffects() {
        const dt = this.game.dt ?? (1 / 60);
        const tickScale = dt * 60;

        this.effects = this.effects
            .map(e => {
                if (e.type === 'blot') {
                    e.r += (e.maxR - e.r) * 0.22;
                    e.life -= 0.07 * tickScale;
                } else if (e.type === 'kick') {
                    e.x += e.vx * tickScale;
                    e.y += e.vy * tickScale;
                    e.life -= 0.06 * tickScale;
                }
                return e;
            })
            .filter(e => e.life > 0);

        this.popups = this.popups
            .map(p => ({
                ...p,
                y: p.y + p.vy * dt,
                opacity: p.opacity - 0.028 * tickScale,
            }))
            .filter(p => p.opacity > 0);
    }

    render(ctx) {
        const cam = this.game.camera;
        const unit = this.game.baseUnit;

        for (const e of this.effects) {
            const sy = cam.getRelativeY(e.y);
            if (e.type === 'blot') {
                ctx.save();
                ctx.beginPath();
                ctx.arc(e.x, sy, e.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${color.inkRgb}, ${0.10 * e.life})`;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(e.x, sy, e.r * 0.55, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${color.inkRgb}, ${0.45 * e.life})`;
                ctx.lineWidth = Math.max(1.2, unit * 0.14);
                ctx.stroke();
                ctx.restore();
            } else if (e.type === 'kick') {
                ctx.save();
                ctx.strokeStyle = `rgba(${color.inkRgb}, ${0.5 * e.life})`;
                ctx.lineWidth = Math.max(1.1, unit * 0.1);
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(e.x, sy);
                ctx.lineTo(e.x + e.vx * unit * 0.35, cam.getRelativeY(e.y + e.vy * unit * 0.2));
                ctx.stroke();
                ctx.restore();
            }
        }

        for (const p of this.popups) {
            const sy = cam.getRelativeY(p.y);
            ctx.save();
            ctx.globalAlpha *= Math.max(0, p.opacity);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const fontPx = Math.max(11, unit * 1.05);
            setLabelType(ctx, fontPx);
            // Belt-and-suspenders: re-clamp with the real measured width in case
            // the font metrics differ from the spawn-time estimate.
            const measuredHalf = ctx.measureText(LABEL).width * 0.5;
            const pad = Math.max(unit * 0.35, 4);
            const x = Math.min(
                Math.max(p.x, measuredHalf + pad),
                this.game.width - measuredHalf - pad,
            );
            ctx.fillStyle = color.ink;
            ctx.fillText(LABEL, x, sy);
            resetType(ctx);
            ctx.restore();
        }
    }
}
