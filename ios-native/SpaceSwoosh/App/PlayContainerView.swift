// PlayContainerView.swift
// Changes: Pass board rank into Submit Signal for Firebase submit_highscore.

import SwiftUI
import SpriteKit
import UIKit

struct PlayContainerView: View {
    var launch: PlayLaunch
    var onMenu: () -> Void
    var onMap: () -> Void

    @ObservedObject private var settings = SettingsStore.shared
    @StateObject private var pacing = FramePacingMonitor()
    @StateObject private var session = GameSession()
    @State private var scene = PlayScene(size: CGSize(width: 390, height: 844))
    @State private var paused = false
    @State private var showHighScores = false
    @State private var showSubmit = false
    @State private var didAutoPrompt = false
    @State private var currentLaunch: PlayLaunch

    init(launch: PlayLaunch, onMenu: @escaping () -> Void, onMap: @escaping () -> Void) {
        self.launch = launch
        self.onMenu = onMenu
        self.onMap = onMap
        _currentLaunch = State(initialValue: launch)
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                BrandColors.paper.ignoresSafeArea()

                SpriteView(scene: scene, options: [.ignoresSiblingOrder])
                    .frame(width: geo.size.width, height: geo.size.height)
                    .ignoresSafeArea()

                VStack {
                    if session.hudDistance > 0.02 || session.hudPause > 0.02 {
                        MockupCHUD(session: session) {
                            paused = true
                            scene.isPaused = true
                        }
                    }

                    if !session.captionText.isEmpty {
                        Text(session.captionText)
                            .font(.system(size: 17, weight: .medium))
                            .foregroundStyle(BrandColors.ink)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(BrandColors.paperTint.opacity(0.92))
                            .opacity(Double(session.captionOpacity))
                            .padding(.top, session.hudDistance > 0.02 ? 12 : 80)
                    } else if !session.milestoneText.isEmpty {
                        Text(session.milestoneText)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(BrandColors.ink)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 10)
                            .background(BrandColors.paperTint.opacity(0.92))
                            .opacity(Double(session.milestoneOpacity))
                            .padding(.top, 12)
                    }

                    if !session.logbookToast.isEmpty, session.hudLive {
                        Text(session.logbookToast.uppercased())
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundStyle(BrandColors.signal)
                            .padding(.top, 8)
                    }

                    Spacer()

                    #if DEBUG
                    FramePacingHUD(monitor: pacing)
                        .padding(.bottom, 12)
                    #endif
                }
                .padding(.top, geo.safeAreaInsets.top)
                .padding(.bottom, geo.safeAreaInsets.bottom)
                .opacity(session.isOver ? Double(session.worldAlpha) : 1)

                if paused, !session.isOver {
                    pauseOverlay
                }

                if session.isOver {
                    if let outcome = session.outcome {
                        levelOutcomeCard(outcome)
                            .opacity(Double(session.overlayAlpha))
                    } else {
                        gameOverCard
                            .opacity(Double(session.overlayAlpha))
                    }
                }

                if showSubmit {
                    SubmitScoreView(
                        score: session.scoreKm,
                        destroyed: session.destroyed,
                        rank: session.rankLabel,
                        rankNumber: session.boardRank,
                        shipId: settings.shipSkinId,
                        style: settings.flightStyle,
                        onDone: {
                            session.scoreSubmitted = true
                            showSubmit = false
                            showHighScores = true
                        },
                        onCancel: { showSubmit = false }
                    )
                    .padding(.top, geo.safeAreaInsets.top)
                }

