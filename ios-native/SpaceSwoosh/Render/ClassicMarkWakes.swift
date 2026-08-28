// ClassicMarkWakes.swift
// Changes: Seal paired aft vortex commas (crush then peel); Cloud trail uses Android 6–9 dots/point.

import SpriteKit

final class ChevronTrailNode: SKNode, SkinTrail {
    var node: SKNode { self }
    private let marks: [SKShapeNode]
    private var samples: [WakeSample]
    private let maxMarks: Int

    init(maxPoints: Int) {
        maxMarks = max(maxPoints * 2, 16)
        samples = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: maxMarks)
        marks = (0..<maxMarks).map { _ in
            let n = WakeCollect.shapeNode(z: 5)
            n.fillColor = .clear
            n.lineCap = .round
            n.lineJoin = .round
            return n
        }
        super.init()
        for m in marks { addChild(m) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.dense(ctx, into: &samples, capacity: samples.count, subdiv: 1)
        guard n >= 1 else {
            for m in marks { m.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let side: CGFloat = ctx.jellySide < 0 ? -1 : 1
        for i in 0..<n {
            let p = samples[i]
            let fan = energy * (p.seed * 2 - 1) * 0.55 * (0.5 + 0.5 * (1 - p.along))
            let armX = r * (0.22 + 0.38 * p.opacity) * p.scale * p.sx * (1 + energy * 0.35)
            let armY = r * (0.22 + 0.38 * p.opacity) * p.scale * p.sy
            let path = CGMutablePath()
            path.move(to: CGPoint(x: -armX * 0.7, y: -armY * 0.55))
            path.addLine(to: CGPoint(x: 0, y: armY * 0.15))
            path.addLine(to: CGPoint(x: armX * 0.7, y: -armY * 0.55))
            let node = marks[i]
            node.path = path
            node.position = CGPoint(x: p.x + side * r * 0.15 * energy * (1 - p.along), y: p.y)
            node.zRotation = -p.angle - fan
            node.strokeColor = BrandColors.UI.ink
            node.lineWidth = r * (0.05 + 0.08 * p.opacity) * p.scale
            node.alpha = p.opacity * 0.88
            node.isHidden = false
        }
        for i in n..<marks.count { marks[i].isHidden = true }
    }
}

final class RingTrailField: SKNode, SkinTrail {
    var node: SKNode { self }
    private let rings: [SKSpriteNode]
    private let fills: [SKSpriteNode]
    private var samples: [WakeSample]
    private let bubble: Bool

    init(ring: SKTexture, disc: SKTexture, maxPoints: Int, bubble: Bool) {
        self.bubble = bubble
        let slots = max(maxPoints, 8)
        samples = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: slots * 2)
        rings = (0..<slots).map { _ in WakeCollect.sprite(ring, z: 5) }
        fills = (0..<slots).map { _ in WakeCollect.sprite(disc, z: 4.9) }
        super.init()
        for n in fills { addChild(n) }
        for n in rings { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.dense(ctx, into: &samples, capacity: samples.count, subdiv: 1)
        guard n >= 1 else {
            for r in rings { r.isHidden = true }
            for f in fills { f.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = bubble ? WallJelly.energy(elapsedMs: ctx.jellyElapsedMs) : 0
        let t = bubble && WallJelly.isLive(elapsedMs: ctx.jellyElapsedMs, mode: ctx.skin.wallTrailMode)
            ? min(1, max(0, ctx.jellyElapsedMs / GameConfig.Flicker.wallJellyMs)) : 1
        let side: CGFloat = ctx.jellySide < 0 ? -1 : 1
        var used = 0
        for i in stride(from: n - 1, through: 0, by: -1) {
            guard used < rings.count else { break }
            let p = samples[i]
            let age = 1 - p.opacity
            var inflate: CGFloat = 1
            var stack: CGFloat = 0
            var pop: CGFloat = 1
            if energy > 0, p.opacity > 0.35 {
                let youth = p.opacity
                inflate = 1 + energy * 1.4 * youth * sin(.pi * min(1, t * 1.6))
                stack = side * r * 0.55 * energy * youth * youth * CGFloat(i % 3) * 0.22
                pop = t < 0.55 ? 1 : max(0.15, 1 - (t - 0.55) * 2.2 * energy)
            }
            let ringR = r * (0.16 + age * 0.95) * p.scale * inflate * pop
            let fade = p.opacity * 0.72 * (0.4 + 0.6 * (1 - age)) * pop
            let sx = p.sx * (bubble && energy > 0 ? 1 + energy * 0.15 : 1)
            let sy = p.sy
            let ring = rings[used]
            let fill = fills[used]
            used += 1
            ring.isHidden = false
            ring.position = CGPoint(x: p.x + stack, y: p.y)
            ring.size = CGSize(width: ringR * 2 * sx, height: ringR * 2 * sy)
            ring.alpha = fade
            ring.color = BrandColors.UI.ink
            if p.opacity > 0.55 {
                fill.isHidden = false
                fill.position = ring.position
                fill.size = CGSize(width: ringR * 0.9 * sx, height: ringR * 0.9 * sy)
                fill.alpha = fade * (0.22 + energy * 0.18)
                fill.color = BrandColors.UI.ink
            } else {
                fill.isHidden = true
            }
        }
        for i in used..<rings.count {
            rings[i].isHidden = true
            fills[i].isHidden = true
        }
    }
}

final class CloudTrailField: SKNode, SkinTrail {
    var node: SKNode { self }
    private let dots: [SKSpriteNode]
    private let color: UIColor
    private let density: CGFloat
    private let rippleScale: CGFloat
    private let scatterDust: Bool
    private let scatterWidth: CGFloat
    private let skin: SkinDef

    init(disc: SKTexture, skin: SkinDef, color: UIColor, density: CGFloat, rippleScale: CGFloat, scatterDust: Bool, scatterWidth: CGFloat) {
        self.skin = skin
        self.color = color
        self.density = density
        self.rippleScale = rippleScale
        self.scatterDust = scatterDust
        self.scatterWidth = scatterWidth
        let pool = max(skin.trailMaxPoints, 8) * max(9, Int((9 * density).rounded()))
        dots = (0..<pool).map { _ in WakeCollect.sprite(disc, z: 5) }
        super.init()
        for d in dots { addChild(d) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let live = WallJelly.isLive(elapsedMs: ctx.jellyElapsedMs, mode: skin.wallTrailMode)
        let energy = skin.trailRipple ? 0 : WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let rippleElapsed = skin.trailRipple && live ? ctx.jellyElapsedMs : -1
        let deformK = skin.trailRipple ? rippleScale : 1
        let n = ctx.trail.count
        let denom = CGFloat(max(n - 1, 1))
        let r = ctx.shipRadius
        let screenY: (CGFloat) -> CGFloat = { ctx.sceneHeight * CinematicFlight.cruiseSeat + ($0 - ctx.cameraY) }
        var used = 0
        for i in stride(from: n - 1, through: 0, by: -1) {
            guard used < dots.count else { break }
            let src = ctx.trail[i]
            let along = n <= 1 ? 1 : CGFloat(i) / denom
            var dx: CGFloat = 0
            var dy: CGFloat = 0
            var sx: CGFloat = 1
            if live {
                let d = WallJelly.deform(
                    mode: skin.wallTrailMode, elapsedMs: ctx.jellyElapsedMs,
                    along: along, side: ctx.jellySide, radius: r, seed: src.seed
                )
                dx = d.dx * deformK
                dy = d.dy * deformK
                sx = 1 + (d.sx - 1) * deformK
            }
            let age = 1 - src.opacity
            let env = rippleElapsed >= 0 ? WallJelly.rippleEnvelope(elapsedMs: rippleElapsed, along: along) * rippleScale : 0
            let condense: CGFloat = energy > 0 ? (1 - energy * along * 0.65) : 1
            let count = max(1, Int(((6 + WakeCollect.fract(src.seed * 17.13) * 3) * density).rounded()))
            let sizeBoost: CGFloat = env > 0 ? 1 + env * 1.2 : 1
            let spreadBoost = 1 + env * 0.85 + energy * 0.95
            let prevY = i > 0 ? ctx.trail[i - 1].y : src.y
            let nextY = i < n - 1 ? ctx.trail[i + 1].y : src.y
            let prevX = i > 0 ? ctx.trail[i - 1].x : src.x
            let nextX = i < n - 1 ? ctx.trail[i + 1].x : src.x
            for k in 0..<count {
                guard used < dots.count else { break }
                let node = dots[used]
                used += 1
                var specX: CGFloat
                var specY: CGFloat
                var radial: CGFloat
                var size: CGFloat
                if scatterDust {
                    let h = src.seed * 41.17 + CGFloat(k) * 19.19 + CGFloat(i) * 0.031
                    let tx = nextX - prevX
                    let ty = nextY - prevY
                    let len = hypot(tx, ty)
                    let inv = len > 0.0001 ? 1 / len : 1
                    let ux = tx * inv
                    let uy = ty * inv
                    let alongN = (hash11(h + 0.11) * 2 - 1) * (len * 0.48)
                    let sideU = hash11(h + 2.27) * 2 - 1
                    let side = sideU * sideU * sideU
                    let spread = r * (0.14 + age * 0.7) * spreadBoost * scatterWidth
                    specX = src.x + dx + ux * alongN - uy * side * spread * condense
                    specY = screenY(src.y + dy + uy * alongN + ux * side * spread * condense)
                    radial = min(1, abs(side) * 0.85 + abs(alongN) / (len + r) * 0.35)
                    let w = hash11(h + 5.91)
                    size = r * (0.03 + 0.08 * src.opacity) * (0.35 + w * 0.8) * sx * sizeBoost
                } else {
                    let u = WakeCollect.fract(src.seed * 12.9898 + CGFloat(k) * 0.6180339887)
                    let v = WakeCollect.fract(src.seed * 78.233 + CGFloat(k) * 0.3819660113)
                    let w = WakeCollect.fract(src.seed * 4.1414 + CGFloat(k) * 0.7548776662)
                    let ang = u * .pi * 2
                    radial = sqrt(v)
                    let spread = r * (0.28 + age * 1.15) * spreadBoost * (0.35 + 0.9 * radial)
                    size = r * (0.04 + 0.07 * src.opacity) * (0.55 + w * 0.45) * sx * sizeBoost
                    specX = src.x + dx + cos(ang) * spread * condense
                    specY = screenY(src.y + dy) + sin(ang) * spread * condense
                }
                node.isHidden = false
                node.position = CGPoint(x: specX, y: specY)
                node.size = CGSize(width: size * 2, height: size * 2)
                node.alpha = src.opacity * 0.78 * (0.4 + 0.6 * (1 - radial * 0.55)) * (env > 0 ? 1 + env * 0.7 : 1)
                node.color = color
            }
        }
        for i in used..<dots.count { dots[i].isHidden = true }
    }

    private func hash11(_ n: CGFloat) -> CGFloat {
        WakeCollect.fract(sin(n) * 43758.5453123)
    }
}

final class StampTrailField: SKNode, SkinTrail {
    var node: SKNode { self }
    private let tiles: [SKSpriteNode]
    private var samples: [WakeSample]

    init(maxPoints: Int) {
        let slots = max(maxPoints * 2, 16)
        samples = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: slots)
        tiles = (0..<slots).map { _ in
            let n = SKSpriteNode(color: BrandColors.UI.ink, size: CGSize(width: 8, height: 8))
            n.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            n.colorBlendFactor = 1
            n.zPosition = 5
            n.isHidden = true
            return n
        }
        super.init()
        for t in tiles { addChild(t) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.dense(ctx, into: &samples, capacity: samples.count, subdiv: 1)
        guard n >= 1 else {
            for t in tiles { t.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let t = WallJelly.isLive(elapsedMs: ctx.jellyElapsedMs, mode: .blot)
            ? min(1, max(0, ctx.jellyElapsedMs / GameConfig.Flicker.wallJellyMs)) : 1
        for i in 0..<n {
            let p = samples[i]
            var blot: CGFloat = 1
            var peel: CGFloat = 0
            if energy > 0 {
                blot = 1 + energy * 1.6 * p.along * p.along * (t < 0.45 ? 1 : max(0.2, 1.3 - t))
                peel = energy * (1 - p.along) * max(0, t - 0.35) * r * 0.4
            }
            let half = r * (0.14 + 0.22 * p.opacity) * p.scale * blot
            let node = tiles[i]
            node.isHidden = false
            node.position = CGPoint(x: p.x, y: p.y + peel)
            node.zRotation = -p.angle
            node.size = CGSize(width: half * 2 * p.sx, height: half * 2 * p.sy)
            node.alpha = p.opacity * 0.82
            node.color = BrandColors.UI.ink
        }
        for i in n..<tiles.count { tiles[i].isHidden = true }
    }
}

final class VortexTrailField: SKNode, SkinTrail {
    var node: SKNode { self }
    private let hair: SKShapeNode
    private let commas: [SKShapeNode]
    private var wake: [WakeSample]
    private var samples: [WakeSample]
    private let maxPoints: Int

    init(maxPoints: Int) {
        self.maxPoints = max(maxPoints, 8)
        let slots = max(maxPoints * 2, 16)
        wake = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: self.maxPoints)
        samples = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: slots)
        hair = WakeCollect.shapeNode(z: 4.9)
        hair.fillColor = .clear
        hair.lineCap = .round
        hair.lineJoin = .round
        commas = (0..<slots).map { _ in
            let n = WakeCollect.shapeNode(z: 5)
            n.strokeColor = .clear
            n.lineCap = .round
            n.lineJoin = .round
            return n
        }
        super.init()
        addChild(hair)
        for c in commas { addChild(c) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let pn = WakeCollect.points(ctx, into: &wake, capacity: maxPoints)
        let n = WakeCollect.dense(ctx, into: &samples, capacity: samples.count, subdiv: 1)
        guard pn >= 2, n >= 1 else {
            hair.isHidden = true
            hair.path = nil
            for c in commas { c.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        hair.path = ClassicWakePath.smooth(wake, count: pn)
        hair.strokeColor = BrandColors.UI.ink
        hair.lineWidth = max(0.7, r * 0.045)
        hair.alpha = 0.42
        hair.isHidden = false

        let elapsed = ctx.jellyElapsedMs
        var ci = 0
        let step = 2
        let start = n - 2
        if start >= 0 {
            for i in stride(from: start, through: 0, by: -step) {
                guard ci + 1 < commas.count else { break }
                let p = samples[i]
                let crush = WallJelly.rippleEnvelope(elapsedMs: elapsed, along: p.along, width: 0.16, travel: 0.68)
                let peelEnv = WallJelly.rippleEnvelope(
                    elapsedMs: elapsed - 110,
                    along: p.along,
                    durationMs: WallJelly.trailWaveMs + 80,
                    width: 0.18,
                    travel: 0.82
                )
                let blot: CGFloat = 1 + crush * 2.15
                let spread: CGFloat = 1 + crush * 0.45
                let rad = r * (0.1 + 0.16 * p.opacity) * p.scale * blot
                let prev = samples[max(0, i - 1)]
                let next = samples[min(n - 1, i + 1)]
                let dx = next.x - prev.x
                let dy = next.y - prev.y
                let len = hypot(dx, dy)
                let inv: CGFloat = len > 0.0001 ? 1 / len : 1
                let tx = dx * inv
                let ty = dy * inv
                let aft = r * 0.38
                let sep = r * (0.09 + 0.03 * p.opacity) * p.sx * spread
                let peelN = peelEnv * r * 0.28
                let peelAft = peelEnv * r * 0.28
                let alpha = p.opacity * 0.86 * (1 - peelEnv * 0.32)
                let ax = p.x - tx * (aft + peelAft)
                let ay = p.y - ty * (aft + peelAft)
                for side in [CGFloat(1), CGFloat(-1)] {
                    let path = CGMutablePath()
                    path.move(to: CGPoint(x: side * (sep + peelN), y: 0))
                    path.addQuadCurve(to: CGPoint(x: side * (sep + peelN) + side * rad * 0.42, y: -rad * 1.05),
                                      control: CGPoint(x: side * (sep + peelN) + side * rad * 1.25, y: -rad * 0.28))
                    path.addQuadCurve(to: CGPoint(x: side * (sep + peelN), y: 0),
                                      control: CGPoint(x: side * (sep + peelN) + side * rad * 0.08, y: -rad * 0.38))
                    path.closeSubpath()
                    let node = commas[ci]
                    ci += 1
                    node.isHidden = false
                    node.path = path
                    node.position = CGPoint(x: ax, y: ay)
                    node.zRotation = -p.angle
                    node.fillColor = BrandColors.UI.ink
                    node.alpha = alpha
                }
            }
        }
        for i in ci..<commas.count { commas[i].isHidden = true }
    }
}

final class TickTrailNode: SKNode, SkinTrail {
    var node: SKNode { self }
    private let ticks: [SKShapeNode]
    private var samples: [WakeSample]
    private let stretch: Bool

    init(maxPoints: Int, stretch: Bool) {
        self.stretch = stretch
        let slots = max(maxPoints * 2, 16)
        samples = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: slots)
        ticks = (0..<slots).map { _ in
            let n = WakeCollect.shapeNode(z: 5)
            n.fillColor = .clear
            n.lineCap = .round
            return n
        }
        super.init()
        for t in ticks { addChild(t) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.dense(ctx, into: &samples, capacity: samples.count, subdiv: 1)
        guard n >= 1 else {
            for t in ticks { t.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = stretch ? WallJelly.energy(elapsedMs: ctx.jellyElapsedMs) : 0
        let side: CGFloat = ctx.jellySide < 0 ? -1 : 1
        for i in 0..<n {
            let p = samples[i]
            let stretchAmt = 1 + energy * 0.9 * p.along
            let half = r * (0.22 + 0.4 * p.opacity) * p.scale * p.sx * stretchAmt
            let path = CGMutablePath()
            path.move(to: CGPoint(x: -half, y: 0))
            path.addLine(to: CGPoint(x: half, y: 0))
            let node = ticks[i]
            node.path = path
            node.position = CGPoint(x: p.x + side * r * 0.12 * energy * p.along, y: p.y)
            node.zRotation = -p.angle
            node.strokeColor = BrandColors.UI.ink
            node.lineWidth = r * (0.055 + 0.07 * p.opacity) * p.scale * p.sy
            node.alpha = p.opacity * 0.85
            node.isHidden = false
        }
        for i in n..<ticks.count { ticks[i].isHidden = true }
    }
}

final class LadderTrailNode: SKNode, SkinTrail {
    var node: SKNode { self }
    private let spine: SKShapeNode
    private let rungs: TickTrailNode
    private var wake: [WakeSample]
    private let maxPoints: Int

    init(maxPoints: Int) {
        self.maxPoints = max(maxPoints, 8)
        wake = Array(repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1), count: self.maxPoints)
        spine = WakeCollect.shapeNode(z: 4.8)
        spine.fillColor = .clear
        spine.lineCap = .round
        rungs = TickTrailNode(maxPoints: maxPoints, stretch: false)
        super.init()
        addChild(spine)
        addChild(rungs)
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.points(ctx, into: &wake, capacity: maxPoints)
        if n >= 2 {
            spine.path = ClassicWakePath.smooth(wake, count: n)
            spine.strokeColor = BrandColors.UI.ink
            spine.lineWidth = max(1, ctx.shipRadius * 0.06)
            spine.alpha = 0.45
            spine.isHidden = false
        } else {
            spine.path = nil
            spine.isHidden = true
        }
        rungs.sync(ctx)
    }
}
