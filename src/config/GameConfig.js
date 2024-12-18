export const GameConfig = {
    spacecraft: {
        radius: 1,
        speed: 0.08,
        arcRadius: 0.2,
        arcDuration: 800,
        boostSpeed: 0.03,
        trailDotSize: 0.2,
        trailSpacing: 10
    },
    camera: {
        speed: 0.08,
        interpolation: 0.15,
        deceleration: 2000,
        smoothingFactor: 0.92
    },
    obstacles: {
        minSize: 2.5,
        maxSize: 6.25,
        verticalSpacing: 0.35,
        rotationRange: [-0.02, 0.02],
        types: {
            simple: {
                unlockScore: 0,
                weight: 1
            },
            complex: {
                unlockScore: 2000,
                weight: 0.7
            },
            belt: {
                unlockScore: 5000,
                weight: 0.4
            },
            pulsating: {
                unlockScore: 3000,
                weight: 0.6
            },
            moving: {
                unlockScore: 4000,
                weight: 0.5
            },
            shooting: {
                unlockScore: 7000,
                weight: 0.3
            }
        },
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