                if showHighScores {
                    HighScoresView(onBack: { showHighScores = false })
                        .padding(.top, geo.safeAreaInsets.top)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .onAppear {
                UIApplication.shared.isIdleTimerDisabled = true
                scene.scaleMode = .resizeFill
                scene.size = geo.size
                scene.pacingMonitor = pacing
                scene.session = session
                SfxPlayer.shared.muted = settings.muted || !settings.sfxEnabled
                MusicPlayer.shared.muted = settings.muted || !settings.musicEnabled
                VoicePlayer.shared.enabled = settings.voiceEnabled && !settings.muted
                scene.startRun(currentLaunch)
            }
            .onChange(of: paused) { _, isPaused in
                scene.isPaused = isPaused
                if isPaused {
                    MusicPlayer.shared.pause()
                    VoicePlayer.shared.pause()
                } else {
                    MusicPlayer.shared.resume()
                    VoicePlayer.shared.resume()
                }
            }
            .onDisappear {
                UIApplication.shared.isIdleTimerDisabled = false
                scene.stopRun()
            }
            .onChange(of: session.isOver) { _, over in
                if over, !currentLaunch.isLevelRun {
                    Task { await lookupBoardRank() }
                }
            }
            .onChange(of: session.overlayAlpha) { _, alpha in
                maybeAutoPrompt(alpha)
            }
            .onChange(of: session.boardRank) { _, _ in
                maybeAutoPrompt(session.overlayAlpha)
            }
            .onChange(of: geo.size) { _, newSize in
                scene.size = newSize
            }
        }
        .ignoresSafeArea()
    }

    private var pauseOverlay: some View {
        ShellChrome.paperWash {
            VStack(spacing: 18) {
                Spacer()
                ShellChrome.pauseTitle()
                ShellChrome.divider()
                    .padding(.horizontal, 28)
                HStack(spacing: 0) {
                    ShellChrome.statColumn(value: "\(session.scoreKm)", label: "KM")
                    Rectangle()
                        .fill(BrandColors.ink.opacity(0.12))
                        .frame(width: 1, height: 44)
                    ShellChrome.statColumn(value: "\(session.sparkles)", label: "SPARKLES")
                }
                .padding(.horizontal, 28)
                ShellChrome.divider()
                    .padding(.horizontal, 28)
                VStack(spacing: 12) {
                    ShellChrome.brandButton("Resume", tag: "▶", primary: true) {
                        paused = false
                        scene.isPaused = false
                    }
                    ShellChrome.brandButton("Sound", tag: settings.muted ? "OFF" : "ON") {
                        settings.toggleMute()
                    }
                    ShellChrome.brandButton("Exit Run", tag: "⌂", action: leaveToMapOrMenu)
                }
                .padding(.horizontal, 28)
                Text("EXIT ENDS THE RUN — NOTHING IS SAVED")
                    .font(BrandType.label(10))
                    .tracking(BrandType.labelTracking(10))
                    .foregroundStyle(BrandColors.ink.opacity(0.30))
                    .padding(.bottom, 28)
            }
        }
    }

    private var gameOverCard: some View {
        ShellChrome.paperWash {
            VStack(spacing: 16) {
                Spacer()
                Text(session.failTitle)
                    .font(BrandType.display(26))
                    .tracking(BrandType.displayTracking(26))
                    .foregroundStyle(BrandColors.ink)
                Text(session.failDetail)
                    .font(BrandType.body(14))
                    .foregroundStyle(BrandColors.ink55)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 28)
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(session.scoreKm)")
                        .font(BrandType.mono(40))
                    Text("KM")
                        .font(BrandType.label(12))
                        .tracking(BrandType.labelTracking(12))
                        .foregroundStyle(BrandColors.ink55)
                }
                .foregroundStyle(BrandColors.ink)
                if session.isNewBest {
                    Text("NEW BEST  \(session.personalBest) KM")
                        .font(BrandType.mono(12))
                        .foregroundStyle(BrandColors.signal)
                } else if session.personalBest > 0 {
                    Text("BEST  \(session.personalBest) KM")
                        .font(BrandType.mono(12, bold: false))
                        .foregroundStyle(BrandColors.ink55)
                }
                ShellChrome.divider()
                    .padding(.horizontal, 28)
                HStack(spacing: 0) {
                    ShellChrome.statColumn(value: "\(session.destroyed)", label: "DESTROYED")
                    Rectangle()
                        .fill(BrandColors.ink.opacity(0.12))
                        .frame(width: 1, height: 44)
                    ShellChrome.statColumn(value: "\(session.sparkles)", label: "SPARKLES")
                }
                .padding(.horizontal, 28)
                VStack(spacing: 12) {
                    ShellChrome.brandButton("Play Again", tag: "↺", primary: true) {
                        replay(currentLaunch)
                    }
                    if !session.scoreSubmitted {
                        ShellChrome.brandButton("Submit Score", tag: "↑") {
                            showSubmit = true
                        }
                    }
                    ShellChrome.brandButton("High Scores", tag: "#") {
                        showHighScores = true
                    }
                    ShellChrome.brandButton("Menu", tag: "⌂", action: onMenu)
                }
                .padding(.horizontal, 28)
                .padding(.bottom, 36)
            }
        }
    }

    private func levelOutcomeCard(_ outcome: LevelOutcome) -> some View {
        ShellChrome.paperWash {
            VStack(spacing: 14) {
                Spacer()
                Text(outcome.title)
                    .font(BrandType.display(24))
                    .tracking(BrandType.displayTracking(24))
                    .foregroundStyle(BrandColors.ink)
                Text(outcome.flavor)
                    .font(BrandType.body(14))
                    .foregroundStyle(BrandColors.ink55)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 28)
                ForEach(0..<outcome.starSlots, id: \.self) { i in
                    HStack {
                        SparkleIcon()
                            .fill(outcome.stars[i] ? BrandColors.signal : Color.clear)
                            .overlay(
                                SparkleIcon().stroke(BrandColors.signal, lineWidth: 1.2)
                            )
                            .frame(width: 16, height: 16)
                        Text(outcome.labels[i].uppercased())
                            .font(BrandType.label(11))
                            .tracking(BrandType.labelTracking(11))
                        Spacer()
                        if i < outcome.values.count {
                            Text(outcome.values[i])
                                .font(BrandType.mono(12))
                        }
                        if i < outcome.newStars.count, outcome.newStars[i] {
                            Text("NEW")
                                .font(BrandType.label(10))
                                .tracking(BrandType.labelTracking(10))
                                .foregroundStyle(BrandColors.signal)
                        }
                    }
                    .foregroundStyle(outcome.stars[i] ? BrandColors.ink : BrandColors.ink80)
                    .padding(.horizontal, 28)
                }
                VStack(spacing: 12) {
                    if outcome.completed, case .journey(let level) = outcome.launch, level < JourneyConfig.totalLevels {
                        ShellChrome.brandButton("Next Level", tag: "▶", primary: true) {
                            replay(.journey(level + 1))
                        }
                    }
                    ShellChrome.brandButton(
                        outcome.completed ? "Replay" : "Retry",
                        tag: "↺",
                        primary: !outcome.completed
                    ) { replay(outcome.launch) }
                    ShellChrome.brandButton("Level Select", tag: "☰", action: onMap)
                    ShellChrome.ghostButton("Menu", action: onMenu)
                }
                .padding(.horizontal, 28)
                .padding(.bottom, 36)
            }
        }
    }

    private func replay(_ launch: PlayLaunch) {
        currentLaunch = launch
        paused = false
        showSubmit = false
        showHighScores = false
        didAutoPrompt = false
        scene.isPaused = false
        scene.startRun(launch)
    }

    private func lookupBoardRank() async {
        guard ScoreService.isAvailable else {
            await MainActor.run { session.rankLookupFailed = true }
            return
        }
        do {
            let higher = try await ScoreService.higherCount(score: session.scoreKm, style: settings.flightStyle)
            await MainActor.run {
                session.boardRank = higher + 1
                session.rankLookupFailed = false
            }
        } catch {
            await MainActor.run {
                session.rankLookupFailed = true
                session.boardRank = nil
            }
        }
        await MainActor.run { maybeAutoPrompt(session.overlayAlpha) }
    }

    private func maybeAutoPrompt(_ alpha: CGFloat) {
        guard !didAutoPrompt, !showSubmit, !currentLaunch.isLevelRun else { return }
        guard session.shouldAutoPromptSubmit, alpha >= 0.98 else { return }
        didAutoPrompt = true
        showSubmit = true
    }

    private func leaveToMapOrMenu() {
        if currentLaunch.isLevelRun {
            onMap()
        } else {
            onMenu()
        }
    }

}

#if DEBUG
struct FramePacingHUD: View {
    @ObservedObject var monitor: FramePacingMonitor

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(monitor.summaryLine)
                .font(.system(size: 10, weight: .medium, design: .monospaced))
            Text(monitor.flagsLine)
                .font(.system(size: 10, weight: .medium, design: .monospaced))
            if !monitor.loadLine.isEmpty {
                Text(monitor.loadLine)
                    .font(.system(size: 10, weight: .regular, design: .monospaced))
            }
        }
        .foregroundStyle(BrandColors.ink80)
        .padding(8)
        .background(BrandColors.paperTint.opacity(0.88))
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12)
    }
}
#endif
