// SpaceSwooshApp.swift
// Changes: Configure Firebase Analytics at launch (before any gameplay events).

import SwiftUI

@main
struct SpaceSwooshApp: App {
    @ObservedObject private var settings = SettingsStore.shared

    init() {
        AnalyticsService.configure()
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
