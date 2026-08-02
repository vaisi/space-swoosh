// Camera.js
// Scroll position + world→screen mapping.
// Changes:
// - Catch-up camera (the smooth feel): ship and camera are separate. Camera
//   cruises with the ship, and when the ship rides too high on screen the
//   camera accelerates until the ship settles back toward the bottom. Uses
//   `camera.speed` as a floor cruise (it was config-only / unused before).
// - Still advances with `game.tickScale` so web and native share one pace.

export class Camera {
    constructor(game) {
        this.game = game;
        this.y = 0;
        this.targetY = 0;
        this.totalDistance = 0;
        // px/sec-style floor cruise (same units as spacecraft.baseSpeed).
        this.speed = game.config.camera.speed * game.height;
        this.interpolation = game.config.camera.interpolation;
        // Prefer the ship near the lower part of the frame.
        this.idealOffset = game.height * 0.75;
        this.velocity = 0;
        this.shake = { x: 0, y: 0 };
    }

    update(speedFactor = 1) {
        const tickScale = this.game.tickScale ?? 1;
        const ship = this.game.spacecraft;

        // Screen Y of the ship (0 = top of view). Ideal is lower on screen.
        const shipScreenY = ship.y - this.y;
        // >0 → ship too high → camera must accelerate (scroll faster upward).
        const lag = this.idealOffset - shipScreenY;

        // Match the ship's world travel this tick; never slower than config cruise.
        const shipPerTick = Math.abs(ship.verticalVelocity || this.speed) * (1 / 60);
        const floorPerTick = this.speed * (1 / 60);
        const matchShip = -Math.max(shipPerTick, floorPerTick);

        // Soft catch-up / ease toward the ideal seat. Positive lag pulls the
        // camera forward; negative lag eases it so the ship can climb again.
        const correction = -lag * this.interpolation;
        const targetVelocity = (matchShip + correction) * speedFactor;

        // Ease velocity — reads as "camera accelerates to catch up", not a snap.
        const keep = Math.pow(this.game.config.camera.smoothingFactor, tickScale);
        this.velocity = this.velocity * keep + targetVelocity * (1 - keep);

        this.y += this.velocity * tickScale;
        this.totalDistance = Math.abs(this.y);
    }

    getRelativeY(absoluteY) {
        return absoluteY - this.y;
    }
}
