// RibbonTrailNode.swift
// Changes: Phase A — pooled textured quad segments (no SKShapeNode / no per-frame paths).

import SpriteKit

final class RibbonTrailNode: SKNode {
    private let segments: [SKSpriteNode]
    private let maxSegments: Int
    private let baseWidth: CGFloat

    init(texture: SKTexture, maxSegments: Int, baseWidth: CGFloat) {
        self.maxSegments = max(maxSegments, 2)
        self.baseWidth = baseWidth
        var built: [SKSpriteNode] = []
        built.reserveCapacity(self.maxSegments)
        for _ in 0..<self.maxSegments {
            let node = SKSpriteNode(texture: texture)
            node.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            node.isHidden = true
            node.zPosition = 5
            built.append(node)
        }
        self.segments = built
        super.init()
        for node in segments {
            addChild(node)
        }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    /// Updates pooled quads from trail ring. Camera converts world → scene.
    func sync(
        trail: TrailRingBuffer,
        cameraY: CGFloat,
        sceneHeight: CGFloat,
        maxAge: CGFloat
    ) {
        let available = max(0, trail.count - 1)
        let useCount = min(available, maxSegments)
        for i in 0..<maxSegments {
            let node = segments[i]
            if i >= useCount {
                node.isHidden = true
                continue
            }
            // Oldest → newest: index from start of ring.
            let startIndex = trail.count - 1 - useCount + i
            let a = trail[startIndex]
            let b = trail[startIndex + 1]
            if a.age > maxAge {
                node.isHidden = true
                continue
            }

            let ax = a.x
            let ay = sceneHeight * 0.22 + (a.y - cameraY)
            let bx = b.x
            let by = sceneHeight * 0.22 + (b.y - cameraY)

            let dx = bx - ax
            let dy = by - ay
            let len = hypot(dx, dy)
            if len < 0.5 {
                node.isHidden = true
                continue
            }

            let midX = (ax + bx) * 0.5
            let midY = (ay + by) * 0.5
            let fade = max(0, 1 - (a.age / maxAge))
            let width = baseWidth * (0.35 + 0.65 * fade)

            node.isHidden = false
            node.position = CGPoint(x: midX, y: midY)
            node.zRotation = atan2(dy, dx)
            node.size = CGSize(width: len * 1.15, height: width)
            node.alpha = fade * fade
        }
    }
}
