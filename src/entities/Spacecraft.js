// Spacecraft.js
// The player ship: movement, heading, hitbox, trail, and shield state/rendering.
// Changes:
// - Forward motion is one classic paint-tick per sim step: `*(1/60)` and the
//   0.95/0.05 ease. Snappy feel on every device comes from Game running these
//   steps at 120 Hz (web + native), not from wall-clock dt here.
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

import { SHIELD_BLUE_RGB } from '../utils/DrawUtils.js';
import { getSkin } from '../ships/skins.js';
import { MAX_BANK } from '../ships/hulls.js';

const BANK_SMOOTHING = 0.18;
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

        this.trail = [];
        this.moveState = null;
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
    }

    reset() {
        this.x = this.game.width / 2;
        this.y = this.game.height * 0.85;
        this.trail = [];
        this.moveState = null;
        this.boost = 1;
        this.isVisible = true;
        this.tangent = 0;
        this.bank = 0;
        this.speed = 0;
        this.prevX = this.x;
        this.prevY = this.y;
        this.updateHitCircles();
    }

    update() {
        if (this.game.isPaused) return;

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

        // Smooth vertical movement — one classic paint-tick per sim step.
        const targetVerticalSpeed = this.baseSpeed * this.boost;
        this.verticalVelocity = this.verticalVelocity * 0.95 + targetVerticalSpeed * 0.05;
        this.y -= this.verticalVelocity * (1 / 60);

        // Handle arc movement if active
        if (this.moveState) {
            const elapsed = currentTime - this.moveState.startTime;
            const progress = Math.min(1, elapsed / this.arcDuration);
            
            const angle = (this.moveState.direction === 'left' ? -1 : 1) * Math.PI * progress;
            const newX = this.moveState.startX + Math.sin(angle) * this.arcRadius;
            
            // Wall collision check
            if (newX < this.radius || newX > this.game.width - this.radius) {
                const newDirection = newX < this.radius ? 'right' : 'left';
                const bounceX = newX < this.radius ? this.radius : this.game.width - this.radius;
                
                // Play turn sound when bouncing
                this.game.soundManager.playTurn();
                
                this.moveState = {
                    startX: bounceX,
                    startY: this.y,
                    startTime: currentTime,
                    direction: newDirection,
                };
                
                this.x = bounceX;
            } else {
                this.x = newX;
            }
            
            // Smoother vertical boost during movement. Honour cinematic `boost`
            // so an arc that ends as the flyout starts doesn't yank the speed.
            const verticalBoost = Math.sin(progress * Math.PI) * (this.baseSpeed * 0.3);
            this.verticalVelocity = this.baseSpeed * this.boost + verticalBoost;
            
            if (progress >= 1) {
                this.moveState = null;
            }
        }

        this.updateHeading(prevX, prevY);
        this.updateTrail();

        // Update shield
        if (this.shieldActive) {
            this.shieldTimer -= (1000 / 60);
            this.shieldPulse += 0.1;

            // Start warning animation when shield is about to end (last 1.5 seconds)
            if (this.shieldTimer < 1500 && !this.shieldWarningStarted) {
                this.shieldWarningStarted = true;
                this.shieldPulse = 0; // Reset pulse for warning animation
            }

            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
                this.shieldWarningStarted = false;
            }
        }

        // Last, so the circles reflect this frame's final position, bank and
        // shield state before ObstacleManager tests them.
        this.updateHitCircles();
    }

    startMovement(direction) {
        if (this.game.isPaused) return;

        // Play turn sound when starting a new movement
        this.game.soundManager.playTurn();
        
        // Always start fresh movement
        this.moveState = {
            startX: this.x,
            startY: this.y,
            startTime: performance.now(),
            direction
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
        const tail = this.tailPoint();

        // Only add new trail point if we've moved enough since the last one
        const lastPoint = this.trail[this.trail.length - 1];
        if (!lastPoint ||
            Math.hypot(tail.x - lastPoint.x, tail.y - lastPoint.y) > this.game.config.spacecraft.trailSpacing) {
            this.trail.push({
                x: tail.x,
                y: tail.y,
                opacity: 1.0,
                angle: this.tangent,
                seed: Math.random(), // stable per-point jitter for ember wakes
            });
        }

        // Update existing trail points
        this.trail = this.trail
            .map(point => ({
                ...point,
                opacity: point.opacity - (1 / 180)
            }))
            .filter(point => point.opacity > 0)
            .slice(-80); // long enough that a hard turn isn't truncated early
    }

    render(ctx) {
        if (!this.isVisible) return;

        const skin = getSkin(this.game.shipSkinId);
        const screenY = this.game.camera.getRelativeY(this.y);
        const time = performance.now();

        ctx.save();
        skin.drawTrail(ctx, this, this.trail, (wy) => this.game.camera.getRelativeY(wy));
        skin.drawHull(ctx, this, screenY, time);
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
            ctx.strokeStyle = `rgba(${SHIELD_BLUE_RGB}, ${opacity})`;
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
            ctx.strokeStyle = `rgba(${SHIELD_BLUE_RGB}, ${opacity * 0.5})`;
            ctx.lineWidth = this.radius * 0.1;
            ctx.stroke();
        }
    }

    // Dev aid behind ?hitbox: outline what obstacles are actually tested against.
    renderHitCircles(ctx) {
        ctx.save();
        ctx.strokeStyle = `rgba(${SHIELD_BLUE_RGB}, 0.9)`;
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
}
