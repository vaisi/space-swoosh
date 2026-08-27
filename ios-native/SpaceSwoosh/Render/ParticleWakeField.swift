// ParticleWakeField.swift
// Changes: Last-resort pooled sprite wake — unused on the 40-ship roster.

import SpriteKit

final class ParticleWakeField: SKNode, SkinTrail {
    var node: SKNode { self }

    private let nodes: [SKSpriteNode]
    private let disc: SKTexture
    private let ring: SKTexture
    private let sparkle: SKTexture
    private let skin: SkinDef

    init(texture: SKTexture, ring: SKTexture, sparkle: SKTexture, slots: Int, skin: SkinDef) {
        disc = texture
        self.ring = ring
        self.sparkle = sparkle
        self.skin = skin
        var list: [SKSpriteNode] = []
        for _ in 0..<slots {
            let n = SKSpriteNode(texture: texture)
            n.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            n.isHidden = true
            n.zPosition = 5
            list.append(n)
        }
        nodes = list
        super.init()
        for n in nodes { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func sync(_ ctx: TrailSyncContext) {
        let screenY: (CGFloat) -> CGFloat = { ctx.sceneHeight * CinematicFlight.cruiseSeat + ($0 - ctx.cameraY) }
        let live = WallJelly.isLive(elapsedMs: ctx.jellyElapsedMs, mode: skin.wallTrailMode)
        let energy = WallJelly.energy(elapsedMs: ctx.jellyElapsedMs)
        let n = ctx.trail.count
        let denom = CGFloat(max(n - 1, 1))
        let r = ctx.shipRadius
        var used = 0
        let kind = skin.trailKind
        let perPoint = multiplicity(kind)
        let step = kind == .wisp || kind == .cinder || kind == .plume ? 1 : 1

        var i = 0
        while i < n, used < nodes.count {
            let src = ctx.trail[i]
            let along = n <= 1 ? 1 : CGFloat(i) / denom
            var dx: CGFloat = 0
            var dy: CGFloat = 0
            var sx: CGFloat = 1
            var sy: CGFloat = 1
            if live {
                let d = WallJelly.deform(
                    mode: skin.wallTrailMode,
                    elapsedMs: ctx.jellyElapsedMs,
                    along: along,
                    side: ctx.jellySide,
                    radius: r,
                    seed: src.seed
                )
                dx = d.dx
                dy = d.dy
                sx = d.sx
                sy = d.sy
            }
            let env = skin.trailRipple ? WallJelly.rippleEnvelope(elapsedMs: ctx.jellyElapsedMs, along: along) : 0
            let px = src.x + dx
            let py = screenY(src.y + dy)
            let nx = -sin(src.tangent)
            let ny = cos(src.tangent)
            let marks = min(perPoint, nodes.count - used)
            for k in 0..<marks {
                let node = nodes[used]
                used += 1
                paint(
                    node: node,
                    kind: kind,
                    k: k,
                    marks: marks,
                    src: src,
                    along: along,
                    px: px,
                    py: py,
                    nx: nx,
                    ny: ny,
                    sx: sx,
                    sy: sy,
                    r: r,
                    energy: energy,
                    env: env,
                    speed: ctx.shipSpeed
                )
            }
            i += step
        }
        for k in used..<nodes.count { nodes[k].isHidden = true }
    }

    private func multiplicity(_ kind: TrailKind) -> Int {
        switch kind {
        case .cloud, .puff, .luna: return 3
        case .lantern, .bloom, .wish, .argus, .chime: return 2
        default: return 1
        }
    }

    private func paint(
        node: SKSpriteNode,
        kind: TrailKind,
        k: Int,
        marks: Int,
        src: TrailPoint,
        along: CGFloat,
        px: CGFloat,
        py: CGFloat,
        nx: CGFloat,
        ny: CGFloat,
        sx: CGFloat,
        sy: CGFloat,
        r: CGFloat,
        energy: CGFloat,
        env: CGFloat,
        speed: CGFloat
    ) {
        let seed = src.seed
        let hash = fract(seed * 17.13 + CGFloat(k) * 0.37)
        let hash2 = fract(seed * 78.23 + CGFloat(k) * 0.19)
        let scatter = (hash * 2 - 1)
        let scatter2 = (hash2 * 2 - 1)
        let sizeBoost = env > 0 ? 1 + env * 1.2 : 1
        let op = src.opacity
        node.isHidden = false
        node.colorBlendFactor = 1
        node.zRotation = -src.tangent
        node.texture = disc

        switch kind {
        case .wisp:
            let dist = r * (0.35 + hash * 0.85) * (0.4 + 0.6 * (1 - along)) * (1 + energy * 0.6)
            node.position = CGPoint(x: px + nx * scatter * dist, y: py + scatter2 * dist * 0.55)
            let s = r * (0.06 + 0.1 * op) * sizeBoost
            node.size = CGSize(width: s * 2, height: s * 2)
            node.alpha = op * 0.7
            node.color = BrandColors.UI.ink
        case .chevron:
            node.position = CGPoint(x: px, y: py)
            node.size = CGSize(width: r * 0.35 * sx * sizeBoost, height: r * 0.22 * sy)
            node.alpha = op * 0.85
            node.color = BrandColors.UI.ink
            node.zRotation = -src.tangent + .pi / 4
        case .rings, .bloom, .chime:
            node.texture = ring
            let grow = along * (1 + energy * 0.35) * (k == 0 ? 1 : 0.62)
            let s = r * (0.22 + 0.55 * grow) * sizeBoost
            node.position = CGPoint(x: px + nx * scatter * r * 0.12 * CGFloat(k), y: py)
            node.size = CGSize(width: s * 2, height: s * 2 * sy)
            node.alpha = op * (0.55 + energy * 0.2)
            node.color = kind == .bloom ? bloomColor(along: along, k: k) : (kind == .chime ? BrandColors.UI.lanternGold : BrandColors.UI.signal)
        case .stamp:
            node.position = CGPoint(x: px, y: py)
            let s = r * 0.28 * sx * sizeBoost
            node.size = CGSize(width: s * 2, height: s * 2 * sy)
            node.alpha = op * 0.8
            node.color = BrandColors.UI.ink
        case .tick:
            node.position = CGPoint(x: px, y: py)
            node.size = CGSize(width: r * 0.42 * sx, height: r * 0.08 * sy)
            node.alpha = op * 0.85
            node.color = BrandColors.UI.ink
            node.zRotation = -src.tangent + .pi / 2
        case .crease:
            let zig = (seed > 0.5 ? 1 : -1) * r * 0.18
            node.position = CGPoint(x: px + nx * zig, y: py)
            node.size = CGSize(width: r * 0.38 * sx, height: r * 0.07)
            node.alpha = op * 0.8
            node.color = BrandColors.UI.ink
        case .cloud, .luna:
            let spread = r * (0.35 + hash * 0.7) * (1 + energy * 0.5) * sizeBoost
            node.position = CGPoint(x: px + cos(hash * .pi * 2) * spread, y: py + sin(hash2 * .pi * 2) * spread * 0.7)
            let s = r * (0.08 + 0.12 * op) * (0.7 + hash * 0.5)
            node.size = CGSize(width: s * 2 * sx, height: s * 2 * sy)
            node.alpha = op * 0.55
            node.color = kind == .luna ? BrandColors.UI.lanternGold : BrandColors.UI.ink
        case .ladder:
            node.position = CGPoint(x: px, y: py)
            node.size = CGSize(width: r * 0.7 * sx * (1 - energy * 0.4 * along * along), height: r * 0.07)
            node.alpha = op * 0.8
            node.color = BrandColors.UI.ink
            node.zRotation = 0
        case .lag:
            let lag = r * 0.45 * (1 - along) * (0.4 + seed)
            node.position = CGPoint(x: px + nx * lag, y: py - r * 0.15 * (1 - along))
            node.size = CGSize(width: r * 0.28 * sx, height: r * 0.16 * sy)
            node.alpha = op * 0.75
            node.color = BrandColors.UI.ink
        case .dash:
            node.position = CGPoint(x: px, y: py)
            node.size = CGSize(width: r * 0.12 * sx, height: r * 0.32 * sy * (1 + energy * 0.4))
            node.alpha = op * 0.85
            node.color = hash > 0.55 ? BrandColors.UI.signal : BrandColors.UI.ink
        case .cinder, .plume:
            let rise = r * hash * 0.55 * (1 - along) * (1 + energy * 0.4)
            node.position = CGPoint(x: px + scatter * r * 0.25, y: py + rise)
            let s = r * (0.06 + 0.1 * op)
            node.size = CGSize(width: s * 2, height: s * 2.4)
            node.alpha = op * 0.7
            node.color = hash > 0.45 ? BrandColors.UI.lanternGold : BrandColors.UI.ink
        case .lantern:
            node.position = CGPoint(x: px + scatter * r * 0.22, y: py + scatter2 * r * 0.12)
            let s = r * (0.05 + 0.08 * op) * sizeBoost
            node.size = CGSize(width: s * 2, height: s * 2)
            node.alpha = op * 0.8
            node.color = k == 0 ? BrandColors.UI.lanternTeal : BrandColors.UI.lanternGold
        case .lyra, .wish:
            node.texture = sparkle
            let orbit = r * (0.15 + hash * 0.55) * (1 - along * 0.3)
            node.position = CGPoint(x: px + nx * scatter * orbit, y: py + scatter2 * orbit * 0.6)
            let s = r * (0.08 + 0.1 * op)
            node.size = CGSize(width: s * 2, height: s * 2)
            node.alpha = op * 0.85
            node.color = BrandColors.UI.lanternGold
        case .koi:
            node.position = CGPoint(x: px + nx * scatter * r * 0.18, y: py)
            node.size = CGSize(width: r * 0.18 * sx, height: r * 0.12 * sy)
            node.alpha = op * 0.75
            node.color = hash > 0.5 ? BrandColors.UI.ink : UIColor(red: 200 / 255, green: 70 / 255, blue: 70 / 255, alpha: 1)
        case .boreal:
            node.position = CGPoint(x: px + scatter * r * 0.2, y: py)
            node.size = CGSize(width: r * 0.1, height: r * 0.45 * sy)
            node.alpha = op * 0.7
            node.color = hash > 0.5 ? BrandColors.UI.lanternTeal : BrandColors.UI.signal
        case .darner:
            node.position = CGPoint(x: px + nx * scatter * r * 0.2, y: py)
            node.size = CGSize(width: r * 0.14, height: r * 0.08)
            node.alpha = op * 0.8
            node.color = darnerColor(hash)
        case .puff:
            let drift = r * hash * 0.7 * (1 - along)
            node.position = CGPoint(x: px + scatter * drift, y: py + hash2 * drift * 0.4)
            let s = r * (0.06 + 0.08 * op)
            node.size = CGSize(width: s * 2, height: s * 2.6)
            node.alpha = op * 0.65
            node.color = BrandColors.UI.ink
        case .argus:
            node.texture = k == 0 ? disc : ring
            node.position = CGPoint(x: px + scatter * r * 0.15, y: py)
            let s = r * (0.12 + 0.1 * op) * (k == 0 ? 0.55 : 1)
            node.size = CGSize(width: s * 2, height: s * 2)
            node.alpha = op * 0.75
            node.color = k == 0 ? BrandColors.UI.lanternGold : BrandColors.UI.lanternTeal
        default:
            node.position = CGPoint(x: px, y: py)
            let s = r * GameConfig.Spacecraft.trailDotSize * sx * sizeBoost
            node.size = CGSize(width: s * 2, height: s * 2 * sy)
            node.alpha = min(1, op * (env > 0 ? 1 + env * 0.85 : 1 + energy * 0.35 * along))
            node.color = BrandColors.UI.ink
        }
        _ = speed
        _ = marks
    }

    private func bloomColor(along: CGFloat, k: Int) -> UIColor {
        let palette = [
            UIColor(red: 1, green: 140 / 255, blue: 180 / 255, alpha: 1),
            UIColor(red: 120 / 255, green: 220 / 255, blue: 190 / 255, alpha: 1),
            UIColor(red: 180 / 255, green: 150 / 255, blue: 1, alpha: 1),
            UIColor(red: 120 / 255, green: 190 / 255, blue: 1, alpha: 1)
        ]
        return palette[(Int(along * 8) + k) % palette.count]
    }

    private func darnerColor(_ hash: CGFloat) -> UIColor {
        if hash < 0.33 { return UIColor(red: 48 / 255, green: 186 / 255, blue: 168 / 255, alpha: 1) }
        if hash < 0.66 { return BrandColors.UI.lanternGold }
        return UIColor(red: 140 / 255, green: 88 / 255, blue: 210 / 255, alpha: 1)
    }

    private func fract(_ v: CGFloat) -> CGFloat { v - floor(v) }
}
