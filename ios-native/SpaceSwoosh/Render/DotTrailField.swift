// DotTrailField.swift
// Changes: Android drawDotTrail — pooled dots, dense pile on BOOP.

import SpriteKit

final class DotTrailField: SKNode {
    private let nodes: [SKSpriteNode]
    private let texture: SKTexture

    init(texture: SKTexture, slots: Int = 80) {
        self.texture = texture
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

    func sync(
        trail: TrailRingBuffer,
        cameraY: CGFloat,
        sceneHeight: CGFloat,
        jellyElapsedMs: CGFloat,
        jellySide: CGFloat,
        shipRadius: CGFloat
    ) {
        let screenY: (CGFloat) -> CGFloat = { sceneHeight * CinematicFlight.cruiseSeat + ($0 - cameraY) }
        let jellyLive = jellyElapsedMs >= 0 && jellyElapsedMs < GameConfig.Flicker.wallJellyMs
        let jellyT = jellyLive ? jellyElapsedMs / GameConfig.Flicker.wallJellyMs : 0
        let energy = WallJelly.energy(elapsedMs: jellyElapsedMs)
        let n = min(trail.count, nodes.count)
        let denom = CGFloat(max(n - 1, 1))
        let baseSize = shipRadius * 0.2
        for i in 0..<n {
            let src = trail[i]
            let along = n <= 1 ? 1 : CGFloat(i) / denom
            var x = src.x
            var y = src.y
            var sx: CGFloat = 1
            var sy: CGFloat = 1
            if jellyLive {
                let d = WallJelly.deform(
                    mode: .dense,
                    t: jellyT,
                    along: along,
                    side: jellySide,
                    radius: shipRadius,
                    seed: src.seed
                )
                x += d.dx
                y += d.dy
                sx = d.sx
                sy = d.sy
            }
            let pile = energy > 0 ? 1 + energy * 0.85 * along * along : 1
            let rx = baseSize * sx * pile
            let ry = baseSize * sy * pile
            let alphaBoost = energy > 0 ? 1 + energy * 0.35 * along : 1
            let node = nodes[i]
            node.isHidden = false
            node.position = CGPoint(x: x, y: screenY(y))
            node.size = CGSize(width: rx * 2, height: ry * 2)
            node.alpha = min(1, src.opacity * alphaBoost)
            node.color = BrandColors.UI.ink
            node.colorBlendFactor = 1
        }
        for i in n..<nodes.count { nodes[i].isHidden = true }
    }
}
