// ShipSimulator.swift
// Changes: Phase A — zigzag flight + wall bounce + trail emit (JS Spacecraft zigzag subset).

import Foundation
import CoreGraphics

enum SteerCommand {
    case none
    case flip
}

struct ShipSimulator {
    private let wallMarginFactor: CGFloat = 1.2

    func step(
        world: inout WorldState,
        dt: CGFloat,
        command: SteerCommand
    ) {
        if command == .flip {
            world.ship.zigzagSign *= -1
        }

        let rad = GameConfig.Spacecraft.zigzagAngleDeg * .pi / 180
        // Matches JS: baseSpeed = speed × height; path speed × zigzagSpeedScale.
        let speed = GameConfig.Spacecraft.speed
            * world.height
            * GameConfig.Spacecraft.zigzagSpeedScale
        let dist = speed * dt

        var x = world.ship.x + sin(rad) * world.ship.zigzagSign * dist
        // SpriteKit Y+ up. JS canvas Y+ down; vertical advance magnitude matches.
        var y = world.ship.y + cos(rad) * dist

        let radius = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let margin = radius * wallMarginFactor
        let minX = margin
        let maxX = world.width - margin
        if x < minX {
            x = minX
            world.ship.zigzagSign = 1
        } else if x > maxX {
            x = maxX
            world.ship.zigzagSign = -1
        }

        let tangent = world.ship.zigzagSign * rad
        world.ship.x = x
        world.ship.y = y
        world.ship.tangent = tangent
        world.ship.distance += cos(rad) * dist

        let tail = radius * 0.6
        let tx = x - sin(tangent) * tail
        let ty = y - cos(tangent) * tail
        world.trail.push(x: tx, y: ty, tangent: tangent)
        world.trail.age(by: dt)
    }
}
