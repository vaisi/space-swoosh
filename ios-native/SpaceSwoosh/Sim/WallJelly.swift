// WallJelly.swift
// Changes: Android wallTrailDeform — dense / spring / scatter / whip + needle hull.

import Foundation
import CoreGraphics

struct TrailDeform {
    var dx: CGFloat
    var dy: CGFloat
    var sx: CGFloat
    var sy: CGFloat
    static let zero = TrailDeform(dx: 0, dy: 0, sx: 1, sy: 1)
}

enum WallJelly {
    static func hullScale(
        elapsedMs: CGFloat,
        side: CGFloat,
        profile: JellyProfile = .standard
    ) -> (sx: CGFloat, sy: CGFloat, side: CGFloat) {
        let dur = GameConfig.Flicker.wallJellyMs
        guard elapsedMs >= 0, elapsedMs < dur else {
            return (1, 1, side)
        }
        let t = elapsedMs / dur
        if profile == .needle {
            let damp = exp(-1.85 * t)
            let flex = cos(t * .pi * 3.6) * damp
            let settle = sin(t * .pi * 5.5) * exp(-2.8 * t)
            let sx = max(0.8, 1 - 0.16 * flex + settle * 0.04)
            let sy = min(1.9, max(0.74, 1 + 0.58 * flex - settle * 0.1))
            return (sx, sy, side)
        }
        let damp = exp(-2.4 * t)
        let primary = cos(t * .pi * 2.8) * damp
        let shake = sin(t * .pi * 7.5) * exp(-4.2 * t) * 0.06
        let sx = max(0.42, 1 - 0.52 * primary + shake)
        let sy = min(1.65, 1 + 0.48 * primary - shake * 0.7)
        return (sx, sy, side)
    }

    static func energy(elapsedMs: CGFloat) -> CGFloat {
        let dur = GameConfig.Flicker.wallJellyMs
        guard elapsedMs >= 0, elapsedMs < dur else { return 0 }
        return exp(-1.4 * (elapsedMs / dur))
    }

    /// Flicker live nudge — keep the existing seed (0…1) phase, not seed×2π.
    static func springNudge(
        t: CGFloat,
        along: CGFloat,
        side: CGFloat,
        radius: CGFloat,
        seed: CGFloat
    ) -> (dx: CGFloat, dy: CGFloat) {
        let delay = (1 - along) * 0.35
        let localT = max(0, min(1, t - delay))
        let damp = exp(-2.5 * localT)
        let primary = cos(localT * .pi * 2.8 + seed * 0.15) * damp
        let whip = sin(localT * .pi * 5.2 + seed) * exp(-3.2 * localT)
        let alongW = 0.25 + 0.75 * along
        let dx = side * radius * (0.62 * primary * (0.25 + 0.75 * along) - 0.48 * whip * alongW)
        let dy = radius * 0.12 * whip * along
        return (dx, dy)
    }

    static func deform(
        mode: WallTrailMode,
        t: CGFloat,
        along: CGFloat,
        side: CGFloat,
        radius: CGFloat,
        seed: CGFloat
    ) -> TrailDeform {
        let a = max(0, min(1, along))
        let s = side < 0 ? -1 : 1
        let seedPhase = seed * .pi * 2
        switch mode {
        case .dense:
            return pile(t: t, along: a, side: s, radius: radius, seedPhase: seedPhase, strength: 1.35)
        case .spring:
            return springLike(t: t, along: a, side: s, radius: radius, seedPhase: seed)
        case .scatter:
            return scatter(t: t, along: a, side: s, radius: radius, seedPhase: seedPhase, seed: seed)
        case .whip:
            let endBoost = 1 + 1.7 * pow(1 - a, 1.4)
            return springLike(
                t: t,
                along: a,
                side: s,
                radius: radius,
                seedPhase: seedPhase,
                delayScale: 0.5,
                dampRate: 1.8,
                freq: 2.2,
                whipFreq: 2.8,
                whipDamp: 1.9,
                into: 0.52,
                whipAmp: 0.7,
                endBoost: endBoost,
                tipHeavy: true
            )
        }
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
