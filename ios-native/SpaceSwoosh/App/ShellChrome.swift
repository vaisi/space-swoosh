// ShellChrome.swift
// Changes: Android BrandDraw chrome — Grotesk/Mono, ← Back, dotted rules, signal tiles.
// brandButton `disabled` is the decommissioned Arc row (dim ink, tag OUT).
// @ViewBuilder so the disabled modifier is part of the returned view (Xcode 26).

import SwiftUI
import UIKit

enum ShellChrome {
    static func header(
        _ title: String,
        back: @escaping () -> Void,
        trailingTitle: String? = nil,
        trailingTag: String? = nil,
        trailing: (() -> Void)? = nil
    ) -> some View {
        VStack(spacing: 12) {
            ZStack {
                Text(title)
                    .font(BrandType.display(22))
                    .tracking(BrandType.displayTracking(22))
                    .foregroundStyle(BrandColors.ink)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, trailingTitle == nil ? 72 : 96)
                HStack(alignment: .center, spacing: 8) {
                    Button(action: back) {
                        Text("← Back")
                            .font(BrandType.body(13))
                            .foregroundStyle(BrandColors.ink55)
                    }
                    .buttonStyle(.plain)
                    Spacer()
                    if let trailingTitle, let trailing {
                        compactButton(trailingTitle, tag: trailingTag, action: trailing)
                    }
                }
            }
            dottedRule()
        }
    }

    static func compactButton(_ title: String, tag: String? = nil, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 0) {
                Text(title.uppercased())
                    .font(BrandType.ui(11))
                    .tracking(BrandType.uiTracking(11))
                    .foregroundStyle(BrandColors.ink)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 8)
                if let tag {
                    Rectangle()
                        .fill(BrandColors.ink.opacity(0.12))
                        .frame(width: 1, height: 16)
                    Text(tag)
                        .font(BrandType.mono(11))
                        .foregroundStyle(BrandColors.ink55)
                        .frame(width: 22)
                }
            }
            .background(BrandColors.paperTint)
            .overlay(Rectangle().stroke(BrandColors.ink, lineWidth: 1.5))
        }
        .buttonStyle(.plain)
    }

    static func divider() -> some View {
        dottedRule()
    }

    static func dottedRule() -> some View {
        DottedRule()
            .frame(height: 4)
    }

    @ViewBuilder
    static func brandButton(
        _ title: String,
        tag: String? = nil,
        primary: Bool = false,
        signal: Bool = false,
        disabled: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        let lit = primary && !disabled
        Button(action: { if !disabled { action() } }) {
            HStack(spacing: 0) {
                Text(title.uppercased())
                    .font(BrandType.ui(17))
                    .tracking(BrandType.uiTracking(17))
                    .foregroundStyle(disabled ? BrandColors.ink30 : (lit ? BrandColors.paper : BrandColors.ink))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                if let tag {
                    Rectangle()
                        .fill(lit ? BrandColors.paper.opacity(0.25) : BrandColors.ink.opacity(0.12))
                        .frame(width: 1, height: 28)
                    Text(tag)
                        .font(BrandType.mono(14))
                        .foregroundStyle(disabled ? BrandColors.ink30 : (lit ? BrandColors.paper.opacity(0.85) : BrandColors.ink55))
                        .frame(width: 52)
                }
            }
            .background(lit ? BrandColors.ink : BrandColors.paperTint)
            .overlay(
                Rectangle()
                    .stroke(
                        disabled ? BrandColors.ink.opacity(0.12) : (signal ? BrandColors.signal : BrandColors.ink),
                        lineWidth: 1.5
                    )
            )
        }
        .buttonStyle(.plain)
        .disabled(disabled)
    }

    static func ghostButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title.uppercased())
                .font(BrandType.mono(13))
                .foregroundStyle(BrandColors.ink)
        }
        .buttonStyle(.plain)
    }

    static func framedTile<Content: View>(
        signal: Bool = false,
        selected: Bool = false,
        @ViewBuilder content: () -> Content
    ) -> some View {
        content()
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(selected ? BrandColors.paperDeep : BrandColors.paperTint)
            .overlay {
                Rectangle()
                    .stroke(signal || selected ? BrandColors.signal : BrandColors.ink, lineWidth: selected ? 2 : 1.5)
            }
            .overlay {
                if selected {
                    Rectangle()
                        .stroke(BrandColors.signal, lineWidth: 2)
                        .padding(4)
                }
            }
            .overlay(alignment: .topTrailing) {
                if selected {
                    Circle()
                        .fill(BrandColors.signal)
                        .frame(width: 8, height: 8)
                        .padding(8)
                }
            }
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
                .font(BrandType.display(26))
                .tracking(BrandType.displayTracking(26))
                .foregroundStyle(BrandColors.ink)
        }
    }

    static func statColumn(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(BrandType.mono(22))
                .foregroundStyle(BrandColors.ink)
            Text(label.uppercased())
                .font(BrandType.label(10))
                .tracking(BrandType.labelTracking(10))
                .foregroundStyle(BrandColors.ink55)
        }
        .frame(maxWidth: .infinity)
    }

    static func screenBlurb(_ text: String) -> some View {
        Text(text)
            .font(BrandType.body(14))
            .foregroundStyle(BrandColors.ink55)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
    }

    static func footnote(_ text: String) -> some View {
        Text(text)
            .font(BrandType.label(10))
            .tracking(BrandType.labelTracking(10))
            .foregroundStyle(BrandColors.ink.opacity(0.30))
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
    }
}

