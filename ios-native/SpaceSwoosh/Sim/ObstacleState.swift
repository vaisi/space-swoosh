// ObstacleState.swift
// Changes: Phase C — vx for movers; ObstacleField kept for optional stress seed.

import Foundation
import CoreGraphics

enum ObstacleKind: Int, CaseIterable {
    case circle
    case triangle
    case square
    case diamond
    case ring
    case hole
}

struct ObstacleState {
    var active: Bool
    var kind: ObstacleKind
    var x: CGFloat
    var y: CGFloat
    var radius: CGFloat
    var rotation: CGFloat
    var spin: CGFloat
    var glow: Bool
    var vx: CGFloat
}

struct ObstacleField {
    mutating func seed(into world: inout WorldState) {
        let count = world.obstacles.count
        guard count > 0 else { return }
        let span = world.height * GameConfig.Stress.recycleLeadScreens
        let behind = world.height * GameConfig.Stress.recycleBehindScreens
        let kinds = ObstacleKind.allCases
        for i in 0..<count {
            let kind = kinds[i % kinds.count]
            let col = CGFloat(i % 6)
            let row = CGFloat(i / 6)
            world.obstacles[i] = ObstacleState(
                active: true,
                kind: kind,
                x: world.width * (0.10 + (col / 5.0) * 0.80),
                y: world.ship.y - behind + row * (span / 8.0),
                radius: world.baseUnit * GameConfig.Obstacles.minSizeUnits,
                rotation: CGFloat(i) * 0.17,
                spin: ((i % 2 == 0) ? 1 : -1) * 0.55,
                glow: kind == .ring || kind == .hole,
                vx: 0
            )
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
