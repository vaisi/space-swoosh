// SaberTrailNode.swift
// Changes: Android drawSaberTrail — bloom / body / core ribbons + crackle sparks.

import SpriteKit

final class SaberTrailNode: SKNode {
    private let bloom: SKShapeNode
    private let body: SKShapeNode
    private let core: SKShapeNode
    private let sparks: [SKSpriteNode]
    private var left: [CGPoint]
    private var right: [CGPoint]
    private var wake: [WakePoint]
    private let maxPoints: Int

    private struct WakePoint {
        var x: CGFloat
        var y: CGFloat
        var opacity: CGFloat
        var seed: CGFloat
        var angle: CGFloat
    }

    init(sparkTexture: SKTexture, maxPoints: Int = 162) {
        self.maxPoints = max(maxPoints, 3)
        left = Array(repeating: .zero, count: self.maxPoints)
        right = Array(repeating: .zero, count: self.maxPoints)
        wake = Array(
            repeating: WakePoint(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0),
            count: self.maxPoints
        )
        bloom = SKShapeNode()
        body = SKShapeNode()
        core = SKShapeNode()
        var list: [SKSpriteNode] = []
        for _ in 0..<80 {
            let n = SKSpriteNode(texture: sparkTexture)
            n.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            n.isHidden = true
            n.zPosition = 5.4
            list.append(n)
        }
        sparks = list
        super.init()
        configure(bloom, z: 5.0)
        configure(body, z: 5.1)
        configure(core, z: 5.2)
        addChild(bloom)
        addChild(body)
        addChild(core)
        for n in sparks { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

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
            bloom.path = nil
            body.path = nil
            core.path = nil
            bloom.isHidden = true
            body.isHidden = true
            core.isHidden = true
            for s in sparks { s.isHidden = true }
            return
        }
        let last = CGFloat(n - 1)
        let energy = WallJelly.energy(elapsedMs: jellyElapsedMs)
        let r = shipRadius
        let widthScale: CGFloat = 0.4
        let alpha: CGFloat = 0.95

        fillEdges(count: n) { i in
            let t = CGFloat(i) / last
            let op = self.wake[i].opacity
            return r * (0.1 + 0.22 * t) * widthScale * (0.55 + 0.45 * op) * (1 + energy * 0.35)
        }
        bloom.path = makeRibbonPath(count: n)
        bloom.fillColor = BrandColors.UI.saber
        bloom.alpha = alpha * (0.28 + energy * 0.22)
        bloom.isHidden = false

        fillEdges(count: n) { i in
            let t = CGFloat(i) / last
            return r * (0.04 + 0.11 * t) * widthScale * self.wake[i].opacity * (1 + energy * 0.2 * t)
        }
        body.path = makeRibbonPath(count: n)
        body.fillColor = BrandColors.UI.saber
        body.alpha = alpha * (0.78 + energy * 0.18)
        body.isHidden = false

        fillEdges(count: n) { i in
            let t = CGFloat(i) / last
            return r * (0.015 + 0.04 * t) * widthScale * self.wake[i].opacity * (1 + energy * 0.25)
        }
        core.path = makeRibbonPath(count: n)
        core.fillColor = BrandColors.UI.saberCore
        core.alpha = alpha * (0.9 + energy * 0.1)
        core.isHidden = false

        emitSparks(count: n, radius: r, energy: energy, alpha: alpha)
    }

    private func emitSparks(count n: Int, radius r: CGFloat, energy: CGFloat, alpha: CGFloat) {
        let denom = CGFloat(max(n - 1, 1))
        let step = energy > 0.08 ? 1 : 2
        let sparkChance: CGFloat = energy > 0.08 ? 0.72 : 0.38
        var used = 0
        var i = 0
        while i < n, used < sparks.count {
            let p = wake[i]
            if p.opacity >= 0.18 {
                let leave = 1 - CGFloat(i) / denom
                let u = fract(p.seed * 12.9898 + CGFloat(i) * 0.37)
                if u <= sparkChance {
                    let v = fract(p.seed * 78.233 + CGFloat(i) * 0.19)
                    let w = fract(p.seed * 4.1414 + CGFloat(i) * 0.11)
                    let prev = wake[max(0, i - 1)]
                    let next = wake[min(n - 1, i + 1)]
                    let dx = next.x - prev.x
                    let dy = next.y - prev.y
                    let len = hypot(dx, dy)
                    let inv = len > 0.0001 ? 1 / len : 1
                    let nx = -dy * inv
                    let ny = dx * inv
                    let side = (u * 2 - 1) * r * (0.12 + 0.55 * leave) * (1 + energy * 0.9)
                    let size = r * (0.03 + 0.045 * leave) * (0.55 + v * 0.55) * (1 + energy * 0.65)
                    let node = sparks[used]
                    used += 1
                    node.isHidden = false
                    node.position = CGPoint(x: p.x + nx * side, y: p.y + ny * side)
                    node.size = CGSize(width: size * 2, height: size * 2)
                    node.color = w > 0.55 ? BrandColors.UI.saberCore : BrandColors.UI.saber
                    node.colorBlendFactor = 1
                    node.alpha = alpha * p.opacity * (0.35 + 0.35 * leave + energy * 0.45)
                    if energy > 0.12, leave > 0.55, w > 0.4, used < sparks.count {
                        let ang = p.angle + (u - 0.5) * 2.2
                        let dist = r * (0.2 + v * 0.7) * energy
                        let extra = sparks[used]
                        used += 1
                        extra.isHidden = false
                        extra.position = CGPoint(
                            x: p.x + cos(ang) * dist,
                            y: p.y + sin(ang) * dist * 0.8
                        )
                        extra.size = CGSize(width: size * 1.4, height: size * 1.4)
                        extra.color = w > 0.55 ? BrandColors.UI.saberCore : BrandColors.UI.saber
                        extra.colorBlendFactor = 1
                        extra.alpha = alpha * p.opacity * energy * 0.75
                    }
                }
            }
            i += step
        }
        for k in used..<sparks.count { sparks[k].isHidden = true }
    }

