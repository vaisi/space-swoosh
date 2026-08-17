// BrandColors.swift
// Changes: ink30 token for dotted menu rules; Nyan gray; live-ship accents.

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
    static var ink30: Color { uiColor(.ink).color.opacity(0.30) }
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
        static var lanternTeal: UIColor {
            BrandColors.dark
                ? rgb(94, 224, 212)
                : rgb(46, 139, 138)
        }
        static var lanternGold: UIColor {
            BrandColors.dark
                ? rgb(245, 208, 106)
                : rgb(232, 184, 74)
        }
        static var ember: UIColor {
            BrandColors.dark ? rgb(196, 120, 85) : rgb(166, 93, 63)
        }
        static var sproutGreen: UIColor {
            BrandColors.dark ? rgb(110, 220, 138) : rgb(62, 139, 90)
        }
        static var sporeAmber: UIColor {
            BrandColors.dark ? rgb(232, 160, 90) : rgb(196, 122, 58)
        }
        static var sporeViolet: UIColor {
            BrandColors.dark ? rgb(181, 122, 224) : rgb(122, 78, 158)
        }
        static var sporeMint: UIColor { rgb(120, 200, 160) }
        static var lunaSilver: UIColor { rgb(198, 192, 210) }
        static var mothLavender: UIColor {
            BrandColors.dark ? rgb(201, 166, 240) : rgb(139, 107, 176)
        }
        static var argusTeal: UIColor {
            BrandColors.dark ? rgb(64, 228, 196) : rgb(16, 92, 88)
        }
        static var lanternCyan: UIColor { rgb(90, 210, 200) }
        static var koiVermillion: UIColor { rgb(210, 72, 58) }
        static var wishCore: UIColor { rgb(255, 248, 230) }
        static let bloomBands: [UIColor] = [
            rgb(255, 140, 180), rgb(120, 220, 190), rgb(180, 150, 255), rgb(120, 190, 255)
        ]
        static let auroraBands: [UIColor] = [
            rgb(48, 186, 132), rgb(72, 198, 220), rgb(232, 92, 168), rgb(140, 110, 230)
        ]
        static let auroraHull: [UIColor] = [
            rgb(48, 186, 132), rgb(72, 198, 220), rgb(232, 92, 168)
        ]
        static let plumeBands: [UIColor] = [
            rgb(72, 42, 48), rgb(196, 82, 48), rgb(232, 150, 64), rgb(255, 220, 140)
        ]
        static let koiBands: [UIColor] = [
            rgb(210, 72, 58), rgb(236, 214, 168), rgb(46, 110, 118)
        ]
        static let wishBands: [UIColor] = [
            rgb(232, 184, 74), rgb(255, 248, 230), rgb(255, 140, 180), rgb(120, 220, 190)
        ]
        static let darnerBands: [UIColor] = [
            rgb(48, 186, 168), rgb(232, 184, 74), rgb(140, 88, 210)
        ]
        static let lunaDust: [UIColor] = [
            rgb(139, 107, 176), rgb(198, 192, 210), rgb(232, 196, 118)
        ]

        static func rgb(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat) -> UIColor {
            UIColor(red: r / 255, green: g / 255, blue: b / 255, alpha: 1)
        }
        static var nyanGray: UIColor { UIColor(red: 196 / 255, green: 189 / 255, blue: 176 / 255, alpha: 1) }
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
