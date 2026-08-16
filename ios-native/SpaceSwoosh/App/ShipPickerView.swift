// ShipPickerView.swift
// Changes: Options tiles show the short hangar wake above the name.

import SwiftUI
import UIKit

struct ShipPickerView: View {
    var onBack: () -> Void
    @ObservedObject private var settings = SettingsStore.shared

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            ShellChrome.header("SHIP", back: onBack)
            Text("Same trajectory. Different vessel.")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(BrandColors.ink55)
                .frame(maxWidth: .infinity)
            ScrollView {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(SkinCatalog.roster, id: \.self) { id in
                        tile(SkinCatalog.def(id))
                    }
                }
            }
            Text("TAP A SHIP")
                .font(.system(size: 11, weight: .medium, design: .monospaced))
                .foregroundStyle(BrandColors.ink55)
                .frame(maxWidth: .infinity)
                .padding(.bottom, 8)
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }

    private func tile(_ skin: SkinDef) -> some View {
        let selected = settings.shipSkinId == skin.id
        return Button {
            settings.setShipSkin(skin.id)
        } label: {
            VStack(spacing: 8) {
                Image(uiImage: ShipArt.preview(skin.id))
                    .resizable()
                    .interpolation(.high)
                    .scaledToFit()
                    .frame(width: 72, height: 118)
                Text(skin.name.uppercased())
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                Text(skin.blurb)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(BrandColors.ink55)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .foregroundStyle(BrandColors.ink)
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: 214)
            .background(selected ? BrandColors.paperDeep : BrandColors.paperTint)
            .overlay(
                Rectangle()
                    .stroke(selected ? BrandColors.signal : BrandColors.ink, lineWidth: selected ? 2 : 1.5)
            )
        }
        .buttonStyle(.plain)
    }
}
