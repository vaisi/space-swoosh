// PlaytestWallHazards.swift
// Satellite debris and lightning. Cells fly through the walls. Only the bolt
// kills, and only while it is striking. The dashed reach is a tell.
// Changes:
// - Created file: Y-up port of playtestWallHazards.js.

import Foundation
import CoreGraphics

extension PlaytestHazards {
    static func spawnSat(world: inout WorldState, run: inout RunState, index: Int, x: CGFloat, y: CGFloat) {
        let u = world.baseUnit
        let startX = PlaytestMath.clamp(x, world.width * 0.3, world.width * 0.7)
        var o = ObstacleState.inactive()
        o.active = true
        o.kind = .satDebris
        o.x = startX
        o.y = y
        o.radius = u * 3.6
        o.baseRadius = u * 3.6
        o.lethal = true
        let pace = ObstacleIntensity.knob(run: run, type: "satDebris", gentle: 0.8, today: 1, hard: 1.2)
        o.displaySpread = pace
        let toward: CGFloat = startX < world.width * 0.5 ? -1 : 1
        o.vx = toward * world.width * (0.11 + CombatSimulator.rand01(&run.rng) * 0.04) * pace
        o.spin = (CombatSimulator.rand01(&run.rng) < 0.5 ? -1 : 1) * (0.7 + CombatSimulator.rand01(&run.rng) * 0.4)
        o.rotation = CombatSimulator.rand01(&run.rng) * .pi * 2
        world.obstacles[index] = o
    }

    static func stepSat(world: inout WorldState, run: inout RunState, index: Int, dt: CGFloat) {
        var o = world.obstacles[index]
        let top = PlaytestMath.viewTop(world: world, cameraY: world.ship.y)
        if !o.paired && o.y <= top + o.radius * 2 { o.paired = true }
        guard o.paired else {
            world.obstacles[index] = o
            return
        }
        if o.moonCount == 0 {
            o.x += o.vx * dt
            o.rotation += o.spin * dt
            world.obstacles[index] = o
            if let side = wallTouched(world: world, index: index, whole: true) {
                shatter(world: &world, run: &run, index: index, side: side)
            }
            return
        }
        world.obstacles[index] = o
        updatePieces(world: &world, run: &run, index: index, dt: dt)
    }

    static func hitsSat(_ world: WorldState, _ index: Int, _ probes: [(CGFloat, CGFloat, CGFloat)]) -> Bool {
        let rects = satRects(world: world, index: index)
        return probes.contains { p in
            rects.contains { PlaytestMath.hitsRect(p.0, p.1, p.2, $0.x, $0.y, $0.rot, $0.hw, $0.hh) }
        }
    }

    static func satRects(world: WorldState, index: Int) -> [(x: CGFloat, y: CGFloat, rot: CGFloat, hw: CGFloat, hh: CGFloat, kind: CGFloat)] {
        if world.obstacles[index].moonCount > 0 {
            return world.parts.compactMap { part in
                guard part.active, part.parent == index, part.tag == HazardTag.sat else { return nil }
                return (part.x, part.y, part.rot, part.a, part.b, part.c)
            }
        }
        return wholeParts(o: world.obstacles[index], u: world.baseUnit)
    }

    static func spawnLightning(world: inout WorldState, run: inout RunState, index: Int, x: CGFloat, y: CGFloat) {
        let side: CGFloat = x < world.width * 0.5 ? -1 : 1
        var o = ObstacleState.inactive()
        o.active = true
        o.kind = .lightning
        o.x = side < 0 ? 0 : world.width
        o.y = y
        o.radius = world.baseUnit * 2
        o.baseRadius = o.radius
        o.lethal = true
        o.originX = side
        o.bloomDuration = ObstacleIntensity.knob(run: run, type: "lightning", gentle: 1.2, today: 0.9, hard: 0.7)
        let rest = ObstacleIntensity.knob(run: run, type: "lightning", gentle: 2.2, today: 1.5, hard: 1.0)
        o.halfW = o.bloomDuration + 0.22 + 0.18 + rest
        o.displaySpread = world.width * ObstacleIntensity.knob(run: run, type: "lightning", gentle: 0.5, today: 0.62, hard: 0.72)
        o.shotCooldown = -1
        world.obstacles[index] = o
    }

    static func stepLightning(world: inout WorldState, run: inout RunState, index: Int, dt: CGFloat) {
        var o = world.obstacles[index]
        let top = PlaytestMath.viewTop(world: world, cameraY: world.ship.y)
        if o.shotCooldown < 0 {
            if o.y > top { 
                world.obstacles[index] = o
                return
            }
            o.shotCooldown = 0
        }
        let cycle = max(o.halfW, 0.1)
        o.shotCooldown = (o.shotCooldown + dt).truncatingRemainder(dividingBy: cycle)
        world.obstacles[index] = o
        if lightningPhase(o) == "strike" && o.phase - o.phaseVel >= 0.045 {
            rebuildBolt(world: &world, run: &run, index: index)
            world.obstacles[index].phaseVel = world.obstacles[index].phase
        }
    }

