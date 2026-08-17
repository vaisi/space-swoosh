// RootView.swift
// Changes: Android menu map — 4 home buttons, nested Options, PLAY cards, SPACE BOARD.

import SwiftUI

enum ShellScreen {
    case menu
    case modeSelect
    case options
    case optionsControls
    case optionsSound
    case shipPicker
    case highScores
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
    @State private var logbookReturn: ShellScreen = .menu
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
            case .optionsControls:
                optionsControls
            case .optionsSound:
                optionsSound
            case .shipPicker:
                ShipPickerView(onBack: { screen = .options })
            case .highScores:
                HighScoresView(onBack: { screen = .menu })
            case .lore:
                LoreView(
                    onBack: { screen = .modeSelect },
                    onContinue: { screen = .journeyMap }
                )
            case .journeyMap:
                JourneyMapView(
                    onBack: { screen = .modeSelect },
                    onLogbook: {
                        logbookReturn = .journeyMap
                        screen = .logbook
                    },
                    onPlay: { next in
                        launch = next
                        screen = .play
                    }
                )
            case .logbook:
                LogbookView(onBack: { screen = logbookReturn })
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
        VStack(spacing: 14) {
            Spacer()
            Text("SPACE SWOOSH")
                .font(BrandType.display(38))
                .tracking(BrandType.displayTracking(38))
                .foregroundStyle(BrandColors.ink)
            Text(menuFlavor)
                .font(BrandType.body(15))
                .foregroundStyle(BrandColors.ink55)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 36)
            ShipPreview()
                .padding(.top, 8)
            Spacer()
            VStack(spacing: 12) {
                ShellChrome.brandButton("Play", tag: "▶", primary: true) {
                    journeyBlurb = CopyBank.pick(.modeJourney)
                    openBlurb = CopyBank.pick(.modeOpenWorld)
                    screen = .modeSelect
                }
                ShellChrome.brandButton("Space Log", tag: "□") {
                    logbookReturn = .menu
                    screen = .logbook
                }
                ShellChrome.brandButton("Options", tag: "⚙") { screen = .options }
                ShellChrome.brandButton("High Scores", tag: "#") { screen = .highScores }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 28)
        }
    }

    private var modeSelect: some View {
        VStack(alignment: .leading, spacing: 16) {
            ShellChrome.header("PLAY", back: { screen = .menu })
            modeCard(
                title: "Journey",
                blurb: journeyBlurb,
                tag: "RECOMMENDED",
                signal: true,
                footer: journeyFooter
            ) {
                screen = journey.snapshot.loreSeen ? .journeyMap : .lore
            }
            modeCard(
                title: "Open Space",
                blurb: openBlurb,
                tag: "ENDLESS",
                signal: false,
                footer: pbLine
            ) {
                launch = .openSpace
                screen = .play
            }
            Spacer()
            ShellChrome.footnote("SAME SHIP. SAME CONTROLS.")
                .padding(.bottom, 20)
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }

    private var options: some View {
        VStack(alignment: .leading, spacing: 12) {
            ShellChrome.header("OPTIONS", back: { screen = .menu })
            ShellChrome.screenBlurb("Vessel. Controls. Signal.")
            ShellChrome.brandButton("Ship", tag: "●") { screen = .shipPicker }
            ShellChrome.brandButton("Controls", tag: "↔") { screen = .optionsControls }
            ShellChrome.brandButton("Sound", tag: "♪") { screen = .optionsSound }
            ShellChrome.brandButton(
                settings.isDark ? "Dark Mode" : "Light Mode",
                tag: "◐"
            ) {
                settings.toggleTheme()
            }
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }

    private var optionsControls: some View {
        VStack(alignment: .leading, spacing: 12) {
            ShellChrome.header("CONTROLS", back: { screen = .options })
            ShellChrome.screenBlurb("How the ship steers.")
            ShellChrome.brandButton(
                "Zigzag",
                tag: settings.flightStyle == .zigzag ? "ON" : nil,
                primary: settings.flightStyle == .zigzag
            ) {
                settings.setFlightStyle(.zigzag)
            }
            ShellChrome.footnote("TAP OR SPACE · STRAIGHT ±52°")
            ShellChrome.brandButton(
                "Arc",
                tag: settings.flightStyle == .arc ? "ON" : nil,
                primary: settings.flightStyle == .arc
            ) {
                settings.setFlightStyle(.arc)
            }
            ShellChrome.footnote("CLASSIC SWOOSH ARCS")
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }

    private var optionsSound: some View {
        VStack(alignment: .leading, spacing: 12) {
            ShellChrome.header("SOUND", back: { screen = .options })
            ShellChrome.screenBlurb("Isolate each channel.")
            ShellChrome.brandButton(
                "Music",
                tag: settings.musicEnabled ? "ON" : "OFF",
                primary: settings.musicEnabled
            ) {
                settings.toggleMusic()
            }
            ShellChrome.brandButton(
                "Sound FX",
                tag: settings.sfxEnabled ? "ON" : "OFF",
                primary: settings.sfxEnabled
            ) {
                settings.toggleSfx()
            }
            ShellChrome.brandButton(
                "Voice",
                tag: settings.voiceEnabled ? "ON" : "OFF",
                primary: settings.voiceEnabled
            ) {
                settings.toggleVoice()
            }
            ShellChrome.footnote("SAVED AUTOMATICALLY")
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }

    private var pbLine: String? {
        let zig = OpenWorldProgress.best(for: .zigzag)
        let arc = OpenWorldProgress.best(for: .arc)
        if zig > 0, arc > 0 { return "Zigzag: \(zig) KM · Arc: \(arc) KM" }
        if zig > 0 { return "Personal best: \(zig) KM" }
        if arc > 0 { return "Personal best: \(arc) KM" }
        return nil
    }

    private var journeyFooter: String {
        let stars = JourneyProgress.totalStars(journey.snapshot)
        let next = JourneyProgress.nextPlayable(journey.snapshot)
        return "LEVEL \(next)  ·  \(stars) / \(JourneyConfig.totalStars) STARS"
    }

    private func modeCard(
        title: String,
        blurb: String,
        tag: String,
        signal: Bool,
        footer: String?,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            ShellChrome.framedTile(signal: signal) {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(title.uppercased())
                            .font(BrandType.ui(16))
                            .tracking(BrandType.uiTracking(16))
                        Spacer()
                        Text(tag)
                            .font(BrandType.label(10))
                            .tracking(BrandType.labelTracking(10))
                            .foregroundStyle(signal ? BrandColors.signal : BrandColors.ink55)
                    }
                    Text(blurb)
                        .font(BrandType.body(14))
                        .foregroundStyle(BrandColors.ink55)
                        .multilineTextAlignment(.leading)
                    if let footer {
                        Text(footer.uppercased())
                            .font(BrandType.label(10))
                            .tracking(BrandType.labelTracking(10))
                            .foregroundStyle(BrandColors.ink.opacity(0.30))
                    }
                }
                .foregroundStyle(BrandColors.ink)
            }
        }
        .buttonStyle(.plain)
    }
}
