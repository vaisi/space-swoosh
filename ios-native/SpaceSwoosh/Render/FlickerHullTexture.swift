// FlickerHullTexture.swift
// Changes: Slice D — bake Android tearPath (halo + ink body + highlight) once.

import SpriteKit
import UIKit

enum FlickerHullTexture {
    /// Logical radius is the JS `r` after 0.95×scale. Sprite covers ~3.2r.
    static func make(logicalRadius: CGFloat, scale: CGFloat = 3) -> SKTexture {
        let r = max(logicalRadius * scale, 8)
        let pad = r * 1.65
        let size = ceil(pad * 2)
        let bounds = CGSize(width: size, height: size)
        let renderer = UIGraphicsImageRenderer(size: bounds)
        let image = renderer.image { ctx in
            let cg = ctx.cgContext
            cg.setFillColor(UIColor.clear.cgColor)
            cg.fill(CGRect(origin: .zero, size: bounds))

            let cx = size / 2
            let cy = size / 2
            let stretch: CGFloat = 1
            let ry = r * stretch

            cg.setFillColor(BrandColors.UI.ink12.cgColor)
            let haloR = r * 1.35
            cg.fillEllipse(in: CGRect(
                x: cx - haloR,
                y: cy + r * 0.12 - haloR,
                width: haloR * 2,
                height: haloR * 2
            ))

            tearPath(cg: cg, cx: cx, cy: cy, r: r, ry: ry)
            cg.setFillColor(BrandColors.UI.ink.cgColor)
            cg.fillPath()

            tearPath(cg: cg, cx: cx, cy: cy + r * 0.08, r: r * 0.42, ry: r * 0.42 * stretch)
            cg.setFillColor(BrandColors.UI.ink55.cgColor)
            cg.fillPath()
        }
        let texture = SKTexture(image: image)
        texture.filteringMode = .linear
        return texture
    }

    /// JS `tearPath`: nose at local −Y (top of this bitmap → SpriteKit +Y).
    private static func tearPath(cg: CGContext, cx: CGFloat, cy: CGFloat, r: CGFloat, ry: CGFloat) {
        cg.beginPath()
        cg.move(to: CGPoint(x: cx, y: cy - ry))
        cg.addCurve(
            to: CGPoint(x: cx + r * 0.72, y: cy + ry * 0.55),
            control1: CGPoint(x: cx + r * 0.2, y: cy - ry * 0.35),
            control2: CGPoint(x: cx + r * 0.98, y: cy + ry * 0.15)
        )
        cg.addQuadCurve(
            to: CGPoint(x: cx - r * 0.72, y: cy + ry * 0.55),
            control: CGPoint(x: cx, y: cy + ry * 1.02)
        )
        cg.addCurve(
            to: CGPoint(x: cx, y: cy - ry),
            control1: CGPoint(x: cx - r * 0.98, y: cy + ry * 0.15),
            control2: CGPoint(x: cx - r * 0.2, y: cy - ry * 0.35)
        )
        cg.closePath()
    }
}
