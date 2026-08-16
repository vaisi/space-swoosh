// ShipSimulator.swift
// Changes: Trail samples use the equipped skin's trailTailOffset + trailFade.

import Foundation
import CoreGraphics

enum SteerCommand {
    case none
    case flip
    case bankLeft
    case bankRight
}

struct ShipSimulator {
    private let wallMarginFactor: CGFloat = 1.2

    func step(
        world: inout WorldState,
        dt: CGFloat,
        command: SteerCommand,
        speedScale: CGFloat = 1,
        style: FlightStyle = .zigzag
    ) {
        if style == .arc {
            stepArc(world: &world, dt: dt, command: command, speedScale: speedScale)
        } else {
            stepZigzag(world: &world, dt: dt, command: command, speedScale: speedScale)
        }
        finishMove(world: &world, dt: dt)
    }

    private func stepZigzag(
        world: inout WorldState,
        dt: CGFloat,
        command: SteerCommand,
        speedScale: CGFloat
    ) {
        world.ship.arcActive = false
        if command == .flip || command == .bankLeft || command == .bankRight {
            world.ship.zigzagSign *= -1
        }

        let rad = GameConfig.Spacecraft.zigzagAngleDeg * .pi / 180
        let speed = GameConfig.Spacecraft.speed
            * world.height
            * GameConfig.Spacecraft.zigzagSpeedScale
            * speedScale
        let dist = speed * GameConfig.simDt * GameConfig.motionTickScale(dt: dt)
        var x = world.ship.x + sin(rad) * world.ship.zigzagSign * dist
        let y = world.ship.y + cos(rad) * dist
        clampWall(world: &world, x: &x)
        world.ship.x = x
        world.ship.y = y
        world.ship.tangent = world.ship.zigzagSign * rad
        easeBank(world: &world, target: world.ship.tangent, dt: dt)
        world.ship.distance += cos(rad) * dist
        world.ship.verticalVel = speed * cos(rad)
    }

    private func stepArc(
        world: inout WorldState,
        dt: CGFloat,
        command: SteerCommand,
        speedScale: CGFloat
    ) {
        if command == .bankLeft {
            beginArc(world: &world, dir: -1)
        } else if command == .bankRight {
            beginArc(world: &world, dir: 1)
        } else if command == .flip {
            beginArc(world: &world, dir: world.ship.x < world.width * 0.5 ? -1 : 1)
        }

        let base = GameConfig.Spacecraft.speed * world.height * speedScale
        var desired = base
        var x = world.ship.x
        let prevX = x
        let prevY = world.ship.y

        if world.ship.arcActive {
            let dur = max(world.ship.arcDuration, 0.05)
            world.ship.arcProgress = min(1, world.ship.arcProgress + dt / dur)
            let angle = world.ship.arcDir * .pi * world.ship.arcProgress
            let radius = GameConfig.Spacecraft.arcRadius * world.width
            x = world.ship.arcStartX + sin(angle) * radius
            let boost = sin(world.ship.arcProgress * .pi) * base * GameConfig.Spacecraft.arcVerticalBoost
            desired = base + boost
            if world.ship.arcProgress >= 1 {
                x = world.ship.arcStartX
                world.ship.arcActive = false
            }
        }

        let keep: CGFloat = world.ship.arcActive ? 0.86 : 0.95
        world.ship.verticalVel = world.ship.verticalVel * keep + desired * (1 - keep)
        let y = world.ship.y + world.ship.verticalVel * GameConfig.simDt * GameConfig.motionTickScale(dt: dt)

        let radius = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let minX = radius * wallMarginFactor
        let maxX = world.width - minX
        if x < minX {
            x = minX
            noteBoop(world: &world, side: -1)
            beginArc(world: &world, dir: 1, from: x, durationScale: 0.7)
        } else if x > maxX {
            x = maxX
            noteBoop(world: &world, side: 1)
            beginArc(world: &world, dir: -1, from: x, durationScale: 0.7)
        }

        world.ship.x = x
        world.ship.y = y
        let vx = x - prevX
        let vy = y - prevY
        if hypot(vx, vy) > 0.15 {
            world.ship.tangent = atan2(vx, vy)
        }
        let target = max(-GameConfig.Spacecraft.maxBank, min(GameConfig.Spacecraft.maxBank, world.ship.tangent))
        world.ship.bank += (target - world.ship.bank) * 0.28
        world.ship.distance += max(0, vy)
    }

    /// Hull lean only. Path / tangent stay instant.
    private func easeBank(world: inout WorldState, target: CGFloat, dt: CGFloat) {
        let keep = pow(1 - GameConfig.Spacecraft.bankSmoothing, dt * 60)
        world.ship.bank += Self.wrapAngle(target - world.ship.bank) * (1 - keep)
    }

    private static func wrapAngle(_ angle: CGFloat) -> CGFloat {
        var x = angle
        while x > .pi { x -= 2 * .pi }
        while x < -.pi { x += 2 * .pi }
        return x
    }

    private func beginArc(
        world: inout WorldState,
        dir: CGFloat,
        from: CGFloat? = nil,
        durationScale: CGFloat = 1
    ) {
        world.ship.arcActive = true
        world.ship.arcDir = dir
        world.ship.arcProgress = 0
        world.ship.arcStartX = from ?? world.ship.x
        world.ship.arcDuration = GameConfig.Spacecraft.arcDurationMs / 1000 * durationScale
    }

    private func clampWall(world: inout WorldState, x: inout CGFloat) {
        let radius = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let minX = radius * wallMarginFactor
        let maxX = world.width - minX
        if x < minX {
            x = minX
            world.ship.zigzagSign = 1
            noteBoop(world: &world, side: -1)
        } else if x > maxX {
            x = maxX
            world.ship.zigzagSign = -1
            noteBoop(world: &world, side: 1)
        }
    }

    private func finishMove(world: inout WorldState, dt: CGFloat) {
        if world.boopCooldown > 0 {
            world.boopCooldown = max(0, world.boopCooldown - dt)
        }
        if world.jellyElapsedMs >= 0 {
            world.jellyElapsedMs += dt * 1000
            if world.jellyElapsedMs >= GameConfig.Flicker.wallJellyMs {
                world.jellyElapsedMs = -1
            }
        }
        let radius = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let tail = radius * SkinCatalog.def(world.skinId).trailTailOffset
        let tx = world.ship.x - sin(world.ship.bank) * tail
        let ty = world.ship.y - cos(world.ship.bank) * tail
        world.trail.pushIfMoved(
            x: tx,
            y: ty,
            tangent: world.ship.bank,
            minSpacing: GameConfig.Spacecraft.trailSpacing
        )
        world.trail.fade(by: SkinCatalog.def(world.skinId).trailFade)
    }

    private func noteBoop(world: inout WorldState, side: CGFloat) {
        guard world.boopCooldown <= 0 else { return }
        world.boopCooldown = GameConfig.Flicker.boopCooldownMs / 1000
        world.wallBoopSide = side
        world.jellyElapsedMs = 0
        world.jellySide = side
    }
}
