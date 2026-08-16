// ShellChrome.swift
// Changes: Android framed buttons, header+divider, pause glyph, paper wash.

import SwiftUI

enum ShellChrome {
    static func header(_ title: String, back: @escaping () -> Void) -> some View {
        VStack(spacing: 10) {
            ZStack {
                Text(title)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(BrandColors.ink)
                    .tracking(1.2)
                HStack {
                    Button(action: back) {
                        Text("BACK")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(BrandColors.ink)
                    }
                    Spacer()
                }
            }
            .padding(.horizontal, 4)
            divider()
        }
    }

    static func divider() -> some View {
        Rectangle()
            .fill(BrandColors.ink.opacity(0.12))
            .frame(height: 1)
    }

    static func brandButton(
        _ title: String,
        tag: String? = nil,
        primary: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 0) {
                Text(title.uppercased())
                    .font(.system(size: 17, weight: .semibold))
                    .tracking(1.1)
                    .foregroundStyle(primary ? BrandColors.paper : BrandColors.ink)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                if let tag {
                    Rectangle()
                        .fill(primary ? BrandColors.paper.opacity(0.25) : BrandColors.ink.opacity(0.12))
                        .frame(width: 1, height: 28)
                    Text(tag)
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                        .foregroundStyle(primary ? BrandColors.paper.opacity(0.85) : BrandColors.ink55)
                        .frame(width: 52)
                }
            }
            .background(primary ? BrandColors.ink : BrandColors.paperTint)
            .overlay(
                Rectangle()
                    .stroke(BrandColors.ink, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
    }

    static func ghostButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title.uppercased())
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundStyle(BrandColors.ink)
        }
        .buttonStyle(.plain)
    }

    static func framedTile<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(BrandColors.paperTint)
            .overlay(
                Rectangle()
                    .stroke(BrandColors.ink, lineWidth: 1.5)
            )
    }

    static func paperWash<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        ZStack {
            BrandColors.paper.opacity(0.92).ignoresSafeArea()
            content()
        }
    }

    static func pauseTitle() -> some View {
        VStack(spacing: 12) {
            HStack(spacing: 8) {
                Rectangle().fill(BrandColors.ink).frame(width: 10, height: 36)
                Rectangle().fill(BrandColors.ink).frame(width: 10, height: 36)
            }
            Text("MISSION PAUSED")
                .font(.system(size: 26, weight: .bold))
                .foregroundStyle(BrandColors.ink)
                .tracking(1.4)
        }
    }

    static func statColumn(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 22, weight: .bold, design: .monospaced))
                .foregroundStyle(BrandColors.ink)
            Text(label.uppercased())
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(BrandColors.ink55)
        }
        .frame(maxWidth: .infinity)
    }
}

struct FlickerPreview: View {
    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                ForEach(0..<5, id: \.self) { i in
                    Capsule()
                        .fill(BrandColors.ink.opacity(0.18 - Double(i) * 0.03))
                        .frame(width: 10 + CGFloat(i) * 3, height: 18 + CGFloat(i) * 8)
                        .offset(y: 28 + CGFloat(i) * 14)
                }
                Image(uiImage: FlickerHullTexture.makeImage(logicalRadius: 22, scale: 2))
                    .resizable()
                    .interpolation(.high)
                    .scaledToFit()
                    .frame(width: 88, height: 88)
            }
            .frame(height: 150)
            Text("FLICKER")
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundStyle(BrandColors.ink80)
        }
    }
}
