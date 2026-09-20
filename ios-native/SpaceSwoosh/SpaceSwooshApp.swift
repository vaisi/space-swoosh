// SpaceSwooshApp.swift
// Changes: Game Center authenticate on appear so Open Space can silent-submit
// to Friends boards. Status bar stays hidden; no system nav title. Now Playing
// is cleared in GameAudioSession. Configure RevenueCat after Firebase.

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
                    FriendsScoreService.authenticate()
                }
        }
    }
}
