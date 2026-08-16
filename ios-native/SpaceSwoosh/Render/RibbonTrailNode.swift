// RibbonTrailNode.swift
// Changes: Parameterized Flicker/Quill/Ink ribbon; springNudge vs wallTrailDeform.

import SpriteKit

/// Android `drawRibbonTrail` / `ribbonPath` / `traceSmooth` as two filled paths.
/// Nodes are created once; only `path` is replaced each frame.
final class RibbonTrailNode: SKNode, SkinTrail {
    var node: SKNode { self }

    private let smudge: SKShapeNode
    private let body: SKShapeNode
    private var left: [CGPoint]
    private var right: [CGPoint]
    private var wake: [WakePoint]
    private let maxPoints: Int
    private let skin: SkinDef

    private struct WakePoint {
        var x: CGFloat
        var y: CGFloat
        var opacity: CGFloat
        var seed: CGFloat
    }

    init(maxPoints: Int = GameConfig.Spacecraft.trailMaxPoints + 2, skin: SkinDef = SkinCatalog.def(.flicker)) {
        self.maxPoints = max(maxPoints, 3)
        self.skin = skin
        left = Array(repeating: .zero, count: self.maxPoints)
        right = Array(repeating: .zero, count: self.maxPoints)
        wake = Array(
            repeating: WakePoint(x: 0, y: 0, opacity: 0, seed: 0.5),
            count: self.maxPoints
        )
        smudge = SKShapeNode()
        body = SKShapeNode()
        super.init()
        configure(smudge, z: 4.5)
        configure(body, z: 5)
        addChild(smudge)
        addChild(body)
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) not used")
    }

    func sync(_ ctx: TrailSyncContext) {
        sync(
            trail: ctx.trail,
            ship: ctx.ship,
            cameraY: ctx.cameraY,
            sceneHeight: ctx.sceneHeight,
            jellyElapsedMs: ctx.jellyElapsedMs,
            jellySide: ctx.jellySide,
            shipRadius: ctx.shipRadius
        )
    }

    func sync(
        trail: TrailRingBuffer,
        ship: ShipState,
        cameraY: CGFloat,
        sceneHeight: CGFloat,
        jellyElapsedMs: CGFloat,
        jellySide: CGFloat,
        shipRadius: CGFloat
    ) {
        let n = collectWake(
            trail: trail,
            ship: ship,
            cameraY: cameraY,
            sceneHeight: sceneHeight,
            jellyElapsedMs: jellyElapsedMs,
            jellySide: jellySide,
            shipRadius: shipRadius
        )
        guard n >= 3 else {
            smudge.path = nil
            body.path = nil
            smudge.isHidden = true
            body.isHidden = true
            return
        }

        let maxWidth = shipRadius * GameConfig.Flicker.trailWidthScale * skin.trailWidthScale
        let last = CGFloat(n - 1)
        let widthAt: (Int) -> CGFloat = { i in
            let t = CGFloat(i) / last
            let p = self.wake[i]
            return maxWidth * pow(t, 0.6) * (0.45 + 0.55 * p.opacity)
        }

        fillEdges(count: n, widthAt: { i in
            let t = CGFloat(i) / last
            let bloom: CGFloat = t < 0.8 ? 2.2 : 2.2 - 1.2 * ((t - 0.8) / 0.2)
            return widthAt(i) * bloom
        })
        smudge.path = makeRibbonPath(count: n)
        smudge.fillColor = BrandColors.UI.ink12
        smudge.alpha = 1
        smudge.isHidden = !skin.trailSmudge

        fillEdges(count: n, widthAt: widthAt)
        body.path = makeRibbonPath(count: n)
        body.fillColor = skin.trailSignal ? BrandColors.UI.signal : BrandColors.UI.trail
        body.alpha = skin.trailAlpha
        body.isHidden = false
    }

    private func configure(_ node: SKShapeNode, z: CGFloat) {
        node.lineWidth = 0
        node.strokeColor = .clear
        node.fillColor = BrandColors.UI.trail
        node.isAntialiased = true
        node.zPosition = z
        node.isHidden = true
    }

    /// Oldest → newest, screen space. Live tail, then a hull-center tuck.
    @discardableResult
    private func collectWake(
        trail: TrailRingBuffer,
        ship: ShipState,
        cameraY: CGFloat,
        sceneHeight: CGFloat,
        jellyElapsedMs: CGFloat,
        jellySide: CGFloat,
        shipRadius: CGFloat
    ) -> Int {
        let screenY: (CGFloat) -> CGFloat = { worldY in
            sceneHeight * 0.22 + (worldY - cameraY)
        }
        let jellyLive = WallJelly.isLive(elapsedMs: jellyElapsedMs, mode: skin.wallTrailMode)
        let jellyT = jellyLive ? jellyElapsedMs / GameConfig.Flicker.wallJellyMs : 0
        let recorded = min(trail.count, maxPoints - 2)
        let denom = CGFloat(max(recorded - 1, 1))

        for i in 0..<recorded {
            let src = trail[i]
            let along = recorded <= 1 ? 1 : CGFloat(i) / denom
            var x = src.x
            var y = src.y
            if jellyLive {
                if skin.wallTrailMode == .spring {
                    let n = WallJelly.springNudge(
                        t: jellyT,
                        along: along,
                        side: jellySide,
                        radius: shipRadius,
                        seed: src.seed
                    )
                    x += n.dx
                    y += n.dy
                } else {
                    let d = WallJelly.deform(
                        mode: skin.wallTrailMode,
                        elapsedMs: jellyElapsedMs,
                        along: along,
                        side: jellySide,
                        radius: shipRadius,
                        seed: src.seed
                    )
                    x += d.dx
                    y += d.dy
                }
            }
            wake[i] = WakePoint(x: x, y: screenY(y), opacity: src.opacity, seed: src.seed)
        }

        var count = recorded
        let tail = shipRadius * GameConfig.Spacecraft.tailOffset
        var tx = ship.x - sin(ship.bank) * tail
        var ty = ship.y - cos(ship.bank) * tail
        if jellyLive {
            if skin.wallTrailMode == .spring {
                let n = WallJelly.springNudge(
                    t: jellyT,
                    along: 1,
                    side: jellySide,
                    radius: shipRadius,
                    seed: 0.5
                )
                tx += n.dx
                ty += n.dy
            } else {
                let d = WallJelly.deform(
                    mode: skin.wallTrailMode,
                    elapsedMs: jellyElapsedMs,
                    along: 1,
                    side: jellySide,
                    radius: shipRadius,
                    seed: 0.5
                )
                tx += d.dx
                ty += d.dy
            }
        }
        let sx = tx
        let sy = screenY(ty)
        // JS Y-down uses −Δy·cos; SpriteKit Y-up flips that term so “ahead”
        // still means toward the hull along `tangent`.
        let ahead: CGFloat
        if count > 0 {
            let last = wake[count - 1]
            ahead = (sx - last.x) * sin(ship.tangent) + (sy - last.y) * cos(ship.tangent)
        } else {
            ahead = 1
        }
        if ahead > 0.5, count < maxPoints {
            wake[count] = WakePoint(x: sx, y: sy, opacity: 1, seed: 0.5)
            count += 1
        }
        if count < maxPoints {
            wake[count] = WakePoint(x: ship.x, y: screenY(ship.y), opacity: 1, seed: 0.5)
            count += 1
        }
        return count
    }

    private func fillEdges(count: Int, widthAt: (Int) -> CGFloat) {
        for i in 0..<count {
            let prev = wake[max(0, i - 1)]
            let next = wake[min(count - 1, i + 1)]
            let dx = next.x - prev.x
            let dy = next.y - prev.y
            let len = hypot(dx, dy)
            let inv = len > 0.0001 ? 1 / len : 1
            let nx = -dy * inv
            let ny = dx * inv
            let w = widthAt(i)
            let p = wake[i]
            left[i] = CGPoint(x: p.x + nx * w, y: p.y + ny * w)
            right[i] = CGPoint(x: p.x - nx * w, y: p.y - ny * w)
        }
    }

    private func makeRibbonPath(count: Int) -> CGPath {
        let path = CGMutablePath()
        guard count > 0 else { return path }
        traceSmooth(path, points: left, count: count, startNew: true)
        path.addLine(to: right[count - 1])
        if count > 2 {
            for i in stride(from: count - 2, through: 1, by: -1) {
                let mx = (right[i].x + right[i - 1].x) * 0.5
                let my = (right[i].y + right[i - 1].y) * 0.5
                path.addQuadCurve(to: CGPoint(x: mx, y: my), control: right[i])
            }
        }
        if count > 1 {
            path.addLine(to: right[0])
        }
        path.closeSubpath()
        return path
    }

    private func traceSmooth(_ path: CGMutablePath, points: [CGPoint], count: Int, startNew: Bool) {
        guard count > 0 else { return }
        if startNew {
            path.move(to: points[0])
        } else {
            path.addLine(to: points[0])
        }
        if count == 1 { return }
        if count == 2 {
            path.addLine(to: points[1])
            return
        }
        for i in 1..<(count - 1) {
            let mx = (points[i].x + points[i + 1].x) * 0.5
            let my = (points[i].y + points[i + 1].y) * 0.5
            path.addQuadCurve(to: CGPoint(x: mx, y: my), control: points[i])
        }
        path.addLine(to: points[count - 1])
    }
}
