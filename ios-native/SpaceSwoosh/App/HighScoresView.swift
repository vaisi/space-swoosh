// HighScoresView.swift
// Changes: Local SPACE BOARD matching Android renderHighScores (no Supabase).

import SwiftUI

struct HighScoresView: View {
    var onBack: () -> Void

    @ObservedObject private var settings = SettingsStore.shared
    @State private var tab = Tab.distance

    enum Tab {
        case distance, obstacles
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            ShellChrome.header(
                "SPACE BOARD",
                back: onBack,
                trailingTitle: settings.flightStyle == .zigzag ? "Zigzag" : "Arc",
                trailingTag: settings.flightStyle == .zigzag ? "Z" : "S"
            ) {
                settings.setFlightStyle(settings.flightStyle == .zigzag ? .arc : .zigzag)
            }

            HStack(spacing: 24) {
                tabButton("DISTANCE", active: tab == .distance) { tab = .distance }
                tabButton("OBSTACLES", active: tab == .obstacles) { tab = .obstacles }
            }
            .frame(maxWidth: .infinity)

            if rows.isEmpty {
                Text("No signals logged. Be the first.")
                    .font(BrandType.body(15))
                    .foregroundStyle(BrandColors.ink55)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 48)
                Spacer()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
                        HStack(alignment: .firstTextBaseline) {
                            Text(rank(index))
                                .font(BrandType.mono(16))
                                .frame(width: 36, alignment: .leading)
                            Text(row.name)
                                .font(index < 3 ? BrandType.ui(15) : BrandType.body(15))
                            Text(", \(row.ship)")
                                .font(BrandType.body(12))
                                .foregroundStyle(BrandColors.ink55)
                            Spacer()
                            Text(row.value)
                                .font(BrandType.mono(16))
                            if tab == .distance {
                                Text("KM")
                                    .font(BrandType.label(9))
                                    .tracking(BrandType.labelTracking(9))
                                    .foregroundStyle(BrandColors.ink55)
                            }
                        }
                        .foregroundStyle(BrandColors.ink)
                        .padding(.vertical, 10)
                        if index < rows.count - 1 {
                            ShellChrome.dottedRule()
                        }
                    }
                }
                Spacer()
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(BrandColors.paper.ignoresSafeArea())
    }

    private var rows: [Row] {
        let style = settings.flightStyle
        let ship = SkinCatalog.def(settings.shipSkinId).name
        let value: Int
        switch tab {
        case .distance: value = OpenWorldProgress.best(for: style)
        case .obstacles: value = OpenWorldProgress.bestDestroyed(for: style)
        }
        guard value > 0 else { return [] }
        return [Row(name: "YOU", ship: ship, value: formatted(value))]
    }

    private func formatted(_ n: Int) -> String {
        let fmt = NumberFormatter()
        fmt.numberStyle = .decimal
        fmt.groupingSeparator = ","
        return fmt.string(from: NSNumber(value: n)) ?? "\(n)"
    }

    private func rank(_ index: Int) -> String {
        let trophies = ["🥇", "🥈", "🥉"]
        if index < trophies.count { return trophies[index] }
        return "\(index + 1)"
    }

    private func tabButton(_ title: String, active: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Text(title)
                    .font(BrandType.label(13))
                    .tracking(BrandType.labelTracking(13))
                    .foregroundStyle(active ? BrandColors.ink : BrandColors.ink55)
                if active {
                    ShellChrome.dottedRule()
                        .frame(width: 88)
                } else {
                    Color.clear.frame(height: 4)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }

    private struct Row {
        var name: String
        var ship: String
        var value: String
    }
}
