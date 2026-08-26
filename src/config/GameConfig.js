// GameConfig.js
// Central tuning for the game. Per-run difficulty (which obstacles may spawn and
// how thickly) lives in modes/RunProfile.js and config/JourneyConfig.js; what's
// left here is what every run shares.
// Changes:
// - Open Space Deep space milestone at 12,500 KM (Day 33 belt), not 10,000.
// - Camera reseat knobs (all JS platforms): after 5s below the
//   ideal seat, an 8s ease-in-out creeps the ship back.
// - Soft sparkle magnet: radius 4.25× ship + magnetPull 0.15 so near-miss
//   diamonds ease in more readily; collect still requires contact.
// - Fuel drainPerKm 0.00025 ≈ 4000 KM full tank (playtest: 2700 still too
//   stressful when the next sparkle is far).
// - Added `fuel`: depleting 0–1 tank (distance drain, diamond refill, dying
//   coast). Sparkles collected during the coast cancel dying until the hull stops.
// - Arc banks: arcDuration 820ms for a taller closed swoosh (linear full-π
//   path + 0.55 mid-arc vertical boost in Spacecraft).
// - Zigzag angle/speed tunables are the default flight style (see flightStyle.js).
// - Camera catch-up tightened so direction changes don't feel mushy under a
//   lazy follower.
// - Camera: slightly slower floor cruise than the ship + stronger catch-up so
//   the follower accelerates when the ship leads high (smooth endless-runner feel).
// - Dropped the dead `obstacles.types` unlock table. Nothing read it, and it had
//   drifted from the copy ObstacleManager was actually using; the schedule now
//   lives once, in `OPEN_WORLD_UNLOCKS` (modes/RunProfile.js).
// - Added style-swoosh near-miss tuning (`styleSwoosh`) and `points.perSwoosh`
//   for threading a narrow gap between two obstacles.
// - Added `points`: smash / swoosh style scores (sparkles refill fuel instead).

export const GameConfig = {
    // Survival fuel — separate from KM and from style `points`. Live only once
    // collectibles are enabled for the run (see Game.isFuelLive).
    fuel: {
        max: 1,
        start: 1,
        // HUD KM accrues ~90–110 per second of flight at any playfield size
        // (see kmDelta). Full tank ≈ 4000 KM (~35–40s / ~8–10 sparkle windows)
        // before empty if you take nothing.
        drainPerKm: 0.00025,
        refillPerCollectible: 0.45, // clamp to max; no overfill (~half a tank)
        dyingDurationMs: 900, // coast; salvage sparkles until the hull stops
        lowThreshold: 0.28,
        voiceLowThreshold: 0.20, // NAV warning; HUD pulse stays on lowThreshold
        // Soft magnet assist — sparkles ease toward the ship when close; collect
        // still needs circle overlap. Radius is × spacecraft.radius.
        magnetRadiusScale: 4.25,
        magnetPull: 0.15, // ease per 60fps tick (× tickScale × proximity falloff)
    },
    // Style points — smash / swoosh only. Not a survival meter; not Journey star 2.
    points: {
        perAsteroid: 1,     // destroying one asteroid (with the shield)
        perCollectible: 10, // unused (sparkles refill fuel); kept for reference
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
        // Wall-clock ms for a full closed arc (taller swoosh; linear π in Spacecraft).
        arcDuration: 820,
        // Zigzag (default flight): degrees from straight up (higher = flatter lean).
        zigzagAngleDeg: 52,
        // Along-path speed vs arc cruise (zigzag wants to feel quicker).
        zigzagSpeedScale: 1.45,
        boostSpeed: 0.03,
        trailDotSize: 0.2,
        trailSpacing: 10
    },
    camera: {
        // Floor cruise (× height). Catch-up accelerates above this when the ship
        // leads too high; ship speed is separate (spacecraft.speed).
        speed: 0.07,
        // How hard the camera pulls once the ship drifts past the deadzone.
        // Gentle, so re-seating glides in rather than tugging on turns.
        interpolation: 0.18,
        deceleration: 2000,
        // Velocity ease — lower = snappier catch-up, higher = lazier.
        smoothingFactor: 0.78,
        // Deadzone (× height) around the ideal seat where the camera just follows
        // the ship's speed and applies no re-seating pull — so steady flight is
        // pure smooth scroll and the camera only re-addresses on real drift.
        deadzone: 0.16,
        // After 5s below the ideal seat, ease the leftover gap closed over
        // reseatDuration so a wormhole or black-hole dip does not leave the
        // craft permanently low (all JS platforms: web + Capacitor).
        reseatDelay: 5,
        reseatSlack: 0.03, // × height — ignore tiny dips
        reseatDuration: 8, // seconds to ease the leftover gap closed
        reseatTrack: 0.015, // how tightly we follow the easing target
    },
    obstacles: {
        minSize: 2.5,
        maxSize: 6.25,
        verticalSpacing: 0.35,
        rotationRange: [-0.02, 0.02],
        // Historical Open World cluster scale. Open Space belt density now
        // lives in OpenSpaceWeather.OPEN_SPACE_BELT (KM lerp). Journey ignores this.
        scaling: {
            startDensity: 0.7,
            maxDensity: 1.5,
            rampUpDistance: 10000
        }
    },
    // iOS already awards KM as Δy × (800 / playfieldHeight) × (100/60) so a
    // tall phone and a short canvas stay in lockstep. Web used raw CSS pixels,
    // so filling the desktop viewport (~1080px vs ~750) burned a full tank by
    // ~2000 KM. Same helper here — fuel and HUD KM ignore screen size.
    kmPerPixel: 100 / 60,
    kmReferenceHeight: 800,
    kmDelta(dy, playfieldHeight) {
        const scale = this.kmReferenceHeight / Math.max(playfieldHeight, 1);
        return Math.abs(dy) * scale * this.kmPerPixel;
    },
    milestones: [
        { score: 1000, message: "Breaking atmosphere..." },
        { score: 2000, message: "Warning: Complex asteroids detected..." },
        { score: 5000, message: "Caution: Asteroid belts ahead..." },
        { score: 12500, message: "Deep space detected..." },
        { score: 25000, message: "Unknown signals ahead..." },
        { score: 50000, message: "Approaching the void..." }
    ]
}; 