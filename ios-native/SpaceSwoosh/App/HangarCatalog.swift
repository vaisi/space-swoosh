// HangarCatalog.swift
// Lore-order hangar roster and archive copy loaded from navCues.json.
// Changes:
// - onFile() counts owned listed hulls against the 39 filed on the roster.
// - Added the 41-hull roster (Saber is Hull 004) plus the NEW ENTRY seen set.
// - Merlin and Rook stay unlisted and cannot be equipped.

import Foundation

struct NavCue: Decodable {
    let start: Double
    let end: Double
    let text: String
}

struct NavLine: Decodable {
    let id: String
    let file: String
    let display: String
    let estSeconds: Double
    let cues: [NavCue]

    enum CodingKeys: String, CodingKey {
        case id, file, display, cues
        case estSeconds = "est_seconds"
    }
}

struct NavShip: Decodable {
    let num: String
    let name: String
    let hidden: Bool
    let filedAs: String
    let archiveNote: String
    let lines: [NavLine]

    enum CodingKeys: String, CodingKey {
        case num, name, hidden, lines
        case filedAs = "filed_as"
        case archiveNote = "archive_note"
    }

    var skinId: SkinId? { SkinId(rawValue: name.trimmingCharacters(in: .whitespaces).lowercased()) }
}

enum HangarCatalog {
    static let ships: [NavShip] = load()
    static let listedTotal = ships.filter { !$0.hidden }.count

    static func entry(for id: SkinId) -> NavShip? {
        ships.first { $0.skinId == id }
    }

    static func index(of id: SkinId) -> Int {
        ships.firstIndex { $0.skinId == id } ?? 0
    }

    static func fileLabel(_ ship: NavShip) -> String {
        if ship.hidden { return "Hull ??? / Unlisted" }
        let num = String(format: "%03d", Int(ship.num) ?? 0)
        let total = String(format: "%03d", listedTotal)
        return "Hull \(num) / \(total)"
    }

    static func onFile(owns: (SkinId) -> Bool) -> (owned: Int, listed: Int) {
        let owned = ships.reduce(0) { count, ship in
            guard let id = ship.skinId, !ship.hidden, owns(id) else { return count }
            return count + 1
        }
        return (owned, listedTotal)
    }

    static func ensureSeenSeed() {
        let defaults = UserDefaults.standard
        guard !defaults.bool(forKey: "hangarSeenSeeded") else { return }
        let owned = ships.compactMap { ship -> String? in
            guard let id = ship.skinId, !ship.hidden, EntitlementsStore.shared.owns(id) else { return nil }
            return id.rawValue
        }
        defaults.set(owned, forKey: "hangarSeenShipIds")
        defaults.set(true, forKey: "hangarSeenSeeded")
    }

    static func markSeen(_ id: SkinId) {
        var seen = Set(UserDefaults.standard.stringArray(forKey: "hangarSeenShipIds") ?? [])
        seen.insert(id.rawValue)
        UserDefaults.standard.set(Array(seen), forKey: "hangarSeenShipIds")
    }

    static func isNew(_ id: SkinId) -> Bool {
        guard let ship = entry(for: id), !ship.hidden, EntitlementsStore.shared.owns(id) else { return false }
        let seen = Set(UserDefaults.standard.stringArray(forKey: "hangarSeenShipIds") ?? [])
        return !seen.contains(id.rawValue)
    }

    static func hasUnseen() -> Bool {
        SkinId.allCases.contains { isNew($0) }
    }

    private static func load() -> [NavShip] {
        guard let url = Bundle.main.url(forResource: "navCues", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let file = try? JSONDecoder().decode(NavFile.self, from: data) else {
            return []
        }
        return file.ships
    }
}

private struct NavFile: Decodable {
    let ships: [NavShip]
}
