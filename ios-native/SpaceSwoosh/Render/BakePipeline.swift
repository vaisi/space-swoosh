// BakePipeline.swift
// Changes: Phase B — one-time texture bake (hull, ribbon, obstacle parts, glows).
// Nothing on the hot path tessellates paths.

import SpriteKit
import UIKit

final class BakePipeline {
    let hull: SKTexture
    let trail: SKTexture
    let glowSignal: SKTexture
    let glowInk: SKTexture
    let sparkle: SKTexture
    private let parts: [ObstacleKind: SKTexture]

    static let shared = BakePipeline()

    private init() {
        hull = FocusHullTexture.make(logicalRadius: 28, scale: 3)
        trail = TrailRibbonTexture.make()
        glowSignal = Self.radialGlow(color: BrandColors.UI.signal, size: 96)
        glowInk = Self.radialGlow(color: BrandColors.UI.ink, size: 96)
        sparkle = Self.diamond(color: BrandColors.UI.signal, size: 48)
        parts = [
            .circle: Self.filledCircle(size: 96),
            .triangle: Self.polygon(points: 3, size: 96),
            .square: Self.square(size: 96),
            .diamond: Self.diamond(color: BrandColors.UI.ink, size: 96),
            .ring: Self.ring(size: 96),
            .hole: Self.hole(size: 96)
        ]
    }

    func part(for kind: ObstacleKind) -> SKTexture {
        parts[kind] ?? parts[.circle]!
    }

    private static func filledCircle(size: CGFloat) -> SKTexture {
        image(size: size) { cg, mid, r in
            cg.setFillColor(BrandColors.UI.ink.cgColor)
            cg.fillEllipse(in: CGRect(x: mid - r, y: mid - r, width: r * 2, height: r * 2))
        }
    }

    private static func square(size: CGFloat) -> SKTexture {
        image(size: size) { cg, mid, r in
            cg.setFillColor(BrandColors.UI.ink.cgColor)
            let s = r * 1.55
            cg.fill(CGRect(x: mid - s / 2, y: mid - s / 2, width: s, height: s))
        }
    }

    private static func polygon(points: Int, size: CGFloat) -> SKTexture {
        image(size: size) { cg, mid, r in
            let path = CGMutablePath()
            for i in 0..<points {
                let a = -CGFloat.pi / 2 + CGFloat(i) * (.pi * 2 / CGFloat(points))
                let p = CGPoint(x: mid + cos(a) * r, y: mid + sin(a) * r)
                if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
            }
            path.closeSubpath()
            cg.setFillColor(BrandColors.UI.ink.cgColor)
            cg.addPath(path)
            cg.fillPath()
        }
    }

    private static func diamond(color: UIColor, size: CGFloat) -> SKTexture {
        image(size: size) { cg, mid, r in
            let path = CGMutablePath()
            path.move(to: CGPoint(x: mid, y: mid - r))
            path.addLine(to: CGPoint(x: mid + r * 0.72, y: mid))
            path.addLine(to: CGPoint(x: mid, y: mid + r))
            path.addLine(to: CGPoint(x: mid - r * 0.72, y: mid))
            path.closeSubpath()
            cg.setFillColor(color.cgColor)
            cg.addPath(path)
            cg.fillPath()
        }
    }

    private static func ring(size: CGFloat) -> SKTexture {
        image(size: size) { cg, mid, r in
            cg.setStrokeColor(BrandColors.UI.signal.cgColor)
            cg.setLineWidth(max(3, r * 0.18))
            cg.strokeEllipse(in: CGRect(x: mid - r, y: mid - r, width: r * 2, height: r * 2))
        }
    }

    private static func hole(size: CGFloat) -> SKTexture {
        image(size: size) { cg, mid, r in
            cg.setFillColor(BrandColors.UI.ink.cgColor)
            cg.fillEllipse(in: CGRect(x: mid - r, y: mid - r, width: r * 2, height: r * 2))
            cg.setBlendMode(.clear)
            cg.fillEllipse(in: CGRect(x: mid - r * 0.38, y: mid - r * 0.38, width: r * 0.76, height: r * 0.76))
        }
    }

    private static func radialGlow(color: UIColor, size: CGFloat) -> SKTexture {
        let bounds = CGSize(width: size, height: size)
        let renderer = UIGraphicsImageRenderer(size: bounds)
        let image = renderer.image { ctx in
            let cg = ctx.cgContext
            let colors = [
                color.withAlphaComponent(0.55).cgColor,
                color.withAlphaComponent(0.12).cgColor,
                UIColor.clear.cgColor
            ] as CFArray
            let locs: [CGFloat] = [0, 0.45, 1]
            if let gradient = CGGradient(
                colorsSpace: CGColorSpaceCreateDeviceRGB(),
                colors: colors,
                locations: locs
            ) {
                let mid = CGPoint(x: size / 2, y: size / 2)
                cg.drawRadialGradient(
                    gradient,
                    startCenter: mid,
                    startRadius: 0,
                    endCenter: mid,
                    endRadius: size / 2,
                    options: []
                )
            }
        }
        let texture = SKTexture(image: image)
        texture.filteringMode = .linear
        return texture
    }

    private static func image(
        size: CGFloat,
        draw: (CGContext, CGFloat, CGFloat) -> Void
    ) -> SKTexture {
        let bounds = CGSize(width: size, height: size)
        let renderer = UIGraphicsImageRenderer(size: bounds)
        let image = renderer.image { ctx in
            let cg = ctx.cgContext
            cg.setFillColor(UIColor.clear.cgColor)
            cg.fill(CGRect(origin: .zero, size: bounds))
            draw(cg, size / 2, size * 0.38)
        }
        let texture = SKTexture(image: image)
        texture.filteringMode = .linear
        return texture
    }
}
