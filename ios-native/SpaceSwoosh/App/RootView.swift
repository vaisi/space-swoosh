// RootView.swift
// Changes: menu headphones hint (signal-blue mark + HEADPHONES RECOMMENDED)
// sits 56pt below the safe area and does not move the title or buttons.
// home menu is title, tagline, and the four buttons. No idle ship.
// Dark mode lays Android's drifting depth field under every shell
// screen (menu, Journey map, log). Light Mode stays flat paper. Home shows
// the equipped hull idling. Open Space and Journey days open the Hangar;
// crash retry and Hazard Lab stay direct.

import SwiftUI

enum ShellScreen {
    case menu
    case modeSelect
    case options
    case optionsControls
    case optionsSound
    case shipPicker
    case hangar
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
    @State private var hpHintShown = false
    @State private var hpHintToken = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            NightPaperGround()

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
            case .hangar:
                HangarView(
                    launch: launch,
                    onBack: {
                        if case .journey = launch {
                            screen = .journeyMap
                        } else {
                            screen = .modeSelect
                        }
                    },
                    onLaunch: { next in
                        launch = next
                        screen = .play
                    }
                )
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
                        if case .hazardLab = next {
                            screen = .play
                        } else {
                            screen = .hangar
                        }
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
                    onNextDay: { next in
                        launch = next
                        screen = .hangar
                    },
                    onUnlockArc: {
                        journey.markArcUnlockSeen()
                        settings.setFlightStyle(.arc)
                        screen = .optionsControls
                    }
                )
                .transition(.opacity)
            }

            MenuHeadphonesHint(shown: hpHintShown)
                .padding(.top, 56)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .allowsHitTesting(false)
        }
        .onAppear {
            HangarCatalog.ensureSeenSeed()
            scheduleHeadphonesHint()
        }
        .onChange(of: screen) { _, _ in
            scheduleHeadphonesHint()
        }
        .animation(.easeInOut(duration: 0.2), value: screen)
        .animation(.easeInOut(duration: 0.2), value: settings.isDark)
    }

    private func scheduleHeadphonesHint() {
        hpHintToken += 1
        let token = hpHintToken
        if screen != .menu {
            if reduceMotion {
                hpHintShown = false
            } else {
                withAnimation(.easeInOut(duration: 0.3)) { hpHintShown = false }
            }
            return
        }
        hpHintShown = false
        Task { @MainActor in
            if !reduceMotion {
                try? await Task.sleep(for: .milliseconds(400))
            }
            guard token == hpHintToken, screen == .menu else { return }
            if reduceMotion {
                hpHintShown = true
            } else {
                withAnimation(.easeInOut(duration: 0.4)) { hpHintShown = true }
            }
        }
    }

    private var menu: some View {
        VStack(spacing: 14) {
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
                Spacer()
            }
            .contentShape(Rectangle())
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
                            screen = .hangar
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
            ShellChrome.header(
                "OPTIONS",
                back: { screen = .menu },
                trailingTitle: "Rate",
                trailingTag: "★"
            ) {
                ReviewPromptStore.rateFromOptions()
            }
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

// Menu headphones hint. Same paths as the web SVG. Signal blue, not a
// hardcoded fuel hex. Always shown on the menu.
private struct MenuHeadphonesHint: View {
    var shown: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0, paused: reduceMotion)) { context in
            let phase = context.date.timeIntervalSinceReferenceDate
                .truncatingRemainder(dividingBy: 2.6) / 2.6
            HStack(spacing: 10) {
                HeadphonesMark(phase: phase, reduceMotion: reduceMotion)
                    .frame(width: 30, height: 22)
                Text("HEADPHONES RECOMMENDED")
                    .font(BrandType.body(11))
                    .tracking(11 * 0.14)
                    .foregroundStyle(BrandColors.ink55)
                    .opacity(reduceMotion ? 1 : headphoneTextOpacity(phase))
            }
        }
        .opacity(shown ? 1 : 0)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Headphones recommended for the best experience.")
        .allowsHitTesting(false)
    }
}

private struct HeadphonesMark: View {
    var phase: Double
    var reduceMotion: Bool

