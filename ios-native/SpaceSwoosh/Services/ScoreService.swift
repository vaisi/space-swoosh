// ScoreService.swift
// Changes: deathPreview loads the Open Space neighborhood (rank, #1, the
// closest higher score, the closest lower score) for the death screen.
// A rank jump inserts a gap slot so the strip can draw "...".
// scorePage loads one Space Board page plus the real row count.
// Open Space scores go through start_score_run and
// submit_verified_score. saveScore no longer inserts high_scores directly.
// A missing run id, or a P0001 from the clock, is a player-facing rejection.
// Drop the extra HighScoreRow memberwise init — it redeclared the
// synthesized one and failed Xcode 26 archive. ReplyService
// submit_journey_reply sends p_ship_id + p_platform.

import Foundation

enum ScoreServiceError: LocalizedError {
    case unavailable
    case rejected(String)
    case network(String)

    var errorDescription: String? {
        switch self {
        case .unavailable: return "Leaderboard offline in this build."
        case .rejected(let message): return message
        case .network: return "Could not submit. Try again."
        }
    }
}

struct HighScoreRow: Identifiable, Decodable {
    var id: Int
    var playerName: String
    var score: Int
    var obstaclesDestroyed: Int
    var flightStyle: String?
    var shipId: String?

    enum CodingKeys: String, CodingKey {
        case id
        case playerName = "player_name"
        case score
        case obstaclesDestroyed = "obstacles_destroyed"
        case flightStyle = "flight_style"
        case shipId = "ship_id"
    }

    var shipName: String? {
        guard let shipId, let skin = SkinId(rawValue: shipId) else { return nil }
        return SkinCatalog.def(skin).name
    }
}

struct DeathSlot: Identifiable {
    var id: String
    var you: Bool
    var rank: Int
    var name: String
    var ship: String?
    var score: Int
    /// A skipped stretch between #1 and the neighborhood. Not a player row.
    var gap: Bool = false
}

struct DeathPreview {
    var rank: Int
    var slots: [DeathSlot]
}

struct ScorePage {
    var rows: [HighScoreRow]
    var total: Int
}

enum ScoreService {
    private static let table = "high_scores"

    static var isAvailable: Bool {
        let url = configURL
        let key = configKey
        return !url.isEmpty && !key.isEmpty
    }

    static func formatScore(_ score: Int) -> String {
        let fmt = NumberFormatter()
        fmt.numberStyle = .decimal
        fmt.maximumFractionDigits = 0
        fmt.groupingSeparator = ","
        return fmt.string(from: NSNumber(value: score)) ?? "\(score)"
    }

