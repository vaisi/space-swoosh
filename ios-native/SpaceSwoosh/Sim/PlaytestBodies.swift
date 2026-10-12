// PlaytestBodies.swift
// Spinner, hollow orbit, ricochet, and blink row, plus the dispatch the
// simulator calls for every new obstacle. Y grows ahead of the ship.
// Changes:
// - Created file: four body hazards and spawn / step / touch entry points.

import Foundation
import CoreGraphics

enum PlaytestTouch {
    case none
    case chip
    case destroy
    case crash
}

enum PlaytestHazards {
    static func owns(_ kind: ObstacleKind) -> Bool {
        typeName(kind) != nil
    }

    static func typeName(_ kind: ObstacleKind) -> String? {
        switch kind {
        case .spinner: return "spinner"
        case .hollowOrbit: return "hollowOrbit"
        case .ricochet: return "ricochet"
        case .blinkRow: return "blinkRow"
        case .tunnelField: return "tunnelField"
        case .shoal: return "shoal"
        case .satDebris: return "satDebris"
        case .lightning: return "lightning"
        case .meteorShower: return "meteorShower"
        default: return nil
        }
    }

    static func reap(world: inout WorldState) {
        for i in world.parts.indices where world.parts[i].active {
            let parent = world.parts[i].parent
            if parent < 0 || parent >= world.obstacles.count || !world.obstacles[parent].active {
                world.parts[i].active = false
            }
        }
    }

    static func deactivate(world: inout WorldState, index: Int) {
        world.obstacles[index].active = false
        for i in world.parts.indices where world.parts[i].parent == index {
            world.parts[i].active = false
        }
    }

    @discardableResult
    static func alloc(world: inout WorldState, parent: Int, tag: Int) -> Int? {
        guard let i = world.parts.firstIndex(where: { !$0.active }) else { return nil }
        world.parts[i] = HazardPart.inactive()
        world.parts[i].active = true
        world.parts[i].parent = parent
        world.parts[i].tag = tag
        return i
    }

    static func spawn(world: inout WorldState, run: inout RunState, type: String, x: CGFloat, y: CGFloat) {
        guard let i = world.obstacles.firstIndex(where: { !$0.active }) else { return }
        let margin = world.baseUnit * 4
        let placed = PlaytestMath.clamp(x, margin, world.width - margin)
        switch type {
        case "spinner": spawnSpinner(world: &world, run: &run, index: i, x: placed, y: y)
        case "hollowOrbit": spawnHollow(world: &world, run: &run, index: i, x: placed, y: y)
        case "ricochet": spawnRicochet(world: &world, run: &run, index: i, x: placed, y: y)
        case "blinkRow": spawnBlink(world: &world, run: &run, index: i, y: y)
        case "tunnelField": spawnTunnel(world: &world, run: &run, index: i, y: y)
        case "shoal": spawnShoal(world: &world, run: &run, index: i, x: placed, y: y)
        case "satDebris": spawnSat(world: &world, run: &run, index: i, x: placed, y: y)
        case "lightning": spawnLightning(world: &world, run: &run, index: i, x: x, y: y)
        case "meteorShower": spawnMeteor(world: &world, run: &run, index: i, y: y)
        default: break
        }
    }

    static func step(world: inout WorldState, index: Int, run: inout RunState, dt: CGFloat) {
        world.obstacles[index].phase += dt
        switch world.obstacles[index].kind {
        case .spinner, .hollowOrbit:
            world.obstacles[index].rotation += world.obstacles[index].spin * dt
        case .ricochet:
            stepRicochet(world: &world, index: index, dt: dt)
        case .blinkRow:
            break
        case .tunnelField:
            stepTunnel(world: &world, index: index)
        case .shoal:
            stepShoal(world: &world, index: index, dt: min(dt, 0.05))
        case .satDebris:
            stepSat(world: &world, run: &run, index: index, dt: dt)
        case .lightning:
            stepLightning(world: &world, run: &run, index: index, dt: dt)
        case .meteorShower:
            stepMeteor(world: &world, run: &run, index: index, dt: dt)
        default:
            break
        }
    }

