// SkinCatalog.swift
// Changes: Full Android roster (41) + UNLOCK_ALL_SKINS playtest flag.

import Foundation
import CoreGraphics

enum SkinId: String, CaseIterable, Hashable {
    case focus, flicker, ember, saber, wisp, pulse, quill, fletch, nyan
    case shard, halo, needle, echo, dusk
    case seal, hatch, trace, ring
    case fold, mote, spine, orbit, ink
    case flux, cinder, lantern, bloom
    case lyra, sprout, plume, koi, spore, boreal
    case luna, wish, darner, puff, argus, chime
}

enum WallTrailMode {
    case dense, spring, scatter, whip
    case ripple, pile, blot, cloud, shatter, desync
    case flare, crease, ladder, lag, script, flick, cinder
}

enum JellyProfile: String {
    case standard = "default"
    case needle, halo, shard, stamp, fold, spine, mote, orbit, flux, cinder
    case lantern, bloom, lyra, sprout, plume, koi, spore, boreal
    case luna, wish, darner, puff, argus, chime
}

enum HullKind: Hashable {
    case circle, tear, dart, fletch, shard, needle, crescent, nyan
    case square, stamp, fold, spine, hex, petal, orbit, mote, halo
    case bell, bloom, star, seed, wing, koi, cap, curtain, moth
    case wish, darner, puff, argus, chime
}

enum TrailKind {
    case dots, twinDots, ribbon, rainbow, horizon, wisp, chevron
    case rings, hairline, saber, twin, stamp, tick, crease, cloud
    case ladder, lag, dash, cinder, lantern, bloom, lyra, plume
    case koi, boreal, luna, wish, darner, puff, argus, chime
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
    let hullKind: HullKind
    let trailKind: TrailKind
    let skipHullCache: Bool
    let productId: String?
    let entitlementId: String?
    let trailWidthScale: CGFloat
    let trailAlpha: CGFloat
    let trailSmudge: Bool
    let trailSignal: Bool
    let trailRipple: Bool
    let trailReverse: Bool
}

enum SkinCatalog {
    /// Playtest hangar — true so every ship flies. Flip false before store.
    static let UNLOCK_ALL_SKINS = true

    static let roster: [SkinId] = SkinId.allCases
    static let free: [SkinId] = [.focus, .flicker, .ember, .saber]

    static func resolve(_ raw: String?) -> SkinId {
        SkinId(rawValue: raw ?? "") ?? .flicker
    }

    static func isOwned(_ id: SkinId) -> Bool {
        if UNLOCK_ALL_SKINS { return true }
        return def(id).productId == nil
    }

    static func `def`(_ id: SkinId) -> SkinDef {
        table[id] ?? table[.flicker]!
    }

    static func next(after id: SkinId) -> SkinId {
        let list = roster
        let i = list.firstIndex(of: id) ?? 0
        for step in 1...list.count {
            let candidate = list[(i + step) % list.count]
            if isOwned(candidate) { return candidate }
        }
        return .flicker
    }

    static func prev(before id: SkinId) -> SkinId {
        let list = roster
        let i = list.firstIndex(of: id) ?? 0
        for step in 1...list.count {
            let candidate = list[(i - step + list.count) % list.count]
            if isOwned(candidate) { return candidate }
        }
        return .flicker
    }

    private static let longPts = 200
    private static let longFade: CGFloat = 1.0 / 420.0
    private static let midPts = 160
    private static let midFade: CGFloat = 1.0 / 360.0

    private static let table: [SkinId: SkinDef] = {
        var map: [SkinId: SkinDef] = [:]
        for d in allDefs { map[d.id] = d }
        return map
    }()

