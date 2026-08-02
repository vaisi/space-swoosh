// Camera.js
// Changes: Integrate in world-units/sec with real `dt`. Paired with score from
// camera Δy so KM can never outrun the world (Journey tutorial / spawns use
// camera.totalDistance). At 60 FPS this matches the old per-frame step.

export class Camera {
    constructor(game) {
        this.game = game;
        this.y = 0;
        this.targetY = 0;
        this.totalDistance = 0;
        this.speed = game.config.camera.speed * game.height;
        this.interpolation = game.config.camera.interpolation;
        this.idealOffset = game.height * 0.75;
        /** World-units per second (not per-frame). */
        this.velocity = 0;
        this.shake = { x: 0, y: 0 };
    }

    update(dt = 1 / 60, speedFactor = 1) {
        const REF_FPS = 60;
        const targetY = this.game.spacecraft.y - this.idealOffset;

        // Old per-frame step was `error * interpolation`. Same step at 60 FPS
        // equals integrating units/sec = that * 60.
        const targetVelocity =
            (targetY - this.y) * this.interpolation * speedFactor * REF_FPS;
        const smooth = Math.pow(
            this.game.config.camera.smoothingFactor,
            dt * REF_FPS
        );
        this.velocity =
            this.velocity * smooth + targetVelocity * (1 - smooth);

        this.y += this.velocity * dt;
        this.totalDistance = Math.abs(this.y);
    }

    getRelativeY(absoluteY) {
        return absoluteY - this.y;
    }
}
