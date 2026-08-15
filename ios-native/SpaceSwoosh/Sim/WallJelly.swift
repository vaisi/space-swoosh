// WallJelly.swift
// Changes: Slice D — Android default hull squash + spring trail nudge (420 ms).

import Foundation
import CoreGraphics

enum WallJelly {
    static func hullScale(elapsedMs: CGFloat, side: CGFloat) -> (sx: CGFloat, sy: CGFloat, side: CGFloat) {
        let dur = GameConfig.Flicker.wallJellyMs
        guard elapsedMs >= 0, elapsedMs < dur else {
            return (1, 1, side)
        }
        let t = elapsedMs / dur
        let damp = exp(-2.4 * t)
        let primary = cos(t * .pi * 2.8) * damp
        let shake = sin(t * .pi * 7.5) * exp(-4.2 * t) * 0.06
        let sx = max(0.42, 1 - 0.52 * primary + shake)
        let sy = min(1.65, 1 + 0.48 * primary - shake * 0.7)
        return (sx, sy, side)
    }

    /// Default `springLikeDeform` lateral/along nudge for one wake sample.
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
}
