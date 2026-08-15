// PooledSpriteField.swift
// Changes: Phase C — sync combat pickups (sparkle / shield / wall boost) from slots.

import SpriteKit

final class PooledSpriteField: SKNode {
    private let bodyNodes: [SKSpriteNode]
    private let glowNodes: [SKSpriteNode]
    private let pickupNodes: [SKSpriteNode]
    private let bake: BakePipeline

    init(bake: BakePipeline) {
        self.bake = bake
        var bodies: [SKSpriteNode] = []
        for _ in 0..<GameConfig.Stress.obstacleSlots {
            let node = SKSpriteNode(texture: bake.part(for: .circle))
            node.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            node.isHidden = true
            node.zPosition = 4
            bodies.append(node)
        }
        bodyNodes = bodies

        var glows: [SKSpriteNode] = []
        for _ in 0..<GameConfig.Stress.glowSlots {
            let node = SKSpriteNode(texture: bake.glowSignal)
            node.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            node.blendMode = .add
            node.isHidden = true
            node.zPosition = 3
            glows.append(node)
        }
        glowNodes = glows

        var pickups: [SKSpriteNode] = []
        for _ in 0..<GameConfig.Stress.pickupSlots {
            let node = SKSpriteNode(texture: bake.sparkle)
            node.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            node.isHidden = true
            node.zPosition = 6
            pickups.append(node)
        }
        pickupNodes = pickups

        super.init()
        for node in bodyNodes { addChild(node) }
        for node in glowNodes { addChild(node) }
        for node in pickupNodes { addChild(node) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func sync(world: WorldState, cameraY: CGFloat, sceneHeight: CGFloat) {
        let screenY = sceneHeight * 0.22
        var glowUsed = 0

        for i in 0..<bodyNodes.count {
            let node = bodyNodes[i]
            if i >= world.obstacles.count || !world.obstacles[i].active {
                node.isHidden = true
                continue
            }
            let o = world.obstacles[i]
            let y = screenY + (o.y - cameraY)
            node.isHidden = false
            node.texture = bake.part(for: o.kind)
            node.position = CGPoint(x: o.x, y: y)
            node.zRotation = o.rotation
            let side = o.radius * 2.2
            node.size = CGSize(width: side, height: side)

            if o.glow, glowUsed < glowNodes.count {
                let glow = glowNodes[glowUsed]
                glowUsed += 1
                glow.isHidden = false
                glow.texture = (o.kind == .hole) ? bake.glowInk : bake.glowSignal
                glow.position = CGPoint(x: o.x, y: y)
                glow.size = CGSize(width: o.radius * 3.4, height: o.radius * 3.4)
                glow.alpha = 0.85
            }
        }
        for i in glowUsed..<glowNodes.count {
            glowNodes[i].isHidden = true
        }

        for i in 0..<pickupNodes.count {
            let node = pickupNodes[i]
            if i >= world.pickups.count || !world.pickups[i].active {
                node.isHidden = true
                continue
            }
            let p = world.pickups[i]
            let pulse = 0.75 + 0.25 * sin(p.phase)
            node.isHidden = false
            node.position = CGPoint(x: p.x, y: screenY + (p.y - cameraY))
            switch p.kind {
            case .sparkle:
                node.texture = bake.sparkle
                node.color = .white
                node.colorBlendFactor = 0
                let side = world.baseUnit * 1.15 * pulse
                node.size = CGSize(width: side, height: side)
                node.alpha = 0.7 + 0.3 * pulse
            case .shield:
                node.texture = bake.part(for: .ring)
                let side = world.baseUnit * 2.2 * pulse
                node.size = CGSize(width: side, height: side)
                node.alpha = 1
            case .wallBoost:
                node.texture = bake.part(for: .square)
                node.color = BrandColors.UI.signal
                node.colorBlendFactor = 1
                node.size = CGSize(width: world.baseUnit * 0.7, height: world.baseUnit * 4.2)
                node.alpha = 0.95
            }
        }
    }
}