    private static let allDefs: [SkinDef] = [
        s(.focus, "Focus", "Precise. Instrumental.", H.circle, .ripple, .circle, .dots,
          pad: 2.4, half: 0.85, jelly: .standard, ripple: true),
        s(.flicker, "Flicker", "Organic. One flowing wake.", H.tear, .spring, .tear, .ribbon,
          pad: 3.2, half: 0.85, jelly: .standard),
        s(.ember, "Ember", "Paired. Twin dotted traces.", H.dart, .ripple, .dart, .twinDots,
          pad: 3.2, half: 0.85, jelly: .standard, ripple: true),
        s(.saber, "Saber", "A slim violet blade. Crackle on the wake.", H.needle, .whip, .needle, .saber,
          pad: 3.6, half: 0.55, jelly: .needle, pts: midPts, fade: midFade),
        s(.wisp, "Wisp", "Weightless. Sheds sparks.", H.tear, .flare, .tear, .wisp,
          pad: 3.2, half: 0.85, jelly: .standard, iap: true),
        s(.pulse, "Pulse", "Signal wake. Instrumental, lit.", H.circle, .dense, .circle, .dots,
          pad: 2.4, half: 0.85, jelly: .standard, iap: true, pts: longPts, fade: longFade, signal: true),
        s(.quill, "Quill", "A fine blue line of travel.", H.tear, .spring, .tear, .ribbon,
          pad: 3.2, half: 0.85, jelly: .standard, iap: true, pts: longPts, fade: longFade,
          width: 0.55, alpha: 0.85, smudge: false, signal: true),
        s(.fletch, "Fletch", "A smooth arrow. Dawn on the wake.", H.fletch, .spring, .fletch, .horizon,
          pad: 3.2, half: 0.85, jelly: .standard, iap: true, pts: longPts, fade: longFade, width: 0.58, alpha: 0.9),
        s(.nyan, "Nyan", "A long rainbow line of travel.", H.crescent, .spring, .nyan, .rainbow,
          pad: 3.4, half: 0.85, jelly: .standard, iap: true, pts: midPts, fade: midFade, width: 0.85, alpha: 0.9),
        s(.shard, "Shard", "Faceted. A hard wake.", H.shard, .shatter, .shard, .chevron,
          pad: 3.2, half: 0.85, jelly: .shard, iap: true, pts: longPts, fade: longFade),
        s(.halo, "Halo", "Orbital. Rings the path.", H.halo, .pile, .halo, .rings,
          pad: 2.6, half: 0.9, jelly: .halo, iap: true),
        s(.needle, "Needle", "Linear. One thin thread.", H.needle, .whip, .needle, .hairline,
          pad: 3.6, half: 0.55, jelly: .needle, iap: true),
        s(.echo, "Echo", "Paired. Leaves a twin.", H.crescent, .desync, .crescent, .twin,
          pad: 3.4, half: 0.85, jelly: .standard, iap: true, pts: longPts, fade: longFade),
        s(.dusk, "Dusk", "Crescent. A violet cloud.", H.crescent, .ripple, .crescent, .cloud,
          pad: 3.4, half: 0.85, jelly: .standard, iap: true, pts: longPts, fade: longFade, ripple: true),
        s(.seal, "Seal", "Pressed tiles. Peels at the wall.", H.square, .blot, .stamp, .stamp,
          pad: 3.0, half: 0.82, jelly: .stamp, iap: true, pts: longPts, fade: longFade),
        s(.hatch, "Hatch", "Lateral marks. Stretches on impact.", H.square, .pile, .square, .tick,
          pad: 3.0, half: 0.82, jelly: .standard, iap: true, pts: longPts, fade: longFade),
        s(.trace, "Trace", "One thin line. Springs on a bounce.", H.square, .spring, .square, .hairline,
          pad: 3.0, half: 0.82, jelly: .standard, iap: true, pts: longPts, fade: longFade),
        s(.ring, "Ring", "Blooming rings. Squash, no pop.", H.square, .pile, .square, .rings,
          pad: 3.0, half: 0.82, jelly: .standard, iap: true),
        s(.fold, "Fold", "Origami. A dashed crease.", H.fold, .crease, .fold, .crease,
          pad: 3.2, half: 0.85, jelly: .fold, iap: true, pts: longPts, fade: longFade),
        s(.mote, "Mote", "Soft ink. A drifting cloud.", H.mote, .ripple, .mote, .cloud,
          pad: 2.4, half: 0.9, jelly: .mote, iap: true, pts: longPts, fade: longFade, ripple: true),
        s(.spine, "Spine", "Upright. A ladder wake.", H.spine, .ladder, .spine, .ladder,
          pad: 3.6, half: 0.55, jelly: .spine, iap: true, pts: longPts, fade: longFade),
        s(.orbit, "Orbit", "Planetoid. A lagging orbit wake.", H.orbit, .lag, .orbit, .lag,
          pad: 3.2, half: 0.75, jelly: .orbit, iap: true),
        s(.ink, "Ink", "Calligraphic. Tip reverses on boop.", H.tear, .script, .tear, .ribbon,
          pad: 3.2, half: 0.85, jelly: .standard, iap: true, pts: longPts, fade: longFade,
          width: 0.62, alpha: 0.9, smudge: true, reverse: true),
        s(.flux, "Flux", "Hex crystal. Ink and signal dashes.", H.hex, .flick, .hex, .dash,
          pad: 3.0, half: 0.72, jelly: .flux, iap: true),
        s(.cinder, "Cinder", "Warm petal. Ember ribbon, cool ash.", H.petal, .cinder, .petal, .cinder,
          pad: 3.2, half: 0.85, jelly: .cinder, iap: true, pts: longPts, fade: longFade),
        s(.lantern, "Lantern", "A living bell. Gold heart. Plankton in the dark.", H.lantern, .cloud, .bell, .lantern,
          pad: 3.4, half: 0.85, jelly: .lantern, iap: true, pts: longPts, fade: longFade, live: true),
        s(.bloom, "Bloom", "Soap-film spheres. Prism motes. They pop on the wall.", H.bloom, .pile, .bloom, .bloom,
          pad: 2.8, half: 0.9, jelly: .bloom, iap: true, pts: longPts, fade: longFade, live: true),
        s(.lyra, "Lyra", "A star-forged craft. Aurora in its wake.", H.lyra, .flare, .star, .lyra,
          pad: 3.2, half: 0.85, jelly: .lyra, iap: true, pts: longPts, fade: longFade, live: true),
        s(.sprout, "Sprout", "A living seed. Pollen on the wind.", H.sprout, .cloud, .seed, .lantern,
          pad: 3.2, half: 0.85, jelly: .sprout, iap: true, pts: longPts, fade: longFade, live: true),
        s(.plume, "Plume", "A firebird. Embers rise, then cool.", H.plume, .cinder, .wing, .plume,
          pad: 3.4, half: 0.75, jelly: .plume, iap: true, pts: longPts, fade: longFade, live: true),
        s(.koi, "Koi", "A river spirit. Scales in the current.", H.koi, .whip, .koi, .koi,
          pad: 3.2, half: 0.8, jelly: .koi, iap: true, pts: longPts, fade: longFade, live: true),
        s(.spore, "Spore", "A living cap. Amber heart. Spores in the dark.", H.spore, .cloud, .cap, .lantern,
          pad: 3.4, half: 0.85, jelly: .spore, iap: true, pts: longPts, fade: longFade, live: true),
        s(.boreal, "Boreal", "A ribbon of northern light. It waves on the wall.", H.boreal, .spring, .curtain, .boreal,
          pad: 3.6, half: 0.55, jelly: .boreal, iap: true, pts: longPts, fade: longFade, live: true),
        s(.luna, "Luna", "A lunar moth. Moon heart. Dust on the wind.", H.luna, .cloud, .moth, .luna,
          pad: 3.4, half: 0.7, jelly: .luna, iap: true, pts: longPts, fade: longFade, live: true),
        s(.wish, "Wish", "A bottled comet. Stars fall from its wake.", H.wish, .flare, .wish, .wish,
          pad: 3.6, half: 0.55, jelly: .wish, iap: true, pts: longPts, fade: longFade, live: true),
        s(.darner, "Darner", "A needle of light. Mosaic scales in its wake.", H.darner, .flare, .darner, .darner,
          pad: 3.6, half: 0.55, jelly: .darner, iap: true, pts: longPts, fade: longFade, live: true),
        s(.puff, "Puff", "A dandelion clock. Seeds drift from its wake.", H.puff, .cloud, .puff, .puff,
          pad: 2.8, half: 0.9, jelly: .puff, iap: true, pts: longPts, fade: longFade, live: true),
        s(.argus, "Argus", "A peacock fan. Eyespots stamp the path.", H.argus, .pile, .argus, .argus,
          pad: 3.4, half: 0.75, jelly: .argus, iap: true, pts: longPts, fade: longFade, live: true),
        s(.chime, "Chime", "Temple bells. Sound rings down the wake.", H.chime, .ripple, .chime, .chime,
          pad: 3.2, half: 0.85, jelly: .chime, iap: true, pts: longPts, fade: longFade, live: true, ripple: true),
    ]

