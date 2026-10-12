// PlaytestFields.swift
// Tunnel field and shoal. The tunnel is carved on the ship's lean. Solid
// pebbles kill; the dashed lining chips off. The shoal bounces twice, then leaves.
// Changes:
// - Created file: Y-up port of playtestFields.js.

import Foundation
import CoreGraphics

extension PlaytestHazards {
    static func spawnTunnel(world: inout WorldState, run: inout RunState, index: Int, y: CGFloat) {
        let u = world.baseUnit
        let zigzag = run.flightStyle == .zigzag
        let widen: CGFloat = zigzag ? 1 : 1.3
        let maxR = u * 0.75
        let slack = tunnelSpeed(world: world, run: run) * ObstacleIntensity.knob(
            run: run, type: "tunnelField", gentle: 0.13, today: 0.08, hard: 0.05
        )
        let softHalf = max(u * (2.0 + 1.2), maxR + u * 1.15 + slack) * widen
        let clearHalf = max(u * 2.0, softHalf - u * 1.2)
        let margin = softHalf + u
        let legs = ObstacleIntensity.knobInt(run: run, type: "tunnelField", gentle: 2, today: 3, hard: 4)
        let plan = zigzag
            ? planZigzag(world: world, run: &run, bottomY: y, margin: margin, legs: legs)
            : planStraight(world: world, run: run, bottomY: y, margin: margin)
        var o = ObstacleState.inactive()
        o.active = true
        o.kind = .tunnelField
        o.x = world.width * 0.5
        o.y = plan.tip
        o.radius = maxR
        o.baseRadius = maxR
        o.lethal = true
        o.moonDist = softHalf
        o.moonSize = clearHalf
        o.originX = plan.near
        o.halfH = u * 2.75 * 0.87
        world.obstacles[index] = o
        for (n, point) in plan.points.enumerated() {
            guard let slot = alloc(world: &world, parent: index, tag: HazardTag.path) else { break }
            world.parts[slot].x = point.0
            world.parts[slot].y = point.1
            world.parts[slot].c = CGFloat(n)
        }
        scatterPebbles(world: &world, run: &run, index: index, points: plan.points)
    }

    static func stepTunnel(world: inout WorldState, index: Int) {
        let o = world.obstacles[index]
        let reach = o.radius * 4
        if world.ship.y < o.originX - reach || world.ship.y > o.y + reach { return }
        let probes = probes(world: world, shield: false)
        for pi in world.parts.indices {
            guard world.parts[pi].active, world.parts[pi].parent == index, world.parts[pi].tag == HazardTag.pebble else { continue }
            guard !world.parts[pi].lethal else { continue }
            let part = world.parts[pi]
            if probes.contains(where: { PlaytestMath.circle($0.0, $0.1, $0.2, part.x, part.y, part.a) }) {
                world.parts[pi].active = false
                world.obstacles[index].isExit = true
            }
        }
    }

    static func touchTunnel(world: inout WorldState, index: Int, probes: [(CGFloat, CGFloat, CGFloat)], shield: Bool) -> PlaytestTouch {
        var chipped = false
        for pi in world.parts.indices {
            guard world.parts[pi].active, world.parts[pi].parent == index, world.parts[pi].tag == HazardTag.pebble, world.parts[pi].lethal else { continue }
            let part = world.parts[pi]
            guard probes.contains(where: { PlaytestMath.circle($0.0, $0.1, $0.2, part.x, part.y, part.a) }) else { continue }
            if shield {
                world.parts[pi].active = false
                world.obstacles[index].isExit = true
                chipped = true
            } else {
                return .crash
            }
        }
        return chipped ? .chip : .none
    }

