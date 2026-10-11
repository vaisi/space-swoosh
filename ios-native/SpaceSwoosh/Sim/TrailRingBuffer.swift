// TrailRingBuffer.swift
// Changes: offsetX shifts a present-only copy so the hangar lane can sit
// inset from the stage edge. dropBehind removes samples flown past.
// Slice D — opacity fade 1/180 per tick, trailSpacing gate, seed for spring.

import Foundation
import CoreGraphics

struct TrailPoint {
    var x: CGFloat
    var y: CGFloat
    var tangent: CGFloat
    var opacity: CGFloat
    var seed: CGFloat
}

struct TrailRingBuffer {
    private var points: [TrailPoint]
    private var head: Int = 0
    private(set) var count: Int = 0
    let capacity: Int

    init(capacity: Int) {
        self.capacity = max(capacity, 2)
        self.points = Array(
            repeating: TrailPoint(x: 0, y: 0, tangent: 0, opacity: 0, seed: 0.5),
            count: self.capacity
        )
    }

    mutating func reset() {
        head = 0
        count = 0
    }

    mutating func pushIfMoved(x: CGFloat, y: CGFloat, tangent: CGFloat, minSpacing: CGFloat) {
        if count > 0 {
            let last = self[count - 1]
            if hypot(x - last.x, y - last.y) <= minSpacing { return }
        }
        if count == capacity {
            head = (head + 1) % capacity
            count -= 1
        }
        let index = (head + count) % capacity
        let seed = CGFloat((index * 37) % 100) / 100
        points[index] = TrailPoint(x: x, y: y, tangent: tangent, opacity: 1, seed: seed)
        count += 1
    }

    /// Oldest samples sit furthest behind a ship that only flies forward.
    mutating func dropBehind(shipY: CGFloat, maxBehind: CGFloat) {
        while count > 0 {
            let oldest = self[0]
            if shipY - oldest.y <= maxBehind { break }
            head = (head + 1) % capacity
            count -= 1
        }
    }

    mutating func offsetX(_ dx: CGFloat) {
        guard dx != 0, count > 0 else { return }
        for i in 0..<count {
            let index = (head + i) % capacity
            points[index].x += dx
        }
    }

    mutating func fade(by amount: CGFloat) {
        guard count > 0 else { return }
        var write = 0
        for i in 0..<count {
            var p = self[i]
            p.opacity -= amount
            if p.opacity > 0 {
                let dest = (head + write) % capacity
                points[dest] = p
                write += 1
            }
        }
        count = write
    }

    subscript(i: Int) -> TrailPoint {
        points[(head + i) % capacity]
    }
}