    static func touch(world: inout WorldState, index: Int, run: RunState) -> PlaytestTouch {
        let shield = run.shieldActive
        let probes = probes(world: world, shield: shield)
        switch world.obstacles[index].kind {
        case .spinner: return bodyTouch(shield, hitsSpinner(world.obstacles[index], probes))
        case .hollowOrbit: return bodyTouch(shield, hitsHollow(world.obstacles[index], probes))
        case .ricochet: return bodyTouch(shield, hitsRicochet(world.obstacles[index], probes))
        case .blinkRow: return bodyTouch(shield, hitsBlink(world.obstacles[index], world: world, probes))
        case .tunnelField: return touchTunnel(world: &world, index: index, probes: probes, shield: shield)
        case .shoal: return bodyTouch(shield, hitsParts(world, index, HazardTag.fish, probes))
        case .satDebris: return bodyTouch(shield, hitsSat(world, index, probes))
        case .lightning: return bodyTouch(shield, hitsLightning(world, index, probes))
        case .meteorShower: return bodyTouch(shield, hitsParts(world, index, HazardTag.meteor, probes))
        default: return .none
        }
    }

    static func setPieceOccupies(world: WorldState, cameraY: CGFloat) -> Bool {
        let pad = world.baseUnit * 4
        for o in world.obstacles where o.active {
            guard o.kind == .tunnelField || o.kind == .shoal || o.kind == .satDebris else { continue }
            if PlaytestMath.onScreen(o.y, world: world, cameraY: cameraY, pad: pad) { return true }
            if world.parts.contains(where: {
                $0.active && $0.parent >= 0 && $0.tag != HazardTag.path
                    && PlaytestMath.onScreen($0.y, world: world, cameraY: cameraY, pad: pad)
                    && world.obstacles[$0.parent].kind == o.kind
            }) { return true }
        }
        return false
    }

    static func probes(world: WorldState, shield: Bool) -> [(CGFloat, CGFloat, CGFloat)] {
        let shipR = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        if shield {
            let r = shipR * GameConfig.Flicker.shieldHitboxScale
            return [(world.ship.x, world.ship.y, r)]
        }
        let c = cos(world.ship.bank)
        let s = sin(world.ship.bank)
        return SkinCatalog.def(world.skinId).hitbox.map { p in
            let lx = p.x * shipR
            let ly = p.y * shipR
            let jx = lx * c - ly * s
            let jy = lx * s + ly * c
            return (world.ship.x + jx, world.ship.y - jy, p.r * shipR)
        }
    }

    private static func bodyTouch(_ shield: Bool, _ hit: Bool) -> PlaytestTouch {
        if !hit { return .none }
        return shield ? .destroy : .crash
    }

    private static func blank(world: inout WorldState, index: Int, kind: ObstacleKind, x: CGFloat, y: CGFloat, radius: CGFloat) {
        var o = ObstacleState.inactive()
        o.active = true
        o.kind = kind
        o.x = x
        o.y = y
        o.radius = radius
        o.baseRadius = radius
        o.lethal = true
        world.obstacles[index] = o
    }

    private static func spawnSpinner(world: inout WorldState, run: inout RunState, index: Int, x: CGFloat, y: CGFloat) {
        let size = PlaytestMath.rockRadius(world: world, rng: &run.rng)
        blank(world: &world, index: index, kind: .spinner, x: x, y: y, radius: size)
        let sign: CGFloat = CombatSimulator.rand01(&run.rng) < 0.5 ? -1 : 1
        world.obstacles[index].spin = sign * ObstacleIntensity.knob(run: run, type: "spinner", gentle: 1.6, today: 2.15, hard: 2.7)
        world.obstacles[index].rotation = CombatSimulator.rand01(&run.rng) * .pi * 2
        world.obstacles[index].halfW = max(1.1, size * 0.11)
        world.obstacles[index].halfH = size * 2.7
        world.obstacles[index].moonSize = size * 0.28
    }

    private static func spawnHollow(world: inout WorldState, run: inout RunState, index: Int, x: CGFloat, y: CGFloat) {
        let size = max(PlaytestMath.rockRadius(world: world, rng: &run.rng), world.baseUnit * 2.4)
        let moon = size * 0.42
        let orbit = size * 2.15
        blank(world: &world, index: index, kind: .hollowOrbit, x: x, y: y, radius: orbit + moon)
        let sign: CGFloat = CombatSimulator.rand01(&run.rng) < 0.5 ? -1 : 1
        world.obstacles[index].spin = sign * ObstacleIntensity.knob(run: run, type: "hollowOrbit", gentle: 0.9, today: 1.25, hard: 1.6)
        world.obstacles[index].rotation = CombatSimulator.rand01(&run.rng) * .pi * 2
        world.obstacles[index].moonSize = moon
        world.obstacles[index].moonDist = orbit
    }

