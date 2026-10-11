// DepthField.swift
// Changes: native night-paper depth field matching Android DepthField.js.
// Full three layers (bone specks, rare ice glints, tiny flares) on dark
// shell screens and inside PlayScene. Light Mode stays flat. The L42 hold
// can force a quieter field on #050505. Same mulberry seed as the web field.

import QuartzCore
import SpriteKit
import SwiftUI
import UIKit

struct DepthStar {
    var nx: CGFloat
    var ny: CGFloat
    var layer: Int
    var size: CGFloat
    var phase: CGFloat
    var twinkleHz: CGFloat
    var signal: Bool
    var hero: Bool
}

struct DepthLayer {
    var parallax: CGFloat
    var driftX: CGFloat
    var driftY: CGFloat
}

enum DepthCatalog {
    static let layers: [DepthLayer] = [
        DepthLayer(parallax: 0.07, driftX: 3.2, driftY: 4.6),
        DepthLayer(parallax: 0.16, driftX: -5.4, driftY: 7.1),
        DepthLayer(parallax: 0.30, driftX: 7.8, driftY: 10.2),
    ]

    static let stars: [DepthStar] = makeStars()

    private struct SeedLayer {
        var count: Int
        var sizeMin: CGFloat
        var sizeMax: CGFloat
        var twinkleMin: CGFloat
        var twinkleMax: CGFloat
    }

    private static let seedLayers: [SeedLayer] = [
        SeedLayer(count: 58, sizeMin: 0.7, sizeMax: 1.15, twinkleMin: 0.35, twinkleMax: 0.85),
        SeedLayer(count: 36, sizeMin: 1.0, sizeMax: 1.5, twinkleMin: 0.4, twinkleMax: 1.05),
        SeedLayer(count: 18, sizeMin: 1.4, sizeMax: 2.2, twinkleMin: 0.45, twinkleMax: 1.2),
    ]

    private static func makeStars() -> [DepthStar] {
        var rng = Mulberry32(seed: 0x5E1D1E1D)
        let last = seedLayers.count - 1
        var stars: [DepthStar] = []
        stars.reserveCapacity(112)
        for layer in seedLayers.indices {
            let spec = seedLayers[layer]
            let near = layer == last
            for _ in 0..<spec.count {
                let nx = rng.next()
                let ny = rng.next()
                let size = spec.sizeMin + rng.next() * (spec.sizeMax - spec.sizeMin)
                let phase = rng.next() * (.pi * 2)
                let twinkleHz = spec.twinkleMin + rng.next() * (spec.twinkleMax - spec.twinkleMin)
                let signal = rng.next() < 0.07
                let hero = near && rng.next() < 0.55
                stars.append(DepthStar(
                    nx: nx,
                    ny: ny,
                    layer: layer,
                    size: size,
                    phase: phase,
                    twinkleHz: twinkleHz,
                    signal: signal,
                    hero: hero
                ))
            }
        }
        return stars
    }
}

/// JS `mulberry32` (seed `0x5e1d1e1d`). Low 32 bits match `Math.imul`.
private struct Mulberry32 {
    var state: UInt32

    init(seed: UInt32) {
        state = seed
    }

    mutating func next() -> CGFloat {
        state = state &+ 0x6D2B79F5
        var t = state
        t = (t ^ (t >> 15)) &* (t | 1)
        let mixed = (t ^ (t >> 7)) &* (t | 61)
        t = (t &+ mixed) ^ t
        let out = t ^ (t >> 14)
        return CGFloat(out) / 4294967296
    }
}

enum DepthFieldMath {
    static let nightInk = UIColor(red: 225 / 255, green: 217 / 255, blue: 193 / 255, alpha: 1)
    static let nightSignal = UIColor(red: 92 / 255, green: 200 / 255, blue: 1, alpha: 1)
    static let nightInkColor = Color(uiColor: nightInk)
    static let nightSignalColor = Color(uiColor: nightSignal)
    static let holdBlack = Color(red: 5 / 255, green: 5 / 255, blue: 5 / 255)

