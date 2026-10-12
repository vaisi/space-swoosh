// ObstacleIntensity.swift
// Gentle / today / hard knobs for the nine new obstacles. Today's tuning is
// the middle value. A Journey debut day of that type uses the gentle end.
// Changes:
// - Created file: same triples as src/config/ObstacleIntensity.js.

import Foundation
import CoreGraphics

enum ObstacleIntensity {
    private static let gentleToday: CGFloat = 0.5

    static func of(run: RunState, type: String) -> CGFloat {
        if run.profile.mode == .openSpace || run.profile.mode == .hazardLab {
            return gentleToday
        }
        if run.profile.descriptor?.introduces == type { return 0 }
        return min(1, max(0, run.profile.difficulty))
    }

    static func knob(run: RunState, type: String, gentle: CGFloat, today: CGFloat, hard: CGFloat) -> CGFloat {
        let t = of(run: run, type: type)
        if t < 0.5 { return lerp(gentle, today, t * 2) }
        return lerp(today, hard, (t - 0.5) * 2)
    }

    static func knobInt(run: RunState, type: String, gentle: CGFloat, today: CGFloat, hard: CGFloat) -> Int {
        Int(knob(run: run, type: type, gentle: gentle, today: today, hard: hard).rounded())
    }

    private static func lerp(_ a: CGFloat, _ b: CGFloat, _ t: CGFloat) -> CGFloat {
        a + (b - a) * t
    }
}
