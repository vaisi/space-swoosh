// InputService.swift
// Changes: Phase A — left/right half taps queue a zigzag flip (consumed on sim steps).

import Foundation
import CoreGraphics

final class InputService {
    private var pendingFlip = false

    func reset() {
        pendingFlip = false
    }

    /// Touch in scene coordinates. Left half / right half both flip lean (matches zigzag).
    func handleTap(at location: CGPoint, sceneWidth: CGFloat) {
        _ = location
        _ = sceneWidth
        pendingFlip = true
    }

    func consumeSteerCommand() -> SteerCommand {
        if pendingFlip {
            pendingFlip = false
            return .flip
        }
        return .none
    }
}