    /// One page of the Global board, plus how many rows exist for this style.
    static func scorePage(tab: Tab, style: FlightStyle, page: Int, pageSize: Int) async throws -> ScorePage {
        guard isAvailable else { return ScorePage(rows: [], total: 0) }
        let size = max(1, pageSize)
        let index = max(0, page)
        let from = index * size
        let to = from + size - 1
        let order = tab == .distance ? "score.desc" : "obstacles_destroyed.desc"
        var comps = URLComponents(string: "\(configURL)/rest/v1/\(table)")!
        comps.queryItems = [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "flight_style", value: "eq.\(sanitize(style))"),
            URLQueryItem(name: "order", value: order),
        ]
        var request = authorized(comps.url!)
        request.httpMethod = "GET"
        request.setValue("count=exact", forHTTPHeaderField: "Prefer")
        request.setValue("\(from)-\(to)", forHTTPHeaderField: "Range")
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw ScoreServiceError.network("scores")
        }
        let total = contentTotal(http.value(forHTTPHeaderField: "Content-Range"))
        if http.statusCode == 416 {
            return ScorePage(rows: [], total: total)
        }
        guard (200...299).contains(http.statusCode) else {
            throw ScoreServiceError.network("scores")
        }
        let rows = try JSONDecoder().decode([HighScoreRow].self, from: data)
        return ScorePage(rows: rows, total: total)
    }

    static func higherCount(score: Int, style: FlightStyle) async throws -> Int {
        guard isAvailable else { throw ScoreServiceError.unavailable }
        var comps = URLComponents(string: "\(configURL)/rest/v1/\(table)")!
        comps.queryItems = [
            URLQueryItem(name: "select", value: "id"),
            URLQueryItem(name: "flight_style", value: "eq.\(sanitize(style))"),
            URLQueryItem(name: "score", value: "gt.\(max(0, score))"),
        ]
        var request = authorized(comps.url!)
        request.httpMethod = "GET"
        request.setValue("count=exact", forHTTPHeaderField: "Prefer")
        request.setValue("0-0", forHTTPHeaderField: "Range")
        request.setValue("items", forHTTPHeaderField: "Range-Unit")
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw ScoreServiceError.network("rank")
        }
        let header = http.value(forHTTPHeaderField: "Content-Range") ?? ""
        guard let slash = header.lastIndex(of: "/"),
              let total = Int(header[header.index(after: slash)...]) else {
            throw ScoreServiceError.network("rank")
        }
        return total
    }

    /// Where an unpublished distance would sit. Rank is strictly-higher count + 1.
    static func deathPreview(score: Int, style: FlightStyle) async throws -> DeathPreview {
        guard isAvailable else { throw ScoreServiceError.unavailable }
        let value = max(0, score)
        async let higher = higherCount(score: value, style: style)
        async let top = oneRow(style: style, scoreFilter: nil, descending: true)
        async let above = oneRow(style: style, scoreFilter: "gt.\(value)", descending: false)
        async let below = oneRow(style: style, scoreFilter: "lt.\(value)", descending: true)
        let rank = try await higher + 1
        let topRow = try await top
        let aboveRow = try await above
        let belowRow = try await below
        async let aboveRank = rankOf(aboveRow, style: style)
        async let belowRank = rankOf(belowRow, style: style)
        return DeathPreview(
            rank: rank,
            slots: deathSlots(
                rank: rank,
                top: topRow,
                above: aboveRow,
                aboveRank: try await aboveRank,
                below: belowRow,
                belowRank: try await belowRank
            )
        )
    }

    /// Server stamp for one Open Space run. Nil when the board is offline or
    /// the check-in fails — the flight still plays.
    static func startRun(style: FlightStyle) async -> String? {
        guard isAvailable else { return nil }
        let body: [String: Any] = [
            "p_platform": "ios",
            "p_flight_style": sanitize(style),
        ]
        do {
            let data = try await postRPC("start_score_run", body: body)
            let id = try JSONDecoder().decode(String.self, from: data)
            return id.isEmpty ? nil : id
        } catch {
            return nil
        }
    }

    static func saveScore(
        score: Int,
        name: String,
        destroyed: Int,
        shipId: SkinId,
        style: FlightStyle,
        runId: String
    ) async throws {
        let check = NameFilter.validate(name)
        if !check.ok { throw ScoreServiceError.rejected(check.message) }
        guard isAvailable else { throw ScoreServiceError.unavailable }
        guard !runId.isEmpty else {
            throw ScoreServiceError.rejected("This run was not started online.")
        }

        var body: [String: Any] = [
            "p_run_id": runId,
            "p_score": score,
            "p_player_name": check.name,
            "p_obstacles": max(0, destroyed),
            "p_flight_style": sanitize(style),
            "p_platform": "ios",
        ]
        if SkinId(rawValue: shipId.rawValue) != nil {
            body["p_ship_id"] = shipId.rawValue
        }
        _ = try await postRPC("submit_verified_score", body: body)
        UserDefaults.standard.set(check.name, forKey: "playerName")
    }

    enum Tab {
        case distance, obstacles
    }

    private static func oneRow(
        style: FlightStyle,
        scoreFilter: String?,
        descending: Bool
    ) async throws -> HighScoreRow? {
        var comps = URLComponents(string: "\(configURL)/rest/v1/\(table)")!
        var items = [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "flight_style", value: "eq.\(sanitize(style))"),
            URLQueryItem(name: "order", value: descending ? "score.desc" : "score.asc"),
            URLQueryItem(name: "limit", value: "1"),
        ]
        if let scoreFilter {
            items.append(URLQueryItem(name: "score", value: scoreFilter))
        }
        comps.queryItems = items
        let data = try await send(comps.url!, method: "GET")
        return try JSONDecoder().decode([HighScoreRow].self, from: data).first
    }

    private static func rankOf(_ row: HighScoreRow?, style: FlightStyle) async throws -> Int? {
        guard let row else { return nil }
        return try await higherCount(score: row.score, style: style) + 1
    }

    private static func deathSlots(
        rank: Int,
        top: HighScoreRow?,
        above: HighScoreRow?,
        aboveRank: Int?,
        below: HighScoreRow?,
        belowRank: Int?
    ) -> [DeathSlot] {
        func board(_ row: HighScoreRow, rank: Int) -> DeathSlot {
            DeathSlot(
                id: "board-\(row.id)",
                you: false,
                rank: rank,
                name: row.playerName,
                ship: row.shipName,
                score: row.score
            )
        }

        if rank == 1 {
            return [DeathSlot(id: "you", you: true, rank: 1, name: "", ship: nil, score: 0)]
        }

        var lines: [DeathSlot] = []
        let aboveIsFirst = aboveRank == 1
        if aboveIsFirst, let above, let aboveRank {
            lines.append(board(above, rank: aboveRank))
        } else if let top {
            lines.append(board(top, rank: 1))
            if let above, let aboveRank, aboveRank != 1 {
                lines.append(board(above, rank: aboveRank))
            }
        } else if let above, let aboveRank {
            lines.append(board(above, rank: aboveRank))
        }
        lines.append(DeathSlot(id: "you", you: true, rank: rank, name: "", ship: nil, score: 0))
        if let below, let belowRank {
            lines.append(board(below, rank: belowRank))
        }
        return withRankGaps(lines)
    }

    /// "..." between rows whose ranks are not neighbors, so #1 is not
    /// read as sitting next to #81.
    private static func withRankGaps(_ lines: [DeathSlot]) -> [DeathSlot] {
        var out: [DeathSlot] = []
        for line in lines {
            if let prev = out.last, !prev.gap, !line.gap, line.rank > prev.rank + 1 {
                out.append(DeathSlot(
                    id: "gap-\(prev.rank)",
                    you: false,
                    rank: prev.rank,
                    name: "",
                    ship: nil,
                    score: 0,
                    gap: true
                ))
            }
            out.append(line)
        }
        return out
    }

    private static var configURL: String {
        (Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    private static var configKey: String {
        (Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func contentTotal(_ header: String?) -> Int {
        guard let header, let slash = header.lastIndex(of: "/") else { return 0 }
        let raw = header[header.index(after: slash)...]
        if raw == "*" { return 0 }
        return Int(raw) ?? 0
    }

    private static func sanitize(_ style: FlightStyle) -> String {
        style == .arc ? "arc" : "zigzag"
    }

    private static func authorized(_ url: URL) -> URLRequest {
        var request = URLRequest(url: url)
        request.timeoutInterval = 15
        request.setValue(configKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(configKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        return request
    }

    private struct RPCErrorBody: Decodable {
        var code: String?
        var message: String?
    }

    private static func postRPC(_ name: String, body: [String: Any]) async throws -> Data {
        let payload = try JSONSerialization.data(withJSONObject: body)
        guard let url = URL(string: "\(configURL)/rest/v1/rpc/\(name)") else {
            throw ScoreServiceError.unavailable
        }
        var request = authorized(url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = payload
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw rpcFailure(data)
        }
        return data
    }

    private static func rpcFailure(_ data: Data) -> ScoreServiceError {
        if let body = try? JSONDecoder().decode(RPCErrorBody.self, from: data),
           body.code == "P0001",
           let message = body.message,
           !message.isEmpty {
            return .rejected(message)
        }
        return .network("rpc")
    }

    private static func send(_ url: URL, method: String) async throws -> Data {
        var request = authorized(url)
        request.httpMethod = method
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw ScoreServiceError.network(method)
        }
        return data
    }
}

enum ReplyService {
    static func submit(text: String, skipped: Bool, shipId: SkinId? = nil) async -> Int? {
        guard ScoreService.isAvailable else { return nil }
        var body: [String: Any] = ["p_skipped": skipped, "p_platform": "ios"]
        body["p_body"] = skipped ? NSNull() : text
        if let shipId {
            body["p_ship_id"] = shipId.rawValue
        }
        let payload: Data
        do {
            payload = try JSONSerialization.data(withJSONObject: body)
        } catch {
            return nil
        }
        let urlString = (Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let key = (Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !urlString.isEmpty, !key.isEmpty,
              let url = URL(string: "\(urlString)/rest/v1/rpc/submit_journey_reply") else {
            return nil
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.setValue(key, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = payload
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                return nil
            }
            if let value = try? JSONDecoder().decode(Int.self, from: data) {
                return value > 0 ? value : nil
            }
            return nil
        } catch {
            return nil
        }
    }
}
