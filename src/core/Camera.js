// Camera.js
// Changes: Apply the per-frame follow step scaled by `game.tickScale` so camera
// travel stays locked to wall-clock time on low-FPS native WebViews. At 60 FPS
// tickScale=1 and behaviour matches the original unscaled code.

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
        const tick = this.game.tickScale || 1;

        // Same per-frame target as before; easing stretched across `tick` frames.
        const targetVelocity = (targetY - this.y) * this.interpolation * speedFactor;
        const smoothKeep = Math.pow(
            this.game.config.camera.smoothingFactor,
            tick
        );
        this.velocity =
            this.velocity * smoothKeep +
            targetVelocity * (1 - smoothKeep);

        // Original code did `y += velocity` once per paint (= once per 1/60s).
        // Multiply by tick so a slow paint covers the missed 60Hz steps.
        this.y += this.velocity * tick;

        // Track total distance
        this.totalDistance = Math.abs(this.y);
    }

    getRelativeY(absoluteY) {
        return absoluteY - this.y;
    }
}
