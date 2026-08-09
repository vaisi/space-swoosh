// PlayContainerView.swift
// Changes: Phase A — SpriteView host, idle-timer disable, pacing HUD overlay, exit.

import SwiftUI
import SpriteKit
import UIKit

struct PlayContainerView: View {
    var onExit: () -> Void

    @StateObject private var pacing = FramePacingMonitor()
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
                    }
                    .padding(.horizontal, 12)
                    .padding(.top, 8)

                    Spacer()

                    #if DEBUG
                    FramePacingHUD(monitor: pacing)
                        .padding(.bottom, 12)
                    #endif
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .onAppear {
                UIApplication.shared.isIdleTimerDisabled = true
                scene.scaleMode = .aspectFit
                scene.size = playSize
                scene.pacingMonitor = pacing
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

    /// Logical 2:3 playfield letterboxed inside the device bounds.
    private static func letterboxedPlaySize(in bounds: CGSize) -> CGSize {
        let targetAspect: CGFloat = 2.0 / 3.0
        let boundsAspect = bounds.width / max(bounds.height, 1)
        if boundsAspect > targetAspect {
            let height = bounds.height
            return CGSize(width: height * targetAspect, height: height)
        }
        let width = bounds.width
        return CGSize(width: width, height: width / targetAspect)
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
        }
        .foregroundStyle(BrandColors.ink80)
        .padding(8)
        .background(BrandColors.paperTint.opacity(0.88))
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12)
    }
}
#endif
