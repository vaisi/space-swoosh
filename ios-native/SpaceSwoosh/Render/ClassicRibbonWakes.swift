// ClassicRibbonWakes.swift
// Changes: Android Wisp / Cinder / Lag / Crease / Dash — reused paths, no per-frame alloc.

import SpriteKit

final class WispTrailNode: SKNode, SkinTrail {
    var node: SKNode { self }
    private let body: SKShapeNode
    private let sparks: [SKSpriteNode]
    private var wake: [WakeSample]
    private var left: [CGPoint]
    private var right: [CGPoint]
    private let maxPoints: Int

    init(disc: SKTexture, maxPoints: Int) {
        self.maxPoints = max(maxPoints, 8)
        wake = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: self.maxPoints)
        left = Array(repeating: .zero, count: self.maxPoints)
        right = Array(repeating: .zero, count: self.maxPoints)
        body = WakeCollect.shapeNode(z: 5)
        sparks = (0..<self.maxPoints).map { _ in WakeCollect.sprite(disc, z: 5.2) }
        super.init()
        addChild(body)
        for s in sparks { addChild(s) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.points(ctx, into: &wake, capacity: maxPoints)
        guard n >= 3 else {
            body.isHidden = true
            body.path = nil
            for s in sparks { s.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let last = CGFloat(n - 1)
        let maxWidth = r * 0.6 * 0.4
        body.path = WakeCollect.ribbonPath(pts: wake, count: n, widthAt: { i in
            let t = CGFloat(i) / last
            return maxWidth * pow(t, 0.6) * (0.45 + 0.55 * self.wake[i].opacity)
        }, left: &left, right: &right)
        body.fillColor = BrandColors.UI.ink
        body.alpha = 0.7
        body.isHidden = false

        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        var si = 0
        for i in stride(from: n - 1, through: 0, by: -4) {
            guard si < sparks.count else { break }
            let p = wake[i]
            let age = 1 - p.opacity
            let flare = 1 + energy * 2.2
            let drift = (p.seed * 2 - 1) * r * 1.6 * age * flare
            let size = r * 0.17 * (0.35 + 0.65 * p.opacity) * (1 + energy * 0.6)
            let node = sparks[si]
            si += 1
            node.isHidden = false
            node.position = CGPoint(x: p.x + cos(p.angle) * drift, y: p.y + sin(p.angle) * drift)
            node.size = CGSize(width: size * 2, height: size * 2)
            node.alpha = p.opacity * (0.55 + energy * 0.25)
            node.color = BrandColors.UI.ink
        }
        for k in si..<sparks.count { sparks[k].isHidden = true }
    }
}

final class CinderTrailNode: SKNode, SkinTrail {
    var node: SKNode { self }
    private let ember: SKShapeNode
    private let core: SKShapeNode
    private let hair: SKShapeNode
    private let ash: [SKSpriteNode]
    private var wake: [WakeSample]
    private var left: [CGPoint]
    private var right: [CGPoint]
    private let maxPoints: Int

    init(disc: SKTexture, maxPoints: Int) {
        self.maxPoints = max(maxPoints, 8)
        wake = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: self.maxPoints)
        left = Array(repeating: .zero, count: self.maxPoints)
        right = Array(repeating: .zero, count: self.maxPoints)
        ember = WakeCollect.shapeNode(z: 4.8)
        core = WakeCollect.shapeNode(z: 4.9)
        hair = WakeCollect.shapeNode(z: 5)
        hair.lineCap = .round
        hair.lineJoin = .round
        hair.fillColor = .clear
        ash = (0..<self.maxPoints).map { _ in WakeCollect.sprite(disc, z: 5.2) }
        super.init()
        addChild(ember)
        addChild(core)
        addChild(hair)
        for a in ash { addChild(a) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.points(ctx, into: &wake, capacity: maxPoints)
        guard n >= 3 else {
            ember.isHidden = true; core.isHidden = true; hair.isHidden = true
            ember.path = nil; core.path = nil; hair.path = nil
            for a in ash { a.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let last = CGFloat(n - 1)
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        ember.path = WakeCollect.ribbonPath(pts: wake, count: n, widthAt: { i in
            let t = CGFloat(i) / last
            let leave = 1 - t
            return r * (0.14 + 0.22 * t + 0.18 * leave) * (0.5 + 0.5 * self.wake[i].opacity) * (1 + energy * 0.25 * t)
        }, left: &left, right: &right)
        ember.fillColor = BrandColors.UI.ember
        ember.alpha = 0.42
        ember.isHidden = false
        core.path = WakeCollect.ribbonPath(pts: wake, count: n, widthAt: { i in
            let t = CGFloat(i) / last
            return r * (0.05 + 0.12 * t) * self.wake[i].opacity * (1 + energy * 0.15 * t)
        }, left: &left, right: &right)
        core.fillColor = BrandColors.UI.ember
        core.alpha = 0.55
        core.isHidden = false
        hair.path = ClassicWakePath.smooth(wake, count: n)
        hair.strokeColor = BrandColors.UI.ink
        hair.lineWidth = max(1, r * 0.055)
        hair.alpha = 0.5
        hair.isHidden = false

        var ai = 0
        for i in stride(from: 0, to: n, by: 2) {
            guard ai < ash.count else { break }
            let p = wake[i]
            let leave = 1 - CGFloat(i) / last
            if leave < 0.25 || p.opacity < 0.18 { continue }
            let u = WakeCollect.fract(p.seed * 12.9898 + CGFloat(i) * 0.37)
            let v = WakeCollect.fract(p.seed * 78.233 + CGFloat(i) * 0.19)
            let prev = wake[max(0, i - 1)]
            let next = wake[min(n - 1, i + 1)]
            let dx = next.x - prev.x
            let dy = next.y - prev.y
            let len = hypot(dx, dy)
            let inv = len > 0.0001 ? 1 / len : 1
            let nx = -dy * inv
            let ny = dx * inv
            let side = (u * 2 - 1) * r * (0.25 + 0.7 * leave)
            let size = r * (0.05 + 0.07 * leave) * (0.6 + v * 0.5)
            let node = ash[ai]
            ai += 1
            node.isHidden = false
            node.position = CGPoint(x: p.x + nx * side, y: p.y + ny * side)
            node.size = CGSize(width: size * 2, height: size * 2)
            node.alpha = p.opacity * (0.3 + 0.4 * leave)
            node.color = BrandColors.UI.ember
        }
        for k in ai..<ash.count { ash[k].isHidden = true }
    }
}

final class LagTrailNode: SKNode, SkinTrail {
    var node: SKNode { self }
    private let ribbon: SKShapeNode
    private let hair: SKShapeNode
    private let ticks: [SKShapeNode]
    private var wake: [WakeSample]
    private var lagged: [WakeSample]
    private var left: [CGPoint]
    private var right: [CGPoint]
    private let maxPoints: Int

    init(maxPoints: Int) {
        self.maxPoints = max(maxPoints, 8)
        wake = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: self.maxPoints)
        lagged = wake
        left = Array(repeating: .zero, count: self.maxPoints)
        right = Array(repeating: .zero, count: self.maxPoints)
        ribbon = WakeCollect.shapeNode(z: 4.8)
        hair = WakeCollect.shapeNode(z: 5)
        hair.fillColor = .clear
        hair.lineCap = .round
        ticks = (0..<40).map { _ in
            let n = WakeCollect.shapeNode(z: 5.1)
            n.fillColor = .clear
            n.lineCap = .round
            return n
        }
        super.init()
        addChild(ribbon)
        addChild(hair)
        for t in ticks { addChild(t) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.points(ctx, into: &wake, capacity: maxPoints)
        guard n >= 2 else {
            ribbon.isHidden = true; hair.isHidden = true
            ribbon.path = nil; hair.path = nil
            for t in ticks { t.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let last = CGFloat(n - 1)
        let lagSteps = max(1, min(4, Int(CGFloat(n) * 0.08)))
        for i in 0..<n {
            let src = wake[i]
            let older = wake[max(0, i - lagSteps)]
            let along = CGFloat(i) / last
            let blend = 0.22 + 0.2 * (1 - along)
            var p = src
            p.x = src.x * (1 - blend) + older.x * blend
            p.y = src.y * (1 - blend) + older.y * blend
            p.along = along
            lagged[i] = p
        }
        ribbon.path = WakeCollect.ribbonPath(pts: lagged, count: n, widthAt: { i in
            let t = CGFloat(i) / last
            let age = 1 - self.lagged[i].opacity
            return r * (0.16 + 0.28 * t) * (0.55 + 0.45 * self.lagged[i].opacity) * (1 + age * 0.35 + energy * 0.2)
        }, left: &left, right: &right)
        ribbon.fillColor = BrandColors.UI.ink
        ribbon.alpha = 0.22
        ribbon.isHidden = false
        hair.path = ClassicWakePath.smooth(lagged, count: n)
        hair.strokeColor = BrandColors.UI.ink
        hair.lineWidth = max(1, r * 0.06)
        hair.alpha = 0.55
        hair.isHidden = false

        let tickStep = max(1, n / 28)
        var ti = 0
        for i in stride(from: 0, to: n, by: tickStep) {
            guard ti < ticks.count else { break }
            let p = lagged[i]
            let age = 1 - p.opacity
            let leave = pow(1 - p.along, 0.85)
            let rx = r * (0.22 + age * 0.55) * (0.35 + 0.65 * leave) * (1 + energy * 0.15)
            let ry = rx * (0.55 + 0.2 * sin(p.along * .pi * 3))
            let node = ticks[ti]
            ti += 1
            node.isHidden = false
            node.position = CGPoint(x: p.x, y: p.y)
            node.zRotation = -p.angle
            node.path = CGPath(ellipseIn: CGRect(x: -rx, y: -ry, width: max(1, rx * 2), height: max(1, ry * 2)), transform: nil)
            node.strokeColor = BrandColors.UI.ink
            node.lineWidth = max(0.9, r * (0.04 + 0.03 * p.opacity))
            node.alpha = p.opacity * 0.8 * (0.35 + 0.65 * leave)
        }
        for k in ti..<ticks.count { ticks[k].isHidden = true }
    }
}

final class CreaseTrailNode: SKNode, SkinTrail {
    var node: SKNode { self }
    private let under: SKShapeNode
    private let dash: SKShapeNode
    private var wake: [WakeSample]
    private let maxPoints: Int

    init(maxPoints: Int) {
        self.maxPoints = max(maxPoints, 8)
        wake = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: self.maxPoints)
        under = WakeCollect.shapeNode(z: 4.8)
        under.fillColor = .clear
        under.lineCap = .round
        under.lineJoin = .round
        dash = WakeCollect.shapeNode(z: 5)
        dash.fillColor = .clear
        dash.lineCap = .round
        dash.lineJoin = .round
        super.init()
        addChild(under)
        addChild(dash)
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.points(ctx, into: &wake, capacity: maxPoints)
        guard n >= 2 else {
            under.isHidden = true; dash.isHidden = true
            under.path = nil; dash.path = nil
            return
        }
        let r = ctx.shipRadius
        let bankAmt = min(1, abs(ctx.ship.bank) / GameConfig.Spacecraft.maxBank)
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        var zig: [CGPoint] = []
        zig.reserveCapacity(n * 2)
        let denom = CGFloat(max(n - 1, 1))
        for i in 0..<n {
            let p = wake[i]
            zig.append(offset(p, i: i * 2, denom: denom * 2, r: r, bank: bankAmt, energy: energy))
            if i < n - 1 {
                let nxt = wake[i + 1]
                let mid = WakeSample(
                    x: (p.x + nxt.x) * 0.5, y: (p.y + nxt.y) * 0.5,
                    opacity: (p.opacity + nxt.opacity) * 0.5, seed: p.seed, angle: p.angle,
                    sx: 1, sy: 1, along: (p.along + nxt.along) * 0.5, scale: 1
                )
                zig.append(offset(mid, i: i * 2 + 1, denom: denom * 2, r: r, bank: bankAmt, energy: energy))
            }
        }
        let path = ClassicWakePath.smoothPoints(zig)
        under.path = path
        under.strokeColor = BrandColors.UI.ink
        under.lineWidth = max(1, r * 0.07)
        under.alpha = 0.28
        under.isHidden = false
        dash.path = path
        dash.strokeColor = BrandColors.UI.ink
        dash.lineWidth = max(1.2, r * 0.11)
        dash.alpha = 0.88
        dash.isHidden = false
    }

    private func offset(_ p: WakeSample, i: Int, denom: CGFloat, r: CGFloat, bank: CGFloat, energy: CGFloat) -> CGPoint {
        let along = CGFloat(i) / max(denom, 1)
        let leave = pow(1 - along, 1.15)
        let amp = r * (0.12 + 0.62 * bank + energy * 0.4) * (0.35 + 0.65 * pow(p.opacity, 0.55)) * leave
        let sign: CGFloat = i.isMultiple(of: 2) ? 1 : -1
        return CGPoint(x: p.x + cos(p.angle) * amp * sign, y: p.y + sin(p.angle) * amp * sign * 0.4)
    }
}

final class DashTrailNode: SKNode, SkinTrail {
    var node: SKNode { self }
    private let dashes: [SKShapeNode]
    private var marks: [WakeSample]
    private let maxMarks: Int

    init(maxPoints: Int) {
        maxMarks = max(maxPoints * 2, 16)
        marks = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: maxMarks)
        dashes = (0..<max(maxPoints, 8)).map { _ in
            let n = WakeCollect.shapeNode(z: 5)
            n.fillColor = .clear
            n.lineCap = .round
            return n
        }
        super.init()
        for d in dashes { addChild(d) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.dense(ctx, into: &marks, capacity: marks.count, subdiv: 1)
        guard n >= 2 else {
            for d in dashes { d.isHidden = true; d.path = nil }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        var di = 0
        var i = 0
        while i < n - 1, di < dashes.count {
            if i & 1 == 1 { i += 1; continue }
            let a = marks[i]
            let b = marks[i + 1]
            let useSignal = ((i >> 1) % 2) == 0
            let along = a.along
            let lenBoost = 1 + energy * 0.9 * along
            let mx = (a.x + b.x) * 0.5
            let my = (a.y + b.y) * 0.5
            let dx = (b.x - a.x) * 0.5 * lenBoost * a.sy
            let dy = (b.y - a.y) * 0.5 * lenBoost * a.sy
            let node = dashes[di]
            di += 1
            let path = CGMutablePath()
            path.move(to: CGPoint(x: mx - dx, y: my - dy))
            path.addLine(to: CGPoint(x: mx + dx, y: my + dy))
            node.path = path
            node.strokeColor = useSignal ? BrandColors.UI.signal : BrandColors.UI.ink
            node.lineWidth = max(1.2, r * (0.1 + 0.08 * a.opacity) * a.sx * (1 + energy * 0.25 * along))
            node.alpha = min(a.opacity, b.opacity) * (useSignal ? 0.95 : 0.85) * 0.9
            node.isHidden = false
            i += 1
        }
        for k in di..<dashes.count { dashes[k].isHidden = true; dashes[k].path = nil }
    }
}

enum ClassicWakePath {
    static func smooth(_ pts: [WakeSample], count: Int) -> CGPath {
        smoothPoints((0..<count).map { CGPoint(x: pts[$0].x, y: pts[$0].y) })
    }

    static func smoothPoints(_ pts: [CGPoint]) -> CGPath {
        let path = CGMutablePath()
        guard let first = pts.first else { return path }
        path.move(to: first)
        if pts.count == 1 { return path }
        if pts.count == 2 {
            path.addLine(to: pts[1])
            return path
        }
        for i in 1..<(pts.count - 1) {
            let mx = (pts[i].x + pts[i + 1].x) * 0.5
            let my = (pts[i].y + pts[i + 1].y) * 0.5
            path.addQuadCurve(to: CGPoint(x: mx, y: my), control: pts[i])
        }
        path.addLine(to: pts[pts.count - 1])
        return path
    }
}
