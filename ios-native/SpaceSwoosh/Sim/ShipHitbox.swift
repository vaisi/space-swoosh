// ShipHitbox.swift
// Changes: Per-skin JS circle packs for the full roster; Y-down → SpriteKit flip.

import Foundation
import CoreGraphics

enum ShipHitbox {
    static func hits(
        _ o: ObstacleState,
        ship: ShipState,
        radius: CGFloat,
        shield: Bool,
        skinId: SkinId
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
        for p in SkinCatalog.def(skinId).hitbox {
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
