// GameSession.swift
// Changes: Phase C — SwiftUI-facing Open Space HUD + game-over state.

import Foundation
import Combine
import CoreGraphics

final class GameSession: ObservableObject {
    @Published var scoreKm: Int = 0
    @Published var fuel: CGFloat = 1
    @Published var shieldActive: Bool = false
    @Published var destroyed: Int = 0
    @Published var isOver: Bool = false
    @Published var failTitle: String = ""
    @Published var failDetail: String = ""

    func apply(run: RunState) {
        scoreKm = Int(run.scoreKm)
        fuel = run.fuel
        shieldActive = run.shieldActive
        destroyed = run.obstaclesDestroyed
        isOver = run.isOver
        if run.isOver {
            switch run.failReason {
            case .fuel:
                failTitle = "FUEL OUT"
                failDetail = "The tank ran dry."
            case .crash:
                failTitle = "MISSION FAILED"
                failDetail = "Hull contact."
            case .none:
                failTitle = "MISSION FAILED"
                failDetail = ""
            }
        }
    }

    func reset() {
        scoreKm = 0
        fuel = 1
        shieldActive = false
        destroyed = 0
        isOver = false
        failTitle = ""
        failDetail = ""
    }
}
