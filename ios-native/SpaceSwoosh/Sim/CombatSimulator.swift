// CombatSimulator.swift
// Changes: L6+ pairing and Open Space KM storms read GeneratedJourneyData
// (catalog + weather + belt table). Delay at maxOnScreen instead of skip-holes.
// Corridor mid-fill, family picker, comboTheme belt.
// Wormholes are helpers (occasional gift hop), not weather identity.
// Open Space storm quiet is short; dual patches chain without half-screen holes.
// Open World steer cue is overlay-only (no second milestone line).
// Atmosphere still at 200 KM. L42 empty space past the gate; playEpilogue.

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
    var fuelLowVoiceLatched: Bool = false
    var sfxFuelLow: Bool = false
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
    var encounterRecipeIds: [String] = []
    var encounterAt: [CGFloat] = []
    var encounterFired: [Bool] = []
    var encounterLiveIndex: Int = -1
    var encounterBeat: Int = 0
    var encounterUsesKm: Bool = false
    var quietUntilY: CGFloat? = nil
    var recentPrimaries: [String] = []
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
    var sfxFuelOut: Bool = false
    var announcedMask: UInt16 = 1
    var milestoneMask: UInt16 = 0
    var taughtSteer: Bool = false
    var taughtSteerLeft: Bool = false
    var taughtSteerRight: Bool = false
    var steerCue: String = ""
    var steerPromptPhase: Int = 0
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
    var playEpilogue: Bool = false
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
        let cinematic = cinema.isClearFlyout
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
            run.steerCue = ""
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
            if steer == .flip { run.taughtSteer = true }
            if steer == .bankLeft { run.taughtSteerLeft = true }
            if steer == .bankRight { run.taughtSteerRight = true }
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
                run.sfxFuelOut = true
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
        noteFuelLowVoice(run: &run)
        detectSwoosh(world: world, run: &run)
        HazardCollision.tryTeleport(world: &world, run: &run)
        collide(world: &world, run: &run)
        if !run.profile.isEndless, run.scoreKm >= run.profile.goalKm, !run.isOver {
            CinemaSimulator.beginClear(world: &world, run: &run)
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
        var guardCount = 0
        while run.nextSpawnY < world.ship.y + world.height && guardCount < 4 {
            guardCount += 1
            LateJourneyBelt.armIfNeeded(run: &run)
            let force = LateJourneyBelt.shouldForceRow(world: world, run: &run)
            let live = world.obstacles.filter { $0.active && $0.y > world.ship.y }.count
            if !force, live >= run.profile.maxOnScreen { break }
            let gap = run.profile.gapRange(height: world.height, scoreKm: run.scoreKm)
            let nextY = run.nextSpawnY + gap.min + rand01(&run.rng) * (gap.max - gap.min)
            if isAtOrPastFinaleGate(y: nextY, world: world, run: run) { break }
            run.nextSpawnY = nextY
            if LateJourneyBelt.inQuietZone(run: &run, y: run.nextSpawnY) { continue }
            let stillForce = LateJourneyBelt.shouldForceRow(world: world, run: &run)
            let stillLive = world.obstacles.filter { $0.active && $0.y > world.ship.y }.count
            if stillForce || stillLive < run.profile.maxOnScreen {
                spawnRow(world: &world, run: &run, atY: run.nextSpawnY)
            }
        }

        let ahead = world.ship.y + world.height
        let skipAhead = isAtOrPastFinaleGate(y: ahead, world: world, run: run)
        if run.scoreKm >= run.profile.collectiblesFromKm {
            if !run.sparklesLive {
                run.sparklesLive = true
                run.sparkleCooldown = GameConfig.Profile.sparkleFirstWait
            }
            run.sparkleCooldown -= GameConfig.simDt
            if run.sparkleCooldown <= 0 {
                if !skipAhead {
                    spawnPickup(world: &world, kind: .sparkle, y: ahead, run: &run)
                }
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
                if !skipAhead {
                    spawnPickup(world: &world, kind: .shield, y: ahead, run: &run)
                }
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
                if !skipAhead {
                    spawnPickup(world: &world, kind: .wallBoost, y: ahead, run: &run)
                }
                run.wallBoostCooldown = GameConfig.Profile.wallBoostInterval
            }
        }
    }

    static func isJourneyFinale(_ run: RunState) -> Bool {
        run.profile.mode == .journey && run.profile.level >= JourneyConfig.totalLevels
    }

    static func finaleGateY(world: WorldState, run: RunState) -> CGFloat? {
        guard isJourneyFinale(run) else { return nil }
        if run.finishLineY > 0 { return run.finishLineY }
        let remaining = max(0, run.profile.goalKm - run.scoreKm)
        let scale = GameConfig.kmReferenceHeight / max(world.height, 1)
        let remainingWorld = remaining / max(scale * GameConfig.kmPerPixel, 0.0001)
        return world.ship.y + remainingWorld
    }

    static func isAtOrPastFinaleGate(y: CGFloat, world: WorldState, run: RunState) -> Bool {
        guard let gate = finaleGateY(world: world, run: run) else { return false }
        return y >= gate - world.baseUnit * 2
    }

    static func cullPastFinaleGate(world: inout WorldState, run: RunState) {
        guard let gate = finaleGateY(world: world, run: run) else { return }
        let margin = world.baseUnit * 2
        for i in world.obstacles.indices {
            if world.obstacles[i].active, world.obstacles[i].y >= gate - margin {
                world.obstacles[i].active = false
            }
        }
        for i in world.pickups.indices {
            if world.pickups[i].active, world.pickups[i].y >= gate - margin {
                world.pickups[i].active = false
            }
        }
    }

    private static func spawnRow(world: inout WorldState, run: inout RunState, atY: CGFloat) {
        if run.scoreKm < run.profile.obstaclesFromKm { return }
        if LateJourneyBelt.playIfNeeded(world: &world, run: &run, atY: atY) { return }
        let types = run.profile.unlockedTypes(scoreKm: run.scoreKm)
        guard !types.isEmpty else { return }
        let spawnCount = run.profile.rollRowSpawnCount(&run.rng, scoreKm: run.scoreKm)
        let dens = run.profile.density(scoreKm: run.scoreKm)
        if run.profile.usesPairedBelt(scoreKm: run.scoreKm) {
            let plan = LateJourneyBelt.planPairedRow(types: types, world: world, run: &run, spawnCount: spawnCount)
            LateJourneyBelt.spawnPlan(plan, world: &world, run: &run, atY: atY, dens: dens)
            return
        }
        var lastType: String?
        var used: [String] = []
        for i in 0..<spawnCount {
            var type = pickType(types, run: &run, world: world)
            if !run.profile.allowAdjacentSetPieces, type != "simple", type == lastType {
                type = types.contains("simple") ? "simple" : type
            }
            if type == "simple" {
                spawnSimpleCluster(world: &world, run: &run, atY: atY, dens: dens)
            } else {
                let lane = spawnCount == 1 ? 0.5 : (0.22 + 0.56 * CGFloat(i) / CGFloat(max(spawnCount - 1, 1)))
                placeHazard(world: &world, type: type, x: world.width * lane, y: atY, run: &run)
                used.append(type)
            }
            lastType = type
        }
        LateJourneyBelt.remember(used, run: &run)
    }

    private static func pickType(_ types: [String], run: inout RunState, world: WorldState) -> String {
        if rand01(&run.rng) < run.profile.liveSimpleChance(scoreKm: run.scoreKm), types.contains("simple") {
            return "simple"
        }
        var others = types.filter { $0 != "simple" }
        if run.profile.usesPairedBelt(scoreKm: run.scoreKm) {
            var banned = Set(run.recentPrimaries)
            let wells = world.obstacles.filter { $0.active && $0.kind == .blackhole }.count
            if wells >= 2 { banned.insert("blackhole") }
            let filtered = others.filter { !banned.contains($0) }
            if !filtered.isEmpty { others = filtered }
        }
        if others.isEmpty { return types.contains("simple") ? "simple" : types[0] }
        if let focus = run.profile.liveFocusType(&run.rng, scoreKm: run.scoreKm),
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
        tickSteerCue(run: &run)
        if run.flightStyle != .zigzag, run.taughtSteerLeft, run.taughtSteerRight {
            run.taughtSteer = true
        }
        if !run.taughtAtmosphere, run.scoreKm >= GameConfig.Milestones.atmosphereKm, run.taughtSteer {
            run.taughtAtmosphere = true
            showMilestone(run: &run, "Breaking the atmosphere!")
        }
        for (i, entry) in GameConfig.Unlocks.table.enumerated() {
            let bit = UInt16(1 << i)
            if run.scoreKm >= entry.score, run.announcedMask & bit == 0 {
                run.announcedMask |= bit
            }
        }
        for (i, entry) in GameConfig.Milestones.table.enumerated() {
            let bit = UInt16(1 << i)
            if run.scoreKm >= entry.score, run.milestoneMask & bit == 0 {
                run.milestoneMask |= bit
                if !Self.isAsteroidWarning(entry.score) {
                    showMilestone(run: &run, entry.message)
                }
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

    private static func tickSteerCue(run: inout RunState) {
        guard run.cinema == .play, !run.isOver, !run.inputLocked else {
            run.steerCue = ""
            return
        }
        if run.flightStyle == .zigzag {
            if run.taughtSteer {
                run.steerCue = ""
                return
            }
            run.steerCue = "tap"
            if run.steerPromptPhase != 1 {
                run.steerPromptPhase = 1
            }
            return
        }
        if !run.taughtSteerLeft {
            run.steerCue = "swipeLeft"
            if run.steerPromptPhase != 1 {
                run.steerPromptPhase = 1
            }
            return
        }
        if !run.taughtSteerRight {
            run.steerCue = "swipeRight"
            if run.steerPromptPhase != 2 {
                run.steerPromptPhase = 2
            }
            return
        }
        run.steerCue = ""
        run.taughtSteer = true
    }

    private static func showMilestone(run: inout RunState, _ text: String) {
        run.milestoneText = text
        run.milestoneT = 0
        run.milestoneOpacity = 0
    }

    /// Distance lines that name rocks — silent in Open Space like JS unlocks.
    private static func isAsteroidWarning(_ score: CGFloat) -> Bool {
        score == 2000 || score == 5000
    }

    fileprivate static func placeSimple(
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

    fileprivate static func placeHazard(
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

    /// Once per dip below 20% in Journey / Open Space. PlayScene latches after it speaks.
    private static func noteFuelLowVoice(run: inout RunState) {
        let mode = run.profile.mode
        guard mode == .openSpace || mode == .journey else { return }
        guard run.sparklesLive else { return }
        if run.fuelDying || run.isOver {
            run.sfxFuelLow = false
            return
        }
        let frac = run.fuel / GameConfig.Fuel.max
        if frac > GameConfig.Fuel.voiceLowThreshold {
            run.fuelLowVoiceLatched = false
            run.sfxFuelLow = false
            return
        }
        if !run.fuelLowVoiceLatched {
            run.sfxFuelLow = true
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
                if run.cinema.isClearFlyout {
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

enum LateJourneyBelt {
    private static let solo: Set<String> = [
        "phase", "wormhole", "sweepGate"
    ]
    private static let corridor: Set<String> = [
        "sideBarrier", "driftCurrent"
    ]
    private static let helpers: Set<String> = [
        "wormhole"
    ]
    private static let heavy: Set<String> = [
        "blackhole", "repulsor", "wormhole", "sweepGate", "phase", "sideBarrier"
    ]
    private static let points: Set<String> = [
        "simple", "moving", "shooting", "pulsating", "complex"
    ]

    private static var recipes: [EncounterRecipe] { GeneratedJourneyData.encounterCatalog }

    static func armIfNeeded(run: inout RunState) {
        if !run.encounterRecipeIds.isEmpty { return }
        if run.profile.mode == .openSpace {
            armOpenSpaceStorms(run: &run)
            return
        }
        let count = run.profile.encounterCount
        guard count > 0 else { return }
        let ids = pickIds(
            types: run.profile.types,
            focus: run.profile.focusType,
            pair: run.profile.pairTheme,
            count: count,
            level: run.profile.level
        )
        let anchors: [CGFloat] = count == 1 ? [0.42] : [0.32, 0.68]
        run.encounterRecipeIds = ids
        run.encounterUsesKm = false
        run.encounterAt = ids.enumerated().map { i, _ in
            let seed = (run.profile.level * 997 + (i + 3) * 7919) % 1000
            let jitter = (CGFloat(seed) / 1000 - 0.5) * 0.08
            return min(0.88, max(0.15, anchors[min(i, anchors.count - 1)] + jitter))
        }
        run.encounterFired = Array(repeating: false, count: ids.count)
    }

    private static func armOpenSpaceStorms(run: inout RunState) {
        let marks = OpenSpaceWeather.stormMarks()
        var ids: [String] = []
        var ats: [CGFloat] = []
        var lastFamily: String?
        for (i, km) in marks.enumerated() {
            let types = GameConfig.Unlocks.table.compactMap { km >= $0.score ? $0.type : nil }
            let sky = OpenSpaceWeather.at(km)
            let unlocking = GameConfig.Unlocks.table.last { $0.score == km && $0.type != "simple" }?.type
            let count = OpenSpaceWeather.stormCount(at: km)
            let picked = pickIds(
                types: types,
                focus: unlocking ?? sky.focus,
                pair: sky.pair,
                count: count,
                level: i + Int(km / 100),
                avoidFamily: lastFamily
            )
            for id in picked {
                guard let rec = recipes.first(where: { $0.id == id }) else { continue }
                ids.append(id)
                ats.append(km)
                lastFamily = rec.family
            }
        }
        if ids.isEmpty {
            run.encounterRecipeIds = ["_none"]
            run.encounterAt = []
            run.encounterFired = []
            run.encounterUsesKm = true
            return
        }
        run.encounterRecipeIds = ids
        run.encounterAt = ats
        run.encounterFired = Array(repeating: false, count: ids.count)
        run.encounterUsesKm = true
    }

    static func inQuietZone(run: inout RunState, y: CGFloat) -> Bool {
        guard let until = run.quietUntilY else { return false }
        if y >= until {
            run.quietUntilY = nil
            return false
        }
        return true
    }

    static func shouldForceRow(world: WorldState, run: inout RunState) -> Bool {
        if run.encounterLiveIndex >= 0 { return true }
        return wouldStart(world: world, run: &run)
    }

    static func playIfNeeded(world: inout WorldState, run: inout RunState, atY: CGFloat) -> Bool {
        if run.encounterRecipeIds.isEmpty { return false }
        if run.quietUntilY != nil { return false }
        if run.encounterLiveIndex < 0 {
            guard wouldStart(world: world, run: &run) else { return false }
            if let i = run.encounterFired.enumerated().first(where: { !$0.element && cursor(world: world, run: run) >= run.encounterAt[$0.offset] })?.offset {
                run.encounterFired[i] = true
                run.encounterLiveIndex = i
                run.encounterBeat = 0
            } else {
                return false
            }
        }
        let recipe = recipes.first { $0.id == run.encounterRecipeIds[run.encounterLiveIndex] }
        guard let recipe, run.encounterBeat < recipe.beats.count else {
            run.encounterLiveIndex = -1
            return false
        }
        let beat = recipe.beats[run.encounterBeat]
        run.encounterBeat += 1
        let last = run.encounterBeat >= recipe.beats.count
        let chained = last && run.encounterUsesKm && hasChainedStorm(run: run)
        if beat.kind == "gap" {
            var frac = beat.frac
            if run.encounterUsesKm {
                frac = min(frac, GeneratedJourneyData.openSpaceStormGapCap)
            }
            if last, run.encounterUsesKm {
                frac = min(frac, quietFrac(chained: chained))
            }
            run.quietUntilY = atY + world.height * frac
            if last { run.encounterLiveIndex = -1 }
            return true
        }
        spawnPlan(beat.slots, world: &world, run: &run, atY: atY, dens: run.profile.density(scoreKm: run.scoreKm))
        if last {
            let frac = run.encounterUsesKm ? quietFrac(chained: chained) : 0.5
            run.quietUntilY = atY + world.height * frac
            run.encounterLiveIndex = -1
        }
        return true
    }

    private static func hasChainedStorm(run: RunState) -> Bool {
        guard run.encounterLiveIndex >= 0, run.encounterLiveIndex < run.encounterAt.count else { return false }
        let km = run.encounterAt[run.encounterLiveIndex]
        for i in run.encounterFired.indices where !run.encounterFired[i] {
            if abs(run.encounterAt[i] - km) < 0.5 { return true }
        }
        return false
    }

    private static func quietFrac(chained: Bool) -> CGFloat {
        chained
            ? GeneratedJourneyData.openSpaceStormChainFrac
            : GeneratedJourneyData.openSpaceStormQuietFrac
    }

    static func remember(_ types: [String], run: inout RunState) {
        let heavies = types.filter { heavy.contains($0) }
        let aged = Array(run.recentPrimaries.prefix(2))
        run.recentPrimaries = Array((heavies + aged).prefix(3))
    }

    static func planPairedRow(types: [String], world: WorldState, run: inout RunState, spawnCount: Int) -> [EncounterSlot] {
        let banned: Set<String> = {
            var set = Set(run.recentPrimaries)
            let wells = world.obstacles.filter { $0.active && $0.kind == .blackhole }.count
            if wells >= 2 { set.insert("blackhole") }
            return set
        }()
        let helpers = types.filter { LateJourneyBelt.helpers.contains($0) && !banned.contains($0) }
        let advanced = types.filter {
            $0 != "simple" && !banned.contains($0) && !LateJourneyBelt.helpers.contains($0)
        }
        let pool = advanced.isEmpty
            ? types.filter { $0 != "simple" && !LateJourneyBelt.helpers.contains($0) }
            : advanced
        guard !pool.isEmpty || !helpers.isEmpty else { return [slot("simple")] }
        if run.profile.mode == .openSpace,
           CombatSimulator.rand01(&run.rng) < run.profile.liveSimpleChance(scoreKm: run.scoreKm) {
            return [slot("simple")]
        }
        let focus = run.profile.liveFocusType(&run.rng, scoreKm: run.scoreKm)
        let pair = run.profile.livePairTheme(scoreKm: run.scoreKm)
        let combo = run.profile.liveComboTheme(scoreKm: run.scoreKm)
        let roll = CombatSimulator.rand01(&run.rng)
        var primary: String
        if pool.isEmpty {
            primary = helpers[Int(CombatSimulator.rand01(&run.rng) * CGFloat(helpers.count)) % helpers.count]
        } else {
            primary = pool[Int(CombatSimulator.rand01(&run.rng) * CGFloat(pool.count)) % pool.count]
        }
        if let focus, LateJourneyBelt.helpers.contains(focus), helpers.contains(focus), roll < 0.28 {
            primary = focus
        } else if let pair, LateJourneyBelt.helpers.contains(pair), helpers.contains(pair), roll < 0.52 {
            primary = pair
        } else if let combo, LateJourneyBelt.helpers.contains(combo), helpers.contains(combo), roll < 0.72 {
            primary = combo
        } else if !helpers.isEmpty, roll < 0.08 {
            primary = helpers[Int(CombatSimulator.rand01(&run.rng) * CGFloat(helpers.count)) % helpers.count]
        } else if let focus, pool.contains(focus), roll < 0.28 {
            primary = focus
        } else if let pair, pool.contains(pair), roll < 0.52 {
            primary = pair
        } else if let combo, pool.contains(combo), roll < 0.72 {
            primary = combo
        }

        if corridor.contains(primary) {
            let mid: String
            if CombatSimulator.rand01(&run.rng) < 0.5 {
                mid = "simple"
            } else {
                let pts = types.filter { points.contains($0) && $0 != "simple" && !banned.contains($0) }
                if let pair, pts.contains(pair) {
                    mid = pair
                } else if let combo, pts.contains(combo), CombatSimulator.rand01(&run.rng) < 0.20 {
                    mid = combo
                } else if !pts.isEmpty {
                    mid = pts[Int(CombatSimulator.rand01(&run.rng) * CGFloat(pts.count)) % pts.count]
                } else {
                    mid = "simple"
                }
            }
            return [slot(primary), slot(mid, "center")]
        }

        if solo.contains(primary) || primary == "simple" {
            return [slot(primary)]
        }
        let packThin = run.profile.mode == .openSpace
            && points.contains(primary)
            && primary != "simple"
        if spawnCount < 2 && !packThin {
            return [slot(primary)]
        }

        let clean = types.filter { t in
            t != "simple" && t != primary && !solo.contains(t) && !banned.contains(t)
        }
        var partner = "simple"
        if let pair, clean.contains(pair), CombatSimulator.rand01(&run.rng) < 0.45 {
            partner = pair
        } else if let combo, clean.contains(combo), CombatSimulator.rand01(&run.rng) < 0.20 {
            partner = combo
        } else if !clean.isEmpty {
            partner = clean[Int(CombatSimulator.rand01(&run.rng) * CGFloat(clean.count)) % clean.count]
        }
        if partner != "simple", CombatSimulator.rand01(&run.rng) < 0.28 { partner = "simple" }

        if spawnCount >= 3, points.contains(primary), points.contains(partner), partner != "simple", primary != "blackhole" {
            return [slot(primary, "left"), slot("simple", "center"), slot(partner, "right")]
        }

        let fieldLeft = CombatSimulator.rand01(&run.rng) < 0.5
        let primaryLane = (primary == "blackhole" || primary == "repulsor")
            ? (fieldLeft ? "left" : "right")
            : "left"
        let partnerLane = primaryLane == "left" ? "right" : "left"
        return [slot(primary, primaryLane), slot(partner, partnerLane)]
    }

    static func spawnPlan(_ slots: [EncounterSlot], world: inout WorldState, run: inout RunState, atY: CGFloat, dens: CGFloat) {
        for item in slots {
            let x = laneX(item.lane, width: world.width)
            if item.type == "simple" {
                spawnLaneCluster(world: &world, run: &run, atY: atY, dens: dens, lane: item.lane)
            } else {
                CombatSimulator.placeHazard(world: &world, type: item.type, x: x, y: atY, run: &run)
            }
        }
        remember(slots.map(\.type), run: &run)
    }

    private static func wouldStart(world: WorldState, run: inout RunState) -> Bool {
        if run.encounterLiveIndex >= 0 || run.encounterRecipeIds.isEmpty { return false }
        if run.quietUntilY != nil { return false }
        let p = cursor(world: world, run: run)
        if !run.encounterUsesKm, p > 0.9 { return false }
        for i in run.encounterFired.indices where !run.encounterFired[i] {
            if p >= run.encounterAt[i] { return true }
        }
        return false
    }

    private static func cursor(world: WorldState, run: RunState) -> CGFloat {
        let ahead = run.nextSpawnY - world.ship.y
        let spawnKm = run.scoreKm + GameConfig.kmDelta(dy: ahead, playfieldHeight: world.height)
        if run.encounterUsesKm { return spawnKm }
        let goal = run.profile.goalKm
        guard goal > 0, goal < RunProfile.neverKm / 2 else { return 0 }
        return min(1, max(0, spawnKm / goal))
    }

    private static func pickIds(
        types: [String],
        focus: String?,
        pair: String?,
        count: Int,
        level: Int,
        avoidFamily: String? = nil
    ) -> [String] {
        let available = Set(types)
        var eligible = recipes.filter { rec in
            rec.requires.allSatisfy { available.contains($0) }
                && rec.beats.allSatisfy { beat in
                    beat.slots.allSatisfy { $0.type == "simple" || available.contains($0.type) }
                }
        }
        if let avoidFamily {
            let other = eligible.filter { $0.family != avoidFamily }
            if !other.isEmpty { eligible = other }
        }
        guard !eligible.isEmpty else { return [] }
        let ranked = eligible.sorted { a, b in
            let sa = score(a, focus: focus, pair: pair)
            let sb = score(b, focus: focus, pair: pair)
            if sa != sb { return sa > sb }
            return a.id < b.id
        }
        var picked: [String] = []
        var used = Set<String>()
        let bestScore = score(ranked[0], focus: focus, pair: pair)
        let top = ranked.filter { score($0, focus: focus, pair: pair) == bestScore }
        let first = top[abs(level) % top.count]
        picked.append(first.id)
        used.insert(first.id)
        if count >= 2 {
            let firstFamily = first.family
            let otherFamily = ranked.filter { !used.contains($0.id) && $0.family != firstFamily }
            let pool = otherFamily.isEmpty
                ? ranked.filter { !used.contains($0.id) }
                : otherFamily
            if !pool.isEmpty {
                let topScore = score(pool[0], focus: focus, pair: pair)
                let cutoff = topScore - 1
                var band = pool.filter { score($0, focus: focus, pair: pair) >= cutoff }
                if band.isEmpty { band = pool }
                var unique: [EncounterRecipe] = []
                var seen = Set<String>()
                for rec in band {
                    if seen.contains(rec.family) { continue }
                    seen.insert(rec.family)
                    unique.append(rec)
                }
                while unique.count < 3 {
                    guard let next = pool.first(where: { !seen.contains($0.family) }) else { break }
                    seen.insert(next.family)
                    unique.append(next)
                }
                let second = unique[abs(level + 1) % unique.count]
                picked.append(second.id)
                used.insert(second.id)
            }
        }
        for rec in ranked {
            if picked.count >= count { break }
            if used.contains(rec.id) { continue }
            picked.append(rec.id)
            used.insert(rec.id)
        }
        var wrap = 0
        while picked.count < count, wrap < count {
            picked.append(ranked[wrap % ranked.count].id)
            wrap += 1
        }
        return picked
    }

    private static func score(_ recipe: EncounterRecipe, focus: String?, pair: String?) -> Int {
        var n = 0
        if let focus, recipe.requires.contains(focus) { n += 3 }
        if let pair, recipe.requires.contains(pair) { n += 2 }
        if let focus, recipe.id.lowercased().contains(focus.lowercased()) { n += 1 }
        return n
    }

    private static func laneX(_ lane: String?, width: CGFloat) -> CGFloat {
        switch lane {
        case "left": return width * 0.24
        case "right": return width * 0.76
        case "center": return width * 0.5
        default: return width * 0.5
        }
    }

    private static func spawnLaneCluster(
        world: inout WorldState,
        run: inout RunState,
        atY: CGFloat,
        dens: CGFloat,
        lane: String?
    ) {
        let cap = lane == "center" ? 3 : 2
        let n = min(cap, run.profile.clusterCount(scoreKm: run.scoreKm, dens: dens, roll: CombatSimulator.rand01(&run.rng)))
        let mid = laneX(lane, width: world.width)
        for k in 0..<n {
            let size = world.baseUnit * (0.9 + CombatSimulator.rand01(&run.rng) * 0.5)
            let x = mid + CGFloat(k) * world.width * 0.06 - world.width * 0.03
            CombatSimulator.placeSimple(
                world: &world,
                kind: .circle,
                x: x,
                y: atY,
                size: size,
                run: &run
            )
        }
    }

    private static func slot(_ type: String, _ lane: String? = nil) -> EncounterSlot {
        EncounterSlot(type: type, lane: lane)
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
