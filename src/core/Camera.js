// Camera.js
// Scroll position + world→screen mapping.
// Changes:
// - Motion integrates with real `dt` (via game.dt). Per-tick velocity is scaled
//   by `dt * 60` so at 60 FPS behavior matches the original per-frame camera;
//   lower/higher refresh rates travel the same world distance per second.
// - Smoothing uses Math.pow(smoothingFactor, tickScale) so the blend rate is
//   wall-clock consistent across frame rates.

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
        const dt = this.game.dt ?? (1 / 60);
        const tickScale = dt * 60;

        // Calculate target position based on ship position
        const targetY = this.game.spacecraft.y - this.idealOffset;

        // Velocity is in "pixels per 1/60s tick" units (same as the original
        // per-frame camera). Smoothing and apply both scale with tickScale.
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
