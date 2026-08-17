// GameSession.swift
// Changes: Open Space rank lookup fields for Supabase submit prompt.

import Foundation
import Combine
import CoreGraphics

struct LevelOutcome: Equatable {
    var launch: PlayLaunch
    var completed: Bool
    var title: String
    var flavor: String
    var stars: [Bool]
    var newStars: [Bool]
    var starSlots: Int
    var labels: [String]
    var values: [String]
    var goalKm: Int
}

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
    @Published var captionText: String = ""
    @Published var captionOpacity: CGFloat = 0
    @Published var hudLive: Bool = true
    @Published var hudDistance: CGFloat = 0
    @Published var hudPause: CGFloat = 0
    @Published var hudSmash: CGFloat = 0
    @Published var hudPoints: CGFloat = 0
    @Published var goalKm: Int = 0
    @Published var smashTarget: Int = 0
    @Published var journeyProgress: CGFloat = 0
    @Published var isJourney: Bool = false
    @Published var launch: PlayLaunch = .openSpace
    @Published var outcome: LevelOutcome?
    @Published var logbookToast: String = ""
    @Published var boardRank: Int?
    @Published var rankLookupFailed = false
    @Published var scoreSubmitted = false

    private var flavorPicked = false

    var rankLabel: String {
        if rankLookupFailed { return "?" }
        if let boardRank { return "#\(boardRank)" }
        return "…"
    }

    var shouldAutoPromptSubmit: Bool {
        guard !scoreSubmitted, !rankLookupFailed, let boardRank else { return false }
        return boardRank <= 10
    }

    func apply(run: RunState) {
        scoreKm = Int(run.scoreKm)
        fuel = run.fuel
        fuelLive = run.sparklesLive && run.hudDistance > 0.02
        fuelLow = run.sparklesLive && run.fuel > 0 && run.fuel <= GameConfig.Fuel.lowThreshold
        shieldActive = run.shieldActive
        destroyed = run.obstaclesDestroyed
        sparkles = run.sparklesCollected
        points = run.points
        isOver = run.isOver
        worldAlpha = run.worldAlpha
        overlayAlpha = run.isOver
            ? min(1, run.endingT / (run.completed ? CinematicFlight.screenIn : 0.45))
            : 0
        milestoneText = run.milestoneText
        milestoneOpacity = run.milestoneOpacity
        captionText = run.captionText
        captionOpacity = run.captionOpacity
        hudLive = run.hudLive
        hudDistance = run.hudDistance
        hudPause = run.hudPause
        hudSmash = run.hudSmash
        hudPoints = run.hudPoints
        goalKm = run.profile.isEndless ? 0 : Int(run.profile.goalKm)
        smashTarget = run.profile.smashTarget
        isJourney = !run.profile.isEndless
        if run.profile.goalKm > 0 {
            journeyProgress = max(0, min(1, run.scoreKm / run.profile.goalKm))
        } else {
            journeyProgress = 0
        }
        launch = playLaunch(from: run.profile)

        let logActive = run.profile.mode == .journey || run.profile.mode == .hazardLab
        if !run.logbookMarks.isEmpty {
            if LogbookStore.shared.apply(run.logbookMarks, active: logActive) {
                logbookToast = LogbookStore.shared.toast
            }
        }
        if !LogbookStore.shared.toast.isEmpty {
            logbookToast = LogbookStore.shared.toast
        }

        if run.isOver, !flavorPicked {
            flavorPicked = true
            if run.profile.mode == .openSpace {
                failTitle = "MISSION FAILED"
                switch run.failReason {
                case .fuel:
                    failDetail = CopyBank.pick(.fuelOut)
                case .crash, .none:
                    failDetail = CopyBank.pick(.crash)
                }
                let recorded = OpenWorldProgress.record(
                    score: Int(run.scoreKm),
                    destroyed: run.obstaclesDestroyed,
                    style: run.flightStyle
                )
                personalBest = recorded.best
                isNewBest = recorded.isNew
            } else {
                outcome = makeOutcome(run: run)
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
        captionText = ""
        captionOpacity = 0
        hudLive = true
        hudDistance = 0
        hudPause = 0
        hudSmash = 0
        hudPoints = 0
        goalKm = 0
        smashTarget = 0
        journeyProgress = 0
        isJourney = false
        outcome = nil
        logbookToast = ""
        boardRank = nil
        rankLookupFailed = false
        scoreSubmitted = false
        flavorPicked = false
        LogbookStore.shared.clearToast()
    }

    private func playLaunch(from profile: RunProfile) -> PlayLaunch {
        switch profile.mode {
        case .openSpace: return .openSpace
        case .journey: return .journey(profile.level)
        case .hazardLab: return .hazardLab
        }
    }

    private func makeOutcome(run: RunState) -> LevelOutcome {
        let lab = run.profile.mode == .hazardLab
        let spec = run.profile.descriptor
        let completed = run.completed
        var stars = [false, false, false]
        var newStars = [false, false, false]
        var slots = run.profile.starSlots
        var labels: [String] = []
        var values: [String] = []
        var title: String
        var flavor: String

        if lab {
            title = completed ? "LAB CLEAR" : "LAB FAILED"
            flavor = completed
                ? "Lab clear. The new rocks behaved."
                : (run.failReason == .fuel
                    ? CopyBank.pick(.fuelOut)
                    : "Lab interrupted. The rocks are still curious.")
            slots = 0
        } else if let spec {
            stars = JourneyConfig.evaluateStars(
                spec,
                completed: completed,
                sparklesCollected: run.sparklesCollected,
                obstaclesDestroyed: run.obstaclesDestroyed
            )
            let recorded = JourneyStore.shared.record(
                level: spec.level,
                stars: stars,
                points: run.points,
                completed: completed
            )
            stars = recorded.stars
            newStars = recorded.newStars
            slots = spec.starSlots
            labels = JourneyConfig.starLabels(for: spec)
            values = [
                "\(Int(run.scoreKm)) / \(Int(spec.goalKm))",
                "\(run.sparklesCollected) / \(spec.sparklesTarget)",
                "\(run.obstaclesDestroyed) / \(spec.smashTarget)"
            ]
            if !completed {
                title = "LEVEL FAILED"
            } else if spec.level >= JourneyConfig.totalLevels {
                title = "JOURNEY COMPLETE"
            } else {
                title = "LEVEL \(spec.level) CLEAR"
            }
            flavor = CopyBank.journeyFlavor(
                completed: completed,
                level: spec.level,
                stars: stars,
                starSlots: slots
            )
        } else {
            title = completed ? "CLEAR" : "FAILED"
            flavor = ""
        }

        return LevelOutcome(
            launch: playLaunch(from: run.profile),
            completed: completed,
            title: title,
            flavor: flavor,
            stars: stars,
            newStars: newStars,
            starSlots: slots,
            labels: labels,
            values: Array(values.prefix(slots)),
            goalKm: Int(run.profile.goalKm)
        )
    }
}
