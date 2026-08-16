// HudChrome.swift
// Changes: Android mockup C — pause + three icon/meter rows, stagger alphas.

import SwiftUI
import Foundation

struct MockupCHUD: View {
    @ObservedObject var session: GameSession
    var onPause: () -> Void

    var body: some View {
        GeometryReader { geo in
            let unit = geo.size.width / 40
            let rowH = unit * 1.15
            let meterH = max(4, unit * 0.42)
            let iconSlot = unit * 1.15
            let iconGap = unit * 0.45
            let rowGap = unit * 0.55
            let meterW = unit * 6.5
            let inset = unit * 2
            let pauseH: CGFloat = 48

            HStack(alignment: .top, spacing: iconGap) {
                Button(action: onPause) {
                    PauseBars()
                        .frame(width: 22, height: 20)
                        .frame(width: 48, height: pauseH)
                        .contentShape(Rectangle())
                }
                .opacity(Double(session.hudPause))
                .disabled(session.isOver || session.hudPause < 0.02)
                .allowsHitTesting(session.hudPause >= 0.02)

                VStack(alignment: .leading, spacing: rowGap) {
                    if session.hudDistance > 0.02 {
                        HudRow(iconSlot: iconSlot, rowH: rowH) {
                            RouteIcon()
                                .stroke(BrandColors.ink.opacity(0.55), style: StrokeStyle(lineWidth: max(1.2, unit * 0.11), lineCap: .round, lineJoin: .round))
                                .background(RouteIconDots().fill(BrandColors.ink.opacity(0.55)))
                        } meter: {
                            if session.isJourney {
                                MeterBar(
                                    frac: session.journeyProgress,
                                    fill: BrandColors.ink,
                                    height: meterH,
                                    pulse: false
                                )
                                .frame(width: meterW, height: meterH)
                            } else {
                                Text("\(session.scoreKm)")
                                    .font(.system(size: max(11, unit * 1.15), weight: .bold, design: .monospaced))
                                    .foregroundStyle(BrandColors.ink)
                            }
                        }
                        .opacity(Double(session.hudDistance))
                    }

                    if session.fuelLive {
                        HudRow(iconSlot: iconSlot, rowH: rowH) {
                            SparkleIcon()
                                .stroke(BrandColors.ink.opacity(0.55), style: StrokeStyle(lineWidth: max(1.2, unit * 0.12), lineJoin: .miter))
                        } meter: {
                            MeterBar(
                                frac: max(0, min(1, session.fuel)),
                                fill: BrandColors.signal,
                                height: meterH,
                                pulse: session.fuelLow
                            )
                            .frame(width: meterW, height: meterH)
                        }
                        .opacity(Double(session.hudDistance))
                    }

                    if session.hudSmash > 0.02, session.isJourney ? session.smashTarget > 0 : true {
                        HudRow(iconSlot: iconSlot, rowH: rowH) {
                            TargetIcon()
                                .stroke(BrandColors.ink.opacity(0.55), lineWidth: max(1.15, unit * 0.1))
                                .background(Circle().fill(BrandColors.ink.opacity(0.55)).scaleEffect(0.18))
                        } meter: {
                            if session.isJourney, session.smashTarget > 0 {
                                SmashDots(
                                    filled: session.destroyed,
                                    total: session.smashTarget,
                                    diameter: meterH
                                )
                            } else {
                                Text("\(session.destroyed)")
                                    .font(.system(size: max(11, unit * 1.15), weight: .bold, design: .monospaced))
                                    .foregroundStyle(BrandColors.ink)
                            }
                        }
                        .opacity(Double(session.hudSmash))
                    }
                }
                .padding(.top, (pauseH - rowH) * 0.5)

                Spacer(minLength: 0)
            }
            .padding(.leading, inset)
            .padding(.top, 16)
        }
        .frame(height: 120)
        .allowsHitTesting(session.hudPause >= 0.02)
    }
}

private struct HudRow<Icon: View, Meter: View>: View {
    var iconSlot: CGFloat
    var rowH: CGFloat
    @ViewBuilder var icon: () -> Icon
    @ViewBuilder var meter: () -> Meter

