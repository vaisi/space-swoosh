// GameConfig.swift
// Changes: driftLaneSlots (4 currents × 7 Android shear lines). Android
// catch-up camera knobs + mobile baseUnit (min(w/45, h/75)). feelSpeed 1.0
// so native iOS cruise matches Android/web snappy tick. Fuel.dyingStopSpeed
// 0.01 so fuel-out waits until the hull stops. Fuel.voiceLowThreshold 0.20
// for NAV low-fuel lines (HUD stays 0.28). Dropped 1000 KM "Breaking
// atmosphere..." HUD line.

import Foundation
import CoreGraphics

enum GameConfig {
    static let simDt: CGFloat = 1.0 / 60.0
    /// JS `snappyHz`: ship travel uses `speed * (1/60) * (dt * 120)` so one
    /// 60 Hz step covers the same distance as Android's snappy pacing.
    static let snappyHz: CGFloat = 120
    /// iOS feel knob — 1.0 matches Android/web snappy travel (was 0.90).
    static let feelSpeed: CGFloat = 1.0
    static func motionTickScale(dt: CGFloat) -> CGFloat { dt * snappyHz * feelSpeed }
    /// JS: abs(Δcamera.y) * (100/60) in CSS pixels. Scale to this height so
    /// a tall iPhone and a short Android CSS canvas award KM at the same pace.
    static let kmPerPixel: CGFloat = 100.0 / 60.0
    static let kmReferenceHeight: CGFloat = 800

    static func kmDelta(dy: CGFloat, playfieldHeight: CGFloat) -> CGFloat {
        let scale = kmReferenceHeight / max(playfieldHeight, 1)
        return abs(dy) * scale * kmPerPixel
    }

    enum Spacecraft {
        static let radiusUnits: CGFloat = 1
        static let speed: CGFloat = 0.08
        static let zigzagAngleDeg: CGFloat = 52
        static let zigzagSpeedScale: CGFloat = 1.45
        static let arcRadius: CGFloat = 0.2
        static let arcDurationMs: CGFloat = 820
        static let arcVerticalBoost: CGFloat = 0.55
        static let trailMaxPoints: Int = 80
        static let trailFadePerTick: CGFloat = 1.0 / 180.0
        static let trailDotSize: CGFloat = 0.2
        static let trailSpacing: CGFloat = 10
        static let maxBank: CGFloat = 0.96
        static let tailOffset: CGFloat = 0.6
        /// JS `BANK_SMOOTHING` — lean eases by elapsed time, not a snap.
        static let bankSmoothing: CGFloat = 0.34
    }

    enum Flicker {
        static let trailWidthScale: CGFloat = 0.6
        static let wallJellyMs: CGFloat = 420
        static let boopCooldownMs: CGFloat = 180
        static let shieldHitboxScale: CGFloat = 1.5
        static let hullDrawPad: CGFloat = 3.2
        /// iOS feel — pickup / portal / clear flyout. Android remains 5s.
        static let shieldSeconds: CGFloat = 4.0
    }

    enum Camera {
        /// Floor cruise (× height). Ship speed is separate (Spacecraft.speed).
        static let speed: CGFloat = 0.07
        static let interpolation: CGFloat = 0.18
        static let smoothingFactor: CGFloat = 0.78
        static let deadzone: CGFloat = 0.16
        static let reseatDelay: CGFloat = 5
        static let reseatSlack: CGFloat = 0.03
        static let reseatDuration: CGFloat = 8
        static let reseatTrack: CGFloat = 0.015
        /// From bottom. Android `idealOffset` 0.75 from top.
        static let idealSeat: CGFloat = 0.25
        /// Android `camera.deceleration` — game-over scroll fade.
        static let decelerationMs: CGFloat = 2000
    }

    enum Playfield {
        /// Full device; no letterbox.
        static let fillsDevice = true
        /// Android mobile `baseUnit`: min(width/45, height/75).
        static func baseUnit(width: CGFloat, height: CGFloat) -> CGFloat {
            min(width / 45, height / 75)
        }
    }

