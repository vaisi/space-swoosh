// SpaceSwooshApp.swift
// Changes: Status bar stays hidden; no system nav title (SwiftUI shell,
// not UINavigationBar). Now Playing is cleared in GameAudioSession so iOS
// cannot show a "Space Swoosh" chip. Configure RevenueCat after Firebase.

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
                .toolbar(.hidden, for: .navigationBar)
                .preferredColorScheme(settings.isDark ? .dark : .light)
                .onAppear {
                    GameAudioSession.activate()
                    SfxPlayer.shared.start()
                }
        }
    }
}