    private static func s(
        _ id: SkinId,
        _ name: String,
        _ blurb: String,
        _ hitbox: [HitCircle],
        _ mode: WallTrailMode,
        _ hull: HullKind,
        _ trail: TrailKind,
        pad: CGFloat,
        half: CGFloat,
        jelly: JellyProfile,
        iap: Bool = false,
        pts: Int = 80,
        fade: CGFloat = 1.0 / 180.0,
        live: Bool = false,
        width: CGFloat = 1,
        alpha: CGFloat = 0.8,
        smudge: Bool = true,
        signal: Bool = false,
        ripple: Bool = false,
        reverse: Bool = false
    ) -> SkinDef {
        SkinDef(
            id: id,
            name: name,
            blurb: blurb,
            hitbox: hitbox,
            wallTrailMode: mode,
            trailMaxPoints: pts,
            trailFade: fade,
            hullDrawPad: pad,
            halfScale: half,
            jellyProfile: jelly,
            hullKind: hull,
            trailKind: trail,
            skipHullCache: live,
            productId: iap ? "com.orbi.spaceswoosh.skin.\(id.rawValue)" : nil,
            entitlementId: iap ? "skin_\(id.rawValue)" : nil,
            trailWidthScale: width,
            trailAlpha: alpha,
            trailSmudge: smudge,
            trailSignal: signal,
            trailRipple: ripple,
            trailReverse: reverse
        )
    }
}

