// FixedStepSimulator.swift
// Changes: 60 Hz sim / 5-step cap — do not retune from App Preview stream lag.

import Foundation
import CoreGraphics

struct FixedStepSimulator {
    let dt: CGFloat
    private(set) var accumulator: CGFloat = 0
    /// Max catch-up steps per frame (prevents spiral-of-death after a hitch).
    var maxStepsPerFrame: Int = 5

    init(dt: CGFloat = GameConfig.simDt) {
        self.dt = dt
    }

    mutating func reset() {
        accumulator = 0
    }

    /// Advances simulation by consuming `frameDelta` in fixed `dt` chunks.
    /// Returns steps taken and interpolation alpha in [0, 1].
    mutating func tick(frameDelta: CGFloat, step: () -> Void) -> (steps: Int, alpha: CGFloat) {
        let clamped = min(max(frameDelta, 0), dt * CGFloat(maxStepsPerFrame))
        accumulator += clamped
        var steps = 0
        while accumulator >= dt && steps < maxStepsPerFrame {
            step()
            accumulator -= dt
            steps += 1
        }
        let alpha = accumulator / dt
        return (steps, alpha)
    }
}
