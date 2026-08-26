// RootView.swift
// Changes: PLAY Journey / Open Space cards use Android cardH (unit×17) and
// sit vertically centered between the header and footnote.

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
    @ObservedObject private var entitlements = EntitlementsStore.shared
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
                    onMap: { screen = .journeyMap },
                    onUnlockArc: {
                        journey.markArcUnlockSeen()
                        settings.setFlightStyle(.arc)
                        screen = .optionsControls
                    }
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
        GeometryReader { full in
            let unit = GameConfig.Playfield.baseUnit(width: full.size.width, height: full.size.height)
            VStack(alignment: .leading, spacing: 0) {
                ShellChrome.header("PLAY", back: { screen = .menu })
                GeometryReader { geo in
                    let gap = unit * 2.2
                    let cardH = min(unit * 17, max(0, geo.size.height - gap) / 2)
                    VStack(spacing: gap) {
                        modeCard(
                            title: "Journey",
                            blurb: journeyBlurb,
                            tag: "RECOMMENDED",
                            signal: true,
                            footer: journeyFooter,
                            height: cardH
                        ) {
                            screen = journey.snapshot.loreSeen ? .journeyMap : .lore
                        }
                        modeCard(
                            title: "Open Space",
                            blurb: openBlurb,
                            tag: "ENDLESS",
                            signal: false,
                            footer: pbLine,
                            height: cardH
                        ) {
                            launch = .openSpace
                            screen = .play
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                }
                ShellChrome.footnote("SAME SHIP. SAME CONTROLS.")
                    .frame(maxWidth: .infinity)
                    .padding(.bottom, 20)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .frame(width: full.size.width, height: full.size.height)
        }
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
            ShellChrome.brandButton("Restore Purchases", tag: "↻") {
                Task { await entitlements.restore() }
            }
            if let status = entitlements.statusMessage {
                Text(status.uppercased())
                    .font(BrandType.mono(11))
                    .foregroundStyle(BrandColors.signal)
                    .frame(maxWidth: .infinity)
            }
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }

    private var optionsControls: some View {
        let arcUnlocked = JourneyProgress.isArcUnlocked(journey.snapshot)
        let zigzag = !arcUnlocked || settings.flightStyle == .zigzag
        return VStack(alignment: .leading, spacing: 12) {
            ShellChrome.header("CONTROLS", back: { screen = .options })
            ShellChrome.screenBlurb("How the ship steers.")
            ShellChrome.brandButton(
                "Zigzag",
                tag: zigzag ? "ON" : nil,
                primary: zigzag
            ) {
                settings.setFlightStyle(.zigzag)
            }
            ShellChrome.footnote("TAP OR SPACE · STRAIGHT ±52°")
            ShellChrome.brandButton(
                "Arc",
                tag: arcUnlocked ? (zigzag ? nil : "ON") : "OUT",
                primary: arcUnlocked && !zigzag,
                disabled: !arcUnlocked
            ) {
                settings.setFlightStyle(.arc)
            }
            ShellChrome.footnote(arcUnlocked ? "CLASSIC SWOOSH ARCS" : "FINISH THE JOURNEY")
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
        height: CGFloat,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            ShellChrome.framedTile(signal: signal, fillHeight: true) {
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
                    Spacer(minLength: 0)
                    if let footer {
                        Text(footer.uppercased())
                            .font(BrandType.label(10))
                            .tracking(BrandType.labelTracking(10))
                            .foregroundStyle(BrandColors.ink.opacity(0.30))
                    }
                }
                .foregroundStyle(BrandColors.ink)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: height)
        .buttonStyle(.plain)
    }
}
