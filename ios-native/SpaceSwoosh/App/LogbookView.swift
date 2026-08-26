// LogbookView.swift
// Changes: SPACE LOG header + Grotesk/Mono chrome matching Android logbook.
// Obstacles/Boosts list only observed/known cards (no locked placeholders or
// EmptyView gaps). Journey still lists named days. Tabs are filled ink rects
// like Android LogbookScreen.

import SwiftUI

struct LogbookView: View {
    var onBack: () -> Void

    @ObservedObject private var store = LogbookStore.shared
    @State private var category = "obstacles"

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ShellChrome.header("SPACE LOG", back: onBack)
            HStack(spacing: 6) {
                ForEach(LogbookCatalog.categories, id: \.id) { item in
                    let active = category == item.id
                    Button {
                        category = item.id
                    } label: {
                        Text(shortLabel(item))
                            .font(BrandType.label(10))
                            .tracking(BrandType.labelTracking(10))
                            .foregroundStyle(active ? BrandColors.paper : BrandColors.ink55)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(active ? BrandColors.ink : BrandColors.paperTint)
                            .overlay {
                                Rectangle()
                                    .stroke(BrandColors.ink, lineWidth: 1.5)
                            }
                    }
                    .buttonStyle(.plain)
                }
            }

            let rows = visibleRows(in: category)
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

    /// Journey keeps named day rows; Obstacles/Boosts hide locked placeholders.
    private func visibleRows(in category: String) -> [LogbookEntrySpec] {
        let catalog = LogbookCatalog.entries(in: category)
        if category == "levels" {
            return catalog
        }
        return catalog.filter { LogbookProgress.state(store.snapshot, id: $0.id) != .locked }
    }

    private func shortLabel(_ item: LogbookCategorySpec) -> String {
        if item.id == "void" { return "VOID" }
        return item.label.uppercased()
    }

    @ViewBuilder
    private func entryCard(_ entry: LogbookEntrySpec) -> some View {
        let state = LogbookProgress.state(store.snapshot, id: entry.id)
        let journeyTab = category == "levels"
        ShellChrome.framedTile(signal: state == .known) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(entry.name.uppercased())
                        .font(BrandType.label(12))
                        .tracking(BrandType.labelTracking(12))
                        .foregroundStyle(state == .locked ? BrandColors.ink.opacity(0.30) : BrandColors.ink)
                    Spacer()
                    if !journeyTab, state != .locked {
                        Text(state == .known ? "KNOWN" : "OBSERVED")
                            .font(BrandType.label(9))
                            .tracking(BrandType.labelTracking(9))
                            .foregroundStyle(BrandColors.signal)
                    }
                }
                if state == .known {
                    Text(entry.definition)
                        .font(BrandType.body(14))
                    if !journeyTab {
                        Text(entry.remark)
                            .font(BrandType.body(13))
                            .foregroundStyle(BrandColors.ink55)
                    }
                } else if state != .locked {
                    Text(pendingLine(for: entry.id))
                        .font(BrandType.body(14))
                        .foregroundStyle(BrandColors.ink55)
                }
            }
            .foregroundStyle(BrandColors.ink)
        }
    }

    private func pendingLine(for id: String) -> String {
        let lines = GeneratedJourneyData.observedPending
        guard !lines.isEmpty else { return "Observed." }
        let idx = abs(id.hashValue) % lines.count
        return lines[idx]
    }
}
