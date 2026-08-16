// BakePipeline.swift
// Changes: On-demand HullBake cache keyed by HullKind (full 41-ship roster).

import SpriteKit
import UIKit

final class BakePipeline {
    let glowSignal: SKTexture
    let glowInk: SKTexture
    let sparkle: SKTexture
    let signalDisc: SKTexture
    let ring: SKTexture
    let shieldRingInner: SKTexture
    let shieldRingOuter: SKTexture
    let plus: SKTexture
    let windLane: SKTexture
    private let parts: [ObstacleKind: SKTexture]
    private var hullByKind: [HullKind: SKTexture] = [:]

    private static var cache: [Bool: BakePipeline] = [:]

    static func current() -> BakePipeline {
        let night = SettingsStore.shared.isDark
        if let hit = cache[night] { return hit }
        let baked = BakePipeline()
        cache[night] = baked
        return baked
    }

    private init() {
        glowSignal = Self.radialGlow(color: BrandColors.UI.signal, size: 96)
        glowInk = Self.radialGlow(color: BrandColors.UI.ink, size: 96)
        sparkle = Self.sparkleStar(color: BrandColors.UI.signal, size: 64, fill: true)
        signalDisc = Self.signalDisc(size: 96)
        ring = Self.ring(size: 96)
        shieldRingInner = Self.shieldRing(size: 128, strokeFrac: 0.067)
        shieldRingOuter = Self.shieldRing(size: 128, strokeFrac: 0.030)
        plus = Self.plus(size: 96)
        windLane = Self.windLane(width: 128, height: 16)
        let circle = Self.filledCircle(size: 96)
        let square = Self.square(size: 96)
        let hole = Self.hole(size: 96)
        parts = [
            .circle: circle,
            .triangle: Self.polygon(points: 3, size: 96),
            .square: square,
            .pentagon: Self.polygon(points: 5, size: 96),
            .star: Self.star(size: 96),
            .complex: circle,
            .pulsating: circle,
            .phase: square,
            .sweep: Self.blade(width: 256, height: 32),
            .slab: Self.slab(width: 32, height: 256),
            .drift: Self.windDash(width: 256, height: 16),
            .wormhole: Self.dashedRing(size: 96, color: BrandColors.UI.signal),
            .repulsor: Self.repulsor(size: 128),
            .blackhole: hole,
            .projectile: circle
        ]
    }

    func hull(for id: SkinId) -> SKTexture {
        let kind = SkinCatalog.def(id).hullKind
        if let hit = hullByKind[kind] { return hit }
        let tex = HullBake.make(kind: kind)
        hullByKind[kind] = tex
        return tex
    }

    func part(for kind: ObstacleKind) -> SKTexture {
        parts[kind] ?? parts[.circle]!
    }

    func wormhole(isExit: Bool, paired: Bool) -> SKTexture {
        if paired { return Self.dashedRingCachedInk30 }
        return isExit ? Self.dashedRingCachedInk : Self.dashedRingCachedSignal
    }

    private static let dashedRingCachedSignal = dashedRing(size: 96, color: BrandColors.UI.signal)
    private static let dashedRingCachedInk = dashedRing(size: 96, color: BrandColors.UI.ink)
    private static let dashedRingCachedInk30 = dashedRing(size: 96, color: BrandColors.UI.ink30)

    private static func filledCircle(size: CGFloat) -> SKTexture {
        image(size: size) { cg, mid, r in
            cg.setFillColor(BrandColors.UI.ink.cgColor)
            cg.fillEllipse(in: CGRect(x: mid - r, y: mid - r, width: r * 2, height: r * 2))
        }
    }

