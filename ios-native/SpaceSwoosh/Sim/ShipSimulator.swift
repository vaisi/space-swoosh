// ShipSimulator.swift
// Changes: Slice D — fuel-dying scale, wall BOOP + jelly, trail spacing/fade.

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
        command: SteerCommand,
        speedScale: CGFloat = 1
    ) {
        if command == .flip {
            world.ship.zigzagSign *= -1
        }

        let rad = GameConfig.Spacecraft.zigzagAngleDeg * .pi / 180
        let speed = GameConfig.Spacecraft.speed
            * world.height
            * GameConfig.Spacecraft.zigzagSpeedScale
            * speedScale
        let dist = speed * dt

        var x = world.ship.x + sin(rad) * world.ship.zigzagSign * dist
        var y = world.ship.y + cos(rad) * dist

        let radius = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let margin = radius * wallMarginFactor
        let minX = margin
        let maxX = world.width - margin
        world.wallBoopSide = 0
        if world.boopCooldown > 0 {
            world.boopCooldown = max(0, world.boopCooldown - dt)
        }
        if x < minX {
            x = minX
            world.ship.zigzagSign = 1
            noteBoop(world: &world, side: -1)
        } else if x > maxX {
            x = maxX
            world.ship.zigzagSign = -1
            noteBoop(world: &world, side: 1)
        }

        if world.jellyElapsedMs >= 0 {
            world.jellyElapsedMs += dt * 1000
            if world.jellyElapsedMs >= GameConfig.Flicker.wallJellyMs {
                world.jellyElapsedMs = -1
            }
        }

        let tangent = world.ship.zigzagSign * rad
        world.ship.x = x
        world.ship.y = y
        world.ship.tangent = tangent
        world.ship.bank = tangent
        world.ship.distance += cos(rad) * dist

        let tail = radius * GameConfig.Spacecraft.tailOffset
        let tx = x - sin(tangent) * tail
        let ty = y - cos(tangent) * tail
        world.trail.pushIfMoved(
            x: tx,
            y: ty,
            tangent: tangent,
            minSpacing: GameConfig.Spacecraft.trailSpacing
        )
        world.trail.fade(by: GameConfig.Spacecraft.trailFadePerTick)
    }

    private func noteBoop(world: inout WorldState, side: CGFloat) {
        guard world.boopCooldown <= 0 else { return }
        world.boopCooldown = GameConfig.Flicker.boopCooldownMs / 1000
        world.wallBoopSide = side
        world.jellyElapsedMs = 0
        world.jellySide = side
    }
}
