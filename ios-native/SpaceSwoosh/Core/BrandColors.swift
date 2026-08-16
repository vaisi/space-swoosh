// BrandColors.swift
// Changes: Saber / lantern / Nyan / Fletch wake colors from Android tokens.

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
        /// Android `color.signalSoft` fill alpha (paper 0.14 / night 0.32).
        static var signalSoftAlpha: CGFloat { BrandColors.dark ? 0.32 : 0.14 }
        static var trail: UIColor { BrandColors.uiColor(.ink) }
        static var saber: UIColor { UIColor(red: 168 / 255, green: 85 / 255, blue: 1, alpha: 1) }
        static var saberCore: UIColor { UIColor(red: 243 / 255, green: 232 / 255, blue: 1, alpha: 1) }
        static var lanternTeal: UIColor { UIColor(red: 46 / 255, green: 139 / 255, blue: 138 / 255, alpha: 1) }
        static var lanternGold: UIColor { UIColor(red: 232 / 255, green: 184 / 255, blue: 74 / 255, alpha: 1) }
        static var nyanPink: UIColor { UIColor(red: 1, green: 143 / 255, blue: 184 / 255, alpha: 1) }
        static let nyanBands: [UIColor] = [
            UIColor(red: 1, green: 0, blue: 102 / 255, alpha: 1),
            UIColor(red: 1, green: 153 / 255, blue: 0, alpha: 1),
            UIColor(red: 1, green: 230 / 255, blue: 0, alpha: 1),
            UIColor(red: 51 / 255, green: 204 / 255, blue: 51 / 255, alpha: 1),
            UIColor(red: 0, green: 153 / 255, blue: 1, alpha: 1),
            UIColor(red: 153 / 255, green: 51 / 255, blue: 1, alpha: 1)
        ]
        static let fletchBands: [UIColor] = [
            UIColor(red: 72 / 255, green: 48 / 255, blue: 118 / 255, alpha: 1),
            UIColor(red: 48 / 255, green: 142 / 255, blue: 154 / 255, alpha: 1),
            UIColor(red: 1, green: 214 / 255, blue: 118 / 255, alpha: 1),
            UIColor(red: 1, green: 142 / 255, blue: 64 / 255, alpha: 1)
        ]
    }
}

private extension UIColor {
    var color: Color { Color(self) }
}
