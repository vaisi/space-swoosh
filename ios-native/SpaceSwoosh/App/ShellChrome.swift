// ShellChrome.swift
// Changes: Hangar preview bakes short Android wake under the banked hull.

import SwiftUI
import UIKit

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
                HullBake.draw(def.hullKind, onto: cg, cx: 0, cy: 0, r: r)
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
                        .font(.system(size: 22, weight: .bold, design: .monospaced))
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
                        .font(.system(size: 22, weight: .bold, design: .monospaced))
                        .foregroundStyle(BrandColors.ink)
                        .frame(width: 36, height: 44)
                }
                .buttonStyle(.plain)
            }
            Text(skin.name.uppercased())
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundStyle(BrandColors.ink80)
        }
    }
}
