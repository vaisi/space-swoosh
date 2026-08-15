// PlayContainerView.swift
// Changes: Xcode 26 onChange(old,new); HUD chip stagger.

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
                        HStack {
                            Button {
                                paused = true
                                scene.isPaused = true
                            } label: {
                                Text("PAUSE")
                                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                                    .foregroundStyle(BrandColors.ink)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(BrandColors.paperTint.opacity(0.92))
                            }
                            .opacity(Double(session.hudPause))
                            .disabled(session.isOver || session.hudPause < 0.02)
                            .allowsHitTesting(session.hudPause >= 0.02)
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                if session.goalKm > 0 {
                                    Text("\(session.scoreKm) / \(session.goalKm) KM")
                                        .font(.system(size: 16, weight: .bold, design: .monospaced))
                                } else {
                                    Text("\(session.scoreKm) KM")
                                        .font(.system(size: 16, weight: .bold, design: .monospaced))
                                }
                                if session.hudPoints > 0.02 {
                                    Text("\(session.points) PTS")
                                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                                        .opacity(Double(session.hudPoints))
                                }
                                if session.hudSmash > 0.02 {
                                    Text(session.shieldActive ? "SHIELD" : "\(session.destroyed) SMASH")
                                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                                        .opacity(Double(session.hudSmash))
                                }
                            }
                            .foregroundStyle(BrandColors.ink)
                            .opacity(Double(session.hudDistance))
                        }
                        .padding(.horizontal, 12)
                        .padding(.top, 8)
                    }

                    if session.fuelLive {
                        FuelBar(fuel: session.fuel, low: session.fuelLow)
                            .padding(.horizontal, 12)
                            .opacity(Double(session.hudDistance))
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
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .onAppear {
                UIApplication.shared.isIdleTimerDisabled = true
                scene.scaleMode = .resizeFill
                scene.size = geo.size
                scene.pacingMonitor = pacing
                scene.session = session
                SfxPlayer.shared.muted = settings.muted
                MusicPlayer.shared.muted = settings.muted
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
            .onChange(of: geo.size) { _, newSize in
                scene.size = newSize
            }
        }
        .ignoresSafeArea()
    }

    private var pauseOverlay: some View {
        VStack(spacing: 16) {
            Text("PAUSED")
                .font(.system(size: 22, weight: .bold, design: .monospaced))
            Button {
                paused = false
                scene.isPaused = false
            } label: {
                menuButton("RESUME")
            }
            Button {
                settings.toggleMute()
            } label: {
                menuButton(settings.muted ? "SOUND OFF" : "SOUND ON")
            }
            Button {
                settings.toggleVoice()
            } label: {
                menuButton(settings.voiceEnabled ? "VOICE ON" : "VOICE OFF")
            }
            Button(action: leaveToMapOrMenu) {
                menuButton("EXIT")
            }
        }
        .foregroundStyle(BrandColors.ink)
        .padding(28)
        .frame(maxWidth: 320)
        .background(BrandColors.paperTint.opacity(0.96))
    }

    private var gameOverCard: some View {
        VStack(spacing: 14) {
            Text(session.failTitle)
                .font(.system(size: 22, weight: .bold, design: .default))
            Text(session.failDetail)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(BrandColors.ink55)
                .multilineTextAlignment(.center)
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("\(session.scoreKm)")
                    .font(.system(size: 34, weight: .bold, design: .monospaced))
                Text("KM")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundStyle(BrandColors.ink55)
            }
            if session.isNewBest {
                Text("NEW BEST  \(session.personalBest) KM")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundStyle(BrandColors.signal)
            } else if session.personalBest > 0 {
                Text("BEST  \(session.personalBest) KM")
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .foregroundStyle(BrandColors.ink55)
            }
            HStack(spacing: 28) {
                statColumn(value: "\(session.destroyed)", label: "DESTROYED")
                statColumn(value: "\(session.sparkles)", label: "SPARKLES")
            }
            Button {
                replay(currentLaunch)
            } label: {
                Text("PLAY AGAIN")
                    .font(.system(size: 16, weight: .bold, design: .monospaced))
                    .foregroundStyle(BrandColors.paper)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(BrandColors.signal)
            }
            .padding(.horizontal, 8)
            Button(action: onMenu) {
                Text("MENU")
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .foregroundStyle(BrandColors.ink)
            }
        }
        .foregroundStyle(BrandColors.ink)
        .padding(28)
        .frame(maxWidth: 320)
        .background(BrandColors.paperTint.opacity(0.96))
    }

    private func levelOutcomeCard(_ outcome: LevelOutcome) -> some View {
        VStack(spacing: 12) {
            Text(outcome.title)
                .font(.system(size: 20, weight: .bold, design: .monospaced))
            Text(outcome.flavor)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(BrandColors.ink55)
                .multilineTextAlignment(.center)
            ForEach(0..<outcome.starSlots, id: \.self) { i in
                HStack {
                    Circle()
                        .stroke(BrandColors.signal, lineWidth: 1.2)
                        .background(Circle().fill(outcome.stars[i] ? BrandColors.signal : Color.clear))
                        .frame(width: 10, height: 10)
                    Text(outcome.labels[i].uppercased())
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                    Spacer()
                    if i < outcome.values.count {
                        Text(outcome.values[i])
                            .font(.system(size: 12, weight: .medium, design: .monospaced))
                    }
                    if i < outcome.newStars.count, outcome.newStars[i] {
                        Text("NEW")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundStyle(BrandColors.signal)
                    }
                }
                .foregroundStyle(outcome.stars[i] ? BrandColors.ink : BrandColors.ink80)
            }
            if outcome.completed, case .journey(let level) = outcome.launch, level < JourneyConfig.totalLevels {
                Button { replay(.journey(level + 1)) } label: { menuButton("NEXT LEVEL") }
            }
            Button { replay(outcome.launch) } label: { menuButton(outcome.completed ? "REPLAY" : "RETRY") }
            Button(action: onMap) { menuButton("LEVEL SELECT") }
            Button(action: onMenu) {
                Text("MENU")
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .foregroundStyle(BrandColors.ink)
            }
        }
        .foregroundStyle(BrandColors.ink)
        .padding(24)
        .frame(maxWidth: 340)
        .background(BrandColors.paperTint.opacity(0.96))
    }

    private func replay(_ launch: PlayLaunch) {
        currentLaunch = launch
        paused = false
        scene.isPaused = false
        scene.startRun(launch)
    }

    private func leaveToMapOrMenu() {
        if currentLaunch.isLevelRun {
            onMap()
        } else {
            onMenu()
        }
    }

    private func statColumn(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .monospaced))
            Text(label)
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(BrandColors.ink55)
        }
    }

    private func menuButton(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 16, weight: .bold, design: .monospaced))
            .foregroundStyle(BrandColors.paper)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(BrandColors.signal)
    }
}

struct FuelBar: View {
    var fuel: CGFloat
    var low: Bool

    var body: some View {
        GeometryReader { geo in
            let frac = max(0, min(1, fuel))
            ZStack(alignment: .leading) {
                Capsule().fill(BrandColors.paperDeep)
                Capsule()
                    .fill(BrandColors.signal.opacity(low ? 0.55 : 1))
                    .frame(width: geo.size.width * frac)
            }
        }
        .frame(height: 6)
        .opacity(low ? 0.7 : 1)
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
