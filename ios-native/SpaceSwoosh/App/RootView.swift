// RootView.swift
// Changes: Slice D — CopyBank menu tagline; Flicker Open Space entry.

import SwiftUI

struct RootView: View {
    @State private var showingPlay = false
    @State private var menuFlavor = CopyBank.pick(.menu)

    var body: some View {
        ZStack {
            BrandColors.paper.ignoresSafeArea()

            if showingPlay {
                PlayContainerView(onExit: {
                    showingPlay = false
                    menuFlavor = CopyBank.pick(.menu)
                })
                .transition(.opacity)
            } else {
                VStack(spacing: 22) {
                    Spacer()
                    Text("SPACE SWOOSH")
                        .font(.system(size: 34, weight: .bold, design: .default))
                        .foregroundStyle(BrandColors.ink)
                        .tracking(2)
                    Text(menuFlavor)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(BrandColors.ink55)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 36)
                    Text("Flicker · Open Space")
                        .font(.system(size: 11, weight: .medium, design: .monospaced))
                        .foregroundStyle(BrandColors.ink80)
                    Spacer()
                    Button {
                        showingPlay = true
                    } label: {
                        Text("PLAY")
                            .font(.system(size: 18, weight: .bold, design: .monospaced))
                            .foregroundStyle(BrandColors.paper)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(BrandColors.signal)
                    }
                    .padding(.horizontal, 40)
                    .padding(.bottom, 48)
                }
            }
        }
        .animation(.easeInOut(duration: 0.2), value: showingPlay)
    }
}
