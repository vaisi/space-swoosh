// PlaytestStreakers.swift
// Meteor shower. Dashed ghosts fall on the slant first and do not collide.
// Then the solid rocks follow that same slant.
// Changes:
// - Meteor slant uses CGFloat.pi so Xcode 26 does not treat `.pi` as ambiguous.
// - Created file: Y-up port of playtestStreakers.js. Rocks move toward the ship.

import Foundation
import CoreGraphics

extension PlaytestHazards {
    static func spawnMeteor(world: inout WorldState, run: inout RunState, index: Int, y: CGFloat) {
        let u = world.baseUnit
        var o = ObstacleState.inactive()
        o.active = true
        o.kind = .meteorShower
        o.x = world.width * 0.5
        o.y = y
        o.radius = u * 2
        o.baseRadius = u * 0.42
        o.lethal = true
        let dir: CGFloat = CombatSimulator.rand01(&run.rng) < 0.5 ? -1 : 1
        let angle = 28 * CGFloat.pi / 180
        let v = world.height * ObstacleIntensity.knob(run: run, type: "meteorShower", gentle: 0.6, today: 0.7, hard: 0.8)
        o.vx = dir * sin(angle) * v
        o.driftDir = -cos(angle) * v
        o.moonCount = ObstacleIntensity.knobInt(run: run, type: "meteorShower", gentle: 8, today: 12, hard: 16)
        o.bloomDuration = ObstacleIntensity.knob(run: run, type: "meteorShower", gentle: 1.05, today: 0.75, hard: 0.5)
        o.shotCooldown = -1
        world.obstacles[index] = o
    }

    static func stepMeteor(world: inout WorldState, run: inout RunState, index: Int, dt: CGFloat) {
        var o = world.obstacles[index]
        let top = PlaytestMath.viewTop(world: world, cameraY: world.ship.y)
        if o.shotCooldown < 0 {
            if o.y > top {
                world.obstacles[index] = o
                return
            }
            o.shotCooldown = 0
        }
        o.shotCooldown += dt
        if o.shotCooldown < o.bloomDuration {
            if o.moonAngle == 0 { emitGhosts(world: &world, index: index, o: o) }
            o.moonAngle = 1
        } else {
            let burstT = o.shotCooldown - o.bloomDuration
            let due = min(o.moonCount, Int(floor((burstT / 1.4) * CGFloat(o.moonCount))) + 1)
            while o.moonDist < CGFloat(due) {
                emitRock(world: &world, run: &run, index: index, o: o)
                o.moonDist += 1
            }
        }
        advance(world: &world, index: index, o: o, dt: dt, tag: HazardTag.ghost)
        advance(world: &world, index: index, o: o, dt: dt, tag: HazardTag.meteor)
        let mid = world.ship.y + world.height * (0.5 - CinematicFlight.cruiseSeat)
        o.y = mid
        let rocksDone = o.shotCooldown >= o.bloomDuration && Int(o.moonDist) >= o.moonCount
            && !world.parts.contains { $0.active && $0.parent == index && $0.tag == HazardTag.meteor }
        let ghostsGone = !world.parts.contains { $0.active && $0.parent == index && $0.tag == HazardTag.ghost }
        world.obstacles[index] = o
        if rocksDone && ghostsGone { deactivate(world: &world, index: index) }
    }

    private static func emitGhosts(world: inout WorldState, index: Int, o: ObstacleState) {
        let upstream = (o.vx / o.driftDir) * world.height * 0.35
        for i in 0..<4 {
            guard let slot = alloc(world: &world, parent: index, tag: HazardTag.ghost) else { return }
            world.parts[slot].x = (world.width * (CGFloat(i) + 0.5)) / 4 - upstream
            world.parts[slot].y = o.y + o.baseRadius * CGFloat(4 + i * 5)
            world.parts[slot].lethal = false
            world.parts[slot].a = o.baseRadius
        }
    }

    private static func emitRock(world: inout WorldState, run: inout RunState, index: Int, o: ObstacleState) {
        let upstream = (o.vx / o.driftDir) * world.height * 0.35
        guard let slot = alloc(world: &world, parent: index, tag: HazardTag.meteor) else { return }
        world.parts[slot].x = CombatSimulator.rand01(&run.rng) * world.width - upstream
        world.parts[slot].y = PlaytestMath.viewTop(world: world, cameraY: world.ship.y) + o.baseRadius * 3
        world.parts[slot].lethal = true
        world.parts[slot].a = o.baseRadius
    }

    private static func advance(world: inout WorldState, index: Int, o: ObstacleState, dt: CGFloat, tag: Int) {
        let bottom = PlaytestMath.viewBottom(world: world, cameraY: world.ship.y) - o.baseRadius * 4
        for i in world.parts.indices where world.parts[i].active && world.parts[i].parent == index && world.parts[i].tag == tag {
            world.parts[i].x += o.vx * dt
            world.parts[i].y += o.driftDir * dt
            let x = world.parts[i].x
            let y = world.parts[i].y
            if y < bottom || x < -world.width * 0.3 || x > world.width * 1.3 {
                world.parts[i].active = false
            }
        }
    }
}
