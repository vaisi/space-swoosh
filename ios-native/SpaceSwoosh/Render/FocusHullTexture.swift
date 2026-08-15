// FocusHullTexture.swift
// Changes: Slice D — unused on the playfield (Flicker is the starter). Kept for Slice F.

import SpriteKit
import UIKit

enum FocusHullTexture {
    static func make(logicalRadius: CGFloat, scale: CGFloat = 3) -> SKTexture {
        let pixelRadius = max(logicalRadius * scale, 8)
        let size = ceil(pixelRadius * 2.4)
        let bounds = CGSize(width: size, height: size)
        let renderer = UIGraphicsImageRenderer(size: bounds)
        let image = renderer.image { ctx in
            let cg = ctx.cgContext
            cg.setFillColor(UIColor.clear.cgColor)
            cg.fill(CGRect(origin: .zero, size: bounds))

            let center = CGPoint(x: size / 2, y: size / 2)
            let r = pixelRadius
            cg.setStrokeColor(BrandColors.UI.ink.cgColor)
            cg.setLineWidth(max(2, r * 0.14))
            cg.setLineCap(.square)

            // Outer diamond / reticle — Focus silhouette approximation.
            let diamond = UIBezierPath()
            diamond.move(to: CGPoint(x: center.x, y: center.y - r))
            diamond.addLine(to: CGPoint(x: center.x + r * 0.72, y: center.y))
            diamond.addLine(to: CGPoint(x: center.x, y: center.y + r))
            diamond.addLine(to: CGPoint(x: center.x - r * 0.72, y: center.y))
            diamond.close()
            cg.setFillColor(BrandColors.UI.ink.cgColor)
            cg.addPath(diamond.cgPath)
            cg.fillPath()

            // Crosshair gap (paper cutout).
            cg.setBlendMode(.clear)
            let gap = r * 0.22
            cg.fill(CGRect(x: center.x - gap * 0.35, y: center.y - r * 0.85, width: gap * 0.7, height: r * 1.7))
            cg.fill(CGRect(x: center.x - r * 0.85, y: center.y - gap * 0.35, width: r * 1.7, height: gap * 0.7))
            cg.setBlendMode(.normal)

            // Signal core.
            cg.setFillColor(BrandColors.UI.signal.cgColor)
            cg.fillEllipse(in: CGRect(x: center.x - r * 0.12, y: center.y - r * 0.12, width: r * 0.24, height: r * 0.24))
        }
        let texture = SKTexture(image: image)
        texture.filteringMode = .linear
        return texture
    }
}
