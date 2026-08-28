// RunProfile.swift
// Changes: Journey/Lab clusterCount adds Int(roll * dens) like Android
// spawnSimpleAsteroids. Hazard Lab uses advanced black-hole Y-pull (matches
// JS sandbox). Journey L6+ mixed rows / L20+ late knobs; pairTheme +
// comboTheme + encounterCount from spec. Open Space weather, belt density
// (tighter vertical pack by 5k / 12.5k / 20k), and +10% cruise are live from KM.

import Foundation
import CoreGraphics

enum PlayMode: String {
    case openSpace
    case journey
    case hazardLab
}

struct RunProfile {
    var mode: PlayMode
    var level: Int
    var title: String
    var isEndless: Bool
    var goalKm: CGFloat
    var difficulty: CGFloat
    var types: [String]
    var focusType: String?
    var pairTheme: String?
    var comboTheme: String?
    var encounterCount: Int
    var focusChance: CGFloat
    var simpleChance: CGFloat
    var allowAdjacentSetPieces: Bool
    var obstaclesFromKm: CGFloat
    var collectiblesFromKm: CGFloat
    var shieldsFromKm: CGFloat
    var wallBoostsFromKm: CGFloat
    var density0: CGFloat
    var density1: CGFloat
    var minGapFrac: CGFloat
    var gapSpread: CGFloat
    var speedMultiplier: CGFloat
    var maxOnScreen: Int
    var baseCluster0: Int
    var baseCluster1: Int
    var maxCluster: Int
    var maxRowSpawns: Int
    var sparklesTarget: Int
    var smashTarget: Int
    var starSlots: Int
    var introBeats: [IntroBeat]
    var introMessage: String
    var runsMilestones: Bool
    var usesOpenSpaceDensity: Bool
    var usesOpenSpaceCluster: Bool
    var usesKmUnlocks: Bool
    var randomizeFocusEachPick: Bool
    var descriptor: JourneyLevelSpec?

    static let neverKm: CGFloat = 1_000_000_000

    static func openSpace() -> RunProfile {
        RunProfile(
            mode: .openSpace,
            level: 0,
            title: "Open Space",
            isEndless: true,
            goalKm: neverKm,
            difficulty: 0,
            types: GameConfig.Unlocks.table.map(\.type),
            focusType: nil,
            pairTheme: nil,
            comboTheme: nil,
            encounterCount: 0,
            focusChance: 0.5,
            simpleChance: GameConfig.Profile.simpleChance,
            allowAdjacentSetPieces: false,
            obstaclesFromKm: 0,
            collectiblesFromKm: GameConfig.Profile.collectiblesFromScore,
            shieldsFromKm: GameConfig.Profile.shieldsFromScore,
            wallBoostsFromKm: GameConfig.Profile.wallBoostsFromScore,
            density0: GameConfig.Obstacles.scaling.startDensity,
            density1: GameConfig.Obstacles.scaling.maxDensity,
            minGapFrac: 0.25,
            gapSpread: 1.6,
            speedMultiplier: 1.1,
            maxOnScreen: 64,
            baseCluster0: 2,
            baseCluster1: 2,
            maxCluster: 5,
            maxRowSpawns: GameConfig.Profile.maxRowSpawns,
            sparklesTarget: 0,
            smashTarget: 0,
            starSlots: 0,
            introBeats: [],
            introMessage: "",
            runsMilestones: true,
            usesOpenSpaceDensity: true,
            usesOpenSpaceCluster: true,
            usesKmUnlocks: true,
            randomizeFocusEachPick: false,
            descriptor: nil
        )
    }

