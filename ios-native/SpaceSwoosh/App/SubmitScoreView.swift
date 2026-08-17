// SubmitScoreView.swift
// Changes: Android Submit Signal card — call sign, rank, insert into high_scores.

import SwiftUI

struct SubmitScoreView: View {
    var score: Int
    var destroyed: Int
    var rank: String
    var shipId: SkinId
    var style: FlightStyle
    var onDone: () -> Void
    var onCancel: () -> Void

    @State private var name = UserDefaults.standard.string(forKey: "playerName") ?? ""
    @State private var error = ""
    @State private var busy = false

    var body: some View {
        ShellChrome.paperWash {
            VStack(alignment: .leading, spacing: 16) {
                ShellChrome.header("SUBMIT SIGNAL", back: onCancel)
                ShellChrome.statColumn(value: ScoreService.formatScore(score), label: "KM")
                    .frame(maxWidth: .infinity)
                HStack(spacing: 0) {
                    ShellChrome.statColumn(value: ScoreService.formatScore(destroyed), label: "ASTEROIDS")
                    Rectangle()
                        .fill(BrandColors.ink.opacity(0.12))
                        .frame(width: 1, height: 44)
                    ShellChrome.statColumn(value: rank, label: "YOUR RANK")
                }
                ShellChrome.dottedRule()
                Text("CALL SIGN")
                    .font(BrandType.label(10))
                    .tracking(BrandType.labelTracking(10))
                    .foregroundStyle(BrandColors.ink55)
                TextField("", text: $name)
                    .font(BrandType.body(18))
                    .foregroundStyle(BrandColors.ink)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .submitLabel(.done)
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
                Spacer()
                ShellChrome.brandButton(
                    busy ? "Sending" : "Submit",
                    tag: "↑",
                    primary: true
                ) {
                    Task { await submit() }
                }
                .disabled(busy)
                .padding(.bottom, 24)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
        }
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
            onDone()
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "Could not submit. Try again."
        }
    }
}