    static func spawnShoal(world: inout WorldState, run: inout RunState, index: Int, x: CGFloat, y: CGFloat) {
        let u = world.baseUnit
        let count = ObstacleIntensity.knobInt(run: run, type: "shoal", gentle: 7, today: 10, hard: 12)
        let grow = sqrt(CGFloat(count) / 10)
        let spreadX = u * 6.5 * grow
        let spreadY = u * 3.8 * grow
        let cx = PlaytestMath.clamp(x, spreadX + u * 2, world.width - spreadX - u * 2)
        var o = ObstacleState.inactive()
        o.active = true
        o.kind = .shoal
        o.x = cx
        o.y = y
        o.radius = spreadX
        o.baseRadius = spreadX
        o.lethal = true
        o.moonCount = 2
        let pace = ObstacleIntensity.knob(run: run, type: "shoal", gentle: 0.11, today: 0.14, hard: 0.17)
        o.vx = (cx < world.width * 0.5 ? -1 : 1) * world.width * pace
        o.moonSpin = CombatSimulator.rand01(&run.rng) * .pi * 2
        world.obstacles[index] = o
        let slots = placeSchool(count: count, rx: spreadX, ry: spreadY, gap: u * 2.7, rng: &run.rng)
        for slot in slots {
            guard let i = alloc(world: &world, parent: index, tag: HazardTag.fish) else { break }
            world.parts[i].lethal = true
            world.parts[i].b = slot.0
            world.parts[i].c = slot.1
            world.parts[i].x = cx + slot.0
            world.parts[i].y = y + slot.1
            world.parts[i].a = u * (0.7 + CombatSimulator.rand01(&run.rng) * 0.25)
            world.parts[i].d = 0.6 + CombatSimulator.rand01(&run.rng) * 0.9
            world.parts[i].spin = 0.5 + CombatSimulator.rand01(&run.rng) * 0.8
            world.parts[i].rot = CombatSimulator.rand01(&run.rng) * .pi * 2
            world.parts[i].e = CombatSimulator.rand01(&run.rng) * .pi * 2
        }
    }

    static func stepShoal(world: inout WorldState, index: Int, dt: CGFloat) {
        var o = world.obstacles[index]
        let u = world.baseUnit
        let top = PlaytestMath.viewTop(world: world, cameraY: world.ship.y)
        if !o.paired && o.y <= top + o.radius * 2 { o.paired = true }
        if o.paired { o.x += o.vx * dt }
        if o.moonCount > 0 { bounceShoal(world: &world, o: &o, index: index) }
        let gone = o.radius + u * 3
        if o.x < -gone || o.x > world.width + gone {
            world.obstacles[index] = o
            deactivate(world: &world, index: index)
            return
        }
        steerShoal(world: &world, o: o, index: index, dt: dt, u: u)
        world.obstacles[index] = o
    }

    private static func bounceShoal(world: inout WorldState, o: inout ObstacleState, index: Int) {
        let heading: CGFloat = o.vx < 0 ? -1 : 1
        var lead = heading < 0 ? CGFloat.greatestFiniteMagnitude : -CGFloat.greatestFiniteMagnitude
        var any = false
        for part in world.parts where part.active && part.parent == index && part.tag == HazardTag.fish {
            any = true
            if heading < 0 { lead = min(lead, part.x - part.a) } else { lead = max(lead, part.x + part.a) }
        }
        if !any { return }
        if heading < 0 ? lead > 0 : lead < world.width { return }
        o.moonCount -= 1
        o.vx = -o.vx
        for i in world.parts.indices where world.parts[i].active && world.parts[i].parent == index && world.parts[i].tag == HazardTag.fish {
            world.parts[i].vx = -world.parts[i].vx
        }
    }

    private static func steerShoal(world: inout WorldState, o: ObstacleState, index: Int, dt: CGFloat, u: CGFloat) {
        let swayY = sin(o.phase * 0.8 + o.moonSpin) * u * 0.8
        let wander = u * 0.9
        let gap = u * 2.7
        let damp = exp(-4 * dt)
        var ids: [Int] = []
        for i in world.parts.indices where world.parts[i].active && world.parts[i].parent == index && world.parts[i].tag == HazardTag.fish {
            ids.append(i)
        }
        guard !ids.isEmpty else { return }
        var ax = [CGFloat](repeating: 0, count: ids.count)
        var ay = [CGFloat](repeating: 0, count: ids.count)
        for (n, i) in ids.enumerated() {
            let f = world.parts[i]
            let tx = o.x + f.b + sin(o.phase * f.d + f.rot) * wander
            let ty = o.y + swayY + f.c + sin(o.phase * f.spin + f.e) * wander
            ax[n] = (tx - f.x) * 7
            ay[n] = (ty - f.y) * 7
        }
        for a in 0..<ids.count {
            for b in (a + 1)..<ids.count {
                let pa = world.parts[ids[a]]
                let pb = world.parts[ids[b]]
                let dx = pb.x - pa.x
                let dy = pb.y - pa.y
                let dist = max(0.001, hypot(dx, dy))
                if dist >= gap { continue }
                let k = ((gap - dist) / gap) * 90 * u
                ax[a] -= (dx / dist) * k
                ay[a] -= (dy / dist) * k
                ax[b] += (dx / dist) * k
                ay[b] += (dy / dist) * k
            }
        }
        for (n, i) in ids.enumerated() {
            world.parts[i].vx = (world.parts[i].vx + ax[n] * dt) * damp
            world.parts[i].vy = (world.parts[i].vy + ay[n] * dt) * damp
            world.parts[i].x += world.parts[i].vx * dt
            world.parts[i].y += world.parts[i].vy * dt
        }
    }

