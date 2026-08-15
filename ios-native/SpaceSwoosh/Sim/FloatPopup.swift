// FloatPopup.swift
// Changes: Slice D — pooled +FUEL / BOOP / smash / swoosh floaters (no hot alloc).

import Foundation
import CoreGraphics

enum FloatPopupKind {
    case fuel
    case boop
    case smash
    case swoosh
}

struct FloatPopup {
    var active: Bool = false
    var kind: FloatPopupKind = .fuel
    var x: CGFloat = 0
    var y: CGFloat = 0
    var vy: CGFloat = 0
    var opacity: CGFloat = 0
}

enum FloatPopupBuffer {
    static let capacity = 8

    static func spawn(_ list: inout [FloatPopup], kind: FloatPopupKind, x: CGFloat, y: CGFloat, vy: CGFloat) {
        for i in 0..<list.count where !list[i].active {
            list[i] = FloatPopup(active: true, kind: kind, x: x, y: y, vy: vy, opacity: 1)
            return
        }
        if !list.isEmpty {
            list[0] = FloatPopup(active: true, kind: kind, x: x, y: y, vy: vy, opacity: 1)
        }
    }

    static func tick(_ list: inout [FloatPopup], dt: CGFloat) {
        let tickScale = dt * 60
        for i in 0..<list.count where list[i].active {
            list[i].y += list[i].vy * dt
            list[i].opacity -= 0.02 * tickScale
            if list[i].opacity <= 0 {
                list[i].active = false
            }
        }
    }
}

struct BlastParticle {
    var active: Bool = false
    var x: CGFloat = 0
    var y: CGFloat = 0
    var vx: CGFloat = 0
    var vy: CGFloat = 0
    var size: CGFloat = 0
    var opacity: CGFloat = 0
}

enum BlastBuffer {
    static let count = 30

    static func explode(into list: inout [BlastParticle], x: CGFloat, y: CGFloat, baseUnit: CGFloat) {
        let baseSpeed = baseUnit * 0.5
        for i in 0..<min(list.count, count) {
            let angle = (.pi * 2 * CGFloat(i)) / CGFloat(count)
            let speed = baseSpeed * (2 + CGFloat(i % 5) * 0.6)
            list[i] = BlastParticle(
                active: true,
                x: x,
                y: y,
                vx: cos(angle) * speed,
                vy: sin(angle) * speed,
                size: baseUnit * (0.3 + CGFloat(i % 4) * 0.1),
                opacity: 1
            )
        }
    }

    static func tick(_ list: inout [BlastParticle], dt: CGFloat) {
        for i in 0..<list.count where list[i].active {
            list[i].x += list[i].vx * dt * 60
            list[i].y += list[i].vy * dt * 60
            list[i].opacity -= 0.018 * dt * 60
            if list[i].opacity <= 0 {
                list[i].active = false
            }
        }
    }
}
