// SpaceSwooshApp.swift
// Changes: Activate playback audio session at launch so TestFlight is not silent.

import SwiftUI

@main
struct SpaceSwooshApp: App {
    @ObservedObject private var settings = SettingsStore.shared

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
