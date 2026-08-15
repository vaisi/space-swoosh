// StreakField.swift
// Changes: Slice E polish — 18 pooled baked intro streaks (top 38% band).

import SpriteKit

final class StreakField: SKNode {
    private struct Line {
        var x: CGFloat
        var y: CGFloat
        var length: CGFloat
        var speed: CGFloat
    }

    private let nodes: [SKSpriteNode]
    private var lines: [Line] = []

    init(texture: SKTexture) {
        var built: [SKSpriteNode] = []
        for _ in 0..<CinematicFlight.streakCount {
            let node = SKSpriteNode(texture: texture)
            node.anchorPoint = CGPoint(x: 0.5, y: 1)
            node.isHidden = true
            node.zPosition = 3
            built.append(node)
        }
        nodes = built
        super.init()
        for node in nodes { addChild(node) }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func reset(width: CGFloat, height: CGFloat) {
        let yMin = height * (1 - CinematicFlight.streakBand)
        let yMax = height
        lines = (0..<CinematicFlight.streakCount).map { _ in
            Line(
                x: CGFloat.random(in: 0...max(1, width)),
                y: CGFloat.random(in: yMin...yMax),
                length: 20 + CGFloat.random(in: 0...30),
                speed: 15 + CGFloat.random(in: 0...10)
            )
        }
    }

    func sync(
        alpha: CGFloat,
        width: CGFloat,
        height: CGFloat,
        dt: CGFloat,
        speedFactor: CGFloat
    ) {
        let fade = max(0, min(1, alpha))
        let visible = fade > 0.02 ? max(0, Int((CGFloat(CinematicFlight.streakCount) * fade).rounded())) : 0
        let yMin = height * (1 - CinematicFlight.streakBand)
        let yMax = height
        let step = max(0, speedFactor) * dt * 60
        for i in 0..<nodes.count {
            guard i < visible, i < lines.count else {
                nodes[i].isHidden = true
                continue
            }
            lines[i].y -= lines[i].speed * step
            if lines[i].y < yMin - lines[i].length {
                lines[i].y = yMax
                lines[i].x = CGFloat.random(in: 0...max(1, width))
            }
            nodes[i].isHidden = false
            nodes[i].position = CGPoint(x: lines[i].x, y: lines[i].y)
            nodes[i].size = CGSize(width: 3, height: lines[i].length)
            nodes[i].alpha = fade * 0.32
        }
    }
}
