// PlayContainerView.swift
// Changes: Open World bouncing tap / swipe-left / swipe-right cue overlay.
// L42 written epilogue — dark hold, Day 42 voice+captions, 3s gap, then open.
// Skip captions are two beats (one phrase each), matching the skip voice.
// First ending: Arc unlock card, then Controls with Arc on.
// One epilogue reply per device — replay skips the prompt.
// Submit records SettingsStore.shared.shipSkinId (this view has no settings).
// Epilogue lights: reply fades to 0, your-star crossfades in with a birth
// sparkle. Sky lights are Signal-Blue cores + tight halos + short spikes.

import SwiftUI
import SpriteKit
import UIKit

struct PlayContainerView: View {
    var launch: PlayLaunch
    var onMenu: () -> Void
    var onMap: () -> Void
    var onUnlockArc: () -> Void

    @ObservedObject private var settings = SettingsStore.shared
    @StateObject private var pacing = FramePacingMonitor()
    @StateObject private var session = GameSession()
    @State private var scene = PlayScene(size: CGSize(width: 390, height: 844))
    @State private var paused = false
    @State private var showHighScores = false
    @State private var showSubmit = false
    @State private var didAutoPrompt = false
    @State private var currentLaunch: PlayLaunch

    init(
        launch: PlayLaunch,
        onMenu: @escaping () -> Void,
        onMap: @escaping () -> Void,
        onUnlockArc: @escaping () -> Void
    ) {
        self.launch = launch
        self.onMenu = onMenu
        self.onMap = onMap
        self.onUnlockArc = onUnlockArc
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

                    if !session.steerCue.isEmpty {
                        SteerCueOverlay(kind: session.steerCue)
                            .padding(.top, 28)
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

                if session.showEpilogue {
                    JourneyEpilogueView(onDone: onMenu, onUnlockArc: onUnlockArc)
                } else if session.isOver {
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

struct SteerCueOverlay: View {
    var kind: String

    var body: some View {
        TimelineView(.animation) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            VStack(spacing: 18) {
                glyph(at: t)
                    .frame(width: 88, height: 88)
                Text(label)
                    .font(.system(size: 15, weight: .bold))
                    .tracking(1.6)
                    .foregroundStyle(BrandColors.ink)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(BrandColors.paperTint.opacity(0.94))
                    .overlay(Rectangle().stroke(BrandColors.ink, lineWidth: 1.5))
            }
        }
        .allowsHitTesting(false)
    }

    private var label: String {
        switch kind {
        case "swipeLeft": return "SWIPE LEFT"
        case "swipeRight": return "SWIPE RIGHT"
        default: return "TAP"
        }
    }

    @ViewBuilder
    private func glyph(at time: TimeInterval) -> some View {
        if kind == "swipeLeft" || kind == "swipeRight" {
            let dir: CGFloat = kind == "swipeRight" ? 1 : -1
            let cycle = time.truncatingRemainder(dividingBy: 1.35)
            let eased = min(1, cycle / 0.95)
            let x = dir * 36 * (eased * eased * (3 - 2 * eased) - 0.5)
            Circle()
                .fill(BrandColors.ink)
                .frame(width: 28, height: 28)
                .overlay(
                    Circle()
                        .fill(BrandColors.paper)
                        .frame(width: 8, height: 8)
                        .offset(x: -4, y: -5),
                    alignment: .topLeading
                )
                .offset(x: x)
        } else {
            let cycle = time.truncatingRemainder(dividingBy: 1.15)
            let press = cycle < 0.42 ? sin((cycle / 0.42) * .pi) : 0
            let bounce = abs(sin(time * 5.5)) * 6
            Circle()
                .fill(BrandColors.ink)
                .frame(width: 32, height: 32)
                .scaleEffect(1 - press * 0.18)
                .overlay(
                    Circle()
                        .stroke(BrandColors.ink.opacity(0.35), lineWidth: 2)
                        .scaleEffect(1 + press * 0.9)
                )
                .offset(y: -bounce + press * 10)
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

struct JourneyEpilogueView: View {
    var onDone: () -> Void
    var onUnlockArc: () -> Void

    @State private var phase = "hold"
    @State private var caption = ""
    @State private var reply = ""
    @State private var error = ""
    @State private var busy = false
    @State private var ordinal: Int?
    @State private var lights: [EpilogueLight] = []
    @State private var beatIndex = 0
    @State private var openVoiceDone = false
    @State private var openBeatsDone = false
    @State private var arrivalVoiceDone = false
    @State private var arrivalBeatsDone = false
    @State private var skipVoiceDone = false
    @State private var skipBeatsDone = false
    @State private var lightsAt = Date()
    @State private var generation = UUID()

    private let driftMs: Double = 1.6
    private let yourStarFadeMs: Double = 0.7

    private let openBeats = GeneratedJourneyData.epilogueOpen
    private let skipBeats = GeneratedJourneyData.epilogueSkip
    private let arrivalBeats = JourneyConfig.introBeats(for: JourneyConfig.totalLevels)
    private let bone = Color(red: 225 / 255, green: 217 / 255, blue: 193 / 255)
    private let darkHold: Double = 1.6
    private let arrivalGap: Double = 5.0

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 20) {
                if phase != "prompt" {
                    Spacer()
                }
                if !caption.isEmpty {
                    Text(caption)
                        .font(BrandType.display(22))
                        .tracking(BrandType.displayTracking(22))
                        .foregroundStyle(bone.opacity(0.92))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 28)
                }
                if phase == "prompt" {
                    Text(GeneratedJourneyData.epiloguePrompt.uppercased())
                        .font(BrandType.label(12))
                        .tracking(BrandType.labelTracking(12))
                        .foregroundStyle(bone.opacity(0.62))
                        .multilineTextAlignment(.center)
                        .padding(.top, 72)
                        .padding(.horizontal, 28)
                    TextField(GeneratedJourneyData.epiloguePromptPlaceholder, text: $reply, axis: .vertical)
                        .lineLimit(3...5)
                        .font(BrandType.display(22))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(bone)
                        .tint(bone)
                        .padding(.vertical, 12)
                        .overlay(alignment: .bottom) {
                            Rectangle().fill(bone).frame(height: 2)
                        }
                        .padding(.horizontal, 28)
                        .padding(.top, 32)
                        .disabled(busy)
                        .onChange(of: reply) { _, next in
                            if next.count > ReplyFilter.maxLength {
                                reply = String(next.prefix(ReplyFilter.maxLength))
                            }
                        }
                    if !error.isEmpty {
                        Text(error)
                            .font(BrandType.mono(12))
                            .foregroundStyle(.red.opacity(0.85))
                    }
                    Spacer()
                    Button {
                        Task { await submit(skipped: false) }
                    } label: {
                        Text(GeneratedJourneyData.epilogueSubmitLabel.uppercased())
                            .font(BrandType.label(12))
                            .tracking(BrandType.labelTracking(12))
                            .foregroundStyle(bone.opacity(0.95))
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: 56)
                            .overlay(Rectangle().stroke(bone.opacity(0.9), lineWidth: 1.5))
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 28)
                    .disabled(busy)
                    Button {
                        Task { await submit(skipped: true) }
                    } label: {
                        Text(GeneratedJourneyData.epilogueSkipLabel.uppercased())
                            .font(BrandType.label(12))
                            .tracking(BrandType.labelTracking(12))
                            .foregroundStyle(bone.opacity(0.78))
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: 56)
                            .overlay(Rectangle().stroke(bone.opacity(0.35), lineWidth: 1.5))
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 28)
                    .padding(.bottom, 28)
                    .disabled(busy)
                }
                if phase == "lights" {
                    TimelineView(.animation) { timeline in
                        let elapsed = timeline.date.timeIntervalSince(lightsAt)
                        let t = min(1, elapsed / driftMs)
                        let ease = t * t
                        let textAlpha = reply.isEmpty ? 0.0 : (1 - ease)
                        let driftY: CGFloat = reply.isEmpty ? 0 : CGFloat(80 - ease * 120)
                        let yourStart = reply.isEmpty ? 0.0 : (driftMs - yourStarFadeMs)
                        let yourAge = elapsed - yourStart
                        let yourAlpha = max(0, min(1, yourAge / yourStarFadeMs))
                        ZStack {
                            Canvas { context, size in
                                for light in lights {
                                    let age = elapsed - light.delay
                                    guard age > 0 else { continue }
                                    let alpha = min(1, age / 0.9)
                                    let cx = light.x * size.width
                                    let cy = light.y * size.height
                                    EpilogueStarPaint.drawSky(
                                        &context,
                                        cx: cx,
                                        cy: cy,
                                        r: light.r,
                                        alpha: alpha
                                    )
                                }
                                if yourAlpha > 0.01 {
                                    EpilogueStarPaint.drawYour(
                                        &context,
                                        cx: size.width / 2,
                                        cy: size.height * 0.5 - 40,
                                        alpha: yourAlpha,
                                        age: yourAge
                                    )
                                }
                            }
                            .frame(maxWidth: .infinity, minHeight: 280)
                            if !reply.isEmpty {
                                Text(reply)
                                    .font(BrandType.display(18))
                                    .foregroundStyle(bone.opacity(0.9))
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 28)
                                    .offset(y: driftY)
                                    .opacity(textAlpha)
                                    .allowsHitTesting(false)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, minHeight: 280)
                }
                if phase == "counter" {
                    Text(counterLine)
                        .font(BrandType.display(24))
                        .foregroundStyle(bone.opacity(0.95))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 28)
                }
                if phase == "footer" {
                    Text(GeneratedJourneyData.epilogueFooterCard)
                        .font(BrandType.display(20))
                        .foregroundStyle(bone.opacity(0.95))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 28)
                        .onTapGesture { openFollow() }
                    ShellChrome.brandButton("Open Instagram", tag: "@", primary: true) {
                        openFollow()
                    }
                    .padding(.horizontal, 28)
                }
                if phase == "arcUnlock" {
                    VStack(spacing: 16) {
                        ForEach(GeneratedJourneyData.epilogueArcUnlockLines, id: \.self) { line in
                            Text(line)
                                .font(BrandType.display(24))
                                .foregroundStyle(bone.opacity(0.95))
                                .multilineTextAlignment(.center)
                        }
                    }
                    .padding(.horizontal, 28)
                    Button {
                        onUnlockArc()
                    } label: {
                        Text(GeneratedJourneyData.epilogueArcUnlockLabel.uppercased())
                            .font(BrandType.label(12))
                            .tracking(BrandType.labelTracking(12))
                            .foregroundStyle(bone.opacity(0.95))
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: 56)
                            .overlay(Rectangle().stroke(bone.opacity(0.9), lineWidth: 1.5))
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 28)
                    .padding(.bottom, 28)
                }
                if phase != "prompt" {
                    Spacer()
                }
            }
        }
        .onAppear { startOpen() }
        .onDisappear {
            generation = UUID()
            VoicePlayer.shared.stop()
        }
    }

    private var counterLine: String {
        if let ordinal {
            return GeneratedJourneyData.epilogueCounterCard.replacingOccurrences(
                of: "{N}",
                with: ReplyFilter.formatOrdinal(ordinal)
            )
        }
        return GeneratedJourneyData.epilogueOfflineCard
    }

    private func startOpen() {
        phase = "hold"
        caption = ""
        arrivalVoiceDone = false
        arrivalBeatsDone = false
        openVoiceDone = false
        openBeatsDone = false
        beatIndex = 0
        let stamp = generation
        DispatchQueue.main.asyncAfter(deadline: .now() + darkHold) {
            guard stamp == generation, phase == "hold" else { return }
            phase = "arrival"
            VoicePlayer.shared.playLevel(JourneyConfig.totalLevels) {
                DispatchQueue.main.async {
                    arrivalVoiceDone = true
                    tryEnterOpen()
                }
            }
            playArrivalBeat()
        }
    }

    private func playArrivalBeat() {
        guard beatIndex < arrivalBeats.count else {
            caption = ""
            arrivalBeatsDone = true
            tryEnterOpen()
            return
        }
        let beat = arrivalBeats[beatIndex]
        caption = beat.text
        let hold = max(0.9, min(2.8, Double(beat.text.count) * 0.055))
        let gap = Double(beat.gapAfterMs) / 1000
        let stamp = generation
        DispatchQueue.main.asyncAfter(deadline: .now() + hold + gap) {
            guard stamp == generation, phase == "arrival" else { return }
            beatIndex += 1
            playArrivalBeat()
        }
    }

    private func tryEnterOpen() {
        guard phase == "arrival", arrivalBeatsDone, arrivalVoiceDone else { return }
        caption = ""
        phase = "arrivalHold"
        VoicePlayer.shared.stop()
        let stamp = generation
        DispatchQueue.main.asyncAfter(deadline: .now() + arrivalGap) {
            guard stamp == generation, phase == "arrivalHold" else { return }
            phase = "open"
            beatIndex = 0
            openVoiceDone = false
            openBeatsDone = false
            VoicePlayer.shared.playEpilogueOpen {
                DispatchQueue.main.async {
                    openVoiceDone = true
                    tryEnterPrompt()
                }
            }
            playOpenBeat()
        }
    }

    private func playOpenBeat() {
        guard beatIndex < openBeats.count else {
            caption = ""
            openBeatsDone = true
            tryEnterPrompt()
            return
        }
        let beat = openBeats[beatIndex]
        caption = beat.text
        let hold = max(0.9, min(2.8, Double(beat.text.count) * 0.055))
        let gap = Double(beat.gapAfterMs) / 1000
        let stamp = generation
        DispatchQueue.main.asyncAfter(deadline: .now() + hold + gap) {
            guard stamp == generation, phase == "open" else { return }
            beatIndex += 1
            playOpenBeat()
        }
    }

    private func tryEnterPrompt() {
        guard phase == "open", openBeatsDone, openVoiceDone else { return }
        caption = ""
        if JourneyProgress.hasEpilogueReply(JourneyStore.shared.snapshot) {
            ordinal = JourneyStore.shared.snapshot.epilogueOrdinal
            reply = ""
            bloomLights()
            return
        }
        phase = "prompt"
    }

    private func playSkipBeat() {
        guard beatIndex < skipBeats.count else {
            caption = ""
            skipBeatsDone = true
            tryEnterLights()
            return
        }
        let beat = skipBeats[beatIndex]
        caption = beat.text
        let hold = max(0.9, min(2.8, Double(beat.text.count) * 0.055))
        let gap = Double(beat.gapAfterMs) / 1000
        let stamp = generation
        DispatchQueue.main.asyncAfter(deadline: .now() + hold + gap) {
            guard stamp == generation, phase == "skip" else { return }
            beatIndex += 1
            playSkipBeat()
        }
    }

    private func tryEnterLights() {
        guard phase == "skip", skipBeatsDone, skipVoiceDone else { return }
        bloomLights()
    }

    private func submit(skipped: Bool) async {
        if busy || phase != "prompt" { return }
        if !skipped {
            let check = ReplyFilter.validate(reply)
            if !check.ok {
                error = check.message
                return
            }
            reply = check.text
        } else {
            reply = ""
        }
        busy = true
        error = ""
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        let result = await ReplyService.submit(
            text: reply,
            skipped: skipped,
            shipId: SettingsStore.shared.shipSkinId
        )
        ordinal = result
        JourneyStore.shared.markEpilogueReply(ordinal: result)
        busy = false
        if skipped {
            caption = ""
            phase = "skipHold"
            skipVoiceDone = false
            skipBeatsDone = false
            beatIndex = 0
            let stamp = generation
            DispatchQueue.main.asyncAfter(deadline: .now() + darkHold) {
                guard stamp == generation, phase == "skipHold" else { return }
                phase = "skip"
                VoicePlayer.shared.playEpilogueSkip {
                    DispatchQueue.main.async {
                        skipVoiceDone = true
                        tryEnterLights()
                    }
                }
                playSkipBeat()
            }
        } else {
            bloomLights()
        }
    }

    private func bloomLights() {
        caption = ""
        lightsAt = Date()
        lights = (0..<48).map { _ in
            EpilogueLight(
                x: CGFloat.random(in: 0.12...0.88),
                y: CGFloat.random(in: 0.12...0.78),
                r: CGFloat.random(in: 0.75...1.8),
                delay: Double.random(in: 0.4...2.6)
            )
        }
        phase = "lights"
        let stamp = generation
        DispatchQueue.main.asyncAfter(deadline: .now() + 4.2) {
            guard stamp == generation else { return }
            phase = "counter"
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.8) {
                guard stamp == generation else { return }
                phase = "footer"
                DispatchQueue.main.asyncAfter(deadline: .now() + 3.6) {
                    guard stamp == generation, phase == "footer" else { return }
                    leaveFooter()
                }
            }
        }
    }

    private func leaveFooter() {
        if JourneyProgress.hasSeenArcUnlock(JourneyStore.shared.snapshot) {
            onDone()
        } else {
            caption = ""
            phase = "arcUnlock"
        }
    }

    private func openFollow() {
        if let url = URL(string: GeneratedJourneyData.epilogueInstagramUrl) {
            UIApplication.shared.open(url)
        }
    }
}

