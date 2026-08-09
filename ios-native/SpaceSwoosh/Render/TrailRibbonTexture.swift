// TrailRibbonTexture.swift
// Changes: Phase A — soft ink ribbon segment texture baked once for pooled quads.

import SpriteKit
import UIKit

enum TrailRibbonTexture {
    static func make() -> SKTexture {
        let size = CGSize(width: 32, height: 8)
        let renderer = UIGraphicsImageRenderer(size: size)
        let image = renderer.image { ctx in
            let cg = ctx.cgContext
            let colors = [
                UIColor.clear.cgColor,
                BrandColors.UI.trail.withAlphaComponent(0.85).cgColor,
                BrandColors.UI.trail.withAlphaComponent(0.85).cgColor,
                UIColor.clear.cgColor
            ] as CFArray
            let locs: [CGFloat] = [0, 0.35, 0.65, 1]
            if let gradient = CGGradient(
                colorsSpace: CGColorSpaceCreateDeviceRGB(),
                colors: colors,
                locations: locs
            ) {
                cg.drawLinearGradient(
                    gradient,
                    start: CGPoint(x: 0, y: size.height / 2),
                    end: CGPoint(x: size.width, y: size.height / 2),
                    options: []
                )
            }
        }
        let texture = SKTexture(image: image)
        texture.filteringMode = .linear
        return texture
    }
}
