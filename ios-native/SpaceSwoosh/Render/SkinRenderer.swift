// SkinRenderer.swift
// Changes: Live hulls paint their own stretch; jelly squash + shake on the node.

import SpriteKit
import QuartzCore

final class SkinRenderer {
    let node = SKNode()
    private let hullSprite: SKSpriteNode?
    private let liveHull: LiveHullNode?
    private let trail: SkinTrail
    private let skin: SkinDef

    init(skin: SkinDef, bake: BakePipeline) {
        self.skin = skin
        if skin.skipHullCache {
            let live = LiveHullNode(id: skin.id, disc: bake.part(for: .circle))
            live.zPosition = 10
            node.addChild(live)
            liveHull = live
            hullSprite = nil
        } else {
            let hull = SKSpriteNode(texture: bake.hull(for: skin.id))
            hull.zPosition = 10
            node.addChild(hull)
            hullSprite = hull
            liveHull = nil
        }
        let wake = SkinTrailFactory.make(skin: skin, bake: bake)
        wake.node.zPosition = 5
        node.addChild(wake.node)
        trail = wake
        node.zPosition = 5
    }

    func present(
        ship: ShipState,
        world: WorldState,
        screenY: CGFloat,
        radius: CGFloat,
        cameraY: CGFloat,
        sceneHeight: CGFloat,
        hullAlpha: CGFloat,
        trailAlpha: CGFloat,
        shipSpeed: CGFloat
    ) {
        let nowMs = CGFloat(CACurrentMediaTime() * 1000)
        let turn = min(1, abs(ship.tangent) / GameConfig.Spacecraft.maxBank)
        let stretch = 1 + 0.2 * turn
        let jelly = WallJelly.hullScale(
            elapsedMs: world.jellyElapsedMs,
            side: world.jellySide,
            profile: skin.jellyProfile
        )
        let jellyLive = world.jellyElapsedMs >= 0 && world.jellyElapsedMs < GameConfig.Flicker.wallJellyMs
        let scale = 0.97 + 0.03 * sin(nowMs * 0.0044)
        let pad = radius * scale * skin.hullDrawPad
        let shakeScale: CGFloat
        switch skin.jellyProfile {
        case .bloom, .lyra, .boreal, .wish, .puff, .chime, .halo, .orbit:
            shakeScale = 0.7
        case .needle:
            shakeScale = 0.55
        default:
            shakeScale = 0.35
        }
        let shakeX = jellyLive ? jelly.shake * radius * jelly.side * shakeScale : 0
        let pos = CGPoint(x: ship.x + shakeX, y: screenY)

        if let live = liveHull {
            live.position = pos
            live.zRotation = -ship.bank
            live.alpha = hullAlpha
            live.present(radius: radius, turn: turn, jelly: jelly, jellyLive: jellyLive, alpha: hullAlpha, nowMs: nowMs)
        } else if let hull = hullSprite {
            hull.position = pos
            hull.zRotation = -ship.bank
            hull.xScale = jelly.sx
            hull.yScale = jelly.sy * stretch
            hull.size = CGSize(width: pad, height: pad)
            hull.alpha = hullAlpha
        }

        trail.node.alpha = trailAlpha
        trail.sync(TrailSyncContext(
            trail: world.trail,
            ship: ship,
            cameraY: cameraY,
            sceneHeight: sceneHeight,
            jellyElapsedMs: world.jellyElapsedMs,
            jellySide: world.jellySide,
            shipRadius: radius,
            shipSpeed: shipSpeed,
            skin: skin
        ))
    }
}
