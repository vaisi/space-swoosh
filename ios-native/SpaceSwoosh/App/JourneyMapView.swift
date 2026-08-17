// JourneyMapView.swift
// Changes: Android map chrome — sparkle pips, chapter rules, signal LAB tile.

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
                    Text("SPACE LOG")
                        .font(BrandType.label(11))
                        .tracking(BrandType.labelTracking(11))
                        .foregroundStyle(BrandColors.ink)
                }
                .buttonStyle(.plain)
                Spacer()
                HStack(spacing: 6) {
                    if JourneyProgress.UNLOCK_ALL_LEVELS {
                        Text("TEST")
                            .font(BrandType.label(10))
                            .tracking(BrandType.labelTracking(10))
                            .foregroundStyle(BrandColors.signal)
                    }
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
                    labTile
                    ForEach(JourneyConfig.chapters, id: \.id) { chapter in
                        VStack(alignment: .leading, spacing: 10) {
                            chapterHeading(chapter)
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

    private func chapterHeading(_ chapter: JourneyChapter) -> some View {
        let locked = !JourneyProgress.isUnlocked(store.snapshot, level: chapter.from)
        return HStack(spacing: 8) {
            Text(chapter.name.uppercased())
                .font(BrandType.label(11))
                .tracking(BrandType.labelTracking(11))
                .foregroundStyle(locked ? BrandColors.ink.opacity(0.30) : BrandColors.ink)
            ShellChrome.dottedRule()
            Text("\(chapter.from)–\(chapter.to)")
                .font(BrandType.mono(10, bold: false))
                .foregroundStyle(BrandColors.ink.opacity(0.30))
        }
    }

    private var labTile: some View {
        Button {
            onPlay(.hazardLab)
        } label: {
            ShellChrome.framedTile(signal: true) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("HAZARD LAB")
                            .font(BrandType.label(14))
                            .tracking(BrandType.labelTracking(14))
                        Text("Practice only — nothing counts.")
                            .font(BrandType.body(12))
                            .foregroundStyle(BrandColors.ink55)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("LAB")
                            .font(BrandType.mono(12))
                        Text("TEST")
                            .font(BrandType.label(9))
                            .tracking(BrandType.labelTracking(9))
                            .foregroundStyle(BrandColors.signal)
                    }
                }
                .foregroundStyle(BrandColors.ink)
            }
        }
        .buttonStyle(.plain)
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
                Text("\(level)")
                    .font(BrandType.mono(16))
                HStack(spacing: 3) {
                    ForEach(0..<spec.starSlots, id: \.self) { i in
                        SparkleIcon()
                            .fill(stars[i] ? BrandColors.signal : Color.clear)
                            .overlay(
                                SparkleIcon().stroke(stars[i] ? BrandColors.signal : BrandColors.ink.opacity(0.30), lineWidth: 1)
                            )
                            .frame(width: 8, height: 8)
                    }
                }
            }
            .foregroundStyle(unlocked ? BrandColors.ink : BrandColors.ink.opacity(0.30))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
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
    }
}
