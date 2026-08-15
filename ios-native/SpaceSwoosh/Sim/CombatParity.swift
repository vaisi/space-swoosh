// CombatParity.swift
// Changes: C.5.1 — one screen of travel always awards the same KM (ref height 800).

import Foundation
import CoreGraphics

enum CombatParity {
    /// Scripted zigzag: no flips for `steps` ticks. Used to lock feel vs JS.
    static func zigzagSampleX(width: CGFloat, height: CGFloat, steps: Int) -> [CGFloat] {
        var world = WorldState.initial(width: width, height: height)
        var xs: [CGFloat] = []
        xs.reserveCapacity(steps)
        let ship = ShipSimulator()
        for _ in 0..<steps {
            ship.step(world: &world, dt: GameConfig.simDt, command: .none)
            xs.append(world.ship.x)
        }
        return xs
    }

    /// First-step X must move right (sign +1) by sin(52°) * speed * height * scale * dt.
    static func firstStepDeltaX(height: CGFloat) -> CGFloat {
        let rad = GameConfig.Spacecraft.zigzagAngleDeg * .pi / 180
        let speed = GameConfig.Spacecraft.speed * height * GameConfig.Spacecraft.zigzagSpeedScale
        return sin(rad) * speed * GameConfig.simDt
    }

    /// Drift and wormhole must never register a solid hit (JS returns false).
    static func nonLethalKindsMiss() -> Bool {
        var drift = ObstacleState.inactive()
        drift.active = true
        drift.kind = .drift
        drift.lethal = false
        drift.x = 100
        drift.y = 100
        drift.radius = 40
        var hole = drift
        hole.kind = .wormhole
        let hitD = HazardCollision.hits(o: drift, shipX: 100, shipY: 100, shipR: 8)
        let hitW = HazardCollision.hits(o: hole, shipX: 100, shipY: 100, shipR: 8)
        return !hitD && !hitW
    }

    /// Standing beside a sweep blade (along its thin axis) must miss.
    static func sweepMissBesideBlade() -> Bool {
        var blade = ObstacleState.inactive()
        blade.active = true
        blade.kind = .sweep
        blade.x = 200
        blade.y = 200
        blade.halfW = 80
        blade.halfH = 2
        blade.rotation = 0
        blade.lethal = true
        return !HazardCollision.hits(o: blade, shipX: 200, shipY: 240, shipR: 8)
    }

    /// One full playfield of travel equals 800 × (100/60) KM on any phone height.
    static func oneScreenKm(playfieldHeight: CGFloat) -> CGFloat {
        GameConfig.kmDelta(dy: playfieldHeight, playfieldHeight: playfieldHeight)
    }
}
