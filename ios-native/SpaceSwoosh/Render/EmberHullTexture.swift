// EmberHullTexture.swift
// Changes: Android dartPath — swept dart, nose at local −Y.

import SpriteKit
import UIKit

enum EmberHullTexture {
    static func make(logicalRadius: CGFloat, scale: CGFloat = 3) -> SKTexture {
        let texture = SKTexture(image: makeImage(logicalRadius: logicalRadius, scale: scale))
        texture.filteringMode = .linear
        return texture
    }

    static func makeImage(logicalRadius: CGFloat, scale: CGFloat = 3) -> UIImage {
        let r = max(logicalRadius * scale, 8)
        let pad = r * 1.65
        let size = ceil(pad * 2)
        let bounds = CGSize(width: size, height: size)
        let renderer = UIGraphicsImageRenderer(size: bounds)
        return renderer.image { ctx in
            let cg = ctx.cgContext
            cg.setFillColor(UIColor.clear.cgColor)
            cg.fill(CGRect(origin: .zero, size: bounds))
            let cx = size / 2
            let cy = size / 2
            let ry = r
            let path = CGMutablePath()
            path.move(to: CGPoint(x: cx, y: cy - ry * 1.05))
            path.addLine(to: CGPoint(x: cx + r * 0.72, y: cy + ry * 0.6))
            path.addLine(to: CGPoint(x: cx, y: cy + ry * 0.15))
            path.addLine(to: CGPoint(x: cx - r * 0.72, y: cy + ry * 0.6))
            path.closeSubpath()
            cg.setFillColor(BrandColors.UI.ink.cgColor)
            cg.addPath(path)
            cg.fillPath()
        }
    }
}
