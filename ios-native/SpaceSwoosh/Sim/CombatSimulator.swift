// CombatSimulator.swift
// Changes: Fatal hits use the equipped skin's JS circle pack.

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
    var shieldPulse: CGFloat = 0
    var shieldWarningStarted: Bool = false
    var speedBoostTimer: CGFloat = 0
    var sparklesCollected: Int = 0
    var obstaclesDestroyed: Int = 0
    var points: Int = 0
    var isOver: Bool = false
    var failReason: FailReason?
    var swooshCooldown: CGFloat = 0
    var nextSpawnY: CGFloat = 0
    var sparkleCooldown: CGFloat = 0
    var shieldCooldown: CGFloat = 0
    var wallBoostCooldown: CGFloat = 0
    var sparklesLive: Bool = false
    var shieldsLive: Bool = false
    var wallBoostsLive: Bool = false
    var rng: UInt64 = 0xC0FFEE
    var lastFlipAt: CGFloat = -1
    var teleportT: CGFloat = 0
    var teleportPartner: Int = -1
    var invulnT: CGFloat = 0
    var endingT: CGFloat = 0
    var worldAlpha: CGFloat = 1
    var hullHidden: Bool = false
    var popups: [FloatPopup] = Array(repeating: FloatPopup(), count: FloatPopupBuffer.capacity)
    var blast: [BlastParticle] = Array(repeating: BlastParticle(), count: BlastBuffer.count)
    var sfxBoop: Bool = false
    var sfxCollect: Bool = false
    var sfxCrash: Bool = false
    var sfxTurn: Bool = false
    var sfxShield: Bool = false
    var sfxShieldCrash: Bool = false
    var lastShieldCrashAt: TimeInterval = -1
    var sfxPortalIn: Bool = false
    var sfxPortalOut: Bool = false
    var sfxSwoosh: Bool = false
    var announcedMask: UInt16 = 1
    var milestoneMask: UInt16 = 0
    var taughtSteer: Bool = false
    var taughtAtmosphere: Bool = false
    var milestoneText: String = ""
    var milestoneOpacity: CGFloat = 0
    var milestoneT: CGFloat = 0
    var flightStyle: FlightStyle = .zigzag
    var profile: RunProfile = .openSpace()
    var cinema: CinemaPhase = .play
    var cinemaT: CGFloat = 0
    var introBeatIndex: Int = 0
    var introVoiceDone: Bool = true
    var introVoiceStarted: Bool = false
    var introGapT: CGFloat = 0
    var captionText: String = ""
    var captionOpacity: CGFloat = 0
    var captionT: CGFloat = 0
    var captionHold: CGFloat = 0
    var captionGap: CGFloat = 0
    var pendingBeats: [IntroBeat] = []
    var pauseSpawning: Bool = false
    var completed: Bool = false
    var finishLineY: CGFloat = 0
    var seatY: CGFloat = CinematicFlight.cruiseSeat
    var cameraLead: CGFloat = 0
    var cameraSpeed: CGFloat = 0
    var cinemaBoost: CGFloat = 1
    var cinemaHeading: CGFloat = 0
    var introElapsed: CGFloat = 0
    var streakAlpha: CGFloat = 0
    var logbookMarks: [LogbookMark] = []
    var sfxFirstBoop: Bool = false
    var sfxSwooshVoice: Bool = false
    var hudLive: Bool = true
    var hudRevealT: CGFloat = 0
    var hudDistance: CGFloat = 0
    var hudPause: CGFloat = 0
    var hudSmash: CGFloat = 0
    var hudPoints: CGFloat = 0
    var hudSmashT: CGFloat = -1
    var hudPointsT: CGFloat = -1
    var inputLocked: Bool = false
    var firstBoopDone: Bool = false

    var shieldActive: Bool { shieldTimer > 0 }
    var speedBoostActive: Bool { speedBoostTimer > 0 }

    mutating func grantShield(seconds: CGFloat = GameConfig.Flicker.shieldSeconds) {
        shieldTimer = seconds
        shieldWarningStarted = false
    }

    mutating func extendShield(minimum seconds: CGFloat) {
        shieldTimer = max(shieldTimer, seconds)
        if shieldTimer >= 1.5 { shieldWarningStarted = false }
    }

    mutating func tickShield(dt: CGFloat) {
        guard shieldActive else {
            shieldWarningStarted = false
            return
        }
        shieldTimer = max(0, shieldTimer - dt)
        let pulseRate: CGFloat = speedBoostActive ? 0.14 : 0.1
        shieldPulse += pulseRate * (dt * 60)
        if shieldTimer < 1.5, !shieldWarningStarted {
            shieldWarningStarted = true
            shieldPulse = 0
        }
        if shieldTimer <= 0 {
            shieldWarningStarted = false
        }
    }

    /// Score/popup every smash; throttle crash SFX in clear flyout (Android 120ms).
    mutating func requestShieldCrashSfx() {
        let cinematic = cinema == .clearHold || cinema == .clearBoost || cinema == .clearFade
        if cinematic {
            let now = CFAbsoluteTimeGetCurrent()
            if lastShieldCrashAt >= 0, now - lastShieldCrashAt < 0.12 { return }
            lastShieldCrashAt = now
        }
        sfxShieldCrash = true
    }
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
        if run.isOver {
            run.endingT += dt
            if !run.completed {
                run.worldAlpha = max(0, 1 - (run.endingT / 2.0) * 1.2)
            }
            FloatPopupBuffer.tick(&run.popups, dt: dt)
            BlastBuffer.tick(&run.blast, dt: dt)
            return
        }

        if CinemaSimulator.tick(world: &world, run: &run, dt: dt, command: command) {
            return
        }

        let steer = run.inputLocked ? SteerCommand.none : command
        if steer != .none {
            run.lastFlipAt = run.scoreKm
            run.sfxTurn = true
        }

        if run.teleportT > 0 {
            run.teleportT = max(0, run.teleportT - dt)
            if run.teleportT == 0 {
                HazardCollision.finishTeleport(world: &world, run: &run)
            }
        }
        if run.invulnT > 0 {
            run.invulnT = max(0, run.invulnT - dt)
        }

        let prevY = world.ship.y
        let ship = ShipSimulator()
        if run.teleportT <= 0 {
            let dying: CGFloat
            if run.fuelDying {
                let dur = GameConfig.Fuel.dyingDurationMs / 1000
                dying = max(0, 1 - min(1, run.fuelDyingT / dur))
            } else {
                dying = 1
            }
            let boost: CGFloat = run.speedBoostActive ? 1.82 : 1
            ship.step(
                world: &world,
                dt: dt,
                command: steer,
                speedScale: dying * boost * run.profile.speedMultiplier,
                style: run.flightStyle
            )
            if world.wallBoopSide != 0 {
                emitBoop(world: &world, run: &run)
            }
        }

        let dy = abs(world.ship.y - prevY)
        let kmDelta = GameConfig.kmDelta(dy: dy, playfieldHeight: world.height)
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

        run.tickShield(dt: dt)
        if run.swooshCooldown > 0 {
            run.swooshCooldown = max(0, run.swooshCooldown - dt)
        }

        if run.fuelDying {
            run.fuelDyingT += dt
            if run.fuelDyingT >= GameConfig.Fuel.dyingDurationMs / 1000 {
                run.isOver = true
                run.completed = false
                run.failReason = .fuel
                return
            }
        }

        spawnBelt(world: &world, run: &run)
        moveHazards(world: &world, run: &run, dt: dt)
        HazardCollision.applyFields(world: &world, run: run, dt: dt)
        recycleBehind(world: &world)
        magnetSparkles(world: &world, run: run, dt: dt)
        collectPickups(world: &world, run: &run)
        detectSwoosh(world: world, run: &run)
        HazardCollision.tryTeleport(world: &world, run: &run)
        collide(world: &world, run: &run)
        if !run.profile.isEndless, run.scoreKm >= run.profile.goalKm, !run.isOver {
            CinemaSimulator.beginClear(world: world, run: &run)
        }
        tickMilestones(run: &run, dt: dt)
        FloatPopupBuffer.tick(&run.popups, dt: dt)
    }

    private static func emitBoop(world: inout WorldState, run: inout RunState) {
        let radius = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let sign = world.wallBoopSide
        let x = world.ship.x - sign * (radius * 0.25)
        let y = world.ship.y - radius * 1.75
        // SpriteKit Y-up: -1.6 drifts away from the hull (JS Y-down uses +1.6).
        FloatPopupBuffer.spawn(&run.popups, kind: .boop, x: x, y: y, vy: -1.6)
        run.sfxBoop = true
        world.wallBoopSide = 0
        if !run.firstBoopDone {
            run.firstBoopDone = true
            run.sfxFirstBoop = true
            run.logbookMarks.append(.interact("spaceBoop"))
        }
    }

    private static func spawnBelt(world: inout WorldState, run: inout RunState) {
        if run.pauseSpawning { return }
        if run.nextSpawnY == 0 {
            run.nextSpawnY = world.ship.y + world.height * 0.9
        }
        let gap = run.profile.gapRange(height: world.height)
        var guardCount = 0
        while run.nextSpawnY < world.ship.y + world.height && guardCount < 4 {
            guardCount += 1
            run.nextSpawnY += gap.min + rand01(&run.rng) * (gap.max - gap.min)
            spawnRow(world: &world, run: &run, atY: run.nextSpawnY)
        }

        let ahead = world.ship.y + world.height
        if run.scoreKm >= run.profile.collectiblesFromKm {
            if !run.sparklesLive {
                run.sparklesLive = true
                run.sparkleCooldown = GameConfig.Profile.sparkleFirstWait
            }
            run.sparkleCooldown -= GameConfig.simDt
            if run.sparkleCooldown <= 0 {
                spawnPickup(world: &world, kind: .sparkle, y: ahead, run: &run)
                run.sparkleCooldown = GameConfig.Profile.sparkleMin
                    + rand01(&run.rng) * GameConfig.Profile.sparkleSpan
            }
        }
        if run.scoreKm >= run.profile.shieldsFromKm {
            if !run.shieldsLive {
                run.shieldsLive = true
                run.shieldCooldown = 0
            }
            run.shieldCooldown -= GameConfig.simDt
            if run.shieldCooldown <= 0 {
                spawnPickup(world: &world, kind: .shield, y: ahead, run: &run)
                run.shieldCooldown = GameConfig.Profile.shieldInterval
            }
        }
        if run.scoreKm >= run.profile.wallBoostsFromKm {
            if !run.wallBoostsLive {
                run.wallBoostsLive = true
                run.wallBoostCooldown = 0
            }
            run.wallBoostCooldown -= GameConfig.simDt
            if run.wallBoostCooldown <= 0 {
                spawnPickup(world: &world, kind: .wallBoost, y: ahead, run: &run)
                run.wallBoostCooldown = GameConfig.Profile.wallBoostInterval
            }
        }
    }

    private static func spawnRow(world: inout WorldState, run: inout RunState, atY: CGFloat) {
        if run.scoreKm < run.profile.obstaclesFromKm { return }
        let types = run.profile.unlockedTypes(scoreKm: run.scoreKm)
        guard !types.isEmpty else { return }
        let live = world.obstacles.filter(\.active).count
        if live >= run.profile.maxOnScreen { return }
        var spawnCount = 1
        if run.profile.maxRowSpawns >= 2, rand01(&run.rng) >= 0.7 { spawnCount = 2 }
        if run.profile.maxRowSpawns >= 3, rand01(&run.rng) >= 0.9 { spawnCount = 3 }
        let dens = run.profile.density(scoreKm: run.scoreKm)
        var lastType: String?
        for _ in 0..<spawnCount {
            var type = pickType(types, run: &run)
            if !run.profile.allowAdjacentSetPieces, type != "simple", type == lastType {
                type = types.contains("simple") ? "simple" : type
            }
            if type == "simple" {
                spawnSimpleCluster(world: &world, run: &run, atY: atY, dens: dens)
            } else {
                let size = world.baseUnit * 2.2
                let pos = findValidPosition(
                    world: world,
                    size: size,
                    minX: world.width * 0.18,
                    maxX: world.width * 0.82,
                    baseY: atY,
                    run: &run
                )
                placeHazard(world: &world, type: type, x: pos.x, y: pos.y, run: &run)
            }
            lastType = type
        }
    }

    private static func pickType(_ types: [String], run: inout RunState) -> String {
        if rand01(&run.rng) < run.profile.simpleChance, types.contains("simple") {
            return "simple"
        }
        let others = types.filter { $0 != "simple" }
        if others.isEmpty { return types.contains("simple") ? "simple" : types[0] }
        if let focus = run.profile.liveFocusType(&run.rng),
           others.contains(focus),
           rand01(&run.rng) < run.profile.focusChance {
            return focus
        }
        let idx = Int(run.rng % UInt64(others.count))
        _ = rand01(&run.rng)
        return others[idx]
    }

    private static func spawnSimpleCluster(
        world: inout WorldState,
        run: inout RunState,
        atY: CGFloat,
        dens: CGFloat
    ) {
        let n = run.profile.clusterCount(scoreKm: run.scoreKm, dens: dens, roll: rand01(&run.rng))
        for k in 0..<n {
            let size = world.baseUnit * (0.9 + rand01(&run.rng) * 0.5)
            let minX = world.width * (0.12 + CGFloat(k) * 0.16)
            let maxX = min(world.width * 0.88, minX + world.width * 0.22)
            let pos = findValidPosition(
                world: world,
                size: size,
                minX: minX,
                maxX: max(minX + 1, maxX),
                baseY: atY,
                run: &run
            )
            placeSimple(
                world: &world,
                kind: [.circle, .triangle, .square][k % 3],
                x: pos.x,
                y: pos.y,
                size: size,
                run: &run
            )
        }
    }

    private static func findValidPosition(
        world: WorldState,
        size: CGFloat,
        minX: CGFloat,
        maxX: CGFloat,
        baseY: CGFloat,
        run: inout RunState
    ) -> (x: CGFloat, y: CGFloat) {
        var last = (x: (minX + maxX) * 0.5, y: baseY)
        for _ in 0..<5 {
            let x = minX + rand01(&run.rng) * max(1, maxX - minX)
            let y = baseY + (rand01(&run.rng) - 0.5) * world.height * 0.15
            last = (x, y)
            if !overlaps(world: world, x: x, y: y, size: size) {
                return last
            }
        }
        return last
    }

    private static func overlaps(world: WorldState, x: CGFloat, y: CGFloat, size: CGFloat) -> Bool {
        for o in world.obstacles where o.active {
            let other = max(o.radius, max(o.halfW, o.halfH))
            if hypot(x - o.x, y - o.y) < size + other * 1.5 {
                return true
            }
        }
        return false
    }

    private static func tickMilestones(run: inout RunState, dt: CGFloat) {
        guard run.profile.runsMilestones else {
            if run.milestoneText.isEmpty {
                run.milestoneOpacity = 0
            } else {
                run.milestoneT += dt
                let fadeIn: CGFloat = 0.5
                let hold: CGFloat = 2.0
                let fadeOut: CGFloat = 0.5
                if run.milestoneT < fadeIn {
                    run.milestoneOpacity = run.milestoneT / fadeIn
                } else if run.milestoneT < fadeIn + hold {
                    run.milestoneOpacity = 1
                } else if run.milestoneT < fadeIn + hold + fadeOut {
                    run.milestoneOpacity = 1 - (run.milestoneT - fadeIn - hold) / fadeOut
                } else {
                    run.milestoneText = ""
                    run.milestoneOpacity = 0
                }
            }
            return
        }
        if !run.taughtSteer, run.scoreKm >= GameConfig.Milestones.teachKm, run.lastFlipAt >= 0 {
            run.taughtSteer = true
            showMilestone(
                run: &run,
                run.flightStyle == .zigzag
                    ? "Tap to change direction"
                    : "Bank LEFT or RIGHT to move in arcs"
            )
        }
        if !run.taughtAtmosphere, run.scoreKm >= GameConfig.Milestones.atmosphereKm, run.taughtSteer {
            run.taughtAtmosphere = true
            showMilestone(run: &run, "Breaking the atmosphere!")
        }
        for (i, entry) in GameConfig.Unlocks.table.enumerated() {
            let bit = UInt16(1 << i)
            if run.scoreKm >= entry.score, run.announcedMask & bit == 0 {
                run.announcedMask |= bit
                if i > 0 {
                    showMilestone(run: &run, entry.message)
                }
            }
        }
        for (i, entry) in GameConfig.Milestones.table.enumerated() {
            let bit = UInt16(1 << i)
            if run.scoreKm >= entry.score, run.milestoneMask & bit == 0 {
                run.milestoneMask |= bit
                showMilestone(run: &run, entry.message)
            }
        }
        guard !run.milestoneText.isEmpty else {
            run.milestoneOpacity = 0
            return
        }
        run.milestoneT += dt
        let fadeIn: CGFloat = 0.5
        let hold: CGFloat = 2.0
        let fadeOut: CGFloat = 0.5
        if run.milestoneT < fadeIn {
            run.milestoneOpacity = run.milestoneT / fadeIn
        } else if run.milestoneT < fadeIn + hold {
            run.milestoneOpacity = 1
        } else if run.milestoneT < fadeIn + hold + fadeOut {
            run.milestoneOpacity = 1 - (run.milestoneT - fadeIn - hold) / fadeOut
        } else {
            run.milestoneText = ""
            run.milestoneOpacity = 0
        }
    }

    private static func showMilestone(run: inout RunState, _ text: String) {
        run.milestoneText = text
        run.milestoneT = 0
        run.milestoneOpacity = 0
    }

    private static func placeSimple(
        world: inout WorldState,
        kind: ObstacleKind,
        x: CGFloat,
        y: CGFloat,
        size: CGFloat,
        run: inout RunState
    ) {
        guard let i = freeSlot(world) else { return }
        var o = ObstacleState.inactive()
        o.active = true
        o.kind = kind
        o.x = x
        o.y = y
        o.radius = size
        o.baseRadius = size
        o.spin = (rand01(&run.rng) - 0.5) * 0.05 * 60
        o.lethal = true
        world.obstacles[i] = o
        if let id = LogbookCatalog.simpleId(for: kind) {
            run.logbookMarks.append(.observe(id))
        }
    }

    private static func placeHazard(
        world: inout WorldState,
        type: String,
        x: CGFloat,
        y: CGFloat,
        run: inout RunState
    ) {
        let u = world.baseUnit
        let setSize = u * (GameConfig.Obstacles.minSizeUnits
            + (GameConfig.Obstacles.maxSizeUnits - GameConfig.Obstacles.minSizeUnits) * rand01(&run.rng))
        if let id = LogbookCatalog.obstacleId(for: type) {
            run.logbookMarks.append(.observe(id))
        }
        switch type {
        case "sideBarrier":
            spawnSideBarriers(world: &world, y: y)
        case "complex":
            guard let i = freeSlot(world) else { return }
            var o = ObstacleState.inactive()
            o.active = true
            o.kind = .complex
            o.x = x
            o.y = y
            o.radius = setSize * 0.64
            o.baseRadius = o.radius
            o.spin = (rand01(&run.rng) - 0.5) * 0.05 * 60
            o.moonCount = 2 + Int(rand01(&run.rng) * 3)
            o.moonMask = UInt8((1 << o.moonCount) - 1)
            o.moonDist = setSize * 1.2
            o.moonSize = setSize * 0.2
            o.moonSpin = (0.02 + rand01(&run.rng) * 0.02) * 60
            o.lethal = true
            world.obstacles[i] = o
        case "moving":
            guard let i = freeSlot(world) else { return }
            var o = ObstacleState.inactive()
            o.active = true
            o.kind = .pentagon
            o.x = x
            o.y = y
            o.radius = setSize * 0.8
            o.baseRadius = o.radius
            o.originX = x
            o.vx = (rand01(&run.rng) < 0.5 ? -1 : 1) * u * 2
            o.spin = (rand01(&run.rng) - 0.5) * 0.05 * 60
            o.lethal = true
            world.obstacles[i] = o
        case "shooting":
            guard let i = freeSlot(world) else { return }
            var o = ObstacleState.inactive()
            o.active = true
            o.kind = .star
            o.x = x
            o.y = y
            o.radius = setSize
            o.baseRadius = setSize
            o.spin = (rand01(&run.rng) - 0.5) * 0.05 * 60
            o.shotCooldown = 2
            o.shotSize = setSize * 0.2
            o.lethal = true
            world.obstacles[i] = o
        case "driftCurrent":
            guard let i = freeSlot(world) else { return }
            var o = ObstacleState.inactive()
            o.active = true
            o.kind = .drift
            o.x = world.width * 0.5
            o.y = y
            o.radius = u * 2
            o.baseRadius = o.radius
            o.halfW = world.width * 0.5
            o.halfH = u * (4.2 + rand01(&run.rng) * 1.4) * 0.5
            o.driftDir = rand01(&run.rng) < 0.5 ? -1 : 1
            o.phase = rand01(&run.rng) * 100
            o.lethal = false
            o.spin = 0
            world.obstacles[i] = o
        case "pulsating":
            guard let i = freeSlot(world) else { return }
            var o = ObstacleState.inactive()
            o.active = true
            o.kind = .pulsating
            o.x = x
            o.y = y
            o.radius = setSize
            o.baseRadius = setSize
            o.spin = (rand01(&run.rng) - 0.5) * 0.05 * 60
            o.lethal = true
            world.obstacles[i] = o
        case "phase":
            guard let i = freeSlot(world) else { return }
            let size = u * (1.25 + rand01(&run.rng) * 0.35)
            var o = ObstacleState.inactive()
            o.active = true
            o.kind = .phase
            o.x = min(world.width - size * 3, max(size * 3, x))
            o.y = y
            o.radius = size
            o.baseRadius = size
            o.spin = (rand01(&run.rng) - 0.5) * 0.05 * 60 * 0.22
            o.bloomDuration = 3.6 + rand01(&run.rng) * 0.5
            o.phase = rand01(&run.rng) * .pi * 2
            o.lethal = true
            world.obstacles[i] = o
        case "wormhole":
            spawnWormholePair(world: &world, y: y, run: &run)
        case "repulsor":
            guard let i = freeSlot(world) else { return }
            let size = u * (1.1 + rand01(&run.rng) * 0.35)
            var o = ObstacleState.inactive()
            o.active = true
            o.kind = .repulsor
            o.x = x
            o.y = y
            o.radius = size
            o.baseRadius = size
            o.glow = true
            o.spin = (rand01(&run.rng) - 0.5) * 0.05 * 60 * 0.2
            o.lethal = true
            world.obstacles[i] = o
        case "blackhole":
            guard let i = freeSlot(world) else { return }
            var o = ObstacleState.inactive()
            o.active = true
            o.kind = .blackhole
            o.x = x
            o.y = y
            o.radius = u * 3
            o.baseRadius = o.radius
            o.glow = true
            o.lethal = true
            world.obstacles[i] = o
        case "sweepGate":
            guard let i = freeSlot(world) else { return }
            let size = u * (1.05 + rand01(&run.rng) * 0.35)
            let dir: CGFloat = rand01(&run.rng) < 0.5 ? -1 : 1
            let halfLen = size * 2.8
            var o = ObstacleState.inactive()
            o.active = true
            o.kind = .sweep
            o.x = dir > 0 ? -halfLen * 1.15 : world.width + halfLen * 1.15
            o.y = y
            o.radius = size
            o.baseRadius = size
            o.halfW = halfLen
            o.halfH = max(0.85, size * 0.045)
            o.vx = dir * u * (1.05 + rand01(&run.rng) * 0.45)
            o.spin = (0.007 + rand01(&run.rng) * 0.005) * (rand01(&run.rng) < 0.5 ? -1 : 1) * 60
            o.lethal = true
            world.obstacles[i] = o
        default:
            placeSimple(world: &world, kind: .circle, x: x, y: y, size: u * 1.1, run: &run)
        }
    }

    private static func spawnSideBarriers(world: inout WorldState, y: CGFloat) {
        let width = world.baseUnit * 2
        let height = world.baseUnit * 15
        for isLeft in [true, false] {
            guard let i = freeSlot(world) else { return }
            var o = ObstacleState.inactive()
            o.active = true
            o.kind = .slab
            o.x = isLeft ? width / 2 : world.width - width / 2
            o.y = y
            o.radius = width
            o.baseRadius = width
            o.halfW = width / 2
            o.halfH = height / 2
            o.spin = 0
            o.lethal = true
            world.obstacles[i] = o
        }
    }

    private static func spawnWormholePair(world: inout WorldState, y: CGFloat, run: inout RunState) {
        let size = world.baseUnit * 2
        let margin = size * 4
        guard let entryI = freeSlot(world) else { return }
        let entryX = margin + rand01(&run.rng) * (world.width - margin * 2)
        var entry = ObstacleState.inactive()
        entry.active = true
        entry.kind = .wormhole
        entry.x = entryX
        entry.y = y
        entry.radius = size
        entry.baseRadius = size
        entry.glow = true
        entry.lethal = false
        entry.isExit = false
        world.obstacles[entryI] = entry

        let rocks = 2 + Int(rand01(&run.rng) * 2)
        for k in 0..<rocks {
            let angle = (.pi * 2 * CGFloat(k)) / CGFloat(rocks)
            let dist = world.baseUnit * (8 + rand01(&run.rng) * 2)
            let rx = entryX + cos(angle) * dist
            if rx > margin, rx < world.width - margin {
                placeSimple(
                    world: &world,
                    kind: [.circle, .triangle, .square][k % 3],
                    x: rx,
                    y: y + sin(angle) * dist,
                    size: world.baseUnit * (1 + rand01(&run.rng)),
                    run: &run
                )
            }
        }

        guard let exitI = freeSlot(world) else { return }
        var exit = ObstacleState.inactive()
        exit.active = true
        exit.kind = .wormhole
        exit.x = margin + rand01(&run.rng) * (world.width - margin * 2)
        exit.y = y + world.height * 0.8
        exit.radius = size
        exit.baseRadius = size
        exit.glow = true
        exit.lethal = false
        exit.isExit = true
        exit.partner = entryI
        world.obstacles[exitI] = exit
        world.obstacles[entryI].partner = exitI
    }

    private static func freeSlot(_ world: WorldState) -> Int? {
        world.obstacles.firstIndex(where: { !$0.active })
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
            let halfW = world.baseUnit * 0.9 / 2
            x = rand01(&run.rng) < 0.5 ? halfW : world.width - halfW
        } else {
            let margin = world.baseUnit * 4
            x = margin + rand01(&run.rng) * (world.width - margin * 2)
        }
        world.pickups[i] = PickupState(active: true, kind: kind, x: x, y: y, phase: rand01(&run.rng) * .pi * 2)
        run.logbookMarks.append(.observe(LogbookCatalog.pickupId(for: kind)))
    }

    static func moveHazards(world: inout WorldState, run: inout RunState, dt: CGFloat) {
        for i in 0..<world.obstacles.count {
            guard world.obstacles[i].active else { continue }
            world.obstacles[i].rotation += world.obstacles[i].spin * dt
            switch world.obstacles[i].kind {
            case .pentagon:
                world.obstacles[i].x += world.obstacles[i].vx * dt
                if abs(world.obstacles[i].x - world.obstacles[i].originX) > world.width * 0.3 {
                    world.obstacles[i].vx *= -1
                }
            case .sweep:
                world.obstacles[i].x += world.obstacles[i].vx * dt
                let extent = world.obstacles[i].halfW
                if world.obstacles[i].x + extent < -extent
                    || world.obstacles[i].x - extent > world.width + extent {
                    world.obstacles[i].active = false
                }
            case .pulsating:
                world.obstacles[i].radius += 0.5 * dt
                if world.obstacles[i].radius > world.obstacles[i].baseRadius * 2 {
                    world.obstacles[i].radius = world.obstacles[i].baseRadius
                }
            case .phase:
                stepPhase(&world.obstacles[i], dt: dt)
            case .complex:
                world.obstacles[i].moonAngle += world.obstacles[i].moonSpin * dt
            case .star:
                world.obstacles[i].shotCooldown -= dt
                if world.obstacles[i].shotCooldown <= 0 {
                    world.obstacles[i].shotCooldown = 2
                    fireShot(world: &world, from: world.obstacles[i], run: &run)
                }
            case .wormhole, .repulsor, .blackhole, .drift:
                world.obstacles[i].phase += dt * (world.obstacles[i].kind == .drift ? world.baseUnit * 3.4 : 3.2)
            case .projectile:
                world.obstacles[i].x += world.obstacles[i].vx * dt
                world.obstacles[i].y += world.obstacles[i].originX * dt
            default:
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
        }
        for i in 0..<world.pickups.count {
            guard world.pickups[i].active else { continue }
            world.pickups[i].phase += dt * 3
        }
    }

    private static func stepPhase(_ o: inout ObstacleState, dt: CGFloat) {
        o.phase += dt * 2.2
        let t = o.phaseVel + dt / max(o.bloomDuration, 0.1)
        o.phaseVel = t >= 1 ? t - 1 : t
        let breathe: CGFloat
        let u = o.phaseVel
        let smooth: (CGFloat) -> CGFloat = { a in a * a * (3 - 2 * a) }
        if u < 0.14 {
            breathe = 0
        } else if u < 0.32 {
            breathe = smooth((u - 0.14) / 0.18)
        } else if u < 0.78 {
            breathe = 1
        } else {
            breathe = 1 - smooth((u - 0.78) / 0.22)
        }
        let target = o.radius * 2.45 * breathe
        let expanding = target >= o.displaySpread - 0.5
        let k: CGFloat = expanding ? 220 : 160
        let damp: CGFloat = expanding ? 8.5 : 14
        let acc = (target - o.displaySpread) * k - o.moonSpin * damp
        o.moonSpin += acc * dt
        o.displaySpread += o.moonSpin * dt
    }

    private static func fireShot(world: inout WorldState, from star: ObstacleState, run: inout RunState) {
        guard let i = freeSlot(world) else { return }
        let a = rand01(&run.rng) * .pi * 2
        let speed = world.baseUnit * 3
        var shot = ObstacleState.inactive()
        shot.active = true
        shot.kind = .projectile
        shot.x = star.x
        shot.y = star.y
        shot.radius = star.shotSize
        shot.baseRadius = star.shotSize
        shot.vx = cos(a) * speed
        shot.originX = sin(a) * speed
        shot.lethal = true
        shot.spin = 0
        world.obstacles[i] = shot
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

    static func collectPickups(world: inout WorldState, run: inout RunState) {
        let shipR = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        let u = world.baseUnit
        for i in 0..<world.pickups.count {
            guard world.pickups[i].active else { continue }
            let p = world.pickups[i]
            let hit: Bool
            switch p.kind {
            case .sparkle:
                hit = hypot(p.x - world.ship.x, p.y - world.ship.y) < shipR + u * 1.15
            case .shield:
                hit = hypot(p.x - world.ship.x, p.y - world.ship.y) < shipR + u * 2
            case .wallBoost:
                let halfW = u * 0.9 / 2
                let halfH = u * 10 / 2
                hit = world.ship.x - shipR < p.x + halfW
                    && world.ship.x + shipR > p.x - halfW
                    && world.ship.y - shipR < p.y + halfH
                    && world.ship.y + shipR > p.y - halfH
            }
            guard hit else { continue }
            world.pickups[i].active = false
            run.logbookMarks.append(.interact(LogbookCatalog.pickupId(for: p.kind)))
            switch p.kind {
            case .sparkle:
                guard !run.fuelDying else { break }
                run.fuel = min(GameConfig.Fuel.max, run.fuel + GameConfig.Fuel.refillPerCollectible)
                run.sparklesCollected += 1
                FloatPopupBuffer.spawn(&run.popups, kind: .fuel, x: p.x, y: p.y, vy: 2)
                run.sfxCollect = true
            case .shield:
                run.grantShield()
                run.sfxShield = true
            case .wallBoost:
                run.grantShield()
                run.speedBoostTimer = 5
                run.sfxShield = true
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
        for o in world.obstacles where o.active && o.lethal {
            let ext: CGFloat
            switch o.kind {
            case .slab, .sweep: ext = o.halfW
            case .square: ext = o.radius * 0.7
            default: ext = o.radius
            }
            if abs(o.y - world.ship.y) > yBand + ext { continue }
            if o.x + ext < world.ship.x {
                let gap = world.ship.x - (o.x + ext)
                if gap < maxClear { left = gap }
            } else if o.x - ext > world.ship.x {
                let gap = (o.x - ext) - world.ship.x
                if gap < maxClear { right = gap }
            }
        }
        if left != nil, right != nil {
            run.points += GameConfig.Points.perSwoosh
            run.swooshCooldown = GameConfig.StyleSwoosh.cooldownMs / 1000
            run.sfxSwoosh = true
            run.sfxSwooshVoice = true
            run.logbookMarks.append(.interact("styleSwoosh"))
            FloatPopupBuffer.spawn(
                &run.popups,
                kind: .swoosh,
                x: world.ship.x,
                y: world.ship.y + shipR * 1.2,
                vy: 2.4
            )
        }
    }

    static func collide(world: inout WorldState, run: inout RunState) {
        if run.teleportT > 0 || run.invulnT > 0 { return }
        if HazardCollision.inWormholeSafeZone(world: world, shipX: world.ship.x, shipY: world.ship.y) {
            return
        }
        let shipR = world.baseUnit * GameConfig.Spacecraft.radiusUnits
        for i in 0..<world.obstacles.count {
            guard world.obstacles[i].active, world.obstacles[i].lethal else { continue }
            if run.shieldActive {
                switch ShipHitbox.shieldSmash(
                    world.obstacles[i],
                    ship: world.ship,
                    radius: shipR
                ) {
                case .none:
                    continue
                case .moon(let bit):
                    world.obstacles[i].moonMask &= ~UInt8(1 << bit)
                    run.points += GameConfig.Points.perAsteroid
                    run.obstaclesDestroyed += 1
                    run.scoreKm += 10
                    markSmash(run: &run, obstacle: world.obstacles[i])
                    run.requestShieldCrashSfx()
                    FloatPopupBuffer.spawn(
                        &run.popups,
                        kind: .smash,
                        x: world.obstacles[i].x,
                        y: world.obstacles[i].y,
                        vy: 2
                    )
                case .destroy:
                    let ox = world.obstacles[i].x
                    let oy = world.obstacles[i].y
                    world.obstacles[i].active = false
                    run.points += GameConfig.Points.perAsteroid
                    run.obstaclesDestroyed += 1
                    run.scoreKm += 10
                    markSmash(run: &run, obstacle: world.obstacles[i])
                    run.requestShieldCrashSfx()
                    FloatPopupBuffer.spawn(&run.popups, kind: .smash, x: ox, y: oy, vy: 2)
                }
            } else if ShipHitbox.hits(
                world.obstacles[i],
                ship: world.ship,
                radius: shipR,
                shield: false,
                skinId: world.skinId
                ), !run.fuelDying {
                markInteract(run: &run, obstacle: world.obstacles[i])
                if run.cinema == .clearHold || run.cinema == .clearBoost || run.cinema == .clearFade {
                    continue
                }
                run.isOver = true
                run.completed = false
                run.failReason = .crash
                run.hullHidden = true
                run.sfxCrash = true
                BlastBuffer.explode(
                    into: &run.blast,
                    x: world.ship.x,
                    y: world.ship.y,
                    baseUnit: world.baseUnit
                )
                return
            }
        }
    }

    private static func markSmash(run: inout RunState, obstacle: ObstacleState) {
        markInteract(run: &run, obstacle: obstacle)
        run.logbookMarks.append(.interact("deflectorSmash"))
    }

    private static func markInteract(run: inout RunState, obstacle: ObstacleState) {
        if let id = LogbookCatalog.simpleId(for: obstacle.kind) {
            run.logbookMarks.append(.interact(id))
            return
        }
        let type: String?
        switch obstacle.kind {
        case .slab: type = "sideBarrier"
        case .complex: type = "complex"
        case .pentagon: type = "moving"
        case .star, .projectile: type = "shooting"
        case .pulsating: type = "pulsating"
        case .phase: type = "phase"
        case .sweep: type = "sweepGate"
        case .repulsor: type = "repulsor"
        case .drift: type = "driftCurrent"
        case .wormhole: type = "wormhole"
        case .blackhole: type = "blackhole"
        default: type = nil
        }
        if let type, let id = LogbookCatalog.obstacleId(for: type) {
            run.logbookMarks.append(.interact(id))
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
