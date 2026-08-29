// ReviewPromptStore.swift
// Enjoyment card eligibility + persistence for native iOS.
// Changes: rateFromOptions() and requestInAppReview() are @MainActor so
// AppStore.requestReview(in:) compiles on Xcode 26.4 / Codemagic archive.

import Foundation
import StoreKit
import UIKit

enum ReviewPromptStore {
    static let storageKey = "ssReviewPrompt"
    static let firstDay = 6
    static let snoozeDay = 13

    enum Status: String {
        case pending
        case later
        case yes
        case no
        case done
    }

    static func load() -> Status {
        Status(rawValue: UserDefaults.standard.string(forKey: storageKey) ?? "") ?? .pending
    }

    static func save(_ status: Status) {
        UserDefaults.standard.set(status.rawValue, forKey: storageKey)
    }

    /// Which auto-prompt this clear qualifies for, or nil.
    static func trigger(maxCompleted: Int) -> String? {
        let status = load()
        if status == .pending, maxCompleted >= firstDay { return "day_6" }
        if status == .later, maxCompleted >= snoozeDay { return "day_13" }
        return nil
    }

    static func shouldOffer(_ snapshot: JourneySnapshot) -> Bool {
        trigger(maxCompleted: JourneyProgress.maxCompleted(snapshot)) != nil
    }

    static func markShown(trigger: String) {
        AnalyticsService.track("review_prompt_shown", ["trigger": trigger])
    }

    static func respond(_ choice: String, trigger: String) {
        let beat = trigger == "day_13" ? "day_13" : "day_6"
        switch choice {
        case "yes":
            save(.yes)
            AnalyticsService.track("review_prompt_yes", ["trigger": beat])
        case "no":
            save(.no)
            AnalyticsService.track("not_really_enjoying", ["trigger": beat])
        default:
            save(beat == "day_13" ? .done : .later)
            AnalyticsService.track("review_prompt_later", ["trigger": beat])
        }
    }

    @MainActor
    static func rateFromOptions() {
        AnalyticsService.track("review_from_options")
        if let url = StoreLinks.writeReviewURL {
            UIApplication.shared.open(url)
            return
        }
        requestInAppReview()
    }

    /// In-app review without SwiftUI's `RequestReviewAction` (Xcode 26 / device archive).
    @MainActor
    private static func requestInAppReview() {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let scene = scenes.first { $0.activationState == .foregroundActive } ?? scenes.first
        guard let scene else { return }
        if #available(iOS 18.0, *) {
            AppStore.requestReview(in: scene)
        } else {
            SKStoreReviewController.requestReview(in: scene)
        }
    }
}
