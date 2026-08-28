// JourneyProgress.swift
// Changes: UNLOCK_ALL_LEVELS is false — map tiles follow saved `unlocked`.
// maxCompleted() for Firebase user property max_journey_level.
// v2 migrate — v1 saves are kept. Completing old Day 40 unlocks 41.
// Arc unlocks only when Day 42 is cleared; `arcUnlockSeen` is the once-only
// ending card flag (no version bump). One epilogue reply per device
// (`epilogueReplyDone` + optional `epilogueOrdinal`).

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
    var arcUnlockSeen: Bool
    var epilogueReplyDone: Bool
    var epilogueOrdinal: Int?
    var levels: [Int: JourneyLevelRecord]
}

enum JourneyProgress {
    static let storageKey = "journeyProgress"
    private static let version = 2
    private static let previousFinale = 40
    /// Sequential Journey — false so the map respects saved `unlocked`.
    static let UNLOCK_ALL_LEVELS = false

    static func empty() -> JourneySnapshot {
        JourneySnapshot(
            version: version,
            unlocked: 1,
            loreSeen: false,
            arcUnlockSeen: false,
            epilogueReplyDone: false,
            epilogueOrdinal: nil,
            levels: [:]
        )
    }

    static func load() -> JourneySnapshot {
        guard let raw = UserDefaults.standard.dictionary(forKey: storageKey) else {
            return empty()
        }
        let storedVersion = raw["version"] as? Int ?? 0
        if storedVersion > version { return empty() }

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

        var unlocked = raw["unlocked"] as? Int ?? 1
        let finishedOldFinale = (raw["levels"] as? [String: Any]).flatMap { map in
            let entry = map["\(previousFinale)"] as? [String: Any]
            let stars = entry?["stars"] as? [Bool] ?? []
            return stars.first == true
        } ?? false
        if storedVersion < 2, finishedOldFinale, unlocked <= previousFinale {
            unlocked = previousFinale + 1
        }

        let snapshot = JourneySnapshot(
            version: version,
            unlocked: JourneyConfig.clampLevel(unlocked),
            loreSeen: raw["loreSeen"] as? Bool ?? false,
            arcUnlockSeen: raw["arcUnlockSeen"] as? Bool ?? false,
            epilogueReplyDone: raw["epilogueReplyDone"] as? Bool ?? false,
            epilogueOrdinal: {
                if let n = raw["epilogueOrdinal"] as? Int, n > 0 { return n }
                if let n = raw["epilogueOrdinal"] as? NSNumber, n.intValue > 0 { return n.intValue }
                return nil
            }(),
            levels: levels
        )
        if storedVersion != version || snapshot.unlocked != (raw["unlocked"] as? Int ?? 1) {
            save(snapshot)
        }
        return snapshot
    }

    static func save(_ snapshot: JourneySnapshot) {
        var levels: [String: Any] = [:]
        for (key, entry) in snapshot.levels {
            levels[String(key)] = ["stars": entry.stars, "bestPoints": entry.bestPoints]
        }
        var payload: [String: Any] = [
            "version": version,
            "unlocked": snapshot.unlocked,
            "loreSeen": snapshot.loreSeen,
            "arcUnlockSeen": snapshot.arcUnlockSeen,
            "epilogueReplyDone": snapshot.epilogueReplyDone,
            "levels": levels
        ]
        if let ordinal = snapshot.epilogueOrdinal, ordinal > 0 {
            payload["epilogueOrdinal"] = ordinal
        }
        UserDefaults.standard.set(payload, forKey: storageKey)
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

    static func isCleared(_ snapshot: JourneySnapshot, level: Int) -> Bool {
        entry(snapshot, level: level).stars.first == true
    }

    /// Highest cleared Journey day (first star). 0 if none.
    static func maxCompleted(_ snapshot: JourneySnapshot) -> Int {
        snapshot.levels.reduce(0) { best, pair in
            guard pair.value.stars.first == true else { return best }
            return max(best, pair.key)
        }
    }

    /// Arc is flyable only after Day 42 is actually cleared. Playtest map unlock does not count.
    static func isArcUnlocked(_ snapshot: JourneySnapshot) -> Bool {
        isCleared(snapshot, level: JourneyConfig.totalLevels)
    }

    static func hasSeenArcUnlock(_ snapshot: JourneySnapshot) -> Bool {
        snapshot.arcUnlockSeen
    }

    static func markArcUnlockSeen(_ snapshot: JourneySnapshot) -> JourneySnapshot {
        var next = snapshot
        next.version = version
        next.arcUnlockSeen = true
        save(next)
        return next
    }

    static func hasEpilogueReply(_ snapshot: JourneySnapshot) -> Bool {
        snapshot.epilogueReplyDone
    }

    static func markEpilogueReply(_ snapshot: JourneySnapshot, ordinal: Int?) -> JourneySnapshot {
        var next = snapshot
        next.version = version
        next.epilogueReplyDone = true
        if let ordinal, ordinal > 0 {
            next.epilogueOrdinal = ordinal
        }
        save(next)
        return next
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

    func markArcUnlockSeen() {
        snapshot = JourneyProgress.markArcUnlockSeen(snapshot)
    }

    func markEpilogueReply(ordinal: Int?) {
        snapshot = JourneyProgress.markEpilogueReply(snapshot, ordinal: ordinal)
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
