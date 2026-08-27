// WallJelly.swift
// Changes: Merlin glitter wobble (needle-thin); spring deform uses seed×2π; plantFactor matches Android PLANT_BY_PROFILE.

import Foundation
import CoreGraphics

struct TrailDeform {
    var dx: CGFloat
    var dy: CGFloat
    var sx: CGFloat
    var sy: CGFloat
    static let zero = TrailDeform(dx: 0, dy: 0, sx: 1, sy: 1)
}

struct HullJelly {
    var sx: CGFloat
    var sy: CGFloat
    var side: CGFloat
    var shake: CGFloat
    var shear: CGFloat
}

enum WallJelly {
    static let trailWaveMs: CGFloat = 560

    static func hullScale(
        elapsedMs: CGFloat,
        side: CGFloat,
        profile: JellyProfile = .standard
    ) -> HullJelly {
        let dur = GameConfig.Flicker.wallJellyMs
        guard elapsedMs >= 0, elapsedMs < dur else {
            return HullJelly(sx: 1, sy: 1, side: side, shake: 0, shear: 0)
        }
        let t = elapsedMs / dur
        let s: CGFloat = side < 0 ? -1 : 1
        switch profile {
        case .needle:
            let damp = exp(-1.85 * t)
            let flex = cos(t * .pi * 3.6) * damp
            let settle = sin(t * .pi * 5.5) * exp(-2.8 * t)
            return HullJelly(
                sx: max(0.8, 1 - 0.16 * flex + settle * 0.04),
                sy: min(1.9, max(0.74, 1 + 0.58 * flex - settle * 0.1)),
                side: s, shake: settle * 0.12, shear: flex * 0.4 + settle * 0.1
            )
        case .halo:
            let damp = exp(-2.1 * t)
            let orbit = sin(t * .pi * 4.2) * damp
            let settle = cos(t * .pi * 6.5) * exp(-3.2 * t)
            return HullJelly(sx: max(0.9, 1 + orbit * 0.06), sy: max(0.9, 1 - orbit * 0.05),
                             side: s, shake: settle * 0.18, shear: orbit * 0.22)
        case .shard:
            let crack = exp(-5.5 * t) * cos(t * .pi * 1.2)
            let shard = sin(t * .pi * 8) * exp(-4.5 * t)
            return HullJelly(sx: max(0.62, 1 - 0.38 * crack), sy: min(1.35, 1 + 0.28 * crack - shard * 0.08),
                             side: s, shake: shard * 0.1, shear: shard * 0.18 * s)
        case .stamp:
            let damp = exp(-2.0 * t)
            let plant = cos(t * .pi * 1.8) * damp
            let peel = sin(t * .pi * 3.2) * exp(-3.0 * t)
            return HullJelly(sx: max(0.48, 1 - 0.5 * plant), sy: min(1.45, 1 + 0.35 * plant - peel * 0.08),
                             side: s, shake: peel * 0.08, shear: 0)
        case .fold:
            let damp = exp(-2.2 * t)
            let crease = cos(t * .pi * 2.4) * damp
            let flick = sin(t * .pi * 5.5) * exp(-3.4 * t)
            return HullJelly(sx: max(0.55, 1 - 0.4 * crease), sy: min(1.5, 1 + 0.42 * crease),
                             side: s, shake: flick * 0.07, shear: crease * 0.28 + flick * 0.12)
        case .spine:
            let damp = exp(-2.0 * t)
            let flex = cos(t * .pi * 2.6) * damp
            let quiver = sin(t * .pi * 7) * exp(-3.8 * t)
            return HullJelly(sx: max(0.72, 1 - 0.22 * flex),
                             sy: min(1.55, max(0.7, 1 + 0.48 * flex - quiver * 0.06)),
                             side: s, shake: quiver * 0.09, shear: 0)
        case .mote:
            let damp = exp(-1.9 * t)
            let soft = cos(t * .pi * 2.2) * damp
            let drift = sin(t * .pi * 4.8) * exp(-2.6 * t)
            return HullJelly(sx: max(0.7, 1 - 0.28 * soft), sy: min(1.35, 1 + 0.26 * soft),
                             side: s, shake: drift * 0.14, shear: drift * 0.08)
        case .orbit:
            let damp = exp(-2.0 * t)
            let oval = sin(t * .pi * 3.4) * damp
            let settle = cos(t * .pi * 5.8) * exp(-3.0 * t)
            return HullJelly(sx: max(0.85, 1 + oval * 0.12), sy: max(0.85, 1 - oval * 0.1),
                             side: s, shake: settle * 0.1, shear: oval * 0.15)
        case .flux:
            let damp = exp(-2.4 * t)
            let facet = cos(t * .pi * 3.2) * damp
            let tick = sin(t * .pi * 8.5) * exp(-3.8 * t)
            return HullJelly(sx: max(0.72, 1 - 0.22 * facet), sy: min(1.28, 1 + 0.2 * facet),
                             side: s, shake: tick * 0.08, shear: facet * 0.22 + tick * 0.1)
        case .cinder:
            let damp = exp(-1.85 * t)
            let bloom = cos(t * .pi * 2.1) * damp
            let flicker = sin(t * .pi * 5.2) * exp(-2.8 * t)
            return HullJelly(sx: max(0.62, 1 - 0.32 * bloom), sy: min(1.42, 1 + 0.34 * bloom),
                             side: s, shake: flicker * 0.12, shear: flicker * 0.1)
        case .lantern:
            let damp = exp(-1.7 * t)
            let pulse = cos(t * .pi * 2.0) * damp
            let wobble = sin(t * .pi * 4.4) * exp(-2.4 * t)
            return HullJelly(sx: max(0.68, 1 - 0.28 * pulse + wobble * 0.06),
                             sy: min(1.55, 1 + 0.48 * pulse - wobble * 0.08),
                             side: s, shake: wobble * 0.14, shear: wobble * 0.08)
        case .bloom:
            let swell = sin(min(1, t * 1.6) * .pi) * exp(-1.6 * t)
            let damp = exp(-2.0 * t)
            let orbit = sin(t * .pi * 4.2) * damp
            let settle = cos(t * .pi * 6.5) * exp(-3.2 * t)
            return HullJelly(sx: max(0.92, 1 + swell * 0.22 + orbit * 0.04),
                             sy: max(0.92, 1 + swell * 0.22 - orbit * 0.04),
                             side: s, shake: settle * 0.16, shear: orbit * 0.18)
        case .lyra:
            let damp = exp(-2.1 * t)
            let orbit = sin(t * .pi * 4.4) * damp
            let settle = cos(t * .pi * 6.2) * exp(-3.2 * t)
            return HullJelly(sx: max(0.88, 1 + orbit * 0.08), sy: max(0.88, 1 - orbit * 0.06),
                             side: s, shake: settle * 0.16, shear: orbit * 0.2)
        case .sprout:
            let damp = exp(-1.75 * t)
            let unfurl = cos(t * .pi * 2.0) * damp
            let quiver = sin(t * .pi * 5.0) * exp(-2.6 * t)
            return HullJelly(sx: max(0.7, 1 - 0.22 * unfurl), sy: min(1.5, 1 + 0.42 * unfurl),
                             side: s, shake: quiver * 0.12, shear: quiver * 0.08)
        case .plume:
            let damp = exp(-1.9 * t)
            let flare = sin(t * .pi) * damp
            let flicker = sin(t * .pi * 6.2) * exp(-2.8 * t)
            return HullJelly(sx: min(1.45, 1 + 0.38 * flare), sy: max(0.78, 1 - 0.16 * flare),
                             side: s, shake: flicker * 0.14, shear: flicker * 0.12)
        case .koi:
            let damp = exp(-1.8 * t)
            let flex = cos(t * .pi * 3.2) * damp
            let settle = sin(t * .pi * 5.4) * exp(-2.8 * t)
            return HullJelly(sx: max(0.78, 1 - 0.18 * flex), sy: min(1.35, 1 + 0.22 * flex),
                             side: s, shake: settle * 0.12, shear: flex * 0.42 + settle * 0.1)
        case .spore:
            let damp = exp(-1.7 * t)
            let pulse = cos(t * .pi * 2.0) * damp
            let wobble = sin(t * .pi * 4.2) * exp(-2.4 * t)
            return HullJelly(sx: max(0.72, 1 - 0.24 * pulse),
                             sy: min(1.38, 1 + 0.32 * pulse - wobble * 0.06),
                             side: s, shake: wobble * 0.12, shear: wobble * 0.06)
        case .boreal:
            let damp = exp(-1.85 * t)
            let wave = sin(t * .pi * 3.6) * damp
            let settle = cos(t * .pi * 5.8) * exp(-3.0 * t)
            return HullJelly(sx: max(0.82, 1 + wave * 0.12), sy: max(0.82, 1 - wave * 0.1),
                             side: s, shake: settle * 0.14, shear: wave * 0.38)
        case .luna:
            let damp = exp(-1.75 * t)
            let flutter = sin(t * .pi * 3.8) * damp
            let settle = cos(t * .pi * 5.6) * exp(-2.8 * t)
            return HullJelly(sx: min(1.42, 1 + 0.32 * abs(flutter)), sy: max(0.82, 1 - 0.12 * abs(flutter)),
                             side: s, shake: settle * 0.14, shear: flutter * 0.16)
        case .wish:
            let damp = exp(-2.0 * t)
            let spark = sin(t * .pi * 5.2) * damp
            let settle = cos(t * .pi * 6.8) * exp(-3.2 * t)
            return HullJelly(sx: max(0.88, 1 + spark * 0.1), sy: min(1.22, 1 + abs(spark) * 0.14),
                             side: s, shake: settle * 0.18, shear: spark * 0.12)
        case .darner:
            let damp = exp(-1.8 * t)
            let spread = sin(t * .pi) * damp
            let quiver = sin(t * .pi * 6.4) * exp(-2.8 * t)
            return HullJelly(sx: min(1.48, 1 + 0.4 * spread), sy: max(0.8, 1 - 0.14 * spread),
                             side: s, shake: quiver * 0.12, shear: quiver * 0.1)
        case .puff:
            let swell = sin(min(1, t * 1.6) * .pi) * exp(-1.6 * t)
            let damp = exp(-2.0 * t)
            let orbit = sin(t * .pi * 4.0) * damp
            return HullJelly(sx: max(0.92, 1 + swell * 0.2 + orbit * 0.04),
                             sy: max(0.92, 1 + swell * 0.2 - orbit * 0.04),
                             side: s, shake: orbit * 0.12, shear: orbit * 0.1)
        case .argus:
            let damp = exp(-1.85 * t)
            let fan = sin(t * .pi) * damp
            let flicker = sin(t * .pi * 5.5) * exp(-2.6 * t)
            return HullJelly(sx: min(1.5, 1 + 0.42 * fan), sy: max(0.78, 1 - 0.12 * fan),
                             side: s, shake: flicker * 0.1, shear: flicker * 0.08)
        case .chime:
            let damp = exp(-2.1 * t)
            let orbit = sin(t * .pi * 4.2) * damp
            let settle = cos(t * .pi * 6.5) * exp(-3.2 * t)
            return HullJelly(sx: max(0.9, 1 + orbit * 0.07), sy: max(0.9, 1 - orbit * 0.05),
                             side: s, shake: settle * 0.16, shear: orbit * 0.2)
        case .merlin:
            let damp = exp(-2.0 * t)
            let spark = sin(t * .pi * 7.2) * damp
            let settle = cos(t * .pi * 8.4) * exp(-3.2 * t)
            return HullJelly(
                sx: max(0.90, 1 + spark * 0.05),
                sy: min(1.22, 1 + abs(spark) * 0.12),
                side: s, shake: settle * 0.22, shear: spark * 0.18
            )
        case .standard:
            let damp = exp(-2.4 * t)
            let primary = cos(t * .pi * 2.8) * damp
            let shake = sin(t * .pi * 7.5) * exp(-4.2 * t) * 0.06
            return HullJelly(
                sx: max(0.42, 1 - 0.52 * primary + shake),
                sy: min(1.65, 1 + 0.48 * primary - shake * 0.7),
                side: s, shake: shake, shear: 0
            )
        }
    }

