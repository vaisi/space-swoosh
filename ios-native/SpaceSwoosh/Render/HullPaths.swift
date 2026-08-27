// HullPaths.swift
// Changes: Merlin ultra-slim spark-falcon needle for live hangar / play hulls.

import CoreGraphics
import SpriteKit
import UIKit

enum HullPaths {
    static func add(_ kind: HullKind, to path: CGMutablePath, cx: CGFloat, cy: CGFloat, r: CGFloat, stretch: CGFloat = 1) {
        let ry = r * stretch
        switch kind {
        case .circle, .mote, .bloom, .halo:
            let rr = kind == .halo || kind == .bloom ? r * 0.82 : (kind == .mote ? r * 0.92 : r)
            path.addEllipse(in: CGRect(x: cx - rr, y: cy - rr * stretch, width: rr * 2, height: rr * 2 * stretch))
        case .tear:
            path.move(to: CGPoint(x: cx, y: cy - ry))
            path.addCurve(to: CGPoint(x: cx + r * 0.72, y: cy + ry * 0.55),
                          control1: CGPoint(x: cx + r * 0.2, y: cy - ry * 0.35),
                          control2: CGPoint(x: cx + r * 0.98, y: cy + ry * 0.15))
            path.addQuadCurve(to: CGPoint(x: cx - r * 0.72, y: cy + ry * 0.55), control: CGPoint(x: cx, y: cy + ry * 1.02))
            path.addCurve(to: CGPoint(x: cx, y: cy - ry),
                          control1: CGPoint(x: cx - r * 0.98, y: cy + ry * 0.15),
                          control2: CGPoint(x: cx - r * 0.2, y: cy - ry * 0.35))
            path.closeSubpath()
        case .dart:
            path.move(to: CGPoint(x: cx, y: cy - ry * 1.05))
            path.addLine(to: CGPoint(x: cx + r * 0.72, y: cy + ry * 0.6))
            path.addLine(to: CGPoint(x: cx, y: cy + ry * 0.15))
            path.addLine(to: CGPoint(x: cx - r * 0.72, y: cy + ry * 0.6))
            path.closeSubpath()
        case .fletch:
            path.move(to: CGPoint(x: cx, y: cy - ry * 1.18))
            path.addCurve(to: CGPoint(x: cx + r * 0.58, y: cy + ry * 0.36),
                          control1: CGPoint(x: cx + r * 0.1, y: cy - ry * 0.78),
                          control2: CGPoint(x: cx + r * 0.7, y: cy - ry * 0.12))
            path.addQuadCurve(to: CGPoint(x: cx, y: cy + ry * 0.5), control: CGPoint(x: cx + r * 0.2, y: cy + ry * 0.18))
            path.addQuadCurve(to: CGPoint(x: cx - r * 0.58, y: cy + ry * 0.36), control: CGPoint(x: cx - r * 0.2, y: cy + ry * 0.18))
            path.addCurve(to: CGPoint(x: cx, y: cy - ry * 1.18),
                          control1: CGPoint(x: cx - r * 0.7, y: cy - ry * 0.12),
                          control2: CGPoint(x: cx - r * 0.1, y: cy - ry * 0.78))
            path.closeSubpath()
        case .shard:
            path.move(to: CGPoint(x: cx, y: cy - ry * 1.12))
            path.addLine(to: CGPoint(x: cx + r * 0.58, y: cy - ry * 0.02))
            path.addLine(to: CGPoint(x: cx + r * 0.4, y: cy + ry * 0.72))
            path.addLine(to: CGPoint(x: cx, y: cy + ry * 0.32))
            path.addLine(to: CGPoint(x: cx - r * 0.4, y: cy + ry * 0.72))
            path.addLine(to: CGPoint(x: cx - r * 0.58, y: cy - ry * 0.02))
            path.closeSubpath()
        case .fold:
            path.move(to: CGPoint(x: cx, y: cy - ry * 1.05))
            path.addLine(to: CGPoint(x: cx + r * 0.78, y: cy + ry * 0.12))
            path.addLine(to: CGPoint(x: cx, y: cy + ry * 0.98))
            path.addLine(to: CGPoint(x: cx - r * 0.78, y: cy + ry * 0.12))
            path.closeSubpath()
        case .needle, .darner:
            let nose: CGFloat = kind == .darner ? 1.15 : 1.28
            path.move(to: CGPoint(x: cx, y: cy - ry * nose))
            if kind == .darner {
                path.addQuadCurve(to: CGPoint(x: cx + r * 0.12, y: cy + ry * 0.55), control: CGPoint(x: cx + r * 0.16, y: cy - ry * 0.2))
                path.addLine(to: CGPoint(x: cx, y: cy + ry * 1.05))
                path.addLine(to: CGPoint(x: cx - r * 0.12, y: cy + ry * 0.55))
                path.addQuadCurve(to: CGPoint(x: cx, y: cy - ry * nose), control: CGPoint(x: cx - r * 0.16, y: cy - ry * 0.2))
            } else {
                path.addLine(to: CGPoint(x: cx + r * 0.2, y: cy + ry * 0.2))
                path.addLine(to: CGPoint(x: cx, y: cy + ry * 1.0))
                path.addLine(to: CGPoint(x: cx - r * 0.2, y: cy + ry * 0.2))
            }
            path.closeSubpath()
        case .crescent, .nyan:
            path.move(to: CGPoint(x: cx - r * 0.88, y: cy + ry * 0.62))
            path.addQuadCurve(to: CGPoint(x: cx, y: cy - ry * 1.02), control: CGPoint(x: cx - r * 1.05, y: cy - ry * 0.05))
            path.addQuadCurve(to: CGPoint(x: cx + r * 0.88, y: cy + ry * 0.62), control: CGPoint(x: cx + r * 1.05, y: cy - ry * 0.05))
            path.addQuadCurve(to: CGPoint(x: cx, y: cy + ry * 0.02), control: CGPoint(x: cx + r * 0.38, y: cy + ry * 0.12))
            path.addQuadCurve(to: CGPoint(x: cx - r * 0.88, y: cy + ry * 0.62), control: CGPoint(x: cx - r * 0.38, y: cy + ry * 0.12))
            path.closeSubpath()
        case .spine:
            let halfW = r * 0.28
            let halfH = ry * 1.05
            path.move(to: CGPoint(x: cx - halfW, y: cy - halfH * 0.85))
            path.addQuadCurve(to: CGPoint(x: cx + halfW, y: cy - halfH * 0.85), control: CGPoint(x: cx, y: cy - halfH * 1.15))
            path.addLine(to: CGPoint(x: cx + halfW, y: cy + halfH * 0.85))
            path.addQuadCurve(to: CGPoint(x: cx - halfW, y: cy + halfH * 0.85), control: CGPoint(x: cx, y: cy + halfH * 1.1))
            path.closeSubpath()
        case .hex:
            path.move(to: CGPoint(x: cx, y: cy - ry * 0.88))
            path.addLine(to: CGPoint(x: cx + r * 0.52, y: cy - ry * 0.32))
            path.addLine(to: CGPoint(x: cx + r * 0.48, y: cy + ry * 0.38))
            path.addLine(to: CGPoint(x: cx, y: cy + ry * 0.72))
            path.addLine(to: CGPoint(x: cx - r * 0.48, y: cy + ry * 0.38))
            path.addLine(to: CGPoint(x: cx - r * 0.52, y: cy - ry * 0.32))
            path.closeSubpath()
        case .petal:
            path.move(to: CGPoint(x: cx, y: cy - ry * 1.05))
            path.addQuadCurve(to: CGPoint(x: cx + r * 0.55, y: cy + ry * 0.55), control: CGPoint(x: cx + r * 0.85, y: cy - ry * 0.15))
            path.addQuadCurve(to: CGPoint(x: cx - r * 0.55, y: cy + ry * 0.55), control: CGPoint(x: cx, y: cy + ry * 1.05))
            path.addQuadCurve(to: CGPoint(x: cx, y: cy - ry * 1.05), control: CGPoint(x: cx - r * 0.85, y: cy - ry * 0.15))
            path.closeSubpath()
        case .orbit:
            path.addEllipse(in: CGRect(x: cx - r * 0.58, y: cy - r * 0.78 * stretch, width: r * 1.16, height: r * 1.56 * stretch))
        case .square, .stamp:
            let half = r * 0.82
            let hy = half * stretch
            path.addRect(CGRect(x: cx - half, y: cy - hy, width: half * 2, height: hy * 2))
        case .bell:
            path.move(to: CGPoint(x: cx, y: cy - ry * 1.02))
            path.addQuadCurve(to: CGPoint(x: cx + r * 0.92, y: cy + ry * 0.28), control: CGPoint(x: cx + r * 0.95, y: cy - ry * 0.35))
            path.addQuadCurve(to: CGPoint(x: cx + r * 0.32, y: cy + ry * 0.32), control: CGPoint(x: cx + r * 0.62, y: cy + ry * 0.48))
            path.addQuadCurve(to: CGPoint(x: cx, y: cy + ry * 0.36), control: CGPoint(x: cx + r * 0.16, y: cy + ry * 0.52))
            path.addQuadCurve(to: CGPoint(x: cx - r * 0.32, y: cy + ry * 0.32), control: CGPoint(x: cx - r * 0.16, y: cy + ry * 0.52))
            path.addQuadCurve(to: CGPoint(x: cx - r * 0.92, y: cy + ry * 0.28), control: CGPoint(x: cx - r * 0.62, y: cy + ry * 0.48))
            path.addQuadCurve(to: CGPoint(x: cx, y: cy - ry * 1.02), control: CGPoint(x: cx - r * 0.95, y: cy - ry * 0.35))
            path.closeSubpath()
        case .star:
            path.move(to: CGPoint(x: cx, y: cy - ry * 1.05))
            path.addQuadCurve(to: CGPoint(x: cx + r * 0.9, y: cy), control: CGPoint(x: cx + r * 0.14, y: cy - ry * 0.12))
            path.addQuadCurve(to: CGPoint(x: cx, y: cy + ry * 0.98), control: CGPoint(x: cx + r * 0.14, y: cy + ry * 0.12))
            path.addQuadCurve(to: CGPoint(x: cx - r * 0.9, y: cy), control: CGPoint(x: cx - r * 0.14, y: cy + ry * 0.12))
            path.addQuadCurve(to: CGPoint(x: cx, y: cy - ry * 1.05), control: CGPoint(x: cx - r * 0.14, y: cy - ry * 0.12))
            path.closeSubpath()
        case .seed:
            path.addEllipse(in: CGRect(x: cx - r * 0.5, y: cy - r * 0.8 * stretch, width: r, height: r * 1.6 * stretch))
        case .wing:
            path.move(to: CGPoint(x: cx, y: cy - ry * 0.88))
            path.addCurve(to: CGPoint(x: cx + r * 0.32, y: cy + ry * 0.7),
                          control1: CGPoint(x: cx + r * 1.08, y: cy - ry * 0.32),
                          control2: CGPoint(x: cx + r * 1.12, y: cy + ry * 0.52))
            path.addQuadCurve(to: CGPoint(x: cx - r * 0.32, y: cy + ry * 0.7), control: CGPoint(x: cx, y: cy + ry * 0.22))
            path.addCurve(to: CGPoint(x: cx, y: cy - ry * 0.88),
                          control1: CGPoint(x: cx - r * 1.12, y: cy + ry * 0.52),
                          control2: CGPoint(x: cx - r * 1.08, y: cy - ry * 0.32))
            path.closeSubpath()
        case .koi, .argus:
            let nose: CGFloat = kind == .argus ? 1.0 : 1.05
            path.move(to: CGPoint(x: cx, y: cy - ry * nose))
            path.addCurve(to: CGPoint(x: cx + r * (kind == .argus ? 0.55 : 0.36), y: cy + ry * (kind == .argus ? 0.62 : 0.58)),
                          control1: CGPoint(x: cx + r * (kind == .argus ? 0.48 : 0.55), y: cy - ry * (kind == .argus ? 0.35 : 0.42)),
                          control2: CGPoint(x: cx + r * (kind == .argus ? 0.62 : 0.7), y: cy + ry * (kind == .argus ? 0.15 : 0.18)))
            path.addQuadCurve(to: CGPoint(x: cx - r * (kind == .argus ? 0.55 : 0.36), y: cy + ry * (kind == .argus ? 0.62 : 0.58)),
                              control: CGPoint(x: cx, y: cy + ry * (kind == .argus ? 0.42 : 0.38)))
            path.addCurve(to: CGPoint(x: cx, y: cy - ry * nose),
                          control1: CGPoint(x: cx - r * (kind == .argus ? 0.62 : 0.7), y: cy + ry * (kind == .argus ? 0.15 : 0.18)),
                          control2: CGPoint(x: cx - r * (kind == .argus ? 0.48 : 0.55), y: cy - ry * (kind == .argus ? 0.35 : 0.42)))
            path.closeSubpath()
        case .cap:
            path.move(to: CGPoint(x: cx - r * 1.02, y: cy + ry * 0.1))
            path.addQuadCurve(to: CGPoint(x: cx, y: cy - ry * 0.68), control: CGPoint(x: cx - r * 0.95, y: cy - ry * 0.52))
            path.addQuadCurve(to: CGPoint(x: cx + r * 1.02, y: cy + ry * 0.1), control: CGPoint(x: cx + r * 0.95, y: cy - ry * 0.52))
            path.addQuadCurve(to: CGPoint(x: cx - r * 1.02, y: cy + ry * 0.1), control: CGPoint(x: cx, y: cy + ry * 0.26))
            path.closeSubpath()
        case .curtain:
            path.move(to: CGPoint(x: cx - r * 0.2, y: cy - ry * 1.02))
            path.addCurve(to: CGPoint(x: cx + r * 0.26, y: cy + ry * 0.95),
                          control1: CGPoint(x: cx + r * 0.58, y: cy - ry * 0.4),
                          control2: CGPoint(x: cx - r * 0.52, y: cy + ry * 0.12))
            path.addQuadCurve(to: CGPoint(x: cx - r * 0.14, y: cy + ry * 0.9), control: CGPoint(x: cx + r * 0.06, y: cy + ry * 1.04))
            path.addCurve(to: CGPoint(x: cx - r * 0.36, y: cy - ry * 0.92),
                          control1: CGPoint(x: cx - r * 0.68, y: cy + ry * 0.08),
                          control2: CGPoint(x: cx + r * 0.42, y: cy - ry * 0.48))
            path.closeSubpath()
        case .moth:
            path.move(to: CGPoint(x: cx, y: cy - ry * 0.95))
            path.addCurve(to: CGPoint(x: cx + r * 1.0, y: cy + ry * 0.42),
                          control1: CGPoint(x: cx + r * 0.32, y: cy - ry * 0.68),
                          control2: CGPoint(x: cx + r * 1.12, y: cy - ry * 0.12))
            path.addQuadCurve(to: CGPoint(x: cx + r * 0.2, y: cy + ry * 0.28), control: CGPoint(x: cx + r * 0.42, y: cy + ry * 0.5))
            path.addQuadCurve(to: CGPoint(x: cx - r * 0.2, y: cy + ry * 0.28), control: CGPoint(x: cx, y: cy + ry * 0.48))
            path.addQuadCurve(to: CGPoint(x: cx - r * 1.0, y: cy + ry * 0.42), control: CGPoint(x: cx - r * 0.42, y: cy + ry * 0.5))
            path.addCurve(to: CGPoint(x: cx, y: cy - ry * 0.95),
                          control1: CGPoint(x: cx - r * 1.12, y: cy - ry * 0.12),
                          control2: CGPoint(x: cx - r * 0.32, y: cy - ry * 0.68))
            path.closeSubpath()
        case .wish:
            path.move(to: CGPoint(x: cx, y: cy - ry * 1.12))
            path.addLine(to: CGPoint(x: cx + r * 0.36, y: cy - ry * 0.12))
            path.addLine(to: CGPoint(x: cx + r * 0.26, y: cy + ry * 0.52))
            path.addQuadCurve(to: CGPoint(x: cx - r * 0.26, y: cy + ry * 0.52), control: CGPoint(x: cx, y: cy + ry * 0.68))
            path.addLine(to: CGPoint(x: cx - r * 0.36, y: cy - ry * 0.12))
            path.closeSubpath()
        case .puff:
            path.addEllipse(in: CGRect(x: cx - r * 0.78, y: cy - r * 0.78 * stretch - ry * 0.08, width: r * 1.56, height: r * 1.56 * stretch))
        case .chime:
            path.move(to: CGPoint(x: cx, y: cy - ry * 0.92))
            path.addQuadCurve(to: CGPoint(x: cx + r * 0.62, y: cy + ry * 0.35), control: CGPoint(x: cx + r * 0.55, y: cy - ry * 0.55))
            path.addQuadCurve(to: CGPoint(x: cx, y: cy + ry * 0.55), control: CGPoint(x: cx + r * 0.42, y: cy + ry * 0.62))
            path.addQuadCurve(to: CGPoint(x: cx - r * 0.62, y: cy + ry * 0.35), control: CGPoint(x: cx - r * 0.42, y: cy + ry * 0.62))
            path.addQuadCurve(to: CGPoint(x: cx, y: cy - ry * 0.92), control: CGPoint(x: cx - r * 0.55, y: cy - ry * 0.55))
            path.closeSubpath()
        case .merlin:
            path.move(to: CGPoint(x: cx, y: cy - ry * 1.42))
            path.addQuadCurve(to: CGPoint(x: cx + r * 0.22, y: cy + ry * 0.04), control: CGPoint(x: cx + r * 0.045, y: cy - ry * 0.22))
            path.addQuadCurve(to: CGPoint(x: cx + r * 0.042, y: cy + ry * 0.50), control: CGPoint(x: cx + r * 0.07, y: cy + ry * 0.10))
            path.addQuadCurve(to: CGPoint(x: cx, y: cy + ry * 1.22), control: CGPoint(x: cx + r * 0.018, y: cy + ry * 0.90))
            path.addQuadCurve(to: CGPoint(x: cx - r * 0.042, y: cy + ry * 0.50), control: CGPoint(x: cx - r * 0.018, y: cy + ry * 0.90))
            path.addQuadCurve(to: CGPoint(x: cx - r * 0.22, y: cy + ry * 0.04), control: CGPoint(x: cx - r * 0.07, y: cy + ry * 0.10))
            path.addQuadCurve(to: CGPoint(x: cx, y: cy - ry * 1.42), control: CGPoint(x: cx - r * 0.045, y: cy - ry * 0.22))
            path.closeSubpath()
        }
    }
}

