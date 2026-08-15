// CombatParity.swift
// Changes: Phase C — zigzag golden samples vs JS spec (fixed dt, no RNG).

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
}
