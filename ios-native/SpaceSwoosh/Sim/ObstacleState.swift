// ObstacleState.swift
// Changes: C.5 — per-type hazard kinds + fields for JS collision / motion.

import Foundation
import CoreGraphics

enum ObstacleKind: Int, CaseIterable {
    case circle
    case triangle
    case square
    case pentagon
    case star
    case complex
    case pulsating
    case phase
    case sweep
    case slab
    case drift
    case wormhole
    case repulsor
    case blackhole
    case projectile
}

struct ObstacleState {
    var active: Bool
    var kind: ObstacleKind
    var x: CGFloat
    var y: CGFloat
    /// JS `size` (pulsating writes the live radius here).
    var radius: CGFloat
    var rotation: CGFloat
    var spin: CGFloat
    var glow: Bool
    var vx: CGFloat
    var lethal: Bool
    var halfW: CGFloat
    var halfH: CGFloat
    var originX: CGFloat
    var phase: CGFloat
    var phaseVel: CGFloat
    var bloomDuration: CGFloat
    var displaySpread: CGFloat
    var moonCount: Int
    var moonAngle: CGFloat
    var moonDist: CGFloat
    var moonSize: CGFloat
    var moonMask: UInt8
    var moonSpin: CGFloat
    var partner: Int
    var isExit: Bool
    var paired: Bool
    var driftDir: CGFloat
    var shotCooldown: CGFloat
    var shotSize: CGFloat
    var baseRadius: CGFloat

    static func inactive() -> ObstacleState {
        ObstacleState(
            active: false,
            kind: .circle,
            x: 0,
            y: 0,
            radius: 1,
            rotation: 0,
            spin: 0,
            glow: false,
            vx: 0,
            lethal: true,
            halfW: 0,
            halfH: 0,
            originX: 0,
            phase: 0,
            phaseVel: 0,
            bloomDuration: 3.6,
            displaySpread: 0,
            moonCount: 0,
            moonAngle: 0,
            moonDist: 0,
            moonSize: 0,
            moonMask: 0,
            moonSpin: 0,
            partner: -1,
            isExit: false,
            paired: false,
            driftDir: 0,
            shotCooldown: 0,
            shotSize: 0,
            baseRadius: 1
        )
    }

    func moonAlive(_ index: Int) -> Bool {
        index >= 0 && index < moonCount && (moonMask & (1 << index)) != 0
    }
}

struct ObstacleField {
    mutating func seed(into world: inout WorldState) {
        let count = world.obstacles.count
        guard count > 0 else { return }
        let span = world.height * GameConfig.Stress.recycleLeadScreens
        let behind = world.height * GameConfig.Stress.recycleBehindScreens
        let kinds: [ObstacleKind] = [.circle, .triangle, .square, .pentagon, .star, .sweep]
        for i in 0..<count {
            let kind = kinds[i % kinds.count]
            let col = CGFloat(i % 6)
            let row = CGFloat(i / 6)
            var o = ObstacleState.inactive()
            o.active = true
            o.kind = kind
            o.x = world.width * (0.10 + (col / 5.0) * 0.80)
            o.y = world.ship.y - behind + row * (span / 8.0)
            o.radius = world.baseUnit * 1.1
            o.baseRadius = o.radius
            o.rotation = CGFloat(i) * 0.17
            o.spin = ((i % 2 == 0) ? 1 : -1) * 0.55
            o.glow = kind == .wormhole || kind == .blackhole
            world.obstacles[i] = o
        }
    }

    func step(world: inout WorldState, dt: CGFloat) {
        let lead = world.height * GameConfig.Stress.recycleLeadScreens
        let behind = world.height * GameConfig.Stress.recycleBehindScreens
        let cam = world.ship.y
        for i in 0..<world.obstacles.count {
            guard world.obstacles[i].active else { continue }
            world.obstacles[i].rotation += world.obstacles[i].spin * dt
            if world.obstacles[i].y < cam - behind {
                world.obstacles[i].y = cam + lead
            }
        }
    }
}
