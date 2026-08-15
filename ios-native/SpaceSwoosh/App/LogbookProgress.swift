// LogbookProgress.swift
// Changes: Slice E — observe / interact / known catalog + toast.

import Foundation
import Combine

enum LogbookState: String {
    case locked
    case observed
    case known
}

struct LogbookCategorySpec: Equatable {
    var id: String
    var label: String
}

struct LogbookEntrySpec: Equatable {
    var id: String
    var category: String
    var name: String
    var definition: String
    var remark: String
    var unlockMode: String
}

enum LogbookCatalog {
    static let categories = GeneratedJourneyData.logbookCategories
    static let entries = GeneratedJourneyData.logbookEntries
    static let byId: [String: LogbookEntrySpec] = {
        Dictionary(uniqueKeysWithValues: GeneratedJourneyData.logbookEntries.map { ($0.id, $0) })
    }()

    static func entries(in category: String) -> [LogbookEntrySpec] {
        entries.filter { $0.category == category }
    }

    static func levelEntryId(_ level: Int) -> String { "level_\(level)" }

    static func obstacleId(for type: String) -> String? {
        switch type {
        case "sideBarrier": return "sideBarrier"
        case "complex": return "complex"
        case "moving": return "moving"
        case "shooting": return "shooting"
        case "pulsating": return "pulsating"
        case "phase": return "phase"
        case "sweepGate": return "sweepGate"
        case "repulsor": return "repulsor"
        case "driftCurrent": return "driftCurrent"
        case "wormhole": return "wormhole"
        case "blackhole": return "blackhole"
        default: return nil
        }
    }

    static func simpleId(for kind: ObstacleKind) -> String? {
        switch kind {
        case .circle: return "asteroidCircle"
        case .triangle: return "asteroidTriangle"
        case .square: return "asteroidSquare"
        default: return nil
        }
    }

    static func pickupId(for kind: PickupKind) -> String {
        switch kind {
        case .sparkle: return "pointsSparkle"
        case .shield: return "shield"
        case .wallBoost: return "wallBoost"
        }
    }
}

struct LogbookSnapshot: Equatable {
    var version: Int
    var entries: [String: LogbookState]
}

enum LogbookProgress {
    static let storageKey = "logbookProgress"
    private static let version = 1

    static func empty() -> LogbookSnapshot {
        LogbookSnapshot(version: version, entries: [:])
    }

    static func load() -> LogbookSnapshot {
        guard let raw = UserDefaults.standard.dictionary(forKey: storageKey),
              let storedVersion = raw["version"] as? Int,
              storedVersion == version
        else { return empty() }

        var entries: [String: LogbookState] = [:]
        if let map = raw["entries"] as? [String: String] {
            for (id, state) in map {
                guard LogbookCatalog.byId[id] != nil,
                      let parsed = LogbookState(rawValue: state),
                      parsed != .locked
                else { continue }
                entries[id] = parsed
            }
        }
        return LogbookSnapshot(version: version, entries: entries)
    }

    static func save(_ snapshot: LogbookSnapshot) {
        var map: [String: String] = [:]
        for (id, state) in snapshot.entries where state != .locked {
            map[id] = state.rawValue
        }
        UserDefaults.standard.set(["version": version, "entries": map], forKey: storageKey)
    }

    static func state(_ snapshot: LogbookSnapshot, id: String) -> LogbookState {
        snapshot.entries[id] ?? .locked
    }

    static func observe(_ snapshot: inout LogbookSnapshot, id: String) -> Bool {
        guard LogbookCatalog.byId[id] != nil else { return false }
        let current = state(snapshot, id: id)
        if current == .observed || current == .known { return false }
        snapshot.entries[id] = .observed
        snapshot.version = version
        save(snapshot)
        return true
    }

    static func interact(_ snapshot: inout LogbookSnapshot, id: String) -> Bool {
        guard LogbookCatalog.byId[id] != nil else { return false }
        let current = state(snapshot, id: id)
        if current == .known { return false }
        snapshot.entries[id] = .known
        snapshot.version = version
        save(snapshot)
        return true
    }

    static func revealInstant(_ snapshot: inout LogbookSnapshot, id: String) -> Bool {
        interact(&snapshot, id: id)
    }
}

enum LogbookMark {
    case observe(String)
    case interact(String)
    case instant(String)
}

final class LogbookStore: ObservableObject {
    static let shared = LogbookStore()

    @Published var snapshot: LogbookSnapshot
    @Published var toast: String = ""

    private init() {
        snapshot = LogbookProgress.load()
    }

    func apply(_ marks: [LogbookMark], active: Bool) -> Bool {
        guard active, !marks.isEmpty else { return false }
        var changed = false
        for mark in marks {
            switch mark {
            case .observe(let id):
                if LogbookProgress.observe(&snapshot, id: id) { changed = true }
            case .interact(let id):
                if LogbookProgress.observe(&snapshot, id: id) { changed = true }
                if LogbookProgress.interact(&snapshot, id: id) { changed = true }
            case .instant(let id):
                if LogbookProgress.revealInstant(&snapshot, id: id) { changed = true }
            }
        }
        if changed {
            toast = "Logbook updated"
        }
        return changed
    }

    func revealInstant(_ id: String) {
        _ = apply([.instant(id)], active: true)
    }

    func clearToast() {
        toast = ""
    }
}
