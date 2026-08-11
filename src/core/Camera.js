// Camera.js
// Scroll position + world→screen mapping.
// Changes:
// - Catch-up camera: ship leads; camera cruises and accelerates when the ship
//   rides too high. Stronger lag response so turns don't feel mushy.
// - Advances with `game.tickScale` so web and native share one pace.

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

        // Deadzone follow: inside a band around the ideal seat the camera simply
        // matches the ship's speed (pure smooth scroll, no re-seating pull), so
        // steady flight and turns feel like butter. Only when the ship drifts
        // past the band does it re-address — and only by the *excess* beyond it,
        // so the pull eases in without a snap at the edge.
        const deadzone = this.game.height * (this.game.config.camera.deadzone ?? 0);
        let excessLag = 0;
        if (lag > deadzone) excessLag = lag - deadzone;
        else if (lag < -deadzone) excessLag = lag + deadzone;

        // Extra pull when the ship is well past the band (fast forward drift) so
        // it re-seats crisply rather than crawling back.
        const lagBoost = 1 + Math.max(0, excessLag) / Math.max(1, this.game.height * 0.22);
        const correction = -excessLag * this.interpolation * lagBoost;
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