    static func lightningPhase(_ o: ObstacleState) -> String {
        if o.shotCooldown < 0 { return "idle" }
        var t = o.shotCooldown
        if t < o.bloomDuration { return "warn" }
        t -= o.bloomDuration
        if t < 0.22 { return "strike" }
        t -= 0.22
        if t < 0.18 { return "fade" }
        return "rest"
    }

    static func hitsLightning(_ world: WorldState, _ index: Int, _ probes: [(CGFloat, CGFloat, CGFloat)]) -> Bool {
        let o = world.obstacles[index]
        guard lightningPhase(o) == "strike" else { return false }
        let u = world.baseUnit
        return probes.contains { p in
            hitChain(world: world, index: index, tag: HazardTag.bolt, px: p.0, py: p.1, r: p.2 + u * 0.18)
                || hitChain(world: world, index: index, tag: HazardTag.branch, px: p.0, py: p.1, r: p.2 + u * 0.12)
        }
    }

    private static func wholeParts(o: ObstacleState, u: CGFloat) -> [(x: CGFloat, y: CGFloat, rot: CGFloat, hw: CGFloat, hh: CGFloat, kind: CGFloat)] {
        let local: [(CGFloat, CGFloat, CGFloat, CGFloat, CGFloat)] = [
            (0, 0, 1.0, 1.0, 0),
            (-2.4, 0, 1.15, 0.62, 1),
            (2.4, 0, 1.15, 0.62, 1),
            (0, -1.65, 0.14, 0.65, 2),
        ]
        let c = cos(o.rotation)
        let s = sin(o.rotation)
        return local.map { p in
            (o.x + (p.0 * c - p.1 * s) * u, o.y + (p.0 * s + p.1 * c) * u, o.rotation, p.2 * u, p.3 * u, p.4)
        }
    }

    private static func wallTouched(world: WorldState, index: Int, whole: Bool) -> CGFloat? {
        let rects = whole ? wholeParts(o: world.obstacles[index], u: world.baseUnit) : satRects(world: world, index: index)
        for p in rects {
            let ext = abs(p.hw * cos(p.rot)) + abs(p.hh * sin(p.rot))
            if p.x - ext <= 0 { return -1 }
            if p.x + ext >= world.width { return 1 }
        }
        return nil
    }

    private static func shatter(world: inout WorldState, run: inout RunState, index: Int, side: CGFloat) {
        let o = world.obstacles[index]
        let u = world.baseUnit
        for part in wholeParts(o: o, u: u) {
            guard let slot = alloc(world: &world, parent: index, tag: HazardTag.sat) else { break }
            world.parts[slot].x = PlaytestMath.clamp(part.x, part.hw + u * 0.2, world.width - part.hw - u * 0.2)
            world.parts[slot].y = part.y
            world.parts[slot].rot = part.rot
            world.parts[slot].a = part.hw
            world.parts[slot].b = part.hh
            world.parts[slot].c = part.kind
            world.parts[slot].lethal = true
            world.parts[slot].vx = -side * world.width * (0.2 + CombatSimulator.rand01(&run.rng) * 0.12) * o.displaySpread
            world.parts[slot].vy = (CombatSimulator.rand01(&run.rng) - 0.5) * world.height * 0.14
            world.parts[slot].spin = (CombatSimulator.rand01(&run.rng) - 0.5) * 5
        }
        world.obstacles[index].moonCount = 1
    }

    private static func updatePieces(world: inout WorldState, run: inout RunState, index: Int, dt: CGFloat) {
        let pace = world.obstacles[index].displaySpread
        let u = world.baseUnit
        var ids: [Int] = []
        for i in world.parts.indices where world.parts[i].active && world.parts[i].parent == index && world.parts[i].tag == HazardTag.sat {
            ids.append(i)
        }
        for i in ids {
            world.parts[i].x += world.parts[i].vx * dt
            world.parts[i].y += world.parts[i].vy * dt
            world.parts[i].rot += world.parts[i].spin * dt
            let ext = max(world.parts[i].a, world.parts[i].b)
            if world.parts[i].c == 3 {
                if world.parts[i].x < -ext * 2 || world.parts[i].x > world.width + ext * 2 {
                    world.parts[i].active = false
                }
                continue
            }
            var side: CGFloat = 0
            if world.parts[i].x < ext {
                world.parts[i].x = ext
                world.parts[i].vx = abs(world.parts[i].vx)
                side = -1
            } else if world.parts[i].x > world.width - ext {
                world.parts[i].x = world.width - ext
                world.parts[i].vx = -abs(world.parts[i].vx)
                side = 1
            }
            if side != 0 && canSplit(world.parts[i], u: u) {
                split(world: &world, run: &run, index: index, source: i, side: side, pace: pace)
            }
        }
        let alive = world.parts.contains { $0.active && $0.parent == index && $0.tag == HazardTag.sat }
        if !alive { deactivate(world: &world, index: index) }
    }