    static func isLive(elapsedMs: CGFloat, mode: WallTrailMode) -> Bool {
        guard elapsedMs >= 0 else { return false }
        if mode == .ripple { return elapsedMs < trailWaveMs }
        return elapsedMs < GameConfig.Flicker.wallJellyMs
    }

    static func energy(elapsedMs: CGFloat) -> CGFloat {
        let dur = GameConfig.Flicker.wallJellyMs
        guard elapsedMs >= 0, elapsedMs < dur else { return 0 }
        return exp(-1.4 * (elapsedMs / dur))
    }

    static func rippleEnvelope(elapsedMs: CGFloat, along: CGFloat) -> CGFloat {
        guard elapsedMs >= 0, elapsedMs < trailWaveMs else { return 0 }
        let t = elapsedMs / trailWaveMs
        let a = max(0, min(1, along))
        let width: CGFloat = 0.12
        let travel: CGFloat = 0.72
        let peakAlong = 1 - min(1, t / travel)
        let d = a - peakAlong
        let pulse = exp(-(d * d) / (2 * width * width))
        return pulse * pow(a, 1.2)
    }

    /// JS `PLANT_BY_PROFILE` — how hard the hull slides into the wall while squashing.
    static func plantFactor(_ profile: JellyProfile) -> CGFloat {
        switch profile {
        case .standard: return 1
        case .needle: return 0.55
        case .halo: return 0.35
        case .shard: return 0.75
        case .stamp: return 1.1
        case .fold: return 0.85
        case .spine: return 0.7
        case .mote: return 0.9
        case .orbit: return 0.4
        case .flux: return 0.75
        case .cinder: return 0.95
        case .lantern: return 0.85
        case .bloom: return 0.3
        case .lyra: return 0.4
        case .sprout: return 0.8
        case .plume: return 0.55
        case .koi: return 0.7
        case .spore: return 0.85
        case .boreal: return 0.45
        case .luna: return 0.55
        case .wish: return 0.4
        case .darner: return 0.5
        case .puff: return 0.35
        case .argus: return 0.6
        case .chime: return 0.35
        case .merlin: return 0.4
        }
    }