enum HullBake {
    static func draw(_ kind: HullKind, onto cg: CGContext, cx: CGFloat, cy: CGFloat, r: CGFloat) {
        let path = CGMutablePath()
        HullPaths.add(kind, to: path, cx: cx, cy: cy, r: r)
        cg.addPath(path)
        if kind == .nyan {
            cg.setFillColor(UIColor(red: 196 / 255, green: 189 / 255, blue: 176 / 255, alpha: 1).cgColor)
            cg.fillPath()
            cg.setFillColor(UIColor(red: 1, green: 143 / 255, blue: 184 / 255, alpha: 1).cgColor)
            cg.fillEllipse(in: CGRect(x: cx + r * 0.48 - r * 0.085, y: cy + r * 0.12 - r * 0.085, width: r * 0.17, height: r * 0.17))
            cg.fillEllipse(in: CGRect(x: cx - r * 0.48 - r * 0.085, y: cy + r * 0.12 - r * 0.085, width: r * 0.17, height: r * 0.17))
        } else if kind == .halo {
            cg.setStrokeColor(BrandColors.UI.ink.cgColor)
            cg.setLineWidth(max(2, r * 0.14))
            cg.strokePath()
        } else {
            cg.setFillColor(BrandColors.UI.ink.cgColor)
            cg.fillPath()
        }
    }

    static func makeImage(kind: HullKind, logicalRadius: CGFloat, scale: CGFloat = 2) -> UIImage {
        let r = max(logicalRadius * scale, 8)
        let pad = r * 1.85
        let size = ceil(pad * 2)
        let bounds = CGSize(width: size, height: size)
        let renderer = UIGraphicsImageRenderer(size: bounds)
        return renderer.image { ctx in
            let cg = ctx.cgContext
            cg.setFillColor(UIColor.clear.cgColor)
            cg.fill(CGRect(origin: .zero, size: bounds))
            draw(kind, onto: cg, cx: size / 2, cy: size / 2, r: r)
        }
    }

    static func make(kind: HullKind) -> SKTexture {
        let tex = SKTexture(image: makeImage(kind: kind, logicalRadius: 28, scale: 3))
        tex.filteringMode = .linear
        return tex
    }
}
