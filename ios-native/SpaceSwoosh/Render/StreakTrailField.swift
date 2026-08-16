// StreakTrailField.swift
// Changes: Android drawStreakTrail — pooled ellipses, spark scatter on BOOP.

import SpriteKit

final class StreakTrailField: SKNode {
    private let nodes: [SKSpriteNode]

    init(texture: SKTexture, slots: Int = 40) {
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
        ship: ShipState,
        cameraY: CGFloat,
        sceneHeight: CGFloat,
        jellyElapsedMs: CGFloat,
        jellySide: CGFloat,
        shipRadius: CGFloat,
        shipSpeed: CGFloat
    ) {
        let screenY: (CGFloat) -> CGFloat = { sceneHeight * CinematicFlight.cruiseSeat + ($0 - cameraY) }
        let jellyLive = jellyElapsedMs >= 0 && jellyElapsedMs < GameConfig.Flicker.wallJellyMs
        let jellyT = jellyLive ? jellyElapsedMs / GameConfig.Flicker.wallJellyMs : 0
        let energy = WallJelly.energy(elapsedMs: jellyElapsedMs)
        let n = trail.count
        let denom = CGFloat(max(n - 1, 1))
        let stretch = min(1.7, 0.65 + shipSpeed / max(shipRadius * 0.75, 0.001))
        let side: CGFloat = jellySide < 0 ? -1 : 1
        var used = 0
        var i = n - 1
        while i >= 0, used < nodes.count {
            let src = trail[i]
            let along = n <= 1 ? 1 : CGFloat(i) / denom
            var d = TrailDeform.zero
            if jellyLive {
                d = WallJelly.deform(
                    mode: .scatter,
                    t: jellyT,
                    along: along,
                    side: jellySide,
                    radius: shipRadius,
                    seed: src.seed
                )
            }
            let spark = energy * (src.seed * 2 - 1) * shipRadius * 1.15 * (0.4 + 0.6 * (1 - along))
            let length = shipRadius * (0.3 + 0.8 * src.opacity) * stretch * d.sy
            let width = shipRadius * (0.09 + 0.24 * src.opacity) * d.sx
            let node = nodes[used]
            used += 1
            node.isHidden = false
            node.position = CGPoint(
                x: src.x + d.dx + spark * side * 0.15,
                y: screenY(src.y + d.dy) + spark * 0.55
            )
            node.zRotation = -(src.tangent + spark * 0.04)
            node.size = CGSize(width: width * 2, height: length * 2 * (1 + energy * 0.25 * (1 - along)))
            node.alpha = src.opacity * 0.75
            node.color = BrandColors.UI.ink
            node.colorBlendFactor = 1
            i -= 2
        }
        for k in used..<nodes.count { nodes[k].isHidden = true }
        _ = ship
    }
}
