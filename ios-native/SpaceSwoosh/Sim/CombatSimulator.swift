// CombatSimulator.swift
// Changes: Phase C — Open Space spawn, collide, fuel, shield, swoosh from JS spec.

import Foundation
import CoreGraphics

enum FailReason {
    case crash
    case fuel
}

struct RunState {
    var scoreKm: CGFloat = 0
    var fuel: CGFloat = GameConfig.Fuel.start
    var fuelDying: Bool = false
    var fuelDyingT: CGFloat = 0
    var shieldTimer: CGFloat = 0
    var speedBoostTimer: CGFloat = 0
    var sparklesCollected: Int = 0
    var obstaclesDestroyed: Int = 0
    var points: Int = 0
    var isOver: Bool = false
    var failReason: FailReason?
    var swooshCooldown: CGFloat = 0
    var nextSpawnY: CGFloat = 0
    var sparkleCooldown: CGFloat = 0
    var shieldCooldown: CGFloat = 2.4
    var wallBoostCooldown: CGFloat = 8
    var rng: UInt64 = 0xC0FFEE
    var lastFlipAt: CGFloat = -1

    var shieldActive: Bool { shieldTimer > 0 }
    var speedBoostActive: Bool { speedBoostTimer > 0 }
}

enum CombatSimulator {
    static func unlockedTypes(scoreKm: CGFloat) -> [String] {
        GameConfig.Unlocks.table.compactMap { scoreKm >= $0.score ? $0.type : nil }
    }

    static func density(scoreKm: CGFloat) -> CGFloat {
        let s = GameConfig.Obstacles.scaling
        let progress = min(scoreKm / (s.rampUpDistance * 1.2), 1)
        return s.startDensity + (s.maxDensity - s.startDensity) * pow(progress, 1.2)
    }

    static func step(
        world: inout WorldState,
        run: inout RunState,
        dt: CGFloat,
        command: SteerCommand
    ) {
        guard !run.isOver else { return }

        if command == .flip {
            run.lastFlipAt = run.scoreKm
        }

        let prevY = world.ship.y
        var ship = ShipSimulator()
        if run.speedBoostActive {
            // 1.82× matches JS wall-boost gameplay speed.
            stepBoostedShip(world: &world, dt: dt, command: command, factor: 1.82)
        } else {
            ship.step(world: &world, dt: dt, command: command)
        }

        let dy = abs(world.ship.y - prevY)
        let kmDelta = dy * GameConfig.kmPerPixel
        run.scoreKm += kmDelta

        if run.speedBoostActive {
            run.speedBoostTimer = max(0, run.speedBoostTimer - dt)
        } else if !run.fuelDying {
            run.fuel = max(0, run.fuel - kmDelta * GameConfig.Fuel.drainPerKm)
            if run.fuel <= 0 {
                run.fuelDying = true
                run.fuelDyingT = 0
            }
        }

        if run.shieldActive {
            run.shieldTimer = max(0, run.shieldTimer - dt)
        }
        if run.swooshCooldown > 0 {
            run.swooshCooldown = max(0, run.swooshCooldown - dt)
        }

        if run.fuelDying {
            run.fuelDyingT += dt
            if run.fuelDyingT >= GameConfig.Fuel.dyingDurationMs / 1000 {
                run.isOver = true
                run.failReason = .fuel
                return
            }
        }

        spawnBelt(world: &world, run: &run)
        moveHazards(world: &world, dt: dt)
        recycleBehind(world: &world)
        magnetSparkles(world: &world, run: run, dt: dt)
        collectPickups(world: &world, run: &run)
        detectSwoosh(world: world, run: &run)
        collide(world: &world, run: &run)
    }