    struct Sample {
        var index: Int
        var canvasX: CGFloat
        var canvasY: CGFloat
        var alpha: CGFloat
        var side: CGFloat
        var signal: Bool
        var flare: Bool
        var flareRadius: CGFloat
    }

    /// Ink specks, then ice specks, then hero flares. Canvas Y grows downward.
    static func visit(
        width: CGFloat,
        height: CGFloat,
        now: TimeInterval,
        camera: CGFloat,
        quiet: Bool,
        _ body: (Sample) -> Void
    ) {
        guard width > 0, height > 0 else { return }
        let quietMul: CGFloat = quiet ? 0.5 : 1
        let t = CGFloat(now)
        emit(flares: false, signal: false, width: width, height: height, t: t, camera: camera, quietMul: quietMul, body)
        emit(flares: false, signal: true, width: width, height: height, t: t, camera: camera, quietMul: quietMul, body)
        if !quiet {
            emit(flares: true, signal: false, width: width, height: height, t: t, camera: camera, quietMul: quietMul, body)
        }
    }

    private static func emit(
        flares: Bool,
        signal: Bool,
        width: CGFloat,
        height: CGFloat,
        t: CGFloat,
        camera: CGFloat,
        quietMul: CGFloat,
        _ body: (Sample) -> Void
    ) {
        let stars = DepthCatalog.stars
        let layers = DepthCatalog.layers
        for i in stars.indices {
            let star = stars[i]
            if flares {
                if !star.hero { continue }
            } else if signal {
                if !star.signal { continue }
            } else if star.signal {
                continue
            }

            let spec = layers[star.layer]
            let twinkle = 0.5 + 0.5 * sin(t * star.twinkleHz * (.pi * 2) + star.phase)
            if flares, twinkle < 0.88 { continue }
            let alpha = (0.20 + 0.68 * twinkle) * quietMul
            if alpha < 0.02 { continue }

            let x = wrap(star.nx * width + t * spec.driftX, width)
            let y = wrap(star.ny * height + t * spec.driftY + camera * spec.parallax, height)
            body(Sample(
                index: i,
                canvasX: x,
                canvasY: y,
                alpha: alpha,
                side: star.size < 1.3 ? 1 : 2,
                signal: star.signal,
                flare: flares,
                flareRadius: 2.2 + star.size * 0.35
            ))
        }
    }

    static func wrap(_ value: CGFloat, _ max: CGFloat) -> CGFloat {
        guard max > 0 else { return 0 }
        var v = value.truncatingRemainder(dividingBy: max)
        if v < 0 { v += max }
        return v
    }

    static func sparkCGPath(cx: CGFloat, cy: CGFloat, radius: CGFloat) -> CGPath {
        let path = CGMutablePath()
        for i in 0..<8 {
            let angle = (CGFloat(i) * .pi / 4) - .pi / 2
            let r = i % 2 == 0 ? radius : radius * 0.32
            let point = CGPoint(x: cx + cos(angle) * r, y: cy + sin(angle) * r)
            if i == 0 { path.move(to: point) }
            else { path.addLine(to: point) }
        }
        path.closeSubpath()
        return path
    }
}

/// Flat paper (or the L42 black hold) plus the drifting field. Does not take taps.
struct NightPaperGround: View {
    var quiet = false
    var forceNight = false
    var holdBlack = false

    @ObservedObject private var settings = SettingsStore.shared

