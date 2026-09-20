// SubmitScoreView.swift
// Changes: keyboard-open sheet matches Android — compact header (no
// ShellChrome.header), one recap line, call-sign field, Submit docked
// above the IME. Idle keeps stacked stats. Paper wash stays full screen.
// ScrollView is overflow insurance for SE + large keyboards.

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
    var onDone: (_ callSign: String) -> Void
    var onCancel: () -> Void

    @State private var name = UserDefaults.standard.string(forKey: "playerName") ?? ""
    @State private var error = ""
    @State private var busy = false
    @State private var keyboardHeight: CGFloat = 0
    @FocusState private var nameFocused: Bool

    private var compact: Bool { keyboardHeight > 40 }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                BrandColors.paper.ignoresSafeArea()
                VStack(spacing: 0) {
                    if compact {
                        keyboardSheet(minHeight: max(280, geo.size.height - keyboardHeight - 16))
                    } else {
                        Spacer(minLength: 12)
                        idleCard
                        Spacer(minLength: 0)
                    }
                }
                .padding(.bottom, keyboardHeight)
                .animation(.easeOut(duration: 0.22), value: keyboardHeight)
            }
        }
        .safeAreaPadding(.top)
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .onReceive(keyboardFrame) { frame in
            let screen = UIScreen.main.bounds
            keyboardHeight = max(0, screen.intersection(frame).height)
        }
    }

    private func keyboardSheet(minHeight: CGFloat) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                compactHeader
                recapLine
                    .padding(.top, 20)
                ShellChrome.dottedRule()
                    .padding(.vertical, 20)
                callSignBlock
                if !error.isEmpty {
                    Text(error)
                        .font(BrandType.body(14))
                        .foregroundStyle(BrandColors.signal)
                        .padding(.top, 8)
                }
                Spacer(minLength: 24)
                submitButton
            }
            .padding(24)
            .frame(maxWidth: .infinity, minHeight: minHeight, alignment: .topLeading)
            .background(BrandColors.paperTint)
            .overlay {
                Rectangle().stroke(BrandColors.ink, lineWidth: 1.5)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
    }

    private var idleCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            compactHeader
            ShellChrome.statColumn(value: ScoreService.formatScore(score), label: "KM")
                .frame(maxWidth: .infinity)
                .padding(.top, 20)
            HStack(spacing: 0) {
                ShellChrome.statColumn(value: ScoreService.formatScore(destroyed), label: "ASTEROIDS")
                Rectangle()
                    .fill(BrandColors.ink.opacity(0.12))
                    .frame(width: 1, height: 44)
                ShellChrome.statColumn(value: rank, label: "YOUR RANK")
            }
            .padding(.top, 16)
            ShellChrome.dottedRule()
                .padding(.vertical, 20)
            callSignBlock
            if !error.isEmpty {
                Text(error)
                    .font(BrandType.body(14))
                    .foregroundStyle(BrandColors.signal)
                    .padding(.top, 8)
            }
            submitButton
                .padding(.top, 18)
        }
        .padding(24)
        .background(BrandColors.paperTint)
        .overlay {
            Rectangle().stroke(BrandColors.ink, lineWidth: 1.5)
        }
        .padding(.horizontal, 20)
    }

    private var compactHeader: some View {
        HStack(alignment: .center, spacing: 12) {
            Text("SUBMIT SIGNAL")
                .font(BrandType.label(12))
                .tracking(BrandType.labelTracking(12))
                .foregroundStyle(BrandColors.ink)
            Spacer(minLength: 8)
            Button(action: onCancel) {
                Text("✕")
                    .font(BrandType.body(18))
                    .foregroundStyle(BrandColors.ink)
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Close")
        }
    }

    private var recapLine: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("\(ScoreService.formatScore(score)) KM  ·  \(ScoreService.formatScore(destroyed))  ·  \(rank)")
                .font(BrandType.mono(16))
                .foregroundStyle(BrandColors.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text("DISTANCE  ·  ASTEROIDS  ·  RANK")
                .font(BrandType.label(9))
                .tracking(BrandType.labelTracking(9))
                .foregroundStyle(BrandColors.ink55)
        }
    }

    private var callSignBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
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
                .padding(.vertical, 10)
                .frame(minHeight: 48, alignment: .bottom)
                .overlay(alignment: .bottom) {
                    Rectangle().fill(BrandColors.ink).frame(height: 1.5)
                }
                .onChange(of: name) { _, next in
                    if next.count > NameFilter.maxLength {
                        name = String(next.prefix(NameFilter.maxLength))
                    }
                }
        }
    }

    private var submitButton: some View {
        ShellChrome.brandButton(
            busy ? "Sending" : "Submit",
            tag: "↑",
            primary: true
        ) {
            Task { await submit() }
        }
        .disabled(busy)
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
            onDone(name)
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "Could not submit. Try again."
        }
    }
}
