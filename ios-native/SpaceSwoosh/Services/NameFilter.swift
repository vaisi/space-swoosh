// NameFilter.swift
// Changes: Port Android NameFilter call-sign rules for Apple 1.2 UGC.

import Foundation

enum NameFilter {
    static let minLength = 2
    static let maxLength = 15

    private static let allowed = try! NSRegularExpression(pattern: "^[A-Za-z0-9 _.\\-]+$")
    private static let blocked = [
        "nigger", "nigga", "faggot", "fag", "retard", "rape", "rapist",
        "porn", "porno", "hentai", "onlyfans",
        "fuck", "fucker", "motherfuck", "shit", "asshole", "cunt", "cock", "dick",
        "bitch", "whore", "slut",
        "hitler", "nazi",
    ]

    struct Result {
        var ok: Bool
        var name: String
        var message: String
    }

    static func validate(_ raw: String) -> Result {
        let name = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        if name.count < minLength {
            return Result(ok: false, name: name, message: "Call sign too short.")
        }
        if name.count > maxLength {
            return Result(ok: false, name: name, message: "Call sign too long.")
        }
        let ns = name as NSString
        if allowed.firstMatch(in: name, range: NSRange(location: 0, length: ns.length)) == nil {
            return Result(ok: false, name: name, message: "Use letters, numbers, spaces, - _ .")
        }
        let compact = normalize(name)
        for word in blocked where compact.contains(word) {
            return Result(ok: false, name: name, message: "Choose a different call sign.")
        }
        return Result(ok: true, name: name, message: "")
    }

    private static func normalize(_ raw: String) -> String {
        var s = raw.precomposedStringWithCompatibilityMapping.lowercased()
        let map: [(String, String)] = [
            ("0", "o"), ("1", "i"), ("3", "e"), ("4", "a"),
            ("5", "s"), ("7", "t"), ("$", "s"), ("@", "a"),
        ]
        for (from, to) in map { s = s.replacingOccurrences(of: from, with: to) }
        return s.replacingOccurrences(of: "[^a-z0-9]", with: "", options: .regularExpression)
    }
}