    enum Fuel {
        static let max: CGFloat = 1
        static let start: CGFloat = 1
        static let drainPerKm: CGFloat = 0.00025
        static let refillPerCollectible: CGFloat = 0.45
        static let dyingDurationMs: CGFloat = 900
        /// JS MIN_HEADING_SPEED — fuel-out fail waits until displacement is noise.
        static let dyingStopSpeed: CGFloat = 0.01
        static let lowThreshold: CGFloat = 0.28
        static let voiceLowThreshold: CGFloat = 0.20
        static let magnetRadiusScale: CGFloat = 4.25
        static let magnetPull: CGFloat = 0.15
    }

    enum Points {
        static let perAsteroid = 1
        static let perSwoosh = 15
    }

    enum StyleSwoosh {
        static let maxClearance: CGFloat = 1.65
        static let maxPairYDelta: CGFloat = 3.2
        static let yBand: CGFloat = 1.35
        static let cooldownMs: CGFloat = 420
    }

    enum Profile {
        static let shieldsFromScore: CGFloat = 500
        static let collectiblesFromScore: CGFloat = 100
        static let wallBoostsFromScore: CGFloat = 12000
        static let simpleChance: CGFloat = 0.65
        static let maxRowSpawns = 3
        static let maxClusterCount = 4
        static let sparkleFirstWait: CGFloat = 3.2
        static let sparkleMin: CGFloat = 2.6
        static let sparkleSpan: CGFloat = 2.6
        static let shieldInterval: CGFloat = 5
        static let wallBoostInterval: CGFloat = 22
    }

    enum Obstacles {
        /// Set-piece size band (JS `config.obstacles`). Simple clusters use 0.9…1.4.
        static let minSizeUnits: CGFloat = 2.5
        static let maxSizeUnits: CGFloat = 6.25
        static let scaling = (startDensity: CGFloat(0.7), maxDensity: CGFloat(1.5), rampUpDistance: CGFloat(10000))
    }

    enum Unlocks {
        static let table: [(type: String, score: CGFloat, message: String)] = [
            ("simple", 0, "Watch out for asteroids!"),
            ("sideBarrier", 1000, "Warning: Side barriers detected!"),
            ("complex", 1000, "Warning: Asteroids with orbiting debris detected!"),
            ("moving", 2000, "Caution: Moving asteroids detected!"),
            ("shooting", 3000, "Warning: Hostile asteroids detected!"),
            ("driftCurrent", 3500, "Crosswinds detected — lateral currents ahead!"),
            ("pulsating", 4000, "Warning: Unstable asteroids ahead!"),
            ("phase", 4500, "Square blooms detected — they spring open and shove!"),
            ("wormhole", 5000, "Spatial anomalies detected!"),
            ("repulsor", 5500, "Repulsor fields detected — they push, not pull!"),
            ("blackhole", 6000, "Gravitational anomalies detected!"),
            ("sweepGate", 7000, "Sweep lines ahead — timed corridors!"),
        ]
    }

    enum Milestones {
        static let table: [(score: CGFloat, message: String)] = [
            (2000, "Warning: Complex asteroids detected..."),
            (5000, "Caution: Asteroid belts ahead..."),
            (12500, "Deep space detected..."),
            (25000, "Unknown signals ahead..."),
            (50000, "Approaching the void..."),
        ]
        static let teachKm: CGFloat = 80
        static let atmosphereKm: CGFloat = 200
    }

    enum Stress {
        static let obstacleSlots = 64
        static let extraPartSlots = 48
        /// 4 on-screen drift currents × 7 shear lines (Android DriftCurrent).
        static let driftLaneSlots = 28
        static let sparkleSlots = 24
        static let glowSlots = 16
        static let pickupSlots = 16
        static let recycleLeadScreens: CGFloat = 2.4
        static let recycleBehindScreens: CGFloat = 0.35
    }
}