    private static func stepBoostedShip(
        world: inout WorldState,
        dt: CGFloat,
        command: SteerCommand,
        factor: CGFloat
    ) {
        if command == .flip {
            world.ship.zigzagSign *= -1
        }
        let rad = GameConfig.Spacecraft.zigzagAngleDeg * .pi / 180
        let speed = GameConfig.Spacecraft.speed * world.height
            * GameConfig.Spacecraft.zigzagSpeedScale * factor
        let dist = speed * dt
        var x = world.ship.x + sin(rad) * world.ship.zigzagSign * dist
        var y = world.ship.y + cos(rad) * dist
        let radius = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let margin = radius * 1.2
        if x < margin {
            x = margin
            world.ship.zigzagSign = 1
        } else if x > world.width - margin {
            x = world.width - margin
            world.ship.zigzagSign = -1
        }
        let tangent = world.ship.zigzagSign * rad
        world.ship.x = x
        world.ship.y = y
        world.ship.tangent = tangent
        world.ship.distance += cos(rad) * dist
        world.trail.push(x: x - sin(tangent) * radius * 0.6, y: y - cos(tangent) * radius * 0.6, tangent: tangent)
        world.trail.age(by: dt)
    }

    private static func spawnBelt(world: inout WorldState, run: inout RunState) {
        if run.nextSpawnY == 0 {
            run.nextSpawnY = world.ship.y + world.height * 0.9
        }
        let gapMin = world.height * 0.25
        let gapMax = world.height * 0.4
        var guardCount = 0
        while run.nextSpawnY < world.ship.y + world.height && guardCount < 4 {
            guardCount += 1
            run.nextSpawnY += gapMin + rand01(&run.rng) * (gapMax - gapMin)
            spawnRow(world: &world, run: &run, atY: run.nextSpawnY)
        }

        run.sparkleCooldown -= GameConfig.simDt
        if run.scoreKm >= GameConfig.Profile.collectiblesFromScore, run.sparkleCooldown <= 0 {
            spawnPickup(world: &world, kind: .sparkle, y: world.ship.y + world.height * 0.95, run: &run)
            run.sparkleCooldown = 2.6 + rand01(&run.rng) * 2.6
        }

        run.shieldCooldown -= GameConfig.simDt
        if run.scoreKm >= GameConfig.Profile.shieldsFromScore, run.shieldCooldown <= 0 {
            spawnPickup(world: &world, kind: .shield, y: world.ship.y + world.height * 0.92, run: &run)
            run.shieldCooldown = 7 + rand01(&run.rng) * 5
        }

        run.wallBoostCooldown -= GameConfig.simDt
        if run.scoreKm >= GameConfig.Profile.wallBoostsFromScore, run.wallBoostCooldown <= 0 {
            spawnPickup(world: &world, kind: .wallBoost, y: world.ship.y + world.height * 0.7, run: &run)
            run.wallBoostCooldown = 20 + rand01(&run.rng) * 6
        }
    }

    private static func spawnRow(world: inout WorldState, run: inout RunState, atY: CGFloat) {
        let types = unlockedTypes(scoreKm: run.scoreKm)
        guard !types.isEmpty else { return }
        var spawnCount = 1
        if GameConfig.Profile.maxRowSpawns >= 2, rand01(&run.rng) >= 0.7 { spawnCount = 2 }
        if GameConfig.Profile.maxRowSpawns >= 3, rand01(&run.rng) >= 0.9 { spawnCount = 3 }
        let dens = density(scoreKm: run.scoreKm)
        for i in 0..<spawnCount {
            let type = pickType(types, run: &run)
            let lane = (CGFloat(i) + 0.5) / CGFloat(spawnCount)
            let x = world.width * (0.18 + lane * 0.64 + (rand01(&run.rng) - 0.5) * 0.08)
            if type == "simple" {
                let n = min(GameConfig.Profile.maxClusterCount, 2 + Int(dens))
                for k in 0..<n {
                    placeObstacle(
                        world: &world,
                        kind: [.circle, .triangle, .square][k % 3],
                        x: min(world.width * 0.88, max(world.width * 0.12, x + CGFloat(k - 1) * world.baseUnit * 3.2)),
                        y: atY + CGFloat(k) * world.baseUnit * 1.2,
                        moving: false,
                        run: &run
                    )
                }
            } else {
                placeObstacle(
                    world: &world,
                    kind: kind(for: type),
                    x: type == "sideBarrier"
                        ? (rand01(&run.rng) < 0.5 ? world.baseUnit * 2.2 : world.width - world.baseUnit * 2.2)
                        : x,
                    y: atY,
                    moving: type == "moving" || type == "shooting" || type == "driftCurrent",
                    run: &run
                )
            }
        }
    }

