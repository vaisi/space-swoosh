// StyleSwooshManager.js
// Awards "style" points when the ship threads a very narrow gap between two
// obstacles (a near-miss swoosh past both), with Signal-Blue screen feedback.
// Changes:
// - Phase 1: flash uses pre-baked glow sprite when game.useGlowSprites; iOS
//   draw LOD still skips path radials without sprites.
// - Journey Logbook: instant unlock for Style Swoosh on award.
// - Popup motion uses `game.dt` so float speed matches ship pacing across FPS.
// - Popup alpha multiplies into the caller's `globalAlpha` instead of replacing
//   it, so popups fade with the world during the level-clear flyout.
// - Created file: pair near-miss detection, style points, swoosh VFX + popup.

import { color } from '../brand/tokens.js';
import { setLabelType, setMonoType, resetType } from '../utils/BrandDraw.js';
import { drawSwooshFlashSprite } from '../utils/GlowSprites.js';
import { isKilled } from '../core/perfFlags.js';

const SKIP_TYPES = new Set(['WormholeGate', 'BlackHoleObstacle']);

function obstacleBounds(o) {
    // Barriers / belts expose width+height; pulsating uses currentSize.
    if (o.width != null && o.height != null) {
        const hx = o.width / 2;
        const hy = o.height / 2;
        return {
            left: o.x - hx,
            right: o.x + hx,
            top: o.y - hy,
            bottom: o.y + hy,
            cx: o.x,
            cy: o.y,
        };
    }
    const r = o.currentSize ?? o.size;
    return {
        left: o.x - r,
        right: o.x + r,
        top: o.y - r,
        bottom: o.y + r,
        cx: o.x,
        cy: o.y,
    };
}

function pairKey(left, right) {
    return `${left.cx.toFixed(1)}:${left.cy.toFixed(1)}|${right.cx.toFixed(1)}:${right.cy.toFixed(1)}`;
}

export class StyleSwooshManager {
    constructor(game) {
        this.game = game;
        this.effects = [];
        this.popups = [];
        this.awardedPairs = new Set();
        this.cooldownUntil = 0;
    }

    update() {
        if (this.game.isGameOver || this.game.isPaused) return;
        if (this.game.obstacleManager?.inCutscene) return;
        if (this.game.obstacleManager?.tutorialPhase) return;

        this.detectSwoosh();
        this.tickEffects();
    }

    detectSwoosh() {
        const ship = this.game.spacecraft;
        if (!ship?.isVisible) return;

        const now = performance.now();
        if (now < this.cooldownUntil) return;

        const cfg = this.game.config.styleSwoosh;
        const maxClear = ship.radius * cfg.maxClearance;
        const maxPairY = ship.radius * cfg.maxPairYDelta;
        const yBand = ship.radius * cfg.yBand;

        const candidates = [];
        for (const o of this.game.obstacleManager.obstacles) {
            if (SKIP_TYPES.has(o.constructor?.name)) continue;
            const b = obstacleBounds(o);
            // Only consider obstacles whose vertical band overlaps the ship closely.
            if (ship.y < b.top - yBand || ship.y > b.bottom + yBand) continue;
            // Vertically near the obstacle centre (threading past, not far above/below).
            if (Math.abs(ship.y - b.cy) > yBand + (b.bottom - b.top) * 0.15) continue;
            candidates.push(b);
        }

        if (candidates.length < 2) return;

        // Closest obstacle wholly to the left / right of the ship hull.
        let left = null;
        let right = null;
        for (const b of candidates) {
            if (b.right <= ship.x - ship.radius * 0.15) {
                if (!left || b.right > left.right) left = b;
            } else if (b.left >= ship.x + ship.radius * 0.15) {
                if (!right || b.left < right.left) right = b;
            }
        }

        if (!left || !right) return;
        if (Math.abs(left.cy - right.cy) > maxPairY) return;

        const leftClear = (ship.x - ship.radius) - left.right;
        const rightClear = right.left - (ship.x + ship.radius);

        // Must be clear of both (not colliding) AND tightly squeezed on both sides.
        if (leftClear <= 0 || rightClear <= 0) return;
        if (leftClear > maxClear || rightClear > maxClear) return;

        const key = pairKey(left, right);
        if (this.awardedPairs.has(key)) return;

        this.awardedPairs.add(key);
        this.cooldownUntil = now + cfg.cooldownMs;
        this.triggerSwoosh(ship, left, right, leftClear, rightClear);
    }

