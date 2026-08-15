// JourneyMapView.swift
// Changes: Slice E — chapter tiles, star pips, always-unlocked Hazard Lab.

import SwiftUI

struct JourneyMapView: View {
    var onBack: () -> Void
    var onLogbook: () -> Void
    var onPlay: (PlayLaunch) -> Void

    @ObservedObject private var store = JourneyStore.shared

    private let columns = [GridItem(.adaptive(minimum: 72), spacing: 10)]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            ShellChrome.header("JOURNEY", back: onBack)
            HStack {
                Button(action: onLogbook) {
                    Text("LOGBOOK")
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundStyle(BrandColors.ink)
                }
                Spacer()
                Text("\(JourneyProgress.totalStars(store.snapshot)) / \(JourneyConfig.totalStars)")
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .foregroundStyle(BrandColors.ink55)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    labTile
                    ForEach(JourneyConfig.chapters, id: \.id) { chapter in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(chapter.name.uppercased())
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundStyle(BrandColors.ink55)
                            Text("\(chapter.from)–\(chapter.to)")
                                .font(.system(size: 10, weight: .medium, design: .monospaced))
                                .foregroundStyle(BrandColors.ink80)
                            LazyVGrid(columns: columns, spacing: 10) {
                                ForEach(chapter.from...chapter.to, id: \.self) { level in
                                    levelTile(level)
                                }
                            }
                        }
                    }
                }
                .padding(.bottom, 24)
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }

    private var labTile: some View {
        Button {
            onPlay(.hazardLab)
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("HAZARD LAB")
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                    Text("Practice only — nothing counts.")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(BrandColors.ink55)
                }
                Spacer()
                Text("LAB")
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
            }
            .foregroundStyle(BrandColors.ink)
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(BrandColors.paperTint)
        }
    }

    private func levelTile(_ level: Int) -> some View {
        let unlocked = JourneyProgress.isUnlocked(store.snapshot, level: level)
        let spec = JourneyConfig.level(level)
        let stars = JourneyProgress.entry(store.snapshot, level: level).stars
        return Button {
            if unlocked { onPlay(.journey(level)) }
        } label: {
            VStack(spacing: 6) {
                Text("\(level)")
                    .font(.system(size: 16, weight: .bold, design: .monospaced))
                HStack(spacing: 3) {
                    ForEach(0..<spec.starSlots, id: \.self) { i in
                        Circle()
                            .stroke(BrandColors.signal, lineWidth: 1.2)
                            .background(Circle().fill(stars[i] ? BrandColors.signal : Color.clear))
                            .frame(width: 7, height: 7)
                    }
                }
            }
            .foregroundStyle(BrandColors.ink)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(BrandColors.paperTint)
            .opacity(unlocked ? 1 : 0.4)
        }
        .disabled(!unlocked)
    }
}
