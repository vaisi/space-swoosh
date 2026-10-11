// HapticsService.swift
// Changes: tick() is the quiet Hangar ruler pulse. Shield smash uses the
// same Light impact as wall BOOP at 0.55 intensity.

import UIKit

enum HapticsService {
    private static let light = UIImpactFeedbackGenerator(style: .light)

    static func prepare() {
        light.prepare()
    }

    static func wallBoop() {
        light.impactOccurred()
        light.prepare()
    }

    static func shieldSmash() {
        light.impactOccurred(intensity: 0.55)
        light.prepare()
    }

    /// Quiet tick while the Hangar ruler or swipe crosses a hull.
    static func tick() {
        light.impactOccurred(intensity: 0.4)
        light.prepare()
    }
}