    private static func canSplit(_ p: HazardPart, u: CGFloat) -> Bool {
        if p.c == 1 { return true }
        return p.c == 0 && max(p.a, p.b) > u * 0.6
    }

    private static func split(world: inout WorldState, run: inout RunState, index: Int, source: Int, side: CGFloat, pace: CGFloat) {
        let p = world.parts[source]
        let count = p.c == 1 ? 3 : 2
        let kind: CGFloat = p.c == 1 ? 3 : 0
        let alongX = p.a >= p.b
        let hw = alongX ? p.a / CGFloat(count) : p.a
        let hh = alongX ? p.b : p.b / CGFloat(count)
        let step = (alongX ? hw : hh) * 2
        let ax = alongX ? cos(p.rot) : -sin(p.rot)
        let ay = alongX ? sin(p.rot) : cos(p.rot)
        world.parts[source].active = false
        for i in 0..<count {
            guard let slot = alloc(world: &world, parent: index, tag: HazardTag.sat) else { return }
            let k = CGFloat(i) - CGFloat(count - 1) / 2
            world.parts[slot].c = kind
            world.parts[slot].a = hw
            world.parts[slot].b = hh
            world.parts[slot].rot = p.rot
            world.parts[slot].lethal = true
            world.parts[slot].x = PlaytestMath.clamp(p.x + ax * step * k, hw, world.width - hw)
            world.parts[slot].y = p.y + ay * step * k
            world.parts[slot].vx = -side * world.width * (0.2 + CombatSimulator.rand01(&run.rng) * 0.12) * pace
            world.parts[slot].vy = p.vy + k * world.height * (0.03 + CombatSimulator.rand01(&run.rng) * 0.04)
            world.parts[slot].spin = (CombatSimulator.rand01(&run.rng) - 0.5) * 6
        }
    }

    private static func rebuildBolt(world: inout WorldState, run: inout RunState, index: Int) {
        for i in world.parts.indices where world.parts[i].parent == index && (world.parts[i].tag == HazardTag.bolt || world.parts[i].tag == HazardTag.branch) {
            world.parts[i].active = false
        }
        let o = world.obstacles[index]
        let u = world.baseUnit
        var points: [(CGFloat, CGFloat)] = [(o.x, o.y)]
        for i in 1...10 {
            let s = CGFloat(i) / 10
            let jag = (CombatSimulator.rand01(&run.rng) * 2 - 1) * u * 1.3 * min(1, s * 3)
            points.append((o.x - o.originX * o.displaySpread * s, o.y + jag))
        }
        for (n, point) in points.enumerated() {
            guard let slot = alloc(world: &world, parent: index, tag: HazardTag.bolt) else { return }
            world.parts[slot].x = point.0
            world.parts[slot].y = point.1
            world.parts[slot].c = CGFloat(n)
            world.parts[slot].lethal = true
        }
        let branches = 2 + Int(CombatSimulator.rand01(&run.rng) * 3)
        for b in 0..<branches {
            let from = points[2 + Int(CombatSimulator.rand01(&run.rng) * CGFloat(points.count - 3))]
            let tilt = (CombatSimulator.rand01(&run.rng) < 0.5 ? -1 : 1) * (0.6 + CombatSimulator.rand01(&run.rng) * 0.6)
            let step = u * (1.5 + CombatSimulator.rand01(&run.rng) * 2) / 3
            var x = from.0
            var y = from.1
            for i in 0..<4 {
                if i > 0 {
                    let a = tilt + (CombatSimulator.rand01(&run.rng) - 0.5) * 0.7
                    x += -o.originX * cos(a) * step
                    y += sin(a) * step
                }
                guard let slot = alloc(world: &world, parent: index, tag: HazardTag.branch) else { return }
                world.parts[slot].x = x
                world.parts[slot].y = y
                world.parts[slot].c = CGFloat(b)
                world.parts[slot].d = CGFloat(i)
            }
        }
    }

    private static func hitChain(world: WorldState, index: Int, tag: Int, px: CGFloat, py: CGFloat, r: CGFloat) -> Bool {
        let pts = world.parts
            .filter { $0.active && $0.parent == index && $0.tag == tag }
            .sorted { $0.c == $1.c ? $0.d < $1.d : $0.c < $1.c }
        if tag == HazardTag.branch {
            let groups = Dictionary(grouping: pts, by: { Int($0.c) })
            for group in groups.values {
                let ordered = group.sorted { $0.d < $1.d }
                if chainHit(ordered, px, py, r) { return true }
            }
            return false
        }
        return chainHit(pts, px, py, r)
    }

    private static func chainHit(_ pts: [HazardPart], _ px: CGFloat, _ py: CGFloat, _ r: CGFloat) -> Bool {
        guard pts.count > 1 else { return false }
        for i in 0..<(pts.count - 1) {
            if PlaytestMath.hitsSegment(px, py, r, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) { return true }
        }
        return false
    }
}
