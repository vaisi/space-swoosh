// ScoreService.swift
// Changes: Same high_scores PostgREST contract as Android ScoreService.js.

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

enum ScoreService {
    private static let table = "high_scores"
    private static let pageLimit = 100

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

    static func topScores(tab: Tab, style: FlightStyle) async throws -> [HighScoreRow] {
        guard isAvailable else { return [] }
        let order = tab == .distance ? "score.desc" : "obstacles_destroyed.desc"
        var comps = URLComponents(string: "\(configURL)/rest/v1/\(table)")!
        comps.queryItems = [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "flight_style", value: "eq.\(sanitize(style))"),
            URLQueryItem(name: "order", value: order),
            URLQueryItem(name: "limit", value: "\(pageLimit)"),
        ]
        let data = try await send(comps.url!, method: "GET")
        return try JSONDecoder().decode([HighScoreRow].self, from: data)
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

    static func saveScore(
        score: Int,
        name: String,
        destroyed: Int,
        shipId: SkinId,
        style: FlightStyle
    ) async throws {
        let check = NameFilter.validate(name)
        if !check.ok { throw ScoreServiceError.rejected(check.message) }
        guard isAvailable else { throw ScoreServiceError.unavailable }

        var body: [String: Any] = [
            "score": score,
            "player_name": check.name,
            "obstacles_destroyed": max(0, destroyed),
            "flight_style": sanitize(style),
        ]
        if SkinId(rawValue: shipId.rawValue) != nil {
            body["ship_id"] = shipId.rawValue
        }
        let payload = try JSONSerialization.data(withJSONObject: body)
        var comps = URLComponents(string: "\(configURL)/rest/v1/\(table)")!
        comps.queryItems = [URLQueryItem(name: "select", value: "id")]
        var request = authorized(comps.url!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = payload
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw ScoreServiceError.network("insert")
        }
        UserDefaults.standard.set(check.name, forKey: "playerName")
    }

    enum Tab {
        case distance, obstacles
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
