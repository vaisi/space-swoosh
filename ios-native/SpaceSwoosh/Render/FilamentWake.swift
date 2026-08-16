// FilamentWake.swift
// Changes: Palette factories live on Palette so SkinTrail type-context resolves.

import SpriteKit

final class FilamentWake: SKNode, SkinTrail {
    var node: SKNode { self }

    struct Palette {
        var filaments: [UIColor]
        var plankton: [UIColor]
        var density: CGFloat
        var glitter: Bool
        var alpha: CGFloat

        static func lantern() -> Palette {
            Palette(
                filaments: [BrandColors.UI.lanternTeal, BrandColors.UI.lanternGold, BrandColors.UI.lanternTeal],
                plankton: [BrandColors.UI.lanternTeal, BrandColors.UI.lanternGold, BrandColors.UI.lanternCyan],
                density: 1,
                glitter: false,
                alpha: 0.9
            )
        }

        static func sprout() -> Palette {
            Palette(
                filaments: [BrandColors.UI.sproutGreen, BrandColors.UI.lanternGold, BrandColors.UI.sproutGreen],
                plankton: [BrandColors.UI.sproutGreen, BrandColors.UI.lanternGold],
                density: 1,
                glitter: false,
                alpha: 0.9
            )
        }

        static func spore() -> Palette {
            Palette(
                filaments: [BrandColors.UI.sporeAmber, BrandColors.UI.sporeViolet, BrandColors.UI.sporeAmber],
                plankton: [BrandColors.UI.sporeAmber, BrandColors.UI.sporeViolet, BrandColors.UI.sporeMint],
                density: 1.45,
                glitter: false,
                alpha: 0.9
            )
        }

        static func luna() -> Palette {
            Palette(
                filaments: [BrandColors.UI.mothLavender, BrandColors.UI.lanternGold, BrandColors.UI.mothLavender],
                plankton: [BrandColors.UI.mothLavender, BrandColors.UI.lunaSilver, BrandColors.UI.lanternGold],
                density: 1.7,
                glitter: true,
                alpha: 0.92
            )
        }
    }

    private let ribbons: [SKShapeNode]
    private let plankton: [SKSpriteNode]
    private let glitterDots: [SKSpriteNode]
    private let glitterArms: [SKShapeNode]
    private var wake: [WakeSample]
    private var fil: [WakeSample]
    private var left: [CGPoint]
    private var right: [CGPoint]
    private let maxPoints: Int
    private let palette: Palette
    private let offsets: [CGFloat] = [-0.48, 0, 0.48]

