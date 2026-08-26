// PlayCamera.swift
// Changes: Y-up port of Android Camera.js catch-up (deadzone, smoothing, reseat).

import Foundation
import CoreGraphics

enum PlayCamera {
    static func pinY(shipY: CGFloat, seatFromBottom: CGFloat, height: CGFloat) -> CGFloat {
        CinematicFlight.presentCameraY(
            shipY: shipY,
            seatY: seatFromBottom,
            cameraLead: 0,
            height: height
        )
    }

    /// Android LevelIntro.finish: pin at CRUISE_SCREEN (0.80 from top = 0.20 from bottom)
    /// and seed velocity as |verticalVel| / 60 so the first play tick doesn't hitch.
    static func seedHandoff(run: inout RunState, ship: ShipState, height: CGFloat) {
        run.cameraY = pinY(
            shipY: ship.y,
            seatFromBottom: CinematicFlight.introHandoffSeat,
            height: height
        )
        run.cameraVelocity = abs(ship.verticalVel) / 60
        clearReseat(run: &run)
    }

    static func step(
        world: WorldState,
        run: inout RunState,
        dt: CGFloat,
        speedFactor: CGFloat = 1
    ) {
        let tickScale = GameConfig.motionTickScale(dt: dt)
        let height = world.height
        let cfg = GameConfig.Camera.self
        let cruise = CinematicFlight.cruiseSeat * height
        let ideal = cfg.idealSeat * height
        let shipScreenY = cruise + (world.ship.y - run.cameraY)
        let lag = shipScreenY - ideal

        let floorSpeed = cfg.speed * height
        let shipPerTick = abs(world.ship.verticalVel) / 60
        let floorPerTick = floorSpeed / 60
        let matchShip = max(shipPerTick, floorPerTick)

        let deadzone = height * cfg.deadzone
        var excessLag: CGFloat = 0
        if lag > deadzone {
            excessLag = lag - deadzone
        } else if lag < -deadzone {
            excessLag = lag + deadzone
        }

        let lagBoost = 1 + max(0, excessLag) / max(1, height * 0.22)
        let correction = excessLag * cfg.interpolation * lagBoost
        let reseat = tickReseat(
            run: &run,
            shipScreenY: shipScreenY,
            ideal: ideal,
            height: height,
            tickScale: tickScale,
            teleporting: run.teleportT > 0
        )
        let targetVelocity = (matchShip + correction + reseat) * speedFactor
        let keep = pow(cfg.smoothingFactor, tickScale)
        run.cameraVelocity = run.cameraVelocity * keep + targetVelocity * (1 - keep)
        run.cameraY += run.cameraVelocity * tickScale
    }

    private static func tickReseat(
        run: inout RunState,
        shipScreenY: CGFloat,
        ideal: CGFloat,
        height: CGFloat,
        tickScale: CGFloat,
        teleporting: Bool
    ) -> CGFloat {
        if teleporting { return 0 }
        let cfg = GameConfig.Camera.self
        let slack = height * cfg.reseatSlack
        let dt = tickScale / 60
        let below = ideal - shipScreenY

        if below <= slack {
            clearReseat(run: &run)
            return 0
        }

        if !run.reseatActive {
            run.belowSeatSec += dt
            if run.belowSeatSec < cfg.reseatDelay { return 0 }
            run.reseatActive = true
            run.reseatFrom = below
            run.reseatT = 0
        }

        run.reseatT += dt
        let u = CinematicFlight.easeInOut(run.reseatT / max(0.001, cfg.reseatDuration))
        if u >= 1 {
            clearReseat(run: &run)
            return 0
        }

        let target = run.reseatFrom * (1 - u)
        return -(below - target) * cfg.reseatTrack
    }

    static func clearReseat(run: inout RunState) {
        run.belowSeatSec = 0
        run.reseatActive = false
        run.reseatFrom = 0
        run.reseatT = 0
    }
}