    var body: some View {
        let cups = reduceMotion ? 1.0 : headphoneCupsOpacity(phase)
        let inner = reduceMotion ? (1.0, 0.0) : headphoneWave(phase, delay: 0)
        let outer = reduceMotion ? (1.0, 0.0) : headphoneWave(phase, delay: 0.35)
        ZStack(alignment: .topLeading) {
            HeadphonesPathShape(which: .band)
                .stroke(BrandColors.signal, style: headphoneStroke)
                .opacity(cups)
            HeadphonesPathShape(which: .leftCup)
                .fill(BrandColors.signal.opacity(0.18))
                .opacity(cups)
            HeadphonesPathShape(which: .leftCup)
                .stroke(BrandColors.signal, style: headphoneStroke)
                .opacity(cups)
            HeadphonesPathShape(which: .rightCup)
                .fill(BrandColors.signal.opacity(0.18))
                .opacity(cups)
            HeadphonesPathShape(which: .rightCup)
                .stroke(BrandColors.signal, style: headphoneStroke)
                .opacity(cups)
            HeadphonesPathShape(which: .wave)
                .stroke(BrandColors.signal, style: headphoneStroke)
                .opacity(inner.0)
                .offset(x: inner.1)
            HeadphonesPathShape(which: .wave2)
                .stroke(BrandColors.signal, style: headphoneStroke)
                .opacity(outer.0)
                .offset(x: outer.1)
        }
    }

    private var headphoneStroke: StrokeStyle {
        StrokeStyle(lineWidth: 1.4, lineCap: .round, lineJoin: .round)
    }
}

private enum HeadphonePart { case band, leftCup, rightCup, wave, wave2 }

private struct HeadphonesPathShape: Shape {
    var which: HeadphonePart

    func path(in rect: CGRect) -> Path {
        let sx = rect.width / 30
        let sy = rect.height / 22
        var path = Path()
        switch which {
        case .band:
            path.addSVG("M3 14v-3a8 8 0 0 1 16 0v3")
        case .leftCup:
            path.addSVG("M3 14a1.8 1.8 0 0 1 1.8-1.8h1.4v7H4.8A1.8 1.8 0 0 1 3 17.4z")
        case .rightCup:
            path.addSVG("M19 14a1.8 1.8 0 0 0-1.8-1.8h-1.4v7h1.4a1.8 1.8 0 0 0 1.8-1.8z")
        case .wave:
            path.addSVG("M22.5 12.5a3 3 0 0 1 0 5")
        case .wave2:
            path.addSVG("M25.5 10.5a6 6 0 0 1 0 9")
        }
        return path.applying(CGAffineTransform(scaleX: sx, y: sy))
    }
}

private func headphoneEaseInOut(_ x: Double) -> Double {
    x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2
}

private func headphoneEaseOut(_ x: Double) -> Double {
    1 - pow(1 - x, 3)
}

private func headphoneBreath(_ phase: Double) -> Double {
    if phase <= 0.45 {
        return headphoneEaseInOut(phase / 0.45)
    }
    return 1 - headphoneEaseInOut((phase - 0.45) / 0.55)
}

private func headphoneCupsOpacity(_ phase: Double) -> Double {
    0.55 + 0.45 * headphoneBreath(phase)
}

private func headphoneTextOpacity(_ phase: Double) -> Double {
    0.7 + 0.3 * headphoneBreath(phase)
}

private func headphoneWave(_ phase: Double, delay: Double) -> (Double, Double) {
    var p = phase - delay / 2.6
    if p < 0 { p += 1 }
    let x = -2 + 5 * headphoneEaseOut(p)
    let opacity: Double
    if p <= 0.35 {
        opacity = headphoneEaseOut(p / 0.35)
    } else {
        opacity = 1 - headphoneEaseOut((p - 0.35) / 0.65)
    }
    return (opacity, x)
}