private struct EpilogueLight {
    var x: CGFloat
    var y: CGFloat
    var r: CGFloat
    var delay: Double
}

private enum EpilogueStarPaint {
    private static let sparkleMs: Double = 0.5
    private static var glow: Color { BrandColors.signal }

    static func drawSky(_ context: inout GraphicsContext, cx: CGFloat, cy: CGFloat, r: CGFloat, alpha: Double) {
        let s = r * 1.12
        let haloR = s * 2.05
        let glowR = max(0.55 as CGFloat, s * 0.48)
        let coreR = max(0.35 as CGFloat, s * 0.26)
        fillHalo(&context, cx: cx, cy: cy, radius: haloR, alpha: alpha, inner: 0.42)
        if s >= 1.15 {
            strokeSpikes(&context, cx: cx, cy: cy, arm: s * 3.05, width: max(0.45 as CGFloat, s * 0.24), alpha: alpha * 0.7)
        }
        context.opacity = alpha * 0.92
        context.fill(Path(ellipseIn: disc(cx, cy, glowR)), with: .color(glow))
        context.opacity = alpha
        context.fill(Path(ellipseIn: disc(cx, cy, coreR)), with: .color(.white))
    }

    static func drawYour(_ context: inout GraphicsContext, cx: CGFloat, cy: CGFloat, alpha: Double, age: Double) {
        let sparkleT = max(0, min(1, age / sparkleMs))
        let burst = CGFloat(1 - sparkleT)
        let r: CGFloat = 2.8
        let haloR = r * 4.4 + burst * r * 2.4
        fillHalo(&context, cx: cx, cy: cy, radius: haloR, alpha: alpha, inner: 0.55)
        let arm = r * 4.2 + burst * r * 3.2
        strokeSpikes(&context, cx: cx, cy: cy, arm: arm, width: 0.9 + burst * 0.7, alpha: alpha * Double(0.82 + burst * 0.12))
        if burst > 0.02 {
            var rotated = context
            rotated.translateBy(x: cx, y: cy)
            rotated.rotate(by: .degrees(45))
            strokeSpikes(&rotated, cx: 0, cy: 0, arm: arm * 0.62, width: 0.55 + burst * 0.4, alpha: alpha * Double(burst) * 0.75)
            context.opacity = alpha * Double(burst) * 0.9
            context.fill(sparklePath(cx: cx, cy: cy, r: r * 2.2 + burst * r * 2.8, innerRatio: 0.32), with: .color(glow))
        }
        context.opacity = alpha
        context.fill(sparklePath(cx: cx, cy: cy, r: r * 1.55, innerRatio: 0.4), with: .color(glow))
        context.fill(Path(ellipseIn: disc(cx, cy, r * 0.38)), with: .color(.white))
    }

