// RootView.swift
// Changes: Phase A — minimal menu → play shell mirroring Cap appScreen entry.

import SwiftUI

struct RootView: View {
    @State private var showingPlay = false

    var body: some View {
        ZStack {
            BrandColors.paper.ignoresSafeArea()

            if showingPlay {
                PlayContainerView(onExit: { showingPlay = false })
                    .transition(.opacity)
            } else {
                VStack(spacing: 28) {
                    Spacer()
                    Text("SPACE SWOOSH")
                        .font(.system(size: 34, weight: .bold, design: .default))
                        .foregroundStyle(BrandColors.ink)
                        .tracking(2)
                    Text("NATIVE · PHASE A")
                        .font(.system(size: 12, weight: .medium, design: .monospaced))
                        .foregroundStyle(BrandColors.ink55)
                    Text("Butter core — fixed-step sim, ribbon trail, pacing HUD.")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundStyle(BrandColors.ink80)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
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
