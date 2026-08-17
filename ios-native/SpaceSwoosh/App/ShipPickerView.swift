// ShipPickerView.swift
// Changes: Brand type + selected tile (signal inset + dot) like Android hangar.

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
            ShellChrome.screenBlurb("Same trajectory. Different vessel.")
            ScrollView {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(SkinCatalog.roster, id: \.self) { id in
                        tile(SkinCatalog.def(id))
                    }
                }
            }
            ShellChrome.footnote("SCROLL · TAP A SHIP")
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
            ShellChrome.framedTile(selected: selected) {
                VStack(spacing: 8) {
                    Image(uiImage: ShipArt.preview(skin.id))
                        .resizable()
                        .interpolation(.high)
                        .scaledToFit()
                        .frame(width: 72, height: 118)
                    Text(skin.name.uppercased())
                        .font(BrandType.label(12))
                        .tracking(BrandType.labelTracking(12))
                    Text(skin.blurb)
                        .font(BrandType.body(12))
                        .foregroundStyle(BrandColors.ink55)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .foregroundStyle(BrandColors.ink)
                .frame(maxWidth: .infinity, minHeight: 182)
            }
            .padding(0)
        }
        .buttonStyle(.plain)
    }
}
