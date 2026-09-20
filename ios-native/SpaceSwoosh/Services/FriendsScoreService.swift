// FriendsScoreService.swift
// Changes: FriendBoardRow profile load — always include the local Game Center
// player, small photos, isLocal. Auth + silent Open Space submit unchanged.

import Foundation
import GameKit
import UIKit

struct FriendBoardRow: Identifiable {
    var playerId: String
    var displayName: String
    var value: Int
    var rank: Int
    var isLocal: Bool
    var photo: UIImage?

    var id: String { playerId.isEmpty ? displayName : playerId }
}

struct FriendsLoadResult {
    var signedIn: Bool
    var rows: [FriendBoardRow]
}

extension Notification.Name {
    static let friendsAuthDidChange = Notification.Name("FriendsScoreService.authDidChange")
}

enum FriendsScoreService {
    static let zigzagDistance = "com.orbi.spaceswoosh.zigzag.distance"
    static let zigzagObstacles = "com.orbi.spaceswoosh.zigzag.obstacles"
    static let arcDistance = "com.orbi.spaceswoosh.arc.distance"
    static let arcObstacles = "com.orbi.spaceswoosh.arc.obstacles"

    static var isAuthenticated: Bool {
        GKLocalPlayer.local.isAuthenticated
    }

    static func authenticate() {
        GKLocalPlayer.local.authenticateHandler = { viewController, _ in
            if let viewController {
                present(viewController)
            }
            NotificationCenter.default.post(name: .friendsAuthDidChange, object: nil)
        }
    }

    static func submit(distance: Int, obstacles: Int, style: FlightStyle) {
        guard isAuthenticated else { return }
        let player = GKLocalPlayer.local
        let distId = leaderboardId(style: style, tab: .distance)
        let obsId = leaderboardId(style: style, tab: .obstacles)
        GKLeaderboard.submitScore(
            max(0, distance),
            context: 0,
            player: player,
            leaderboardIDs: [distId]
        ) { _ in }
        GKLeaderboard.submitScore(
            max(0, obstacles),
            context: 0,
            player: player,
            leaderboardIDs: [obsId]
        ) { _ in }
    }

    static func loadFriends(tab: ScoreService.Tab, style: FlightStyle) async -> FriendsLoadResult {
        guard isAuthenticated else {
            return FriendsLoadResult(signedIn: false, rows: [])
        }
        let localPlayer = GKLocalPlayer.local
        let localId = localPlayer.gamePlayerID
        let id = leaderboardId(style: style, tab: tab)
        do {
            let boards = try await GKLeaderboard.loadLeaderboards(IDs: [id])
            guard let board = boards.first else {
                let row = await profileRow(
                    player: localPlayer,
                    value: 0,
                    rank: 0,
                    isLocal: true
                )
                return FriendsLoadResult(signedIn: true, rows: [row])
            }
            let loaded = try await board.loadEntries(
                for: .friendsOnly,
                timeScope: .allTime,
                range: NSRange(location: 1, length: 100)
            )
            var rows: [FriendBoardRow] = []
            var seen = Set<String>()
            var entries = loaded.1
            if let localEntry = loaded.0,
               !entries.contains(where: { $0.player.gamePlayerID == localEntry.player.gamePlayerID }) {
                entries.append(localEntry)
            }
            for entry in entries {
                let playerId = entry.player.gamePlayerID
                if !playerId.isEmpty { seen.insert(playerId) }
                rows.append(await profileRow(
                    player: entry.player,
                    value: Int(entry.score),
                    rank: entry.rank,
                    isLocal: playerId == localId && !localId.isEmpty
                ))
            }
            if !localId.isEmpty, !seen.contains(localId) {
                rows.append(await profileRow(
                    player: localPlayer,
                    value: 0,
                    rank: 0,
                    isLocal: true
                ))
            } else if rows.isEmpty {
                rows.append(await profileRow(
                    player: localPlayer,
                    value: 0,
                    rank: 0,
                    isLocal: true
                ))
            }
            return FriendsLoadResult(signedIn: true, rows: rows)
        } catch {
            let row = await profileRow(
                player: localPlayer,
                value: 0,
                rank: 0,
                isLocal: true
            )
            return FriendsLoadResult(signedIn: true, rows: [row])
        }
    }

    private static func profileRow(
        player: GKPlayer,
        value: Int,
        rank: Int,
        isLocal: Bool
    ) async -> FriendBoardRow {
        var photo: UIImage?
        do {
            photo = try await player.loadPhoto(for: .small)
        } catch {
            photo = nil
        }
        let playerId = player.gamePlayerID
        return FriendBoardRow(
            playerId: playerId.isEmpty ? player.displayName : playerId,
            displayName: player.displayName,
            value: max(0, value),
            rank: max(0, rank),
            isLocal: isLocal,
            photo: photo
        )
    }

    private static func leaderboardId(style: FlightStyle, tab: ScoreService.Tab) -> String {
        switch (style, tab) {
        case (.zigzag, .distance): return zigzagDistance
        case (.zigzag, .obstacles): return zigzagObstacles
        case (.arc, .distance): return arcDistance
        case (.arc, .obstacles): return arcObstacles
        }
    }

    private static func present(_ viewController: UIViewController) {
        DispatchQueue.main.async {
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            let scene = scenes.first { $0.activationState == .foregroundActive } ?? scenes.first
            let window = scene?.windows.first { $0.isKeyWindow } ?? scene?.windows.first
            guard var top = window?.rootViewController else { return }
            while let presented = top.presentedViewController {
                top = presented
            }
            if top.presentedViewController == nil {
                top.present(viewController, animated: true)
            }
        }
    }
}