    private static func fillHalo(
        _ context: inout GraphicsContext,
        cx: CGFloat,
        cy: CGFloat,
        radius: CGFloat,
        alpha: Double,
        inner: Double
    ) {
        let rect = disc(cx, cy, radius)
        context.opacity = 1
        context.fill(
            Path(ellipseIn: rect),
            with: .radialGradient(
                Gradient(stops: [
                    .init(color: glow.opacity(inner * alpha), location: 0),
                    .init(color: glow.opacity(0.12 * alpha), location: 0.42),
                    .init(color: Color.clear, location: 1)
                ]),
                center: CGPoint(x: cx, y: cy),
                startRadius: 0,
                endRadius: radius
            )
        )
    }

    private static func strokeSpikes(
        _ context: inout GraphicsContext,
        cx: CGFloat,
        cy: CGFloat,
        arm: CGFloat,
        width: CGFloat,
        alpha: Double
    ) {
        var path = Path()
        path.move(to: CGPoint(x: cx - arm, y: cy))
        path.addLine(to: CGPoint(x: cx + arm, y: cy))
        path.move(to: CGPoint(x: cx, y: cy - arm))
        path.addLine(to: CGPoint(x: cx, y: cy + arm))
        context.opacity = alpha
        context.stroke(path, with: .color(glow), style: StrokeStyle(lineWidth: width, lineCap: .round))
    }

    private static func sparklePath(cx: CGFloat, cy: CGFloat, r: CGFloat, innerRatio: CGFloat = 0.22) -> Path {
        var path = Path()
        let inner = r * innerRatio
        for i in 0..<8 {
            let angle = CGFloat(i) * .pi / 4 - .pi / 2
            let radius = i % 2 == 0 ? r : inner
            let point = CGPoint(x: cx + cos(angle) * radius, y: cy + sin(angle) * radius)
            if i == 0 {
                path.move(to: point)
            } else {
                path.addLine(to: point)
            }
        }
        path.closeSubpath()
        return path
    }

    private static func disc(_ cx: CGFloat, _ cy: CGFloat, _ r: CGFloat) -> CGRect {
        CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)
    }
}
