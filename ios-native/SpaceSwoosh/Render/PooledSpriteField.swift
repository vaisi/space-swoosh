// PooledSpriteField.swift
// Changes: Drift current uses dashed SKShapeNode hairlines (Android Canvas
// setLineDash + lineDashOffset) so lanes flow instead of flashing. Screen
// origin uses CinematicFlight.cruiseSeat. Wormholes match Android — spinning
// dashed stroke only, no additive inner glow. Path diameter is 2×radius×pulse
// (plus stroke). Phase core fades fully (Android mergeFactor). Piece Y is
// SpriteKit-up.

import SpriteKit

final class PooledSpriteField: SKNode {
    private let bodyNodes: [SKSpriteNode]
    private let extraNodes: [SKSpriteNode]
    private let glowNodes: [SKSpriteNode]
    private let pickupNodes: [SKSpriteNode]
    private let driftLaneNodes: [SKShapeNode]
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

        var extras: [SKSpriteNode] = []
        for _ in 0..<GameConfig.Stress.extraPartSlots {
            let node = SKSpriteNode(texture: bake.part(for: .circle))
            node.anchorPoint = CGPoint(x: 0.5, y: 0.5)
            node.isHidden = true
            node.zPosition = 4.2
            extras.append(node)
        }
        extraNodes = extras

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
            for name in ["ring0", "ring1"] {
                let ring = SKSpriteNode(texture: bake.ring)
                ring.name = name
                ring.anchorPoint = CGPoint(x: 0.5, y: 0.5)
                ring.zPosition = -1
                ring.isHidden = true
                node.addChild(ring)
            }
            pickups.append(node)
        }
        pickupNodes = pickups

        var lanes: [SKShapeNode] = []
        for _ in 0..<GameConfig.Stress.driftLaneSlots {
            let node = SKShapeNode()
            node.fillColor = .clear
            node.strokeColor = BrandColors.UI.ink30
            node.lineCap = .round
            node.lineJoin = .round
            node.glowWidth = 0
            node.isAntialiased = true
            node.blendMode = .alpha
            node.isHidden = true
            node.zPosition = 4.2
            lanes.append(node)
        }
        driftLaneNodes = lanes

        super.init()
        for node in bodyNodes { addChild(node) }
        for node in extraNodes { addChild(node) }
        for node in glowNodes { addChild(node) }
        for node in pickupNodes { addChild(node) }
        for node in driftLaneNodes { addChild(node) }
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func sync(world: WorldState, cameraY: CGFloat, sceneHeight: CGFloat) {
        let screenY = sceneHeight * CinematicFlight.cruiseSeat
        var glowUsed = 0
        var extraUsed = 0
        var driftUsed = 0

        for i in 0..<bodyNodes.count {
            let node = bodyNodes[i]
            if i >= world.obstacles.count || !world.obstacles[i].active {
                node.isHidden = true
                continue
            }
            let o = world.obstacles[i]
            let y = screenY + (o.y - cameraY)
            let merge = HazardCollision.mergeFactor(o)

            if o.kind == .drift || (o.kind == .phase && merge < 0.001) {
                node.isHidden = true
            } else {
                node.isHidden = false
                if o.kind == .wormhole {
                    node.texture = bake.wormhole(isExit: o.isExit, paired: o.paired)
                } else {
                    node.texture = bake.part(for: o.kind)
                }
                node.position = CGPoint(x: o.x, y: y)
                if o.kind == .wormhole {
                    node.zRotation = o.phase
                } else {
                    node.zRotation = o.kind == .slab || o.kind == .drift ? 0 : o.rotation
                }
                node.size = bodySize(o)
                node.alpha = o.kind == .phase ? merge : 1
                node.colorBlendFactor = 0
            }

            extraUsed = emitExtras(
                o: o,
                screenY: y,
                world: world,
                used: extraUsed
            )
            if o.kind == .drift {
                driftUsed = emitDriftLanes(
                    o: o,
                    screenY: y,
                    world: world,
                    used: driftUsed
                )
            }

            // Android WormholeGate is stroke-only (no fill / no radial). Black
            // holes and repulsors keep their additive glow sprites.
            if o.glow, o.kind != .wormhole, glowUsed < glowNodes.count {
                let glow = glowNodes[glowUsed]
                glowUsed += 1
                glow.isHidden = false
                glow.texture = (o.kind == .blackhole || o.kind == .repulsor) ? bake.glowInk : bake.glowSignal
                glow.position = CGPoint(x: o.x, y: y)
                glow.size = CGSize(width: o.radius * 3.4, height: o.radius * 3.4)
                glow.alpha = 0.85
            }
        }
        for i in glowUsed..<glowNodes.count {
            glowNodes[i].isHidden = true
        }
        for i in extraUsed..<extraNodes.count {
            extraNodes[i].isHidden = true
            extraNodes[i].shader = nil
        }
        for i in driftUsed..<driftLaneNodes.count {
            driftLaneNodes[i].isHidden = true
            driftLaneNodes[i].path = nil
        }

        for i in 0..<pickupNodes.count {
            let node = pickupNodes[i]
            let rings = node.children.compactMap { $0 as? SKSpriteNode }
            if i >= world.pickups.count || !world.pickups[i].active {
                node.isHidden = true
                for ring in rings { ring.isHidden = true }
                continue
            }
            let p = world.pickups[i]
            node.isHidden = false
            node.position = CGPoint(x: p.x, y: screenY + (p.y - cameraY))
            switch p.kind {
            case .sparkle:
                let pulse = 1 + sin(p.phase) * 0.12
                node.texture = bake.sparkle
                node.color = .white
                node.colorBlendFactor = 0
                // Android `Collectible.size` is a radius (`drawSparkle(r)`).
                let r = world.baseUnit * 1.15 * pulse
                node.size = CGSize(width: r * 2, height: r * 2)
                node.zRotation = p.phase * 0.17
                node.alpha = 1
                if let halo = rings.first {
                    let haloD = r * 1.9 * 2
                    halo.isHidden = false
                    halo.texture = bake.signalDisc
                    halo.blendMode = .alpha
                    halo.size = CGSize(width: haloD, height: haloD)
                    halo.alpha = BrandColors.UI.signalSoftAlpha
                    halo.position = .zero
                    halo.zRotation = 0
                }
                for ring in rings.dropFirst() { ring.isHidden = true }
            case .shield:
                let size = world.baseUnit * 2
                node.texture = bake.plus
                node.color = .white
                node.colorBlendFactor = 0
                node.size = CGSize(width: size, height: size)
                node.zRotation = 0
                node.alpha = 1
                let t = (p.phase / (.pi * 2)).truncatingRemainder(dividingBy: 1)
                for (idx, ring) in rings.enumerated() {
                    let tt = (t + CGFloat(idx) * 0.5).truncatingRemainder(dividingBy: 1)
                    let radius = size * (0.5 + tt * 0.8)
                    ring.isHidden = false
                    ring.texture = bake.ring
                    ring.blendMode = .alpha
                    ring.size = CGSize(width: radius * 2, height: radius * 2)
                    ring.alpha = pow(1 - tt, 1.8) * 0.9
                    ring.position = .zero
                }
            case .wallBoost:
                node.texture = bake.part(for: .slab)
                node.color = BrandColors.UI.signal
                node.colorBlendFactor = 1
                node.size = CGSize(width: world.baseUnit * 0.9, height: world.baseUnit * 10)
                node.zRotation = 0
                node.alpha = 0.72 + 0.18 * sin(p.phase)
                for ring in rings { ring.isHidden = true }
            }
        }
    }

    private func bodySize(_ o: ObstacleState) -> CGSize {
        switch o.kind {
        case .square:
            let s = o.radius * 0.7 * 2
            return CGSize(width: s, height: s)
        case .phase:
            let pack = 0.9 + 0.1 * HazardCollision.mergeFactor(o)
            let s = o.radius * 0.72 * 2 * pack
            return CGSize(width: s, height: s)
        case .sweep:
            return CGSize(width: o.halfW * 2, height: max(2, o.halfH * 2))
        case .slab:
            return CGSize(width: o.halfW * 2, height: o.halfH * 2)
        case .wormhole:
            // Android: arc radius = size×pulse, lineWidth = size×0.1. Sprite
            // covers the stroke so the path diameter stays 2×size×pulse.
            let pulse = 1 + sin(o.phase) * 0.1
            let s = o.radius * 2 * pulse + o.radius * 0.1
            return CGSize(width: s, height: s)
        case .repulsor:
            let s = o.radius * 6.2
            return CGSize(width: s, height: s)
        default:
            let s = o.radius * 2
            return CGSize(width: s, height: s)
        }
    }

    private func emitExtras(
        o: ObstacleState,
        screenY: CGFloat,
        world: WorldState,
        used: Int
    ) -> Int {
        var used = used
        switch o.kind {
        case .complex:
            for i in 0..<o.moonCount where o.moonAlive(i) && used < extraNodes.count {
                let p = HazardCollision.moonWorld(o: o, index: i)
                let node = extraNodes[used]
                used += 1
                node.isHidden = false
                node.shader = nil
                node.texture = bake.part(for: .circle)
                node.position = CGPoint(x: p.x, y: screenY + (p.y - o.y))
                node.zRotation = 0
                let s = o.moonSize * 2
                node.size = CGSize(width: s, height: s)
                node.alpha = 1
                node.colorBlendFactor = 0
            }
        case .phase:
            let merge = HazardCollision.mergeFactor(o)
            if merge < 0.999 {
                for i in 0..<4 where used < extraNodes.count {
                    let pos = HazardCollision.pieceLocal(o, index: i)
                    let node = extraNodes[used]
                    used += 1
                    node.isHidden = false
                    node.shader = nil
                    node.texture = bake.part(for: .square)
                    let c = cos(o.rotation)
                    let s = sin(o.rotation)
                    let wx = o.x + pos.x * c - pos.y * s
                    let wy = screenY + pos.x * s + pos.y * c
                    node.position = CGPoint(x: wx, y: wy)
                    node.zRotation = o.rotation + HazardCollision.pieceSpin(o, index: i)
                    let side = o.radius * 0.36 * 2
                    node.size = CGSize(width: side, height: side)
                    node.alpha = 1 - merge
                    node.colorBlendFactor = 0
                }
            }
        default:
            break
        }
        return used
    }

    /// Android `DriftCurrent.render`: 7 ink30 hairlines, dash `[u×0.55, u×0.55×0.85]`,
    /// round caps, `lineDashOffset = -phase × direction` so flow matches the shove.
    private func emitDriftLanes(
        o: ObstacleState,
        screenY: CGFloat,
        world: WorldState,
        used: Int
    ) -> Int {
        let lines = 7
        let u = world.baseUnit
        let dash = u * 0.55
        let gap = dash * 0.85
        let period = max(dash + gap, 1)
        let lineW = max(1.1, u * 0.06)
        var used = used
        for i in 0..<lines where used < driftLaneNodes.count {
            let node = driftLaneNodes[used]
            used += 1
            let yy = screenY - o.halfH * 0.72 + (CGFloat(i) / CGFloat(lines - 1)) * o.halfH * 1.44
            var phase = (o.phase + CGFloat(i) * u * 0.8).truncatingRemainder(dividingBy: period)
            if phase < 0 { phase += period }
            let dashPhase = -phase * o.driftDir
            let line = CGMutablePath()
            line.move(to: CGPoint(x: 0, y: 0))
            line.addLine(to: CGPoint(x: world.width, y: 0))
            node.lineWidth = lineW
            node.lineCap = .round
            node.strokeColor = BrandColors.UI.ink30
            node.path = line.copy(dashingWithPhase: dashPhase, lengths: [dash, gap])
            node.position = CGPoint(x: 0, y: yy)
            node.isHidden = false
        }
        return used
    }
}
