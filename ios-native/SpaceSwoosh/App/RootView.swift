// RootView.swift
// Changes: Slice E — unlock Journey/Lab, lore, map, logbook, voice option.

import SwiftUI

enum ShellScreen {
    case menu
    case modeSelect
    case options
    case lore
    case journeyMap
    case logbook
    case play
}

struct RootView: View {
    @ObservedObject private var settings = SettingsStore.shared
    @ObservedObject private var journey = JourneyStore.shared
    @State private var screen: ShellScreen = .menu
    @State private var launch: PlayLaunch = .openSpace
    @State private var menuFlavor = CopyBank.pick(.menu)
    @State private var journeyBlurb = CopyBank.pick(.modeJourney)
    @State private var openBlurb = CopyBank.pick(.modeOpenWorld)

    var body: some View {
        ZStack {
            BrandColors.paper.ignoresSafeArea()

            switch screen {
            case .menu:
                menu
            case .modeSelect:
                modeSelect
            case .options:
                options
            case .lore:
                LoreView(
                    onBack: { screen = .modeSelect },
                    onContinue: { screen = .journeyMap }
                )
            case .journeyMap:
                JourneyMapView(
                    onBack: { screen = .modeSelect },
                    onLogbook: { screen = .logbook },
                    onPlay: { next in
                        launch = next
                        screen = .play
                    }
                )
            case .logbook:
                LogbookView(onBack: { screen = .journeyMap })
            case .play:
                PlayContainerView(
                    launch: launch,
                    onMenu: {
                        screen = .modeSelect
                        menuFlavor = CopyBank.pick(.menu)
                    },
                    onMap: { screen = .journeyMap }
                )
                .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: screen)
        .animation(.easeInOut(duration: 0.2), value: settings.isDark)
    }

    private var menu: some View {
        VStack(spacing: 22) {
            Spacer()
            Text("SPACE SWOOSH")
                .font(.system(size: 34, weight: .bold))
                .foregroundStyle(BrandColors.ink)
                .tracking(2)
            Text(menuFlavor)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(BrandColors.ink55)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 36)
            Text("Flicker · Slice E")
                .font(.system(size: 11, weight: .medium, design: .monospaced))
                .foregroundStyle(BrandColors.ink80)
            Spacer()
            ShellChrome.inkButton("PLAY") {
                journeyBlurb = CopyBank.pick(.modeJourney)
                openBlurb = CopyBank.pick(.modeOpenWorld)
                screen = .modeSelect
            }
            ShellChrome.ghostButton("OPTIONS") { screen = .options }
                .padding(.bottom, 36)
        }
    }

    private var modeSelect: some View {
        VStack(alignment: .leading, spacing: 16) {
            ShellChrome.header("SELECT", back: { screen = .menu })
            modeCard(
                title: "OPEN SPACE",
                blurb: openBlurb,
                locked: false,
                footer: pbLine
            ) {
                launch = .openSpace
                screen = .play
            }
            modeCard(
                title: "JOURNEY",
                blurb: journeyBlurb,
                locked: false,
                footer: journeyFooter
            ) {
                screen = journey.snapshot.loreSeen ? .journeyMap : .lore
            }
            modeCard(
                title: "HAZARD LAB",
                blurb: "Practice the rare set-pieces.",
                locked: false,
                footer: "Always unlocked · nothing counts"
            ) {
                launch = .hazardLab
                screen = .play
            }
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }

    private var pbLine: String {
        let zig = OpenWorldProgress.best(for: .zigzag)
        let arc = OpenWorldProgress.best(for: .arc)
        var parts: [String] = []
        if zig > 0 { parts.append("Zigzag \(zig) KM") }
        if arc > 0 { parts.append("Arc \(arc) KM") }
        return parts.isEmpty ? "No personal best yet" : parts.joined(separator: "  ·  ")
    }

    private var journeyFooter: String {
        let stars = JourneyProgress.totalStars(journey.snapshot)
        let next = JourneyProgress.nextPlayable(journey.snapshot)
        return "\(stars) / \(JourneyConfig.totalStars)  ·  Level \(next)"
    }

    private var options: some View {
        VStack(alignment: .leading, spacing: 14) {
            ShellChrome.header("OPTIONS", back: { screen = .menu })
            Text("Vessel. Controls. Signal.")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(BrandColors.ink55)
            ShellChrome.inkButton(settings.flightStyle == .zigzag ? "FLIGHT  ZIGZAG" : "FLIGHT  ARC") {
                settings.setFlightStyle(settings.flightStyle == .zigzag ? .arc : .zigzag)
            }
            ShellChrome.inkButton(settings.muted ? "SOUND  OFF" : "SOUND  ON") {
                settings.toggleMute()
            }
            ShellChrome.inkButton(settings.voiceEnabled ? "VOICE  ON" : "VOICE  OFF") {
                settings.toggleVoice()
            }
            ShellChrome.inkButton(settings.isDark ? "THEME  NIGHT" : "THEME  PAPER") {
                settings.toggleTheme()
            }
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }

    private func modeCard(
        title: String,
        blurb: String,
        locked: Bool,
        footer: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(title)
                        .font(.system(size: 16, weight: .bold, design: .monospaced))
                    Spacer()
                    if locked {
                        Text("LOCKED")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                    }
                }
                Text(blurb)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(BrandColors.ink55)
                    .multilineTextAlignment(.leading)
                Text(footer)
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundStyle(BrandColors.ink80)
            }
            .foregroundStyle(BrandColors.ink)
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(BrandColors.paperTint)
            .opacity(locked ? 0.55 : 1)
        }
        .disabled(locked)
    }
}
