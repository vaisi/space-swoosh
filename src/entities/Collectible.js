// Collectible.js
// A randomly-spawned fuel diamond: an on-brand Signal-Blue four-point sparkle
// with a soft glow halo and a gentle pulse. Collecting one refills ship fuel
// (see CollectibleManager / GameConfig.fuel). Blue is the game's single accent
// and means "good / active" (the same hue as the shield), so it reads as safe
// to grab versus the solid-ink hazards.
// Changes:
// - Magnet latches on first enter of ~4.25× ship radius, then eases in and
//   accelerates as it closes (no unlatch) so the suck-in is readable. New
//   latches still work during the engines-out coast so a near miss salvages.
// - Soft magnet: when within ~4.25× ship radius (and not fuelDying), ease world
//   position toward the ship with proximity falloff (pull 0.15); collect still
//   on contact (including during the engines-out coast).
// - Copy: fuel refill diamond (not style points).
// - Phase 1: cheap Canvas uses pre-baked glow sprite (drawImage) so iOS can
//   show the halo again without createRadialGradient / soft path fills.
// - iOS draw LOD (without sprites): skip soft signalSoft halo.
// - Reduced sparkle/diamond size from 1.6× to 1.15× baseUnit so pickups feel
//   less oversized relative to the ship and asteroids.
// - Created file: the sparkle collectible entity (render + circle collision).

import { color } from '../brand/tokens.js';
import { drawSparkle } from '../utils/BrandDraw.js';
import { drawSignalHaloSprite } from '../utils/GlowSprites.js';
import { isKilled } from '../core/perfFlags.js';

export class Collectible {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.size = game.baseUnit * 1.15;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.rotation = 0;
        this.latched = false;
        this.latchAge = 0;
        this.latchFromDist = 0;
        this.latchMix = 0;
    }

    update() {
        // Time-scale spin + pulse so they run at a framerate-independent rate
        // (were per-frame, so they jittered when the phone's cadence wobbled).
        const tickScale = this.game?.tickScale ?? 1;
        this.pulsePhase += 0.06 * tickScale;
        this.rotation += 0.01 * tickScale;

        // Latch on first enter of the magnet radius, then chase until collect.
        const ship = this.game?.spacecraft;
        if (!ship) return;

        const fuelCfg = this.game.config?.fuel;
        const magnetRadius = ship.radius * (fuelCfg?.magnetRadiusScale ?? 4.25);
        const dx = ship.x - this.x;
        const dy = ship.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < magnetRadius && !this.latched) {
            this.latched = true;
            this.latchFromDist = dist;
            this.latchAge = 0;
        }
        if (!this.latched || dist <= 0) return;

        const dt = this.game.dt ?? (tickScale / 60);
        this.latchAge += dt;
        const rampSec = (fuelCfg?.magnetLatchRampMs ?? 340) / 1000;
        const easeIn = Math.min(1, this.latchAge / Math.max(0.001, rampSec));
        const closing = 1 - Math.min(1, dist / Math.max(this.latchFromDist, 1));
        // Time ramp or closing — whichever is ahead — so fly-bys still finish
        // and near grabs still speed up at the end like the old suck-in.
        const mix = Math.max(easeIn * easeIn, closing);
        this.latchMix = mix;

        const minPull = fuelCfg?.magnetLatchMin ?? 0.03;
        const peak = fuelCfg?.magnetPull ?? 0.16;
        const t = Math.min(0.32, (minPull + peak * mix) * tickScale);
        this.x += dx * t;
        this.y += dy * t;
        this.rotation += (0.01 + 0.06 * mix) * tickScale;
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);

        // Cull when fully off-screen (glow can extend ~2x the sparkle radius).
        if (relativeY + this.size * 2 < 0 || relativeY - this.size * 2 > this.game.height) {
            return;
        }

        const mix = this.latched ? this.latchMix : 0;
        const pulse = 1 + Math.sin(this.pulsePhase) * (0.12 + 0.08 * mix);
        const r = this.size * pulse * (1 + 0.1 * mix);

        ctx.save();
        ctx.translate(this.x, relativeY);

        // Soft signal glow halo — telegraphs "collect me".
        // Phase 1 sprites restore this on iOS; LOD without sprites still skips.
        if (!isKilled(this.game.perfFlags, 'glows')) {
            if (this.game.useGlowSprites) {
                drawSignalHaloSprite(ctx, 0, 0, r * 1.9);
            } else if (!this.game.iosDrawLod) {
                ctx.beginPath();
                ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2);
                ctx.fillStyle = color.signalSoft;
                ctx.fill();
            }
        }

        // The sparkle itself, solid Signal Blue, slowly rotating.
        ctx.rotate(this.rotation);
        drawSparkle(ctx, 0, 0, r, { fill: color.signal });

        ctx.restore();
    }

    checkCollision(spacecraft) {
        const dx = this.x - spacecraft.x;
        const dy = this.y - spacecraft.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.size + spacecraft.radius);
    }
}
