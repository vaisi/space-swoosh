// Camera.js
// Scroll position + world→screen mapping.
// Changes:
// - Back to the classic per-tick step (`y += velocity` once per sim tick).
//   Snappy global pacing is owned by Game's 120 Hz catch-up loop, which runs
//   these ticks at the same rate on web and native.

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
        // Calculate target position based on ship position
        const targetY = this.game.spacecraft.y - this.idealOffset;

        // Use velocity-based smoothing instead of direct interpolation
        const targetVelocity = (targetY - this.y) * this.interpolation * speedFactor;
        this.velocity = this.velocity * this.game.config.camera.smoothingFactor +
                       targetVelocity * (1 - this.game.config.camera.smoothingFactor);

        // Apply velocity (one classic paint-tick)
        this.y += this.velocity;

        // Track total distance
        this.totalDistance = Math.abs(this.y);
    }

    getRelativeY(absoluteY) {
        return absoluteY - this.y;
    }
}
