// InputService.swift
// Changes: One pending steer per consume — no App Preview latency rewrite.

import Foundation
import CoreGraphics

final class InputService {
    private var pending: SteerCommand = .none
    private var dragOriginX: CGFloat?
    private var lastDragDir: SteerCommand = .none

    func reset() {
        pending = .none
        dragOriginX = nil
        lastDragDir = .none
    }

    func handleTap(at location: CGPoint, sceneWidth: CGFloat, style: FlightStyle) {
        if style == .zigzag {
            pending = .flip
            return
        }
        pending = location.x < sceneWidth * 0.5 ? .bankLeft : .bankRight
    }

    func handleDragBegin(at location: CGPoint) {
        dragOriginX = location.x
        lastDragDir = .none
    }

    func handleDrag(at location: CGPoint, style: FlightStyle) {
        guard style == .arc, let origin = dragOriginX else { return }
        let dx = location.x - origin
        guard abs(dx) >= 12 else { return }
        let dir: SteerCommand = dx < 0 ? .bankLeft : .bankRight
        if dir != lastDragDir {
            pending = dir
            lastDragDir = dir
            dragOriginX = location.x
        }
    }

    func consumeSteerCommand() -> SteerCommand {
        let next = pending
        pending = .none
        return next
    }
}
