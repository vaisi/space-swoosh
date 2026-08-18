// Analytics.swift
// Changes: Native iOS Firebase Analytics — same events / param sanitizing as Android Analytics.js.

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
        Analytics.logEvent(name, parameters: sanitize(params))
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
