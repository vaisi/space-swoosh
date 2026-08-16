// TwinDotTrailField.swift
// Changes: Android drawTwinDotTrail — paired dotted traces (Ember / Echo).

import SpriteKit

final class TwinDotTrailField: SKNode, SkinTrail {
    var node: SKNode { self }

    private let nodes: [SKSpriteNode]
    private let skin: SkinDef
    private let sepScale: CGFloat
    private let sizeScale: CGFloat

    init(
        texture: SKTexture,
        slots: Int,
        skin: SkinDef,
        sepScale: CGFloat = 0.5,
        sizeScale: CGFloat = 0.62
    ) {
        self.skin = skin
        self.sepScale = sepScale
        self.sizeScale = sizeScale
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
        let n = min(ctx.trail.count, nodes.count / 2)
        let denom = CGFloat(max(n - 1, 1))
        let baseSize = ctx.shipRadius * GameConfig.Spacecraft.trailDotSize * sizeScale
        let sep = ctx.shipRadius * sepScale
        var used = 0
        for i in 0..<n {
            let src = ctx.trail[i]
            let along = n <= 1 ? 1 : CGFloat(i) / denom
            var x = src.x
            var y = src.y
            var sx: CGFloat = 1
            var sy: CGFloat = 1
            if live {
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
                sx = d.sx
                sy = d.sy
            }
            let env = skin.trailRipple ? WallJelly.rippleEnvelope(elapsedMs: ctx.jellyElapsedMs, along: along) : 0
            let sizeBoost = env > 0 ? 1 + env * 1.15 : 1
            let alphaBoost = env > 0 ? 1 + env * 0.85 : 1
            let rx = baseSize * sx * sizeBoost
            let ry = baseSize * sy * sizeBoost
            let fade = 0.4 + 0.6 * src.opacity
            let nx = cos(src.tangent)
            let ny = sin(src.tangent)
            let ox = nx * sep * fade
            let oy = ny * sep * fade
            let alpha = min(1, src.opacity * alphaBoost)
            let syScreen = screenY(y)
            for pair in 0..<2 {
                guard used < nodes.count else { break }
                let node = nodes[used]
                used += 1
                let sign: CGFloat = pair == 0 ? -1 : 1
                node.isHidden = false
                node.position = CGPoint(x: x + ox * sign, y: syScreen + oy * sign)
                node.size = CGSize(width: rx * 2, height: ry * 2)
                node.alpha = alpha
                node.color = BrandColors.UI.ink
                node.colorBlendFactor = 1
            }
        }
        for i in used..<nodes.count { nodes[i].isHidden = true }
    }
}
