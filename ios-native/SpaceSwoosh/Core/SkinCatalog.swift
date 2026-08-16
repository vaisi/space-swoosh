// SkinCatalog.swift
// Changes: Slice F — Focus / Flicker / Ember / Saber defs, hitboxes, trail knobs.

import Foundation
import CoreGraphics

enum SkinId: String, CaseIterable {
    case focus
    case flicker
    case ember
    case saber
}

enum WallTrailMode {
    case dense
    case spring
    case scatter
    case whip
}

enum JellyProfile {
    case standard
    case needle
}

struct HitCircle {
    var x: CGFloat
    var y: CGFloat
    var r: CGFloat
}

struct SkinDef {
    let id: SkinId
    let name: String
    let blurb: String
    let hitbox: [HitCircle]
    let wallTrailMode: WallTrailMode
    let trailMaxPoints: Int
    let trailFade: CGFloat
    let hullDrawPad: CGFloat
    let halfScale: CGFloat
    let jellyProfile: JellyProfile
}

enum SkinCatalog {
    static let free: [SkinId] = [.focus, .flicker, .ember, .saber]

    static func resolve(_ raw: String?) -> SkinId {
        SkinId(rawValue: raw ?? "") ?? .flicker
    }

    static func `def`(_ id: SkinId) -> SkinDef {
        switch id {
        case .focus:
            return SkinDef(
                id: .focus,
                name: "Focus",
                blurb: "Precise. Instrumental.",
                hitbox: [HitCircle(x: 0, y: 0, r: 1)],
                wallTrailMode: .dense,
                trailMaxPoints: 80,
                trailFade: 1.0 / 180.0,
                hullDrawPad: 2.4,
                halfScale: 0.9,
                jellyProfile: .standard
            )
        case .flicker:
            return SkinDef(
                id: .flicker,
                name: "Flicker",
                blurb: "Organic. One flowing wake.",
                hitbox: [
                    HitCircle(x: 0, y: -0.61, r: 0.10),
                    HitCircle(x: 0, y: -0.35, r: 0.23),
                    HitCircle(x: 0, y: 0.16, r: 0.53),
                    HitCircle(x: -0.33, y: 0.28, r: 0.33),
                    HitCircle(x: 0.32, y: 0.28, r: 0.34),
                ],
                wallTrailMode: .spring,
                trailMaxPoints: 80,
                trailFade: 1.0 / 180.0,
                hullDrawPad: 3.2,
                halfScale: 0.85,
                jellyProfile: .standard
            )
        case .ember:
            return SkinDef(
                id: .ember,
                name: "Ember",
                blurb: "Restless. A wake of streaks.",
                hitbox: [
                    HitCircle(x: 0, y: -0.71, r: 0.08),
                    HitCircle(x: 0, y: -0.5, r: 0.16),
                    HitCircle(x: 0, y: -0.17, r: 0.29),
                    HitCircle(x: -0.27, y: 0.10, r: 0.16),
                    HitCircle(x: 0.29, y: 0.13, r: 0.15),
                    HitCircle(x: -0.43, y: 0.29, r: 0.09),
                    HitCircle(x: 0.44, y: 0.29, r: 0.08),
                ],
                wallTrailMode: .scatter,
                trailMaxPoints: 80,
                trailFade: 1.0 / 180.0,
                hullDrawPad: 3.2,
                halfScale: 0.85,
                jellyProfile: .standard
            )
        case .saber:
            return SkinDef(
                id: .saber,
                name: "Saber",
                blurb: "A slim violet blade. Crackle on the wake.",
                hitbox: [
                    HitCircle(x: 0, y: -0.85, r: 0.08),
                    HitCircle(x: 0, y: -0.45, r: 0.12),
                    HitCircle(x: 0, y: 0.0, r: 0.14),
                    HitCircle(x: 0, y: 0.45, r: 0.11),
                    HitCircle(x: 0, y: 0.78, r: 0.08),
                ],
                wallTrailMode: .whip,
                trailMaxPoints: 160,
                trailFade: 1.0 / 360.0,
                hullDrawPad: 3.6,
                halfScale: 0.55,
                jellyProfile: .needle
            )
        }
    }

    static func next(after id: SkinId) -> SkinId {
        let list = free
        let i = list.firstIndex(of: id) ?? 0
        return list[(i + 1) % list.count]
    }

    static func prev(before id: SkinId) -> SkinId {
        let list = free
        let i = list.firstIndex(of: id) ?? 0
        return list[(i - 1 + list.count) % list.count]
    }
}
