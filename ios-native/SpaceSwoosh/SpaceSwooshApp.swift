// SpaceSwooshApp.swift
// Changes: Configure RevenueCat after Firebase; entitlements refresh does not block the menu.

import SwiftUI

@main
struct SpaceSwooshApp: App {
    @ObservedObject private var settings = SettingsStore.shared

    init() {
        AnalyticsService.configure()
        PurchasesService.configure()
        EntitlementsStore.shared.bootstrap()
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