    var body: some View {
        HStack(spacing: iconSlot * 0.4) {
            icon()
                .frame(width: iconSlot, height: iconSlot)
            meter()
            Spacer(minLength: 0)
        }
        .frame(height: rowH)
    }
}

struct PauseBars: View {
    var body: some View {
        HStack(spacing: 5) {
            Capsule().fill(BrandColors.ink).frame(width: 6)
            Capsule().fill(BrandColors.ink).frame(width: 6)
        }
    }
}

struct MeterBar: View {
    var frac: CGFloat
    var fill: Color
    var height: CGFloat
    var pulse: Bool

    var body: some View {
        TimelineView(.animation(minimumInterval: pulse ? 1.0 / 30.0 : 1, paused: !pulse)) { timeline in
            let wave = pulse
                ? 0.55 + 0.45 * (0.5 + 0.5 * sin(timeline.date.timeIntervalSinceReferenceDate / 0.16))
                : 1.0
            GeometryReader { geo in
                let filled = geo.size.width * max(0, min(1, frac))
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: min(2, height * 0.35), style: .continuous)
                        .fill(BrandColors.ink.opacity(0.06))
                    if filled > 0.5 {
                        RoundedRectangle(cornerRadius: min(2, height * 0.35), style: .continuous)
                            .fill(fill.opacity(wave))
                            .frame(width: filled)
                    }
                }
            }
        }
    }
}

struct SmashDots: View {
    var filled: Int
    var total: Int
    var diameter: CGFloat

    var body: some View {
        let n = max(0, total)
        let gap = max(2, diameter * 0.65)
        HStack(spacing: gap) {
            ForEach(0..<n, id: \.self) { i in
                Circle()
                    .fill(i < filled ? BrandColors.ink : BrandColors.ink.opacity(0.06))
                    .frame(width: diameter, height: diameter)
            }
        }
    }
}

struct RouteIcon: Shape {
    func path(in rect: CGRect) -> Path {
        let cx = rect.midX
        let cy = rect.midY
        let r = min(rect.width, rect.height) * 0.42
        var path = Path()
        path.move(to: CGPoint(x: cx - r * 0.85, y: cy + r * 0.55))
        path.addCurve(
            to: CGPoint(x: cx + r * 0.85, y: cy - r * 0.55),
            control1: CGPoint(x: cx - r * 0.2, y: cy + r * 0.55),
            control2: CGPoint(x: cx - r * 0.15, y: cy - r * 0.55)
        )
        return path
    }
}

struct RouteIconDots: Shape {
    func path(in rect: CGRect) -> Path {
        let cx = rect.midX
        let cy = rect.midY
        let r = min(rect.width, rect.height) * 0.42
        let dot = max(1.2, r * 0.22)
        var path = Path()
        path.addEllipse(in: CGRect(x: cx - r * 0.85 - dot, y: cy + r * 0.55 - dot, width: dot * 2, height: dot * 2))
        path.addEllipse(in: CGRect(x: cx + r * 0.85 - dot, y: cy - r * 0.55 - dot, width: dot * 2, height: dot * 2))
        return path
    }
}

/// Android `drawSparkle` hollow — 8-vertex 4-point star, innerRatio 0.4.
struct SparkleIcon: Shape {
    var innerRatio: CGFloat = 0.4

    func path(in rect: CGRect) -> Path {
        let cx = rect.midX
        let cy = rect.midY
        let r = min(rect.width, rect.height) * 0.42
        var path = Path()
        for i in 0..<8 {
            let angle = (CGFloat(i) * .pi / 4) - .pi / 2
            let rad = i % 2 == 0 ? r : r * innerRatio
            let p = CGPoint(x: cx + cos(angle) * rad, y: cy + sin(angle) * rad)
            if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
        }
        path.closeSubpath()
        return path
    }
}

struct TargetIcon: Shape {
    func path(in rect: CGRect) -> Path {
        let cx = rect.midX
        let cy = rect.midY
        let r = min(rect.width, rect.height) * 0.42
        var path = Path()
        path.addEllipse(in: CGRect(x: cx - r * 0.95, y: cy - r * 0.95, width: r * 1.9, height: r * 1.9))
        path.addEllipse(in: CGRect(x: cx - r * 0.55, y: cy - r * 0.55, width: r * 1.1, height: r * 1.1))
        return path
    }
}
