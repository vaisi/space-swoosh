// RootView.swift
// Changes: Slice D — mode select (Journey/Lab locked), options, theme, flight style.

import SwiftUI

enum ShellScreen {
    case menu
    case modeSelect
    case options
    case play
}

struct RootView: View {
    @ObservedObject private var settings = SettingsStore.shared
    @State private var screen: ShellScreen = .menu
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
            case .play:
                PlayContainerView(onExit: {
                    screen = .modeSelect
                    menuFlavor = CopyBank.pick(.menu)
                })
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
            Text("Flicker · Open Space")
                .font(.system(size: 11, weight: .medium, design: .monospaced))
                .foregroundStyle(BrandColors.ink80)
            Spacer()
            inkButton("PLAY") {
                journeyBlurb = CopyBank.pick(.modeJourney)
                openBlurb = CopyBank.pick(.modeOpenWorld)
                screen = .modeSelect
            }
            ghostButton("OPTIONS") { screen = .options }
                .padding(.bottom, 36)
        }
    }

    private var modeSelect: some View {
        VStack(alignment: .leading, spacing: 16) {
            header("SELECT", back: { screen = .menu })
            modeCard(
                title: "OPEN SPACE",
                blurb: openBlurb,
                locked: false,
                footer: pbLine
            ) {
                screen = .play
            }
            modeCard(title: "JOURNEY", blurb: journeyBlurb, locked: true, footer: "Coming with Slice E") {}
            modeCard(title: "HAZARD LAB", blurb: "Practice the rare set-pieces.", locked: true, footer: "Coming with Slice E") {}
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

    private var options: some View {
        VStack(alignment: .leading, spacing: 14) {
            header("OPTIONS", back: { screen = .menu })
            Text("Vessel. Controls. Signal.")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(BrandColors.ink55)
            inkButton(settings.flightStyle == .zigzag ? "FLIGHT  ZIGZAG" : "FLIGHT  ARC") {
                settings.setFlightStyle(settings.flightStyle == .zigzag ? .arc : .zigzag)
            }
            inkButton(settings.muted ? "SOUND  OFF" : "SOUND  ON") {
                settings.toggleMute()
            }
            inkButton(settings.isDark ? "THEME  NIGHT" : "THEME  PAPER") {
                settings.toggleTheme()
            }
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }

    private func header(_ title: String, back: @escaping () -> Void) -> some View {
        HStack {
            Button(action: back) {
                Text("BACK")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundStyle(BrandColors.ink)
            }
            Spacer()
            Text(title)
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .foregroundStyle(BrandColors.ink)
        }
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

    private func inkButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .foregroundStyle(BrandColors.paper)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(BrandColors.signal)
        }
        .padding(.horizontal, 16)
    }

    private func ghostButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundStyle(BrandColors.ink)
        }
    }
}