    private static func square(size: CGFloat) -> SKTexture {
        image(size: size) { cg, mid, r in
            cg.setFillColor(BrandColors.UI.ink.cgColor)
            let s = r * 1.4
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

    private static func star(size: CGFloat) -> SKTexture {
        image(size: size) { cg, mid, r in
            let path = CGMutablePath()
            for i in 0..<8 {
                let rad = i % 2 == 0 ? r : r * 0.5
                let a = CGFloat(i) * .pi / 4
                let p = CGPoint(x: mid + cos(a) * rad, y: mid + sin(a) * rad)
                if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
            }
            path.closeSubpath()
            cg.setFillColor(BrandColors.UI.ink.cgColor)
            cg.addPath(path)
            cg.fillPath()
        }
    }

    /// Android `drawSparkle`: 8-vertex 4-point star, N/E/S/W, innerRatio 0.4.
    /// Full-texture so sprite size == visual diameter (not the 0.38 `image` inset).
    private static func sparkleStar(
        color: UIColor,
        size: CGFloat,
        fill: Bool,
        innerRatio: CGFloat = 0.4
    ) -> SKTexture {
        rectImage(width: size, height: size) { cg, w, h in
            let mid = w / 2
            let r = w * 0.48
            let path = CGMutablePath()
            for i in 0..<8 {
                let angle = (CGFloat(i) * .pi / 4) - .pi / 2
                let rad = i % 2 == 0 ? r : r * innerRatio
                let p = CGPoint(x: mid + cos(angle) * rad, y: mid + sin(angle) * rad)
                if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
            }
            path.closeSubpath()
            if fill {
                cg.setFillColor(color.cgColor)
                cg.addPath(path)
                cg.fillPath()
            } else {
                cg.setStrokeColor(color.cgColor)
                cg.setLineWidth(max(1.2, r * 0.28))
                cg.setLineJoin(.miter)
                cg.addPath(path)
                cg.strokePath()
            }
        }
    }

    /// Android `signalSoft` fill — full-bleed disc so sprite size == diameter.
    private static func signalDisc(size: CGFloat) -> SKTexture {
        rectImage(width: size, height: size) { cg, w, h in
            cg.setFillColor(BrandColors.UI.signal.cgColor)
            cg.fillEllipse(in: CGRect(x: 0, y: 0, width: w, height: h))
        }
    }

    /// Full-texture stroke ring so sprite size == visual diameter.
    private static func shieldRing(size: CGFloat, strokeFrac: CGFloat) -> SKTexture {
        rectImage(width: size, height: size) { cg, w, h in
            let stroke = max(2, w * strokeFrac)
            let inset = stroke * 0.5
            cg.setStrokeColor(BrandColors.UI.signal.cgColor)
            cg.setLineWidth(stroke)
            cg.strokeEllipse(in: CGRect(
                x: inset,
                y: inset,
                width: w - stroke,
                height: h - stroke
            ))
        }
    }

    private static func plus(size: CGFloat) -> SKTexture {
        image(size: size) { cg, mid, r in
            cg.setStrokeColor(BrandColors.UI.ink.cgColor)
            cg.setLineWidth(max(4, r * 0.28))
            cg.setLineCap(.round)
            let arm = r * 0.85
            cg.move(to: CGPoint(x: mid - arm, y: mid))
            cg.addLine(to: CGPoint(x: mid + arm, y: mid))
            cg.move(to: CGPoint(x: mid, y: mid - arm))
            cg.addLine(to: CGPoint(x: mid, y: mid + arm))
            cg.strokePath()
        }
    }

    private static func ring(size: CGFloat) -> SKTexture {
        image(size: size) { cg, mid, r in
            cg.setStrokeColor(BrandColors.UI.signal.cgColor)
            cg.setLineWidth(max(3, r * 0.18))
            cg.strokeEllipse(in: CGRect(x: mid - r, y: mid - r, width: r * 2, height: r * 2))
        }
    }

    private static func dashedRing(size: CGFloat, color: UIColor) -> SKTexture {
        image(size: size) { cg, mid, r in
            cg.setStrokeColor(color.cgColor)
            cg.setLineWidth(max(3, r * 0.12))
            cg.setLineDash(phase: 0, lengths: [6, 6])
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

    private static func blade(width: CGFloat, height: CGFloat) -> SKTexture {
        rectImage(width: width, height: height) { cg, w, h in
            cg.setFillColor(BrandColors.UI.ink.cgColor)
            let pad: CGFloat = 2
            cg.fill(CGRect(x: pad, y: pad, width: w - pad * 2, height: h - pad * 2))
        }
    }

    private static func slab(width: CGFloat, height: CGFloat) -> SKTexture {
        rectImage(width: width, height: height) { cg, w, h in
            cg.setFillColor(BrandColors.UI.ink.cgColor)
            cg.fill(CGRect(x: 0, y: 0, width: w, height: h))
        }
    }

    /// Intro streaks — leftover static strip. Hazard lanes use `windLane`.
    private static func windDash(width: CGFloat, height: CGFloat) -> SKTexture {
        rectImage(width: width, height: height) { cg, w, h in
            cg.setStrokeColor(BrandColors.UI.ink30.cgColor)
            cg.setLineWidth(max(1.2, h * 0.35))
            cg.setLineDash(phase: 0, lengths: [14, 12])
            cg.setLineCap(.round)
            cg.move(to: CGPoint(x: 4, y: h / 2))
            cg.addLine(to: CGPoint(x: w - 4, y: h / 2))
            cg.strokePath()
        }
    }

    /// One dash period: on 0.55 / off 0.4675 (Android `[u*0.55, u*0.55*0.85]`).
    private static func windLane(width: CGFloat, height: CGFloat) -> SKTexture {
        rectImage(width: width, height: height) { cg, w, h in
            let on = w * (0.55 / 1.0175)
            let stroke = max(1.2, h * 0.38)
            cg.setFillColor(BrandColors.UI.ink30.cgColor)
            let bar = CGRect(x: 0, y: (h - stroke) * 0.5, width: on, height: stroke)
            let path = UIBezierPath(roundedRect: bar, cornerRadius: stroke * 0.5)
            cg.addPath(path.cgPath)
            cg.fillPath()
        }
    }

    private static func repulsor(size: CGFloat) -> SKTexture {
        image(size: size) { cg, mid, r in
            cg.setStrokeColor(BrandColors.UI.ink30.cgColor)
            cg.setLineWidth(max(1.5, r * 0.08))
            cg.setLineDash(phase: 0, lengths: [r * 0.35, r * 0.22])
            let ringR = r * 0.95
            cg.strokeEllipse(in: CGRect(x: mid - ringR, y: mid - ringR, width: ringR * 2, height: ringR * 2))
            cg.setLineDash(phase: 0, lengths: [])
            for i in 0..<8 {
                let a = CGFloat(i) / 8 * .pi * 2
                let r0 = r * 0.42
                let r1 = r * 0.62
                cg.move(to: CGPoint(x: mid + cos(a) * r0, y: mid + sin(a) * r0))
                cg.addLine(to: CGPoint(x: mid + cos(a) * r1, y: mid + sin(a) * r1))
            }
            cg.strokePath()
            cg.setFillColor(BrandColors.UI.ink.cgColor)
            let core = r * 0.32
            cg.fillEllipse(in: CGRect(x: mid - core, y: mid - core, width: core * 2, height: core * 2))
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

    private static func rectImage(
        width: CGFloat,
        height: CGFloat,
        draw: (CGContext, CGFloat, CGFloat) -> Void
    ) -> SKTexture {
        let bounds = CGSize(width: width, height: height)
        let renderer = UIGraphicsImageRenderer(size: bounds)
        let image = renderer.image { ctx in
            let cg = ctx.cgContext
            cg.setFillColor(UIColor.clear.cgColor)
            cg.fill(CGRect(origin: .zero, size: bounds))
            draw(cg, width, height)
        }
        let texture = SKTexture(image: image)
        texture.filteringMode = .linear
        return texture
    }
}
