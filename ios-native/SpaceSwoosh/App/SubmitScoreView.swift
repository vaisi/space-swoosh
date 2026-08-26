// SubmitScoreView.swift
// Changes: Keyboard keeps the same card order (stats then call sign). Opaque
// paper wash hides Mission Failed. Content sits above the IME and below the island.

import SwiftUI
import Combine
import UIKit

struct SubmitScoreView: View {
    var score: Int
    var destroyed: Int
    var rank: String
    var rankNumber: Int?
    var shipId: SkinId
    var style: FlightStyle
    var onDone: () -> Void
    var onCancel: () -> Void

    @State private var name = UserDefaults.standard.string(forKey: "playerName") ?? ""
    @State private var error = ""
    @State private var busy = false
    @State private var keyboardHeight: CGFloat = 0
    @FocusState private var nameFocused: Bool

    private var compact: Bool { keyboardHeight > 40 }

    var body: some View {
        ZStack {
            BrandColors.paper.ignoresSafeArea()
            VStack(spacing: 0) {
                Spacer(minLength: compact ? 0 : 12)
                card
                Spacer(minLength: 0)
            }
            .padding(.bottom, keyboardHeight)
            .animation(.easeOut(duration: 0.22), value: keyboardHeight)
        }
        .safeAreaPadding(.top)
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .onReceive(keyboardFrame) { frame in
            let screen = UIScreen.main.bounds
            keyboardHeight = max(0, screen.intersection(frame).height)
        }
    }

    private var card: some View {
        VStack(alignment: .leading, spacing: compact ? 12 : 16) {
            ShellChrome.header("SUBMIT SIGNAL", back: onCancel)
            if compact {
                compactStats
            } else {
                ShellChrome.statColumn(value: ScoreService.formatScore(score), label: "KM")
                    .frame(maxWidth: .infinity)
                HStack(spacing: 0) {
                    ShellChrome.statColumn(value: ScoreService.formatScore(destroyed), label: "ASTEROIDS")
                    Rectangle()
                        .fill(BrandColors.ink.opacity(0.12))
                        .frame(width: 1, height: 44)
                    ShellChrome.statColumn(value: rank, label: "YOUR RANK")
                }
            }
            ShellChrome.dottedRule()
            Text("CALL SIGN")
                .font(BrandType.label(10))
                .tracking(BrandType.labelTracking(10))
                .foregroundStyle(BrandColors.ink55)
            TextField("ENTER CALL SIGN", text: $name)
                .font(BrandType.body(18))
                .foregroundStyle(BrandColors.ink)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.done)
                .focused($nameFocused)
                .padding(.vertical, 8)
                .overlay(alignment: .bottom) {
                    Rectangle().fill(BrandColors.ink).frame(height: 1.5)
                }
                .onChange(of: name) { _, next in
                    if next.count > NameFilter.maxLength {
                        name = String(next.prefix(NameFilter.maxLength))
                    }
                }
            if !error.isEmpty {
                Text(error)
                    .font(BrandType.body(14))
                    .foregroundStyle(BrandColors.signal)
            }
            ShellChrome.brandButton(
                busy ? "Sending" : "Submit",
                tag: "↑",
                primary: true
            ) {
                Task { await submit() }
            }
            .disabled(busy)
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
        .padding(.bottom, 24)
        .background(BrandColors.paperTint)
        .overlay {
            Rectangle().stroke(BrandColors.ink, lineWidth: 1.5)
        }
        .padding(.horizontal, 20)
    }

    private var compactStats: some View {
        HStack(alignment: .firstTextBaseline, spacing: 0) {
            compactStat(ScoreService.formatScore(score) + " KM", "DISTANCE")
            compactStat(ScoreService.formatScore(destroyed), "ASTEROIDS")
            compactStat(rank, "RANK")
        }
    }

    private func compactStat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(BrandType.mono(16))
                .foregroundStyle(BrandColors.ink)
            Text(label)
                .font(BrandType.label(9))
                .tracking(BrandType.labelTracking(9))
                .foregroundStyle(BrandColors.ink55)
        }
        .frame(maxWidth: .infinity)
    }

    private var keyboardFrame: AnyPublisher<CGRect, Never> {
        NotificationCenter.default
            .publisher(for: UIResponder.keyboardWillChangeFrameNotification)
            .compactMap { $0.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect }
            .eraseToAnyPublisher()
    }

    private func submit() async {
        error = ""
        busy = true
        defer { busy = false }
        do {
            try await ScoreService.saveScore(
                score: score,
                name: name,
                destroyed: destroyed,
                shipId: shipId,
                style: style
            )
            var params: [String: Any] = [
                "score": score,
                "player_name": name,
                "obstacles_destroyed": destroyed,
                "ship_id": shipId.rawValue,
                "flight_style": style.rawValue,
            ]
            if let rankNumber { params["rank"] = rankNumber }
            AnalyticsService.track("submit_highscore", params)
            onDone()
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "Could not submit. Try again."
        }
    }
}
