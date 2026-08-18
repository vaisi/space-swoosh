// HapticsService.swift
// Changes: Selection tick on shield smash (lighter than Light wall-BOOP impact).

import UIKit

enum HapticsService {
    private static let light = UIImpactFeedbackGenerator(style: .light)
    private static let selection = UISelectionFeedbackGenerator()

    static func prepare() {
        light.prepare()
        selection.prepare()
    }

    static func wallBoop() {
        light.impactOccurred()
        light.prepare()
    }

    static func shieldSmash() {
        selection.selectionChanged()
        selection.prepare()
    }
}