    private static func kind(for type: String) -> ObstacleKind {
        switch type {
        case "sideBarrier": return .square
        case "complex", "phase": return .diamond
        case "pulsating": return .circle
        case "wormhole", "sweepGate": return .ring
        case "blackhole", "repulsor": return .hole
        default: return .triangle
        }
    }

    private static func pickType(_ types: [String], run: inout RunState) -> String {
        if rand01(&run.rng) < GameConfig.Profile.simpleChance, types.contains("simple") {
            return "simple"
        }
        let idx = Int(run.rng % UInt64(types.count))
        _ = rand01(&run.rng)
        return types[idx]
    }

    private static func placeObstacle(
        world: inout WorldState,
        kind: ObstacleKind,
        x: CGFloat,
        y: CGFloat,
        moving: Bool,
        run: inout RunState
    ) {
        guard let i = world.obstacles.firstIndex(where: { !$0.active }) else { return }
        let sizeMix = GameConfig.Obstacles.minSizeUnits
            + (GameConfig.Obstacles.maxSizeUnits - GameConfig.Obstacles.minSizeUnits) * rand01(&run.rng)
        let glow = kind == .ring || kind == .hole
        world.obstacles[i] = ObstacleState(
            active: true,
            kind: kind,
            x: x,
            y: y,
            radius: world.baseUnit * sizeMix * (kind == .square && x < world.width * 0.2 ? 1.4 : 1),
            rotation: 0,
            spin: moving ? 0 : ((rand01(&run.rng) < 0.5) ? -0.4 : 0.4),
            glow: glow,
            vx: moving ? (rand01(&run.rng) < 0.5 ? -1 : 1) * world.width * 0.12 : 0
        )
    }

    private static func spawnPickup(
        world: inout WorldState,
        kind: PickupKind,
        y: CGFloat,
        run: inout RunState
    ) {
        guard let i = world.pickups.firstIndex(where: { !$0.active }) else { return }
        let x: CGFloat
        if kind == .wallBoost {
            x = rand01(&run.rng) < 0.5 ? world.baseUnit * 1.4 : world.width - world.baseUnit * 1.4
        } else {
            x = world.width * (0.18 + rand01(&run.rng) * 0.64)
        }
        world.pickups[i] = PickupState(active: true, kind: kind, x: x, y: y, phase: 0)
    }

    private static func moveHazards(world: inout WorldState, dt: CGFloat) {
        for i in 0..<world.obstacles.count {
            guard world.obstacles[i].active else { continue }
            world.obstacles[i].rotation += world.obstacles[i].spin * dt
            if world.obstacles[i].vx != 0 {
                world.obstacles[i].x += world.obstacles[i].vx * dt
                let r = world.obstacles[i].radius
                if world.obstacles[i].x < r {
                    world.obstacles[i].x = r
                    world.obstacles[i].vx = abs(world.obstacles[i].vx)
                } else if world.obstacles[i].x > world.width - r {
                    world.obstacles[i].x = world.width - r
                    world.obstacles[i].vx = -abs(world.obstacles[i].vx)
                }
            }
        }
        for i in 0..<world.pickups.count {
            guard world.pickups[i].active else { continue }
            world.pickups[i].phase += dt * 2.2
        }
    }

    private static func recycleBehind(world: inout WorldState) {
        let minY = world.ship.y - world.height * 0.4
        for i in 0..<world.obstacles.count where world.obstacles[i].active && world.obstacles[i].y < minY {
            world.obstacles[i].active = false
        }
        for i in 0..<world.pickups.count where world.pickups[i].active && world.pickups[i].y < minY {
            world.pickups[i].active = false
        }
    }

