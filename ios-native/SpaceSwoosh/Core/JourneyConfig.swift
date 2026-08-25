// JourneyConfig.swift
// Changes: 42-level Journey descriptors; L6+ pairTheme / encounterCount, L20+ comboTheme;
// Open Space weather + belt density types; storm quiet/chain/gap-cap from GeneratedJourneyData.

import Foundation
import CoreGraphics

struct IntroBeat: Equatable {
    var text: String
    var gapAfterMs: Int
}

struct JourneyChapter: Equatable {
    var id: String
    var name: String
    var blurb: String
    var from: Int
    var to: Int
}

struct JourneyLevelSpec: Equatable {
    var level: Int
    var chapterId: String
    var chapterName: String
    var difficulty: CGFloat
    var goalKm: CGFloat
    var types: [String]
    var focusType: String?
    var pairTheme: String?
    var comboTheme: String?
    var encounterCount: Int
    var introduces: String?
    var sparklesTarget: Int
    var smashTarget: Int
    var starSlots: Int
}

struct EncounterSlot: Equatable {
    var type: String
    var lane: String?
}

struct EncounterBeat: Equatable {
    var kind: String
    var frac: CGFloat
    var slots: [EncounterSlot]
}

struct EncounterRecipe: Equatable {
    var id: String
    var family: String
    var requires: [String]
    var beats: [EncounterBeat]
}

struct OpenSpaceWeatherBand: Equatable {
    var fromKm: CGFloat
    var pair: String?
    var combo: String?
    var focus: String?
}

struct OpenSpaceSkyShift: Equatable {
    var pair: String?
    var combo: String?
    var focus: String?
}

struct OpenSpaceBeltBand: Equatable {
    var fromKm: CGFloat
    var minGapFrac: CGFloat
    var gapSpread: CGFloat
    var simpleChance: CGFloat
    var density: CGFloat
    var rowOne: CGFloat
    var rowTwo: CGFloat
}

enum OpenSpaceWeather {
    static func at(_ km: CGFloat) -> OpenSpaceSkyShift {
        let full = GeneratedJourneyData.openSpaceFullRosterKm
        let sky = GeneratedJourneyData.openSpaceFullSky
        if km >= full, !sky.isEmpty {
            let step = max(GeneratedJourneyData.openSpaceStormRepeatKm, 1)
            let i = Int((km - full) / step)
            let idx = ((i % sky.count) + sky.count) % sky.count
            return sky[idx]
        }
        var band = GeneratedJourneyData.openSpaceWeather[0]
        for row in GeneratedJourneyData.openSpaceWeather where km >= row.fromKm {
            band = row
        }
        return OpenSpaceSkyShift(pair: band.pair, combo: band.combo, focus: band.focus)
    }

    static func stormCount(at km: CGFloat) -> Int {
        km >= GeneratedJourneyData.openSpaceDualStormFromKm ? 2 : 1
    }

    static func stormMarks() -> [CGFloat] {
        var unique: [CGFloat] = []
        var seen = Set<CGFloat>()
        for entry in GameConfig.Unlocks.table where entry.score > 0 {
            if seen.insert(entry.score).inserted { unique.append(entry.score) }
        }
        unique.sort()
        var extra: [CGFloat] = []
        let full = GeneratedJourneyData.openSpaceFullRosterKm
        let denseFrom = GeneratedJourneyData.openSpaceStormDenseFromKm
        let denseStep = GeneratedJourneyData.openSpaceStormDenseRepeatKm
        let step = GeneratedJourneyData.openSpaceStormRepeatKm
        var km = full
        for _ in 0..<GeneratedJourneyData.openSpaceStormRepeatCount {
            let use = km >= denseFrom ? denseStep : step
            km += use
            extra.append(km)
        }
        return unique + extra
    }
}

