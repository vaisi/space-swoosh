// Camera.js
// Changes: Integrate with real `dt` so follow-speed matches the ship at any
// refresh rate. `velocity` is stored as world-units/sec (was per-frame @ 60fps).

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

    update(dt = 1 / 60, speedFactor = 1) {
        // Calculate target position based on ship position
        const targetY = this.game.spacecraft.y - this.idealOffset;

        // Legacy per-frame step was (targetY - y) * interpolation.
        // At 60fps that equals integrating units/sec = that * 60.
        const REF_FPS = 60;
        const targetVelocity =
            (targetY - this.y) * this.interpolation * speedFactor * REF_FPS;
        const smooth = Math.pow(
            this.game.config.camera.smoothingFactor,
            dt * REF_FPS
        );
        this.velocity =
            this.velocity * smooth + targetVelocity * (1 - smooth);

        this.y += this.velocity * dt;

        // Track total distance
        this.totalDistance = Math.abs(this.y);
    }

    getRelativeY(absoluteY) {
        return absoluteY - this.y;
    }
}
