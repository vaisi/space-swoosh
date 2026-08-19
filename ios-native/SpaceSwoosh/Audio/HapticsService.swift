// HapticsService.swift
// Changes: Shield smash uses the same Light impact as wall BOOP at 0.55 intensity.

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
}