private struct DottedRule: View {
    var body: some View {
        Canvas { ctx, size in
            let r: CGFloat = 1.3
            var x: CGFloat = r
            while x < size.width {
                let rect = CGRect(x: x - r, y: (size.height - r * 2) / 2, width: r * 2, height: r * 2)
                ctx.fill(Path(ellipseIn: rect), with: .color(BrandColors.ink30))
                x += 8
            }
        }
        .accessibilityHidden(true)
    }
}

enum ShipArt {
    private static var cache: [String: UIImage] = [:]

    static func preview(_ id: SkinId) -> UIImage {
        let key = "\(id.rawValue)-\(SettingsStore.shared.isDark)-wake"
        if let hit = cache[key] { return hit }
        let def = SkinCatalog.def(id)
        let scale: CGFloat = 2
        let r = 22 * scale
        let width = ceil(r * 5.4)
        let height = ceil(r * 6.8)
        let bounds = CGSize(width: width, height: height)
        let renderer = UIGraphicsImageRenderer(size: bounds)
        let img = renderer.image { ctx in
            let cg = ctx.cgContext
            cg.setFillColor(UIColor.clear.cgColor)
            cg.fill(CGRect(origin: .zero, size: bounds))
            let cx = width / 2
            let cy = r * 1.55
            PreviewWakePaint.draw(def, onto: cg, cx: cx, cy: cy, radius: r)
            cg.saveGState()
            cg.translateBy(x: cx, y: cy)
            cg.rotate(by: PreviewWakePaint.bank)
            if def.skipHullCache {
                LiveHullPaint.draw(
                    id, onto: CGLiveCanvas(cg), radius: r,
                    turn: PreviewWakePaint.turn, nowMs: LiveHullPaint.previewTimeMs,
                    jellyLive: false, shake: 0, alpha: 1
                )
            } else {
                ClassicHullPaint.draw(
                    id, onto: CGLiveCanvas(cg), radius: r,
                    turn: PreviewWakePaint.turn, nowMs: ClassicHullPaint.previewTimeMs,
                    jellyLive: false, shake: 0, alpha: 1
                )
            }
            cg.restoreGState()
        }
        cache[key] = img
        return img
    }
}

struct ShipPreview: View {
    @ObservedObject private var settings = SettingsStore.shared

    var body: some View {
        let skin = SkinCatalog.def(settings.shipSkinId)
        VStack(spacing: 6) {
            HStack(spacing: 18) {
                Button {
                    settings.setShipSkin(SkinCatalog.prev(before: settings.shipSkinId))
                } label: {
                    Text("◀")
                        .font(BrandType.mono(22))
                        .foregroundStyle(BrandColors.ink)
                        .frame(width: 36, height: 44)
                }
                .buttonStyle(.plain)
                Image(uiImage: ShipArt.preview(settings.shipSkinId))
                    .resizable()
                    .interpolation(.high)
                    .scaledToFit()
                    .frame(width: 88, height: 150)
                Button {
                    settings.setShipSkin(SkinCatalog.next(after: settings.shipSkinId))
                } label: {
                    Text("▶")
                        .font(BrandType.mono(22))
                        .foregroundStyle(BrandColors.ink)
                        .frame(width: 36, height: 44)
                }
                .buttonStyle(.plain)
            }
            Text(skin.name.uppercased())
                .font(BrandType.label(11))
                .tracking(BrandType.labelTracking(11))
                .foregroundStyle(BrandColors.ink80)
        }
    }
}
