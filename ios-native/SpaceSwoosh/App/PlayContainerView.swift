// PlayContainerView.swift
// Changes: Phase C — Open Space HUD (KM / fuel / shield) + crash/fuel game over.

import SwiftUI
import SpriteKit
import UIKit

struct PlayContainerView: View {
    var onExit: () -> Void

    @StateObject private var pacing = FramePacingMonitor()
    @StateObject private var session = GameSession()
    @State private var scene = PlayScene(size: CGSize(width: 390, height: 844))

    var body: some View {
        GeometryReader { geo in
            let playSize = Self.letterboxedPlaySize(in: geo.size)
            ZStack {
                BrandColors.paperDeep.ignoresSafeArea()

                SpriteView(scene: scene, options: [.ignoresSiblingOrder])
                    .frame(width: playSize.width, height: playSize.height)
                    .clipped()

                VStack {
                    HStack {
                        Button(action: onExit) {
                            Text("EXIT")
                                .font(.system(size: 12, weight: .bold, design: .monospaced))
                                .foregroundStyle(BrandColors.ink)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(BrandColors.paperTint.opacity(0.92))
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("\(session.scoreKm) KM")
                                .font(.system(size: 16, weight: .bold, design: .monospaced))
                            Text(session.shieldActive ? "SHIELD" : "\(session.destroyed) SMASH")
                                .font(.system(size: 10, weight: .medium, design: .monospaced))
                        }
                        .foregroundStyle(BrandColors.ink)
                    }
                    .padding(.horizontal, 12)
                    .padding(.top, 8)

                    FuelBar(fuel: session.fuel)
                        .padding(.horizontal, 12)

                    Spacer()

                    #if DEBUG
                    FramePacingHUD(monitor: pacing)
                        .padding(.bottom, 12)
                    #endif
                }

                if session.isOver {
                    VStack(spacing: 16) {
                        Text(session.failTitle)
                            .font(.system(size: 22, weight: .bold, design: .monospaced))
                        Text("\(session.scoreKm) KM")
                            .font(.system(size: 28, weight: .bold, design: .monospaced))
                        Text(session.failDetail)
                            .font(.system(size: 14))
                        Button {
                            scene.startRun()
                        } label: {
                            Text("PLAY AGAIN")
                                .font(.system(size: 16, weight: .bold, design: .monospaced))
                                .foregroundStyle(BrandColors.paper)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(BrandColors.signal)
                        }
                        .padding(.horizontal, 28)
                    }
                    .foregroundStyle(BrandColors.ink)
                    .padding(28)
                    .frame(maxWidth: 320)
                    .background(BrandColors.paperTint.opacity(0.96))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .onAppear {
                UIApplication.shared.isIdleTimerDisabled = true
                scene.scaleMode = .aspectFit
                scene.size = playSize
                scene.pacingMonitor = pacing
                scene.session = session
                scene.startRun()
            }
            .onDisappear {
                UIApplication.shared.isIdleTimerDisabled = false
                scene.stopRun()
            }
            .onChange(of: geo.size) { newSize in
                scene.size = Self.letterboxedPlaySize(in: newSize)
            }
        }
    }

    private static func letterboxedPlaySize(in bounds: CGSize) -> CGSize {
        let targetAspect: CGFloat = 2.0 / 3.0
        let boundsAspect = bounds.width / max(bounds.height, 1)
        if boundsAspect > targetAspect {
            return CGSize(width: bounds.height * targetAspect, height: bounds.height)
        }
        return CGSize(width: bounds.width, height: bounds.width / targetAspect)
    }
}

struct FuelBar: View {
    var fuel: CGFloat

    var body: some View {
        GeometryReader { geo in
            let frac = max(0, min(1, fuel))
            ZStack(alignment: .leading) {
                Capsule().fill(BrandColors.paperDeep)
                Capsule()
                    .fill(frac <= 0.28 ? BrandColors.signal.opacity(0.55) : BrandColors.signal)
                    .frame(width: geo.size.width * frac)
            }
        }
        .frame(height: 6)
    }
}

#if DEBUG
struct FramePacingHUD: View {
    @ObservedObject var monitor: FramePacingMonitor

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(monitor.summaryLine)
                .font(.system(size: 10, weight: .medium, design: .monospaced))
            Text(monitor.flagsLine)
                .font(.system(size: 10, weight: .regular, design: .monospaced))
            if !monitor.loadLine.isEmpty {
                Text(monitor.loadLine)
                    .font(.system(size: 10, weight: .regular, design: .monospaced))
            }
        }
        .foregroundStyle(BrandColors.ink80)
        .padding(8)
        .background(BrandColors.paperTint.opacity(0.88))
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12)
    }
}
#endif
