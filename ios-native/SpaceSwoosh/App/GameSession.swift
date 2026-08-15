// GameSession.swift
// Changes: Slice D — CopyBank death lines, sparkles, world fade, fuel-live HUD.

import Foundation
import Combine
import CoreGraphics

final class GameSession: ObservableObject {
    @Published var scoreKm: Int = 0
    @Published var fuel: CGFloat = 1
    @Published var fuelLive: Bool = false
    @Published var fuelLow: Bool = false
    @Published var shieldActive: Bool = false
    @Published var destroyed: Int = 0
    @Published var sparkles: Int = 0
    @Published var isOver: Bool = false
    @Published var failTitle: String = ""
    @Published var failDetail: String = ""
    @Published var worldAlpha: CGFloat = 1
    @Published var overlayAlpha: CGFloat = 0

    private var flavorPicked = false

    func apply(run: RunState) {
        scoreKm = Int(run.scoreKm)
        fuel = run.fuel
        fuelLive = run.sparklesLive
        fuelLow = run.sparklesLive && run.fuel > 0 && run.fuel <= GameConfig.Fuel.lowThreshold
        shieldActive = run.shieldActive
        destroyed = run.obstaclesDestroyed
        sparkles = run.sparklesCollected
        isOver = run.isOver
        worldAlpha = run.worldAlpha
        overlayAlpha = run.isOver ? min(1, run.endingT / 0.45) : 0
        if run.isOver, !flavorPicked {
            flavorPicked = true
            failTitle = "MISSION FAILED"
            switch run.failReason {
            case .fuel:
                failDetail = CopyBank.pick(.fuelOut)
            case .crash:
                failDetail = CopyBank.pick(.crash)
            case .none:
                failDetail = CopyBank.pick(.crash)
            }
        }
    }

    func reset() {
        scoreKm = 0
        fuel = 1
        fuelLive = false
        fuelLow = false
        shieldActive = false
        destroyed = 0
        sparkles = 0
        isOver = false
        failTitle = ""
        failDetail = ""
        worldAlpha = 1
        overlayAlpha = 0
        flavorPicked = false
    }
}
