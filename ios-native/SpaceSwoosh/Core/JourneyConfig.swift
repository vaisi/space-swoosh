// JourneyConfig.swift
// Changes: Slice E — 40-level Journey descriptors, star eval, Hazard Lab tile.

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
    var introduces: String?
    var sparklesTarget: Int
    var smashTarget: Int
    var starSlots: Int
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
