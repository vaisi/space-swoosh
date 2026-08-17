// BrandType.swift
// Changes: Space Grotesk / Space Mono roles matching Android BrandDraw presets.

import SwiftUI

/// Canvas `setDisplayType` / `setLabelType` / `setMonoType` for SwiftUI menus.
enum BrandType {
    static func display(_ size: CGFloat) -> Font {
        Font.custom("SpaceGrotesk-Bold", size: size)
    }

    static func ui(_ size: CGFloat) -> Font {
        Font.custom("SpaceGrotesk-Bold", size: size)
    }

    static func body(_ size: CGFloat) -> Font {
        Font.custom("SpaceGrotesk-Medium", size: size)
    }

    static func label(_ size: CGFloat) -> Font {
        Font.custom("SpaceGrotesk-Medium", size: size)
    }

    static func mono(_ size: CGFloat, bold: Bool = true) -> Font {
        Font.custom(bold ? "SpaceMono-Bold" : "SpaceMono-Regular", size: size)
    }

    static func displayTracking(_ size: CGFloat) -> CGFloat { -0.02 * size }
    static func labelTracking(_ size: CGFloat) -> CGFloat { 0.18 * size }
    static func uiTracking(_ size: CGFloat) -> CGFloat { 0.05 * size }
}
