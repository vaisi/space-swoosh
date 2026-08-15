// ShipHitbox.swift
// Changes: Slice D — Flicker TEAR_HITBOX in world space (JS Y-down → SpriteKit Y-up).

import Foundation
import CoreGraphics

enum ShipHitbox {
    /// JS `TEAR_HITBOX` local fractions × ship.radius. Y is canvas-down.
    static let tear: [(x: CGFloat, y: CGFloat, r: CGFloat)] = [
        (0, -0.61, 0.10),
        (0, -0.35, 0.23),
        (0, 0.16, 0.53),
        (-0.33, 0.28, 0.33),
        (0.32, 0.28, 0.34),
    ]

    static func hits(
        _ o: ObstacleState,
        ship: ShipState,
        radius: CGFloat,
        shield: Bool
    ) -> Bool {
        if shield {
            return HazardCollision.hits(
                o: o,
                shipX: ship.x,
                shipY: ship.y,
                shipR: radius * GameConfig.Flicker.shieldHitboxScale
            )
        }
        let c = cos(ship.bank)
        let s = sin(ship.bank)
        for p in tear {
            let lx = p.x * radius
            let ly = p.y * radius
            let jx = lx * c - ly * s
            let jy = lx * s + ly * c
            if HazardCollision.hits(
                o: o,
                shipX: ship.x + jx,
                shipY: ship.y - jy,
                shipR: p.r * radius
            ) {
                return true
            }
        }
        return false
    }

    static func shieldSmash(
        _ o: ObstacleState,
        ship: ShipState,
        radius: CGFloat
    ) -> ShieldSmash {
        HazardCollision.shieldSmash(
            o: o,
            shipX: ship.x,
            shipY: ship.y,
            shipR: radius * GameConfig.Flicker.shieldHitboxScale
        )
    }
}
