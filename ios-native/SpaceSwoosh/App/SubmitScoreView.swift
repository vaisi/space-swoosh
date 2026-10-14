// SubmitScoreView.swift
// Changes: one card for idle and keyboard — distance (no KM) and the call
// sign. No asteroids, rank, or character count. The card stays centered in
// the space above the keyboard. Submit waits for the score-clock task.

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
    var scoreRunTask: Task<String, Never>?
    var onDone: (_ callSign: String) -> Void
    var onCancel: () -> Void

    @State private var name = UserDefaults.standard.string(forKey: "playerName") ?? ""
    @State private var error = ""
    @State private var busy = false
    @State private var keyboardHeight: CGFloat = 0
    @FocusState private var nameFocused: Bool

    var body: some View {
        GeometryReader { geo in
            let avail = max(0, geo.size.height - keyboardHeight)
            ZStack(alignment: .top) {
                NightPaperGround()
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 0) {
                        Spacer(minLength: 0)
                        signalCard
                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity, minHeight: avail)
                }
                .scrollBounceBehavior(.basedOnSize)
                .frame(height: avail)
            }
            .animation(.easeOut(duration: 0.22), value: keyboardHeight)
        }
        .safeAreaPadding(.top)
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .onReceive(keyboardFrame) { frame in
            let screen = UIScreen.main.bounds
            keyboardHeight = max(0, screen.intersection(frame).height)
        }
    }

    private var signalCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            compactHeader
            Text(ScoreService.formatScore(score))
                .font(BrandType.mono(56))
                .foregroundStyle(BrandColors.ink)
                .frame(maxWidth: .infinity)
                .padding(.top, 26)
            Text("DISTANCE")
                .font(BrandType.label(11))
                .tracking(BrandType.labelTracking(11))
                .foregroundStyle(BrandColors.ink55)
                .frame(maxWidth: .infinity)
                .padding(.top, 6)
            ShellChrome.dottedRule()
                .padding(.top, 22)
            callSignBlock
                .padding(.top, 18)
            Text("This is how the Index will remember you.")
                .font(BrandType.body(14))
                .foregroundStyle(BrandColors.ink55)
                .padding(.top, 12)
            if !error.isEmpty {
                Text(error)
                    .font(BrandType.body(14))
                    .foregroundStyle(BrandColors.signal)
                    .padding(.top, 8)
            }
            submitButton
                .padding(.top, 22)
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

    private var callSignBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("CALL SIGN")
                .font(BrandType.label(11))
                .tracking(BrandType.labelTracking(11))
                .foregroundStyle(BrandColors.ink55)
            TextField("ENTER CALL SIGN", text: $name)
                .font(BrandType.ui(28))
                .foregroundStyle(BrandColors.ink)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.done)
                .focused($nameFocused)
                .padding(.vertical, 6)
                .frame(minHeight: 48, alignment: .bottom)
                .overlay(alignment: .bottom) {
                    Rectangle()
                        .fill(nameFocused ? BrandColors.signal : BrandColors.ink.opacity(0.3))
                        .frame(height: 2)
                }
                .onChange(of: name) { _, next in
                    if next.count > NameFilter.maxLength {
                        name = String(next.prefix(NameFilter.maxLength))
                    }
                }
        }
    }

    private var canTransmit: Bool {
        !busy && !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var submitButton: some View {
        Button {
            Task { await submit() }
        } label: {
            Text(busy ? "SENDING" : "TRANSMIT  ↑")
                .font(BrandType.ui(16))
                .tracking(BrandType.uiTracking(16))
                .foregroundStyle(Color(red: 0.06, green: 0.07, blue: 0.09))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(BrandColors.signal.opacity(canTransmit ? 1 : 0.45))
        }
        .buttonStyle(.plain)
        .disabled(!canTransmit)
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
            let runId = await scoreRunTask?.value ?? ""
            try await ScoreService.saveScore(
                score: score,
                name: name,
                destroyed: destroyed,
                shipId: shipId,
                style: style,
                runId: runId
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