    private static func placeSchool(count: Int, rx: CGFloat, ry: CGFloat, gap: CGFloat, rng: inout UInt64) -> [(CGFloat, CGFloat)] {
        var slots: [(CGFloat, CGFloat)] = []
        var tries = 0
        while slots.count < count && tries < count * 200 {
            tries += 1
            let a = CombatSimulator.rand01(&rng) * .pi * 2
            let rr = sqrt(CombatSimulator.rand01(&rng))
            let x = cos(a) * rr * rx
            let y = sin(a) * rr * ry
            if slots.allSatisfy({ hypot($0.0 - x, $0.1 - y) >= gap }) {
                slots.append((x, y))
            }
        }
        return slots
    }

    private static func tunnelSpeed(world: WorldState, run: RunState) -> CGFloat {
        let speed = GameConfig.Spacecraft.speed * world.height * GameConfig.Spacecraft.zigzagSpeedScale * run.profile.speedMultiplier
        return speed * GameConfig.motionTickScale(dt: GameConfig.simDt)
    }

    private static func planStraight(world: WorldState, run: RunState, bottomY: CGFloat, margin: CGFloat) -> (points: [(CGFloat, CGFloat)], tip: CGFloat, near: CGFloat) {
        let x = PlaytestMath.clamp(world.ship.x, margin, world.width - margin)
        let tip = bottomY + world.height * 0.45
        let lead = world.baseUnit * 6
        return ([(x, bottomY - lead), (x, tip + lead)], tip, bottomY)
    }

    private static func planZigzag(world: WorldState, run: inout RunState, bottomY: CGFloat, margin: CGFloat, legs: Int) -> (points: [(CGFloat, CGFloat)], tip: CGFloat, near: CGFloat) {
        let tan = tan(GameConfig.Spacecraft.zigzagAngleDeg * .pi / 180)
        let pred = predict(ship: world.ship, targetY: bottomY, width: world.width, tan: tan, radius: world.baseUnit)
        let minRun = world.width * 0.16
        let maxRun = world.width * 0.42
        var x = PlaytestMath.clamp(pred.x, margin, world.width - margin)
        var s = pred.sign
        var y = bottomY
        var points: [(CGFloat, CGFloat)] = [(x, y)]
        func room(_ x: CGFloat, _ s: CGFloat) -> CGFloat { s > 0 ? world.width - margin - x : x - margin }
        for i in 0..<legs {
            if room(x, s) < minRun { s = -s }
            let avail = room(x, s)
            let runLen = min(maxRun, max(min(avail, minRun), avail * (0.5 + CombatSimulator.rand01(&run.rng) * 0.4)))
            x += s * runLen
            y += runLen / tan
            points.append((x, y))
            if i < legs - 1 { s = -s }
        }
        let lead = world.baseUnit * 6
        let first = (points[1].0 - points[0].0) >= 0 ? CGFloat(1) : -1
        let last = (points[points.count - 1].0 - points[points.count - 2].0) >= 0 ? CGFloat(1) : -1
        let tip = points[points.count - 1].1
        points.insert((points[0].0 - first * tan * lead, bottomY - lead), at: 0)
        let end = points[points.count - 1]
        points.append((end.0 + last * tan * lead, tip + lead))
        return (points, tip, bottomY)
    }

    private static func predict(ship: ShipState, targetY: CGFloat, width: CGFloat, tan: CGFloat, radius: CGFloat) -> (x: CGFloat, sign: CGFloat) {
        let dy = targetY - ship.y
        let lo = radius
        let span = width - lo * 2
        let sign = ship.zigzagSign == 0 ? 1 : ship.zigzagSign
        if dy <= 0 || span <= 0 { return (ship.x, sign) }
        let period = span * 2
        let unfolded = ship.x - lo + sign * tan * dy
        let t = unfolded.truncatingRemainder(dividingBy: period)
        let wrapped = t < 0 ? t + period : t
        if wrapped <= span { return (lo + wrapped, sign) }
        return (lo + period - wrapped, -sign)
    }

