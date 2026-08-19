// NameFilter.swift
// Changes: ReplyFilter (140-char epilogue UGC) lives beside call-sign rules.

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

enum ReplyFilter {
    static let maxLength = 140
    static let minLength = 1

    private static let allowed = try! NSRegularExpression(pattern: "^[A-Za-z0-9 .,'!?;:\\-()\"\\n]+$")

    struct Result {
        var ok: Bool
        var text: String
        var message: String
    }

    static func validate(_ raw: String) -> Result {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        if text.count < minLength {
            return Result(ok: false, text: text, message: "Write something, or leave it unsaid.")
        }
        if text.count > maxLength {
            return Result(ok: false, text: text, message: "Keep it to one short thing.")
        }
        let ns = text as NSString
        if allowed.firstMatch(in: text, range: NSRange(location: 0, length: ns.length)) == nil {
            return Result(ok: false, text: text, message: "Letters, numbers, and simple punctuation.")
        }
        let compact = NameFilterNormalize.compact(text)
        for word in [
            "nigger", "nigga", "faggot", "fag", "retard", "rape", "rapist",
            "porn", "porno", "hentai", "onlyfans",
            "fuck", "fucker", "motherfuck", "shit", "asshole", "cunt", "cock", "dick",
            "bitch", "whore", "slut",
            "hitler", "nazi",
        ] where compact.contains(word) {
            return Result(ok: false, text: text, message: "Choose different words.")
        }
        return Result(ok: true, text: text, message: "")
    }

    static func formatOrdinal(_ n: Int) -> String {
        let num = max(0, n)
        let fmt = NumberFormatter()
        fmt.numberStyle = .decimal
        fmt.maximumFractionDigits = 0
        let formatted = fmt.string(from: NSNumber(value: num)) ?? "\(num)"
        let mod100 = num % 100
        let mod10 = num % 10
        var suffix = "th"
        if mod100 < 11 || mod100 > 13 {
            if mod10 == 1 { suffix = "st" }
            else if mod10 == 2 { suffix = "nd" }
            else if mod10 == 3 { suffix = "rd" }
        }
        return formatted + suffix
    }
}

private enum NameFilterNormalize {
    static func compact(_ raw: String) -> String {
        var s = raw.precomposedStringWithCompatibilityMapping.lowercased()
        let map: [(String, String)] = [
            ("0", "o"), ("1", "i"), ("3", "e"), ("4", "a"),
            ("5", "s"), ("7", "t"), ("$", "s"), ("@", "a"),
        ]
        for (from, to) in map { s = s.replacingOccurrences(of: from, with: to) }
        return s.replacingOccurrences(of: "[^a-z0-9]", with: "", options: .regularExpression)
    }
}