    init(disc: SKTexture, slots: Int, palette: Palette) {
        self.palette = palette
        maxPoints = max(slots, 8)
        wake = Array(
            repeating: WakeSample(x: 0, y: 0, opacity: 0, seed: 0.5, angle: 0, sx: 1, sy: 1, along: 0, scale: 1),
            count: maxPoints
        )
        fil = wake
        left = Array(repeating: .zero, count: maxPoints)
        right = Array(repeating: .zero, count: maxPoints)
        ribbons = (0..<3).map { WakeCollect.shapeNode(z: 5 + CGFloat($0) * 0.01) }
        let pool = min(600, Int(CGFloat(maxPoints) * 5 * palette.density))
        plankton = (0..<pool).map { _ in WakeCollect.sprite(disc, z: 5.2) }
        if palette.glitter {
            let g = min(200, maxPoints)
            glitterDots = (0..<g).map { _ in WakeCollect.sprite(disc, z: 5.4) }
            glitterArms = (0..<g).map { _ in
                let n = SKShapeNode()
                n.fillColor = .clear
                n.lineCap = .round
                n.isAntialiased = true
                n.zPosition = 5.35
                n.isHidden = true
                return n
            }
        } else {
            glitterDots = []
            glitterArms = []
        }
        super.init()
        for n in ribbons { addChild(n) }
        for n in plankton { addChild(n) }
        for n in glitterDots { addChild(n) }
        for n in glitterArms { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let n = WakeCollect.points(ctx, into: &wake, capacity: maxPoints)
        guard n >= 3 else {
            for r in ribbons { r.isHidden = true; r.path = nil }
            for p in plankton { p.isHidden = true }
            for g in glitterDots { g.isHidden = true }
            for a in glitterArms { a.isHidden = true }
            return
        }
        let r = ctx.shipRadius
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let denom = CGFloat(max(n - 1, 1))
        let alpha = palette.alpha

        for f in 0..<offsets.count {
            WakeCollect.filament(from: wake, count: n, r: r, offsetScale: offsets[f], energy: energy, into: &fil)
            let path = WakeCollect.ribbonPath(pts: fil, count: n, widthAt: { i in
                let t = CGFloat(i) / denom
                let op = self.fil[i].opacity
                return r * (0.035 + 0.09 * t) * (0.5 + 0.5 * op)
                    * (1 + energy * 0.45 * t)
                    * (f == 1 ? 0.7 : 1)
            }, left: &left, right: &right)
            let node = ribbons[f]
            node.path = path
            node.fillColor = palette.filaments[f % palette.filaments.count]
            node.strokeColor = .clear
            node.alpha = alpha * (0.42 + energy * 0.22)
            node.isHidden = false
        }

        let perPoint = max(1, Int((5 * palette.density).rounded()))
        var used = 0
        for i in 0..<n {
            let p = wake[i]
            if p.opacity < 0.12 { continue }
            let leave = 1 - CGFloat(i) / denom
            let prev = wake[max(0, i - 1)]
            let next = wake[min(n - 1, i + 1)]
            let dx = next.x - prev.x
            let dy = next.y - prev.y
            let len = hypot(dx, dy)
            let inv = len > 0.0001 ? 1 / len : 1
            let nx = -dy * inv
            let ny = dx * inv
            let count = energy > 0.1 ? perPoint + 2 : perPoint
            for k in 0..<count {
                guard used < plankton.count else { break }
                let u = WakeCollect.fract((p.seed) * 12.9898 + CGFloat(k) * 0.618 + CGFloat(i) * 0.07)
                let v = WakeCollect.fract((p.seed) * 78.233 + CGFloat(k) * 0.37 + CGFloat(i) * 0.13)
                let w = WakeCollect.fract((p.seed) * 4.1414 + CGFloat(k) * 0.11)
                let sideOff = (u * 2 - 1) * r * (0.2 + 0.95 * leave) * (1 + energy * 0.85)
                let alongJit = (v * 2 - 1) * r * 0.18 * leave
                let size = r * (0.03 + 0.07 * leave) * (0.5 + w * 0.7) * (1 + energy * 0.55)
                let node = plankton[used]
                used += 1
                node.isHidden = false
                node.position = CGPoint(x: p.x + nx * sideOff + ny * alongJit, y: p.y + ny * sideOff - nx * alongJit)
                node.size = CGSize(width: size * 2, height: size * 2)
                node.color = palette.plankton[k % palette.plankton.count]
                node.alpha = alpha * p.opacity * (0.28 + 0.45 * leave + energy * 0.35)
                node.zRotation = 0
            }
        }
        for k in used..<plankton.count { plankton[k].isHidden = true }

        guard palette.glitter else { return }
        var gi = 0
        for i in 0..<n {
            let p = wake[i]
            if p.opacity < 0.16 { continue }
            let u = WakeCollect.fract(p.seed * 12.99 + CGFloat(i) * 0.31)
            if u > (energy > 0.08 ? 0.85 : 0.48) { continue }
            guard gi < glitterDots.count else { break }
            let v = WakeCollect.fract(p.seed * 78.23 + CGFloat(i) * 0.19)
            let leave = 1 - CGFloat(i) / denom
            let prev = wake[max(0, i - 1)]
            let next = wake[min(n - 1, i + 1)]
            let dx = next.x - prev.x
            let dy = next.y - prev.y
            let len = hypot(dx, dy)
            let inv = len > 0.0001 ? 1 / len : 1
            let nx = -dy * inv
            let ny = dx * inv
            let side = (u * 2 - 1) * r * (0.25 + 0.95 * leave) * (1 + energy)
            let size = r * (0.025 + 0.045 * leave) * (0.5 + v * 0.7)
            let rgb = palette.plankton[i % palette.plankton.count]
            let sx = p.x + nx * side
            let sy = p.y + ny * side
            let fade = alpha * p.opacity * (0.35 + 0.4 * leave + energy * 0.3)
            let dot = glitterDots[gi]
            dot.isHidden = false
            dot.position = CGPoint(x: sx, y: sy)
            dot.size = CGSize(width: size * 2, height: size * 2)
            dot.color = rgb
            dot.alpha = fade
            let arm = glitterArms[gi]
            if v > 0.5 {
                let a = size * 2.4
                let path = CGMutablePath()
                path.move(to: CGPoint(x: sx - a, y: sy))
                path.addLine(to: CGPoint(x: sx + a, y: sy))
                path.move(to: CGPoint(x: sx, y: sy - a))
                path.addLine(to: CGPoint(x: sx, y: sy + a))
                arm.path = path
                arm.strokeColor = rgb
                arm.lineWidth = max(0.55, r * 0.025)
                arm.alpha = fade
                arm.isHidden = false
            } else {
                arm.isHidden = true
                arm.path = nil
            }
            gi += 1
        }
        for k in gi..<glitterDots.count {
            glitterDots[k].isHidden = true
            glitterArms[k].isHidden = true
        }
    }
}