private extension Path {
    mutating func addSVG(_ d: String) {
        var i = d.startIndex
        var command: Character = "M"
        var cx: CGFloat = 0
        var cy: CGFloat = 0
        var sx: CGFloat = 0
        var sy: CGFloat = 0

        func skip() {
            while i < d.endIndex, d[i] == " " || d[i] == "," { i = d.index(after: i) }
        }
        func readNumber() -> CGFloat? {
            skip()
            guard i < d.endIndex else { return nil }
            let start = i
            if d[i] == "+" || d[i] == "-" { i = d.index(after: i) }
            var saw = false
            while i < d.endIndex, d[i].isNumber || d[i] == "." {
                saw = true
                i = d.index(after: i)
            }
            guard saw else { return nil }
            return CGFloat(Double(d[start..<i]) ?? 0)
        }

        while i < d.endIndex {
            skip()
            guard i < d.endIndex else { break }
            if d[i].isLetter {
                command = d[i]
                i = d.index(after: i)
            }
            switch command {
            case "M", "m":
                guard let x = readNumber(), let y = readNumber() else { return }
                if command == "m" {
                    cx += x; cy += y
                } else {
                    cx = x; cy = y
                }
                move(to: CGPoint(x: cx, y: cy))
                sx = cx; sy = cy
                command = command == "m" ? "l" : "L"
            case "L", "l":
                guard let x = readNumber(), let y = readNumber() else { return }
                if command == "l" { cx += x; cy += y } else { cx = x; cy = y }
                addLine(to: CGPoint(x: cx, y: cy))
            case "H":
                guard let x = readNumber() else { return }
                cx = x
                addLine(to: CGPoint(x: cx, y: cy))
            case "h":
                guard let x = readNumber() else { return }
                cx += x
                addLine(to: CGPoint(x: cx, y: cy))
            case "V":
                guard let y = readNumber() else { return }
                cy = y
                addLine(to: CGPoint(x: cx, y: cy))
            case "v":
                guard let y = readNumber() else { return }
                cy += y
                addLine(to: CGPoint(x: cx, y: cy))
            case "A", "a":
                guard let rx = readNumber(), let ry = readNumber(),
                      let rot = readNumber(), let large = readNumber(),
                      let sweep = readNumber(), let x = readNumber(),
                      let y = readNumber() else { return }
                let x2 = command == "a" ? cx + x : x
                let y2 = command == "a" ? cy + y : y
                addSVGArc(from: cx, cy, rx: rx, ry: ry, rotation: rot,
                          large: large != 0, sweep: sweep != 0, to: x2, y2)
                cx = x2; cy = y2
            case "Z", "z":
                closeSubpath()
                cx = sx; cy = sy
            default:
                return
            }
        }
    }

    mutating func addSVGArc(from x1: CGFloat, _ y1: CGFloat, rx rxIn: CGFloat, ry ryIn: CGFloat, rotation: CGFloat, large: Bool, sweep: Bool, to x2: CGFloat, y2: CGFloat) {
        if rxIn == 0 || ryIn == 0 {
            addLine(to: CGPoint(x: x2, y: y2))
            return
        }
        let phi = rotation * .pi / 180
        let cosPhi = cos(phi)
        let sinPhi = sin(phi)
        let dx = (x1 - x2) / 2
        let dy = (y1 - y2) / 2
        let x1p = cosPhi * dx + sinPhi * dy
        let y1p = -sinPhi * dx + cosPhi * dy
        var rx = abs(rxIn)
        var ry = abs(ryIn)
        let lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
        if lambda > 1 {
            let scale = sqrt(lambda)
            rx *= scale
            ry *= scale
        }
        let sign: CGFloat = (large == sweep) ? -1 : 1
        let num = max(0, rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p)
        let den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
        let coef = sign * sqrt(den == 0 ? 0 : num / den)
        let cxp = coef * rx * y1p / ry
        let cyp = coef * -ry * x1p / rx
        let cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
        let cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2

        func vectorAngle(_ ux: CGFloat, _ uy: CGFloat, _ vx: CGFloat, _ vy: CGFloat) -> CGFloat {
            let dot = ux * vx + uy * vy
            let len = sqrt(ux * ux + uy * uy) * sqrt(vx * vx + vy * vy)
            guard len > 0 else { return 0 }
            var ang = acos(min(1, max(-1, dot / len)))
            if ux * vy - uy * vx < 0 { ang = -ang }
            return ang
        }

        let theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
        var dTheta = vectorAngle(
            (x1p - cxp) / rx, (y1p - cyp) / ry,
            (-x1p - cxp) / rx, (-y1p - cyp) / ry
        )
        if !sweep && dTheta > 0 { dTheta -= 2 * .pi }
        if sweep && dTheta < 0 { dTheta += 2 * .pi }

        // Point samples of the SVG arc (y increases downward). Same curves as
        // the web/Android mark; avoids SwiftUI addArc's opposite clockwise.
        let steps = 24
        for step in 1...steps {
            let t = theta1 + dTheta * CGFloat(step) / CGFloat(steps)
            let cosT = cos(t)
            let sinT = sin(t)
            let x = cx + cosPhi * rx * cosT - sinPhi * ry * sinT
            let y = cy + sinPhi * rx * cosT + cosPhi * ry * sinT
            addLine(to: CGPoint(x: x, y: y))
        }
    }
}

