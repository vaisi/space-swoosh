// StoreLinks.swift
// Play / App Store listing URLs for Options → Rate fallback.
// Changes: Created — package id is the Play URL; Apple numeric id from
// Info.plist APP_STORE_APPLE_ID (injected at build, not Firebase).

import Foundation

enum StoreLinks {
    static let playPackageId = "com.orbi.spaceswoosh"
    static let playStoreURL = URL(string: "https://play.google.com/store/apps/details?id=\(playPackageId)")

    static var appleId: String {
        let raw = Bundle.main.object(forInfoDictionaryKey: "APP_STORE_APPLE_ID") as? String ?? ""
        return raw.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static var writeReviewURL: URL? {
        let id = appleId
        guard !id.isEmpty else { return nil }
        return URL(string: "https://apps.apple.com/app/id\(id)?action=write-review")
    }
}
