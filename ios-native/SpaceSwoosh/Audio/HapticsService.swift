// HapticsService.swift
// Changes: Slice D — Light impact on wall BOOP (Android hapticWallBoop).

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
}
