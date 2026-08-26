// HighScoresView.swift
// Changes: Live SPACE BOARD from Supabase; top safeAreaPadding clears the island.

import SwiftUI

struct HighScoresView: View {
    var onBack: () -> Void

    @ObservedObject private var settings = SettingsStore.shared
    @State private var tab = ScoreService.Tab.distance
    @State private var boardStyle: FlightStyle
    @State private var scores: [HighScoreRow] = []
    @State private var page = 0
    @State private var loading = true

    private let pageSize = 10
    private let maxPages = 10

    init(onBack: @escaping () -> Void) {
        self.onBack = onBack
        _boardStyle = State(initialValue: SettingsStore.shared.flightStyle)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            ShellChrome.header(
                "SPACE BOARD",
                back: onBack,
                trailingTitle: boardStyle == .zigzag ? "Zigzag" : "Arc",
                trailingTag: boardStyle == .zigzag ? "Z" : "S"
            ) {
                boardStyle = boardStyle == .zigzag ? .arc : .zigzag
                page = 0
            }

            HStack(spacing: 24) {
                tabButton("DISTANCE", active: tab == .distance) {
                    tab = .distance
                    page = 0
                }
                tabButton("OBSTACLES", active: tab == .obstacles) {
                    tab = .obstacles
                    page = 0
                }
            }
            .frame(maxWidth: .infinity)

            if loading {
                Text("LOADING")
                    .font(BrandType.label(12))
                    .tracking(BrandType.labelTracking(12))
                    .foregroundStyle(BrandColors.ink55)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 48)
                Spacer()
            } else if pageRows.isEmpty {
                Text("No signals logged. Be the first.")
                    .font(BrandType.body(15))
                    .foregroundStyle(BrandColors.ink55)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 48)
                Spacer()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(pageRows.enumerated()), id: \.element.id) { index, row in
                        let rankNumber = page * pageSize + index + 1
                        HStack(alignment: .firstTextBaseline) {
                            Text(rankLabel(rankNumber))
                                .font(BrandType.mono(16))
                                .frame(width: 36, alignment: .leading)
                            Text(row.playerName)
                                .font(rankNumber <= 3 ? BrandType.ui(15) : BrandType.body(15))
                            if let ship = row.shipName {
                                Text(", \(ship)")
                                    .font(BrandType.body(12))
                                    .foregroundStyle(BrandColors.ink55)
                            }
                            Spacer()
                            Text(ScoreService.formatScore(tab == .distance ? row.score : row.obstaclesDestroyed))
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
                        if index < pageRows.count - 1 {
                            ShellChrome.dottedRule()
                        }
                    }
                }
                Spacer()
                pager
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
        .safeAreaPadding(.top)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(BrandColors.paper.ignoresSafeArea())
        .task(id: "\(boardStyle.rawValue)-\(tab == .distance ? "d" : "o")") {
            await reload()
        }
    }

    private var pageRows: [HighScoreRow] {
        let start = page * pageSize
        guard start < scores.count else { return [] }
        return Array(scores[start..<min(start + pageSize, scores.count)])
    }

    private var totalPages: Int {
        if scores.isEmpty { return 1 }
        return min(maxPages, max(1, (scores.count + pageSize - 1) / pageSize))
    }

    private var pager: some View {
        HStack(spacing: 18) {
            Button("←") { page = max(0, page - 1) }
                .disabled(page == 0)
                .opacity(page == 0 ? 0.3 : 1)
            Text("PAGE \(page + 1)/\(totalPages)")
            Button("→") { page = min(totalPages - 1, page + 1) }
                .disabled(page >= totalPages - 1)
                .opacity(page >= totalPages - 1 ? 0.3 : 1)
        }
        .font(BrandType.mono(14))
        .foregroundStyle(BrandColors.ink)
        .frame(maxWidth: .infinity)
        .padding(.bottom, 16)
        .buttonStyle(.plain)
    }

    private func reload() async {
        loading = true
        do {
            scores = try await ScoreService.topScores(tab: tab, style: boardStyle)
        } catch {
            scores = []
        }
        if page >= totalPages { page = max(0, totalPages - 1) }
        loading = false
    }

    private func rankLabel(_ rank: Int) -> String {
        let trophies = ["🥇", "🥈", "🥉"]
        if rank >= 1, rank <= trophies.count { return trophies[rank - 1] }
        return "\(rank)"
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
}
