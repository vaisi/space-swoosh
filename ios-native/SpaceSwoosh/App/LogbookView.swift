// LogbookView.swift
// Changes: SPACE LOG header + Grotesk/Mono chrome matching Android logbook.
// Obstacles/Boosts (and all tabs) list only unlocked cards — filter before
// ForEach so locked EmptyViews do not add VStack gaps.

import SwiftUI

struct LogbookView: View {
    var onBack: () -> Void

    @ObservedObject private var store = LogbookStore.shared
    @State private var category = "obstacles"

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ShellChrome.header("SPACE LOG", back: onBack)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(LogbookCatalog.categories, id: \.id) { item in
                        Button {
                            category = item.id
                        } label: {
                            VStack(spacing: 4) {
                                Text(item.label.uppercased())
                                    .font(BrandType.label(11))
                                    .tracking(BrandType.labelTracking(11))
                                    .foregroundStyle(category == item.id ? BrandColors.ink : BrandColors.ink55)
                                if category == item.id {
                                    ShellChrome.dottedRule().frame(width: 48)
                                } else {
                                    Color.clear.frame(height: 4)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            let rows = LogbookCatalog.entries(in: category).filter {
                LogbookProgress.state(store.snapshot, id: $0.id) != .locked
            }
            if rows.isEmpty {
                Text(GeneratedJourneyData.emptyCategory[category] ?? GeneratedJourneyData.emptyLogbook)
                    .font(BrandType.body(14))
                    .foregroundStyle(BrandColors.ink55)
                    .padding(.top, 12)
                Spacer()
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        ForEach(rows, id: \.id) { entry in
                            entryCard(entry)
                        }
                    }
                    .padding(.bottom, 24)
                }
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }

    @ViewBuilder
    private func entryCard(_ entry: LogbookEntrySpec) -> some View {
        let state = LogbookProgress.state(store.snapshot, id: entry.id)
        if state != .locked {
            ShellChrome.framedTile {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(entry.name.uppercased())
                            .font(BrandType.label(12))
                            .tracking(BrandType.labelTracking(12))
                        Spacer()
                        Text(state == .known ? "KNOWN" : "OBSERVED")
                            .font(BrandType.label(9))
                            .tracking(BrandType.labelTracking(9))
                            .foregroundStyle(BrandColors.signal)
                    }
                    if state == .known {
                        Text(entry.definition)
                            .font(BrandType.body(14))
                        Text(entry.remark)
                            .font(BrandType.body(13))
                            .foregroundStyle(BrandColors.ink55)
                    } else {
                        Text(pendingLine(for: entry.id))
                            .font(BrandType.body(14))
                            .foregroundStyle(BrandColors.ink55)
                    }
                }
                .foregroundStyle(BrandColors.ink)
            }
        }
    }

    private func pendingLine(for id: String) -> String {
        let lines = GeneratedJourneyData.observedPending
        guard !lines.isEmpty else { return "Observed." }
        let idx = abs(id.hashValue) % lines.count
        return lines[idx]
    }
}
