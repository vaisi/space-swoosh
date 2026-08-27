// SkinRenderer.swift
// Changes: Live hull warp is not rasterized; pad sprite keeps satellites in bounds.

import SpriteKit
import QuartzCore
import simd

final class SkinRenderer {
    let node = SKNode()
    private let hullRig = SKNode()
    private let hullSprite: SKSpriteNode?
    private let liveHull: LiveHullNode?
    private let liveWarp: SKEffectNode?
    private let livePad: SKSpriteNode?
    private let trail: SkinTrail
    private let skin: SkinDef

    init(skin: SkinDef, bake: BakePipeline) {
        self.skin = skin
        hullRig.zPosition = 10
        node.addChild(hullRig)
        if skin.skipHullCache {
            let warp = SKEffectNode()
            warp.shouldRasterize = false
            warp.subdivisionLevels = 1
            warp.zPosition = 10
            let live = LiveHullNode(id: skin.id, disc: bake.part(for: .circle))
            live.zPosition = 10
            let pad = SKSpriteNode(color: .clear, size: CGSize(width: 1, height: 1))
            pad.alpha = 0
            pad.zPosition = 9
            warp.addChild(pad)
            warp.addChild(live)
            hullRig.addChild(warp)
            liveHull = live
            liveWarp = warp
            livePad = pad
            hullSprite = nil
        } else {
            let hull = SKSpriteNode(texture: bake.hull(for: skin.id))
            hull.zPosition = 10
            hull.subdivisionLevels = 1
            hullRig.addChild(hull)
            hullSprite = hull
            liveHull = nil
            liveWarp = nil
            livePad = nil
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
        case .bloom, .lyra, .boreal, .wish, .puff, .chime, .halo, .orbit, .merlin, .rook:
            shakeScale = 0.7
        case .needle:
            shakeScale = 0.55
        default:
            shakeScale = 0.35
        }
        let plant = WallJelly.plantFactor(skin.jellyProfile)
        let plantX = jellyLive
            ? jelly.side * (radius * skin.halfScale) * (1 - jelly.sx) * plant
            : 0
        let shakeX = jellyLive ? jelly.shake * radius * jelly.side * shakeScale : 0
        let pos = CGPoint(x: ship.x + plantX + shakeX, y: screenY)
        let shearAmt = jellyLive ? jelly.shear * jelly.side : 0
        let warp = Self.shearWarp(shearAmt)

        hullRig.position = pos
        hullRig.zRotation = -ship.bank
        hullRig.xScale = jelly.sx
        hullRig.alpha = hullAlpha

        if let live = liveHull, let liveWarp {
            hullRig.yScale = jelly.sy
            liveWarp.warpGeometry = warp
            let ornament = radius * 3.2 * 2
            livePad?.size = CGSize(width: ornament, height: ornament)
            live.present(radius: radius, turn: turn, jelly: jelly, jellyLive: jellyLive, alpha: 1, nowMs: nowMs)
        } else if let hull = hullSprite {
            hullRig.yScale = jelly.sy * stretch
            hull.warpGeometry = warp
            hull.size = CGSize(width: pad, height: pad)
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

    private static func shearWarp(_ amount: CGFloat) -> SKWarpGeometryGrid {
        let s = Float(amount) * 0.5
        let src: [SIMD2<Float>] = [
            SIMD2(0, 1), SIMD2(1, 1),
            SIMD2(0, 0), SIMD2(1, 0)
        ]
        let dst: [SIMD2<Float>] = [
            SIMD2(s, 1), SIMD2(1 + s, 1),
            SIMD2(-s, 0), SIMD2(1 - s, 0)
        ]
        return SKWarpGeometryGrid(columns: 1, rows: 1, sourcePositions: src, destinationPositions: dst)
    }
}
