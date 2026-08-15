// SpaceSwooshApp.swift
// Changes: Slice D — follow SettingsStore light/night paper.

import SwiftUI

@main
struct SpaceSwooshApp: App {
    @ObservedObject private var settings = SettingsStore.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .statusBarHidden(true)
                .preferredColorScheme(settings.isDark ? .dark : .light)
        }
    }
}
