// BrandColors.swift
// Changes: Slice D — light cream / night-paper palettes from Android theme.js.

import SwiftUI
import UIKit

enum BrandColors {
    private static var dark: Bool { SettingsStore.shared.isDark }

    static var paper: Color { uiColor(.paper).color }
    static var paperTint: Color { uiColor(.paperTint).color }
    static var paperDeep: Color { uiColor(.paperDeep).color }
    static var ink: Color { uiColor(.ink).color }
    static var ink80: Color { uiColor(.ink).color.opacity(0.80) }
    static var ink55: Color { uiColor(.ink).color.opacity(0.55) }
    static var signal: Color { uiColor(.signal).color }

    enum Swatch {
        case paper, paperTint, paperDeep, ink, signal
    }

    static func uiColor(_ swatch: Swatch, dark override: Bool? = nil) -> UIColor {
        let night = override ?? dark
        switch swatch {
        case .paper:
            return night
                ? UIColor(red: 28 / 255, green: 26 / 255, blue: 22 / 255, alpha: 1)
                : UIColor(red: 225 / 255, green: 217 / 255, blue: 193 / 255, alpha: 1)
        case .paperTint:
            return night
                ? UIColor(red: 42 / 255, green: 38 / 255, blue: 32 / 255, alpha: 1)
                : UIColor(red: 234 / 255, green: 228 / 255, blue: 210 / 255, alpha: 1)
        case .paperDeep:
            return night
                ? UIColor(red: 18 / 255, green: 16 / 255, blue: 14 / 255, alpha: 1)
                : UIColor(red: 211 / 255, green: 201 / 255, blue: 172 / 255, alpha: 1)
        case .ink:
            return night
                ? UIColor(red: 225 / 255, green: 217 / 255, blue: 193 / 255, alpha: 1)
                : UIColor(red: 26 / 255, green: 26 / 255, blue: 26 / 255, alpha: 1)
        case .signal:
            return night
                ? UIColor(red: 61 / 255, green: 1, blue: 154 / 255, alpha: 1)
                : UIColor(red: 0, green: 0, blue: 1, alpha: 1)
        }
    }

    enum UI {
        static var paper: UIColor { BrandColors.uiColor(.paper) }
        static var paperDeep: UIColor { BrandColors.uiColor(.paperDeep) }
        static var ink: UIColor { BrandColors.uiColor(.ink) }
        static var ink12: UIColor { BrandColors.uiColor(.ink).withAlphaComponent(0.12) }
        static var ink55: UIColor { BrandColors.uiColor(.ink).withAlphaComponent(0.55) }
        static var ink30: UIColor { BrandColors.uiColor(.ink).withAlphaComponent(0.30) }
        static var signal: UIColor { BrandColors.uiColor(.signal) }
        static var trail: UIColor { BrandColors.uiColor(.ink) }
    }
}

private extension UIColor {
    var color: Color { Color(self) }
}