    private static func spawnRicochet(world: inout WorldState, run: inout RunState, index: Int, x: CGFloat, y: CGFloat) {
        let size = PlaytestMath.rockRadius(world: world, rng: &run.rng) * 0.85
        blank(world: &world, index: index, kind: .ricochet, x: x, y: y, radius: size)
        let dir: CGFloat = CombatSimulator.rand01(&run.rng) < 0.5 ? -1 : 1
        let pace = ObstacleIntensity.knob(run: run, type: "ricochet", gentle: 0.8, today: 1, hard: 1.2)
        world.obstacles[index].vx = dir * world.width * 0.38 * pace
        world.obstacles[index].driftDir = -world.height * 0.11 * pace
        world.obstacles[index].originX = y - world.height * 0.42
        world.obstacles[index].shotSize = y + world.height * 0.22
    }

    private static func spawnBlink(world: inout WorldState, run: inout RunState, index: Int, y: CGFloat) {
        let rockR = min(world.baseUnit * 1.65, world.width * 0.085)
        blank(world: &world, index: index, kind: .blinkRow, x: world.width * 0.5, y: y, radius: rockR)
        world.obstacles[index].bloomDuration = ObstacleIntensity.knob(run: run, type: "blinkRow", gentle: 0.95, today: 0.72, hard: 0.56)
    }

    private static func hitsSpinner(_ o: ObstacleState, _ probes: [(CGFloat, CGFloat, CGFloat)]) -> Bool {
        probes.contains { p in
            PlaytestMath.circle(p.0, p.1, p.2, o.x, o.y, o.moonSize)
                || PlaytestMath.hitsHand(p.0, p.1, p.2, o.x, o.y, o.rotation, o.halfH, o.halfW)
        }
    }

    private static func hitsHollow(_ o: ObstacleState, _ probes: [(CGFloat, CGFloat, CGFloat)]) -> Bool {
        probes.contains { p in
            (0..<2).contains { i in
                let a = o.rotation + CGFloat(i) * .pi
                let mx = o.x + cos(a) * o.moonDist
                let my = o.y + sin(a) * o.moonDist
                return PlaytestMath.circle(p.0, p.1, p.2, mx, my, o.moonSize)
            }
        }
    }

    private static func hitsRicochet(_ o: ObstacleState, _ probes: [(CGFloat, CGFloat, CGFloat)]) -> Bool {
        let heading = atan2(o.driftDir, o.vx)
        let verts: [(CGFloat, CGFloat)] = (0..<3).map { i in
            let a = heading + (CGFloat(i) * 2 * .pi) / 3
            return (o.x + cos(a) * o.radius, o.y + sin(a) * o.radius)
        }
        return probes.contains { PlaytestMath.hitsTriangle($0.0, $0.1, $0.2, verts) }
    }

    static func blinkLanes(_ o: ObstacleState, width: CGFloat) -> [CGFloat] {
        let margin = o.radius * 1.7
        let span = width - margin * 2
        return (0..<3).map { margin + (span * CGFloat($0)) / 2 }
    }

    static func hollowIndex(_ o: ObstacleState) -> Int {
        let beat = max(o.bloomDuration, 0.05)
        return Int(floor(o.phase / beat)) % 3
    }

    private static func hitsBlink(_ o: ObstacleState, world: WorldState, _ probes: [(CGFloat, CGFloat, CGFloat)]) -> Bool {
        let hollow = hollowIndex(o)
        let lanes = blinkLanes(o, width: world.width)
        return probes.contains { p in
            lanes.enumerated().contains { i, x in
                i != hollow && PlaytestMath.circle(p.0, p.1, p.2, x, o.y, o.radius)
            }
        }
    }

    private static func stepRicochet(world: inout WorldState, index: Int, dt: CGFloat) {
        var o = world.obstacles[index]
        o.x += o.vx * dt
        o.y += o.driftDir * dt
        let margin = o.radius
        if o.x < margin {
            o.x = margin
            o.vx = abs(o.vx)
        } else if o.x > world.width - margin {
            o.x = world.width - margin
            o.vx = -abs(o.vx)
        }
        if o.y < o.originX {
            o.y = o.originX
            o.driftDir = abs(o.driftDir)
        } else if o.y > o.shotSize {
            o.y = o.shotSize
            o.driftDir = -abs(o.driftDir)
        }
        world.obstacles[index] = o
    }

    static func hitsParts(_ world: WorldState, _ index: Int, _ tag: Int, _ probes: [(CGFloat, CGFloat, CGFloat)]) -> Bool {
        for part in world.parts where part.active && part.parent == index && part.tag == tag && part.lethal {
            if probes.contains(where: { PlaytestMath.circle($0.0, $0.1, $0.2, part.x, part.y, part.a) }) {
                return true
            }
        }
        return false
    }
}
