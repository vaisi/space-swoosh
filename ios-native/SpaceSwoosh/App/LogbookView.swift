// LogbookView.swift
// Changes: Slice E — 63-entry catalog with observe / known states.

import SwiftUI

struct LogbookView: View {
    var onBack: () -> Void

    @ObservedObject private var store = LogbookStore.shared
    @State private var category = "obstacles"

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ShellChrome.header("LOGBOOK", back: onBack)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(LogbookCatalog.categories, id: \.id) { item in
                        Button {
                            category = item.id
                        } label: {
                            Text(item.label.uppercased())
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundStyle(category == item.id ? BrandColors.paper : BrandColors.ink)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(category == item.id ? BrandColors.signal : BrandColors.paperTint)
                        }
                    }
                }
            }

            let rows = LogbookCatalog.entries(in: category)
            if rows.allSatisfy({ LogbookProgress.state(store.snapshot, id: $0.id) == .locked }) {
                Text(GeneratedJourneyData.emptyCategory[category] ?? GeneratedJourneyData.emptyLogbook)
                    .font(.system(size: 14, weight: .medium))
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
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(entry.name.uppercased())
                        .font(.system(size: 13, weight: .bold, design: .monospaced))
                    Spacer()
                    Text(state == .known ? "KNOWN" : "OBSERVED")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundStyle(BrandColors.signal)
                }
                if state == .known {
                    Text(entry.definition)
                        .font(.system(size: 14, weight: .medium))
                    Text(entry.remark)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(BrandColors.ink55)
                } else {
                    Text(pendingLine(for: entry.id))
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(BrandColors.ink55)
                }
            }
            .foregroundStyle(BrandColors.ink)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(BrandColors.paperTint)
        }
    }

    private func pendingLine(for id: String) -> String {
        let lines = GeneratedJourneyData.observedPending
        guard !lines.isEmpty else { return "Observed." }
        let idx = abs(id.hashValue) % lines.count
        return lines[idx]
    }
}
