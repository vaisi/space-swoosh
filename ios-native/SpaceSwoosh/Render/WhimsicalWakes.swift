// WhimsicalWakes.swift
// Changes: Dedicated Android wakes for Bloom…Chime (not ParticleWakeField).

import QuartzCore
import SpriteKit

final class HorizonRibbon: SKNode {
    private let nodes: [SKShapeNode]
    private let colors: [UIColor]
    private var left: [CGPoint]
    private var right: [CGPoint]
    private let widthScale: CGFloat
    private let drawAlpha: CGFloat
    private let maxPoints: Int

    init(maxPoints: Int, colors: [UIColor], widthScale: CGFloat, alpha: CGFloat) {
        self.maxPoints = max(maxPoints, 8)
        self.colors = colors
        self.widthScale = widthScale
        self.drawAlpha = alpha
        nodes = (0..<colors.count).map { WakeCollect.shapeNode(z: 4.9 + CGFloat($0) * 0.01) }
        left = Array(repeating: .zero, count: self.maxPoints)
        right = Array(repeating: .zero, count: self.maxPoints)
        super.init()
        for n in nodes { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func paint(pts: [WakeSample], count: Int, radius: CGFloat) {
        guard count >= 3 else {
            for n in nodes { n.isHidden = true; n.path = nil }
            return
        }
        let last = count - 1
        let maxWidth = radius * 0.6 * widthScale
        let widthAt: (Int) -> CGFloat = { i in
            let t = CGFloat(i) / CGFloat(last)
            return maxWidth * pow(t, 0.6) * (0.45 + 0.55 * pts[i].opacity)
        }
        let bandCount = colors.count
        for b in 0..<bandCount {
            let i0 = max(0, Int(floor((CGFloat(b) / CGFloat(bandCount)) * CGFloat(last))) - 1)
            let i1 = min(last, Int(ceil((CGFloat(b + 1) / CGFloat(bandCount)) * CGFloat(last))) + 1)
            if i1 - i0 < 2 {
                nodes[b].isHidden = true
                continue
            }
            nodes[b].path = WakeCollect.ribbonPath(
                pts: pts, count: count, widthAt: widthAt,
                left: &left, right: &right, i0: i0, i1: i1
            )
            nodes[b].fillColor = colors[b]
            nodes[b].alpha = drawAlpha
            nodes[b].isHidden = false
        }
    }
}

final class BloomWake: SKNode, SkinTrail {
    var node: SKNode { self }
    private let rings: [SKSpriteNode]
    private let inners: [SKSpriteNode]
    private let sparks: [SKSpriteNode]
    private let arms: [SKShapeNode]
    private var marks: [WakeSample]
    private let maxMarks: Int

    init(ring: SKTexture, disc: SKTexture, slots: Int) {
        maxMarks = max(slots, 8)
        marks = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: maxMarks * 2)
        rings = (0..<maxMarks).map { _ in WakeCollect.sprite(ring, z: 5) }
        inners = (0..<maxMarks).map { _ in WakeCollect.sprite(ring, z: 5.05) }
        sparks = (0..<maxMarks).map { _ in WakeCollect.sprite(disc, z: 5.2) }
        arms = (0..<maxMarks).map { _ in
            let n = SKShapeNode()
            n.fillColor = .clear
            n.lineCap = .round
            n.isAntialiased = true
            n.zPosition = 5.15
            n.isHidden = true
            return n
        }
        super.init()
        for n in rings { addChild(n) }
        for n in inners { addChild(n) }
        for n in sparks { addChild(n) }
        for n in arms { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let m = WakeCollect.dense(ctx, into: &marks, capacity: marks.count)
        guard m >= 2 else {
            hide(rings); hide(inners); hide(sparks)
            for a in arms { a.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let t = WallJelly.isLive(elapsedMs: ctx.jellyElapsedMs, mode: .pile)
            ? min(1, max(0, ctx.jellyElapsedMs / GameConfig.Flicker.wallJellyMs)) : 1
        let side: CGFloat = ctx.jellySide < 0 ? -1 : 1
        let bands = BrandColors.UI.bloomBands
        let alpha: CGFloat = 0.88

        var ri = 0
        for i in stride(from: m - 1, through: 0, by: -1) {
            guard ri < rings.count else { break }
            let p = marks[i]
            let age = 1 - p.opacity
            var inflate: CGFloat = 1
            var stack: CGFloat = 0
            var pop: CGFloat = 1
            if energy > 0, p.opacity > 0.32 {
                let youth = p.opacity
                inflate = 1 + energy * 1.5 * youth * sin(.pi * min(1, t * 1.6))
                stack = side * r * 0.4 * energy * youth * youth * CGFloat(i % 3) * 0.2
                pop = t < 0.55 ? 1 : max(0.12, 1 - (t - 0.55) * 2.4 * energy)
            }
            let ringR = r * (0.14 + age * 1.05) * p.scale * inflate * pop
            let fade = p.opacity * alpha * (0.38 + 0.62 * (1 - age)) * pop
            let sx = p.sx * (energy > 0 ? 1 + energy * 0.18 : 1)
            let sy = p.sy
            let rgb = bands[i % bands.count]
            let node = rings[ri]
            node.isHidden = false
            node.position = CGPoint(x: p.x + stack, y: p.y)
            node.size = CGSize(width: ringR * 2 * sx, height: ringR * 2 * sy)
            node.color = rgb
            node.alpha = fade
            node.zRotation = 0
            let inner = inners[ri]
            if age > 0.28, p.opacity < 0.62, WakeCollect.fract(p.seed * 9.17) > 0.45 {
                let ox = (WakeCollect.fract(p.seed * 12.9) - 0.5) * r * 0.35
                inner.isHidden = false
                inner.position = CGPoint(x: p.x + stack + ox, y: p.y)
                inner.size = CGSize(width: ringR * 0.84 * sx, height: ringR * 0.84 * sy)
                inner.color = rgb
                inner.alpha = fade * 0.45
                inner.zRotation = -p.angle
            } else {
                inner.isHidden = true
            }
            ri += 1
        }
        for k in ri..<rings.count {
            rings[k].isHidden = true
            inners[k].isHidden = true
        }

        let sparkChance: CGFloat = energy > 0.08 ? 0.82 : 0.48
        var si = 0
        for i in 0..<m {
            let p = marks[i]
            if p.opacity < 0.16 { continue }
            let u = WakeCollect.fract(p.seed * 12.9898 + CGFloat(i) * 0.37)
            if u > sparkChance { continue }
            guard si < sparks.count else { break }
            let v = WakeCollect.fract(p.seed * 78.233 + CGFloat(i) * 0.19)
            let w = WakeCollect.fract(p.seed * 4.1414 + CGFloat(i) * 0.11)
            let leave = 1 - p.along
            let ang = p.angle + (u - 0.5) * 1.8
            let dist = r * (0.12 + 0.7 * leave) * (0.6 + v) * (1 + energy * 0.9)
            let size = r * (0.028 + 0.04 * leave) * (0.55 + w * 0.6) * (1 + energy * 0.5)
            let rgb = bands[(i + Int(w * CGFloat(bands.count))) % bands.count]
            let sx = p.x + cos(ang) * dist
            let sy = p.y + sin(ang) * dist * 0.85
            let fade = alpha * p.opacity * (0.32 + 0.4 * leave + energy * 0.4)
            let node = sparks[si]
            node.isHidden = false
            node.position = CGPoint(x: sx, y: sy)
            node.size = CGSize(width: size * 2, height: size * 2)
            node.color = rgb
            node.alpha = fade
            let arm = arms[si]
            if w > 0.55 {
                let a = size * 2.2
                let path = CGMutablePath()
                path.move(to: CGPoint(x: sx - a, y: sy))
                path.addLine(to: CGPoint(x: sx + a, y: sy))
                path.move(to: CGPoint(x: sx, y: sy - a))
                path.addLine(to: CGPoint(x: sx, y: sy + a))
                arm.path = path
                arm.strokeColor = rgb
                arm.lineWidth = max(0.6, r * 0.03)
                arm.alpha = fade * 0.85
                arm.isHidden = false
            } else {
                arm.isHidden = true
            }
            si += 1
        }
        for k in si..<sparks.count {
            sparks[k].isHidden = true
            arms[k].isHidden = true
        }
    }

    private func hide(_ nodes: [SKSpriteNode]) {
        for n in nodes { n.isHidden = true }
    }
}

final class LyraWake: SKNode, SkinTrail {
    var node: SKNode { self }
    private let horizon: HorizonRibbon
    private let motes: [SKSpriteNode]
    private let arms: [SKShapeNode]
    private var wake: [WakeSample]
    private let maxPoints: Int

    init(disc: SKTexture, slots: Int) {
        maxPoints = max(slots, 8)
        horizon = HorizonRibbon(maxPoints: slots + 2, colors: BrandColors.UI.auroraBands, widthScale: 0.72, alpha: 0.9)
        motes = (0..<maxPoints).map { _ in WakeCollect.sprite(disc, z: 5.3) }
        arms = (0..<maxPoints).map { _ in
            let n = SKShapeNode()
            n.fillColor = .clear
            n.lineCap = .round
            n.isAntialiased = true
            n.zPosition = 5.25
            n.isHidden = true
            return n
        }
        wake = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: maxPoints)
        super.init()
        addChild(horizon)
        for n in motes { addChild(n) }
        for n in arms { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.points(ctx, into: &wake, capacity: maxPoints)
        horizon.paint(pts: wake, count: n, radius: ctx.shipRadius)
        guard n >= 3 else {
            for m in motes { m.isHidden = true }
            for a in arms { a.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let denom = CGFloat(max(n - 1, 1))
        let bands = BrandColors.UI.auroraBands
        let alpha: CGFloat = 0.9
        var used = 0
        for i in 0..<n {
            let p = wake[i]
            if p.opacity < 0.18 { continue }
            let u = WakeCollect.fract(p.seed * 12.9898 + CGFloat(i) * 0.41)
            if u > (energy > 0.08 ? 0.78 : 0.42) { continue }
            guard used < motes.count else { break }
            let v = WakeCollect.fract(p.seed * 78.233 + CGFloat(i) * 0.17)
            let leave = 1 - CGFloat(i) / denom
            let prev = wake[max(0, i - 1)]
            let next = wake[min(n - 1, i + 1)]
            let dx = next.x - prev.x
            let dy = next.y - prev.y
            let len = hypot(dx, dy)
            let inv = len > 0.0001 ? 1 / len : 1
            let nx = -dy * inv
            let ny = dx * inv
            let side = (u * 2 - 1) * r * (0.18 + 0.7 * leave) * (1 + energy * 0.7)
            let size = r * (0.03 + 0.05 * leave) * (0.5 + v * 0.7)
            let rgb = bands[i % bands.count]
            let sx = p.x + nx * side
            let sy = p.y + ny * side
            let fade = alpha * p.opacity * (0.4 + 0.4 * leave + energy * 0.3)
            let mote = motes[used]
            mote.isHidden = false
            mote.position = CGPoint(x: sx, y: sy)
            mote.size = CGSize(width: size * 2, height: size * 2)
            mote.color = rgb
            mote.alpha = fade
            let arm = arms[used]
            if v > 0.55 {
                let a = size * 2.1
                let path = CGMutablePath()
                path.move(to: CGPoint(x: sx - a, y: sy))
                path.addLine(to: CGPoint(x: sx + a, y: sy))
                path.move(to: CGPoint(x: sx, y: sy - a))
                path.addLine(to: CGPoint(x: sx, y: sy + a))
                arm.path = path
                arm.strokeColor = rgb
                arm.lineWidth = max(0.6, r * 0.028)
                arm.alpha = fade
                arm.isHidden = false
            } else {
                arm.isHidden = true
            }
            used += 1
        }
        for k in used..<motes.count {
            motes[k].isHidden = true
            arms[k].isHidden = true
        }
    }
}

final class PlumeWake: SKNode, SkinTrail {
    var node: SKNode { self }
    private let horizon: HorizonRibbon
    private let filaments: [SKShapeNode]
    private let embers: [SKSpriteNode]
    private var wake: [WakeSample]
    private var fil: [WakeSample]
    private var left: [CGPoint]
    private var right: [CGPoint]
    private let maxPoints: Int

    init(disc: SKTexture, slots: Int) {
        maxPoints = max(slots, 8)
        horizon = HorizonRibbon(maxPoints: slots + 2, colors: BrandColors.UI.plumeBands, widthScale: 0.7, alpha: 0.92 * 0.85)
        filaments = (0..<2).map { WakeCollect.shapeNode(z: 5.1 + CGFloat($0) * 0.01) }
        embers = (0..<maxPoints).map { _ in WakeCollect.sprite(disc, z: 5.3) }
        wake = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: maxPoints)
        fil = wake
        left = Array(repeating: .zero, count: maxPoints)
        right = Array(repeating: .zero, count: maxPoints)
        super.init()
        addChild(horizon)
        for n in filaments { addChild(n) }
        for n in embers { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.points(ctx, into: &wake, capacity: maxPoints)
        horizon.paint(pts: wake, count: n, radius: ctx.shipRadius)
        guard n >= 3 else {
            for f in filaments { f.isHidden = true }
            for e in embers { e.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let denom = CGFloat(max(n - 1, 1))
        let alpha: CGFloat = 0.92
        let offsets: [CGFloat] = [-0.42, 0.42]
        let colors = [BrandColors.UI.lanternGold, BrandColors.UI.ember]
        for f in 0..<2 {
            WakeCollect.filament(from: wake, count: n, r: r, offsetScale: offsets[f], energy: energy, into: &fil)
            filaments[f].path = WakeCollect.ribbonPath(pts: fil, count: n, widthAt: { i in
                let t = CGFloat(i) / denom
                return r * (0.04 + 0.1 * t) * self.fil[i].opacity * (1 + energy * 0.4 * t)
            }, left: &left, right: &right)
            filaments[f].fillColor = colors[f]
            filaments[f].alpha = alpha * (0.38 + energy * 0.2)
            filaments[f].isHidden = false
        }
        var used = 0
        for i in 0..<n {
            let p = wake[i]
            if p.opacity < 0.14 { continue }
            guard used < embers.count else { break }
            let leave = 1 - CGFloat(i) / denom
            let u = WakeCollect.fract(p.seed * 12.99 + CGFloat(i) * 0.29)
            let v = WakeCollect.fract(p.seed * 78.23 + CGFloat(i) * 0.13)
            let prev = wake[max(0, i - 1)]
            let next = wake[min(n - 1, i + 1)]
            let dx = next.x - prev.x
            let dy = next.y - prev.y
            let len = hypot(dx, dy)
            let inv = len > 0.0001 ? 1 / len : 1
            let nx = -dy * inv
            let ny = dx * inv
            let side = (u * 2 - 1) * r * (0.15 + 0.8 * leave) * (1 + energy * 0.8)
            let size = r * (0.028 + 0.06 * leave) * (0.5 + v * 0.6) * (1 + energy * 0.45)
            let node = embers[used]
            used += 1
            node.isHidden = false
            node.position = CGPoint(x: p.x + nx * side, y: p.y + ny * side)
            node.size = CGSize(width: size * 2, height: size * 2)
            node.color = leave > 0.55 ? BrandColors.UI.lanternGold : BrandColors.UI.ember
            node.alpha = alpha * p.opacity * (0.3 + 0.45 * leave)
        }
        for k in used..<embers.count { embers[k].isHidden = true }
    }
}

final class KoiWake: SKNode, SkinTrail {
    var node: SKNode { self }
    private let body: SKShapeNode
    private let core: SKShapeNode
    private let scales: [SKShapeNode]
    private var wake: [WakeSample]
    private var marks: [WakeSample]
    private var left: [CGPoint]
    private var right: [CGPoint]
    private let maxPoints: Int

    init(slots: Int) {
        maxPoints = max(slots, 8)
        body = WakeCollect.shapeNode(z: 5)
        core = WakeCollect.shapeNode(z: 5.05)
        scales = (0..<maxPoints).map { _ in
            let n = SKShapeNode()
            n.fillColor = .clear
            n.lineCap = .round
            n.isAntialiased = true
            n.zPosition = 5.2
            n.isHidden = true
            return n
        }
        wake = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: maxPoints)
        marks = wake
        left = Array(repeating: .zero, count: maxPoints)
        right = Array(repeating: .zero, count: maxPoints)
        super.init()
        addChild(body)
        addChild(core)
        for n in scales { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.points(ctx, into: &wake, capacity: maxPoints)
        guard n >= 3 else {
            body.isHidden = true
            core.isHidden = true
            for s in scales { s.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let denom = CGFloat(max(n - 1, 1))
        let bands = BrandColors.UI.koiBands
        let alpha: CGFloat = 0.9
        body.path = WakeCollect.ribbonPath(pts: wake, count: n, widthAt: { i in
            let t = CGFloat(i) / denom
            return r * (0.12 + 0.22 * t) * (0.5 + 0.5 * self.wake[i].opacity) * (1 + energy * 0.3 * t)
        }, left: &left, right: &right)
        body.fillColor = bands[0]
        body.alpha = alpha * 0.42
        body.isHidden = false
        core.path = WakeCollect.ribbonPath(pts: wake, count: n, widthAt: { i in
            r * (0.04 + 0.1 * (CGFloat(i) / denom)) * self.wake[i].opacity
        }, left: &left, right: &right)
        core.fillColor = bands[1]
        core.alpha = alpha * 0.55
        core.isHidden = false

        let m = WakeCollect.dense(ctx, into: &marks, capacity: marks.count)
        var used = 0
        for i in 0..<m {
            let p = marks[i]
            if p.opacity < 0.2 { continue }
            guard used < scales.count else { break }
            let leave = 1 - p.along
            let rx = r * (0.08 + 0.1 * p.opacity) * p.sx
            let ry = rx * 0.62 * p.sy
            let node = scales[used]
            used += 1
            node.position = CGPoint(x: p.x, y: p.y)
            node.path = CGPath(ellipseIn: CGRect(x: -rx, y: -ry, width: rx * 2, height: ry * 2), transform: nil)
            node.strokeColor = bands[i % bands.count]
            node.lineWidth = max(0.8, r * 0.045)
            node.alpha = alpha * p.opacity * (0.4 + 0.4 * leave + energy * 0.25)
            node.zRotation = -p.angle
            node.isHidden = false
        }
        for k in used..<scales.count { scales[k].isHidden = true }
    }
}

final class BorealWake: SKNode, SkinTrail {
    var node: SKNode { self }
    private let curtains: [SKShapeNode]
    private let motes: [SKSpriteNode]
    private var wake: [WakeSample]
    private var fil: [WakeSample]
    private var left: [CGPoint]
    private var right: [CGPoint]
    private let maxPoints: Int

    init(disc: SKTexture, slots: Int) {
        maxPoints = max(slots, 8)
        curtains = (0..<4).map { WakeCollect.shapeNode(z: 5 + CGFloat($0) * 0.01) }
        motes = (0..<maxPoints).map { _ in WakeCollect.sprite(disc, z: 5.3) }
        wake = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: maxPoints)
        fil = wake
        left = Array(repeating: .zero, count: maxPoints)
        right = Array(repeating: .zero, count: maxPoints)
        super.init()
        for n in curtains { addChild(n) }
        for n in motes { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.points(ctx, into: &wake, capacity: maxPoints)
        guard n >= 3 else {
            for c in curtains { c.isHidden = true }
            for m in motes { m.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let denom = CGFloat(max(n - 1, 1))
        let bands = BrandColors.UI.auroraBands
        let now = CGFloat(CACurrentMediaTime() * 1000)
        let bandN = bands.count
        let alpha: CGFloat = 0.9
        for b in 0..<bandN {
            let offset = ((CGFloat(b) / CGFloat(max(bandN - 1, 1))) * 2 - 1) * 0.42
            let wave = sin(now * 0.003 + CGFloat(b) * 0.9) * 0.12 * (1 + energy * 1.4)
            WakeCollect.filament(from: wake, count: n, r: r, offsetScale: offset + wave, energy: energy, into: &fil)
            curtains[b].path = WakeCollect.ribbonPath(pts: fil, count: n, widthAt: { i in
                let t = CGFloat(i) / denom
                return r * (0.04 + 0.11 * t) * self.fil[i].opacity * (1 + energy * 0.35 * t)
            }, left: &left, right: &right)
            curtains[b].fillColor = bands[b % bands.count]
            curtains[b].alpha = alpha * (0.4 + energy * 0.2)
            curtains[b].isHidden = false
        }
        var used = 0
        for i in 0..<n {
            let p = wake[i]
            if p.opacity < 0.16 { continue }
            let u = WakeCollect.fract(p.seed * 9.17 + CGFloat(i) * 0.21)
            if u > 0.55 { continue }
            guard used < motes.count else { break }
            let leave = 1 - CGFloat(i) / denom
            let node = motes[used]
            used += 1
            let size = r * (0.03 + 0.04 * leave)
            node.isHidden = false
            node.position = CGPoint(x: p.x, y: p.y)
            node.size = CGSize(width: size * 2, height: size * 2)
            node.color = bands[i % bands.count]
            node.alpha = alpha * p.opacity * (0.28 + 0.4 * leave)
        }
        for k in used..<motes.count { motes[k].isHidden = true }
    }
}

final class WishWake: SKNode, SkinTrail {
    var node: SKNode { self }
    private let bloom: SKShapeNode
    private let body: SKShapeNode
    private let core: SKShapeNode
    private let stars: [SKSpriteNode]
    private let arms: [SKShapeNode]
    private var wake: [WakeSample]
    private var left: [CGPoint]
    private var right: [CGPoint]
    private let maxPoints: Int

    init(disc: SKTexture, slots: Int) {
        maxPoints = max(slots, 8)
        bloom = WakeCollect.shapeNode(z: 4.9)
        body = WakeCollect.shapeNode(z: 5)
        core = WakeCollect.shapeNode(z: 5.05)
        stars = (0..<maxPoints).map { _ in WakeCollect.sprite(disc, z: 5.3) }
        arms = (0..<maxPoints).map { _ in
            let n = SKShapeNode()
            n.fillColor = .clear
            n.lineCap = .round
            n.isAntialiased = true
            n.zPosition = 5.25
            n.isHidden = true
            return n
        }
        wake = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: maxPoints)
        left = Array(repeating: .zero, count: maxPoints)
        right = Array(repeating: .zero, count: maxPoints)
        super.init()
        addChild(bloom)
        addChild(body)
        addChild(core)
        for n in stars { addChild(n) }
        for n in arms { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.points(ctx, into: &wake, capacity: maxPoints)
        guard n >= 3 else {
            bloom.isHidden = true
            body.isHidden = true
            core.isHidden = true
            for s in stars { s.isHidden = true }
            for a in arms { a.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let denom = CGFloat(max(n - 1, 1))
        let alpha: CGFloat = 0.94
        let gold = BrandColors.UI.lanternGold
        let bands = BrandColors.UI.wishBands
        bloom.path = WakeCollect.ribbonPath(pts: wake, count: n, widthAt: { i in
            let t = CGFloat(i) / denom
            return r * (0.1 + 0.22 * t) * (0.5 + 0.5 * self.wake[i].opacity) * (1 + energy * 0.45)
        }, left: &left, right: &right)
        bloom.fillColor = gold
        bloom.alpha = alpha * (0.28 + energy * 0.22)
        bloom.isHidden = false
        body.path = WakeCollect.ribbonPath(pts: wake, count: n, widthAt: { i in
            let t = CGFloat(i) / denom
            return r * (0.045 + 0.12 * t) * self.wake[i].opacity * (1 + energy * 0.25 * t)
        }, left: &left, right: &right)
        body.fillColor = gold
        body.alpha = alpha * (0.78 + energy * 0.16)
        body.isHidden = false
        core.path = WakeCollect.ribbonPath(pts: wake, count: n, widthAt: { i in
            let t = CGFloat(i) / denom
            return r * (0.016 + 0.045 * t) * self.wake[i].opacity * (1 + energy * 0.2)
        }, left: &left, right: &right)
        core.fillColor = BrandColors.UI.wishCore
        core.alpha = alpha * 0.92
        core.isHidden = false

        let starChance: CGFloat = energy > 0.08 ? 0.88 : 0.52
        var used = 0
        for i in 0..<n {
            let p = wake[i]
            if p.opacity < 0.14 { continue }
            let u = WakeCollect.fract(p.seed * 12.9898 + CGFloat(i) * 0.37)
            if u > starChance { continue }
            guard used < stars.count else { break }
            let v = WakeCollect.fract(p.seed * 78.233 + CGFloat(i) * 0.19)
            let w = WakeCollect.fract(p.seed * 4.1414 + CGFloat(i) * 0.11)
            let leave = 1 - CGFloat(i) / denom
            let prev = wake[max(0, i - 1)]
            let next = wake[min(n - 1, i + 1)]
            let dx = next.x - prev.x
            let dy = next.y - prev.y
            let len = hypot(dx, dy)
            let inv = len > 0.0001 ? 1 / len : 1
            let nx = -dy * inv
            let ny = dx * inv
            let side = (u * 2 - 1) * r * (0.15 + 0.85 * leave) * (1 + energy * 1.1)
            let size = r * (0.035 + 0.055 * leave) * (0.55 + v * 0.6) * (1 + energy * 0.55)
            let rgb = bands[(i + Int(w * CGFloat(bands.count))) % bands.count]
            let sx = p.x + nx * side
            let sy = p.y + ny * side
            let fade = alpha * p.opacity * (0.38 + 0.4 * leave + energy * 0.4)
            let star = stars[used]
            star.isHidden = false
            star.position = CGPoint(x: sx, y: sy)
            star.size = CGSize(width: size * 0.9, height: size * 0.9)
            star.color = rgb
            star.alpha = fade
            let armLen = size * (w > 0.45 || energy > 0.1 ? 2.6 : 1.8)
            let path = CGMutablePath()
            path.move(to: CGPoint(x: sx - armLen, y: sy))
            path.addLine(to: CGPoint(x: sx + armLen, y: sy))
            path.move(to: CGPoint(x: sx, y: sy - armLen))
            path.addLine(to: CGPoint(x: sx, y: sy + armLen))
            let arm = arms[used]
            arm.path = path
            arm.strokeColor = rgb
            arm.lineWidth = max(0.6, r * 0.03)
            arm.alpha = fade
            arm.isHidden = false
            used += 1
        }
        for k in used..<stars.count {
            stars[k].isHidden = true
            arms[k].isHidden = true
        }
    }
}

final class DarnerWake: SKNode, SkinTrail {
    var node: SKNode { self }
    private let filaments: [SKShapeNode]
    private let specks: [SKShapeNode]
    private var wake: [WakeSample]
    private var fil: [WakeSample]
    private var left: [CGPoint]
    private var right: [CGPoint]
    private let maxPoints: Int

    init(slots: Int) {
        maxPoints = max(slots, 8)
        filaments = (0..<2).map { WakeCollect.shapeNode(z: 5 + CGFloat($0) * 0.01) }
        specks = (0..<maxPoints).map { _ in
            let n = SKShapeNode()
            n.strokeColor = .clear
            n.isAntialiased = true
            n.zPosition = 5.2
            n.isHidden = true
            return n
        }
        wake = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: maxPoints)
        fil = wake
        left = Array(repeating: .zero, count: maxPoints)
        right = Array(repeating: .zero, count: maxPoints)
        super.init()
        for n in filaments { addChild(n) }
        for n in specks { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.points(ctx, into: &wake, capacity: maxPoints)
        guard n >= 3 else {
            for f in filaments { f.isHidden = true }
            for s in specks { s.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let denom = CGFloat(max(n - 1, 1))
        let bands = BrandColors.UI.darnerBands
        let alpha: CGFloat = 0.9
        let offsets: [CGFloat] = [-0.46, 0.46]
        for f in 0..<2 {
            WakeCollect.filament(from: wake, count: n, r: r, offsetScale: offsets[f], energy: energy, into: &fil)
            filaments[f].path = WakeCollect.ribbonPath(pts: fil, count: n, widthAt: { i in
                let t = CGFloat(i) / denom
                return r * (0.04 + 0.11 * t) * self.fil[i].opacity * (1 + energy * 0.45 * t)
            }, left: &left, right: &right)
            filaments[f].fillColor = bands[f % bands.count]
            filaments[f].alpha = alpha * (0.4 + energy * 0.22)
            filaments[f].isHidden = false
        }
        let chance: CGFloat = energy > 0.08 ? 0.9 : 0.55
        var used = 0
        for i in 0..<n {
            let p = wake[i]
            if p.opacity < 0.14 { continue }
            let u = WakeCollect.fract(p.seed * 12.99 + CGFloat(i) * 0.31)
            if u > chance { continue }
            guard used < specks.count else { break }
            let v = WakeCollect.fract(p.seed * 78.23 + CGFloat(i) * 0.19)
            let w = WakeCollect.fract(p.seed * 4.14 + CGFloat(i) * 0.11)
            let leave = 1 - CGFloat(i) / denom
            let prev = wake[max(0, i - 1)]
            let next = wake[min(n - 1, i + 1)]
            let dx = next.x - prev.x
            let dy = next.y - prev.y
            let len = hypot(dx, dy)
            let inv = len > 0.0001 ? 1 / len : 1
            let nx = -dy * inv
            let ny = dx * inv
            let side = (u * 2 - 1) * r * (0.18 + 0.9 * leave) * (1 + energy * 1.05)
            let size = r * (0.03 + 0.055 * leave) * (0.55 + v * 0.55) * (1 + energy * 0.5)
            let rgb = bands[(i + Int(w * CGFloat(bands.count))) % bands.count]
            let x = p.x + nx * side
            let y = p.y + ny * side
            let path = CGMutablePath()
            path.move(to: CGPoint(x: x, y: y - size))
            path.addLine(to: CGPoint(x: x + size * 0.62, y: y))
            path.addLine(to: CGPoint(x: x, y: y + size))
            path.addLine(to: CGPoint(x: x - size * 0.62, y: y))
            path.closeSubpath()
            let node = specks[used]
            used += 1
            node.path = path
            node.fillColor = rgb
            node.alpha = alpha * p.opacity * (0.34 + 0.42 * leave + energy * 0.38)
            node.isHidden = false
        }
        for k in used..<specks.count { specks[k].isHidden = true }
    }
}

final class PuffWake: SKNode, SkinTrail {
    var node: SKNode { self }
    private let ribbon: SKShapeNode
    private let vees: [SKShapeNode]
    private let discs: [SKSpriteNode]
    private var wake: [WakeSample]
    private var left: [CGPoint]
    private var right: [CGPoint]
    private let maxPoints: Int

    init(disc: SKTexture, slots: Int) {
        maxPoints = max(slots, 8)
        ribbon = WakeCollect.shapeNode(z: 5)
        let seeds = min(400, maxPoints * 2)
        vees = (0..<seeds).map { _ in
            let n = SKShapeNode()
            n.fillColor = .clear
            n.lineCap = .round
            n.lineJoin = .round
            n.isAntialiased = true
            n.zPosition = 5.2
            n.isHidden = true
            return n
        }
        discs = (0..<seeds).map { _ in WakeCollect.sprite(disc, z: 5.25) }
        wake = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: maxPoints)
        left = Array(repeating: .zero, count: maxPoints)
        right = Array(repeating: .zero, count: maxPoints)
        super.init()
        addChild(ribbon)
        for n in vees { addChild(n) }
        for n in discs { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.points(ctx, into: &wake, capacity: maxPoints)
        guard n >= 3 else {
            ribbon.isHidden = true
            for v in vees { v.isHidden = true }
            for d in discs { d.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let denom = CGFloat(max(n - 1, 1))
        let alpha: CGFloat = 0.9
        ribbon.path = WakeCollect.ribbonPath(pts: wake, count: n, widthAt: { i in
            let t = CGFloat(i) / denom
            return r * (0.03 + 0.08 * t) * self.wake[i].opacity * (1 + energy * 0.25 * t)
        }, left: &left, right: &right)
        ribbon.fillColor = BrandColors.UI.ink
        ribbon.alpha = alpha * (0.42 + energy * 0.2)
        ribbon.isHidden = false
        let chance: CGFloat = energy > 0.08 ? 0.92 : 0.88
        var used = 0
        for i in 0..<n {
            let p = wake[i]
            if p.opacity < 0.14 { continue }
            let leave = 1 - CGFloat(i) / denom
            let prev = wake[max(0, i - 1)]
            let next = wake[min(n - 1, i + 1)]
            let dx = next.x - prev.x
            let dy = next.y - prev.y
            let len = hypot(dx, dy)
            let inv = len > 0.0001 ? 1 / len : 1
            let nx = -dy * inv
            let ny = dx * inv
            for k in 0..<2 {
                let u = WakeCollect.fract(p.seed * 12.99 + CGFloat(i) * 0.29 + CGFloat(k) * 0.618)
                if u > chance { continue }
                guard used < vees.count else { break }
                let v = WakeCollect.fract(p.seed * 78.23 + CGFloat(i) * 0.17 + CGFloat(k) * 0.37)
                let w = WakeCollect.fract(p.seed * 4.14 + CGFloat(i) * 0.13 + CGFloat(k) * 0.11)
                let drift = (u * 2 - 1) * r * (0.22 + 1.05 * leave) * (1 + energy * 1.15)
                let along = (v * 2 - 1) * r * 0.22 * leave
                let sx = p.x + nx * drift + ny * along
                let sy = p.y + ny * drift - nx * along
                let size = r * (0.06 + 0.10 * leave) * (0.55 + w * 0.55) * (1 + energy * 0.5)
                let rgb = w > 0.5 ? BrandColors.UI.lanternGold : BrandColors.UI.lanternTeal
                let fade = alpha * p.opacity * (0.55 + 0.35 * leave + energy * 0.35)
                let path = CGMutablePath()
                path.move(to: CGPoint(x: sx - size, y: sy + size * 0.15))
                path.addLine(to: CGPoint(x: sx, y: sy - size * 0.55))
                path.addLine(to: CGPoint(x: sx + size, y: sy + size * 0.15))
                let vee = vees[used]
                vee.path = path
                vee.strokeColor = BrandColors.UI.ink
                vee.lineWidth = max(0.7, r * 0.032)
                vee.alpha = fade
                vee.isHidden = false
                let disc = discs[used]
                disc.isHidden = false
                disc.position = CGPoint(x: sx, y: sy + size * 0.22)
                disc.size = CGSize(width: size * 0.64, height: size * 0.64)
                disc.color = rgb
                disc.alpha = fade
                used += 1
            }
        }
        for k in used..<vees.count {
            vees[k].isHidden = true
            discs[k].isHidden = true
        }
    }
}

final class ArgusWake: SKNode, SkinTrail {
    var node: SKNode { self }
    private let rims: [SKSpriteNode]
    private let pupils: [SKSpriteNode]
    private let inks: [SKSpriteNode]
    private var marks: [WakeSample]
    private let maxMarks: Int

    init(ring: SKTexture, disc: SKTexture, slots: Int) {
        maxMarks = max(slots, 8)
        marks = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: maxMarks)
        rims = (0..<maxMarks).map { _ in WakeCollect.sprite(ring, z: 5) }
        pupils = (0..<maxMarks).map { _ in WakeCollect.sprite(disc, z: 5.1) }
        inks = (0..<maxMarks).map { _ in WakeCollect.sprite(disc, z: 5.15) }
        super.init()
        for n in rims { addChild(n) }
        for n in pupils { addChild(n) }
        for n in inks { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let m = WakeCollect.dense(ctx, into: &marks, capacity: marks.count)
        guard m >= 2 else {
            for n in rims { n.isHidden = true }
            for n in pupils { n.isHidden = true }
            for n in inks { n.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let alpha: CGFloat = 0.9
        var used = 0
        for i in stride(from: m - 1, through: 0, by: -1) {
            let p = marks[i]
            if p.opacity < 0.16 { continue }
            guard used < rims.count else { break }
            let leave = 1 - p.along
            let ringR = r * (0.1 + 0.22 * leave) * p.scale * p.sx * (1 + energy * 0.35)
            let fade = alpha * p.opacity * (0.62 + 0.32 * leave + energy * 0.28)
            let ry = ringR * 0.78 * p.sy
            let rim = rims[used]
            rim.isHidden = false
            rim.position = CGPoint(x: p.x, y: p.y)
            rim.size = CGSize(width: ringR * 2, height: ry * 2)
            rim.color = BrandColors.UI.argusTeal
            rim.alpha = fade
            rim.zRotation = -p.angle
            let pupil = pupils[used]
            pupil.isHidden = false
            pupil.position = CGPoint(x: p.x, y: p.y)
            pupil.size = CGSize(width: ringR * 0.64, height: ringR * 0.52 * p.sy)
            pupil.color = BrandColors.UI.lanternGold
            pupil.alpha = fade * 0.85
            pupil.zRotation = -p.angle
            let ink = inks[used]
            if leave > 0.2 {
                ink.isHidden = false
                ink.position = CGPoint(x: p.x, y: p.y)
                ink.size = CGSize(width: ringR * 0.24, height: ringR * 0.2 * p.sy)
                ink.color = BrandColors.UI.ink
                ink.alpha = fade * 0.55
                ink.zRotation = -p.angle
            } else {
                ink.isHidden = true
            }
            used += 1
        }
        for k in used..<rims.count {
            rims[k].isHidden = true
            pupils[k].isHidden = true
            inks[k].isHidden = true
        }
    }
}

final class ChimeWake: SKNode, SkinTrail {
    var node: SKNode { self }
    private let arcs: [SKShapeNode]
    private let notes: [SKSpriteNode]
    private let stems: [SKShapeNode]
    private var marks: [WakeSample]
    private let maxMarks: Int

    init(disc: SKTexture, slots: Int) {
        maxMarks = max(slots, 8)
        marks = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: maxMarks * 2)
        arcs = (0..<maxMarks).map { _ in
            let n = SKShapeNode()
            n.fillColor = .clear
            n.lineCap = .round
            n.isAntialiased = true
            n.zPosition = 5
            n.isHidden = true
            return n
        }
        notes = (0..<(maxMarks * 2)).map { _ in WakeCollect.sprite(disc, z: 5.2) }
        stems = (0..<(maxMarks * 2)).map { _ in
            let n = SKShapeNode()
            n.fillColor = .clear
            n.lineCap = .round
            n.isAntialiased = true
            n.zPosition = 5.15
            n.isHidden = true
            return n
        }
        super.init()
        for n in arcs { addChild(n) }
        for n in notes { addChild(n) }
        for n in stems { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let m = WakeCollect.dense(ctx, into: &marks, capacity: marks.count, subdiv: 1)
        guard m >= 2 else {
            for a in arcs { a.isHidden = true }
            for n in notes { n.isHidden = true }
            for s in stems { s.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let t = WallJelly.isLive(elapsedMs: ctx.jellyElapsedMs, mode: .ripple)
            ? min(1, max(0, ctx.jellyElapsedMs / WallJelly.trailWaveMs)) : 1
        let alpha: CGFloat = 0.9
        var ai = 0
        for i in 0..<m {
            let p = marks[i]
            if p.opacity < 0.16 { continue }
            guard ai < arcs.count else { break }
            let leave = 1 - p.along
            let age = 1 - p.opacity
            let pulse = energy > 0 ? 1 + energy * 0.7 * sin(.pi * t) * p.opacity : 1
            let arcR = r * (0.16 + age * 0.95) * pulse * p.sx
            let rgb = i % 2 == 0 ? BrandColors.UI.lanternGold : BrandColors.UI.ink
            let path = CGMutablePath()
            var tform = CGAffineTransform(scaleX: 1, y: 0.55 * p.sy)
            path.addArc(center: .zero, radius: arcR, startAngle: .pi * 0.15, endAngle: .pi * 0.85, clockwise: false, transform: tform)
            let node = arcs[ai]
            node.position = CGPoint(x: p.x, y: p.y)
            node.path = path
            node.strokeColor = rgb
            node.lineWidth = max(0.9, r * (0.05 + 0.03 * leave))
            node.alpha = alpha * p.opacity * (0.5 + 0.4 * leave + energy * 0.28)
            node.zRotation = -p.angle
            node.isHidden = false
            ai += 1
        }
        for k in ai..<arcs.count { arcs[k].isHidden = true }

        let noteChance: CGFloat = energy > 0.08 ? 0.94 : 0.88
        var ni = 0
        for i in 0..<m {
            let p = marks[i]
            if p.opacity < 0.14 { continue }
            let u = WakeCollect.fract(p.seed * 12.99 + CGFloat(i) * 0.33)
            if u > noteChance { continue }
            let leave = 1 - p.along
            let prev = marks[max(0, i - 1)]
            let next = marks[min(m - 1, i + 1)]
            let dx = next.x - prev.x
            let dy = next.y - prev.y
            let len = hypot(dx, dy)
            let inv = len > 0.0001 ? 1 / len : 1
            let nx = -dy * inv
            let ny = dx * inv
            for k in 0..<2 {
                guard ni < notes.count else { break }
                let hk = WakeCollect.fract(p.seed * (12.99 + CGFloat(k) * 17.3) + CGFloat(i) * 0.33)
                let vk = WakeCollect.fract(p.seed * (78.23 + CGFloat(k) * 11.1) + CGFloat(i) * 0.21)
                let side = (k == 0 ? 1 : -1) * abs(hk * 2 - 1) * r * (0.16 + 0.8 * leave) * (1 + energy * 0.95)
                let sx = p.x + nx * side
                let sy = p.y + ny * side
                let size = r * (0.032 + 0.05 * leave) * (0.55 + vk * 0.5) * (1 + energy * 0.45)
                let goldNote = vk > 0.45
                let rgb = goldNote ? BrandColors.UI.lanternGold : BrandColors.UI.ink
                let fade = alpha * p.opacity * (0.55 + 0.35 * leave + energy * 0.35)
                let note = notes[ni]
                note.isHidden = false
                note.position = CGPoint(x: sx, y: sy + size * 0.35)
                note.size = CGSize(width: size * 1.1, height: size * 1.1)
                note.color = rgb
                note.alpha = fade
                let stem = stems[ni]
                let path = CGMutablePath()
                path.move(to: CGPoint(x: sx + size * 0.4, y: sy + size * 0.35))
                path.addLine(to: CGPoint(x: sx + size * 0.4, y: sy - size * 1.35))
                stem.path = path
                stem.strokeColor = goldNote ? BrandColors.UI.ink : rgb
                stem.lineWidth = max(0.6, r * 0.028)
                stem.alpha = fade
                stem.isHidden = false
                ni += 1
            }
        }
        for k in ni..<notes.count {
            notes[k].isHidden = true
            stems[k].isHidden = true
        }
    }
}
