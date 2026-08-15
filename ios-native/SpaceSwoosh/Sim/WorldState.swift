// WorldState.swift
// Changes: C.5 — obstacle slots use ObstacleState.inactive() factory.

import Foundation
import CoreGraphics

struct ShipState {
    var x: CGFloat
    var y: CGFloat
    var tangent: CGFloat
    var zigzagSign: CGFloat
    var distance: CGFloat
}

struct WorldState {
    var ship: ShipState
    var trail: TrailRingBuffer
    var obstacles: [ObstacleState]
    var pickups: [PickupState]
    var width: CGFloat
    var height: CGFloat
    var baseUnit: CGFloat

    static func initial(width: CGFloat, height: CGFloat) -> WorldState {
        let base = width / 40
        let trail = TrailRingBuffer(capacity: GameConfig.Spacecraft.trailMaxPoints)
        let ship = ShipState(
            x: width * 0.5,
            y: height * 0.22,
            tangent: 0,
            zigzagSign: 1,
            distance: 0
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
            baseUnit: base
        )
    }
}

enum WorldInterpolator {
    static func ship(_ a: ShipState, _ b: ShipState, alpha: CGFloat) -> ShipState {
        ShipState(
            x: a.x + (b.x - a.x) * alpha,
            y: a.y + (b.y - a.y) * alpha,
            tangent: a.tangent + (b.tangent - a.tangent) * alpha,
            zigzagSign: b.zigzagSign,
            distance: a.distance + (b.distance - a.distance) * alpha
        )
    }
}
