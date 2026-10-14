// HighScoresView.swift
// Changes: dark mode draws the depth field on this sheet (it covers the
// shell, including when opened over a run). Friends YOU row shows the
// device Open Space personal best when Game Center still has no score.
// Distance rows show the number only — no KM unit.
// Global pages follow the real row count, not a 10-page cap.

import SwiftUI

struct SpaceBoardOpen: Equatable {
    var fromSubmit: Bool = false
    var callSign: String = ""
    var score: Int = 0
    var obstacles: Int = 0
}

struct HighScoresView: View {
    var onBack: () -> Void
    var open: SpaceBoardOpen = SpaceBoardOpen()

    private enum BoardSource {
        case global, friends
    }

    @ObservedObject private var settings = SettingsStore.shared
    @State private var tab = ScoreService.Tab.distance
    @State private var boardStyle: FlightStyle
    @State private var boardSource: BoardSource = .global
    @State private var scores: [HighScoreRow] = []
    @State private var scoreTotal = 0
    @State private var friendRows: [FriendBoardRow] = []
    @State private var friendsSignedIn = true
    @State private var page = 0
    @State private var loading = true
    @State private var focusedGlobalId: Int?

    private let pageSize = 10

    init(onBack: @escaping () -> Void, open: SpaceBoardOpen = SpaceBoardOpen()) {
        self.onBack = onBack
        self.open = open
        _boardStyle = State(initialValue: SettingsStore.shared.flightStyle)
        _boardSource = State(initialValue: .global)
        _tab = State(initialValue: .distance)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            ShellChrome.header(
                "SPACE BOARD",
                back: onBack,
                trailingTitle: boardSource == .friends ? "Friends" : "Global",
                trailingTag: boardSource == .friends ? "F" : "#",
                trailing: {
                    boardSource = boardSource == .friends ? .global : .friends
                    page = 0
                    Task { await reload(); focusCurrentBoard() }
                }
            )

            HStack(spacing: 24) {
                tabButton("DISTANCE", active: tab == .distance) {
                    tab = .distance
                    page = 0
                    Task { await reload(); focusCurrentBoard() }
                }
                tabButton("OBSTACLES", active: tab == .obstacles) {
                    tab = .obstacles
                    page = 0
                    Task { await reload(); focusCurrentBoard() }
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
            } else if boardSource == .friends && !friendsSignedIn {
                signInPrompt
            } else if boardSource == .friends {
                friendsList
            } else if pageScores.isEmpty {
                Text("No signals logged. Be the first.")
                    .font(BrandType.body(15))
                    .foregroundStyle(BrandColors.ink55)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 48)
                Spacer()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(pageScores.enumerated()), id: \.element.id) { index, row in
                        let rankNumber = page * pageSize + index + 1
                        globalRow(row, rank: rankNumber)
                        if index < pageScores.count - 1 {
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
        .background { NightPaperGround() }
        .task {
            await openBoard()
        }
        .onReceive(NotificationCenter.default.publisher(for: .friendsAuthDidChange)) { _ in
            guard boardSource == .friends else { return }
            Task { await reload(); focusCurrentBoard() }
        }
    }

    @ViewBuilder
    private var friendsList: some View {
        if pageFriends.isEmpty {
            Text("No friends on this board yet.")
                .font(BrandType.body(15))
                .foregroundStyle(BrandColors.ink55)
                .frame(maxWidth: .infinity)
                .padding(.top, 48)
            Spacer()
        } else {
            VStack(spacing: 0) {
                ForEach(Array(pageFriends.enumerated()), id: \.element.id) { index, row in
                    friendRow(row)
                    if index < pageFriends.count - 1 {
                        ShellChrome.dottedRule()
                    }
                }
            }
            Spacer()
            pager
        }
    }

    private var signInPrompt: some View {
        VStack(spacing: 20) {
            Text("Sign in to Game Center to see friends.")
                .font(BrandType.body(15))
                .foregroundStyle(BrandColors.ink55)
                .multilineTextAlignment(.center)
            ShellChrome.brandButton("Sign in", tag: "GC") {
                FriendsScoreService.authenticate()
            }
            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 48)
    }

    private var pageScores: [HighScoreRow] { scores }

    private var pageFriends: [FriendBoardRow] {
        let start = page * pageSize
        guard start < friendRows.count else { return [] }
        return Array(friendRows[start..<min(start + pageSize, friendRows.count)])
    }

    private var totalPages: Int {
        let count = boardSource == .friends ? friendRows.count : scoreTotal
        if count == 0 { return 1 }
        return max(1, (count + pageSize - 1) / pageSize)
    }

    private func turnPage(_ delta: Int) {
        let next = min(max(0, page + delta), totalPages - 1)
        guard next != page else { return }
        page = next
        guard boardSource == .global else { return }
        Task { await reload(showSpinner: false) }
    }

    private var pager: some View {
        HStack(spacing: 18) {
            Button("←") { turnPage(-1) }
                .disabled(page == 0)
                .opacity(page == 0 ? 0.3 : 1)
            Text("PAGE \(page + 1)/\(totalPages)")
            Button("→") { turnPage(1) }
                .disabled(page >= totalPages - 1)
                .opacity(page >= totalPages - 1 ? 0.3 : 1)
        }
        .font(BrandType.mono(14))
        .foregroundStyle(BrandColors.ink)
        .frame(maxWidth: .infinity)
        .padding(.bottom, 16)
        .buttonStyle(.plain)
    }

    private func globalRow(_ row: HighScoreRow, rank: Int) -> some View {
        let highlighted = focusedGlobalId == row.id
        return HStack(alignment: .firstTextBaseline) {
            Text(rankLabel(rank))
                .font(BrandType.mono(16))
                .frame(width: 36, alignment: .leading)
            Text(row.playerName)
                .font(rank <= 3 ? BrandType.ui(15) : BrandType.body(15))
            if let ship = row.shipName {
                Text(", \(ship)")
                    .font(BrandType.body(12))
                    .foregroundStyle(BrandColors.ink55)
            }
            Spacer()
            Text(ScoreService.formatScore(tab == .distance ? row.score : row.obstaclesDestroyed))
                .font(BrandType.mono(16))
        }
        .foregroundStyle(BrandColors.ink)
        .padding(.vertical, 10)
        .padding(.horizontal, 6)
        .background(highlighted ? BrandColors.paperTint : Color.clear)
    }

    private func friendRow(_ row: FriendBoardRow) -> some View {
        HStack(alignment: .center, spacing: 10) {
            Text(row.rank > 0 ? rankLabel(row.rank) : "—")
                .font(BrandType.mono(16))
                .frame(width: 36, alignment: .leading)
            avatar(row)
            Text(row.displayName)
                .font(row.rank > 0 && row.rank <= 3 ? BrandType.ui(15) : BrandType.body(15))
                .lineLimit(1)
            if row.isLocal {
                ShellChrome.compactTag("You", tag: "Y")
            }
            Spacer(minLength: 8)
            if row.rank > 0 || row.value > 0 {
                Text(ScoreService.formatScore(row.value))
                    .font(BrandType.mono(16))
            } else {
                Text("—")
                    .font(BrandType.mono(16))
                    .foregroundStyle(BrandColors.ink55)
            }
        }
        .foregroundStyle(BrandColors.ink)
        .padding(.vertical, 8)
        .padding(.horizontal, 6)
        .background(row.isLocal ? BrandColors.paperTint : Color.clear)
    }

    private func avatar(_ row: FriendBoardRow) -> some View {
        ZStack {
            Circle()
                .fill(BrandColors.paperTint)
            if let photo = row.photo {
                Image(uiImage: photo)
                    .resizable()
                    .scaledToFill()
                    .clipShape(Circle())
            } else {
                Text(initials(row.displayName))
                    .font(BrandType.ui(11))
                    .foregroundStyle(BrandColors.ink)
            }
        }
        .frame(width: 32, height: 32)
        .overlay(Circle().stroke(BrandColors.ink, lineWidth: 1.5))
    }

    private func initials(_ name: String) -> String {
        let parts = name.split(whereSeparator: { $0.isWhitespace })
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.trimmingCharacters(in: .whitespaces).prefix(2)).uppercased()
    }

    private func openBoard() async {
        loading = true
        boardStyle = settings.flightStyle
        if open.fromSubmit {
            boardSource = .global
            tab = .distance
            let higher = (try? await ScoreService.higherCount(score: open.score, style: boardStyle)) ?? 0
            page = higher / pageSize
            await reload()
            focusCurrentBoard()
            return
        }
        let probe = await FriendsScoreService.loadFriends(tab: tab, style: boardStyle)
        if friendsListHasAnyone(probe) {
            boardSource = .friends
            friendsSignedIn = probe.signedIn
            friendRows = probe.rows
            scores = []
            scoreTotal = 0
            loading = false
            focusCurrentBoard()
            return
        }
        boardSource = .global
        await reload()
        focusCurrentBoard()
    }

    private func friendsListHasAnyone(_ result: FriendsLoadResult) -> Bool {
        guard result.signedIn else { return false }
        return result.rows.contains { row in
            if !row.isLocal { return true }
            return row.value > 0 || row.rank > 0
        }
    }

    private func reload(showSpinner: Bool = true) async {
        if showSpinner { loading = true }
        if boardSource == .friends {
            let result = await FriendsScoreService.loadFriends(tab: tab, style: boardStyle)
            friendsSignedIn = result.signedIn
            friendRows = result.rows
            scores = []
            scoreTotal = 0
        } else {
            friendsSignedIn = true
            friendRows = []
            do {
                let result = try await ScoreService.scorePage(
                    tab: tab,
                    style: boardStyle,
                    page: page,
                    pageSize: pageSize
                )
                scores = result.rows
                scoreTotal = result.total
            } catch {
                scores = []
                scoreTotal = 0
            }
        }
        if page >= totalPages { page = max(0, totalPages - 1) }
        loading = false
    }

    private func focusCurrentBoard() {
        if boardSource == .friends {
            focusedGlobalId = nil
            if let index = friendRows.firstIndex(where: \.isLocal) {
                page = index / pageSize
            }
            if page >= totalPages { page = max(0, totalPages - 1) }
            return
        }
        guard open.fromSubmit else {
            focusedGlobalId = nil
            return
        }
        let want = open.callSign.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !want.isEmpty else {
            focusedGlobalId = nil
            return
        }
        let named = scores.enumerated().filter {
            $0.element.playerName.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == want
        }
        let metric = tab == .obstacles ? open.obstacles : open.score
        let scored = named.filter {
            (tab == .obstacles ? $0.element.obstaclesDestroyed : $0.element.score) == metric
        }
        let pick = scored.first ?? named.first
        if let pick {
            focusedGlobalId = pick.element.id
        } else {
            focusedGlobalId = nil
        }
        if page >= totalPages { page = max(0, totalPages - 1) }
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
