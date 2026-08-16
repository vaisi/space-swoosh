// RootView.swift
// Changes: Home ship tag uses equipped roster name (full 41 hangar).

import SwiftUI

enum ShellScreen {
    case menu
    case modeSelect
    case options
    case shipPicker
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
            case .shipPicker:
                ShipPickerView(onBack: { screen = .options })
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
        VStack(spacing: 18) {
            Spacer()
            Text("SPACE SWOOSH")
                .font(.system(size: 38, weight: .bold))
                .foregroundStyle(BrandColors.ink)
                .tracking(2.4)
            Text(menuFlavor)
                .font(.system(size: 15, weight: .medium))
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
                ShellChrome.brandButton("Options", tag: "⚙") { screen = .options }
            }
            .padding(.horizontal, 24)
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

    private var shipTag: String {
        let name = SkinCatalog.def(settings.shipSkinId).name
        return String(name.prefix(3)).uppercased()
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
                .frame(maxWidth: .infinity)
            ShellChrome.brandButton("Ship", tag: shipTag) {
                screen = .shipPicker
            }
            ShellChrome.brandButton(
                "Flight",
                tag: settings.flightStyle == .zigzag ? "ZIG" : "ARC"
            ) {
                settings.setFlightStyle(settings.flightStyle == .zigzag ? .arc : .zigzag)
            }
            ShellChrome.brandButton("Sound", tag: settings.muted ? "OFF" : "ON") {
                settings.toggleMute()
            }
            ShellChrome.brandButton("Voice", tag: settings.voiceEnabled ? "ON" : "OFF") {
                settings.toggleVoice()
            }
            ShellChrome.brandButton("Theme", tag: settings.isDark ? "NIGHT" : "PAPER") {
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
            ShellChrome.framedTile {
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
            }
            .opacity(locked ? 0.55 : 1)
        }
        .buttonStyle(.plain)
        .disabled(locked)
    }
}