    private static func scatterPebbles(world: inout WorldState, run: inout RunState, index: Int, points: [(CGFloat, CGFloat)]) {
        let u = world.baseUnit
        let o = world.obstacles[index]
        let spacing = u * 2.75
        let lining = o.moonDist - o.moonSize
        let rowStep = o.halfH
        let near = o.originX
        let tip = o.y
        let height = max(tip - near, rowStep)
        let rowCount = Int(ceil(height / rowStep))
        let wallA = noise(&run.rng)
        let wallB = noise(&run.rng)
        let topN = noise(&run.rng)
        let botN = noise(&run.rng)
        for row in 0..<rowCount {
            let baseY = near + (CGFloat(row) + 0.5) * rowStep
            let offset: CGFloat = row % 2 == 1 ? spacing * 0.5 : 0
            var bx = offset
            while bx < world.width + spacing * 0.5 {
                let x = bx + (CombatSimulator.rand01(&run.rng) - 0.5) * spacing * 0.44
                let y = baseY + (CombatSimulator.rand01(&run.rng) - 0.5) * rowStep * 0.44
                bx += spacing
                if y < near + topN(x / u) * u * 3.5 { continue }
                if y > tip - botN(x / u) * u * 3.5 { continue }
                let r = u * (0.5 + CombatSimulator.rand01(&run.rng) * 0.25)
                let nearPath = closest(x, y, points)
                let wall = nearPath.side > 0 ? wallA : wallB
                let edge = o.moonSize + wall(nearPath.s / u) * u * 0.9
                if nearPath.d < edge + r { continue }
                if nearPath.d < edge + lining + u * 1.5 && CombatSimulator.rand01(&run.rng) < 0.3 { continue }
                guard let slot = alloc(world: &world, parent: index, tag: HazardTag.pebble) else { return }
                world.parts[slot].x = x
                world.parts[slot].y = y
                world.parts[slot].a = r
                world.parts[slot].lethal = nearPath.d >= edge + lining
                world.parts[slot].rot = CombatSimulator.rand01(&run.rng) * .pi * 2
                world.parts[slot].b = CombatSimulator.rand01(&run.rng) < 0.22 ? 1 : 0
            }
        }
    }

    private static func closest(_ px: CGFloat, _ py: CGFloat, _ points: [(CGFloat, CGFloat)]) -> (d: CGFloat, s: CGFloat, side: CGFloat) {
        var best = (d: CGFloat.greatestFiniteMagnitude, s: CGFloat(0), side: CGFloat(1))
        var walked: CGFloat = 0
        guard points.count > 1 else { return best }
        for i in 0..<(points.count - 1) {
            let a = points[i]
            let b = points[i + 1]
            let dx = b.0 - a.0
            let dy = b.1 - a.1
            let len = hypot(dx, dy)
            let safe = len > 0 ? len : 1
            let t = PlaytestMath.clamp(((px - a.0) * dx + (py - a.1) * dy) / (safe * safe), 0, 1)
            let ex = px - (a.0 + t * dx)
            let ey = py - (a.1 + t * dy)
            let d = hypot(ex, ey)
            if d < best.d {
                let side = dx * ey - dy * ex
                best = (d, walked + t * safe, side == 0 ? 1 : (side > 0 ? 1 : -1))
            }
            walked += safe
        }
        return best
    }

    private static func noise(_ rng: inout UInt64) -> (CGFloat) -> CGFloat {
        let amps: [CGFloat] = [0.5, 0.32, 0.18]
        let freqs: [CGFloat] = [0.19, 0.47, 1.1]
        let waves: [(CGFloat, CGFloat, CGFloat)] = (0..<3).map { i in
            (freqs[i] * (0.8 + CombatSimulator.rand01(&rng) * 0.4), CombatSimulator.rand01(&rng) * .pi * 2, amps[i])
        }
        return { t in
            var v: CGFloat = 0
            for w in waves { v += sin(t * w.0 + w.1) * w.2 }
            return PlaytestMath.clamp(0.5 + v * 0.5, 0, 1)
        }
    }
}
