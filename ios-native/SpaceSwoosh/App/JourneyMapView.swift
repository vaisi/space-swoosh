// JourneyMapView.swift
// Changes: dropped the header TEST chip (UNLOCK_ALL_LEVELS still unlocks tiles).
// 5-column grid and tileH = tileW × 1.15 (Android JourneyMapScreen).
// Hazard Lab is a same-size centered LAB tile, not a full-width banner.

import SwiftUI

struct JourneyMapView: View {
    var onBack: () -> Void
    var onLogbook: () -> Void
    var onPlay: (PlayLaunch) -> Void

    @ObservedObject private var store = JourneyStore.shared

    private let tileGap: CGFloat = 10
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 5)

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            ShellChrome.header("JOURNEY", back: onBack)
            HStack {
                Button(action: onLogbook) {
                    Text("SPACE LOG")
                        .font(BrandType.label(11))
                        .tracking(BrandType.labelTracking(11))
                        .foregroundStyle(BrandColors.ink)
                }
                .buttonStyle(.plain)
                Spacer()
                HStack(spacing: 6) {
                    Text("\(JourneyProgress.totalStars(store.snapshot)) / \(JourneyConfig.totalStars)")
                        .font(BrandType.label(11))
                        .tracking(BrandType.labelTracking(11))
                        .foregroundStyle(BrandColors.ink55)
                    SparkleIcon()
                        .fill(BrandColors.signal)
                        .frame(width: 12, height: 12)
                }
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    labSection
                    ForEach(JourneyConfig.chapters, id: \.id) { chapter in
                        VStack(alignment: .leading, spacing: 10) {
                            chapterHeading(chapter)
                            LazyVGrid(columns: columns, spacing: tileGap) {
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

    private func chapterHeading(_ chapter: JourneyChapter) -> some View {
        sectionHeading(
            chapter.name.uppercased(),
            range: "\(chapter.from)–\(chapter.to)",
            locked: !JourneyProgress.isUnlocked(store.snapshot, level: chapter.from)
        )
    }

    private func sectionHeading(_ name: String, range: String, locked: Bool) -> some View {
        HStack(spacing: 8) {
            Text(name)
                .font(BrandType.label(11))
                .tracking(BrandType.labelTracking(11))
                .foregroundStyle(locked ? BrandColors.ink.opacity(0.30) : BrandColors.ink)
            ShellChrome.dottedRule()
            Text(range)
                .font(BrandType.mono(10, bold: false))
                .foregroundStyle(BrandColors.ink.opacity(0.30))
        }
    }

    private var labSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeading("HAZARD LAB", range: "LAB", locked: false)
            HStack {
                Spacer(minLength: 0)
                labTile
                    .containerRelativeFrame(.horizontal, count: 5, span: 1, spacing: tileGap)
                Spacer(minLength: 0)
            }
        }
    }

    private var labTile: some View {
        Button {
            onPlay(.hazardLab)
        } label: {
            VStack(spacing: 4) {
                Spacer(minLength: 0)
                Text("LAB")
                    .font(BrandType.mono(18))
                Text("TEST")
                    .font(BrandType.label(9))
                    .tracking(BrandType.labelTracking(9))
                    .foregroundStyle(BrandColors.signal)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .foregroundStyle(BrandColors.ink)
            .background(BrandColors.paperTint)
            .overlay {
                Rectangle()
                    .stroke(BrandColors.signal, lineWidth: 1.5)
            }
            .overlay {
                Rectangle()
                    .stroke(BrandColors.signal, lineWidth: 2)
                    .padding(3)
            }
        }
        .buttonStyle(.plain)
        .aspectRatio(1 / 1.15, contentMode: .fit)
    }

    private func levelTile(_ level: Int) -> some View {
        let unlocked = JourneyProgress.isUnlocked(store.snapshot, level: level)
        let current = level == JourneyProgress.nextPlayable(store.snapshot)
        let spec = JourneyConfig.level(level)
        let stars = JourneyProgress.entry(store.snapshot, level: level).stars
        return Button {
            if unlocked { onPlay(.journey(level)) }
        } label: {
            VStack(spacing: 6) {
                Spacer(minLength: 0)
                Text("\(level)")
                    .font(BrandType.mono(20))
                HStack(spacing: 3) {
                    ForEach(0..<spec.starSlots, id: \.self) { i in
                        SparkleIcon()
                            .fill(stars[i] ? BrandColors.signal : Color.clear)
                            .overlay(
                                SparkleIcon().stroke(
                                    stars[i] ? BrandColors.signal : BrandColors.ink.opacity(unlocked ? 0.30 : 0.12),
                                    lineWidth: 1
                                )
                            )
                            .frame(width: 9, height: 9)
                    }
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .foregroundStyle(unlocked ? BrandColors.ink : BrandColors.ink.opacity(0.30))
            .background(unlocked ? (current ? BrandColors.paperDeep : BrandColors.paperTint) : BrandColors.paper)
            .overlay {
                Rectangle()
                    .stroke(
                        current ? BrandColors.signal : (unlocked ? BrandColors.ink : BrandColors.ink.opacity(0.12)),
                        lineWidth: current ? 2 : 1.5
                    )
            }
            .overlay {
                if current {
                    Rectangle()
                        .stroke(BrandColors.signal, lineWidth: 2)
                        .padding(3)
                }
            }
        }
        .disabled(!unlocked)
        .buttonStyle(.plain)
        .aspectRatio(1 / 1.15, contentMode: .fit)
    }
}
