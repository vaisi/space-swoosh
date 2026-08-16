// SkinRenderer.swift
// Changes: Factory-build only the equipped hull + wake at startRun.

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
        let bodyTex = bake.hull(for: skin.id)
        if skin.skipHullCache {
            let live = LiveHullNode(
                kind: skin.hullKind,
                bodyTexture: bodyTex,
                disc: bake.part(for: .circle),
                ring: bake.ring,
                glow: bake.glowInk
            )
            live.zPosition = 10
            node.addChild(live)
            liveHull = live
            hullSprite = nil
        } else {
            let hull = SKSpriteNode(texture: bodyTex)
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
        let scale = 0.97 + 0.03 * sin(nowMs * 0.0044)
        let pad = radius * scale * skin.hullDrawPad
        let pos = CGPoint(x: ship.x, y: screenY)

        if let live = liveHull {
            live.position = pos
            live.zRotation = -ship.bank
            live.alpha = hullAlpha
            live.present(radius: radius, pad: pad, stretch: stretch, jelly: jelly, alpha: hullAlpha, nowMs: nowMs)
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
