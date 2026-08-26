// LiveHullNode.swift
// Changes: Pools 16 fills / 24 strokes / 24 discs so Puff ticks and Argus eyes
// never drop hangar ornaments.

import SpriteKit

final class LiveHullNode: SKNode {
    private let id: SkinId
    private let fills: [SKShapeNode]
    private let strokes: [SKShapeNode]
    private let discs: [SKSpriteNode]
    private let canvas: SKLiveCanvas

    init(id: SkinId, disc: SKTexture) {
        self.id = id
        var fillList: [SKShapeNode] = []
        for _ in 0..<16 {
            let n = SKShapeNode()
            n.lineWidth = 0
            n.strokeColor = .clear
            n.isAntialiased = true
            n.zPosition = 10
            n.isHidden = true
            fillList.append(n)
        }
        fills = fillList
        var strokeList: [SKShapeNode] = []
        for _ in 0..<24 {
            let n = SKShapeNode()
            n.fillColor = .clear
            n.lineCap = .round
            n.lineJoin = .round
            n.isAntialiased = true
            n.zPosition = 10.2
            n.isHidden = true
            strokeList.append(n)
        }
        strokes = strokeList
        var discList: [SKSpriteNode] = []
        for _ in 0..<24 {
            let n = SKSpriteNode(texture: disc)
            n.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            n.colorBlendFactor = 1
            n.zPosition = 10.4
            n.isHidden = true
            discList.append(n)
        }
        discs = discList
        canvas = SKLiveCanvas(fills: fills, strokes: strokes, discs: discs)
        super.init()
        for n in fills { addChild(n) }
        for n in strokes { addChild(n) }
        for n in discs { addChild(n) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) not used") }

    func present(radius: CGFloat, turn: CGFloat, jelly: HullJelly, jellyLive: Bool, alpha: CGFloat, nowMs: CGFloat) {
        canvas.begin()
        LiveHullPaint.draw(
            id,
            onto: canvas,
            radius: radius,
            turn: turn,
            nowMs: nowMs,
            jellyLive: jellyLive,
            shake: jelly.shake,
            alpha: alpha
        )
    }
}
