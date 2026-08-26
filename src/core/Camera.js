// Camera.js
// Scroll position + world→screen mapping.
// Changes:
// - Reseat (every JS platform): after 5s below the ideal seat, an 8s
//   ease-in-out creeps the gap closed. Wormhole / black-hole leftover stays
//   invisible.
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
        this.reseatEnabled = game.cameraReseatEnabled === true;
        this.belowSeatSec = 0;
        this.reseatActive = false;
        this.reseatFrom = 0;
        this.reseatT = 0;
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
        const reseat = this.tickReseat(ship, shipScreenY, tickScale);
        const targetVelocity = (matchShip + correction + reseat) * speedFactor;

        // Ease velocity — reads as "camera accelerates to catch up", not a snap.
        const keep = Math.pow(this.game.config.camera.smoothingFactor, tickScale);
        this.velocity = this.velocity * keep + targetVelocity * (1 - keep);

        this.y += this.velocity * tickScale;
        this.totalDistance = Math.abs(this.y);
    }

    /**
     * After a long dwell below the ideal seat, ease the gap closed over
     * reseatDuration so the lift is almost invisible.
     * On when Game.cameraReseatEnabled (every JS platform).
     */
    tickReseat(ship, shipScreenY, tickScale) {
        if (!this.reseatEnabled) return 0;
        if (ship?.wormholeTransit) return 0;

        const cfg = this.game.config.camera ?? {};
        const slack = this.game.height * (cfg.reseatSlack ?? 0.03);
        const delay = cfg.reseatDelay ?? 5;
        const duration = cfg.reseatDuration ?? 8;
        const track = cfg.reseatTrack ?? 0.015;
        const dt = tickScale / 60;
        const below = shipScreenY - this.idealOffset;

        if (below <= slack) {
            this.clearReseat();
            return 0;
        }

        if (!this.reseatActive) {
            this.belowSeatSec += dt;
            if (this.belowSeatSec < delay) return 0;
            this.reseatActive = true;
            this.reseatFrom = below;
            this.reseatT = 0;
        }

        this.reseatT += dt;
        const u = easeInOut(this.reseatT / Math.max(0.001, duration));
        if (u >= 1) {
            this.clearReseat();
            return 0;
        }

        const target = this.reseatFrom * (1 - u);
        // Track the slowly shrinking gap — extra is ~0 at the start of the ease.
        return (below - target) * track;
    }

    clearReseat() {
        this.belowSeatSec = 0;
        this.reseatActive = false;
        this.reseatFrom = 0;
        this.reseatT = 0;
    }

    getRelativeY(absoluteY) {
        return absoluteY - this.y;
    }
}

function easeInOut(t) {
    const u = Math.max(0, Math.min(1, t));
    return u < 0.5 ? 2 * u * u : 1 - ((-2 * u + 2) ** 2) / 2;
}
