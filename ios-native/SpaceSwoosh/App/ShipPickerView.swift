// ShipPickerView.swift
// Changes: Locked tiles show price / LOCKED and tap-to-buy; owned tiles still equip.

import SwiftUI
import UIKit

struct ShipPickerView: View {
    var onBack: () -> Void
    @ObservedObject private var settings = SettingsStore.shared
    @ObservedObject private var entitlements = EntitlementsStore.shared

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
            if let status = entitlements.statusMessage {
                Text(status.uppercased())
                    .font(BrandType.mono(11))
                    .foregroundStyle(BrandColors.signal)
                    .frame(maxWidth: .infinity)
            }
            ShellChrome.footnote("SCROLL · TAP A SHIP")
                .padding(.bottom, 8)
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }

    private func tile(_ skin: SkinDef) -> some View {
        let owned = entitlements.owns(skin.id)
        let selected = owned && settings.shipSkinId == skin.id
        return Button {
            Task { await handleTap(skin.id, owned: owned) }
        } label: {
            ZStack(alignment: .topTrailing) {
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
                            .foregroundStyle(owned ? BrandColors.ink : BrandColors.ink55)
                        Text(owned ? skin.blurb : "Tap to unlock.")
                            .font(BrandType.body(12))
                            .foregroundStyle(BrandColors.ink55)
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .foregroundStyle(BrandColors.ink)
                    .frame(maxWidth: .infinity, minHeight: 182)
                }
                if !owned {
                    Text((entitlements.priceLabel(for: skin.id) ?? "LOCKED").uppercased())
                        .font(BrandType.mono(10))
                        .foregroundStyle(BrandColors.signal)
                        .padding(10)
                }
            }
            .padding(0)
        }
        .buttonStyle(.plain)
        .disabled(entitlements.busy && !owned)
    }

    private func handleTap(_ id: SkinId, owned: Bool) async {
        if owned {
            settings.setShipSkin(id)
            entitlements.setStatus(nil)
        } else {
            await entitlements.purchase(id)
        }
    }
}