    static func journey(level raw: Int) -> RunProfile {
        let spec = JourneyConfig.level(raw)
        let neverObstacles = spec.level <= 1
        let neverSparkles = spec.level < JourneyConfig.pointsFromLevel
        let neverShields = spec.level < JourneyConfig.shieldsFromLevel
        let late = spec.level >= 20
        let tLate = (spec.difficulty - 0.72) / 0.28
        return RunProfile(
            mode: .journey,
            level: spec.level,
            title: "Level \(spec.level)",
            isEndless: false,
            goalKm: spec.goalKm,
            difficulty: spec.difficulty,
            types: spec.types,
            focusType: spec.focusType,
            pairTheme: spec.pairTheme,
            comboTheme: spec.comboTheme,
            encounterCount: spec.encounterCount,
            focusChance: late ? 0.32 : 0.5,
            simpleChance: late ? lerp(0.40, 0.26, tLate) : lerp(0.70, 0.42, spec.difficulty),
            allowAdjacentSetPieces: false,
            obstaclesFromKm: neverObstacles ? neverKm : 0,
            collectiblesFromKm: neverSparkles ? neverKm : 0,
            shieldsFromKm: neverShields ? neverKm : 0,
            wallBoostsFromKm: GameConfig.Profile.wallBoostsFromScore,
            density0: 1.15,
            density1: 2.05,
            minGapFrac: late ? lerp(0.18, 0.14, tLate) : lerp(0.30, 0.16, spec.difficulty),
            gapSpread: 1.35,
            speedMultiplier: lerp(0.95, 1.38, spec.difficulty),
            maxOnScreen: late ? 14 : lerpInt(5, 10, spec.difficulty),
            baseCluster0: 1,
            baseCluster1: 4,
            maxCluster: lerpInt(3, 5, spec.difficulty),
            maxRowSpawns: lerpInt(2, 3, spec.difficulty),
            sparklesTarget: spec.sparklesTarget,
            smashTarget: spec.smashTarget,
            starSlots: spec.starSlots,
            introBeats: JourneyConfig.introBeats(for: spec.level),
            introMessage: JourneyConfig.message(for: spec.level),
            runsMilestones: false,
            usesOpenSpaceDensity: false,
            usesOpenSpaceCluster: false,
            usesKmUnlocks: false,
            randomizeFocusEachPick: false,
            descriptor: spec
        )
    }

    static func hazardLab() -> RunProfile {
        RunProfile(
            mode: .hazardLab,
            level: 0,
            title: "Hazard Lab",
            isEndless: false,
            goalKm: HazardLabConfig.goalKm,
            difficulty: HazardLabConfig.difficulty,
            types: HazardLabConfig.types,
            focusType: nil,
            pairTheme: nil,
            comboTheme: nil,
            encounterCount: 0,
            focusChance: 0.55,
            simpleChance: 0.1,
            allowAdjacentSetPieces: true,
            obstaclesFromKm: 0,
            collectiblesFromKm: 0,
            shieldsFromKm: 0,
            wallBoostsFromKm: neverKm,
            density0: 1.2,
            density1: 1.6,
            minGapFrac: lerp(0.28, 0.2, HazardLabConfig.difficulty),
            gapSpread: 1.35,
            speedMultiplier: lerp(0.95, 1.38, HazardLabConfig.difficulty),
            maxOnScreen: lerpInt(5, 8, HazardLabConfig.difficulty),
            baseCluster0: 1,
            baseCluster1: 1,
            maxCluster: 2,
            maxRowSpawns: 2,
            sparklesTarget: 0,
            smashTarget: 0,
            starSlots: 0,
            introBeats: [IntroBeat(text: HazardLabConfig.intro, gapAfterMs: GeneratedJourneyData.defaultBeatGapMs)],
            introMessage: HazardLabConfig.intro,
            runsMilestones: false,
            usesOpenSpaceDensity: false,
            usesOpenSpaceCluster: false,
            usesKmUnlocks: false,
            randomizeFocusEachPick: true,
            descriptor: nil
        )
    }

    func unlockedTypes(scoreKm: CGFloat) -> [String] {
        if usesKmUnlocks {
            return GameConfig.Unlocks.table.compactMap { scoreKm >= $0.score ? $0.type : nil }
        }
        return types
    }

    func density(scoreKm: CGFloat) -> CGFloat {
        if usesOpenSpaceDensity {
            return OpenSpaceBelt.at(scoreKm).density
        }
        return Self.lerp(density0, density1, difficulty)
    }