    static func deform(
        mode: WallTrailMode,
        elapsedMs: CGFloat,
        along: CGFloat,
        side: CGFloat,
        radius: CGFloat,
        seed: CGFloat
    ) -> TrailDeform {
        let a = max(0, min(1, along))
        let s: CGFloat = side < 0 ? -1 : 1
        let seedPhase = seed * .pi * 2
        let r = radius
        if mode == .ripple {
            guard elapsedMs >= 0, elapsedMs < trailWaveMs else { return .zero }
            return ripple(elapsedMs: elapsedMs, along: a, side: s, radius: r, seedPhase: seedPhase)
        }
        let dur = GameConfig.Flicker.wallJellyMs
        guard elapsedMs >= 0, elapsedMs < dur else { return .zero }
        let t = elapsedMs / dur
        switch mode {
        case .ripple:
            return .zero
        case .pile:
            return pile(t: t, along: a, side: s, radius: r, seedPhase: seedPhase, strength: 1)
        case .dense:
            return pile(t: t, along: a, side: s, radius: r, seedPhase: seedPhase, strength: 1.35)
        case .blot:
            let base = pile(t: t, along: a, side: s, radius: r, seedPhase: seedPhase, strength: 1.15)
            let blot = exp(-3.2 * t) * a * a
            return TrailDeform(
                dx: base.dx + s * r * 0.2 * blot,
                dy: base.dy - r * 0.12 * blot,
                sx: max(0.32, base.sx * (1 - 0.25 * blot)),
                sy: min(1.85, base.sy * (1 + 0.35 * blot))
            )
        case .cloud:
            let base = pile(t: t, along: a, side: s, radius: r, seedPhase: seedPhase, strength: 0.85)
            let puffAng = seedPhase * .pi * 2
            let puff = r * 0.5 * exp(-1.6 * t) * (0.4 + 0.6 * (1 - a))
            return TrailDeform(
                dx: base.dx + cos(puffAng) * puff,
                dy: base.dy + sin(puffAng) * puff * 0.85,
                sx: max(0.5, base.sx * (0.85 + 0.3 * seed)),
                sy: min(1.6, base.sy * (0.9 + 0.25 * (1 - seed)))
            )
        case .scatter:
            return scatter(t: t, along: a, side: s, radius: r, seedPhase: seedPhase, seed: seed)
        case .shatter:
            let damp = exp(-2.4 * t)
            let fan = sin(t * .pi * 1.8) * damp
            let stack = cos(t * .pi * 3.2 + seedPhase * 0.2) * exp(-3.5 * t)
            let spread = (seed * 2 - 1)
            let near = a * a
            return TrailDeform(
                dx: s * r * 0.4 * stack * near + spread * r * 1.1 * fan * (0.55 + 0.45 * (1 - a)),
                dy: spread * r * 0.7 * fan * (0.4 + 0.6 * (1 - a)) - r * 0.18 * stack * near,
                sx: max(0.5, 1 - 0.25 * abs(stack) * near),
                sy: min(1.45, 1 + 0.3 * abs(fan) * (1 - a))
            )
        case .desync:
            let delay = (1 - a) * 0.28 + seed * 0.42
            let localT = max(0, min(1, t - delay))
            let damp = exp(-2.2 * localT)
            let primary = cos(localT * .pi * 2.6) * damp
            let snap = sin(localT * .pi * 4.5) * exp(-3.4 * localT)
            let near = 0.3 + 0.7 * a
            return TrailDeform(
                dx: s * r * (0.7 * primary * near - 0.35 * snap * (0.4 + 0.6 * seed)),
                dy: r * 0.14 * snap * a,
                sx: max(0.6, 1 - 0.2 * primary * a),
                sy: min(1.35, 1 + 0.18 * primary * a)
            )
        case .flare:
            let base = springLike(t: t, along: a, side: s, radius: r, seedPhase: seedPhase, delayScale: 0.3, into: 0.5, whipAmp: 0.55)
            let flare = exp(-1.7 * t) * (1 - a * 0.35)
            let lateral = (seed * 2 - 1) * r * 0.85 * flare
            return TrailDeform(
                dx: base.dx + lateral,
                dy: base.dy + abs(seed - 0.5) * r * 0.35 * flare,
                sx: base.sx,
                sy: min(1.5, base.sy * (1 + 0.2 * flare))
            )
        case .crease:
            let base = springLike(t: t, along: a, side: s, radius: r, seedPhase: seedPhase, delayScale: 0.32, freq: 2.4, whipFreq: 4.2)
            let zig = (seed > 0.5 ? 1 : -1) * r * 0.55 * sin(t * .pi * 3.2) * exp(-2.2 * t) * (0.5 + 0.5 * (1 - a))
            return TrailDeform(dx: base.dx + zig * 0.35, dy: base.dy + zig, sx: base.sx, sy: base.sy)
        case .ladder:
            let damp = exp(-1.9 * t)
            let crush = cos(t * .pi * 2.0) * damp
            let near = a * a
            return TrailDeform(
                dx: s * r * 0.9 * crush * near,
                dy: -r * 0.55 * crush * near,
                sx: max(0.45, 1 - 0.4 * crush * near),
                sy: max(0.4, 1 - 0.5 * crush * near)
            )
        case .lag:
            return springLike(
                t: t, along: a, side: s, radius: r, seedPhase: seedPhase,
                delayScale: 0.55, dampRate: 1.7, freq: 2.0, whipFreq: 3.2, whipDamp: 2.4, into: 0.48, whipAmp: 0.32
            )
        case .script:
            let tip = pow(1 - a, 1.1)
            let lock = pow(a, 2.4)
            let midBell = sin(min(1, a * 1.15) * .pi)
            let flourish = tip * (1 - lock) * (0.45 + 0.55 * midBell)
            let delay = tip * 0.22
            let localT = max(0, min(1, t - delay))
            let damp = exp(-1.45 * localT)
            let reverse = sin(localT * .pi * 1.35) * exp(-1.7 * localT)
            let stroke = sin(localT * .pi * 2.8 + seedPhase * 0.35) * damp
            let flick = sin(localT * .pi * 4.2) * exp(-2.6 * localT)
            let w = flourish
            return TrailDeform(
                dx: s * r * (0.55 * stroke * w - 1.35 * reverse * flourish - 0.4 * flick * tip * (1 - lock)),
                dy: r * (1.05 * reverse * flourish - 0.28 * stroke * w + 0.35 * flick * tip * (1 - lock)),
                sx: max(0.45, 1 - 0.32 * abs(stroke) * flourish),
                sy: min(1.65, 1 + 0.55 * abs(reverse) * flourish)
            )
        case .flick:
            let damp = exp(-2.2 * t)
            let stretch = sin(t * .pi * 2.6) * damp
            let tick = cos(t * .pi * 4.8 + seedPhase) * exp(-3.2 * t)
            let near = 0.35 + 0.65 * a
            return TrailDeform(
                dx: s * r * 0.35 * tick * near + (seed * 2 - 1) * r * 0.2 * stretch * (1 - a),
                dy: -r * 0.55 * stretch * near,
                sx: max(0.55, 1 - 0.2 * abs(tick) * near),
                sy: min(1.7, 1 + 0.65 * abs(stretch) * near)
            )
        case .cinder:
            let damp = exp(-2.1 * t)
            let bloom = sin(t * .pi * 1.6) * damp
            let near = 0.4 + 0.6 * a
            return TrailDeform(
                dx: s * r * 0.28 * bloom * near,
                dy: -r * 0.18 * bloom * near,
                sx: max(0.7, 1 - 0.12 * bloom * near),
                sy: min(1.35, 1 + 0.28 * bloom * near)
            )
        case .whip:
            let endBoost = 1 + 1.7 * pow(1 - a, 1.4)
            return springLike(
                t: t, along: a, side: s, radius: r, seedPhase: seedPhase,
                delayScale: 0.5, dampRate: 1.8, freq: 2.2, whipFreq: 2.8, whipDamp: 1.9,
                into: 0.52, whipAmp: 0.7, endBoost: endBoost, tipHeavy: true
            )
        case .spring:
            return springLike(t: t, along: a, side: s, radius: r, seedPhase: seedPhase)
        }
    }