    private func collectWake(
        trail: TrailRingBuffer,
        ship: ShipState,
        cameraY: CGFloat,
        sceneHeight: CGFloat,
        jellyElapsedMs: CGFloat,
        jellySide: CGFloat,
        shipRadius: CGFloat
    ) -> Int {
        let screenY: (CGFloat) -> CGFloat = { sceneHeight * CinematicFlight.cruiseSeat + ($0 - cameraY) }
        let jellyLive = jellyElapsedMs >= 0 && jellyElapsedMs < GameConfig.Flicker.wallJellyMs
        let jellyT = jellyLive ? jellyElapsedMs / GameConfig.Flicker.wallJellyMs : 0
        let recorded = min(trail.count, maxPoints - 1)
        let denom = CGFloat(max(recorded - 1, 1))
        for i in 0..<recorded {
            let src = trail[i]
            let along = recorded <= 1 ? 1 : CGFloat(i) / denom
            var x = src.x
            var y = src.y
            if jellyLive {
                let d = WallJelly.deform(
                    mode: .whip,
                    t: jellyT,
                    along: along,
                    side: jellySide,
                    radius: shipRadius,
                    seed: src.seed
                )
                x += d.dx
                y += d.dy
            }
            wake[i] = WakePoint(x: x, y: screenY(y), opacity: src.opacity, seed: src.seed, angle: src.tangent)
        }
        var count = recorded
        let tail = shipRadius * GameConfig.Spacecraft.tailOffset
        var tx = ship.x - sin(ship.bank) * tail
        var ty = ship.y - cos(ship.bank) * tail
        if jellyLive {
            let d = WallJelly.deform(
                mode: .whip,
                t: jellyT,
                along: 1,
                side: jellySide,
                radius: shipRadius,
                seed: 0.5
            )
            tx += d.dx
            ty += d.dy
        }
        let sx = tx
        let sy = screenY(ty)
        let ahead: CGFloat
        if count > 0 {
            let last = wake[count - 1]
            ahead = (sx - last.x) * sin(ship.tangent) + (sy - last.y) * cos(ship.tangent)
        } else {
            ahead = 1
        }
        if ahead > 0.5, count < maxPoints {
            wake[count] = WakePoint(x: sx, y: sy, opacity: 1, seed: 0.5, angle: ship.tangent)
            count += 1
        }
        return count
    }

    private func configure(_ node: SKShapeNode, z: CGFloat) {
        node.lineWidth = 0
        node.strokeColor = .clear
        node.isAntialiased = true
        node.zPosition = z
        node.isHidden = true
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
        path.move(to: left[0])
        if count == 1 { return path }
        if count == 2 {
            path.addLine(to: left[1])
        } else {
            for i in 1..<(count - 1) {
                let mx = (left[i].x + left[i + 1].x) * 0.5
                let my = (left[i].y + left[i + 1].y) * 0.5
                path.addQuadCurve(to: CGPoint(x: mx, y: my), control: left[i])
            }
            path.addLine(to: left[count - 1])
        }
        path.addLine(to: right[count - 1])
        if count > 2 {
            for i in stride(from: count - 2, through: 1, by: -1) {
                let mx = (right[i].x + right[i - 1].x) * 0.5
                let my = (right[i].y + right[i - 1].y) * 0.5
                path.addQuadCurve(to: CGPoint(x: mx, y: my), control: right[i])
            }
        }
        if count > 1 { path.addLine(to: right[0]) }
        path.closeSubpath()
        return path
    }

    private func fract(_ v: CGFloat) -> CGFloat {
        v - floor(v)
    }
}