enum OpenSpaceBelt {
    static func at(_ km: CGFloat) -> OpenSpaceBeltBand {
        let rows = GeneratedJourneyData.openSpaceBelt
        let fallback = OpenSpaceBeltBand(
            fromKm: 0, minGapFrac: 0.22, gapSpread: 1.45,
            simpleChance: 0.55, density: 0.85, rowOne: 0.55, rowTwo: 0.88
        )
        guard let first = rows.first else { return fallback }
        if km <= first.fromKm { return first }
        guard let last = rows.last else { return first }
        if km >= last.fromKm { return last }
        var i = 0
        for n in 1..<rows.count where km >= rows[n].fromKm {
            i = n
        }
        let a = rows[i]
        let b = rows[min(i + 1, rows.count - 1)]
        if b.fromKm <= a.fromKm { return a }
        let t = (km - a.fromKm) / (b.fromKm - a.fromKm)
        return OpenSpaceBeltBand(
            fromKm: km,
            minGapFrac: a.minGapFrac + (b.minGapFrac - a.minGapFrac) * t,
            gapSpread: a.gapSpread + (b.gapSpread - a.gapSpread) * t,
            simpleChance: a.simpleChance + (b.simpleChance - a.simpleChance) * t,
            density: a.density + (b.density - a.density) * t,
            rowOne: a.rowOne + (b.rowOne - a.rowOne) * t,
            rowTwo: a.rowTwo + (b.rowTwo - a.rowTwo) * t
        )
    }
}

enum JourneyConfig {
    static let totalLevels = GeneratedJourneyData.totalLevels
    static let totalStars = GeneratedJourneyData.totalStars
    static let starsPerLevel = GeneratedJourneyData.starsPerLevel
    static let pointsFromLevel = GeneratedJourneyData.pointsFromLevel
    static let shieldsFromLevel = GeneratedJourneyData.shieldsFromLevel
    static let chapters = GeneratedJourneyData.chapters
    static let levels = GeneratedJourneyData.levels

    static func clampLevel(_ level: Int) -> Int {
        min(totalLevels, max(1, level))
    }

    static func level(_ raw: Int) -> JourneyLevelSpec {
        levels[clampLevel(raw) - 1]
    }

    static func chapter(for levelNumber: Int) -> JourneyChapter {
        let spec = level(levelNumber)
        return chapters.first { $0.id == spec.chapterId } ?? chapters[chapters.count - 1]
    }

    static func starsAvailable(for levelNumber: Int) -> Int {
        let n = max(1, levelNumber)
        if n < pointsFromLevel { return 1 }
        if n < shieldsFromLevel { return 2 }
        return 3
    }

    static func evaluateStars(
        _ spec: JourneyLevelSpec,
        completed: Bool,
        sparklesCollected: Int,
        obstaclesDestroyed: Int
    ) -> [Bool] {
        guard completed else { return [false, false, false] }
        let slots = spec.starSlots
        return [
            true,
            slots >= 2 && spec.sparklesTarget > 0 && sparklesCollected >= spec.sparklesTarget,
            slots >= 3 && spec.smashTarget > 0 && obstaclesDestroyed >= spec.smashTarget
        ]
    }

    static func starLabels(for spec: JourneyLevelSpec) -> [String] {
        Array(["Reach the goal", "Collect sparkles", "Smash asteroids"].prefix(spec.starSlots))
    }

    static func message(for levelNumber: Int) -> String {
        GeneratedJourneyData.messages[levelNumber]
            ?? "Level \(levelNumber) — \(level(levelNumber).chapterName)"
    }

    static func introBeats(for levelNumber: Int) -> [IntroBeat] {
        GeneratedJourneyData.introBeats[levelNumber]
            ?? [IntroBeat(text: message(for: levelNumber), gapAfterMs: GeneratedJourneyData.defaultBeatGapMs)]
    }
}

enum HazardLabConfig {
    static let intro = GeneratedJourneyData.labIntro
    static let goalKm = GeneratedJourneyData.labGoalKm
    static let difficulty = GeneratedJourneyData.labDifficulty
    static let types = GeneratedJourneyData.labTypes
}
