// GameSession.swift
// Changes: Slice D — milestones, points HUD, local Open Space PB per style.

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
    @Published var points: Int = 0
    @Published var isOver: Bool = false
    @Published var failTitle: String = ""
    @Published var failDetail: String = ""
    @Published var worldAlpha: CGFloat = 1
    @Published var overlayAlpha: CGFloat = 0
    @Published var milestoneText: String = ""
    @Published var milestoneOpacity: CGFloat = 0
    @Published var personalBest: Int = 0
    @Published var isNewBest: Bool = false

    private var flavorPicked = false

    func apply(run: RunState) {
        scoreKm = Int(run.scoreKm)
        fuel = run.fuel
        fuelLive = run.sparklesLive
        fuelLow = run.sparklesLive && run.fuel > 0 && run.fuel <= GameConfig.Fuel.lowThreshold
        shieldActive = run.shieldActive
        destroyed = run.obstaclesDestroyed
        sparkles = run.sparklesCollected
        points = run.points
        isOver = run.isOver
        worldAlpha = run.worldAlpha
        overlayAlpha = run.isOver ? min(1, run.endingT / 0.45) : 0
        milestoneText = run.milestoneText
        milestoneOpacity = run.milestoneOpacity
        if run.isOver, !flavorPicked {
            flavorPicked = true
            failTitle = "MISSION FAILED"
            switch run.failReason {
            case .fuel:
                failDetail = CopyBank.pick(.fuelOut)
            case .crash, .none:
                failDetail = CopyBank.pick(.crash)
            }
            let recorded = OpenWorldProgress.record(score: Int(run.scoreKm), style: run.flightStyle)
            personalBest = recorded.best
            isNewBest = recorded.isNew
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
        points = 0
        isOver = false
        failTitle = ""
        failDetail = ""
        worldAlpha = 1
        overlayAlpha = 0
        milestoneText = ""
        milestoneOpacity = 0
        personalBest = 0
        isNewBest = false
        flavorPicked = false
    }
}
