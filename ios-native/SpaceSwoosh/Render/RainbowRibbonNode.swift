// RainbowRibbonNode.swift
// Changes: Nyan side-by-side bands + Fletch dawn strata; reused SKShapeNodes.

import SpriteKit

final class RainbowRibbonNode: SKNode, SkinTrail {
    var node: SKNode { self }

    private let bands: [SKShapeNode]
    private let colors: [UIColor]
    private var left: [[CGPoint]]
    private var right: [[CGPoint]]
    private var wake: [WakePoint]
    private let maxPoints: Int
    private let skin: SkinDef
    private let widthScale: CGFloat

    private struct WakePoint {
        var x: CGFloat
        var y: CGFloat
        var opacity: CGFloat
        var seed: CGFloat
    }

    init(maxPoints: Int, skin: SkinDef, bands palette: [UIColor] = BrandColors.UI.nyanBands, widthScale: CGFloat? = nil) {
        self.maxPoints = max(maxPoints, 3)
        self.skin = skin
        self.colors = palette
        self.widthScale = widthScale ?? skin.trailWidthScale
        wake = Array(repeating: WakePoint(x: 0, y: 0, opacity: 0, seed: 0.5), count: self.maxPoints)
        var nodes: [SKShapeNode] = []
        var L: [[CGPoint]] = []
        var R: [[CGPoint]] = []
        for i in 0..<palette.count {
            let n = SKShapeNode()
            n.lineWidth = 0
            n.strokeColor = .clear
            n.isAntialiased = true
            n.zPosition = 5 + CGFloat(i) * 0.01
            n.isHidden = true
            nodes.append(n)
            L.append(Array(repeating: .zero, count: self.maxPoints))
            R.append(Array(repeating: .zero, count: self.maxPoints))
        }
        bands = nodes
        left = L
        right = R
        super.init()
        for n in bands { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = collectWake(ctx)
        guard n >= 3 else {
            for b in bands {
                b.path = nil
                b.isHidden = true
            }
            return
        }
        let bandCount = colors.count
        let halfTotal = ctx.shipRadius * 0.58 * widthScale
        let bandHalf = halfTotal / CGFloat(max(bandCount, 1))
        let last = CGFloat(n - 1)
        for b in 0..<bandCount {
            let centerOffset = (CGFloat(b) - CGFloat(bandCount - 1) / 2) * (bandHalf * 2)
            for i in 0..<n {
                let prev = wake[max(0, i - 1)]
                let next = wake[min(n - 1, i + 1)]
                let dx = next.x - prev.x
                let dy = next.y - prev.y
                let len = hypot(dx, dy)
                let inv = len > 0.0001 ? 1 / len : 1
                let nx = -dy * inv
                let ny = dx * inv
                let t = CGFloat(i) / last
                let w = bandHalf * pow(t, 0.55) * (0.5 + 0.5 * wake[i].opacity)
                let cx = wake[i].x + nx * centerOffset
                let cy = wake[i].y + ny * centerOffset
                left[b][i] = CGPoint(x: cx + nx * w, y: cy + ny * w)
                right[b][i] = CGPoint(x: cx - nx * w, y: cy - ny * w)
            }
            bands[b].path = ribbonPath(left: left[b], right: right[b], count: n)
            bands[b].fillColor = colors[b]
            bands[b].alpha = skin.trailAlpha * 0.85
            bands[b].isHidden = false
        }
    }

    private func collectWake(_ ctx: TrailSyncContext) -> Int {
        let screenY: (CGFloat) -> CGFloat = { ctx.sceneHeight * CinematicFlight.cruiseSeat + ($0 - ctx.cameraY) }
        let live = WallJelly.isLive(elapsedMs: ctx.jellyElapsedMs, mode: skin.wallTrailMode)
        let recorded = min(ctx.trail.count, maxPoints - 2)
        let denom = CGFloat(max(recorded - 1, 1))
        for i in 0..<recorded {
            let src = ctx.trail[i]
            let along = recorded <= 1 ? 1 : CGFloat(i) / denom
            var x = src.x
            var y = src.y
            if live {
                if skin.wallTrailMode == .spring {
                    let n = WallJelly.springNudge(
                        t: ctx.jellyElapsedMs / GameConfig.Flicker.wallJellyMs,
                        along: along,
                        side: ctx.jellySide,
                        radius: ctx.shipRadius,
                        seed: src.seed
                    )
                    x += n.dx
                    y += n.dy
                } else {
                    let d = WallJelly.deform(
                        mode: skin.wallTrailMode,
                        elapsedMs: ctx.jellyElapsedMs,
                        along: along,
                        side: ctx.jellySide,
                        radius: ctx.shipRadius,
                        seed: src.seed
                    )
                    x += d.dx
                    y += d.dy
                }
            }
            wake[i] = WakePoint(x: x, y: screenY(y), opacity: src.opacity, seed: src.seed)
        }
        var count = recorded
        if count < maxPoints {
            wake[count] = WakePoint(x: ctx.ship.x, y: screenY(ctx.ship.y), opacity: 1, seed: 0.5)
            count += 1
        }
        return count
    }

    private func ribbonPath(left: [CGPoint], right: [CGPoint], count: Int) -> CGPath {
        let path = CGMutablePath()
        guard count > 0 else { return path }
        path.move(to: left[0])
        for i in 1..<count { path.addLine(to: left[i]) }
        path.addLine(to: right[count - 1])
        for i in stride(from: count - 2, through: 0, by: -1) { path.addLine(to: right[i]) }
        path.closeSubpath()
        return path
    }
}