    private static func ripple(
        elapsedMs: CGFloat,
        along a: CGFloat,
        side: CGFloat,
        radius r: CGFloat,
        seedPhase: CGFloat
    ) -> TrailDeform {
        let env = rippleEnvelope(elapsedMs: elapsedMs, along: a)
        guard env >= 0.02 else { return .zero }
        let jitter = 0.82 + 0.18 * sin(seedPhase)
        return TrailDeform(
            dx: -side * r * 1.2 * env * jitter,
            dy: -r * 0.4 * env,
            sx: 1 + 0.2 * env,
            sy: 1 + 0.15 * env
        )
    }

    private static func pile(
        t: CGFloat,
        along a: CGFloat,
        side: CGFloat,
        radius r: CGFloat,
        seedPhase: CGFloat,
        strength: CGFloat
    ) -> TrailDeform {
        let damp = exp(-1.8 * t)
        let crush = cos(t * .pi * 1.6) * damp
        let peel = sin(t * .pi * 2.2 + seedPhase * 0.3) * exp(-2.8 * t)
        let near = a * a
        let s = strength
        return TrailDeform(
            dx: side * r * (0.85 * crush * near * s + 0.22 * peel * a),
            dy: -r * 0.35 * crush * near * s,
            sx: max(0.38, 1 - 0.55 * crush * near * s),
            sy: min(1.7, 1 + 0.5 * crush * near * s)
        )
    }