private enum H {
    static let circle = [HitCircle(x: 0, y: 0, r: 1)]
    static let halo = [HitCircle(x: 0, y: 0, r: 0.72)]
    static let mote = [HitCircle(x: 0, y: 0, r: 0.92)]
    static let bloom = [HitCircle(x: 0, y: 0, r: 0.70)]
    static let tear: [HitCircle] = [
        .init(x: 0, y: -0.61, r: 0.1), .init(x: 0, y: -0.35, r: 0.23),
        .init(x: 0, y: 0.16, r: 0.53), .init(x: -0.33, y: 0.28, r: 0.33),
        .init(x: 0.32, y: 0.28, r: 0.34),
    ]
    static let dart: [HitCircle] = [
        .init(x: 0, y: -0.71, r: 0.08), .init(x: 0, y: -0.5, r: 0.16),
        .init(x: 0, y: -0.17, r: 0.29), .init(x: -0.27, y: 0.1, r: 0.16),
        .init(x: 0.29, y: 0.13, r: 0.15), .init(x: -0.43, y: 0.29, r: 0.09),
        .init(x: 0.44, y: 0.29, r: 0.08),
    ]
    static let shard: [HitCircle] = [
        .init(x: 0, y: -0.72, r: 0.12), .init(x: 0, y: -0.28, r: 0.28),
        .init(x: 0, y: 0.12, r: 0.3), .init(x: -0.22, y: 0.35, r: 0.14),
        .init(x: 0.22, y: 0.35, r: 0.14),
    ]
    static let fold: [HitCircle] = [
        .init(x: 0, y: -0.68, r: 0.12), .init(x: 0, y: -0.12, r: 0.28),
        .init(x: 0, y: 0.48, r: 0.2), .init(x: -0.3, y: 0.08, r: 0.14),
        .init(x: 0.3, y: 0.08, r: 0.14),
    ]
    static let needle: [HitCircle] = [
        .init(x: 0, y: -0.85, r: 0.08), .init(x: 0, y: -0.45, r: 0.12),
        .init(x: 0, y: 0, r: 0.14), .init(x: 0, y: 0.45, r: 0.11),
        .init(x: 0, y: 0.78, r: 0.08),
    ]
    static let crescent: [HitCircle] = [
        .init(x: 0, y: -0.55, r: 0.18), .init(x: -0.42, y: -0.05, r: 0.2),
        .init(x: 0.42, y: -0.05, r: 0.2), .init(x: -0.55, y: 0.35, r: 0.16),
        .init(x: 0.55, y: 0.35, r: 0.16),
    ]
    static let fletch: [HitCircle] = [
        .init(x: 0, y: -0.78, r: 0.1), .init(x: 0, y: -0.38, r: 0.22),
        .init(x: 0, y: 0.02, r: 0.3), .init(x: -0.26, y: 0.16, r: 0.14),
        .init(x: 0.26, y: 0.16, r: 0.14), .init(x: 0, y: 0.32, r: 0.14),
    ]
    static let hex: [HitCircle] = [
        .init(x: 0, y: -0.55, r: 0.12), .init(x: 0, y: -0.12, r: 0.28),
        .init(x: 0, y: 0.22, r: 0.28), .init(x: -0.22, y: 0.08, r: 0.15),
        .init(x: 0.22, y: 0.08, r: 0.15), .init(x: 0, y: 0.52, r: 0.16),
    ]
    static let petal: [HitCircle] = [
        .init(x: 0, y: -0.65, r: 0.16), .init(x: 0, y: -0.15, r: 0.36),
        .init(x: 0, y: 0.35, r: 0.34), .init(x: -0.3, y: 0.2, r: 0.2),
        .init(x: 0.3, y: 0.2, r: 0.2), .init(x: 0, y: 0.75, r: 0.18),
    ]
    static let lantern: [HitCircle] = [
        .init(x: 0, y: -0.52, r: 0.14), .init(x: 0, y: -0.22, r: 0.30),
        .init(x: 0, y: 0.04, r: 0.34), .init(x: -0.32, y: 0.06, r: 0.16),
        .init(x: 0.32, y: 0.06, r: 0.16), .init(x: 0, y: 0.18, r: 0.14),
    ]
    static let lyra: [HitCircle] = [
        .init(x: 0, y: -0.42, r: 0.16), .init(x: 0, y: 0, r: 0.28),
        .init(x: 0, y: 0.4, r: 0.16), .init(x: -0.32, y: 0, r: 0.14),
        .init(x: 0.32, y: 0, r: 0.14),
    ]
    static let sprout: [HitCircle] = [
        .init(x: 0, y: -0.42, r: 0.2), .init(x: 0, y: 0.02, r: 0.34),
        .init(x: 0, y: 0.42, r: 0.22),
    ]
    static let plume: [HitCircle] = [
        .init(x: 0, y: -0.48, r: 0.16), .init(x: 0, y: -0.08, r: 0.28),
        .init(x: -0.38, y: 0.18, r: 0.18), .init(x: 0.38, y: 0.18, r: 0.18),
        .init(x: 0, y: 0.32, r: 0.16),
    ]
    static let koi: [HitCircle] = [
        .init(x: 0, y: -0.58, r: 0.16), .init(x: 0, y: -0.18, r: 0.32),
        .init(x: 0, y: 0.22, r: 0.3), .init(x: 0, y: 0.48, r: 0.16),
    ]
    static let spore: [HitCircle] = [
        .init(x: 0, y: -0.38, r: 0.22), .init(x: 0, y: -0.08, r: 0.42),
        .init(x: -0.4, y: 0.02, r: 0.22), .init(x: 0.4, y: 0.02, r: 0.22),
        .init(x: 0, y: 0.18, r: 0.2),
    ]
    static let boreal: [HitCircle] = [
        .init(x: 0, y: -0.52, r: 0.12), .init(x: 0, y: -0.12, r: 0.18),
        .init(x: 0, y: 0.22, r: 0.16), .init(x: 0, y: 0.58, r: 0.12),
    ]
    static let luna: [HitCircle] = [
        .init(x: 0, y: -0.42, r: 0.16), .init(x: 0, y: -0.06, r: 0.26),
        .init(x: -0.3, y: 0.08, r: 0.18), .init(x: 0.3, y: 0.08, r: 0.18),
        .init(x: 0, y: 0.22, r: 0.14),
    ]
    static let wish: [HitCircle] = [
        .init(x: 0, y: -0.62, r: 0.12), .init(x: 0, y: -0.22, r: 0.2),
        .init(x: 0, y: 0.12, r: 0.18), .init(x: 0, y: 0.42, r: 0.14),
    ]
    static let darner: [HitCircle] = [
        .init(x: 0, y: -0.62, r: 0.08), .init(x: 0, y: -0.22, r: 0.1),
        .init(x: 0, y: 0.18, r: 0.09), .init(x: 0, y: 0.55, r: 0.07),
    ]
    static let puff: [HitCircle] = [
        .init(x: 0, y: -0.42, r: 0.28), .init(x: -0.22, y: -0.08, r: 0.32),
        .init(x: 0.22, y: -0.08, r: 0.32), .init(x: 0, y: 0.22, r: 0.28),
    ]
    static let argus: [HitCircle] = [
        .init(x: 0, y: -0.55, r: 0.16), .init(x: 0, y: -0.12, r: 0.32),
        .init(x: 0, y: 0.28, r: 0.28), .init(x: -0.22, y: 0.38, r: 0.16),
        .init(x: 0.22, y: 0.38, r: 0.16),
    ]
    static let chime: [HitCircle] = [
        .init(x: 0, y: -0.48, r: 0.26), .init(x: 0, y: -0.04, r: 0.38),
        .init(x: 0, y: 0.28, r: 0.28),
    ]
    static let spine: [HitCircle] = [
        .init(x: 0, y: -0.78, r: 0.16), .init(x: 0, y: -0.35, r: 0.2),
        .init(x: 0, y: 0.1, r: 0.22), .init(x: 0, y: 0.5, r: 0.2),
        .init(x: 0, y: 0.85, r: 0.16),
    ]
    static let orbit: [HitCircle] = [
        .init(x: 0, y: -0.48, r: 0.22), .init(x: 0, y: -0.05, r: 0.36),
        .init(x: 0, y: 0.38, r: 0.3),
    ]
    static let square: [HitCircle] = {
        var out: [HitCircle] = []
        for iy in -1...1 {
            for ix in -1...1 {
                out.append(HitCircle(x: CGFloat(ix) * 0.38, y: CGFloat(iy) * 0.38, r: 0.26))
            }
        }
        return out
    }()
}
