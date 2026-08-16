// CinematicFlight.swift
// Changes: Trail samples use the equipped skin's trailTailOffset + trailFade.

import Foundation
import CoreGraphics

enum CinematicFlight {
    static let minArcHeading: CGFloat = 0.12
    static let cruiseSeat: CGFloat = 0.22
    /// Android START_SCREEN 1.14 (y-down) → below the SpriteKit frame.
    static let startSeat: CGFloat = -0.14
    static let startBoost: CGFloat = 1.35
    static let streakCount = 18
    static let streakBand: CGFloat = 0.38
    static let openWait: CGFloat = 0.2
    static let clearHold: CGFloat = 0.315
    static let clearRamp: CGFloat = 0.770
    static let clearBoostMin: CGFloat = 1.260
    static let clearBoostCap: CGFloat = 2.240
    static let clearFade: CGFloat = 0.385
    static let screenIn: CGFloat = 0.420
    static let boostTarget: CGFloat = 7.2
    static let cameraBoost: CGFloat = 1.25
    static let exitMargin: CGFloat = 2

    static func captureArcHeading(_ ship: ShipState) -> CGFloat {
        let heading = ship.bank
        return abs(heading) < minArcHeading ? 0 : heading
    }

    static func seedIntroLean(world: inout WorldState) {
        let rad = GameConfig.Spacecraft.zigzagAngleDeg * .pi / 180
        let sign: CGFloat = Bool.random() ? 1 : -1
        let radius = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        world.ship.zigzagSign = sign
        world.ship.x = sign > 0 ? -radius * 1.6 : world.width + radius * 1.6
        world.ship.bank = sign * rad
        world.ship.tangent = world.ship.bank
        world.ship.arcActive = false
    }

    /// Android LevelIntro `streamShip`: centre lane, no side lean.
    static func streamCenter(world: inout WorldState, dt: CGFloat, boost: CGFloat) {
        world.ship.x = world.width * 0.5
        world.ship.arcActive = false
        let speed = GameConfig.Spacecraft.speed * world.height * boost
        let keep = pow(0.95 as CGFloat, dt * 60)
        world.ship.verticalVel = world.ship.verticalVel * keep + speed * (1 - keep)
        world.ship.y += world.ship.verticalVel * GameConfig.simDt * GameConfig.motionTickScale(dt: dt)
        world.ship.bank = 0
        world.ship.tangent = 0
        pushTrail(world: &world)
    }

    /// Android `streamCinematicFlight` — zigzag sign or captured arc heading.
    static func stream(
        world: inout WorldState,
        dt: CGFloat,
        boost: CGFloat,
        style: FlightStyle,
        heading: inout CGFloat
    ) {
        world.ship.arcActive = false
        let base = GameConfig.Spacecraft.speed * world.height * boost
        if style == .zigzag {
            let rad = GameConfig.Spacecraft.zigzagAngleDeg * .pi / 180
            let speed = base * GameConfig.Spacecraft.zigzagSpeedScale
            let dist = speed * GameConfig.simDt * GameConfig.motionTickScale(dt: dt)
            world.ship.x += sin(rad) * world.ship.zigzagSign * dist
            world.ship.y += cos(rad) * dist
            world.ship.verticalVel = speed * cos(rad)
            world.ship.tangent = world.ship.zigzagSign * rad
            world.ship.bank = world.ship.tangent
        } else {
            let dist = base * GameConfig.simDt * GameConfig.motionTickScale(dt: dt)
            world.ship.x += sin(heading) * dist
            world.ship.y += cos(heading) * dist
            world.ship.verticalVel = max(base * cos(heading), base * 0.35)
            world.ship.tangent = heading
            world.ship.bank = heading
        }
        bounceSilent(world: &world, style: style, heading: &heading)
        pushTrail(world: &world)
    }

    static func easeOut(_ t: CGFloat) -> CGFloat {
        let u = max(0, min(1, t))
        return 1 - (1 - u) * (1 - u)
    }

    static func easeInOut(_ t: CGFloat) -> CGFloat {
        let u = max(0, min(1, t))
        return u < 0.5 ? 2 * u * u : 1 - pow(-2 * u + 2, 2) / 2
    }

    static func lerp(_ a: CGFloat, _ b: CGFloat, _ t: CGFloat) -> CGFloat {
        a + (b - a) * max(0, min(1, t))
    }

    /// Encode seat + camera lead into the 0.22-based present camera.
    static func presentCameraY(shipY: CGFloat, seatY: CGFloat, cameraLead: CGFloat, height: CGFloat) -> CGFloat {
        shipY - (seatY - cruiseSeat) * height - cameraLead
    }

    private static func bounceSilent(
        world: inout WorldState,
        style: FlightStyle,
        heading: inout CGFloat
    ) {
        let radius = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let minX = radius * 1.2
        let maxX = world.width - minX
        let fallback = GameConfig.Spacecraft.zigzagAngleDeg * .pi / 180
        if world.ship.x < minX {
            world.ship.x = minX
            if style == .zigzag {
                world.ship.zigzagSign = 1
            } else {
                heading = abs(heading) > 0 ? abs(heading) : fallback
            }
        } else if world.ship.x > maxX {
            world.ship.x = maxX
            if style == .zigzag {
                world.ship.zigzagSign = -1
            } else {
                let mag = abs(heading) > 0 ? abs(heading) : fallback
                heading = -mag
            }
        }
    }

    private static func pushTrail(world: inout WorldState) {
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
}