    triggerSwoosh(ship, left, right, leftClear, rightClear) {
        const pts = this.game.config.points.perSwoosh;
        this.game.points += pts;

        this.game.soundManager?.playSwoosh?.();
        this.game.logbook?.onStyleSwoosh?.();

        const midX = ship.x;
        const midY = ship.y;

        this.popups.push({
            x: midX,
            y: midY - ship.radius * 1.2,
            vy: -2.4,
            opacity: 1,
            points: pts,
        });

        // Expanding signal ring from the ship.
        this.effects.push({
            type: 'ring',
            x: midX,
            y: midY,
            r: ship.radius * 0.6,
            maxR: ship.radius * 4.2,
            life: 1,
        });

        // Soft paper flash plate behind the ship (brief).
        this.effects.push({
            type: 'flash',
            x: midX,
            y: midY,
            life: 1,
        });

        // Vertical speed streaks flanking the corridor.
        const streakCount = 7;
        for (let i = 0; i < streakCount; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const edgeX = side < 0
                ? left.right + leftClear * 0.35
                : right.left - rightClear * 0.35;
            this.effects.push({
                type: 'streak',
                x: edgeX + (Math.random() - 0.5) * ship.radius * 0.4,
                y: midY + (Math.random() - 0.5) * ship.radius * 1.6,
                length: ship.radius * (1.8 + Math.random() * 2.2),
                life: 0.85 + Math.random() * 0.15,
                side,
            });
        }

        // Dotted arcs hugging both obstacle edges — the "threaded the needle" cue.
        this.effects.push({
            type: 'gapDots',
            leftX: left.right,
            rightX: right.left,
            y: midY,
            life: 1,
        });
    }

    tickEffects() {
        this.effects = this.effects
            .map(e => {
                if (e.type === 'ring') {
                    e.r += (e.maxR - e.r) * 0.18;
                    e.life -= 0.045;
                } else if (e.type === 'flash') {
                    e.life -= 0.08;
                } else if (e.type === 'streak') {
                    e.y += 3.2; // drift "down" screen as ship climbs past
                    e.life -= 0.055;
                } else if (e.type === 'gapDots') {
                    e.life -= 0.04;
                }
                return e;
            })
            .filter(e => e.life > 0);

        const dt = this.game.dt ?? (1 / 60);
        const tickScale = dt * 60;
        // In place — no per-frame object churn (GC-hitch fuel).
        let w = 0;
        for (let i = 0; i < this.popups.length; i++) {
            const p = this.popups[i];
            p.y += p.vy * dt;
            p.opacity -= 0.018 * tickScale;
            if (p.opacity > 0) this.popups[w++] = p;
        }
        this.popups.length = w;

        // Drop awarded keys once few remain (obstacles long gone) to avoid unbounded Set.
        if (this.awardedPairs.size > 40) {
            this.awardedPairs.clear();
        }
    }

    render(ctx) {
        const cam = this.game.camera;
        const unit = this.game.baseUnit;

        for (const e of this.effects) {
            const sy = cam.getRelativeY(e.y);
            if (e.type === 'ring') {
                ctx.save();
                ctx.beginPath();
                ctx.arc(e.x, sy, e.r, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${color.signalRgb}, ${0.55 * e.life})`;
                ctx.lineWidth = Math.max(1.5, unit * 0.18);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(e.x, sy, e.r * 0.72, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${color.signalRgb}, ${0.08 * e.life})`;
                ctx.fill();
                ctx.restore();
            } else if (e.type === 'flash') {
                if (isKilled(this.game.perfFlags, 'glows')) continue;
                ctx.save();
                if (this.game.useGlowSprites) {
                    drawSwooshFlashSprite(ctx, e.x, sy, unit * 6, 0.36 * e.life);
                } else if (!this.game.iosDrawLod) {
                    const gr = ctx.createRadialGradient(e.x, sy, 0, e.x, sy, unit * 6);
                    gr.addColorStop(0, `rgba(${color.signalRgb}, ${0.18 * e.life})`);
                    gr.addColorStop(1, `rgba(${color.signalRgb}, 0)`);
                    ctx.fillStyle = gr;
                    ctx.beginPath();
                    ctx.arc(e.x, sy, unit * 6, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            } else if (e.type === 'streak') {
                ctx.save();
                ctx.strokeStyle = `rgba(${color.signalRgb}, ${0.45 * e.life})`;
                ctx.lineWidth = Math.max(1.2, unit * 0.12);
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(e.x, cam.getRelativeY(e.y));
                ctx.lineTo(e.x, cam.getRelativeY(e.y + e.length));
                ctx.stroke();
                ctx.restore();
            } else if (e.type === 'gapDots') {
                ctx.save();
                const syMid = cam.getRelativeY(e.y);
                const dotR = Math.max(1.2, unit * 0.14);
                const span = unit * 2.4;
                ctx.fillStyle = `rgba(${color.signalRgb}, ${0.7 * e.life})`;
                for (let i = -3; i <= 3; i++) {
                    const dy = (i / 3) * span;
                    ctx.beginPath();
                    ctx.arc(e.leftX + dotR * 1.2, syMid + dy, dotR, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(e.rightX - dotR * 1.2, syMid + dy, dotR, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        for (const p of this.popups) {
            const sy = cam.getRelativeY(p.y);
            ctx.save();
            // Multiplied so the popup fades with the world during the level-clear
            // flyout rather than sitting on top of it at full strength.
            ctx.globalAlpha *= Math.max(0, p.opacity);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            setLabelType(ctx, Math.max(10, unit * 0.95));
            ctx.fillStyle = color.signal;
            ctx.fillText('SWOOSH', p.x, sy - unit * 1.1);

            setMonoType(ctx, unit * 1.55);
            ctx.fillStyle = color.signal;
            ctx.fillText(`+${p.points}`, p.x, sy + unit * 0.35);
            resetType(ctx);
            ctx.restore();
        }
    }
}
