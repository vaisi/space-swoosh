// Spacecraft.js
// The player ship: movement, heading, hitbox, trail, and shield state/rendering.
// Changes:
// - Gameplay `speedBoost` (1.82×, 5s, refreshable) from wall-boost pickups —
//   separate from cinematic `boost` so level-clear flyout is untouched.
// - Arc banks: linear full-π half-turn so X closes to startX (snap on finish).
//   Mid-arc key/tap always starts a fresh full-duration arc from the current
//   seat (no 0.55× redirect). Vertical speed eases toward the arc target so
//   camera catch-up doesn't jerk on redirect. Taller climb via arcDuration +
//   mid-arc verticalBoost 0.55.
// - Phase 1: optional hull bitmap blit via HullCache when game.useHullCache.
//   Render accepts { skipTrail, skipHull } for Phase 0 bisect (?kill=).
// - Per-skin trail length: optional `trailMaxPoints` / `trailFade` on the
//   active skin (Nyan ~2× wake). iOS draw LOD still scales max points ×0.6.
// - `skipHullCache` on a skin forces live `drawHull` (for animated hull paint).
// - iOS draw LOD: shorter wake (48 pts vs 80) via game.iosDrawLod.
// - Render stamps `ship._wallTrailMode` from the active skin so wakes can pile
//   or spring on wall hits without a trails↔skins import cycle.
// - `startMovement(direction)` param name restored (was `_direction` while the
//   body still used `direction`, which broke arc banks).
// - Sidewall bounces (arc + zigzag) fire WallBoopManager + playBoop for every
//   skin — ink "BOOP" popup below the hull beside the wall.
// - Wall bounce sets `wallJelly` ({ t0, side }) so every hull can squash/shake
//   against the wall via beginHullFrame — visual only; hitbox stays undeformed.
// - `wormholeTransit` freezes motion + marks invuln during portal hops so the
//   ship cannot drift into gate rocks while faded out.
// - updateTrail mutates opacities in place (no map/filter/slice per frame) to
//   cut GC pressure on iOS WKWebView.
// - Forward motion is one smooth step per frame via `game.tickScale`.
// - Direction changes: bank eases via BANK_SMOOTHING (hull lean, not path).
// - Zigzag flight style: constant straight lean at ±zigzagAngleDeg from up;
//   tap/key flips lean — no arcs; touch swipe ignored.
// - Added `boost`, a cinematic multiplier on forward speed. Gameplay leaves it at
//   1; the Journey level-clear flyout ramps it to send the ship off the top.
// - Forward speed is scaled by `game.profile.speedMultiplier`, which is the dial
//   the whole run's pace hangs off (Camera.speed is vestigial — Camera.update
//   derives its velocity from the ship's position, not from that field).
// - Obstacle collisions now use `hitCircles`: the active skin's hitbox profile
//   rotated into world space each frame, so a shaped hull only collides where
//   it visibly is. Shielded, that collapses to the drawn bubble. Pickups still
//   use the generous `radius` circle, and so do wall bounce + style swoosh.
// - Hull + trail rendering delegated to ship skins. Active skin comes from
//   game.shipSkinId.
// - Ship tracks its direction of travel: `tangent` (raw world heading) and
//   `bank` (clamped + smoothed hull rotation) so shaped hulls turn into the
//   arc instead of always pointing up.
// - Trail points are emitted from the hull's tail and carry the tangent plus a
//   stable seed, so wake renderers can orient marks along the flight path.
// - Active-shield glow rings use the shared "shield blue" so they visually
//   match the blue shield pickup + portals (reinforcing the mechanic connection).

import { color } from '../brand/tokens.js';
import { getSkin } from '../ships/skins.js';
import { MAX_BANK } from '../ships/hulls.js';
import { drawCachedHull } from '../ships/HullCache.js';
import { FLIGHT_STYLE } from '../config/flightStyle.js';

const BANK_SMOOTHING = 0.34; // snappier hull lean on direction changes
const MIN_HEADING_SPEED = 0.01;
const TAIL_OFFSET = 0.6; // multiples of radius, behind the hull centre
const SHIELD_HITBOX_SCALE = 1.5; // matches the drawn bubble
const DEBUG_HITBOX = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).has('hitbox');

function wrapAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export class Spacecraft {
    constructor(game) {
        console.log('Creating spacecraft...');
        this.game = game;
        this.radius = this.game.baseUnit;
        this.x = this.game.width / 2;
        this.y = this.game.height * 0.8;
        this.baseSpeed = game.config.spacecraft.speed
            * game.height
            * game.profile.speedMultiplier;
        this.arcRadius = game.config.spacecraft.arcRadius * game.width;
        this.arcDuration = game.config.spacecraft.arcDuration;
        
        // Cinematic multiplier on forward speed — 1 in the player's hands, ramped
        // up by the level-clear flyout.
        this.boost = 1;

        // Gameplay speed boost from wall-slab pickups (independent of cinematic boost).
        this.speedBoostTimer = 0;
        this.speedBoostDuration = 5000;
        this.speedBoostFactor = 1.82; // 30% bigger than the original 1.4× wall boost

        this.trail = [];
        this.moveState = null;
        // Zigzag: +1 = lean right, -1 = lean left (straight at zigzagAngleDeg).
        this.zigzagSign = 1;
        this.verticalSpeed = this.baseSpeed;
        this.isVisible = true;
        this.verticalVelocity = this.baseSpeed;

        // Heading state (0 = nose up, positive = leaning right).
        this.tangent = 0;
        this.bank = 0;
        this.speed = 0;
        this.prevX = this.x;
        this.prevY = this.y;
        this.hitCircles = [];
        this.updateHitCircles();
        
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldDuration = 5000; // Increased from 3000 to 5000 (5 seconds)
        this.shieldPulse = 0;
        this.shieldWarningStarted = false; // For visual feedback when shield is about to end
        
        console.log('Spacecraft position:', this.x, this.y);
        this.pausedState = null; // Store movement state during pause
        this.pausedTime = 0;  // Store time when paused
        // True while a WormholeGate hop is in flight (frozen + invulnerable).
        this.wormholeTransit = false;
        // Square-family wall jelly: { t0, side: -1 left | +1 right } or null.
        this.wallJelly = null;
    }

    reset() {
        this.x = this.game.width / 2;
        this.y = this.game.height * 0.85;
        this.trail = [];
        this.moveState = null;
        this.zigzagSign = 1;
        this.boost = 1;
        this.speedBoostTimer = 0;
        this.isVisible = true;
        this.wormholeTransit = false;
        this.wallJelly = null;
        this.tangent = 0;
        this.bank = 0;
        this.speed = 0;
        this.prevX = this.x;
        this.prevY = this.y;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldWarningStarted = false;
        this.updateHitCircles();
    }

    /** Combined cinematic × gameplay forward multiplier. */
    speedBoostMultiplier() {
        return this.speedBoostTimer > 0 ? this.speedBoostFactor : 1;
    }

    forwardSpeedScale() {
        return this.boost * this.speedBoostMultiplier();
    }

    isZigzag() {
        return this.game.flightStyle === FLIGHT_STYLE.zigzag;
    }

    update() {
        if (this.game.isPaused) return;
        // Portal hop owns position until the exit snap — do not keep flying.
        if (this.wormholeTransit) return;

        const currentTime = performance.now();
        const prevX = this.x;
        const prevY = this.y;
        
        // If we were paused and have a movement state
        if (this.pausedTime > 0) {
            if (this.moveState) {
                // Adjust the movement timing
                const pauseDuration = currentTime - this.pausedTime;
                this.moveState.startTime += pauseDuration;
                
                // Check if movement should have completed during pause
                const elapsed = currentTime - this.moveState.startTime;
                if (elapsed >= this.arcDuration) {
                    this.moveState = null;
                }
            }
            // Always reset pause time after handling it
            this.pausedTime = 0;
        }

        const tickScale = this.game.tickScale ?? 1;

        if (this.isZigzag()) {
            this.updateZigzag(tickScale);
            this.updateHeading(prevX, prevY);
            this.updateTrail();
            this.updateShield(tickScale);
            this.updateSpeedBoost(tickScale);
            this.updateHitCircles();
            return;
        }

        // Smooth vertical movement — one frame, snappy tickScale (see Game).
        const targetVerticalSpeed = this.baseSpeed * this.forwardSpeedScale();
        const keep = Math.pow(0.95, tickScale);
        this.verticalVelocity = this.verticalVelocity * keep + targetVerticalSpeed * (1 - keep);
        this.y -= this.verticalVelocity * (1 / 60) * tickScale;

        // Handle arc movement if active
        if (this.moveState) {
            const duration = this.moveState.duration ?? this.arcDuration;
            const elapsed = currentTime - this.moveState.startTime;
            const progress = Math.min(1, elapsed / duration);
            // Full half-turn so sin(end)=0 and X returns to startX. Linear in
            // time so the S spreads over the whole climb (ease-in packed it
            // sideways into a short vertical span).
            const angle = (this.moveState.direction === 'left' ? -1 : 1)
                * Math.PI * progress;
            const newX = this.moveState.startX + Math.sin(angle) * this.arcRadius;
            
            // Wall collision check
            if (newX < this.radius || newX > this.game.width - this.radius) {
                const hitLeft = newX < this.radius;
                const newDirection = hitLeft ? 'right' : 'left';
                const bounceX = hitLeft ? this.radius : this.game.width - this.radius;

                const wallSide = hitLeft ? -1 : 1;
                this.triggerWallJelly(wallSide);
                this.game.wallBoopManager?.triggerBoop(this, wallSide);

                this.moveState = {
                    startX: bounceX,
                    startY: this.y,
                    startTime: currentTime,
                    direction: newDirection,
                    duration: this.arcDuration * 0.7,
                };

                this.x = bounceX;
            } else {
                this.x = newX;
            }
            
            // Mid-arc boost, eased toward so a fresh bank mid-turn doesn't slam
            // cruise (camera catch-up would jerk). Honour cinematic + gameplay boost.
            const verticalBoost = Math.sin(progress * Math.PI) * (this.baseSpeed * 0.55);
            const desiredVertical = this.baseSpeed * this.forwardSpeedScale() + verticalBoost;
            const vKeep = Math.pow(0.86, tickScale);
            this.verticalVelocity = this.verticalVelocity * vKeep
                + desiredVertical * (1 - vKeep);
            
            if (progress >= 1) {
                this.x = this.moveState.startX;
                this.moveState = null;
            }
        }

        this.updateHeading(prevX, prevY);
        this.updateTrail();
        this.updateShield(tickScale);
        this.updateSpeedBoost(tickScale);

        // Last, so the circles reflect this frame's final position, bank and
        // shield state before ObstacleManager tests them.
        this.updateHitCircles();
    }

    /** Straight diagonal cruise at ±zigzagAngleDeg from straight up. */
    updateZigzag(tickScale) {
        this.moveState = null;
        const cfg = this.game.config.spacecraft;
        const deg = cfg.zigzagAngleDeg ?? 52;
        const rad = (deg * Math.PI) / 180;
        const speed = this.baseSpeed * this.forwardSpeedScale() * (cfg.zigzagSpeedScale ?? 1.45);
        const dist = speed * (1 / 60) * tickScale;

        this.x += Math.sin(rad) * this.zigzagSign * dist;
        this.y -= Math.cos(rad) * dist;
        // Camera catch-up keys off verticalVelocity (px/sec-style).
        this.verticalVelocity = speed * Math.cos(rad);

        // Walls bounce — flip lean and clamp.
        if (this.x < this.radius) {
            this.x = this.radius;
            this.zigzagSign = 1;
            this.triggerWallJelly(-1);
            this.game.wallBoopManager?.triggerBoop(this, -1);
        } else if (this.x > this.game.width - this.radius) {
            this.x = this.game.width - this.radius;
            this.zigzagSign = -1;
            this.triggerWallJelly(1);
            this.game.wallBoopManager?.triggerBoop(this, 1);
        }
    }

    /** Kick a short jelly squash for Square skins (and harmlessly ignored by others). */
    triggerWallJelly(side) {
        this.wallJelly = { t0: performance.now(), side };
    }

    updateShield(tickScale) {
        if (!this.shieldActive) return;
        this.shieldTimer -= (1000 / 60) * tickScale;
        // Slightly snappier pulse while speed-boosted so the dual buff reads.
        const pulseRate = this.speedBoostTimer > 0 ? 0.14 : 0.1;
        this.shieldPulse += pulseRate * tickScale;

        if (this.shieldTimer < 1500 && !this.shieldWarningStarted) {
            this.shieldWarningStarted = true;
            this.shieldPulse = 0;
        }

        if (this.shieldTimer <= 0) {
            this.shieldActive = false;
            this.shieldWarningStarted = false;
        }
    }

    updateSpeedBoost(tickScale) {
        if (this.speedBoostTimer <= 0) return;
        this.speedBoostTimer -= (1000 / 60) * tickScale;
        if (this.speedBoostTimer < 0) this.speedBoostTimer = 0;
    }

    /** Zigzag: flip lean. Arc mode ignores this. */
    flipZigzag() {
        if (this.game.isPaused || !this.isZigzag()) return;
        this.zigzagSign *= -1;
        this.game.soundManager.playTurn();
        this.game.soundManager.playMove();
        // Tutorial completion tracks flips the same way arc tracks banks.
        this.game.obstacleManager?.trackMovement?.('flip');
    }

    startMovement(direction) {
        if (this.game.isPaused) return;

        // Zigzag: every press/tap flips — no absolute left/right aim.
        if (this.isZigzag()) {
            this.flipZigzag();
            return;
        }

        // Play turn sound when starting a new movement
        this.game.soundManager.playTurn();

        // Always a full symmetrical arc from the current seat — mid-arc left/right
        // must feel identical to a bank from cruise (no shortened redirect).
        this.moveState = {
            startX: this.x,
            startY: this.y,
            startTime: performance.now(),
            direction,
            duration: this.arcDuration,
        };
        this.game.soundManager.playMove();
    }

    // Direction of travel through the world, derived from the frame's actual
    // displacement so it stays correct for arcs, wall bounces and boosts alike.
    updateHeading(prevX, prevY) {
        const vx = this.x - prevX;
        const vy = this.y - prevY;
        this.speed = Math.hypot(vx, vy);

        // Below the threshold the delta is noise; keep the last good heading.
        if (this.speed > MIN_HEADING_SPEED) {
            this.tangent = Math.atan2(vx, -vy);
        }

        const target = Math.max(-MAX_BANK, Math.min(MAX_BANK, this.tangent));
        this.bank += wrapAngle(target - this.bank) * BANK_SMOOTHING;
    }

    // The active skin's hitbox, rotated by the bank into world space. Obstacles
    // are tested against each circle in turn, which keeps a shaped hull from
    // colliding with things it visibly cleared.
    updateHitCircles() {
        // A shield is a bubble around the whole ship, so while it's up the
        // hitbox is the bubble that's actually drawn, not the hull inside it.
        if (this.shieldActive) {
            this.hitCircles = [{
                x: this.x,
                y: this.y,
                radius: this.radius * SHIELD_HITBOX_SCALE,
            }];
            return;
        }

        const profile = getSkin(this.game.shipSkinId).hitbox;
        const cos = Math.cos(this.bank);
        const sin = Math.sin(this.bank);

        this.hitCircles = profile.map((circle) => {
            const lx = circle.x * this.radius;
            const ly = circle.y * this.radius;
            return {
                x: this.x + lx * cos - ly * sin,
                y: this.y + lx * sin + ly * cos,
                radius: circle.r * this.radius,
            };
        });
    }

    // `target` is any obstacle: they all read only x / y / radius, so each
    // circle can be handed to their existing per-shape maths as a probe.
    collidesWith(target) {
        return this.hitCircles.some((circle) => target.checkCollision(circle));
    }

    // The wake leaves from behind the hull, not its centre. This uses `bank`
    // rather than `tangent` so the trail stays pinned to the back of the ship
    // as it is actually drawn, even when the clamp holds the nose off the true
    // direction of travel.
    tailPoint() {
        const offset = this.radius * TAIL_OFFSET;
        return {
            x: this.x - Math.sin(this.bank) * offset,
            y: this.y + Math.cos(this.bank) * offset,
        };
    }

    updateTrail() {
        const trail = this.trail;
        const skin = getSkin(this.game.shipSkinId);
        const fade = skin.trailFade ?? (1 / 180);
        // iOS draw LOD: fewer samples → cheaper ribbons / dense marks / clouds.
        // Skins may request a longer wake (e.g. Nyan); LOD still trims ~40%.
        const baseMax = skin.trailMaxPoints ?? 80;
        const maxPoints = this.game.iosDrawLod
            ? Math.max(48, Math.round(baseMax * 0.6))
            : baseMax;

        // Fade in place; drop dead heads without allocating a new array.
        let write = 0;
        for (let i = 0; i < trail.length; i++) {
            const point = trail[i];
            point.opacity -= fade;
            if (point.opacity > 0) {
                if (write !== i) trail[write] = point;
                write++;
            }
        }
        trail.length = write;

        const tail = this.tailPoint();

        // Only add a new sample if we've moved enough since the last one.
        const lastPoint = trail[trail.length - 1];
        if (!lastPoint ||
            Math.hypot(tail.x - lastPoint.x, tail.y - lastPoint.y) > this.game.config.spacecraft.trailSpacing) {
            trail.push({
                x: tail.x,
                y: tail.y,
                opacity: 1.0,
                angle: this.tangent,
                seed: Math.random(), // stable per-point jitter for ember wakes
            });
        }

        // Cap length from the oldest end (hard turns stay long enough).
        if (trail.length > maxPoints) {
            trail.splice(0, trail.length - maxPoints);
        }
    }

    render(ctx, { skipTrail = false, skipHull = false } = {}) {
        if (!this.isVisible) return;

        const skin = getSkin(this.game.shipSkinId);
        const screenY = this.game.camera.getRelativeY(this.y);
        const time = performance.now();

        ctx.save();
        // Trails read this so wake physics can stay mode-aware without importing skins.
        this._wallTrailMode = skin.wallTrailMode ?? 'spring';
        if (!skipTrail) {
            skin.drawTrail(ctx, this, this.trail, (wy) => this.game.camera.getRelativeY(wy));
        }
        if (!skipHull) {
            if (this.game.useHullCache && !skin.skipHullCache) {
                drawCachedHull(ctx, this, screenY, time);
            } else {
                skin.drawHull(ctx, this, screenY, time);
            }
        }
        ctx.restore();

        if (DEBUG_HITBOX) this.renderHitCircles(ctx);

        // Render shield if active
        if (this.shieldActive) {
            let pulseScale;
            let opacity;
            
            if (this.shieldWarningStarted) {
                // Faster, more dramatic pulsing for warning
                pulseScale = 1 + Math.sin(this.shieldPulse * 2) * 0.3;
                opacity = 0.7 + Math.sin(this.shieldPulse * 2) * 0.3;
            } else {
                // Normal shield pulsing
                pulseScale = 1 + Math.sin(this.shieldPulse) * 0.2;
                opacity = 0.5 + Math.sin(this.shieldPulse) * 0.2;
            }
            
            const shieldSize = this.radius * 1.5 * pulseScale;
            
            ctx.beginPath();
            ctx.arc(
                this.x,
                screenY,
                shieldSize,
                0,
                Math.PI * 2
            );
            ctx.strokeStyle = `rgba(${color.signalRgb}, ${opacity})`;
            ctx.lineWidth = this.radius * 0.2;
            ctx.stroke();

            // Add second shield ring for visual effect
            ctx.beginPath();
            ctx.arc(
                this.x,
                screenY,
                shieldSize * 1.1,
                0,
                Math.PI * 2
            );
            ctx.strokeStyle = `rgba(${color.signalRgb}, ${opacity * 0.5})`;
            ctx.lineWidth = this.radius * 0.1;
            ctx.stroke();
        }
    }

    // Dev aid behind ?hitbox: outline what obstacles are actually tested against.
    renderHitCircles(ctx) {
        ctx.save();
        ctx.strokeStyle = `rgba(${color.signalRgb}, 0.9)`;
        ctx.lineWidth = 1;
        for (const circle of this.hitCircles) {
            ctx.beginPath();
            ctx.arc(circle.x, this.game.camera.getRelativeY(circle.y), circle.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    activateShield() {
        this.shieldActive = true;
        this.shieldTimer = this.shieldDuration;
        this.shieldWarningStarted = false;
        this.shieldPulse = 0;
        this.updateHitCircles();
    }

    activateSpeedBoost() {
        this.speedBoostTimer = this.speedBoostDuration;
    }
}
