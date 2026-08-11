// Collectible.js
// A randomly-spawned fuel diamond: an on-brand Signal-Blue four-point sparkle
// with a soft glow halo and a gentle pulse. Collecting one refills ship fuel
// (see CollectibleManager / GameConfig.fuel). Blue is the game's single accent
// and means "good / active" (the same hue as the shield), so it reads as safe
// to grab versus the solid-ink hazards.
// Changes:
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
    }

    update() {
        // Time-scale spin + pulse so they run at a framerate-independent rate
        // (were per-frame, so they jittered when the phone's cadence wobbled).
        const tickScale = this.game?.tickScale ?? 1;
        this.pulsePhase += 0.06 * tickScale;
        this.rotation += 0.01 * tickScale;
    }

    render(ctx) {
        const relativeY = this.game.camera.getRelativeY(this.y);

        // Cull when fully off-screen (glow can extend ~2x the sparkle radius).
        if (relativeY + this.size * 2 < 0 || relativeY - this.size * 2 > this.game.height) {
            return;
        }

        const pulse = 1 + Math.sin(this.pulsePhase) * 0.12;
        const r = this.size * pulse;

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
