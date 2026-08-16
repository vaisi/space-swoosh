// WorldState.swift
// Changes: World carries equipped SkinId; trail buffer sized from the skin.

import Foundation
import CoreGraphics

struct ShipState {
    var x: CGFloat
    var y: CGFloat
    var tangent: CGFloat
    var bank: CGFloat
    var zigzagSign: CGFloat
    var distance: CGFloat
    var arcActive: Bool
    var arcDir: CGFloat
    var arcProgress: CGFloat
    var arcStartX: CGFloat
    var arcDuration: CGFloat
    var verticalVel: CGFloat
}

struct WorldState {
    var ship: ShipState
    var trail: TrailRingBuffer
    var obstacles: [ObstacleState]
    var pickups: [PickupState]
    var width: CGFloat
    var height: CGFloat
    var baseUnit: CGFloat
    var jellyElapsedMs: CGFloat
    var jellySide: CGFloat
    var wallBoopSide: CGFloat
    var boopCooldown: CGFloat
    var skinId: SkinId

    static func initial(width: CGFloat, height: CGFloat, skinId: SkinId = .flicker) -> WorldState {
        let base = width / 40
        let skin = SkinCatalog.def(skinId)
        let trail = TrailRingBuffer(capacity: skin.trailMaxPoints)
        let ship = ShipState(
            x: width * 0.5,
            y: height * 0.22,
            tangent: 0,
            bank: 0,
            zigzagSign: 1,
            distance: 0,
            arcActive: false,
            arcDir: 1,
            arcProgress: 0,
            arcStartX: width * 0.5,
            arcDuration: GameConfig.Spacecraft.arcDurationMs / 1000,
            verticalVel: 0
        )
        let obstacles = Array(
            repeating: ObstacleState.inactive(),
            count: GameConfig.Stress.obstacleSlots
        )
        let pickups = Array(
            repeating: PickupState(active: false, kind: .sparkle, x: 0, y: 0, phase: 0),
            count: GameConfig.Stress.pickupSlots
        )
        return WorldState(
            ship: ship,
            trail: trail,
            obstacles: obstacles,
            pickups: pickups,
            width: width,
            height: height,
            baseUnit: base,
            jellyElapsedMs: -1,
            jellySide: 1,
            wallBoopSide: 0,
            boopCooldown: 0,
            skinId: skinId
        )
    }
}

enum WorldInterpolator {
    static func ship(_ a: ShipState, _ b: ShipState, alpha: CGFloat) -> ShipState {
        let flipped = a.zigzagSign != b.zigzagSign || a.bank * b.bank < 0
        return ShipState(
            x: a.x + (b.x - a.x) * alpha,
            y: a.y + (b.y - a.y) * alpha,
            tangent: flipped ? b.tangent : a.tangent + (b.tangent - a.tangent) * alpha,
            bank: flipped ? b.bank : a.bank + (b.bank - a.bank) * alpha,
            zigzagSign: b.zigzagSign,
            distance: a.distance + (b.distance - a.distance) * alpha,
            arcActive: b.arcActive,
            arcDir: b.arcDir,
            arcProgress: a.arcProgress + (b.arcProgress - a.arcProgress) * alpha,
            arcStartX: b.arcStartX,
            arcDuration: b.arcDuration,
            verticalVel: a.verticalVel + (b.verticalVel - a.verticalVel) * alpha
        )
    }
}