    var body: some View {
        ZStack {
            if holdBlack {
                DepthFieldMath.holdBlack
            } else {
                BrandColors.paper
            }
            if forceNight || holdBlack || settings.isDark {
                TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { _ in
                    Canvas { context, size in
                        DepthFieldMath.visit(
                            width: size.width,
                            height: size.height,
                            now: CACurrentMediaTime(),
                            camera: 0,
                            quiet: quiet || holdBlack
                        ) { sample in
                            let color = sample.flare || !sample.signal
                                ? DepthFieldMath.nightInkColor
                                : DepthFieldMath.nightSignalColor
                            if sample.flare {
                                let path = Path(DepthFieldMath.sparkCGPath(
                                    cx: sample.canvasX,
                                    cy: sample.canvasY,
                                    radius: sample.flareRadius
                                ))
                                context.fill(path, with: .color(color.opacity(Double(sample.alpha))))
                            } else {
                                let side = sample.side
                                let rect = CGRect(
                                    x: sample.canvasX.rounded(),
                                    y: sample.canvasY.rounded(),
                                    width: side,
                                    height: side
                                )
                                context.fill(Path(rect), with: .color(color.opacity(Double(sample.alpha))))
                            }
                        }
                    }
                }
                .allowsHitTesting(false)
                .accessibilityHidden(true)
            }
        }
        .ignoresSafeArea()
    }
}

/// Pooled specks + flare sprites. Sits behind the hull (`zPosition` -1).
final class DepthFieldNode: SKNode {
    private let speckNodes: [SKSpriteNode]
    private let flareNodes: [Int: SKSpriteNode]
    private static let flareImageRadius: CGFloat = 24
    private static let flareImageSide: CGFloat = 64
    private static let flareTexture: SKTexture = makeFlareTexture()

    override init() {
        var specks: [SKSpriteNode] = []
        var flares: [Int: SKSpriteNode] = [:]
        specks.reserveCapacity(DepthCatalog.stars.count)
        for (index, star) in DepthCatalog.stars.enumerated() {
            let side: CGFloat = star.size < 1.3 ? 1 : 2
            let speck = SKSpriteNode(
                color: star.signal ? DepthFieldMath.nightSignal : DepthFieldMath.nightInk,
                size: CGSize(width: side, height: side)
            )
            speck.isHidden = true
            specks.append(speck)
            if star.hero {
                let flare = SKSpriteNode(texture: Self.flareTexture)
                flare.color = DepthFieldMath.nightInk
                flare.colorBlendFactor = 1
                flare.zPosition = 1
                flare.isHidden = true
                flares[index] = flare
            }
        }
        speckNodes = specks
        flareNodes = flares
        super.init()
        for node in specks { addChild(node) }
        for node in flares.values { addChild(node) }
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) not used")
    }

    func present(width: CGFloat, height: CGFloat, camera: CGFloat, now: TimeInterval, quiet: Bool) {
        for node in speckNodes { node.isHidden = true }
        for node in flareNodes.values { node.isHidden = true }
        DepthFieldMath.visit(
            width: width,
            height: height,
            now: now,
            camera: camera,
            quiet: quiet
        ) { sample in
            if sample.flare {
                guard let flare = flareNodes[sample.index] else { return }
                let side = sample.flareRadius / Self.flareImageRadius * Self.flareImageSide
                flare.isHidden = false
                flare.size = CGSize(width: side, height: side)
                flare.position = CGPoint(x: sample.canvasX, y: height - sample.canvasY)
                flare.alpha = sample.alpha
                return
            }
            let speck = speckNodes[sample.index]
            let side = sample.side
            speck.isHidden = false
            speck.alpha = sample.alpha
            speck.position = CGPoint(
                x: sample.canvasX.rounded() + side * 0.5,
                y: height - (sample.canvasY.rounded() + side * 0.5)
            )
        }
    }

    private static func makeFlareTexture() -> SKTexture {
        let side = flareImageSide
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = false
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format)
        let image = renderer.image { ctx in
            let cg = ctx.cgContext
            cg.setFillColor(UIColor.white.cgColor)
            cg.addPath(DepthFieldMath.sparkCGPath(
                cx: side * 0.5,
                cy: side * 0.5,
                radius: flareImageRadius
            ))
            cg.fillPath()
        }
        let texture = SKTexture(image: image)
        texture.filteringMode = .linear
        return texture
    }
}