    private static func scatter(
        t: CGFloat,
        along a: CGFloat,
        side: CGFloat,
        radius r: CGFloat,
        seedPhase: CGFloat,
        seed: CGFloat
    ) -> TrailDeform {
        let damp = exp(-2.0 * t)
        let kick = sin(t * .pi * 2.4 + seedPhase) * damp
        let realign = cos(t * .pi * 3.6 + seedPhase * 0.5) * exp(-3.2 * t)
        let lateral = (seed * 2 - 1)
        let near = 0.35 + 0.65 * a
        return TrailDeform(
            dx: side * r * 0.35 * realign * near + lateral * r * 0.95 * kick * (0.5 + 0.5 * (1 - a)),
            dy: -r * 0.15 * abs(kick) * near + lateral * r * 0.25 * kick,
            sx: max(0.5, 1 - 0.2 * abs(realign) * a),
            sy: min(1.55, 1 + 0.45 * abs(kick) * (1 - a * 0.4))
        )
    }

    private static func springLike(
        t: CGFloat,
        along a: CGFloat,
        side: CGFloat,
        radius r: CGFloat,
        seedPhase: CGFloat,
        delayScale: CGFloat = 0.35,
        dampRate: CGFloat = 2.5,
        freq: CGFloat = 2.8,
        whipFreq: CGFloat = 5.2,
        whipDamp: CGFloat = 3.2,
        into: CGFloat = 0.62,
        whipAmp: CGFloat = 0.48,
        endBoost: CGFloat = 1,
        tipHeavy: Bool = false
    ) -> TrailDeform {
        let delay = (1 - a) * delayScale
        let localT = max(0, min(1, t - delay))
        let damp = exp(-dampRate * localT)
        let primary = cos(localT * .pi * freq + seedPhase * 0.15) * damp
        let whip = sin(localT * .pi * whipFreq + seedPhase) * exp(-whipDamp * localT)
        let alongW: CGFloat = tipHeavy ? (0.5 + 0.5 * (1 - a)) : (0.25 + 0.75 * a)
        let dx = side * r * endBoost * (into * primary * (0.25 + 0.75 * a) - whipAmp * whip * alongW)
        let dy = r * (tipHeavy ? 0.22 : 0.12) * whip * (tipHeavy ? (0.45 + 0.55 * (1 - a)) : a) * endBoost
        let near = a * a
        return TrailDeform(
            dx: dx,
            dy: dy,
            sx: max(0.55, 1 - 0.28 * primary * near),
            sy: min(1.4, 1 + 0.22 * primary * near)
        )
    }
}
