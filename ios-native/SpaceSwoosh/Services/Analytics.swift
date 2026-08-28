// Analytics.swift
// Changes: Native iOS Firebase Analytics via FirebaseAnalyticsCore (IDFA-free).
// Same events / param sanitizing as Android Analytics.js. Auto-attaches
// platform=ios. User properties for equipped_ship / max_journey_level / theme.
// GA4 purchase events are logged from PurchasesService after RevenueCat success.

import Foundation
import FirebaseAnalytics
import FirebaseCore

enum AnalyticsService {
    static func configure() {
        guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else {
            return
        }
        FirebaseApp.configure()
    }

    static func track(_ name: String, _ params: [String: Any] = [:]) {
        guard FirebaseApp.app() != nil else { return }
        var merged = params
        if merged["platform"] == nil {
            merged["platform"] = "ios"
        }
        Analytics.logEvent(name, parameters: sanitize(merged))
    }

    static func setUserProperty(_ value: String?, forName name: String) {
        guard FirebaseApp.app() != nil else { return }
        let clipped: String?
        if let value {
            clipped = String(value.prefix(36))
        } else {
            clipped = nil
        }
        Analytics.setUserProperty(clipped, forName: name)
    }

    static func syncProfile(shipId: String? = nil, maxJourneyLevel: Int? = nil, theme: String? = nil) {
        if let shipId, !shipId.isEmpty {
            setUserProperty(shipId, forName: "equipped_ship")
        }
        if let maxJourneyLevel, maxJourneyLevel > 0 {
            setUserProperty(String(maxJourneyLevel), forName: "max_journey_level")
        }
        if let theme, !theme.isEmpty {
            setUserProperty(theme, forName: "theme")
        }
    }

    static func trackPurchase(
        value: Double,
        currency: String,
        itemId: String,
        itemName: String,
        itemCategory: String
    ) {
        track("purchase", [
            "value": value,
            "currency": currency,
            "item_id": itemId,
            "item_name": itemName,
            "item_category": itemCategory,
        ])
    }

    private static func sanitize(_ params: [String: Any]) -> [String: Any] {
        var out: [String: Any] = [:]
        for (key, value) in params {
            if let flag = value as? Bool {
                out[key] = flag ? 1 : 0
                continue
            }
            if let number = value as? Int {
                out[key] = number
                continue
            }
            if let number = value as? Double, number.isFinite {
                out[key] = number
                continue
            }
            if let number = value as? Float, number.isFinite {
                out[key] = Double(number)
                continue
            }
            if let text = value as? String {
                out[key] = text.count > 100 ? String(text.prefix(100)) : text
                continue
            }
            let text = String(describing: value)
            out[key] = text.count > 100 ? String(text.prefix(100)) : text
        }
        return out
    }
}
