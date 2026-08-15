// RibbonTrailNode.swift
// Changes: Slice D — Android ribbon width t^0.6 × opacity; spring nudge while jelly.

import SpriteKit

final class RibbonTrailNode: SKNode {
    private let segments: [SKSpriteNode]
    private let smudge: [SKSpriteNode]
    private let maxSegments: Int
    private let maxWidth: CGFloat

    init(texture: SKTexture, maxSegments: Int, maxWidth: CGFloat) {
        self.maxSegments = max(maxSegments, 2)
        self.maxWidth = maxWidth
        var built: [SKSpriteNode] = []
        var bloom: [SKSpriteNode] = []
        built.reserveCapacity(self.maxSegments)
        bloom.reserveCapacity(self.maxSegments)
        for _ in 0..<self.maxSegments {
            let soft = SKSpriteNode(texture: texture)
            soft.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            soft.isHidden = true
            soft.zPosition = 4.5
            soft.alpha = 0.22
            bloom.append(soft)
            let node = SKSpriteNode(texture: texture)
            node.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            node.isHidden = true
            node.zPosition = 5
            built.append(node)
        }
        self.segments = built
        self.smudge = bloom
        super.init()
        for node in smudge { addChild(node) }
        for node in segments { addChild(node) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func sync(
        trail: TrailRingBuffer,
        cameraY: CGFloat,
        sceneHeight: CGFloat,
        jellyElapsedMs: CGFloat,
        jellySide: CGFloat,
        shipRadius: CGFloat
    ) {
        let available = max(0, trail.count - 1)
        let useCount = min(available, maxSegments)
        let last = CGFloat(max(useCount - 1, 1))
        let jellyLive = jellyElapsedMs >= 0 && jellyElapsedMs < GameConfig.Flicker.wallJellyMs
        let jellyT = jellyLive ? jellyElapsedMs / GameConfig.Flicker.wallJellyMs : 0

        for i in 0..<maxSegments {
            let node = segments[i]
            let bloom = smudge[i]
            if i >= useCount {
                node.isHidden = true
                bloom.isHidden = true
                continue
            }
            let startIndex = trail.count - 1 - useCount + i
            let a = trail[startIndex]
            let b = trail[startIndex + 1]
            if a.opacity <= 0 {
                node.isHidden = true
                bloom.isHidden = true
                continue
            }

            let along = CGFloat(i) / last
            var ax = a.x
            var ay = a.y
            var bx = b.x
            var by = b.y
            if jellyLive {
                let na = WallJelly.springNudge(t: jellyT, along: along, side: jellySide, radius: shipRadius, seed: a.seed)
                let nb = WallJelly.springNudge(t: jellyT, along: min(1, along + 1 / last), side: jellySide, radius: shipRadius, seed: b.seed)
                ax += na.dx
                ay += na.dy
                bx += nb.dx
                by += nb.dy
            }

            let sax = ax
            let say = sceneHeight * 0.22 + (ay - cameraY)
            let sbx = bx
            let sby = sceneHeight * 0.22 + (by - cameraY)
            let dx = sbx - sax
            let dy = sby - say
            let len = hypot(dx, dy)
            if len < 0.5 {
                node.isHidden = true
                bloom.isHidden = true
                continue
            }

            let t = along
            let width = maxWidth * pow(t, 0.6) * (0.45 + 0.55 * a.opacity)
            let mid = CGPoint(x: (sax + sbx) * 0.5, y: (say + sby) * 0.5)
            let rot = atan2(dy, dx)
            let alpha = 0.8 * a.opacity

            node.isHidden = false
            node.position = mid
            node.zRotation = rot
            node.size = CGSize(width: len * 1.15, height: max(width, 0.6))
            node.alpha = alpha

            bloom.isHidden = false
            bloom.position = mid
            bloom.zRotation = rot
            bloom.size = CGSize(width: len * 1.15, height: max(width * 2.2, 1.2))
            bloom.alpha = 0.22 * a.opacity
        }
    }
}
