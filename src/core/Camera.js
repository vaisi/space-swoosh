// Camera.js
// Scroll position + world→screen mapping.
// Changes:
// - One smooth step per rendered frame via `game.tickScale` (snappy 120 Hz
//   reference). Avoids multi-step catch-up stutter while keeping the same
//   travel-per-second as classic paint-ticks at ~120 Hz.

export class Camera {
    constructor(game) {
        this.game = game;
        this.y = 0;
        this.targetY = 0;
        this.totalDistance = 0;
        this.speed = game.config.camera.speed * game.height;
        this.interpolation = game.config.camera.interpolation;
        this.idealOffset = game.height * 0.75;
        this.velocity = 0;
        this.shake = { x: 0, y: 0 };
    }

    update(speedFactor = 1) {
        const tickScale = this.game.tickScale ?? 1;

        // Calculate target position based on ship position
        const targetY = this.game.spacecraft.y - this.idealOffset;

        // Velocity is in classic paint-tick units; scale apply + smoothing.
        const targetVelocity = (targetY - this.y) * this.interpolation * speedFactor;
        const keep = Math.pow(this.game.config.camera.smoothingFactor, tickScale);
        this.velocity = this.velocity * keep + targetVelocity * (1 - keep);

        this.y += this.velocity * tickScale;

        // Track total distance
        this.totalDistance = Math.abs(this.y);
    }

    getRelativeY(absoluteY) {
        return absoluteY - this.y;
    }
}