    private static func magnetSparkles(world: inout WorldState, run: RunState, dt: CGFloat) {
        guard !run.fuelDying else { return }
        let shipR = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let magnetR = shipR * GameConfig.Fuel.magnetRadiusScale
        let pull = GameConfig.Fuel.magnetPull * (dt * 60)
        for i in 0..<world.pickups.count {
            guard world.pickups[i].active, world.pickups[i].kind == .sparkle else { continue }
            let dx = world.ship.x - world.pickups[i].x
            let dy = world.ship.y - world.pickups[i].y
            let dist = hypot(dx, dy)
            if dist > 0, dist < magnetR {
                let t = pull * (1 - dist / magnetR)
                world.pickups[i].x += dx * t
                world.pickups[i].y += dy * t
            }
        }
    }

    private static func collectPickups(world: inout WorldState, run: inout RunState) {
        let shipR = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        for i in 0..<world.pickups.count {
            guard world.pickups[i].active else { continue }
            let d = hypot(world.pickups[i].x - world.ship.x, world.pickups[i].y - world.ship.y)
            let hitR = shipR + world.baseUnit * (world.pickups[i].kind == .wallBoost ? 1.6 : 1.15)
            guard d < hitR else { continue }
            world.pickups[i].active = false
            switch world.pickups[i].kind {
            case .sparkle:
                guard !run.fuelDying else { break }
                run.fuel = min(GameConfig.Fuel.max, run.fuel + GameConfig.Fuel.refillPerCollectible)
                run.sparklesCollected += 1
            case .shield:
                run.shieldTimer = 5
            case .wallBoost:
                run.shieldTimer = 5
                run.speedBoostTimer = 5
            }
        }
    }

    private static func detectSwoosh(world: WorldState, run: inout RunState) {
        guard run.swooshCooldown <= 0 else { return }
        let shipR = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let maxClear = shipR * GameConfig.StyleSwoosh.maxClearance
        let yBand = shipR * GameConfig.StyleSwoosh.yBand
        var left: CGFloat?
        var right: CGFloat?
        for o in world.obstacles where o.active {
            if abs(o.y - world.ship.y) > yBand + o.radius { continue }
            if o.x + o.radius < world.ship.x {
                let gap = world.ship.x - (o.x + o.radius)
                if gap < maxClear { left = gap }
            } else if o.x - o.radius > world.ship.x {
                let gap = (o.x - o.radius) - world.ship.x
                if gap < maxClear { right = gap }
            }
        }
        if left != nil, right != nil {
            run.points += GameConfig.Points.perSwoosh
            run.swooshCooldown = GameConfig.StyleSwoosh.cooldownMs / 1000
        }
    }

    private static func collide(world: inout WorldState, run: inout RunState) {
        let shipR = world.baseUnit * GameConfig.Spacecraft.radiusUnits
            * (run.shieldActive ? 1.5 : 1)
        for i in 0..<world.obstacles.count {
            guard world.obstacles[i].active else { continue }
            let d = hypot(world.obstacles[i].x - world.ship.x, world.obstacles[i].y - world.ship.y)
            guard d < shipR + world.obstacles[i].radius * 0.72 else { continue }
            if run.shieldActive {
                world.obstacles[i].active = false
                run.points += GameConfig.Points.perAsteroid
                run.obstaclesDestroyed += 1
                run.scoreKm += 10
            } else if !run.fuelDying {
                run.isOver = true
                run.failReason = .crash
                return
            }
        }
    }

    static func rand01(_ rng: inout UInt64) -> CGFloat {
        rng = rng &* 6364136223846793005 &+ 1
        return CGFloat((rng >> 33) & 0xFFFFFF) / CGFloat(0xFFFFFF)
    }
}

enum PickupKind {
    case sparkle
    case shield
    case wallBoost
}

struct PickupState {
    var active: Bool
    var kind: PickupKind
    var x: CGFloat
    var y: CGFloat
    var phase: CGFloat
}
