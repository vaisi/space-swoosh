// SkinTrail.swift
// Changes: Merlin spectacular WishWake (hairline comet + dense stars); ParticleWakeField unused on the 40-ship roster.

import SpriteKit

struct TrailSyncContext {
    let trail: TrailRingBuffer
    let ship: ShipState
    let cameraY: CGFloat
    let sceneHeight: CGFloat
    let jellyElapsedMs: CGFloat
    let jellySide: CGFloat
    let shipRadius: CGFloat
    let shipSpeed: CGFloat
    let skin: SkinDef
}

protocol SkinTrail: AnyObject {
    var node: SKNode { get }
    func sync(_ ctx: TrailSyncContext)
}

enum SkinTrailFactory {
    static func make(skin: SkinDef, bake: BakePipeline) -> SkinTrail {
        let disc = bake.part(for: .circle)
        let slots = max(skin.trailMaxPoints, 8)
        switch skin.trailKind {
        case .dots:
            return DotTrailField(texture: disc, slots: slots, skin: skin)
        case .twinDots:
            return TwinDotTrailField(texture: disc, slots: slots * 2, skin: skin)
        case .ribbon:
            return RibbonTrailNode(maxPoints: slots + 2, skin: skin)
        case .rainbow:
            return RainbowRibbonNode(maxPoints: slots + 2, skin: skin)
        case .horizon:
            return RainbowRibbonNode(maxPoints: slots + 2, skin: skin, bands: BrandColors.UI.fletchBands, widthScale: 0.58)
        case .saber:
            return SaberTrailNode(sparkTexture: disc, maxPoints: slots + 2)
        case .hairline:
            return HairlineTrailNode(maxPoints: slots + 2, skin: skin)
        case .twin:
            return TwinDotTrailField(texture: disc, slots: slots * 2, skin: skin, sepScale: 0.72, sizeScale: 0.5)
        case .lantern:
            let palette: FilamentWake.Palette
            switch skin.id {
            case .sprout: palette = .sprout()
            case .spore: palette = .spore()
            default: palette = .lantern()
            }
            return FilamentWake(disc: disc, slots: slots, palette: palette)
        case .bloom:
            return BloomWake(ring: bake.ring, disc: disc, slots: slots)
        case .lyra:
            return LyraWake(disc: disc, slots: slots)
        case .plume:
            return PlumeWake(disc: disc, slots: slots)
        case .koi:
            return KoiWake(slots: slots)
        case .boreal:
            return BorealWake(disc: disc, slots: slots)
        case .luna:
            return FilamentWake(disc: disc, slots: slots, palette: .luna())
        case .wish:
            return WishWake(disc: disc, slots: slots)
        case .darner:
            return DarnerWake(slots: slots)
        case .puff:
            return PuffWake(disc: disc, slots: slots)
        case .argus:
            return ArgusWake(ring: bake.ring, disc: disc, slots: slots)
        case .chime:
            return ChimeWake(disc: disc, slots: slots)
        case .merlin:
            return WishWake(disc: disc, slots: slots * 3, spectacular: true)
        case .wisp:
            return WispTrailNode(disc: disc, maxPoints: slots + 2)
        case .chevron:
            return ChevronTrailNode(maxPoints: slots)
        case .rings:
            return RingTrailField(ring: bake.ring, disc: disc, maxPoints: slots, bubble: skin.id == .halo)
        case .cloud:
            if skin.id == .dusk {
                return CloudTrailField(
                    disc: disc, skin: skin, color: BrandColors.UI.saber,
                    density: 2, rippleScale: 0.4, scatterDust: true, scatterWidth: 1.4
                )
            }
            return CloudTrailField(
                disc: disc, skin: skin, color: BrandColors.UI.ink,
                density: 1, rippleScale: 0.55, scatterDust: false, scatterWidth: 1
            )
        case .stamp:
            return StampTrailField(maxPoints: slots)
        case .tick:
            return TickTrailNode(maxPoints: slots, stretch: true)
        case .crease:
            return CreaseTrailNode(maxPoints: slots + 2)
        case .ladder:
            return LadderTrailNode(maxPoints: slots)
        case .lag:
            return LagTrailNode(maxPoints: slots + 2)
        case .dash:
            return DashTrailNode(maxPoints: slots)
        case .cinder:
            return CinderTrailNode(disc: disc, maxPoints: slots + 2)
        }
    }
}
