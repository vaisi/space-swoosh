// GameConfig.js
// Central tuning for the game. Per-run difficulty (which obstacles may spawn and
// how thickly) lives in modes/RunProfile.js and config/JourneyConfig.js; what's
// left here is what every run shares.
// Changes:
// - Snappier turns: shorter arcDuration; camera catch-up tightened so direction
//   changes don't feel mushy under a lazy follower.
// - Camera: slightly slower floor cruise than the ship + stronger catch-up so
//   the follower accelerates when the ship leads high (smooth endless-runner feel).
// - Dropped the dead `obstacles.types` unlock table. Nothing read it, and it had
//   drifted from the copy ObstacleManager was actually using; the schedule now
//   lives once, in `OPEN_WORLD_UNLOCKS` (modes/RunProfile.js).
// - Added style-swoosh near-miss tuning (`styleSwoosh`) and `points.perSwoosh`
//   for threading a narrow gap between two obstacles.
// - Added `points`: the scoring for the new points system — destroying an
//   asteroid awards `perAsteroid` points, collecting a sparkle awards
//   `perCollectible`. Read by ObstacleManager and CollectibleManager so the
//   values live in one place.

export const GameConfig = {
    // Points system — separate from the distance (KM) score and the leaderboard.
    points: {
        perAsteroid: 1,     // destroying one asteroid (with the shield)
        perCollectible: 10, // collecting one Signal-Blue sparkle
        perSwoosh: 15,      // style points for a narrow twin-obstacle near-miss
    },
    // Near-miss "swoosh" — ship squeezed tightly between a left + right obstacle.
    // Clearances are multiples of spacecraft.radius.
    styleSwoosh: {
        maxClearance: 1.65,   // each side must be closer than this
        maxPairYDelta: 3.2,   // left/right obstacles must share a similar Y
        yBand: 1.35,          // ship must be within this of the pair's mid-Y
        cooldownMs: 420,      // min time between swoosh awards
    },
    spacecraft: {
        radius: 1,
        speed: 0.08,
        arcRadius: 0.2,
        // Wall-clock ms for a full arc. Shorter = punchier direction changes.
        arcDuration: 520,
        // Zigzag try-out: degrees from straight up; tap/swipe flips lean.
        zigzagAngleDeg: 37,
        boostSpeed: 0.03,
        trailDotSize: 0.2,
        trailSpacing: 10
    },
    camera: {
        // Floor cruise (× height). Catch-up accelerates above this when the ship
        // leads too high; ship speed is separate (spacecraft.speed).
        speed: 0.07,
        // How hard the camera pulls when the ship is off the ideal seat.
        interpolation: 0.28,
        deceleration: 2000,
        // Velocity ease — lower = snappier catch-up, higher = lazier.
        smoothingFactor: 0.78
    },
    obstacles: {
        minSize: 2.5,
        maxSize: 6.25,
        verticalSpacing: 0.35,
        rotationRange: [-0.02, 0.02],
        // Open World density ramp. Journey levels ignore this and lerp from their
        // own difficulty scalar instead (modes/JourneyProfile.js).
        scaling: {
            startDensity: 0.7,
            maxDensity: 1.5,
            rampUpDistance: 10000
        }
    },
    milestones: [
        { score: 1000, message: "Breaking atmosphere..." },
        { score: 2000, message: "Warning: Complex asteroids detected..." },
        { score: 5000, message: "Caution: Asteroid belts ahead..." },
        { score: 10000, message: "Deep space detected..." },
        { score: 25000, message: "Unknown signals ahead..." },
        { score: 50000, message: "Approaching the void..." }
    ]
}; 