    func gapRange(height: CGFloat, scoreKm: CGFloat = 0) -> (min: CGFloat, max: CGFloat) {
        if mode == .openSpace {
            let belt = OpenSpaceBelt.at(scoreKm)
            let minGap = height * belt.minGapFrac
            return (minGap, minGap * belt.gapSpread)
        }
        let minGap = height * minGapFrac
        return (minGap, minGap * gapSpread)
    }

    func clusterCount(scoreKm: CGFloat, dens: CGFloat, roll: CGFloat) -> Int {
        let base: Int
        if usesOpenSpaceCluster {
            base = 2 + Int(scoreKm / 8000)
        } else {
            base = Self.lerpInt(baseCluster0, baseCluster1, difficulty)
        }
        let extra = Int(roll * dens)
        return min(maxCluster, max(1, base + extra))
    }

    func advancedBlackHoles(scoreKm: CGFloat) -> Bool {
        switch mode {
        case .openSpace: return scoreKm > 1000
        case .journey: return difficulty >= 0.7
        case .hazardLab: return true
        }
    }

    var isLateJourney: Bool { mode == .journey && level >= 20 }

    func usesPairedBelt(scoreKm: CGFloat) -> Bool {
        if mode == .journey { return level >= 6 }
        if mode == .openSpace { return scoreKm >= GeneratedJourneyData.openSpacePairedFromKm }
        return false
    }

    func livePairTheme(scoreKm: CGFloat) -> String? {
        if mode == .openSpace { return OpenSpaceWeather.at(scoreKm).pair }
        return pairTheme
    }

    func liveComboTheme(scoreKm: CGFloat) -> String? {
        if mode == .openSpace { return OpenSpaceWeather.at(scoreKm).combo }
        return comboTheme
    }

    func liveSimpleChance(scoreKm: CGFloat) -> CGFloat {
        if mode == .openSpace { return OpenSpaceBelt.at(scoreKm).simpleChance }
        return simpleChance
    }

    func rollRowSpawnCount(_ rng: inout UInt64, scoreKm: CGFloat = 0) -> Int {
        let maxSpawns = max(1, maxRowSpawns)
        if maxSpawns <= 1 { return 1 }
        if mode == .openSpace {
            let belt = OpenSpaceBelt.at(scoreKm)
            let r = CombatSimulator.rand01(&rng)
            if r < belt.rowOne { return 1 }
            if r < belt.rowTwo { return min(2, maxSpawns) }
            return min(3, maxSpawns)
        }
        if isLateJourney {
            let r = CombatSimulator.rand01(&rng)
            if r < 0.35 { return 1 }
            if r < 0.80 { return min(2, maxSpawns) }
            return min(3, maxSpawns)
        }
        var spawnCount = 1
        if maxSpawns >= 2, CombatSimulator.rand01(&rng) >= 0.7 { spawnCount = 2 }
        if maxSpawns >= 3, CombatSimulator.rand01(&rng) >= 0.9 { spawnCount = 3 }
        return min(spawnCount, maxSpawns)
    }

    func liveFocusType(_ rng: inout UInt64, scoreKm: CGFloat = 0) -> String? {
        if mode == .openSpace { return OpenSpaceWeather.at(scoreKm).focus }
        if randomizeFocusEachPick, !HazardLabConfig.types.isEmpty {
            rng = rng &* 6364136223846793005 &+ 1
            let idx = Int((rng >> 33) % UInt64(HazardLabConfig.types.count))
            return HazardLabConfig.types[idx]
        }
        return focusType
    }

    private static func lerp(_ a: CGFloat, _ b: CGFloat, _ t: CGFloat) -> CGFloat {
        a + (b - a) * t
    }

    private static func lerpInt(_ a: Int, _ b: Int, _ t: CGFloat) -> Int {
        Int(round(lerp(CGFloat(a), CGFloat(b), t)))
    }
}

enum PlayLaunch: Equatable {
    case openSpace
    case journey(Int)
    case hazardLab

    var profile: RunProfile {
        switch self {
        case .openSpace: return .openSpace()
        case .journey(let level): return .journey(level: level)
        case .hazardLab: return .hazardLab()
        }
    }

    var isLevelRun: Bool {
        switch self {
        case .openSpace: return false
        case .journey, .hazardLab: return true
        }
    }
}
