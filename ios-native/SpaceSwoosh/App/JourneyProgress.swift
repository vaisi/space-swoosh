// JourneyProgress.swift
// Changes: UNLOCK_ALL_LEVELS playtest flag (map tiles only; saved unlocked stays).

import Foundation
import Combine

struct JourneyLevelRecord: Equatable {
    var stars: [Bool]
    var bestPoints: Int
}

struct JourneySnapshot: Equatable {
    var version: Int
    var unlocked: Int
    var loreSeen: Bool
    var levels: [Int: JourneyLevelRecord]
}

enum JourneyProgress {
    static let storageKey = "journeyProgress"
    private static let version = 1
    /// Playtest unlock — true so the Journey map can fly every level. Flip false for store.
    static let UNLOCK_ALL_LEVELS = true

    static func empty() -> JourneySnapshot {
        JourneySnapshot(version: version, unlocked: 1, loreSeen: false, levels: [:])
    }

    static func load() -> JourneySnapshot {
        guard let raw = UserDefaults.standard.dictionary(forKey: storageKey),
              let storedVersion = raw["version"] as? Int,
              storedVersion == version
        else { return empty() }

        let unlocked = JourneyConfig.clampLevel(raw["unlocked"] as? Int ?? 1)
        let loreSeen = raw["loreSeen"] as? Bool ?? false
        var levels: [Int: JourneyLevelRecord] = [:]
        if let map = raw["levels"] as? [String: Any] {
            for (key, value) in map {
                guard let n = Int(key), n >= 1, n <= JourneyConfig.totalLevels,
                      let entry = value as? [String: Any]
                else { continue }
                let stars = normalizeStars(entry["stars"] as? [Bool] ?? [])
                let best = max(0, entry["bestPoints"] as? Int ?? 0)
                levels[n] = JourneyLevelRecord(stars: stars, bestPoints: best)
            }
        }
        return JourneySnapshot(version: version, unlocked: unlocked, loreSeen: loreSeen, levels: levels)
    }

    static func save(_ snapshot: JourneySnapshot) {
        var levels: [String: Any] = [:]
        for (key, entry) in snapshot.levels {
            levels[String(key)] = ["stars": entry.stars, "bestPoints": entry.bestPoints]
        }
        UserDefaults.standard.set([
            "version": version,
            "unlocked": snapshot.unlocked,
            "loreSeen": snapshot.loreSeen,
            "levels": levels
        ], forKey: storageKey)
    }

    static func entry(_ snapshot: JourneySnapshot, level: Int) -> JourneyLevelRecord {
        snapshot.levels[level] ?? JourneyLevelRecord(stars: normalizeStars([]), bestPoints: 0)
    }

    static func starCount(_ snapshot: JourneySnapshot, level: Int) -> Int {
        let slots = JourneyConfig.starsAvailable(for: level)
        return entry(snapshot, level: level).stars.prefix(slots).filter { $0 }.count
    }

    static func totalStars(_ snapshot: JourneySnapshot) -> Int {
        snapshot.levels.keys.reduce(0) { $0 + starCount(snapshot, level: $1) }
    }

    static func isUnlocked(_ snapshot: JourneySnapshot, level: Int) -> Bool {
        if UNLOCK_ALL_LEVELS { return true }
        return level <= snapshot.unlocked
    }

    static func nextPlayable(_ snapshot: JourneySnapshot) -> Int {
        JourneyConfig.clampLevel(snapshot.unlocked)
    }

    static func markLoreSeen(_ snapshot: JourneySnapshot) -> JourneySnapshot {
        var next = snapshot
        next.version = version
        next.loreSeen = true
        save(next)
        return next
    }

    static func record(
        _ snapshot: JourneySnapshot,
        level: Int,
        stars: [Bool],
        points: Int,
        completed: Bool
    ) -> (progress: JourneySnapshot, stars: [Bool], newStars: [Bool], unlockedNext: Bool, bestPoints: Int) {
        let target = JourneyConfig.clampLevel(level)
        let previous = entry(snapshot, level: target)
        let earned = normalizeStars(stars)
        let merged = zip(earned, previous.stars).map { $0 || $1 }
        let newStars = zip(earned, previous.stars).map { $0 && !$1 }
        let bestPoints = max(previous.bestPoints, max(0, points))
        let shouldUnlock = completed && target == snapshot.unlocked && target < JourneyConfig.totalLevels
        var next = snapshot
        next.version = version
        next.unlocked = shouldUnlock ? target + 1 : snapshot.unlocked
        next.levels[target] = JourneyLevelRecord(stars: merged, bestPoints: bestPoints)
        save(next)
        return (next, merged, newStars, shouldUnlock, bestPoints)
    }

    private static func normalizeStars(_ stars: [Bool]) -> [Bool] {
        (0..<JourneyConfig.starsPerLevel).map { $0 < stars.count ? stars[$0] : false }
    }
}

final class JourneyStore: ObservableObject {
    static let shared = JourneyStore()

    @Published var snapshot: JourneySnapshot

    private init() {
        snapshot = JourneyProgress.load()
    }

    func reload() {
        snapshot = JourneyProgress.load()
    }

    func markLoreSeen() {
        snapshot = JourneyProgress.markLoreSeen(snapshot)
    }

    func record(level: Int, stars: [Bool], points: Int, completed: Bool) -> (stars: [Bool], newStars: [Bool], unlockedNext: Bool) {
        let result = JourneyProgress.record(
            snapshot,
            level: level,
            stars: stars,
            points: points,
            completed: completed
        )
        snapshot = result.progress
        return (result.stars, result.newStars, result.unlockedNext)
    }
}
