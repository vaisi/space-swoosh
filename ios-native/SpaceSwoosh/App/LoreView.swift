// LoreView.swift
// Changes: Slice E — one-time Signal Story brief before the Journey map.

import SwiftUI

struct LoreView: View {
    var onBack: () -> Void
    var onContinue: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            ShellChrome.header("SIGNAL", back: onBack)
            Spacer()
            Text(GeneratedJourneyData.lore)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(BrandColors.ink)
                .lineSpacing(6)
            Spacer()
            ShellChrome.inkButton("CONTINUE") {
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
