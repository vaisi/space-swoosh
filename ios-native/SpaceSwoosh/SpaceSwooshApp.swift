// SpaceSwooshApp.swift
// Changes: Configure RevenueCat after Firebase; entitlements refresh does not
// block the menu. Sync equipped_ship / max_journey_level / theme user properties.

import SwiftUI

@main
struct SpaceSwooshApp: App {
    @ObservedObject private var settings = SettingsStore.shared

    init() {
        AnalyticsService.configure()
        PurchasesService.configure()
        EntitlementsStore.shared.bootstrap()
        AnalyticsService.syncProfile(
            shipId: SettingsStore.shared.shipSkinId.rawValue,
            maxJourneyLevel: JourneyProgress.maxCompleted(JourneyStore.shared.snapshot),
            theme: SettingsStore.shared.isDark ? "dark" : "light"
        )
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .statusBarHidden(true)
                .preferredColorScheme(settings.isDark ? .dark : .light)
                .onAppear {
                    GameAudioSession.activate()
                    SfxPlayer.shared.start()
                }
        }
    }
}
