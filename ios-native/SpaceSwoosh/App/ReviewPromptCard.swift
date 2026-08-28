// ReviewPromptCard.swift
// Paper overlay: enjoying Space Swoosh so far?
// Changes: Created — It's great calls StoreKit requestReview on that tap.

import SwiftUI
import StoreKit

struct ReviewPromptCard: View {
    var trigger: String
    var onDismiss: () -> Void

    @Environment(\.requestReview) private var requestReview

    var body: some View {
        ShellChrome.paperWash {
            VStack(spacing: 16) {
                Spacer()
                Text("Enjoying Space Swoosh so far?")
                    .font(BrandType.display(26))
                    .tracking(BrandType.displayTracking(26))
                    .foregroundStyle(BrandColors.ink)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 28)
                ShellChrome.divider()
                    .padding(.horizontal, 28)
                VStack(spacing: 12) {
                    ShellChrome.brandButton("It's great", tag: "▶", primary: true) {
                        ReviewPromptStore.respond("yes", trigger: trigger)
                        requestReview()
                        onDismiss()
                    }
                    ShellChrome.brandButton("Not really", tag: "—") {
                        ReviewPromptStore.respond("no", trigger: trigger)
                        onDismiss()
                    }
                    ShellChrome.brandButton("Later", tag: "…") {
                        ReviewPromptStore.respond("later", trigger: trigger)
                        onDismiss()
                    }
                }
                .padding(.horizontal, 28)
                .padding(.bottom, 28)
                Spacer()
            }
        }
    }
}
