// LoreView.swift
// Changes: Brand type on SIGNAL lore + framed Continue.

import SwiftUI

struct LoreView: View {
    var onBack: () -> Void
    var onContinue: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            ShellChrome.header("SIGNAL", back: onBack)
            Spacer()
            Text(GeneratedJourneyData.lore)
                .font(BrandType.body(16))
                .foregroundStyle(BrandColors.ink)
                .lineSpacing(6)
            Spacer()
            ShellChrome.brandButton("Continue", tag: "▶", primary: true) {
                JourneyStore.shared.markLoreSeen()
                LogbookStore.shared.revealInstant(GeneratedJourneyData.loreEntryId)
                onContinue()
            }
            .padding(.bottom, 12)
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }
}
