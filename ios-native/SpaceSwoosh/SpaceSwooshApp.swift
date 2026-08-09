// SpaceSwooshApp.swift
// Changes: Phase A — SwiftUI app entry; portrait-only native shell for SpriteKit play.

import SwiftUI

@main
struct SpaceSwooshApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .statusBarHidden(true)
                .preferredColorScheme(.light)
        }
    }
}
