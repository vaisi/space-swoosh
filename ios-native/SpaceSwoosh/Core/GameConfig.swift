// GameConfig.swift
// Changes: Phase A — shared tunables from GameConfig.js (spacecraft + camera subset).

import Foundation
import CoreGraphics

enum GameConfig {
    /// Fixed simulation timestep (seconds). Presentation interpolates at display rate.
    static let simDt: CGFloat = 1.0 / 60.0

    enum Spacecraft {
        static let radiusUnits: CGFloat = 1
        /// Fraction of playfield height per sim-second (matches JS baseSpeed ≈ speed × height).
        static let speed: CGFloat = 0.08
        static let zigzagAngleDeg: CGFloat = 52
        static let zigzagSpeedScale: CGFloat = 1.45
        static let trailMaxPoints: Int = 80
        static let trailFadePerSecond: CGFloat = 60.0 / 360.0
    }

    enum Playfield {
        /// Logical aspect used for letterboxing (width:height).
        static let aspect: CGFloat = 2.0 / 3.0
    }
}
