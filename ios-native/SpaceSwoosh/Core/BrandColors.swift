// BrandColors.swift
// Changes: Slice D — ink12 / ink55 for Flicker hull bake.

import SwiftUI
import UIKit

enum BrandColors {
    static let paper = Color(red: 225 / 255, green: 217 / 255, blue: 193 / 255)
    static let paperTint = Color(red: 234 / 255, green: 228 / 255, blue: 210 / 255)
    static let paperDeep = Color(red: 211 / 255, green: 201 / 255, blue: 172 / 255)
    static let ink = Color(red: 26 / 255, green: 26 / 255, blue: 26 / 255)
    static let ink80 = Color(red: 26 / 255, green: 26 / 255, blue: 26 / 255).opacity(0.80)
    static let ink55 = Color(red: 26 / 255, green: 26 / 255, blue: 26 / 255).opacity(0.55)
    static let signal = Color(red: 0, green: 0, blue: 1)

    enum UI {
        static let paper = UIColor(red: 225 / 255, green: 217 / 255, blue: 193 / 255, alpha: 1)
        static let paperDeep = UIColor(red: 211 / 255, green: 201 / 255, blue: 172 / 255, alpha: 1)
        static let ink = UIColor(red: 26 / 255, green: 26 / 255, blue: 26 / 255, alpha: 1)
        static let ink12 = UIColor(red: 26 / 255, green: 26 / 255, blue: 26 / 255, alpha: 0.12)
        static let ink55 = UIColor(red: 26 / 255, green: 26 / 255, blue: 26 / 255, alpha: 0.55)
        static let ink30 = UIColor(red: 26 / 255, green: 26 / 255, blue: 26 / 255, alpha: 0.30)
        static let signal = UIColor(red: 0, green: 0, blue: 1, alpha: 1)
        static let trail = UIColor(red: 26 / 255, green: 26 / 255, blue: 26 / 255, alpha: 1)
    }
}
